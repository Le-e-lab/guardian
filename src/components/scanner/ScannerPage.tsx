'use client';

import { useState, useEffect } from 'react';
import {
  Search, Shield, Zap, Lock, AlertTriangle, CheckCircle, XCircle,
  ChevronDown, Clock, Eye, Target, ArrowRight, Sparkles, ShieldCheck,
  ArrowLeft, User, LogOut, ChevronDown as ChevronDownIcon
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Finding {
  title: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  category: string;
  evidence: Record<string, unknown>;
  remediation: string;
}

interface ScanResult {
  id: string; target: string; mode: string; status: string;
  scan_time_ms: number; tools_run: string[];
  findings: { total: number; critical: number; high: number; medium: number; low: number; info: number; };
  risk_score: number; risk_summary: string; ai_analysis: string;
  details: Finding[]; created_at: string;
  upgrade_gated?: boolean;
  upgrade_prompt?: string;
  tier?: string;
  adaptiveDefense?: { threatLevel: string; threatScore: number; immediateActions: string[]; };
  userRole?: string;
}

const SEVERITY: Record<string, { bg: string; text: string; border: string; icon: typeof XCircle }> = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', icon: XCircle },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', icon: AlertTriangle },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: AlertTriangle },
  low: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', icon: CheckCircle },
  info: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20', icon: CheckCircle },
};

const DEMOS = ['example.com', 'httpbin.org', 'github.com', 'vercel.com', 'tryhackme.com'];

