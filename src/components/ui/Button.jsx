import React from 'react';

const variants = {
  primary:   { bg: '#2b21ba', hover: '#231aaa', active: '#1c149a', color: '#fff', border: 'none' },
  secondary: { bg: '#ffffff', hover: '#f7f7f9', active: '#f0f0f4', color: '#0a0a0a', border: '1.5px solid #e5e5e5' },
  ghost:     { bg: 'transparent', hover: '#f7f7f9', active: '#f0f0f4', color: '#525252', border: 'none' },
  danger:    { bg: '#dc2626', hover: '#b91c1c', active: '#991b1b', color: '#fff', border: 'none' },
  accent:    { bg: '#f26b3a', hover: '#e05d2d', active: '#d4521f', color: '#fff', border: 'none' },
};

const sizes = {
  xs: { padding: '4px 10px', fontSize: '11px', height: '26px', gap: '4px', iconSize: 12 },
  sm: { padding: '6px 12px', fontSize: '12px', height: '30px', gap: '5px', iconSize: 13 },
  md: { padding: '8px 16px', fontSize: '13px', height: '36px', gap: '6px', iconSize: 14 },
  lg: { padding: '10px 20px', fontSize: '14px', height: '42px', gap: '7px', iconSize: 16 },
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
        fontWeight: 500,
        lineHeight: 1,
        border: v.border || 'none',
        background: v.bg,
        color: v.color,
        width: fullWidth ? '100%' : undefined,
        flexShrink: 0,
        transition: 'background 140ms ease, transform 100ms ease, opacity 140ms ease',
        letterSpacing: '-0.01em',
        ...s,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!inactive) e.currentTarget.style.background = v.hover;
      }}
      onMouseLeave={(e) => {
        if (!inactive) e.currentTarget.style.background = v.bg;
      }}
      onMouseDown={(e) => {
        if (!inactive) {
          e.currentTarget.style.background = v.active;
          e.currentTarget.style.transform = 'scale(0.97)';
        }
      }}
      onMouseUp={(e) => {
        if (!inactive) {
          e.currentTarget.style.background = v.hover;
          e.currentTarget.style.transform = 'scale(1)';
        }
      }}
    >
      {loading ? (
        <span
          style={{
            width: s.iconSize,
            height: s.iconSize,
            border: `1.5px solid ${variant === 'primary' || variant === 'accent' || variant === 'danger' ? 'rgba(255,255,255,0.3)' : 'var(--color-border)'}`,
            borderTopColor: variant === 'primary' || variant === 'accent' || variant === 'danger' ? 'white' : 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            flexShrink: 0,
          }}
        />
      ) : Icon ? (
        <Icon size={s.iconSize} strokeWidth={2} />
      ) : null}
      {children}
      {!loading && IconRight ? <IconRight size={s.iconSize} strokeWidth={2} /> : null}
    </button>
  );
}
