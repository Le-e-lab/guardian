/**
 * SENTARI Demo Test Targets
 * Safe, publicly accessible domains for testing the scanning engine
 * These are NOT industry giants — they're demo-friendly targets
 */

export interface DemoTarget {
  domain: string;
  description: string;
  expectedFindings: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export const DEMO_TARGETS: DemoTarget[] = [
  {
    domain: 'example.com',
    description: 'IANA reserved domain — perfect for baseline testing',
    expectedFindings: ['Missing security headers (HSTS, CSP, X-Frame-Options)', 'Cloudflare infrastructure detected'],
    difficulty: 'easy',
  },
  {
    domain: 'httpbin.org',
    description: 'HTTP testing service — reveals header behavior',
    expectedFindings: ['Security headers analysis', 'Technology detection'],
    difficulty: 'easy',
  },
  {
    domain: 'jsonplaceholder.typicode.com',
    description: 'Fake REST API — tests API endpoint detection',
    expectedFindings: ['API endpoint discovery', 'CORS configuration analysis'],
    difficulty: 'easy',
  },
  {
    domain: 'elevatevaluepartners.co.zw',
    description: 'Elevate Value Partners — Harare web studio (live demo target)',
    expectedFindings: ['Security headers analysis', 'Technology detection', 'SSL/TLS check', 'DNS security'],
    difficulty: 'medium',
  },
  {
    domain: 'tarisai.co.zw',
    description: 'Tarisai — live demo target',
    expectedFindings: ['Security headers analysis', 'Technology detection', 'SSL/TLS check', 'DNS security'],
    difficulty: 'medium',
  },
];

/**
 * Get a random demo target
 */
export function getRandomDemoTarget(): DemoTarget {
  return DEMO_TARGETS[Math.floor(Math.random() * DEMO_TARGETS.length)];
}

/**
 * Get demo targets by difficulty
 */
export function getDemoTargetsByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): DemoTarget[] {
  return DEMO_TARGETS.filter(t => t.difficulty === difficulty);
}
