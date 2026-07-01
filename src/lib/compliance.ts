/**
 * SENTARI Compliance Templates
 * Region-specific compliance report templates for Africa
 */

export interface ComplianceTemplate {
  id: string;
  name: string;
  region: string;
  regulation: string;
  description: string;
  requiredControls: string[];
  assessmentQuestions: string[];
  reportSections: string[];
}

/**
 * African Data Protection Compliance Templates
 */
export const COMPLIANCE_TEMPLATES: ComplianceTemplate[] = [
  {
    id: 'popia',
    name: 'POPIA Compliance Assessment',
    region: 'South Africa',
    regulation: 'Protection of Personal Information Act (POPIA)',
    description: 'South Africa\'s data protection law governing how personal information is processed.',
    requiredControls: [
      'Lawful processing of personal information',
      'Purpose specification and limitation',
      'Further processing limitation',
      'Information quality',
      'Openness and transparency',
      'Security safeguards',
      'Data subject participation',
      'Accountability',
    ],
    assessmentQuestions: [
      'Is personal information processed only for specific, explicitly defined purposes?',
      'Is consent obtained before collecting personal information?',
      'Is personal information accurate and up to date?',
      'Are appropriate technical and organizational security measures in place?',
      'Is there a data breach notification process (72-hour requirement)?',
      'Are data subjects able to access and correct their personal information?',
      'Is there a designated Information Officer?',
      'Are cross-border data transfers compliant?',
    ],
    reportSections: [
      'Executive Summary',
      'Scope and Methodology',
      'Finding Summary',
      'Detailed Findings by POPIA Principle',
      'Risk Assessment',
      'Remediation Recommendations',
      'Implementation Roadmap',
      'Appendix: Evidence and Documentation',
    ],
  },
  {
    id: 'ndpa',
    name: 'NDPA Compliance Assessment',
    region: 'Nigeria',
    regulation: 'Nigeria Data Protection Act (NDPA)',
    description: 'Nigeria\'s comprehensive data protection law modeled after GDPR.',
    requiredControls: [
      'Lawful basis for processing',
      'Data minimization',
      'Storage limitation',
      'Data integrity and confidentiality',
      'Data protection impact assessment',
      'Data breach notification',
      'Data subject rights',
      'Cross-border transfer safeguards',
    ],
    assessmentQuestions: [
      'Is there a lawful basis for each processing activity?',
      'Is personal data collected only what is necessary?',
      'Is personal data retained only as long as necessary?',
      'Are appropriate technical and organizational measures implemented?',
      'Has a Data Protection Impact Assessment been conducted?',
      'Can data breaches be notified to the NDPC within 72 hours?',
      'Can data subjects exercise their rights (access, rectification, erasure)?',
      'Are cross-border data transfers subject to appropriate safeguards?',
    ],
    reportSections: [
      'Executive Summary',
      'Regulatory Framework Overview',
      'Scope and Methodology',
      'Compliance Assessment Findings',
      'Gap Analysis',
      'Risk Rating',
      'Remediation Plan',
      'Timeline and Resources',
    ],
  },
  {
    id: 'kenya-dpa',
    name: 'Kenya DPA Compliance Assessment',
    region: 'Kenya',
    regulation: 'Kenya Data Protection Act (DPA)',
    description: 'Kenya\'s data protection law governing processing of personal data.',
    requiredControls: [
      'Lawful processing',
      'Purpose limitation',
      'Data minimization',
      'Accuracy',
      'Storage limitation',
      'Integrity and confidentiality',
      'Accountability',
      'Data subject rights',
    ],
    assessmentQuestions: [
      'Is personal data processed lawfully and fairly?',
      'Is personal data collected for specific, explicit purposes?',
      'Is personal data adequate, relevant, and limited to what is necessary?',
      'Is personal data accurate and kept up to date?',
      'Is personal data kept in identifiable form for no longer than necessary?',
      'Is personal data processed securely?',
      'Is there accountability for compliance?',
      'Are data breach notifications made within 72 hours?',
    ],
    reportSections: [
      'Executive Summary',
      'Legal Framework Analysis',
      'Assessment Scope and Methodology',
      'Findings by Data Protection Principle',
      'Compliance Scorecard',
      'Gap Analysis and Risks',
      'Remediation Recommendations',
      'Implementation Plan',
    ],
  },
  {
    id: 'gdpr',
    name: 'GDPR Alignment Assessment',
    region: 'Global (for international clients)',
    regulation: 'General Data Protection Regulation (GDPR)',
    description: 'EU data protection regulation applicable to organizations processing EU data subjects\' data.',
    requiredControls: [
      'Lawful basis for processing',
      'Data protection by design and default',
      'Data protection impact assessment',
      'Data processor agreements',
      'Data breach notification (72 hours)',
      'Data subject rights',
      'Data protection officer',
      'International data transfer mechanisms',
    ],
    assessmentQuestions: [
      'Is there a documented lawful basis for each processing activity?',
      'Are privacy-by-design principles embedded in systems?',
      'Have Data Protection Impact Assessments been conducted for high-risk processing?',
      'Are Data Processing Agreements in place with all processors?',
      'Can data breaches be detected and notified within 72 hours?',
      'Can data subjects exercise all their rights (access, portability, erasure, objection)?',
      'Is there a designated Data Protection Officer where required?',
      'Are appropriate safeguards in place for international transfers?',
    ],
    reportSections: [
      'Executive Summary',
      'GDPR Scope and Applicability',
      'Assessment Methodology',
      'Compliance Findings by Article',
      'Risk Heat Map',
      'Gap Analysis',
      'Remediation Roadmap',
      'Resource Requirements',
    ],
  },
  {
    id: 'iso27001',
    name: 'ISO 27001 Security Assessment',
    region: 'Global',
    regulation: 'ISO/IEC 27001:2022',
    description: 'International standard for information security management systems (ISMS).',
    requiredControls: [
      'Information security policies',
      'Organization of information security',
      'Human resource security',
      'Asset management',
      'Access control',
      'Cryptography',
      'Physical and environmental security',
      'Operations security',
      'Communications security',
      'System acquisition, development and maintenance',
      'Supplier relationships',
      'Incident management',
      'Business continuity',
      'Compliance',
    ],
    assessmentQuestions: [
      'Are information security policies established and communicated?',
      'Are roles and responsibilities for information security defined?',
      'Are security requirements included in HR lifecycle?',
      'Are assets identified and managed appropriately?',
      'Are access rights managed through a formal process?',
      'Are cryptographic controls properly implemented?',
      'Are physical perimeters and entry controls in place?',
      'Are logging and monitoring procedures established?',
      'Are networks and services securely managed?',
      'Are security requirements in system development?',
      'Are supplier relationships governed by security agreements?',
      'Are security incidents managed through a formal process?',
      'Are business continuity plans tested and maintained?',
      'Are legal and regulatory requirements met?',
    ],
    reportSections: [
      'Executive Summary',
      'Scope and Boundaries',
      'Assessment Methodology',
      'Clause-by-Clause Findings',
      'Annex A Control Assessment',
      'Non-Conformities and Risks',
      'Recommendations',
      'Implementation Roadmap',
    ],
  },
];

