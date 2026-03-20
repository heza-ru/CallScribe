import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Download, Sparkles, TicketCheck,
  CheckCircle2, Users, AlignLeft, Clock, ChevronDown, Search, X,
} from 'lucide-react';
import { analyzeTranscript, analyzeCallIntelligence } from '../services/claudeService';
import { downloadTranscript } from '../utils/transcriptFormatter';
import { SCREENS } from '../constants';

const ORANGE = '#E55014';
const NAVY   = '#0D1726';

const FORMATS = [
  { fmt: 'txt',  label: 'Plain Text',      ext: '.txt' },
  { fmt: 'md',   label: 'Markdown',        ext: '.md' },
  { fmt: 'csv',  label: 'CSV Spreadsheet', ext: '.csv' },
  { fmt: 'json', label: 'JSON',            ext: '.json' },
  { fmt: 'srt',  label: 'Subtitles',       ext: '.srt' },
];

const SPEAKER_COLORS = [
  '#E4E9F0', '#DDE5EF', '#E0E8F0', '#E6E9F2', '#DCE4EE',
];

function speakerColor(name, speakers) {
  return SPEAKER_COLORS[speakers.indexOf(name) % SPEAKER_COLORS.length];
}

function groupLines(lines) {
  const blocks = [];
  for (const line of lines) {
    const ci = line.indexOf(':');
    const speaker = ci > 0 ? line.slice(0, ci).trim() : null;
    const text = ci > 0 ? line.slice(ci + 1).trim() : line;
    const last = blocks[blocks.length - 1];
    if (last && last.speaker === speaker) {
      last.texts.push(text);
    } else {
      blocks.push({ speaker, texts: [text] });
    }
  }
  return blocks;
}

function HighlightText({ text, query }) {
  if (!query) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} style={{ background: '#FFF4EF', color: ORANGE, borderRadius: 2, padding: '0 1px', fontWeight: 700 }}>{part}</mark>
          : part
      )}
    </>
  );
}

