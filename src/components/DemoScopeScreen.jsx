import { useState } from 'react';
import { Target, RefreshCw, ExternalLink, Copy, Check, AlertTriangle, CheckCircle2, Copy as CopyIcon, GitBranch, Building2, Layers, Zap, Monitor, Smartphone, AppWindow } from 'lucide-react';
import { analyzeDemoScope } from '../services/claudeService';
import { ORANGE, NAVY } from '../constants';
import { Spinner } from './ui/Spinner';
import { useStore } from '../store';

const STAGE_LABELS = {
  discovery:  { label: 'Discovery',  color: '#8A97A8', bg: '#F5F7FA' },
  demo_prep:  { label: 'Demo Prep',  color: '#0369a1', bg: '#e0f2fe' },
  poc:        { label: 'POC',        color: '#15803d', bg: '#dcfce7' },
  advanced:   { label: 'Advanced',   color: ORANGE,    bg: '#FFF4EF' },
};

const PLATFORM_META = {
  web:     { label: 'Web',     Icon: Monitor,    color: '#0369a1', bg: '#e0f2fe' },
  desktop: { label: 'Desktop', Icon: AppWindow,  color: '#7c3aed', bg: '#ede9fe' },
  mobile:  { label: 'Mobile',  Icon: Smartphone, color: '#0891b2', bg: '#e0f9ff' },
  mixed:   { label: 'Multi-platform', Icon: Layers, color: '#b45309', bg: '#fffbeb' },
  unknown: { label: 'Platform TBD', Icon: Target, color: '#8A97A8', bg: '#F5F7FA' },
};

function Badge({ label, color, bg }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 9px', borderRadius: 99,
      fontSize: 10, fontWeight: 800,
      textTransform: 'uppercase', letterSpacing: '0.07em',
      color, background: bg,
    }}>
      {label}
    </span>
  );
}

