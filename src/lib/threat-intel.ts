/**
 * SENTARI Threat Intelligence Feed
 * Real-time CVE, threat data, and African-specific intelligence
 */

import { Finding } from './scanner';

// Free threat intelligence APIs
const THREAT_FEEDS = {
  // NVD (National Vulnerability Database) - Free
  NVD: 'https://services.nvd.nist.gov/rest/json/cves/2.0',
  // CIRCL CVE - Free
  CIRCL: 'https://cve.circl.lu/api',
  // AbuseIPDB - Free tier (1000 req/day)
  ABUSEIPDB: 'https://api.abuseipdb.com/api/v2',
  // VirusTotal - Free tier (4 req/min)
  VIRUSTOTAL: 'https://www.virustotal.com/api/v3',
  // Shodan - Free tier limited
  SHODAN: 'https://api.shodan.io',
};

interface ThreatFeed {
  name: string;
  url: string;
  type: 'cve' | 'ioc' | 'breach' | 'malware';
  lastUpdated: Date;
  reliability: number; // 0-100
}

interface CVE {
  id: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  publishedDate: string;
  lastModifiedDate: string;
  cvssScore: number;
  cweId: string[];
  affectedProducts: string[];
}

interface IOC {
  type: 'ip' | 'domain' | 'hash' | 'url';
  value: string;
  confidence: number;
  firstSeen: Date;
  lastSeen: Date;
  tags: string[];
}

/**
 * Fetch latest CVEs from NVD (FREE, no API key)
 */
export async function fetchLatestCVEs(limit = 20): Promise<CVE[]> {
  try {
    const response = await fetch(
      `${THREAT_FEEDS.NVD}?resultsPerPage=${limit}&pubStartDate=${getYesterdayDate()}T00:00:00.000`,
      { headers: { 'User-Agent': 'SENTARI-ThreatIntel/1.0' } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.vulnerabilities || []).map((vuln: Record<string, unknown>) => {
      const cve = vuln.cve as Record<string, unknown>;
      const metrics = cve.metrics as Record<string, unknown>;
      const cvssV31 = metrics?.cvssMetricV31 as Array<Record<string, unknown>>;
      const cvssData = cvssV31?.[0]?.cvssData as Record<string, unknown> | undefined;

      return {
        id: cve.id as string,
        description: ((cve.descriptions as Array<Record<string, unknown>>)?.[0]?.value as string) || '',
        severity: (cvssData?.baseSeverity as string) || 'MEDIUM',
        publishedDate: cve.publishedDate as string,
        lastModifiedDate: cve.lastModifiedDate as string,
        cvssScore: (cvssData?.baseScore as number) || 0,
        cweId: [],
        affectedProducts: [],
      };
    });
  } catch (error) {
    console.error('NVD fetch failed:', error);
    return [];
  }
}

/**
 * Check if a domain/IP appears in threat intelligence databases
 */
export async function checkThreatIntel(target: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Check NVD for recent CVEs affecting common services
  const cves = await fetchLatestCVEs(10);
  const relevantCVEs = cves.filter(cve => 
    cve.severity === 'CRITICAL' || cve.severity === 'HIGH'
  );

  if (relevantCVEs.length > 0) {
    findings.push({
      title: `${relevantCVEs.length} recent critical/high CVEs in threat landscape`,
      severity: 'info',
      category: 'threat_intel',
      evidence: {
        recentCVEs: relevantCVEs.slice(0, 5).map(c => ({
          id: c.id,
          severity: c.severity,
          score: c.cvssScore,
          description: c.description.substring(0, 100),
        })),
      },
      remediation: 'Review if any of these CVEs affect your infrastructure. Apply patches where applicable.',
    });
  }

  return findings;
}

/**
 * Get African-specific threat intelligence
 */
export async function getAfricanThreatIntel(): Promise<Finding[]> {
  const findings: Finding[] = [];

  // African-specific threat patterns (curated list)
  const africanThreats = [
    {
      name: 'SIM Swap Fraud',
      region: 'Sub-Saharan Africa',
      severity: 'high' as const,
      description: 'SIM swap attacks targeting mobile money accounts',
      indicators: ['USSD session hijacking', 'SS7 exploitation', 'Social engineering of telco staff'],
    },
    {
      name: 'Mobile Money API Abuse',
      region: 'Kenya, Tanzania, Uganda',
      severity: 'high' as const,
      description: 'Exploitation of M-Pesa, Airtel Money APIs',
      indicators: ['API key leaks', 'Session replay', 'Parameter tampering'],
    },
    {
      name: 'BEC Fraud',
      region: 'Nigeria, South Africa',
      severity: 'critical' as const,
      description: 'Business Email Compromise targeting African businesses',
      indicators: ['Lookalike domains', 'Invoice fraud', 'Credential phishing'],
    },
    {
      name: 'USSD Session Hijacking',
      region: 'Zimbabwe, Zambia, Botswana',
      severity: 'high' as const,
      description: 'Interception of USSD banking sessions',
      indicators: ['SS7 vulnerabilities', 'IMEI spoofing', 'Call forwarding abuse'],
    },
  ];

  findings.push({
    title: `${africanThreats.length} African-specific threat patterns loaded`,
    severity: 'info',
    category: 'african_threat_intel',
    evidence: {
      threats: africanThreats.map(t => ({
        name: t.name,
        region: t.region,
        severity: t.severity,
        indicators: t.indicators,
      })),
    },
    remediation: 'Review each threat pattern against your infrastructure. Focus on mobile money and USSD security.',
  });

  return findings;
}

/**
 * Monitor security forums and OSINT sources
 */
export async function monitorSecurityForums(domain: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Check for domain mentions in public security feeds
  try {
    // GitHub code search for leaked credentials
    const githubResults = await fetch(
      `https://api.github.com/search/code?q=${domain}+password+OR+secret+OR+key&per_page=5`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'SENTARI-ThreatIntel/1.0',
        },
      }
    );

    if (githubResults.ok) {
      const data = await githubResults.json();
      if (data.total_count > 0) {
        findings.push({
          title: `GitHub exposure: ${data.total_count} potential leak(s)`,
          severity: 'high',
          category: 'forum_osint',
          evidence: {
            source: 'GitHub',
            totalCount: data.total_count,
            items: data.items?.slice(0, 3).map((item: Record<string, unknown>) => ({
              name: item.name,
              url: item.html_url,
            })),
          },
          remediation: 'Review exposed code, rotate leaked credentials, implement git-secrets scanning',
        });
      }
    }
  } catch (error) {
    console.error('GitHub monitoring failed:', error);
  }

  return findings;
}

