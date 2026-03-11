import React, { useState } from 'react';
import {
  ArrowLeft, Bug, Zap, MessageSquare, Lightbulb, ListTodo,
  ExternalLink, Pencil, X, RefreshCw, ChevronDown,
  ListChecks, Layers, Info,
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

// Route insights to the right creation platform
const JIRA_TYPES = new Set(['bug', 'improvement', 'action']);
const PB_TYPES   = new Set(['feature', 'pain']);

// ──────────────────────────────────────────────
// Tiny icon-only action button used inside cards
// ──────────────────────────────────────────────
function Btn({ children, onClick, hoverColor = '#999', title, style = {} }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#ccc', padding: '4px', borderRadius: 5,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'color 130ms ease', flexShrink: 0,
        ...style,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = hoverColor)}
      onMouseLeave={(e) => (e.currentTarget.style.color = '#ccc')}
    >
      {children}
    </button>
  );
}

// ──────────────────────────────────────────────
// Section divider with icon + label + count
// ──────────────────────────────────────────────
function SectionHeader({ icon: Icon, iconColor, iconBg, title, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      paddingTop: 10, paddingBottom: 4,
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: 5, background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={10} style={{ color: iconColor }} strokeWidth={2.5} />
      </div>
      <span style={{
        fontSize: 10.5, fontWeight: 700, color: '#555',
        textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap',
      }}>
        {title}
      </span>
      <span style={{ fontSize: 10, fontWeight: 600, color: '#bbb' }}>· {count}</span>
      <div style={{ flex: 1, height: 1, background: '#ebebeb', marginLeft: 2 }} />
    </div>
  );
}

