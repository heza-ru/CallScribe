import React, { useEffect, useState } from 'react';
import { FileText, Settings, AlertTriangle, CheckCircle2, Loader2, Mic, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { SCREENS } from '../constants';
import { parseChunks } from '../utils/mindtickleParser';
import { analyzeTranscript } from '../services/claudeService';

const STATUS = { CHECKING: 'checking', FOUND: 'found', NOT_FOUND: 'not_found', ERROR: 'error' };

export function DetectionScreen({ state, dispatch }) {
  const [status, setStatus]   = useState(STATUS.CHECKING);
  const [loading, setLoading] = useState(false);
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
            const insights = await analyzeTranscript(plainText, state.meetingId, state.settings?.claudeApiKey);
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
    <div className="screen anim-slide-in-right">
      {/* Header */}
      <div className="screen-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, background: '#2b21ba', borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Mic size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-title">CallScribe</div>
            <div className="text-meta">Mindtickle Transcript Tool</div>
          </div>
        </div>
        <IconButton icon={Settings} title="Settings"
          onClick={() => dispatch({ type: 'SET_SCREEN', screen: SCREENS.SETTINGS })} />
      </div>

      {/* Body — flex:1 fills the side panel */}
      <div className="screen-body" style={{ paddingTop: 16, paddingBottom: 16, gap: 0 }}>

        {/* Status */}
        <div className="section-label">Detection Status</div>
        <div style={{ marginBottom: 16 }}>
          {status === STATUS.CHECKING && (
            <StatusCard anim="anim-fade-in">
              <Loader2 size={15} style={{ color: '#2b21ba', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
              <div>
                <div className="text-heading">Scanning page…</div>
                <div className="text-meta">Looking for a Mindtickle recording</div>
              </div>
            </StatusCard>
          )}
          {status === STATUS.FOUND && (
            <StatusCard anim="anim-pop-in" tint="success">
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="text-heading" style={{ color: '#16a34a' }}>Transcript detected</div>
                <div className="text-meta" style={{ marginTop: 2 }}>
                  Meeting ID&ensp;
                  <code style={{ fontFamily: 'monospace', fontSize: 10, background: 'rgba(22,163,74,0.1)', padding: '1px 6px', borderRadius: 4, color: '#16a34a' }}>
                    {state.meetingId}
                  </code>
                </div>
              </div>
            </StatusCard>
          )}
          {status === STATUS.NOT_FOUND && (
            <StatusCard anim="anim-fade-in">
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={14} style={{ color: '#d97706' }} />
              </div>
              <div>
                <div className="text-heading">No recording found</div>
                <div className="text-meta">Open a Mindtickle recording URL</div>
              </div>
            </StatusCard>
          )}
          {status === STATUS.ERROR && (
            <StatusCard anim="anim-fade-in" tint="error">
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={14} style={{ color: '#dc2626' }} />
              </div>
              <div>
                <div className="text-heading" style={{ color: '#dc2626' }}>Detection failed</div>
                <div className="text-meta">Could not communicate with the page</div>
              </div>
            </StatusCard>
          )}
        </div>

        {/* Clickable actions when transcript found */}
        {status === STATUS.FOUND && (
          <div className="anim-slide-up">
            <div className="section-label">Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ActionTile
                icon={FileText}
                iconBg="#ede9ff" iconColor="#2b21ba"
                title="Load Transcript"
                desc="Fetch and preview the full transcript"
                disabled={isBusy}
                loading={loading && !analyzing}
                onClick={() => handleLoad(false)}
              />
              <ActionTile
                icon={Sparkles}
                iconBg="#fff1eb" iconColor="#f26b3a"
                title="Load & Analyze"
                desc="Fetch transcript and run Claude AI instantly"
                disabled={isBusy}
                loading={analyzing}
                onClick={() => handleLoad(true)}
              />
              <ActionTile
                icon={Settings}
                iconBg="#f6f6f8" iconColor="#888"
                title="Configure APIs"
                desc="Add Claude, JIRA and Productboard keys"
                disabled={isBusy}
                onClick={() => dispatch({ type: 'SET_SCREEN', screen: SCREENS.SETTINGS })}
              />
            </div>
          </div>
        )}

        {/* Tips when nothing found */}
        {(status === STATUS.NOT_FOUND || status === STATUS.ERROR) && (
          <div className="anim-fade-in">
            <div className="section-label">Tips</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                'Navigate to a Mindtickle recording URL',
                'Make sure the page has finished loading',
                'Refresh and click the extension again',
              ].map((tip) => (
                <div key={tip} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#ccc', flexShrink: 0, marginTop: 7 }} />
                  <span className="text-meta" style={{ lineHeight: 1.55 }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {state.error && (
          <div className="banner error anim-slide-up" style={{ marginTop: 12 }}>
            <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
            {state.error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="screen-footer">
        {status === STATUS.FOUND ? (
          <Button fullWidth size="lg" loading={isBusy} onClick={() => handleLoad(false)} icon={isBusy ? undefined : FileText}>
            {analyzing ? 'Analyzing with Claude…' : loading ? 'Loading transcript…' : 'Load Transcript'}
          </Button>
        ) : status === STATUS.CHECKING ? (
          <Button fullWidth size="lg" variant="secondary" disabled>Detecting…</Button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button fullWidth size="lg" variant="secondary" onClick={detect}>Retry</Button>
            <Button fullWidth size="lg" variant="ghost" icon={Settings}
              onClick={() => dispatch({ type: 'SET_SCREEN', screen: SCREENS.SETTINGS })}>
              Settings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusCard({ children, anim = '', tint }) {
  const tintStyles = {
    success: { background: '#f0fdf4', boxShadow: '0 0 0 1px rgba(22,163,74,0.15)' },
    error:   { background: '#fef2f2', boxShadow: '0 0 0 1px rgba(220,38,38,0.12)' },
  };
  return (
    <div className={anim} style={{
      display: 'flex', alignItems: 'center', gap: 11,
      padding: '11px 13px', borderRadius: 12,
      background: tintStyles[tint]?.background || '#f6f6f8',
      boxShadow: tintStyles[tint]?.boxShadow || 'var(--shadow-card)',
    }}>
      {children}
    </div>
  );
}

function ActionTile({ icon: Icon, iconBg, iconColor, title, desc, onClick, disabled, loading }) {
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 13px', borderRadius: 12,
        background: '#f6f6f8',
        boxShadow: 'var(--shadow-card)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled && !loading ? 0.5 : 1,
        transition: 'background 130ms ease, box-shadow 130ms ease, transform 100ms ease',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = '#ededf1'; e.currentTarget.style.boxShadow = 'var(--shadow-lift)'; }}}
      onMouseLeave={(e) => { e.currentTarget.style.background = '#f6f6f8'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
      onMouseDown={(e)  => { if (!disabled) e.currentTarget.style.transform = 'scale(0.99)'; }}
      onMouseUp={(e)    => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {loading
          ? <span style={{ width: 14, height: 14, border: '2px solid #e0e0e0', borderTopColor: iconColor, borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
          : <Icon size={15} style={{ color: iconColor }} strokeWidth={2} />
        }
      </div>
      <div style={{ flex: 1 }}>
        <div className="text-heading">{title}</div>
        <div className="text-meta" style={{ marginTop: 2 }}>{desc}</div>
      </div>
      <ChevronRight size={14} style={{ color: '#ccc', flexShrink: 0 }} />
    </div>
  );
}
