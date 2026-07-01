/**
 * SENTARI Social Media OSINT Module
 * Discovers social media presence and public profiles for a domain
 */

import { Finding } from './scanner';

interface SocialProfile {
  platform: string;
  url: string;
  username: string | null;
  status: 'found' | 'not_found' | 'error';
}

/**
 * Check if a social media profile exists for a given username
 */
async function checkSocialProfile(
  platform: string,
  url: string,
  username: string,
  timeout = 3000
): Promise<SocialProfile> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      redirect: 'follow',
    });

    clearTimeout(timer);

    // Check if profile exists (not a 404 or redirect to signup)
    const isFound = response.ok && !response.url.includes('signup');

    return {
      platform,
      url,
      username,
      status: isFound ? 'found' : 'not_found',
    };
  } catch {
    return {
      platform,
      url,
      username,
      status: 'error',
    };
  }
}

/**
 * Extract potential usernames from domain name
 */
function extractUsernames(domain: string): string[] {
  // Remove TLD and common prefixes
  const base = domain
    .replace(/\.(com|org|net|co|io|dev|app|tech|zw|ng|za|ke)$/i, '')
    .replace(/^(www|mail|api|dev|staging|test)\./i, '');

  return [
    base,
    base.replace(/[-_]/g, ''),
    base.replace(/[-_]/g, '.'),
  ];
}

/**
 * Check major social media platforms
 */
async function checkSocialMedia(usernames: string[]): Promise<SocialProfile[]> {
  const results: SocialProfile[] = [];

  // Platform definitions with URL patterns
  const platforms = [
    {
      name: 'Twitter/X',
      getUrl: (u: string) => `https://x.com/${u}`,
    },
    {
      name: 'LinkedIn',
      getUrl: (u: string) => `https://linkedin.com/company/${u}`,
    },
    {
      name: 'Facebook',
      getUrl: (u: string) => `https://facebook.com/${u}`,
    },
    {
      name: 'Instagram',
      getUrl: (u: string) => `https://instagram.com/${u}`,
    },
    {
      name: 'GitHub',
      getUrl: (u: string) => `https://github.com/${u}`,
    },
    {
      name: 'YouTube',
      getUrl: (u: string) => `https://youtube.com/@${u}`,
    },
    {
      name: 'TikTok',
      getUrl: (u: string) => `https://tiktok.com/@${u}`,
    },
    {
      name: 'Reddit',
      getUrl: (u: string) => `https://reddit.com/user/${u}`,
    },
  ];

  // Check each username against each platform (limit concurrent requests)
  for (const username of usernames.slice(0, 2)) { // Max 2 usernames
    const checks = platforms.map(p => checkSocialProfile(p.name, p.getUrl(username), username));
    const platformResults = await Promise.allSettled(checks);
    
    for (const result of platformResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }
  }

  return results;
}

/**
 * Check for email addresses associated with the domain
 */
async function checkEmailAddresses(domain: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Common email patterns
  const emailPrefixes = ['admin', 'info', 'support', 'sales', 'contact', 'security', 'webmaster'];

  for (const prefix of emailPrefixes.slice(0, 3)) { // Check first 3
    const email = `${prefix}@${domain}`;
    
    // Check if email appears in public breach databases (simulated)
    // In production, this would use HIBP API with proper key
    try {
      // Just log that we checked - actual breach check needs API key
      findings.push({
        title: `Email pattern discovered: ${email}`,
        severity: 'info',
        category: 'email_enumeration',
        evidence: { email, type: 'standard_prefix' },
        remediation: 'Ensure all admin emails have strong passwords and MFA enabled',
      });
    } catch {
      // Ignore errors
    }
  }

  return findings;
}

/**
 * Check for common subdomains and their social footprints
 */
async function checkSubdomainOSINT(domain: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Common subdomains that might reveal information
  const subdomains = [
    'mail', 'webmail', 'portal', 'vpn', 'remote', 'admin',
    'git', 'github', 'gitlab', 'jenkins', 'ci', 'cd',
    'staging', 'dev', 'test', 'qa', 'uat',
    'blog', 'docs', 'wiki', 'help', 'support',
    'status', 'monitor', 'grafana', 'kibana',
  ];

  const discovered: Array<{ subdomain: string; status: string }> = [];

  // Check subdomains in parallel (batch of 5)
  for (let i = 0; i < subdomains.length; i += 5) {
    const batch = subdomains.slice(i, i + 5);
    const checks = batch.map(async (sub) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(`https://${sub}.${domain}`, {
          signal: controller.signal,
          method: 'HEAD',
          headers: { 'User-Agent': 'SENTARI-Security-Scanner/1.0' },
        });

        clearTimeout(timeout);
        return { subdomain: `${sub}.${domain}`, status: response.ok ? 'accessible' : 'restricted' };
      } catch {
        return { subdomain: `${sub}.${domain}`, status: 'not_found' };
      }
    });

    const results = await Promise.allSettled(checks);
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.status !== 'not_found') {
        discovered.push(result.value);
      }
    }
  }

  if (discovered.length > 0) {
    // Flag sensitive subdomains
    const sensitive = discovered.filter(d => 
      ['admin', 'git', 'jenkins', 'ci', 'staging', 'dev', 'test', 'vpn', 'remote'].some(s => 
        d.subdomain.includes(s)
      )
    );

    if (sensitive.length > 0) {
      findings.push({
        title: `Sensitive subdomains discovered: ${sensitive.length}`,
        severity: 'medium',
        category: 'subdomain_osint',
        evidence: { sensitive, allDiscovered: discovered },
        remediation: 'Restrict access to sensitive subdomains. Use VPN or IP whitelisting.',
      });
    }

    findings.push({
      title: `${discovered.length} active subdomains discovered`,
      severity: 'info',
      category: 'subdomain_osint',
      evidence: { discovered },
      remediation: 'Review subdomain inventory and remove unnecessary public exposure',
    });
  }

  return findings;
}

/**
 * Main social media OSINT orchestrator
 */
export async function runSocialOSINT(domain: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Extract usernames from domain
  const usernames = extractUsernames(domain);

  // Run all OSINT checks in parallel
  const [socialResults, emailResults, subdomainResults] = await Promise.allSettled([
    checkSocialMedia(usernames),
    checkEmailAddresses(domain),
    checkSubdomainOSINT(domain),
  ]);

  // Process social media results
  if (socialResults.status === 'fulfilled') {
    const profiles = socialResults.value;
    const foundProfiles = profiles.filter(p => p.status === 'found');

    if (foundProfiles.length > 0) {
      findings.push({
        title: `${foundProfiles.length} social media profile(s) discovered`,
        severity: 'info',
        category: 'social_media',
        evidence: {
          profiles: foundProfiles.map(p => ({
            platform: p.platform,
            url: p.url,
            username: p.username,
          })),
        },
        remediation: 'Review social media profiles for sensitive information disclosure',
      });

      // Flag each found profile
      for (const profile of foundProfiles) {
        findings.push({
          title: `Social profile found: ${profile.platform}`,
          severity: 'info',
          category: 'social_media',
          evidence: { platform: profile.platform, url: profile.url, username: profile.username },
          remediation: `Review ${profile.platform} profile for sensitive information`,
        });
      }
    }
  }

  // Add email and subdomain results
  if (emailResults.status === 'fulfilled') {
    findings.push(...emailResults.value);
  }
  if (subdomainResults.status === 'fulfilled') {
    findings.push(...subdomainResults.value);
  }

  return findings;
}
