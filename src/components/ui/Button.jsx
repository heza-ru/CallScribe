import React from 'react';

const ORANGE = '#E55014';

const variants = {
  primary:   { bg: '#0D1726', hover: '#1A2B42', active: '#243450', color: '#fff', border: 'none' },
  secondary: { bg: '#ffffff', hover: '#F5F7FA', active: '#ECF0F5', color: '#0D1726', border: '1.5px solid #E4E9F0' },
  ghost:     { bg: 'transparent', hover: '#F5F7FA', active: '#ECF0F5', color: '#4B5A6D', border: 'none' },
  danger:    { bg: '#dc2626', hover: '#b91c1c', active: '#991b1b', color: '#fff', border: 'none' },
  accent:    { bg: ORANGE,   hover: '#CC4712',  active: '#B33E10',  color: '#fff', border: 'none' },
};

const sizes = {
  xs: { padding: '4px 10px', fontSize: '10px', height: '26px', gap: '4px', iconSize: 11 },
  sm: { padding: '6px 12px', fontSize: '11px', height: '30px', gap: '5px', iconSize: 12 },
  md: { padding: '8px 16px', fontSize: '12px', height: '40px', gap: '6px', iconSize: 13 },
  lg: { padding: '10px 20px', fontSize: '13px', height: '42px', gap: '7px', iconSize: 14 },
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  onClick,
  style = {},
  className = '',
  type = 'button',
  fullWidth = false,
}) {
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;
  const inactive = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={inactive}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        cursor: inactive ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        borderRadius: '8px',
        fontFamily: 'var(--font-sans)',
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        border: v.border || 'none',
        background: v.bg,
        color: v.color,
        width: fullWidth ? '100%' : undefined,
        flexShrink: 0,
        transition: 'background 140ms ease, transform 100ms ease, opacity 140ms ease',
        ...s,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!inactive) {
          e.currentTarget.style.background = v.hover;
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 10px rgba(13,23,38,0.10)';
        }
      }}
      onMouseLeave={(e) => {
        if (!inactive) {
          e.currentTarget.style.background = v.bg;
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
      onMouseDown={(e) => {
        if (!inactive) {
          e.currentTarget.style.background = v.active;
          e.currentTarget.style.transform = 'scale(0.97) translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
      onMouseUp={(e) => {
        if (!inactive) {
          e.currentTarget.style.background = v.hover;
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 10px rgba(13,23,38,0.10)';
        }
      }}
    >
      {loading ? (
        <span style={{
          width: s.iconSize,
          height: s.iconSize,
          border: `1.5px solid ${variant === 'primary' || variant === 'accent' || variant === 'danger' ? 'rgba(255,255,255,0.3)' : '#C8D2DE'}`,
          borderTopColor: variant === 'primary' || variant === 'accent' || variant === 'danger' ? 'white' : ORANGE,
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
          flexShrink: 0,
        }} />
      ) : Icon ? (
        <Icon size={s.iconSize} strokeWidth={2} />
      ) : null}
      {children}
      {!loading && IconRight ? <IconRight size={s.iconSize} strokeWidth={2} /> : null}
    </button>
  );
}
