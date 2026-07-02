/**
 * Admin Audit Log API
 * GET: View audit logs with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');

    let query = supabaseAdmin
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) {
      query = query.eq('action', action);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: logs, error } = await query;

    if (error) throw error;

    // Get total count for pagination
    const { count: total } = await supabaseAdmin
      .from('audit_log')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      logs: logs || [],
      total: total || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Admin audit log error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
