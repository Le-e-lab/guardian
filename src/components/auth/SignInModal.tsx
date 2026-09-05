'use client';

import { useState } from 'react';
import { Shield, X, Mail, Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';

interface SignInModalProps {
  onClose: () => void;
}

export default function SignInModal({ onClose }: SignInModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setMessage('');
    setIsError(false);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setMessage(error.message);
          setIsError(true);
        } else {
          setMessage('Signed in successfully!');
          setIsError(false);
          setTimeout(() => onClose(), 1000);
        }
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setMessage(error.message);
          setIsError(true);
        } else {
          setMessage('Account created! Check your email to confirm.');
          setIsError(false);
        }
      }
    } catch {
      setMessage('An unexpected error occurred');
      setIsError(true);
    }
    setLoading(false);
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
              <h3 className="font-semibold text-brand-800 font-[family-name:var(--font-display)]">
                {mode === 'signin' ? 'Sign in to Guardian' : 'Create Account'}
              </h3>
              <p className="text-xs text-brand-500">
                {mode === 'signin' ? 'Enter your credentials' : 'Start your free trial'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-brand-400 hover:text-brand-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Email */}
        <div className="relative mb-3">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
            placeholder="you@company.com"
            disabled={loading}
            className="w-full pl-10 pr-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-sm text-brand-800 placeholder-brand-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>

        {/* Password */}
        <div className="relative mb-4">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
            placeholder="Password"
            disabled={loading}
            className="w-full pl-10 pr-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-sm text-brand-800 placeholder-brand-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>

        <button
          onClick={handleSignIn}
          disabled={loading || !email.trim() || !password.trim()}
          className="w-full py-3 bg-accent-500 hover:bg-accent-600 disabled:bg-brand-300 rounded-xl text-sm font-semibold text-white transition-all btn-brand flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
            </>
          ) : (
            mode === 'signin' ? 'Sign In' : 'Create Account'
          )}
        </button>

        {message && (
          <div className={`flex items-center gap-2 text-xs mt-3 ${isError ? 'text-red-600' : 'text-green-600'}`}>
            {isError ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
            {message}
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(''); }}
            className="text-xs text-brand-500 hover:text-brand-700 transition-colors"
          >
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
          <button onClick={onClose} className="text-xs text-brand-400 hover:text-brand-600 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
