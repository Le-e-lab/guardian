/**
 * SENTARI Bot Detection & Anti-Abuse System
 * Prevents free tier exploitation, scraping, and automated abuse
 */

import { NextRequest } from 'next/server';

export interface BotDetectionResult {
  isBot: boolean;
  confidence: number; // 0-1
  reasons: string[];
  challengeRequired: boolean;
}

// Honeypot fields that bots fill but humans don't
const HONEYPOT_FIELDS = ['website', 'fax', 'phone_secondary', 'company_url'];

// Timing threshold: forms submitted faster than this are likely bots (ms)
const MIN_FORM_TIME = 2000; // 2 seconds

// Suspicious user agent patterns
const BOT_UA_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /scrape/i, /curl/i, /wget/i,
  /python/i, /requests/i, /httpx/i, /axios/i, /node-fetch/i,
  /headless/i, /phantom/i, /selenium/i, /puppeteer/i, /playwright/i,
];

// Rate limit tracking (in-memory, resets on deploy)
const ipTracker = new Map<string, { count: number; resetAt: number; firstScanAt: number }>();

/**
 * Detect bots and abuse attempts
 */
export function detectBot(
  request: NextRequest,
  body?: Record<string, unknown>
): BotDetectionResult {
  const reasons: string[] = [];
  let score = 0;

  const userAgent = request.headers.get('user-agent') || '';
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  // 1. Check User-Agent
  if (!userAgent || userAgent.length < 10) {
    reasons.push('Missing or suspicious User-Agent');
    score += 0.3;
  }
  if (BOT_UA_PATTERNS.some(p => p.test(userAgent))) {
    reasons.push('Bot-like User-Agent detected');
    score += 0.4;
  }

  // 2. Check honeypot fields
  if (body) {
    for (const field of HONEYPOT_FIELDS) {
      if (body[field] && String(body[field]).length > 0) {
        reasons.push(`Honeypot field "${field}" was filled`);
        score += 0.5;
      }
    }
  }

  // 3. Check form submission timing
  if (body?.['form_timestamp']) {
    const formTime = Number(body['form_timestamp']);
    const elapsed = Date.now() - formTime;
    if (elapsed < MIN_FORM_TIME) {
      reasons.push(`Form submitted too fast (${elapsed}ms < ${MIN_FORM_TIME}ms)`);
      score += 0.3;
    }
  }

  // 4. Check for missing required headers
  const hasAccept = request.headers.get('accept');
  const hasAcceptLanguage = request.headers.get('accept-language');
  const hasAcceptEncoding = request.headers.get('accept-encoding');
  if (!hasAccept || !hasAcceptLanguage || !hasAcceptEncoding) {
    reasons.push('Missing standard browser headers');
    score += 0.2;
  }

  // 5. Check for repeated requests from same IP
  const now = Date.now();
  const record = ipTracker.get(clientIp);
  if (record && now < record.resetAt) {
    record.count++;
    if (record.count > 10) {
      reasons.push(`Excessive requests from IP (${record.count} in window)`);
      score += 0.4;
    }
  } else {
    ipTracker.set(clientIp, { count: 1, resetAt: now + 60_000, firstScanAt: now });
  }

  // 6. Check for credential stuffing patterns (multiple rapid scan requests)
  if (record && record.count > 3 && (now - record.firstScanAt) < 30_000) {
    reasons.push('Rapid sequential scan attempts');
    score += 0.3;
  }

  const isBot = score >= 0.5;
  const challengeRequired = score >= 0.3 && score < 0.5;

  return {
    isBot,
    confidence: Math.min(1, score),
    reasons,
    challengeRequired,
  };
}
