/**
 * SENTARI Compliance Control Framework
 * Maps security checks to specific regulations (POPIA, NDPA, Kenya DPA)
 * Every finding is tied to a regulation section with plain-English explanation
 */

export interface ComplianceControl {
  id: string;
  regulation: 'POPIA' | 'NDPA' | 'KENYA_DPA' | 'ISO_27001' | 'GENERIC';
  section: string;
  title: string;
  description: string;
  plainEnglish: string; // What this means for a non-technical person
  category: 'encryption' | 'access_control' | 'data_protection' | 'incident_response' | 'governance' | 'network_security' | 'application_security';
  severity: 'critical' | 'high' | 'medium' | 'low';
  checkType: 'header' | 'ssl' | 'dns' | 'port' | 'technology' | 'configuration';
  checkConfig: Record<string, unknown>; // Parameters for the check
  remediation: string;
  remediationEffort: 'low' | 'medium' | 'high';
  applicableIf?: (context: ScanContext) => boolean; // Only apply if context matches
}

export interface ScanContext {
  domain: string;
  technology: string[]; // Detected technologies
  hasLogin: boolean;
  hasEcommerce: boolean;
  hasMobileApp: boolean;
  isGovernment: boolean;
  isFinancial: boolean;
  isHealthcare: boolean;
  country: string;
}

export interface ComplianceResult {
  control: ComplianceControl;
  passed: boolean;
  evidence: Record<string, unknown>;
  actualValue?: string;
  expectedValue?: string;
}

export interface RegulationScore {
  regulation: string;
  displayName: string;
  totalControls: number;
  passedControls: number;
  failedControls: number;
  score: number; // 0-100
  criticalFailures: ComplianceResult[];
  allResults: ComplianceResult[];
}

// ======================================================================
// POPIA CONTROLS (South Africa — Protection of Personal Information Act)
// ======================================================================
const POP_CONTROLS: ComplianceControl[] = [
  {
    id: 'POPIA-19-1',
    regulation: 'POPIA',
    section: 'Section 19(1)(b)',
    title: 'Encryption of personal information',
    description: 'Personal information must be secured with appropriate technical measures including encryption',
    plainEnglish: 'Your website must encrypt sensitive data (passwords, personal info) both when stored and when transmitted. Without encryption, hackers can steal customer data in plain text.',
    category: 'encryption',
    severity: 'critical',
    checkType: 'header',
    checkConfig: { header: 'strict-transport-security', required: true },
    remediation: 'Add HSTS header: Strict-Transport-Security: max-age=63072000; includeSubDomains; preload',
    remediationEffort: 'low',
  },
  {
    id: 'POPIA-19-1-c',
    regulation: 'POPIA',
    section: 'Section 19(1)(c)',
    title: 'Security measures to prevent unlawful access',
    description: 'Measures must be taken to prevent unlawful access to or processing of personal information',
    plainEnglish: 'You need security headers that prevent attackers from injecting malicious content, hijacking sessions, or accessing data they should not have.',
    category: 'application_security',
    severity: 'high',
    checkType: 'header',
    checkConfig: { header: 'content-security-policy', required: true },
    remediation: 'Implement Content-Security-Policy header to restrict what resources browsers can load',
    remediationEffort: 'medium',
  },
  {
    id: 'POPIA-14',
    regulation: 'POPIA',
    section: 'Section 14',
    title: 'Quality of personal information',
    description: 'Personal information must be complete, accurate, and up to date',
    plainEnglish: 'The technologies and frameworks your site uses must be current and supported. Outdated software has known vulnerabilities that put customer data at risk.',
    category: 'data_protection',
    severity: 'medium',
    checkType: 'technology',
    checkConfig: { checkOutdated: true },
    remediation: 'Update all software dependencies to latest stable versions. Remove deprecated technologies.',
    remediationEffort: 'medium',
  },
  {
    id: 'POPIA-19-2',
    regulation: 'POPIA',
    section: 'Section 19(2)',
    title: 'Identification of risks',
    description: 'Reasonable technical and organisational measures must be taken to identify risks',
    plainEnglish: 'You must actively look for security weaknesses before attackers do. Regular vulnerability scanning is required under POPIA.',
    category: 'governance',
    severity: 'medium',
    checkType: 'header',
    checkConfig: { header: 'permissions-policy', required: true },
    remediation: 'Implement Permissions-Policy header to restrict browser features and reduce attack surface',
    remediationEffort: 'low',
  },
];

