import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import gsap from 'gsap';
import {
  ArrowLeft, RefreshCw, Download, BookOpen,
} from 'lucide-react';
import { generateExecSummary } from '../services/claudeService';
import { downloadExecSummary } from '../utils/analysisFormatter';
import { SCREENS } from '../constants';

const ORANGE = '#E55014';
const NAVY   = '#0D1726';

const SCORE_LABELS = { 1: 'Poor', 2: 'Weak', 3: 'Moderate', 4: 'Good', 5: 'Excellent' };
const SCORE_COLORS = { 1: '#dc2626', 2: '#f97316', 3: '#d97706', 4: '#16a34a', 5: '#15803d' };
const SCORE_BG     = { 1: '#fef2f2', 2: '#fff7ed', 3: '#fffbeb', 4: '#f0fdf4', 5: '#dcfce7' };
const SCORE_BORDER = { 1: '#fecaca', 2: '#fed7aa', 3: '#fde68a', 4: '#bbf7d0', 5: '#86efac' };

const SCORE_KEYS = [
  { key: 'storytellingFlow',       label: 'Storytelling & Flow' },
  { key: 'useCaseAlignment',       label: 'Use Case Alignment' },
  { key: 'featureValueMapping',    label: 'Feature-to-Value' },
  { key: 'differentiationClarity', label: 'Differentiation' },
  { key: 'objectionHandling',      label: 'Objection Handling' },
  { key: 'overallEffectiveness',   label: 'Overall' },
];

const SECTION_DEFS = [
  { key: 'storyline',  title: 'Demo Storyline & Flow',        tab: 'demo'  },
  { key: 'useCases',   title: 'Use Cases & Product Positioning', tab: 'demo'  },
  { key: 'infosec',    title: 'InfoSec / Deployment Deep Dive',  tab: 'risks' },
  { key: 'gaps',       title: 'Gaps & Missed Opportunities',     tab: 'risks' },
  { key: 'improvements', title: 'Opportunities & Improvements',  tab: 'next'  },
];

const QUALITY_COLORS = { strong: '#16a34a', moderate: '#d97706', weak: '#dc2626' };
const QUALITY_BG     = { strong: '#f0fdf4', moderate: '#fffbeb', weak: '#fef2f2' };
const QUALITY_BORDER = { strong: '#bbf7d0', moderate: '#fde68a', weak: '#fecaca' };

const Q_CATEGORY_LABELS = {
  'product-capability': 'Product',
  'use-case-fit':       'Use Case',
  'pricing-roi':        'Pricing / ROI',
  'competition':        'Competition',
  'implementation':     'Implementation',
  'security-infosec':   'Security',
};
const Q_CATEGORY_COLORS = {
  'product-capability': '#2563eb',
  'use-case-fit':       '#7c3aed',
  'pricing-roi':        '#d97706',
  'competition':        '#dc2626',
  'implementation':     '#0891b2',
  'security-infosec':   '#16a34a',
};
const Q_QUALITY_COLORS = { complete: '#16a34a', partial: '#d97706', deflected: '#f97316', unanswered: '#dc2626' };

const DIFF_RATING_COLORS = { strong: '#15803d', moderate: '#d97706', weak: '#dc2626', 'intentionally light': '#6B7A8D' };
const DIFF_RATING_BG     = { strong: '#dcfce7', moderate: '#fef9c3', weak: '#fee2e2', 'intentionally light': '#F5F7FA' };

const TABS = [
  { key: 'summary', label: 'Summary'    },
  { key: 'demo',    label: 'Demo'       },
  { key: 'risks',   label: 'Risks'      },
  { key: 'next',    label: 'Next Steps' },
];

const ANALYSIS_STEPS = [
  'Demo Storyline & Flow',
  'Use Cases & Product Positioning',
  'Feature Demonstration Quality',
  'Whatfix Differentiation Analysis',
  'Customer Questions & Objections',
  'InfoSec / Deployment Deep Dive',
  'Gaps & Missed Opportunities',
  'Opportunities & Improvements',
  'Demo Effectiveness Scoring',
  'Compiling Executive Summary',
];

// ── Inline markdown renderer ──────────────────────────────────────

