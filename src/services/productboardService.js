const PB_API_BASE = 'https://api.productboard.com';

/**
 * Creates a Productboard note (insight).
 *
 * The Productboard notes API v1 only accepts `title` and `content` in
 * `data.attributes`. Any extra fields (source, tags) cause a 422 error.
 * All metadata is embedded in the content body instead.
 *
 * @param {object} ticket - Ticket data
 * @param {object} settings - { productboardApiKey }
 * @returns {Promise<{ id: string, url: string }>}
 */
export async function createProductboardInsight(ticket, settings) {
  const { productboardApiKey } = settings || {};

  if (!productboardApiKey) {
    throw new Error('Productboard API key is not configured. Please check Settings.');
  }

  const payload = {
    data: {
      type: 'note',
      attributes: {
        title:       ticket.title,
        content:     buildContent(ticket),
        // display_url links the note back to the source recording
        ...(ticket.meetingId
          ? { display_url: `https://app.mindtickle.com/call/${ticket.meetingId}` }
          : {}),
      },
    },
  };

  const response = await fetch(`${PB_API_BASE}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${productboardApiKey}`,
      'X-Version': '1',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    let detail = `HTTP ${response.status}`;
    try {
      const err = JSON.parse(errText);
      detail =
        err?.errors?.[0]?.detail ||
        err?.errors?.[0]?.title  ||
        err?.error                ||
        detail;
    } catch {
      // keep generic
    }
    throw new Error(`Productboard error: ${detail}`);
  }

  const data = await response.json();
  const id = data?.data?.id;
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

  if (ticket.type)        lines.push(`Type: ${ticket.type}`);
  if (ticket.priority)    lines.push(`Priority: ${ticket.priority}`);
  if (ticket.productArea) lines.push(`Product Area: ${ticket.productArea}`);
  if (ticket.labels?.length) lines.push(`Labels: ${ticket.labels.join(', ')}`);

  lines.push('');
  lines.push(`Source: CallScribe transcript${ticket.meetingId ? ` (Meeting ID: ${ticket.meetingId})` : ''}`);

  return lines.join('\n');
}