/**
 * Get compliance template by ID
 */
export function getComplianceTemplate(id: string): ComplianceTemplate | undefined {
  return COMPLIANCE_TEMPLATES.find(t => t.id === id);
}

/**
 * Get compliance templates by region
 */
export function getComplianceTemplatesByRegion(region: string): ComplianceTemplate[] {
  return COMPLIANCE_TEMPLATES.filter(t =>
    t.region.toLowerCase().includes(region.toLowerCase())
  );
}

/**
 * Generate compliance assessment report
 */
export function generateComplianceReport(
  template: ComplianceTemplate,
  findings: Record<string, unknown>[],
  domain: string
): {
  template: ComplianceTemplate;
  domain: string;
  assessmentDate: string;
  complianceScore: number;
  findings: Record<string, unknown>[];
  gaps: string[];
  recommendations: string[];
} {
  // Calculate compliance score based on findings
  const totalQuestions = template.assessmentQuestions.length;
  const issuesFound = findings.filter(f =>
    f.severity === 'critical' || f.severity === 'high'
  ).length;

  const complianceScore = Math.max(0, Math.round(
    ((totalQuestions - issuesFound) / totalQuestions) * 100
  ));

  // Identify gaps
  const gaps = findings
    .filter(f => f.severity === 'critical' || f.severity === 'high')
    .map(f => f.title as string);

  // Generate recommendations
  const recommendations = [
    ...gaps.map(gap => `Address: ${gap}`),
    `Schedule follow-up assessment in 30 days`,
    `Assign compliance officer for ${template.regulation}`,
    `Document all security measures and controls`,
  ];

  return {
    template,
    domain,
    assessmentDate: new Date().toISOString(),
    complianceScore,
    findings,
    gaps,
    recommendations,
  };
}
