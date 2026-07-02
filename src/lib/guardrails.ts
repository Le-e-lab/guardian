/**
 * SENTARI AI Guardrails System
 * Controls what the AI can and cannot do based on user role and scan mode
 */

export type UserRole = 'public' | 'free' | 'starter' | 'professional' | 'enterprise' | 'admin';
export type ScanMode = 'passive' | 'active';
export type ToolPermission = 'allowed' | 'restricted' | 'blocked';

export interface GuardrailConfig {
  role: UserRole;
  scanMode: ScanMode;
  allowedModules: string[];
  blockedModules: string[];
  maxScanTargets: number;
  maxScansPerDay: number;
  dataRetentionDays: number;
  canExportData: boolean;
  canAccessRawOutput: boolean;
  requiresAuthorization: boolean;
  auditLogging: boolean;
  // Result visibility controls — the upgrade gate
  resultVisibility: {
    showRiskScore: boolean;
    showFindingsCount: boolean;
    showFindingDetails: boolean;
    showRemediation: boolean;
    showAIAnalysis: boolean;
    showAttackPaths: boolean;
    maxFindingPreviews: number; // 0 = none, N = show first N findings only
  };
}

/**
 * Guardrail configurations by role
 */
export const GUARDRAIL_CONFIGS: Record<UserRole, GuardrailConfig> = {
  public: {
    role: 'public',
    scanMode: 'passive',
    allowedModules: ['dns', 'tech', 'headers'],
    blockedModules: ['ports', 'ssl', 'subdomains', 'credentials', 'social', 'active'],
    maxScanTargets: 1,
    maxScansPerDay: 3,
    dataRetentionDays: 1,
    canExportData: false,
    canAccessRawOutput: false,
    requiresAuthorization: false,
    auditLogging: true,
    resultVisibility: {
      showRiskScore: true,
      showFindingsCount: true,
      showFindingDetails: false,
      showRemediation: false,
      showAIAnalysis: false,
      showAttackPaths: false,
      maxFindingPreviews: 0,
    },
  },
  free: {
    role: 'free',
    scanMode: 'passive',
    allowedModules: ['dns', 'ports', 'tech', 'ssl', 'headers', 'subdomains'],
    blockedModules: ['credentials', 'social', 'active'],
    maxScanTargets: 10,
    maxScansPerDay: 10,
    dataRetentionDays: 7,
    canExportData: false,
    canAccessRawOutput: false,
    requiresAuthorization: false,
    auditLogging: true,
    resultVisibility: {
      showRiskScore: true,
      showFindingsCount: true,
      showFindingDetails: false,   // LOCKED — upgrade to see details
      showRemediation: false,       // LOCKED — upgrade to see fixes
      showAIAnalysis: false,        // LOCKED — upgrade to see AI reasoning
      showAttackPaths: false,       // LOCKED — upgrade to see attack paths
      maxFindingPreviews: 3,        // Show top 3 findings as teaser
    },
  },
  starter: {
    role: 'starter',
    scanMode: 'passive',
    allowedModules: ['dns', 'ports', 'tech', 'ssl', 'headers', 'subdomains', 'credentials', 'social'],
    blockedModules: ['active'],
    maxScanTargets: 15,
    maxScansPerDay: 15,
    dataRetentionDays: 30,
    canExportData: true,
    canAccessRawOutput: false,
    requiresAuthorization: false,
    auditLogging: true,
    resultVisibility: {
      showRiskScore: true,
      showFindingsCount: true,
      showFindingDetails: true,
      showRemediation: true,
      showAIAnalysis: true,
      showAttackPaths: false,
      maxFindingPreviews: -1, // all
    },
  },
  professional: {
    role: 'professional',
    scanMode: 'passive',
    allowedModules: ['dns', 'ports', 'tech', 'ssl', 'headers', 'subdomains', 'credentials', 'social'],
    blockedModules: [],
    maxScanTargets: 50,
    maxScansPerDay: 50,
    dataRetentionDays: 90,
    canExportData: true,
    canAccessRawOutput: true,
    requiresAuthorization: false,
    auditLogging: true,
    resultVisibility: {
      showRiskScore: true,
      showFindingsCount: true,
      showFindingDetails: true,
      showRemediation: true,
      showAIAnalysis: true,
      showAttackPaths: true,
      maxFindingPreviews: -1,
    },
  },
  enterprise: {
    role: 'enterprise',
    scanMode: 'active',
    allowedModules: ['dns', 'ports', 'tech', 'ssl', 'headers', 'subdomains', 'credentials', 'social', 'active'],
    blockedModules: [],
    maxScanTargets: -1,
    maxScansPerDay: -1,
    dataRetentionDays: 365,
    canExportData: true,
    canAccessRawOutput: true,
    requiresAuthorization: true,
    auditLogging: true,
    resultVisibility: {
      showRiskScore: true,
      showFindingsCount: true,
      showFindingDetails: true,
      showRemediation: true,
      showAIAnalysis: true,
      showAttackPaths: true,
      maxFindingPreviews: -1,
    },
  },
  admin: {
    role: 'admin',
    scanMode: 'active',
    allowedModules: ['dns', 'ports', 'tech', 'ssl', 'headers', 'subdomains', 'credentials', 'social', 'active'],
    blockedModules: [],
    maxScanTargets: -1,
    maxScansPerDay: -1,
    dataRetentionDays: 365,
    canExportData: true,
    canAccessRawOutput: true,
    requiresAuthorization: false,
    auditLogging: true,
    resultVisibility: {
      showRiskScore: true,
      showFindingsCount: true,
      showFindingDetails: true,
      showRemediation: true,
      showAIAnalysis: true,
      showAttackPaths: true,
      maxFindingPreviews: -1,
    },
  },
};

