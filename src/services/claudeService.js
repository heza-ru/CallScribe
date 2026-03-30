import {
  buildRequestBody, buildIntelligenceRequestBody,
  buildCompetitorRequestBody, buildObjectionRequestBody,
  buildMOMRequestBody, buildChatRequestBody,
  buildDemoScopeRequestBody,
  buildExecSummaryPart1Body, buildExecSummaryPart2Body,
  buildSolutionFrameworkRecommendationBody,
  buildSolutionFrameworkAnalysisBody,
} from '../utils/promptBuilder';
import { DEMO_ENVIRONMENTS } from '../data/demoEnvironments';
import { compressTranscript } from '../utils/transcriptCompressor';
import { recordTokens } from '../utils/tokenTracker';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Analyze a transcript with Claude AI and return structured insights.
 * The transcript is compressed before sending to reduce token usage.
 * @param {string} transcript - Assembled plain-text transcript
 * @param {string} meetingId
 * @param {string} apiKey - Claude API key from storage
 * @returns {Promise<Array>} Array of insight objects
 */
export async function analyzeTranscript(transcript, meetingId, apiKey) {
  if (!apiKey) throw new Error('Claude API key is not configured. Please open Settings.');

  const { text: compressedTranscript, stats } = compressTranscript(transcript);

  if (stats) {
    console.info(
      `[CallScribe] Transcript compressed: ${stats.originalChars} → ${stats.compressedChars} chars` +
        ` (${stats.compressionRatio}% saved, ${stats.originalLines} → ${stats.processedLines} lines)`
    );
  }

  const body = buildRequestBody(compressedTranscript, meetingId);

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    let message = `Claude API error (${response.status})`;
    try {
      const errJson = JSON.parse(errText);
      if (errJson?.error?.message) message = errJson.error.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const data = await response.json();
  const rawContent = data?.content?.[0]?.text;
  if (!rawContent) throw new Error('Empty response from Claude API');

  recordTokens('insights', data.usage?.input_tokens, data.usage?.output_tokens).catch(() => {});
  return parseInsights(rawContent);
}

/**
 * Analyze a transcript for call intelligence (sentiment, framework coverage, effectiveness).
 * Non-critical — caller should handle failures gracefully.
 */
export async function analyzeCallIntelligence(transcript, meetingId, apiKey) {
  if (!apiKey) throw new Error('Claude API key is not configured.');

  const { text: compressed } = compressTranscript(transcript);
  const body = buildIntelligenceRequestBody(compressed, meetingId);

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    let message = `Claude API error (${response.status})`;
    try {
      const errJson = JSON.parse(errText);
      if (errJson?.error?.message) message = errJson.error.message;
    } catch { /* ignore */ }
    throw new Error(message);
  }

  const data = await response.json();
  const rawContent = data?.content?.[0]?.text;
  if (!rawContent) throw new Error('Empty response from Claude API');

  recordTokens('intelligence', data.usage?.input_tokens, data.usage?.output_tokens).catch(() => {});
  return parseIntelligence(rawContent);
}

function extractJSONObject(raw) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  try { return JSON.parse(cleaned); } catch { /* fall through */ }
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* fall through */ }
  }
  throw new Error('No valid JSON object found in Claude response');
}

function parseIntelligence(raw) {
  try {
    const parsed = extractJSONObject(raw);
    // Normalize + clamp numeric fields
    return {
      callType: parsed.callType || 'Discovery',
      framework: parsed.framework || '',
      callSummary: parsed.callSummary || '',
      effectiveness: Math.min(10, Math.max(1, parsed.effectiveness || 5)),
      customerSentiment: {
        label: parsed.customerSentiment?.label || 'Neutral',
        score: Math.min(10, Math.max(1, parsed.customerSentiment?.score || 5)),
        positive: parsed.customerSentiment?.positive || 50,
        neutral: parsed.customerSentiment?.neutral || 30,
        negative: parsed.customerSentiment?.negative || 20,
      },
      questionsAnsweredPct: Math.min(100, Math.max(0, parsed.questionsAnsweredPct || 50)),
      frameworkCoverage: Array.isArray(parsed.frameworkCoverage) ? parsed.frameworkCoverage : [],
      keyThemes: Array.isArray(parsed.keyThemes) ? parsed.keyThemes.slice(0, 5) : [],
      sentimentDrivers: {
        positive: Array.isArray(parsed.sentimentDrivers?.positive) ? parsed.sentimentDrivers.positive.slice(0, 4) : [],
        negative: Array.isArray(parsed.sentimentDrivers?.negative) ? parsed.sentimentDrivers.negative.slice(0, 4) : [],
      },
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 3) : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.slice(0, 4) : [],
    };
  } catch (e) {
    throw new Error(`Failed to parse call intelligence response: ${e.message}`);
  }
}

