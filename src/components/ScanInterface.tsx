'use client';

import { useState, useEffect } from 'react';
import { Search, Shield, Zap, Lock, AlertTriangle, CheckCircle, XCircle, ChevronDown, Clock, Eye, Target, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import AuthButton from './AuthButton';
import { supabase } from '@/lib/supabase-browser';

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
  adaptiveDefense?: { threatLevel: string; threatScore: number; immediateActions: string[]; };
  userRole?: string;
}

const SEVERITY: Record<string, { bg: string; text: string; border: string; icon: typeof XCircle }> = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', icon: XCircle },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', icon: AlertTriangle },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: AlertTriangle },
  low: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', icon: CheckCircle },
  info: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', icon: CheckCircle },
};

const DEMOS = ['example.com', 'httpbin.org', 'elevatevaluepartners.co.zw', 'tarisai.co.zw'];

export default function ScanInterface() {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; target: string; risk_score: number | null; findings_count: number; created_at: string; }>>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState('');
  const [authMsg, setAuthMsg] = useState('');
  const [sending, setSending] = useState(false);

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

  async function loadHistory() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const r = await fetch('/api/scan?limit=20', { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (r.ok) { const d = await r.json(); setHistory(d.scans || []); }
    } catch {}
  };

  const handleSignIn = async () => {
    if (!email.trim()) return;
    setSending(true); setAuthMsg('');
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setAuthMsg(error.message);
    else { setAuthMsg('Check your email for the login link!'); setShowSignIn(false); }
    setSending(false);
  };

  const doScan = async (domain?: string) => {
    const t = domain || target;
    if (!t.trim()) return;
    if (!user) { setShowSignIn(true); return; }

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

  // ============ LANDING PAGE (not logged in) ============
  if (authReady && !user) {
    return (
      <div className="min-h-screen bg-[#06080d]">
        {/* Sign-in modal */}
        {showSignIn && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSignIn(false)}>
            <div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-1"><Shield className="w-5 h-5 text-cyan-400" /><span className="font-semibold text-white">Sign in to Guardian</span></div>
              <p className="text-xs text-slate-400 mb-4">Magic link — no password needed.</p>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSignIn()} placeholder="you@company.com" disabled={sending}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 mb-3" />
              <button onClick={handleSignIn} disabled={sending || !email.trim()}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 rounded-lg text-sm font-semibold text-white transition-all">
                {sending ? 'Sending...' : 'Send Magic Link'}
              </button>
              {authMsg && <p className={`text-xs mt-3 ${authMsg.includes('Check') ? 'text-emerald-400' : 'text-red-400'}`}>{authMsg}</p>}
              <button onClick={() => setShowSignIn(false)} className="text-xs text-slate-500 hover:text-slate-300 mt-3">Cancel</button>
            </div>
          </div>
        )}

        <header className="relative z-10 max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">GUARDIAN</span>
          </div>
          <button onClick={() => setShowSignIn(true)} className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg text-sm font-semibold text-white transition-all shadow-lg shadow-cyan-500/20">
            Sign In
          </button>
        </header>

        {/* Hero */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/3 rounded-full blur-[120px]" />
          <div className="relative z-10 max-w-4xl mx-auto px-6 pt-24 pb-32 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-8">
              <Sparkles className="w-3.5 h-3.5" /> AI-Native Cyber Defense for Africa
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight mb-6">
              Find what hackers<br />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">will find first.</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Automated vulnerability scanning powered by multi-model AI. Built for African businesses. Priced for African budgets.
            </p>
            <button onClick={() => setShowSignIn(true)}
              className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-semibold text-white transition-all shadow-lg shadow-cyan-500/25 inline-flex items-center gap-2">
              Start Free Scan <ArrowRight className="w-5 h-5" />
            </button>
            <div className="flex items-center justify-center gap-8 mt-12 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Free tier</span>
              <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-cyan-400" /> Data sovereign</span>
              <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-400" /> Results in seconds</span>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Built for the threats Africa faces</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Purpose-built for mobile money, USSD, and SIM-swap fraud patterns.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: '11 Scan Modules', desc: 'DNS, ports, tech, SSL, headers, subdomains, credentials, social OSINT, threat intel, African threats, forum monitoring.' },
              { icon: Zap, title: 'Multi-Model AI', desc: 'AI fusion across Groq, OpenRouter, HuggingFace, and Ollama for maximum coverage.' },
              { icon: Target, title: 'African Threat Intel', desc: 'SIM-swap, mobile money API abuse, USSD hijacking, BEC patterns.' },
            ].map(({ icon: I, title, desc }) => (
              <div key={title} className="p-6 bg-slate-800/30 border border-slate-700/50 rounded-2xl hover:border-cyan-500/30 transition-all">
                <I className="w-8 h-8 text-cyan-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-600">
          Guardian — Africa-First AI-Native Threat Intelligence
        </footer>
      </div>
    );
  }

  // ============ LOADING STATE ============
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#06080d] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-slate-600 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  // ============ SCANNER (logged in) ============
  return (
    <div className="min-h-screen bg-[#06080d]">
      {/* Sign-in modal */}
      {showSignIn && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSignIn(false)}>
          <div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-1"><Shield className="w-5 h-5 text-cyan-400" /><span className="font-semibold text-white">Sign in to Guardian</span></div>
            <p className="text-xs text-slate-400 mb-4">Magic link — no password needed.</p>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignIn()} placeholder="you@company.com" disabled={sending}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 mb-3" />
            <button onClick={handleSignIn} disabled={sending || !email.trim()}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 rounded-lg text-sm font-semibold text-white transition-all">
              {sending ? 'Sending...' : 'Send Magic Link'}
            </button>
            {authMsg && <p className={`text-xs mt-3 ${authMsg.includes('Check') ? 'text-emerald-400' : 'text-red-400'}`}>{authMsg}</p>}
            <button onClick={() => setShowSignIn(false)} className="text-xs text-slate-500 hover:text-slate-300 mt-3">Cancel</button>
          </div>
        </div>
      )}

      <header className="border-b border-slate-800/80 bg-[#0a0d14]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">GUARDIAN</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all">
              <Clock className="w-4 h-4" /> History
              {history.length > 0 && <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full text-xs">{history.length}</span>}
            </button>
            <AuthButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* History */}
        {showHistory && (
          <div className="mb-8 bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 animate-in">
            <h3 className="text-lg font-semibold text-white mb-4">Scan History</h3>
            {history.length === 0 ? <p className="text-slate-500 text-center py-6">No scans yet.</p> :
             <div className="space-y-2">
               {history.map(s => (
                 <div key={s.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                   <div className="flex items-center gap-4">
                     <div className={`text-2xl font-bold ${riskColor(s.risk_score || 0)}`}>{s.risk_score || '—'}</div>
                     <div><p className="font-medium text-white text-sm">{s.target}</p>
                     <p className="text-xs text-slate-400">{new Date(s.created_at).toLocaleDateString()} · {s.findings_count} findings</p></div>
                   </div>
                   <Eye className="w-4 h-4 text-slate-500" />
                 </div>
               ))}
             </div>
            }
          </div>
        )}

        {/* Scan Input */}
        <div className="mb-12">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-2">Threat Assessment</h2>
            <p className="text-slate-400 text-center mb-8">Enter a domain to scan</p>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input type="text" value={target} onChange={e => setTarget(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doScan()} placeholder="example.com" disabled={loading}
                  className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all text-sm" />
              </div>
              <button onClick={() => doScan()} disabled={loading || !target.trim()}
                className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 rounded-xl font-semibold text-white transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20">
                {loading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Scanning...</> : <><Zap className="w-5 h-5" /> Scan</>}
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {DEMOS.map(d => (
                <button key={d} onClick={() => doScan(d)} disabled={loading}
                  className="px-3 py-1.5 text-xs text-slate-400 bg-slate-800/30 border border-slate-700/30 rounded-lg hover:border-cyan-500/30 hover:text-cyan-400 transition-all disabled:opacity-50">
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}

        {/* Results */}
        {result && (
          <div className="space-y-6 animate-in">
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8">
              <div className="flex items-start justify-between mb-6">
                <div><h3 className="text-xl font-bold text-white">{result.target}</h3>
                <p className="text-sm text-slate-400 mt-1">{(result.scan_time_ms / 1000).toFixed(1)}s · {result.tools_run.length} modules</p></div>
                <div className="text-right">
                  <div className={`text-5xl font-bold ${riskColor(result.risk_score)}`}>{result.risk_score}</div>
                  <div className={`text-sm font-semibold ${riskColor(result.risk_score)} mt-1`}>{riskLabel(result.risk_score)}</div>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {[
                  { l: 'Critical', c: result.findings.critical, color: 'text-red-400' },
                  { l: 'High', c: result.findings.high, color: 'text-orange-400' },
                  { l: 'Medium', c: result.findings.medium, color: 'text-amber-400' },
                  { l: 'Low', c: result.findings.low, color: 'text-blue-400' },
                  { l: 'Info', c: result.findings.info, color: 'text-slate-400' },
                ].map(({ l, c, color }) => (
                  <div key={l} className="text-center p-3 bg-slate-800/50 rounded-xl">
                    <div className={`text-2xl font-bold ${color}`}>{c}</div>
                    <div className="text-xs text-slate-500 mt-1">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2"><Sparkles className="w-5 h-5 text-cyan-400" /> AI Analysis</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{result.risk_summary}</p>
            </div>

            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Vulnerabilities ({result.details.length})</h3>
              {result.details.length === 0 ? (
                <div className="text-center py-8 text-slate-400"><CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400" /><p>No vulnerabilities detected</p></div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(grouped).map(([cat, findings]) => (
                    <div key={cat}>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{cat.replace(/_/g, ' ')}</p>
                      <div className="space-y-2">
                        {findings.map((f, i) => {
                          const cfg = SEVERITY[f.severity] || SEVERITY.info;
                          const I = cfg.icon;
                          const idx = result.details.indexOf(f);
                          const isOpen = expanded === idx;
                          return (
                            <div key={i} className={`border ${cfg.border} rounded-xl overflow-hidden`}>
                              <button onClick={() => setExpanded(isOpen ? null : idx)}
                                className={`w-full p-4 ${cfg.bg} flex items-center justify-between text-left`}>
                                <div className="flex items-center gap-3 min-w-0">
                                  <I className={`w-4 h-4 ${cfg.text} flex-shrink-0`} />
                                  <div className="min-w-0">
                                    <span className={`text-[10px] font-bold ${cfg.text} uppercase tracking-wider`}>{f.severity}</span>
                                    <p className="text-sm text-white font-medium truncate">{f.title}</p>
                                  </div>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                              </button>
                              {isOpen && (
                                <div className="p-4 bg-slate-800/50 border-t border-slate-700/50">
                                  <p className="text-xs text-cyan-400 uppercase mb-1">Remediation</p>
                                  <p className="text-sm text-slate-300">{f.remediation}</p>
                                  {Object.keys(f.evidence).length > 0 && (
                                    <div className="mt-3">
                                      <p className="text-xs text-slate-500 uppercase mb-1">Evidence</p>
                                      <pre className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded-lg overflow-x-auto">{JSON.stringify(f.evidence, null, 2)}</pre>
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

            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Modules Run</h3>
              <div className="flex flex-wrap gap-2">
                {result.tools_run.map(t => <span key={t} className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-full text-xs font-medium">{t}</span>)}
              </div>
            </div>
          </div>
        )}

        {!result && !loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-8">
            {[
              { icon: Search, title: 'Recon', desc: 'DNS, ports, tech, subdomains' },
              { icon: Shield, title: 'OSINT', desc: 'SSL, headers, exposed services' },
              { icon: Target, title: 'Credentials', desc: 'Breaches, leaked secrets' },
              { icon: Zap, title: 'AI Analysis', desc: 'Risk scoring, attack paths' },
            ].map(({ icon: I, title, desc }) => (
              <div key={title} className="p-5 bg-slate-800/20 border border-slate-700/30 rounded-xl text-center">
                <I className="w-7 h-7 text-cyan-400/60 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-300 mb-1">{title}</h3>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/50 py-8 text-center text-xs text-slate-600">
        Guardian — Africa-First AI-Native Threat Intelligence
      </footer>
    </div>
  );
}
