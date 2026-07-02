'use client';

import { useState } from 'react';
import { Shield, ArrowRight, Loader2, AlertTriangle, CheckCircle, XCircle, Globe, Lock } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import SignInModal from '@/components/auth/SignInModal';

type ScanStatus = 'idle' | 'scanning' | 'done' | 'error' | 'requires_auth';

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

function getScoreBg(score: number) {
  if (score >= 80) return 'bg-green-500/10 border-green-500/20';
  if (score >= 60) return 'bg-yellow-500/10 border-yellow-500/20';
  if (score >= 40) return 'bg-orange-500/10 border-orange-500/20';
  return 'bg-red-500/10 border-red-500/20';
}

function getSeverityColor(sev: string) {
  switch (sev) {
    case 'critical': return 'bg-red-500/10 text-red-600 border-red-500/20';
    case 'high': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'low': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
  }
}

interface ScanResult {
  id: string;
  target: string;
  risk_score: number;
  findings: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  risk_summary: string;
  details: Array<{
    title: string;
    severity: string;
    category: string;
  }>;
  upgrade_gated: boolean;
  ai_analysis: string;
  disclaimers: string[];
  created_at: string;
  compliance?: {
    overallScore: number;
    regulations: Array<{
      name: string;
      score: number;
      passed: number;
      failed: number;
      total: number;
      criticalFailures: Array<{
        control: string;
        section: string;
        title: string;
        plainEnglish: string;
        remediation: string;
        effort: string;
      }>;
    }>;
    failedControls: Array<{
      id: string;
      regulation: string;
      section: string;
      title: string;
      plainEnglish: string;
      remediation: string;
      effort: string;
      actual: string;
      expected: string;
    }>;
    context: Record<string, unknown>;
  };
  emailSecurity?: {
    score: number;
    dmarc: { present: boolean; record: string | null; policy: string | null; error: string | null };
    spf: { present: boolean; record: string | null; mechanism: string | null; error: string | null };
    dkim: { present: boolean; selector: string | null; record: string | null; error: string | null };
    mx: { present: boolean; records: string[]; error: string | null };
    findings: Array<{
      title: string;
      severity: string;
      category: string;
      plainEnglish: string;
      regulation: string;
      regulationSection: string;
      remediation: string;
    }>;
  };
  virusTotal?: {
    domain: string;
    malicious: number;
    suspicious: number;
    harmless: number;
    reputation: number;
    riskLevel: string;
    findings: Array<{ title: string; severity: string; plainEnglish: string }>;
  };
  portScan?: {
    domain: string;
    openPorts: number;
    ports: Array<{ port: number; service: string; risk: string; description: string }>;
    findings: Array<{ title: string; severity: string; plainEnglish: string; regulation: string; remediation: string }>;
  };
}

