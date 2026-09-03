/**
 * SENTARI AI Model Fusion Engine v2
 * Multi-provider: Groq (free), OpenRouter (cheap), HuggingFace (free), Ollama (local)
 * Picks best model based on availability, cost, and quality
 */

import { Finding } from './scanner';

interface AIModel {
  name: string;
  provider: 'groq' | 'openrouter' | 'huggingface' | 'ollama';
  modelId: string;
  baseUrl: string;
  apiKey: string;
  maxTokens: number;
  costPer1k: number;
  priority: number; // Lower = better
}

interface ModelResponse {
  model: string;
  provider: string;
  analysis: string;
  riskScore: number;
  confidence: number;
  latency: number;
  tokensUsed: number;
}

// All available models across providers
const ALL_MODELS: AIModel[] = [
  // Groq (Free, fastest) — verified working model IDs
  {
    name: 'GPT OSS 20B (fastest)',
    provider: 'groq',
    modelId: 'openai/gpt-oss-20b',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY || '',
    maxTokens: 2000,
    costPer1k: 0,
    priority: 1,
  },
  {
    name: 'Qwen3 27B',
    provider: 'groq',
    modelId: 'qwen/qwen3.8-27b',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY || '',
    maxTokens: 2000,
    costPer1k: 0,
    priority: 2,
  },
  {
    name: 'GPT OSS 120B',
    provider: 'groq',
    modelId: 'openai/gpt-oss-120b',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY || '',
    maxTokens: 2000,
    costPer1k: 0,
    priority: 3,
  },
  // OpenRouter (Cheap, many models)
  {
    name: 'DeepSeek R1',
    provider: 'openrouter',
    modelId: 'deepseek/deepseek-r1',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY || '',
    maxTokens: 2000,
    costPer1k: 0.55, // $0.55/1M input
    priority: 5,
  },
  // HuggingFace (Free inference)
  {
    name: 'Llama 3.1 8B (HF)',
    provider: 'huggingface',
    modelId: 'meta-llama/Llama-3.1-8B-Instruct',
    baseUrl: 'https://api-inference.huggingface.co/models',
    apiKey: process.env.HUGGINGFACE_API_KEY || '',
    maxTokens: 2000,
    costPer1k: 0,
    priority: 8,
  },
  // Ollama (Local, free, unlimited)
  {
    name: 'Llama 3.1 8B (Local)',
    provider: 'ollama',
    modelId: 'llama3.1:8b',
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    apiKey: '',
    maxTokens: 2000,
    costPer1k: 0,
    priority: 9,
  },
];

const SYSTEM_PROMPT = `You are SENTARI, an expert Africa-centric AI threat validation agent.

Analyze security scan results and provide:
1. Risk score (0-100)
2. Executive summary
3. Top 3 critical findings
4. Defensive actions
5. African-specific context

IMPORTANT: Never generate exploit code. Frame all findings as defensive recommendations.

Respond in JSON:
{
  "risk_score": <0-100>,
  "summary": "Executive summary",
  "critical_findings": ["finding 1", "finding 2", "finding 3"],
  "defensive_actions": ["action 1", "action 2", "action 3"],
  "african_context": "African considerations",
  "confidence": <0-100>
}`;

