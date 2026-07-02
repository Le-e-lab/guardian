/**
 * SENTARI Email Security Checker
 * Checks DMARC, SPF, DKIM records for a domain
 * Maps findings to NDPA, POPIA, and Kenya DPA compliance
 */

import { ComplianceResult, ComplianceControl } from './compliance-controls';

export interface EmailSecurityResult {
  domain: string;
  dmarc: {
    present: boolean;
    record: string | null;
    policy: string | null; // none, quarantine, reject
    subdomainPolicy: string | null;
    rua: string | null; // aggregate report email
    pct: number | null; // percentage of messages to apply policy to
    error: string | null;
  };
  spf: {
    present: boolean;
    record: string | null;
    mechanism: string | null; // all, ~all, -all, ?all
    includes: string[];
    ipCount: number;
    error: string | null;
  };
  dkim: {
    present: boolean;
    selector: string | null;
    record: string | null;
    keySize: number | null;
    error: string | null;
  };
  mx: {
    present: boolean;
    records: string[];
    error: string | null;
  };
  riskScore: number; // 0-100 (100 = most secure)
  findings: EmailFinding[];
}

export interface EmailFinding {
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'dmarc' | 'spf' | 'dkim' | 'mx' | 'email_security';
  description: string;
  plainEnglish: string;
  regulation: string;
  regulationSection: string;
  remediation: string;
  effort: 'low' | 'medium' | 'high';
}

/**
 * Look up DNS TXT records for a domain
 */
async function lookupTxtRecords(domain: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://dns.google/resolve?name=${domain}&type=TXT`
    );
    const data = await response.json();
    
    if (!data.Answer) return [];
    
    return data.Answer
      .filter((r: { type: number }) => r.type === 16) // TXT records
      .map((r: { data: string }) => r.data.replace(/^"|"$/g, ''));
  } catch {
    return [];
  }
}

/**
 * Look up DNS MX records for a domain
 */
async function lookupMxRecords(domain: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://dns.google/resolve?name=${domain}&type=MX`
    );
    const data = await response.json();
    
    if (!data.Answer) return [];
    
    return data.Answer
      .filter((r: { type: number }) => r.type === 15) // MX records
      .map((r: { data: string }) => r.data.split(' ').pop() || r.data)
      .sort((a: string, b: string) => {
        const aPriority = parseInt(a.split(' ')[0]) || 10;
        const bPriority = parseInt(b.split(' ')[0]) || 10;
        return aPriority - bPriority;
      });
  } catch {
    return [];
  }
}

/**
 * Check DMARC record
 */
async function checkDmarc(domain: string): Promise<EmailSecurityResult['dmarc']> {
  const records = await lookupTxtRecords(`_dmarc.${domain}`);
  const dmarcRecord = records.find(r => r.startsWith('v=DMARC1'));
  
  if (!dmarcRecord) {
    return {
      present: false,
      record: null,
      policy: null,
      subdomainPolicy: null,
      rua: null,
      pct: null,
      error: 'No DMARC record found',
    };
  }
  
  // Parse DMARC record
  const tags = dmarcRecord.split(';').map(t => t.trim());
  const parsed: Record<string, string> = {};
  
  for (const tag of tags) {
    const [key, ...valueParts] = tag.split('=');
    parsed[key.trim().toLowerCase()] = valueParts.join('=').trim();
  }
  
  return {
    present: true,
    record: dmarcRecord,
    policy: parsed.p || null,
    subdomainPolicy: parsed.sp || null,
    rua: parsed.rua || null,
    pct: parsed.pct ? parseInt(parsed.pct) : null,
    error: null,
  };
}

/**
 * Check SPF record
 */
async function checkSpf(domain: string): Promise<EmailSecurityResult['spf']> {
  const records = await lookupTxtRecords(domain);
  const spfRecord = records.find(r => r.startsWith('v=spf1'));
  
  if (!spfRecord) {
    return {
      present: false,
      record: null,
      mechanism: null,
      includes: [],
      ipCount: 0,
      error: 'No SPF record found',
    };
  }
  
  // Parse SPF record
  const parts = spfRecord.split(' ');
  const includes: string[] = [];
  let ipCount = 0;
  let mechanism = 'all';
  
  for (const part of parts.slice(1)) { // Skip 'v=spf1'
    if (part.startsWith('include:')) {
      includes.push(part.replace('include:', ''));
    } else if (part.startsWith('ip4:') || part.startsWith('ip6:')) {
      ipCount++;
    } else if (part === 'all' || part === '~all' || part === '-all' || part === '?all') {
      mechanism = part;
    }
  }
  
  return {
    present: true,
    record: spfRecord,
    mechanism,
    includes,
    ipCount,
    error: null,
  };
}

