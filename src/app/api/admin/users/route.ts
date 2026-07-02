/**
 * Admin Users API
 * GET: List all users with profiles
 * PATCH: Update user role/subscription
 * DELETE: Deactivate user
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  try {
    // Get all users with their profiles
    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        full_name,
        role,
        subscription_tier,
        is_super_admin,
        org_id,
        created_at,
        last_sign_in_at
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Enrich with email from auth.users
    const enrichedUsers = await Promise.all(
      (users || []).map(async (profile) => {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id);
        return {
          ...profile,
          email: authUser?.user?.email || 'unknown',
          last_sign_in: authUser?.user?.last_sign_in_at,
        };
      })
    );

    return NextResponse.json({ users: enrichedUsers });
  } catch (error) {
    console.error('Admin users list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { userId, role, subscriptionTier, isSuperAdmin } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Prevent self-demotion
    if (userId === auth.user.id && isSuperAdmin === false) {
      return NextResponse.json(
        { error: 'Cannot remove your own super admin privileges' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (role) updates.role = role;
    if (subscriptionTier) updates.subscription_tier = subscriptionTier;
    if (typeof isSuperAdmin === 'boolean') updates.is_super_admin = isSuperAdmin;

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;

    // Log the admin action
    await supabaseAdmin.from('audit_log').insert({
      user_id: auth.user.id,
      action: 'admin_update_user',
      resource_type: 'profile',
      resource_id: userId,
      details: updates,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
