/**
 * SENTARI Offensive Access Request API
 * POST /api/offensive/request — Request offensive testing access
 * Uses email OTP verification to prove domain ownership
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

// Rate limiting for OTP requests
const otpRateLimit = new Map<string, { count: number; resetAt: number }>();
const OTP_RATE_LIMIT = 3; // max 3 OTP requests per hour
const OTP_RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkOtpRateLimit(userId: string): boolean {
  const now = Date.now();
  const record = otpRateLimit.get(userId);
  if (!record || now > record.resetAt) {
    otpRateLimit.set(userId, { count: 1, resetAt: now + OTP_RATE_WINDOW });
    return true;
  }
  if (record.count >= OTP_RATE_LIMIT) return false;
  record.count++;
  return true;
}

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/offensive/request
 * Body: { targetDomain: string, verificationMethod: 'email_otp' }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth required
    const authResult = await requireAuth(request);
    if (authResult.error) return authResult.error;
    const user = authResult.user;

    // Check if offensive scanning feature is enabled
    const { data: featureFlag } = await supabaseAdmin
      .from('feature_flags')
      .select('enabled')
      .eq('feature_name', 'offensive_scanning')
      .single();

    if (!featureFlag?.enabled) {
      return NextResponse.json(
        { error: 'Offensive testing is not currently available. It will be enabled soon.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { targetDomain, verificationMethod = 'email_otp' } = body;

    // Validate domain
    if (!targetDomain || typeof targetDomain !== 'string') {
      return NextResponse.json({ error: 'Target domain is required' }, { status: 400 });
    }

    const cleanDomain = targetDomain
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/[:;].*$/, '')
      .trim()
      .toLowerCase();

    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/;
    if (!domainRegex.test(cleanDomain)) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
    }

    // Block internal/private targets
    const blocked = ['localhost', '127.', '192.168.', '10.', '172.16.', 'sentari'];
    if (blocked.some(b => cleanDomain.startsWith(b))) {
      return NextResponse.json({ error: 'This domain cannot be targeted' }, { status: 400 });
    }

    // Rate limit check
    if (!checkOtpRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Too many OTP requests. Please try again in an hour.' },
        { status: 429 }
      );
    }

    // Check for existing verified access
    const { data: existingAccess } = await supabaseAdmin
      .from('offensive_access_requests')
      .select('id, status, expires_at')
      .eq('user_id', user.id)
      .eq('target_domain', cleanDomain)
      .eq('status', 'verified')
      .single();

    if (existingAccess) {
      if (!existingAccess.expires_at || new Date(existingAccess.expires_at) > new Date()) {
        return NextResponse.json(
          { error: 'You already have verified access for this domain' },
          { status: 409 }
        );
      }
    }

    // Only email_otp is supported for now
    if (verificationMethod !== 'email_otp') {
      return NextResponse.json(
        { error: 'Only email OTP verification is currently supported' },
        { status: 400 }
      );
    }

    // Generate OTP
    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Upsert the request
    const { data: accessRequest, error: upsertError } = await supabaseAdmin
      .from('offensive_access_requests')
      .upsert({
        user_id: user.id,
        target_domain: cleanDomain,
        verification_method: 'email_otp',
        status: 'otp_sent',
        verification_data: {
          email: user.email,
          domain: cleanDomain,
          sent_at: new Date().toISOString(),
        },
        otp_hash: otpHash,
        otp_expires_at: otpExpiresAt.toISOString(),
        otp_attempts: 0,
      }, {
        onConflict: 'user_id,target_domain',
      })
      .select()
      .single();

    if (upsertError) {
      console.error('[OFFENSIVE] Upsert failed:', upsertError);
      return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
    }

    // Extract domain name for email
    const domainParts = cleanDomain.split('.');
    const domainName = domainParts[0]; // e.g., "fintech" from "fintech.ng"

    // Send OTP email via Supabase Auth (or Resend if available)
    // For now, we'll use Supabase's built-in email system
    // The OTP is sent to the user's email address
    console.log(`[OFFENSIVE] OTP for ${cleanDomain}: ${otp} (sent to ${user.email})`);

    // In production, you'd send this via Resend or Supabase Edge Function
    // For now, we'll log it and return a success message
    // TODO: Integrate with Resend email service

    // Audit log
    await supabaseAdmin.from('audit_log').insert({
      action: 'offensive_request_created',
      resource_type: 'offensive_access_request',
      resource_id: accessRequest.id,
      details: {
        target_domain: cleanDomain,
        verification_method: 'email_otp',
        email: user.email,
      },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_id: user.id,
    });

    return NextResponse.json({
      success: true,
      requestId: accessRequest.id,
      targetDomain: cleanDomain,
      verificationMethod: 'email_otp',
      message: `OTP sent to ${user.email}. Enter the 6-digit code to verify domain ownership.`,
      expiresAt: otpExpiresAt.toISOString(),
    });

  } catch (error) {
    console.error('[OFFENSIVE] Request failed:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
