import React, { useEffect, useState } from 'react';
import {
  FileText, Settings, AlertTriangle, CheckCircle2, Loader2, Mic,
  Sparkles, ChevronRight, Zap, Layers, RefreshCw, Circle,
} from 'lucide-react';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { SCREENS } from '../constants';
import { parseChunks } from '../utils/mindtickleParser';
import { analyzeTranscript } from '../services/claudeService';

const STATUS = { CHECKING: 'checking', FOUND: 'found', NOT_FOUND: 'not_found', ERROR: 'error' };

const BLUE = '#2563EB';
const BLUE_LIGHT = '#EFF6FF';

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

function ActionTile({ icon: Icon, iconBg, iconColor, title, desc, onClick, disabled, loading, badge }) {
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 10,
        background: '#fff',
        border: '1px solid #e8edf5',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled && !loading ? 0.48 : 1,
        transition: 'background 130ms, box-shadow 130ms, transform 100ms',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = '#f8faff';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.08)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#fff';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(0.985)'; }}
      onMouseUp={(e)   => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 9, background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {loading
          ? <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.1)', borderTopColor: iconColor, borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
          : <Icon size={15} style={{ color: iconColor }} strokeWidth={2} />
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{title}</span>
          {badge && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: '#f26b3a', background: '#fff1eb',
              padding: '1px 5px', borderRadius: 3, textTransform: 'uppercase',
              letterSpacing: '0.05em', flexShrink: 0,
            }}>
              {badge}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{desc}</div>
      </div>

      <ChevronRight size={13} style={{ color: '#cbd5e1', flexShrink: 0 }} />
    </div>
  );
}

function APIStatusCard({ settings }) {
  const checks = [
    {
      label: 'Claude AI',
      ok: !!settings?.claudeApiKey,
      hint: 'console.anthropic.com',
    },
    {
      label: 'JIRA',
      ok: !!(settings?.jiraBaseUrl && settings?.jiraApiToken && settings?.jiraProjectKey),
      hint: settings?.jiraProjectKey ? `Project: ${settings.jiraProjectKey}` : 'Not configured',
    },
    {
      label: 'Productboard',
      ok: !!settings?.productboardApiKey,
      hint: 'Developer token',
    },
  ];

  return (
    <div style={{
      borderRadius: 10, border: '1px solid #e8edf5',
      background: '#fff', overflow: 'hidden',
    }}>
      {checks.map((c, i) => (
        <div key={c.label} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 14px',
          borderBottom: i < checks.length - 1 ? '1px solid #f1f5f9' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: c.ok ? '#22c55e' : '#e2e8f0',
              boxShadow: c.ok ? '0 0 0 2px rgba(34,197,94,0.2)' : 'none',
            }} />
            <span style={{ fontSize: 12.5, fontWeight: 500, color: '#1e293b' }}>{c.label}</span>
          </div>
          <span style={{
            fontSize: 10.5, fontWeight: 500,
            color: c.ok ? '#16a34a' : '#94a3b8',
          }}>
            {c.ok ? 'Ready' : 'Not set'}
          </span>
        </div>
      ))}
    </div>
  );
}

