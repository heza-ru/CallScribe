import { ORANGE, NAVY } from '../../constants';

export function TabBar({
  tabs, active, onSelect,
  scrollable = false, size = 'lg',
  compact = false, activeColor = NAVY,
  activeRef, children,
}) {
  const isSmall = size === 'sm';
  return (
    <div style={{
      display: 'flex', flexShrink: 0,
      background: '#fff', borderBottom: '1px solid #E4E9F0',
      padding: compact ? `0 0 0 16px` : `0 ${isSmall ? 8 : 16}px`,
      overflowX: scrollable ? 'auto' : undefined,
    }}>
      {tabs.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key} type="button"
            ref={activeRef && isActive ? activeRef : undefined}
            onClick={() => onSelect(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: Icon ? 6 : undefined,
              padding: compact ? '8px 12px' : isSmall ? '10px 8px 9px' : '10px 14px 9px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: isSmall ? 10 : 11, whiteSpace: 'nowrap', flexShrink: 0,
              fontWeight: compact ? 600 : isActive ? 800 : 600,
              color: isActive ? activeColor : '#8A97A8',
              textTransform: compact ? undefined : 'uppercase',
              letterSpacing: compact ? undefined : isSmall ? '0.06em' : '0.08em',
              borderBottom: isActive ? `2px solid ${ORANGE}` : '2px solid transparent',
              transition: 'color 120ms, border-color 120ms',
              marginBottom: -1,
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = compact ? NAVY : NAVY; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#8A97A8'; }}
          >
            {Icon && <Icon size={11} strokeWidth={2} />}
            {label}
          </button>
        );
      })}
      {children}
    </div>
  );
}
