import { parseChunks, formatTimestamp } from './mindtickleParser';

/**
 * Convert transcript chunks to plain text.
 */
export function toTXT(chunks, meetingId) {
  const { lines } = parseChunks(chunks);
  const header = `CallScribe Transcript\nMeeting ID: ${meetingId}\nExported: ${new Date().toLocaleString()}\n${'─'.repeat(50)}\n\n`;
  const body = lines
    .map((l) => {
      const time = l.startTime != null ? ` [${formatTimestamp(l.startTime)}]` : '';
      return `${l.speaker}${time}: ${l.text}`;
    })
    .join('\n\n');
  return header + body;
}

/**
 * Convert transcript chunks to Markdown.
 */
export function toMarkdown(chunks, meetingId) {
  const { lines } = parseChunks(chunks);
  const lines_md = [];
  let lastSpeaker = null;

  lines_md.push(`# CallScribe Transcript`);
  lines_md.push(`**Meeting ID:** \`${meetingId}\``);
  lines_md.push(`**Exported:** ${new Date().toLocaleString()}`);
  lines_md.push('');
  lines_md.push('---');
  lines_md.push('');

  for (const line of lines) {
    if (line.speaker !== lastSpeaker) {
      if (lastSpeaker !== null) lines_md.push('');
      const time = line.startTime != null ? ` *(${formatTimestamp(line.startTime)})*` : '';
      lines_md.push(`**${line.speaker}**${time}`);
      lastSpeaker = line.speaker;
    }
    lines_md.push(line.text);
  }

  return lines_md.join('\n');
}

/**
 * Convert transcript chunks to JSON.
 */
export function toJSON(chunks, meetingId) {
  const { lines } = parseChunks(chunks);
  const data = {
    meetingId,
    exportedAt: new Date().toISOString(),
    source: 'CallScribe',
    transcript: lines.map(({ speaker, text, startTime, endTime }) => ({
      speaker,
      text,
      startTime,
      endTime,
    })),
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Trigger a browser download of the transcript content.
 */
export function downloadTranscript(chunks, meetingId, format) {
  let content, mimeType, ext;

  switch (format) {
    case 'md':
      content = toMarkdown(chunks, meetingId);
      mimeType = 'text/markdown';
      ext = 'md';
      break;
    case 'json':
      content = toJSON(chunks, meetingId);
      mimeType = 'application/json';
      ext = 'json';
      break;
    default:
      content = toTXT(chunks, meetingId);
      mimeType = 'text/plain';
      ext = 'txt';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const filename = `transcript-${meetingId}.${ext}`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
