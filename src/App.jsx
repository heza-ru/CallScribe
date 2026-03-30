import { useReducer, useEffect } from 'react';
import { AppShell } from './components/AppShell';
import { DetectionScreen } from './components/DetectionScreen';
import { TranscriptActions } from './components/TranscriptActions';
import { AnalysisScreen } from './components/AnalysisScreen';
import { IntelligenceScreen } from './components/IntelligenceScreen';
import { TicketReview } from './components/TicketReview';
import { MOMScreen } from './components/MOMScreen';
import { ChatScreen } from './components/ChatScreen';
import { DemoScopeScreen } from './components/DemoScopeScreen';
import { ExecSummaryScreen } from './components/ExecSummaryScreen';
import { Settings } from './components/Settings';
import { SCREENS } from './constants';

export { SCREENS };

const initialState = {
  screen:           SCREENS.DETECTION,
  meetingId:        null,
  callTitle:        null,
  token:            null,
  chunks:           null,
  transcript:       null,
  insights:         [],
  _insightsRan:     false,
  callIntelligence: null,   // null | 'loading' | { ...data }
  competitors:      null,   // null | 'loading' | { competitors, summary }
  objections:       null,   // null | 'loading' | { objections, handledCount, totalCount, topRisk }
  mom:              null,   // null | 'loading' | { internal, external }
  demoScope:        null,   // null | 'loading' | { callStage, prospect, pocScope, recommendations, summary }
  execSummary:      null,   // null | 'loading' | { storyline, useCases, ... }
  execSummaryError: null,  // null | string
  chatMessages:     [],
  draftTicket:      null,
  settings:         null,
  error:            null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.screen, error: null };
    case 'TRANSCRIPT_DETECTED':
      // Same call — just refresh the token and title
      if (action.meetingId === state.meetingId) {
        return { ...state, token: action.token, callTitle: action.callTitle ?? state.callTitle, error: null };
      }
      // New call — wipe all stale analysis data and go back to detection
      return {
        ...initialState,
        settings: state.settings,
        screen: SCREENS.DETECTION,
        meetingId: action.meetingId,
        callTitle: action.callTitle ?? null,
        token: action.token,
      };
    case 'CALL_TITLE_UPDATED':
      return { ...state, callTitle: action.callTitle };
    case 'TRANSCRIPT_LOADED':
      return { ...state, chunks: action.chunks, transcript: action.transcript, error: null };
    case 'INSIGHTS_LOADED':
      return { ...state, insights: action.insights, _insightsRan: true, error: null };
    case 'CALL_INTELLIGENCE_LOADING':
      return { ...state, callIntelligence: 'loading' };
    case 'CALL_INTELLIGENCE_LOADED':
      return { ...state, callIntelligence: action.callIntelligence };
    case 'CALL_INTELLIGENCE_FAILED':
      return { ...state, callIntelligence: null };
    case 'EDIT_TICKET':
      return { ...state, draftTicket: action.ticket, screen: SCREENS.TICKET_REVIEW };
    case 'TICKET_SUBMITTED':
      return { ...state, draftTicket: null, screen: SCREENS.ANALYSIS };
    case 'SETTINGS_LOADED':
      return { ...state, settings: action.settings };
    case 'SETTINGS_SAVED':
      return { ...state, settings: action.settings, screen: SCREENS.DETECTION };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'COMPETITORS_LOADING':    return { ...state, competitors: 'loading' };
    case 'COMPETITORS_LOADED':     return { ...state, competitors: action.competitors };
    case 'COMPETITORS_FAILED':     return { ...state, competitors: null };
    case 'OBJECTIONS_LOADING':     return { ...state, objections: 'loading' };
    case 'OBJECTIONS_LOADED':      return { ...state, objections: action.objections };
    case 'OBJECTIONS_FAILED':      return { ...state, objections: null };
    case 'MOM_LOADING':            return { ...state, mom: 'loading' };
    case 'MOM_LOADED':             return { ...state, mom: action.mom };
    case 'MOM_FAILED':             return { ...state, mom: null };
    case 'DEMO_SCOPE_LOADING':     return { ...state, demoScope: 'loading' };
    case 'DEMO_SCOPE_LOADED':      return { ...state, demoScope: action.demoScope };
    case 'DEMO_SCOPE_FAILED':      return { ...state, demoScope: null };
    case 'EXEC_SUMMARY_LOADING':   return { ...state, execSummary: 'loading', execSummaryError: null };
    case 'EXEC_SUMMARY_LOADED':    return { ...state, execSummary: action.execSummary, execSummaryError: null };
    case 'EXEC_SUMMARY_FAILED':    return { ...state, execSummary: null, execSummaryError: action.error || 'Analysis failed. Please try again.' };
    case 'CHAT_ADD_MESSAGE':       return { ...state, chatMessages: [...state.chatMessages, action.message] };
    case 'CHAT_UPDATE_LAST':       return { ...state, chatMessages: [...state.chatMessages.slice(0, -1), action.message] };
    case 'CHAT_CLEAR':             return { ...state, chatMessages: [] };
    case 'RESET_ANALYSIS':
      return { ...state, insights: [], _insightsRan: false, callIntelligence: null, competitors: null, objections: null, mom: null, demoScope: null, execSummary: null, execSummaryError: null, chunks: null, transcript: null, draftTicket: null };
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    chrome.storage.sync.get(
      ['claudeApiKey', 'jiraBaseUrl', 'jiraEmail', 'jiraApiToken', 'jiraProjectKey', 'productboardApiKey'],
      (result) => dispatch({ type: 'SETTINGS_LOADED', settings: result })
    );
  }, []);

  // Listen for new call detected while panel is already open
  useEffect(() => {
    function onMessage(msg) {
      if (msg.type === 'MEETING_CHANGED') {
        dispatch({ type: 'TRANSCRIPT_DETECTED', meetingId: msg.meetingId, token: msg.token, callTitle: msg.callTitle ?? null });
      } else if (msg.type === 'CALL_TITLE_UPDATED') {
        dispatch({ type: 'CALL_TITLE_UPDATED', callTitle: msg.callTitle });
      }
    }
    chrome.runtime.onMessage.addListener(onMessage);
    return () => chrome.runtime.onMessage.removeListener(onMessage);
  }, []);

  const { screen } = state;
  const props = { state, dispatch };

  return (
    <AppShell state={state} dispatch={dispatch}>
      <div key={`${screen}:${state.meetingId ?? ''}`} className="anim-screen" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {screen === SCREENS.DETECTION          && <DetectionScreen    {...props} />}
        {screen === SCREENS.TRANSCRIPT_ACTIONS && <TranscriptActions  {...props} />}
        {screen === SCREENS.ANALYSIS           && <AnalysisScreen     {...props} />}
        {screen === SCREENS.INTELLIGENCE       && <IntelligenceScreen {...props} />}
        {screen === SCREENS.TICKET_REVIEW      && <TicketReview       {...props} />}
        {screen === SCREENS.MOM                && <MOMScreen          {...props} />}
        {screen === SCREENS.DEMO_SCOPE         && <DemoScopeScreen    {...props} />}
        {screen === SCREENS.EXEC_SUMMARY       && <ExecSummaryScreen  {...props} />}
        {screen === SCREENS.CHAT               && <ChatScreen         {...props} />}
        {screen === SCREENS.SETTINGS           && <Settings           {...props} />}
      </div>
    </AppShell>
  );
}
