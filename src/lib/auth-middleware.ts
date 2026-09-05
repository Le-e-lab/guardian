/**
 * SENTARI Auth Middleware v2
 * Protects API endpoints with Supabase Auth
 * Updated: 2026-07-02 — Added super admin support, subscription tier checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  subscriptionTier: string;
  isSuperAdmin: boolean;
  orgId: string | null;
}

/**
 * Extract and verify user from request
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    // Get session from cookie or Authorization header
    const authHeader = request.headers.get('authorization');
    const cookieHeader = request.headers.get('cookie');

    let token: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieHeader) {
      // Extract Supabase auth token from cookie
      const match = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }

    if (!token) return null;

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) return null;

    // Get profile with role and subscription info
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, org_id, subscription_tier, is_super_admin')
      .eq('id', user.id)
      .single();
    let profile = existingProfile;

    // Self-healing guard: if an authenticated user has no profile row,
    // create one on the fly. scan_targets.created_by has an FK to
    // profiles(id) — a missing profile makes every scan fail with 23503
    // ("Failed to create scan" / 500), which bit all pre-2026-09-05 users
    // because the new-user trigger never backfills existing accounts.
    if ((profileError || !profile) && user.email) {
      const { data: created, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          full_name: (user.user_metadata?.full_name as string) || user.email.split('@')[0] || '',
          role: 'free',
          subscription_tier: 'free',
        })
        .select('role, org_id, subscription_tier, is_super_admin')
        .single();

      if (!insertError && created) {
        profile = created;
      } else {
        console.error('Auth profile autogenerate failed:', insertError?.message);
      }
    }

    return {
      id: user.id,
      email: user.email || '',
      role: profile?.role || 'free',
      subscriptionTier: profile?.subscription_tier || 'free',
      isSuperAdmin: profile?.is_super_admin || false,
      orgId: profile?.org_id || null,
    };
  } catch (error) {
    console.error('Auth verification failed:', error);
    return null;
  }
}

/**
 * Require authentication - returns 401 if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<
  { user: AuthUser; error?: never } | { user?: never; error: NextResponse }
> {
  const user = await getAuthUser(request);
  
  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'Authentication required. Please sign in.' },
        { status: 401 }
      ),
    };
  }

  return { user };
}

/**
 * Require specific role
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<
  { user: AuthUser; error?: never } | { user?: never; error: NextResponse }
> {
  const authResult = await requireAuth(request);
  if (authResult.error) return authResult;

  // Super admins bypass role checks
  if (authResult.user.isSuperAdmin) {
    return { user: authResult.user };
  }

  if (!allowedRoles.includes(authResult.user.role)) {
    return {
      error: NextResponse.json(
        { error: `Access denied. Required role: ${allowedRoles.join(' or ')}` },
        { status: 403 }
      ),
    };
  }

  return { user: authResult.user };
}

/**
 * Require super admin access
 */
export async function requireSuperAdmin(request: NextRequest): Promise<
  { user: AuthUser; error?: never } | { user?: never; error: NextResponse }
> {
  const authResult = await requireAuth(request);
  if (authResult.error) return authResult;

  if (!authResult.user.isSuperAdmin) {
    return {
      error: NextResponse.json(
        { error: 'Access denied. Super admin privileges required.' },
        { status: 403 }
      ),
    };
  }

  return { user: authResult.user };
}

/**
 * Check if user has active subscription (or is super admin)
 */
export async function checkSubscription(userId: string, isSuperAdmin: boolean = false): Promise<{
  active: boolean;
  plan: string;
  scansRemaining: number;
}> {
  // Super admins have unlimited access
  if (isSuperAdmin) {
    return { active: true, plan: 'enterprise', scansRemaining: -1 };
  }

  try {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('plan, status, scans_remaining')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!sub) {
      return { active: false, plan: 'free', scansRemaining: 10 };
    }

    return {
      active: true,
      plan: sub.plan,
      scansRemaining: sub.scans_remaining || 0,
    };
  } catch {
    return { active: false, plan: 'free', scansRemaining: 10 };
  }
}

/**
 * Update last sign-in timestamp
 */
export async function updateLastSignIn(userId: string): Promise<void> {
  try {
    await supabaseAdmin
      .from('profiles')
      .update({ last_sign_in_at: new Date().toISOString() })
      .eq('id', userId);
  } catch {
    // Non-critical, swallow error
  }
}
