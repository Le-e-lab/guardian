/**
 * SENTARI Offensive Access Admin API
 * GET /api/offensive/admin — List all access requests (super admin)
 * PATCH /api/offensive/admin — Approve/revoke access requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { toggleFeature, getAllFeatureFlags } from '@/lib/feature-flags';

/**
 * GET /api/offensive/admin
 * Lists all offensive access requests and feature flags
 */
export async function GET(request: NextRequest) {
  try {
    // Super admin required
    const authResult = await requireSuperAdmin(request);
    if (authResult.error) return authResult.error;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'requests';

    if (type === 'flags') {
      // Get feature flags
      const flags = await getAllFeatureFlags();
      return NextResponse.json({ flags });
    }

    // Get access requests with user info
    const { data: requests, error } = await supabaseAdmin
      .from('offensive_access_requests')
      .select(`
        id,
        user_id,
        target_domain,
        verification_method,
        status,
        approved_at,
        expires_at,
        revoked_at,
        rejection_reason,
        created_at,
        profiles:user_id (email, full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get scan stats
    const { data: scanStats } = await supabaseAdmin
      .from('offensive_scan_log')
      .select('target_domain, status, findings_count')
      .order('created_at', { ascending: false })
      .limit(100);

    return NextResponse.json({
      requests: requests || [],
      scanStats: scanStats || [],
      totals: {
        pending: requests?.filter(r => r.status.includes('pending')).length || 0,
        verified: requests?.filter(r => r.status === 'verified').length || 0,
        rejected: requests?.filter(r => r.status.includes('rejected')).length || 0,
        totalScans: scanStats?.length || 0,
      },
    });

  } catch (error) {
    console.error('[OFFENSIVE ADMIN] GET failed:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/offensive/admin
 * Approve/revoke access or toggle feature flags
 */
export async function PATCH(request: NextRequest) {
  try {
    // Super admin required
    const authResult = await requireSuperAdmin(request);
    if (authResult.error) return authResult.error;
    const admin = authResult.user;

    const body = await request.json();
    const { action, requestId, featureName, enabled, reason } = body;

    // Handle feature flag toggle
    if (action === 'toggle_feature') {
      if (!featureName || typeof enabled !== 'boolean') {
        return NextResponse.json(
          { error: 'featureName and enabled are required' },
          { status: 400 }
        );
      }

      const result = await toggleFeature(featureName, enabled, admin.id);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      // Audit log
      await supabaseAdmin.from('audit_log').insert({
        action: `feature_flag_${enabled ? 'enabled' : 'disabled'}`,
        resource_type: 'feature_flag',
        details: { feature_name: featureName, enabled },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_id: admin.id,
      });

      return NextResponse.json({
        success: true,
        message: `Feature "${featureName}" ${enabled ? 'enabled' : 'disabled'}`,
      });
    }

    // Handle access approval
    if (action === 'approve') {
      if (!requestId) {
        return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
      }

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const { error } = await supabaseAdmin
        .from('offensive_access_requests')
        .update({
          status: 'verified',
          approved_by: admin.id,
          approved_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Audit log
      await supabaseAdmin.from('audit_log').insert({
        action: 'offensive_access_approved',
        resource_type: 'offensive_access_request',
        resource_id: requestId,
        details: { approved_by: admin.id, expires_at: expiresAt.toISOString() },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_id: admin.id,
      });

      return NextResponse.json({ success: true, message: 'Access approved' });
    }

    // Handle access rejection
    if (action === 'reject') {
      if (!requestId) {
        return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('offensive_access_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason || 'Rejected by admin',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Audit log
      await supabaseAdmin.from('audit_log').insert({
        action: 'offensive_access_rejected',
        resource_type: 'offensive_access_request',
        resource_id: requestId,
        details: { rejected_by: admin.id, reason },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_id: admin.id,
      });

      return NextResponse.json({ success: true, message: 'Access rejected' });
    }

    // Handle access revocation
    if (action === 'revoke') {
      if (!requestId) {
        return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('offensive_access_requests')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revoked_by: admin.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Audit log
      await supabaseAdmin.from('audit_log').insert({
        action: 'offensive_access_revoked',
        resource_type: 'offensive_access_request',
        resource_id: requestId,
        details: { revoked_by: admin.id, reason },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_id: admin.id,
      });

      return NextResponse.json({ success: true, message: 'Access revoked' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('[OFFENSIVE ADMIN] PATCH failed:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
