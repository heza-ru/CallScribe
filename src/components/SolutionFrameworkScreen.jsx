import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { RefreshCw, Compass, Users, Zap, Shield, ChevronRight, CheckCircle, XCircle, AlertCircle, ArrowLeft, Download } from 'lucide-react';
import { getSolutionFrameworkRecommendation, analyzeSolutionFramework } from '../services/claudeService';
import { downloadSolutionFramework } from '../utils/analysisFormatter';
import { ORANGE, NAVY } from '../constants';
import { Spinner } from './ui/Spinner';
import { TabBar } from './ui/TabBar';
import { useClickOutside } from '../hooks/useClickOutside';
import { mdComponents } from '../utils/markdownComponents';
import { useStore } from '../store';

const FIT_COLORS = { strong: '#16a34a', moderate: '#d97706', weak: '#dc2626' };
const FIT_BG     = { strong: '#f0fdf4', moderate: '#fffbeb', weak: '#fef2f2' };
const FIT_BORDER = { strong: '#bbf7d0', moderate: '#fde68a', weak: '#fecaca' };
const FIT_LABELS = { strong: 'Strong Fit', moderate: 'Moderate Fit', weak: 'Weak Fit' };

const CONFIDENCE_COLORS = { high: '#16a34a', medium: '#d97706', low: '#6B7A8D' };

const FRAMEWORK_DEFS = {
  MRP: {
    label:    'Mirror Roleplay',
    subtitle: 'Agent Training & Coaching',
    icon:     Users,
    color:    '#7c3aed',
    bg:       '#f5f3ff',
    border:   '#ddd6fe',
    desc:     'For contact center opportunities focused on agent performance, AI-powered call simulation, and scalable coaching.',
  },
  DT: {
    label:    'Digital Transformation',
    subtitle: 'New DAP Adoption',
    icon:     Zap,
    color:    '#0891b2',
    bg:       '#ecfeff',
    border:   '#a5f3fc',
    desc:     'For greenfield opportunities where no DAP exists and users struggle to adopt new digital tools.',
  },
  CD: {
    label:    'Competitive Displacement',
    subtitle: 'Replace Existing DAP',
    icon:     Shield,
    color:    '#dc2626',
    bg:       '#fef2f2',
    border:   '#fecaca',
    desc:     'For opportunities where WalkMe, Pendo, Appcues, or another DAP is already deployed but underperforming.',
  },
};

const ANALYSIS_TABS = [
  { key: 'overview',   label: 'Overview'    },
  { key: 'signals',    label: 'Signals'     },
  { key: 'mapping',    label: 'Mapping'     },
  { key: 'objections', label: 'Objections'  },
  { key: 'roi',        label: 'ROI'         },
  { key: 'demo',       label: 'Demo Focus'  },
];

// ── Sub-components ────────────────────────────────────────────────

function SignalRow({ signal, found, evidence }) {
  const color = found ? '#16a34a' : '#c4cdd6';
  const Icon = found ? CheckCircle : XCircle;
  return (
    <div style={{
      display: 'flex', gap: 10, padding: '9px 0',
      borderBottom: '1px solid #F0F4F8',
      alignItems: 'flex-start',
    }}>
      <Icon size={14} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: found ? NAVY : '#9ca3af', wordBreak: 'break-word' }}>{signal}</div>
        {evidence && (
          <div style={{ fontSize: 11, color: '#6B7A8D', marginTop: 3, fontStyle: 'italic', lineHeight: 1.4, wordBreak: 'break-word' }}>
            "{evidence}"
          </div>
        )}
      </div>
    </div>
  );
}

function MappingRow({ pain, capability, addressed }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: '#FAFBFC', borderRadius: 7,
      border: '1px solid #E8EDF2',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pain</div>
        {addressed
          ? <CheckCircle size={13} color="#16a34a" style={{ flexShrink: 0 }} />
          : <AlertCircle size={13} color="#d97706" style={{ flexShrink: 0 }} />
        }
      </div>
      <div style={{ fontSize: 12, color: NAVY, marginBottom: 8, lineHeight: 1.4, wordBreak: 'break-word' }}>{pain}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Capability</div>
      <div style={{ fontSize: 12, color: '#2563eb', lineHeight: 1.4, wordBreak: 'break-word' }}>{capability}</div>
    </div>
  );
}

function ObjectionCard({ objection, suggestedResponse }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid #E8EDF2', borderRadius: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
          background: open ? '#F5F7FA' : '#fff',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          transition: 'background 120ms',
        }}
      >
        <AlertCircle size={13} color="#d97706" style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: NAVY, minWidth: 0, wordBreak: 'break-word' }}>{objection}</span>
        <ChevronRight size={13} color="#9ca3af" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 120ms', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ padding: '0 12px 12px 33px', background: '#F5F7FA' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Suggested Response</div>
          <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, wordBreak: 'break-word' }}>{suggestedResponse}</div>
        </div>
      )}
    </div>
  );
}

