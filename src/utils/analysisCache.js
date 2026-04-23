import { get, set, del } from 'idb-keyval';

const key = (meetingId) => `callscribe_analysis_${meetingId}`;

export async function loadAnalysisCache(meetingId) {
  if (!meetingId) return null;
  try { return (await get(key(meetingId))) ?? null; }
  catch { return null; }
}

export async function patchAnalysisCache(meetingId, patch) {
  if (!meetingId) return;
  try {
    const existing = (await get(key(meetingId))) ?? {};
    await set(key(meetingId), { ...existing, ...patch });
  } catch { /* silent — cache is best-effort */ }
}

export async function clearAnalysisCache(meetingId) {
  if (!meetingId) return;
  try { await del(key(meetingId)); } catch { /* silent */ }
}