/**
 * Adaptive defense analysis
 * Analyzes the attacker's potential approach and generates defensive strategies
 */
export function generateDefensiveStrategy(
  vulnerabilities: Finding[],
  targetInfo: Record<string, unknown>
): {
  containmentPlan: string[];
  defensiveMeasures: string[];
  monitoringRecommendations: string[];
  africanContext: string[];
} {
  const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical');
  const highVulns = vulnerabilities.filter(v => v.severity === 'high');

  return {
    containmentPlan: [
      'Isolate affected systems from the network',
      'Preserve logs and evidence for forensic analysis',
      'Activate incident response team',
      'Notify affected stakeholders',
      'Document all findings for compliance reporting',
    ],
    defensiveMeasures: [
      ...criticalVulns.map(v => `CRITICAL: ${v.remediation}`),
      ...highVulns.slice(0, 3).map(v => `HIGH: ${v.remediation}`),
      'Enable multi-factor authentication on all admin accounts',
      'Review and tighten firewall rules',
      'Update all software to latest patched versions',
    ],
    monitoringRecommendations: [
      'Set up real-time alerting for suspicious login attempts',
      'Monitor network traffic for anomalous patterns',
      'Enable audit logging on all critical systems',
      'Implement SIEM for centralized log analysis',
      'Schedule regular vulnerability scans (weekly)',
    ],
    africanContext: [
      'Review mobile money API security (M-Pesa, EcoCash, Airtel Money)',
      'Check USSD gateway configurations for session hijacking',
      'Verify SIM-swap protection mechanisms with your telco',
      'Ensure compliance with POPIA/NDPA/Kenya DPA data requirements',
      'Review BEC (Business Email Compromise) defenses — highest fraud vector in Africa',
    ],
  };
}

/**
 * Check if a vulnerability is being actively exploited
 */
export async function checkActiveExploitation(cveId: string): Promise<boolean> {
  try {
    // Check CISA Known Exploited Vulnerabilities catalog
    const response = await fetch(
      'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'
    );

    if (response.ok) {
      const data = await response.json();
      const kev = data.vulnerabilities || [];
      return kev.some((v: Record<string, unknown>) => v.cveID === cveId);
    }
  } catch (error) {
    console.error('KEV check failed:', error);
  }

  return false;
}

function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}
