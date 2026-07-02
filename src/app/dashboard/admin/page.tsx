'use client';

import { useState, useEffect } from 'react';
import {
  Shield, Settings, Users, Activity, CheckCircle, XCircle,
  Clock, AlertTriangle, ToggleLeft, ToggleRight, Eye, Trash2
} from 'lucide-react';
import Navbar from '@/components/landing/Navbar';

interface AccessRequest {
  id: string;
  user_id: string;
  target_domain: string;
  verification_method: string;
  status: string;
  approved_at: string | null;
  expires_at: string | null;
  created_at: string;
  profiles: { email: string; full_name: string } | null;
}

interface FeatureFlag {
  feature_name: string;
  enabled: boolean;
  enabled_at: string | null;
  enabled_by: string | null;
}

interface ScanStat {
  target_domain: string;
  status: string;
  findings_count: number;
}

export default function AdminDashboard() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [scanStats, setScanStats] = useState<ScanStat[]>([]);
  const [totals, setTotals] = useState({ pending: 0, verified: 0, rejected: 0, totalScans: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'requests' | 'flags' | 'logs'>('requests');
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    try {
      setLoading(true);
      // Check if user is authenticated and is super admin
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setError('Please sign in to access admin dashboard.');
        setLoading(false);
        return;
      }

      // Check if user is super admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_super_admin, role')
        .eq('id', session.user.id)
        .single();

      if (!profile?.is_super_admin && profile?.role !== 'enterprise') {
        setError('Access denied. Super admin privileges required.');
        setLoading(false);
        return;
      }

      setAuthorized(true);

      // Fetch data
      const res = await fetch('/api/offensive/admin?type=requests', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRequests(data.requests || []);
      setScanStats(data.scanStats || []);
      setTotals(data.totals || { pending: 0, verified: 0, rejected: 0, totalScans: 0 });

      const flagRes = await fetch('/api/offensive/admin?type=flags', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (flagRes.ok) {
        const flagData = await flagRes.json();
        setFlags(flagData.flags || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      const res = await fetch('/api/offensive/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', requestId }),
      });
      if (!res.ok) throw new Error('Failed to approve');
      checkAuthAndFetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const res = await fetch('/api/offensive/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', requestId, reason: 'Rejected by admin' }),
      });
      if (!res.ok) throw new Error('Failed to reject');
      checkAuthAndFetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    }
  };

  const handleRevoke = async (requestId: string) => {
    try {
      const res = await fetch('/api/offensive/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke', requestId }),
      });
      if (!res.ok) throw new Error('Failed to revoke');
      checkAuthAndFetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke');
    }
  };

  const handleToggleFeature = async (featureName: string, enabled: boolean) => {
    try {
      const res = await fetch('/api/offensive/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_feature', featureName, enabled }),
      });
      if (!res.ok) throw new Error('Failed to toggle');
      checkAuthAndFetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle feature');
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'verified') return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Verified</span>;
    if (status.includes('rejected')) return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">Rejected</span>;
    if (status.includes('revoked')) return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">Revoked</span>;
    if (status.includes('pending') || status.includes('sent')) return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">Pending</span>;
    return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">{status}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto" />
          <p className="text-brand-600 mt-4">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">Admin Dashboard</h1>
            <p className="text-sm text-brand-600">Manage offensive access and feature flags</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Pending Requests', value: totals.pending, icon: Clock, color: 'text-yellow-500' },
            { label: 'Verified Access', value: totals.verified, icon: CheckCircle, color: 'text-green-500' },
            { label: 'Rejected', value: totals.rejected, icon: XCircle, color: 'text-red-500' },
            { label: 'Total Scans', value: totals.totalScans, icon: Activity, color: 'text-blue-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-brand-200 p-4">
              <Icon className={`w-5 h-5 ${color} mb-2`} />
              <div className="text-2xl font-bold font-[family-name:var(--font-display)]">{value}</div>
              <div className="text-xs text-brand-600">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-brand-100 rounded-xl p-1 mb-6">
          {[
            { id: 'requests' as const, label: 'Access Requests' },
            { id: 'flags' as const, label: 'Feature Flags' },
            { id: 'logs' as const, label: 'Scan Logs' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === id
                  ? 'bg-white text-brand-800 shadow-sm'
                  : 'text-brand-600 hover:text-brand-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Access Requests Tab */}
        {activeTab === 'requests' && (
          <div className="bg-white rounded-xl border border-brand-200 overflow-hidden">
            {requests.length === 0 ? (
              <div className="p-8 text-center text-brand-600">
                <Users className="w-8 h-8 mx-auto mb-3 text-brand-400" />
                <p>No access requests yet</p>
              </div>
            ) : (
              <div className="divide-y divide-brand-100">
                {requests.map((req) => (
                  <div key={req.id} className="p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <p className="font-medium text-brand-800 truncate">{req.target_domain}</p>
                        {getStatusBadge(req.status)}
                      </div>
                      <p className="text-xs text-brand-600 mt-1">
                        {req.profiles?.email || 'Unknown'} • {req.verification_method} • {new Date(req.created_at).toLocaleDateString()}
                      </p>
                      {req.expires_at && (
                        <p className="text-xs text-brand-500 mt-0.5">
                          Expires: {new Date(req.expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {req.status.includes('pending') || req.status.includes('sent') ? (
                        <>
                          <button
                            onClick={() => handleApprove(req.id)}
                            className="px-3 py-1.5 text-xs font-medium bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            className="px-3 py-1.5 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      ) : req.status === 'verified' ? (
                        <button
                          onClick={() => handleRevoke(req.id)}
                          className="px-3 py-1.5 text-xs font-medium bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        >
                          Revoke
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Feature Flags Tab */}
        {activeTab === 'flags' && (
          <div className="bg-white rounded-xl border border-brand-200 overflow-hidden">
            <div className="divide-y divide-brand-100">
              {flags.map((flag) => (
                <div key={flag.feature_name} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-brand-800">{flag.feature_name}</p>
                    <p className="text-xs text-brand-600">
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                      {flag.enabled_at && ` • ${new Date(flag.enabled_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleFeature(flag.feature_name, !flag.enabled)}
                    className={`p-2 rounded-lg transition-colors ${
                      flag.enabled
                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {flag.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scan Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl border border-brand-200 overflow-hidden">
            {scanStats.length === 0 ? (
              <div className="p-8 text-center text-brand-600">
                <Activity className="w-8 h-8 mx-auto mb-3 text-brand-400" />
                <p>No offensive scans yet</p>
              </div>
            ) : (
              <div className="divide-y divide-brand-100">
                {scanStats.map((scan, i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-brand-800">{scan.target_domain}</p>
                      <p className="text-xs text-brand-600">
                        {scan.status} • {scan.findings_count} findings
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      scan.status === 'completed' ? 'bg-green-100 text-green-700' :
                      scan.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {scan.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
