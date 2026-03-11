import React, { useState } from 'react';
import {
  ArrowLeft, Bug, Zap, MessageSquare, Lightbulb, ListTodo,
  ExternalLink, Pencil, X, RefreshCw, ChevronDown,
} from 'lucide-react';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { Badge } from './ui/Badge';
import { SCREENS } from '../constants';
import { analyzeTranscript } from '../services/claudeService';
import { createJiraTicket } from '../services/jiraService';
import { createProductboardInsight } from '../services/productboardService';

const TYPE_META = {
  bug:         { icon: Bug,           bg: '#fef2f2', color: '#dc2626', label: 'Bug' },
  feature:     { icon: Zap,           bg: '#ede9ff', color: '#2b21ba', label: 'Feature' },
  pain:        { icon: MessageSquare, bg: '#fffbeb', color: '#d97706', label: 'Pain Point' },
  improvement: { icon: Lightbulb,     bg: '#f0fdf4', color: '#16a34a', label: 'Improvement' },
  action:      { icon: ListTodo,      bg: '#f0f9ff', color: '#0369a1', label: 'Action Item' },
};

function InsightCard({ insight, meetingId, settings, onEdit }) {
  const [jira, setJira] = useState({ loading: false, done: false, url: null, error: null });
  const [pb,   setPb]   = useState({ loading: false, done: false, url: null, error: null });
  const [open, setOpen] = useState(false);
  const [gone, setGone] = useState(false);

  const meta = TYPE_META[insight.type] || TYPE_META.improvement;
  const Icon = meta.icon;

  if (gone) return null;

  async function handleJira() {
    setJira({ loading: true, done: false, url: null, error: null });
    try {
      const r = await createJiraTicket({ ...insight, meetingId }, settings);
      setJira({ loading: false, done: true, url: r.url, error: null });
    } catch (err) {
      setJira({ loading: false, done: false, url: null, error: err.message });
    }
  }

  async function handlePB() {
    setPb({ loading: true, done: false, url: null, error: null });
    try {
      const r = await createProductboardInsight({ ...insight, meetingId }, settings);
      setPb({ loading: false, done: true, url: r.url, error: null });
    } catch (err) {
      setPb({ loading: false, done: false, url: null, error: err.message });
    }
  }

  return (
    <div className="anim-slide-up" style={{
      background: '#fff',
      borderRadius: 12,
      boxShadow: 'var(--shadow-card)',
      overflow: 'hidden',
      transition: 'box-shadow 130ms ease',
    }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-lift)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
    >
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 12px', cursor: 'pointer' }}
        onClick={() => setOpen((v) => !v)}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
          <Icon size={12} style={{ color: meta.color }} strokeWidth={2.5} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.35, color: '#111' }} className="truncate">
            {insight.title}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
            <Badge type={insight.type} label={meta.label} />
            <Badge type={insight.priority.toLowerCase()} label={insight.priority} />
            {insight.productArea && <Badge type="default" label={insight.productArea} />}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <Btn onClick={(e) => { e.stopPropagation(); onEdit(insight); }} hoverColor="#2b21ba"><Pencil size={11} /></Btn>
          <Btn onClick={(e) => { e.stopPropagation(); setGone(true); }} hoverColor="#dc2626"><X size={11} /></Btn>
          <Btn onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 180ms ease' }}>
            <ChevronDown size={11} />
          </Btn>
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div className="anim-slide-up" style={{ borderTop: '1px solid #f0f0f0', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 11.5, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
            {insight.description}
          </p>

          {(jira.error || pb.error) && (
            <div style={{ fontSize: 11, color: '#dc2626', background: '#fef2f2', padding: '6px 9px', borderRadius: 7 }}>
              {jira.error || pb.error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {jira.done ? (
              <a href={jira.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: '#16a34a', textDecoration: 'none' }}>
                <ExternalLink size={10} /> JIRA created
              </a>
            ) : (
              <Button size="xs" variant="secondary" loading={jira.loading} onClick={handleJira}>
                {jira.loading ? 'Creating…' : 'Create JIRA'}
              </Button>
            )}
            {pb.done ? (
              <a href={pb.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: '#16a34a', textDecoration: 'none' }}>
                <ExternalLink size={10} /> PB created
              </a>
            ) : (
              <Button size="xs" variant="secondary" loading={pb.loading} onClick={handlePB}>
                {pb.loading ? 'Creating…' : 'Productboard'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Btn({ children, onClick, hoverColor = '#999', style = {} }) {
  return (
    <button type="button" onClick={onClick} style={{
      background: 'none', border: 'none', cursor: 'pointer', color: '#ccc',
      padding: '4px', borderRadius: 6, display: 'flex', transition: 'color 130ms ease', ...style,
    }}
      onMouseEnter={(e) => (e.currentTarget.style.color = hoverColor)}
      onMouseLeave={(e) => (e.currentTarget.style.color = '#ccc')}
    >
      {children}
    </button>
  );
}

export function AnalysisScreen({ state, dispatch }) {
  const [reanalyzing, setReanalyzing] = useState(false);
  const [error, setError] = useState(null);

  async function handleReanalyze() {
    setError(null);
    setReanalyzing(true);
    try {
      const insights = await analyzeTranscript(state.transcript, state.meetingId, state.settings?.claudeApiKey);
      dispatch({ type: 'INSIGHTS_LOADED', insights });
    } catch (err) {
      setError(err.message);
    } finally {
      setReanalyzing(false);
    }
  }

  const typeCounts = state.insights.reduce((acc, i) => {
    acc[i.type] = (acc[i.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="screen">
      {/* Header */}
      <div className="screen-header anim-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconButton icon={ArrowLeft} title="Back"
            onClick={() => dispatch({ type: 'SET_SCREEN', screen: SCREENS.TRANSCRIPT_ACTIONS })} />
          <div>
            <div className="text-title">Analysis</div>
            <div className="text-meta">{state.insights.length} insight{state.insights.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <IconButton icon={RefreshCw} title="Re-analyze" disabled={reanalyzing}
          style={{ animation: reanalyzing ? 'spin 1s linear infinite' : 'none' }}
          onClick={handleReanalyze} />
      </div>

      {/* Type summary */}
      {Object.keys(typeCounts).length > 0 && (
        <div className="anim-fade-in" style={{ display: 'flex', gap: 5, flexWrap: 'wrap', padding: '10px 14px 0' }}>
          {Object.entries(typeCounts).map(([type, count]) => (
            <Badge key={type} type={type} label={`${count} ${TYPE_META[type]?.label || type}`} />
          ))}
        </div>
      )}

      {error && <div className="banner error" style={{ margin: '8px 14px 0' }}>{error}</div>}

      {reanalyzing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#2b21ba', padding: '8px 14px 0' }}>
          <span style={{ width: 12, height: 12, border: '1.5px solid #ddd', borderTopColor: '#2b21ba', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />
          Re-analyzing with Claude…
        </div>
      )}

      {/* Cards */}
      <div className="screen-body anim-stagger" style={{ paddingTop: 10, paddingBottom: 18, gap: 6 }}>
        {state.insights.length === 0 && !reanalyzing && (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--color-text-muted)', fontSize: 12 }}>
            No insights found in this transcript.
          </div>
        )}
        {state.insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} meetingId={state.meetingId}
            settings={state.settings}
            onEdit={(ticket) => dispatch({ type: 'EDIT_TICKET', ticket })} />
        ))}
      </div>
    </div>
  );
}
