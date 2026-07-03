import { NextRequest, NextResponse } from 'next/server';
import { runScan, ScanConfig } from '@/lib/scanner';
import { analyzeWithAI } from '@/lib/ai';
import { analyzeWithFallback } from '@/lib/ai-fallback';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  GUARDRAIL_CONFIGS, 
  isModuleAllowed, 
  hasExceededScanLimit, 
  validateAIOutput,
  isActiveScanningAllowed,
  UserRole 
} from '@/lib/guardrails';
import { cleanupExpiredData } from '@/lib/data-retention';
import { runEmployeeScan } from '@/lib/employee-scanner';
import { calculateThreatLevel, generateContainmentStrategy, generateIncidentReport } from '@/lib/adaptive-defense';
import { runActiveScan, ActiveScanConfig } from '@/lib/active-scan';
import { requireAuth, getAuthUser } from '@/lib/auth-middleware';
import { isOffensiveScanningEnabled, hasOffensiveAccess } from '@/lib/feature-flags';
import { detectBot, checkFreeScanLimit } from '@/lib/bot-detection';
import { runComplianceCheck } from '@/lib/compliance-checker';
import { runEmailSecurityCheck } from '@/lib/email-security';
import { checkDomainReputation } from '@/lib/virustotal';
import { runPortScan } from '@/lib/port-scanner';

// Enhanced rate limiting with cleanup
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 1000;

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60 * 1000);

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