function extractJSONArray(raw) {
  // Strip markdown fences
  const cleaned = raw.trim().replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  // Try direct parse
  try { return JSON.parse(cleaned); } catch { /* fall through */ }
  // Extract the first complete JSON array (handles trailing explanation text)
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* fall through */ }
  }
  throw new Error('No valid JSON array found in Claude response');
}

function parseInsights(raw) {
  try {
    const parsed = extractJSONArray(raw);
    if (!Array.isArray(parsed)) throw new Error('Expected a JSON array from Claude');
    return parsed.map((item, i) => ({
      id: `insight-${i}-${Date.now()}`,
      title: item.title || 'Untitled Insight',
      description: item.description || '',
      productArea: item.productArea || item.product_area || '',
      priority: normalizePriority(item.priority),
      type: normalizeType(item.type),
    }));
  } catch (e) {
    throw new Error(`Failed to parse Claude response as JSON: ${e.message}`);
  }
}

function normalizePriority(p) {
  const map = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
  return map[(p || '').toLowerCase()] || 'Medium';
}

function normalizeType(t) {
  const valid = ['bug', 'feature', 'pain', 'improvement', 'action'];
  const lower = (t || '').toLowerCase();
  if (valid.includes(lower)) return lower;
  if (lower.includes('bug')) return 'bug';
  if (lower.includes('feature') || lower.includes('request')) return 'feature';
  if (lower.includes('pain') || lower.includes('frustrat')) return 'pain';
  return 'improvement';
}

// ─── Shared fetch helper ──────────────────────────────────────────

async function claudeFetch(body, apiKey, signal) {
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    let message = `Claude API error (${response.status})`;
    try { const j = JSON.parse(errText); if (j?.error?.message) message = j.error.message; } catch { /* */ }
    throw new Error(message);
  }
  return response;
}

// ─── Competitor Detection ─────────────────────────────────────────

export async function detectCompetitors(transcript, apiKey) {
  if (!apiKey) throw new Error('Claude API key is not configured.');
  const { text: compressed } = compressTranscript(transcript);
  const body = buildCompetitorRequestBody(compressed);
  const response = await claudeFetch(body, apiKey);
  const data = await response.json();
  const raw = data?.content?.[0]?.text;
  if (!raw) throw new Error('Empty response from Claude API');
  recordTokens('competitors', data.usage?.input_tokens, data.usage?.output_tokens).catch(() => {});
  try {
    const parsed = extractJSONObject(raw);
    return {
      competitors: Array.isArray(parsed.competitors) ? parsed.competitors : [],
      summary: parsed.summary || '',
    };
  } catch (e) {
    throw new Error('Failed to parse competitor response: ' + e.message);
  }
}

// ─── Objection Tracker ────────────────────────────────────────────

export async function trackObjections(transcript, apiKey) {
  if (!apiKey) throw new Error('Claude API key is not configured.');
  const { text: compressed } = compressTranscript(transcript);
  const body = buildObjectionRequestBody(compressed);
  const response = await claudeFetch(body, apiKey);
  const data = await response.json();
  const raw = data?.content?.[0]?.text;
  if (!raw) throw new Error('Empty response from Claude API');
  recordTokens('objections', data.usage?.input_tokens, data.usage?.output_tokens).catch(() => {});
  try {
    const parsed = extractJSONObject(raw);
    return {
      objections:    Array.isArray(parsed.objections) ? parsed.objections : [],
      handledCount:  parsed.handledCount  ?? 0,
      totalCount:    parsed.totalCount    ?? 0,
      topRisk:       parsed.topRisk       ?? null,
    };
  } catch (e) {
    throw new Error('Failed to parse objection response: ' + e.message);
  }
}