function StepCard({ n, title, desc }) {
  return (
    <div style={{
      display: 'flex', gap: 11, alignItems: 'flex-start',
      padding: '11px 13px', borderRadius: 10,
      background: '#fff', border: '1px solid #e8edf5',
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', background: BLUE_LIGHT,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 1,
        fontSize: 10.5, fontWeight: 700, color: BLUE,
      }}>
        {n}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>{title}</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────

export function DetectionScreen({ state, dispatch }) {
  const [status,    setStatus]    = useState(STATUS.CHECKING);
  const [loading,   setLoading]   = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => { detect(); }, []);

  function detect() {
    setStatus(STATUS.CHECKING);
    chrome.runtime.sendMessage({ type: 'GET_TAB_STATE' }, (res) => {
      if (chrome.runtime.lastError) { setStatus(STATUS.ERROR); return; }
      if (res?.found && res?.meetingId) {
        dispatch({ type: 'TRANSCRIPT_DETECTED', meetingId: res.meetingId, token: res.token });
        setStatus(STATUS.FOUND);
      } else {
        setStatus(STATUS.NOT_FOUND);
      }
    });
  }

  function handleLoad(thenAnalyze = false) {
    if (!state.meetingId) return;
    setLoading(true);
    chrome.runtime.sendMessage(
      { type: 'FETCH_TRANSCRIPT', meetingId: state.meetingId, token: state.token },
      async (res) => {
        setLoading(false);
        if (chrome.runtime.lastError || !res?.success) {
          dispatch({ type: 'SET_ERROR', error: res?.error || 'Failed to fetch transcript' });
          return;
        }
        const { plainText } = parseChunks(res.chunks);
        dispatch({ type: 'TRANSCRIPT_LOADED', chunks: res.chunks, transcript: plainText });

        if (thenAnalyze) {
          setAnalyzing(true);
          try {
            const insights = await analyzeTranscript(
              plainText, state.meetingId, state.settings?.claudeApiKey
            );
            dispatch({ type: 'INSIGHTS_LOADED', insights });
          } catch (err) {
            dispatch({ type: 'SET_ERROR', error: err.message });
            dispatch({ type: 'SET_SCREEN', screen: SCREENS.TRANSCRIPT_ACTIONS });
          } finally {
            setAnalyzing(false);
          }
        } else {
          dispatch({ type: 'SET_SCREEN', screen: SCREENS.TRANSCRIPT_ACTIONS });
        }
      }
    );
  }

  const isBusy = loading || analyzing;

  return (
    <div className="screen">
      {/* ── Header ── */}
      <div className="screen-header" style={{ background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, background: BLUE, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Mic size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', letterSpacing: '-0.01em' }}>CallScribe</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Mindtickle · Whatfix</div>
          </div>
        </div>
        <IconButton icon={Settings} title="Settings"
          onClick={() => dispatch({ type: 'SET_SCREEN', screen: SCREENS.SETTINGS })} />
      </div>

      {/* ── Body ── */}
      <div className="screen-body" style={{ paddingTop: 14, paddingBottom: 14 }}>

        {/* CHECKING */}
        {status === STATUS.CHECKING && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 14, padding: '60px 0',
          }}>
            <div style={{
              width: 50, height: 50, borderRadius: 14, background: BLUE_LIGHT,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Loader2 size={22} style={{ color: BLUE, animation: 'spin 1s linear infinite' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Scanning page…</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Looking for a Mindtickle recording</div>
            </div>
          </div>
        )}

        {/* FOUND */}
        {status === STATUS.FOUND && (
          <>
            {/* Status card */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 14px', borderRadius: 10,
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              marginBottom: 16,
            }}>
              <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>Recording detected</div>
                <div style={{ fontSize: 11, color: '#4ade80', marginTop: 2 }}>
                  <span style={{ color: '#166534' }}>Meeting&ensp;</span>
                  <code style={{
                    fontFamily: 'monospace', fontSize: 10.5,
                    background: 'rgba(22,163,74,0.1)', padding: '1px 7px',
                    borderRadius: 4, color: '#15803d',
                  }}>
                    {state.meetingId}
                  </code>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 8 }}>
              Actions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }} className="anim-stagger">
              <ActionTile
                icon={Sparkles} iconBg="#fff1eb" iconColor="#f26b3a"
                title="Load & Analyze" desc="Fetch transcript + extract JIRA bugs & Productboard insights"
                badge="Recommended"
                disabled={isBusy} loading={analyzing}
                onClick={() => handleLoad(true)}
              />
              <ActionTile
                icon={FileText} iconBg={BLUE_LIGHT} iconColor={BLUE}
                title="Load Transcript" desc="Preview the transcript before running analysis"
                disabled={isBusy} loading={loading && !analyzing}
                onClick={() => handleLoad(false)}
              />
              <ActionTile
                icon={Settings} iconBg="#f8fafc" iconColor="#64748b"
                title="Configure APIs" desc="Set up Claude AI, JIRA, and Productboard credentials"
                disabled={isBusy}
                onClick={() => dispatch({ type: 'SET_SCREEN', screen: SCREENS.SETTINGS })}
              />
            </div>

            {state.error && (
              <div className="banner error anim-slide-up" style={{ marginTop: 10 }}>
                <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                {state.error}
              </div>
            )}

            {/* API Status — pushed to bottom */}
            <div style={{ marginTop: 'auto', paddingTop: 18 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 7 }}>
                API Connections
              </div>
              <APIStatusCard settings={state.settings} />
            </div>
          </>
        )}

        {/* NOT_FOUND / ERROR */}
        {(status === STATUS.NOT_FOUND || status === STATUS.ERROR) && (
          <>
            {/* Status card */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 11,
              padding: '11px 14px', borderRadius: 10,
              background: status === STATUS.ERROR ? '#fef2f2' : '#fffbeb',
              border: `1px solid ${status === STATUS.ERROR ? '#fecaca' : '#fde68a'}`,
              marginBottom: 16,
            }}>
              <AlertTriangle size={16} style={{ color: status === STATUS.ERROR ? '#dc2626' : '#d97706', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: status === STATUS.ERROR ? '#b91c1c' : '#92400e' }}>
                  {status === STATUS.ERROR ? 'Detection failed' : 'No recording found'}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  {status === STATUS.ERROR
                    ? 'Could not communicate with the page. Try refreshing.'
                    : 'Navigate to a Mindtickle call recording page to begin.'}
                </div>
              </div>
            </div>

            {/* Steps */}
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 8 }}>
              How to get started
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }} className="anim-stagger">
              <StepCard n={1} title="Open a recording" desc="Navigate to a Mindtickle call recording URL — the URL contains /call/ or /recording/" />
              <StepCard n={2} title="Wait for the page to fully load" desc="Transcripts load asynchronously. Give it 5–10 seconds after the page appears." />
              <StepCard n={3} title='Click "Load & Analyze"' desc="CallScribe will fetch the transcript and extract Whatfix product insights automatically." />
            </div>

            {/* API Status — pushed to bottom */}
            <div style={{ marginTop: 'auto', paddingTop: 18 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 7 }}>
                API Connections
              </div>
              <APIStatusCard settings={state.settings} />
            </div>
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="screen-footer">
        {status === STATUS.FOUND ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              style={{ flex: 1, minWidth: 0, flexShrink: 1 }}
              size="md" variant="secondary"
              loading={loading && !analyzing} disabled={isBusy}
              icon={loading && !analyzing ? undefined : FileText}
              onClick={() => handleLoad(false)}
            >
              {loading && !analyzing ? 'Loading…' : 'Preview'}
            </Button>
            <Button
              style={{ flex: 2, minWidth: 0, flexShrink: 1 }}
              size="md" variant="accent"
              loading={analyzing} disabled={isBusy}
              icon={analyzing ? undefined : Sparkles}
              onClick={() => handleLoad(true)}
            >
              {analyzing ? 'Analyzing…' : 'Load & Analyze'}
            </Button>
          </div>
        ) : status === STATUS.CHECKING ? (
          <Button fullWidth size="md" variant="secondary" disabled>Detecting…</Button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              style={{ flex: 1, minWidth: 0, flexShrink: 1 }}
              size="md" variant="primary" icon={RefreshCw}
              onClick={detect}
            >
              Retry
            </Button>
            <Button
              style={{ flex: 1, minWidth: 0, flexShrink: 1 }}
              size="md" variant="secondary" icon={Settings}
              onClick={() => dispatch({ type: 'SET_SCREEN', screen: SCREENS.SETTINGS })}
            >
              Settings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
