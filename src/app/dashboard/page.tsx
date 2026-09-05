'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ScannerPage from '@/components/scanner/ScannerPage';
import SignInModal from '@/components/auth/SignInModal';
import { supabase } from '@/lib/supabase-browser';

export default function DashboardPage() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignIn, setShowSignIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
      } else {
        setShowSignIn(true);
      }
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.user) {
        setUser({ id: s.user.id, email: s.user.email || '' });
        setShowSignIn(false);
      } else {
        setUser(null);
        setShowSignIn(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-brand-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <h2 className="text-xl font-semibold text-brand-200 mb-2 font-[family-name:var(--font-display)]">Sign in required</h2>
          <p className="text-brand-500 text-sm mb-6">You need to sign in to access the dashboard.</p>
          <button onClick={() => setShowSignIn(true)} className="px-6 py-3 bg-accent-500 hover:bg-accent-600 rounded-xl text-sm font-semibold text-white transition-all btn-brand">
            Sign In
          </button>
          <button onClick={() => router.push('/')} className="block mx-auto mt-3 text-xs text-brand-500 hover:text-brand-400 transition-colors">
            Back to home
          </button>
        </div>
        {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
      </div>
    );
  }

  return <ScannerPage />;
}