// ─── Meeting Minutes ──────────────────────────────────────────────

export async function generateMOM(transcript, meetingId, apiKey) {
  if (!apiKey) throw new Error('Claude API key is not configured.');
  const { text: compressed } = compressTranscript(transcript);
  const body = buildMOMRequestBody(compressed, meetingId);
  const response = await claudeFetch(body, apiKey);
  const data = await response.json();
  const raw = data?.content?.[0]?.text;
  if (!raw) throw new Error('Empty response from Claude API');
  recordTokens('mom', data.usage?.input_tokens, data.usage?.output_tokens).catch(() => {});
  try {
    const parsed = extractJSONObject(raw);
    return {
      internal: parsed.internal || '',
      external: parsed.external || '',
    };
  } catch (e) {
    throw new Error('Failed to parse MOM response: ' + e.message);
  }
}

// ─── Demo Scope Advisor ───────────────────────────────────────────

export async function analyzeDemoScope(transcript, apiKey) {
  if (!apiKey) throw new Error('Claude API key is not configured.');
  const { text: compressed } = compressTranscript(transcript);
  const body = buildDemoScopeRequestBody(compressed, DEMO_ENVIRONMENTS);
  const response = await claudeFetch(body, apiKey);
  const data = await response.json();
  const raw = data?.content?.[0]?.text;
  if (!raw) throw new Error('Empty response from Claude API');
  recordTokens('demo_scope', data.usage?.input_tokens, data.usage?.output_tokens).catch(() => {});
  try {
    const parsed = extractJSONObject(raw);
    // Hydrate recommendations with full env objects
    const recs = (parsed.recommendations || []).map(r => ({
      ...r,
      env: DEMO_ENVIRONMENTS.find(e => e.id === r.envId) || null,
    }));
    return {
      callStage:      parsed.callStage      || 'discovery',
      clientPlatform: parsed.clientPlatform || 'unknown',
      prospect:       parsed.prospect       || {},
      pocScope:       parsed.pocScope       || { defined: false, appAccessDiscussed: false, note: '' },
      recommendations: recs,
      summary:        parsed.summary        || '',
    };
  } catch (e) {
    throw new Error('Failed to parse demo scope response: ' + e.message);
  }
}

// ─── Executive Demo Analysis ──────────────────────────────────────
// Split into two parallel calls so neither exceeds the output token limit,
// which would cause truncation and JSON parse failure on long (1–2h) calls.

export async function generateExecSummary(transcript, meetingId, apiKey) {
  if (!apiKey) throw new Error('Claude API key is not configured.');
  const { text: compressed } = compressTranscript(transcript);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7 * 60 * 1000); // 7 min hard timeout

  // Stagger by 2s so two large requests don't hit the API simultaneously
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    const [res1, res2] = await Promise.all([
      claudeFetch(buildExecSummaryPart1Body(compressed), apiKey, controller.signal).then(r => r.json()),
      delay(2000).then(() => claudeFetch(buildExecSummaryPart2Body(compressed), apiKey, controller.signal).then(r => r.json())),
    ]);

    const raw1 = res1?.content?.[0]?.text;
    const raw2 = res2?.content?.[0]?.text;
    if (!raw1) throw new Error('Empty response from Claude API (part 1)');
    if (!raw2) throw new Error('Empty response from Claude API (part 2)');

    recordTokens('exec_summary',
      (res1.usage?.input_tokens  || 0) + (res2.usage?.input_tokens  || 0),
      (res1.usage?.output_tokens || 0) + (res2.usage?.output_tokens || 0)
    ).catch(() => {});

    const p1 = extractJSONObject(raw1);
    const p2 = extractJSONObject(raw2);

    return {
      // Markdown prose sections
      storyline:    p1.storyline    || '',
      useCases:     p1.useCases     || '',
      infosec:      p2.infosec      || '',
      gaps:         p2.gaps         || '',
      improvements: p2.improvements || '',
      // Structured arrays/objects
      features:       Array.isArray(p1.features) ? p1.features : [],
      differentiation: p1.differentiation && typeof p1.differentiation === 'object' ? p1.differentiation : { shown: [], missedNow: [], saveLater: [], whyWhatfix: '', vsOthers: '', overallRating: '' },
      questions:      Array.isArray(p2.questions) ? p2.questions : [],
      // Summary data
      scores:           p2.scores || {},
      executiveSummary: Array.isArray(p2.executiveSummary) ? p2.executiveSummary : [],
      followUpActions:  Array.isArray(p2.followUpActions)  ? p2.followUpActions  : [],
    };
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Analysis timed out. Please try again.');
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Solution Framework ───────────────────────────────────────────

