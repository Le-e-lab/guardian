/**
 * SENTARI AI Provider Fallback System
 * Ensures AI analysis never fails — cascades through providers
 *
 * Priority: Groq (free) → HuggingFace (free) → Rule-based (always works)
 * If Groq changes pricing or goes down, the system degrades gracefully.
 */

import { Finding } from './scanner';

interface ProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  modelId: string;
  maxTokens: number;
  priority: number;
  enabled: boolean;
}

interface AIResponse {
  provider: string;
  model: string;
  analysis: string;
  riskScore: number;
  tokensUsed: number;
  latencyMs: number;
}

const SYSTEM_PROMPT = `You are SENTARI, an expert Africa-centric AI threat validation agent.

Analyze the following security scan findings and provide:
1. A risk summary (1 paragraph executive summary)
2. An overall risk score (0-100, where 100 is most secure)
3. Critical findings list
4. Remediation priorities

Output as JSON:
{
  "risk_summary": "...",
  "overall_score": <number>,
  "critical_findings": ["..."],
  "remediation_priority": [{"action": "...", "why": "...", "effort": "low|medium|high"}]
}

Be concise. Focus on actionable insights. Frame all findings as defensive recommendations.`;

/**
 * Get available AI providers in priority order
 */
function getProviders(): ProviderConfig[] {
  return [
    {
      name: 'Groq (Llama 3.1 8B)',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY || '',
      modelId: 'llama-3.1-8b-instant',
      maxTokens: 1500,
      priority: 1,
      enabled: !!process.env.GROQ_API_KEY,
    },
    {
      name: 'Groq (Gemma 2 9B)',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY || '',
      modelId: 'gemma2-9b-it',
      maxTokens: 1500,
      priority: 2,
      enabled: !!process.env.GROQ_API_KEY,
    },
    {
      name: 'HuggingFace (Llama 3.1 8B)',
      baseUrl: 'https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct',
      apiKey: process.env.HUGGINGFACE_API_KEY || '',
      modelId: 'meta-llama/Llama-3.1-8B-Instruct',
      maxTokens: 1500,
      priority: 3,
      enabled: !!process.env.HUGGINGFACE_API_KEY,
    },
    {
      name: 'HuggingFace (Mistral 7B)',
      baseUrl: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
      apiKey: process.env.HUGGINGFACE_API_KEY || '',
      modelId: 'mistralai/Mistral-7B-Instruct-v0.3',
      maxTokens: 1500,
      priority: 4,
      enabled: !!process.env.HUGGINGFACE_API_KEY,
    },
  ];
}

/**
 * Call an OpenAI-compatible API (Groq, OpenRouter, etc.)
 */
async function callOpenAICompatible(
  provider: ProviderConfig,
  prompt: string
): Promise<AIResponse> {
  const start = Date.now();

  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: provider.modelId,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: provider.maxTokens,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(15_000), // 15s timeout
  });

  if (!response.ok) {
    throw new Error(`${provider.name} returned ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const tokensUsed = data.usage?.total_tokens || 0;

  // Parse AI response
  let riskScore = 50;
  let riskSummary = content.substring(0, 500);

  try {
    const parsed = JSON.parse(content);
    riskScore = parsed.overall_score || 50;
    riskSummary = parsed.risk_summary || content.substring(0, 500);
  } catch {
    // If JSON parsing fails, try to extract score from text
    const scoreMatch = content.match(/(?:score|rating)[:\s]*(\d+)/i);
    if (scoreMatch) riskScore = parseInt(scoreMatch[1]);
  }

  return {
    provider: provider.name,
    model: provider.modelId,
    analysis: content,
    riskScore: Math.max(0, Math.min(100, riskScore)),
    tokensUsed,
    latencyMs: Date.now() - start,
  };
}

/**
 * Call HuggingFace Inference API
 */
async function callHuggingFace(
  provider: ProviderConfig,
  prompt: string
): Promise<AIResponse> {
  const start = Date.now();

  const response = await fetch(provider.baseUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n${SYSTEM_PROMPT}<|eot_id|><|start_header_id|>user<|end_header_id|>\n${prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>`,
      parameters: {
        max_new_tokens: provider.maxTokens,
        temperature: 0.3,
        return_full_text: false,
      },
    }),
    signal: AbortSignal.timeout(30_000), // 30s timeout for HF
  });

  if (!response.ok) {
    throw new Error(`${provider.name} returned ${response.status}`);
  }

  const data = await response.json();
  const content = Array.isArray(data) ? data[0]?.generated_text || '' : data.generated_text || '';

  let riskScore = 50;
  try {
    const parsed = JSON.parse(content);
    riskScore = parsed.overall_score || 50;
  } catch {
    const scoreMatch = content.match(/(?:score|rating)[:\s]*(\d+)/i);
    if (scoreMatch) riskScore = parseInt(scoreMatch[1]);
  }

  return {
    provider: provider.name,
    model: provider.modelId,
    analysis: content,
    riskScore: Math.max(0, Math.min(100, riskScore)),
    tokensUsed: 0, // HF doesn't always report tokens
    latencyMs: Date.now() - start,
  };
}

