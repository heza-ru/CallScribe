/**
 * Assembles raw GraphQL transcript chunks into a structured transcript.
 *
 * Each chunk has the shape:
 *   { text: string, speakers: [{ name: string }], startTime?: number, endTime?: number }
 */

export function parseChunks(chunks) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return { lines: [], plainText: '' };
  }

  const lines = chunks.map((chunk, index) => {
    const speaker =
      chunk.speakers?.[0]?.name ||
      chunk.speaker ||
      chunk.speakerName ||
      `Speaker ${index + 1}`;

    const text = (chunk.text || chunk.content || '').trim();
    const startTime = chunk.startTime ?? chunk.start ?? null;
    const endTime = chunk.endTime ?? chunk.end ?? null;

    return { speaker, text, startTime, endTime, index };
  });

  const plainText = lines
    .map((l) => `${l.speaker}: ${l.text}`)
    .join('\n');

  return { lines, plainText };
}

export function formatTimestamp(seconds) {
  if (seconds == null || isNaN(seconds)) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