/**
 * Check DKIM record (common selectors)
 */
async function checkDkim(domain: string): Promise<EmailSecurityResult['dkim']> {
  const commonSelectors = ['default', 'google', 'selector1', 'selector2', 'k1', 'mandrill', 'everlytickey1', 'dkim', 'mail'];
  
  for (const selector of commonSelectors) {
    const records = await lookupTxtRecords(`${selector}._domainkey.${domain}`);
    const dkimRecord = records.find(r => r.includes('v=DKIM1') || r.includes('p='));
    
    if (dkimRecord) {
      // Parse key size
      let keySize = null;
      const kMatch = dkimRecord.match(/k=(\w+)/);
      const pMatch = dkimRecord.match(/p=([A-Za-z0-9+/=]+)/);
      
      if (pMatch && pMatch[1].length > 100) {
        keySize = 1024; // Likely 1024-bit
      } else if (pMatch && pMatch[1].length > 200) {
        keySize = 2048; // Likely 2048-bit
      }
      
      return {
        present: true,
        selector,
        record: dkimRecord,
        keySize,
        error: null,
      };
    }
  }
  
  return {
    present: false,
    selector: null,
    record: null,
    keySize: null,
    error: 'No DKIM record found with common selectors',
  };
}

/**
 * Analyze email security and generate findings
 */
