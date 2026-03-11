import React from 'react';

export function Spinner({ size = 20, color = 'var(--color-primary)', trackColor, style = {} }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: `2px solid ${trackColor || 'var(--color-border)'}`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
        ...style,
      }}
      aria-label="Loading"
    />
  );
}

export function LoadingDots({ color = 'var(--color-primary)' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: color,
            animation: `dotBounce 1.2s ease-in-out ${i * 0.16}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

export function LoadingOverlay({ message = 'Loading…' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        flex: 1,
        padding: '32px 20px',
        animation: 'fadeIn var(--transition-base) both',
      }}
    >
      <Spinner size={32} />
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
        {message}
      </p>
    </div>
  );
}
