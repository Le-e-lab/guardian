/**
 * SENTARI Adaptive Defense Engine
 * Real-time threat response and containment strategies
 */

import { Finding } from './scanner';

export interface ThreatLevel {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100
  responseTime: string; // e.g., '24 hours', '1 hour', 'immediate'
  actions: string[];
}

export interface IncidentResponse {
  threatId: string;
  detectedAt: Date;
  threatLevel: ThreatLevel;
  containmentSteps: string[];
  eradicationSteps: string[];
  recoverySteps: string[];
  lessonsLearned: string[];
}

/**
 * Calculate threat level based on findings
 */
export function calculateThreatLevel(findings: Finding[]): ThreatLevel {
  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;
  const mediumCount = findings.filter(f => f.severity === 'medium').length;

  // Calculate score (higher = more dangerous)
  let score = 0;
  score += criticalCount * 25;
  score += highCount * 15;
  score += mediumCount * 5;
  score = Math.min(100, score);

  if (score >= 75) {
    return {
      level: 'critical',
      score,
      responseTime: 'immediate',
      actions: [
        'Activate incident response team immediately',
        'Isolate affected systems from network',
        'Preserve all logs and evidence',
        'Notify executive leadership and legal team',
        'Engage external forensic experts if needed',
        'Begin 24/7 monitoring of affected systems',
      ],
    };
  } else if (score >= 50) {
    return {
      level: 'high',
      score,
      responseTime: '1 hour',
      actions: [
        'Notify security team lead',
        'Review and prioritize critical vulnerabilities',
        'Implement emergency patches where possible',
        'Enhance monitoring on affected systems',
        'Document all findings for audit trail',
      ],
    };
  } else if (score >= 25) {
    return {
      level: 'medium',
      score,
      responseTime: '24 hours',
      actions: [
        'Schedule vulnerability remediation',
        'Update security policies as needed',
        'Increase monitoring frequency',
        'Review access controls',
      ],
    };
  } else {
    return {
      level: 'low',
      score,
      responseTime: '7 days',
      actions: [
        'Add to regular security review queue',
        'Monitor for changes in threat landscape',
        'Document for compliance reporting',
      ],
    };
  }
}

/**
 * Generate containment strategy for a specific threat
 */
export function generateContainmentStrategy(
  threat: Finding,
  targetDomain: string
): {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
  africanSpecific: string[];
} {
  const strategies: Record<string, {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    africanSpecific: string[];
  }> = {
    exposed_secrets: {
      immediate: [
        'Rotate all exposed credentials immediately',
        'Revoke compromised API keys',
        'Force password resets for affected accounts',
        'Check for unauthorized access using exposed credentials',
      ],
      shortTerm: [
        'Implement secrets management solution',
        'Add pre-commit hooks to prevent future leaks',
        'Train developers on secure coding practices',
        'Set up automated secret scanning in CI/CD',
      ],
      longTerm: [
        'Implement zero-trust architecture',
        'Deploy privileged access management (PAM)',
        'Regular security audits and penetration testing',
      ],
      africanSpecific: [
        'Review mobile money API key exposure',
        'Check USSD gateway credentials',
        'Audit telco integration credentials',
      ],
    },
    credential_leak: {
      immediate: [
        'Force password reset for all affected accounts',
        'Enable MFA on all compromised accounts',
        'Review access logs for unauthorized activity',
        'Notify affected users',
      ],
      shortTerm: [
        'Implement password complexity requirements',
        'Deploy credential monitoring service',
        'Review and tighten authentication policies',
      ],
      longTerm: [
        'Implement passwordless authentication where possible',
        'Deploy behavioral analytics for account takeover detection',
        'Regular breach monitoring and alerting',
      ],
      africanSpecific: [
        'Review mobile money PIN security',
        'Check USSD session token security',
        'Audit biometric authentication implementations',
      ],
    },
    infrastructure_exposure: {
      immediate: [
        'Block public access to exposed services',
        'Restrict access via firewall rules',
        'Change default credentials',
        'Enable audit logging',
      ],
      shortTerm: [
        'Implement network segmentation',
        'Deploy intrusion detection system',
        'Regular vulnerability scanning',
      ],
      longTerm: [
        'Implement zero-trust network architecture',
        'Deploy SIEM for centralized monitoring',
        'Regular penetration testing',
      ],
      africanSpecific: [
        'Review mobile money infrastructure isolation',
        'Check USSD gateway network segmentation',
        'Audit cloud hosting provider security configurations',
      ],
    },
    security_headers: {
      immediate: [
        'Add missing security headers to web server config',
        'Enable HSTS with proper max-age',
        'Implement Content Security Policy',
      ],
      shortTerm: [
        'Review and harden web server configuration',
        'Implement security header scanning in CI/CD',
        'Train developers on secure HTTP headers',
      ],
      longTerm: [
        'Implement Web Application Firewall (WAF)',
        'Regular security header audits',
        'Automated compliance checking',
      ],
      africanSpecific: [
        'Review mobile web app security headers',
        'Check USSD web portal configurations',
      ],
    },
  };

  return strategies[threat.category] || {
    immediate: ['Investigate the finding', 'Apply recommended remediation'],
    shortTerm: ['Review security policies', 'Enhance monitoring'],
    longTerm: ['Implement defense-in-depth', 'Regular security audits'],
    africanSpecific: ['Review regional compliance requirements'],
  };
}

/**
 * Generate incident response report
 */
export function generateIncidentReport(
  findings: Finding[],
  threatLevel: ThreatLevel,
  targetDomain: string
): {
  executiveSummary: string;
  technicalDetails: string[];
  recommendations: string[];
  complianceNotes: string[];
} {
  const criticalFindings = findings.filter(f => f.severity === 'critical');
  const highFindings = findings.filter(f => f.severity === 'high');

  return {
    executiveSummary: `Security assessment of ${targetDomain} identified ${findings.length} vulnerabilities with a threat level of ${threatLevel.level.toUpperCase()} (score: ${threatLevel.score}/100). ${criticalFindings.length} critical and ${highFindings.length} high-severity issues require immediate attention. Recommended response time: ${threatLevel.responseTime}.`,
    technicalDetails: [
      ...criticalFindings.map(f => `CRITICAL: ${f.title} — ${f.remediation}`),
      ...highFindings.map(f => `HIGH: ${f.title} — ${f.remediation}`),
      `Total vulnerabilities: ${findings.length}`,
      `Threat level: ${threatLevel.level}`,
      `Response priority: ${threatLevel.responseTime}`,
    ],
    recommendations: threatLevel.actions,
    complianceNotes: [
      'Document all findings for POPIA/NDPA/Kenya DPA compliance',
      'Maintain audit trail of remediation actions',
      'Notify data protection authorities if personal data was exposed',
      'Review third-party vendor security requirements',
      'Schedule follow-up assessment within 30 days',
    ],
  };
}