export async function getSolutionFrameworkRecommendation(transcript, apiKey) {
  if (!apiKey) throw new Error('Claude API key is not configured.');
  const { text: compressed } = compressTranscript(transcript);
  const body = buildSolutionFrameworkRecommendationBody(compressed);
  const response = await claudeFetch(body, apiKey);
  const data = await response.json();
  const raw = data?.content?.[0]?.text;
  if (!raw) throw new Error('Empty response from Claude API');
  recordTokens('solution_framework', data.usage?.input_tokens, data.usage?.output_tokens).catch(() => {});
  try {
    const parsed = extractJSONObject(raw);
    return {
      type: parsed.type || 'DT',
      confidence: parsed.confidence || 'low',
      reason: parsed.reason || '',
      alternativeType: parsed.alternativeType || null,
      alternativeReason: parsed.alternativeReason || null,
    };
  } catch (e) {
    throw new Error('Failed to parse framework recommendation: ' + e.message);
  }
}

export async function analyzeSolutionFramework(transcript, frameworkType, apiKey) {
  if (!apiKey) throw new Error('Claude API key is not configured.');
  const { text: compressed } = compressTranscript(transcript);
  const body = buildSolutionFrameworkAnalysisBody(compressed, frameworkType);
  const response = await claudeFetch(body, apiKey);
  const data = await response.json();
  const raw = data?.content?.[0]?.text;
  if (!raw) throw new Error('Empty response from Claude API');
  recordTokens('solution_framework', data.usage?.input_tokens, data.usage?.output_tokens).catch(() => {});
  try {
    const parsed = extractJSONObject(raw);
    return {
      overallFit: parsed.overallFit || 'moderate',
      fitReason: parsed.fitReason || '',
      qualificationSignals: Array.isArray(parsed.qualificationSignals) ? parsed.qualificationSignals : [],
      discoveryGaps: Array.isArray(parsed.discoveryGaps) ? parsed.discoveryGaps : [],
      requirementMapping: Array.isArray(parsed.requirementMapping) ? parsed.requirementMapping : [],
      competitiveContext: parsed.competitiveContext || '',
      objections: Array.isArray(parsed.objections) ? parsed.objections : [],
      roiAngles: Array.isArray(parsed.roiAngles) ? parsed.roiAngles : [],
      demoFocus: parsed.demoFocus || '',
    };
  } catch (e) {
    throw new Error('Failed to parse framework analysis: ' + e.message);
  }
}

// ─── Streaming Chat ───────────────────────────────────────────────

export async function* streamChatMessage(transcript, messages, apiKey) {
  if (!apiKey) throw new Error('Claude API key is not configured.');
  const body = buildChatRequestBody(transcript, messages);
  const response = await claudeFetch(body, apiKey);

  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') return;
      try {
        const event = JSON.parse(payload);
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          yield event.delta.text;
        }
        if (event.type === 'message_start' && event.message?.usage) {
          recordTokens('chat', event.message.usage.input_tokens || 0, 0).catch(() => {});
        }
        if (event.type === 'message_delta' && event.usage) {
          recordTokens('chat', 0, event.usage.output_tokens || 0).catch(() => {});
        }
      } catch { /* malformed SSE line — skip */ }
    }
  }
}
