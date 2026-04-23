import { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle, CheckCircle2, Loader2,
  ArrowRight, RefreshCw, Settings,
  Info, RotateCcw, FileText, ListChecks, BarChart2,
  ClipboardList, MessageCircle, Target, PackageOpen, BookOpen, Compass,
} from 'lucide-react';
import { SCREENS, ORANGE, NAVY } from '../constants';
import { parseChunks } from '../utils/mindtickleParser';
import { analyzeCallIntelligence, generateExecSummary } from '../services/claudeService';
import { downloadFullReport } from '../utils/analysisFormatter';
import { Spinner } from './ui/Spinner';
import { useClickOutside } from '../hooks/useClickOutside';
import { useStore } from '../store';

const STATUS = { CHECKING: 'checking', FOUND: 'found', NOT_FOUND: 'not_found', ERROR: 'error' };

function QuickActionRow({ icon: Icon, title, onClick, disabled, loading }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px',
        border: `1px solid ${hovered ? '#C8D2DE' : '#E4E9F0'}`,
        borderRadius: 8,
        background: hovered ? '#FAFBFD' : '#fff',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled && !loading ? 0.4 : 1,
        transition: 'background 130ms, border-color 130ms',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {loading ? (
          <Spinner size={13} color={ORANGE} trackColor="#E4E9F0" />
        ) : (
          <Icon size={13} style={{ color: ORANGE, flexShrink: 0 }} strokeWidth={2.5} />
        )}
        <span style={{
          fontSize: 11, fontWeight: 700, color: NAVY,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
        }}>
          {title}
        </span>
      </div>
      <ArrowRight size={13} style={{ color: '#A8B4C0', flexShrink: 0 }} strokeWidth={2} />
    </div>
  );
}

