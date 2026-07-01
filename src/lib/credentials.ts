/**
 * SENTARI Credential Leak Checker
 * Checks for exposed credentials, leaked passwords, and data breaches
 */

import { Finding } from './scanner';

const HIBP_API_URL = 'https://haveibeenpwned.com/api/v3';

/**
 * Check if a password has been pwned (k-anonymity, no password sent to API)
 */
async function checkPasswordPwned(password: string): Promise<{ pwned: boolean; count: number }> {
  try {
    // SHA-1 hash the password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    // Send first 5 chars to HIBP API (k-anonymity)
    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    });

    if (!response.ok) {
      return { pwned: false, count: 0 };
    }

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        return { pwned: true, count: parseInt(count.trim(), 10) };
      }
    }

    return { pwned: false, count: 0 };
  } catch (error) {
    console.error('Pwned Passwords check failed:', error);
    return { pwned: false, count: 0 };
  }
}

/**
 * Check if a domain has been breached (HIBP Domain Search)
 * Note: Requires HIBP API key for production use
 */
async function checkDomainBreaches(domain: string, apiKey?: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  if (!apiKey) {
    // Skip if no API key - log as info
    findings.push({
      title: 'HIBP Domain Breach Check skipped (no API key)',
      severity: 'info',
      category: 'credential_leak',
      evidence: { domain, reason: 'HIBP API key required for domain breach search' },
      remediation: 'Configure HIBP API key to enable domain breach monitoring',
    });
    return findings;
  }

  try {
    const response = await fetch(`${HIBP_API_URL}/breachedDomain/${domain}`, {
      headers: {
        'hibp-api-key': apiKey,
        'user-agent': 'SENTARI-Security-Scanner/1.0',
      },
    });

    if (response.status === 404) {
      // No breaches found - good
      return findings;
    }

    if (response.ok) {
      const data = await response.json();
      const breachCount = Object.keys(data).length;

      findings.push({
        title: `Domain found in ${breachCount} data breach(es)`,
        severity: breachCount > 5 ? 'critical' : breachCount > 2 ? 'high' : 'medium',
        category: 'credential_leak',
        evidence: { domain, breachCount, breaches: Object.keys(data) },
        remediation: 'Review exposed email addresses, force password resets, and implement MFA',
      });

      // List individual breaches
      for (const [email, breaches] of Object.entries(data)) {
        findings.push({
          title: `Breached email: ${email}`,
          severity: 'high',
          category: 'credential_leak',
          evidence: { email, breaches },
          remediation: `Force password reset for ${email} and enable MFA`,
        });
      }
    }
  } catch (error) {
    console.error('HIBP Domain check failed:', error);
  }

  return findings;
}

/**
 * Check GitHub for exposed secrets related to the domain
 */
async function checkGitHubSecrets(domain: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  try {
    // Search GitHub for potential secrets
    const searchQueries = [
      `"${domain}" password`,
      `"${domain}" api_key`,
      `"${domain}" secret`,
      `"${domain}" token`,
    ];

    for (const query of searchQueries.slice(0, 2)) { // Limit to 2 queries
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
            title: `GitHub code search: ${data.total_count} potential secret(s) found for "${query}"`,
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
            remediation: 'Review exposed code, rotate any leaked credentials, and add secrets to .gitignore',
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
 * Check for exposed API keys and tokens in common locations
 */
async function checkExposedAPIKeys(domain: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Common patterns to check
  const patterns = [
    { name: 'AWS Key', regex: /AKIA[0-9A-Z]{16}/, severity: 'critical' as const },
    { name: 'Google API Key', regex: /AIza[0-9A-Za-z\-_]{35}/, severity: 'high' as const },
    { name: 'GitHub Token', regex: /ghp_[0-9a-zA-Z]{36}/, severity: 'critical' as const },
    { name: 'Slack Token', regex: /xox[baprs]-[0-9a-zA-Z\-]{10,}/, severity: 'high' as const },
    { name: 'Private Key', regex: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/, severity: 'critical' as const },
  ];

  try {
    // Check if common endpoints expose sensitive info
    const endpoints = [
      `https://${domain}/.env`,
      `https://${domain}/.git/config`,
      `https://${domain}/wp-config.php`,
      `https://${domain}/.htaccess`,
      `https://${domain}/robots.txt`,
      `https://${domain}/sitemap.xml`,
    ];

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(endpoint, {
          signal: controller.signal,
          headers: { 'User-Agent': 'SENTARI-Security-Scanner/1.0' },
        });

        clearTimeout(timeout);

        if (response.ok) {
          const text = await response.text().catch(() => '');
          
          // Check for sensitive files
          if (endpoint.includes('.env') && text.length > 10) {
            findings.push({
              title: '.env file exposed publicly',
              severity: 'critical',
              category: 'exposed_secrets',
              evidence: { endpoint, contentLength: text.length },
              remediation: 'Remove .env from public access immediately. Block via .htaccess or server config.',
            });
          }

          if (endpoint.includes('.git/config') && text.includes('repositoryformatversion')) {
            findings.push({
              title: 'Git repository exposed publicly',
              severity: 'high',
              category: 'exposed_secrets',
              evidence: { endpoint, contentPreview: text.substring(0, 200) },
              remediation: 'Remove .git directory from public access. Use proper .gitignore.',
            });
          }

          if (endpoint.includes('wp-config.php') && text.includes('DB_PASSWORD')) {
            findings.push({
              title: 'WordPress config file exposed',
              severity: 'critical',
              category: 'exposed_secrets',
              evidence: { endpoint },
              remediation: 'Block access to wp-config.php via server configuration.',
            });
          }

          if (endpoint.includes('robots.txt') && text.includes('Disallow')) {
            // Extract sensitive paths
            const paths = text.match(/Disallow: (.+)/g)?.slice(0, 5) || [];
            if (paths.length > 0) {
              findings.push({
                title: 'robots.txt reveals sensitive paths',
                severity: 'low',
                category: 'information_disclosure',
                evidence: { endpoint, sensitivePaths: paths },
                remediation: 'Review robots.txt for unintended disclosure of sensitive paths',
              });
            }
          }
        }
      } catch {
        // Endpoint not accessible - normal
      }
    }
  } catch (error) {
    console.error('Exposed API keys check failed:', error);
  }

  return findings;
}

/**
 * Main credential leak check orchestrator
 */
export async function runCredentialCheck(domain: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Run checks in parallel
  const [domainBreaches, githubSecrets, exposedKeys] = await Promise.allSettled([
    checkDomainBreaches(domain),
    checkGitHubSecrets(domain),
    checkExposedAPIKeys(domain),
  ]);

  // Collect results
  if (domainBreaches.status === 'fulfilled') {
    findings.push(...domainBreaches.value);
  }
  if (githubSecrets.status === 'fulfilled') {
    findings.push(...githubSecrets.value);
  }
  if (exposedKeys.status === 'fulfilled') {
    findings.push(...exposedKeys.value);
  }

  return findings;
}

export { checkPasswordPwned };
