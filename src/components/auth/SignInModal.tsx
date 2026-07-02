'use client';

import { useState } from 'react';
import { Shield, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SignInModalProps {
  onClose: () => void;
}

export default function SignInModal({ onClose }: SignInModalProps) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  const handleSignIn = async () => {
    if (!email.trim()) return;
    setSending(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setMessage(error.message);
    else { setMessage('Check your email for the login link!'); }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-surface-raised border border-brand-200 rounded-2xl p-8 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-brand-800 font-[family-name:var(--font-display)]">Sign in to Sentari</h3>
              <p className="text-xs text-brand-500">Magic link — no password needed.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-brand-400 hover:text-brand-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
          placeholder="you@company.com"
          disabled={sending}
          className="w-full px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-sm text-brand-800 placeholder-brand-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 mb-4 transition-all"
        />

        <button
          onClick={handleSignIn}
          disabled={sending || !email.trim()}
          className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 rounded-xl text-sm font-semibold text-white transition-all btn-brand"
        >
          {sending ? 'Sending...' : 'Send Magic Link'}
        </button>

        {message && (
          <p className={`text-xs mt-3 ${message.includes('Check') ? 'text-green-600' : 'text-sev-critical'}`}>
            {message}
          </p>
        )}

        <button onClick={onClose} className="text-xs text-brand-500 hover:text-brand-700 mt-4 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