function analyzeEmailSecurity(
  domain: string,
  dmarc: EmailSecurityResult['dmarc'],
  spf: EmailSecurityResult['spf'],
  dkim: EmailSecurityResult['dkim'],
  mx: EmailSecurityResult['mx']
): { riskScore: number; findings: EmailFinding[] } {
  const findings: EmailFinding[] = [];
  let score = 100;
  
  // === DMARC FINDINGS ===
  if (!dmarc.present) {
    score -= 30;
    findings.push({
      title: 'DMARC record not found',
      severity: 'critical',
      category: 'dmarc',
      description: `No DMARC record found for ${domain}. Without DMARC, attackers can spoof your domain to send phishing emails.`,
      plainEnglish: 'Your domain has no protection against email spoofing. Attackers can send emails pretending to be from your company. This is the #1 cause of business email compromise (BEC) fraud.',
      regulation: 'NDPA',
      regulationSection: 'Section 24',
      remediation: 'Add a DMARC TXT record to your DNS: _dmarc.domain.com → "v=DMARC1; p=quarantine; rua=mailto:dmarc@domain.com"',
      effort: 'low',
    });
  } else if (dmarc.policy === 'none') {
    score -= 15;
    findings.push({
      title: 'DMARC policy is monitoring only (p=none)',
      severity: 'medium',
      category: 'dmarc',
      description: 'DMARC is set to p=none, which means it only monitors but does not protect against spoofing.',
      plainEnglish: 'Your DMARC record exists but is set to "monitor only" — it watches for spoofing but doesn\'t block it. Attackers can still send fake emails from your domain.',
      regulation: 'NDPA',
      regulationSection: 'Section 24',
      remediation: 'Gradually move to p=quarantine then p=reject. Start with p=none for 2 weeks to gather data, then enforce.',
      effort: 'low',
    });
  } else if (dmarc.policy === 'quarantine') {
    score -= 5;
    findings.push({
      title: 'DMARC policy is quarantine (not reject)',
      severity: 'low',
      category: 'dmarc',
      description: 'DMARC is set to p=quarantine, which sends suspicious emails to spam but doesn\'t fully block them.',
      plainEnglish: 'Your DMARC protection is good but not maximum. Suspicious emails go to spam instead of being blocked. For full protection, move to p=reject.',
      regulation: 'POPIA',
      regulationSection: 'Section 19(1)(b)',
      remediation: 'After confirming legitimate email flows are not affected, update DMARC to p=reject for maximum protection.',
      effort: 'low',
    });
  }
  
  if (!dmarc.rua) {
    score -= 5;
    findings.push({
      title: 'DMARC aggregate reporting not configured',
      severity: 'low',
      category: 'dmarc',
      description: 'No RUA (aggregate report) email configured for DMARC.',
      plainEnglish: 'You won\'t receive reports about who is sending email on behalf of your domain. Without these reports, you can\'t detect spoofing attempts.',
      regulation: 'ISO_27001',
      regulationSection: 'A.12.6.1',
      remediation: 'Add rua=mailto:dmarc-reports@domain.com to your DMARC record to receive weekly aggregate reports.',
      effort: 'low',
    });
  }
  
  // === SPF FINDINGS ===
  if (!spf.present) {
    score -= 25;
    findings.push({
      title: 'SPF record not found',
      severity: 'critical',
      category: 'spf',
      description: `No SPF record found for ${domain}. Without SPF, any mail server can send emails claiming to be from your domain.`,
      plainEnglish: 'Your domain has no email authentication. Anyone in the world can send emails pretending to be from @' + domain + '. This is how phishing attacks succeed.',
      regulation: 'NDPA',
      regulationSection: 'Section 24(2)',
      remediation: 'Add an SPF TXT record: domain.com → "v=spf1 include:_spf.google.com ~all" (adjust includes for your email provider)',
      effort: 'low',
    });
  } else if (spf.mechanism === '?all') {
    score -= 10;
    findings.push({
      title: 'SPF mechanism is neutral (?all)',
      severity: 'medium',
      category: 'spf',
      description: 'SPF is set to ?all (neutral), which doesn\'t reject unauthorized senders.',
      plainEnglish: 'Your SPF record exists but doesn\'t actually block anything. It\'s like having a lock that doesn\'t work — it looks like protection but isn\'t.',
      regulation: 'POPIA',
      regulationSection: 'Section 19(1)(c)',
      remediation: 'Change SPF mechanism to ~all (soft fail) or -all (hard fail) to actually reject unauthorized senders.',
      effort: 'low',
    });
  } else if (spf.includes.length > 10) {
    score -= 5;
    findings.push({
      title: 'SPF has too many includes',
      severity: 'low',
      category: 'spf',
      description: `SPF record has ${spf.includes.length} includes, which may cause DNS lookup limit issues.`,
      plainEnglish: 'Your email authentication has too many third-party services. This can cause legitimate emails to fail authentication.',
      regulation: 'GENERIC',
      regulationSection: 'Email Security',
      remediation: 'Consolidate SPF includes. Use SPF macros or subdomain delegation to stay within the 10 DNS lookup limit.',
      effort: 'medium',
    });
  }
  
  // === DKIM FINDINGS ===
  if (!dkim.present) {
    score -= 20;
    findings.push({
      title: 'DKIM record not found',
      severity: 'high',
      category: 'dkim',
      description: `No DKIM record found for ${domain}. Without DKIM, email recipients cannot verify that your emails are authentic.`,
      plainEnglish: 'Your emails don\'t have a digital signature. Email providers (Gmail, Outlook) can\'t verify your emails are really from you, so they may end up in spam.',
      regulation: 'NDPA',
      regulationSection: 'Section 24',
      remediation: 'Enable DKIM in your email provider (Google Workspace, Microsoft 365, etc.) and publish the public key in DNS.',
      effort: 'low',
    });
  }
  
  // === MX FINDINGS ===
  if (!mx.present) {
    score -= 10;
    findings.push({
      title: 'No MX records found',
      severity: 'medium',
      category: 'mx',
      description: `No MX records found for ${domain}. This domain cannot receive emails.`,
      plainEnglish: 'This domain doesn\'t have email configured. This is unusual for a business and may indicate misconfiguration.',
      regulation: 'GENERIC',
      regulationSection: 'Email Configuration',
      remediation: 'Configure MX records if this domain should receive email. Contact your email provider for setup instructions.',
      effort: 'low',
    });
  }
  
  return { riskScore: Math.max(0, score), findings };
}

/**
 * Main entry point: Run full email security check
 */
export async function runEmailSecurityCheck(domain: string): Promise<EmailSecurityResult> {
  console.log(`[EMAIL] Checking email security for ${domain}`);
  
  // Run all checks in parallel
  const [dmarc, spf, dkim, mxRecords] = await Promise.all([
    checkDmarc(domain),
    checkSpf(domain),
    checkDkim(domain),
    lookupMxRecords(domain),
  ]);
  
  const mx: EmailSecurityResult['mx'] = {
    present: mxRecords.length > 0,
    records: mxRecords,
    error: mxRecords.length === 0 ? 'No MX records found' : null,
  };
  
  // Analyze and generate findings
  const { riskScore, findings } = analyzeEmailSecurity(domain, dmarc, spf, dkim, mx);
  
  console.log(`[EMAIL] ${domain}: DMARC=${dmarc.present}, SPF=${spf.present}, DKIM=${dkim.present}, Score=${riskScore}`);
  
  return {
    domain,
    dmarc,
    spf,
    dkim,
    mx,
    riskScore,
    findings,
  };
}
