'use client';

import { useState } from 'react';
import { Search, Shield, Zap, Lock, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface Finding {
  title: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  category: string;
  evidence: Record<string, unknown>;
  remediation: string;
}

interface ScanResult {
  id: string;
  target: string;
  mode: string;
  status: string;
  scan_time_ms: number;
  tools_run: string[];
  findings: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  risk_score: number;
  risk_summary: string;
  ai_analysis: string;
  details: Finding[];
}

const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', icon: XCircle },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', icon: AlertTriangle },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', icon: AlertTriangle },
  low: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', icon: CheckCircle },
  info: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30', icon: CheckCircle },
};

export default function ScanInterface() {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedFinding, setExpandedFinding] = useState<number | null>(null);

  const handleScan = async () => {
    if (!target.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: target.trim(), mode: 'passive' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Scan failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 80) return 'LOW RISK';
    if (score >= 60) return 'MODERATE RISK';
    if (score >= 40) return 'HIGH RISK';
    return 'CRITICAL RISK';
  };

  return (
    <div className="min-h-screen bg-[#0A0E17] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#111827]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">SENTARI</h1>
              <p className="text-xs text-gray-400">Africa-First Threat Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Lock className="w-4 h-4" />
            <span>Passive Recon Mode</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Scan Input */}
        <div className="mb-8">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-2">Threat Assessment</h2>
            <p className="text-gray-400 text-center mb-6">Enter a domain to scan for vulnerabilities</p>
            
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                  placeholder="e.g., econet.co.zw"
                  className="w-full pl-12 pr-4 py-4 bg-[#1F2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  disabled={loading}
                />
              </div>
              <button
                onClick={handleScan}
                disabled={loading || !target.trim()}
                className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl font-semibold transition-all flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Scan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Risk Score Card */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{result.target}</h3>
                  <p className="text-sm text-gray-400">
                    Scanned in {(result.scan_time_ms / 1000).toFixed(1)}s • {result.tools_run.length} tools used
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-bold ${getRiskColor(result.risk_score)}`}>
                    {result.risk_score}
                  </div>
                  <div className={`text-sm font-medium ${getRiskColor(result.risk_score)}`}>
                    {getRiskLabel(result.risk_score)}
                  </div>
                </div>
              </div>

              {/* Findings Summary */}
              <div className="grid grid-cols-5 gap-4 mt-6">
                {[
                  { label: 'Critical', count: result.findings.critical, color: 'text-red-400' },
                  { label: 'High', count: result.findings.high, color: 'text-orange-400' },
                  { label: 'Medium', count: result.findings.medium, color: 'text-yellow-400' },
                  { label: 'Low', count: result.findings.low, color: 'text-blue-400' },
                  { label: 'Info', count: result.findings.info, color: 'text-gray-400' },
                ].map(({ label, count, color }) => (
                  <div key={label} className="text-center p-3 bg-[#1F2937] rounded-xl">
                    <div className={`text-2xl font-bold ${color}`}>{count}</div>
                    <div className="text-xs text-gray-400">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Analysis */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                AI Threat Analysis
              </h3>
              <p className="text-gray-300 leading-relaxed">{result.risk_summary}</p>
            </div>

            {/* Findings List */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4">
                Vulnerabilities ({result.details.length})
              </h3>
              
              {result.details.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
                  <p>No vulnerabilities detected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {result.details.map((finding, idx) => {
                    const config = SEVERITY_COLORS[finding.severity];
                    const Icon = config.icon;
                    const isExpanded = expandedFinding === idx;

                    return (
                      <div
                        key={idx}
                        className={`border ${config.border} rounded-xl overflow-hidden`}
                      >
                        <button
                          onClick={() => setExpandedFinding(isExpanded ? null : idx)}
                          className={`w-full p-4 ${config.bg} flex items-center justify-between text-left`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-5 h-5 ${config.text}`} />
                            <div>
                              <span className={`text-xs font-medium ${config.text} uppercase`}>
                                {finding.severity}
                              </span>
                              <p className="text-white font-medium">{finding.title}</p>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                        
                        {isExpanded && (
                          <div className="p-4 bg-[#1F2937] border-t border-gray-800">
                            <div className="mb-3">
                              <span className="text-xs text-gray-400 uppercase">Category</span>
                              <p className="text-sm text-gray-300">{finding.category}</p>
                            </div>
                            <div className="mb-3">
                              <span className="text-xs text-gray-400 uppercase">Remediation</span>
                              <p className="text-sm text-gray-300">{finding.remediation}</p>
                            </div>
                            {Object.keys(finding.evidence).length > 0 && (
                              <div>
                                <span className="text-xs text-gray-400 uppercase">Evidence</span>
                                <pre className="text-xs text-gray-400 mt-1 overflow-x-auto">
                                  {JSON.stringify(finding.evidence, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tools Used */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4">Scanning Tools Used</h3>
              <div className="flex flex-wrap gap-2">
                {result.tools_run.map((tool) => (
                  <span
                    key={tool}
                    className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-full text-sm"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Landing State (no scan yet) */}
        {!result && !loading && !error && (
          <div className="max-w-4xl mx-auto mt-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: Search,
                  title: 'Passive Recon',
                  desc: 'DNS, subdomains, ports, technology detection',
                },
                {
                  icon: Shield,
                  title: 'OSINT Analysis',
                  desc: 'SSL certs, security headers, exposed services',
                },
                {
                  icon: Zap,
                  title: 'AI-Powered Insights',
                  desc: 'Risk scoring, attack paths, remediation steps',
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="p-6 bg-[#111827] border border-gray-800 rounded-2xl text-center"
                >
                  <Icon className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">{title}</h3>
                  <p className="text-sm text-gray-400">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          SENTARI — Africa-First AI-Native Threat Intelligence • Built for Africa, by Africa
        </div>
      </footer>
    </div>
  );
}
