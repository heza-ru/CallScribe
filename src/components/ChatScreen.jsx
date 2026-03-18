import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageCircle, Send, Trash2, User, Sparkles, Download, ChevronDown, Check } from 'lucide-react';
import { streamChatMessage } from '../services/claudeService';
import { downloadChat } from '../utils/analysisFormatter';

const ORANGE = '#E55014';
const NAVY   = '#0D1726';

const SUGGESTIONS = [
  'What were the main pain points raised?',
  'What competitors were mentioned?',
  'What are the agreed next steps?',
  'What objections came up and how were they handled?',
  'Summarise the key decisions made',
];

const mdComponents = {
  p:      ({ children }) => <p style={{ margin: '0 0 8px', fontSize: 12.5, lineHeight: 1.7, color: '#4B5A6D' }}>{children}</p>,
  ul:     ({ children }) => <ul style={{ margin: '0 0 8px', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>{children}</ul>,
  ol:     ({ children }) => <ol style={{ margin: '0 0 8px', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>{children}</ol>,
  li:     ({ children }) => <li style={{ fontSize: 12.5, color: '#4B5A6D', lineHeight: 1.6 }}>{children}</li>,
  strong: ({ children }) => <strong style={{ fontWeight: 700, color: NAVY }}>{children}</strong>,
  code:   ({ children }) => <code style={{ background: 'rgba(13,23,38,0.07)', padding: '1px 5px', borderRadius: 3, fontSize: 11.5, fontFamily: 'monospace' }}>{children}</code>,
  h1: ({ children }) => <p style={{ fontSize: 13, fontWeight: 800, color: NAVY, margin: '8px 0 4px' }}>{children}</p>,
  h2: ({ children }) => <p style={{ fontSize: 12.5, fontWeight: 700, color: NAVY, margin: '8px 0 4px' }}>{children}</p>,
  h3: ({ children }) => <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, margin: '6px 0 3px' }}>{children}</p>,
};

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#C8D2DE',
          animation: `pulseDot 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

export function ChatScreen({ state, dispatch }) {
  const [input,      setInput]      = useState('');
  const [sending,    setSending]    = useState(false);
  const [dlOpen,     setDlOpen]     = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const dlRef     = useRef(null);

  const messages = state.chatMessages || [];
  const apiKey   = state.settings?.claudeApiKey;

  useEffect(() => {
    if (!dlOpen) return;
    function onDown(e) { if (dlRef.current && !dlRef.current.contains(e.target)) setDlOpen(false); }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [dlOpen]);

  function handleDownload(fmt) {
    downloadChat(messages, state.meetingId, fmt);
    setDlOpen(false);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(text) {
    const content = (text || input).trim();
    if (!content || sending || !state.transcript) return;

    const userMsg = { role: 'user', content };
    const pendingMsg = { role: 'assistant', content: '', pending: true };

    dispatch({ type: 'CHAT_ADD_MESSAGE', message: userMsg });
    dispatch({ type: 'CHAT_ADD_MESSAGE', message: pendingMsg });
    setInput('');
    setSending(true);

    try {
      let fullContent = '';
      const history = [...messages, userMsg];

      for await (const chunk of streamChatMessage(state.transcript, history, apiKey)) {
        fullContent += chunk;
        dispatch({ type: 'CHAT_UPDATE_LAST', message: { role: 'assistant', content: fullContent, pending: true } });
      }
      dispatch({ type: 'CHAT_UPDATE_LAST', message: { role: 'assistant', content: fullContent, pending: false } });
    } catch (err) {
      dispatch({ type: 'CHAT_UPDATE_LAST', message: { role: 'assistant', content: '', error: err.message } });
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100vh', overflow: 'hidden', background: '#F5F7FA' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 12px',
        background: '#fff', borderBottom: '1px solid #E4E9F0', flexShrink: 0,
      }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Chat with Call
        </div>
        {messages.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Download dropdown */}
            <div style={{ position: 'relative' }} ref={dlRef}>
              <button type="button" onClick={() => setDlOpen(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', height: 30, borderRadius: 7,
                  background: downloaded ? '#f0fdf4' : '#F5F7FA',
                  border: `1px solid ${downloaded ? '#dcfce7' : '#E4E9F0'}`,
                  cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  color: downloaded ? '#16a34a' : NAVY,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  transition: 'all 130ms',
                }}
                onMouseEnter={(e) => { if (!downloaded) { e.currentTarget.style.background = '#ECF0F5'; e.currentTarget.style.borderColor = '#C8D2DE'; } }}
                onMouseLeave={(e) => { if (!downloaded) { e.currentTarget.style.background = '#F5F7FA'; e.currentTarget.style.borderColor = '#E4E9F0'; } }}
              >
                {downloaded
                  ? <><Check size={11} strokeWidth={2.5} /> Saved</>
                  : <><Download size={11} strokeWidth={2} /> Export <ChevronDown size={10} style={{ color: '#A8B4C0', transform: dlOpen ? 'rotate(180deg)' : 'none', transition: 'transform 180ms' }} /></>
                }
              </button>
              {dlOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50, background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0', boxShadow: '0 8px 24px rgba(13,23,38,0.10)', overflow: 'hidden', minWidth: 175 }}>
                  <div style={{ padding: '8px 12px 6px', fontSize: 9.5, fontWeight: 700, color: '#A8B4C0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Export Chat
                  </div>
                  {[{ fmt: 'md', label: 'Markdown', ext: '.md' }, { fmt: 'json', label: 'JSON', ext: '.json' }, { fmt: 'txt', label: 'Plain Text', ext: '.txt' }].map(({ fmt, label, ext }) => (
                    <button key={fmt} type="button" onClick={() => handleDownload(fmt)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', borderTop: '1px solid #F5F7FA', fontSize: 12, fontFamily: 'var(--font-sans)', fontWeight: 600, color: NAVY, textAlign: 'left', gap: 16 }}
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

            <button type="button"
              onClick={() => dispatch({ type: 'CHAT_CLEAR' })}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 7,
                background: '#F5F7FA', border: '1px solid #E4E9F0',
                cursor: 'pointer', fontSize: 11, fontWeight: 700,
                color: '#8A97A8', textTransform: 'uppercase', letterSpacing: '0.06em',
                transition: 'all 130ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fecaca'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#8A97A8'; e.currentTarget.style.borderColor = '#E4E9F0'; }}
            >
              <Trash2 size={11} strokeWidth={2} /> Clear
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Empty state */}
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, paddingTop: 32 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: '#fff', border: '1px solid #E4E9F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <MessageCircle size={24} style={{ color: state.transcript ? ORANGE : '#C8D2DE' }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>
                {state.transcript ? 'Ask Anything' : 'No Transcript'}
              </div>
              <div style={{ fontSize: 12, color: '#8A97A8', lineHeight: 1.65, maxWidth: 240 }}>
                {state.transcript
                  ? 'Ask questions about this call — Claude will answer based only on the transcript.'
                  : 'Sync a Mindtickle call first to start chatting.'}
              </div>
            </div>

            {/* Suggestion chips */}
            {state.transcript && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: '#A8B4C0', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', marginBottom: 2 }}>
                  Try asking
                </div>
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => handleSend(s)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '9px 12px',
                      background: '#fff', border: '1px solid #E4E9F0',
                      borderRadius: 8, cursor: 'pointer',
                      fontSize: 12, color: '#4B5A6D', fontWeight: 500,
                      transition: 'border-color 130ms, background 130ms',
                      animation: 'itemEnter 220ms cubic-bezier(0.22,1,0.36,1) both',
                      animationDelay: `${SUGGESTIONS.indexOf(s) * 50}ms`,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#C8D2DE'; e.currentTarget.style.background = '#FAFBFD'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E4E9F0'; e.currentTarget.style.background = '#fff'; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            gap: 8, alignItems: 'flex-start',
            animation: 'itemEnter 200ms cubic-bezier(0.22,1,0.36,1) both',
          }}>
            {/* Avatar */}
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: msg.role === 'user' ? NAVY : ORANGE,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: 2,
            }}>
              {msg.role === 'user'
                ? <User size={13} color="#fff" strokeWidth={2} />
                : <Sparkles size={13} color="#fff" strokeWidth={2} />
              }
            </div>

            {/* Bubble */}
            <div style={{
              maxWidth: '80%',
              background: msg.role === 'user' ? NAVY : '#fff',
              borderRadius: msg.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
              padding: '10px 13px',
              border: msg.role === 'user' ? 'none' : '1px solid #E4E9F0',
              boxShadow: msg.role === 'assistant' ? '0 1px 4px rgba(13,23,38,0.05)' : 'none',
            }}>
              {msg.error ? (
                <div style={{ fontSize: 12, color: '#dc2626' }}>
                  {msg.error}
                </div>
              ) : msg.pending && !msg.content ? (
                <TypingIndicator />
              ) : msg.role === 'user' ? (
                <div style={{ fontSize: 12.5, color: '#fff', lineHeight: 1.6 }}>
                  {msg.content}
                </div>
              ) : (
                <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {msg.content}
                  </ReactMarkdown>
                  {msg.pending && msg.content && (
                    <span style={{ display: 'inline-block', width: 2, height: 14, background: ORANGE, verticalAlign: 'text-bottom', animation: 'pulseDot 0.8s ease infinite', marginLeft: 2 }} />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, padding: '10px 14px 14px', background: '#fff', borderTop: '1px solid #E4E9F0' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!state.transcript || sending}
            placeholder={state.transcript ? 'Ask something about this call...' : 'Sync a call first...'}
            rows={1}
            style={{
              flex: 1, resize: 'none', minHeight: 40, maxHeight: 120,
              padding: '9px 12px',
              fontFamily: 'var(--font-sans)', fontSize: 12.5, color: NAVY,
              background: '#F5F7FA', border: '1.5px solid #E4E9F0', borderRadius: 8,
              outline: 'none', lineHeight: 1.5,
              transition: 'border-color 150ms',
              overflowY: 'auto',
            }}
            onFocus={(e) => { e.target.style.borderColor = ORANGE; e.target.style.background = '#fff'; }}
            onBlur={(e) => { e.target.style.borderColor = '#E4E9F0'; e.target.style.background = '#F5F7FA'; }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <button type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || sending || !state.transcript}
            style={{
              width: 40, height: 40, borderRadius: 8, border: 'none', flexShrink: 0,
              background: input.trim() && !sending && state.transcript ? ORANGE : '#E4E9F0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: input.trim() && !sending && state.transcript ? 'pointer' : 'default',
              transition: 'background 150ms',
            }}
            onMouseEnter={(e) => { if (input.trim() && !sending && state.transcript) e.currentTarget.style.background = '#CC4712'; }}
            onMouseLeave={(e) => { if (input.trim() && !sending && state.transcript) e.currentTarget.style.background = ORANGE; }}
          >
            {sending
              ? <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              : <Send size={14} color={input.trim() && state.transcript ? '#fff' : '#A8B4C0'} strokeWidth={2.5} />
            }
          </button>
        </div>
        <div style={{ marginTop: 6, fontSize: 10, color: '#A8B4C0', textAlign: 'center' }}>
          Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