// ======================================================================
// NDPA CONTROLS (Nigeria — Nigeria Data Protection Act)
// ======================================================================
const NDPA_CONTROLS: ComplianceControl[] = [
  {
    id: 'NDPA-24',
    regulation: 'NDPA',
    section: 'Section 24',
    title: 'Security of personal data',
    description: 'Appropriate technical and organisational measures must be implemented to ensure security of personal data',
    plainEnglish: 'Your website must use HTTPS encryption to protect data in transit. Without it, any data sent between your site and users can be intercepted.',
    category: 'encryption',
    severity: 'critical',
    checkType: 'ssl',
    checkConfig: { minProtocol: 'TLSv1.2', checkExpiry: true },
    remediation: 'Ensure SSL/TLS certificate is valid, uses TLS 1.2+, and auto-renews. Free certificates available via Let\'s Encrypt.',
    remediationEffort: 'low',
  },
  {
    id: 'NDPA-24-2',
    regulation: 'NDPA',
    section: 'Section 24(2)',
    title: 'Protection against unauthorised access',
    description: 'Protection against accidental loss, destruction, or damage must be ensured',
    plainEnglish: 'Your site must prevent clickjacking attacks where malicious sites embed yours to trick users. This is required under Nigerian data protection law.',
    category: 'application_security',
    severity: 'high',
    checkType: 'header',
    checkConfig: { header: 'x-frame-options', required: true },
    remediation: 'Add X-Frame-Options: DENY or SAMEORIGIN to prevent clickjacking attacks',
    remediationEffort: 'low',
  },
  {
    id: 'NDPA-30',
    regulation: 'NDPA',
    section: 'Section 30',
    title: 'Data breach notification',
    description: 'Data controllers must notify the Commission within 72 hours of becoming aware of a breach',
    plainEnglish: 'If a breach occurs, you have 72 hours to report it. Having proper error handling and logging helps you detect breaches faster.',
    category: 'incident_response',
    severity: 'medium',
    checkType: 'header',
    checkConfig: { header: 'referrer-policy', required: true },
    remediation: 'Implement Referrer-Policy to control what information is shared with other sites, reducing data leakage risk',
    remediationEffort: 'low',
  },
];

// ======================================================================
// KENYA DPA CONTROLS (Kenya — Data Protection Act)
// ======================================================================
const KENYA_DPA_CONTROLS: ComplianceControl[] = [
  {
    id: 'KENYA-25',
    regulation: 'KENYA_DPA',
    section: 'Section 25',
    title: 'Security safeguards',
    description: 'Appropriate technical and organisational measures must be taken against unauthorised or unlawful processing',
    plainEnglish: 'Kenya law requires you to protect user data with proper security controls. This includes preventing MIME-type sniffing attacks that can execute malicious code.',
    category: 'application_security',
    severity: 'medium',
    checkType: 'header',
    checkConfig: { header: 'x-content-type-options', required: true },
    remediation: 'Add X-Content-Type-Options: nosniff to prevent MIME-type sniffing attacks',
    remediationEffort: 'low',
  },
  {
    id: 'KENYA-25-2',
    regulation: 'KENYA_DPA',
    section: 'Section 25(2)',
    title: 'Protection against data processing risks',
    description: 'Measures must protect against accidental loss, destruction, or damage to personal data',
    plainEnglish: 'Your site must be protected against cross-site scripting (XSS) attacks where hackers inject malicious scripts into your pages.',
    category: 'application_security',
    severity: 'high',
    checkType: 'header',
    checkConfig: { header: 'x-xss-protection', required: true },
    remediation: 'Add X-XSS-Protection: 1; mode=block to enable browser XSS filtering',
    remediationEffort: 'low',
  },
  {
    id: 'KENYA-26',
    regulation: 'KENYA_DPA',
    section: 'Section 26',
    title: 'Transfer of personal data outside Kenya',
    description: 'Personal data may only be transferred outside Kenya if adequate protections exist',
    plainEnglish: 'If your site uses third-party services (CDNs, analytics, ads) hosted outside Kenya, you must ensure they meet Kenya data protection standards.',
    category: 'data_protection',
    severity: 'medium',
    checkType: 'dns',
    checkConfig: { checkThirdParty: true },
    remediation: 'Audit all third-party services and ensure data processing agreements are in place',
    remediationEffort: 'medium',
  },
];

