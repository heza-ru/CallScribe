import React from 'react';

const ORANGE = '#E55014';
const NAVY   = '#0D1726';

const presets = {
  bug:         { bg: '#fef2f2',  color: '#dc2626',  label: 'Bug' },
  feature:     { bg: '#FFF4EF',  color: ORANGE,     label: 'Feature' },
  pain:        { bg: '#fffbeb',  color: '#d97706',  label: 'Pain Point' },
  improvement: { bg: '#f0fdf4',  color: '#16a34a',  label: 'Improvement' },
  action:      { bg: '#eef2ff',  color: '#6366f1',  label: 'Action Item' },
  critical:    { bg: ORANGE,     color: '#fff' },
  high:        { bg: '#f97316',  color: '#fff' },
  medium:      { bg: '#f59e0b',  color: '#fff' },
  low:         { bg: '#6b7280',  color: '#fff' },
  default:     { bg: '#F5F7FA',  color: '#8A97A8' },
};

export function Badge({ type, label, style = {} }) {
  const preset = presets[type] || presets.default;
  const displayLabel = label ?? preset.label ?? type;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 7px',
      borderRadius: 5,
      fontSize: 9.5,
      fontWeight: 700,
      lineHeight: '16px',
      background: preset.bg,
      color: preset.color,
      whiteSpace: 'nowrap',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      ...style,
    }}>
      {displayLabel}
    </span>
  );
}
