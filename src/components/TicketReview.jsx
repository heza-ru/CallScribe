import React, { useState } from 'react';
import { ArrowLeft, Send, ExternalLink } from 'lucide-react';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { createJiraTicket } from '../services/jiraService';
import { createProductboardInsight } from '../services/productboardService';
import { SCREENS } from '../constants';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const TYPES = [
  { value: 'bug',         label: 'Bug' },
  { value: 'feature',     label: 'Feature Request' },
  { value: 'pain',        label: 'Pain Point' },
  { value: 'improvement', label: 'Improvement' },
  { value: 'action',      label: 'Action Item' },
];

export function TicketReview({ state, dispatch }) {
  const draft = state.draftTicket || {};
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
      labels: labels.split(',').map((l) => l.trim()).filter(Boolean),
      meetingId: state.meetingId,
    };
  }

  async function handleJira() {
    setJira({ loading: true, done: false, url: null, error: null });
    try {
      const r = await createJiraTicket(buildTicket(), state.settings);
      setJira({ loading: false, done: true, url: r.url, error: null });
    } catch (err) {
      setJira({ loading: false, done: false, url: null, error: err.message });
    }
  }

  async function handlePB() {
    setPb({ loading: true, done: false, url: null, error: null });
    try {
      const r = await createProductboardInsight(buildTicket(), state.settings);
      setPb({ loading: false, done: true, url: r.url, error: null });
    } catch (err) {
      setPb({ loading: false, done: false, url: null, error: err.message });
    }
  }

  const isSubmitting = jira.loading || pb.loading;

  return (
    <div className="screen anim-slide-in-right">
      <div className="screen-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconButton icon={ArrowLeft} title="Back"
            onClick={() => dispatch({ type: 'SET_SCREEN', screen: SCREENS.ANALYSIS })} />
          <div>
            <div className="text-title">Edit Ticket</div>
            <div className="text-meta">Review before submitting</div>
          </div>
        </div>
      </div>

      <div className="screen-body" style={{ paddingTop: 14, paddingBottom: 10, gap: 10 }}>
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
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Product Area</label>
          <input value={productArea} onChange={(e) => setProductArea(e.target.value)}
            placeholder="e.g. Onboarding, Analytics" />
        </div>

        <div className="form-group">
          <label>Labels <span style={{ color: '#bbb', fontWeight: 400 }}>(comma separated)</span></label>
          <input value={labels} onChange={(e) => setLabels(e.target.value)}
            placeholder="callscribe, customer-feedback" />
        </div>

        {jira.error && <div className="banner error">{jira.error}</div>}
        {pb.error   && <div className="banner error">{pb.error}</div>}

        {jira.done && (
          <a href={jira.url} target="_blank" rel="noopener noreferrer" className="banner success" style={{ textDecoration: 'none' }}>
            <ExternalLink size={11} /> JIRA ticket created — view
          </a>
        )}
        {pb.done && (
          <a href={pb.url} target="_blank" rel="noopener noreferrer" className="banner success" style={{ textDecoration: 'none' }}>
            <ExternalLink size={11} /> Productboard insight created — view
          </a>
        )}
      </div>

      <div className="screen-footer" style={{ display: 'flex', gap: 8 }}>
        <Button
          loading={jira.loading} disabled={isSubmitting || !title}
          icon={jira.done ? ExternalLink : Send}
          variant={jira.done ? 'secondary' : 'primary'}
          onClick={handleJira}
          style={{ flex: 1, minWidth: 0, flexShrink: 1 }}
        >
          {jira.done ? 'Re-submit JIRA' : 'JIRA Ticket'}
        </Button>
        <Button
          loading={pb.loading} disabled={isSubmitting || !title}
          icon={pb.done ? ExternalLink : Send}
          variant={pb.done ? 'secondary' : 'accent'}
          onClick={handlePB}
          style={{ flex: 1, minWidth: 0, flexShrink: 1 }}
        >
          {pb.done ? 'Re-submit PB' : 'Productboard'}
        </Button>
      </div>
    </div>
  );
}
