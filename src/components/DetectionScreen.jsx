import React, { useEffect, useState } from 'react';
import {
  FileText, Settings, AlertTriangle, CheckCircle2, Loader2, Mic,
  Sparkles, ChevronRight, ArrowRight, Zap, Layers, RefreshCw,
} from 'lucide-react';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { SCREENS } from '../constants';
import { parseChunks } from '../utils/mindtickleParser';
import { analyzeTranscript } from '../services/claudeService';

const STATUS = { CHECKING: 'checking', FOUND: 'found', NOT_FOUND: 'not_found', ERROR: 'error' };

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

function ActionTile({ icon: Icon, iconBg, iconColor, title, desc, onClick, disabled, loading, badge }) {
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 12,
        background: '#fff',
        boxShadow: 'var(--shadow-card)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled && !loading ? 0.48 : 1,
        transition: 'background 130ms ease, box-shadow 130ms ease, transform 100ms ease',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = '#fafafa';
          e.currentTarget.style.boxShadow = 'var(--shadow-lift)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#fff';
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(0.985)'; }}
      onMouseUp={(e)   => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10, background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {loading
          ? <span style={{ width: 15, height: 15, border: '2px solid rgba(0,0,0,0.1)', borderTopColor: iconColor, borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
          : <Icon size={16} style={{ color: iconColor }} strokeWidth={2} />
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="text-heading">{title}</span>
          {badge && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: '#f26b3a', background: '#fff1eb',
              padding: '1px 5px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.05em',
              flexShrink: 0,
            }}>
              {badge}
            </span>
          )}
        </div>
        <div className="text-meta" style={{ marginTop: 2 }}>{desc}</div>
      </div>

      <ChevronRight size={13} style={{ color: '#ccc', flexShrink: 0 }} />
    </div>
  );
}

