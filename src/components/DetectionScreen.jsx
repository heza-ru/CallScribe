import React, { useEffect, useState } from 'react';
import { FileText, Settings, AlertTriangle, CheckCircle2, Loader2, Mic } from 'lucide-react';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { SCREENS } from '../constants';
import { parseChunks } from '../utils/mindtickleParser';

const STATUS = { CHECKING: 'checking', FOUND: 'found', NOT_FOUND: 'not_found', ERROR: 'error' };

export function DetectionScreen({ state, dispatch }) {
  const [status, setStatus] = useState(STATUS.CHECKING);
  const [loading, setLoading] = useState(false);

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

  function handleLoad() {
    if (!state.meetingId) return;
    setLoading(true);
    chrome.runtime.sendMessage(
      { type: 'FETCH_TRANSCRIPT', meetingId: state.meetingId, token: state.token },
      (res) => {
        setLoading(false);
        if (chrome.runtime.lastError || !res?.success) {
          dispatch({ type: 'SET_ERROR', error: res?.error || 'Failed to fetch transcript' });
          return;
        }
        const { plainText } = parseChunks(res.chunks);
        dispatch({ type: 'TRANSCRIPT_LOADED', chunks: res.chunks, transcript: plainText });
        dispatch({ type: 'SET_SCREEN', screen: SCREENS.TRANSCRIPT_ACTIONS });
      }
    );
  }

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

      {/* Body */}
      <div className="screen-body" style={{ gap: 12, paddingTop: 14 }}>

        {/* Status card */}
        <div className="section-group" style={{ paddingTop: 0 }}>
          <div className="section-label">Detection Status</div>

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
                  ID&ensp;
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

        {/* Quick actions */}
        {status === STATUS.FOUND && (
          <div className="section-group anim-slide-up">
            <div className="section-label">What you can do</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <InfoTile icon={FileText} iconBg="#ede9ff" iconColor="#2b21ba" title="Load & Analyze" desc="Fetch transcript, run Claude AI analysis" />
              <InfoTile icon={Settings} iconBg="#f6f6f8" iconColor="#999" title="Configure APIs" desc="Add Claude, JIRA and Productboard keys" />
            </div>
          </div>
        )}

        {/* Hints when nothing found */}
        {(status === STATUS.NOT_FOUND || status === STATUS.ERROR) && (
          <div className="section-group anim-fade-in">
            <div className="section-label">Tips</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {['Navigate to a Mindtickle recording URL', 'Make sure the page has finished loading', 'Refresh and click the extension again'].map((tip) => (
                <div key={tip} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#ccc', flexShrink: 0, marginTop: 6 }} />
                  <span className="text-meta" style={{ lineHeight: 1.5 }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {state.error && (
          <div className="banner error anim-slide-up">
            <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
            {state.error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="screen-footer">
        {status === STATUS.FOUND ? (
          <Button fullWidth size="lg" loading={loading} onClick={handleLoad} icon={loading ? undefined : FileText}>
            {loading ? 'Loading transcript…' : 'Load Transcript'}
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
      padding: '11px 13px',
      borderRadius: 12,
      background: tintStyles[tint]?.background || '#f6f6f8',
      boxShadow: tintStyles[tint]?.boxShadow || 'var(--shadow-card)',
    }}>
      {children}
    </div>
  );
}

function InfoTile({ icon: Icon, iconBg, iconColor, title, desc }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 11px',
      borderRadius: 10,
      background: '#f6f6f8',
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={13} style={{ color: iconColor }} strokeWidth={2} />
      </div>
      <div>
        <div className="text-heading">{title}</div>
        <div className="text-meta">{desc}</div>
      </div>
    </div>
  );
}
