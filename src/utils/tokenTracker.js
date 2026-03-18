const KEY = 'callscribe_token_usage';

// Haiku 4.5 pricing per million tokens
const INPUT_PRICE_PER_M  = 0.80;
const OUTPUT_PRICE_PER_M = 4.00;

const OP_LABELS = {
  insights:      'Product Gaps',
  intelligence:  'Call Intelligence',
  competitors:   'Competitor Analysis',
  objections:    'Objection Tracker',
  mom:           'Meeting Minutes',
  chat:          'Transcript Chat',
  demo_scope:    'Demo Scope Advisor',
};

export async function recordTokens(op, inputTokens, outputTokens) {
  return new Promise((resolve) => {
    chrome.storage.local.get([KEY], (result) => {
      const data = result[KEY] || { sessions: [] };
      data.sessions.push({
        date:   new Date().toISOString(),
        op,
        input:  inputTokens  || 0,
        output: outputTokens || 0,
      });
      // Keep last 200 sessions
      if (data.sessions.length > 200) data.sessions = data.sessions.slice(-200);
      chrome.storage.local.set({ [KEY]: data }, resolve);
    });
  });
}

export async function getTokenUsage() {
  return new Promise((resolve) => {
    chrome.storage.local.get([KEY], (result) => {
      resolve(result[KEY] || { sessions: [] });
    });
  });
}

export async function clearTokenUsage() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [KEY]: { sessions: [] } }, resolve);
  });
}

export function computeStats(sessions) {
  const byOp = {};
  let totalInput = 0, totalOutput = 0;

  sessions.forEach(s => {
    if (!byOp[s.op]) byOp[s.op] = { input: 0, output: 0, calls: 0, label: OP_LABELS[s.op] || s.op };
    byOp[s.op].input  += s.input;
    byOp[s.op].output += s.output;
    byOp[s.op].calls++;
    totalInput  += s.input;
    totalOutput += s.output;
  });

  const estimatedCost =
    (totalInput  / 1_000_000 * INPUT_PRICE_PER_M) +
    (totalOutput / 1_000_000 * OUTPUT_PRICE_PER_M);

  return { byOp, totalInput, totalOutput, estimatedCost, totalCalls: sessions.length };
}
