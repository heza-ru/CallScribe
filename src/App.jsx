import React, { useReducer, useEffect } from 'react';
import { DetectionScreen } from './components/DetectionScreen';
import { TranscriptActions } from './components/TranscriptActions';
import { AnalysisScreen } from './components/AnalysisScreen';
import { TicketReview } from './components/TicketReview';
import { Settings } from './components/Settings';
import { SCREENS } from './constants';

export { SCREENS };

const initialState = {
  screen: SCREENS.DETECTION,
  meetingId: null,
  token: null,
  chunks: null,
  transcript: null,
  insights: [],
  draftTicket: null,
  settings: null,
  error: null,
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
      return { ...state, insights: action.insights, screen: SCREENS.ANALYSIS, error: null };
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
    case 'RESET_ANALYSIS':
      return { ...state, insights: [], chunks: null, transcript: null, draftTicket: null };
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
  const screenProps = { state, dispatch };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div key={screen} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {screen === SCREENS.DETECTION          && <DetectionScreen {...screenProps} />}
        {screen === SCREENS.TRANSCRIPT_ACTIONS && <TranscriptActions {...screenProps} />}
        {screen === SCREENS.ANALYSIS           && <AnalysisScreen {...screenProps} />}
        {screen === SCREENS.TICKET_REVIEW      && <TicketReview {...screenProps} />}
        {screen === SCREENS.SETTINGS           && <Settings {...screenProps} />}
      </div>
    </div>
  );
}
