import { useState, useRef } from 'react';
import {
  Bug, Zap, MessageSquare, Lightbulb, ListTodo,
  ExternalLink, Pencil, X, RefreshCw, LayoutList,
  BarChart2, ArrowRight, Download, ChevronDown, Check,
} from 'lucide-react';
import { analyzeTranscript, analyzeCallIntelligence } from '../services/claudeService';
import { createJiraTicket } from '../services/jiraService';
import { createProductboardInsight } from '../services/productboardService';
import { downloadAllInsights, downloadSingleInsight, downloadFullReport } from '../utils/analysisFormatter';
import { SCREENS, ORANGE, NAVY } from '../constants';
import { toast } from 'sonner';
import { Spinner } from './ui/Spinner';
import { TabBar } from './ui/TabBar';
import { useClickOutside } from '../hooks/useClickOutside';
import { useStore } from '../store';

const TYPE_META = {
  bug:         { icon: Bug,           color: '#dc2626', bg: '#fef2f2', label: 'Bug' },
  feature:     { icon: Zap,           color: ORANGE,    bg: '#FFF4EF', label: 'Feature' },
  pain:        { icon: MessageSquare, color: '#d97706', bg: '#fffbeb', label: 'Pain Point' },
  improvement: { icon: Lightbulb,     color: '#16a34a', bg: '#f0fdf4', label: 'Improvement' },
  action:      { icon: ListTodo,      color: '#6366f1', bg: '#eef2ff', label: 'Action' },
};

const JIRA_TYPES = new Set(['bug', 'improvement', 'action']);
const PB_TYPES   = new Set(['feature', 'pain']);

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const PRIORITY_COLORS = {
  critical: { bg: ORANGE,    color: '#fff' },
  high:     { bg: '#f97316', color: '#fff' },
  medium:   { bg: '#f59e0b', color: '#fff' },
  low:      { bg: '#6b7280', color: '#fff' },
};

const TABS = [
  { key: 'all',      label: 'All' },
  { key: 'priority', label: 'Priority' },
  { key: 'type',     label: 'Type' },
];

const CARD_DOWNLOAD_FORMATS = [
  { fmt: 'md',   label: 'Markdown', ext: '.md'   },
  { fmt: 'json', label: 'JSON',     ext: '.json'  },
  { fmt: 'txt',  label: 'Plain Text', ext: '.txt' },
];

