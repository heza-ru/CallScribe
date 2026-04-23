import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ClipboardList, RefreshCw, Copy, Check, FileText, Users, Download, ChevronDown } from 'lucide-react';
import { generateMOM } from '../services/claudeService';
import { downloadMOM } from '../utils/analysisFormatter';
import { ORANGE, NAVY } from '../constants';
import { Spinner } from './ui/Spinner';
import { TabBar } from './ui/TabBar';
import { useClickOutside } from '../hooks/useClickOutside';
import { mdComponents } from '../utils/markdownComponents';
import { useStore } from '../store';

const TABS = [
  { key: 'internal', label: 'Internal', icon: Users },
  { key: 'external', label: 'External', icon: FileText },
];

const MOM_EXPORT_FORMATS = [
  { version: 'internal', fmt: 'md',  label: 'Internal',  ext: '.md'  },
  { version: 'external', fmt: 'md',  label: 'External',  ext: '.md'  },
  { version: 'both',     fmt: 'md',  label: 'Both',       ext: '.md'  },
  null,
  { version: 'internal', fmt: 'txt', label: 'Internal',  ext: '.txt' },
  { version: 'external', fmt: 'txt', label: 'External',  ext: '.txt' },
  { version: 'both',     fmt: 'txt', label: 'Both',       ext: '.txt' },
];

