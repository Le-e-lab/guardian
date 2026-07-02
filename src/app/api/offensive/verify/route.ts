/**
 * SENTARI OTP Verification API
 * POST /api/offensive/verify — Verify OTP code for domain ownership
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

const MAX_OTP_ATTEMPTS = 5;

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * POST /api/offensive/verify
 * Body: { requestId: string, otp: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth required
    const authResult = await requireAuth(request);
    if (authResult.error) return authResult.error;
    const user = authResult.user;

    const body = await request.json();
    const { requestId, otp } = body;

    // Validate input
    if (!requestId || !otp) {
      return NextResponse.json(
        { error: 'Request ID and OTP code are required' },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: 'OTP must be a 6-digit code' },
        { status: 400 }
      );
    }

    // Fetch the access request
    const { data: accessRequest, error: fetchError } = await supabaseAdmin
      .from('offensive_access_requests')
      .select('*')
      .eq('id', requestId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !accessRequest) {
      return NextResponse.json(
        { error: 'Access request not found' },
        { status: 404 }
      );
    }

    // Check if already verified
    if (accessRequest.status === 'verified') {
      return NextResponse.json(
        { error: 'This request is already verified' },
        { status: 409 }
      );
    }

    // Check if rejected
    if (accessRequest.status === 'rejected' || accessRequest.status === 'revoked') {
      return NextResponse.json(
        { error: 'This request has been rejected or revoked' },
        { status: 403 }
      );
    }

    // Check if OTP has expired
    if (accessRequest.otp_expires_at && new Date(accessRequest.otp_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new code.' },
        { status: 410 }
      );
    }

    // Check attempt limit
    if (accessRequest.otp_attempts >= MAX_OTP_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please request a new code.' },
        { status: 429 }
      );
    }

    // Verify OTP
    const inputHash = hashOtp(otp);
    const isValid = inputHash === accessRequest.otp_hash;

    if (!isValid) {
      // Increment attempt counter
      await supabaseAdmin
        .from('offensive_access_requests')
        .update({
          otp_attempts: accessRequest.otp_attempts + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      const remainingAttempts = MAX_OTP_ATTEMPTS - (accessRequest.otp_attempts + 1);
      return NextResponse.json(
        {
          error: `Invalid OTP code. ${remainingAttempts} attempts remaining.`,
        },
        { status: 400 }
      );
    }

    // OTP verified — grant access
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const { error: updateError } = await supabaseAdmin
      .from('offensive_access_requests')
      .update({
        status: 'verified',
        approved_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        verification_data: {
          ...accessRequest.verification_data,
          verified_at: new Date().toISOString(),
          verified_method: 'email_otp',
        },
        otp_hash: null, // Clear OTP hash after successful verification
        otp_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('[OFFENSIVE] Update failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to verify access' },
        { status: 500 }
      );
    }

    // Audit log
    await supabaseAdmin.from('audit_log').insert({
      action: 'offensive_access_granted',
      resource_type: 'offensive_access_request',
      resource_id: requestId,
      details: {
        target_domain: accessRequest.target_domain,
        verification_method: 'email_otp',
        expires_at: expiresAt.toISOString(),
      },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_id: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Domain ownership verified. Offensive testing access granted.',
      targetDomain: accessRequest.target_domain,
      expiresAt: expiresAt.toISOString(),
    });

  } catch (error) {
    console.error('[OFFENSIVE] Verify failed:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
