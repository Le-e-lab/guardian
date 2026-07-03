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

export interface DMARCPolicyStep {
  stage: 'monitor' | 'quarantine' | 'reject' | 'complete';
  title: string;
  description: string;
  timeline: string;
  isCurrentStep: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  prerequisites: Array<{
    name: string;
    met: boolean;
    detail: string;
  }>;
  dnsRecord: string; // The exact DNS record to set
  validationChecks: Array<{
    name: string;
    description: string;
    howToCheck: string;
  }>;
  risks: string[];
  rollbackPlan: string;
}

export interface DMARCPolicyRoadmap {
  currentPolicy: string | null;
  currentStage: 'none' | 'monitor' | 'quarantine' | 'reject' | 'unknown';
  recommendedNextStep: string;
  estimatedTimeToFullProtection: string;
  steps: DMARCPolicyStep[];
  overallProgress: number; // 0-100
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
  dmarcPolicyRoadmap: DMARCPolicyRoadmap;
  spfAlignment: SPFAlignment;
  dkimStrength: DKIMStrength;
  bimi: BIMIResult;
}

export interface BIMIResult {
  domain: string;
  configured: boolean;
  logoUrl: string | null;
  vmcPresent: boolean;
  riskLevel: 'good' | 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  benefits: string[];
  prerequisites: Array<{ name: string; met: boolean; detail: string }>;
  fixes: Array<{
    action: string;
    priority: 'immediate' | 'soon' | 'when-ready';
    effort: 'low' | 'medium' | 'high';
    detail: string;
  }>;
}

export interface DKIMStrength {
  domain: string;
  configured: boolean;
  selector: string | null;
  keySize: number | null;
  keyAlgorithm: string;
  strengthGrade: 'A' | 'B' | 'C' | 'D' | 'F' | 'N/A';
  strengthLabel: string;
  riskLevel: 'good' | 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  details: Array<{
    label: string;
    value: string;
    status: 'good' | 'warning' | 'bad' | 'info';
  }>;
  fixes: Array<{
    action: string;
    priority: 'immediate' | 'soon' | 'when-ready';
    effort: 'low' | 'medium' | 'high';
    detail: string;
  }>;
}

