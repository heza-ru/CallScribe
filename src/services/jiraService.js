/**
 * Creates a JIRA issue using the REST API v3.
 *
 * @param {object} ticket - Ticket data to submit
 * @param {object} settings - { jiraBaseUrl, jiraEmail, jiraApiToken, jiraProjectKey }
 * @returns {Promise<{ key: string, url: string }>}
 */
export async function createJiraTicket(ticket, settings) {
  const { jiraBaseUrl, jiraEmail, jiraApiToken, jiraProjectKey } = settings;

  if (!jiraBaseUrl || !jiraEmail || !jiraApiToken || !jiraProjectKey) {
    throw new Error('JIRA configuration is incomplete. Please check Settings.');
  }

  const baseUrl = jiraBaseUrl.replace(/\/$/, '');
  const credentials = btoa(`${jiraEmail}:${jiraApiToken}`);

  const issueTypeMap = {
    bug: 'Bug',
    feature: 'Story',
    pain: 'Story',
    improvement: 'Improvement',
    action: 'Task',
  };

  const priorityMap = {
    Critical: 'Critical',
    High: 'High',
    Medium: 'Medium',
    Low: 'Low',
  };

  const payload = {
    fields: {
      project: { key: jiraProjectKey },
      summary: ticket.title,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: ticket.description }],
          },
          ...(ticket.productArea
            ? [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: `Product Area: ${ticket.productArea}`, marks: [{ type: 'strong' }] },
                  ],
                },
              ]
            : []),
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `Source: CallScribe transcript (Meeting ID: ${ticket.meetingId || 'unknown'})`,
                marks: [{ type: 'em' }],
              },
            ],
          },
        ],
      },
      issuetype: { name: issueTypeMap[ticket.type] || 'Task' },
      priority: { name: priorityMap[ticket.priority] || 'Medium' },
    },
  };

  if (ticket.labels?.length) {
    payload.fields.labels = ticket.labels;
  }

  const response = await fetch(`${baseUrl}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const messages = err.errors
      ? Object.values(err.errors).join(', ')
      : err.errorMessages?.join(', ') || `HTTP ${response.status}`;
    throw new Error(`JIRA error: ${messages}`);
  }

  const data = await response.json();
  return {
    key: data.key,
    url: `${baseUrl}/browse/${data.key}`,
  };
}
