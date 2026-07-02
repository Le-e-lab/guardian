import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { scanId, format = 'html' } = await request.json();

    if (!scanId) {
      return NextResponse.json({ error: 'Scan ID required' }, { status: 400 });
    }

    // Fetch scan data
    const { data: target, error } = await supabaseAdmin
      .from('scan_targets')
      .select(`
        *,
        vulnerabilities (*),
        ai_analysis (*),
        scan_results (*)
      `)
      .eq('id', scanId)
      .single();

    if (error || !target) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    const analysis = target.ai_analysis?.[0] || null;
    const vulns = target.vulnerabilities || [];

    // Generate HTML report
    const html = generateReportHTML(target, vulns, analysis, format === 'pdf');

    const contentType = format === 'pdf' 
      ? 'text/html'  // Browser will handle PDF via print
      : 'text/html';
    const disposition = format === 'pdf'
      ? `inline; filename="sentari-report-${target.target_url}-${Date.now()}.html"`
      : `inline; filename="sentari-report-${target.target_url}-${Date.now()}.html"`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

function generateReportHTML(target: Record<string, unknown>, vulns: Record<string, unknown>[], analysis: Record<string, unknown> | null, printMode: boolean = false): string {
  const score = (analysis?.overall_score as number) || 0;
  const scoreColor = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : score >= 40 ? '#F97316' : '#EF4444';
  
  const critical = vulns.filter(v => v.severity === 'critical').length;
  const high = vulns.filter(v => v.severity === 'high').length;
  const medium = vulns.filter(v => v.severity === 'medium').length;
  const low = vulns.filter(v => v.severity === 'low').length;
  const info = vulns.filter(v => v.severity === 'info').length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SENTARI Threat Assessment Report - ${target.target_url}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0A0E17; color: #F9FAFB; line-height: 1.6; }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 30px; border-bottom: 1px solid #1F2937; }
    .logo { font-size: 28px; font-weight: 700; color: #06B6D4; margin-bottom: 8px; }
    .subtitle { color: #9CA3AF; font-size: 14px; }
    .score-card { background: #111827; border: 1px solid #1F2937; border-radius: 16px; padding: 32px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: center; }
    .score-circle { width: 120px; height: 120px; border-radius: 50%; border: 6px solid ${scoreColor}; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .score-number { font-size: 36px; font-weight: 700; color: ${scoreColor}; }
    .score-label { font-size: 12px; color: #9CA3AF; }
    .meta { text-align: right; }
    .meta-item { margin-bottom: 8px; }
    .meta-label { color: #6B7280; font-size: 12px; }
    .meta-value { color: #F9FAFB; font-weight: 500; }
    .section { background: #111827; border: 1px solid #1F2937; border-radius: 16px; padding: 24px; margin-bottom: 24px; }
    .section-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .findings-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px; }
    .finding-count { text-align: center; padding: 16px; background: #1F2937; border-radius: 12px; }
    .finding-number { font-size: 24px; font-weight: 700; }
    .finding-label { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
    .vuln-item { background: #1F2937; border-radius: 12px; padding: 16px; margin-bottom: 12px; border-left: 4px solid; }
    .vuln-item.critical { border-left-color: #EF4444; }
    .vuln-item.high { border-left-color: #F97316; }
    .vuln-item.medium { border-left-color: #F59E0B; }
    .vuln-item.low { border-left-color: #3B82F6; }
    .vuln-item.info { border-left-color: #6B7280; }
    .vuln-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .vuln-title { font-weight: 600; }
    .vuln-severity { font-size: 12px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; font-weight: 600; }
    .vuln-severity.critical { background: #FEE2E2; color: #DC2626; }
    .vuln-severity.high { background: #FFF7ED; color: #EA580C; }
    .vuln-severity.medium { background: #FEFCE8; color: #CA8A04; }
    .vuln-severity.low { background: #EFF6FF; color: #2563EB; }
    .vuln-severity.info { background: #F9FAFB; color: #6B7280; }
    .vuln-remediation { color: #9CA3AF; font-size: 14px; margin-top: 8px; }
    .summary-text { color: #D1D5DB; line-height: 1.8; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #1F2937; color: #6B7280; font-size: 12px; }
    @media print { 
      body { background: white; color: #111; } 
      .section { border: 1px solid #ddd; background: white; }
      .score-card { background: white; border: 1px solid #ddd; }
      .finding-count { background: #f5f5f5; }
      .vuln-item { background: #f5f5f5; }
      .no-print { display: none !important; }
    }
    .pdf-btn { 
      position: fixed; top: 20px; right: 20px; 
      background: #06B6D4; color: white; 
      padding: 10px 20px; border-radius: 8px; 
      border: none; cursor: pointer; font-weight: 600;
      box-shadow: 0 4px 12px rgba(6,182,212,0.3);
      z-index: 1000;
    }
    .pdf-btn:hover { background: #0891B2; }
  </style>
</head>
<body>
  <button class="pdf-btn no-print" onclick="window.print()">📥 Download PDF</button>
  <div class="container">
    <div class="header">
      <div class="logo">SENTARI</div>
      <div class="subtitle">Cybersecurity Compliance for Zimbabwe</div>
    </div>

    <div class="score-card">
      <div class="score-circle">
        <div class="score-number">${score}</div>
        <div class="score-label">RISK SCORE</div>
      </div>
      <div class="meta">
        <div class="meta-item">
          <div class="meta-label">Target</div>
          <div class="meta-value">${target.target_url}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Scan Mode</div>
          <div class="meta-value">${target.scan_mode}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Date</div>
          <div class="meta-value">${new Date(target.created_at as string).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Findings Summary</div>
      <div class="findings-grid">
        <div class="finding-count">
          <div class="finding-number" style="color: #EF4444">${critical}</div>
          <div class="finding-label">Critical</div>
        </div>
        <div class="finding-count">
          <div class="finding-number" style="color: #F97316">${high}</div>
          <div class="finding-label">High</div>
        </div>
        <div class="finding-count">
          <div class="finding-number" style="color: #F59E0B">${medium}</div>
          <div class="finding-label">Medium</div>
        </div>
        <div class="finding-count">
          <div class="finding-number" style="color: #3B82F6">${low}</div>
          <div class="finding-label">Low</div>
        </div>
        <div class="finding-count">
          <div class="finding-number" style="color: #6B7280">${info}</div>
          <div class="finding-label">Info</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">AI Threat Analysis</div>
      <p class="summary-text">${analysis?.risk_summary || 'No analysis available'}</p>
    </div>

    <div class="section">
      <div class="section-title">Vulnerabilities (${vulns.length})</div>
      ${vulns.map((v: Record<string, unknown>) => `
      <div class="vuln-item ${v.severity}">
        <div class="vuln-header">
          <div class="vuln-title">${v.title}</div>
          <div class="vuln-severity ${v.severity}">${v.severity}</div>
        </div>
        <div class="vuln-remediation">${v.remediation}</div>
      </div>
      `).join('')}
    </div>

    <div class="footer">
      <p>SENTARI — Cybersecurity Compliance for Zimbabwe</p>
      <p>Generated ${new Date().toISOString()} • This report is confidential</p>
    </div>
  </div>
</body>
</html>`;
}
