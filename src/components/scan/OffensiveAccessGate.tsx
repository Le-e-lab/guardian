'use client';

import { useState } from 'react';
import { Shield, Mail, CheckCircle, AlertTriangle, Clock, Lock, ArrowRight } from 'lucide-react';

interface OffensiveAccessGateProps {
  targetDomain: string;
  onRequestAccess: (domain: string) => Promise<void>;
  onVerifyOtp: (requestId: string, otp: string) => Promise<void>;
  isLoading?: boolean;
}

type GateStep = 'request' | 'otp_sent' | 'verifying' | 'verified' | 'error';

export default function OffensiveAccessGate({
  targetDomain,
  onRequestAccess,
  onVerifyOtp,
  isLoading = false,
}: OffensiveAccessGateProps) {
  const [step, setStep] = useState<GateStep>('request');
  const [otp, setOtp] = useState('');
  const [requestId, setRequestId] = useState('');
  const [error, setError] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(600); // 10 minutes

  const handleRequestAccess = async () => {
    try {
      setError('');
      setStep('verifying');
      await onRequestAccess(targetDomain);
      setStep('otp_sent');
      setRequestId('pending'); // Will be set by parent
      startCountdown();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
      setStep('error');
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    try {
      setError('');
      setStep('verifying');
      await onVerifyOtp(requestId, otp);
      setStep('verified');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
      setStep('otp_sent');
    }
  };

  const startCountdown = () => {
    setOtpCountdown(600);
    const timer = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (step === 'verified') {
    return (
      <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-6 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-green-800 mb-2">Access Granted</h3>
        <p className="text-sm text-green-700">
          You can now run authorized vulnerability tests against <strong>{targetDomain}</strong>.
        </p>
        <p className="text-xs text-green-600 mt-3">
          Access expires in 30 days. All tests are logged for audit purposes.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-100/50 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
          <Lock className="w-5 h-5 text-brand-500" />
        </div>
        <div>
          <h3 className="font-semibold text-brand-800">Offensive Testing Requires Verification</h3>
          <p className="text-xs text-brand-600">Prove domain ownership to unlock advanced testing</p>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-brand-50 rounded-xl p-4 mb-4 border border-brand-200/50">
        <p className="text-sm text-brand-700 leading-relaxed">
          Offensive testing (SQL injection, XSS, etc.) requires proof that you own or are authorized to test <strong>{targetDomain}</strong>.
          This protects both you and the target organization.
        </p>
      </div>

      {/* Step: Request Access */}
      {step === 'request' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-brand-200">
            <Mail className="w-5 h-5 text-brand-500" />
            <div>
              <p className="text-sm font-medium text-brand-800">Email OTP Verification</p>
              <p className="text-xs text-brand-600">We&apos;ll send a 6-digit code to verify your email domain matches</p>
            </div>
          </div>

          <button
            onClick={handleRequestAccess}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 rounded-xl font-semibold text-white transition-all inline-flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                Request Verification Code <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Step: OTP Sent */}
      {step === 'otp_sent' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-brand-200">
            <Mail className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-brand-800">Verification code sent</p>
              <p className="text-xs text-brand-600">Check your email for a 6-digit code</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-700 mb-2">Enter verification code</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full px-4 py-3 text-center text-2xl font-mono font-bold tracking-[0.5em] bg-white border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              maxLength={6}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-brand-600">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> Expires in {formatTime(otpCountdown)}
            </span>
            <button
              onClick={handleRequestAccess}
              className="text-brand-500 hover:text-brand-700 underline"
            >
              Resend code
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            onClick={handleVerifyOtp}
            disabled={otp.length !== 6 || isLoading}
            className="w-full px-4 py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 rounded-xl font-semibold text-white transition-all inline-flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Verify & Unlock Access <Shield className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Step: Verifying */}
      {step === 'verifying' && (
        <div className="text-center py-4">
          <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-brand-600">Verifying domain ownership...</p>
        </div>
      )}

      {/* Step: Error */}
      {step === 'error' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={() => {
              setStep('request');
              setError('');
            }}
            className="w-full px-4 py-3 bg-brand-500 hover:bg-brand-600 rounded-xl font-semibold text-white transition-all"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Footer note */}
      <p className="text-xs text-brand-500 mt-4 text-center">
        All verification attempts are logged for security. Access expires after 30 days.
      </p>
    </div>
  );
}
