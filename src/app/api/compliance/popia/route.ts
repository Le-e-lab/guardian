/**
 * SENTARI POPIA Compliance Report Generator
 * POST /api/compliance/popia — Generate POPIA compliance report
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { COMPLIANCE_TEMPLATES, generateComplianceReport } from '@/lib/compliance';

interface Finding {
  title: string;
  severity: string;
  category: string;
  evidence: Record<string, unknown>;
  remediation: string;
}

/**
 * POST /api/compliance/popia
 * Body: { scanId: string, domain: string }
 * Returns: HTML compliance report
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) return authResult.error;

    const body = await request.json();
    const { scanId, domain } = body;

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    // Get POPIA template
    const template = COMPLIANCE_TEMPLATES.find(t => t.id === 'popia');
    if (!template) {
      return NextResponse.json({ error: 'POPIA template not found' }, { status: 500 });
    }

    // Get scan findings if scanId provided
    let findings: Finding[] = [];
    if (scanId) {
      const { data: vulns } = await supabaseAdmin
        .from('vulnerabilities')
        .select('*')
        .eq('target_id', scanId);

      findings = (vulns || []) as Finding[];
    }

    // Generate compliance report
    const report = generateComplianceReport(template, findings as unknown as Record<string, unknown>[], domain);

    // Map findings to POPIA principles
    const popiaMapping = mapFindingsToPOPIAPrinciples(findings);

    // Generate HTML report
    const html = generatePOPIAReportHTML(report, popiaMapping, domain, template);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="POPIA-Compliance-Report-${domain}.html"`,
      },
    });

  } catch (error) {
    console.error('[COMPLIANCE] POPIA report failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

function mapFindingsToPOPIAPrinciples(findings: Finding[]) {
  const mapping: Record<string, { status: string; findings: Finding[]; score: number }> = {
    'Lawful Processing': { status: 'pass', findings: [], score: 100 },
    'Purpose Limitation': { status: 'pass', findings: [], score: 100 },
    'Further Processing Limitation': { status: 'pass', findings: [], score: 100 },
    'Information Quality': { status: 'pass', findings: [], score: 100 },
    'Openness & Transparency': { status: 'pass', findings: [], score: 100 },
    'Security Safeguards': { status: 'pass', findings: [], score: 100 },
    'Data Subject Participation': { status: 'pass', findings: [], score: 100 },
    'Accountability': { status: 'pass', findings: [], score: 100 },
  };

  for (const finding of findings) {
    const severity = finding.severity?.toLowerCase() || 'info';

    if (severity === 'critical' || severity === 'high') {
      // Map findings to relevant POPIA principles
      if (finding.category?.includes('credential') || finding.category?.includes('breach')) {
        mapping['Security Safeguards'].findings.push(finding);
        mapping['Security Safeguards'].status = 'fail';
        mapping['Security Safeguards'].score -= 20;
      }
      if (finding.category?.includes('header') || finding.category?.includes('ssl')) {
        mapping['Security Safeguards'].findings.push(finding);
        mapping['Security Safeguards'].status = 'fail';
        mapping['Security Safeguards'].score -= 15;
      }
      if (finding.category?.includes('exposure') || finding.category?.includes('leak')) {
        mapping['Openness & Transparency'].findings.push(finding);
        mapping['Openness & Transparency'].status = 'fail';
        mapping['Openness & Transparency'].score -= 25;
      }
    }
  }

  // Clamp scores
  for (const key of Object.keys(mapping)) {
    mapping[key].score = Math.max(0, Math.min(100, mapping[key].score));
  }

  return mapping;
}

function generatePOPIAReportHTML(
  report: ReturnType<typeof generateComplianceReport>,
  popiaMapping: Record<string, { status: string; findings: Finding[]; score: number }>,
  domain: string,
  template: typeof COMPLIANCE_TEMPLATES[0]
): string {
  const overallScore = report.complianceScore;
  const scoreColor = overallScore >= 80 ? '#10b981' : overallScore >= 60 ? '#f59e0b' : '#ef4444';
  const scoreLabel = overallScore >= 80 ? 'Good' : overallScore >= 60 ? 'Needs Improvement' : 'Critical';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>POPIA Compliance Report — ${domain}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.6; background: #f8fafc; }
    .container { max-width: 800px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #0ea5e9, #06b6d4); color: white; padding: 48px 40px; }
    .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    .header p { opacity: 0.9; font-size: 14px; }
    .meta { display: flex; gap: 24px; margin-top: 16px; font-size: 13px; opacity: 0.8; }
    .body { padding: 40px; }
    .score-card { display: flex; align-items: center; gap: 24px; padding: 24px; background: #f1f5f9; border-radius: 12px; margin-bottom: 32px; }
    .score-circle { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; color: white; flex-shrink: 0; }
    .score-details h3 { font-size: 18px; margin-bottom: 4px; }
    .score-details p { font-size: 14px; color: #64748b; }
    .section { margin-bottom: 32px; }
    .section h2 { font-size: 18px; font-weight: 600; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
    .principle { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; }
    .principle-name { font-weight: 500; }
    .principle-score { display: flex; align-items: center; gap: 8px; }
    .score-bar { width: 100px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
    .score-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
    .badge-pass { background: #d1fae5; color: #065f46; }
    .badge-fail { background: #fee2e2; color: #991b1b; }
    .badge-warn { background: #fef3c7; color: #92400e; }
    .finding { padding: 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin-bottom: 8px; }
    .finding-title { font-weight: 600; font-size: 14px; color: #991b1b; }
    .finding-desc { font-size: 13px; color: #64748b; margin-top: 4px; }
    .controls { margin-top: 32px; }
    .control-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; }
    .control-check { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; center; justify-content: center; font-size: 12px; flex-shrink: 0; margin-top: 2px; }
    .control-check.pass { background: #d1fae5; color: #065f46; }
    .control-check.fail { background: #fee2e2; color: #991b1b; }
    .footer { padding: 24px 40px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
    @media print { body { background: white; } .container { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>POPIA Compliance Assessment Report</h1>
      <p>Protection of Personal Information Act — South Africa</p>
      <div class="meta">
        <span>Domain: ${domain}</span>
        <span>Date: ${new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        <span>Generated by: Sentari</span>
      </div>
    </div>
    <div class="body">
      <!-- Overall Score -->
      <div class="score-card">
        <div class="score-circle" style="background: ${scoreColor}">${overallScore}%</div>
        <div class="score-details">
          <h3>Overall Compliance Score: ${scoreLabel}</h3>
          <p>${overallScore >= 80 ? 'Your organization demonstrates good POPIA compliance posture. Address remaining gaps to achieve full compliance.' : overallScore >= 60 ? 'Your organization has moderate compliance. Several areas require immediate attention.' : 'Your organization has critical compliance gaps that must be addressed urgently.'}</p>
        </div>
      </div>

      <!-- POPIA Principles Assessment -->
      <div class="section">
        <h2>Assessment by POPIA Principle</h2>
        ${Object.entries(popiaMapping).map(([principle, data]) => `
        <div class="principle">
          <span class="principle-name">${principle}</span>
          <div class="principle-score">
            <div class="score-bar">
              <div class="score-fill" style="width: ${data.score}%; background: ${data.score >= 80 ? '#10b981' : data.score >= 60 ? '#f59e0b' : '#ef4444'}"></div>
            </div>
            <span class="badge ${data.status === 'pass' ? 'badge-pass' : 'badge-fail'}">${data.status === 'pass' ? 'Pass' : 'Fail'}</span>
          </div>
        </div>
        ${data.findings.length > 0 ? data.findings.map(f => `
        <div class="finding">
          <div class="finding-title">⚠ ${f.title}</div>
          <div class="finding-desc">${f.remediation || 'Remediation required'}</div>
        </div>
        `).join('') : ''}
        `).join('')}
      </div>

      <!-- Required Controls Checklist -->
      <div class="section">
        <h2>POPIA Required Controls</h2>
        ${template.requiredControls.map(control => `
        <div class="control-item">
          <div class="control-check ${report.findings.length === 0 ? 'pass' : 'fail'}">${report.findings.length === 0 ? '✓' : '!'}</div>
          <span>${control}</span>
        </div>
        `).join('')}
      </div>

      <!-- Assessment Questions -->
      <div class="section">
        <h2>Key Compliance Questions</h2>
        ${template.assessmentQuestions.map((q, i) => `
        <div class="control-item">
          <div class="control-check pass" style="background: #f1f5f9; color: #64748b;">${i + 1}</div>
          <span>${q}</span>
        </div>
        `).join('')}
      </div>

      <!-- Recommendations -->
      <div class="section">
        <h2>Remediation Recommendations</h2>
        ${report.recommendations.map(rec => `
        <div class="control-item">
          <div class="control-check fail">→</div>
          <span>${rec}</span>
        </div>
        `).join('')}
      </div>
    </div>
    <div class="footer">
      <p>This report is generated by Sentari — Africa-First AI-Native Cyber Defense</p>
      <p style="margin-top: 4px;">Report generated on ${new Date().toISOString()} • Confidential</p>
    </div>
  </div>
</body>
</html>`;
}
