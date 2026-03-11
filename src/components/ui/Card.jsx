import React from 'react';

export function Card({ children, style = {}, className = '', onClick, hoverable = false }) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: 'var(--color-bg)',
        border: '1.5px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '14px',
        boxShadow: 'var(--shadow-sm)',
        cursor: onClick || hoverable ? 'pointer' : 'default',
        transition: 'box-shadow var(--transition-fast), border-color var(--transition-fast)',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick || hoverable) {
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          e.currentTarget.style.borderColor = '#d0d0d0';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick || hoverable) {
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          e.currentTarget.style.borderColor = 'var(--color-border)';
        }
      }}
    >
      {children}
    </div>
  );
}

export function SurfaceCard({ children, style = {}, className = '' }) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '14px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
