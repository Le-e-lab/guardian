import { NextRequest, NextResponse } from 'next/server';
import { COMPLIANCE_TEMPLATES, generateComplianceReport, getComplianceTemplate } from '@/lib/compliance';
import { supabaseAdmin } from '@/lib/supabase';

// GET: List all compliance templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');
    const id = searchParams.get('id');

    if (id) {
      const template = getComplianceTemplate(id);
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json({ template });
    }

    let templates = COMPLIANCE_TEMPLATES;
    if (region) {
      templates = templates.filter(t =>
        t.region.toLowerCase().includes(region.toLowerCase())
      );
    }

    return NextResponse.json({ templates });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST: Generate compliance report for a scan
export async function POST(request: NextRequest) {
  try {
    const { templateId, scanId, domain } = await request.json();

    if (!templateId || !domain) {
      return NextResponse.json({ error: 'templateId and domain required' }, { status: 400 });
    }

    const template = getComplianceTemplate(templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get scan findings if scanId provided
    let findings: Record<string, unknown>[] = [];
    if (scanId) {
      const { data: vulns } = await supabaseAdmin
        .from('vulnerabilities')
        .select('*')
        .eq('target_id', scanId);

      findings = vulns || [];
    }

    const report = generateComplianceReport(template, findings, domain);

    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