// ──────────────────────────────────────────────
// Individual insight card
// ──────────────────────────────────────────────
function InsightCard({ insight, meetingId, settings, onEdit, primaryAction }) {
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

  const isBusy = jira.loading || pb.loading;

  return (
    <div
      className="anim-slide-up"
      style={{
        background: '#fff',
        borderRadius: 10,
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
        transition: 'box-shadow 130ms ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-lift)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
    >
      {/* ── Header row ── */}
      <div
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 9,
          padding: '10px 11px', cursor: 'pointer',
        }}
        onClick={() => setOpen((v) => !v)}
      >
        {/* Type icon */}
        <div style={{
          width: 24, height: 24, borderRadius: 6, background: meta.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: 1,
        }}>
          <Icon size={11} style={{ color: meta.color }} strokeWidth={2.5} />
        </div>

        {/* Title + badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: '#111',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {insight.title}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            <Badge type={insight.type} label={meta.label} />
            <Badge type={insight.priority.toLowerCase()} label={insight.priority} />
            {insight.productArea && (
              <Badge type="default" label={insight.productArea} />
            )}
          </div>
        </div>

        {/* Action icons */}
        <div style={{ display: 'flex', gap: 0, flexShrink: 0, marginTop: 1 }}>
          <Btn onClick={(e) => { e.stopPropagation(); onEdit(insight); }} hoverColor="#2b21ba" title="Edit ticket">
            <Pencil size={11} />
          </Btn>
          <Btn onClick={(e) => { e.stopPropagation(); setGone(true); }} hoverColor="#dc2626" title="Dismiss">
            <X size={11} />
          </Btn>
          <Btn
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 180ms ease' }}
            onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
            title={open ? 'Collapse' : 'Expand'}
          >
            <ChevronDown size={11} />
          </Btn>
        </div>
      </div>

      {/* ── Expanded body ── */}
      {open && (
        <div
          className="anim-slide-up"
          style={{
            borderTop: '1px solid #f0f0f0',
            padding: '9px 11px 10px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}
        >
          <p style={{
            fontSize: 11.5, color: 'var(--color-text-secondary)',
            lineHeight: 1.6, margin: 0,
          }}>
            {insight.description}
          </p>

          {/* Error banners */}
          {jira.error && (
            <div style={{
              fontSize: 11, color: '#dc2626', background: '#fef2f2',
              padding: '5px 9px', borderRadius: 6, lineHeight: 1.45,
            }}>
              JIRA: {jira.error}
            </div>
          )}
          {pb.error && (
            <div style={{
              fontSize: 11, color: '#dc2626', background: '#fef2f2',
              padding: '5px 9px', borderRadius: 6, lineHeight: 1.45,
            }}>
              Productboard: {pb.error}
            </div>
          )}

          {/* Create buttons */}
          <div style={{ display: 'flex', gap: 5 }}>
            {/* JIRA button */}
            {jira.done ? (
              <a
                href={jira.url} target="_blank" rel="noopener noreferrer"
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 4, fontSize: 11, fontWeight: 600, color: '#16a34a',
                  textDecoration: 'none', background: '#f0fdf4',
                  padding: '6px 8px', borderRadius: 6,
                }}
              >
                <ExternalLink size={10} /> JIRA ✓
              </a>
            ) : (
              <Button
                size="xs"
                variant={primaryAction === 'jira' ? 'primary' : 'secondary'}
                loading={jira.loading}
                disabled={isBusy}
                onClick={handleJira}
                style={{ flex: 1 }}
              >
                {jira.loading ? 'Creating…' : 'Create JIRA'}
              </Button>
            )}

            {/* Productboard button */}
            {pb.done ? (
              <a
                href={pb.url} target="_blank" rel="noopener noreferrer"
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 4, fontSize: 11, fontWeight: 600, color: '#16a34a',
                  textDecoration: 'none', background: '#f0fdf4',
                  padding: '6px 8px', borderRadius: 6,
                }}
              >
                <ExternalLink size={10} /> PB ✓
              </a>
            ) : (
              <Button
                size="xs"
                variant={primaryAction === 'pb' ? 'accent' : 'secondary'}
                loading={pb.loading}
                disabled={isBusy}
                onClick={handlePB}
                style={{ flex: 1 }}
              >
                {pb.loading ? 'Creating…' : 'Productboard'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Main screen
// ──────────────────────────────────────────────
export function AnalysisScreen({ state, dispatch }) {
  const [reanalyzing, setReanalyzing] = useState(false);
  const [error, setError] = useState(null);

  async function handleReanalyze() {
    setError(null);
    setReanalyzing(true);
    try {
      const insights = await analyzeTranscript(
        state.transcript, state.meetingId, state.settings?.claudeApiKey
      );
      dispatch({ type: 'INSIGHTS_LOADED', insights });
    } catch (err) {
      setError(err.message);
    } finally {
      setReanalyzing(false);
    }
  }

  const insights = state.insights || [];

  // Split into two tracks
  const jiraTrack = insights.filter((i) => JIRA_TYPES.has(i.type));
  const pbTrack   = insights.filter((i) => PB_TYPES.has(i.type));

  const totalCount = insights.length;

  return (
    <div className="screen">
      {/* Header */}
      <div className="screen-header anim-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconButton
            icon={ArrowLeft} title="Back"
            onClick={() => dispatch({ type: 'SET_SCREEN', screen: SCREENS.TRANSCRIPT_ACTIONS })}
          />
          <div>
            <div className="text-title">Analysis</div>
            <div className="text-meta">
              {totalCount} insight{totalCount !== 1 ? 's' : ''}
              {jiraTrack.length > 0 && pbTrack.length > 0
                ? ` · ${jiraTrack.length} JIRA · ${pbTrack.length} PB`
                : ''}
            </div>
          </div>
        </div>
        <IconButton
          icon={RefreshCw} title="Re-analyze" disabled={reanalyzing}
          style={{ animation: reanalyzing ? 'spin 1s linear infinite' : 'none' }}
          onClick={handleReanalyze}
        />
      </div>

      {/* Status */}
      {error && (
        <div className="banner error" style={{ margin: '8px 14px 0' }}>{error}</div>
      )}
      {reanalyzing && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          fontSize: 12, color: '#2b21ba', padding: '8px 14px 0',
        }}>
          <span style={{
            width: 12, height: 12, flexShrink: 0,
            border: '1.5px solid #ddd', borderTopColor: '#2b21ba',
            borderRadius: '50%', animation: 'spin 0.7s linear infinite',
            display: 'inline-block',
          }} />
          Re-analyzing with Claude…
        </div>
      )}

      {/* Scrollable card list */}
      <div
        className="screen-body"
        style={{ paddingTop: 4, paddingBottom: 20, gap: 5 }}
      >
        {insights.length === 0 && !reanalyzing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }}>
            <div style={{
              textAlign: 'center', padding: '32px 20px',
              background: '#f6f6f8', borderRadius: 12,
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
              <div className="text-heading" style={{ fontSize: 13, marginBottom: 6 }}>No product insights found</div>
              <div className="text-meta" style={{ lineHeight: 1.6, maxWidth: 260, margin: '0 auto' }}>
                Claude looked for Whatfix bugs, feature requests, pain points, and improvements but found nothing actionable in this transcript.
              </div>
            </div>
            <div style={{
              padding: '10px 13px', borderRadius: 10,
              background: '#f5f3ff', boxShadow: '0 0 0 1px rgba(43,33,186,0.10)',
              fontSize: 11, color: '#555', lineHeight: 1.6,
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <Info size={12} style={{ color: '#2b21ba', flexShrink: 0, marginTop: 1 }} />
              <span>
                This may be a call focused on scheduling, professional services, or general account management.
                Try a call where the customer discusses product usage, issues, or requests.
              </span>
            </div>
          </div>
        )}

        {/* ── JIRA track: bugs · improvements · actions ── */}
        {jiraTrack.length > 0 && (
          <>
            <SectionHeader
              icon={ListChecks} iconColor="#2b21ba" iconBg="#ede9ff"
              title="JIRA Tickets" count={jiraTrack.length}
            />
            {jiraTrack.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                meetingId={state.meetingId}
                settings={state.settings}
                primaryAction="jira"
                onEdit={(ticket) => dispatch({ type: 'EDIT_TICKET', ticket })}
              />
            ))}
          </>
        )}

        {/* ── Productboard track: features · pain points ── */}
        {pbTrack.length > 0 && (
          <>
            <SectionHeader
              icon={Layers} iconColor="#f26b3a" iconBg="#fff1eb"
              title="Productboard" count={pbTrack.length}
            />
            {pbTrack.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                meetingId={state.meetingId}
                settings={state.settings}
                primaryAction="pb"
                onEdit={(ticket) => dispatch({ type: 'EDIT_TICKET', ticket })}
              />
            ))}
          </>
        )}

        {/* ── Bottom summary — pushed down when list is short ── */}
        {insights.length > 0 && (
          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            <div style={{
              display: 'flex', gap: 6,
              padding: '10px 13px', borderRadius: 10,
              background: '#f6f6f8', boxShadow: 'var(--shadow-card)',
            }}>
              {jiraTrack.length > 0 && (
                <div style={{ flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 7, background: '#ede9ff' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#2b21ba' }}>{jiraTrack.length}</div>
                  <div style={{ fontSize: 9.5, color: '#2b21ba', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>JIRA</div>
                </div>
              )}
              {pbTrack.length > 0 && (
                <div style={{ flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 7, background: '#fff1eb' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#f26b3a' }}>{pbTrack.length}</div>
                  <div style={{ fontSize: 9.5, color: '#f26b3a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Productboard</div>
                </div>
              )}
              <div style={{ flex: 2, display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
                <span style={{ fontSize: 11, color: '#888', lineHeight: 1.45 }}>
                  Expand a card and click <strong style={{ color: '#555' }}>Create JIRA</strong> or <strong style={{ color: '#555' }}>Productboard</strong> to submit.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
