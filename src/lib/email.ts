/**
 * SENTARI Email Service
 * Sends OTP verification emails and notifications
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Sentari <noreply@sentari.dev>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sentari-beta.vercel.app';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email via Resend API
 */
async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('[EMAIL] RESEND_API_KEY not configured. Email not sent.');
    console.log(`[EMAIL] Would send to: ${options.to}`);
    console.log(`[EMAIL] Subject: ${options.subject}`);
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[EMAIL] Send failed:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[EMAIL] Send error:', error);
    return false;
  }
}

/**
 * Send OTP verification email for offensive testing access
 */
export async function sendOtpEmail(
  to: string,
  domain: string,
  otp: string
): Promise<boolean> {
  const subject = `Your Sentari Verification Code: ${otp}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px; }
    .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; }
    .header { background: linear-gradient(135deg, #0ea5e9, #06b6d4); padding: 32px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px; }
    .otp-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0; }
    .otp-code { font-size: 36px; font-weight: 700; color: #0f172a; letter-spacing: 8px; font-family: 'SF Mono', Monaco, monospace; }
    .otp-label { font-size: 12px; color: #64748b; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px; }
    .info { font-size: 14px; color: #475569; line-height: 1.6; }
    .warning { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 24px 0; font-size: 13px; color: #92400e; }
    .footer { padding: 24px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; }
    .footer p { font-size: 12px; color: #94a3b8; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ Sentari</h1>
      <p>Domain Ownership Verification</p>
    </div>
    <div class="body">
      <p class="info">You've requested offensive testing access for <strong>${domain}</strong>.</p>
      <p class="info">Enter this verification code to prove you own or are authorized to test this domain:</p>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="otp-label">Verification Code</div>
      </div>
      <div class="warning">
        ⚠️ This code expires in <strong>10 minutes</strong>. If you didn't request this, ignore this email.
      </div>
      <p class="info">If you're having trouble, you can also verify via DNS TXT record or by uploading an Authorization to Test document.</p>
    </div>
    <div class="footer">
      <p>Sentari — Africa-First AI-Native Cyber Defense</p>
      <p style="margin-top: 8px;">This is a security verification email. Do not forward this code.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Your Sentari verification code for ${domain} is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, ignore this email.`;

  return sendEmail({ to, subject, html, text });
}

/**
 * Send access approved notification
 */
export async function sendAccessApprovedEmail(
  to: string,
  domain: string,
  expiresAt: string
): Promise<boolean> {
  const subject = `Offensive Testing Access Granted — ${domain}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px; }
    .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; }
    .header { background: linear-gradient(135deg, #10b981, #059669); padding: 32px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .body { padding: 32px; }
    .info { font-size: 14px; color: #475569; line-height: 1.6; }
    .badge { display: inline-block; background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; }
    .footer { padding: 24px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; }
    .footer p { font-size: 12px; color: #94a3b8; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>✅ Access Granted</h1></div>
    <div class="body">
      <p class="info">Your offensive testing access for <strong>${domain}</strong> has been approved.</p>
      <p class="info">You can now run authorized vulnerability tests against this domain.</p>
      <p class="info"><span class="badge">Valid until ${new Date(expiresAt).toLocaleDateString()}</span></p>
      <p class="info" style="margin-top: 16px;"><strong>Important:</strong> All tests are logged for audit purposes. Only test domains you own or have explicit authorization to test.</p>
    </div>
    <div class="footer">
      <p>Sentari — Africa-First AI-Native Cyber Defense</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({ to, subject, html });
}
