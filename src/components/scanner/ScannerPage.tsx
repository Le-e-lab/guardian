'use client';

import { useState, useEffect } from 'react';
import {
  Search, Shield, Zap, Lock, AlertTriangle, CheckCircle, XCircle,
  ChevronDown, Clock, Eye, Target, ArrowRight, Sparkles, ShieldCheck,
  ArrowLeft, User, LogOut, ChevronDown as ChevronDownIcon, Settings
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
  compliance?: {
    overallScore: number;
    regulations: Array<{ name: string; score: number; passed: number; failed: number; total: number; }>;
    failedControls: Array<{ id: string; regulation: string; section: string; title: string; plainEnglish: string; remediation: string; effort: string; actual: string; expected: string; }>;
    context: Record<string, unknown>;
  };
  emailSecurity?: {
    score: number;
    dmarc: { present: boolean; record: string | null; policy: string | null; error: string | null; };
    spf: { present: boolean; record: string | null; mechanism: string | null; error: string | null; };
    dkim: { present: boolean; selector: string | null; record: string | null; error: string | null; };
    mx: { present: boolean; records: string[]; error: string | null; };
    findings: Array<{ title: string; severity: string; category: string; plainEnglish: string; regulation: string; regulationSection: string; remediation: string; }>;
    spoofingRisk?: {
      canBeSpoofed: boolean;
      riskLevel: string;
      riskScore: number;
      attackScenario: string;
      attackVector: string;
      impactDescription: string;
      protectionStatus: {
        dmarc: { status: string; detail: string };
        spf: { status: string; detail: string };
        dkim: { status: string; detail: string };
      };
      recommendations: Array<{ action: string; priority: string; effort: string; impact: string; }>;
    };
    dmarcPolicyRoadmap?: {
      currentPolicy: string | null;
      currentStage: string;
      recommendedNextStep: string;
      estimatedTimeToFullProtection: string;
      overallProgress: number;
      steps: Array<{
        stage: string;
        title: string;
        description: string;
        timeline: string;
        isCurrentStep: boolean;
        isCompleted: boolean;
        isLocked: boolean;
        prerequisites: Array<{ name: string; met: boolean; detail: string }>;
        dnsRecord: string;
        validationChecks: Array<{ name: string; description: string; howToCheck: string }>;
        risks: string[];
        rollbackPlan: string;
      }>;
    };
    spfAlignment?: {
      domain: string;
      spfPresent: boolean;
      dmarcPresent: boolean;
      alignmentMode: string;
      alignmentResult: string;
      riskLevel: string;
      explanation: string;
      technicalDetail: string;
      impact: string;
      fixes: Array<{ action: string; priority: string; effort: string; detail: string }>;
      senderAnalysis: Array<{ source: string; ipRange: string; spfResult: string; alignmentResult: string; risk: string }>;
    };
    dkimStrength?: {
      domain: string;
      configured: boolean;
      selector: string | null;
      keySize: number | null;
      keyAlgorithm: string;
      strengthGrade: string;
      strengthLabel: string;
      riskLevel: string;
      explanation: string;
      details: Array<{ label: string; value: string; status: string }>;
      fixes: Array<{ action: string; priority: string; effort: string; detail: string }>;
    };
    bimi?: {
      domain: string;
      configured: boolean;
      logoUrl: string | null;
      vmcPresent: boolean;
      riskLevel: string;
      explanation: string;
      benefits: string[];
      prerequisites: Array<{ name: string; met: boolean; detail: string }>;
      fixes: Array<{ action: string; priority: string; effort: string; detail: string }>;
    };
    mtaSts?: {
      domain: string;
      configured: boolean;
      policy: string | null;
      mxHosts: string[];
      maxAge: number | null;
      riskLevel: string;
      explanation: string;
      details: Array<{ label: string; value: string; status: string }>;
      fixes: Array<{ action: string; priority: string; effort: string; detail: string }>;
    };
  };
  virusTotal?: {
    domain: string;
    malicious: number;
    suspicious: number;
    harmless: number;
    reputation: number;
    riskLevel: string;
    findings: Array<{ title: string; severity: string; plainEnglish: string; }>;
  };
  portScan?: {
    domain: string;
    openPorts: number;
    ports: Array<{ port: number; service: string; risk: string; description: string; }>;
    findings: Array<{ title: string; severity: string; plainEnglish: string; regulation: string; remediation: string; }>;
  };
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
  const [subscriptionTier, setSubscriptionTier] = useState('free');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email || '' } : null);
      setAuthReady(true);
      // Fetch subscription tier
      if (session?.user) {
        supabase.from('profiles').select('subscription_tier, role').eq('id', session.user.id).single()
          .then(({ data }) => {
            if (data) setSubscriptionTier(data.subscription_tier || data.role || 'free');
          });
      }
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
              <span className="text-lg font-bold tracking-tight font-[family-name:var(--font-display)] text-dark-text">GUARDIAN</span>
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
                    <p className="text-xs text-brand-500 mt-0.5 capitalize">{subscriptionTier} Plan</p>
                  </div>
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-3 text-left text-sm text-brand-400 hover:bg-dark-border/50 flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
              <a
                href="/settings"
                className="w-full px-4 py-3 text-left text-sm text-brand-400 hover:bg-dark-border/50 flex items-center gap-2 transition-colors border-t border-dark-border"
              >
                <Settings className="w-4 h-4" /> Settings
              </a>
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
                  <div 
                    key={s.id} 
                    className="flex items-center justify-between p-3 bg-dark-bg rounded-xl border border-dark-border cursor-pointer hover:border-brand-500/30 transition-colors"
                    onClick={async () => {
                      // Load scan details
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        const r = await fetch(`/api/scan/${s.id}`, { headers: { Authorization: `Bearer ${session?.access_token}` } });
                        if (r.ok) {
                          const data = await r.json();
                          setResult(data);
                          setTarget(data.target);
                          setShowHistory(false);
                        }
                      } catch {}
                    }}
                  >
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
              {/* Upgrade banner for free tier — hidden for enterprise */}
              {result?.upgrade_gated && result?.findings?.total > 0 && subscriptionTier === 'free' && (
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
                <ParsedAIAnalysis analysis={result.ai_analysis} summary={result.risk_summary} />
              )}
            </div>

            {/* Compliance Status */}
            {result.compliance && (
              <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-dark-text mb-3 font-[family-name:var(--font-display)]">
                  Compliance Status
                </h3>
                <p className="text-xs text-brand-500 mb-4">Regulatory compliance across {result.compliance.regulations.length} frameworks</p>
                
                <div className="space-y-3 mb-4">
                  {result.compliance.regulations.map((reg, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-dark-text">{reg.name}</span>
                        <span className={`text-sm font-bold ${reg.score >= 80 ? 'text-emerald-400' : reg.score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                          {reg.score}%
                        </span>
                      </div>
                      <div className="w-full bg-dark-bg rounded-full h-2">
                        <div className={`h-2 rounded-full ${reg.score >= 80 ? 'bg-emerald-500' : reg.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${reg.score}%` }} />
                      </div>
                      <p className="text-[10px] text-brand-600 mt-1">{reg.passed}/{reg.total} controls passed</p>
                    </div>
                  ))}
                </div>

                {result.compliance.failedControls.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">What Needs Fixing</p>
                    {result.compliance.failedControls.map((fc, i) => (
                      <div key={i} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-500/20 text-red-400">{fc.regulation}</span>
                          <span className="text-[10px] text-brand-600">{fc.section}</span>
                        </div>
                        <p className="text-sm font-medium text-dark-text mb-1">{fc.title}</p>
                        <p className="text-xs text-brand-500">{fc.plainEnglish}</p>
                        <p className="text-[10px] text-brand-600 mt-1 italic">Fix: {fc.remediation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Email Security */}
            {result.emailSecurity && (
              <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-dark-text mb-3 font-[family-name:var(--font-display)]">
                  Email Security (DMARC/SPF/DKIM)
                </h3>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-2xl font-bold ${result.emailSecurity.score >= 80 ? 'text-emerald-400' : result.emailSecurity.score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                    {result.emailSecurity.score}/100
                  </span>
                  <span className="text-xs text-brand-500">Email authentication score</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { name: 'DMARC', ok: result.emailSecurity.dmarc.present, detail: result.emailSecurity.dmarc.policy ? `Policy: ${result.emailSecurity.dmarc.policy}` : 'Not configured' },
                    { name: 'SPF', ok: result.emailSecurity.spf.present, detail: result.emailSecurity.spf.mechanism ? `Mechanism: ${result.emailSecurity.spf.mechanism}` : 'Not configured' },
                    { name: 'DKIM', ok: result.emailSecurity.dkim.present, detail: result.emailSecurity.dkim.selector ? `Selector: ${result.emailSecurity.dkim.selector}` : 'Not configured' },
                    { name: 'MX', ok: result.emailSecurity.mx.present, detail: result.emailSecurity.mx.present ? `${result.emailSecurity.mx.records.length} record(s)` : 'Not configured' },
                  ].map(({ name, ok, detail }) => (
                    <div key={name} className={`p-2 rounded-lg border text-xs ${ok ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                      <span className={`font-medium ${ok ? 'text-emerald-400' : 'text-red-400'}`}>{ok ? '✓' : '✗'} {name}</span>
                      <p className="text-[10px] text-brand-600 mt-0.5">{detail}</p>
                    </div>
                  ))}
                </div>

                {result.emailSecurity.findings.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Email Security Issues ({result.emailSecurity.findings.length})</p>
                    {result.emailSecurity.findings.map((f, i) => (
                      <div key={i} className="p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                        <p className="text-xs font-medium text-dark-text">{f.title}</p>
                        <p className="text-[10px] text-brand-500">{f.plainEnglish}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Spoofing Risk Calculator */}
            {result.emailSecurity?.spoofingRisk && (
              <div className={`bg-dark-surface border border-dark-border rounded-2xl p-6 ${
                result.emailSecurity.spoofingRisk.canBeSpoofed ? 'border-red-500/30' : 'border-emerald-500/30'
              }`}>
                <h3 className="text-lg font-semibold text-dark-text mb-3 font-[family-name:var(--font-display)]">
                  Email Spoofing Risk
                </h3>
                
                {/* Verdict */}
                <div className={`p-4 rounded-xl mb-4 ${
                  result.emailSecurity.spoofingRisk.riskLevel === 'protected' ? 'bg-emerald-500/10 border border-emerald-500/20' :
                  result.emailSecurity.spoofingRisk.riskLevel === 'low' ? 'bg-blue-500/10 border border-blue-500/20' :
                  result.emailSecurity.spoofingRisk.riskLevel === 'medium' ? 'bg-amber-500/10 border border-amber-500/20' :
                  'bg-red-500/10 border border-red-500/20'
                }`}>
                  <span className={`text-2xl font-bold font-[family-name:var(--font-display)] ${
                    result.emailSecurity.spoofingRisk.riskLevel === 'protected' ? 'text-emerald-400' :
                    result.emailSecurity.spoofingRisk.riskLevel === 'low' ? 'text-blue-400' :
                    result.emailSecurity.spoofingRisk.riskLevel === 'medium' ? 'text-amber-400' :
                    'text-red-400'
                  }`}>
                    {result.emailSecurity.spoofingRisk.riskLevel === 'protected' ? '🛡️ Protected' :
                     result.emailSecurity.spoofingRisk.riskLevel === 'low' ? '✅ Low Risk' :
                     result.emailSecurity.spoofingRisk.riskLevel === 'medium' ? '⚠️ Medium Risk' :
                     result.emailSecurity.spoofingRisk.riskLevel === 'high' ? '🚨 High Risk' :
                     '🚨 Critical — Can Be Spoofed'}
                  </span>
                  <p className="text-sm text-brand-400 mt-2">{result.emailSecurity.spoofingRisk.attackScenario}</p>
                </div>

                {/* Protection Status */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { name: 'DMARC', ...result.emailSecurity.spoofingRisk.protectionStatus.dmarc },
                    { name: 'SPF', ...result.emailSecurity.spoofingRisk.protectionStatus.spf },
                    { name: 'DKIM', ...result.emailSecurity.spoofingRisk.protectionStatus.dkim },
                  ].map(({ name, status, detail }) => (
                    <div key={name} className={`p-2 rounded-lg border text-xs ${
                      status === 'enforced' ? 'bg-emerald-500/5 border-emerald-500/10' :
                      status === 'configured' ? 'bg-blue-500/5 border-blue-500/10' :
                      status === 'partial' ? 'bg-amber-500/5 border-amber-500/10' :
                      'bg-red-500/5 border-red-500/10'
                    }`}>
                      <span className={`font-medium ${
                        status === 'enforced' ? 'text-emerald-400' :
                        status === 'configured' ? 'text-blue-400' :
                        status === 'partial' ? 'text-amber-400' :
                        'text-red-400'
                      }`}>{name}</span>
                      <p className="text-[10px] text-brand-600 mt-0.5">{detail}</p>
                    </div>
                  ))}
                </div>

                {/* Attack Vector */}
                <div className="p-3 rounded-lg bg-dark-bg border border-dark-border mb-3">
                  <p className="text-[10px] text-brand-600 uppercase tracking-wider mb-1 font-medium">How the attack works</p>
                  <p className="text-xs text-brand-400">{result.emailSecurity.spoofingRisk.attackVector}</p>
                </div>

                {/* Impact */}
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 mb-3">
                  <p className="text-[10px] text-red-400 uppercase tracking-wider mb-1 font-medium">Business Impact</p>
                  <p className="text-xs text-red-300">{result.emailSecurity.spoofingRisk.impactDescription}</p>
                </div>

                {/* Recommendations */}
                {result.emailSecurity.spoofingRisk.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2">
                      How to fix ({result.emailSecurity.spoofingRisk.recommendations.length} steps)
                    </p>
                    <div className="space-y-2">
                      {result.emailSecurity.spoofingRisk.recommendations.map((rec, i) => (
                        <div key={i} className="p-3 rounded-lg bg-dark-bg border border-dark-border">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              rec.priority === 'immediate' ? 'bg-red-500/20 text-red-400' :
                              rec.priority === 'soon' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {rec.priority}
                            </span>
                            <span className="text-[10px] text-brand-600">{rec.effort} effort</span>
                          </div>
                          <p className="text-xs text-dark-text font-medium mb-1">{rec.action}</p>
                          <p className="text-[10px] text-brand-500">{rec.impact}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DMARC Policy Roadmap */}
            {result.emailSecurity?.dmarcPolicyRoadmap && (
              <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-dark-text mb-3 font-[family-name:var(--font-display)]">
                  DMARC Policy Roadmap
                </h3>
                <p className="text-xs text-brand-500 mb-4">
                  Step-by-step guide to fully protect your domain against email spoofing.
                </p>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-dark-text">Overall Progress</span>
                    <span className="text-sm font-bold text-brand-400">{result.emailSecurity.dmarcPolicyRoadmap.overallProgress}%</span>
                  </div>
                  <div className="w-full bg-dark-bg rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all ${
                        result.emailSecurity.dmarcPolicyRoadmap.overallProgress >= 80 ? 'bg-emerald-500' :
                        result.emailSecurity.dmarcPolicyRoadmap.overallProgress >= 50 ? 'bg-amber-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${result.emailSecurity.dmarcPolicyRoadmap.overallProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-brand-600">
                      Current: <span className="font-medium text-brand-400">
                        {result.emailSecurity.dmarcPolicyRoadmap.currentPolicy 
                          ? `p=${result.emailSecurity.dmarcPolicyRoadmap.currentPolicy}` 
                          : 'No DMARC'}
                      </span>
                    </span>
                    <span className="text-[10px] text-brand-600">
                      {result.emailSecurity.dmarcPolicyRoadmap.estimatedTimeToFullProtection}
                    </span>
                  </div>
                </div>

                {/* Recommended Next Step */}
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-6">
                  <p className="text-[10px] text-blue-400 uppercase tracking-wider mb-1 font-medium">Next Step</p>
                  <p className="text-sm text-blue-300 font-medium">{result.emailSecurity.dmarcPolicyRoadmap.recommendedNextStep}</p>
                </div>

                {/* Steps Timeline */}
                <div className="space-y-4">
                  {result.emailSecurity.dmarcPolicyRoadmap.steps.map((step, i) => (
                    <div key={i} className={`rounded-xl border overflow-hidden ${
                      step.isCurrentStep ? 'border-blue-500/50 bg-blue-500/5' :
                      step.isCompleted ? 'border-emerald-500/30 bg-emerald-500/5' :
                      step.isLocked ? 'border-dark-border bg-dark-bg/50 opacity-60' :
                      'border-dark-border bg-dark-bg'
                    }`}>
                      {/* Step Header */}
                      <div className={`p-4 ${
                        step.isCurrentStep ? 'bg-blue-500/10' :
                        step.isCompleted ? 'bg-emerald-500/10' :
                        ''
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            step.isCompleted ? 'bg-emerald-500 text-white' :
                            step.isCurrentStep ? 'bg-blue-500 text-white' :
                            'bg-dark-surface text-brand-500 border border-dark-border'
                          }`}>
                            {step.isCompleted ? '✓' : i + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-dark-text">{step.title}</span>
                              {step.isCurrentStep && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-500/20 text-blue-400">
                                  Current
                                </span>
                              )}
                              {step.isCompleted && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-400">
                                  Done
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-brand-600 mt-0.5">Timeline: {step.timeline}</p>
                          </div>
                        </div>
                        <p className="text-xs text-brand-400 mt-2 ml-11">{step.description}</p>
                      </div>

                      {/* Expanded Content (current step only) */}
                      {step.isCurrentStep && (
                        <div className="p-4 border-t border-dark-border space-y-4">
                          {/* Prerequisites */}
                          {step.prerequisites.length > 0 && (
                            <div>
                              <p className="text-[10px] text-brand-600 uppercase tracking-wider mb-2 font-medium">Prerequisites</p>
                              <div className="space-y-1.5">
                                {step.prerequisites.map((p, j) => (
                                  <div key={j} className="flex items-start gap-2">
                                    <span className={`mt-0.5 ${p.met ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {p.met ? '✓' : '✗'}
                                    </span>
                                    <div>
                                      <span className={`text-xs font-medium ${p.met ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {p.name}
                                      </span>
                                      <p className="text-[10px] text-brand-600">{p.detail}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* DNS Record */}
                          {step.dnsRecord && (
                            <div>
                              <p className="text-[10px] text-brand-600 uppercase tracking-wider mb-1 font-medium">DNS Record to Set</p>
                              <pre className="p-2 rounded bg-dark-bg text-[10px] text-brand-400 font-mono overflow-x-auto border border-dark-border">
                                _dmarc.{target} → &quot;{step.dnsRecord}&quot;
                              </pre>
                            </div>
                          )}

                          {/* Validation Checks */}
                          <div>
                            <p className="text-[10px] text-brand-600 uppercase tracking-wider mb-2 font-medium">How to Validate</p>
                            <div className="space-y-1.5">
                              {step.validationChecks.map((v, j) => (
                                <div key={j} className="p-2 rounded bg-dark-bg border border-dark-border">
                                  <span className="text-xs font-medium text-dark-text">{v.name}</span>
                                  <p className="text-[10px] text-brand-500">{v.description}</p>
                                  <p className="text-[10px] text-brand-600 italic mt-0.5">How: {v.howToCheck}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Risks */}
                          {step.risks.length > 0 && (
                            <div>
                              <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-1 font-medium">Risks</p>
                              <ul className="space-y-1">
                                {step.risks.map((r, j) => (
                                  <li key={j} className="flex items-start gap-1.5 text-[10px] text-amber-300">
                                    <span className="mt-0.5">⚠</span> {r}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Rollback */}
                          <div className="p-2 rounded bg-dark-surface border border-dark-border">
                            <p className="text-[10px] text-brand-600 uppercase tracking-wider mb-0.5 font-medium">Rollback Plan</p>
                            <p className="text-[10px] text-brand-400">{step.rollbackPlan}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SPF Alignment Check */}
            {result.emailSecurity?.spfAlignment && (
              <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-dark-text mb-3 font-[family-name:var(--font-display)]">
                  SPF Alignment with DMARC
                </h3>
                <p className="text-xs text-brand-500 mb-4">
                  Checks if your SPF record aligns with DMARC to actually prevent email spoofing.
                </p>

                {/* Status Banner */}
                <div className={`p-4 rounded-xl mb-4 ${
                  result.emailSecurity.spfAlignment.riskLevel === 'good' ? 'bg-emerald-500/10 border border-emerald-500/20' :
                  result.emailSecurity.spfAlignment.riskLevel === 'medium' ? 'bg-amber-500/10 border border-amber-500/20' :
                  'bg-red-500/10 border border-red-500/20'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-2xl font-bold font-[family-name:var(--font-display)] ${
                      result.emailSecurity.spfAlignment.alignmentResult === 'pass' ? 'text-emerald-400' :
                      result.emailSecurity.spfAlignment.alignmentResult === 'fail' ? 'text-red-400' :
                      'text-amber-400'
                    }`}>
                      {result.emailSecurity.spfAlignment.alignmentResult === 'pass' ? '✓ Aligned' :
                       result.emailSecurity.spfAlignment.alignmentResult === 'fail' ? '✗ Not Aligned' :
                       '⚠ Partial'}
                    </span>
                    {result.emailSecurity.spfAlignment.alignmentMode !== 'unknown' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-dark-bg text-brand-400 border border-dark-border">
                        {result.emailSecurity.spfAlignment.alignmentMode} mode
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-brand-400">{result.emailSecurity.spfAlignment.explanation}</p>
                </div>

                {/* Technical Detail */}
                <div className="p-3 rounded-lg bg-dark-bg border border-dark-border mb-4">
                  <p className="text-[10px] text-brand-600 uppercase tracking-wider mb-1 font-medium">Technical Detail</p>
                  <p className="text-xs text-brand-400">{result.emailSecurity.spfAlignment.technicalDetail}</p>
                </div>

                {/* Impact */}
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 mb-4">
                  <p className="text-[10px] text-red-400 uppercase tracking-wider mb-1 font-medium">Impact</p>
                  <p className="text-xs text-red-300">{result.emailSecurity.spfAlignment.impact}</p>
                </div>

                {/* Sender Analysis */}
                {result.emailSecurity.spfAlignment.senderAnalysis.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2">
                      Detected Email Sources ({result.emailSecurity.spfAlignment.senderAnalysis.length})
                    </p>
                    <div className="space-y-2">
                      {result.emailSecurity.spfAlignment.senderAnalysis.map((s, i) => (
                        <div key={i} className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-dark-text">{s.source}</span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-400">
                              {s.spfResult}
                            </span>
                          </div>
                          <p className="text-[10px] text-brand-600 mt-1">IP: {s.ipRange}</p>
                          <p className="text-[10px] text-brand-600">Alignment: {s.alignmentResult}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fixes */}
                {result.emailSecurity.spfAlignment.fixes.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2">
                      Recommended Fixes ({result.emailSecurity.spfAlignment.fixes.length})
                    </p>
                    <div className="space-y-2">
                      {result.emailSecurity.spfAlignment.fixes.map((f, i) => (
                        <div key={i} className="p-3 rounded-lg bg-dark-bg border border-dark-border">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              f.priority === 'immediate' ? 'bg-red-500/20 text-red-400' :
                              f.priority === 'soon' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {f.priority}
                            </span>
                            <span className="text-[10px] text-brand-600">{f.effort} effort</span>
                          </div>
                          <p className="text-xs text-dark-text font-medium mb-1">{f.action}</p>
                          <p className="text-[10px] text-brand-500">{f.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DKIM Key Strength Analysis */}
            {result.emailSecurity?.dkimStrength && (
              <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-dark-text mb-3 font-[family-name:var(--font-display)]">
                  DKIM Key Strength Analysis
                </h3>
                <p className="text-xs text-brand-500 mb-4">
                  Evaluates your DKIM configuration, key size, and cryptographic strength.
                </p>

                {/* Grade Banner */}
                <div className={`p-4 rounded-xl mb-4 ${
                  result.emailSecurity.dkimStrength.riskLevel === 'good' ? 'bg-emerald-500/10 border border-emerald-500/20' :
                  result.emailSecurity.dkimStrength.riskLevel === 'low' ? 'bg-blue-500/10 border border-blue-500/20' :
                  result.emailSecurity.dkimStrength.riskLevel === 'medium' ? 'bg-amber-500/10 border border-amber-500/20' :
                  'bg-red-500/10 border border-red-500/20'
                }`}>
                  <div className="flex items-center gap-4">
                    <span className={`text-4xl font-bold font-[family-name:var(--font-display)] ${
                      result.emailSecurity.dkimStrength.strengthGrade === 'A' ? 'text-emerald-400' :
                      result.emailSecurity.dkimStrength.strengthGrade === 'B' ? 'text-blue-400' :
                      result.emailSecurity.dkimStrength.strengthGrade === 'C' ? 'text-amber-400' :
                      'text-red-400'
                    }`}>
                      {result.emailSecurity.dkimStrength.strengthGrade}
                    </span>
                    <div>
                      <span className="text-sm font-semibold text-dark-text">{result.emailSecurity.dkimStrength.strengthLabel}</span>
                      {result.emailSecurity.dkimStrength.keySize && (
                        <span className="ml-2 text-xs text-brand-500">({result.emailSecurity.dkimStrength.keySize}-bit {result.emailSecurity.dkimStrength.keyAlgorithm})</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-brand-400 mt-2">{result.emailSecurity.dkimStrength.explanation}</p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {result.emailSecurity.dkimStrength.details.map((d, i) => (
                    <div key={i} className={`p-2 rounded-lg border text-xs ${
                      d.status === 'good' ? 'bg-emerald-500/5 border-emerald-500/10' :
                      d.status === 'warning' ? 'bg-amber-500/5 border-amber-500/10' :
                      d.status === 'bad' ? 'bg-red-500/5 border-red-500/10' :
                      'bg-dark-bg border-dark-border'
                    }`}>
                      <span className="text-[10px] text-brand-600 uppercase">{d.label}</span>
                      <p className={`font-medium ${
                        d.status === 'good' ? 'text-emerald-400' :
                        d.status === 'warning' ? 'text-amber-400' :
                        d.status === 'bad' ? 'text-red-400' :
                        'text-brand-400'
                      }`}>{d.value}</p>
                    </div>
                  ))}
                </div>

                {/* Fixes */}
                {result.emailSecurity.dkimStrength.fixes.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2">
                      Recommended Fixes ({result.emailSecurity.dkimStrength.fixes.length})
                    </p>
                    <div className="space-y-2">
                      {result.emailSecurity.dkimStrength.fixes.map((f, i) => (
                        <div key={i} className="p-3 rounded-lg bg-dark-bg border border-dark-border">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              f.priority === 'immediate' ? 'bg-red-500/20 text-red-400' :
                              f.priority === 'soon' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {f.priority}
                            </span>
                            <span className="text-[10px] text-brand-600">{f.effort} effort</span>
                          </div>
                          <p className="text-xs text-dark-text font-medium mb-1">{f.action}</p>
                          <p className="text-[10px] text-brand-500">{f.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* BIMI Record Check */}
            {result.emailSecurity?.bimi && (
              <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-dark-text mb-3 font-[family-name:var(--font-display)]">
                  BIMI — Brand Logo in Inbox
                </h3>
                <p className="text-xs text-brand-500 mb-4">
                  Brand Indicators for Message Identification — display your logo next to emails in Gmail, Yahoo, and Apple Mail.
                </p>

                {/* Status Banner */}
                <div className={`p-4 rounded-xl mb-4 ${
                  result.emailSecurity.bimi.configured ? 'bg-emerald-500/10 border border-emerald-500/20' :
                  result.emailSecurity.bimi.riskLevel === 'low' ? 'bg-blue-500/10 border border-blue-500/20' :
                  'bg-amber-500/10 border border-amber-500/20'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-2xl font-bold font-[family-name:var(--font-display)] ${
                      result.emailSecurity.bimi.configured ? 'text-emerald-400' :
                      result.emailSecurity.bimi.riskLevel === 'low' ? 'text-blue-400' :
                      'text-amber-400'
                    }`}>
                      {result.emailSecurity.bimi.configured ? '✓ BIMI Active' :
                       result.emailSecurity.bimi.riskLevel === 'low' ? '📋 Ready to Configure' :
                       '⚠️ Not Configured'}
                    </span>
                    {result.emailSecurity.bimi.vmcPresent && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-400">
                        VMC Verified
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-brand-400">{result.emailSecurity.bimi.explanation}</p>
                </div>

                {/* Prerequisites */}
                {result.emailSecurity.bimi.prerequisites.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] text-brand-600 uppercase tracking-wider mb-2 font-medium">Prerequisites</p>
                    <div className="space-y-1.5">
                      {result.emailSecurity.bimi.prerequisites.map((p, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className={`mt-0.5 ${p.met ? 'text-emerald-400' : 'text-red-400'}`}>
                            {p.met ? '✓' : '✗'}
                          </span>
                          <span className={`text-xs ${p.met ? 'text-emerald-400' : 'text-red-400'}`}>
                            {p.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Benefits */}
                {result.emailSecurity.bimi.benefits.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] text-brand-600 uppercase tracking-wider mb-2 font-medium">Benefits</p>
                    <div className="space-y-1">
                      {result.emailSecurity.bimi.benefits.map((b, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-brand-400">
                          <span className="text-emerald-400 mt-0.5">✓</span> {b}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fixes */}
                {result.emailSecurity.bimi.fixes.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2">
                      How to Enable BIMI ({result.emailSecurity.bimi.fixes.length} steps)
                    </p>
                    <div className="space-y-2">
                      {result.emailSecurity.bimi.fixes.map((f, i) => (
                        <div key={i} className="p-3 rounded-lg bg-dark-bg border border-dark-border">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              f.priority === 'immediate' ? 'bg-red-500/20 text-red-400' :
                              f.priority === 'soon' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {f.priority}
                            </span>
                            <span className="text-[10px] text-brand-600">{f.effort} effort</span>
                          </div>
                          <p className="text-xs text-dark-text font-medium mb-1">{f.action}</p>
                          <p className="text-[10px] text-brand-500">{f.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MTA-STS Check */}
            {result.emailSecurity?.mtaSts && (
              <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-dark-text mb-3 font-[family-name:var(--font-display)]">
                  MTA-STS — Email Encryption in Transit
                </h3>
                <p className="text-xs text-brand-500 mb-4">
                  Mail Transfer Agent Strict Transport Security — enforces TLS encryption when delivering email to your domain.
                </p>

                {/* Status Banner */}
                <div className={`p-4 rounded-xl mb-4 ${
                  result.emailSecurity.mtaSts.riskLevel === 'good' ? 'bg-emerald-500/10 border border-emerald-500/20' :
                  result.emailSecurity.mtaSts.riskLevel === 'medium' ? 'bg-amber-500/10 border border-amber-500/20' :
                  'bg-red-500/10 border border-red-500/20'
                }`}>
                  <span className={`text-2xl font-bold font-[family-name:var(--font-display)] ${
                    result.emailSecurity.mtaSts.riskLevel === 'good' ? 'text-emerald-400' :
                    result.emailSecurity.mtaSts.riskLevel === 'medium' ? 'text-amber-400' :
                    'text-red-400'
                  }`}>
                    {result.emailSecurity.mtaSts.configured ? '✓ MTA-STS Active' : '⚠️ Not Configured'}
                  </span>
                  <p className="text-sm text-brand-400 mt-2">{result.emailSecurity.mtaSts.explanation}</p>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {result.emailSecurity.mtaSts.details.map((d, i) => (
                    <div key={i} className={`p-2 rounded-lg border text-xs ${
                      d.status === 'good' ? 'bg-emerald-500/5 border-emerald-500/10' :
                      d.status === 'bad' ? 'bg-red-500/5 border-red-500/10' :
                      'bg-dark-bg border-dark-border'
                    }`}>
                      <span className="text-[10px] text-brand-600 uppercase">{d.label}</span>
                      <p className={`font-medium ${
                        d.status === 'good' ? 'text-emerald-400' :
                        d.status === 'bad' ? 'text-red-400' :
                        'text-brand-400'
                      }`}>{d.value}</p>
                    </div>
                  ))}
                </div>

                {/* Fixes */}
                {result.emailSecurity.mtaSts.fixes.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2">
                      How to Enable MTA-STS ({result.emailSecurity.mtaSts.fixes.length} steps)
                    </p>
                    <div className="space-y-2">
                      {result.emailSecurity.mtaSts.fixes.map((f, i) => (
                        <div key={i} className="p-3 rounded-lg bg-dark-bg border border-dark-border">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              f.priority === 'immediate' ? 'bg-red-500/20 text-red-400' :
                              f.priority === 'soon' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {f.priority}
                            </span>
                            <span className="text-[10px] text-brand-600">{f.effort} effort</span>
                          </div>
                          <p className="text-xs text-dark-text font-medium mb-1">{f.action}</p>
                          <p className="text-[10px] text-brand-500">{f.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VirusTotal Domain Reputation */}
            {result.virusTotal && (
              <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-dark-text mb-3 font-[family-name:var(--font-display)]">
                  Domain Reputation (VirusTotal)
                </h3>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-2xl font-bold ${result.virusTotal.riskLevel === 'safe' ? 'text-emerald-400' : result.virusTotal.riskLevel === 'suspicious' ? 'text-amber-400' : 'text-red-400'}`}>
                    {result.virusTotal.riskLevel === 'safe' ? '✓ Safe' : result.virusTotal.riskLevel === 'suspicious' ? '⚠ Suspicious' : result.virusTotal.riskLevel === 'malicious' ? '🚨 Malicious' : '? Unknown'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3 text-center">
                  <div className="p-2 rounded bg-dark-bg"><span className="text-sm font-bold text-red-400">{result.virusTotal.malicious}</span><p className="text-[10px] text-brand-600">Malicious</p></div>
                  <div className="p-2 rounded bg-dark-bg"><span className="text-sm font-bold text-amber-400">{result.virusTotal.suspicious}</span><p className="text-[10px] text-brand-600">Suspicious</p></div>
                  <div className="p-2 rounded bg-dark-bg"><span className="text-sm font-bold text-emerald-400">{result.virusTotal.harmless}</span><p className="text-[10px] text-brand-600">Harmless</p></div>
                  <div className="p-2 rounded bg-dark-bg"><span className="text-sm font-bold text-brand-400">{result.virusTotal.reputation}</span><p className="text-[10px] text-brand-600">Reputation</p></div>
                </div>
                {result.virusTotal.findings.map((f, i) => (
                  <div key={i} className="p-2 rounded bg-dark-bg text-xs text-brand-400">{f.plainEnglish}</div>
                ))}
              </div>
            )}

            {/* Port Scan */}
            {result.portScan && (
              <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-dark-text mb-3 font-[family-name:var(--font-display)]">
                  Port Scan
                </h3>
                <p className="text-sm text-brand-400 mb-3">
                  <span className="font-bold text-dark-text">{result.portScan.openPorts}</span> open port(s) detected
                </p>
                {result.portScan.ports.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {result.portScan.ports.map((p, i) => (
                      <span key={i} className={`px-2 py-1 rounded text-xs font-medium ${
                        p.risk === 'critical' ? 'bg-red-500/20 text-red-400' :
                        p.risk === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        p.risk === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-brand-500/10 text-brand-400'
                      }`}>
                        {p.port}/{p.service}
                      </span>
                    ))}
                  </div>
                )}
                {result.portScan.findings.length > 0 && (
                  <div className="space-y-2">
                    {result.portScan.findings.map((f, i) => (
                      <div key={i} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                        <p className="text-xs font-medium text-dark-text mb-1">{f.title}</p>
                        <p className="text-[10px] text-brand-500">{f.plainEnglish}</p>
                        <p className="text-[10px] text-emerald-400 mt-1">Fix: {f.remediation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
        Guardian — Africa-First AI-Native Threat Intelligence
      </footer>
    </div>
  );
}

/* =====================================================================
   PARSED AI ANALYSIS — Renders structured JSON from AI beautifully
   ===================================================================== */

interface ParsedAnalysis {
  risk_score?: number;
  overall_score?: number;
  summary?: string;
  risk_summary?: string;
  critical_findings?: string[];
  attack_paths?: Array<{
    name: string;
    description: string;
    severity: string;
    steps: string[];
  }>;
  remediation_priority?: Array<{
    action: string;
    why: string;
    effort: string;
  }>;
  african_context?: string;
  disclaimer?: string;
}

function ParsedAIAnalysis({ analysis, summary }: { analysis: string; summary: string }) {
  let parsed: ParsedAnalysis = {};
  let isJson = false;

  try {
    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
      isJson = true;
    }
  } catch {
    // Not JSON
  }

  // If not useful JSON, show summary + raw text
  if (!isJson || (!parsed.critical_findings && !parsed.remediation_priority && !parsed.attack_paths)) {
    return (
      <div className="space-y-3">
        {summary && <p className="text-sm text-brand-300 leading-relaxed">{summary}</p>}
        {analysis && !analysis.includes('available on Starter') && (
          <p className="text-xs text-brand-500 leading-relaxed whitespace-pre-wrap mt-2">{analysis}</p>
        )}
      </div>
    );
  }

  const criticals = parsed.critical_findings || [];
  const attackPaths = parsed.attack_paths || [];
  const remediation = parsed.remediation_priority || [];
  const africanContext = parsed.african_context;

  return (
    <div className="space-y-4">
      {/* Summary */}
      {(parsed.risk_summary || parsed.summary || summary) && (
        <p className="text-sm text-brand-300 leading-relaxed">
          {parsed.risk_summary || parsed.summary || summary}
        </p>
      )}

      {/* Critical Findings */}
      {criticals.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Critical Findings</p>
          <div className="space-y-1.5">
            {criticals.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-red-300">
                <span className="text-red-500 mt-0.5">•</span>
                <span>{f.replace(/^\[.*?\]\s*/, '')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attack Paths */}
      {attackPaths.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2">Attack Paths</p>
          <div className="space-y-2">
            {attackPaths.map((path, i) => (
              <div key={i} className="p-3 rounded-lg bg-dark-bg/50 border border-dark-border">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-dark-text">{path.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    path.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                    path.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>{path.severity}</span>
                </div>
                <p className="text-xs text-brand-500">{path.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remediation */}
      {remediation.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Remediation Priority</p>
          <div className="space-y-1.5">
            {remediation.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 ${
                  item.effort === 'low' ? 'text-emerald-500' :
                  item.effort === 'medium' ? 'text-yellow-500' : 'text-red-500'
                }`}>→</span>
                <div>
                  <span className="text-brand-300">{item.action}</span>
                  <span className="text-brand-600 text-xs ml-2">({item.effort} effort)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* African Context */}
      {africanContext && (
        <div className="p-3 rounded-lg bg-brand-500/5 border border-brand-500/10">
          <p className="text-xs font-semibold text-brand-400 mb-1">African Context</p>
          <p className="text-xs text-brand-500">{africanContext}</p>
        </div>
      )}

      {/* Disclaimer */}
      {parsed.disclaimer && (
        <p className="text-[10px] text-brand-700 italic">{parsed.disclaimer}</p>
      )}
    </div>
  );
}