function parseInline(text) {
  if (!text) return null;
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} style={{ fontWeight: 700, color: NAVY }}>{part.slice(2, -2)}</strong>
      : part
  );
}

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Empty line — small spacer
    if (!line.trim()) return <div key={i} style={{ height: 5 }} />;

    // h3
    if (line.match(/^###\s/)) {
      return (
        <div key={i} style={{
          fontSize: 10, fontWeight: 800, color: '#8A97A8',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          marginTop: 16, marginBottom: 4,
        }}>
          {line.replace(/^###\s/, '')}
        </div>
      );
    }

    // h2
    if (line.match(/^##\s/)) {
      return (
        <div key={i} style={{
          fontSize: 12.5, fontWeight: 800, color: NAVY,
          marginTop: 18, marginBottom: 6,
          paddingBottom: 5, borderBottom: '1px solid #E4E9F0',
        }}>
          {parseInline(line.replace(/^##\s/, ''))}
        </div>
      );
    }

    // h1
    if (line.match(/^#\s/)) {
      return (
        <div key={i} style={{
          fontSize: 13, fontWeight: 900, color: NAVY,
          marginTop: 18, marginBottom: 8,
        }}>
          {parseInline(line.replace(/^#\s/, ''))}
        </div>
      );
    }

    // Numbered list: "1. text"
    const numMatch = line.match(/^(\d+)\.\s(.+)/);
    if (numMatch) {
      return (
        <div key={i} style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'flex-start' }}>
          <span style={{
            minWidth: 18, height: 18, borderRadius: 4, background: NAVY,
            fontSize: 9, fontWeight: 800, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginTop: 2,
          }}>
            {numMatch[1]}
          </span>
          <span style={{ fontSize: 12, color: '#4B5A6D', lineHeight: 1.65 }}>
            {parseInline(numMatch[2])}
          </span>
        </div>
      );
    }

    // Lettered sub-list: "a) text" or "b) text" at line start
    const letMatch = line.match(/^([a-fA-F])\)\s(.+)/);
    if (letMatch) {
      return (
        <div key={i} style={{ display: 'flex', gap: 8, marginTop: 5, marginLeft: 14, alignItems: 'flex-start' }}>
          <span style={{
            fontSize: 9, fontWeight: 800, color: '#A8B4C0',
            width: 14, flexShrink: 0, marginTop: 3, letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            {letMatch[1].toLowerCase()}
          </span>
          <span style={{ fontSize: 11.5, color: '#6B7A8D', lineHeight: 1.65 }}>
            {parseInline(letMatch[2])}
          </span>
        </div>
      );
    }

    // Indented bullet (2+ spaces before - or *)
    const indentMatch = line.match(/^\s{2,}[-*]\s(.+)/);
    if (indentMatch) {
      return (
        <div key={i} style={{ display: 'flex', gap: 8, marginTop: 4, marginLeft: 14, alignItems: 'flex-start' }}>
          <div style={{
            width: 3, height: 3, borderRadius: '50%',
            background: '#C8D2DE', flexShrink: 0, marginTop: 9,
          }} />
          <span style={{ fontSize: 11.5, color: '#6B7A8D', lineHeight: 1.65 }}>
            {parseInline(indentMatch[1])}
          </span>
        </div>
      );
    }

    // Regular bullet: "- text" or "* text"
    if (line.match(/^[-*]\s/)) {
      return (
        <div key={i} style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'flex-start' }}>
          <div style={{
            width: 2, height: 13, background: ORANGE,
            borderRadius: 1, flexShrink: 0, marginTop: 4,
          }} />
          <span style={{ fontSize: 12, color: '#4B5A6D', lineHeight: 1.65 }}>
            {parseInline(line.replace(/^[-*]\s/, ''))}
          </span>
        </div>
      );
    }

    // Plain paragraph
    return (
      <p key={i} style={{ fontSize: 12, color: '#4B5A6D', lineHeight: 1.65, margin: '4px 0' }}>
        {parseInline(line)}
      </p>
    );
  });
}

// ── Sub-components ────────────────────────────────────────────────

function TabBtn({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        padding: '10px 8px 9px', background: 'none', border: 'none',
        cursor: 'pointer', fontSize: 10, whiteSpace: 'nowrap', flexShrink: 0,
        fontWeight: active ? 800 : 600,
        color: active ? NAVY : '#8A97A8',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        borderBottom: active ? `2px solid ${ORANGE}` : '2px solid transparent',
        transition: 'color 120ms, border-color 120ms',
        marginBottom: -1,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = NAVY; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = '#8A97A8'; }}
    >
      {label}
    </button>
  );
}

function ScoreCard({ label, score, rationale }) {
  const color  = SCORE_COLORS[score] || '#6b7280';
  const bg     = SCORE_BG[score]     || '#F5F7FA';
  const border = SCORE_BORDER[score] || '#E4E9F0';
  return (
    <div style={{ background: bg, borderRadius: 8, border: `1px solid ${border}`, padding: '10px 12px' }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: '#8A97A8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 4 }}>
        <span style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 11, color: '#A8B4C0', fontWeight: 500, marginBottom: 3 }}>/5</span>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: rationale ? 4 : 0 }}>
        {SCORE_LABELS[score] || '—'}
      </div>
      {rationale && (
        <div style={{ fontSize: 10.5, color: '#6B7A8D', lineHeight: 1.55, marginTop: 4, borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 6 }}>
          {rationale}
        </div>
      )}
    </div>
  );
}