function WorkflowStrip() {
  const steps = [
    { label: 'Fetch',       color: '#2b21ba', bg: '#ede9ff' },
    { label: 'AI Analysis', color: '#f26b3a', bg: '#fff1eb' },
    { label: 'JIRA',        color: '#0369a1', bg: '#f0f9ff' },
    { label: 'Productboard',color: '#d97706', bg: '#fffbeb' },
  ];
  return (
    <div style={{
      padding: '11px 13px', borderRadius: 10,
      background: '#f6f6f8', boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: '#aaa', marginBottom: 8,
      }}>
        Workflow
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {steps.map((s, i) => (
          <React.Fragment key={s.label}>
            <div style={{
              flex: 1, textAlign: 'center',
              padding: '5px 4px', borderRadius: 6,
              background: s.bg, fontSize: 10, fontWeight: 600, color: s.color,
            }}>
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <ArrowRight size={9} style={{ color: '#ccc', flexShrink: 0 }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, color, bg, title, desc }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 6, padding: '12px 8px', borderRadius: 10,
      background: bg, textAlign: 'center',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 7, background: color + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={13} style={{ color }} strokeWidth={2} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color, lineHeight: 1.2 }}>{title}</div>
      <div style={{ fontSize: 10, color: '#888', lineHeight: 1.4 }}>{desc}</div>
    </div>
  );
}

function StepCard({ n, title, desc }) {
  return (
    <div style={{
      display: 'flex', gap: 11, alignItems: 'flex-start',
      padding: '11px 13px', borderRadius: 10,
      background: '#fff', boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', background: '#ede9ff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 1,
        fontSize: 10.5, fontWeight: 700, color: '#2b21ba',
      }}>
        {n}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="text-heading" style={{ fontSize: 12.5 }}>{title}</div>
        <div className="text-meta" style={{ marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
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
      <div className="screen-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, background: '#2b21ba', borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Mic size={15} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-title">CallScribe</div>
            <div className="text-meta">Mindtickle · Whatfix</div>
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
              width: 52, height: 52, borderRadius: 14, background: '#ede9ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Loader2 size={22} style={{ color: '#2b21ba', animation: 'spin 1s linear infinite' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="text-heading" style={{ fontSize: 14 }}>Scanning page…</div>
              <div className="text-meta" style={{ marginTop: 4 }}>Looking for a Mindtickle recording</div>
            </div>
          </div>
        )}

        {/* FOUND */}
        {status === STATUS.FOUND && (
          <>
            {/* Status card */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', borderRadius: 12,
              background: '#f0fdf4', boxShadow: '0 0 0 1px rgba(22,163,74,0.18)',
              marginBottom: 18,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9, background: '#dcfce7',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <CheckCircle2 size={15} style={{ color: '#16a34a' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="text-heading" style={{ color: '#15803d' }}>Recording detected</div>
                <div className="text-meta" style={{ marginTop: 3 }}>
                  Meeting&ensp;
                  <code style={{
                    fontFamily: 'monospace', fontSize: 10.5,
                    background: 'rgba(22,163,74,0.12)', padding: '1px 7px',
                    borderRadius: 4, color: '#15803d',
                  }}>
                    {state.meetingId}
                  </code>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{
              fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: '#aaa', marginBottom: 8,
            }}>
              Actions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className="anim-stagger">
              <ActionTile
                icon={Sparkles} iconBg="#fff1eb" iconColor="#f26b3a"
                title="Load & Analyze" desc="Fetch transcript + extract JIRA bugs & Productboard insights"
                badge="Recommended"
                disabled={isBusy} loading={analyzing}
                onClick={() => handleLoad(true)}
              />
              <ActionTile
                icon={FileText} iconBg="#ede9ff" iconColor="#2b21ba"
                title="Load Transcript" desc="Preview the transcript before running analysis"
                disabled={isBusy} loading={loading && !analyzing}
                onClick={() => handleLoad(false)}
              />
              <ActionTile
                icon={Settings} iconBg="#f6f6f8" iconColor="#777"
                title="Configure APIs" desc="Set up Claude AI, JIRA, and Productboard credentials"
                disabled={isBusy}
                onClick={() => dispatch({ type: 'SET_SCREEN', screen: SCREENS.SETTINGS })}
              />
            </div>

            {/* Error */}
            {state.error && (
              <div className="banner error anim-slide-up" style={{ marginTop: 10 }}>
                <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                {state.error}
              </div>
            )}

            {/* Workflow strip — pushed to bottom */}
            <div style={{ marginTop: 'auto', paddingTop: 18 }}>
              <WorkflowStrip />
            </div>
          </>
        )}

        {/* NOT_FOUND / ERROR */}
        {(status === STATUS.NOT_FOUND || status === STATUS.ERROR) && (
          <>
            {/* Status card */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 11,
              padding: '12px 14px', borderRadius: 12,
              background: status === STATUS.ERROR ? '#fef2f2' : '#fffbeb',
              boxShadow: `0 0 0 1px rgba(${status === STATUS.ERROR ? '220,38,38' : '217,119,6'},0.14)`,
              marginBottom: 18,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: status === STATUS.ERROR ? '#fee2e2' : '#fef3c7',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <AlertTriangle size={15} style={{ color: status === STATUS.ERROR ? '#dc2626' : '#d97706' }} />
              </div>
              <div>
                <div className="text-heading" style={{ color: status === STATUS.ERROR ? '#b91c1c' : '#92400e' }}>
                  {status === STATUS.ERROR ? 'Detection failed' : 'No recording found'}
                </div>
                <div className="text-meta" style={{ marginTop: 3 }}>
                  {status === STATUS.ERROR
                    ? 'Could not communicate with the page. Try refreshing.'
                    : 'Navigate to a Mindtickle call recording page to begin.'}
                </div>
              </div>
            </div>

            {/* Steps */}
            <div style={{
              fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: '#aaa', marginBottom: 8,
            }}>
              How to get started
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }} className="anim-stagger">
              <StepCard n={1} title="Open a recording" desc="Navigate to a Mindtickle call recording URL — the URL contains /call/ or /recording/" />
              <StepCard n={2} title="Wait for the page to fully load" desc="Transcripts load asynchronously. Give it 5–10 seconds after the page appears." />
              <StepCard n={3} title='Click "Load & Analyze"' desc="CallScribe will fetch the transcript and extract Whatfix product insights automatically." />
            </div>

            {/* Feature highlights — pushed to bottom */}
            <div style={{ marginTop: 'auto', paddingTop: 18 }}>
              <div style={{
                fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: '#aaa', marginBottom: 8,
              }}>
                What CallScribe does
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
                <FeatureCard icon={Sparkles} color="#f26b3a" bg="#fff8f5" title="AI Analysis" desc="Claude extracts bugs, features & pain points" />
                <FeatureCard icon={Zap}      color="#2b21ba" bg="#f5f3ff" title="JIRA Tickets" desc="Bugs & improvements go straight to your board" />
                <FeatureCard icon={Layers}   color="#d97706" bg="#fffbeb" title="Productboard" desc="Features & pain points as product insights" />
              </div>
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
              {analyzing ? 'Analyzing with Claude…' : 'Load & Analyze'}
            </Button>
          </div>
        ) : status === STATUS.CHECKING ? (
          <Button fullWidth size="md" variant="secondary" disabled>
            Detecting…
          </Button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              style={{ flex: 1, minWidth: 0, flexShrink: 1 }}
              size="md" variant="primary"
              icon={RefreshCw}
              onClick={detect}
            >
              Retry
            </Button>
            <Button
              style={{ flex: 1, minWidth: 0, flexShrink: 1 }}
              size="md" variant="secondary"
              icon={Settings}
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
