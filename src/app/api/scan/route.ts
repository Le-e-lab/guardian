import { NextRequest, NextResponse } from 'next/server';
import { runScan, ScanConfig } from '@/lib/scanner';
import { analyzeWithAI } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { target, mode = 'passive' } = body;

    if (!target) {
      return NextResponse.json({ error: 'Target is required' }, { status: 400 });
    }

    // Clean target input
    const cleanTarget = target
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .trim()
      .toLowerCase();

    if (!cleanTarget || !cleanTarget.includes('.')) {
      return NextResponse.json({ error: 'Invalid target domain' }, { status: 400 });
    }

    // Configure scan modules
    const config: ScanConfig = {
      target: cleanTarget,
      mode: mode as 'passive' | 'active',
      modules: ['dns', 'ports', 'tech', 'ssl', 'headers', 'subdomains'],
    };

    console.log(`[API] Starting scan for ${cleanTarget}`);

    // Run the scan
    const scanResults = await runScan(config);

    // Collect all findings
    const allFindings = scanResults.flatMap(r => r.findings);

    // Run AI analysis
    const analysis = await analyzeWithAI(cleanTarget, allFindings, {
      scan_results: scanResults.map(r => ({
        tool: r.tool,
        status: r.status,
        output: r.output,
      })),
    });

    // Generate response
    const response = {
      id: crypto.randomUUID(),
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
