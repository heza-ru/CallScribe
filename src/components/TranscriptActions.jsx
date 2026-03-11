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
  { fmt: 'txt',  label: 'Plain Text (.txt)' },
  { fmt: 'md',   label: 'Markdown (.md)' },
  { fmt: 'json', label: 'JSON (.json)' },
];

const BLUE       = '#2563EB';
const BLUE_LIGHT = '#EFF6FF';

// Speaker colours — cycle through a soft palette so each speaker is visually distinct
const SPEAKER_COLORS = [
  { text: '#2563EB', bg: '#EFF6FF' },
  { text: '#d97706', bg: '#fffbeb' },
  { text: '#16a34a', bg: '#f0fdf4' },
  { text: '#7c3aed', bg: '#f5f3ff' },
  { text: '#db2777', bg: '#fdf2f8' },
  { text: '#0369a1', bg: '#f0f9ff' },
];

function speakerColor(name, speakers) {
  const idx = speakers.indexOf(name);
  return SPEAKER_COLORS[idx % SPEAKER_COLORS.length] || SPEAKER_COLORS[0];
}

function StatPill({ icon: Icon, label, value }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      padding: '10px 8px', borderRadius: 9,
      background: '#fff', border: '1px solid #e8edf5', minWidth: 0,
    }}>
      <Icon size={13} style={{ color: BLUE }} strokeWidth={2} />
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  );
}

