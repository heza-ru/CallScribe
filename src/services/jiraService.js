/**
 * Creates a JIRA issue using the REST API v3.
 *
 * @param {object} ticket - Ticket data to submit
 * @param {object} settings - { jiraBaseUrl, jiraEmail, jiraApiToken, jiraProjectKey }
 * @returns {Promise<{ key: string, url: string }>}
 */
export async function createJiraTicket(ticket, settings) {
  const { jiraBaseUrl, jiraEmail, jiraApiToken, jiraProjectKey } = settings || {};

  if (!jiraBaseUrl || !jiraEmail || !jiraApiToken || !jiraProjectKey) {
    throw new Error('JIRA configuration is incomplete. Please check Settings.');
  }

  // Force HTTPS – a http→https redirect converts POST to GET (405)
  let baseUrl = jiraBaseUrl.trim().replace(/\/$/, '');
  if (baseUrl.startsWith('http://')) {
    baseUrl = 'https://' + baseUrl.slice(7);
  } else if (!baseUrl.startsWith('https://')) {
    baseUrl = 'https://' + baseUrl;
  }

  const credentials = btoa(`${jiraEmail}:${jiraApiToken}`);

  const issueTypeMap = {
    bug:         'Bug',
    feature:     'Story',
    pain:        'Story',
    improvement: 'Improvement',
    action:      'Task',
  };

  const priorityMap = {
    Critical: 'Critical',
    High:     'High',
    Medium:   'Medium',
    Low:      'Low',
  };

  const descriptionParts = [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: ticket.description || '' }],
    },
  ];

  if (ticket.productArea) {
    descriptionParts.push({
      type: 'paragraph',
      content: [{ type: 'text', text: `Product Area: ${ticket.productArea}`, marks: [{ type: 'strong' }] }],
    });
  }

  descriptionParts.push({
    type: 'paragraph',
    content: [{
      type: 'text',
      text: `Source: CallScribe transcript (Meeting ID: ${ticket.meetingId || 'unknown'})`,
      marks: [{ type: 'em' }],
    }],
  });

  const payload = {
    fields: {
      project:     { key: jiraProjectKey },
      summary:     ticket.title,
      description: { type: 'doc', version: 1, content: descriptionParts },
      issuetype:   { name: issueTypeMap[ticket.type] || 'Task' },
      priority:    { name: priorityMap[ticket.priority] || 'Medium' },
    },
  };

  if (ticket.labels?.length) {
    payload.fields.labels = ticket.labels;
  }

  const response = await fetch(`${baseUrl}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    let messages = `HTTP ${response.status}`;
    try {
      const err = JSON.parse(errText);
      if (err.errors && Object.keys(err.errors).length) {
        messages = Object.values(err.errors).join(', ');
      } else if (err.errorMessages?.length) {
        messages = err.errorMessages.join(', ');
      } else if (err.message) {
        messages = err.message;
      }
    } catch {
      // keep generic message
    }
    throw new Error(`JIRA error: ${messages}`);
  }

  const data = await response.json();
  return {
    key: data.key,
    url: `${baseUrl}/browse/${data.key}`,
  };
}
