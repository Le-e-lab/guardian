/**
 * SENTARI Employee & Infrastructure Scanner
 * Scans employee digital footprint and infrastructure exposure
 */

import { Finding } from './scanner';

/**
 * Check if an email address has been in data breaches
 */
async function checkEmployeeEmail(email: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  try {
    const response = await fetch(`https://api.xposedornot.com/v1/check-email/${encodeURIComponent(email)}`, {
      headers: { 'User-Agent': 'SENTARI-Security-Scanner/1.0' },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.breaches && data.breaches[0] && data.breaches[0].length > 0) {
        const breachList = data.breaches[0];
        findings.push({
          title: `Employee email found in ${breachList.length} breach(es): ${email}`,
          severity: breachList.length > 5 ? 'critical' : breachList.length > 2 ? 'high' : 'medium',
          category: 'employee_exposure',
          evidence: { email, breaches: breachList },
          remediation: `Force password reset for ${email}, enable MFA, review exposed data`,
        });
      }
    }
  } catch (error) {
    console.error('Employee email check failed:', error);
  }

  return findings;
}

/**
 * Check employee's public GitHub exposure
 */
async function checkGitHubExposure(domain: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  try {
    // Search for public repos with sensitive patterns
    const queries = [
      `"${domain}" password`,
      `"${domain}" api_key`,
      `"${domain}" secret`,
      `"${domain}" token`,
      `"${domain}" credentials`,
    ];

    for (const query of queries.slice(0, 3)) {
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
            title: `GitHub exposure: ${data.total_count} potential secret(s)`,
            severity: 'high',
            category: 'employee_exposure',
            evidence: {
              query,
              totalCount: data.total_count,
              items: data.items?.slice(0, 3).map((item: Record<string, unknown>) => ({
                name: item.name,
                repository: (item.repository as Record<string, unknown>)?.full_name,
                url: item.html_url,
              })),
            },
            remediation: 'Review exposed code, rotate leaked credentials, enforce git-secrets scanning',
          });
        }
      }
    }
  } catch (error) {
    console.error('GitHub exposure check failed:', error);
  }

  return findings;
}

/**
 * Check for common infrastructure misconfigurations
 */
async function checkInfrastructure(domain: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Check for common misconfigurations
  const checks = [
    {
      path: '/.env',
      name: '.env file',
      severity: 'critical' as const,
      pattern: /DB_|API_|SECRET|KEY|TOKEN/,
    },
    {
      path: '/.git/config',
      name: 'Git repository',
      severity: 'high' as const,
      pattern: /repositoryformatversion/,
    },
    {
      path: '/server-status',
      name: 'Apache server status',
      severity: 'medium' as const,
      pattern: /Apache Server Status/,
    },
    {
      path: '/wp-config.php',
      name: 'WordPress config',
      severity: 'critical' as const,
      pattern: /DB_PASSWORD/,
    },
    {
      path: '/.htpasswd',
      name: 'Password file',
      severity: 'critical' as const,
      pattern: /:/,
    },
    {
      path: '/phpinfo.php',
      name: 'PHP info page',
      severity: 'medium' as const,
      pattern: /phpinfo/,
    },
  ];

  for (const check of checks) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`https://${domain}${check.path}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'SENTARI-Security-Scanner/1.0' },
      });

      clearTimeout(timeout);

      if (response.ok) {
        const text = await response.text().catch(() => '');
        if (check.pattern.test(text)) {
          findings.push({
            title: `${check.name} exposed publicly`,
            severity: check.severity,
            category: 'infrastructure_exposure',
            evidence: { endpoint: `https://${domain}${check.path}`, contentLength: text.length },
            remediation: `Remove ${check.name} from public access immediately`,
          });
        }
      }
    } catch {
      // Not accessible - normal
    }
  }

  return findings;
}

/**
 * Check for exposed cloud storage (S3, GCS, Azure)
 */
async function checkCloudStorage(domain: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Common cloud storage patterns
  const patterns = [
    { name: 'AWS S3', regex: /s3\.amazonaws\.com/i, severity: 'high' as const },
    { name: 'Google Cloud Storage', regex: /storage\.googleapis\.com/i, severity: 'high' as const },
    { name: 'Azure Blob', regex: /blob\.core\.windows\.net/i, severity: 'high' as const },
  ];

  try {
    // Check common endpoints that might expose cloud storage
    const endpoints = [
      `https://${domain}/sitemap.xml`,
      `https://${domain}/robots.txt`,
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
          for (const pattern of patterns) {
            if (pattern.regex.test(text)) {
              findings.push({
                title: `${pattern.name} storage exposure detected`,
                severity: pattern.severity,
                category: 'infrastructure_exposure',
                evidence: { endpoint, pattern: pattern.name },
                remediation: `Review ${pattern.name} bucket permissions and restrict public access`,
              });
            }
          }
        }
      } catch {
        // Not accessible
      }
    }
  } catch (error) {
    console.error('Cloud storage check failed:', error);
  }

  return findings;
}

/**
 * Main employee & infrastructure scanner
 */
export async function runEmployeeScan(domain: string, employeeEmails?: string[]): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Build email list from domain if not provided
  const emails = employeeEmails || [
    `admin@${domain}`,
    `info@${domain}`,
    `security@${domain}`,
    `support@${domain}`,
  ];

  // Run all checks in parallel
  const checks = [
    ...emails.slice(0, 5).map(email => checkEmployeeEmail(email)),
    checkGitHubExposure(domain),
    checkInfrastructure(domain),
    checkCloudStorage(domain),
  ];

  const results = await Promise.allSettled(checks);

  for (const result of results) {
    if (result.status === 'fulfilled') {
      findings.push(...result.value);
    }
  }

  return findings;
}
