/**
 * SENTARI Credential Leak Checker
 * Uses XposedOrNot (free, open-source) + Pwned Passwords API
 */

import { Finding } from './scanner';

const XON_API = 'https://api.xposedornot.com/v1';

/**
 * Check if an email has been breached via XposedOrNot (FREE, no key)
 */
async function checkEmailBreaches(email: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  try {
    const response = await fetch(`${XON_API}/check-email/${encodeURIComponent(email)}`, {
      headers: { 'User-Agent': 'SENTARI-Security-Scanner/1.0' },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.breaches && data.breaches[0] && data.breaches[0].length > 0) {
        const breachList = data.breaches[0];
        findings.push({
          title: `Email found in ${breachList.length} data breach(es)`,
          severity: breachList.length > 5 ? 'critical' : breachList.length > 2 ? 'high' : 'medium',
          category: 'credential_leak',
          evidence: { email, breaches: breachList },
          remediation: 'Force password reset, enable MFA, review exposed data',
        });
      }
    }
  } catch (error) {
    console.error('XposedOrNot email check failed:', error);
  }

  return findings;
}

/**
 * Check breach analytics for an email (FREE, no key)
 */
async function getBreachAnalytics(email: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  try {
    const response = await fetch(`${XON_API}/breach-analytics?email=${encodeURIComponent(email)}`, {
      headers: { 'User-Agent': 'SENTARI-Security-Scanner/1.0' },
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data.BreachMetrics && data.ExposedBreaches) {
        const risk = data.BreachMetrics.risk?.[0];
        const breaches = data.ExposedBreaches.breaches_details || [];

        if (breaches.length > 0) {
          findings.push({
            title: `Breach risk score: ${risk?.risk_label || 'Unknown'} (${risk?.risk_score || 0}/10)`,
            severity: risk?.risk_score >= 7 ? 'critical' : risk?.risk_score >= 4 ? 'high' : 'medium',
            category: 'credential_leak',
            evidence: {
              email,
              riskScore: risk?.risk_score,
              riskLabel: risk?.risk_label,
              breachCount: breaches.length,
              breaches: breaches.map((b: Record<string, unknown>) => ({
                name: b.breach,
                domain: b.domain,
                date: b.xposed_date,
                records: b.xposed_records,
                dataExposed: b.xposed_data,
                passwordRisk: b.password_risk,
              })),
            },
            remediation: 'Review each breach, change passwords, enable MFA on all affected accounts',
          });
        }
      }
    }
  } catch (error) {
    console.error('XposedOrNot analytics failed:', error);
  }

  return findings;
}

/**
 * Check GitHub for exposed secrets related to the domain
 */
async function checkGitHubSecrets(domain: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  try {
    const searchQueries = [
      `"${domain}" password`,
      `"${domain}" api_key`,
    ];

    for (const query of searchQueries) {
      const response = await fetch(
        `https://api.github.com/search/code?q=${encodeURIComponent(query)}+in:file&per_page=5`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'SENTARI-Security-Scanner/1.0',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.total_count > 0) {
          findings.push({
            title: `GitHub exposure: ${data.total_count} potential secret(s) for "${query}"`,
            severity: 'high',
            category: 'exposed_secrets',
            evidence: {
              query,
              totalCount: data.total_count,
              items: data.items?.slice(0, 3).map((item: Record<string, unknown>) => ({
                name: item.name,
                repository: (item.repository as Record<string, unknown>)?.full_name,
                url: item.html_url,
              })),
            },
            remediation: 'Review exposed code, rotate leaked credentials, add secrets to .gitignore',
          });
        }
      }
    }
  } catch (error) {
    console.error('GitHub secrets check failed:', error);
  }

  return findings;
}

/**
 * Check for exposed sensitive files
 */
async function checkExposedFiles(domain: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  const sensitiveFiles = [
    { path: '/.env', name: '.env file', severity: 'critical' as const },
    { path: '/.git/config', name: 'Git repository', severity: 'high' as const },
    { path: '/wp-config.php', name: 'WordPress config', severity: 'critical' as const },
    { path: '/server-status', name: 'Apache server status', severity: 'medium' as const },
    { path: '/.htaccess', name: '.htaccess file', severity: 'low' as const },
  ];

  for (const file of sensitiveFiles) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`https://${domain}${file.path}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'SENTARI-Security-Scanner/1.0' },
      });

      clearTimeout(timeout);

      if (response.ok) {
        const text = await response.text().catch(() => '');
        
        // Verify it's actually the file content (not a generic 404 page)
        if (file.path === '/.env' && (text.includes('DB_') || text.includes('API_') || text.includes('SECRET'))) {
          findings.push({
            title: `${file.name} exposed publicly`,
            severity: file.severity,
            category: 'exposed_secrets',
            evidence: { endpoint: `https://${domain}${file.path}`, contentLength: text.length },
            remediation: `Remove ${file.name} from public access immediately`,
          });
        } else if (file.path === '/.git/config' && text.includes('repositoryformatversion')) {
          findings.push({
            title: `${file.name} exposed publicly`,
            severity: file.severity,
            category: 'exposed_secrets',
            evidence: { endpoint: `https://${domain}${file.path}` },
            remediation: `Remove ${file.name} from public access`,
          });
        } else if (file.path === '/server-status' && text.includes('Apache Server Status')) {
          findings.push({
            title: `${file.name} exposed publicly`,
            severity: file.severity,
            category: 'exposed_secrets',
            evidence: { endpoint: `https://${domain}${file.path}` },
            remediation: 'Restrict server-status to localhost only',
          });
        }
      }
    } catch {
      // File not accessible - normal
    }
  }

  return findings;
}

/**
 * Main credential leak check orchestrator
 */
export async function runCredentialCheck(domain: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Check common admin emails for this domain
  const adminEmails = [`admin@${domain}`, `info@${domain}`, `security@${domain}`];

  // Run all checks in parallel
  const checks = [
    ...adminEmails.map(email => checkEmailBreaches(email)),
    ...adminEmails.slice(0, 1).map(email => getBreachAnalytics(email)),
    checkGitHubSecrets(domain),
    checkExposedFiles(domain),
  ];

  const results = await Promise.allSettled(checks);

  for (const result of results) {
    if (result.status === 'fulfilled') {
      findings.push(...result.value);
    }
  }

  return findings;
}

export { checkEmailBreaches, getBreachAnalytics };
