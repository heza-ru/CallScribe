/**
 * Cloudflare Worker — Claude API proxy for CallScribe
 *
 * Deploy: wrangler deploy
 * Set secret: wrangler secret put ANTHROPIC_API_KEY
 *
 * After deploying, update CLAUDE_API_URL in claudeService.js to your
 * worker URL (e.g. https://callscribe-proxy.your-account.workers.dev)
 * and remove the 'x-api-key' and 'anthropic-dangerous-direct-browser-access'
 * headers from the claudeFetch helper.
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

const ALLOWED_ORIGINS = [
  'chrome-extension://',
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const isTrustedOrigin = ALLOWED_ORIGINS.some(prefix => origin.startsWith(prefix));

    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204, origin, isTrustedOrigin);
    }

    if (request.method !== 'POST') {
      return corsResponse(JSON.stringify({ error: 'Method not allowed' }), 405, origin, isTrustedOrigin);
    }

    if (!isTrustedOrigin) {
      return corsResponse(JSON.stringify({ error: 'Forbidden' }), 403, origin, isTrustedOrigin);
    }

    if (!env.ANTHROPIC_API_KEY) {
      return corsResponse(JSON.stringify({ error: 'API key not configured on worker' }), 500, origin, isTrustedOrigin);
    }

    let body;
    try {
      body = await request.text();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Invalid request body' }), 400, origin, isTrustedOrigin);
    }

    const upstream = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': request.headers.get('anthropic-version') || '2023-06-01',
        'anthropic-beta': request.headers.get('anthropic-beta') || '',
      },
      body,
    });

    const responseBody = await upstream.arrayBuffer();

    return corsResponse(responseBody, upstream.status, origin, isTrustedOrigin, upstream.headers.get('Content-Type'));
  },
};

function corsResponse(body, status, origin, trusted, contentType = 'application/json') {
  const headers = {
    'Content-Type': contentType,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, anthropic-version, anthropic-beta',
    'Access-Control-Max-Age': '86400',
  };

  if (trusted) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return new Response(body, { status, headers });
}
