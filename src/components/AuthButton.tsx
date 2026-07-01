'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';
import { Shield, LogOut, User as UserIcon, ChevronDown } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return { user, loading, signInWithEmail, signOut };
}

export default function AuthButton() {
  const { user, loading, signInWithEmail, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim()) return;
    setSending(true);
    setMessage('');
    const { error } = await signInWithEmail(email);
    if (error) setMessage(error.message);
    else { setMessage('Check your email for the login link!'); setShowEmailInput(false); }
    setSending(false);
  };

  if (loading) {
    return <div className="w-8 h-8 border-2 border-slate-600 border-t-cyan-400 rounded-full animate-spin" />;
  }

  if (user) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/50 transition-all"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm text-slate-300 max-w-[120px] truncate hidden sm:block">{user.email}</span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
        {showDropdown && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-slate-700">
              <p className="text-sm font-medium text-white">{user.email}</p>
              <p className="text-xs text-slate-400 mt-0.5">Free Plan</p>
            </div>
            <button
              onClick={() => { signOut(); setShowDropdown(false); }}
              className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700/50 flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {showEmailInput ? (
        <div className="absolute right-0 top-full mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-2xl z-50">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-medium text-white">Sign in to Sentari</span>
          </div>
          <p className="text-xs text-slate-400 mb-4">We&apos;ll send you a magic link — no password needed.</p>
          <input
            type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
            placeholder="you@company.com"
            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 mb-3"
            disabled={sending}
          />
          <button onClick={handleSignIn} disabled={sending || !email.trim()}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 rounded-lg text-sm font-semibold text-white transition-all">
            {sending ? 'Sending...' : 'Send Magic Link'}
          </button>
          {message && (
            <p className={`text-xs mt-3 ${message.includes('Check') ? 'text-emerald-400' : 'text-red-400'}`}>{message}</p>
          )}
          <button onClick={() => { setShowEmailInput(false); setMessage(''); }}
            className="text-xs text-slate-500 hover:text-slate-300 mt-3 transition-colors">
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={() => setShowEmailInput(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg text-sm font-semibold text-white transition-all shadow-lg shadow-cyan-500/20">
          Sign In
        </button>
      )}
    </div>
  );
}