function validateTarget(target: string): { valid: boolean; clean: string; error?: string } {
  if (!target || typeof target !== 'string') {
    return { valid: false, clean: '', error: 'Target is required' };
  }
  const clean = target
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/[:;].*$/, '')
    .trim()
    .toLowerCase();

  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/;
  if (!domainRegex.test(clean)) {
    return { valid: false, clean: '', error: 'Invalid domain format' };
  }

  // Block internal/private IPs
  const blocked = ['localhost', '127.', '192.168.', '10.', '172.16.', '172.17.', '172.18.', 
    '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.',
    '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '0.', '169.254.'];
  if (blocked.some(b => clean.startsWith(b))) {
    return { valid: false, clean: '', error: 'Internal/private targets are not allowed' };
  }

  return { valid: true, clean };
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    const body = await request.json();
    const { target, mode = 'passive', scanType = 'standard', employeeEmails, authorizationToken } = body;

    // Bot detection
    const botCheck = detectBot(request, body);
    if (botCheck.isBot) {
      console.warn(`[SECURITY] Bot detected from ${clientIp}:`, botCheck.reasons);
      return NextResponse.json(
        { error: 'Automated access is not permitted. Please use a web browser.' },
        { status: 403 }
      );
    }

    // AUTH: Try to get user, but allow 1 free scan per IP without login
    const user = await getAuthUser(request);
    let userRole: UserRole = 'public';
    let userId: string | null = null;

    if (user) {
      // Authenticated user — use their role
      userRole = (user.role as UserRole) || 'free';
      userId = user.id;
    } else {
      // Anonymous user — check if they've used their 1 free scan
      const freeCheck = checkFreeScanLimit(clientIp);
      if (!freeCheck.allowed) {
        return NextResponse.json(
          { 
            error: 'Free scan limit reached. Sign in for more scans.',
            requiresAuth: true,
            upgradePrompt: 'Create a free account for 10 scans per day, or upgrade to Starter for unlimited scanning.',
          },
          { status: 401 }
        );
      }
      userRole = 'public';
    }

    const guardrailConfig = GUARDRAIL_CONFIGS[userRole] || GUARDRAIL_CONFIGS.free;

    // Validate input
    const validation = validateTarget(target);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const cleanTarget = validation.clean;

    // Check scan limits (authenticated users only — anonymous limited by checkFreeScanLimit above)
    if (userId) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: scansToday } = await supabaseAdmin
        .from('scan_targets')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)
        .gte('created_at', twentyFourHoursAgo);

      if (scansToday !== null && hasExceededScanLimit(userRole, scansToday)) {
        return NextResponse.json(
          { error: `Daily limit reached (${guardrailConfig.maxScansPerDay}). Upgrade for more.` },
          { status: 429 }
        );
      }
    }

    console.log(`[API] ${user?.email || 'anonymous'} scanning ${cleanTarget} (${scanType})`);

    // Create scan target
    const { data: scanTarget, error: targetError } = await supabaseAdmin
      .from('scan_targets')
      .insert({
        target_url: cleanTarget,
        target_type: 'domain',
        scan_mode: mode,
        status: 'scanning',
        created_by: userId,
      })
      .select()
      .single();

    if (targetError) {
      return NextResponse.json({ error: 'Failed to create scan' }, { status: 500 });
    }

    // Build modules based on guardrails
    let modules = ['dns', 'tech', 'headers'];
    if (isModuleAllowed(userRole, 'ports')) modules.push('ports');
    if (isModuleAllowed(userRole, 'ssl')) modules.push('ssl');
    if (isModuleAllowed(userRole, 'subdomains')) modules.push('subdomains');
    if (isModuleAllowed(userRole, 'credentials')) modules.push('credentials');
    if (isModuleAllowed(userRole, 'social')) modules.push('social');
    modules.push('threat_intel', 'african_threat', 'forum_osint');

    if (scanType === 'employee') {
      modules = ['dns', 'tech', 'headers', 'credentials', 'social', 'threat_intel', 'african_threat', 'forum_osint'];
    }

    const config: ScanConfig = { target: cleanTarget, mode: mode as 'passive' | 'active', modules };
    const scanResults = await runScan(config);
    let allFindings = scanResults.flatMap(r => r.findings);

    // Employee scan
    if (scanType === 'employee') {
      const employeeFindings = await runEmployeeScan(cleanTarget, employeeEmails);
      allFindings = [...allFindings, ...employeeFindings];
    }

    // Active scanning (if authorized) — OFFENSIVE ACCESS GATE
    if (scanType === 'active') {
      // Gate 1: Check if offensive scanning feature is enabled globally
      const offensiveEnabled = await isOffensiveScanningEnabled();
      if (!offensiveEnabled) {
        return NextResponse.json(
          { error: 'Offensive testing is not currently available. Contact support for access.' },
          { status: 403 }
        );
      }

      // Gate 2: Check if user has verified access for this specific domain
      const { hasAccess } = await hasOffensiveAccess(userId || '', cleanTarget);
      if (!hasAccess) {
        return NextResponse.json(
          {
            error: 'You need verified domain ownership to run offensive tests.',
            details: 'Request access via /api/offensive/request to verify you own or are authorized to test this domain.',
            verificationRequired: true,
            targetDomain: cleanTarget,
          },
          { status: 403 }
        );
      }

      // Gate 3: Check role-based permissions
      if (!isActiveScanningAllowed(userRole)) {
        return NextResponse.json(
          { error: 'Active scanning requires professional+ role' },
          { status: 403 }
        );
      }

      // All gates passed — run active scan
      const activeConfig: ActiveScanConfig = {
        target: cleanTarget, authorizationToken: authorizationToken || 'verified',
        scope: ['sql_injection', 'xss', 'directory_traversal', 'open_redirect'],
        timeout: 60, maxConnections: 5,
      };
      const activeResults = await runActiveScan(activeConfig);
      allFindings = [...allFindings, ...activeResults.findings];

      // Log offensive scan
      await supabaseAdmin.from('offensive_scan_log').insert({
        user_id: userId,
        target_domain: cleanTarget,
        scan_type: 'active_validation',
        findings_count: activeResults.findings.length,
        status: 'completed',
        ip_address: clientIp,
      });
    }

    // Store results
    for (const result of scanResults) {
      await supabaseAdmin.from('scan_results').insert({
        target_id: scanTarget.id, scan_phase: 'recon', tool_name: result.tool,
        raw_output: result.output, findings_count: result.findings.length,
        completed_at: new Date().toISOString(),
      });
    }

    for (const finding of allFindings) {
      await supabaseAdmin.from('vulnerabilities').insert({
        target_id: scanTarget.id, title: finding.title, description: finding.remediation,
        severity: finding.severity, category: finding.category,
        evidence: finding.evidence, remediation: finding.remediation,
      });
    }

    // AI analysis
    const analysis = await analyzeWithAI(cleanTarget, allFindings, {
      scan_results: scanResults.map(r => ({ tool: r.tool, status: r.status, output: r.output })),
    });

    const aiValidation = validateAIOutput(analysis.analysis);
    if (!aiValidation.valid) {
      analysis.analysis = analysis.analysis.replace(/\b(exploit|attack|hack|malware)\b/gi, '[REDACTED]');
    }

    await supabaseAdmin.from('ai_analysis').insert({
      target_id: scanTarget.id, model_used: 'multi-model-fusion',
      analysis_output: analysis.analysis, risk_summary: analysis.risk_summary,
      overall_score: analysis.overall_score, tokens_used: analysis.tokens_used,
    });

    await supabaseAdmin.from('scan_targets').update({ status: 'completed' }).eq('id', scanTarget.id);

    await supabaseAdmin.from('audit_log').insert({
      action: 'scan_completed', resource_type: 'scan_target', resource_id: scanTarget.id,
      details: { target: cleanTarget, findings_count: allFindings.length, risk_score: analysis.overall_score,
        user_role: userRole, scan_type: scanType, modules_used: modules },
      ip_address: clientIp, user_id: userId,
    });

    cleanupExpiredData().catch(err => console.error('[RETENTION]', err));

    // Run compliance check (always, regardless of tier)
    let complianceData = null;
    try {
      complianceData = await runComplianceCheck(cleanTarget);
    } catch (err) {
      console.error('[COMPLIANCE] Check failed:', err);
    }

    // Run email security check
    let emailSecurity = null;
    try {
      emailSecurity = await runEmailSecurityCheck(cleanTarget);
    } catch (err) {
      console.error('[EMAIL] Check failed:', err);
    }

    // Run VirusTotal domain reputation check
    let virusTotal = null;
    try {
      virusTotal = await checkDomainReputation(cleanTarget);
    } catch (err) {
      console.error('[VT] Check failed:', err);
    }

    // Run port scan
    let portScan = null;
    try {
      portScan = await runPortScan(cleanTarget);
    } catch (err) {
      console.error('[PORT] Scan failed:', err);
    }

    const threatLevel = calculateThreatLevel(allFindings);

    // Build full response first
    const fullFindings = allFindings.map(f => ({
      title: f.title,
      severity: f.severity,
      category: f.category,
      evidence: f.evidence as Record<string, unknown>,
      remediation: f.remediation,
    }));

    // Apply role-based result visibility (the upgrade gate)
    const vis = guardrailConfig.resultVisibility;
    
    // Filter findings based on visibility
    let visibleFindings = fullFindings;
    if (!vis.showFindingDetails) {
      // Free/public: show only titles + severity, no details
      visibleFindings = fullFindings.map(f => ({
        title: f.title,
        severity: f.severity,
        category: f.category,
        evidence: {} as Record<string, unknown>,  // LOCKED
        remediation: '',                           // LOCKED
      }));
    }
    if (vis.maxFindingPreviews > 0) {
      visibleFindings = visibleFindings.slice(0, vis.maxFindingPreviews);
    }

    // Build tier-gated response
    const response: Record<string, unknown> = {
      id: scanTarget.id, target: cleanTarget, mode, scanType, status: 'completed',
      userRole, tier: userRole,
      guardrails: {
        allowedModules: guardrailConfig.allowedModules,
        dataRetentionDays: guardrailConfig.dataRetentionDays,
      },
      adaptiveDefense: {
        threatLevel: threatLevel.level, threatScore: threatLevel.score,
        responseTime: threatLevel.responseTime, immediateActions: threatLevel.actions,
      },
      scan_time_ms: scanResults.reduce((acc, r) => r.duration_ms + acc, 0),
      tools_run: scanResults.map(r => r.tool),
      findings: {
        total: allFindings.length,
        critical: allFindings.filter(f => f.severity === 'critical').length,
        high: allFindings.filter(f => f.severity === 'high').length,
        medium: allFindings.filter(f => f.severity === 'medium').length,
        low: allFindings.filter(f => f.severity === 'low').length,
        info: allFindings.filter(f => f.severity === 'info').length,
      },
      risk_score: vis.showRiskScore ? analysis.overall_score : null,
      risk_summary: analysis.risk_summary,
      details: visibleFindings,
      created_at: scanTarget.created_at,
      upgrade_gated: !vis.showAIAnalysis || !vis.showFindingDetails || !vis.showAttackPaths,
      // Compliance data — always included
      compliance: complianceData ? {
        overallScore: complianceData.overallScore,
        regulations: complianceData.regulationScores.map(rs => ({
          name: rs.displayName,
          score: rs.score,
          passed: rs.passedControls,
          failed: rs.failedControls,
          total: rs.totalControls,
          criticalFailures: rs.criticalFailures.map(cf => ({
            control: cf.control.id,
            section: cf.control.section,
            title: cf.control.title,
            plainEnglish: cf.control.plainEnglish,
            remediation: cf.control.remediation,
            effort: cf.control.remediationEffort,
          })),
        })),
        failedControls: complianceData.allResults
          .filter(r => !r.passed)
          .map(r => ({
            id: r.control.id,
            regulation: r.control.regulation,
            section: r.control.section,
            title: r.control.title,
            plainEnglish: r.control.plainEnglish,
            remediation: r.control.remediation,
            effort: r.control.remediationEffort,
            actual: r.actualValue,
            expected: r.expectedValue,
          })),
        context: complianceData.context,
      } : null,
      // Email security data
      emailSecurity: emailSecurity ? {
        score: emailSecurity.riskScore,
        dmarc: emailSecurity.dmarc,
        spf: emailSecurity.spf,
        dkim: emailSecurity.dkim,
        mx: emailSecurity.mx,
        findings: emailSecurity.findings.map(f => ({
          title: f.title,
          severity: f.severity,
          category: f.category,
          description: f.description,
          plainEnglish: f.plainEnglish,
          regulation: f.regulation,
          regulationSection: f.regulationSection,
          remediation: f.remediation,
          effort: f.effort,
        })),
        spoofingRisk: emailSecurity.spoofingRisk,
        dmarcPolicyRoadmap: emailSecurity.dmarcPolicyRoadmap,
        spfAlignment: emailSecurity.spfAlignment,
      } : null,
      // VirusTotal domain reputation
      virusTotal: virusTotal ? {
        domain: virusTotal.domain,
        malicious: virusTotal.malicious,
        suspicious: virusTotal.suspicious,
        harmless: virusTotal.harmless,
        reputation: virusTotal.reputation,
        riskLevel: virusTotal.riskLevel,
        findings: virusTotal.findings.map(f => ({
          title: f.title,
          severity: f.severity,
          plainEnglish: f.plainEnglish,
        })),
      } : null,
      // Port scan results
      portScan: portScan ? {
        domain: portScan.domain,
        openPorts: portScan.openPorts,
        ports: portScan.ports.filter(p => p.state === 'open').map(p => ({
          port: p.port,
          service: p.service,
          risk: p.risk,
          description: p.description,
        })),
        findings: portScan.findings.map(f => ({
          title: f.title,
          severity: f.severity,
          plainEnglish: f.plainEnglish,
          regulation: f.regulation,
          remediation: f.remediation,
        })),
      } : null,
      disclaimers: [
        'This assessment is for authorized security testing only.',
        'Unauthorized scanning is illegal.',
        'Findings should be used for defensive purposes only.',
      ],
    };

    // Only include AI analysis for paid tiers
    if (vis.showAIAnalysis) {
      response.ai_analysis = analysis.analysis;
      response.tokens_used = analysis.tokens_used;
    } else {
      response.ai_analysis = 'AI analysis available on Starter plan and above. Upgrade to see detailed threat reasoning and attack path analysis.';
      response.upgrade_prompt = 'Unlock AI-powered attack path analysis, detailed remediation steps, and full vulnerability reports.';
    }

    // Only include raw scan details for professional+
    if (vis.showAttackPaths) {
      response.scan_details = scanResults;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Scan failed:', error);
    return NextResponse.json({ error: 'An error occurred. Please try again.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Auth required for history
    const authResult = await requireAuth(request);
    if (authResult.error) return authResult.error;
    const user = authResult.user;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Super admins see all scans; regular users see only their own
    let query = supabaseAdmin
      .from('scan_targets')
      .select(`id, target_url, status, scan_mode, created_at, created_by,
        ai_analysis (overall_score, risk_summary),
        vulnerabilities (severity)`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!user.isSuperAdmin) {
      query = query.eq('created_by', user.id);
    }

    const { data: scans, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const transformed = scans?.map(scan => ({
      id: scan.id, target: scan.target_url, status: scan.status, mode: scan.scan_mode,
      risk_score: scan.ai_analysis?.[0]?.overall_score || null,
      risk_summary: scan.ai_analysis?.[0]?.risk_summary || null,
      findings_count: scan.vulnerabilities?.length || 0,
      critical_count: scan.vulnerabilities?.filter((v: { severity: string }) => v.severity === 'critical').length || 0,
      high_count: scan.vulnerabilities?.filter((v: { severity: string }) => v.severity === 'high').length || 0,
      created_at: scan.created_at,
    })) || [];

    return NextResponse.json({ scans: transformed });
  } catch (error) {
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
