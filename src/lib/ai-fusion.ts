/**
 * SENTARI AI Model Fusion Engine
 * Uses multiple free AI models to find the best analysis
 */

import { Finding } from './scanner';

interface AIModel {
  name: string;
  provider: string;
  modelId: string;
  baseUrl: string;
  apiKey: string;
  maxTokens: number;
  costPer1k: number; // 0 = free
}

interface ModelResponse {
  model: string;
  analysis: string;
  riskScore: number;
  confidence: number;
  latency: number;
  tokensUsed: number;
}

// Free AI models available via Groq
const FREE_MODELS: AIModel[] = [
  {
    name: 'Llama 3.1 8B',
    provider: 'groq',
    modelId: 'llama-3.1-8b-instant',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY || '',
    maxTokens: 2000,
    costPer1k: 0,
  },
  {
    name: 'Llama 3.3 70B',
    provider: 'groq',
    modelId: 'llama-3.3-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY || '',
    maxTokens: 2000,
    costPer1k: 0,
  },
  {
    name: 'Gemma 2 9B',
    provider: 'groq',
    modelId: 'gemma2-9b-it',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY || '',
    maxTokens: 2000,
    costPer1k: 0,
  },
  {
    name: 'Llama 3.1 70B',
    provider: 'groq',
    modelId: 'llama-3.1-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY || '',
    maxTokens: 2000,
    costPer1k: 0,
  },
];

const SYSTEM_PROMPT = `You are SENTARI, an expert Africa-centric AI threat validation agent.

Analyze the following security scan results and provide:
1. A risk score (0-100)
2. A brief executive summary
3. The top 3 critical findings
4. Recommended defensive actions
5. African-specific context (if applicable)

IMPORTANT: Never generate exploit code or attack instructions. Frame all findings as defensive recommendations.

Respond in JSON format:
{
  "risk_score": <0-100>,
  "summary": "One paragraph executive summary",
  "critical_findings": ["finding 1", "finding 2", "finding 3"],
  "defensive_actions": ["action 1", "action 2", "action 3"],
  "african_context": "African-specific considerations",
  "confidence": <0-100>
}`;

/**
 * Call a single AI model
 */
async function callModel(
  model: AIModel,
  findings: Finding[],
  scanData: Record<string, unknown>
): Promise<ModelResponse> {
  const startTime = Date.now();

  const findingsSummary = findings.map(f =>
    `- [${f.severity.toUpperCase()}] ${f.title}: ${f.remediation}`
  ).join('\n');

  const userPrompt = `Analyze these security findings for a target:

FINDINGS (${findings.length} total):
${findingsSummary || 'No findings detected'}

SCAN DATA:
${JSON.stringify(scanData, null, 2)}

Provide your analysis as JSON.`;

  try {
    const response = await fetch(`${model.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${model.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.modelId,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: model.maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`Model ${model.name} failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const tokensUsed = data.usage?.total_tokens || 0;

    // Parse JSON response
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      parsed = {};
    }

    return {
      model: model.name,
      analysis: content,
      riskScore: parsed.risk_score || 50,
      confidence: parsed.confidence || 50,
      latency: Date.now() - startTime,
      tokensUsed,
    };
  } catch (error) {
    console.error(`Model ${model.name} error:`, error);
    return {
      model: model.name,
      analysis: `Error: ${String(error)}`,
      riskScore: 0,
      confidence: 0,
      latency: Date.now() - startTime,
      tokensUsed: 0,
    };
  }
}

/**
 * Run fusion analysis across multiple models
 */
export async function runFusionAnalysis(
  findings: Finding[],
  scanData: Record<string, unknown>
): Promise<{
  bestModel: string;
  bestAnalysis: string;
  bestRiskScore: number;
  allResponses: ModelResponse[];
  consensus: {
    averageRiskScore: number;
    agreementLevel: number;
    recommendedActions: string[];
  };
}> {
  console.log(`[FUSION] Running ${FREE_MODELS.length} models in parallel...`);

  // Run all models in parallel
  const responses = await Promise.allSettled(
    FREE_MODELS.map(model => callModel(model, findings, scanData))
  );

  // Extract successful responses
  const allResponses = responses
    .filter((r): r is PromiseFulfilledResult<ModelResponse> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(r => r.riskScore > 0); // Filter out failed models

  if (allResponses.length === 0) {
    // Fallback to rule-based analysis
    return {
      bestModel: 'rule-based',
      bestAnalysis: 'All AI models failed. Using rule-based analysis.',
      bestRiskScore: calculateRuleBasedScore(findings),
      allResponses: [],
      consensus: {
        averageRiskScore: calculateRuleBasedScore(findings),
        agreementLevel: 0,
        recommendedActions: ['Review findings manually', 'Apply standard remediation'],
      },
    };
  }

  // Find best model (highest confidence + lowest latency)
  const best = allResponses.reduce((prev, curr) => {
    const prevScore = prev.confidence * 0.7 + (10000 / (prev.latency + 1)) * 0.3;
    const currScore = curr.confidence * 0.7 + (10000 / (curr.latency + 1)) * 0.3;
    return currScore > prevScore ? curr : prev;
  });

  // Calculate consensus
  const riskScores = allResponses.map(r => r.riskScore);
  const averageRiskScore = riskScores.reduce((a, b) => a + b, 0) / riskScores.length;
  const variance = riskScores.reduce((sum, score) => sum + Math.pow(score - averageRiskScore, 2), 0) / riskScores.length;
  const agreementLevel = Math.max(0, 100 - Math.sqrt(variance)); // Lower variance = higher agreement

  // Collect all recommended actions
  const allActions = allResponses.flatMap(r => {
    try {
      const match = r.analysis.match(/"defensive_actions":\s*\[([\s\S]*?)\]/);
      if (match) {
        return JSON.parse(`[${match[1]}]`);
      }
    } catch {}
    return [];
  });

  // Deduplicate and take top 5
  const uniqueActions = [...new Set(allActions)].slice(0, 5);

  console.log(`[FUSION] Best model: ${best.model}, Risk: ${averageRiskScore.toFixed(1)}, Agreement: ${agreementLevel.toFixed(1)}%`);

  return {
    bestModel: best.model,
    bestAnalysis: best.analysis,
    bestRiskScore: Math.round(averageRiskScore),
    allResponses,
    consensus: {
      averageRiskScore: Math.round(averageRiskScore),
      agreementLevel: Math.round(agreementLevel),
      recommendedActions: uniqueActions.length > 0 ? uniqueActions : ['Review findings', 'Apply remediation'],
    },
  };
}

/**
 * Rule-based fallback score calculation
 */
function calculateRuleBasedScore(findings: Finding[]): number {
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
