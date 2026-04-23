import { useEffect } from 'react';
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
import { SolutionFrameworkScreen } from './components/SolutionFrameworkScreen';
import { Settings } from './components/Settings';
import { SCREENS } from './constants';
import { useStore } from './store';
import { ErrorBoundary } from './components/ErrorBoundary';

export { SCREENS };

export default function App() {
  const screen               = useStore(s => s.screen);
  const meetingId            = useStore(s => s.meetingId);
  const transcriptDetected   = useStore(s => s.transcriptDetected);
  const callTitleUpdated     = useStore(s => s.callTitleUpdated);
  const settingsLoaded       = useStore(s => s.settingsLoaded);

  useEffect(() => {
    chrome.storage.sync.get(
      ['claudeApiKey', 'jiraBaseUrl', 'jiraEmail', 'jiraApiToken', 'jiraProjectKey', 'productboardApiKey'],
      (result) => settingsLoaded(result)
    );
  }, []);

  useEffect(() => {
    function onMessage(msg) {
      if (msg.type === 'MEETING_CHANGED') {
        transcriptDetected(msg.meetingId, msg.token, msg.callTitle ?? null);
      } else if (msg.type === 'CALL_TITLE_UPDATED') {
        callTitleUpdated(msg.callTitle);
      }
    }
    chrome.runtime.onMessage.addListener(onMessage);
    return () => chrome.runtime.onMessage.removeListener(onMessage);
  }, []);

  return (
    <AppShell>
      <ErrorBoundary>
        <div key={`${screen}:${meetingId ?? ''}`} className="anim-screen" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {screen === SCREENS.DETECTION          && <DetectionScreen    />}
          {screen === SCREENS.TRANSCRIPT_ACTIONS && <TranscriptActions  />}
          {screen === SCREENS.ANALYSIS           && <AnalysisScreen     />}
          {screen === SCREENS.INTELLIGENCE       && <IntelligenceScreen />}
          {screen === SCREENS.TICKET_REVIEW      && <TicketReview       />}
          {screen === SCREENS.MOM                && <MOMScreen          />}
          {screen === SCREENS.DEMO_SCOPE         && <DemoScopeScreen    />}
          {screen === SCREENS.EXEC_SUMMARY       && <ExecSummaryScreen  />}
          {screen === SCREENS.SOLUTION_FRAMEWORK && <SolutionFrameworkScreen />}
          {screen === SCREENS.CHAT               && <ChatScreen         />}
          {screen === SCREENS.SETTINGS           && <Settings           />}
        </div>
      </ErrorBoundary>
    </AppShell>
  );
}
