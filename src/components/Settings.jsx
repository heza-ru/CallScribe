import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Eye, EyeOff, CheckCircle2, Lock } from 'lucide-react';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { SCREENS } from '../constants';

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: '#aaa', paddingTop: 8, paddingBottom: 4,
    }}>
      {children}
    </div>
  );
}

function SecretField({ id, label, value, onChange, placeholder }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ paddingRight: 36 }}
          autoComplete="off"
          spellCheck="false"
        />
        <button type="button" onClick={() => setVisible((v) => !v)} style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#bbb', display: 'flex', padding: 0, transition: 'color 130ms',
        }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#2b21ba')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#bbb')}
        >
          {visible ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
    </div>
  );
}

export function Settings({ state, dispatch }) {
  const [claudeApiKey,       setClaudeApiKey]       = useState('');
  const [jiraBaseUrl,        setJiraBaseUrl]        = useState('');
  const [jiraEmail,          setJiraEmail]          = useState('');
  const [jiraApiToken,       setJiraApiToken]       = useState('');
  const [jiraProjectKey,     setJiraProjectKey]     = useState('');
  const [productboardApiKey, setProductboardApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.storage.sync.get(
      ['claudeApiKey', 'jiraBaseUrl', 'jiraEmail', 'jiraApiToken', 'jiraProjectKey', 'productboardApiKey'],
      (r) => {
        setClaudeApiKey(r.claudeApiKey || '');
        setJiraBaseUrl(r.jiraBaseUrl || '');
        setJiraEmail(r.jiraEmail || '');
        setJiraApiToken(r.jiraApiToken || '');
        setJiraProjectKey(r.jiraProjectKey || '');
        setProductboardApiKey(r.productboardApiKey || '');
      }
    );
  }, []);

  function handleSave() {
    const settings = { claudeApiKey, jiraBaseUrl, jiraEmail, jiraApiToken, jiraProjectKey, productboardApiKey };
    chrome.storage.sync.set(settings, () => {
      dispatch({ type: 'SETTINGS_SAVED', settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <div className="screen anim-slide-in-right">
      <div className="screen-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconButton icon={ArrowLeft} title="Back"
            onClick={() => dispatch({ type: 'SET_SCREEN', screen: SCREENS.DETECTION })} />
          <div>
            <div className="text-title">Settings</div>
            <div className="text-meta">API credentials</div>
          </div>
        </div>
        {saved && (
          <div className="anim-pop-in" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
            <CheckCircle2 size={12} /> Saved
          </div>
        )}
      </div>

      <div className="screen-body" style={{ paddingTop: 4, paddingBottom: 10 }}>
        <div className="form-grid">
          <SectionLabel>Claude AI</SectionLabel>
          <SecretField id="claude-key" label="API Key" value={claudeApiKey} onChange={setClaudeApiKey} placeholder="sk-ant-…" />

          <SectionLabel>JIRA</SectionLabel>
          <div className="form-group">
            <label htmlFor="jira-url">Base URL</label>
            <input id="jira-url" type="url" value={jiraBaseUrl} onChange={(e) => setJiraBaseUrl(e.target.value)} placeholder="https://yourorg.atlassian.net" />
          </div>
          <div className="form-group">
            <label htmlFor="jira-email">Email</label>
            <input id="jira-email" type="email" value={jiraEmail} onChange={(e) => setJiraEmail(e.target.value)} placeholder="you@company.com" />
          </div>
          <SecretField id="jira-token" label="API Token" value={jiraApiToken} onChange={setJiraApiToken} placeholder="ATATT3x…" />
          <div className="form-group">
            <label htmlFor="jira-project">Project Key</label>
            <input id="jira-project" value={jiraProjectKey} onChange={(e) => setJiraProjectKey(e.target.value.toUpperCase())} placeholder="PROJ" />
          </div>

          <SectionLabel>Productboard</SectionLabel>
          <SecretField id="pb-key" label="API Key" value={productboardApiKey} onChange={setProductboardApiKey} placeholder="pb_…" />

          {/* Security note */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 11px',
            background: '#f5f3ff', borderRadius: 9,
            boxShadow: '0 0 0 1px rgba(43,33,186,0.10)',
            fontSize: 11, color: '#555', lineHeight: 1.5,
          }}>
            <Lock size={11} style={{ color: '#2b21ba', flexShrink: 0, marginTop: 2 }} />
            Stored locally in <code style={{ fontFamily: 'monospace', fontSize: 10 }}>chrome.storage.sync</code>. Never sent to third parties.
          </div>
        </div>
      </div>

      <div className="screen-footer">
        <Button fullWidth size="lg" icon={Save} onClick={handleSave}>Save Settings</Button>
      </div>
    </div>
  );
}
