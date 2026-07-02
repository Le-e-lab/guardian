'use client';

import { useState, useEffect } from 'react';
import { Shield, User, Mail, Key, Save, Loader2, CheckCircle, AlertCircle, LogOut, ArrowLeft } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SettingsPage() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  
  // Profile fields
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [subscriptionTier, setSubscriptionTier] = useState('');
  
  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        loadProfile(session.user.id);
      }
      setLoading(false);
    });
  }, []);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) {
      setFullName(data.full_name || '');
      setCompany(data.org_id || '');
      setRole(data.role || '');
      setSubscriptionTier(data.subscription_tier || 'free');
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    setMessage('');
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);
      
      if (error) throw error;
      setMessage('Profile updated successfully!');
      setIsError(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update profile');
      setIsError(true);
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      setIsError(true);
      return;
    }
    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters');
      setIsError(true);
      return;
    }
    
    setSaving(true);
    setMessage('');
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMessage('Password updated successfully!');
      setIsError(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update password');
      setIsError(true);
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-brand-400 mx-auto mb-4" />
          <p className="text-brand-600 mb-4">Please sign in to access settings.</p>
          <a href="/dashboard" className="px-6 py-3 bg-brand-500 hover:bg-brand-600 rounded-xl text-sm font-semibold text-white transition-all">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <a href="/dashboard" className="p-2 hover:bg-brand-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-brand-600" />
          </a>
          <div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">Settings</h1>
            <p className="text-sm text-brand-600">Manage your account and preferences</p>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-2 ${isError ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
            {isError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            <p className="text-sm">{message}</p>
          </div>
        )}

        {/* Account Info */}
        <div className="bg-white rounded-2xl border border-brand-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-brand-500" /> Account
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-brand-500 uppercase tracking-wider mb-1 block">Email</label>
              <div className="flex items-center gap-2 px-4 py-3 bg-brand-50 rounded-xl border border-brand-200">
                <Mail className="w-4 h-4 text-brand-400" />
                <span className="text-sm text-brand-800">{user.email}</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-brand-500 uppercase tracking-wider mb-1 block">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-sm text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-brand-500 uppercase tracking-wider mb-1 block">Plan</label>
                <div className="px-4 py-3 bg-brand-50 rounded-xl border border-brand-200">
                  <span className="text-sm font-medium text-brand-800 capitalize">{subscriptionTier}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-brand-500 uppercase tracking-wider mb-1 block">Role</label>
                <div className="px-4 py-3 bg-brand-50 rounded-xl border border-brand-200">
                  <span className="text-sm font-medium text-brand-800 capitalize">{role}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-6 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-400 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Profile
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl border border-brand-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-brand-500" /> Change Password
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-brand-500 uppercase tracking-wider mb-1 block">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-sm text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>

            <div>
              <label className="text-xs text-brand-500 uppercase tracking-wider mb-1 block">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-sm text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>

            <button
              onClick={handleChangePassword}
              disabled={saving || !newPassword || !confirmPassword}
              className="px-6 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-400 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              Update Password
            </button>
          </div>
        </div>

        {/* Sign Out */}
        <div className="bg-white rounded-2xl border border-brand-200 p-6">
          <button
            onClick={handleSignOut}
            className="w-full px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
