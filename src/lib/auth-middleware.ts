/**
 * SENTARI Auth Middleware
 * Protects API endpoints with Supabase Auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
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

    // Get profile with role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, org_id')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email || '',
      role: profile?.role || 'analyst',
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
 * Check if user has active subscription
 */
export async function checkSubscription(userId: string): Promise<{
  active: boolean;
  plan: string;
  scansRemaining: number;
}> {
  try {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('plan, status, scans_remaining')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!sub) {
      return { active: false, plan: 'free', scansRemaining: 3 };
    }

    return {
      active: true,
      plan: sub.plan,
      scansRemaining: sub.scans_remaining || 0,
    };
  } catch {
    return { active: false, plan: 'free', scansRemaining: 3 };
  }
}
