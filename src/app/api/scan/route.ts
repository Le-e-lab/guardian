import { NextRequest, NextResponse } from 'next/server';
import { runScan, ScanConfig } from '@/lib/scanner';
import { analyzeWithAI } from '@/lib/ai';
import { supabaseAdmin } from '@/lib/supabase';

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
    .replace(/[:;].*$/, '') // Remove port and anything after
    .trim()
    .toLowerCase();

  // Basic domain validation
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/;
  if (!domainRegex.test(clean)) {
    return { valid: false, clean: '', error: 'Invalid domain format' };
  }

  // Block localhost and internal IPs
  if (clean === 'localhost' || clean.startsWith('127.') || clean.startsWith('192.168.') || clean.startsWith('10.')) {
    return { valid: false, clean: '', error: 'Internal targets are not allowed' };
  }

  return { valid: true, clean };
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
    const { target, mode = 'passive' } = body;

    // Validate input
    const validation = validateTarget(target);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const cleanTarget = validation.clean;

    console.log(`[API] Starting scan for ${cleanTarget} from ${clientIp}`);

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

    // Configure scan modules
    const config: ScanConfig = {
      target: cleanTarget,
      mode: mode as 'passive' | 'active',
      modules: ['dns', 'ports', 'tech', 'ssl', 'headers', 'subdomains'],
    };

    // Run the scan
    const scanResults = await runScan(config);

    // Collect all findings
    const allFindings = scanResults.flatMap(r => r.findings);

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
      details: { target: cleanTarget, findings_count: allFindings.length, risk_score: analysis.overall_score },
      ip_address: clientIp,
    });

    // Generate response
    const response = {
      id: scanTarget.id,
      target: cleanTarget,
      mode,
      status: 'completed',
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

    // Transform data for frontend
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