function APIStatusCard({ settings }) {
  const checks = [
    { label: 'Claude AI',    ok: !!settings?.claudeApiKey },
    { label: 'JIRA',         ok: !!(settings?.jiraBaseUrl && settings?.jiraApiToken && settings?.jiraProjectKey) },
    { label: 'Productboard', ok: !!settings?.productboardApiKey },
  ];
  return (
    <div style={{ borderRadius: 8, border: '1px solid #E4E9F0', background: '#fff', overflow: 'hidden' }}>
      {checks.map((c, i) => (
        <div key={c.label} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 14px',
          borderBottom: i < checks.length - 1 ? '1px solid #F5F7FA' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: c.ok ? '#22c55e' : '#C8D2DE' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>{c.label}</span>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: c.ok ? '#16a34a' : '#A8B4C0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {c.ok ? 'Connected' : 'Not set'}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DetectionScreen() {
  const transcript         = useStore(s => s.transcript);
  const meetingId          = useStore(s => s.meetingId);
  const token              = useStore(s => s.token);
  const callTitle          = useStore(s => s.callTitle);
  const settings           = useStore(s => s.settings);
  const error              = useStore(s => s.error);
  const transcriptDetected = useStore(s => s.transcriptDetected);
  const transcriptLoaded   = useStore(s => s.transcriptLoaded);
  const setCallIntelligence = useStore(s => s.setCallIntelligence);
  const setScreen          = useStore(s => s.setScreen);
  const setExecSummaryLoading = useStore(s => s.setExecSummaryLoading);
  const setExecSummary     = useStore(s => s.setExecSummary);
  const setExecSummaryError = useStore(s => s.setExecSummaryError);
  const setError           = useStore(s => s.setError);
  const clearError         = useStore(s => s.clearError);

  const [status,       setStatus]       = useState(STATUS.CHECKING);
  const [busyOp,       setBusyOp]       = useState(null); // null | 'sync' | 'transcribe' | 'insights' | 'actionables'
  const [reportDlOpen, setReportDlOpen] = useState(false);
  const reportDlRef = useRef(null);

  useEffect(() => { detect(); }, []);

  useClickOutside(reportDlRef, reportDlOpen ? () => setReportDlOpen(false) : null);

  function detect() {
    setStatus(STATUS.CHECKING);
    if (!chrome?.runtime) { setStatus(STATUS.ERROR); return; }
    try {
      chrome.runtime.sendMessage({ type: 'GET_TAB_STATE' }, (res) => {
        if (chrome.runtime.lastError) { setStatus(STATUS.ERROR); return; }
        if (res?.found && res?.meetingId) {
          transcriptDetected(res.meetingId, res.token, res.callTitle ?? null);
          setStatus(STATUS.FOUND);
        } else {
          setStatus(STATUS.NOT_FOUND);
        }
      });
    } catch { setStatus(STATUS.ERROR); }
  }

  // Returns transcript text — fetches from API if not already loaded
  function ensureTranscript() {
    if (transcript) return Promise.resolve(transcript);
    if (!chrome?.runtime) return Promise.reject(new Error('Extension context unavailable. Try reloading the page.'));
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(
          { type: 'FETCH_TRANSCRIPT', meetingId, token },
          (res) => {
            if (chrome.runtime.lastError || !res?.success) {
              reject(new Error(res?.error || 'Failed to fetch transcript'));
              return;
            }
            const { plainText } = parseChunks(res.chunks);
            transcriptLoaded(res.chunks, plainText);
            resolve(plainText);
          }
        );
      } catch (e) {
        reject(new Error('Extension context unavailable. Try reloading the page.'));
      }
    });
  }

  // Sync — fetch transcript, stay on this page
  async function handleSync() {
    if (!meetingId) return;
    setBusyOp('sync');
    clearError();
    try {
      await ensureTranscript();
      if (!callTitle) {
        chrome.runtime.sendMessage({ type: 'REFRESH_CALL_TITLE' }, (res) => {
          if (res?.callTitle) callTitleUpdated(res.callTitle);
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyOp(null);
    }
  }

  // Transcribe — fetch + go to transcript screen
  async function handleTranscribe() {
    setBusyOp('transcribe');
    clearError();
    try {
      await ensureTranscript();
      setScreen(SCREENS.TRANSCRIPT_ACTIONS);
    } catch (err) {
      setError(err.message);
      setBusyOp(null);
    }
  }

  // AI Powered Insights → Call Intelligence screen
  async function handleInsights() {
    setBusyOp('insights');
    clearError();
    try {
      const tx = await ensureTranscript();
      setCallIntelligence('loading');
      setScreen(SCREENS.INTELLIGENCE);
      const ci = await analyzeCallIntelligence(tx, meetingId, settings?.claudeApiKey);
      setCallIntelligence(ci);
    } catch (err) {
      setError(err.message);
      setBusyOp(null);
    }
  }

  // AI Powered Actionables → Product Gaps screen
  async function handleActionables() {
    setBusyOp('actionables');
    clearError();
    try {
      await ensureTranscript();
      setScreen(SCREENS.ANALYSIS);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyOp(null);
    }
  }

  // Meeting Minutes screen
  async function handleMOM() {
    setBusyOp('mom');
    clearError();
    try {
      await ensureTranscript();
      setScreen(SCREENS.MOM);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyOp(null);
    }
  }

  // Demo Scope Advisor
  async function handleDemoScope() {
    setBusyOp('demo_scope');
    clearError();
    try {
      await ensureTranscript();
      setScreen(SCREENS.DEMO_SCOPE);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyOp(null);
    }
  }

  // Exec Summary
  async function handleExecSummary() {
    setBusyOp('exec_summary');
    clearError();
    try {
      const tx = await ensureTranscript();
      setExecSummaryLoading();
      setScreen(SCREENS.EXEC_SUMMARY);
      generateExecSummary(tx, meetingId, settings?.claudeApiKey)
        .then(result => setExecSummary(result))
        .catch(err => setExecSummaryError(err.message));
    } catch (err) {
      setError(err.message);
      setBusyOp(null);
    }
  }

  // Solution Framework
  async function handleSolutionFramework() {
    setBusyOp('solution_framework');
    clearError();
    try {
      await ensureTranscript();
      setScreen(SCREENS.SOLUTION_FRAMEWORK);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyOp(null);
    }
  }

  // Chat with Call screen
  async function handleChat() {
    setBusyOp('chat');
    clearError();
    try {
      await ensureTranscript();
      setScreen(SCREENS.CHAT);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyOp(null);
    }
  }

  const isBusy           = busyOp !== null;
  const transcriptReady  = !!transcript;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      flex: 1, height: '100vh', overflow: 'hidden',
      background: '#fff',
    }}>
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: '28px 16px 20px',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Page title */}
        <div style={{ marginBottom: 6 }}>
          <h1 style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 26, fontWeight: 900, color: NAVY,
            textTransform: 'uppercase', letterSpacing: '-0.01em',
            lineHeight: 1.1, margin: 0,
          }}>
            CallScribe
          </h1>
          <p style={{ fontSize: 12, color: '#8A97A8', marginTop: 6, lineHeight: 1.55, fontWeight: 400, maxWidth: 280 }}>
            Import your Mindtickle calls for AI-powered analysis and insights.
          </p>
        </div>

        <div style={{ height: 1, background: '#E4E9F0', margin: '18px 0' }} />

        {/* CHECKING */}
        {status === STATUS.CHECKING && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px', borderRadius: 8,
            background: '#F5F7FA', border: '1px solid #E4E9F0',
            marginBottom: 16,
          }}>
            <Loader2 size={15} style={{ color: ORANGE, animation: 'spin 1s linear infinite', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#4B5A6D', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Scanning page...
            </span>
          </div>
        )}

        {/* FOUND */}
        {status === STATUS.FOUND && (
          <>
            {/* Status banner — changes after sync */}
            {transcriptReady ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 14px', borderRadius: 8,
                background: '#f0fdf4', border: '1px solid #dcfce7',
                marginBottom: 16,
              }}>
                <CheckCircle2 size={15} style={{ color: '#16a34a', flexShrink: 0 }} strokeWidth={2.5} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Transcript Ready
                  </div>
                  {callTitle && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {callTitle}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: '#8A97A8', marginTop: 1, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {meetingId}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 14px', borderRadius: 8,
                background: '#FFF4EF', border: '1px solid rgba(229,80,20,0.20)',
                marginBottom: 16,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', background: ORANGE,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Info size={11} color="#fff" strokeWidth={2.5} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Mindtickle Call Detected
                  </div>
                  {callTitle && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {callTitle}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: '#8A97A8', marginTop: 1, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {meetingId}
                  </div>
                </div>
              </div>
            )}

            {/* Sync button — only show when transcript not yet loaded */}
            {!transcriptReady && (
              <button
                type="button"
                disabled={isBusy}
                onClick={handleSync}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  height: 40,
                  background: isBusy ? '#C8D2DE' : ORANGE,
                  border: 'none', borderRadius: 8,
                  color: '#fff', fontSize: 12, fontWeight: 800,
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                  cursor: isBusy ? 'not-allowed' : 'pointer',
                  transition: 'background 130ms',
                  marginBottom: 18,
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => { if (!isBusy) e.currentTarget.style.background = '#CC4712'; }}
                onMouseLeave={(e) => { if (!isBusy) e.currentTarget.style.background = ORANGE; }}
              >
                {busyOp === 'sync'
                  ? <Spinner size={13} color="#fff" trackColor="rgba(255,255,255,0.3)" />
                  : <RotateCcw size={13} strokeWidth={2.5} />
                }
                {busyOp === 'sync' ? 'Syncing...' : 'Sync Mindtickle'}
              </button>
            )}

            <div style={{ height: 1, background: '#E4E9F0', marginBottom: 16 }} />

            {/* Chat with Call — standalone */}
            <div style={{ marginBottom: 16 }}>
              <QuickActionRow
                icon={MessageCircle}
                title="Chat with Call"
                disabled={isBusy}
                loading={busyOp === 'chat'}
                onClick={handleChat}
              />
            </div>

            {/* Insights section */}
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: '#8A97A8', marginBottom: 8,
            }}>
              Insights
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }} className="anim-stagger">
              <QuickActionRow
                icon={FileText}
                title="View Transcript"
                disabled={isBusy || !transcriptReady}
                loading={busyOp === 'transcribe'}
                onClick={handleTranscribe}
              />
              <QuickActionRow
                icon={BookOpen}
                title="Exec Summary"
                disabled={isBusy}
                loading={busyOp === 'exec_summary'}
                onClick={handleExecSummary}
              />
              <QuickActionRow
                icon={BarChart2}
                title="AI Powered Insights"
                disabled={isBusy}
                loading={busyOp === 'insights'}
                onClick={handleInsights}
              />
              <QuickActionRow
                icon={ClipboardList}
                title="Meeting Minutes"
                disabled={isBusy}
                loading={busyOp === 'mom'}
                onClick={handleMOM}
              />
              <QuickActionRow
                icon={Target}
                title="Demo Scope Advisor"
                disabled={isBusy}
                loading={busyOp === 'demo_scope'}
                onClick={handleDemoScope}
              />
              <QuickActionRow
                icon={Compass}
                title="Solution Framework"
                disabled={isBusy}
                loading={busyOp === 'solution_framework'}
                onClick={handleSolutionFramework}
              />
            </div>

            {/* Actions section */}
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: '#8A97A8', marginBottom: 8,
            }}>
              Actions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <QuickActionRow
                icon={ListChecks}
                title="AI Powered Actionables"
                disabled={isBusy}
                loading={busyOp === 'actionables'}
                onClick={handleActionables}
              />
              {transcript && (
                <div style={{ position: 'relative' }} ref={reportDlRef}>
                  <div
                    onClick={() => !isBusy && setReportDlOpen(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 14px',
                      border: `1px solid ${reportDlOpen ? '#C8D2DE' : '#E4E9F0'}`,
                      borderRadius: 8,
                      background: reportDlOpen ? '#FAFBFD' : '#fff',
                      cursor: isBusy ? 'default' : 'pointer',
                      opacity: isBusy ? 0.4 : 1,
                      transition: 'background 130ms, border-color 130ms',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <PackageOpen size={13} style={{ color: ORANGE, flexShrink: 0 }} strokeWidth={2.5} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                        Export Full Report
                      </span>
                    </div>
                    <ArrowRight size={13} style={{ color: '#A8B4C0', flexShrink: 0 }} strokeWidth={2} />
                  </div>
                  {reportDlOpen && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
                      background: '#fff', borderRadius: 8, border: '1px solid #E4E9F0',
                      boxShadow: '0 6px 20px rgba(13,23,38,0.10)', overflow: 'hidden',
                    }}>
                      {[
                        { fmt: 'md',  label: 'Markdown',         ext: '.md'  },
                        { fmt: 'doc', label: 'Word / Google Docs', ext: '.doc' },
                        { fmt: 'txt', label: 'Plain Text',        ext: '.txt' },
                      ].map(({ fmt, label, ext }) => (
                        <button key={fmt} type="button"
                          onClick={() => { downloadFullReport(useStore.getState(), fmt); setReportDlOpen(false); }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
                            borderBottom: fmt !== 'txt' ? '1px solid #F5F7FA' : 'none',
                            fontSize: 12, fontFamily: 'var(--font-sans)', fontWeight: 600,
                            color: NAVY, textAlign: 'left', gap: 12,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F7FA')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                        >
                          <span>{label}</span>
                          <span style={{ fontSize: 10, color: '#A8B4C0', fontWeight: 500 }}>{ext}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="banner error anim-slide-up" style={{ marginTop: 12 }}>
                <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}
          </>
        )}

        {/* NOT_FOUND / ERROR */}
        {(status === STATUS.NOT_FOUND || status === STATUS.ERROR) && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', borderRadius: 8,
              background: status === STATUS.ERROR ? '#fef2f2' : '#FFF4EF',
              border: `1px solid ${status === STATUS.ERROR ? '#fecaca' : 'rgba(229,80,20,0.20)'}`,
              marginBottom: 20,
            }}>
              <AlertTriangle size={15} style={{ color: status === STATUS.ERROR ? '#dc2626' : ORANGE, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {status === STATUS.ERROR ? 'Detection Failed' : 'No Recording Found'}
                </div>
                <div style={{ fontSize: 11, color: '#8A97A8', marginTop: 2 }}>
                  {status === STATUS.ERROR
                    ? 'Could not communicate with the page. Try refreshing.'
                    : 'Navigate to a Mindtickle call recording page to begin.'}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8A97A8', marginBottom: 8 }}>
              How to Get Started
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className="anim-stagger">
              {[
                { n: '1', title: 'Open a recording', desc: 'Navigate to a Mindtickle call recording URL.' },
                { n: '2', title: 'Wait for page to load', desc: 'Transcripts load async. Give it 5–10 seconds.' },
                { n: '3', title: 'Sync and analyze', desc: 'Click Sync Mindtickle, then choose an action.' },
              ].map(({ n, title, desc }) => (
                <div key={n} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '11px 13px', borderRadius: 8,
                  background: '#fff', border: '1px solid #E4E9F0',
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', background: ORANGE,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 1,
                    fontSize: 10, fontWeight: 800, color: '#fff',
                  }}>
                    {n}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{title}</div>
                    <div style={{ fontSize: 11, color: '#8A97A8', marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button
                type="button"
                onClick={detect}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  height: 40, borderRadius: 8,
                  background: ORANGE, border: 'none', color: '#fff',
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                <RefreshCw size={12} strokeWidth={2.5} /> Retry
              </button>
              <button
                type="button"
                onClick={() => setScreen(SCREENS.SETTINGS)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  height: 40, borderRadius: 8,
                  background: '#fff', border: '1px solid #E4E9F0', color: NAVY,
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                <Settings size={12} strokeWidth={2} /> Settings
              </button>
            </div>
          </>
        )}

        {/* API Status — pushed to bottom */}
        {status !== STATUS.CHECKING && (
          <div style={{ marginTop: 'auto', paddingTop: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8A97A8', marginBottom: 8 }}>
              API Connections
            </div>
            <APIStatusCard settings={settings} />
          </div>
        )}
      </div>
    </div>
  );
}