export default function ScannerPage() {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; target: string; risk_score: number | null; findings_count: number; created_at: string; }>>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email || '' } : null);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ? { id: s.user.id, email: s.user.email || '' } : null);
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (user) loadHistory(); }, [user]);

  const loadHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const r = await fetch('/api/scan?limit=20', { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (r.ok) { const d = await r.json(); setHistory(d.scans || []); }
    } catch {}
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setShowUserMenu(false);
  };

  const doScan = async (domain?: string) => {
    const t = domain || target;
    if (!t.trim()) return;
    if (!user) { window.location.href = '/'; return; }

    setLoading(true); setError(null); setResult(null); setTarget(t);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ target: t.trim() }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Scan failed'); }
      setResult(await r.json());
      loadHistory();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setLoading(false); }
  };

  const riskColor = (s: number) => s >= 80 ? 'text-emerald-400' : s >= 60 ? 'text-amber-400' : s >= 40 ? 'text-orange-400' : 'text-red-400';
  const riskLabel = (s: number) => s >= 80 ? 'SECURE' : s >= 60 ? 'MODERATE' : s >= 40 ? 'HIGH RISK' : 'CRITICAL';

  const grouped = result?.details.reduce((a, f) => { const c = f.category || 'other'; (a[c] ??= []).push(f); return a; }, {} as Record<string, Finding[]>) || {};

  // Loading state
  if (!authReady) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand-700 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Redirect if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-brand-500 mx-auto mb-4" />
          <p className="text-brand-300 mb-4">Please sign in to access the scanner.</p>
          <a href="/" className="px-6 py-3 bg-brand-500 hover:bg-brand-600 rounded-full text-sm font-semibold text-white transition-all btn-brand inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Go to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="border-b border-dark-border bg-dark-bg/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center transition-transform group-hover:scale-105">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight font-[family-name:var(--font-display)] text-dark-text">SENTARI</span>
            </a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-brand-400 hover:text-brand-300 hover:bg-dark-surface rounded-lg transition-all"
            >
              <Clock className="w-4 h-4" /> History
              {history.length > 0 && (
                <span className="px-2 py-0.5 bg-brand-500/20 text-brand-400 rounded-full text-xs">{history.length}</span>
              )}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-surface border border-dark-border hover:border-brand-500/50 transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm text-brand-300 max-w-[120px] truncate hidden sm:block">{user.email}</span>
                <ChevronDownIcon className={`w-4 h-4 text-brand-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-dark-surface border border-dark-border rounded-xl shadow-2xl overflow-hidden z-50 animate-slide-down">
                  <div className="px-4 py-3 border-b border-dark-border">
                    <p className="text-sm font-medium text-dark-text">{user.email}</p>
                    <p className="text-xs text-brand-500 mt-0.5">Free Plan</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-3 text-left text-sm text-brand-400 hover:bg-dark-border/50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* History */}
        {showHistory && (
          <div className="mb-8 bg-dark-surface border border-dark-border rounded-2xl p-6 animate-fade-in-up">
            <h3 className="text-lg font-semibold text-dark-text mb-4 font-[family-name:var(--font-display)]">Scan History</h3>
            {history.length === 0 ? (
              <p className="text-brand-500 text-center py-6">No scans yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-dark-bg rounded-xl border border-dark-border">
                    <div className="flex items-center gap-4">
                      <div className={`text-2xl font-bold ${riskColor(s.risk_score || 0)}`}>{s.risk_score || '—'}</div>
                      <div>
                        <p className="font-medium text-dark-text text-sm">{s.target}</p>
                        <p className="text-xs text-brand-500">{new Date(s.created_at).toLocaleDateString()} · {s.findings_count} findings</p>
                      </div>
                    </div>
                    <Eye className="w-4 h-4 text-brand-600" />
                  </div>
                ))}
              </div>
              )}
              {/* Upgrade banner for free tier */}
              {result?.upgrade_gated && result?.findings?.total > 0 && (
                <div className="mt-4 p-4 bg-brand-500/10 border border-brand-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-brand-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-dark-text mb-1">Unlock full vulnerability details</p>
                      <p className="text-xs text-brand-500 mb-3">
                        Showing {result.details.length} of {result.findings.total} findings. Upgrade to Starter ($49/mo) for complete remediation steps, evidence, and AI-powered attack path analysis.
                      </p>
                      <a href="/pricing" className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 rounded-lg text-xs font-semibold text-white transition-all">
                        View Plans <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
        )}

        {/* Scan Input */}
        <div className="mb-12">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-dark-text text-center mb-2 font-[family-name:var(--font-display)]">Threat Assessment</h2>
            <p className="text-brand-500 text-center mb-8">Enter a domain to scan</p>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-600" />
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && doScan()}
                  placeholder="example.com"
                  disabled={loading}
                  className="w-full pl-12 pr-4 py-4 bg-dark-surface border border-dark-border rounded-xl text-dark-text placeholder-brand-600 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                />
              </div>
              <button
                onClick={() => doScan()}
                disabled={loading || !target.trim()}
                className="px-8 py-4 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-800 rounded-xl font-semibold text-white transition-all flex items-center gap-2 shadow-lg shadow-brand-500/20 btn-brand"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Scanning...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" /> Scan
                  </>
                )}
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {DEMOS.map((d) => (
                <button
                  key={d}
                  onClick={() => doScan(d)}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs text-brand-500 bg-dark-surface border border-dark-border rounded-lg hover:border-brand-500/30 hover:text-brand-400 transition-all disabled:opacity-50"
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm animate-fade-in">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Risk Score Card */}
            <div className="bg-dark-surface border border-dark-border rounded-2xl p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-dark-text font-[family-name:var(--font-display)]">{result.target}</h3>
                  <p className="text-sm text-brand-500 mt-1">{(result.scan_time_ms / 1000).toFixed(1)}s · {result.tools_run.length} modules</p>
                </div>
                <div className="text-right">
                  <div className={`text-5xl font-bold ${riskColor(result.risk_score)} font-[family-name:var(--font-display)]`}>{result.risk_score}</div>
                  <div className={`text-sm font-semibold ${riskColor(result.risk_score)} mt-1`}>{riskLabel(result.risk_score)}</div>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {[
                  { l: 'Critical', c: result.findings.critical, color: 'text-red-400' },
                  { l: 'High', c: result.findings.high, color: 'text-orange-400' },
                  { l: 'Medium', c: result.findings.medium, color: 'text-amber-400' },
                  { l: 'Low', c: result.findings.low, color: 'text-blue-400' },
                  { l: 'Info', c: result.findings.info, color: 'text-gray-400' },
                ].map(({ l, c, color }) => (
                  <div key={l} className="text-center p-3 bg-dark-bg rounded-xl border border-dark-border">
                    <div className={`text-2xl font-bold ${color} font-[family-name:var(--font-display)]`}>{c}</div>
                    <div className="text-xs text-brand-600 mt-1">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Analysis — gated for free tier */}
            <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-dark-text mb-3 flex items-center gap-2 font-[family-name:var(--font-display)]">
                <Sparkles className="w-5 h-5 text-brand-500" /> AI Analysis
              </h3>
              {result.upgrade_gated ? (
                <div className="relative">
                  <div className="blur-sm select-none pointer-events-none">
                    <p className="text-sm text-brand-300 leading-relaxed">{result.risk_summary}</p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-dark-bg/90 backdrop-blur-sm border border-dark-border rounded-xl px-6 py-4 text-center">
                      <Lock className="w-5 h-5 text-brand-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-dark-text mb-1">AI analysis locked</p>
                      <p className="text-xs text-brand-500 mb-3">{result.upgrade_prompt || 'Upgrade to Starter ($49/mo) to unlock AI-powered threat reasoning.'}</p>
                      <a href="/pricing" className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 rounded-lg text-xs font-semibold text-white transition-all">
                        View Plans <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-brand-300 leading-relaxed">{result.risk_summary}</p>
              )}
            </div>

            {/* Vulnerabilities */}
            <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-dark-text mb-4 font-[family-name:var(--font-display)]">
                Vulnerabilities ({result.details.length})
              </h3>
              {result.details.length === 0 ? (
                <div className="text-center py-8 text-brand-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
                  <p>No vulnerabilities detected</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(grouped).map(([cat, findings]) => (
                    <div key={cat}>
                      <p className="text-xs text-brand-600 uppercase tracking-wide mb-2 font-medium">{cat.replace(/_/g, ' ')}</p>
                      <div className="space-y-2">
                        {findings.map((f, i) => {
                          const cfg = SEVERITY[f.severity] || SEVERITY.info;
                          const I = cfg.icon;
                          const idx = result.details.indexOf(f);
                          const isOpen = expanded === idx;
                          return (
                            <div key={i} className={`border ${cfg.border} rounded-xl overflow-hidden`}>
                              <button
                                onClick={() => setExpanded(isOpen ? null : idx)}
                                className={`w-full p-4 ${cfg.bg} flex items-center justify-between text-left`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <I className={`w-4 h-4 ${cfg.text} flex-shrink-0`} />
                                  <div className="min-w-0">
                                    <span className={`text-[10px] font-bold ${cfg.text} uppercase tracking-wider`}>{f.severity}</span>
                                    <p className="text-sm text-dark-text font-medium truncate">{f.title}</p>
                                  </div>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-brand-600 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                              </button>
                              {isOpen && (
                                <div className="p-4 bg-dark-bg border-t border-dark-border animate-slide-down">
                                  <p className="text-xs text-brand-500 uppercase mb-1 font-medium">Remediation</p>
                                  <p className="text-sm text-brand-300">{f.remediation}</p>
                                  {Object.keys(f.evidence).length > 0 && (
                                    <div className="mt-3">
                                      <p className="text-xs text-brand-600 uppercase mb-1 font-medium">Evidence</p>
                                      <pre className="text-xs text-brand-400 bg-dark-surface p-3 rounded-lg overflow-x-auto border border-dark-border">
                                        {JSON.stringify(f.evidence, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modules Run */}
            <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-dark-text mb-3 font-[family-name:var(--font-display)]">Modules Run</h3>
              <div className="flex flex-wrap gap-2">
                {result.tools_run.map((t) => (
                  <span key={t} className="px-3 py-1 bg-brand-500/10 text-brand-400 rounded-full text-xs font-medium border border-brand-500/20">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!result && !loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-8">
            {[
              { icon: Search, title: 'Recon', desc: 'DNS, ports, tech, subdomains' },
              { icon: Shield, title: 'OSINT', desc: 'SSL, headers, exposed services' },
              { icon: Target, title: 'Credentials', desc: 'Breaches, leaked secrets' },
              { icon: Zap, title: 'AI Analysis', desc: 'Risk scoring, attack paths' },
            ].map(({ icon: I, title, desc }) => (
              <div key={title} className="p-5 bg-dark-surface border border-dark-border rounded-xl text-center">
                <I className="w-7 h-7 text-brand-600 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-brand-400 mb-1">{title}</h3>
                <p className="text-xs text-brand-600">{desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-dark-border py-8 text-center text-xs text-brand-700">
        Sentari — Africa-First AI-Native Threat Intelligence
      </footer>
    </div>
  );
}