/**
 * AI System Prompt Guardrails
 * Controls what the AI can generate or discuss
 */
export const AI_GUARDRAILS = {
  SYSTEM_PROMPT: `You are GUARDIAN, an expert Africa-centric AI threat validation agent.

CRITICAL OPERATIONAL DIRECTIVES:
1. ASSESS AND REMEDIATE ONLY. Never write functional malware, active exploit scripts, or bypass code.
2. RECONNAISSANCE LIMITS: Collect and analyze target profiles using strictly passive, public OSINT data sources only.
3. ACTIVE SIMULATION RESTRICTIONS: Never execute direct port attacks, vulnerability injections, or brute-force tests unless the underlying scan_job entry explicitly marks execution_mode as "Authorized_Active_Validation".
4. LOCALIZED SCOPE ENFORCEMENT: Tailor all analytical insights to Sub-Saharan technical patterns (e.g., USSD routing vulnerabilities, mobile-money transaction logic, and POPIA/NDPA/DPA compliance).
5. NO WEAPONIZATION: Never provide step-by-step instructions for exploiting vulnerabilities. Always frame findings as defensive recommendations.
6. DATA SOVEREIGNTY: Remind users that sensitive scan data should remain within their jurisdiction.
7. ETHICAL USE: The platform is for authorized security testing only. Unauthorized scanning is illegal.`,

  BLOCKED_TOPICS: [
    'how to hack',
    'exploit code',
    'malware creation',
    'bypass security',
    'sql injection tutorial',
    'xss attack tutorial',
    'phishing template',
    'brute force tool',
    'password cracking',
    'backdoor creation',
    'ransomware',
    'ddos attack',
    'social engineering template',
  ],

  REQUIRED_DISCLAIMERS: [
    'This assessment is for authorized security testing only.',
    'Unauthorized scanning of systems you do not own or have permission to test is illegal.',
    'Findings should be used for defensive purposes only.',
    'Sensitive scan data should be handled in accordance with your organization\'s data governance policies.',
  ],
};

/**
 * Check if a module is allowed for a given role
 */
export function isModuleAllowed(role: UserRole, module: string): boolean {
  const config = GUARDRAIL_CONFIGS[role];
  return config.allowedModules.includes(module) && !config.blockedModules.includes(module);
}

/**
 * Check if active scanning is allowed
 */
export function isActiveScanningAllowed(role: UserRole): boolean {
  return GUARDRAIL_CONFIGS[role].scanMode === 'active';
}

/**
 * Get data retention policy for a role
 */
export function getDataRetentionDays(role: UserRole): number {
  return GUARDRAIL_CONFIGS[role].dataRetentionDays;
}

/**
 * Get result visibility config for a role
 */
export function getResultVisibility(role: UserRole) {
  return GUARDRAIL_CONFIGS[role].resultVisibility;
}

/**
 * Check if a role has access to a specific result feature
 */
export function canAccessFeature(role: UserRole, feature: 'findingDetails' | 'remediation' | 'aiAnalysis' | 'attackPaths' | 'rawOutput' | 'export'): boolean {
  const vis = GUARDRAIL_CONFIGS[role].resultVisibility;
  switch (feature) {
    case 'findingDetails': return vis.showFindingDetails;
    case 'remediation': return vis.showRemediation;
    case 'aiAnalysis': return vis.showAIAnalysis;
    case 'attackPaths': return vis.showAttackPaths;
    case 'rawOutput': return GUARDRAIL_CONFIGS[role].canAccessRawOutput;
    case 'export': return GUARDRAIL_CONFIGS[role].canExportData;
    default: return false;
  }
}

/**
 * Check if user has exceeded scan limits
 */
export function hasExceededScanLimit(role: UserRole, scansToday: number): boolean {
  const limit = GUARDRAIL_CONFIGS[role].maxScansPerDay;
  if (limit === -1) return false; // unlimited
  return scansToday >= limit;
}

/**
 * Validate AI output for blocked content
 */
export function validateAIOutput(output: string): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  const lowerOutput = output.toLowerCase();

  for (const topic of AI_GUARDRAILS.BLOCKED_TOPICS) {
    if (lowerOutput.includes(topic)) {
      violations.push(`Contains blocked topic: ${topic}`);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Sanitize AI output by removing dangerous content
 */
export function sanitizeAIOutput(output: string): string {
  let sanitized = output;

  // Remove any code blocks that look like exploit scripts
  sanitized = sanitized.replace(/```[\s\S]*?(exploit|attack|malware|hack)[\s\S]*?```/gi, '[REDACTED - Potentially dangerous content]');

  // Remove any URLs to exploit databases
  sanitized = sanitized.replace(/https?:\/\/[^\s]+(?:exploit|hack|malware)[^\s]*/gi, '[REDACTED - External exploit reference]');

  return sanitized;
}