export default function ScanPage() {
  const [showSignIn, setShowSignIn] = useState(false);
  const [domain, setDomain] = useState('');
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');

  const handleScan = async () => {
    if (!domain.trim()) return;
    setStatus('scanning');
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: domain.trim(), mode: 'passive' }),
      });
      const data = await res.json();
      if (res.status === 401 && data.requiresAuth) {
        setStatus('requires_auth');
        setError(data.upgradePrompt || 'Please sign in to continue scanning.');
        return;
      }
      if (!res.ok) {
        setStatus('error');
        setError(data.error || 'Scan failed. Please try again.');
        return;
      }
      setResult(data);
      setStatus('done');
    } catch {
      setStatus('error');
      setError('Network error. Please check your connection and try again.');
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar onSignIn={() => setShowSignIn(true)} />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-100/40 via-surface to-surface" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 pt-16 sm:pt-24 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-100 border border-brand-200 text-brand-600 text-xs font-medium mb-6">
            <Lock className="w-3.5 h-3.5" /> Free — No login required
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.1] mb-4 font-[family-name:var(--font-display)]">
            Free Cybersecurity Scan
          </h1>
          <p className="text-base sm:text-lg text-brand-600 max-w-xl mx-auto mb-8">
            Enter any domain to get an instant risk assessment. See your score in under 60 seconds.
          </p>

          {/* Scan Input */}
          <div className="max-w-xl mx-auto">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400" />
                <input
                  type="text"
                  placeholder="e.g. econet.co.zw"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                  disabled={status === 'scanning'}
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white border border-brand-200 text-brand-800 placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-base disabled:opacity-50"
                />
              </div>
              <button
                onClick={handleScan}
                disabled={status === 'scanning' || !domain.trim()}
                className="px-6 py-4 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-400 text-white rounded-xl font-semibold transition-all inline-flex items-center gap-2 whitespace-nowrap btn-brand"
              >
                {status === 'scanning' ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Scanning...</>
                ) : (
                  <>Scan <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            </div>
            <p className="text-xs text-brand-500 mt-3">
              1 free scan per month. No account needed. Passive reconnaissance only.
            </p>
          </div>
        </div>
      </section>

      {/* Results */}
      {status === 'done' && result && (
        <section className="max-w-3xl mx-auto px-6 pb-16">
          <div className="bg-white rounded-2xl border border-brand-200 shadow-sm overflow-hidden">
            {/* Score Header */}
            <div className={`p-6 border-b border-brand-200/50 ${getScoreBg(result.risk_score)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-brand-500 uppercase tracking-wider mb-1">Risk Score</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-bold font-[family-name:var(--font-display)] ${getScoreColor(result.risk_score)}`}>
                      {result.risk_score}
                    </span>
                    <span className="text-brand-500 text-sm">/100</span>
                  </div>
                  <p className="text-xs text-brand-600 mt-1 font-medium">
                    {result.risk_score >= 80 ? '✅ Good security posture' :
                     result.risk_score >= 60 ? '⚠️ Moderate risk — improvements needed' :
                     result.risk_score >= 40 ? '🔴 High risk — action required' :
                     '🚨 Critical risk — immediate attention needed'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-brand-500 mb-1">Target</p>
                  <p className="font-mono text-sm text-brand-800">{result.target}</p>
                </div>
              </div>
            </div>

            {/* Score Breakdown — WHY this score */}
            <div className="p-6 border-b border-brand-200/50">
              <p className="text-xs text-brand-500 uppercase tracking-wider mb-3">Why this score?</p>
              <div className="space-y-2">
                {result.findings.critical > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-red-700 font-medium">{result.findings.critical} critical issue(s) — each majorly impacts your score</span>
                  </div>
                )}
                {result.findings.high > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-orange-700 font-medium">{result.findings.high} high-severity finding(s) — significant security gaps</span>
                  </div>
                )}
                {result.findings.medium > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="text-yellow-700 font-medium">{result.findings.medium} medium finding(s) — best-practice improvements needed</span>
                  </div>
                )}
                {result.findings.low > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-blue-700 font-medium">{result.findings.low} low finding(s) — minor recommendations</span>
                  </div>
                )}
                {result.findings.total === 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-green-700 font-medium">No issues detected — strong security posture</span>
                  </div>
                )}
                <p className="text-xs text-brand-500 mt-3 pt-3 border-t border-brand-200/50">
                  Score is calculated from: security headers ({'{'}HSTS, CSP, X-Frame-Options, etc.{'}'}), SSL/TLS configuration, open ports, subdomain exposure, and technology vulnerabilities. Each finding reduces your score based on severity.
                </p>
              </div>
            </div>

            {/* Findings Summary */}
            <div className="p-6 border-b border-brand-200/50">
              <p className="text-xs text-brand-500 uppercase tracking-wider mb-3">Findings</p>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Critical', count: result.findings.critical, color: 'text-red-600' },
                  { label: 'High', count: result.findings.high, color: 'text-orange-600' },
                  { label: 'Medium', count: result.findings.medium, color: 'text-yellow-600' },
                  { label: 'Low', count: result.findings.low, color: 'text-blue-600' },
                  { label: 'Info', count: result.findings.info, color: 'text-gray-600' },
                ].map(({ label, count, color }) => (
                  <div key={label} className="text-center p-2 rounded-lg bg-brand-50">
                    <div className={`text-lg font-bold font-[family-name:var(--font-display)] ${color}`}>{count}</div>
                    <div className="text-[10px] text-brand-500 uppercase">{label}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-brand-500 mt-3">
                Total: {result.findings.total} findings across all modules
              </p>
            </div>

            {/* Compliance Status */}
            {result.compliance && (
              <div className="p-6 border-b border-brand-200/50">
                <p className="text-xs text-brand-500 uppercase tracking-wider mb-3">Compliance Status</p>
                <p className="text-xs text-brand-600 mb-4">
                  Based on detected technologies and site configuration, here is your compliance posture:
                </p>
                
                {/* Regulation Scores */}
                <div className="space-y-3 mb-4">
                  {result.compliance.regulations.map((reg, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-brand-800">{reg.name}</span>
                          <span className={`text-sm font-bold ${reg.score >= 80 ? 'text-green-600' : reg.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {reg.score}%
                          </span>
                        </div>
                        <div className="w-full bg-brand-100 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${reg.score >= 80 ? 'bg-green-500' : reg.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${reg.score}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-brand-500 mt-1">
                          {reg.passed}/{reg.total} controls passed
                          {reg.failed > 0 && ` • ${reg.failed} failed`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Failed Controls with Plain English */}
                {result.compliance.failedControls.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
                      What Needs Fixing ({result.compliance.failedControls.length} issues)
                    </p>
                    <div className="space-y-3">
                      {result.compliance.failedControls.map((fc, i) => (
                        <div key={i} className="p-3 rounded-lg bg-red-50/50 border border-red-200/50">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-100 text-red-700">
                              {fc.regulation}
                            </span>
                            <span className="text-[10px] text-brand-500">{fc.section}</span>
                          </div>
                          <p className="text-sm font-medium text-brand-800 mb-1">{fc.title}</p>
                          <p className="text-xs text-brand-600 mb-2">{fc.plainEnglish}</p>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-red-500">Found: {fc.actual}</span>
                            <span className="text-brand-400">•</span>
                            <span className="text-green-600">Expected: {fc.expected}</span>
                          </div>
                          <p className="text-[10px] text-brand-500 mt-1 italic">Fix: {fc.remediation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.compliance.failedControls.length === 0 && (
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-green-800">All compliance controls passed</p>
                    <p className="text-xs text-green-600">Your site meets the checked regulatory requirements</p>
                  </div>
                )}
              </div>
            )}

            {/* Email Security */}
            {result.emailSecurity && (
              <div className="p-6 border-b border-brand-200/50">
                <p className="text-xs text-brand-500 uppercase tracking-wider mb-3">Email Security (DMARC/SPF/DKIM)</p>
                
                {/* Email Security Score */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`text-2xl font-bold font-[family-name:var(--font-display)] ${result.emailSecurity.score >= 80 ? 'text-green-600' : result.emailSecurity.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {result.emailSecurity.score}/100
                  </div>
                  <span className="text-xs text-brand-600">Email authentication score</span>
                </div>

                {/* Protocol Status */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className={`p-3 rounded-lg border ${result.emailSecurity.dmarc.present ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-2">
                      {result.emailSecurity.dmarc.present ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                      <span className="text-sm font-medium">DMARC</span>
                    </div>
                    <p className="text-[10px] text-brand-600 mt-1">
                      {result.emailSecurity.dmarc.present 
                        ? `Policy: ${result.emailSecurity.dmarc.policy || 'none'}`
                        : 'Not configured'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg border ${result.emailSecurity.spf.present ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-2">
                      {result.emailSecurity.spf.present ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                      <span className="text-sm font-medium">SPF</span>
                    </div>
                    <p className="text-[10px] text-brand-600 mt-1">
                      {result.emailSecurity.spf.present 
                        ? `Mechanism: ${result.emailSecurity.spf.mechanism || 'unknown'}`
                        : 'Not configured'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg border ${result.emailSecurity.dkim.present ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-2">
                      {result.emailSecurity.dkim.present ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                      <span className="text-sm font-medium">DKIM</span>
                    </div>
                    <p className="text-[10px] text-brand-600 mt-1">
                      {result.emailSecurity.dkim.present 
                        ? `Selector: ${result.emailSecurity.dkim.selector || 'unknown'}`
                        : 'Not configured'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg border ${result.emailSecurity.mx.present ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <div className="flex items-center gap-2">
                      {result.emailSecurity.mx.present ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                      <span className="text-sm font-medium">MX Records</span>
                    </div>
                    <p className="text-[10px] text-brand-600 mt-1">
                      {result.emailSecurity.mx.present 
                        ? `${result.emailSecurity.mx.records.length} record(s)`
                        : 'Not configured'}
                    </p>
                  </div>
                </div>

                {/* Email Security Findings */}
                {result.emailSecurity.findings.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
                      Email Security Issues ({result.emailSecurity.findings.length})
                    </p>
                    <div className="space-y-3">
                      {result.emailSecurity.findings.map((f, i) => (
                        <div key={i} className="p-3 rounded-lg bg-red-50/50 border border-red-200/50">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              f.severity === 'critical' ? 'bg-red-100 text-red-700' :
                              f.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {f.severity}
                            </span>
                            <span className="text-[10px] text-brand-500">{f.regulation} {f.regulationSection}</span>
                          </div>
                          <p className="text-sm font-medium text-brand-800 mb-1">{f.title}</p>
                          <p className="text-xs text-brand-600 mb-2">{f.plainEnglish}</p>
                          <p className="text-[10px] text-brand-500 italic">Fix: {f.remediation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VirusTotal Domain Reputation */}
            {result.virusTotal && (
              <div className="p-6 border-b border-brand-200/50">
                <p className="text-xs text-brand-500 uppercase tracking-wider mb-3">Domain Reputation (VirusTotal)</p>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-2xl font-bold font-[family-name:var(--font-display)] ${
                    result.virusTotal.riskLevel === 'safe' ? 'text-green-600' :
                    result.virusTotal.riskLevel === 'suspicious' ? 'text-yellow-600' :
                    result.virusTotal.riskLevel === 'malicious' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {result.virusTotal.riskLevel === 'safe' ? '✓ Safe' :
                     result.virusTotal.riskLevel === 'suspicious' ? '⚠ Suspicious' :
                     result.virusTotal.riskLevel === 'malicious' ? '🚨 Malicious' : '? Unknown'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3 text-center">
                  <div className="p-2 rounded bg-red-50"><span className="text-sm font-bold text-red-600">{result.virusTotal.malicious}</span><p className="text-[10px] text-brand-500">Malicious</p></div>
                  <div className="p-2 rounded bg-yellow-50"><span className="text-sm font-bold text-yellow-600">{result.virusTotal.suspicious}</span><p className="text-[10px] text-brand-500">Suspicious</p></div>
                  <div className="p-2 rounded bg-green-50"><span className="text-sm font-bold text-green-600">{result.virusTotal.harmless}</span><p className="text-[10px] text-brand-500">Harmless</p></div>
                  <div className="p-2 rounded bg-gray-50"><span className="text-sm font-bold text-gray-600">{result.virusTotal.reputation}</span><p className="text-[10px] text-brand-500">Reputation</p></div>
                </div>
                {result.virusTotal.findings.map((f, i) => (
                  <div key={i} className="p-2 rounded bg-brand-50/50 text-xs text-brand-700">{f.plainEnglish}</div>
                ))}
              </div>
            )}

            {/* Port Scan */}
            {result.portScan && (
              <div className="p-6 border-b border-brand-200/50">
                <p className="text-xs text-brand-500 uppercase tracking-wider mb-3">Port Scan</p>
                <p className="text-sm text-brand-700 mb-3">
                  <span className="font-bold">{result.portScan.openPorts}</span> open port(s) detected
                </p>
                {result.portScan.ports.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {result.portScan.ports.map((p, i) => (
                      <span key={i} className={`px-2 py-1 rounded text-xs font-medium ${
                        p.risk === 'critical' ? 'bg-red-100 text-red-700' :
                        p.risk === 'high' ? 'bg-orange-100 text-orange-700' :
                        p.risk === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {p.port}/{p.service}
                      </span>
                    ))}
                  </div>
                )}
                {result.portScan.findings.length > 0 && (
                  <div className="space-y-2">
                    {result.portScan.findings.map((f, i) => (
                      <div key={i} className="p-3 rounded-lg bg-red-50/50 border border-red-200/50">
                        <p className="text-sm font-medium text-brand-800 mb-1">{f.title}</p>
                        <p className="text-xs text-brand-600 mb-1">{f.plainEnglish}</p>
                        <p className="text-[10px] text-brand-500 italic">Regulation: {f.regulation}</p>
                        <p className="text-[10px] text-green-600 italic">Fix: {f.remediation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Findings List (Preview) */}
            {result.details.length > 0 && (
              <div className="p-6 border-b border-brand-200/50">
                <p className="text-xs text-brand-500 uppercase tracking-wider mb-3">Top Findings</p>
                <div className="space-y-2">
                  {result.details.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-brand-50/50">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${getSeverityColor(f.severity)}`}>
                        {f.severity}
                      </span>
                      <span className="text-sm text-brand-800 flex-1">{f.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Analysis (Parsed) — always show during beta */}
            {result.ai_analysis && !result.ai_analysis.includes('available on Starter') && (
              <AIAnalysisSection analysis={result.ai_analysis} />
            )}

            {/* Upgrade Gate — Beta: all features free (hidden during beta) */}
            {/* {result.upgrade_gated && (
              <div className="p-6 bg-brand-500/5">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-brand-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-brand-800 mb-1">Want the full picture?</p>
                    <p className="text-xs text-brand-600 mb-3">
                      Sign in to see AI-powered analysis, detailed remediation steps, attack path visualization, and downloadable reports.
                    </p>
                    <button
                      onClick={() => setShowSignIn(true)}
                      className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold transition-all"
                    >
                      Sign In for Full Access
                    </button>
                  </div>
                </div>
              </div>
            )} */}

            {/* Disclaimers */}
            <div className="p-4 bg-brand-50/50">
              {result.disclaimers.map((d, i) => (
                <p key={i} className="text-[10px] text-brand-500 flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  {d}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Requires Auth */}
      {status === 'requires_auth' && (
        <section className="max-w-xl mx-auto px-6 pb-16">
          <div className="bg-white rounded-2xl border border-brand-200 p-8 text-center">
            <Lock className="w-10 h-10 text-brand-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-brand-800 mb-2">Free scan limit reached</h3>
            <p className="text-sm text-brand-600 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowSignIn(true)}
                className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-semibold text-sm transition-all"
              >
                Sign In
              </button>
              <a
                href="/pricing"
                className="px-6 py-3 bg-brand-100 hover:bg-brand-200 text-brand-700 rounded-xl font-semibold text-sm transition-all"
              >
                View Pricing
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Error */}
      {status === 'error' && (
        <section className="max-w-xl mx-auto px-6 pb-16">
          <div className="bg-red-50 rounded-2xl border border-red-200 p-6 text-center">
            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold transition-all"
            >
              Try Again
            </button>
          </div>
        </section>
      )}

      <Footer />
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </div>
  );
}

/* =====================================================================
   AI ANALYSIS SECTION — Parses raw JSON from AI and renders beautifully
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
}

function AIAnalysisSection({ analysis }: { analysis: string }) {
  // Try to parse JSON from the analysis string
  let parsed: ParsedAnalysis = {};
  let isJson = false;

  try {
    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
      isJson = true;
    }
  } catch {
    // Not JSON — render as plain text
  }

  // If not JSON or no useful fields, render as formatted text
  if (!isJson || (!parsed.critical_findings && !parsed.remediation_priority && !parsed.attack_paths)) {
    return (
      <div className="p-6 border-b border-brand-200/50">
        <p className="text-xs text-brand-500 uppercase tracking-wider mb-3">AI Analysis</p>
        <div className="text-sm text-brand-700 leading-relaxed whitespace-pre-wrap bg-brand-50/50 rounded-lg p-4">
          {analysis}
        </div>
      </div>
    );
  }

  const score = parsed.risk_score || parsed.overall_score || 0;
  const summary = parsed.risk_summary || parsed.summary || '';
  const criticals = parsed.critical_findings || [];
  const attackPaths = parsed.attack_paths || [];
  const remediation = parsed.remediation_priority || [];
  const africanContext = parsed.african_context;

  return (
    <div className="p-6 border-b border-brand-200/50">
      <p className="text-xs text-brand-500 uppercase tracking-wider mb-4">AI Threat Analysis</p>

      {/* Summary */}
      {summary && (
        <div className="mb-5 p-4 bg-brand-50/80 rounded-xl border border-brand-200/50">
          <p className="text-sm text-brand-700 leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Critical Findings */}
      {criticals.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">Critical Findings</p>
          <div className="space-y-2">
            {criticals.map((finding, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-red-50/50 border border-red-200/50">
                <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-red-800">{finding.replace(/^\[.*?\]\s*/, '')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attack Paths */}
      {attackPaths.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-2">Attack Paths</p>
          <div className="space-y-3">
            {attackPaths.map((path, i) => (
              <div key={i} className="p-4 rounded-lg bg-orange-50/50 border border-orange-200/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${getSeverityColor(path.severity)}`}>
                    {path.severity}
                  </span>
                  <span className="text-sm font-semibold text-brand-800">{path.name}</span>
                </div>
                <p className="text-xs text-brand-600 mb-2">{path.description}</p>
                {path.steps.length > 0 && (
                  <ol className="list-decimal pl-4 space-y-1">
                    {path.steps.map((step, j) => (
                      <li key={j} className="text-xs text-brand-600">{step}</li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remediation */}
      {remediation.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">Remediation Priority</p>
          <div className="space-y-2">
            {remediation.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-green-50/50 border border-green-200/50">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-brand-800">{item.action}</p>
                  <p className="text-xs text-brand-600 mt-0.5">{item.why}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                    item.effort === 'low' ? 'bg-green-100 text-green-700' :
                    item.effort === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {item.effort} effort
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* African Context */}
      {africanContext && (
        <div className="p-4 bg-brand-50/80 rounded-xl border border-brand-200/50">
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1">African Context</p>
          <p className="text-sm text-brand-700">{africanContext}</p>
        </div>
      )}
    </div>
  );
}
