import { ORANGE, NAVY } from '../constants';

export const mdComponents = {
  h1: ({ children }) => (
    <h1 style={{ fontSize: 14, fontWeight: 900, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '18px 0 8px', borderBottom: '2px solid #E4E9F0', paddingBottom: 6 }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ fontSize: 12, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '16px 0 6px' }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontSize: 11.5, fontWeight: 700, color: '#4B5A6D', margin: '12px 0 5px' }}>
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p style={{ fontSize: 12, color: '#4B5A6D', lineHeight: 1.7, margin: '0 0 10px' }}>
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul style={{ margin: '0 0 10px', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol style={{ margin: '0 0 10px', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li style={{ fontSize: 12, color: '#4B5A6D', lineHeight: 1.6 }}>
      {children}
    </li>
  ),
  strong: ({ children }) => (
    <strong style={{ fontWeight: 700, color: NAVY }}>
      {children}
    </strong>
  ),
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', margin: '0 0 12px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th style={{ padding: '7px 10px', background: '#F5F7FA', border: '1px solid #E4E9F0', fontWeight: 700, color: NAVY, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td style={{ padding: '7px 10px', border: '1px solid #E4E9F0', color: '#4B5A6D', verticalAlign: 'top' }}>
      {children}
    </td>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{ borderLeft: `3px solid ${ORANGE}`, paddingLeft: 12, margin: '8px 0', color: '#8A97A8', fontStyle: 'italic' }}>
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code style={{ background: '#F5F7FA', padding: '2px 5px', borderRadius: 3, fontSize: 11, fontFamily: 'monospace' }}>
      {children}
    </code>
  ),
  hr: () => <div style={{ height: 1, background: '#E4E9F0', margin: '14px 0' }} />,
};

export const chatMdComponents = {
  ...mdComponents,
  p:  ({ children }) => <p style={{ margin: '0 0 8px', fontSize: 12.5, lineHeight: 1.7, color: '#4B5A6D' }}>{children}</p>,
  ul: ({ children }) => <ul style={{ margin: '0 0 8px', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: '0 0 8px', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>{children}</ol>,
  li: ({ children }) => <li style={{ fontSize: 12.5, color: '#4B5A6D', lineHeight: 1.6 }}>{children}</li>,
  code: ({ children }) => <code style={{ background: 'rgba(13,23,38,0.07)', padding: '1px 5px', borderRadius: 3, fontSize: 11.5, fontFamily: 'monospace' }}>{children}</code>,
  h1: ({ children }) => <p style={{ fontSize: 13, fontWeight: 800, color: NAVY, margin: '8px 0 4px' }}>{children}</p>,
  h2: ({ children }) => <p style={{ fontSize: 12.5, fontWeight: 700, color: NAVY, margin: '8px 0 4px' }}>{children}</p>,
  h3: ({ children }) => <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, margin: '6px 0 3px' }}>{children}</p>,
};