// ── Detail page ───────────────────────────────────────────────────

function DetailPage({ type, analysis, onBack }) {
  const [tab, setTab] = useState('overview');
  const def = FRAMEWORK_DEFS[type];
  const Icon = def.icon;
  const fit = analysis?.overallFit || 'moderate';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Detail header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #E8EDF2',
        background: '#fff',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 7,
            border: '1px solid #E8EDF2', background: '#F5F7FA',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ArrowLeft size={13} color="#6B7A8D" />
        </button>

        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: def.bg, border: `1px solid ${def.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={14} color={def.color} strokeWidth={2.5} />
        </div>

        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: NAVY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {type} — {def.label}
          </div>
          <div style={{ fontSize: 10, color: '#9ca3af' }}>{def.subtitle}</div>
        </div>
      </div>

      {/* Loading state */}
      {analysis === 'loading' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <Spinner size={20} color={ORANGE} trackColor="rgba(0,0,0,0.08)" />
          <span style={{ fontSize: 12, fontWeight: 500, color: '#9ca3af' }}>
            Analyzing call against {type} framework…
          </span>
        </div>
      )}

      {/* Analysis content */}
      {analysis && analysis !== 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

          <div style={{ marginTop: 0 }}>
            <TabBar tabs={ANALYSIS_TABS} active={tab} onSelect={setTab} compact activeColor={ORANGE} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>

            {tab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Fit banner */}
                <div style={{
                  padding: '12px 14px', borderRadius: 8,
                  background: FIT_BG[fit], border: `1px solid ${FIT_BORDER[fit]}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: FIT_COLORS[fit],
                      background: '#fff', border: `1px solid ${FIT_BORDER[fit]}`,
                      padding: '2px 7px', borderRadius: 5,
                    }}>
                      {FIT_LABELS[fit]}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, wordBreak: 'break-word' }}>{analysis.fitReason}</div>
                </div>

                {/* Competitor context */}
                {analysis.competitiveContext && analysis.competitiveContext !== 'No competitors mentioned' && (
                  <div style={{
                    padding: '12px 14px', borderRadius: 8,
                    background: '#fff7ed', border: '1px solid #fed7aa',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Competitor Context
                    </div>
                    <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5, wordBreak: 'break-word' }}>{analysis.competitiveContext}</div>
                  </div>
                )}

                {/* Signals summary */}
                {analysis.qualificationSignals && (
                  <div style={{
                    padding: '12px 14px', borderRadius: 8,
                    background: '#FAFBFC', border: '1px solid #E8EDF2',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      Qualification Signals — {analysis.qualificationSignals.filter(s => s.found).length} / {analysis.qualificationSignals.length} present
                    </div>
                    {analysis.qualificationSignals.map((s, i) => {
                      const color = s.found ? '#16a34a' : '#c4cdd6';
                      const SIcon = s.found ? CheckCircle : XCircle;
                      return (
                        <div key={i} style={{
                          display: 'flex', gap: 8, padding: '6px 0',
                          borderBottom: i < analysis.qualificationSignals.length - 1 ? '1px solid #F0F4F8' : 'none',
                          alignItems: 'flex-start',
                        }}>
                          <SIcon size={13} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
                          <div style={{ fontSize: 12, fontWeight: 600, color: s.found ? NAVY : '#9ca3af', wordBreak: 'break-word' }}>{s.signal}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Discovery gaps */}
                {analysis.discoveryGaps && analysis.discoveryGaps.length > 0 && (
                  <div style={{
                    padding: '12px 14px', borderRadius: 8,
                    background: '#FAFBFC', border: '1px solid #E8EDF2',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      Discovery Gaps
                    </div>
                    {analysis.discoveryGaps.map((g, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: 8, padding: '6px 0',
                        borderBottom: i < analysis.discoveryGaps.length - 1 ? '1px solid #F0F4F8' : 'none',
                        alignItems: 'flex-start',
                      }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#d97706', marginTop: 6, flexShrink: 0 }} />
                        <div style={{ fontSize: 12, color: '#374151', wordBreak: 'break-word' }}>{g}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'signals' && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  {analysis.qualificationSignals.filter(s => s.found).length} of {analysis.qualificationSignals.length} signals present
                </div>
                {analysis.qualificationSignals.map((s, i) => (
                  <SignalRow key={i} signal={s.signal} found={s.found} evidence={s.evidence} />
                ))}
                {analysis.discoveryGaps.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      Discovery Gaps
                    </div>
                    {analysis.discoveryGaps.map((g, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: 8, padding: '7px 0',
                        borderBottom: i < analysis.discoveryGaps.length - 1 ? '1px solid #F0F4F8' : 'none',
                        alignItems: 'flex-start',
                      }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#d97706', marginTop: 5, flexShrink: 0 }} />
                        <div style={{ fontSize: 12, color: '#374151' }}>{g}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'mapping' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {analysis.requirementMapping.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '24px 0' }}>No requirements mapped from this call</div>
                ) : (
                  analysis.requirementMapping.map((r, i) => (
                    <MappingRow key={i} pain={r.pain} capability={r.capability} addressed={r.addressed} />
                  ))
                )}
              </div>
            )}

            {tab === 'objections' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {analysis.objections.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '24px 0' }}>No objections identified</div>
                ) : (
                  analysis.objections.map((o, i) => (
                    <ObjectionCard key={i} objection={o.objection} suggestedResponse={o.suggestedResponse} />
                  ))
                )}
              </div>
            )}

            {tab === 'roi' && (
              <div>
                {analysis.roiAngles.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 10, padding: '9px 0',
                    borderBottom: i < analysis.roiAngles.length - 1 ? '1px solid #F0F4F8' : 'none',
                    alignItems: 'flex-start',
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 5,
                      background: 'rgba(229,80,20,0.10)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: ORANGE, flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{r}</div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'demo' && (
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.7 }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {analysis.demoFocus || 'No demo recommendations available.'}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Card list page ────────────────────────────────────────────────

function CardListPage({ recommendation, isLoadingRec, onSelectType, onReanalyze }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Loading recommendation */}
      {isLoadingRec && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', borderRadius: 8,
          background: '#F5F7FA', border: '1px solid #E8EDF2',
        }}>
          <Spinner size={14} color={ORANGE} trackColor="rgba(0,0,0,0.08)" />
          <span style={{ fontSize: 12, fontWeight: 500, color: '#6B7A8D' }}>
            Identifying best-fit framework…
          </span>
        </div>
      )}

      {/* Recommendation banner */}
      {recommendation && (
        <div style={{
          padding: '11px 14px', borderRadius: 8,
          background: 'rgba(229,80,20,0.06)',
          border: '1px solid rgba(229,80,20,0.22)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: ORANGE, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Recommended
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: CONFIDENCE_COLORS[recommendation.confidence],
              background: '#fff',
              border: `1px solid ${CONFIDENCE_COLORS[recommendation.confidence]}`,
              padding: '1px 6px', borderRadius: 4,
            }}>
              {recommendation.confidence} confidence
            </span>
            <button
              onClick={onReanalyze}
              style={{
                marginLeft: 'auto',
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 5,
                border: '1px solid rgba(229,80,20,0.25)', background: 'rgba(229,80,20,0.06)',
                fontSize: 10, fontWeight: 600, color: ORANGE,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={9} /> Re-run
            </button>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 3 }}>
            {FRAMEWORK_DEFS[recommendation.type]?.label} ({recommendation.type})
          </div>
          <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, wordBreak: 'break-word' }}>{recommendation.reason}</div>
          {recommendation.alternativeType && (
            <div style={{ marginTop: 5, fontSize: 11, color: '#6B7A8D', wordBreak: 'break-word' }}>
              <span style={{ fontWeight: 600 }}>Also consider:</span> {recommendation.alternativeType} — {recommendation.alternativeReason}
            </div>
          )}
        </div>
      )}

      {/* Framework cards — vertical */}
      {Object.entries(FRAMEWORK_DEFS).map(([key, def]) => {
        const isRecommended = recommendation?.type === key;
        const Icon = def.icon;
        return (
          <button
            key={key}
            onClick={() => onSelectType(key)}
            style={{
              width: '100%', textAlign: 'left',
              padding: '14px 16px',
              borderRadius: 10,
              border: isRecommended ? `2px solid ${ORANGE}` : '2px solid #E8EDF2',
              background: isRecommended ? 'rgba(229,80,20,0.03)' : '#fff',
              cursor: 'pointer',
              transition: 'border-color 140ms, background 140ms',
              display: 'flex', alignItems: 'center', gap: 14,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = isRecommended ? ORANGE : '#C8D2DE'; e.currentTarget.style.background = isRecommended ? 'rgba(229,80,20,0.05)' : '#FAFBFD'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = isRecommended ? ORANGE : '#E8EDF2'; e.currentTarget.style.background = isRecommended ? 'rgba(229,80,20,0.03)' : '#fff'; }}
          >
            {/* Icon */}
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: def.bg, border: `1px solid ${def.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={18} color={def.color} strokeWidth={2.5} />
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: NAVY }}>{def.label}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af' }}>({key})</span>
                {isRecommended && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, color: ORANGE,
                    background: 'rgba(229,80,20,0.10)',
                    padding: '1px 6px', borderRadius: 4,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}>
                    Recommended
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: def.color, marginBottom: 4 }}>{def.subtitle}</div>
              <div style={{ fontSize: 11, color: '#6B7A8D', lineHeight: 1.5, wordBreak: 'break-word' }}>{def.desc}</div>
            </div>

            <ChevronRight size={15} color="#C8D2DE" style={{ flexShrink: 0 }} />
          </button>
        );
      })}
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────

export function SolutionFrameworkScreen() {
  const transcript                 = useStore(s => s.transcript);
  const settings                   = useStore(s => s.settings);
  const meetingId                  = useStore(s => s.meetingId);
  const solutionFramework          = useStore(s => s.solutionFramework);
  const solutionFrameworkAnalyses  = useStore(s => s.solutionFrameworkAnalyses);
  const setSolutionFramework       = useStore(s => s.setSolutionFramework);
  const setSolutionFrameworkAnalysis = useStore(s => s.setSolutionFrameworkAnalysis);

  const [detailType, setDetailType] = useState(null);
  const [dlOpen, setDlOpen] = useState(false);
  const dlRef = useRef(null);

  const apiKey = settings?.claudeApiKey;

  useClickOutside(dlRef, dlOpen ? () => setDlOpen(false) : null);

  const isLoadingRec = solutionFramework === 'loading';
  const recommendation = solutionFramework && solutionFramework !== 'loading' ? solutionFramework : null;

  // Auto-run recommendation on first open
  useEffect(() => {
    if (transcript && !solutionFramework) {
      runRecommendation();
    }
  }, []);

  // When entering a detail view, auto-run analysis if not yet done
  useEffect(() => {
    if (detailType && transcript && solutionFrameworkAnalyses[detailType] === null) {
      runAnalysis(detailType);
    }
  }, [detailType]);

  async function runRecommendation() {
    setSolutionFramework('loading');
    try {
      const result = await getSolutionFrameworkRecommendation(transcript, apiKey);
      setSolutionFramework(result);
    } catch {
      setSolutionFramework(null);
    }
  }

  async function runAnalysis(type) {
    setSolutionFrameworkAnalysis(type, 'loading');
    try {
      const result = await analyzeSolutionFramework(transcript, type, apiKey);
      setSolutionFrameworkAnalysis(type, result);
    } catch {
      setSolutionFrameworkAnalysis(type, null);
    }
  }

  function handleReanalyze() {
    setSolutionFramework(null);
    setTimeout(() => runRecommendation(), 50);
  }

  const currentAnalysis = detailType ? solutionFrameworkAnalyses[detailType] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontFamily: 'Figtree, sans-serif' }}>

      {/* Header */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '1px solid #E8EDF2',
        background: '#fff',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Compass size={15} color={ORANGE} strokeWidth={2.5} />
        <span style={{ fontSize: 12, fontWeight: 800, color: NAVY, letterSpacing: '0.07em', textTransform: 'uppercase', flex: 1 }}>
          Solution Framework
        </span>
        <div style={{ position: 'relative' }} ref={dlRef}>
          <button
            type="button"
            onClick={() => setDlOpen(v => !v)}
            disabled={!recommendation && Object.values(solutionFrameworkAnalyses).every(v => !v || v === 'loading')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 6,
              borderRadius: 6, display: 'flex', color: '#8A97A8',
              opacity: (!recommendation && Object.values(solutionFrameworkAnalyses).every(v => !v || v === 'loading')) ? 0.4 : 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = ORANGE; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#8A97A8'; }}
          >
            <Download size={14} strokeWidth={2} />
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
                { fmt: 'md',   label: 'Markdown',          ext: '.md'   },
                { fmt: 'json', label: 'JSON',               ext: '.json' },
                { fmt: 'doc',  label: 'Word / Google Docs', ext: '.doc'  },
                { fmt: 'txt',  label: 'Plain Text',         ext: '.txt'  },
              ].map(({ fmt, label, ext }) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => {
                    downloadSolutionFramework(recommendation, solutionFrameworkAnalyses, meetingId, fmt);
                    setDlOpen(false);
                  }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
                    borderTop: '1px solid #F5F7FA', fontSize: 12, fontFamily: 'var(--font-sans)',
                    fontWeight: 600, color: NAVY, textAlign: 'left', gap: 16,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F5F7FA'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                >
                  <span>{label}</span>
                  <span style={{ fontSize: 10, color: '#8A97A8', fontWeight: 500 }}>{ext}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Page content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {detailType ? (
          <DetailPage
            type={detailType}
            analysis={currentAnalysis}
            onBack={() => setDetailType(null)}
          />
        ) : (
          <CardListPage
            recommendation={recommendation}
            isLoadingRec={isLoadingRec}
            onSelectType={setDetailType}
            onReanalyze={handleReanalyze}
          />
        )}
      </div>
    </div>
  );
}
