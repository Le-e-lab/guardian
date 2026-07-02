/**
 * SENTARI VirusTotal Integration
 * Checks domain reputation against 70+ antivirus engines
 * Free tier: 4 requests/minute
 */

export interface VirusTotalResult {
  domain: string;
  found: boolean;
  malicious: number;
  suspicious: number;
  harmless: number;
  undetected: number;
  reputation: number; // -100 to 100
  categories: Record<string, string>;
  lastAnalysisDate: string | null;
  riskLevel: 'safe' | 'suspicious' | 'malicious' | 'unknown';
  findings: Array<{
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    description: string;
    plainEnglish: string;
    engine: string;
    category: string;
  }>;
}

/**
 * Check domain reputation via VirusTotal
 * Uses the free public API (4 req/min)
 */
export async function checkDomainReputation(domain: string): Promise<VirusTotalResult> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  
  if (!apiKey) {
    return {
      domain,
      found: false,
      malicious: 0,
      suspicious: 0,
      harmless: 0,
      undetected: 0,
      reputation: 0,
      categories: {},
      lastAnalysisDate: null,
      riskLevel: 'unknown',
      findings: [{
        title: 'VirusTotal API key not configured',
        severity: 'info',
        description: 'VirusTotal integration requires an API key',
        plainEnglish: 'Domain reputation checking is not available yet. Add a VirusTotal API key to enable this feature.',
        engine: 'sentari',
        category: 'configuration',
      }],
    };
  }

  try {
    const response = await fetch(
      `https://www.virustotal.com/api/v3/domains/${domain}`,
      {
        headers: {
          'x-apikey': apiKey,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          domain,
          found: false,
          malicious: 0,
          suspicious: 0,
          harmless: 0,
          undetected: 0,
          reputation: 0,
          categories: {},
          lastAnalysisDate: null,
          riskLevel: 'unknown',
          findings: [{
            title: 'Domain not found in VirusTotal',
            severity: 'info',
            description: `No data available for ${domain} in VirusTotal's database`,
            plainEnglish: 'This domain is not in VirusTotal\'s threat database. This is usually good — it means no threats have been reported.',
            engine: 'virustotal',
            category: 'reputation',
          }],
        };
      }
      throw new Error(`VirusTotal API error: ${response.status}`);
    }

    const data = await response.json();
    const attrs = data.data?.attributes || {};
    const stats = attrs.last_analysis_stats || {};
    const categories = attrs.categories || {};

    const malicious = stats.malicious || 0;
    const suspicious = stats.suspicious || 0;
    const harmless = stats.harmless || 0;
    const undetected = stats.undetected || 0;
    const reputation = attrs.reputation || 0;

    // Determine risk level
    let riskLevel: VirusTotalResult['riskLevel'] = 'safe';
    if (malicious > 5) riskLevel = 'malicious';
    else if (malicious > 0 || suspicious > 3) riskLevel = 'suspicious';

    // Generate findings
    const findings: VirusTotalResult['findings'] = [];

    if (malicious > 0) {
      findings.push({
        title: `${malicious} antivirus engine(s) flagged this domain as malicious`,
        severity: malicious > 5 ? 'critical' : 'high',
        description: `VirusTotal analysis shows ${malicious} security vendors flagged ${domain} as malicious`,
        plainEnglish: `${malicious} security companies think this domain is dangerous. This could indicate malware distribution, phishing, or other malicious activity.`,
        engine: 'virustotal',
        category: 'threat_intelligence',
      });
    }

    if (suspicious > 0) {
      findings.push({
        title: `${suspicious} engine(s) flagged this domain as suspicious`,
        severity: 'medium',
        description: `VirusTotal analysis shows ${suspicious} security vendors flagged ${domain} as suspicious`,
        plainEnglish: `${suspicious} security companies have concerns about this domain. It may be associated with spam, unwanted software, or risky behavior.`,
        engine: 'virustotal',
        category: 'threat_intelligence',
      });
    }

    if (malicious === 0 && suspicious === 0) {
      findings.push({
        title: 'No threats detected by VirusTotal',
        severity: 'info',
        description: `All ${harmless + undetected} engines analyzed ${domain} and found no threats`,
        plainEnglish: 'Good news — 70+ security companies have analyzed this domain and none found any threats.',
        engine: 'virustotal',
        category: 'reputation',
      });
    }

    return {
      domain,
      found: true,
      malicious,
      suspicious,
      harmless,
      undetected,
      reputation,
      categories,
      lastAnalysisDate: attrs.last_analysis_date ? new Date(attrs.last_analysis_date * 1000).toISOString() : null,
      riskLevel,
      findings,
    };
  } catch (error) {
    console.error(`[VIRUSTOTAL] Error checking ${domain}:`, error);
    return {
      domain,
      found: false,
      malicious: 0,
      suspicious: 0,
      harmless: 0,
      undetected: 0,
      reputation: 0,
      categories: {},
      lastAnalysisDate: null,
      riskLevel: 'unknown',
      findings: [{
        title: 'VirusTotal check failed',
        severity: 'info',
        description: `Could not check ${domain} against VirusTotal: ${String(error).substring(0, 100)}`,
        plainEnglish: 'Unable to check domain reputation right now. This could be a temporary API issue.',
        engine: 'virustotal',
        category: 'error',
      }],
    };
  }
}
