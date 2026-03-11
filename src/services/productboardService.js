const PB_API_BASE = 'https://api.productboard.com';

/**
 * Creates a Productboard note (insight).
 *
 * IMPORTANT — token type:
 *   The API requires a *developer token* obtained from:
 *   Productboard → Settings → Integrations → (any integration) → API token
 *   A regular user password or OAuth token will NOT work and returns 422.
 *
 * Payload kept minimal (title + content only) to avoid field-validation 422s.
 * display_url, tags, and source are omitted — they cause 422 on some workspaces.
 *
 * @param {object} ticket   - Ticket data
 * @param {object} settings - { productboardApiKey }
 * @returns {Promise<{ id: string, url: string }>}
 */
export async function createProductboardInsight(ticket, settings) {
  const { productboardApiKey } = settings || {};

  if (!productboardApiKey) {
    throw new Error('Productboard API key is not configured. Please check Settings.');
  }

  // Strip accidental "Bearer " prefix if the user pasted it with the header.
  const token = productboardApiKey.trim().replace(/^Bearer\s+/i, '');

  // Productboard Notes API uses a flat body — NOT JSON:API data.attributes.
  const payload = {
    title:   ticket.title,
    content: buildContent(ticket),
  };

  const response = await fetch(`${PB_API_BASE}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Version':     '1',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');

    // Productboard sometimes returns 422 with title "Unauthorized" when the
    // token is a wrong type (e.g. user token instead of developer token).
    if (response.status === 422 || response.status === 401) {
      let pbMsg = '';
      try {
        const err = JSON.parse(errText);
        pbMsg =
          err?.errors?.[0]?.detail ||
          err?.errors?.[0]?.title  ||
          err?.error               ||
          '';
      } catch { /* keep empty */ }

      const isAuthErr =
        response.status === 401 ||
        /unauthori[sz]ed/i.test(pbMsg);

      if (isAuthErr) {
        throw new Error(
          'Productboard error: Invalid or unauthorised token. ' +
          'Make sure you are using the Developer Token from ' +
          'Productboard → Settings → Integrations, not a user password or OAuth token.'
        );
      }

      throw new Error(`Productboard error: ${pbMsg || `HTTP ${response.status}`}`);
    }

    let detail = `HTTP ${response.status}`;
    try {
      const err = JSON.parse(errText);
      detail =
        err?.errors?.[0]?.detail ||
        err?.errors?.[0]?.title  ||
        err?.error               ||
        detail;
    } catch { /* keep generic */ }

    throw new Error(`Productboard error: ${detail}`);
  }

  const data = await response.json();
  // Flat response: { id: "...", ... } or nested { data: { id: "..." } }
  const id = data?.id ?? data?.data?.id;
  return {
    id,
    url: id ? `https://app.productboard.com/notes/${id}` : 'https://app.productboard.com',
  };
}

function buildContent(ticket) {
  const lines = [];

  if (ticket.description) lines.push(ticket.description);

  lines.push('');
  lines.push('---');
  if (ticket.type)           lines.push(`Type: ${ticket.type}`);
  if (ticket.priority)       lines.push(`Priority: ${ticket.priority}`);
  if (ticket.productArea)    lines.push(`Product Area: ${ticket.productArea}`);
  if (ticket.labels?.length) lines.push(`Labels: ${ticket.labels.join(', ')}`);
  lines.push('');
  lines.push(
    `Source: CallScribe transcript${ticket.meetingId ? ` (Meeting ID: ${ticket.meetingId})` : ''}`
  );

  return lines.join('\n');
}
