import { useState } from 'react';
import { Home, FileText, Lightbulb, BarChart2, Settings, Mic } from 'lucide-react';
import { SCREENS } from '../constants';

const ORANGE = '#E55014';
const NAVY   = '#0D1726';

function getActiveNav(screen) {
  const map = {
    [SCREENS.DETECTION]:          'home',
    [SCREENS.TRANSCRIPT_ACTIONS]: 'transcript',
    [SCREENS.ANALYSIS]:           'insights',
    [SCREENS.TICKET_REVIEW]:      'insights',
    [SCREENS.INTELLIGENCE]:       'intelligence',
    [SCREENS.SETTINGS]:           'settings',
  };
  return map[screen] || 'home';
}

function NavItem({ icon: Icon, label, active, enabled, loading, onClick }) {
  const [hovered, setHovered] = useState(false);

  const iconColor = active ? ORANGE : hovered && enabled ? '#fff' : '#5C7A9A';
  const opacity   = !enabled && !active ? 0.3 : 1;

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        disabled={!enabled && !active}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 40, height: 40,
          borderRadius: 10,
          border: 'none',
          cursor: enabled || active ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: active ? 'rgba(229,80,20,0.14)' : hovered && enabled ? 'rgba(255,255,255,0.07)' : 'transparent',
          color: iconColor,
          opacity,
          transition: 'background 140ms, color 140ms, opacity 140ms',
          flexShrink: 0,
          padding: 0,
        }}
      >
        {loading ? (
          <span style={{
            width: 14, height: 14,
            border: '1.5px solid rgba(255,255,255,0.15)',
            borderTopColor: ORANGE,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            display: 'inline-block',
          }} />
        ) : (
          <Icon size={17} strokeWidth={active ? 2.5 : 2} />
        )}
      </button>

      {/* Tooltip — always shows on hover */}
      {hovered && (enabled || active) && (
        <div style={{
          position: 'absolute', right: 'calc(100% + 10px)', top: '50%',
          transform: 'translateY(-50%)', zIndex: 100,
          background: NAVY, color: '#fff',
          fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
          padding: '5px 9px', borderRadius: 7,
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.10)',
          animation: 'fadeIn 120ms ease both',
        }}>
          {label}
          {/* Arrow pointing right */}
          <div style={{
            position: 'absolute', left: '100%', top: '50%',
            transform: 'translateY(-50%)',
            borderWidth: '4px 0 4px 5px',
            borderStyle: 'solid',
            borderColor: `transparent transparent transparent ${NAVY}`,
          }} />
        </div>
      )}
    </div>
  );
}

export function AppShell({ state, dispatch, children }) {
  const activeNav          = getActiveNav(state.screen);
  const hasTranscript      = !!state.transcript;
  const hasInsights        = (state.insights || []).length > 0;
  const hasIntelligence    = state.callIntelligence !== null;
  const loadingIntelligence = state.callIntelligence === 'loading';

  const topItems = [
    {
      id:      'home',
      icon:    Home,
      label:   'CallScribe',
      screen:  SCREENS.DETECTION,
      enabled: true,
    },
    {
      id:      'transcript',
      icon:    FileText,
      label:   'Transcript',
      screen:  SCREENS.TRANSCRIPT_ACTIONS,
      enabled: hasTranscript,
    },
    {
      id:      'insights',
      icon:    Lightbulb,
      label:   'Product Gaps',
      screen:  SCREENS.ANALYSIS,
      enabled: hasInsights,
    },
    {
      id:      'intelligence',
      icon:    BarChart2,
      label:   'Call Insights',
      screen:  SCREENS.INTELLIGENCE,
      enabled: hasTranscript,
      loading: loadingIntelligence,
    },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── Main content ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </div>

      {/* ── Right sidebar ── */}
      <div style={{
        width: 52, flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: NAVY,
        paddingTop: 10, paddingBottom: 10,
      }}>

        {/* Brand mark */}
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: ORANGE,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 8, flexShrink: 0,
        }}>
          <Mic size={15} color="#fff" strokeWidth={2.5} />
        </div>

        {/* Divider */}
        <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 8 }} />

        {/* Nav items — vertically centered */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4,
        }}>
          {topItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeNav === item.id}
              enabled={item.enabled}
              loading={item.loading}
              onClick={() => dispatch({ type: 'SET_SCREEN', screen: item.screen })}
            />
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 8 }} />

        {/* Settings at bottom */}
        <NavItem
          icon={Settings}
          label="Settings"
          active={activeNav === 'settings'}
          enabled={true}
          onClick={() => dispatch({ type: 'SET_SCREEN', screen: SCREENS.SETTINGS })}
        />
      </div>
    </div>
  );
}
