import React from 'react';

const presets = {
  bug:         { bg: '#fef2f2', color: '#dc2626', label: 'Bug' },
  feature:     { bg: '#ede9ff', color: '#2b21ba', label: 'Feature' },
  pain:        { bg: '#fffbeb', color: '#d97706', label: 'Pain Point' },
  improvement: { bg: '#f0fdf4', color: '#16a34a', label: 'Improvement' },
  action:      { bg: '#f0f9ff', color: '#0369a1', label: 'Action Item' },
  critical:    { bg: '#fef2f2', color: '#dc2626' },
  high:        { bg: '#fff7ed', color: '#c2410c' },
  medium:      { bg: '#fefce8', color: '#92400e' },
  low:         { bg: '#f0fdf4', color: '#166534' },
  default:     { bg: '#f6f6f8', color: '#777' },
};

export function Badge({ type, label, style = {} }) {
  const preset = presets[type] || presets.default;
  const displayLabel = label ?? preset.label ?? type;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 7px',
      borderRadius: 6,
      fontSize: 10.5,
      fontWeight: 600,
      lineHeight: '17px',
      background: preset.bg,
      color: preset.color,
      whiteSpace: 'nowrap',
      letterSpacing: '0.01em',
      ...style,
    }}>
      {displayLabel}
    </span>
  );
}
