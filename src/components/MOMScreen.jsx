import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ClipboardList, RefreshCw, Copy, Check, FileText, Users } from 'lucide-react';
import { generateMOM } from '../services/claudeService';

const ORANGE = '#E55014';
const NAVY   = '#0D1726';

const TABS = [
  { key: 'internal', label: 'Internal', icon: Users },
  { key: 'external', label: 'External', icon: FileText },
];

const mdComponents = {
  h1: ({ children }) => (
    <h1 style={{ fontSize: 14, fontWeight: 900, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '18px 0 8px', borderBottom: '2px solid #E4E9F0', paddingBottom: 6 }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ fontSize: 12, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '16px 0 6px' }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontSize: 11.5, fontWeight: 700, color: '#4B5A6D', margin: '12px 0 5px' }}>
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p style={{ fontSize: 12, color: '#4B5A6D', lineHeight: 1.7, margin: '0 0 10px' }}>
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul style={{ margin: '0 0 10px', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol style={{ margin: '0 0 10px', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li style={{ fontSize: 12, color: '#4B5A6D', lineHeight: 1.6 }}>
      {children}
    </li>
  ),
  strong: ({ children }) => (
    <strong style={{ fontWeight: 700, color: NAVY }}>
      {children}
    </strong>
  ),
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', margin: '0 0 12px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th style={{ padding: '7px 10px', background: '#F5F7FA', border: '1px solid #E4E9F0', fontWeight: 700, color: NAVY, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td style={{ padding: '7px 10px', border: '1px solid #E4E9F0', color: '#4B5A6D', verticalAlign: 'top' }}>
      {children}
    </td>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{ borderLeft: `3px solid ${ORANGE}`, paddingLeft: 12, margin: '8px 0', color: '#8A97A8', fontStyle: 'italic' }}>
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code style={{ background: '#F5F7FA', padding: '2px 5px', borderRadius: 3, fontSize: 11, fontFamily: 'monospace' }}>
      {children}
    </code>
  ),
  hr: () => <div style={{ height: 1, background: '#E4E9F0', margin: '14px 0' }} />,
};

export function MOMScreen({ state, dispatch }) {
  const [tab,      setTab]      = useState('internal');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [copied,   setCopied]   = useState(false);

  const mom = state.mom;
  const hasContent = mom && mom !== 'loading' && (mom.internal || mom.external);
  const isLoading  = loading || mom === 'loading';

  async function handleGenerate() {
    if (!state.transcript) return;
    setLoading(true);
    setError(null);
    dispatch({ type: 'MOM_LOADING' });
    try {
      const result = await generateMOM(state.transcript, state.meetingId, state.settings?.claudeApiKey);
      dispatch({ type: 'MOM_LOADED', mom: result });
    } catch (err) {
      setError(err.message);
      dispatch({ type: 'MOM_FAILED' });
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
            <button type="button" onClick={handleCopy}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 7,
                background: copied ? '#f0fdf4' : '#F5F7FA',
                border: `1px solid ${copied ? '#dcfce7' : '#E4E9F0'}`,
                cursor: 'pointer', fontSize: 11, fontWeight: 700,
                color: copied ? '#16a34a' : NAVY,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                transition: 'all 150ms',
              }}>
              {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} strokeWidth={2} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
          <button type="button" onClick={handleGenerate} disabled={!state.transcript || isLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', height: 30, borderRadius: 7,
              background: !state.transcript || isLoading ? '#C8D2DE' : ORANGE,
              border: 'none', cursor: !state.transcript || isLoading ? 'not-allowed' : 'pointer',
              fontSize: 11, fontWeight: 800, color: '#fff',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              transition: 'background 130ms', whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { if (state.transcript && !isLoading) e.currentTarget.style.background = '#CC4712'; }}
            onMouseLeave={(e) => { if (state.transcript && !isLoading) e.currentTarget.style.background = ORANGE; }}
          >
            {isLoading
              ? <span style={{ width: 11, height: 11, border: '1.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              : <RefreshCw size={11} strokeWidth={2.5} />
            }
            {isLoading ? 'Generating...' : hasContent ? 'Regenerate' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Tab bar — only show if content exists */}
      {hasContent && (
        <div style={{ display: 'flex', flexShrink: 0, background: '#fff', borderBottom: '1px solid #E4E9F0', padding: '0 16px' }}>
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button key={key} type="button" onClick={() => setTab(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 14px 9px', background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: 11, fontWeight: active ? 800 : 600,
                  color: active ? NAVY : '#8A97A8',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  borderBottom: active ? `2px solid ${ORANGE}` : '2px solid transparent',
                  transition: 'color 120ms', marginBottom: -1,
                }}>
                <Icon size={11} strokeWidth={2} />
                {label}
              </button>
            );
          })}
        </div>
      )}

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
                {state.transcript
                  ? 'Click Generate to create internal and external meeting minutes from this call.'
                  : 'Sync a Mindtickle call first to generate meeting minutes.'}
              </div>
              {state.transcript && (
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
