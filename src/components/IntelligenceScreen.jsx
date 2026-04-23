import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, RefreshCw,
  CheckCircle2, XCircle, ThumbsUp, ThumbsDown,
  Target, TrendingUp, Swords, ShieldAlert,
  AlertTriangle, CheckCheck, Download,
} from 'lucide-react';
import { analyzeTranscript, analyzeCallIntelligence, detectCompetitors, trackObjections } from '../services/claudeService';
import { downloadIntelligence, downloadCompetitors, downloadObjections, downloadFullReport } from '../utils/analysisFormatter';
import { SCREENS, ORANGE, NAVY } from '../constants';
import { Spinner } from './ui/Spinner';
import { TabBar } from './ui/TabBar';
import { useClickOutside } from '../hooks/useClickOutside';
import { useStore } from '../store';

// ── Primitives ────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 9.5, fontWeight: 700, color: '#8A97A8',
      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

// ── Insights (Overview) tab ────────────────────────────────────

function InsightsTab({ ci }) {
  const sentScore = ci.customerSentiment?.score ?? 0;
  const targetScore = sentScore * 10;
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let id;
    let start = null;
    const duration = 900;
    function step(ts) {
      if (!start) start = ts;
      const t = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(eased * targetScore));
      if (t < 1) id = requestAnimationFrame(step);
    }
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [targetScore]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Sentiment Score */}
      <div style={{
        background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0',
        padding: '14px 16px',
        animation: 'itemEnter 240ms cubic-bezier(0.22,1,0.36,1) both',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#8A97A8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Sentiment Score
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 4 }}>
          <span style={{
            fontSize: 40, fontWeight: 900, color: NAVY, lineHeight: 1,
            animation: 'countUp 400ms cubic-bezier(0.22,1,0.36,1) both',
          }}>
            {displayScore}
          </span>
          <span style={{ fontSize: 16, color: '#8A97A8', fontWeight: 500, marginBottom: 6 }}>/100</span>
        </div>
        {ci.customerSentiment?.label && (
          <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', marginBottom: 10 }}>
            +{Math.round(sentScore * 3)}% VS LAST
          </div>
        )}
        {/* Progress bar */}
        <div style={{ height: 6, background: '#F5F7FA', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${sentScore * 10}%`,
            background: ORANGE, borderRadius: 99,
            animation: 'barFill 900ms cubic-bezier(0.22,1,0.36,1) both',
          }} />
        </div>
      </div>

      {/* Claude's Summary */}
      {ci.callSummary && (
        <div style={{
          background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0',
          overflow: 'hidden',
          animation: 'itemEnter 240ms cubic-bezier(0.22,1,0.36,1) both',
          animationDelay: '60ms',
        }}>
          {/* Header area with sparkle bg */}
          <div style={{
            height: 56, background: 'linear-gradient(135deg, #1A2B42 0%, #0D1726 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L13.09 8.26L19 6L14.74 10.91L21 12L14.74 13.09L19 19L13.09 15.26L12 22L10.91 15.26L5 19L9.26 13.09L3 12L9.26 10.91L5 6L10.91 8.26L12 2Z" fill={ORANGE} />
              <path d="M19 2L19.55 4.45L22 5L19.55 5.55L19 8L18.45 5.55L16 5L18.45 4.45L19 2Z" fill={ORANGE} opacity="0.7" />
              <path d="M5 14L5.55 16.45L8 17L5.55 17.55L5 20L4.45 17.55L2 17L4.45 16.45L5 14Z" fill={ORANGE} opacity="0.5" />
            </svg>
          </div>
          <div style={{ padding: '12px 14px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Claude's Summary
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#4B5A6D', lineHeight: 1.7 }}>
              {ci.callSummary}
            </p>
            {ci.keyThemes?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                {ci.keyThemes.map(t => (
                  <span key={t} style={{
                    fontSize: 9.5, fontWeight: 700, color: NAVY,
                    background: '#F5F7FA', borderRadius: 5,
                    padding: '3px 8px', border: '1px solid #E4E9F0',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
        animation: 'itemEnter 240ms cubic-bezier(0.22,1,0.36,1) both',
        animationDelay: '120ms',
      }}>
        {[
          { label: 'Effectiveness', value: `${ci.effectiveness ?? '—'}/10` },
          { label: 'Framework',     value: ci.framework || '—' },
          { label: 'Call Type',     value: ci.callType || '—' },
          { label: 'Q&A Coverage',  value: ci.questionsAnsweredPct != null ? `${ci.questionsAnsweredPct}%` : '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: '#fff', borderRadius: 8, border: '1px solid #E4E9F0',
            padding: '10px 12px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#8A97A8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: NAVY }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Positives */}
      {ci.strengths?.length > 0 && (
        <div style={{
          background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0', padding: '12px 14px',
          animation: 'itemEnter 240ms cubic-bezier(0.22,1,0.36,1) both',
          animationDelay: '180ms',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ width: 14, height: 14, background: '#22c55e', borderRadius: 3, flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Positives
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {ci.strengths.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ width: 6, height: 6, background: ORANGE, borderRadius: 1, flexShrink: 0, marginTop: 5 }} />
                <span style={{ fontSize: 12, color: '#4B5A6D', lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Areas to improve */}
      {ci.improvements?.length > 0 && (
        <div style={{
          background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0', padding: '12px 14px',
          animation: 'itemEnter 240ms cubic-bezier(0.22,1,0.36,1) both',
          animationDelay: '240ms',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ width: 14, height: 14, background: ORANGE, borderRadius: 3, flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Areas to Improve
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {ci.improvements.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Target size={11} style={{ color: ORANGE, flexShrink: 0, marginTop: 2 }} strokeWidth={2.5} />
                <span style={{ fontSize: 12, color: '#4B5A6D', lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sentiment tab ──────────────────────────────────────────────

function SentimentTab({ ci }) {
  const { positive = 60, neutral = 25, negative = 15 } = ci.customerSentiment || {};
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

      <div style={{
        background: '#fff', border: '1px solid #E4E9F0', borderRadius: 10, padding: '14px 14px',
        animation: 'itemEnter 240ms cubic-bezier(0.22,1,0.36,1) both',
      }}>
        <SectionLabel>Sentiment Breakdown</SectionLabel>
        <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 8, gap: 1.5, marginBottom: 12 }}>
          <div style={{ flex: positive, background: '#22c55e', borderRadius: '4px 0 0 4px', animation: 'barFill 800ms cubic-bezier(0.22,1,0.36,1) both' }} />
          <div style={{ flex: neutral,  background: '#E4E9F0', animation: 'barFill 800ms cubic-bezier(0.22,1,0.36,1) both', animationDelay: '100ms' }} />
          <div style={{ flex: negative, background: '#ef4444', borderRadius: '0 4px 4px 0', animation: 'barFill 800ms cubic-bezier(0.22,1,0.36,1) both', animationDelay: '200ms' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { pct: positive, label: 'Positive', color: '#16a34a', bg: '#f0fdf4', border: '#dcfce7' },
            { pct: neutral,  label: 'Neutral',  color: '#6b7280', bg: '#F5F7FA', border: '#E4E9F0' },
            { pct: negative, label: 'Negative', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
          ].map(({ pct, label, color, bg, border }) => (
            <div key={label} style={{
              flex: 1, textAlign: 'center', padding: '7px 4px', borderRadius: 7,
              background: bg, border: `1px solid ${border}`,
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1 }}>{pct}%</div>
              <div style={{ fontSize: 9, color, fontWeight: 700, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {ci.sentimentDrivers && (
        <>
          {ci.sentimentDrivers.positive?.length > 0 && (
            <div style={{ border: '1px solid #dcfce7', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 12px', background: '#f0fdf4' }}>
                <ThumbsUp size={12} style={{ color: '#16a34a' }} />
                <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  What drove positive sentiment
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '1px 6px', borderRadius: 99 }}>
                  {ci.sentimentDrivers.positive.length}
                </span>
              </div>
              <div style={{ background: '#fff', borderTop: '1px solid #dcfce7' }}>
                {ci.sentimentDrivers.positive.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 12px', borderBottom: i < ci.sentimentDrivers.positive.length - 1 ? '1px solid #F5F7FA' : 'none' }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#22c55e', flexShrink: 0, marginTop: 7 }} />
                    <span style={{ fontSize: 12, color: '#4B5A6D', lineHeight: 1.6 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {ci.sentimentDrivers.negative?.length > 0 && (
            <div style={{ border: '1px solid #fecaca', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 12px', background: '#fef2f2' }}>
                <ThumbsDown size={12} style={{ color: '#dc2626' }} />
                <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  What caused negative sentiment
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fecaca', padding: '1px 6px', borderRadius: 99 }}>
                  {ci.sentimentDrivers.negative.length}
                </span>
              </div>
              <div style={{ background: '#fff', borderTop: '1px solid #fecaca' }}>
                {ci.sentimentDrivers.negative.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 12px', borderBottom: i < ci.sentimentDrivers.negative.length - 1 ? '1px solid #F5F7FA' : 'none' }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#ef4444', flexShrink: 0, marginTop: 7 }} />
                    <span style={{ fontSize: 12, color: '#4B5A6D', lineHeight: 1.6 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Coaching tab ───────────────────────────────────────────────

function CoachingTab({ ci, onReanalyze, reanalyzing }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {ci.frameworkCoverage?.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 10, padding: '12px 14px' }}>
          <SectionLabel>Framework Coverage · {ci.framework}</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            {ci.frameworkCoverage.map(dim => (
              <div key={dim.dimension} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 8px', borderRadius: 6,
                background: dim.covered ? '#f0fdf4' : '#F5F7FA',
                border: `1px solid ${dim.covered ? '#dcfce7' : '#E4E9F0'}`,
              }}>
                {dim.covered
                  ? <CheckCircle2 size={10} style={{ color: '#16a34a', flexShrink: 0 }} />
                  : <XCircle     size={10} style={{ color: '#C8D2DE', flexShrink: 0 }} />
                }
                <span style={{ fontSize: 10, fontWeight: 600, color: dim.covered ? '#15803d' : '#8A97A8', lineHeight: 1.3 }}>
                  {dim.dimension}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ci.nextSteps?.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 10, padding: '12px 14px' }}>
          <SectionLabel>Recommended Next Steps</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {ci.nextSteps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 5, background: ORANGE,
                  fontSize: 9, fontWeight: 800, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 12, color: '#4B5A6D', lineHeight: 1.5, paddingTop: 2 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        marginTop: 'auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0',
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>Re-run analysis</div>
          <div style={{ fontSize: 11, color: '#8A97A8', marginTop: 1 }}>Refresh all intelligence scores</div>
        </div>
        <button type="button" onClick={onReanalyze} disabled={reanalyzing}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 7, border: '1px solid #E4E9F0',
            background: '#fff', color: NAVY,
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            cursor: reanalyzing ? 'not-allowed' : 'pointer', opacity: reanalyzing ? 0.6 : 1,
          }}>
          <RefreshCw size={12} style={{ animation: reanalyzing ? 'spin 1s linear infinite' : 'none' }} />
          {reanalyzing ? 'Running…' : 'Re-analyze'}
        </button>
      </div>
    </div>
  );
}

// ── Competitors tab ─────────────────────────────────────────────

const SENTIMENT_STYLE = {
  positive: { bg: '#f0fdf4', color: '#16a34a', border: '#dcfce7' },
  negative: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  neutral:  { bg: '#F5F7FA', color: '#6b7280', border: '#E4E9F0' },
};

function CompetitorsTab({ transcript, settings, competitors, setCompetitors, meetingId }) {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [dlOpen,   setDlOpen]   = useState(false);
  const dlRef = useRef(null);

  useClickOutside(dlRef, dlOpen ? () => setDlOpen(false) : null);

  const data = competitors;
  const hasData = data && data !== 'loading' && data.competitors !== undefined;

  async function handleDetect() {
    setLoading(true);
    setError(null);
    setCompetitors('loading');
    try {
      const result = await detectCompetitors(transcript, settings?.claudeApiKey);
      setCompetitors(result);
    } catch (err) {
      setError(err.message);
      setCompetitors(null);
    } finally {
      setLoading(false);
    }
  }

  const isLoading = loading || data === 'loading';

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {error && (
        <div style={{ background: '#fef2f2', color: '#dc2626', fontSize: 11.5, padding: '9px 12px', borderRadius: 7, border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {!hasData && !isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '40px 16px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fff', border: '1px solid #E4E9F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Swords size={22} style={{ color: '#C8D2DE' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>Competitor Analysis</div>
            <div style={{ fontSize: 12, color: '#8A97A8', lineHeight: 1.65, maxWidth: 200, margin: '0 auto 16px' }}>Detect DAP tools, SOP creators, chatbots, LMS platforms, and custom builds competing with Whatfix.</div>
            <button type="button" onClick={handleDetect}
              style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto', padding: '0 18px', height: 38, borderRadius: 8, border: 'none', background: ORANGE, color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer' }}>
              <Swords size={12} /> Detect Competitors
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0', color: '#8A97A8', fontSize: 12, fontWeight: 600 }}>
          <Spinner size={14} color={ORANGE} trackColor="#E4E9F0" />
          Scanning for competitor mentions...
        </div>
      )}

      {hasData && !isLoading && (
        <>
          {data.summary && (
            <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 8, padding: '10px 12px', borderLeft: `3px solid ${ORANGE}` }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: '#8A97A8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Summary</div>
              <p style={{ margin: 0, fontSize: 12, color: '#4B5A6D', lineHeight: 1.6 }}>{data.summary}</p>
            </div>
          )}

          {data.competitors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#8A97A8', fontSize: 12 }}>
              No competitors mentioned in this call.
            </div>
          ) : (
            data.competitors.map((c, i) => {
              const sStyle = SENTIMENT_STYLE[c.sentiment] || SENTIMENT_STYLE.neutral;
              return (
                <div key={i} style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0', padding: '12px 14px', animation: 'itemEnter 240ms cubic-bezier(0.22,1,0.36,1) both', animationDelay: `${i * 50}ms` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: '#F5F7FA', border: '1px solid #E4E9F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Swords size={12} style={{ color: ORANGE }} strokeWidth={2.5} />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: NAVY }}>{c.name}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: sStyle.color, background: sStyle.bg, border: `1px solid ${sStyle.border}`, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {c.sentiment || 'neutral'}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#A8B4C0' }}>×{c.mentions || 1}</span>
                    </div>
                  </div>
                  {c.category && (
                    <div style={{ fontSize: 10, color: '#8A97A8', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.category}</div>
                  )}
                  {c.context && (
                    <p style={{ margin: '0 0 8px', fontSize: 11.5, color: '#4B5A6D', lineHeight: 1.6 }}>{c.context}</p>
                  )}
                  {c.quotes?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {c.quotes.map((q, qi) => (
                        <div key={qi} style={{ borderLeft: `2px solid #E4E9F0`, paddingLeft: 8, fontSize: 11, color: '#8A97A8', fontStyle: 'italic', lineHeight: 1.55 }}>
                          "{q}"
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={handleDetect} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 14px', height: 32, borderRadius: 7, border: '1px solid #E4E9F0', background: '#fff', color: '#8A97A8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer' }}>
              <RefreshCw size={10} /> Re-run
            </button>
            <div style={{ position: 'relative' }} ref={dlRef}>
              <button type="button" onClick={() => setDlOpen(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 14px', height: 32, borderRadius: 7, border: '1px solid #E4E9F0', background: '#fff', color: '#8A97A8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer' }}>
                <Download size={10} strokeWidth={2} /> Export
              </button>
              {dlOpen && (
                <div style={{ position: 'absolute', bottom: 'calc(100% + 4px)', right: 0, zIndex: 50, background: '#fff', borderRadius: 8, border: '1px solid #E4E9F0', boxShadow: '0 6px 20px rgba(13,23,38,0.10)', overflow: 'hidden', minWidth: 150 }}>
                  {[{ fmt: 'md', label: 'Markdown', ext: '.md' }, { fmt: 'json', label: 'JSON', ext: '.json' }, { fmt: 'doc', label: 'Word (.doc)', ext: '.doc' }, { fmt: 'txt', label: 'Plain Text', ext: '.txt' }].map(({ fmt, label, ext }) => (
                    <button key={fmt} type="button"
                      onClick={() => { downloadCompetitors(data, meetingId, fmt); setDlOpen(false); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', borderTop: '1px solid #F5F7FA', fontSize: 11.5, fontFamily: 'var(--font-sans)', fontWeight: 600, color: NAVY, textAlign: 'left', gap: 12 }}
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
          </div>
        </>
      )}
    </div>
  );
}

// ── Objections tab ──────────────────────────────────────────────

const SEVERITY_STYLE = {
  blocking: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  moderate: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  minor:    { bg: '#F5F7FA', color: '#6b7280', border: '#E4E9F0' },
};

function ObjectionsTab({ transcript, settings, objections, setObjections, meetingId }) {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [dlOpen,   setDlOpen]   = useState(false);
  const dlRef = useRef(null);

  useClickOutside(dlRef, dlOpen ? () => setDlOpen(false) : null);

  const data = objections;
  const hasData = data && data !== 'loading' && data.objections !== undefined;
  const isLoading = loading || data === 'loading';

  async function handleDetect() {
    setLoading(true);
    setError(null);
    setObjections('loading');
    try {
      const result = await trackObjections(transcript, settings?.claudeApiKey);
      setObjections(result);
    } catch (err) {
      setError(err.message);
      setObjections(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {error && (
        <div style={{ background: '#fef2f2', color: '#dc2626', fontSize: 11.5, padding: '9px 12px', borderRadius: 7, border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {!hasData && !isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '40px 16px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fff', border: '1px solid #E4E9F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={22} style={{ color: '#C8D2DE' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>Objection Tracker</div>
            <div style={{ fontSize: 12, color: '#8A97A8', lineHeight: 1.65, maxWidth: 200, margin: '0 auto 16px' }}>Identify all customer objections, how they were handled, and what remains unresolved.</div>
            <button type="button" onClick={handleDetect}
              style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto', padding: '0 18px', height: 38, borderRadius: 8, border: 'none', background: ORANGE, color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer' }}>
              <ShieldAlert size={12} /> Track Objections
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0', color: '#8A97A8', fontSize: 12, fontWeight: 600 }}>
          <Spinner size={14} color={ORANGE} trackColor="#E4E9F0" />
          Identifying objections...
        </div>
      )}

      {hasData && !isLoading && (
        <>
          {/* Summary strip */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Total', value: data.totalCount, color: NAVY },
              { label: 'Handled', value: data.handledCount, color: '#16a34a' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#fff', borderRadius: 8, border: '1px solid #E4E9F0', padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#8A97A8', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>

          {data.topRisk && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <AlertTriangle size={13} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Top Unresolved Risk</div>
                <div style={{ fontSize: 12, color: '#4B5A6D', lineHeight: 1.55 }}>{data.topRisk}</div>
              </div>
            </div>
          )}

          {data.objections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#8A97A8', fontSize: 12 }}>
              No objections detected in this call.
            </div>
          ) : (
            data.objections.map((obj, i) => {
              const sStyle = SEVERITY_STYLE[obj.severity] || SEVERITY_STYLE.minor;
              return (
                <div key={i} style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0', overflow: 'hidden', animation: 'itemEnter 240ms cubic-bezier(0.22,1,0.36,1) both', animationDelay: `${i * 50}ms` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderBottom: '1px solid #F5F7FA' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: sStyle.color, background: sStyle.bg, border: `1px solid ${sStyle.border}`, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {obj.severity || 'minor'}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#4B5A6D', background: '#F5F7FA', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {obj.category}
                      </span>
                    </div>
                    {obj.handled
                      ? <CheckCheck size={13} style={{ color: '#16a34a' }} strokeWidth={2.5} />
                      : <XCircle   size={13} style={{ color: '#C8D2DE' }} strokeWidth={2} />
                    }
                  </div>
                  <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{obj.summary}</div>
                    {obj.quote && (
                      <div style={{ borderLeft: `2px solid #E4E9F0`, paddingLeft: 8, fontSize: 11, color: '#8A97A8', fontStyle: 'italic', lineHeight: 1.55 }}>
                        "{obj.quote}"
                      </div>
                    )}
                    {obj.repResponse && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: obj.handled ? '#22c55e' : '#C8D2DE', flexShrink: 0, marginTop: 6 }} />
                        <div style={{ fontSize: 11.5, color: '#4B5A6D', lineHeight: 1.55 }}>
                          <span style={{ fontWeight: 700, color: obj.handled ? '#16a34a' : '#8A97A8' }}>
                            {obj.handled ? 'Handled: ' : 'Response: '}
                          </span>
                          {obj.repResponse}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={handleDetect} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 14px', height: 32, borderRadius: 7, border: '1px solid #E4E9F0', background: '#fff', color: '#8A97A8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer' }}>
              <RefreshCw size={10} /> Re-run
            </button>
            <div style={{ position: 'relative' }} ref={dlRef}>
              <button type="button" onClick={() => setDlOpen(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 14px', height: 32, borderRadius: 7, border: '1px solid #E4E9F0', background: '#fff', color: '#8A97A8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer' }}>
                <Download size={10} strokeWidth={2} /> Export
              </button>
              {dlOpen && (
                <div style={{ position: 'absolute', bottom: 'calc(100% + 4px)', right: 0, zIndex: 50, background: '#fff', borderRadius: 8, border: '1px solid #E4E9F0', boxShadow: '0 6px 20px rgba(13,23,38,0.10)', overflow: 'hidden', minWidth: 150 }}>
                  {[{ fmt: 'md', label: 'Markdown', ext: '.md' }, { fmt: 'json', label: 'JSON', ext: '.json' }, { fmt: 'doc', label: 'Word (.doc)', ext: '.doc' }, { fmt: 'csv', label: 'CSV', ext: '.csv' }, { fmt: 'txt', label: 'Plain Text', ext: '.txt' }].map(({ fmt, label, ext }) => (
                    <button key={fmt} type="button"
                      onClick={() => { downloadObjections(data, meetingId, fmt); setDlOpen(false); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', borderTop: '1px solid #F5F7FA', fontSize: 11.5, fontFamily: 'var(--font-sans)', fontWeight: 600, color: NAVY, textAlign: 'left', gap: 12 }}
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
          </div>
        </>
      )}
    </div>
  );
}

// ── Main screen ────────────────────────────────────────────────

const TABS = [
  { key: 'insights',    label: 'Insights' },
  { key: 'sentiment',   label: 'Sentiment' },
  { key: 'coaching',    label: 'Coaching' },
  { key: 'competitors', label: 'Competitors' },
  { key: 'objections',  label: 'Objections' },
];

export function IntelligenceScreen() {
  const transcript       = useStore(s => s.transcript);
  const meetingId        = useStore(s => s.meetingId);
  const settings         = useStore(s => s.settings);
  const callIntelligence = useStore(s => s.callIntelligence);
  const competitors      = useStore(s => s.competitors);
  const objections       = useStore(s => s.objections);
  const setCallIntelligence = useStore(s => s.setCallIntelligence);
  const insightsLoaded   = useStore(s => s.insightsLoaded);
  const setCompetitors   = useStore(s => s.setCompetitors);
  const setObjections    = useStore(s => s.setObjections);
  const setScreen        = useStore(s => s.setScreen);

  const [tab,         setTab]         = useState('insights');
  const [reanalyzing, setReanalyzing] = useState(false);
  const [error,       setError]       = useState(null);
  const [dlOpen,      setDlOpen]      = useState(false);
  const dlRef = useRef(null);
  const activeTabBtnRef = useRef(null);

  useClickOutside(dlRef, dlOpen ? () => setDlOpen(false) : null);

  useEffect(() => {
    if (activeTabBtnRef.current) {
      activeTabBtnRef.current.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    }
  }, [tab]);

  async function handleReanalyze() {
    setError(null);
    setReanalyzing(true);
    const apiKey = settings?.claudeApiKey;

    setCallIntelligence('loading');
    analyzeCallIntelligence(transcript, meetingId, apiKey)
      .then(ci => setCallIntelligence(ci))
      .catch(() => setCallIntelligence(null));

    try {
      const insights = await analyzeTranscript(transcript, meetingId, apiKey);
      insightsLoaded(insights);
      setScreen(SCREENS.INTELLIGENCE);
    } catch (err) {
      setError(err.message);
    } finally {
      setReanalyzing(false);
    }
  }

  // Loading state
  if (callIntelligence === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100vh', overflow: 'hidden', background: '#F5F7FA' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 12px', background: '#fff', borderBottom: '1px solid #E4E9F0', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Call Insights</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Spinner size={28} color={ORANGE} trackColor="#E4E9F0" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Running Analysis</div>
            <div style={{ fontSize: 11, color: '#8A97A8', marginTop: 4 }}>Detecting call type, frameworks, and sentiment</div>
          </div>
        </div>
      </div>
    );
  }

  // No data
  if (!callIntelligence) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100vh', overflow: 'hidden', background: '#F5F7FA' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 12px', background: '#fff', borderBottom: '1px solid #E4E9F0', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Call Insights</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 28, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F5F7FA', border: '1px solid #E4E9F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={22} style={{ color: '#A8B4C0' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: NAVY, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>No Intelligence Data</div>
            <div style={{ fontSize: 12, color: '#8A97A8', lineHeight: 1.65, maxWidth: 200 }}>
              Run "Analyze with Claude" on the Transcript screen to generate call intelligence.
            </div>
          </div>
          {transcript && (
            <button type="button" onClick={handleReanalyze}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0 18px', height: 40, borderRadius: 8, border: 'none',
                background: ORANGE, color: '#fff',
                fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                cursor: 'pointer',
              }}>
              <TrendingUp size={13} /> Analyze Now
            </button>
          )}
        </div>
      </div>
    );
  }

  const ci = callIntelligence;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100vh', overflow: 'hidden', background: '#F5F7FA' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 16px 12px',
        background: '#fff', borderBottom: '1px solid #E4E9F0',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button"
            onClick={() => setScreen(SCREENS.DETECTION)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px 4px 0', display: 'flex', color: '#8A97A8' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = NAVY)}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8A97A8')}
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
          </button>
          <div style={{ fontSize: 13, fontWeight: 900, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Call Insights
          </div>
          {meetingId && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#8A97A8',
              background: '#F5F7FA', border: '1px solid #E4E9F0',
              padding: '2px 8px', borderRadius: 5,
              fontFamily: 'monospace',
            }}>
              #{meetingId.slice(-6)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button type="button"
            onClick={handleReanalyze}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', color: '#8A97A8' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = ORANGE)}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8A97A8')}
          >
            <RefreshCw size={14} strokeWidth={2}
              style={{ animation: reanalyzing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <div style={{ position: 'relative' }} ref={dlRef}>
            <button type="button"
              onClick={() => setDlOpen(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', color: '#8A97A8' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = ORANGE)}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#8A97A8')}
            >
              <Download size={15} strokeWidth={2} />
            </button>
            {dlOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50, background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0', boxShadow: '0 8px 24px rgba(13,23,38,0.10)', overflow: 'hidden', minWidth: 175 }}>
                <div style={{ padding: '8px 12px 6px', fontSize: 9.5, fontWeight: 700, color: '#A8B4C0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Export Report
                </div>
                {[{ fmt: 'md', label: 'Markdown', ext: '.md' }, { fmt: 'json', label: 'JSON', ext: '.json' }, { fmt: 'doc', label: 'Word / Google Docs', ext: '.doc' }, { fmt: 'txt', label: 'Plain Text', ext: '.txt' }].map(({ fmt, label, ext }) => (
                  <button key={fmt} type="button"
                    onClick={() => { downloadIntelligence(ci, meetingId, fmt); setDlOpen(false); }}
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
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#dc2626', fontSize: 11, padding: '8px 14px', flexShrink: 0, borderBottom: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {/* Tab bar — scrollable so all tabs are reachable at any width */}
      <TabBar tabs={TABS} active={tab} onSelect={setTab} scrollable size="sm" activeRef={activeTabBtnRef} />

      {/* Tab content */}
      <div key={tab} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', animation: 'tabEnter 200ms cubic-bezier(0.22,1,0.36,1) both' }}>
        {tab === 'insights'    && <InsightsTab    ci={ci} />}
        {tab === 'sentiment'   && <SentimentTab   ci={ci} />}
        {tab === 'coaching'    && <CoachingTab    ci={ci} onReanalyze={handleReanalyze} reanalyzing={reanalyzing} />}
        {tab === 'competitors' && <CompetitorsTab transcript={transcript} settings={settings} competitors={competitors} setCompetitors={setCompetitors} meetingId={meetingId} />}
        {tab === 'objections'  && <ObjectionsTab  transcript={transcript} settings={settings} objections={objections} setObjections={setObjections} meetingId={meetingId} />}
      </div>
    </div>
  );
}
