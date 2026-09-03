import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth-middleware';

// HTML-escape untrusted values before embedding in report HTML (prevents XSS)
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request: NextRequest) {
  try {
    const { scanId, format = 'html' } = await request.json();

    if (!scanId) {
      return NextResponse.json({ error: 'Scan ID required' }, { status: 400 });
    }

    // Authorization: only the scan owner can view the report
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required. Please sign in.' }, { status: 401 });
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
      .eq('created_by', user.id)
      .single();

    if (error || !target) {
      return NextResponse.json({ error: 'Scan not found or you do not have permission to view it' }, { status: 404 });
    }

    const analysis = target.ai_analysis?.[0] || null;
    const vulns = target.vulnerabilities || [];

    // Generate HTML report
    const html = generateReportHTML(target, vulns, analysis, format === 'pdf');

    const contentType = format === 'pdf' 
      ? 'text/html'  // Browser will handle PDF via print
      : 'text/html';
    const disposition = format === 'pdf'
      ? `inline; filename="guardian-report-${esc(target.target_url)}-${Date.now()}.html"`
      : `inline; filename="guardian-report-${esc(target.target_url)}-${Date.now()}.html"`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
      },
    });
  } catch (error) {
    console.error('[REPORT] Error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
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
  <title>Guardian Threat Assessment Report - ${esc(target.target_url)}</title>
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
      <div class="logo">GUARDIAN</div>
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
          <div class="meta-value">${esc(target.target_url)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Scan Mode</div>
          <div class="meta-value">${esc(target.scan_mode)}</div>
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
      ${(() => {
        // Try to parse AI analysis JSON for structured display
        try {
          const analysisOutput = String((analysis as Record<string, unknown>)?.analysis_output || '');
          const riskSummary = String((analysis as Record<string, unknown>)?.risk_summary || '');
          const jsonMatch = analysisOutput.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const summary = parsed.risk_summary || parsed.summary || riskSummary || 'No analysis available';
            const criticals = parsed.critical_findings || [];
            const remediation = parsed.remediation_priority || [];
            let html = '<p class="summary-text">' + esc(summary) + '</p>';
            if (criticals.length > 0) {
              html += '<div style="margin-top: 16px;"><strong style="color: #EF4444;">Critical Issues:</strong><ul style="margin-top: 8px; padding-left: 20px; color: #D1D5DB;">';
              criticals.forEach((c: string) => { html += '<li style="margin-bottom: 4px;">' + esc(c.replace(/^\[.*?\]\s*/, '')) + '</li>'; });
              html += '</ul></div>';
            }
            if (remediation.length > 0) {
              html += '<div style="margin-top: 16px;"><strong style="color: #10B981;">What To Do:</strong><ol style="margin-top: 8px; padding-left: 20px; color: #D1D5DB;">';
              remediation.forEach((r: { action: string; why: string; effort: string }) => { html += '<li style="margin-bottom: 4px;"><strong>' + esc(r.action) + '</strong> — ' + esc(r.why) + ' <em style="color: #9CA3AF;">(' + esc(r.effort) + ' effort)</em></li>'; });
              html += '</ol></div>';
            }
            return html;
          }
        } catch { /* fall through */ }
        return '<p class="summary-text">' + esc(String((analysis as Record<string, unknown>)?.risk_summary || '') || 'No analysis available') + '</p>';
      })()}
    </div>

    <div class="section">
      <div class="section-title">Compliance Impact</div>
      <div style="color: #D1D5DB; line-height: 1.8;">
        <p style="margin-bottom: 12px;"><strong style="color: #F9FAFB;">What these findings mean for your business:</strong></p>
        <ul style="padding-left: 20px;">
          ${critical > 0 ? '<li style="margin-bottom: 8px;"><span style="color: #EF4444; font-weight: 600;">Critical findings</span> could allow an attacker to access your systems, steal data, or disrupt operations. Under Zimbabwe\'s Cyber and Data Protection Act, you may be required to report data breaches within 72 hours.</li>' : ''}
          ${high > 0 ? '<li style="margin-bottom: 8px;"><span style="color: #F97316; font-weight: 600;">High findings</span> represent significant security gaps that could be exploited. These should be addressed within 30 days to maintain compliance posture.</li>' : ''}
          ${medium > 0 ? '<li style="margin-bottom: 8px;"><span style="color: #F59E0B; font-weight: 600;">Medium findings</span> are security improvements that reduce your attack surface. Address during regular maintenance cycles.</li>' : ''}
          ${low > 0 ? '<li style="margin-bottom: 8px;"><span style="color: #3B82F6; font-weight: 600;">Low findings</span> are best-practice recommendations. While not urgent, addressing them improves your overall security posture.</li>' : ''}
          ${critical === 0 && high === 0 ? '<li style="margin-bottom: 8px;"><span style="color: #10B981; font-weight: 600;">Good news:</span> No critical or high-severity issues were found. Your basic security hygiene is solid.</li>' : ''}
        </ul>
        <p style="margin-top: 16px; padding: 12px; background: #1F2937; border-radius: 8px; font-size: 13px;">
          <strong>⚠️ Disclaimer:</strong> This automated assessment covers external-facing security controls only. It does not replace a full penetration test or compliance audit. For comprehensive compliance (POPIA, NDPA, Kenya DPA), engage a qualified security assessor.
        </p>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Vulnerabilities (${vulns.length})</div>
      ${vulns.map((v: Record<string, unknown>) => `
      <div class="vuln-item ${esc(v.severity)}">
        <div class="vuln-header">
          <div class="vuln-title">${esc(v.title)}</div>
          <div class="vuln-severity ${esc(v.severity)}">${esc(v.severity)}</div>
        </div>
        <div class="vuln-remediation">${esc(v.remediation)}</div>
      </div>
      `).join('')}
    </div>

    <div class="footer">
      <p>Guardian — Cybersecurity Compliance for Zimbabwe</p>
      <p>Generated ${new Date().toISOString()} • This report is confidential</p>
    </div>
  </div>
</body>
</html>`;
}
