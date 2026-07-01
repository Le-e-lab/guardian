/**
 * SENTARI AI Reasoning Engine
 * Uses multi-model fusion for best analysis
 */

import { runFusionAnalysis } from './ai-fusion';
import { Finding } from './scanner';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are SENTARI, an expert Africa-centric AI threat validation agent.

CRITICAL OPERATIONAL DIRECTIVES:
1. ASSESS AND REMEDIATE ONLY. Never write functional malware, active exploit scripts, or bypass code.
2. RECONNAISSANCE LIMITS: Collect and analyze target profiles using strictly passive, public OSINT data sources only.
3. ACTIVE SIMULATION RESTRICTIONS: Never execute direct port attacks, vulnerability injections, or brute-force tests unless the underlying scan_job entry explicitly marks execution_mode as "Authorized_Active_Validation".
4. LOCALIZED SCOPE ENFORCEMENT: Tailor all analytical insights to Sub-Saharan technical patterns (e.g., USSD routing vulnerabilities, mobile-money transaction logic, and POPIA/NDPA/DPA compliance).
5. NO WEAPONIZATION: Never provide step-by-step instructions for exploiting vulnerabilities. Always frame findings as defensive recommendations.
6. DATA SOVEREIGNTY: Remind users that sensitive scan data should remain within their jurisdiction.
7. ETHICAL USE: The platform is for authorized security testing only. Unauthorized scanning is illegal.

IMPORTANT: You must NEVER generate:
- Exploit code or attack scripts
- Instructions for bypassing security
- Malware or malicious code
- Phishing templates or social engineering scripts

OUTPUT FORMAT:
Provide your analysis as JSON with this structure:
{
  "risk_summary": "One paragraph executive summary",
  "overall_score": <0-100 number>,
  "critical_findings": ["list of most urgent issues"],
  "attack_paths": [
    {
      "name": "Attack path name",
      "description": "How an attacker would chain these vulnerabilities",
      "severity": "critical|high|medium",
      "steps": ["step 1", "step 2"]
    }
  ],
  "remediation_priority": [
    {
      "action": "What to fix",
      "why": "Why it matters",
      "effort": "low|medium|high"
    }
  ],
  "african_context": "Any Africa-specific risks or considerations",
  "disclaimer": "This assessment is for authorized security testing only"
}`;

/**
 * Analyze scan results using AI fusion
 */
export async function analyzeWithAI(
  target: string,
  findings: Finding[],
  scanData: Record<string, unknown>
): Promise<{
  risk_summary: string;
  overall_score: number;
  analysis: string;
  tokens_used: number;
  fusion?: {
    bestModel: string;
    agreementLevel: number;
    modelResponses: number;
  };
}> {
  // Use fusion analysis across multiple models
  const fusionResult = await runFusionAnalysis(findings, scanData);

  return {
    risk_summary: fusionResult.allResponses[0]?.analysis?.substring(0, 500) || 'Analysis complete',
    overall_score: fusionResult.bestRiskScore,
    analysis: fusionResult.bestAnalysis,
    tokens_used: fusionResult.allResponses.reduce((sum, r) => sum + r.tokensUsed, 0),
    fusion: {
      bestModel: fusionResult.bestModel,
      agreementLevel: fusionResult.consensus.agreementLevel,
      modelResponses: fusionResult.allResponses.length,
    },
  };
}

/**
 * Rule-based fallback analysis (no AI needed)
 */
function ruleBasedAnalysis(target: string, findings: Finding[]): {
  risk_summary: string;
  overall_score: number;
  analysis: string;
  tokens_used: number;
} {
  const score = calculateScore(findings);
  const critical = findings.filter(f => f.severity === 'critical');
  const high = findings.filter(f => f.severity === 'high');

  let summary = `Security assessment of ${target} completed. `;
  if (critical.length > 0) summary += `${critical.length} critical vulnerabilities found. `;
  if (high.length > 0) summary += `${high.length} high-severity issues. `;
  summary += `Overall risk score: ${score}/100.`;

  return {
    risk_summary: summary,
    overall_score: score,
    analysis: JSON.stringify({ risk_summary: summary, overall_score: score }),
    tokens_used: 0,
  };
}

function calculateScore(findings: Finding[]): number {
  if (findings.length === 0) return 85;
  let score = 100;
  for (const f of findings) {
    switch (f.severity) {
      case 'critical': score -= 25; break;
      case 'high': score -= 15; break;
      case 'medium': score -= 8; break;
      case 'low': score -= 3; break;
      case 'info': score -= 1; break;
    }
  }
  return Math.max(0, Math.min(100, score));
}