/**
 * Rule-based fallback — always works, no API needed
 */
function ruleBasedAnalysis(target: string, findings: Finding[]): AIResponse {
  const start = Date.now();

  const critical = findings.filter(f => f.severity === 'critical');
  const high = findings.filter(f => f.severity === 'high');
  const medium = findings.filter(f => f.severity === 'medium');
  const low = findings.filter(f => f.severity === 'low');

  // Calculate risk score
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
  score = Math.max(0, Math.min(100, score));

  // Build analysis
  let summary = `Security assessment of ${target} completed. `;
  if (critical.length > 0) {
    summary += `${critical.length} CRITICAL vulnerabilities found that require immediate attention. `;
    summary += `Key issues: ${critical.map(f => f.title).join('; ')}. `;
  }
  if (high.length > 0) {
    summary += `${high.length} high-severity issues detected. `;
  }
  if (medium.length > 0) {
    summary += `${medium.length} medium-severity findings. `;
  }
  summary += `Overall risk score: ${score}/100. `;

  if (score < 50) {
    summary += 'URGENT: This target has significant security gaps that could be exploited. Immediate remediation recommended.';
  } else if (score < 70) {
    summary += 'WARNING: Moderate security risks detected. Priority remediation recommended within 30 days.';
  } else {
    summary += 'Good security posture. Continue monitoring and address low-severity findings during regular maintenance.';
  }

  const remediation = findings
    .filter(f => f.severity === 'critical' || f.severity === 'high')
    .slice(0, 5)
    .map(f => ({
      action: `Fix: ${f.title}`,
      why: f.remediation || 'Security improvement',
      effort: f.severity === 'critical' ? 'high' as const : 'medium' as const,
    }));

  const analysis = JSON.stringify({
    risk_summary: summary,
    overall_score: score,
    critical_findings: critical.map(f => f.title),
    remediation_priority: remediation,
    provider: 'rule-based',
    disclaimer: 'This analysis was generated using rule-based heuristics. For AI-powered analysis, please upgrade to a paid plan.',
  });

  return {
    provider: 'rule-based (no API)',
    model: 'sentari-heuristic-v1',
    analysis,
    riskScore: score,
    tokensUsed: 0,
    latencyMs: Date.now() - start,
  };
}

/**
 * Main entry point: Run AI analysis with automatic fallback
 * Cascades through providers until one succeeds
 */
export async function analyzeWithFallback(
  target: string,
  findings: Finding[],
  scanData: Record<string, unknown>
): Promise<AIResponse> {
  const prompt = `Analyze security scan results for ${target}:

Findings (${findings.length} total):
${findings.map(f => `- [${f.severity.toUpperCase()}] ${f.title}: ${f.remediation || 'No remediation specified'}`).join('\n')}

Scan data: ${JSON.stringify(scanData).substring(0, 2000)}

Provide risk assessment, score, and remediation priorities.`;

  const providers = getProviders().filter(p => p.enabled);

  // Try each provider in priority order
  for (const provider of providers) {
    try {
      console.log(`[AI] Trying ${provider.name}...`);
      let response: AIResponse;

      if (provider.baseUrl.includes('huggingface')) {
        response = await callHuggingFace(provider, prompt);
      } else {
        response = await callOpenAICompatible(provider, prompt);
      }

      console.log(`[AI] ${provider.name} succeeded (${response.latencyMs}ms, ${response.tokensUsed} tokens)`);
      return response;
    } catch (error) {
      console.warn(`[AI] ${provider.name} failed:`, error instanceof Error ? error.message : error);
      continue; // Try next provider
    }
  }

  // All providers failed — use rule-based fallback (always works)
  console.log('[AI] All providers failed, using rule-based analysis');
  return ruleBasedAnalysis(target, findings);
}

/**
 * Check provider health status
 */
export async function checkProviderHealth(): Promise<Record<string, boolean>> {
  const providers = getProviders();
  const health: Record<string, boolean> = {};

  for (const provider of providers) {
    if (!provider.enabled) {
      health[provider.name] = false;
      continue;
    }

    try {
      const response = await fetch(`${provider.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${provider.apiKey}` },
        signal: AbortSignal.timeout(5_000),
      });
      health[provider.name] = response.ok;
    } catch {
      health[provider.name] = false;
    }
  }

  health['rule-based (always available)'] = true;
  return health;
}
