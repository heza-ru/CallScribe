import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { RefreshCw, Compass, Users, Zap, Shield, ChevronRight, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { getSolutionFrameworkRecommendation, analyzeSolutionFramework } from '../services/claudeService';

const ORANGE = '#E55014';
const NAVY   = '#0D1726';

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
  { key: 'signals',    label: 'Signals'     },
  { key: 'mapping',    label: 'Mapping'     },
  { key: 'objections', label: 'Objections'  },
  { key: 'roi',        label: 'ROI'         },
  { key: 'demo',       label: 'Demo Focus'  },
];

// ── Sub-components ────────────────────────────────────────────────

function TabBar({ tabs, active, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #E8EDF2', paddingLeft: 16, flexShrink: 0 }}>
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onSelect(t.key)}
          style={{
            padding: '8px 12px',
            fontSize: 11, fontWeight: 600,
            border: 'none', background: 'none', cursor: 'pointer',
            color: active === t.key ? ORANGE : '#6B7A8D',
            borderBottom: active === t.key ? `2px solid ${ORANGE}` : '2px solid transparent',
            marginBottom: -1,
            transition: 'color 120ms',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

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
        <div style={{ fontSize: 12, fontWeight: 600, color: found ? NAVY : '#9ca3af' }}>{signal}</div>
        {evidence && (
          <div style={{ fontSize: 11, color: '#6B7A8D', marginTop: 3, fontStyle: 'italic', lineHeight: 1.4 }}>
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
      <div style={{ fontSize: 12, color: NAVY, marginBottom: 8, lineHeight: 1.4 }}>{pain}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Capability</div>
      <div style={{ fontSize: 12, color: '#2563eb', lineHeight: 1.4 }}>{capability}</div>
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
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: NAVY }}>{objection}</span>
        <ChevronRight size={13} color="#9ca3af" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 120ms', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ padding: '0 12px 12px 33px', background: '#F5F7FA' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Suggested Response</div>
          <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{suggestedResponse}</div>
        </div>
      )}
    </div>
  );
}

// ── Detail page ───────────────────────────────────────────────────

function DetailPage({ type, analysis, onBack }) {
  const [tab, setTab] = useState('signals');
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

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: NAVY }}>
            {type} — {def.label}
          </div>
          <div style={{ fontSize: 10, color: '#9ca3af' }}>{def.subtitle}</div>
        </div>
      </div>

      {/* Loading state */}
      {analysis === 'loading' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <span style={{
            width: 20, height: 20,
            border: '2.5px solid rgba(0,0,0,0.08)',
            borderTopColor: ORANGE,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            display: 'inline-block',
          }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: '#9ca3af' }}>
            Analyzing call against {type} framework…
          </span>
        </div>
      )}

      {/* Analysis content */}
      {analysis && analysis !== 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

          {/* Fit + competitive banners */}
          <div style={{ padding: '12px 16px 0', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              padding: '10px 12px', borderRadius: 8,
              background: FIT_BG[fit], border: `1px solid ${FIT_BORDER[fit]}`,
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: FIT_COLORS[fit],
                background: '#fff', border: `1px solid ${FIT_BORDER[fit]}`,
                padding: '2px 7px', borderRadius: 5, flexShrink: 0, marginTop: 1,
              }}>
                {FIT_LABELS[fit]}
              </div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{analysis.fitReason}</div>
            </div>

            {analysis.competitiveContext && analysis.competitiveContext !== 'No competitors mentioned' && (
              <div style={{
                padding: '8px 12px', borderRadius: 6,
                background: '#fff7ed', border: '1px solid #fed7aa',
                fontSize: 12, color: '#92400e',
              }}>
                <span style={{ fontWeight: 700 }}>Competitive: </span>{analysis.competitiveContext}
              </div>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <TabBar tabs={ANALYSIS_TABS} active={tab} onSelect={setTab} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>

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
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h3: ({ children }) => (
                      <h3 style={{ fontSize: 11.5, fontWeight: 700, color: NAVY, margin: '14px 0 5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.7, margin: '0 0 10px' }}>
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul style={{ margin: '0 0 10px', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol style={{ margin: '0 0 10px', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                        {children}
                      </li>
                    ),
                    strong: ({ children }) => (
                      <strong style={{ fontWeight: 700, color: NAVY }}>{children}</strong>
                    ),
                  }}
                >
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
          <span style={{
            width: 14, height: 14,
            border: '2px solid rgba(0,0,0,0.08)',
            borderTopColor: ORANGE,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            display: 'inline-block', flexShrink: 0,
          }} />
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
          <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{recommendation.reason}</div>
          {recommendation.alternativeType && (
            <div style={{ marginTop: 5, fontSize: 11, color: '#6B7A8D' }}>
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
              <div style={{ fontSize: 11, color: '#6B7A8D', lineHeight: 1.5 }}>{def.desc}</div>
            </div>

            <ChevronRight size={15} color="#C8D2DE" style={{ flexShrink: 0 }} />
          </button>
        );
      })}
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────

export function SolutionFrameworkScreen({ state, dispatch }) {
  const [detailType, setDetailType] = useState(null);

  const { transcript, solutionFramework, solutionFrameworkAnalyses, settings } = state;
  const apiKey = settings?.claudeApiKey;

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
    dispatch({ type: 'SOLUTION_FRAMEWORK_LOADING' });
    try {
      const result = await getSolutionFrameworkRecommendation(transcript, apiKey);
      dispatch({ type: 'SOLUTION_FRAMEWORK_LOADED', data: result });
    } catch {
      dispatch({ type: 'SOLUTION_FRAMEWORK_FAILED' });
    }
  }

  async function runAnalysis(type) {
    dispatch({ type: 'SOLUTION_FRAMEWORK_ANALYSIS_LOADING', frameworkType: type });
    try {
      const result = await analyzeSolutionFramework(transcript, type, apiKey);
      dispatch({ type: 'SOLUTION_FRAMEWORK_ANALYSIS_LOADED', frameworkType: type, data: result });
    } catch {
      dispatch({ type: 'SOLUTION_FRAMEWORK_ANALYSIS_FAILED', frameworkType: type });
    }
  }

  function handleReanalyze() {
    dispatch({ type: 'SOLUTION_FRAMEWORK_FAILED' });
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
        <span style={{ fontSize: 12, fontWeight: 800, color: NAVY, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          Solution Framework
        </span>
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
