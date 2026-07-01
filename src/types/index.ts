export interface Organization {
  id: string;
  name: string;
  domain: string;
  industry: string;
  tier: 'free' | 'starter' | 'professional' | 'enterprise';
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  org_id: string | null;
  full_name: string | null;
  role: 'admin' | 'manager' | 'analyst' | 'viewer';
  created_at: string;
}

export interface ScanTarget {
  id: string;
  org_id: string | null;
  created_by: string | null;
  target_url: string;
  target_type: 'domain' | 'subdomain' | 'ip' | 'url';
  scan_mode: 'passive' | 'active';
  status: 'pending' | 'scanning' | 'analyzing' | 'completed' | 'failed';
  created_at: string;
}

export interface ScanResult {
  id: string;
  target_id: string;
  scan_phase: 'recon' | 'osint' | 'analysis' | 'report';
  tool_name: string;
  raw_output: Record<string, unknown> | null;
  findings_count: number;
  started_at: string;
  completed_at: string | null;
}

export interface Vulnerability {
  id: string;
  target_id: string;
  title: string;
  description: string | null;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  category: string | null;
  evidence: Record<string, unknown> | null;
  remediation: string | null;
  cvss_score: number | null;
  is_resolved: boolean;
  discovered_at: string;
}

export interface AttackPath {
  id: string;
  target_id: string;
  path_name: string | null;
  description: string | null;
  steps: string[];
  risk_score: number;
  exploitability: 'theoretical' | 'practical' | 'trivial';
  created_at: string;
}

export interface AiAnalysis {
  id: string;
  target_id: string;
  model_used: string | null;
  analysis_output: string | null;
  risk_summary: string | null;
  overall_score: number | null;
  tokens_used: number | null;
  created_at: string;
}

export interface ScanSummary {
  target: ScanTarget;
  vulnerabilities: Vulnerability[];
  attack_paths: AttackPath[];
  analysis: AiAnalysis | null;
  results: ScanResult[];
}

export const SEVERITY_CONFIG = {
  critical: { color: '#DC2626', bg: '#FEE2E2', label: 'Critical' },
  high: { color: '#EA580C', bg: '#FFF7ED', label: 'High' },
  medium: { color: '#CA8A04', bg: '#FEFCE8', label: 'Medium' },
  low: { color: '#2563EB', bg: '#EFF6FF', label: 'Low' },
  info: { color: '#6B7280', bg: '#F9FAFB', label: 'Info' },
} as const;