/**
 * Call a single AI model (handles all providers)
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

  const userPrompt = `Analyze these security findings:

FINDINGS (${findings.length} total):
${findingsSummary || 'No findings detected'}

SCAN DATA:
${JSON.stringify(scanData, null, 2)}

Provide analysis as JSON.`;

  try {
    let response;

    // Per-model hard timeout (guarantees a hung provider can't stall the whole scan)
    const controller = new AbortController();
    const modelTimer = setTimeout(() => controller.abort(), 12000);

    // Different API formats for each provider
    if (model.provider === 'ollama') {
      // Ollama uses its own API format
      response = await fetch(`${model.baseUrl}/api/chat`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.modelId,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          stream: false,
          options: { temperature: 0.3, num_predict: model.maxTokens },
        }),
      });
    } else if (model.provider === 'huggingface') {
      // HuggingFace Inference API
      response = await fetch(`${model.baseUrl}/${model.modelId}`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${model.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: `<|system|>\n${SYSTEM_PROMPT}\n<|user|>\n${userPrompt}\n<|assistant|>`,
          parameters: { max_new_tokens: model.maxTokens, temperature: 0.3 },
        }),
      });
    } else {
      // OpenAI-compatible (Groq, OpenRouter)
      response = await fetch(`${model.baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
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
    }

    clearTimeout(modelTimer);

    if (!response || !response.ok) {
      throw new Error(`${model.name} failed: ${response?.status || 'no response'}`);
    }

    const data = await response.json();

    // Parse response based on provider
    let content = '';
    let tokensUsed = 0;

    if (model.provider === 'ollama') {
      content = data.message?.content || '';
      tokensUsed = data.eval_count || 0;
    } else if (model.provider === 'huggingface') {
      content = Array.isArray(data) ? data[0]?.generated_text || '' : data.generated_text || '';
      tokensUsed = 0;
    } else {
      content = data.choices?.[0]?.message?.content || '';
      tokensUsed = data.usage?.total_tokens || 0;
    }

    // Parse JSON from response
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      parsed = {};
    }

    return {
      model: model.name,
      provider: model.provider,
      analysis: content,
      riskScore: parsed.risk_score || 50,
      confidence: parsed.confidence || 50,
      latency: Date.now() - startTime,
      tokensUsed,
    };
  } catch (error) {
    console.error(`[FUSION] ${model.name} (${model.provider}) error:`, String(error).substring(0, 100));
    return {
      model: model.name,
      provider: model.provider,
      analysis: `Error: ${String(error).substring(0, 200)}`,
      riskScore: 0,
      confidence: 0,
      latency: Date.now() - startTime,
      tokensUsed: 0,
    };
  }
}

/**
 * Run fusion analysis across multiple providers
 */
export async function runFusionAnalysis(
  findings: Finding[],
  scanData: Record<string, unknown>
): Promise<{
  bestModel: string;
  bestProvider: string;
  bestAnalysis: string;
  bestRiskScore: number;
  allResponses: ModelResponse[];
  consensus: {
    averageRiskScore: number;
    agreementLevel: number;
    recommendedActions: string[];
  };
}> {
  // Filter to only models with API keys configured
  const availableModels = ALL_MODELS.filter(m => {
    if (m.provider === 'ollama') return true; // Always try local
    return m.apiKey && m.apiKey.length > 10;
  });

  console.log(`[FUSION] Running ${availableModels.length} models across ${new Set(availableModels.map(m => m.provider)).size} providers...`);

  // Run all models in parallel
  const responses = await Promise.allSettled(
    availableModels.map(model => callModel(model, findings, scanData))
  );

  // Extract successful responses
  const allResponses = responses
    .filter((r): r is PromiseFulfilledResult<ModelResponse> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(r => r.riskScore > 0);

  if (allResponses.length === 0) {
    return {
      bestModel: 'rule-based',
      bestProvider: 'local',
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

  // Find best model (priority + confidence + latency)
  const best = allResponses.reduce((prev, curr) => {
    const prevModel = ALL_MODELS.find(m => m.name === prev.model);
    const currModel = ALL_MODELS.find(m => m.name === curr.model);
    const prevPriority = prevModel?.priority ?? 10;
    const currPriority = currModel?.priority ?? 10;

    // Score: lower priority is better, higher confidence is better, lower latency is better
    const prevScore = (10 - prevPriority) * 10 + prev.confidence * 0.7 + (10000 / (prev.latency + 1)) * 0.3;
    const currScore = (10 - currPriority) * 10 + curr.confidence * 0.7 + (10000 / (curr.latency + 1)) * 0.3;
    return currScore > prevScore ? curr : prev;
  });

  // Calculate consensus
  const riskScores = allResponses.map(r => r.riskScore);
  const averageRiskScore = riskScores.reduce((a, b) => a + b, 0) / riskScores.length;
  const variance = riskScores.reduce((sum, score) => sum + Math.pow(score - averageRiskScore, 2), 0) / riskScores.length;
  const agreementLevel = Math.max(0, 100 - Math.sqrt(variance));

  // Collect recommended actions
  const allActions = allResponses.flatMap(r => {
    try {
      const match = r.analysis.match(/"defensive_actions":\s*\[([\s\S]*?)\]/);
      if (match) return JSON.parse(`[${match[1]}]`);
    } catch {}
    return [];
  });

  const uniqueActions = [...new Set(allActions)].slice(0, 5);

  console.log(`[FUSION] Best: ${best.model} (${best.provider}), Risk: ${averageRiskScore.toFixed(1)}, Agreement: ${agreementLevel.toFixed(1)}%`);

  return {
    bestModel: best.model,
    bestProvider: best.provider,
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