export interface SPFAlignment {
  domain: string;
  spfPresent: boolean;
  dmarcPresent: boolean;
  alignmentMode: 'strict' | 'relaxed' | 'none' | 'unknown';
  alignmentResult: 'pass' | 'fail' | 'partial' | 'not_applicable';
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'good';
  explanation: string;
  technicalDetail: string;
  impact: string;
  fixes: Array<{
    action: string;
    priority: 'immediate' | 'soon' | 'when-ready';
    effort: 'low' | 'medium' | 'high';
    detail: string;
  }>;
  senderAnalysis: Array<{
    source: string;
    ipRange: string;
    spfResult: string;
    alignmentResult: string;
    risk: string;
  }>;
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
 * Generate DMARC Policy Roadmap
 * Step-by-step guide from p=none → p=quarantine → p=reject
 */
function calculateDMARCPolicyRoadmap(
  domain: string,
  dmarc: EmailSecurityResult['dmarc'],
  spf: EmailSecurityResult['spf'],
  dkim: EmailSecurityResult['dkim']
): DMARCPolicyRoadmap {
  const currentPolicy = dmarc.policy;
  
  // Determine current stage
  let currentStage: DMARCPolicyRoadmap['currentStage'];
  if (!dmarc.present) currentStage = 'none';
  else if (currentPolicy === 'none') currentStage = 'monitor';
  else if (currentPolicy === 'quarantine') currentStage = 'quarantine';
  else if (currentPolicy === 'reject') currentStage = 'reject';
  else currentStage = 'unknown';

  // Check prerequisites
  const hasSPF = spf.present;
  const hasDKIM = dkim.present;
  const hasDMARC = dmarc.present;
  const hasRUA = !!dmarc.rua;
  const spfStrong = spf.mechanism === '-all';
  const dkimKeyStrong = !dkim.keySize || dkim.keySize >= 1024;

  // Build steps
  const steps: DMARCPolicyStep[] = [];

  // Step 1: Monitor (p=none)
  const monitorPrereqs = [
    { name: 'DMARC record published', met: hasDMARC, detail: hasDMARC ? 'DMARC record exists' : `Add _dmarc.${domain} TXT record` },
    { name: 'SPF record configured', met: hasSPF, detail: hasSPF ? `SPF configured (${spf.mechanism || 'unknown'})` : `Add SPF record to ${domain}` },
    { name: 'DKIM enabled', met: hasDKIM, detail: hasDKIM ? `DKIM configured (selector: ${dkim.selector || 'unknown'})` : 'Enable DKIM in your email provider' },
    { name: 'RUA reporting configured', met: hasRUA, detail: hasRUA ? 'Aggregate reports enabled' : 'Add rua=mailto: to receive DMARC reports' },
  ];

  steps.push({
    stage: 'monitor',
    title: 'Step 1: Monitor (p=none)',
    description: 'Set DMARC to p=none to collect data without affecting email delivery. This phase tells you WHO is sending email on behalf of your domain.',
    timeline: '2-4 weeks',
    isCurrentStep: currentStage === 'none' || currentStage === 'monitor',
    isCompleted: currentStage === 'quarantine' || currentStage === 'reject',
    isLocked: false,
    prerequisites: monitorPrereqs,
    dnsRecord: `v=DMARC1; p=none; rua=mailto:dmarc-reports@${domain}; sp=none`,
    validationChecks: [
      { name: 'Reports arriving', description: 'You receive weekly DMARC aggregate reports', howToCheck: 'Check your RUA email inbox for XML reports from Google, Microsoft, etc.' },
      { name: 'Identify all senders', description: 'You can see all legitimate email sources in the reports', howToCheck: 'Open the XML report and look at <record> entries — each represents an email source' },
      { name: 'No false positives', description: 'Legitimate email sources are not being flagged as failures', howToCheck: 'Check the <policy_evaluated> section — legitimate sources should show "pass"' },
    ],
    risks: [
      'Your domain remains fully spoofable during this phase',
      'Attackers can send phishing emails that look legitimate',
      'You are only collecting data, not blocking anything',
    ],
    rollbackPlan: 'No rollback needed — p=none is the starting position and does not affect email delivery.',
  });

  // Step 2: Quarantine (p=quarantine)
  const quarantinePrereqs = [
    { name: 'Monitor phase complete', met: hasDMARC && currentPolicy !== 'none', detail: currentStage !== 'none' ? 'Monitor phase completed' : 'Complete 2-4 weeks of monitoring first' },
    { name: 'All legitimate senders identified', met: hasRUA, detail: hasRUA ? 'You have reviewed DMARC reports' : 'Review DMARC aggregate reports to identify all legitimate email sources' },
    { name: 'SPF aligned for all sources', met: spfStrong, detail: spfStrong ? 'SPF uses -all (hard fail)' : 'Update SPF to use -all instead of ~all' },
    { name: 'No legitimate email failures', met: hasRUA, detail: hasRUA ? 'Verified in reports' : 'Check reports to ensure no legitimate email is failing authentication' },
  ];

  steps.push({
    stage: 'quarantine',
    title: 'Step 2: Quarantine (p=quarantine)',
    description: 'Move to p=quarantine to send suspicious emails to spam. This blocks most spoofing while giving you a safety net if something breaks.',
    timeline: '1-2 weeks',
    isCurrentStep: currentStage === 'quarantine',
    isCompleted: currentStage === 'reject',
    isLocked: !hasDMARC || currentStage === 'none',
    prerequisites: quarantinePrereqs,
    dnsRecord: `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${domain}; sp=quarantine`,
    validationChecks: [
      { name: 'Spoofed emails go to spam', description: 'Test by checking that unauthorized sources are quarantined', howToCheck: 'Use a tool like mail-tester.com or send from an unauthorized server' },
      { name: 'Legitimate email still delivers', description: 'Your normal business email arrives in inboxes', howToCheck: 'Send test emails from your normal email accounts and verify delivery' },
      { name: 'Report shows reduced failures', description: 'Fewer authentication failures in aggregate reports', howToCheck: 'Compare this week\'s DMARC report to the previous week' },
    ],
    risks: [
      'Some legitimate emails may go to spam if not properly authenticated',
      'Third-party email services (marketing, transactional) may need SPF/DKIM updates',
      'Recipients may not check spam folders for quarantined emails',
    ],
    rollbackPlan: 'Change DMARC policy back to p=none if legitimate emails are being quarantined. Fix the authentication issue, then re-enforce.',
  });

  // Step 3: Reject (p=reject)
  const rejectPrereqs = [
    { name: 'Quarantine phase validated', met: currentStage === 'reject' || currentStage === 'quarantine', detail: currentStage === 'reject' ? 'Reject phase active' : currentStage === 'quarantine' ? 'Quarantine phase validated' : 'Complete quarantine phase first' },
    { name: 'No legitimate email in quarantine', met: hasRUA, detail: hasRUA ? 'Verified via reports' : 'Confirm no legitimate email is being quarantined' },
    { name: 'All email sources authenticated', met: hasSPF && hasDKIM, detail: hasSPF && hasDKIM ? 'SPF + DKIM configured' : 'Ensure all email sources pass SPF or DKIM' },
    { name: 'Subdomain policy set', met: !!dmarc.subdomainPolicy, detail: dmarc.subdomainPolicy ? `sp=${dmarc.subdomainPolicy}` : 'Add sp=reject to protect subdomains' },
  ];

  steps.push({
    stage: 'reject',
    title: 'Step 3: Reject (p=reject)',
    description: 'Move to p=reject for maximum protection. All unauthorized emails are completely blocked — they will never reach any recipient.',
    timeline: 'Permanent',
    isCurrentStep: currentStage === 'reject',
    isCompleted: false,
    isLocked: currentStage === 'none' || currentStage === 'monitor' || currentStage === 'unknown',
    prerequisites: rejectPrereqs,
    dnsRecord: `v=DMARC1; p=reject; rua=mailto:dmarc-reports@${domain}; sp=reject; adkim=s; aspf=s`,
    validationChecks: [
      { name: 'Spoofed emails rejected', description: 'Unauthorized emails are completely blocked', howToCheck: 'Send from unauthorized server — should get bounce/rejection notice' },
      { name: 'All business email delivers', description: 'Every legitimate email reaches inboxes', howToCheck: 'Test all email channels: marketing, transactional, internal' },
      { name: 'No customer complaints', description: 'Recipients report normal email delivery', howToCheck: 'Monitor for any "email not received" reports over 2 weeks' },
    ],
    risks: [
      'If misconfigured, ALL email from your domain could be rejected',
      'Third-party services must be properly authenticated before this step',
      'Recovery from misconfiguration can take hours to days',
    ],
    rollbackPlan: 'Immediately change DMARC policy back to p=quarantine if legitimate email is being rejected. Diagnose the authentication failure, fix it, then re-enforce.',
  });

  // Step 4: Complete
  steps.push({
    stage: 'complete',
    title: 'Complete: Maximum Protection',
    description: 'Your domain is fully protected against email spoofing. Monitor DMARC reports regularly and maintain your SPF/DKIM configuration.',
    timeline: 'Ongoing',
    isCurrentStep: currentStage === 'reject' && !!dmarc.subdomainPolicy,
    isCompleted: false,
    isLocked: currentStage !== 'reject',
    prerequisites: [],
    dnsRecord: '',
    validationChecks: [
      { name: 'Weekly report review', description: 'Check DMARC aggregate reports for anomalies', howToCheck: 'Set a weekly calendar reminder to review RUA reports' },
      { name: 'Annual SPF audit', description: 'Verify SPF includes are still needed', howToCheck: 'Review all included domains and remove any that are no longer used' },
      { name: 'DKIM key rotation', description: 'Rotate DKIM keys every 6-12 months', howToCheck: 'Generate new DKIM key, publish to DNS, update email provider' },
    ],
    risks: [],
    rollbackPlan: 'Maintain monitoring. If issues arise, temporarily step back to p=quarantine while diagnosing.',
  });

  // Calculate overall progress
  let progress = 0;
  if (hasDMARC) progress += 10;
  if (hasSPF) progress += 10;
  if (hasDKIM) progress += 10;
  if (currentPolicy === 'none') progress += 20;
  if (currentPolicy === 'quarantine') progress += 50;
  if (currentPolicy === 'reject') progress += 80;
  if (currentPolicy === 'reject' && dmarc.subdomainPolicy) progress += 10;
  if (hasRUA) progress += 5;
  progress = Math.min(100, progress);

  // Determine recommended next step
  let recommendedNextStep: string;
  let estimatedTime: string;
  if (!hasDMARC) {
    recommendedNextStep = 'Add a DMARC record with p=none to start monitoring';
    estimatedTime = '4-6 weeks to full protection';
  } else if (currentPolicy === 'none') {
    recommendedNextStep = 'Review DMARC reports for 2-4 weeks, then move to p=quarantine';
    estimatedTime = '3-5 weeks to full protection';
  } else if (currentPolicy === 'quarantine') {
    recommendedNextStep = 'Validate no legitimate email is quarantined, then move to p=reject';
    estimatedTime = '1-3 weeks to full protection';
  } else if (currentPolicy === 'reject' && !dmarc.subdomainPolicy) {
    recommendedNextStep = 'Add sp=reject to protect subdomains';
    estimatedTime = '1 week to complete';
  } else {
    recommendedNextStep = 'Your DMARC is fully configured. Monitor reports regularly.';
    estimatedTime = 'Fully protected';
  }

  return {
    currentPolicy,
    currentStage,
    recommendedNextStep,
    estimatedTimeToFullProtection: estimatedTime,
    steps,
    overallProgress: progress,
  };
}

/**
 * Calculate SPF Alignment with DMARC
 * Checks if SPF aligns with DMARC (strict vs relaxed)
 */
function calculateSPFAlignment(
  domain: string,
  spf: EmailSecurityResult['spf'],
  dmarc: EmailSecurityResult['dmarc']
): SPFAlignment {
  const spfPresent = spf.present;
  const dmarcPresent = dmarc.present;

  // Determine alignment mode from DMARC record
  let alignmentMode: SPFAlignment['alignmentMode'] = 'unknown';
  if (dmarcPresent) {
    // Check DMARC record for aspf tag
    const record = dmarc.record || '';
    const aspfMatch = record.match(/aspf\s*=\s*([sr])/i);
    if (aspfMatch) {
      alignmentMode = aspfMatch[1].toLowerCase() === 's' ? 'strict' : 'relaxed';
    } else {
      // Default DMARC alignment is relaxed
      alignmentMode = 'relaxed';
    }
  }

  // Analyze alignment
  let alignmentResult: SPFAlignment['alignmentResult'];
  let riskLevel: SPFAlignment['riskLevel'];
  let explanation: string;
  let technicalDetail: string;
  let impact: string;
  const fixes: SPFAlignment['fixes'] = [];
  const senderAnalysis: SPFAlignment['senderAnalysis'] = [];

  if (!spfPresent && !dmarcPresent) {
    alignmentResult = 'not_applicable';
    riskLevel = 'critical';
    explanation = `Neither SPF nor DMARC is configured for ${domain}. Any mail server in the world can send emails claiming to be from your domain.`;
    technicalDetail = 'No SPF record means no authorized sender list. No DMARC record means no policy to enforce authentication. This is the weakest possible email security posture.';
    impact = 'Complete email spoofing exposure. Attackers can send phishing emails that look 100% legitimate.';
    fixes.push(
      { action: `Add SPF record: ${domain} → "v=spf1 include:_spf.google.com ~all"`, priority: 'immediate', effort: 'low', detail: 'Define which servers can send email from your domain' },
      { action: `Add DMARC record: _dmarc.${domain} → "v=DMARC1; p=quarantine; aspf=r"`, priority: 'immediate', effort: 'low', detail: 'Set up DMARC with relaxed SPF alignment' }
    );
  } else if (!spfPresent && dmarcPresent) {
    alignmentResult = 'fail';
    riskLevel = 'high';
    explanation = `DMARC is configured but SPF is missing. Without SPF, DMARC cannot validate the sending server, and emails will fail authentication.`;
    technicalDetail = `DMARC policy exists (p=${dmarc.policy || 'none'}) but no SPF record is published. DMARC requires either SPF or DKIM to pass — without SPF, only DKIM can save you.`;
    impact = 'DMARC is partially effective. Emails may fail DMARC checks depending on DKIM configuration.';
    fixes.push(
      { action: `Add SPF record: ${domain} → "v=spf1 include:_spf.google.com ~all"`, priority: 'immediate', effort: 'low', detail: 'SPF is required for DMARC to fully protect your domain' }
    );
  } else if (spfPresent && !dmarcPresent) {
    alignmentResult = 'fail';
    riskLevel = 'high';
    explanation = `SPF is configured but DMARC is missing. SPF alone does not prevent spoofing — it only provides data that DMARC uses to make enforcement decisions.`;
    technicalDetail = `SPF record exists (${spf.mechanism || 'unknown'}) but no DMARC record. Without DMARC, mail servers receive your SPF data but have no policy to reject unauthorized senders.`;
    impact = 'SPF provides a false sense of security. Your domain can still be spoofed because there is no DMARC policy to enforce SPF results.';
    fixes.push(
      { action: `Add DMARC record: _dmarc.${domain} → "v=DMARC1; p=quarantine; aspf=r"`, priority: 'immediate', effort: 'low', detail: 'DMARC is required to enforce SPF results' }
    );
  } else {
    // Both SPF and DMARC present — check alignment
    const spfMechanism = spf.mechanism || 'all';
    const dmarcPolicy = dmarc.policy || 'none';

    if (alignmentMode === 'strict') {
      // Strict alignment: MAIL FROM domain must exactly match From: domain
      alignmentResult = 'pass';
      riskLevel = 'good';
      explanation = `SPF is in strict alignment mode (aspf=s). The sending domain must exactly match ${domain} for SPF to pass DMARC checks.`;
      technicalDetail = `DMARC aspf=s requires exact domain match. SPF mechanism: ${spfMechanism}. This is the most secure configuration — subdomains cannot be used to bypass SPF.`;
      impact = 'Maximum SPF protection. Only emails from the exact domain can pass SPF alignment.';
    } else {
      // Relaxed alignment: organizational domain match is enough
      alignmentResult = 'pass';
      riskLevel = spfMechanism === '-all' ? 'good' : spfMechanism === '~all' ? 'medium' : 'high';
      explanation = `SPF is in relaxed alignment mode (aspf=r). Any subdomain of ${domain} can pass SPF alignment.`;
      technicalDetail = `DMARC aspf=r allows subdomain matching. SPF mechanism: ${spfMechanism}. Relaxed mode is standard and recommended for most organizations.`;
      impact = spfMechanism === '-all' ? 'Strong protection. Unauthorized servers are rejected.' :
        spfMechanism === '~all' ? 'Moderate protection. Unauthorized servers are soft-failed (may still deliver).' :
        'Weak protection. SPF mechanism does not effectively block unauthorized senders.';
    }

    // Analyze common email sources
    const commonSources = [
      { source: 'Google Workspace', ipRange: '_spf.google.com', check: spf.includes.includes('_spf.google.com') },
      { source: 'Microsoft 365', ipRange: 'include:spf.protection.outlook.com', check: spf.includes.some(i => i.includes('outlook.com') || i.includes('protection.outlook.com')) },
      { source: 'SendGrid', ipRange: 'include:sendgrid.net', check: spf.includes.includes('sendgrid.net') },
      { source: 'Mailchimp', ipRange: 'include:servers.mcsv.net', check: spf.includes.includes('servers.mcsv.net') },
      { source: 'Amazon SES', ipRange: 'include:amazonses.com', check: spf.includes.includes('amazonses.com') },
    ];

    for (const source of commonSources) {
      if (source.check) {
        senderAnalysis.push({
          source: source.source,
          ipRange: source.ipRange,
          spfResult: 'pass',
          alignmentResult: alignmentMode === 'strict' ? 'pass (exact match)' : 'pass (subdomain ok)',
          risk: 'low',
        });
      }
    }

    // Add fixes based on current state
    if (spfMechanism === '?all' || spfMechanism === 'all') {
      fixes.push(
        { action: `Change SPF from ${spfMechanism} to -all (hard fail)`, priority: 'immediate', effort: 'low', detail: 'Your SPF record does not actually block unauthorized senders' }
      );
    }
    if (spfMechanism === '~all') {
      fixes.push(
        { action: 'Consider upgrading SPF from ~all to -all for stricter protection', priority: 'when-ready', effort: 'low', detail: 'Soft fail allows suspicious emails through — hard fail blocks them' }
      );
    }
    if (spf.includes.length > 10) {
      fixes.push(
        { action: `Reduce SPF includes from ${spf.includes.length} to under 10`, priority: 'soon', effort: 'medium', detail: 'Too many includes can exceed the 10 DNS lookup limit, causing SPF to fail' }
      );
    }
    if (!dmarc.rua) {
      fixes.push(
        { action: 'Add RUA reporting to monitor SPF alignment results', priority: 'soon', effort: 'low', detail: 'Aggregate reports show you which sources pass/fail SPF alignment' }
      );
    }
  }

  return {
    domain,
    spfPresent,
    dmarcPresent,
    alignmentMode,
    alignmentResult,
    riskLevel,
    explanation,
    technicalDetail,
    impact,
    fixes,
    senderAnalysis,
  };
}

/**
 * Calculate DKIM Key Strength
 * Analyzes DKIM configuration, key size, algorithm, and overall health
 */
function calculateDKIMStrength(
  domain: string,
  dkim: EmailSecurityResult['dkim']
): DKIMStrength {
  const configured = dkim.present;
  const selector = dkim.selector;
  const keySize = dkim.keySize;

  const details: DKIMStrength['details'] = [];
  const fixes: DKIMStrength['fixes'] = [];

  if (!configured) {
    details.push(
      { label: 'DKIM Status', value: 'Not configured', status: 'bad' },
      { label: 'Selector', value: 'None found', status: 'bad' },
      { label: 'Key Size', value: 'N/A', status: 'info' },
    );
    fixes.push(
      { action: 'Enable DKIM in your email provider and publish the public key in DNS', priority: 'immediate', effort: 'low', detail: 'Without DKIM, emails have no digital signature and cannot be cryptographically verified' }
    );
  } else {
    // DKIM is configured — analyze strength
    details.push(
      { label: 'DKIM Status', value: 'Configured', status: 'good' },
      { label: 'Selector', value: selector || 'unknown', status: 'good' },
    );

    // Key size analysis
    if (keySize) {
      if (keySize >= 2048) {
        details.push({ label: 'Key Size', value: `${keySize}-bit`, status: 'good' });
      } else if (keySize >= 1024) {
        details.push({ label: 'Key Size', value: `${keySize}-bit`, status: 'warning' });
        fixes.push(
          { action: 'Upgrade DKIM key from 1024-bit to 2048-bit', priority: 'soon', effort: 'medium', detail: '1024-bit RSA keys are considered weak by NIST. 2048-bit is the current standard.' }
        );
      } else {
        details.push({ label: 'Key Size', value: `${keySize}-bit (insecure)`, status: 'bad' });
        fixes.push(
          { action: 'Upgrade DKIM key immediately — current key is cryptographically weak', priority: 'immediate', effort: 'medium', detail: 'Keys under 1024-bit can be factored by modern hardware' }
        );
      }
    } else {
      details.push({ label: 'Key Size', value: 'Unable to determine', status: 'info' });
    }

    // Check common weak selectors
    const weakSelectors = ['default', 'google', 'selector1'];
    if (selector && weakSelectors.includes(selector.toLowerCase())) {
      details.push({ label: 'Selector', value: `${selector} (common)`, status: 'warning' });
    }

    // Check if key record looks like a valid DKIM record
    const record = dkim.record || '';
    if (record.includes('p=') && record.includes('v=DKIM1')) {
      details.push({ label: 'Record Format', value: 'Valid DKIM record', status: 'good' });
    } else if (record) {
      details.push({ label: 'Record Format', value: 'Unusual format', status: 'warning' });
    }
  }

  // Determine grade
  let strengthGrade: DKIMStrength['strengthGrade'];
  let strengthLabel: string;
  let riskLevel: DKIMStrength['riskLevel'];
  let explanation: string;

  if (!configured) {
    strengthGrade = 'F';
    strengthLabel = 'No DKIM';
    riskLevel = 'high';
    explanation = `DKIM is not configured for ${domain}. Without DKIM, your emails have no digital signature. Recipients (Gmail, Outlook, etc.) cannot verify your emails are authentic, which hurts deliverability and makes spoofing easier.`;
  } else if (keySize && keySize < 1024) {
    strengthGrade = 'D';
    strengthLabel = 'Weak Key';
    riskLevel = 'high';
    explanation = `DKIM is configured but uses a weak ${keySize}-bit key. This can be cracked by modern hardware. Upgrade to 2048-bit immediately.`;
  } else if (keySize && keySize >= 1024 && keySize < 2048) {
    strengthGrade = 'C';
    strengthLabel = 'Adequate Key';
    riskLevel = 'medium';
    explanation = `DKIM is configured with a ${keySize}-bit key. This meets minimum security standards but NIST recommends 2048-bit or higher for new deployments.`;
  } else if (keySize && keySize >= 2048) {
    strengthGrade = 'A';
    strengthLabel = 'Strong Key';
    riskLevel = 'good';
    explanation = `DKIM is configured with a strong ${keySize}-bit key. This provides excellent cryptographic protection for email signing.`;
  } else {
    strengthGrade = 'B';
    strengthLabel = 'Configured';
    riskLevel = 'low';
    explanation = `DKIM is configured with selector "${selector || 'unknown'}". Key size could not be determined from DNS — this is common and usually means the key is valid.`;
  }

  return {
    domain,
    configured,
    selector,
    keySize,
    keyAlgorithm: 'RSA', // Most common; ECDSA detection would need deeper inspection
    strengthGrade,
    strengthLabel,
    riskLevel,
    explanation,
    details,
    fixes,
  };
}

/**
 * Check BIMI (Brand Indicators for Message Identification)
 * Displays brand logo next to emails in supported inboxes
 */
async function checkBIMI(
  domain: string,
  dmarc: EmailSecurityResult['dmarc'],
  spf: EmailSecurityResult['spf'],
  dkim: EmailSecurityResult['dkim']
): Promise<BIMIResult> {
  // Look up BIMI record
  let configured = false;
  let logoUrl: string | null = null;
  let vmcPresent = false;

  try {
    const records = await lookupTxtRecords(`default._bimi.${domain}`);
    const bimiRecord = records.find(r => r.startsWith('v=BIMI1'));

    if (bimiRecord) {
      configured = true;
      // Extract SVG URL
      const lMatch = bimiRecord.match(/l=([^;]+)/);
      if (lMatch) {
        logoUrl = lMatch[1].trim();
      }
      // Check for VMC (Verified Mark Certificate)
      const aMatch = bimiRecord.match(/a=([^;]+)/);
      if (aMatch) {
        vmcPresent = true;
      }
    }
  } catch {
    // BIMI lookup failed
  }

  // Check prerequisites
  const hasDMARC = dmarc.present;
  const dmarcEnforced = dmarc.policy === 'quarantine' || dmarc.policy === 'reject';
  const hasSPF = spf.present;
  const hasDKIM = dkim.present;

  const prerequisites = [
    { name: 'DMARC policy enforced (quarantine or reject)', met: dmarcEnforced, detail: dmarcEnforced ? `DMARC p=${dmarc.policy}` : 'Requires DMARC p=quarantine or p=reject' },
    { name: 'SPF configured', met: hasSPF, detail: hasSPF ? 'SPF present' : 'Add SPF record' },
    { name: 'DKIM configured', met: hasDKIM, detail: hasDKIM ? 'DKIM present' : 'Enable DKIM' },
  ];

  // Determine risk level
  let riskLevel: BIMIResult['riskLevel'];
  let explanation: string;
  const fixes: BIMIResult['fixes'] = [];

  if (configured) {
    riskLevel = 'good';
    explanation = `BIMI is configured for ${domain}. Your brand logo will display next to emails in supported inboxes (Gmail, Yahoo, Apple Mail).`;
  } else if (!hasDMARC) {
    riskLevel = 'high';
    explanation = `BIMI requires DMARC to be configured first. Set up DMARC with p=quarantine or p=reject, then configure BIMI.`;
    fixes.push(
      { action: 'Configure DMARC with p=quarantine or p=reject first', priority: 'immediate', effort: 'low', detail: 'BIMI requires DMARC enforcement as a prerequisite' }
    );
  } else if (!dmarcEnforced) {
    riskLevel = 'medium';
    explanation = `DMARC is set to p=none. BIMI requires p=quarantine or p=reject. Move to p=quarantine to enable BIMI.`;
    fixes.push(
      { action: 'Move DMARC policy from p=none to p=quarantine', priority: 'soon', effort: 'low', detail: 'BIMI requires DMARC enforcement' },
      { action: `Add BIMI record: default._bimi.${domain} → "v=BIMI1; l=https://${domain}/logo.svg"`, priority: 'when-ready', effort: 'medium', detail: 'Host your logo as an SVG and publish the BIMI DNS record' }
    );
  } else {
    riskLevel = 'low';
    explanation = `DMARC is enforced (p=${dmarc.policy}) but BIMI is not configured. Your domain is ready for BIMI — just publish the DNS record.`;
    fixes.push(
      { action: `Add BIMI record: default._bimi.${domain} → "v=BIMI1; l=https://${domain}/logo.svg"`, priority: 'soon', effort: 'medium', detail: 'Host your logo as an SVG and publish the BIMI DNS record' }
    );
  }

  const benefits = [
    'Brand logo displayed next to your emails in Gmail, Yahoo, Apple Mail',
    'Increased trust — recipients can visually identify your brand',
    'Higher open rates — branded emails get 10-15% more engagement',
    'Protection against impersonation — logo only shows for authenticated senders',
  ];

  return {
    domain,
    configured,
    logoUrl,
    vmcPresent,
    riskLevel,
    explanation,
    benefits,
    prerequisites,
    fixes,
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
  
  // Calculate DMARC policy roadmap
  const dmarcPolicyRoadmap = calculateDMARCPolicyRoadmap(domain, dmarc, spf, dkim);
  
  // Calculate SPF alignment
  const spfAlignment = calculateSPFAlignment(domain, spf, dmarc);
  
  // Calculate DKIM strength
  const dkimStrength = calculateDKIMStrength(domain, dkim);
  
  // Check BIMI
  let bimi: BIMIResult;
  try {
    bimi = await checkBIMI(domain, dmarc, spf, dkim);
  } catch {
    bimi = {
      domain,
      configured: false,
      logoUrl: null,
      vmcPresent: false,
      riskLevel: 'high',
      explanation: 'BIMI check failed',
      benefits: [],
      prerequisites: [],
      fixes: [],
    };
  }
  
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
    dmarcPolicyRoadmap,
    spfAlignment,
    dkimStrength,
    bimi,
  };
}
