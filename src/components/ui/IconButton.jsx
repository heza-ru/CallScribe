import React from 'react';

export function IconButton({
  icon: Icon,
  onClick,
  title,
  size = 32,
  iconSize = 16,
  color = 'var(--color-text-secondary)',
  hoverColor = 'var(--color-primary)',
  style = {},
  disabled = false,
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        background: 'transparent',
        color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        flexShrink: 0,
        transition: 'color var(--transition-fast), background var(--transition-fast)',
        padding: 0,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.color = hoverColor;
          e.currentTarget.style.background = 'var(--color-surface)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.color = color;
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      <Icon size={iconSize} strokeWidth={2} />
    </button>
  );
}
