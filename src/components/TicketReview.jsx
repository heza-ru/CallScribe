import React, { useState } from 'react';
import { ArrowLeft, Send, ExternalLink } from 'lucide-react';
import { createJiraTicket } from '../services/jiraService';
import { createProductboardInsight } from '../services/productboardService';
import { SCREENS, ORANGE, NAVY } from '../constants';
import { Spinner } from './ui/Spinner';
import { useStore } from '../store';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const TYPES = [
  { value: 'bug',         label: 'Bug' },
  { value: 'feature',     label: 'Feature Request' },
  { value: 'pain',        label: 'Pain Point' },
  { value: 'improvement', label: 'Improvement' },
  { value: 'action',      label: 'Action Item' },
];

export function TicketReview() {
  const draftTicket    = useStore(s => s.draftTicket);
  const meetingId      = useStore(s => s.meetingId);
  const settings       = useStore(s => s.settings);
  const setScreen      = useStore(s => s.setScreen);
  const ticketSubmitted = useStore(s => s.ticketSubmitted);

  const draft = draftTicket || {};
  const [title,       setTitle]       = useState(draft.title || '');
  const [description, setDescription] = useState(draft.description || '');
  const [productArea, setProductArea] = useState(draft.productArea || '');
  const [priority,    setPriority]    = useState(draft.priority || 'Medium');
  const [type,        setType]        = useState(draft.type || 'feature');
  const [labels,      setLabels]      = useState((draft.labels || []).join(', '));

  const [jira, setJira] = useState({ loading: false, done: false, url: null, error: null });
  const [pb,   setPb]   = useState({ loading: false, done: false, url: null, error: null });

  function buildTicket() {
    return {
      title, description, productArea, priority, type,
      labels: labels.split(',').map(l => l.trim()).filter(Boolean),
      meetingId,
    };
  }

  async function handleJira() {
    setJira({ loading: true, done: false, url: null, error: null });
    try {
      const r = await createJiraTicket(buildTicket(), settings);
      setJira({ loading: false, done: true, url: r.url, error: null });
    } catch (err) {
      setJira({ loading: false, done: false, url: null, error: err.message });
    }
  }

  async function handlePB() {
    setPb({ loading: true, done: false, url: null, error: null });
    try {
      const r = await createProductboardInsight(buildTicket(), settings);
      setPb({ loading: false, done: true, url: r.url, error: null });
    } catch (err) {
      setPb({ loading: false, done: false, url: null, error: err.message });
    }
  }

  const isSubmitting = jira.loading || pb.loading;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      flex: 1, height: '100vh', overflow: 'hidden',
      background: '#fff',
    }}
      className="anim-slide-in-right"
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '13px 16px 12px',
        background: '#fff', borderBottom: '1px solid #E4E9F0', flexShrink: 0,
      }}>
        <button type="button"
          onClick={() => setScreen(SCREENS.ANALYSIS)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px 4px 0', display: 'flex', color: '#8A97A8' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = NAVY)}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#8A97A8')}
        >
          <ArrowLeft size={16} strokeWidth={2.5} />
        </button>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Edit Ticket
          </div>
          <div style={{ fontSize: 10, color: '#8A97A8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Review before submitting
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        <div className="form-group">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ticket title" />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description" style={{ minHeight: 76 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Product Area</label>
          <input value={productArea} onChange={(e) => setProductArea(e.target.value)}
            placeholder="e.g. Onboarding, Analytics" />
        </div>

        <div className="form-group">
          <label>Labels <span style={{ color: '#A8B4C0', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(comma separated)</span></label>
          <input value={labels} onChange={(e) => setLabels(e.target.value)}
            placeholder="callscribe, customer-feedback" />
        </div>

        {jira.error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', fontSize: 11, padding: '8px 12px', borderRadius: 7, border: '1px solid #fecaca' }}>
            {jira.error}
          </div>
        )}
        {pb.error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', fontSize: 11, padding: '8px 12px', borderRadius: 7, border: '1px solid #fecaca' }}>
            {pb.error}
          </div>
        )}

        {jira.done && (
          <a href={jira.url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 700, padding: '9px 12px', borderRadius: 7, border: '1px solid #dcfce7', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <ExternalLink size={11} /> JIRA ticket created — view
          </a>
        )}
        {pb.done && (
          <a href={pb.url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 700, padding: '9px 12px', borderRadius: 7, border: '1px solid #dcfce7', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <ExternalLink size={11} /> Productboard insight created — view
          </a>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px 14px', background: '#fff', borderTop: '1px solid #E4E9F0', flexShrink: 0, display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={handleJira}
          disabled={isSubmitting || !title}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '0 12px', height: 40, borderRadius: 8, border: 'none',
            background: NAVY, color: '#fff',
            fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
            cursor: isSubmitting || !title ? 'not-allowed' : 'pointer',
            opacity: isSubmitting || !title ? 0.5 : 1,
          }}
        >
          {jira.loading
            ? <Spinner size={14} color="#fff" trackColor="rgba(255,255,255,0.3)" />
            : jira.done ? <ExternalLink size={12} /> : <Send size={12} />
          }
          {jira.done ? 'Re-submit JIRA' : 'JIRA'}
        </button>
        <button
          type="button"
          onClick={handlePB}
          disabled={isSubmitting || !title}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '0 12px', height: 40, borderRadius: 8, border: 'none',
            background: ORANGE, color: '#fff',
            fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
            cursor: isSubmitting || !title ? 'not-allowed' : 'pointer',
            opacity: isSubmitting || !title ? 0.5 : 1,
          }}
        >
          {pb.loading
            ? <Spinner size={14} color="#fff" trackColor="rgba(255,255,255,0.3)" />
            : pb.done ? <ExternalLink size={12} /> : <Send size={12} />
          }
          {pb.done ? 'Re-submit PB' : 'Productboard'}
        </button>
      </div>
    </div>
  );
}