export function TranscriptActions({ state, dispatch }) {
  const [analyzing,    setAnalyzing]    = useState(false);
  const [error,        setError]        = useState(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloaded,   setDownloaded]   = useState(null);
  const [searchQuery,  setSearchQuery]  = useState('');
  const downloadRef = useRef(null);
  const searchRef   = useRef(null);

  useEffect(() => {
    if (!downloadOpen) return;
    function onDown(e) {
      if (downloadRef.current && !downloadRef.current.contains(e.target)) {
        setDownloadOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [downloadOpen]);

  const { wordCount, blocks, speakers, estimatedMins } = useMemo(() => {
    const text = state.transcript || '';
    const words = text.split(/\s+/).filter(Boolean);
    const rawLines = text.split('\n').filter(l => l.trim());
    const spk = [];
    const spkSet = new Set();
    rawLines.forEach(line => {
      const ci = line.indexOf(':');
      if (ci > 0) {
        const s = line.slice(0, ci).trim();
        if (!spkSet.has(s)) { spkSet.add(s); spk.push(s); }
      }
    });
    // Derive duration from actual chunk timestamps when available
    const chunks = state.chunks;
    let mins = Math.max(1, Math.round(words.length / 130));
    if (Array.isArray(chunks) && chunks.length > 0) {
      const lastChunk = chunks[chunks.length - 1];
      const endSec = lastChunk.endTime ?? lastChunk.end ?? null;
      if (endSec != null && endSec > 0) {
        mins = Math.max(1, Math.round(endSec / 60));
      }
    }
    return { wordCount: words.length, blocks: groupLines(rawLines), speakers: spk, estimatedMins: mins };
  }, [state.transcript, state.chunks]);

  async function handleAnalyze() {
    setError(null);
    setAnalyzing(true);

    const { transcript, meetingId, settings } = state;
    const apiKey = settings?.claudeApiKey;

    dispatch({ type: 'CALL_INTELLIGENCE_LOADING' });
    analyzeCallIntelligence(transcript, meetingId, apiKey)
      .then(ci => dispatch({ type: 'CALL_INTELLIGENCE_LOADED', callIntelligence: ci }))
      .catch(() => dispatch({ type: 'CALL_INTELLIGENCE_FAILED' }));

    try {
      const insights = await analyzeTranscript(transcript, meetingId, apiKey);
      dispatch({ type: 'INSIGHTS_LOADED', insights });
      dispatch({ type: 'SET_SCREEN', screen: SCREENS.ANALYSIS });
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
    <div style={{
      display: 'flex', flexDirection: 'column',
      flex: 1, height: '100vh', overflow: 'hidden',
      background: '#F5F7FA',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 12px',
        background: '#fff', borderBottom: '1px solid #E4E9F0', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Transcript
          </div>
          <div style={{ fontSize: 10, color: '#8A97A8', marginTop: 1, fontFamily: 'monospace' }}>
            {state.meetingId}
          </div>
        </div>
        {state.insights.length > 0 && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
            background: '#FFF4EF', border: `1px solid rgba(229,80,20,0.20)`,
            borderRadius: 99, fontSize: 10.5, fontWeight: 700,
            color: ORANGE, textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            <TicketCheck size={11} />
            {state.insights.length} insight{state.insights.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Stats strip */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center',
        padding: '0 16px',
        background: '#fff',
        borderBottom: '1px solid #E4E9F0',
      }}>
        {[
          { icon: AlignLeft, value: wordCount.toLocaleString(), label: 'words' },
          { icon: Users,     value: speakers.length || '—',     label: 'speakers' },
          { icon: Clock,     value: `~${estimatedMins}m`,       label: '' },
        ].map(({ icon: Icon, value, label }, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '9px 12px 9px 0', marginRight: 12,
            borderRight: i < 2 ? '1px solid #E4E9F0' : 'none',
            paddingRight: i < 2 ? 12 : 0,
          }}>
            <Icon size={11} style={{ color: '#C8D2DE' }} strokeWidth={2} />
            <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{value}</span>
            {label && <span style={{ fontSize: 10.5, color: '#8A97A8' }}>{label}</span>}
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div style={{ flexShrink: 0, padding: '8px 16px', background: '#fff', borderBottom: '1px solid #E4E9F0' }}>
        <div style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#A8B4C0', pointerEvents: 'none' }} />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search transcript..."
            style={{
              width: '100%', padding: '7px 30px 7px 28px',
              fontFamily: 'var(--font-sans)', fontSize: 12,
              background: '#F5F7FA', border: '1.5px solid #E4E9F0',
              borderRadius: 7, outline: 'none', color: NAVY,
              transition: 'border-color 150ms',
            }}
            onFocus={e => { e.target.style.borderColor = ORANGE; e.target.style.background = '#fff'; }}
            onBlur={e => { e.target.style.borderColor = '#E4E9F0'; e.target.style.background = '#F5F7FA'; }}
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', color: '#A8B4C0' }}
              onMouseEnter={e => (e.currentTarget.style.color = NAVY)}
              onMouseLeave={e => (e.currentTarget.style.color = '#A8B4C0')}
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          )}
        </div>
        {searchQuery && (() => {
          const q = searchQuery.toLowerCase();
          const matchCount = blocks.reduce((n, b) => n + b.texts.filter(t => t.toLowerCase().includes(q)).length, 0);
          return (
            <div style={{ fontSize: 10, color: matchCount > 0 ? ORANGE : '#A8B4C0', fontWeight: 600, marginTop: 5, letterSpacing: '0.04em' }}>
              {matchCount > 0 ? `${matchCount} match${matchCount !== 1 ? 'es' : ''}` : 'No matches'}
            </div>
          );
        })()}
      </div>

      {/* Transcript content */}
      {(() => {
        const q = searchQuery.trim().toLowerCase();
        const visibleBlocks = q
          ? blocks.filter(b => b.speaker?.toLowerCase().includes(q) || b.texts.some(t => t.toLowerCase().includes(q)))
          : blocks;
        return (
      <div style={{
        flex: 1, minHeight: 0,
        overflowY: 'auto', overflowX: 'hidden',
        padding: '12px 16px',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {visibleBlocks.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A97A8', fontSize: 12 }}>
            {searchQuery ? 'No matching blocks.' : 'No transcript content.'}
          </div>
        ) : (
          visibleBlocks.map((block, i) => (
            <div key={i} style={{
              background: '#fff', borderRadius: 8, padding: '10px 12px',
              border: '1px solid #E4E9F0',
              animation: 'itemEnter 220ms cubic-bezier(0.22,1,0.36,1) both',
              animationDelay: `${Math.min(i * 30, 500)}ms`,
            }}>
              {block.speaker && (
                <div style={{
                  fontSize: 9, fontWeight: 800, color: '#8A97A8',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  marginBottom: 6,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{
                    display: 'inline-block', width: 14, height: 14,
                    borderRadius: 3, background: speakerColor(block.speaker, speakers),
                    flexShrink: 0,
                  }} />
                  {block.speaker}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {block.texts.map((text, j) => (
                  <p key={j} style={{
                    margin: 0, fontSize: 12, color: '#4B5A6D',
                    lineHeight: 1.65, fontWeight: 400,
                  }}>
                    <HighlightText text={text} query={searchQuery.trim()} />
                  </p>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
        );
      })()}

      {/* Error banner */}
      {error && (
        <div style={{
          margin: '0 14px 6px', flexShrink: 0,
          background: '#fef2f2', color: '#dc2626',
          fontSize: 11, padding: '8px 12px', borderRadius: 7,
          border: '1px solid #fecaca',
        }}>
          {error}
        </div>
      )}

      {/* Footer */}
      <div style={{
        flexShrink: 0, padding: '12px 16px 14px',
        background: '#fff', borderTop: '1px solid #E4E9F0',
        display: 'flex', gap: 8,
      }}>
        {/* Download dropdown */}
        <div style={{ position: 'relative', flexShrink: 0 }} ref={downloadRef}>
          <button
            type="button"
            onClick={() => setDownloadOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0 14px', height: 40, borderRadius: 8,
              background: downloaded ? '#f0fdf4' : '#fff',
              border: `1px solid ${downloaded ? '#dcfce7' : '#E4E9F0'}`,
              cursor: 'pointer', fontSize: 12, fontWeight: 700,
              color: downloaded ? '#16a34a' : NAVY,
              transition: 'background 120ms, border-color 120ms',
              whiteSpace: 'nowrap',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}
            onMouseEnter={(e) => { if (!downloaded) { e.currentTarget.style.background = '#F5F7FA'; e.currentTarget.style.borderColor = '#C8D2DE'; } }}
            onMouseLeave={(e) => { if (!downloaded) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#E4E9F0'; } }}
          >
            {downloaded
              ? <CheckCircle2 size={13} strokeWidth={2} />
              : <Download size={13} strokeWidth={2} />
            }
            Export
            <ChevronDown size={11} style={{
              color: '#A8B4C0',
              transform: downloadOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 180ms ease',
            }} />
          </button>

          {downloadOpen && (
            <div className="anim-scale-in" style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, zIndex: 30,
              background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0',
              boxShadow: '0 8px 24px rgba(13,23,38,0.10), 0 2px 6px rgba(13,23,38,0.06)',
              overflow: 'hidden', minWidth: 175,
            }}>
              {FORMATS.map(({ fmt, label, ext }, i) => (
                <button key={fmt} type="button" onClick={() => handleDownload(fmt)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: i < FORMATS.length - 1 ? '1px solid #F5F7FA' : 'none',
                    fontSize: 12, fontFamily: 'var(--font-sans)', fontWeight: 600,
                    color: NAVY, transition: 'background 100ms', textAlign: 'left', gap: 16,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F7FA')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <span>{label}</span>
                  <span style={{ fontSize: 10, color: '#8A97A8', fontWeight: 500 }}>{ext}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Analyze button */}
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={analyzing}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            height: 40, borderRadius: 8, border: 'none',
            background: analyzing ? '#C8D2DE' : ORANGE,
            color: '#fff', fontSize: 12, fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            cursor: analyzing ? 'not-allowed' : 'pointer',
            transition: 'background 130ms',
          }}
          onMouseEnter={(e) => { if (!analyzing) e.currentTarget.style.background = '#CC4712'; }}
          onMouseLeave={(e) => { if (!analyzing) e.currentTarget.style.background = ORANGE; }}
        >
          {analyzing
            ? <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
            : <Sparkles size={13} strokeWidth={2.5} />
          }
          {analyzing ? 'Analyzing...' : 'Analyze with Claude'}
        </button>
      </div>
    </div>
  );
}
