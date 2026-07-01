import { NextRequest, NextResponse } from 'next/server';
import { runScan, ScanConfig } from '@/lib/scanner';
import { analyzeWithAI } from '@/lib/ai';
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

    // AUTH REQUIRED: Get user from session
    const authResult = await requireAuth(request);
    if (authResult.error) return authResult.error;
    const user = authResult.user;

    const body = await request.json();
    const { target, mode = 'passive', scanType = 'standard', employeeEmails, authorizationToken } = body;

    // Determine user role from database (not header)
    const userRole: UserRole = user.role as UserRole || 'free';
    const guardrailConfig = GUARDRAIL_CONFIGS[userRole] || GUARDRAIL_CONFIGS.free;

    // Validate input
    const validation = validateTarget(target);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const cleanTarget = validation.clean;

    // Check scan limits
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: scansToday } = await supabaseAdmin
      .from('scan_targets')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', user.id)
      .gte('created_at', twentyFourHoursAgo);

    if (scansToday !== null && hasExceededScanLimit(userRole, scansToday)) {
      return NextResponse.json(
        { error: `Daily limit reached (${guardrailConfig.maxScansPerDay}). Upgrade for more.` },
        { status: 429 }
      );
    }

    console.log(`[API] ${user.email} scanning ${cleanTarget} (${scanType})`);

    // Create scan target
    const { data: scanTarget, error: targetError } = await supabaseAdmin
      .from('scan_targets')
      .insert({
        target_url: cleanTarget,
        target_type: 'domain',
        scan_mode: mode,
        status: 'scanning',
        created_by: user.id,
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

    // Active scanning (if authorized)
    if (scanType === 'active' && authorizationToken) {
      if (!isActiveScanningAllowed(userRole)) {
        return NextResponse.json({ error: 'Active scanning requires professional+ role' }, { status: 403 });
      }
      const activeConfig: ActiveScanConfig = {
        target: cleanTarget, authorizationToken,
        scope: ['sql_injection', 'xss', 'directory_traversal', 'open_redirect'],
        timeout: 60, maxConnections: 5,
      };
      const activeResults = await runActiveScan(activeConfig);
      allFindings = [...allFindings, ...activeResults.findings];
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
      ip_address: clientIp, user_id: user.id,
    });

    cleanupExpiredData().catch(err => console.error('[RETENTION]', err));

    const threatLevel = calculateThreatLevel(allFindings);

    return NextResponse.json({
      id: scanTarget.id, target: cleanTarget, mode, scanType, status: 'completed',
      userRole, guardrails: {
        allowedModules: guardrailConfig.allowedModules,
        dataRetentionDays: guardrailConfig.dataRetentionDays,
      },
      adaptiveDefense: {
        threatLevel: threatLevel.level, threatScore: threatLevel.score,
        responseTime: threatLevel.responseTime, immediateActions: threatLevel.actions,
      },
      scan_time_ms: scanResults.reduce((acc, r) => acc + r.duration_ms, 0),
      tools_run: scanResults.map(r => r.tool),
      findings: {
        total: allFindings.length,
        critical: allFindings.filter(f => f.severity === 'critical').length,
        high: allFindings.filter(f => f.severity === 'high').length,
        medium: allFindings.filter(f => f.severity === 'medium').length,
        low: allFindings.filter(f => f.severity === 'low').length,
        info: allFindings.filter(f => f.severity === 'info').length,
      },
      risk_score: analysis.overall_score,
      risk_summary: analysis.risk_summary,
      ai_analysis: analysis.analysis,
      tokens_used: analysis.tokens_used,
      scan_details: scanResults,
      details: allFindings,
      created_at: scanTarget.created_at,
      disclaimers: [
        'This assessment is for authorized security testing only.',
        'Unauthorized scanning is illegal.',
        'Findings should be used for defensive purposes only.',
      ],
    });
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

    // Only show user's own scans
    const { data: scans, error } = await supabaseAdmin
      .from('scan_targets')
      .select(`id, target_url, status, scan_mode, created_at,
        ai_analysis (overall_score, risk_summary),
        vulnerabilities (severity)`)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

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
