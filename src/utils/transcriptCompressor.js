/**
 * Transcript compression pipeline to reduce token usage before sending to the Claude API.
 *
 * Pipeline stages (in order):
 *  1. Filler-word removal   – strips spoken hesitation sounds (um, uh, hmm, er…)
 *  2. Backchannel pruning   – drops turns whose entire content is a short affirmation
 *                             ("yeah", "ok", "right", "got it", etc.)
 *  3. Same-speaker merge    – consecutive turns from the same speaker are joined into one
 *  4. Budget cap            – if the result still exceeds `maxChars`, keep the first ~55 %
 *                             and last ~35 % of the text and insert a truncation notice
 *
 * Typical compression on a 1-hour call: 35–55 % token reduction.
 *
 * @param {string} plainText   Transcript in "SPEAKER: text" newline-separated format
 * @param {number} maxChars    Hard character budget (default 80 000 ≈ 20 K tokens)
 * @returns {{ text: string, stats: object }}
 */

const FILLER_RE = /\b(um+|uh+|hmm+|mhm+|mm+|er+m?|ah+|huh)\b[,.]?\s*/gi;

const BACKCHANNEL_RE =
  /^(yeah|yes|no|nope|ok|okay|right|sure|alright|mhm|mm|uh-huh|got\s+it|i\s+see|exactly|absolutely|of\s+course|definitely|totally|cool|great|perfect|thanks|thank\s+you|sounds?\s+good|makes?\s+sense)[.!,?]?$/i;

export function compressTranscript(plainText, maxChars = 80_000) {
  if (!plainText || typeof plainText !== 'string') {
    return { text: plainText || '', stats: null };
  }

  const originalChars = plainText.length;

  // ── 1. Parse ──────────────────────────────────────────────────────────────
  const rawLines = plainText.split('\n').filter((l) => l.trim().length > 0);

  const parsed = rawLines.map((line) => {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) return { speaker: '', text: line.trim() };
    return {
      speaker: line.slice(0, colonIdx).trim(),
      text: line.slice(colonIdx + 1).trim(),
    };
  });

  // ── 2. Filler-word removal ────────────────────────────────────────────────
  let lines = parsed
    .map((l) => ({
      ...l,
      text: l.text.replace(FILLER_RE, ' ').replace(/\s{2,}/g, ' ').trim(),
    }))
    .filter((l) => l.text.length > 0);

  // ── 3. Backchannel pruning ────────────────────────────────────────────────
  // Remove turns that are 1–2 words and match a pure acknowledgement pattern.
  lines = lines.filter((l) => {
    const wordCount = l.text.trim().split(/\s+/).length;
    return wordCount > 2 || !BACKCHANNEL_RE.test(l.text.trim());
  });

  // ── 4. Same-speaker merge ─────────────────────────────────────────────────
  const merged = [];
  for (const line of lines) {
    const prev = merged[merged.length - 1];
    if (prev && prev.speaker === line.speaker) {
      prev.text += ' ' + line.text;
    } else {
      merged.push({ ...line });
    }
  }

  // ── 5. Reconstruct plain text ─────────────────────────────────────────────
  let compressed = merged.map((l) => `${l.speaker}: ${l.text}`).join('\n');

  // ── 6. Budget cap with head / tail sampling ───────────────────────────────
  if (compressed.length > maxChars) {
    const headBudget = Math.floor(maxChars * 0.55);
    const tailBudget = Math.floor(maxChars * 0.35);

    let headText = '';
    let headIdx = 0;
    for (; headIdx < merged.length; headIdx++) {
      const chunk = `${merged[headIdx].speaker}: ${merged[headIdx].text}\n`;
      if (headText.length + chunk.length > headBudget) break;
      headText += chunk;
    }

    let tailText = '';
    let tailIdx = merged.length - 1;
    for (; tailIdx > headIdx; tailIdx--) {
      const chunk = `${merged[tailIdx].speaker}: ${merged[tailIdx].text}\n`;
      if (tailText.length + chunk.length > tailBudget) break;
      tailText = chunk + tailText;
    }

    const omitted = tailIdx - headIdx + 1;
    compressed =
      headText.trim() +
      `\n\n[... ${omitted} exchange${omitted !== 1 ? 's' : ''} omitted for brevity ...]\n\n` +
      tailText.trim();
  }

  const compressedChars = compressed.length;
  const ratio = Math.round((1 - compressedChars / originalChars) * 100);

  return {
    text: compressed,
    stats: {
      originalLines: rawLines.length,
      processedLines: merged.length,
      originalChars,
      compressedChars,
      compressionRatio: ratio, // percentage saved
    },
  };
}
