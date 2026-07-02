/**
 * Admin Stats API
 * GET: Platform-wide statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  try {
    // Parallel queries for dashboard stats
    const [
      { count: totalUsers },
      { count: totalScans },
      { count: totalVulns },
      { data: recentScans },
      { data: roleDistribution },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('scan_targets').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('vulnerabilities').select('*', { count: 'exact', head: true }),
      supabaseAdmin
        .from('scan_targets')
        .select('id, target_url, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabaseAdmin
        .from('profiles')
        .select('role')
        .then(({ data }) => {
          const dist: Record<string, number> = {};
          (data || []).forEach((p) => {
            dist[p.role] = (dist[p.role] || 0) + 1;
          });
          return { data: dist };
        }),
    ]);

    // Severity breakdown
    const { data: vulnBySeverity } = await supabaseAdmin
      .from('vulnerabilities')
      .select('severity')
      .then(({ data }) => {
        const sev: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        (data || []).forEach((v) => {
          sev[v.severity] = (sev[v.severity] || 0) + 1;
        });
        return { data: sev };
      });

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        totalScans: totalScans || 0,
        totalVulnerabilities: totalVulns || 0,
        roleDistribution: roleDistribution?.data || {},
        vulnerabilityBreakdown: vulnBySeverity || {},
        recentScans: recentScans || [],
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
