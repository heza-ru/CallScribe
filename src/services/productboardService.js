const PB_API_BASE = 'https://api.productboard.com';

/**
 * Creates a Productboard insight.
 *
 * @param {object} ticket - Ticket data
 * @param {object} settings - { productboardApiKey }
 * @returns {Promise<{ id: string, url: string }>}
 */
export async function createProductboardInsight(ticket, settings) {
  const { productboardApiKey } = settings;

  if (!productboardApiKey) {
    throw new Error('Productboard API key is not configured. Please check Settings.');
  }

  const tags = ['callscribe', 'transcript'];
  if (ticket.productArea) tags.push(ticket.productArea.toLowerCase().replace(/\s+/g, '-'));
  if (ticket.type) tags.push(ticket.type);
  if (ticket.labels) tags.push(...ticket.labels);

  const payload = {
    data: {
      type: 'note',
      attributes: {
        title: ticket.title,
        content: buildContent(ticket),
        tags: [...new Set(tags)],
        source: {
          origin: 'CallScribe',
          record_id: ticket.meetingId || undefined,
        },
      },
    },
  };

  const response = await fetch(`${PB_API_BASE}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${productboardApiKey}`,
      'X-Version': '1',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const detail = err?.errors?.[0]?.detail || err?.error || `HTTP ${response.status}`;
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
  const parts = [ticket.description || ''];
  if (ticket.productArea) parts.push(`\nProduct Area: ${ticket.productArea}`);
  if (ticket.priority) parts.push(`Priority: ${ticket.priority}`);
  if (ticket.type) parts.push(`Type: ${ticket.type}`);
  if (ticket.meetingId) parts.push(`\nSource: CallScribe transcript (Meeting ID: ${ticket.meetingId})`);
  return parts.join('\n');
}