export function MOMScreen() {
  const transcript = useStore(s => s.transcript);
  const meetingId  = useStore(s => s.meetingId);
  const settings   = useStore(s => s.settings);
  const mom        = useStore(s => s.mom);
  const setMOM     = useStore(s => s.setMOM);

  const [tab,        setTab]        = useState('internal');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [copied,     setCopied]     = useState(false);
  const [dlOpen,     setDlOpen]     = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const dlRef = useRef(null);

  useClickOutside(dlRef, dlOpen ? () => setDlOpen(false) : null);

  function handleDownload(version, fmt) {
    downloadMOM(mom, meetingId, version, fmt);
    setDlOpen(false);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  }

  const hasContent = mom && mom !== 'loading' && (mom.internal || mom.external);
  const isLoading  = loading || mom === 'loading';

  async function handleGenerate() {
    if (!transcript) return;
    setLoading(true);
    setError(null);
    setMOM('loading');
    try {
      const result = await generateMOM(transcript, meetingId, settings?.claudeApiKey);
      setMOM(result);
    } catch (err) {
      setError(err.message);
      setMOM(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    const text = tab === 'internal' ? mom.internal : mom.external;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  const currentContent = hasContent ? (tab === 'internal' ? mom.internal : mom.external) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100vh', overflow: 'hidden', background: '#F5F7FA' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 12px',
        background: '#fff', borderBottom: '1px solid #E4E9F0', flexShrink: 0,
      }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Meeting Minutes
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {hasContent && (
            <>
              {/* Copy — icon only */}
              <button type="button" onClick={handleCopy} title={copied ? 'Copied!' : 'Copy current tab'}
                style={{
                  width: 30, height: 30, borderRadius: 7, border: `1px solid ${copied ? '#dcfce7' : '#E4E9F0'}`,
                  background: copied ? '#f0fdf4' : '#F5F7FA', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: copied ? '#16a34a' : NAVY, flexShrink: 0, transition: 'all 150ms',
                }}
                onMouseEnter={(e) => { if (!copied) { e.currentTarget.style.background = '#ECF0F5'; } }}
                onMouseLeave={(e) => { if (!copied) { e.currentTarget.style.background = '#F5F7FA'; } }}
              >
                {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={2} />}
              </button>

              {/* Download — icon only with chevron */}
              <div style={{ position: 'relative' }} ref={dlRef}>
                <button type="button" onClick={() => setDlOpen(v => !v)} title="Export minutes"
                  style={{
                    height: 30, borderRadius: 7, border: `1px solid ${downloaded ? '#dcfce7' : '#E4E9F0'}`,
                    background: downloaded ? '#f0fdf4' : '#F5F7FA', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
                    color: downloaded ? '#16a34a' : NAVY, flexShrink: 0,
                    padding: '0 8px', transition: 'all 150ms',
                  }}
                  onMouseEnter={(e) => { if (!downloaded) { e.currentTarget.style.background = '#ECF0F5'; } }}
                  onMouseLeave={(e) => { if (!downloaded) { e.currentTarget.style.background = '#F5F7FA'; } }}
                >
                  {downloaded
                    ? <Check size={12} strokeWidth={2.5} />
                    : <><Download size={12} strokeWidth={2} /><ChevronDown size={9} style={{ color: '#A8B4C0' }} /></>
                  }
                </button>
                {dlOpen && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50, background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0', boxShadow: '0 8px 24px rgba(13,23,38,0.10)', overflow: 'hidden', minWidth: 190 }}>
                    <div style={{ padding: '8px 12px 6px', fontSize: 9.5, fontWeight: 700, color: '#A8B4C0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Export Minutes
                    </div>
                    {MOM_EXPORT_FORMATS.map((f, i) => f === null ? (
                      <div key={i} style={{ height: 1, background: '#F5F7FA', margin: '2px 0' }} />
                    ) : (
                      <button key={`${f.version}-${f.fmt}`} type="button"
                        onClick={() => handleDownload(f.version, f.fmt)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', borderTop: '1px solid #F5F7FA', fontSize: 12, fontFamily: 'var(--font-sans)', fontWeight: 600, color: NAVY, textAlign: 'left', gap: 16 }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F7FA')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      >
                        <span>{f.label}</span>
                        <span style={{ fontSize: 10, color: '#8A97A8', fontWeight: 500 }}>{f.ext}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          <button type="button" onClick={handleGenerate} disabled={!transcript || isLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', height: 30, borderRadius: 7,
              background: !transcript || isLoading ? '#C8D2DE' : ORANGE,
              border: 'none', cursor: !transcript || isLoading ? 'not-allowed' : 'pointer',
              fontSize: 11, fontWeight: 800, color: '#fff',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              transition: 'background 130ms', whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { if (transcript && !isLoading) e.currentTarget.style.background = '#CC4712'; }}
            onMouseLeave={(e) => { if (transcript && !isLoading) e.currentTarget.style.background = ORANGE; }}
          >
            {isLoading
              ? <Spinner size={11} color="#fff" trackColor="rgba(255,255,255,0.3)" />
              : <RefreshCw size={11} strokeWidth={2.5} />
            }
            {isLoading ? 'Generating...' : hasContent ? 'Regenerate' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Tab bar — only show if content exists */}
      {hasContent && <TabBar tabs={TABS} active={tab} onSelect={setTab} />}

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px' }}>

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', fontSize: 11.5, padding: '10px 14px', borderRadius: 8, border: '1px solid #fecaca', marginBottom: 14 }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff', border: '1px solid #E4E9F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardList size={20} style={{ color: ORANGE }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>
                Generating Minutes
              </div>
              <div style={{ fontSize: 11.5, color: '#8A97A8', lineHeight: 1.6 }}>
                Claude is writing your internal and external meeting minutes...
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !hasContent && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: '#fff', border: '1px solid #E4E9F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardList size={24} style={{ color: '#C8D2DE' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                No Minutes Yet
              </div>
              <div style={{ fontSize: 12, color: '#8A97A8', lineHeight: 1.65, maxWidth: 220, margin: '0 auto 18px' }}>
                {transcript
                  ? 'Click Generate to create internal and external meeting minutes from this call.'
                  : 'Sync a Mindtickle call first to generate meeting minutes.'}
              </div>
              {transcript && (
                <button type="button" onClick={handleGenerate}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto',
                    padding: '0 18px', height: 40, borderRadius: 8, border: 'none',
                    background: ORANGE, color: '#fff',
                    fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                    cursor: 'pointer',
                  }}>
                  <ClipboardList size={13} /> Generate Minutes
                </button>
              )}
            </div>
          </div>
        )}

        {/* Rendered markdown */}
        {!isLoading && currentContent && (
          <div key={tab} style={{ animation: 'tabEnter 200ms cubic-bezier(0.22,1,0.36,1) both' }}>
            <div style={{
              background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0',
              padding: '16px 18px',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14,
                paddingBottom: 12, borderBottom: '1px solid #F5F7FA',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: 1, background: ORANGE }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#8A97A8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {tab === 'internal' ? 'Internal — Team Use Only' : 'External — Client Facing'}
                </span>
              </div>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {currentContent}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
