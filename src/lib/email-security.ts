/**
 * SENTARI Email Security Checker
 * Checks DMARC, SPF, DKIM records for a domain
 * Maps findings to NDPA, POPIA, and Kenya DPA compliance
 */

import { ComplianceResult, ComplianceControl } from './compliance-controls';

export interface SpoofingRisk {
  canBeSpoofed: boolean;
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'protected';
  riskScore: number; // 0-100 (0 = maximum spoofing risk, 100 = fully protected)
  attackScenario: string; // What an attacker could do
  attackVector: string; // How the attack works
  impactDescription: string; // Business impact
  protectionStatus: {
    dmarc: { status: string; detail: string };
    spf: { status: string; detail: string };
    dkim: { status: string; detail: string };
  };
  recommendations: Array<{
    action: string;
    priority: 'immediate' | 'soon' | 'when-ready';
    effort: 'low' | 'medium' | 'high';
    impact: string;
  }>;
}

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
  spoofingRisk: SpoofingRisk;
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
 * Calculate email spoofing risk for a domain
 * Determines if an attacker can send emails pretending to be from this domain
 */
function calculateSpoofingRisk(
  domain: string,
  dmarc: EmailSecurityResult['dmarc'],
  spf: EmailSecurityResult['spf'],
  dkim: EmailSecurityResult['dkim'],
  mx: EmailSecurityResult['mx']
): SpoofingRisk {
  let riskScore = 0; // 0 = max risk, 100 = fully protected
  const recommendations: SpoofingRisk['recommendations'] = [];

  // === DMARC ANALYSIS (40 points) ===
  if (!dmarc.present) {
    // No DMARC = anyone can spoof
    riskScore += 0;
    recommendations.push({
      action: `Add DMARC record: _dmarc.${domain} → "v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}"`,
      priority: 'immediate',
      effort: 'low',
      impact: 'Blocks most email spoofing attacks immediately',
    });
  } else if (dmarc.policy === 'none') {
    // DMARC exists but monitor-only
    riskScore += 10;
    recommendations.push({
      action: 'Move DMARC policy from p=none to p=quarantine after 2 weeks of monitoring',
      priority: 'soon',
      effort: 'low',
      impact: 'Start blocking suspicious emails instead of just monitoring them',
    });
  } else if (dmarc.policy === 'quarantine') {
    // Quarantine = good but not maximum
    riskScore += 30;
    recommendations.push({
      action: 'Move DMARC policy from p=quarantine to p=reject for maximum protection',
      priority: 'when-ready',
      effort: 'low',
      impact: 'Fully block all unauthorized emails from your domain',
    });
  } else if (dmarc.policy === 'reject') {
    // Reject = maximum protection
    riskScore += 40;
  }

  // DMARC subdomain policy bonus
  if (dmarc.present && dmarc.subdomainPolicy === 'reject') {
    riskScore += 5;
  } else if (dmarc.present && !dmarc.subdomainPolicy) {
    riskScore += 0;
    recommendations.push({
      action: 'Add sp=reject to protect subdomains from spoofing too',
      priority: 'soon',
      effort: 'low',
      impact: 'Prevents attackers from spoofing your subdomains (e.g., mail.' + domain + ')',
    });
  }

  // DMARC reporting
  if (dmarc.present && !dmarc.rua) {
    recommendations.push({
      action: `Add rua=mailto:dmarc-reports@${domain} to receive spoofing attempt reports`,
      priority: 'soon',
      effort: 'low',
      impact: 'Get weekly reports showing who is sending email on behalf of your domain',
    });
  }

  // === SPF ANALYSIS (30 points) ===
  if (!spf.present) {
    riskScore += 0;
    recommendations.push({
      action: `Add SPF record: ${domain} → "v=spf1 include:_spf.google.com ~all" (adjust for your email provider)`,
      priority: 'immediate',
      effort: 'low',
      impact: 'Defines which mail servers are allowed to send email from your domain',
    });
  } else if (spf.mechanism === '-all') {
    riskScore += 30;
  } else if (spf.mechanism === '~all') {
    riskScore += 20;
    recommendations.push({
      action: 'Change SPF from ~all (soft fail) to -all (hard fail) to reject unauthorized senders',
      priority: 'when-ready',
      effort: 'low',
      impact: 'Strictly reject emails from unauthorized servers instead of marking them as suspicious',
    });
  } else if (spf.mechanism === '?all' || spf.mechanism === 'all') {
    riskScore += 5;
    recommendations.push({
      action: 'Change SPF from ?all (neutral) to -all (hard fail) to actually block unauthorized senders',
      priority: 'immediate',
      effort: 'low',
      impact: 'Your SPF record exists but doesn\'t block anything — this is like having a lock that doesn\'t work',
    });
  }

  // SPF include count warning
  if (spf.includes.length > 10) {
    recommendations.push({
      action: `Reduce SPF includes from ${spf.includes.length} to under 10 to avoid DNS lookup limits`,
      priority: 'soon',
      effort: 'medium',
      impact: 'Too many includes can cause legitimate emails to fail authentication',
    });
  }

  // === DKIM ANALYSIS (20 points) ===
  if (!dkim.present) {
    riskScore += 0;
    recommendations.push({
      action: 'Enable DKIM in your email provider (Google Workspace, Microsoft 365, etc.) and publish the public key in DNS',
      priority: 'soon',
      effort: 'low',
      impact: 'Adds a digital signature to your emails so recipients can verify they\'re authentic',
    });
  } else {
    riskScore += 15;
    // Key strength bonus
    if (dkim.keySize && dkim.keySize >= 2048) {
      riskScore += 5;
    } else if (dkim.keySize && dkim.keySize < 1024) {
      recommendations.push({
        action: 'Upgrade DKIM key from 1024-bit to 2048-bit for stronger email signing',
        priority: 'when-ready',
        effort: 'medium',
        impact: 'Stronger cryptographic signature makes email forgery much harder',
      });
    }
  }

  // === MX ANALYSIS (10 points) ===
  if (mx.present) {
    riskScore += 10;
  }

  // === DETERMINE SPOOFING STATUS ===
  const canBeSpoofed = riskScore < 50;
  
  let riskLevel: SpoofingRisk['riskLevel'];
  if (riskScore >= 80) riskLevel = 'protected';
  else if (riskScore >= 60) riskLevel = 'low';
  else if (riskScore >= 40) riskLevel = 'medium';
  else if (riskScore >= 20) riskLevel = 'high';
  else riskLevel = 'critical';

  // === BUILD ATTACK SCENARIO ===
  let attackScenario: string;
  let attackVector: string;
  let impactDescription: string;

  if (!dmarc.present && !spf.present) {
    attackScenario = `An attacker can send phishing emails from fake@${domain} that look completely legitimate. Your customers, partners, and employees will trust these emails because there is zero authentication protecting your domain.`;
    attackVector = 'No DMARC or SPF records exist. Any mail server in the world can send emails claiming to be from your domain. The attacker sets up a free email account, configures their mail server to use your domain in the "From" field, and sends phishing emails to your customers.';
    impactDescription = 'Business Email Compromise (BEC) fraud, customer phishing, brand impersonation, data theft. Average BEC loss: $125,000 per incident (FBI 2024).';
  } else if (!dmarc.present) {
    attackScenario = `An attacker can send emails from fake@${domain} that pass SPF checks. Even though you have an SPF record, without DMARC there is no policy to reject unauthorized senders.`;
    attackVector = `SPF exists but DMARC does not. The attacker can still spoof your domain because there is no policy instructing mail servers to reject unauthorized emails. SPF alone does not prevent spoofing — it only provides data for DMARC to act on.`;
    impactDescription = 'Email spoofing, phishing, brand damage, customer trust erosion. Your SPF record is useless without DMARC to enforce it.';
  } else if (dmarc.policy === 'none') {
    attackScenario = `An attacker is sending phishing emails from fake@${domain} right now. Your DMARC record is set to "none" which means it only monitors but does not block anything.`;
    attackVector = 'DMARC p=none is monitoring-only. Mail servers receive your DMARC policy but are instructed to take no action against unauthorized emails. The attacker\'s emails will be delivered to inboxes alongside your legitimate emails.';
    impactDescription = 'Ongoing email spoofing with no protection. You can see the attacks in your DMARC reports but cannot stop them. Every day you stay on p=none is a day your domain is vulnerable.';
  } else if (dmarc.policy === 'quarantine') {
    attackScenario = `An attacker attempting to send phishing emails from fake@${domain} will have their emails sent to spam/junk folders. Your DMARC quarantine policy provides good protection but not maximum security.`;
    attackVector = 'DMARC p=quarantine instructs mail servers to send suspicious emails to spam. However, some recipients may still check spam folders, and some mail servers may not fully enforce quarantine. A determined attacker could still reach some targets.';
    impactDescription = 'Good protection — most spoofed emails go to spam. Risk is reduced but not eliminated. Some recipients may still see and interact with quarantined emails.';
  } else {
    attackScenario = `Your domain is well-protected against email spoofing. DMARC reject policy ensures that any email not sent from your authorized mail servers is blocked entirely.`;
    attackVector = 'DMARC p=reject instructs mail servers to completely reject emails that fail authentication. Attackers cannot deliver spoofed emails to any recipient.';
    impactDescription = 'Strong protection against email spoofing and BEC fraud. Focus on monitoring DMARC reports for any legitimate email flow issues.';
  }

  return {
    canBeSpoofed,
    riskLevel,
    riskScore: Math.min(100, Math.max(0, riskScore)),
    attackScenario,
    attackVector,
    impactDescription,
    protectionStatus: {
      dmarc: {
        status: !dmarc.present ? 'not_configured' : dmarc.policy === 'none' ? 'monitoring_only' : dmarc.policy === 'quarantine' ? 'partial' : 'enforced',
        detail: !dmarc.present ? 'No DMARC record — domain is fully exposed to spoofing' :
          dmarc.policy === 'none' ? 'DMARC exists but is monitoring only — no protection' :
          dmarc.policy === 'quarantine' ? 'DMARC quarantines suspicious emails — good but not maximum' :
          'DMARC rejects unauthorized emails — maximum protection',
      },
      spf: {
        status: !spf.present ? 'not_configured' : spf.mechanism === '-all' ? 'enforced' : spf.mechanism === '~all' ? 'partial' : 'weak',
        detail: !spf.present ? 'No SPF record — any server can send email as your domain' :
          spf.mechanism === '-all' ? 'SPF strictly rejects unauthorized servers' :
          spf.mechanism === '~all' ? 'SPF soft-fails unauthorized servers (may still deliver)' :
          'SPF is neutral — does not actually block anything',
      },
      dkim: {
        status: !dkim.present ? 'not_configured' : 'configured',
        detail: !dkim.present ? 'No DKIM — emails have no digital signature' :
          `DKIM configured with selector "${dkim.selector}" — emails are cryptographically signed`,
      },
    },
    recommendations,
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
  
  // Calculate spoofing risk
  const spoofingRisk = calculateSpoofingRisk(domain, dmarc, spf, dkim, mx);
  
  // Add spoofing-specific findings
  if (spoofingRisk.canBeSpoofed) {
    findings.unshift({
      title: `Domain can be spoofed — ${spoofingRisk.riskLevel} risk`,
      severity: spoofingRisk.riskLevel === 'critical' ? 'critical' : spoofingRisk.riskLevel === 'high' ? 'high' : 'medium',
      category: 'email_security',
      description: spoofingRisk.attackScenario,
      plainEnglish: spoofingRisk.attackScenario,
      regulation: 'NDPA',
      regulationSection: 'Section 24',
      remediation: spoofingRisk.recommendations[0]?.action || 'Configure DMARC to protect against spoofing',
      effort: spoofingRisk.recommendations[0]?.effort || 'low',
    });
  }
  
  console.log(`[EMAIL] ${domain}: DMARC=${dmarc.present}, SPF=${spf.present}, DKIM=${dkim.present}, Score=${riskScore}, SpoofingRisk=${spoofingRisk.riskLevel}`);
  
  return {
    domain,
    dmarc,
    spf,
    dkim,
    mx,
    riskScore,
    findings,
    spoofingRisk,
  };
}