function ActionRow({ icon: Icon, iconBg, iconColor, title, desc, onClick, loading, rightEl }) {
  return (
    <div
      onClick={!loading ? onClick : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 11,
        padding: '10px 12px', borderRadius: 9,
        background: '#fff', border: '1px solid #e8edf5',
        cursor: loading ? 'default' : 'pointer',
        transition: 'background 130ms, box-shadow 130ms, transform 100ms',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.background = '#f8faff';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.07)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#fff';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onMouseDown={(e)  => { if (!loading) e.currentTarget.style.transform = 'scale(0.985)'; }}
      onMouseUp={(e)    => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {loading
          ? <span style={{ width: 13, height: 13, border: '1.5px solid rgba(0,0,0,0.1)', borderTopColor: iconColor, borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
          : <Icon size={14} style={{ color: iconColor }} strokeWidth={2} />
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>{loading ? 'Analyzing…' : title}</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{desc}</div>
      </div>
      {!loading && (rightEl ?? <ChevronRight size={12} style={{ color: '#cbd5e1', flexShrink: 0 }} />)}
    </div>
  );
}

export function TranscriptActions({ state, dispatch }) {
  const [analyzing,    setAnalyzing]    = useState(false);
  const [error,        setError]        = useState(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloaded,   setDownloaded]   = useState(null);

  // ── Derived transcript data ──
  const { wordCount, lines, speakers, estimatedMins } = useMemo(() => {
    const text = state.transcript || '';
    const words = text.split(/\s+/).filter(Boolean);
    const rawLines = text.split('\n').filter((l) => l.trim());
    const spk = [];
    const spkSet = new Set();
    rawLines.forEach((line) => {
      const ci = line.indexOf(':');
      if (ci > 0) {
        const s = line.slice(0, ci).trim();
        if (!spkSet.has(s)) { spkSet.add(s); spk.push(s); }
      }
    });
    const mins = Math.max(1, Math.round(words.length / 130));
    return { wordCount: words.length, lines: rawLines, speakers: spk, estimatedMins: mins };
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
    <div className="screen">
      {/* ── Header ── */}
      <div className="screen-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <IconButton icon={ArrowLeft} title="Back"
            onClick={() => dispatch({ type: 'SET_SCREEN', screen: SCREENS.DETECTION })} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', letterSpacing: '-0.01em' }}>Transcript</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Meeting {state.meetingId}</div>
          </div>
        </div>
        {state.insights.length > 0 && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_SCREEN', screen: SCREENS.ANALYSIS })}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 20, cursor: 'pointer',
              fontSize: 11, fontWeight: 600, color: '#16a34a',
            }}
          >
            <TicketCheck size={11} />
            {state.insights.length} insight{state.insights.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* ── Custom flex layout — transcript is the dominant element ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Stats row — fixed */}
        <div style={{ flexShrink: 0, padding: '12px 14px 10px', display: 'flex', gap: 7 }}>
          <StatPill icon={AlignLeft} label="Words"    value={wordCount.toLocaleString()} />
          <StatPill icon={Users}     label="Speakers" value={speakers.length || '—'} />
          <StatPill icon={Clock}     label="~Minutes" value={`${estimatedMins}m`} />
        </div>

        {/* Speaker chips — fixed, only if speakers exist */}
        {speakers.length > 0 && (
          <div style={{ flexShrink: 0, padding: '0 14px 10px', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {speakers.map((s) => {
              const c = speakerColor(s, speakers);
              return (
                <span key={s} style={{
                  fontSize: 11, fontWeight: 600, color: c.text,
                  background: c.bg, borderRadius: 5, padding: '3px 9px',
                }}>
                  {s}
                </span>
              );
            })}
          </div>
        )}

        {/* ── Scrollable transcript — takes all remaining vertical space ── */}
        <div style={{
          flex: 1, minHeight: 0,
          margin: '0 14px', borderRadius: 10,
          border: '1px solid #e8edf5', background: '#fafbfd',
          overflowY: 'auto', overflowX: 'hidden',
        }}>
          {lines.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
              No transcript content.
            </div>
          ) : (
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lines.map((line, i) => {
                const ci = line.indexOf(':');
                const speaker = ci > 0 ? line.slice(0, ci).trim() : null;
                const text = ci > 0 ? line.slice(ci + 1).trim() : line;
                const c = speaker ? speakerColor(speaker, speakers) : null;
                return (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    {speaker && (
                      <span style={{
                        fontSize: 9.5, fontWeight: 700, color: c.text,
                        background: c.bg, borderRadius: 4, padding: '2px 6px',
                        flexShrink: 0, marginTop: 2, whiteSpace: 'nowrap',
                        maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {speaker}
                      </span>
                    )}
                    <span style={{ fontSize: 11.5, color: '#334155', lineHeight: 1.6, flex: 1 }}>{text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Actions — fixed at bottom ── */}
        <div style={{ flexShrink: 0, padding: '10px 14px 6px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {error && <div className="banner error" style={{ marginBottom: 2 }}>{error}</div>}

          <ActionRow
            icon={Sparkles} iconBg="#fff1eb" iconColor="#f26b3a"
            title="Analyze with Claude AI"
            desc="Extract Whatfix bugs, features & pain points"
            loading={analyzing}
            onClick={handleAnalyze}
          />

          {/* Download with dropdown */}
          <div style={{ position: 'relative' }}>
            <ActionRow
              icon={Download} iconBg={BLUE_LIGHT} iconColor={BLUE}
              title="Download Transcript"
              desc="Export as TXT, Markdown, or JSON"
              rightEl={
                downloaded
                  ? <CheckCircle2 size={12} style={{ color: '#16a34a', flexShrink: 0 }} />
                  : <ChevronRight size={12} style={{
                      color: '#cbd5e1', flexShrink: 0,
                      transform: downloadOpen ? 'rotate(90deg)' : 'none',
                      transition: 'transform 180ms ease',
                    }} />
              }
              onClick={() => setDownloadOpen((v) => !v)}
            />
            {downloadOpen && (
              <div className="anim-scale-in" style={{
                position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20,
                background: '#fff', borderRadius: 9, border: '1px solid #e8edf5',
                boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                overflow: 'hidden',
              }}>
                {FORMATS.map(({ fmt, label }, i) => (
                  <button key={fmt} type="button" onClick={() => handleDownload(fmt)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
                      borderBottom: i < FORMATS.length - 1 ? '1px solid #f1f5f9' : 'none',
                      fontSize: 12.5, fontFamily: 'var(--font-sans)', fontWeight: 500,
                      color: '#1e293b', transition: 'background 120ms',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8faff')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {state.insights.length > 0 && (
            <ActionRow
              icon={TicketCheck} iconBg="#f0fdf4" iconColor="#16a34a"
              title="View Analysis Results"
              desc={`${state.insights.length} insight${state.insights.length !== 1 ? 's' : ''} ready`}
              onClick={() => dispatch({ type: 'SET_SCREEN', screen: SCREENS.ANALYSIS })}
            />
          )}
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