function EnvCard({ rec, primary }) {
  const env = rec.env;
  const statusColor = env?.status === 'Up' ? '#16a34a' : env?.status === 'Down' ? '#dc2626' : '#A8B4C0';
  const statusLabel = env?.status || 'Unknown';

  return (
    <div style={{
      background: '#fff',
      border: `1.5px solid ${primary ? ORANGE : '#E4E9F0'}`,
      borderRadius: 10,
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 10,
      boxShadow: primary ? '0 2px 12px rgba(229,80,20,0.10)' : 'none',
      animation: 'itemEnter 220ms cubic-bezier(0.22,1,0.36,1) both',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            {primary && (
              <span style={{ fontSize: 9, fontWeight: 800, color: ORANGE, textTransform: 'uppercase', letterSpacing: '0.08em', background: '#FFF4EF', padding: '2px 7px', borderRadius: 99 }}>
                Primary
              </span>
            )}
            <span style={{ fontSize: 9, fontWeight: 700, color: '#A8B4C0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {env?.domain || '—'}
            </span>
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: NAVY, lineHeight: 1.3 }}>
            {env?.name || rec.envName}
          </div>
          <div style={{ fontSize: 10.5, color: '#8A97A8', marginTop: 2 }}>
            {env?.application}
          </div>
        </div>
        {/* Type + status */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#4B5A6D', background: '#F5F7FA', border: '1px solid #E4E9F0', borderRadius: 5, padding: '2px 7px' }}>
            {env?.type || '—'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: statusColor }}>{statusLabel}</span>
          </div>
        </div>
      </div>

      {/* Reason */}
      <div style={{ fontSize: 11.5, color: '#4B5A6D', lineHeight: 1.6, background: '#F5F7FA', borderRadius: 7, padding: '8px 10px' }}>
        {rec.reason}
      </div>

      {/* Clone warning */}
      {rec.cloneNeeded && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, padding: '8px 10px' }}>
          <GitBranch size={12} style={{ color: '#b45309', flexShrink: 0, marginTop: 1 }} strokeWidth={2} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Clone Needed</div>
            <div style={{ fontSize: 11, color: '#92400e', lineHeight: 1.5 }}>{rec.cloneReason}</div>
          </div>
        </div>
      )}

      {/* Footer: contact + link */}
      {env && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 10, color: '#A8B4C0' }}>
            {env.sc && <span>SC: <strong style={{ color: '#4B5A6D' }}>{env.sc}</strong></span>}
            {env.sc && env.se && <span style={{ margin: '0 6px', color: '#E4E9F0' }}>·</span>}
            {env.se && <span>SE: <strong style={{ color: '#4B5A6D' }}>{env.se}</strong></span>}
          </div>
          {env.url && (
            <a href={env.url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: ORANGE, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.06em' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Open <ExternalLink size={9} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function DemoScopeScreen() {
  const transcript = useStore(s => s.transcript);
  const settings   = useStore(s => s.settings);
  const demoScope  = useStore(s => s.demoScope);
  const setDemoScope = useStore(s => s.setDemoScope);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [copied,  setCopied]  = useState(false);

  const scope = demoScope;
  const hasContent = scope && scope !== 'loading';
  const isLoading  = loading || scope === 'loading';

  async function handleAnalyze() {
    if (!transcript) return;
    setLoading(true);
    setError(null);
    setDemoScope('loading');
    try {
      const result = await analyzeDemoScope(transcript, settings?.claudeApiKey);
      setDemoScope(result);
    } catch (err) {
      setError(err.message);
      setDemoScope(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!hasContent) return;
    const primary = scope.recommendations.find(r => r.priority === 'primary');
    const alts    = scope.recommendations.filter(r => r.priority !== 'primary');
    const text = [
      `DEMO SCOPE RECOMMENDATION`,
      `Call Stage: ${scope.callStage}`,
      ``,
      `PROSPECT`,
      `Industry: ${scope.prospect.industry || '—'}`,
      scope.prospect.company ? `Company: ${scope.prospect.company}` : null,
      `Adoption Focus: ${scope.prospect.adoptionFocus || '—'}`,
      scope.prospect.currentSoftware?.length ? `Current Software: ${scope.prospect.currentSoftware.join(', ')}` : null,
      ``,
      `POC SCOPE`,
      `Defined: ${scope.pocScope.defined ? 'Yes' : 'No'} | App Access Discussed: ${scope.pocScope.appAccessDiscussed ? 'Yes' : 'No'}`,
      scope.pocScope.note,
      ``,
      primary ? `PRIMARY RECOMMENDATION: ${primary.env?.name || primary.envName}` : null,
      primary?.reason,
      primary?.cloneNeeded ? `⚠ Clone needed: ${primary.cloneReason}` : null,
      alts.length ? `\nALTERNATIVES` : null,
      ...alts.map(r => `- ${r.env?.name || r.envName}: ${r.reason}`),
      ``,
      `SUMMARY`,
      scope.summary,
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  const primary  = hasContent ? scope.recommendations.find(r => r.priority === 'primary') : null;
  const alts     = hasContent ? scope.recommendations.filter(r => r.priority !== 'primary') : [];
  const stage    = hasContent ? (STAGE_LABELS[scope.callStage] || STAGE_LABELS.discovery) : null;
  const platform = hasContent ? (PLATFORM_META[scope.clientPlatform] || PLATFORM_META.unknown) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100vh', overflow: 'hidden', background: '#F5F7FA' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 12px',
        background: '#fff', borderBottom: '1px solid #E4E9F0', flexShrink: 0,
      }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Demo Scope
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
              {copied ? <Check size={11} strokeWidth={2.5} /> : <CopyIcon size={11} strokeWidth={2} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
          <button type="button" onClick={handleAnalyze} disabled={!transcript || isLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', height: 30, borderRadius: 7,
              background: !transcript || isLoading ? '#C8D2DE' : ORANGE,
              border: 'none', cursor: !transcript || isLoading ? 'not-allowed' : 'pointer',
              fontSize: 11, fontWeight: 800, color: '#fff',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              transition: 'background 130ms', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (transcript && !isLoading) e.currentTarget.style.background = '#CC4712'; }}
            onMouseLeave={e => { if (transcript && !isLoading) e.currentTarget.style.background = ORANGE; }}
          >
            {isLoading
              ? <Spinner size={11} color="#fff" trackColor="rgba(255,255,255,0.3)" />
              : <RefreshCw size={11} strokeWidth={2.5} />
            }
            {isLoading ? 'Analyzing...' : hasContent ? 'Re-analyze' : 'Analyze'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fef2f2', color: '#dc2626', fontSize: 11.5, padding: '10px 14px', borderRadius: 8, border: '1px solid #fecaca' }}>
            <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} strokeWidth={2} />
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff', border: '1px solid #E4E9F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={20} style={{ color: ORANGE }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>
                Scoping Demo
              </div>
              <div style={{ fontSize: 11.5, color: '#8A97A8', lineHeight: 1.6 }}>
                Claude is matching the call to your demo environment library...
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !hasContent && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: '#fff', border: '1px solid #E4E9F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={24} style={{ color: '#C8D2DE' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                No Scope Yet
              </div>
              <div style={{ fontSize: 12, color: '#8A97A8', lineHeight: 1.65, maxWidth: 240, margin: '0 auto 18px' }}>
                {transcript
                  ? 'Analyze the call to get demo environment recommendations and POC scope guidance.'
                  : 'Sync a Mindtickle call first to scope the demo.'}
              </div>
              {transcript && (
                <button type="button" onClick={handleAnalyze}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto',
                    padding: '0 18px', height: 40, borderRadius: 8, border: 'none',
                    background: ORANGE, color: '#fff',
                    fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                    cursor: 'pointer',
                  }}>
                  <Target size={13} /> Analyze Scope
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {!isLoading && hasContent && (
          <>
            {/* Prospect + stage strip */}
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, animation: 'itemEnter 200ms cubic-bezier(0.22,1,0.36,1) both' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={12} style={{ color: ORANGE }} strokeWidth={2} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Prospect Profile
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {platform && (() => {
                    const { Icon } = platform;
                    return (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 99, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: platform.color, background: platform.bg }}>
                        <Icon size={9} strokeWidth={2.5} />{platform.label}
                      </span>
                    );
                  })()}
                  {stage && <Badge label={stage.label} color={stage.color} bg={stage.bg} />}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {[
                  { label: 'Industry',   value: scope.prospect.industry },
                  { label: 'Company',    value: scope.prospect.company },
                  { label: 'Focus',      value: scope.prospect.adoptionFocus },
                  { label: 'Software',   value: scope.prospect.currentSoftware?.join(', ') },
                  { label: 'Use Cases',  value: scope.prospect.useCases?.join(' · ') },
                ].filter(r => r.value).map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#A8B4C0', textTransform: 'uppercase', letterSpacing: '0.06em', width: 60, flexShrink: 0, paddingTop: 1 }}>{label}</span>
                    <span style={{ fontSize: 11.5, color: '#4B5A6D', lineHeight: 1.5 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* POC Scope card */}
            <div style={{
              background: scope.pocScope.defined ? '#f0fdf4' : '#fff',
              border: `1px solid ${scope.pocScope.defined ? '#dcfce7' : '#E4E9F0'}`,
              borderRadius: 10, padding: '12px 14px',
              display: 'flex', gap: 10, alignItems: 'flex-start',
              animation: 'itemEnter 220ms cubic-bezier(0.22,1,0.36,1) both',
              animationDelay: '40ms',
            }}>
              {scope.pocScope.defined
                ? <CheckCircle2 size={14} style={{ color: '#16a34a', flexShrink: 0, marginTop: 1 }} strokeWidth={2.5} />
                : <Layers size={14} style={{ color: '#A8B4C0', flexShrink: 0, marginTop: 1 }} strokeWidth={2} />
              }
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: scope.pocScope.defined ? '#15803d' : NAVY, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    POC Scope {scope.pocScope.defined ? '— Defined' : '— Not Yet Defined'}
                  </span>
                  {scope.pocScope.appAccessDiscussed && (
                    <Badge label="App Access Confirmed" color="#15803d" bg="#dcfce7" />
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: '#4B5A6D', lineHeight: 1.55 }}>{scope.pocScope.note}</div>
              </div>
            </div>

            {/* Primary recommendation */}
            {primary && (
              <div style={{ animation: 'itemEnter 240ms cubic-bezier(0.22,1,0.36,1) both', animationDelay: '80ms' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#A8B4C0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Recommended Environment
                </div>
                <EnvCard rec={primary} primary />
              </div>
            )}

            {/* Alternatives */}
            {alts.length > 0 && (
              <div style={{ animation: 'itemEnter 260ms cubic-bezier(0.22,1,0.36,1) both', animationDelay: '120ms' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#A8B4C0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Alternatives
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {alts.map((rec, i) => <EnvCard key={i} rec={rec} primary={false} />)}
                </div>
              </div>
            )}

            {/* Summary */}
            {scope.summary && (
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E9F0', padding: '12px 14px', animation: 'itemEnter 280ms cubic-bezier(0.22,1,0.36,1) both', animationDelay: '160ms' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Zap size={11} style={{ color: ORANGE }} strokeWidth={2.5} />
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#8A97A8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Recommendation Summary
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#4B5A6D', lineHeight: 1.7 }}>{scope.summary}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