// ======================================================================
// ISO 27001 CONTROLS (International)
// ======================================================================
const ISO_CONTROLS: ComplianceControl[] = [
  {
    id: 'ISO-A.10.1',
    regulation: 'ISO_27001',
    section: 'A.10.1.1',
    title: 'Policy on cryptographic controls',
    description: 'A policy on the use of cryptographic controls must be developed and implemented',
    plainEnglish: 'Your site must use strong encryption (TLS 1.2+) for all data transmission. Older protocols like SSLv3 or TLS 1.0 are insecure.',
    category: 'encryption',
    severity: 'critical',
    checkType: 'ssl',
    checkConfig: { minProtocol: 'TLSv1.2' },
    remediation: 'Configure server to only accept TLS 1.2+ connections. Disable SSLv3 and TLS 1.0/1.1.',
    remediationEffort: 'medium',
  },
  {
    id: 'ISO-A.12.6',
    regulation: 'ISO_27001',
    section: 'A.12.6.1',
    title: 'Management of technical vulnerabilities',
    description: 'Information about technical vulnerabilities must be obtained and acted upon timely',
    plainEnglish: 'You must regularly check for and fix security vulnerabilities in your software. Running outdated software with known vulnerabilities is a compliance violation.',
    category: 'application_security',
    severity: 'high',
    checkType: 'technology',
    checkConfig: { checkVulnerabilities: true },
    remediation: 'Subscribe to security advisories for all technologies used. Apply patches within 30 days of release.',
    remediationEffort: 'medium',
  },
];

// ======================================================================
// ALL CONTROLS COMBINED
// ======================================================================
export const ALL_CONTROLS: ComplianceControl[] = [
  ...POP_CONTROLS,
  ...NDPA_CONTROLS,
  ...KENYA_DPA_CONTROLS,
  ...ISO_CONTROLS,
];

/**
 * Get controls applicable to a specific scan context
 */
export function getApplicableControls(context: ScanContext): ComplianceControl[] {
  return ALL_CONTROLS.filter(control => {
    if (control.applicableIf && !control.applicableIf(context)) {
      return false;
    }
    return true;
  });
}

/**
 * Map regulation name to display name
 */
export const REGULATION_DISPLAY: Record<string, string> = {
  'POPIA': 'POPIA (South Africa)',
  'NDPA': 'NDPA (Nigeria)',
  'KENYA_DPA': 'Kenya DPA',
  'ISO_27001': 'ISO 27001',
};

/**
 * Calculate compliance score for a regulation
 */
export function calculateRegulationScore(
  regulation: string,
  results: ComplianceResult[]
): RegulationScore {
  const regResults = results.filter(r => r.control.regulation === regulation);
  const passed = regResults.filter(r => r.passed).length;
  const failed = regResults.filter(r => !r.passed);
  const total = regResults.length;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;

  return {
    regulation,
    displayName: REGULATION_DISPLAY[regulation] || regulation,
    totalControls: total,
    passedControls: passed,
    failedControls: failed.length,
    score,
    criticalFailures: failed.filter(r => r.control.severity === 'critical'),
    allResults: regResults,
  };
}
