import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get scan target with all related data
    const { data: target, error: targetError } = await supabaseAdmin
      .from('scan_targets')
      .select(`
        *,
        scan_results (*),
        vulnerabilities (*),
        attack_paths (*),
        ai_analysis (*)
      `)
      .eq('id', id)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // Transform vulnerabilities to match frontend format
    const vulnerabilities = target.vulnerabilities?.map((v: Record<string, unknown>) => ({
      title: v.title,
      severity: v.severity,
      category: v.category,
      evidence: v.evidence,
      remediation: v.remediation,
      description: v.description,
    })) || [];

    // Get the latest AI analysis
    const analysis = target.ai_analysis?.[0] || null;

    const response = {
      id: target.id,
      target: target.target_url,
      mode: target.scan_mode,
      status: target.status,
      scan_time_ms: target.scan_results?.reduce((acc: number, r: Record<string, unknown>) => acc + ((r.duration_ms as number) || 0), 0) || 0,
      tools_run: target.scan_results?.map((r: Record<string, unknown>) => r.tool_name) || [],
      findings: {
        total: vulnerabilities.length,
        critical: vulnerabilities.filter((v: Record<string, unknown>) => v.severity === 'critical').length,
        high: vulnerabilities.filter((v: Record<string, unknown>) => v.severity === 'high').length,
        medium: vulnerabilities.filter((v: Record<string, unknown>) => v.severity === 'medium').length,
        low: vulnerabilities.filter((v: Record<string, unknown>) => v.severity === 'low').length,
        info: vulnerabilities.filter((v: Record<string, unknown>) => v.severity === 'info').length,
      },
      risk_score: analysis?.overall_score || null,
      risk_summary: analysis?.risk_summary || null,
      ai_analysis: analysis?.analysis_output || null,
      tokens_used: analysis?.tokens_used || 0,
      details: vulnerabilities,
      scan_details: target.scan_results || [],
      attack_paths: target.attack_paths || [],
      created_at: target.created_at,
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
