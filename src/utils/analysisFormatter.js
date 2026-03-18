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
  const emojis = { critical: '🔴', high: '🟠', medium: '🟡', low: '⚪' };

  order.forEach(p => {
    const group = byPriority[p];
    if (!group?.length) return;
    lines.push(`## ${emojis[p]} ${capitalize(p)} (${group.length})`);
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

function triggerDownload(content, filename, mimeType) {
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
    lines.push(`| Positive | Neutral | Negative |`);
    lines.push(`|----------|---------|----------|`);
    lines.push(`| ${s.positive}% | ${s.neutral}% | ${s.negative}% |`);
    lines.push('');
  }
  if (ci.frameworkCoverage?.length) {
    lines.push(`## Framework Coverage · ${ci.framework}`);
    ci.frameworkCoverage.forEach(d => lines.push(`- ${d.covered ? '✅' : '❌'} ${d.dimension}`));
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
  if (data.topRisk) { lines.push(`> ⚠️ **Top Risk:** ${data.topRisk}`, ''); }
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
    lines.push(`**${m.role === 'user' ? '👤 You' : '✨ Claude'}**`, '', m.content, '', '---', '');
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
