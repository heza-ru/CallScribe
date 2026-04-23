import { create } from 'zustand';
import { SCREENS } from './constants';
import { abortAll } from './utils/abortManager';

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

export const useStore = create((set, get) => ({
  screen:    SCREENS.DETECTION,
  meetingId: null,
  callTitle: null,
  token:     null,
  settings:  null,
  error:     null,
  ...initialAnalysis,

  // ── Navigation ────────────────────────────────────────────────
  setScreen: (screen) => set({ screen, error: null }),

  // ── Call detection ────────────────────────────────────────────
  transcriptDetected: (meetingId, token, callTitle) => set((s) => {
    if (meetingId === s.meetingId) {
      return { token, callTitle: callTitle ?? s.callTitle, error: null };
    }
    // Restore chat history for the new meetingId asynchronously
    loadPersistedChat(meetingId).then((msgs) => {
      if (msgs.length > 0) useStore.setState({ chatMessages: msgs });
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

  callTitleUpdated: (callTitle) => set({ callTitle }),

  // ── Transcript ────────────────────────────────────────────────
  transcriptLoaded: (chunks, transcript) => set({ chunks, transcript, error: null }),

  // ── Insights ──────────────────────────────────────────────────
  insightsLoaded: (insights) => set({ insights, _insightsRan: true, error: null }),

  // ── Call Intelligence ─────────────────────────────────────────
  setCallIntelligence: (value) => set({ callIntelligence: value }),

  // ── Ticket editing ────────────────────────────────────────────
  editTicket:      (ticket) => set({ draftTicket: ticket, screen: SCREENS.TICKET_REVIEW }),
  ticketSubmitted: ()       => set({ draftTicket: null,   screen: SCREENS.ANALYSIS }),

  // ── Settings ──────────────────────────────────────────────────
  settingsLoaded: (settings) => set({ settings }),
  settingsSaved:  (settings) => set({ settings, screen: SCREENS.DETECTION }),

  // ── Error ─────────────────────────────────────────────────────
  setError:   (error) => set({ error }),
  clearError: ()      => set({ error: null }),

  // ── Competitors ───────────────────────────────────────────────
  setCompetitors: (value) => set({ competitors: value }),

  // ── Objections ────────────────────────────────────────────────
  setObjections: (value) => set({ objections: value }),

  // ── Meeting Minutes ───────────────────────────────────────────
  setMOM: (value) => set({ mom: value }),

  // ── Demo Scope ────────────────────────────────────────────────
  setDemoScope: (value) => set({ demoScope: value }),

  // ── Exec Summary ──────────────────────────────────────────────
  setExecSummary:        (value) => set({ execSummary: value, execSummaryError: null }),
  setExecSummaryError:   (error) => set({ execSummary: null, execSummaryError: error || 'Analysis failed. Please try again.' }),
  setExecSummaryLoading: ()      => set({ execSummary: 'loading', execSummaryError: null }),

  // ── Solution Framework ────────────────────────────────────────
  setSolutionFramework: (value) => set({ solutionFramework: value }),
  setSolutionFrameworkAnalysis: (frameworkType, value) => set((s) => ({
    solutionFrameworkAnalyses: { ...s.solutionFrameworkAnalyses, [frameworkType]: value },
  })),

  // ── Chat (persisted to chrome.storage.session per meetingId) ─────
  chatAddMessage: (message) => set((s) => {
    const msgs = [...s.chatMessages, message];
    persistChat(s.meetingId, msgs);
    return { chatMessages: msgs };
  }),
  chatUpdateLast: (message) => set((s) => {
    const msgs = [...s.chatMessages.slice(0, -1), message];
    persistChat(s.meetingId, msgs);
    return { chatMessages: msgs };
  }),
  chatClear: () => set((s) => {
    persistChat(s.meetingId, []);
    return { chatMessages: [] };
  }),

  // ── Abort all in-flight Claude requests ──────────────────────
  abortAnalysis: () => abortAll(),

  // ── Reset ─────────────────────────────────────────────────────
  resetAnalysis: () => set({ ...initialAnalysis }),
}));
