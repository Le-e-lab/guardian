/**
 * SENTARI AI Reasoning Engine
 * Uses Groq API with Llama 3.1 8B for threat analysis
 */

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
 * Analyze scan results using AI
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
}> {
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    // Fallback: rule-based analysis without AI
    return ruleBasedAnalysis(target, findings);
  }

  const findingsSummary = findings.map(f => 
    `- [${f.severity.toUpperCase()}] ${f.title}: ${f.remediation}`
  ).join('\n');

  const userPrompt = `Analyze the security scan results for ${target}:

SCAN DATA:
${JSON.stringify(scanData, null, 2)}

FINDINGS (${findings.length} total):
${findingsSummary || 'No findings detected'}

Provide your analysis as JSON. Focus on:
1. Real exploitability (not just theory)
2. African infrastructure context
3. Prioritized remediation steps
4. Attack path chains`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error('Groq API error:', response.status);
      return ruleBasedAnalysis(target, findings);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const tokensUsed = data.usage?.total_tokens || 0;

    // Parse AI response
    let analysis;
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = {
          risk_summary: content,
          overall_score: calculateScore(findings),
        };
      }
    } catch {
      analysis = {
        risk_summary: content,
        overall_score: calculateScore(findings),
      };
    }

    return {
      risk_summary: analysis.risk_summary || 'Analysis complete',
      overall_score: analysis.overall_score || calculateScore(findings),
      analysis: content,
      tokens_used: tokensUsed,
    };
  } catch (error) {
    console.error('AI analysis failed:', error);
    return ruleBasedAnalysis(target, findings);
  }
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
  const medium = findings.filter(f => f.severity === 'medium');

  let summary = `Security assessment of ${target} completed. `;
  
  if (critical.length > 0) {
    summary += `${critical.length} critical vulnerabilities found that require immediate attention. `;
  }
  if (high.length > 0) {
    summary += `${high.length} high-severity issues should be addressed soon. `;
  }
  if (medium.length > 0) {
    summary += `${medium.length} medium-severity findings noted. `;
  }
  if (findings.length === 0) {
    summary += 'No significant vulnerabilities detected in passive reconnaissance. ';
  }

  summary += `Overall risk score: ${score}/100.`;

  return {
    risk_summary: summary,
    overall_score: score,
    analysis: JSON.stringify({
      risk_summary: summary,
      overall_score: score,
      critical_findings: critical.map(f => f.title),
      findings_count: {
        critical: critical.length,
        high: high.length,
        medium: medium.length,
        low: findings.filter(f => f.severity === 'low').length,
        info: findings.filter(f => f.severity === 'info').length,
      },
    }),
    tokens_used: 0,
  };
}

/**
 * Calculate risk score from findings
 */
function calculateScore(findings: Finding[]): number {
  if (findings.length === 0) return 85; // Good score if no findings

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
