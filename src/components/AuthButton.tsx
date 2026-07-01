'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Mail, LogOut, User } from 'lucide-react';

export default function AuthButton() {
  const { user, loading, signInWithEmail, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim()) return;
    setSending(true);
    setMessage('');

    const { error } = await signInWithEmail(email);
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Check your email for the login link!');
      setShowEmailInput(false);
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="w-8 h-8 border-2 border-gray-600 border-t-cyan-400 rounded-full animate-spin" />
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1F2937] rounded-lg">
          <User className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300 max-w-[150px] truncate">
            {user.email}
          </span>
        </div>
        <button
          onClick={() => signOut()}
          className="p-2 text-gray-400 hover:text-white hover:bg-[#1F2937] rounded-lg transition-all"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {showEmailInput ? (
        <div className="absolute right-0 top-0 mt-10 bg-[#111827] border border-gray-700 rounded-xl p-4 w-72 shadow-xl z-50">
          <p className="text-sm text-gray-400 mb-3">Sign in with magic link</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
              placeholder="you@company.com"
              className="flex-1 px-3 py-2 bg-[#1F2937] border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              disabled={sending}
            />
            <button
              onClick={handleSignIn}
              disabled={sending || !email.trim()}
              className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 rounded-lg text-sm font-medium transition-all"
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>
          {message && (
            <p className={`text-xs mt-2 ${message.includes('Check') ? 'text-emerald-400' : 'text-red-400'}`}>
              {message}
            </p>
          )}
          <button
            onClick={() => { setShowEmailInput(false); setMessage(''); }}
            className="text-xs text-gray-500 hover:text-gray-300 mt-2"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowEmailInput(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1F2937] rounded-lg transition-all"
        >
          <Mail className="w-4 h-4" />
          Sign In
        </button>
      )}
    </div>
  );
}
