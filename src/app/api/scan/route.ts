import { NextRequest, NextResponse } from 'next/server';
import { runScan, ScanConfig } from '@/lib/scanner';
import { analyzeWithAI } from '@/lib/ai';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  GUARDRAIL_CONFIGS, 
  isModuleAllowed, 
  hasExceededScanLimit, 
  validateAIOutput,
  UserRole 
} from '@/lib/guardrails';
import { cleanupExpiredData } from '@/lib/data-retention';
import { runEmployeeScan } from '@/lib/employee-scanner';
import { calculateThreatLevel, generateContainmentStrategy, generateIncidentReport } from '@/lib/adaptive-defense';

// Rate limiting: simple in-memory store
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

// Input validation
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

  if (clean === 'localhost' || clean.startsWith('127.') || clean.startsWith('192.168.') || clean.startsWith('10.')) {
    return { valid: false, clean: '', error: 'Internal targets are not allowed' };
  }

  return { valid: true, clean };
}

// Determine user role from request
function getUserRole(request: NextRequest): UserRole {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    return 'professional';
  }
  return 'free';
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { target, mode = 'passive', scanType = 'standard', employeeEmails } = body;

    // Determine user role and get guardrail config
    const userRole = getUserRole(request);
    const guardrailConfig = GUARDRAIL_CONFIGS[userRole];

    // Validate input
    const validation = validateTarget(target);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const cleanTarget = validation.clean;

    // Check scan limits
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: scansToday, error: countError } = await supabaseAdmin
      .from('scan_targets')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', twentyFourHoursAgo);

    console.log(`[API] Scans today: ${scansToday}, error: ${countError}`);

    if (scansToday !== null && hasExceededScanLimit(userRole, scansToday)) {
      return NextResponse.json(
        { error: `Daily scan limit reached (${guardrailConfig.maxScansPerDay}). Upgrade your plan for more scans.` },
        { status: 429 }
      );
    }

    console.log(`[API] Starting ${scanType} scan for ${cleanTarget} (role: ${userRole})`);

    // Create scan target in database
    const { data: scanTarget, error: targetError } = await supabaseAdmin
      .from('scan_targets')
      .insert({
        target_url: cleanTarget,
        target_type: 'domain',
        scan_mode: mode,
        status: 'scanning',
      })
      .select()
      .single();

    if (targetError) {
      console.error('[API] Failed to create scan target:', targetError);
      return NextResponse.json({ error: 'Failed to create scan' }, { status: 500 });
    }

    // Build scan modules based on guardrails
    let modules = ['dns', 'tech', 'headers'];
    
    if (isModuleAllowed(userRole, 'ports')) modules.push('ports');
    if (isModuleAllowed(userRole, 'ssl')) modules.push('ssl');
    if (isModuleAllowed(userRole, 'subdomains')) modules.push('subdomains');
    if (isModuleAllowed(userRole, 'credentials')) modules.push('credentials');
    if (isModuleAllowed(userRole, 'social')) modules.push('social');
    
    // Always include threat intel and African threat data
    modules.push('threat_intel', 'african_threat', 'forum_osint');

    // Employee scan mode
    if (scanType === 'employee') {
      modules = ['dns', 'tech', 'headers', 'credentials', 'social', 'threat_intel', 'african_threat', 'forum_osint'];
    }

    // Configure scan
    const config: ScanConfig = {
      target: cleanTarget,
      mode: mode as 'passive' | 'active',
      modules,
    };

    // Run the scan
    const scanResults = await runScan(config);

    // Collect all findings
    let allFindings = scanResults.flatMap(r => r.findings);

    // Employee scan additional checks
    if (scanType === 'employee') {
      const employeeFindings = await runEmployeeScan(cleanTarget, employeeEmails);
      allFindings = [...allFindings, ...employeeFindings];
    }

    // Store scan results in database
    for (const result of scanResults) {
      await supabaseAdmin.from('scan_results').insert({
        target_id: scanTarget.id,
        scan_phase: 'recon',
        tool_name: result.tool,
        raw_output: result.output,
        findings_count: result.findings.length,
        completed_at: new Date().toISOString(),
      });
    }

    // Store vulnerabilities
    for (const finding of allFindings) {
      await supabaseAdmin.from('vulnerabilities').insert({
        target_id: scanTarget.id,
        title: finding.title,
        description: finding.remediation,
        severity: finding.severity,
        category: finding.category,
        evidence: finding.evidence,
        remediation: finding.remediation,
      });
    }

    // Run AI analysis
    const analysis = await analyzeWithAI(cleanTarget, allFindings, {
      scan_results: scanResults.map(r => ({
        tool: r.tool,
        status: r.status,
        output: r.output,
      })),
    });

    // Validate AI output for guardrails
    const aiValidation = validateAIOutput(analysis.analysis);
    if (!aiValidation.valid) {
      console.warn('[GUARDRAILS] AI output contains violations:', aiValidation.violations);
      analysis.analysis = analysis.analysis.replace(/\b(exploit|attack|hack|malware)\b/gi, '[REDACTED]');
    }

    // Store AI analysis
    await supabaseAdmin.from('ai_analysis').insert({
      target_id: scanTarget.id,
      model_used: 'llama-3.1-8b-instant',
      analysis_output: analysis.analysis,
      risk_summary: analysis.risk_summary,
      overall_score: analysis.overall_score,
      tokens_used: analysis.tokens_used,
    });

    // Update scan target status
    await supabaseAdmin
      .from('scan_targets')
      .update({ status: 'completed' })
      .eq('id', scanTarget.id);

    // Log audit event
    await supabaseAdmin.from('audit_log').insert({
      action: 'scan_completed',
      resource_type: 'scan_target',
      resource_id: scanTarget.id,
      details: { 
        target: cleanTarget, 
        findings_count: allFindings.length, 
        risk_score: analysis.overall_score,
        user_role: userRole,
        scan_type: scanType,
        modules_used: modules,
      },
      ip_address: clientIp,
    });

    // Run data retention cleanup (async, don't block response)
    cleanupExpiredData().catch(err => console.error('[RETENTION] Cleanup error:', err));

    // Generate adaptive defense analysis
    const threatLevel = calculateThreatLevel(allFindings);
    const containmentStrategy = allFindings.length > 0 
      ? generateContainmentStrategy(allFindings[0], cleanTarget)
      : null;
    const incidentReport = generateIncidentReport(allFindings, threatLevel, cleanTarget);

    // Generate response
    const response = {
      id: scanTarget.id,
      target: cleanTarget,
      mode,
      scanType,
      status: 'completed',
      userRole,
      guardrails: {
        allowedModules: guardrailConfig.allowedModules,
        dataRetentionDays: guardrailConfig.dataRetentionDays,
        requiresAuthorization: guardrailConfig.requiresAuthorization,
      },
      adaptiveDefense: {
        threatLevel: threatLevel.level,
        threatScore: threatLevel.score,
        responseTime: threatLevel.responseTime,
        immediateActions: threatLevel.actions,
        containmentStrategy,
        incidentReport,
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
        'Unauthorized scanning of systems you do not own or have permission to test is illegal.',
        'Findings should be used for defensive purposes only.',
        'African threat intelligence is based on regional attack patterns and may not reflect all threats.',
      ],
    };

    console.log(`[API] Scan completed: ${allFindings.length} findings, score: ${analysis.overall_score}`);

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Scan failed:', error);
    return NextResponse.json(
      { error: 'Scan failed', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint for scan history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data: scans, error } = await supabaseAdmin
      .from('scan_targets')
      .select(`
        id,
        target_url,
        status,
        scan_mode,
        created_at,
        ai_analysis (overall_score, risk_summary),
        vulnerabilities (severity)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const transformed = scans?.map(scan => ({
      id: scan.id,
      target: scan.target_url,
      status: scan.status,
      mode: scan.scan_mode,
      risk_score: scan.ai_analysis?.[0]?.overall_score || null,
      risk_summary: scan.ai_analysis?.[0]?.risk_summary || null,
      findings_count: scan.vulnerabilities?.length || 0,
      critical_count: scan.vulnerabilities?.filter((v: { severity: string }) => v.severity === 'critical').length || 0,
      high_count: scan.vulnerabilities?.filter((v: { severity: string }) => v.severity === 'high').length || 0,
      created_at: scan.created_at,
    })) || [];

    return NextResponse.json({ scans: transformed });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
