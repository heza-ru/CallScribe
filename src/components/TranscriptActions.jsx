import React, { useState, useMemo } from 'react';
import {
  ArrowLeft, Download, Sparkles, TicketCheck, FileText,
  CheckCircle2, ChevronRight, Users, AlignLeft, Clock,
} from 'lucide-react';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { SCREENS } from '../constants';
import { analyzeTranscript } from '../services/claudeService';
import { downloadTranscript } from '../utils/transcriptFormatter';

const FORMATS = [
  { fmt: 'txt',  label: 'Plain Text (.txt)',  icon: '📄' },
  { fmt: 'md',   label: 'Markdown (.md)',      icon: '📝' },
  { fmt: 'json', label: 'JSON (.json)',         icon: '🗂️' },
];

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

function StatPill({ icon: Icon, label, value }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      padding: '10px 8px', borderRadius: 10,
      background: '#f6f6f8', boxShadow: 'var(--shadow-card)',
      minWidth: 0,
    }}>
      <Icon size={13} style={{ color: '#2b21ba' }} strokeWidth={2} />
      <div style={{ fontSize: 13, fontWeight: 700, color: '#111', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#aaa', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  );
}

function ActionRow({ icon: Icon, iconBg, iconColor, title, desc, onClick, loading, rightEl }) {
  return (
    <div
      onClick={!loading ? onClick : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 11,
        padding: '11px 13px', borderRadius: 11,
        background: '#fff', boxShadow: 'var(--shadow-card)',
        cursor: loading ? 'default' : 'pointer',
        transition: 'background 130ms ease, box-shadow 130ms ease, transform 100ms ease',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.background = '#fafafa';
          e.currentTarget.style.boxShadow = 'var(--shadow-lift)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#fff';
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
      }}
      onMouseDown={(e)  => { if (!loading) e.currentTarget.style.transform = 'scale(0.985)'; }}
      onMouseUp={(e)    => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 9, background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {loading
          ? <span style={{ width: 14, height: 14, border: '1.5px solid rgba(0,0,0,0.1)', borderTopColor: iconColor, borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
          : <Icon size={15} style={{ color: iconColor }} strokeWidth={2} />
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="text-heading">{loading ? 'Analyzing…' : title}</div>
        <div className="text-meta" style={{ marginTop: 2 }}>{desc}</div>
      </div>
      {!loading && (rightEl ?? <ChevronRight size={13} style={{ color: '#ccc', flexShrink: 0 }} />)}
    </div>
  );
}

// ─────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────

export function TranscriptActions({ state, dispatch }) {
  const [analyzing,    setAnalyzing]    = useState(false);
  const [error,        setError]        = useState(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloaded,   setDownloaded]   = useState(null);

  // ── Derived transcript stats ──
  const { wordCount, lineCount, speakers, estimatedMins } = useMemo(() => {
    const text = state.transcript || '';
    const words = text.split(/\s+/).filter(Boolean);
    const lines = text.split('\n').filter((l) => l.trim());
    const spk = new Set();
    lines.forEach((line) => {
      const ci = line.indexOf(':');
      if (ci > 0) spk.add(line.slice(0, ci).trim());
    });
    // average reading pace for transcripts is ~130 wpm
    const mins = Math.max(1, Math.round(words.length / 130));
    return {
      wordCount:     words.length,
      lineCount:     lines.length,
      speakers:      [...spk],
      estimatedMins: mins,
    };
  }, [state.transcript]);

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
      {/* ── Header ── */}
      <div className="screen-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <IconButton icon={ArrowLeft} title="Back"
            onClick={() => dispatch({ type: 'SET_SCREEN', screen: SCREENS.DETECTION })} />
          <div>
            <div className="text-title">Transcript Ready</div>
            <div className="text-meta">Meeting {state.meetingId}</div>
          </div>
        </div>
        {state.insights.length > 0 && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_SCREEN', screen: SCREENS.ANALYSIS })}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
              background: '#f0fdf4', border: 'none', borderRadius: 20, cursor: 'pointer',
              fontSize: 11, fontWeight: 600, color: '#16a34a',
              boxShadow: '0 0 0 1px rgba(22,163,74,0.2)',
            }}
          >
            <TicketCheck size={11} />
            {state.insights.length} insight{state.insights.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="screen-body" style={{ paddingTop: 14, paddingBottom: 14, gap: 12 }}>

        {/* ── Stats row ── */}
        <div style={{ display: 'flex', gap: 7 }}>
          <StatPill icon={AlignLeft} label="Words"   value={wordCount.toLocaleString()} />
          <StatPill icon={Users}     label="Speakers" value={speakers.length || '—'} />
          <StatPill icon={Clock}     label="~Minutes" value={`${estimatedMins}m`} />
        </div>

        {/* ── Speaker chips ── */}
        {speakers.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            {speakers.slice(0, 6).map((s) => (
              <span key={s} style={{
                fontSize: 10.5, fontWeight: 500, color: '#555',
                background: '#f0f0f8', borderRadius: 5, padding: '2px 8px',
              }}>
                {s}
              </span>
            ))}
            {speakers.length > 6 && (
              <span style={{ fontSize: 10, color: '#aaa' }}>
                +{speakers.length - 6} more
              </span>
            )}
          </div>
        )}

        {/* ── Transcript preview ── */}
        <div style={{
          padding: '11px 13px', borderRadius: 10,
          background: '#f6f6f8', boxShadow: 'var(--shadow-card)',
          fontSize: 11, color: 'var(--color-text-secondary)',
          lineHeight: 1.65,
          // Show up to 6 lines
          display: '-webkit-box',
          WebkitLineClamp: 6,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {state.transcript?.slice(0, 600)}…
        </div>

        {/* ── Actions ── */}
        <div>
          <div style={{
            fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: '#aaa', marginBottom: 8,
          }}>
            Actions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }} className="anim-stagger">

            {/* Analyze */}
            <ActionRow
              icon={Sparkles} iconBg="#fff1eb" iconColor="#f26b3a"
              title="Analyze with Claude AI"
              desc="Extract Whatfix bugs, features & pain points"
              loading={analyzing}
              onClick={handleAnalyze}
            />

            {/* Download */}
            <div style={{ position: 'relative' }}>
              <ActionRow
                icon={Download} iconBg="#ede9ff" iconColor="#2b21ba"
                title="Download Transcript"
                desc="Export as TXT, Markdown, or JSON"
                rightEl={
                  downloaded
                    ? <CheckCircle2 size={13} style={{ color: '#16a34a', flexShrink: 0 }} />
                    : <ChevronRight size={13} style={{
                        color: '#ccc', flexShrink: 0,
                        transform: downloadOpen ? 'rotate(90deg)' : 'none',
                        transition: 'transform 180ms ease',
                      }} />
                }
                onClick={() => setDownloadOpen((v) => !v)}
              />
              {downloadOpen && (
                <div className="anim-scale-in" style={{
                  position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0, zIndex: 20,
                  background: '#fff', borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                }}>
                  {FORMATS.map(({ fmt, label, icon }, i) => (
                    <button key={fmt} type="button" onClick={() => handleDownload(fmt)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
                        borderBottom: i < FORMATS.length - 1 ? '1px solid #f0f0f0' : 'none',
                        fontSize: 12.5, fontFamily: 'var(--font-sans)', fontWeight: 500,
                        color: 'var(--color-text-dark)', transition: 'background 120ms ease',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f6f6f8')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      <span style={{ fontSize: 14 }}>{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View previous analysis if exists */}
            {state.insights.length > 0 && (
              <ActionRow
                icon={TicketCheck} iconBg="#f0fdf4" iconColor="#16a34a"
                title="View Analysis Results"
                desc={`${state.insights.length} insight${state.insights.length !== 1 ? 's' : ''} ready · click to review`}
                onClick={() => dispatch({ type: 'SET_SCREEN', screen: SCREENS.ANALYSIS })}
              />
            )}
          </div>
        </div>

        {error && <div className="banner error">{error}</div>}

        {/* ── Bottom hint card — pushed to bottom ── */}
        <div style={{ marginTop: 'auto', paddingTop: 4 }}>
          <div style={{
            padding: '10px 13px', borderRadius: 10,
            background: '#f5f3ff',
            boxShadow: '0 0 0 1px rgba(43,33,186,0.10)',
            fontSize: 11, color: '#555', lineHeight: 1.55,
          }}>
            <span style={{ fontWeight: 600, color: '#2b21ba' }}>Tip: </span>
            Use <strong>Load & Analyze</strong> from the Detection screen to skip this step and go straight to insights.
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="screen-footer">
        <Button
          fullWidth size="md"
          loading={analyzing}
          icon={analyzing ? undefined : Sparkles}
          onClick={handleAnalyze}
        >
          {analyzing ? 'Analyzing with Claude…' : 'Analyze Transcript'}
        </Button>
      </div>
    </div>
  );
}
