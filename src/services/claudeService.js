import { buildRequestBody } from '../utils/promptBuilder';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Analyze a transcript with Claude AI and return structured insights.
 * @param {string} transcript - Assembled plain-text transcript
 * @param {string} meetingId
 * @param {string} apiKey - Claude API key from storage
 * @returns {Promise<Array>} Array of insight objects
 */
export async function analyzeTranscript(transcript, meetingId, apiKey) {
  if (!apiKey) throw new Error('Claude API key is not configured. Please open Settings.');

  const body = buildRequestBody(transcript, meetingId);

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

  return parseInsights(rawContent);
}

function parseInsights(raw) {
  const cleaned = raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

  try {
    const parsed = JSON.parse(cleaned);
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
