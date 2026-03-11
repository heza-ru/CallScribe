/**
 * Creates a JIRA issue using the REST API v2.
 *
 * v2 is used instead of v3 because it works identically for Jira Cloud
 * and avoids ADF description format issues on some instances.
 *
 * @param {object} ticket    - Ticket data to submit
 * @param {object} settings  - { jiraBaseUrl, jiraEmail, jiraApiToken, jiraProjectKey }
 * @returns {Promise<{ key: string, url: string }>}
 */
export async function createJiraTicket(ticket, settings) {
  const { jiraBaseUrl, jiraEmail, jiraApiToken, jiraProjectKey } = settings || {};

  if (!jiraBaseUrl || !jiraEmail || !jiraApiToken || !jiraProjectKey) {
    throw new Error('JIRA configuration is incomplete. Please check Settings.');
  }

  // ── URL normalisation ────────────────────────────────────────────────────
  // Problems we fix here:
  //  1. http:// → https://  (redirect changes POST→GET, causes 405)
  //  2. Any path after the hostname (/jira, /software, /platform …) also
  //     triggers a redirect that converts POST → GET → 405.
  //     The Jira Cloud REST API lives at https://org.atlassian.net/rest/…
  //     with NO extra context path.
  let rawUrl = jiraBaseUrl.trim().replace(/\/$/, '');

  if (rawUrl.startsWith('http://')) {
    rawUrl = 'https://' + rawUrl.slice(7);
  } else if (!rawUrl.startsWith('https://')) {
    rawUrl = 'https://' + rawUrl;
  }

  let baseUrl = rawUrl;
  try {
    // Strip everything after the host (port is kept).
    // e.g. https://org.atlassian.net/jira/software → https://org.atlassian.net
    const parsed = new URL(rawUrl);
    baseUrl = parsed.protocol + '//' + parsed.host;
  } catch {
    // If URL parsing fails keep the cleaned raw string.
  }
  // ────────────────────────────────────────────────────────────────────────

  const credentials = btoa(`${jiraEmail.trim()}:${jiraApiToken.trim()}`);

  // API v2 description is plain text — no ADF object needed.
  const descLines = [];
  if (ticket.description)  descLines.push(ticket.description);
  if (ticket.productArea)  descLines.push(`\nProduct Area: ${ticket.productArea}`);
  descLines.push(`\n_Source: CallScribe transcript (Meeting ID: ${ticket.meetingId || 'unknown'})_`);

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

  const payload = {
    fields: {
      project:   { key: jiraProjectKey.trim().toUpperCase() },
      summary:   ticket.title,
      description: descLines.join('\n'),
      issuetype: { name: issueTypeMap[ticket.type] || 'Task' },
      priority:  { name: priorityMap[ticket.priority] || 'Medium' },
    },
  };

  if (ticket.labels?.length) {
    payload.fields.labels = ticket.labels;
  }

  const response = await fetch(`${baseUrl}/rest/api/2/issue`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Basic ${credentials}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    // If the response was a redirect that turned into a GET (405), give
    // a specific, actionable message rather than the generic HTML page.
    if (response.status === 405) {
      throw new Error(
        'JIRA error: 405 Method Not Allowed — the request was redirected and ' +
        'converted from POST to GET. Check that your Base URL is exactly ' +
        '"https://yourorg.atlassian.net" with no path after the domain.'
      );
    }

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
      if (errText) messages = errText.slice(0, 200);
    }
    throw new Error(`JIRA error: ${messages}`);
  }

  const data = await response.json();
  return {
    key: data.key,
    url: `${baseUrl}/browse/${data.key}`,
  };
}
