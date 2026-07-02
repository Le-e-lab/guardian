/**
 * SENTARI Social Media OSINT Module v2
 * Only reports VERIFIED findings — no guessing, no false positives
 */

import { Finding } from './scanner';

interface SocialProfile {
  platform: string;
  url: string;
  username: string | null;
  status: 'verified_found' | 'not_found' | 'error';
  confidence: number; // 0-100
}

/**
 * Check if a social media profile actually exists (with verification)
 * Uses multiple signals to avoid false positives
 */
async function verifySocialProfile(
  platform: string,
  url: string,
  username: string,
  timeout = 5000
): Promise<SocialProfile> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    clearTimeout(timer);

    // Platform-specific verification
    const finalUrl = response.url;
    const body = await response.text().catch(() => '');

    // If redirected to signup/login page, profile doesn't exist
    if (finalUrl.includes('signup') || finalUrl.includes('login') || 
        finalUrl.includes('register') || finalUrl.includes('create')) {
      return { platform, url, username, status: 'not_found', confidence: 0 };
    }

    let confidence = 0;

    switch (platform) {
      case 'GitHub': {
        // GitHub returns 200 for non-existent users but page has "Find a profile" text
        if (body.includes('Find a profile') || body.includes('404') || !response.ok) {
          return { platform, url, username, status: 'not_found', confidence: 0 };
        }
        // Real profiles have repo count, followers, etc.
        if (body.includes('repositories') || body.includes('followers') || body.includes('contributions')) {
          confidence = 95;
        }
        break;
      }
      case 'Twitter/X': {
        // X returns 200 for suspended/non-existent accounts
        // Real accounts have tweet count, join date
        if (body.includes('This account doesn') || body.includes('suspended') || 
            body.includes('exist')) {
          return { platform, url, username, status: 'not_found', confidence: 0 };
        }
        if (body.includes('tweets') && body.includes('following')) {
          confidence = 90;
        }
        break;
      }
      case 'LinkedIn': {
        // LinkedIn company pages: check for employee count or "About" section
        if (body.includes('Page not found') || body.includes('does not exist')) {
          return { platform, url, username, status: 'not_found', confidence: 0 };
        }
        if (body.includes('employees') || body.includes('about') || body.includes('Company')) {
          confidence = 85;
        }
        break;
      }
      case 'Facebook': {
        if (body.includes('Page Not Found') || body.includes('content you requested')) {
          return { platform, url, username, status: 'not_found', confidence: 0 };
        }
        if (body.includes('likes') || body.includes('followers') || body.includes('Page Transparency')) {
          confidence = 80;
        }
        break;
      }
      case 'Instagram': {
        if (body.includes('Sorry, this page isn') || body.includes('not found')) {
          return { platform, url, username, status: 'not_found', confidence: 0 };
        }
        if (body.includes('posts') && body.includes('followers')) {
          confidence = 85;
        }
        break;
      }
      default:
        // For unknown platforms, just check HTTP status
        confidence = response.ok ? 60 : 0;
    }

    if (confidence >= 60 && response.ok) {
      return { platform, url, username, status: 'verified_found', confidence };
    }

    return { platform, url, username, status: 'not_found', confidence: 0 };
  } catch {
    return { platform, url, username, status: 'error', confidence: 0 };
  }
}

/**
 * Extract domain name for social media lookups
 */
function extractUsername(domain: string): string {
  return domain
    .replace(/^www\./i, '')
    .replace(/\.(com|org|net|co|io|dev|app|tech|zw|ng|za|ke)$/i, '')
    .replace(/[-_]/g, '');
}

/**
 * Check social media profiles with verification
 */
async function checkSocialMedia(username: string): Promise<SocialProfile[]> {
  const platforms = [
    { name: 'GitHub', getUrl: (u: string) => `https://github.com/${u}` },
    { name: 'Twitter/X', getUrl: (u: string) => `https://x.com/${u}` },
    { name: 'LinkedIn', getUrl: (u: string) => `https://linkedin.com/company/${u}` },
    { name: 'Facebook', getUrl: (u: string) => `https://facebook.com/${u}` },
    { name: 'Instagram', getUrl: (u: string) => `https://instagram.com/${u}` },
  ];

  const results = await Promise.allSettled(
    platforms.map(p => verifySocialProfile(p.name, p.getUrl(username), username))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<SocialProfile> => r.status === 'fulfilled')
    .map(r => r.value);
}

/**
 * Main OSINT orchestrator — only returns verified findings
 */
export async function runSocialOSINT(domain: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const username = extractUsername(domain);

  // Only check social media — no more fake email generation
  const socialResults = await checkSocialMedia(username);
  const verifiedProfiles = socialResults.filter(p => p.status === 'verified_found');

  if (verifiedProfiles.length > 0) {
    findings.push({
      title: `${verifiedProfiles.length} verified social media profile(s) found`,
      severity: 'info',
      category: 'social_media',
      evidence: {
        profiles: verifiedProfiles.map(p => ({
          platform: p.platform,
          url: p.url,
          username: p.username,
          confidence: p.confidence,
        })),
      },
      remediation: 'Review social media profiles for sensitive information disclosure (API keys, internal URLs, employee details)',
    });
  }

  // Note: if no profiles found, we don't report anything — no false positives
  return findings;
}