function InsightCard({ insight, meetingId, settings, onEdit, onDismiss, delay = 0 }) {
  const [jira,         setJira]         = useState({ loading: false, done: false, url: null, error: null });
  const [pb,           setPb]           = useState({ loading: false, done: false, url: null, error: null });
  const [open,         setOpen]         = useState(false);
  const [dlOpen,       setDlOpen]       = useState(false);
  const dlRef = useRef(null);

  useClickOutside(dlRef, dlOpen ? () => setDlOpen(false) : null);

  const meta   = TYPE_META[insight.type] || TYPE_META.improvement;
  const TypeIcon = meta.icon;
  const isBusy = jira.loading || pb.loading;
  const prio   = (insight.priority || 'medium').toLowerCase();
  const prioStyle = PRIORITY_COLORS[prio] || PRIORITY_COLORS.medium;

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
    <div style={{
      background: '#fff',
      borderRadius: 10,
      border: '1px solid #E4E9F0',
      borderLeft: `3px solid ${meta.color}`,
      overflow: 'hidden',
      transition: 'border-color 150ms, box-shadow 150ms, transform 150ms',
      animation: 'itemEnter 240ms cubic-bezier(0.22,1,0.36,1) both',
      animationDelay: `${delay}ms`,
    }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(13,23,38,0.08)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ padding: '10px 12px' }}>

        {/* Top row: badges + actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', minWidth: 0 }}>
            <span style={{
              fontSize: 9, fontWeight: 800, color: '#fff',
              background: prioStyle.bg, padding: '2px 6px',
              borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em',
              flexShrink: 0,
            }}>
              {prio}
            </span>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 3,
              fontSize: 9, fontWeight: 700, color: meta.color,
              background: meta.bg, padding: '2px 6px',
              borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em',
              flexShrink: 0,
            }}>
              <TypeIcon size={9} strokeWidth={2.5} />
              {meta.label}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 1, flexShrink: 0, alignItems: 'center' }}>
            <button type="button" title="Edit"
              onClick={() => onEdit(insight)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px 4px', borderRadius: 5, color: '#C8D2DE', display: 'flex', transition: 'color 120ms' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#4B5A6D')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#C8D2DE')}
            ><Pencil size={11} /></button>

            {/* Per-card download */}
            <div style={{ position: 'relative' }} ref={dlRef}>
              <button type="button" title="Download"
                onClick={() => setDlOpen(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px 4px', borderRadius: 5, color: '#C8D2DE', display: 'flex', transition: 'color 120ms' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = ORANGE)}
                onMouseLeave={(e) => { if (!dlOpen) e.currentTarget.style.color = '#C8D2DE'; }}
              ><Download size={11} /></button>
              {dlOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 50,
                  background: '#fff', borderRadius: 8, border: '1px solid #E4E9F0',
                  boxShadow: '0 6px 20px rgba(13,23,38,0.10)', overflow: 'hidden', minWidth: 130,
                }}>
                  {CARD_DOWNLOAD_FORMATS.map(({ fmt, label, ext }) => (
                    <button key={fmt} type="button"
                      onClick={() => { downloadSingleInsight(insight, meetingId, fmt); setDlOpen(false); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 11.5, fontWeight: 600, color: NAVY, textAlign: 'left',
                        borderBottom: fmt !== 'txt' ? '1px solid #F5F7FA' : 'none',
                        gap: 12,
                        fontFamily: 'var(--font-sans)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F7FA')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      <span>{label}</span>
                      <span style={{ fontSize: 10, color: '#A8B4C0', fontWeight: 500 }}>{ext}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button type="button" title="Dismiss"
              onClick={() => onDismiss(insight.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px 4px', borderRadius: 5, color: '#C8D2DE', display: 'flex', transition: 'color 120ms' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#C8D2DE')}
            ><X size={11} /></button>
          </div>
        </div>

        {/* Title */}
        <div
          onClick={() => setOpen(v => !v)}
          style={{ cursor: 'pointer', marginBottom: 5 }}
        >
          <div style={{
            fontSize: 12, fontWeight: 700, color: NAVY,
            lineHeight: 1.4,
          }}>
            {insight.title}
          </div>
        </div>

        {/* Description */}
        {insight.description && (
          <p style={{
            margin: '0 0 8px', fontSize: 11.5, color: '#4B5A6D', lineHeight: 1.6,
            display: open ? 'block' : '-webkit-box',
            WebkitLineClamp: open ? undefined : 2,
            WebkitBoxOrient: 'vertical',
            overflow: open ? 'visible' : 'hidden',
          }}>
            {insight.description}
          </p>
        )}

        {/* Errors */}
        {(jira.error || pb.error) && (
          <div style={{ fontSize: 11, color: '#dc2626', background: '#fef2f2', padding: '5px 9px', borderRadius: 6, marginBottom: 8 }}>
            {jira.error || pb.error}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          {JIRA_TYPES.has(insight.type) && (
            jira.done
              ? <a href={jira.url} target="_blank" rel="noopener noreferrer" style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  fontSize: 10, fontWeight: 700, color: '#16a34a', textDecoration: 'none',
                  background: '#f0fdf4', padding: '6px 8px', borderRadius: 6,
                  border: '1px solid #dcfce7', textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  <ExternalLink size={10} /> View JIRA
                </a>
              : <button type="button" onClick={handleJira} disabled={isBusy}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    padding: '6px 8px', borderRadius: 6, border: 'none',
                    background: NAVY, color: '#fff',
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                    cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                  }}>
                  {jira.loading && <Spinner size={9} color="#fff" trackColor="rgba(255,255,255,0.3)" />}
                  {jira.loading ? 'Creating…' : 'JIRA'}
                </button>
          )}
          {PB_TYPES.has(insight.type) && (
            pb.done
              ? <a href={pb.url} target="_blank" rel="noopener noreferrer" style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  fontSize: 10, fontWeight: 700, color: '#16a34a', textDecoration: 'none',
                  background: '#f0fdf4', padding: '6px 8px', borderRadius: 6,
                  border: '1px solid #dcfce7', textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  <ExternalLink size={10} /> View PB
                </a>
              : <button type="button" onClick={handlePB} disabled={isBusy}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    padding: '6px 8px', borderRadius: 6, border: '1px solid #E4E9F0',
                    background: '#fff', color: NAVY,
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                    cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                  }}>
                  {pb.loading && <Spinner size={9} color={NAVY} trackColor="#C8D2DE" />}
                  {pb.loading ? 'Creating…' : 'Productboard'}
                </button>
          )}
          {(JIRA_TYPES.has(insight.type) || PB_TYPES.has(insight.type)) && !jira.done && !pb.done && (
            <button type="button"
              onClick={JIRA_TYPES.has(insight.type) ? handleJira : handlePB}
              disabled={isBusy}
              style={{
                flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '6px 10px', borderRadius: 6, border: 'none',
                background: ORANGE, color: '#fff',
                fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}>
              Push <ArrowRight size={9} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function GroupHeader({ label, color, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '4px 0 2px',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 10, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <span style={{ fontSize: 10, fontWeight: 600, color: '#A8B4C0' }}>{count}</span>
    </div>
  );
}

const EXPORT_FORMATS = [
  { fmt: 'md',   label: 'Markdown',              ext: '.md'   },
  { fmt: 'json', label: 'JSON',                  ext: '.json'  },
  { fmt: 'csv',  label: 'CSV',                   ext: '.csv'   },
  { fmt: 'doc',  label: 'Word / Google Docs',    ext: '.doc'   },
  { fmt: 'txt',  label: 'Plain Text',            ext: '.txt'   },
];

export function AnalysisScreen() {
  const stateInsights    = useStore(s => s.insights);
  const _insightsRan     = useStore(s => s._insightsRan);
  const meetingId        = useStore(s => s.meetingId);
  const transcript       = useStore(s => s.transcript);
  const settings         = useStore(s => s.settings);
  const callIntelligence = useStore(s => s.callIntelligence);
  const setScreen        = useStore(s => s.setScreen);
  const setCallIntelligence = useStore(s => s.setCallIntelligence);
  const insightsLoaded   = useStore(s => s.insightsLoaded);
  const editTicket       = useStore(s => s.editTicket);

  const [activeTab,   setTab]        = useState('all');
  const [reanalyzing, setReanalyzing] = useState(false);
  const [dismissed,   setDismissed]   = useState(new Set());
  const [exportOpen,  setExportOpen]  = useState(false);
  const [downloaded,  setDownloaded]  = useState(false);
  const exportRef = useRef(null);

  useClickOutside(exportRef, exportOpen ? () => setExportOpen(false) : null);

  function handleExport(fmt) {
    downloadAllInsights(insights, meetingId, fmt);
    setExportOpen(false);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  }

  const insights = (stateInsights || []).filter(i => !dismissed.has(i.id));

  // Build display list based on active tab
  function buildDisplayList() {
    if (activeTab === 'all') {
      return { type: 'flat', items: insights };
    }

    if (activeTab === 'priority') {
      const sorted = [...insights].sort((a, b) => {
        const ao = PRIORITY_ORDER[(a.priority || 'medium').toLowerCase()] ?? 2;
        const bo = PRIORITY_ORDER[(b.priority || 'medium').toLowerCase()] ?? 2;
        return ao - bo;
      });
      // Group into sections
      const groups = {};
      sorted.forEach(i => {
        const p = (i.priority || 'medium').toLowerCase();
        if (!groups[p]) groups[p] = [];
        groups[p].push(i);
      });
      const sections = ['critical', 'high', 'medium', 'low']
        .filter(p => groups[p]?.length)
        .map(p => ({
          key: p,
          label: p.charAt(0).toUpperCase() + p.slice(1),
          color: PRIORITY_COLORS[p]?.bg || '#6b7280',
          items: groups[p],
        }));
      return { type: 'grouped', sections };
    }

    if (activeTab === 'type') {
      const typeOrder = ['bug', 'feature', 'pain', 'improvement', 'action'];
      const groups = {};
      insights.forEach(i => {
        const t = i.type || 'improvement';
        if (!groups[t]) groups[t] = [];
        groups[t].push(i);
      });
      const sections = typeOrder
        .filter(t => groups[t]?.length)
        .map(t => ({
          key: t,
          label: TYPE_META[t]?.label || t,
          color: TYPE_META[t]?.color || ORANGE,
          items: groups[t],
        }));
      return { type: 'grouped', sections };
    }

    return { type: 'flat', items: insights };
  }

  const display = buildDisplayList();

  async function handleReanalyze() {
    setError(null);
    setReanalyzing(true);
    const apiKey = settings?.claudeApiKey;

    // Only trigger call intelligence if not already loaded
    if (!callIntelligence || callIntelligence === null) {
      setCallIntelligence('loading');
      analyzeCallIntelligence(transcript, meetingId, apiKey)
        .then(ci => setCallIntelligence(ci))
        .catch(() => setCallIntelligence(null));
    }

    try {
      const newInsights = await analyzeTranscript(transcript, meetingId, apiKey);
      insightsLoaded(newInsights);
      setDismissed(new Set());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setReanalyzing(false);
    }
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
        background: '#fff', borderBottom: '1px solid #E4E9F0',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Product Gaps
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {callIntelligence && (
            <button type="button"
              onClick={() => setScreen(SCREENS.INTELLIGENCE)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 7,
                background: '#F5F7FA', border: '1px solid #E4E9F0',
                cursor: 'pointer', fontSize: 11, fontWeight: 700,
                color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em',
                transition: 'background 130ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#ECF0F5')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#F5F7FA')}
            >
              <BarChart2 size={12} strokeWidth={2} />
              Insights
            </button>
          )}

          {/* Collective export */}
          {insights.length > 0 && (
            <div style={{ position: 'relative' }} ref={exportRef}>
              <button type="button"
                onClick={() => setExportOpen(v => !v)}
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
                  : <><Download size={11} strokeWidth={2} /> Export <ChevronDown size={10} style={{ color: '#A8B4C0', transform: exportOpen ? 'rotate(180deg)' : 'none', transition: 'transform 180ms' }} /></>
                }
              </button>
              {exportOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
                  background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0',
                  boxShadow: '0 8px 24px rgba(13,23,38,0.10)', overflow: 'hidden', minWidth: 175,
                }}>
                  <div style={{ padding: '8px 12px 6px', fontSize: 9.5, fontWeight: 700, color: '#A8B4C0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Export {insights.length} insight{insights.length !== 1 ? 's' : ''}
                  </div>
                  {EXPORT_FORMATS.map(({ fmt, label, ext }) => (
                    <button key={fmt} type="button" onClick={() => handleExport(fmt)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
                        borderTop: '1px solid #F5F7FA',
                        fontSize: 12, fontFamily: 'var(--font-sans)', fontWeight: 600,
                        color: NAVY, textAlign: 'left', gap: 16,
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
          )}

          <button type="button"
            onClick={handleReanalyze}
            title="Re-analyze"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', color: '#8A97A8' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = ORANGE)}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8A97A8')}
          >
            <RefreshCw size={15} strokeWidth={2}
              style={{ animation: reanalyzing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <TabBar tabs={TABS} active={activeTab} onSelect={setTab}>
        {insights.length > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', paddingBottom: 1 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#A8B4C0' }}>
              {insights.length} item{insights.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </TabBar>

      {/* Card list */}
      <div key={activeTab} style={{
        flex: 1, minHeight: 0,
        overflowY: 'auto', padding: '12px 14px 20px',
        display: 'flex', flexDirection: 'column', gap: 8,
        animation: 'tabEnter 200ms cubic-bezier(0.22,1,0.36,1) both',
      }}>
        {insights.length === 0 && !reanalyzing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '48px 20px', textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: '#fff',
              border: '1px solid #E4E9F0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LayoutList size={24} style={{ color: '#C8D2DE' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {stateInsights?.length === 0 && !_insightsRan ? 'Ready to Analyze' : 'No Gaps Found'}
              </div>
              <div style={{ fontSize: 12, color: '#8A97A8', lineHeight: 1.65, maxWidth: 230, margin: '0 auto 18px' }}>
                Extract product gaps, bugs, feature requests, and pain points from this call using Claude.
              </div>
              <button type="button" onClick={handleReanalyze}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto',
                  padding: '0 20px', height: 40, borderRadius: 8, border: 'none',
                  background: ORANGE, color: '#fff',
                  cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                <Lightbulb size={13} strokeWidth={2.5} /> Analyze with Claude
              </button>
            </div>
          </div>
        ) : reanalyzing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: '#8A97A8', fontSize: 12, fontWeight: 600 }}>
            <Spinner size={14} color={ORANGE} trackColor="#E4E9F0" />
            Re-analyzing with Claude...
          </div>
        ) : display.type === 'flat' ? (
          display.items.map((insight, idx) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              delay={Math.min(idx * 40, 320)}
              meetingId={meetingId}
              settings={settings}
              onEdit={(ticket) => editTicket(ticket)}
              onDismiss={(id) => setDismissed(prev => new Set([...prev, id]))}
            />
          ))
        ) : (
          display.sections.map((section) => (
            <div key={section.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <GroupHeader label={section.label} color={section.color} count={section.items.length} />
              {section.items.map((insight, idx) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  delay={Math.min(idx * 40, 240)}
                  meetingId={meetingId}
                  settings={settings}
                  onEdit={(ticket) => editTicket(ticket)}
                  onDismiss={(id) => setDismissed(prev => new Set([...prev, id]))}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