function SectionBlock({ title, content }) {
  if (!content?.trim()) return null;
  return (
    <div className="cs-exec-section" style={{
      background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0',
      padding: '14px 16px',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 800, color: NAVY,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: 12, paddingBottom: 8,
        borderBottom: `2px solid ${ORANGE}`, display: 'inline-block',
      }}>
        {title}
      </div>
      <div style={{ marginTop: 10 }}>
        {renderMarkdown(content)}
      </div>
    </div>
  );
}

function FeatureCards({ features }) {
  if (!features?.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {features.map((f, i) => {
        const color  = QUALITY_COLORS[f.quality]  || '#6B7A8D';
        const bg     = QUALITY_BG[f.quality]      || '#F5F7FA';
        const border = QUALITY_BORDER[f.quality]  || '#E4E9F0';
        return (
          <div key={i} style={{
            background: bg, borderRadius: 8,
            border: `1px solid ${border}`,
            borderLeft: `3px solid ${color}`,
            padding: '9px 12px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{f.name}</span>
                {f.module && (
                  <span style={{
                    marginLeft: 7, fontSize: 9, fontWeight: 700, color: '#fff',
                    background: '#A8B4C0', padding: '1px 6px', borderRadius: 3,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    {f.module}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {f.valueArticulated && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '1px 6px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Value articulated
                  </span>
                )}
                <span style={{ fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {f.quality}
                </span>
              </div>
            </div>
            {f.useCase && (
              <div style={{ fontSize: 11, color: '#6B7A8D', marginTop: 4, lineHeight: 1.5 }}>
                {f.useCase}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DifferentiationBlock({ data }) {
  if (!data) return null;
  const ratingColor = DIFF_RATING_COLORS[data.overallRating] || '#6B7A8D';
  const ratingBg    = DIFF_RATING_BG[data.overallRating]    || '#F5F7FA';

  function VerdictPill({ label, value }) {
    if (!value) return null;
    const color = value === 'strong' ? '#15803d' : value === 'light' ? '#d97706' : '#6B7A8D';
    const bg    = value === 'strong' ? '#dcfce7' : value === 'light' ? '#fef9c3' : '#F5F7FA';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '7px 12px', background: bg, borderRadius: 8, border: `1px solid rgba(0,0,0,0.06)` }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#8A97A8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{value}</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Verdict row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <VerdictPill label="Why Whatfix?" value={data.whyWhatfix} />
        <VerdictPill label="vs Others?"   value={data.vsOthers} />
        {data.overallRating && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '7px 12px', background: ratingBg, borderRadius: 8, border: `1px solid rgba(0,0,0,0.06)` }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#8A97A8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Overall</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: ratingColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{data.overallRating}</span>
          </div>
        )}
      </div>

      {/* Differentiators shown */}
      {data.shown?.length > 0 && (
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#8A97A8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            Differentiators Presented
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.shown.map((d, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 7, padding: '8px 11px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#4B5A6D', lineHeight: 1.55 }}>{d.differentiator}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 1,
                  color: d.positioning === 'pain-led' ? '#16a34a' : d.positioning === 'both' ? '#2563eb' : '#d97706',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {d.positioning}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missed — could introduce now */}
      {data.missedNow?.length > 0 && (
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            Could Have Introduced
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {data.missedNow.map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ width: 2, height: 12, background: '#d97706', borderRadius: 1, flexShrink: 0, marginTop: 4 }} />
                <span style={{ fontSize: 12, color: '#4B5A6D', lineHeight: 1.6 }}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save for later */}
      {data.saveLater?.length > 0 && (
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            Save for Later
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {data.saveLater.map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ width: 2, height: 12, background: '#C8D2DE', borderRadius: 1, flexShrink: 0, marginTop: 4 }} />
                <span style={{ fontSize: 12, color: '#6B7A8D', lineHeight: 1.6 }}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QACards({ questions }) {
  if (!questions?.length) return (
    <div style={{ fontSize: 12, color: '#8A97A8', fontStyle: 'italic' }}>No customer questions recorded.</div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {questions.map((q, i) => {
        const catColor  = Q_CATEGORY_COLORS[q.category] || '#6B7A8D';
        const qualColor = Q_QUALITY_COLORS[q.quality]   || '#6B7A8D';
        return (
          <div key={i} style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 8, padding: '10px 13px' }}>
            <div style={{ display: 'flex', gap: 5, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: catColor, padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {Q_CATEGORY_LABELS[q.category] || q.category}
              </span>
              <span style={{ fontSize: 9, fontWeight: 700, color: qualColor, border: `1px solid ${qualColor}`, padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {q.quality}
              </span>
              {q.urgency === 'now' && (
                <span style={{ fontSize: 9, fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Address Now
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, lineHeight: 1.55, marginBottom: q.response ? 5 : 0 }}>
              {q.question}
            </div>
            {q.response && (
              <div style={{ fontSize: 11, color: '#6B7A8D', lineHeight: 1.55 }}>
                {q.response}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────

function SummaryTab({ data }) {
  const tabRef = useRef(null);

  useLayoutEffect(() => {
    if (!tabRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.cs-score-card',
        { opacity: 0, y: 14, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.38, ease: 'power2.out', stagger: 0.05, clearProps: 'transform,opacity' }
      );
      gsap.fromTo('.cs-exec-bullet',
        { opacity: 0, x: -8 },
        { opacity: 1, x: 0, duration: 0.38, ease: 'power2.out', stagger: 0.06, delay: 0.35, clearProps: 'transform,opacity' }
      );
    }, tabRef);
    return () => ctx.revert();
  }, []);

  const overallScore = data.scores?.overallEffectiveness?.score;
  const overallColor = SCORE_COLORS[overallScore] || '#6b7280';

  return (
    <div ref={tabRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Overall score hero */}
      {overallScore && (
        <div style={{
          background: SCORE_BG[overallScore] || '#F5F7FA',
          border: `1px solid ${SCORE_BORDER[overallScore] || '#E4E9F0'}`,
          borderRadius: 10, padding: '16px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ textAlign: 'center', flexShrink: 0, paddingRight: 14, borderRight: '1px solid rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 52, fontWeight: 900, color: overallColor, lineHeight: 1 }}>{overallScore}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: overallColor, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>/5</div>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
              {SCORE_LABELS[overallScore]}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#8A97A8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Overall Demo Effectiveness
            </div>
            {data.scores?.overallEffectiveness?.rationale && (
              <div style={{ fontSize: 11.5, color: '#4B5A6D', lineHeight: 1.6 }}>
                {data.scores.overallEffectiveness.rationale}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Score grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {SCORE_KEYS.filter(k => k.key !== 'overallEffectiveness').map(({ key, label }) => {
          const s = data.scores?.[key];
          if (!s) return null;
          return (
            <div key={key} className="cs-score-card">
              <ScoreCard label={label} score={s.score} rationale={s.rationale} />
            </div>
          );
        })}
      </div>

      {/* Executive Summary bullets */}
      {data.executiveSummary?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0', padding: '14px 16px' }}>
          <div style={{
            fontSize: 10, fontWeight: 800, color: NAVY,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 12, paddingBottom: 8,
            borderBottom: `2px solid ${ORANGE}`, display: 'inline-block',
          }}>
            Executive Summary
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.executiveSummary.map((bullet, i) => (
              <div key={i} className="cs-exec-bullet" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                  minWidth: 20, height: 20, borderRadius: 5, background: NAVY,
                  fontSize: 9, fontWeight: 800, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  marginTop: 1,
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 12, color: '#4B5A6D', lineHeight: 1.65 }}>{parseInline(bullet)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DemoTab({ data }) {
  const tabRef = useRef(null);
  useLayoutEffect(() => {
    if (!tabRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.cs-exec-section', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.07, clearProps: 'transform,opacity' });
    }, tabRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={tabRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SectionBlock title="Demo Storyline & Flow" content={data.storyline} />
      <SectionBlock title="Use Cases & Product Positioning" content={data.useCases} />
      {data.features?.length > 0 && (
        <div className="cs-exec-section" style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0', padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${ORANGE}`, display: 'inline-block' }}>
            Feature Demonstration Quality
          </div>
          <div style={{ marginTop: 10 }}>
            <FeatureCards features={data.features} />
          </div>
        </div>
      )}
      {data.differentiation && (
        <div className="cs-exec-section" style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0', padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${ORANGE}`, display: 'inline-block' }}>
            Whatfix Differentiation Analysis
          </div>
          <div style={{ marginTop: 10 }}>
            <DifferentiationBlock data={data.differentiation} />
          </div>
        </div>
      )}
    </div>
  );
}

function RisksTab({ data }) {
  const tabRef = useRef(null);
  useLayoutEffect(() => {
    if (!tabRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.cs-exec-section', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.07, clearProps: 'transform,opacity' });
    }, tabRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={tabRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.questions?.length > 0 && (
        <div className="cs-exec-section" style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0', padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${ORANGE}`, display: 'inline-block' }}>
            Customer Questions, Objections & Responses
          </div>
          <div style={{ marginTop: 10 }}>
            <QACards questions={data.questions} />
          </div>
        </div>
      )}
      <SectionBlock title="InfoSec / Deployment Deep Dive" content={data.infosec} />
      <SectionBlock title="Gaps & Missed Opportunities" content={data.gaps} />
    </div>
  );
}

function NextStepsTab({ data, onReanalyze, reanalyzing }) {
  const tabRef = useRef(null);

  useLayoutEffect(() => {
    if (!tabRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.cs-exec-section',
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.07, clearProps: 'transform,opacity' }
      );
      gsap.fromTo('.cs-follow-action',
        { opacity: 0, x: -8 },
        { opacity: 1, x: 0, duration: 0.38, ease: 'power2.out', stagger: 0.07, delay: 0.28, clearProps: 'transform,opacity' }
      );
    }, tabRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={tabRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SectionBlock title="Opportunities & Improvements" content={data.improvements} />

      {data.followUpActions?.length > 0 && (
        <div className="cs-exec-section" style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0', padding: '14px 16px' }}>
          <div style={{
            fontSize: 10, fontWeight: 800, color: NAVY,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 12, paddingBottom: 8,
            borderBottom: `2px solid ${ORANGE}`, display: 'inline-block',
          }}>
            Follow-up Actions
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.followUpActions.map((action, i) => (
              <div key={i} className="cs-follow-action" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{
                  minWidth: 20, height: 20, borderRadius: 6, background: ORANGE,
                  fontSize: 9, fontWeight: 900, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  marginTop: 1,
                }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 12, color: '#4B5A6D', lineHeight: 1.65 }}>{parseInline(action)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0',
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>Re-run analysis</div>
          <div style={{ fontSize: 11, color: '#8A97A8', marginTop: 1 }}>Generate a fresh exec summary</div>
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
          {reanalyzing ? 'Running...' : 'Re-analyze'}
        </button>
      </div>
    </div>
  );
}

// ── Main screen ────────────────────────────────────────────────────

export function ExecSummaryScreen({ state, dispatch }) {
  const [tab,         setTab]         = useState('summary');
  const [reanalyzing, setReanalyzing] = useState(false);
  const [error,       setError]       = useState(null);
  const [dlOpen,      setDlOpen]      = useState(false);
  const [loadPct,     setLoadPct]     = useState(0);
  const [loadStep,    setLoadStep]    = useState(0);
  const loadPctRef = useRef(0);
  const dlRef      = useRef(null);

  // Progress bar animation while loading
  useEffect(() => {
    if (state.execSummary !== 'loading') {
      loadPctRef.current = 0;
      setLoadPct(0);
      setLoadStep(0);
      return;
    }
    loadPctRef.current = 0;
    const TARGET  = 88;
    const TICK_MS = 300;
    const INC     = (TARGET / 55000) * TICK_MS;
    const id = setInterval(() => {
      loadPctRef.current = Math.min(TARGET, loadPctRef.current + INC);
      setLoadPct(loadPctRef.current);
      setLoadStep(Math.min(
        ANALYSIS_STEPS.length - 1,
        Math.floor((loadPctRef.current / TARGET) * ANALYSIS_STEPS.length)
      ));
      if (loadPctRef.current >= TARGET) clearInterval(id);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [state.execSummary]);

  // Close download dropdown on outside click
  useEffect(() => {
    if (!dlOpen) return;
    function onDown(e) {
      if (dlRef.current && !dlRef.current.contains(e.target)) setDlOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [dlOpen]);

  async function runAnalysis() {
    setError(null);
    setReanalyzing(true);
    dispatch({ type: 'EXEC_SUMMARY_LOADING' });
    try {
      const result = await generateExecSummary(state.transcript, state.meetingId, state.settings?.claudeApiKey);
      dispatch({ type: 'EXEC_SUMMARY_LOADED', execSummary: result });
    } catch (err) {
      setError(err.message);
      dispatch({ type: 'EXEC_SUMMARY_FAILED' });
    } finally {
      setReanalyzing(false);
    }
  }

  // ── Loading state ──
  if (state.execSummary === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100vh', overflow: 'hidden', background: '#F5F7FA' }}>
        <div style={{
          display: 'flex', alignItems: 'center', padding: '14px 16px 12px',
          background: '#fff', borderBottom: '1px solid #E4E9F0', flexShrink: 0,
        }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Exec Summary
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 28px' }}>
          {/* Progress block */}
          <div style={{ width: '100%', maxWidth: 340 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Analysing Demo
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: ORANGE, fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(loadPct)}%
              </div>
            </div>

            {/* Bar */}
            <div style={{ height: 5, background: '#E4E9F0', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: ORANGE, borderRadius: 3,
                width: `${loadPct}%`, transition: 'width 300ms linear',
              }} />
            </div>

            {/* Current step label */}
            <div style={{
              marginTop: 10, fontSize: 11, color: '#8A97A8', fontWeight: 500,
              height: 16, overflow: 'hidden',
            }}>
              {ANALYSIS_STEPS[loadStep]}
            </div>
          </div>

          <div style={{
            marginTop: 28, fontSize: 11, color: '#A8B4C0',
            textAlign: 'center', lineHeight: 1.7, maxWidth: 240,
          }}>
            Running deep analysis across 10 dimensions. This typically takes 30 to 60 seconds.
          </div>
        </div>
      </div>
    );
  }

  // ── No data state ──
  if (!state.execSummary) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100vh', overflow: 'hidden', background: '#F5F7FA' }}>
        <div style={{
          display: 'flex', alignItems: 'center', padding: '14px 16px 12px',
          background: '#fff', borderBottom: '1px solid #E4E9F0', flexShrink: 0, gap: 8,
        }}>
          <button type="button"
            onClick={() => dispatch({ type: 'SET_SCREEN', screen: SCREENS.DETECTION })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px 4px 0', display: 'flex', color: '#8A97A8' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = NAVY)}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8A97A8')}
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
          </button>
          <div style={{ fontSize: 13, fontWeight: 900, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Exec Summary
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 28, textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: '#F5F7FA', border: '1px solid #E4E9F0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BookOpen size={22} style={{ color: '#A8B4C0' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: NAVY, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              No Analysis Yet
            </div>
            <div style={{ fontSize: 12, color: '#8A97A8', lineHeight: 1.65, maxWidth: 220 }}>
              Generate a comprehensive exec summary covering storyline, differentiation, risks, and follow-up actions.
            </div>
          </div>
          {(error || state.execSummaryError) && (
            <div style={{
              background: '#fef2f2', color: '#dc2626', fontSize: 11.5,
              padding: '9px 12px', borderRadius: 7, border: '1px solid #fecaca', maxWidth: 280,
              lineHeight: 1.55,
            }}>
              {error || state.execSummaryError}
            </div>
          )}
          {state.transcript && (
            <button type="button" onClick={runAnalysis}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0 18px', height: 40, borderRadius: 8, border: 'none',
                background: ORANGE, color: '#fff',
                fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                cursor: 'pointer',
              }}>
              <BookOpen size={13} /> Generate Analysis
            </button>
          )}
        </div>
      </div>
    );
  }

  const data = state.execSummary;

  // ── Main view ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100vh', overflow: 'hidden', background: '#F5F7FA' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 16px 12px',
        background: '#fff', borderBottom: '1px solid #E4E9F0', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button"
            onClick={() => dispatch({ type: 'SET_SCREEN', screen: SCREENS.DETECTION })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px 4px 0', display: 'flex', color: '#8A97A8' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = NAVY)}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8A97A8')}
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
          </button>
          <div style={{ fontSize: 13, fontWeight: 900, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Exec Summary
          </div>
          {state.meetingId && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#8A97A8',
              background: '#F5F7FA', border: '1px solid #E4E9F0',
              padding: '2px 8px', borderRadius: 5, fontFamily: 'monospace',
            }}>
              #{state.meetingId.slice(-6)}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button type="button"
            onClick={runAnalysis}
            disabled={reanalyzing}
            title="Re-run analysis"
            style={{ background: 'none', border: 'none', cursor: reanalyzing ? 'not-allowed' : 'pointer', padding: 6, borderRadius: 6, display: 'flex', color: '#8A97A8' }}
            onMouseEnter={(e) => { if (!reanalyzing) e.currentTarget.style.color = ORANGE; }}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8A97A8')}
          >
            <RefreshCw size={14} strokeWidth={2} style={{ animation: reanalyzing ? 'spin 1s linear infinite' : 'none' }} />
          </button>

          <div style={{ position: 'relative' }} ref={dlRef}>
            <button type="button"
              onClick={() => setDlOpen(v => !v)}
              title="Export"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', color: '#8A97A8' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = ORANGE)}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#8A97A8')}
            >
              <Download size={15} strokeWidth={2} />
            </button>
            {dlOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
                background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0',
                boxShadow: '0 8px 24px rgba(13,23,38,0.10)', overflow: 'hidden', minWidth: 175,
              }}>
                <div style={{ padding: '8px 12px 6px', fontSize: 9.5, fontWeight: 700, color: '#A8B4C0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Export
                </div>
                {[
                  { fmt: 'doc', label: 'Word / Google Docs', ext: '.doc' },
                  { fmt: 'md',  label: 'Markdown',           ext: '.md'  },
                  { fmt: 'txt', label: 'Plain Text',          ext: '.txt' },
                ].map(({ fmt, label, ext }) => (
                  <button key={fmt} type="button"
                    onClick={() => { downloadExecSummary(data, state.meetingId, fmt); setDlOpen(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
                      borderTop: '1px solid #F5F7FA', fontSize: 12, fontFamily: 'var(--font-sans)',
                      fontWeight: fmt === 'doc' ? 700 : 600, color: NAVY, textAlign: 'left', gap: 16,
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
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#dc2626', fontSize: 11, padding: '8px 14px', flexShrink: 0, borderBottom: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {/* Tab bar */}
      <div style={{
        display: 'flex', flexShrink: 0,
        background: '#fff', borderBottom: '1px solid #E4E9F0',
        padding: '0 8px', overflowX: 'auto',
      }}>
        {TABS.map(({ key, label }) => (
          <TabBtn key={key} label={label} active={tab === key} onClick={() => setTab(key)} />
        ))}
      </div>

      {/* Tab content */}
      <div key={tab} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', animation: 'tabEnter 200ms cubic-bezier(0.22,1,0.36,1) both' }}>
        {tab === 'summary' && <SummaryTab data={data} />}
        {tab === 'demo'    && <DemoTab data={data} />}
        {tab === 'risks'   && <RisksTab data={data} />}
        {tab === 'next'    && <NextStepsTab data={data} onReanalyze={runAnalysis} reanalyzing={reanalyzing} />}
      </div>
    </div>
  );
}
