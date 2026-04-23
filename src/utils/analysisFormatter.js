// ─────────────────────────────────────────────────────────────────
// Analysis (Product Gaps) formatter
// Supports: JSON, CSV, Markdown, TXT — both collective and single
// ─────────────────────────────────────────────────────────────────

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function sortInsights(insights) {
  return [...insights].sort((a, b) => {
    const ao = PRIORITY_ORDER[(a.priority || 'medium').toLowerCase()] ?? 2;
    const bo = PRIORITY_ORDER[(b.priority || 'medium').toLowerCase()] ?? 2;
    return ao - bo;
  });
}

function escape(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

// Sanitize a value for use in a markdown table cell
function tc(v) {
  return String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function ts() {
  return new Date().toLocaleString();
}

// ── JSON ─────────────────────────────────────────────────────────

export function insightsToJSON(insights, meetingId) {
  const byType = {};
  const byPriority = {};
  insights.forEach(i => {
    byType[i.type]           = (byType[i.type]           || 0) + 1;
    byPriority[i.priority]   = (byPriority[i.priority]   || 0) + 1;
  });
  return JSON.stringify({
    source:     'CallScribe',
    meetingId:  meetingId || 'Unknown',
    exportedAt: new Date().toISOString(),
    summary: {
      total:      insights.length,
      byType,
      byPriority,
    },
    insights: sortInsights(insights).map(i => ({
      title:       i.title,
      type:        i.type,
      priority:    i.priority,
      productArea: i.productArea,
      description: i.description,
    })),
  }, null, 2);
}

export function singleInsightToJSON(insight) {
  return JSON.stringify({
    source:      'CallScribe',
    exportedAt:  new Date().toISOString(),
    title:       insight.title,
    type:        insight.type,
    priority:    insight.priority,
    productArea: insight.productArea,
    description: insight.description,
  }, null, 2);
}

// ── CSV ──────────────────────────────────────────────────────────

export function insightsToCSV(insights, meetingId) {
  const header = ['Title', 'Type', 'Priority', 'Product Area', 'Description']
    .map(escape).join(',');
  const rows = sortInsights(insights).map(i =>
    [i.title, i.type, i.priority, i.productArea, i.description]
      .map(escape).join(',')
  );
  const meta = `# CallScribe Product Gaps — Meeting ${meetingId || 'Unknown'} — ${ts()}\r\n`;
  return meta + [header, ...rows].join('\r\n');
}

// ── Markdown ──────────────────────────────────────────────────────

function insightBlock(insight) {
  const lines = [];
  lines.push(`### ${insight.title}`);
  lines.push(`**Type:** ${capitalize(insight.type)} · **Priority:** ${capitalize(insight.priority)} · **Area:** ${insight.productArea || '—'}`);
  lines.push('');
  if (insight.description) lines.push(insight.description);
  return lines.join('\n');
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

export function insightsToMarkdown(insights, meetingId) {
  const sorted = sortInsights(insights);
  const byPriority = {};
  sorted.forEach(i => {
    const p = (i.priority || 'medium').toLowerCase();
    if (!byPriority[p]) byPriority[p] = [];
    byPriority[p].push(i);
  });

  const lines = [];
  lines.push('# Product Gaps Report');
  lines.push(`**Meeting ID:** \`${meetingId || 'Unknown'}\``);
  lines.push(`**Exported:** ${ts()}`);
  lines.push(`**Total:** ${insights.length} insight${insights.length !== 1 ? 's' : ''}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  const order = ['critical', 'high', 'medium', 'low'];

  order.forEach(p => {
    const group = byPriority[p];
    if (!group?.length) return;
    lines.push(`## ${capitalize(p)} (${group.length})`);
    lines.push('');
    group.forEach(i => {
      lines.push(insightBlock(i));
      lines.push('');
      lines.push('---');
      lines.push('');
    });
  });

  return lines.join('\n');
}

export function singleInsightToMarkdown(insight) {
  return [
    `# ${insight.title}`,
    '',
    `**Type:** ${capitalize(insight.type)}  `,
    `**Priority:** ${capitalize(insight.priority)}  `,
    `**Product Area:** ${insight.productArea || '—'}  `,
    `**Exported:** ${ts()}`,
    '',
    '---',
    '',
    insight.description || '',
  ].join('\n');
}

// ── TXT ───────────────────────────────────────────────────────────

export function insightsToTXT(insights, meetingId) {
  const sorted = sortInsights(insights);
  const sep = '─'.repeat(50);

  const header = [
    'CallScribe — Product Gaps Report',
    `Meeting ID : ${meetingId || 'Unknown'}`,
    `Exported   : ${ts()}`,
    `Total      : ${insights.length} insight${insights.length !== 1 ? 's' : ''}`,
    sep,
    '',
  ].join('\n');

  const body = sorted.map((i, idx) => [
    `[${idx + 1}] ${i.title.toUpperCase()}`,
    `    Type        : ${capitalize(i.type)}`,
    `    Priority    : ${capitalize(i.priority)}`,
    `    Product Area: ${i.productArea || '—'}`,
    '',
    ...(i.description ? [`    ${i.description.replace(/\n/g, '\n    ')}`] : []),
    '',
    sep,
  ].join('\n')).join('\n');

  return header + body;
}

export function singleInsightToTXT(insight) {
  const sep = '─'.repeat(50);
  return [
    insight.title.toUpperCase(),
    sep,
    `Type        : ${capitalize(insight.type)}`,
    `Priority    : ${capitalize(insight.priority)}`,
    `Product Area: ${insight.productArea || '—'}`,
    `Exported    : ${ts()}`,
    '',
    insight.description || '',
  ].join('\n');
}

// ── Download trigger ──────────────────────────────────────────────

export function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const MIME = {
  json: 'application/json',
  csv:  'text/csv',
  md:   'text/markdown',
  txt:  'text/plain',
};

export function downloadAllInsights(insights, meetingId, format) {
  const mid = (meetingId || 'callscribe').slice(-8);
  if (format === 'doc') { triggerDownload(insightsToWordDoc(insights, meetingId), `product-gaps-${mid}.doc`, 'application/msword'); return; }
  let content, ext;
  switch (format) {
    case 'json': content = insightsToJSON(insights, meetingId);     ext = 'json'; break;
    case 'csv':  content = insightsToCSV(insights, meetingId);      ext = 'csv';  break;
    case 'md':   content = insightsToMarkdown(insights, meetingId); ext = 'md';   break;
    default:     content = insightsToTXT(insights, meetingId);      ext = 'txt';  break;
  }
  triggerDownload(content, `product-gaps-${mid}.${ext}`, MIME[ext] || 'text/plain');
}

export function downloadSingleInsight(insight, meetingId, format) {
  const slug = insight.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  let content, ext;
  switch (format) {
    case 'json': content = singleInsightToJSON(insight);     ext = 'json'; break;
    case 'md':   content = singleInsightToMarkdown(insight); ext = 'md';   break;
    default:     content = singleInsightToTXT(insight);      ext = 'txt';  break;
  }
  triggerDownload(content, `insight-${slug}.${ext}`, MIME[ext] || 'text/plain');
}

// ═════════════════════════════════════════════════════════════════
// Call Intelligence report formatter
// ═════════════════════════════════════════════════════════════════

export function intelligenceToMarkdown(ci, meetingId) {
  const lines = [];
  lines.push('# Call Intelligence Report');
  lines.push(`**Meeting ID:** \`${meetingId || 'Unknown'}\``);
  lines.push(`**Exported:** ${ts()}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`## Overview`);
  lines.push(`- **Call Type:** ${ci.callType || '—'}`);
  lines.push(`- **Framework:** ${ci.framework || '—'}`);
  lines.push(`- **Effectiveness:** ${ci.effectiveness}/10`);
  lines.push(`- **Customer Sentiment:** ${ci.customerSentiment?.label || '—'} (${ci.customerSentiment?.score}/10)`);
  lines.push(`- **Questions Answered:** ${ci.questionsAnsweredPct}%`);
  lines.push('');
  if (ci.callSummary) {
    lines.push('## Summary');
    lines.push(ci.callSummary);
    lines.push('');
  }
  if (ci.keyThemes?.length) {
    lines.push('## Key Themes');
    ci.keyThemes.forEach(t => lines.push(`- ${t}`));
    lines.push('');
  }
  if (ci.customerSentiment) {
    const s = ci.customerSentiment;
    lines.push('## Sentiment Breakdown');
    lines.push('');
    lines.push(`| Positive | Neutral | Negative |`);
    lines.push(`|----------|---------|----------|`);
    lines.push(`| ${s.positive}% | ${s.neutral}% | ${s.negative}% |`);
    lines.push('');
  }
  if (ci.frameworkCoverage?.length) {
    lines.push(`## Framework Coverage · ${ci.framework}`);
    ci.frameworkCoverage.forEach(d => lines.push(`- [${d.covered ? 'YES' : 'NO'}] ${d.dimension}`));
    lines.push('');
  }
  if (ci.sentimentDrivers?.positive?.length) {
    lines.push('## Positive Drivers');
    ci.sentimentDrivers.positive.forEach(d => lines.push(`- ${d}`));
    lines.push('');
  }
  if (ci.sentimentDrivers?.negative?.length) {
    lines.push('## Risk Drivers');
    ci.sentimentDrivers.negative.forEach(d => lines.push(`- ${d}`));
    lines.push('');
  }
  if (ci.strengths?.length) {
    lines.push('## Strengths');
    ci.strengths.forEach(s => lines.push(`- ${s}`));
    lines.push('');
  }
  if (ci.improvements?.length) {
    lines.push('## Areas to Improve');
    ci.improvements.forEach(s => lines.push(`- ${s}`));
    lines.push('');
  }
  if (ci.nextSteps?.length) {
    lines.push('## Next Steps');
    ci.nextSteps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push('');
  }
  return lines.join('\n');
}

export function intelligenceToJSON(ci, meetingId) {
  return JSON.stringify({ source: 'CallScribe', meetingId, exportedAt: new Date().toISOString(), ...ci }, null, 2);
}

export function intelligenceToTXT(ci, meetingId) {
  const sep = '─'.repeat(50);
  const lines = [
    'CallScribe — Call Intelligence Report',
    `Meeting ID : ${meetingId || 'Unknown'}`,
    `Exported   : ${ts()}`,
    sep, '',
    `Call Type       : ${ci.callType || '—'}`,
    `Framework       : ${ci.framework || '—'}`,
    `Effectiveness   : ${ci.effectiveness}/10`,
    `Sentiment       : ${ci.customerSentiment?.label || '—'} (${ci.customerSentiment?.score}/10)`,
    `  Positive ${ci.customerSentiment?.positive}% · Neutral ${ci.customerSentiment?.neutral}% · Negative ${ci.customerSentiment?.negative}%`,
    `Q&A Coverage    : ${ci.questionsAnsweredPct}%`,
    '',
  ];
  if (ci.callSummary) { lines.push('SUMMARY', ci.callSummary, ''); }
  if (ci.keyThemes?.length) { lines.push('KEY THEMES', ...ci.keyThemes.map(t => `  · ${t}`), ''); }
  if (ci.strengths?.length) { lines.push('STRENGTHS', ...ci.strengths.map(s => `  + ${s}`), ''); }
  if (ci.improvements?.length) { lines.push('AREAS TO IMPROVE', ...ci.improvements.map(s => `  ! ${s}`), ''); }
  if (ci.nextSteps?.length) { lines.push('NEXT STEPS', ...ci.nextSteps.map((s, i) => `  ${i + 1}. ${s}`), ''); }
  return lines.join('\n');
}

export function downloadIntelligence(ci, meetingId, format) {
  const mid = (meetingId || 'callscribe').slice(-8);
  if (format === 'doc') { triggerDownload(intelligenceToWordDoc(ci, meetingId), `call-intelligence-${mid}.doc`, 'application/msword'); return; }
  let content, ext;
  switch (format) {
    case 'json': content = intelligenceToJSON(ci, meetingId);     ext = 'json'; break;
    case 'md':   content = intelligenceToMarkdown(ci, meetingId); ext = 'md';   break;
    default:     content = intelligenceToTXT(ci, meetingId);      ext = 'txt';  break;
  }
  triggerDownload(content, `call-intelligence-${mid}.${ext}`, MIME[ext] || 'text/plain');
}

// ═════════════════════════════════════════════════════════════════
// Competitors formatter
// ═════════════════════════════════════════════════════════════════

export function competitorsToMarkdown(data, meetingId) {
  const lines = ['# Competitor Analysis', `**Meeting ID:** \`${meetingId || 'Unknown'}\``, `**Exported:** ${ts()}`, ''];
  if (data.summary) { lines.push(`> ${data.summary}`, ''); }
  if (!data.competitors?.length) { lines.push('No relevant competitors detected.'); return lines.join('\n'); }
  data.competitors.forEach((c, i) => {
    lines.push(`## ${i + 1}. ${c.name}`);
    lines.push(`**Category:** ${c.category} · **Sentiment:** ${capitalize(c.sentiment)} · **Mentions:** ${c.mentions}`);
    lines.push('');
    if (c.context) { lines.push(c.context, ''); }
    if (c.quotes?.length) {
      lines.push('**Quotes:**');
      c.quotes.forEach(q => lines.push(`> "${q}"`));
      lines.push('');
    }
  });
  return lines.join('\n');
}

export function competitorsToJSON(data, meetingId) {
  return JSON.stringify({ source: 'CallScribe', meetingId, exportedAt: new Date().toISOString(), ...data }, null, 2);
}

export function competitorsToTXT(data, meetingId) {
  const sep = '─'.repeat(50);
  const lines = ['CallScribe — Competitor Analysis', `Meeting ID : ${meetingId || 'Unknown'}`, `Exported   : ${ts()}`, sep, ''];
  if (data.summary) lines.push(data.summary, '');
  (data.competitors || []).forEach((c, i) => {
    lines.push(`[${i + 1}] ${c.name.toUpperCase()}`, `    Category  : ${c.category}`, `    Sentiment : ${capitalize(c.sentiment)}  ×${c.mentions}`, '');
    if (c.context) lines.push(`    ${c.context}`, '');
    if (c.quotes?.length) { c.quotes.forEach(q => lines.push(`    "${q}"`)); lines.push(''); }
    lines.push(sep);
  });
  return lines.join('\n');
}

export function downloadCompetitors(data, meetingId, format) {
  const mid = (meetingId || 'callscribe').slice(-8);
  if (format === 'doc') { triggerDownload(competitorsToWordDoc(data, meetingId), `competitors-${mid}.doc`, 'application/msword'); return; }
  let content, ext;
  switch (format) {
    case 'json': content = competitorsToJSON(data, meetingId);     ext = 'json'; break;
    case 'md':   content = competitorsToMarkdown(data, meetingId); ext = 'md';   break;
    default:     content = competitorsToTXT(data, meetingId);      ext = 'txt';  break;
  }
  triggerDownload(content, `competitors-${mid}.${ext}`, MIME[ext] || 'text/plain');
}

// ═════════════════════════════════════════════════════════════════
// Objections formatter
// ═════════════════════════════════════════════════════════════════

export function objectionsToMarkdown(data, meetingId) {
  const lines = ['# Objection Tracker', `**Meeting ID:** \`${meetingId || 'Unknown'}\``, `**Exported:** ${ts()}`, ''];
  lines.push(`**Total:** ${data.totalCount} · **Handled:** ${data.handledCount} · **Open:** ${data.totalCount - data.handledCount}`, '');
  if (data.topRisk) { lines.push(`> **Top Risk:** ${data.topRisk}`, ''); }
  if (!data.objections?.length) { lines.push('No objections detected.'); return lines.join('\n'); }
  data.objections.forEach((obj, i) => {
    const status = obj.handled ? '✅ Handled' : '❌ Open';
    lines.push(`## ${i + 1}. ${obj.summary}`);
    lines.push(`**Severity:** ${capitalize(obj.severity)} · **Category:** ${obj.category} · **Status:** ${status}`, '');
    if (obj.quote) lines.push(`> "${obj.quote}"`, '');
    if (obj.repResponse) lines.push(`**Rep Response:** ${obj.repResponse}`, '');
    lines.push('');
  });
  return lines.join('\n');
}

export function objectionsToJSON(data, meetingId) {
  return JSON.stringify({ source: 'CallScribe', meetingId, exportedAt: new Date().toISOString(), ...data }, null, 2);
}

export function objectionsToCSV(data, meetingId) {
  const header = ['Summary', 'Category', 'Severity', 'Handled', 'Quote', 'Rep Response'].map(escape).join(',');
  const rows = (data.objections || []).map(o =>
    [o.summary, o.category, o.severity, o.handled ? 'Yes' : 'No', o.quote, o.repResponse].map(escape).join(',')
  );
  return [`# CallScribe Objections — Meeting ${meetingId || 'Unknown'} — ${ts()}`, [header, ...rows].join('\r\n')].join('\r\n');
}

export function objectionsToTXT(data, meetingId) {
  const sep = '─'.repeat(50);
  const lines = ['CallScribe — Objection Tracker', `Meeting ID : ${meetingId || 'Unknown'}`, `Exported   : ${ts()}`,
    `Total ${data.totalCount} · Handled ${data.handledCount} · Open ${data.totalCount - data.handledCount}`, sep, ''];
  if (data.topRisk) lines.push(`TOP RISK: ${data.topRisk}`, '');
  (data.objections || []).forEach((obj, i) => {
    lines.push(`[${i + 1}] ${obj.summary.toUpperCase()}`, `    Severity : ${capitalize(obj.severity)}`, `    Category : ${obj.category}`, `    Status   : ${obj.handled ? 'Handled' : 'Open'}`, '');
    if (obj.quote) lines.push(`    "${obj.quote}"`, '');
    if (obj.repResponse) lines.push(`    Rep: ${obj.repResponse}`, '');
    lines.push(sep);
  });
  return lines.join('\n');
}

export function downloadObjections(data, meetingId, format) {
  const mid = (meetingId || 'callscribe').slice(-8);
  if (format === 'doc') { triggerDownload(objectionsToWordDoc(data, meetingId), `objections-${mid}.doc`, 'application/msword'); return; }
  let content, ext;
  switch (format) {
    case 'json': content = objectionsToJSON(data, meetingId);  ext = 'json'; break;
    case 'csv':  content = objectionsToCSV(data, meetingId);   ext = 'csv';  break;
    case 'md':   content = objectionsToMarkdown(data, meetingId); ext = 'md'; break;
    default:     content = objectionsToTXT(data, meetingId);   ext = 'txt';  break;
  }
  triggerDownload(content, `objections-${mid}.${ext}`, MIME[ext] || 'text/plain');
}

// ═════════════════════════════════════════════════════════════════
// MOM formatter (download the markdown strings that are already generated)
// ═════════════════════════════════════════════════════════════════

export function downloadMOM(mom, meetingId, version, format) {
  // version: 'internal' | 'external' | 'both'
  const mid = (meetingId || 'callscribe').slice(-8);
  let content, filename;

  if (version === 'both') {
    content = `# Meeting Minutes — Internal\n\n${mom.internal}\n\n---\n\n# Meeting Minutes — External\n\n${mom.external}`;
    filename = `meeting-minutes-${mid}`;
  } else {
    content = mom[version] || '';
    filename = `meeting-minutes-${version}-${mid}`;
  }

  if (format === 'txt') {
    // Strip markdown symbols for plain text
    content = content
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/^[-*]\s/gm, '  · ')
      .replace(/^\d+\.\s/gm, (m) => `  ${m}`)
      .replace(/^\|.*\|$/gm, '')      // remove table rows
      .replace(/^---$/gm, '─'.repeat(50));
    triggerDownload(content, `${filename}.txt`, 'text/plain');
  } else {
    triggerDownload(content, `${filename}.md`, 'text/markdown');
  }
}

// ═════════════════════════════════════════════════════════════════
// Chat history formatter
// ═════════════════════════════════════════════════════════════════

export function chatToMarkdown(messages, meetingId) {
  const lines = ['# Chat History', `**Meeting ID:** \`${meetingId || 'Unknown'}\``, `**Exported:** ${ts()}`, '', '---', ''];
  messages.forEach(m => {
    if (m.error || m.pending) return;
    lines.push(`**${m.role === 'user' ? 'You' : 'Claude'}**`, '', m.content, '', '---', '');
  });
  return lines.join('\n');
}

export function chatToTXT(messages, meetingId) {
  const sep = '─'.repeat(50);
  const lines = ['CallScribe — Chat History', `Meeting ID : ${meetingId || 'Unknown'}`, `Exported   : ${ts()}`, sep, ''];
  messages.forEach(m => {
    if (m.error || m.pending) return;
    lines.push(`[${m.role === 'user' ? 'YOU' : 'CLAUDE'}]`, m.content, '', sep, '');
  });
  return lines.join('\n');
}

export function chatToJSON(messages, meetingId) {
  return JSON.stringify({
    source: 'CallScribe', meetingId, exportedAt: new Date().toISOString(),
    messages: messages.filter(m => !m.error && !m.pending).map(m => ({ role: m.role, content: m.content })),
  }, null, 2);
}

export function downloadChat(messages, meetingId, format) {
  const mid = (meetingId || 'callscribe').slice(-8);
  let content, ext;
  switch (format) {
    case 'json': content = chatToJSON(messages, meetingId);     ext = 'json'; break;
    case 'md':   content = chatToMarkdown(messages, meetingId); ext = 'md';   break;
    default:     content = chatToTXT(messages, meetingId);      ext = 'txt';  break;
  }
  triggerDownload(content, `chat-${mid}.${ext}`, MIME[ext] || 'text/plain');
}

// ═════════════════════════════════════════════════════════════════
// Word-compatible HTML (.doc) helpers
// ═════════════════════════════════════════════════════════════════

function escapeHTML(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapWordHTML(title, bodyHtml, meetingId) {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${escapeHTML(title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #333; margin: 2cm; }
  h1 { font-size: 18pt; color: #0D1726; border-bottom: 2px solid #E55014; padding-bottom: 6pt; }
  h2 { font-size: 14pt; color: #E55014; margin-top: 18pt; }
  h3 { font-size: 12pt; color: #0D1726; margin-top: 12pt; }
  .meta { color: #888; font-size: 9pt; margin-bottom: 12pt; }
  .badge { background: #E55014; color: white; padding: 1pt 5pt; border-radius: 2pt; font-size: 8pt; }
  .badge-navy { background: #0D1726; color: white; padding: 1pt 5pt; border-radius: 2pt; font-size: 8pt; }
  .badge-green { background: #16a34a; color: white; padding: 1pt 5pt; border-radius: 2pt; font-size: 8pt; }
  .badge-amber { background: #d97706; color: white; padding: 1pt 5pt; border-radius: 2pt; font-size: 8pt; }
  .badge-gray  { background: #6b7280; color: white; padding: 1pt 5pt; border-radius: 2pt; font-size: 8pt; }
  p { margin: 4pt 0; line-height: 1.5; }
  ul, ol { margin: 6pt 0 6pt 18pt; }
  li { margin: 3pt 0; }
  hr { border: none; border-top: 1px solid #E4E9F0; margin: 12pt 0; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  th { background: #F5F7FA; border: 1px solid #E4E9F0; padding: 5pt 8pt; text-align: left; font-size: 9pt; text-transform: uppercase; }
  td { border: 1px solid #E4E9F0; padding: 5pt 8pt; vertical-align: top; }
  blockquote { border-left: 3px solid #E55014; margin: 8pt 0 8pt 12pt; padding-left: 8pt; color: #666; font-style: italic; }
</style>
</head>
<body>
<h1>${escapeHTML(title)}</h1>
<p class="meta">Meeting ID: ${escapeHTML(meetingId || 'Unknown')} &nbsp;·&nbsp; Exported: ${ts()}</p>
<hr>
${bodyHtml}
</body>
</html>`;
}

function prioClass(p) {
  const m = { critical: 'badge', high: 'badge', medium: 'badge-amber', low: 'badge-gray' };
  return m[(p || 'medium').toLowerCase()] || 'badge-amber';
}

export function insightsToWordDoc(insights, meetingId) {
  const sorted = sortInsights(insights);
  const body = sorted.map(i => `
<h3>${escapeHTML(i.title)}</h3>
<p><span class="${prioClass(i.priority)}">${capitalize(i.priority)}</span>
&nbsp; <span class="badge-navy">${capitalize(i.type)}</span>
&nbsp; <strong>Area:</strong> ${escapeHTML(i.productArea || '—')}</p>
<p>${escapeHTML(i.description || '')}</p>
<hr>`).join('\n');
  return wrapWordHTML('Product Gaps Report', body, meetingId);
}

export function intelligenceToWordDoc(ci, meetingId) {
  let body = `
<h2>Overview</h2>
<table>
  <tr><th>Metric</th><th>Value</th></tr>
  <tr><td>Call Type</td><td>${escapeHTML(ci.callType || '—')}</td></tr>
  <tr><td>Framework</td><td>${escapeHTML(ci.framework || '—')}</td></tr>
  <tr><td>Effectiveness</td><td>${ci.effectiveness}/10</td></tr>
  <tr><td>Sentiment</td><td>${escapeHTML(ci.customerSentiment?.label || '—')} (${ci.customerSentiment?.score}/10)</td></tr>
  <tr><td>Sentiment Split</td><td>+${ci.customerSentiment?.positive}% Positive · ${ci.customerSentiment?.neutral}% Neutral · ${ci.customerSentiment?.negative}% Negative</td></tr>
  <tr><td>Q&amp;A Coverage</td><td>${ci.questionsAnsweredPct}%</td></tr>
</table>`;
  if (ci.callSummary) body += `<h2>Summary</h2><p>${escapeHTML(ci.callSummary)}</p>`;
  if (ci.keyThemes?.length) body += `<h2>Key Themes</h2><ul>${ci.keyThemes.map(t => `<li>${escapeHTML(t)}</li>`).join('')}</ul>`;
  if (ci.strengths?.length) body += `<h2>Strengths</h2><ul>${ci.strengths.map(s => `<li>${escapeHTML(s)}</li>`).join('')}</ul>`;
  if (ci.improvements?.length) body += `<h2>Areas to Improve</h2><ul>${ci.improvements.map(s => `<li>${escapeHTML(s)}</li>`).join('')}</ul>`;
  if (ci.nextSteps?.length) body += `<h2>Next Steps</h2><ol>${ci.nextSteps.map(s => `<li>${escapeHTML(s)}</li>`).join('')}</ol>`;
  if (ci.frameworkCoverage?.length) {
    body += `<h2>Framework Coverage · ${escapeHTML(ci.framework)}</h2><table><tr><th>Dimension</th><th>Status</th></tr>`;
    ci.frameworkCoverage.forEach(d => { body += `<tr><td>${escapeHTML(d.dimension)}</td><td>${d.covered ? 'Covered' : 'Not covered'}</td></tr>`; });
    body += '</table>';
  }
  return wrapWordHTML('Call Intelligence Report', body, meetingId);
}

export function objectionsToWordDoc(data, meetingId) {
  const sevClass = { blocking: 'badge', moderate: 'badge-amber', minor: 'badge-gray' };
  let body = `
<h2>Summary</h2>
<table>
  <tr><th>Total</th><th>Handled</th><th>Open</th></tr>
  <tr><td>${data.totalCount}</td><td>${data.handledCount}</td><td>${data.totalCount - data.handledCount}</td></tr>
</table>`;
  if (data.topRisk) body += `<p><strong>Top Risk:</strong> ${escapeHTML(data.topRisk)}</p>`;
  (data.objections || []).forEach((obj, i) => {
    const sc = sevClass[obj.severity] || 'badge-gray';
    body += `<h3>${i + 1}. ${escapeHTML(obj.summary)}</h3>
<p><span class="${sc}">${capitalize(obj.severity)}</span> &nbsp;
<span class="badge-navy">${escapeHTML(obj.category)}</span> &nbsp;
<span class="${obj.handled ? 'badge-green' : 'badge-gray'}">${obj.handled ? '✓ Handled' : 'Open'}</span></p>`;
    if (obj.quote) body += `<blockquote>"${escapeHTML(obj.quote)}"</blockquote>`;
    if (obj.repResponse) body += `<p><strong>Rep response:</strong> ${escapeHTML(obj.repResponse)}</p>`;
    body += '<hr>';
  });
  return wrapWordHTML('Objection Tracker', body, meetingId);
}

export function competitorsToWordDoc(data, meetingId) {
  let body = '';
  if (data.summary) body += `<p>${escapeHTML(data.summary)}</p><hr>`;
  (data.competitors || []).forEach((c, i) => {
    const sClass = { positive: 'badge-green', negative: 'badge', neutral: 'badge-gray' };
    body += `<h3>${i + 1}. ${escapeHTML(c.name)}</h3>
<p><span class="badge-navy">${escapeHTML(c.category)}</span> &nbsp;
<span class="${sClass[c.sentiment] || 'badge-gray'}">${capitalize(c.sentiment)}</span> &nbsp;
×${c.mentions} mention${c.mentions !== 1 ? 's' : ''}</p>`;
    if (c.context) body += `<p>${escapeHTML(c.context)}</p>`;
    if (c.quotes?.length) { body += '<ul>'; c.quotes.forEach(q => { body += `<li><em>"${escapeHTML(q)}"</em></li>`; }); body += '</ul>'; }
    body += '<hr>';
  });
  return wrapWordHTML('Competitor Analysis', body, meetingId);
}

export function momToWordDoc(mom, meetingId) {
  // mom.internal and mom.external are Markdown strings — convert basic MD to HTML
  function mdToHTML(md) {
    if (!md) return '';
    return md
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
      .replace(/^---$/gm, '<hr>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[hup]|<li|<hr)(.+)$/gm, '$1<br>');
  }
  let body = '';
  if (mom.internal) body += `<h2>Internal — Team Use Only</h2>${mdToHTML(mom.internal)}<hr>`;
  if (mom.external) body += `<h2>External — Client Facing</h2>${mdToHTML(mom.external)}`;
  return wrapWordHTML('Meeting Minutes', body, meetingId);
}

// ═════════════════════════════════════════════════════════════════
// Updated download functions with doc format support
// ═════════════════════════════════════════════════════════════════

export function downloadInsightsDoc(insights, meetingId) {
  const mid = (meetingId || 'callscribe').slice(-8);
  triggerDownload(insightsToWordDoc(insights, meetingId), `product-gaps-${mid}.doc`, 'application/msword');
}

export function downloadIntelligenceDoc(ci, meetingId) {
  const mid = (meetingId || 'callscribe').slice(-8);
  triggerDownload(intelligenceToWordDoc(ci, meetingId), `call-intelligence-${mid}.doc`, 'application/msword');
}

export function downloadObjectionsDoc(data, meetingId) {
  const mid = (meetingId || 'callscribe').slice(-8);
  triggerDownload(objectionsToWordDoc(data, meetingId), `objections-${mid}.doc`, 'application/msword');
}

export function downloadCompetitorsDoc(data, meetingId) {
  const mid = (meetingId || 'callscribe').slice(-8);
  triggerDownload(competitorsToWordDoc(data, meetingId), `competitors-${mid}.doc`, 'application/msword');
}

export function downloadMOMDoc(mom, meetingId) {
  const mid = (meetingId || 'callscribe').slice(-8);
  triggerDownload(momToWordDoc(mom, meetingId), `meeting-minutes-${mid}.doc`, 'application/msword');
}

// ═════════════════════════════════════════════════════════════════
// Executive Summary formatter
// ═════════════════════════════════════════════════════════════════

const EXEC_SCORE_LABELS = { 1: 'Poor', 2: 'Weak', 3: 'Moderate', 4: 'Good', 5: 'Excellent' };
const EXEC_SCORE_KEYS = {
  storytellingFlow:       'Storytelling & Flow',
  useCaseAlignment:       'Use Case Alignment',
  featureValueMapping:    'Feature-to-Value Mapping',
  differentiationClarity: 'Differentiation Clarity',
  objectionHandling:      'Objection Handling',
  overallEffectiveness:   'Overall Effectiveness',
};
const EXEC_SECTION_KEYS = [
  { key: 'storyline',           title: '1. Demo Storyline & Flow' },
  { key: 'useCases',            title: '2. Use Cases & Product Positioning' },
  { key: 'featureDemoQuality',  title: '3. Feature Demonstration Quality' },
  { key: 'differentiation',     title: '4. Whatfix Differentiation Analysis' },
  { key: 'questionsObjections', title: '5. Customer Questions, Objections & Responses' },
  { key: 'infosec',             title: '6. InfoSec / Deployment Deep Dive' },
  { key: 'gaps',                title: '7. Gaps & Missed Opportunities' },
  { key: 'improvements',        title: '8. Opportunities & Improvements' },
];

function execMdToHTML(md) {
  if (!md) return '';
  return md
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>(\n|$))+/g, m => `<ul>${m}</ul>`)
    .replace(/^---$/gm, '<hr>')
    .replace(/\n\n/g, '</p><p>');
}

const Q_CAT_LABEL_MD = {
  'product-capability': 'Product Capability',
  'use-case-fit':       'Use Case Fit',
  'pricing-roi':        'Pricing / ROI',
  'competition':        'Competition',
  'implementation':     'Implementation',
  'security-infosec':   'Security / InfoSec',
};

export function execSummaryToMarkdown(data, meetingId) {
  const lines = [
    '# Executive Demo Analysis',
    `**Meeting ID:** \`${meetingId || 'Unknown'}\``,
    `**Exported:** ${ts()}`,
    '',
    '---',
    '',
    '## Demo Effectiveness Scores',
    '',
  ];
  Object.entries(EXEC_SCORE_KEYS).forEach(([key, label]) => {
    const s = data.scores?.[key];
    if (s) lines.push(`- **${label}:** ${s.score}/5 (${EXEC_SCORE_LABELS[s.score] || ''}) — ${s.rationale}`);
  });
  lines.push('');
  if (data.executiveSummary?.length) {
    lines.push('## Executive Summary', '');
    data.executiveSummary.forEach(b => lines.push(`- ${b}`));
    lines.push('');
  }
  if (data.storyline)    lines.push('## 1. Demo Storyline & Flow', '', data.storyline, '', '---', '');
  if (data.useCases)     lines.push('## 2. Use Cases & Product Positioning', '', data.useCases, '', '---', '');
  if (data.features?.length) {
    lines.push('## 3. Feature Demonstration Quality', '');
    lines.push('| Feature | Module | Use Case | Quality |');
    lines.push('|---------|--------|----------|---------|');
    data.features.forEach(f => {
      const quality = `${f.quality || ''}${f.valueArticulated ? ' — value articulated' : ''}`;
      lines.push(`| ${tc(f.name)} | ${tc(f.module)} | ${tc(f.useCase)} | ${tc(quality)} |`);
    });
    lines.push('', '---', '');
  }
  if (data.differentiation) {
    const d = data.differentiation;
    lines.push('## 4. Whatfix Differentiation Analysis', '');
    lines.push(`**Why Whatfix?** ${d.whyWhatfix || '—'}  |  **vs Others?** ${d.vsOthers || '—'}  |  **Overall:** ${d.overallRating || '—'}`, '');
    if (d.shown?.length) {
      lines.push('### Differentiators Presented', '');
      d.shown.forEach(s => lines.push(`- ${s.differentiator} (${s.positioning})`));
      lines.push('');
    }
    if (d.missedNow?.length) {
      lines.push('### Could Have Introduced', '');
      d.missedNow.forEach(s => lines.push(`- ${s}`));
      lines.push('');
    }
    if (d.saveLater?.length) {
      lines.push('### Save for Later', '');
      d.saveLater.forEach(s => lines.push(`- ${s}`));
      lines.push('');
    }
    lines.push('---', '');
  }
  if (data.questions?.length) {
    lines.push('## 5. Customer Questions, Objections & Responses', '');
    lines.push('| # | Question | Category | Quality | Response |');
    lines.push('|---|----------|----------|---------|----------|');
    data.questions.forEach((q, i) => {
      const quality = tc(q.quality) + (q.urgency === 'now' ? ' — Address Now' : '');
      lines.push(`| ${i + 1} | ${tc(q.question)} | ${tc(Q_CAT_LABEL_MD[q.category] || q.category)} | ${quality} | ${tc(q.response)} |`);
    });
    lines.push('', '---', '');
  }
  if (data.infosec)      lines.push('## 6. InfoSec / Deployment Deep Dive', '', data.infosec, '', '---', '');
  if (data.gaps)         lines.push('## 7. Gaps & Missed Opportunities', '', data.gaps, '', '---', '');
  if (data.improvements) lines.push('## 8. Opportunities & Improvements', '', data.improvements, '', '---', '');
  if (data.followUpActions?.length) {
    lines.push('## Follow-up Actions', '');
    data.followUpActions.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
    lines.push('');
  }
  return lines.join('\n');
}

export function execSummaryToWordDoc(data, meetingId) {
  const scoreColors = { 1: '#dc2626', 2: '#f97316', 3: '#d97706', 4: '#16a34a', 5: '#15803d' };
  const qualColors  = { complete: '#16a34a', partial: '#d97706', deflected: '#f97316', unanswered: '#dc2626' };

  let body = '<h2>Demo Effectiveness Scores</h2>';
  body += '<table><tr><th>Dimension</th><th>Score</th><th>Rating</th><th>Rationale</th></tr>';
  Object.entries(EXEC_SCORE_KEYS).forEach(([key, label]) => {
    const s = data.scores?.[key];
    if (!s) return;
    const col = scoreColors[s.score] || '#6b7280';
    body += `<tr>
      <td><strong>${escapeHTML(label)}</strong></td>
      <td style="text-align:center;font-size:18pt;font-weight:bold;color:${col}">${s.score}</td>
      <td><span style="color:${col};font-weight:bold">${EXEC_SCORE_LABELS[s.score] || ''}</span></td>
      <td>${escapeHTML(s.rationale || '')}</td>
    </tr>`;
  });
  body += '</table>';

  if (data.executiveSummary?.length) {
    body += '<h2>Executive Summary</h2><ul>';
    data.executiveSummary.forEach(b => { body += `<li>${escapeHTML(b)}</li>`; });
    body += '</ul><hr>';
  }

  if (data.followUpActions?.length) {
    body += '<h2>Follow-up Actions</h2><ol>';
    data.followUpActions.forEach(a => { body += `<li>${escapeHTML(a)}</li>`; });
    body += '</ol><hr>';
  }

  if (data.storyline) { body += '<h2>1. Demo Storyline &amp; Flow</h2>' + execMdToHTML(data.storyline) + '<hr>'; }
  if (data.useCases)  { body += '<h2>2. Use Cases &amp; Product Positioning</h2>' + execMdToHTML(data.useCases) + '<hr>'; }

  if (data.features?.length) {
    body += '<h2>3. Feature Demonstration Quality</h2>';
    body += '<table><tr><th>Feature</th><th>Module</th><th>Use Case</th><th>Quality</th></tr>';
    data.features.forEach(f => {
      const col = f.quality === 'strong' ? '#16a34a' : f.quality === 'moderate' ? '#d97706' : '#dc2626';
      body += `<tr>
        <td><strong>${escapeHTML(f.name)}</strong></td>
        <td>${escapeHTML(f.module || '')}</td>
        <td>${escapeHTML(f.useCase || '')}</td>
        <td><span style="color:${col};font-weight:bold">${escapeHTML(f.quality || '')}${f.valueArticulated ? ' — value articulated' : ''}</span></td>
      </tr>`;
    });
    body += '</table><hr>';
  }

  if (data.differentiation) {
    const d = data.differentiation;
    body += '<h2>4. Whatfix Differentiation Analysis</h2>';
    body += `<p><strong>Why Whatfix?</strong> ${escapeHTML(d.whyWhatfix || '—')} &nbsp;|&nbsp; <strong>vs Others?</strong> ${escapeHTML(d.vsOthers || '—')} &nbsp;|&nbsp; <strong>Overall:</strong> ${escapeHTML(d.overallRating || '—')}</p>`;
    if (d.shown?.length) {
      body += '<h3>Differentiators Presented</h3><ul>';
      d.shown.forEach(s => { body += `<li><strong>${escapeHTML(s.differentiator)}</strong> — ${escapeHTML(s.positioning)}</li>`; });
      body += '</ul>';
    }
    if (d.missedNow?.length) {
      body += '<h3>Could Have Introduced</h3><ul>';
      d.missedNow.forEach(s => { body += `<li>${escapeHTML(s)}</li>`; });
      body += '</ul>';
    }
    if (d.saveLater?.length) {
      body += '<h3>Save for Later</h3><ul>';
      d.saveLater.forEach(s => { body += `<li>${escapeHTML(s)}</li>`; });
      body += '</ul>';
    }
    body += '<hr>';
  }

  if (data.questions?.length) {
    body += '<h2>5. Customer Questions, Objections &amp; Responses</h2>';
    body += '<table><tr><th>#</th><th>Question</th><th>Category</th><th>Quality</th><th>Response</th></tr>';
    data.questions.forEach((q, i) => {
      const col = qualColors[q.quality] || '#6b7280';
      body += `<tr>
        <td>${i + 1}</td>
        <td>${escapeHTML(q.question)}</td>
        <td>${escapeHTML(Q_CAT_LABEL_MD[q.category] || q.category || '')}</td>
        <td><span style="color:${col};font-weight:bold">${escapeHTML(q.quality)}${q.urgency === 'now' ? ' — Address Now' : ''}</span></td>
        <td>${escapeHTML(q.response || '')}</td>
      </tr>`;
    });
    body += '</table><hr>';
  }

  if (data.infosec)      { body += '<h2>6. InfoSec / Deployment Deep Dive</h2>'    + execMdToHTML(data.infosec)      + '<hr>'; }
  if (data.gaps)         { body += '<h2>7. Gaps &amp; Missed Opportunities</h2>'   + execMdToHTML(data.gaps)         + '<hr>'; }
  if (data.improvements) { body += '<h2>8. Opportunities &amp; Improvements</h2>'  + execMdToHTML(data.improvements) + '<hr>'; }

  return wrapWordHTML('Executive Demo Analysis', body, meetingId);
}

export function downloadExecSummary(data, meetingId, format) {
  const mid = (meetingId || 'callscribe').slice(-8);
  if (format === 'doc') {
    triggerDownload(execSummaryToWordDoc(data, meetingId), `exec-summary-${mid}.doc`, 'application/msword');
    return;
  }
  const md = execSummaryToMarkdown(data, meetingId);
  if (format === 'txt') {
    const plain = md
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/^[-*]\s/gm, '  · ')
      .replace(/^\d+\.\s/gm, m => `  ${m}`)
      .replace(/^---$/gm, '─'.repeat(50));
    triggerDownload(plain, `exec-summary-${mid}.txt`, 'text/plain');
  } else {
    triggerDownload(md, `exec-summary-${mid}.md`, 'text/markdown');
  }
}

// ═════════════════════════════════════════════════════════════════
// Collective "Full Report" download
// ═════════════════════════════════════════════════════════════════

export function downloadFullReport(state, format) {
  const { insights, callIntelligence: ci, competitors, objections, mom, demoScope, execSummary, solutionFramework, solutionFrameworkAnalyses, chatMessages: messages, meetingId } = state;
  const mid = (meetingId || 'callscribe').slice(-8);

  if (format === 'doc') {
    let body = '';

    // ── 1. Call Intelligence ──────────────────────────────────────
    if (ci && ci !== 'loading') {
      body += `<h2>Call Intelligence</h2>`;
      body += `<table>
  <tr><th>Metric</th><th>Value</th></tr>
  <tr><td>Call Type</td><td>${escapeHTML(ci.callType || '—')}</td></tr>
  <tr><td>Framework</td><td>${escapeHTML(ci.framework || '—')}</td></tr>
  <tr><td>Effectiveness</td><td>${ci.effectiveness}/10</td></tr>
  <tr><td>Questions Answered</td><td>${ci.questionsAnsweredPct}%</td></tr>
  <tr><td>Talk Ratio (Rep / Customer)</td><td>${ci.talkRatio?.rep || '—'}% / ${ci.talkRatio?.customer || '—'}%</td></tr>
  <tr><td>Interruptions</td><td>${ci.interrupts ?? '—'}</td></tr>
  <tr><td>Sentiment</td><td>${escapeHTML(ci.customerSentiment?.label || '—')} (score ${ci.customerSentiment?.score}/10)</td></tr>
  <tr><td>Sentiment Split</td><td>Positive ${ci.customerSentiment?.positive}% · Neutral ${ci.customerSentiment?.neutral}% · Negative ${ci.customerSentiment?.negative}%</td></tr>
</table>`;
      if (ci.callSummary) body += `<h3>Summary</h3><p>${escapeHTML(ci.callSummary)}</p>`;
      if (ci.keyThemes?.length) {
        body += `<h3>Key Themes</h3><ul>${ci.keyThemes.map(t => `<li>${escapeHTML(t)}</li>`).join('')}</ul>`;
      }
      if (ci.frameworkCoverage?.length) {
        body += `<h3>Framework Coverage — ${escapeHTML(ci.framework)}</h3><table><tr><th>Dimension</th><th>Covered</th></tr>`;
        ci.frameworkCoverage.forEach(d => { body += `<tr><td>${escapeHTML(d.dimension)}</td><td>${d.covered ? 'Yes' : 'No'}</td></tr>`; });
        body += '</table>';
      }
      if (ci.sentimentDrivers?.positive?.length) {
        body += `<h3>Positive Sentiment Drivers</h3><ul>${ci.sentimentDrivers.positive.map(d => `<li>${escapeHTML(d)}</li>`).join('')}</ul>`;
      }
      if (ci.sentimentDrivers?.negative?.length) {
        body += `<h3>Negative Sentiment Drivers</h3><ul>${ci.sentimentDrivers.negative.map(d => `<li>${escapeHTML(d)}</li>`).join('')}</ul>`;
      }
      if (ci.strengths?.length) {
        body += `<h3>Strengths</h3><ul>${ci.strengths.map(s => `<li>${escapeHTML(s)}</li>`).join('')}</ul>`;
      }
      if (ci.improvements?.length) {
        body += `<h3>Areas to Improve</h3><ul>${ci.improvements.map(s => `<li>${escapeHTML(s)}</li>`).join('')}</ul>`;
      }
      if (ci.nextSteps?.length) {
        body += `<h3>Recommended Next Steps</h3><ol>${ci.nextSteps.map(s => `<li>${escapeHTML(s)}</li>`).join('')}</ol>`;
      }
      body += '<hr>';
    }

    // ── 2. Product Gaps ───────────────────────────────────────────
    if (insights?.length > 0) {
      const sorted = sortInsights(insights);
      body += `<h2>Product Gaps (${insights.length})</h2>`;
      sorted.forEach(i => {
        body += `<h3>${escapeHTML(i.title)}</h3>`;
        body += `<p><span class="${prioClass(i.priority)}">${capitalize(i.priority)}</span> &nbsp; <span class="badge-navy">${capitalize(i.type)}</span> &nbsp; <strong>Product Area:</strong> ${escapeHTML(i.productArea || '—')}</p>`;
        if (i.description) body += `<p>${escapeHTML(i.description)}</p>`;
        body += '<hr>';
      });
    }

    // ── 3. Competitor Analysis ────────────────────────────────────
    if (competitors && competitors !== 'loading' && competitors.competitors?.length > 0) {
      body += `<h2>Competitor Analysis (${competitors.competitors.length})</h2>`;
      if (competitors.summary) body += `<p>${escapeHTML(competitors.summary)}</p>`;
      competitors.competitors.forEach((c, i) => {
        const sClass = { positive: 'badge-green', negative: 'badge', neutral: 'badge-gray' };
        body += `<h3>${i + 1}. ${escapeHTML(c.name)}</h3>`;
        body += `<p><span class="badge-navy">${escapeHTML(c.category)}</span> &nbsp; <span class="${sClass[c.sentiment] || 'badge-gray'}">${capitalize(c.sentiment)}</span> &nbsp; ${c.mentions} mention${c.mentions !== 1 ? 's' : ''}</p>`;
        if (c.context) body += `<p>${escapeHTML(c.context)}</p>`;
        if (c.quotes?.length) { body += '<ul>'; c.quotes.forEach(q => { body += `<li><em>"${escapeHTML(q)}"</em></li>`; }); body += '</ul>'; }
        body += '<hr>';
      });
    }

    // ── 4. Objection Tracker ──────────────────────────────────────
    if (objections && objections !== 'loading' && objections.objections?.length > 0) {
      const sevClass = { blocking: 'badge', moderate: 'badge-amber', minor: 'badge-gray' };
      body += `<h2>Objection Tracker</h2>`;
      body += `<table><tr><th>Total</th><th>Handled</th><th>Open</th></tr>`;
      body += `<tr><td>${objections.totalCount}</td><td>${objections.handledCount}</td><td>${objections.totalCount - objections.handledCount}</td></tr></table>`;
      if (objections.topRisk) body += `<p><strong>Top Unresolved Risk:</strong> ${escapeHTML(objections.topRisk)}</p>`;
      objections.objections.forEach((obj, i) => {
        body += `<h3>${i + 1}. ${escapeHTML(obj.summary)}</h3>`;
        body += `<p><span class="${sevClass[obj.severity] || 'badge-gray'}">${capitalize(obj.severity)}</span> &nbsp; <span class="badge-navy">${escapeHTML(obj.category)}</span> &nbsp; <span class="${obj.handled ? 'badge-green' : 'badge-gray'}">${obj.handled ? 'Handled' : 'Open'}</span></p>`;
        if (obj.quote) body += `<blockquote>"${escapeHTML(obj.quote)}"</blockquote>`;
        if (obj.repResponse) body += `<p><strong>Rep response:</strong> ${escapeHTML(obj.repResponse)}</p>`;
        body += '<hr>';
      });
    }

    // ── 5. Meeting Minutes ────────────────────────────────────────
    if (mom && mom !== 'loading' && (mom.internal || mom.external)) {
      function mdToHTML(md) {
        if (!md) return '';
        return md
          .replace(/^#{1,6}\s+(.+)$/gm, (_, t) => `<p><strong>${escapeHTML(t)}</strong></p>`)
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
          .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
          .replace(/^---$/gm, '<hr>')
          .replace(/\n\n/g, '</p><p>')
          .replace(/^(?!<[huplb]|<hr)(.+)$/gm, '$1<br>');
      }
      body += `<h2>Meeting Minutes</h2>`;
      if (mom.internal) body += `<h3>Internal — Team Use Only</h3>${mdToHTML(mom.internal)}`;
      if (mom.external) body += `<h3>External — Client Facing</h3>${mdToHTML(mom.external)}`;
      body += '<hr>';
    }

    // ── 6. Demo Scope ─────────────────────────────────────────────
    if (demoScope && demoScope !== 'loading') {
      body += `<h2>Demo Scope Advisor</h2>`;
      body += `<table>
  <tr><th>Field</th><th>Value</th></tr>
  <tr><td>Call Stage</td><td>${escapeHTML(capitalize(demoScope.callStage))}</td></tr>
  <tr><td>Client Platform</td><td>${escapeHTML(capitalize(demoScope.clientPlatform))}</td></tr>`;
      if (demoScope.prospect?.name) body += `<tr><td>Prospect</td><td>${escapeHTML(demoScope.prospect.name)}</td></tr>`;
      if (demoScope.prospect?.industry) body += `<tr><td>Industry</td><td>${escapeHTML(demoScope.prospect.industry)}</td></tr>`;
      if (demoScope.prospect?.useCase) body += `<tr><td>Use Case</td><td>${escapeHTML(demoScope.prospect.useCase)}</td></tr>`;
      body += `</table>`;
      if (demoScope.pocScope?.note) body += `<p><strong>POC Scope:</strong> ${escapeHTML(demoScope.pocScope.note)}</p>`;
      if (demoScope.summary) body += `<p>${escapeHTML(demoScope.summary)}</p>`;
      if (demoScope.recommendations?.length) {
        body += `<h3>Recommended Environments</h3>`;
        demoScope.recommendations.forEach((r, i) => {
          const env = r.env;
          body += `<h4>${i + 1}. ${escapeHTML(env?.name || `Environment ${r.envId}`)}</h4>`;
          body += `<p><strong>Domain:</strong> ${escapeHTML(env?.domain || '—')} &nbsp; <strong>Type:</strong> ${escapeHTML(env?.type || '—')} &nbsp; <strong>Application:</strong> ${escapeHTML(env?.application || '—')}</p>`;
          if (r.reason) body += `<p><strong>Reason:</strong> ${escapeHTML(r.reason)}</p>`;
          if (r.cloneNeeded) body += `<p><strong>Clone Required</strong>${r.cloneNote ? ': ' + escapeHTML(r.cloneNote) : ''}</p>`;
        });
      }
      body += '<hr>';
    }

    // ── 7. Executive Demo Analysis ────────────────────────────────
    if (execSummary && execSummary !== 'loading') {
      const scoreColors = { 1: '#dc2626', 2: '#f97316', 3: '#d97706', 4: '#16a34a', 5: '#15803d' };
      const qualColors  = { complete: '#16a34a', partial: '#d97706', deflected: '#f97316', unanswered: '#dc2626' };
      body += `<h2>Executive Demo Analysis</h2>`;
      body += `<h3>Demo Effectiveness Scores</h3><table><tr><th>Dimension</th><th>Score</th><th>Rating</th><th>Rationale</th></tr>`;
      Object.entries(EXEC_SCORE_KEYS).forEach(([key, label]) => {
        const s = execSummary.scores?.[key];
        if (!s) return;
        const col = scoreColors[s.score] || '#6b7280';
        body += `<tr><td><strong>${escapeHTML(label)}</strong></td><td style="text-align:center;font-weight:bold;color:${col}">${s.score}/5</td><td style="color:${col};font-weight:bold">${EXEC_SCORE_LABELS[s.score] || ''}</td><td>${escapeHTML(s.rationale || '')}</td></tr>`;
      });
      body += `</table>`;
      if (execSummary.executiveSummary?.length) {
        body += `<h3>Executive Summary</h3><ul>${execSummary.executiveSummary.map(b => `<li>${escapeHTML(b)}</li>`).join('')}</ul>`;
      }
      if (execSummary.followUpActions?.length) {
        body += `<h3>Follow-up Actions</h3><ol>${execSummary.followUpActions.map(a => `<li>${escapeHTML(a)}</li>`).join('')}</ol>`;
      }
      if (execSummary.storyline) body += `<h3>1. Demo Storyline &amp; Flow</h3>${execMdToHTML(execSummary.storyline)}`;
      if (execSummary.useCases)  body += `<h3>2. Use Cases &amp; Product Positioning</h3>${execMdToHTML(execSummary.useCases)}`;
      if (execSummary.features?.length) {
        body += `<h3>3. Feature Demonstration Quality</h3><table><tr><th>Feature</th><th>Module</th><th>Use Case</th><th>Quality</th></tr>`;
        execSummary.features.forEach(f => {
          const col = f.quality === 'strong' ? '#16a34a' : f.quality === 'moderate' ? '#d97706' : '#dc2626';
          body += `<tr><td><strong>${escapeHTML(f.name)}</strong></td><td>${escapeHTML(f.module || '')}</td><td>${escapeHTML(f.useCase || '')}</td><td style="color:${col};font-weight:bold">${escapeHTML(f.quality || '')}${f.valueArticulated ? ' — value articulated' : ''}</td></tr>`;
        });
        body += `</table>`;
      }
      if (execSummary.differentiation) {
        const d = execSummary.differentiation;
        body += `<h3>4. Whatfix Differentiation Analysis</h3><p><strong>Why Whatfix?</strong> ${escapeHTML(d.whyWhatfix || '—')} &nbsp;|&nbsp; <strong>vs Others?</strong> ${escapeHTML(d.vsOthers || '—')} &nbsp;|&nbsp; <strong>Overall:</strong> ${escapeHTML(d.overallRating || '—')}</p>`;
        if (d.shown?.length) { body += `<h4>Differentiators Presented</h4><ul>${d.shown.map(s => `<li><strong>${escapeHTML(s.differentiator)}</strong> — ${escapeHTML(s.positioning)}</li>`).join('')}</ul>`; }
        if (d.missedNow?.length) { body += `<h4>Could Have Introduced</h4><ul>${d.missedNow.map(s => `<li>${escapeHTML(s)}</li>`).join('')}</ul>`; }
        if (d.saveLater?.length) { body += `<h4>Save for Later</h4><ul>${d.saveLater.map(s => `<li>${escapeHTML(s)}</li>`).join('')}</ul>`; }
      }
      if (execSummary.questions?.length) {
        body += `<h3>5. Customer Questions, Objections &amp; Responses</h3><table><tr><th>#</th><th>Question</th><th>Category</th><th>Quality</th><th>Response</th></tr>`;
        execSummary.questions.forEach((q, i) => {
          const col = qualColors[q.quality] || '#6b7280';
          body += `<tr><td>${i + 1}</td><td>${escapeHTML(q.question)}</td><td>${escapeHTML(Q_CAT_LABEL_MD[q.category] || q.category || '')}</td><td style="color:${col};font-weight:bold">${escapeHTML(q.quality)}${q.urgency === 'now' ? ' — Address Now' : ''}</td><td>${escapeHTML(q.response || '')}</td></tr>`;
        });
        body += `</table>`;
      }
      if (execSummary.infosec)      body += `<h3>6. InfoSec / Deployment Deep Dive</h3>${execMdToHTML(execSummary.infosec)}`;
      if (execSummary.gaps)         body += `<h3>7. Gaps &amp; Missed Opportunities</h3>${execMdToHTML(execSummary.gaps)}`;
      if (execSummary.improvements) body += `<h3>8. Opportunities &amp; Improvements</h3>${execMdToHTML(execSummary.improvements)}`;
      body += '<hr>';
    }

    // ── 8. Solution Framework ─────────────────────────────────────
    const hasSFAnalyses = solutionFrameworkAnalyses && Object.values(solutionFrameworkAnalyses).some(v => v && v !== 'loading');
    if ((solutionFramework && solutionFramework !== 'loading') || hasSFAnalyses) {
      body += `<h2>Solution Framework Analysis</h2>`;
      if (solutionFramework && solutionFramework !== 'loading') {
        body += `<h3>Recommendation</h3>`;
        body += `<p><strong>Framework:</strong> ${escapeHTML(FRAMEWORK_LABELS[solutionFramework.type] || solutionFramework.type)} (${escapeHTML(solutionFramework.type)})</p>`;
        body += `<p><strong>Confidence:</strong> ${escapeHTML(solutionFramework.confidence)}</p>`;
        body += `<p><strong>Reason:</strong> ${escapeHTML(solutionFramework.reason)}</p>`;
        if (solutionFramework.alternativeType) {
          body += `<p><strong>Also Consider:</strong> ${escapeHTML(solutionFramework.alternativeType)} — ${escapeHTML(solutionFramework.alternativeReason)}</p>`;
        }
      }
      if (solutionFrameworkAnalyses) {
        Object.entries(solutionFrameworkAnalyses).forEach(([type, analysis]) => {
          if (!analysis || analysis === 'loading') return;
          body += `<h3>${escapeHTML(FRAMEWORK_LABELS[type] || type)} (${type})</h3>`;
          body += `<p><strong>Overall Fit:</strong> ${escapeHTML(FIT_LABELS_EXP[analysis.overallFit] || analysis.overallFit)}</p>`;
          body += `<p><strong>Fit Reason:</strong> ${escapeHTML(analysis.fitReason)}</p>`;
          if (analysis.competitiveContext && analysis.competitiveContext !== 'No competitors mentioned') {
            body += `<p><strong>Competitor Context:</strong> ${escapeHTML(analysis.competitiveContext)}</p>`;
          }
          if (analysis.qualificationSignals?.length) {
            body += `<h4>Qualification Signals</h4><table><tr><th>Signal</th><th>Found</th><th>Evidence</th></tr>`;
            analysis.qualificationSignals.forEach(s => {
              body += `<tr><td>${escapeHTML(s.signal)}</td><td>${s.found ? '✓ Yes' : 'No'}</td><td>${escapeHTML(s.evidence || '')}</td></tr>`;
            });
            body += `</table>`;
          }
          if (analysis.discoveryGaps?.length) {
            body += `<h4>Discovery Gaps</h4><ul>${analysis.discoveryGaps.map(g => `<li>${escapeHTML(g)}</li>`).join('')}</ul>`;
          }
          if (analysis.requirementMapping?.length) {
            body += `<h4>Requirement Mapping</h4><table><tr><th>Pain</th><th>Capability</th><th>Addressed</th></tr>`;
            analysis.requirementMapping.forEach(r => {
              body += `<tr><td>${escapeHTML(r.pain)}</td><td>${escapeHTML(r.capability)}</td><td>${r.addressed ? '✓' : '⚠'}</td></tr>`;
            });
            body += `</table>`;
          }
          if (analysis.objections?.length) {
            body += `<h4>Objections</h4><table><tr><th>Objection</th><th>Suggested Response</th></tr>`;
            analysis.objections.forEach(o => {
              body += `<tr><td>${escapeHTML(o.objection)}</td><td>${escapeHTML(o.suggestedResponse)}</td></tr>`;
            });
            body += `</table>`;
          }
          if (analysis.roiAngles?.length) {
            body += `<h4>ROI Angles</h4><ol>${analysis.roiAngles.map(r => `<li>${escapeHTML(r)}</li>`).join('')}</ol>`;
          }
          if (analysis.demoFocus) body += `<h4>Demo Focus</h4><p>${escapeHTML(analysis.demoFocus)}</p>`;
        });
      }
      body += '<hr>';
    }

    // ── 9. Chat History ───────────────────────────────────────────
    if (messages?.length > 0) {
      const validMsgs = messages.filter(m => !m.error && !m.pending);
      if (validMsgs.length > 0) {
        body += `<h2>Chat History (${validMsgs.length} messages)</h2>`;
        validMsgs.forEach(m => {
          body += `<p><strong>${m.role === 'user' ? 'You' : 'Claude'}:</strong></p>`;
          body += `<p style="margin-left:12pt;white-space:pre-wrap">${escapeHTML(m.content)}</p><hr>`;
        });
      }
    }

    triggerDownload(wrapWordHTML('CallScribe Full Report', body, meetingId), `callscribe-report-${mid}.doc`, 'application/msword');
    return;
  }

  // ── Markdown / TXT formats ────────────────────────────────────
  const parts = [];
  if (ci && ci !== 'loading') parts.push(intelligenceToMarkdown(ci, meetingId));
  if (insights?.length > 0) parts.push(insightsToMarkdown(insights, meetingId));
  if (competitors && competitors !== 'loading' && competitors.competitors) parts.push(competitorsToMarkdown(competitors, meetingId));
  if (objections && objections !== 'loading' && objections.objections) parts.push(objectionsToMarkdown(objections, meetingId));
  if (mom && mom !== 'loading' && (mom.internal || mom.external)) {
    const lines = ['# Meeting Minutes', `**Meeting ID:** \`${meetingId || 'Unknown'}\``, `**Exported:** ${ts()}`, ''];
    if (mom.internal) { lines.push('## Internal — Team Use Only', '', mom.internal, ''); }
    if (mom.external) { lines.push('## External — Client Facing', '', mom.external, ''); }
    parts.push(lines.join('\n'));
  }
  if (demoScope && demoScope !== 'loading') {
    const lines = ['# Demo Scope Advisor', `**Meeting ID:** \`${meetingId || 'Unknown'}\``, `**Exported:** ${ts()}`, ''];
    lines.push(`**Call Stage:** ${capitalize(demoScope.callStage)}  `);
    lines.push(`**Client Platform:** ${capitalize(demoScope.clientPlatform)}  `);
    if (demoScope.prospect?.name) lines.push(`**Prospect:** ${demoScope.prospect.name}  `);
    if (demoScope.prospect?.industry) lines.push(`**Industry:** ${demoScope.prospect.industry}  `);
    if (demoScope.pocScope?.note) lines.push(`**POC Scope:** ${demoScope.pocScope.note}  `);
    if (demoScope.summary) { lines.push('', demoScope.summary); }
    if (demoScope.recommendations?.length) {
      lines.push('', '## Recommended Environments', '');
      demoScope.recommendations.forEach((r, i) => {
        const env = r.env;
        lines.push(`### ${i + 1}. ${env?.name || `Environment ${r.envId}`}`);
        lines.push(`**Domain:** ${env?.domain || '—'} · **Type:** ${env?.type || '—'} · **Application:** ${env?.application || '—'}  `);
        if (r.reason) lines.push(`**Reason:** ${r.reason}  `);
        if (r.cloneNeeded) lines.push(`**Clone Required**${r.cloneNote ? ': ' + r.cloneNote : ''}  `);
        lines.push('');
      });
    }
    parts.push(lines.join('\n'));
  }
  if (execSummary && execSummary !== 'loading') parts.push(execSummaryToMarkdown(execSummary, meetingId));
  const hasSFMd = solutionFrameworkAnalyses && Object.values(solutionFrameworkAnalyses).some(v => v && v !== 'loading');
  if ((solutionFramework && solutionFramework !== 'loading') || hasSFMd) {
    parts.push(solutionFrameworkToMarkdown(solutionFramework, solutionFrameworkAnalyses || {}, meetingId));
  }
  if (messages?.length > 0) parts.push(chatToMarkdown(messages, meetingId));

  if (parts.length === 0) return;

  const content = parts.join('\n\n---\n\n');
  if (format === 'txt') {
    const plain = content.replace(/^#{1,6}\s+/gm, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1').replace(/^[-*]\s/gm, '  · ').replace(/^\d+\.\s/gm, m => `  ${m}`).replace(/^\|.*\|$/gm, '').replace(/^---$/gm, '─'.repeat(50));
    triggerDownload(plain, `callscribe-report-${mid}.txt`, 'text/plain');
  } else {
    triggerDownload(content, `callscribe-report-${mid}.md`, 'text/markdown');
  }
}

// ═════════════════════════════════════════════════════════════════
// Solution Framework export formatters
// ═════════════════════════════════════════════════════════════════

const FRAMEWORK_LABELS = { MRP: 'Mirror Roleplay', DT: 'Digital Transformation', CD: 'Competitive Displacement' };
const FIT_LABELS_EXP   = { strong: 'Strong Fit', moderate: 'Moderate Fit', weak: 'Weak Fit' };

export function solutionFrameworkToMarkdown(recommendation, analyses, meetingId) {
  const lines = [];
  lines.push('# Solution Framework Analysis');
  if (meetingId) lines.push(`*Meeting ID: ${meetingId}*`);
  lines.push(`*Exported: ${new Date().toLocaleString()}*`);
  lines.push('');

  if (recommendation) {
    lines.push('## Recommendation');
    lines.push(`**Framework:** ${FRAMEWORK_LABELS[recommendation.type] || recommendation.type} (${recommendation.type})`);
    lines.push(`**Confidence:** ${recommendation.confidence}`);
    lines.push(`**Reason:** ${recommendation.reason}`);
    if (recommendation.alternativeType) {
      lines.push(`**Also Consider:** ${recommendation.alternativeType} — ${recommendation.alternativeReason}`);
    }
    lines.push('');
  }

  Object.entries(analyses).forEach(([type, analysis]) => {
    if (!analysis || analysis === 'loading') return;
    lines.push(`---`);
    lines.push(`## ${FRAMEWORK_LABELS[type] || type} (${type})`);
    lines.push(`**Overall Fit:** ${FIT_LABELS_EXP[analysis.overallFit] || analysis.overallFit}`);
    lines.push(`**Fit Reason:** ${analysis.fitReason}`);
    if (analysis.competitiveContext && analysis.competitiveContext !== 'No competitors mentioned') {
      lines.push(`**Competitor Context:** ${analysis.competitiveContext}`);
    }
    lines.push('');

    if (analysis.qualificationSignals?.length) {
      lines.push('### Qualification Signals');
      analysis.qualificationSignals.forEach(s => {
        lines.push(`- [${s.found ? 'x' : ' '}] **${s.signal}**${s.evidence ? ` — "${s.evidence}"` : ''}`);
      });
      lines.push('');
    }

    if (analysis.discoveryGaps?.length) {
      lines.push('### Discovery Gaps');
      analysis.discoveryGaps.forEach(g => lines.push(`- ${g}`));
      lines.push('');
    }

    if (analysis.requirementMapping?.length) {
      lines.push('### Requirement Mapping');
      analysis.requirementMapping.forEach(r => {
        lines.push(`- **Pain:** ${r.pain}`);
        lines.push(`  **Capability:** ${r.capability} ${r.addressed ? '✓' : '⚠'}`);
      });
      lines.push('');
    }

    if (analysis.objections?.length) {
      lines.push('### Objections');
      analysis.objections.forEach(o => {
        lines.push(`- **${o.objection}**`);
        lines.push(`  *Response:* ${o.suggestedResponse}`);
      });
      lines.push('');
    }

    if (analysis.roiAngles?.length) {
      lines.push('### ROI Angles');
      analysis.roiAngles.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
      lines.push('');
    }

    if (analysis.demoFocus) {
      lines.push('### Demo Focus');
      lines.push(analysis.demoFocus);
      lines.push('');
    }
  });

  return lines.join('\n');
}

function solutionFrameworkToJSON(recommendation, analyses, meetingId) {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    meetingId: meetingId || null,
    recommendation: recommendation || null,
    analyses: Object.fromEntries(
      Object.entries(analyses).filter(([, v]) => v && v !== 'loading')
    ),
  }, null, 2);
}

const FIT_BADGE = { strong: 'badge-green', moderate: 'badge-amber', weak: 'badge' };

function solutionFrameworkToWordDoc(recommendation, analyses, meetingId) {
  let body = '';

  if (recommendation) {
    body += `<h2>Recommendation</h2>`;
    body += `<table>
  <tr><th>Framework</th><td>${escapeHTML(FRAMEWORK_LABELS[recommendation.type] || recommendation.type)} (${escapeHTML(recommendation.type)})</td></tr>
  <tr><th>Confidence</th><td><span class="${recommendation.confidence === 'high' ? 'badge-green' : recommendation.confidence === 'medium' ? 'badge-amber' : 'badge-gray'}">${escapeHTML(recommendation.confidence)}</span></td></tr>
  <tr><th>Reason</th><td>${escapeHTML(recommendation.reason)}</td></tr>
  ${recommendation.alternativeType ? `<tr><th>Also Consider</th><td>${escapeHTML(recommendation.alternativeType)} — ${escapeHTML(recommendation.alternativeReason)}</td></tr>` : ''}
</table>`;
  }

  Object.entries(analyses).forEach(([type, analysis]) => {
    if (!analysis || analysis === 'loading') return;
    const fit = analysis.overallFit || 'moderate';
    body += `<hr><h2>${escapeHTML(FRAMEWORK_LABELS[type] || type)} (${escapeHTML(type)})</h2>`;
    body += `<p><span class="${FIT_BADGE[fit] || 'badge-amber'}">${escapeHTML(FIT_LABELS_EXP[fit] || fit)}</span></p>`;
    body += `<p><strong>Fit Reason:</strong> ${escapeHTML(analysis.fitReason)}</p>`;

    if (analysis.competitiveContext && analysis.competitiveContext !== 'No competitors mentioned') {
      body += `<h3>Competitor Context</h3><p>${escapeHTML(analysis.competitiveContext)}</p>`;
    }

    if (analysis.qualificationSignals?.length) {
      const present = analysis.qualificationSignals.filter(s => s.found).length;
      body += `<h3>Qualification Signals (${present} / ${analysis.qualificationSignals.length} present)</h3>`;
      body += `<table><tr><th>Signal</th><th>Found</th><th>Evidence</th></tr>`;
      analysis.qualificationSignals.forEach(s => {
        body += `<tr><td>${escapeHTML(s.signal)}</td><td>${s.found ? '✓' : '✗'}</td><td><em>${escapeHTML(s.evidence || '')}</em></td></tr>`;
      });
      body += `</table>`;
    }

    if (analysis.discoveryGaps?.length) {
      body += `<h3>Discovery Gaps</h3><ul>`;
      analysis.discoveryGaps.forEach(g => { body += `<li>${escapeHTML(g)}</li>`; });
      body += `</ul>`;
    }

    if (analysis.requirementMapping?.length) {
      body += `<h3>Requirement Mapping</h3>`;
      body += `<table><tr><th>Pain</th><th>Capability</th><th>Addressed</th></tr>`;
      analysis.requirementMapping.forEach(r => {
        body += `<tr><td>${escapeHTML(r.pain)}</td><td>${escapeHTML(r.capability)}</td><td>${r.addressed ? '✓' : '⚠'}</td></tr>`;
      });
      body += `</table>`;
    }

    if (analysis.objections?.length) {
      body += `<h3>Objections</h3>`;
      body += `<table><tr><th>Objection</th><th>Suggested Response</th></tr>`;
      analysis.objections.forEach(o => {
        body += `<tr><td>${escapeHTML(o.objection)}</td><td>${escapeHTML(o.suggestedResponse)}</td></tr>`;
      });
      body += `</table>`;
    }

    if (analysis.roiAngles?.length) {
      body += `<h3>ROI Angles</h3><ol>`;
      analysis.roiAngles.forEach(r => { body += `<li>${escapeHTML(r)}</li>`; });
      body += `</ol>`;
    }

    if (analysis.demoFocus) {
      body += `<h3>Demo Focus</h3><p>${escapeHTML(analysis.demoFocus)}</p>`;
    }
  });

  return wrapWordHTML('Solution Framework Analysis', body, meetingId);
}

export function downloadSolutionFramework(recommendation, analyses, meetingId, format) {
  const mid = (meetingId || 'callscribe').slice(-8);
  if (format === 'doc') {
    triggerDownload(solutionFrameworkToWordDoc(recommendation, analyses, meetingId), `solution-framework-${mid}.doc`, 'application/msword');
    return;
  }
  if (format === 'json') {
    triggerDownload(solutionFrameworkToJSON(recommendation, analyses, meetingId), `solution-framework-${mid}.json`, MIME.json);
    return;
  }
  const md = solutionFrameworkToMarkdown(recommendation, analyses, meetingId);
  if (format === 'txt') {
    const plain = md
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/^[-*]\s/gm, '  · ')
      .replace(/^\d+\.\s/gm, m => `  ${m}`)
      .replace(/^---$/gm, '─'.repeat(50));
    triggerDownload(plain, `solution-framework-${mid}.txt`, MIME.txt);
  } else {
    triggerDownload(md, `solution-framework-${mid}.md`, MIME.md);
  }
}
