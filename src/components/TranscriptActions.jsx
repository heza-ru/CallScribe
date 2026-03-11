import React, { useState } from 'react';
import { ArrowLeft, Download, Sparkles, TicketCheck, FileText, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { SCREENS } from '../constants';
import { analyzeTranscript } from '../services/claudeService';
import { downloadTranscript } from '../utils/transcriptFormatter';

const FORMATS = [
  { fmt: 'txt',  label: 'Plain Text (.txt)' },
  { fmt: 'md',   label: 'Markdown (.md)' },
  { fmt: 'json', label: 'JSON (.json)' },
];

export function TranscriptActions({ state, dispatch }) {
  const [analyzing, setAnalyzing]       = useState(false);
  const [error, setError]               = useState(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloaded, setDownloaded]     = useState(null);

  const wordCount = state.transcript
    ? state.transcript.split(/\s+/).filter(Boolean).length
    : 0;

  async function handleAnalyze() {
    setError(null);
    setAnalyzing(true);
    try {
      const insights = await analyzeTranscript(
        state.transcript, state.meetingId, state.settings?.claudeApiKey
      );
      dispatch({ type: 'INSIGHTS_LOADED', insights });
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  function handleDownload(fmt) {
    downloadTranscript(state.chunks, state.meetingId, fmt);
    setDownloaded(fmt);
    setDownloadOpen(false);
    setTimeout(() => setDownloaded(null), 2500);
  }

  return (
    <div className="screen anim-slide-in-right">
      {/* Header */}
      <div className="screen-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconButton icon={ArrowLeft} title="Back"
            onClick={() => dispatch({ type: 'SET_SCREEN', screen: SCREENS.DETECTION })} />
          <div>
            <div className="text-title">Transcript Ready</div>
            <div className="text-meta">Meeting {state.meetingId}</div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="screen-body" style={{ paddingTop: 14, gap: 8 }}>

        {/* Loaded indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 13px', borderRadius: 12,
          background: '#f0fdf4',
          boxShadow: '0 0 0 1px rgba(22,163,74,0.15)',
        }}>
          <CheckCircle2 size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="text-heading" style={{ color: '#16a34a' }}>Transcript loaded</div>
            <div className="text-meta">~{wordCount.toLocaleString()} words</div>
          </div>
        </div>

        {/* Preview */}
        <div style={{
          padding: '10px 12px', borderRadius: 10,
          background: '#f6f6f8',
          boxShadow: 'var(--shadow-card)',
          fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.55,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {state.transcript?.slice(0, 260)}…
        </div>

        {/* Actions */}
        <div className="section-group" style={{ paddingTop: 10 }}>
          <div className="section-label">Actions</div>
          <div className="anim-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

            {/* Analyze */}
            <ActionRow
              icon={Sparkles} iconBg="#ede9ff" iconColor="#2b21ba"
              title="Analyze with Claude AI"
              desc="Extract bugs, features & pain points"
              loading={analyzing}
              onClick={handleAnalyze}
            />

            {/* Download */}
            <div style={{ position: 'relative' }}>
              <ActionRow
                icon={Download} iconBg="#fff1eb" iconColor="#f26b3a"
                title="Download Transcript"
                desc="Export as TXT, Markdown or JSON"
                rightEl={downloaded
                  ? <CheckCircle2 size={13} style={{ color: '#16a34a' }} />
                  : <ChevronRight size={13} style={{
                      color: 'var(--color-text-muted)',
                      transform: downloadOpen ? 'rotate(90deg)' : 'none',
                      transition: 'transform 180ms ease',
                    }} />
                }
                onClick={() => setDownloadOpen((v) => !v)}
              />
              {downloadOpen && (
                <div className="anim-scale-in" style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20,
                  background: '#fff', borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                }}>
                  {FORMATS.map(({ fmt, label }, i) => (
                    <button key={fmt} type="button" onClick={() => handleDownload(fmt)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
                        borderBottom: i < FORMATS.length - 1 ? '1px solid #f0f0f0' : 'none',
                        fontSize: 12.5, fontFamily: 'var(--font-sans)', fontWeight: 500,
                        color: 'var(--color-text-dark)', transition: 'background 120ms ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f6f6f8')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      {label}
                      <Download size={11} style={{ color: '#ccc' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View previous analysis */}
            {state.insights.length > 0 && (
              <ActionRow
                icon={TicketCheck} iconBg="#f0fdf4" iconColor="#16a34a"
                title="View Analysis"
                desc={`${state.insights.length} insight${state.insights.length !== 1 ? 's' : ''} ready`}
                onClick={() => dispatch({ type: 'SET_SCREEN', screen: SCREENS.ANALYSIS })}
              />
            )}
          </div>
        </div>

        {error && <div className="banner error">{error}</div>}
      </div>

      {/* Footer */}
      <div className="screen-footer">
        <Button fullWidth size="lg" loading={analyzing} onClick={handleAnalyze} icon={analyzing ? undefined : Sparkles}>
          {analyzing ? 'Analyzing with Claude…' : 'Analyze Transcript'}
        </Button>
      </div>
    </div>
  );
}

function ActionRow({ icon: Icon, iconBg, iconColor, title, desc, onClick, loading, rightEl }) {
  return (
    <div onClick={!loading ? onClick : undefined} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 11px', borderRadius: 10,
      background: '#f6f6f8',
      boxShadow: 'var(--shadow-card)',
      cursor: loading ? 'default' : 'pointer',
      transition: 'background 130ms ease, box-shadow 130ms ease, transform 100ms ease',
      userSelect: 'none',
    }}
      onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = '#ededf1'; e.currentTarget.style.boxShadow = 'var(--shadow-lift)'; } }}
      onMouseLeave={(e) => { e.currentTarget.style.background = '#f6f6f8'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
      onMouseDown={(e)  => { if (!loading) e.currentTarget.style.transform = 'scale(0.99)'; }}
      onMouseUp={(e)    => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <div style={{ width: 30, height: 30, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {loading
          ? <span style={{ width: 13, height: 13, border: '1.5px solid #e0e0e0', borderTopColor: iconColor, borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
          : <Icon size={14} style={{ color: iconColor }} strokeWidth={2} />
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="text-heading">{loading ? 'Analyzing…' : title}</div>
        <div className="text-meta">{desc}</div>
      </div>
      {!loading && (rightEl ?? <ChevronRight size={13} style={{ color: '#ccc', flexShrink: 0 }} />)}
    </div>
  );
}
