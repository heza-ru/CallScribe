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
import { Settings } from './components/Settings';
import { SCREENS } from './constants';

export { SCREENS };

const initialState = {
  screen:           SCREENS.DETECTION,
  meetingId:        null,
  token:            null,
  chunks:           null,
  transcript:       null,
  insights:         [],
  callIntelligence: null,   // null | 'loading' | { ...data }
  competitors:      null,   // null | 'loading' | { competitors, summary }
  objections:       null,   // null | 'loading' | { objections, handledCount, totalCount, topRisk }
  mom:              null,   // null | 'loading' | { internal, external }
  demoScope:        null,   // null | 'loading' | { callStage, prospect, pocScope, recommendations, summary }
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
      return { ...state, meetingId: action.meetingId, token: action.token, error: null };
    case 'TRANSCRIPT_LOADED':
      return { ...state, chunks: action.chunks, transcript: action.transcript, error: null };
    case 'INSIGHTS_LOADED':
      return { ...state, insights: action.insights, error: null };
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
    case 'COMPETITORS_LOADING':  return { ...state, competitors: 'loading' };
    case 'COMPETITORS_LOADED':   return { ...state, competitors: action.competitors };
    case 'COMPETITORS_FAILED':   return { ...state, competitors: null };
    case 'OBJECTIONS_LOADING':   return { ...state, objections: 'loading' };
    case 'OBJECTIONS_LOADED':    return { ...state, objections: action.objections };
    case 'OBJECTIONS_FAILED':    return { ...state, objections: null };
    case 'MOM_LOADING':          return { ...state, mom: 'loading' };
    case 'MOM_LOADED':           return { ...state, mom: action.mom };
    case 'MOM_FAILED':           return { ...state, mom: null };
    case 'DEMO_SCOPE_LOADING':  return { ...state, demoScope: 'loading' };
    case 'DEMO_SCOPE_LOADED':   return { ...state, demoScope: action.demoScope };
    case 'DEMO_SCOPE_FAILED':   return { ...state, demoScope: null };
    case 'CHAT_ADD_MESSAGE':     return { ...state, chatMessages: [...state.chatMessages, action.message] };
    case 'CHAT_UPDATE_LAST':     return { ...state, chatMessages: [...state.chatMessages.slice(0, -1), action.message] };
    case 'CHAT_CLEAR':           return { ...state, chatMessages: [] };
    case 'RESET_ANALYSIS':
      return { ...state, insights: [], callIntelligence: null, competitors: null, objections: null, mom: null, demoScope: null, chunks: null, transcript: null, draftTicket: null };
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

  const { screen } = state;
  const props = { state, dispatch };

  return (
    <AppShell state={state} dispatch={dispatch}>
      <div key={screen} className="anim-screen" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {screen === SCREENS.DETECTION          && <DetectionScreen    {...props} />}
        {screen === SCREENS.TRANSCRIPT_ACTIONS && <TranscriptActions  {...props} />}
        {screen === SCREENS.ANALYSIS           && <AnalysisScreen     {...props} />}
        {screen === SCREENS.INTELLIGENCE       && <IntelligenceScreen {...props} />}
        {screen === SCREENS.TICKET_REVIEW      && <TicketReview       {...props} />}
        {screen === SCREENS.MOM                && <MOMScreen          {...props} />}
        {screen === SCREENS.DEMO_SCOPE         && <DemoScopeScreen    {...props} />}
        {screen === SCREENS.CHAT               && <ChatScreen         {...props} />}
        {screen === SCREENS.SETTINGS           && <Settings           {...props} />}
      </div>
    </AppShell>
  );
}
