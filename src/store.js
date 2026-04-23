import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { SCREENS } from './constants';
import { abortAll } from './utils/abortManager';
import { loadAnalysisCache, patchAnalysisCache } from './utils/analysisCache';

const CHAT_SESSION_KEY = (meetingId) => `chat_${meetingId}`;

function persistChat(meetingId, messages) {
  if (!meetingId) return;
  chrome.storage.session.set({ [CHAT_SESSION_KEY(meetingId)]: messages }).catch(() => {});
}

export async function loadPersistedChat(meetingId) {
  if (!meetingId) return [];
  return new Promise((resolve) => {
    chrome.storage.session.get([CHAT_SESSION_KEY(meetingId)], (result) => {
      resolve(result[CHAT_SESSION_KEY(meetingId)] || []);
    });
  });
}

const initialAnalysis = {
  insights:                  [],
  _insightsRan:              false,
  callIntelligence:          null,
  competitors:               null,
  objections:                null,
  mom:                       null,
  demoScope:                 null,
  execSummary:               null,
  execSummaryError:          null,
  solutionFramework:         null,
  solutionFrameworkAnalyses: { MRP: null, DT: null, CD: null },
  chunks:                    null,
  transcript:                null,
  draftTicket:               null,
  chatMessages:              [],
};

// Fields worth caching to IndexedDB (excludes loading sentinels and transient UI)
const CACHEABLE_FIELDS = [
  'insights', '_insightsRan', 'callIntelligence', 'competitors',
  'objections', 'mom', 'demoScope', 'execSummary',
  'solutionFramework', 'solutionFrameworkAnalyses',
];

function safePatch(meetingId, patch) {
  // Strip loading sentinels before persisting
  const clean = {};
  for (const [k, v] of Object.entries(patch)) {
    if (CACHEABLE_FIELDS.includes(k) && v !== 'loading') clean[k] = v;
  }
  if (Object.keys(clean).length > 0) patchAnalysisCache(meetingId, clean);
}

export const useStore = create(immer((set, get) => ({
  screen:    SCREENS.DETECTION,
  meetingId: null,
  callTitle: null,
  token:     null,
  settings:  null,
  error:     null,
  ...initialAnalysis,

  // ── Navigation ────────────────────────────────────────────────
  setScreen: (screen) => set((s) => { s.screen = screen; s.error = null; }),

  // ── Call detection ────────────────────────────────────────────
  transcriptDetected: (meetingId, token, callTitle) => set((s) => {
    if (meetingId === s.meetingId) {
      s.token     = token;
      s.callTitle = callTitle ?? s.callTitle;
      s.error     = null;
      return;
    }
    // Restore persisted chat and analysis asynchronously
    loadPersistedChat(meetingId).then((msgs) => {
      if (msgs.length > 0) useStore.setState((draft) => { draft.chatMessages = msgs; });
    });
    loadAnalysisCache(meetingId).then((cached) => {
      if (cached) useStore.setState((draft) => { Object.assign(draft, cached); });
    });

    return {
      ...initialAnalysis,
      settings:  s.settings,
      screen:    SCREENS.DETECTION,
      meetingId,
      callTitle: callTitle ?? null,
      token,
      error:     null,
    };
  }),

  callTitleUpdated: (callTitle) => set((s) => { s.callTitle = callTitle; }),

  // ── Transcript ────────────────────────────────────────────────
  transcriptLoaded: (chunks, transcript) => set((s) => {
    s.chunks = chunks; s.transcript = transcript; s.error = null;
  }),

  // ── Insights ──────────────────────────────────────────────────
  insightsLoaded: (insights) => {
    set((s) => { s.insights = insights; s._insightsRan = true; s.error = null; });
    safePatch(get().meetingId, { insights, _insightsRan: true });
  },

  // ── Call Intelligence ─────────────────────────────────────────
  setCallIntelligence: (value) => {
    set((s) => { s.callIntelligence = value; });
    if (value !== 'loading') safePatch(get().meetingId, { callIntelligence: value });
  },

  // ── Ticket editing ────────────────────────────────────────────
  editTicket:      (ticket) => set((s) => { s.draftTicket = ticket; s.screen = SCREENS.TICKET_REVIEW; }),
  ticketSubmitted: ()       => set((s) => { s.draftTicket = null;   s.screen = SCREENS.ANALYSIS; }),

  // ── Settings ──────────────────────────────────────────────────
  settingsLoaded: (settings) => set((s) => { s.settings = settings; }),
  settingsSaved:  (settings) => set((s) => { s.settings = settings; s.screen = SCREENS.DETECTION; }),

  // ── Error ─────────────────────────────────────────────────────
  setError:   (error) => set((s) => { s.error = error; }),
  clearError: ()      => set((s) => { s.error = null; }),

  // ── Competitors ───────────────────────────────────────────────
  setCompetitors: (value) => {
    set((s) => { s.competitors = value; });
    if (value !== 'loading') safePatch(get().meetingId, { competitors: value });
  },

  // ── Objections ────────────────────────────────────────────────
  setObjections: (value) => {
    set((s) => { s.objections = value; });
    if (value !== 'loading') safePatch(get().meetingId, { objections: value });
  },

  // ── Meeting Minutes ───────────────────────────────────────────
  setMOM: (value) => {
    set((s) => { s.mom = value; });
    if (value !== 'loading') safePatch(get().meetingId, { mom: value });
  },

  // ── Demo Scope ────────────────────────────────────────────────
  setDemoScope: (value) => {
    set((s) => { s.demoScope = value; });
    safePatch(get().meetingId, { demoScope: value });
  },

  // ── Exec Summary ──────────────────────────────────────────────
  setExecSummary: (value) => {
    set((s) => { s.execSummary = value; s.execSummaryError = null; });
    safePatch(get().meetingId, { execSummary: value });
  },
  setExecSummaryError:   (error) => set((s) => {
    s.execSummary = null;
    s.execSummaryError = error || 'Analysis failed. Please try again.';
  }),
  setExecSummaryLoading: () => set((s) => { s.execSummary = 'loading'; s.execSummaryError = null; }),

  // ── Solution Framework ────────────────────────────────────────
  setSolutionFramework: (value) => {
    set((s) => { s.solutionFramework = value; });
    safePatch(get().meetingId, { solutionFramework: value });
  },
  setSolutionFrameworkAnalysis: (frameworkType, value) => {
    set((s) => { s.solutionFrameworkAnalyses[frameworkType] = value; });
    safePatch(get().meetingId, { solutionFrameworkAnalyses: get().solutionFrameworkAnalyses });
  },

  // ── Chat (persisted to chrome.storage.session per meetingId) ──
  chatAddMessage: (message) => set((s) => {
    s.chatMessages.push(message);
    persistChat(s.meetingId, s.chatMessages);
  }),
  chatUpdateLast: (message) => set((s) => {
    s.chatMessages[s.chatMessages.length - 1] = message;
    persistChat(s.meetingId, s.chatMessages);
  }),
  chatClear: () => set((s) => {
    s.chatMessages = [];
    persistChat(s.meetingId, []);
  }),

  // ── Abort all in-flight Claude requests ──────────────────────
  abortAnalysis: () => abortAll(),

  // ── Reset ─────────────────────────────────────────────────────
  resetAnalysis: () => set((s) => { Object.assign(s, initialAnalysis); }),
})));
