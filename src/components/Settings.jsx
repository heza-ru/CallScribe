import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle2, Lock, ExternalLink, Check, X } from 'lucide-react';
import { SCREENS } from '../constants';

const ORANGE = '#E55014';
const NAVY   = '#0D1726';

function SectionHeader({ label, sub, href, linkLabel }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      paddingLeft: 12,
      borderLeft: `3px solid ${ORANGE}`,
      marginTop: 16, marginBottom: 12,
    }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: 10, color: '#8A97A8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 1 }}>
            {sub}
          </div>
        )}
      </div>
      {href && (
        <a href={href} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: ORANGE, textDecoration: 'none', flexShrink: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          {linkLabel} <ExternalLink size={9} />
        </a>
      )}
    </div>
  );
}

function FieldHint({ children }) {
  return (
    <div style={{ fontSize: 10.5, color: ORANGE, fontStyle: 'italic', lineHeight: 1.5, marginTop: 4 }}>
      {children}
    </div>
  );
}

function SecretField({ id, label, value, onChange, placeholder, hint }) {
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
          style={{ paddingRight: 38 }}
          autoComplete="off"
          spellCheck="false"
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          style={{
            position: 'absolute', right: 10, top: '50%',
            transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#A8B4C0', display: 'flex', padding: 0, transition: 'color 130ms',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = ORANGE)}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#A8B4C0')}
        >
          {visible ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
      {hint && <FieldHint>{hint}</FieldHint>}
    </div>
  );
}

function IntegrationRow({ icon: Icon, label, sub, enabled, onToggle }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '11px 14px',
      border: '1px solid #E4E9F0',
      borderRadius: 8, background: '#fff', gap: 12,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 7,
        background: '#F5F7FA', border: '1px solid #E4E9F0',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={15} style={{ color: '#4B5A6D' }} strokeWidth={2} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: 10.5, color: '#8A97A8', marginTop: 1 }}>{sub}</div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: 32, height: 32, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: enabled ? ORANGE : '#fff',
          border: `1px solid ${enabled ? ORANGE : '#C8D2DE'}`,
          cursor: 'pointer',
          transition: 'background 130ms, border-color 130ms',
        }}
      >
        {enabled
          ? <Check size={14} color="#fff" strokeWidth={3} />
          : <X size={14} color="#C8D2DE" strokeWidth={2.5} />
        }
      </button>
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
  const [jiraEnabled,        setJiraEnabled]        = useState(false);
  const [pbEnabled,          setPbEnabled]          = useState(false);
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
        setJiraEnabled(!!(r.jiraBaseUrl && r.jiraApiToken));
        setPbEnabled(!!r.productboardApiKey);
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

  function handleDiscard() {
    dispatch({ type: 'SET_SCREEN', screen: SCREENS.DETECTION });
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      flex: 1, height: '100vh', overflow: 'hidden',
      background: '#fff',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 12px',
        background: '#fff', borderBottom: '1px solid #E4E9F0', flexShrink: 0,
      }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Settings
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {saved && (
            <div className="anim-pop-in" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#16a34a', fontWeight: 700 }}>
              <CheckCircle2 size={12} /> Saved
            </div>
          )}
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: claudeApiKey ? '#22c55e' : '#C8D2DE' }} />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 16px 20px' }}>

        {/* Claude API */}
        <SectionHeader
          label="Claude API"
          sub="Authentication"
          href="https://console.anthropic.com/settings/keys"
          linkLabel="Get key"
        />

        <SecretField
          id="claude-key" label="API Key"
          value={claudeApiKey} onChange={setClaudeApiKey}
          placeholder="sk-ant-api03-…"
          hint="AES-256 Encrypted"
        />

        {/* JIRA */}
        <SectionHeader
          label="JIRA"
          sub="Ticket Sync"
          href="https://id.atlassian.com/manage-profile/security/api-tokens"
          linkLabel="Get token"
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="form-group">
            <label htmlFor="jira-url">Base URL</label>
            <input
              id="jira-url" type="url"
              value={jiraBaseUrl}
              onChange={(e) => setJiraBaseUrl(e.target.value)}
              placeholder="https://yourorg.atlassian.net"
            />
          </div>
          <div className="form-group">
            <label htmlFor="jira-email">Account Email</label>
            <input
              id="jira-email" type="email"
              value={jiraEmail}
              onChange={(e) => setJiraEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <SecretField
            id="jira-token" label="API Token"
            value={jiraApiToken} onChange={setJiraApiToken}
            placeholder="ATATT3xFf…"
          />
          <div className="form-group">
            <label htmlFor="jira-project">Project Key</label>
            <input
              id="jira-project"
              value={jiraProjectKey}
              onChange={(e) => setJiraProjectKey(e.target.value.toUpperCase())}
              placeholder="e.g. WPD"
            />
          </div>
        </div>

        {/* Productboard */}
        <SectionHeader
          label="Productboard"
          sub="Product Sync"
          href="https://app.productboard.com/settings/integrations"
          linkLabel="Get token"
        />

        <SecretField
          id="pb-key" label="Developer Token"
          value={productboardApiKey} onChange={setProductboardApiKey}
          placeholder="your-developer-token"
        />

        {/* Integrations */}
        <SectionHeader label="Integrations" sub="Tool Connectivity" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <IntegrationRow
            icon={({ size, style, strokeWidth }) => (
              <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
                <rect x="3" y="3" width="8" height="8" rx="1" />
                <rect x="13" y="3" width="8" height="8" rx="1" />
                <rect x="3" y="13" width="8" height="8" rx="1" />
                <rect x="13" y="13" width="8" height="8" rx="1" />
              </svg>
            )}
            label="JIRA"
            sub="Sync tickets"
            enabled={jiraEnabled}
            onToggle={() => setJiraEnabled(v => !v)}
          />
          <IntegrationRow
            icon={({ size, style, strokeWidth }) => (
              <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
                <rect x="3" y="3" width="8" height="8" rx="1" fill="currentColor" />
                <rect x="13" y="3" width="8" height="8" rx="1" />
                <rect x="3" y="13" width="8" height="8" rx="1" />
                <rect x="13" y="13" width="8" height="8" rx="1" fill="currentColor" />
              </svg>
            )}
            label="Roadmap"
            sub="Product sync"
            enabled={pbEnabled}
            onToggle={() => setPbEnabled(v => !v)}
          />
        </div>

        {/* Security note */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '10px 12px', marginTop: 16,
          background: '#F5F7FA', borderRadius: 8,
          border: '1px solid #E4E9F0',
          fontSize: 11, color: '#4B5A6D', lineHeight: 1.5,
        }}>
          <Lock size={11} style={{ color: ORANGE, flexShrink: 0, marginTop: 2 }} />
          Stored in <code style={{ fontFamily: 'monospace', fontSize: 10 }}>chrome.storage.sync</code>. Never sent to third parties.
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px 14px', background: '#fff', borderTop: '1px solid #E4E9F0', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button type="button" onClick={handleSave}
          style={{
            width: '100%', padding: '0 20px', height: 40,
            background: ORANGE, border: 'none', borderRadius: 8,
            color: '#fff', fontSize: 12, fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            cursor: 'pointer', transition: 'background 130ms',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#CC4712')}
          onMouseLeave={(e) => (e.currentTarget.style.background = ORANGE)}
        >
          Save Changes
        </button>
        <button type="button" onClick={handleDiscard}
          style={{
            width: '100%', padding: '0 20px', height: 40,
            background: '#fff', border: '1px solid #E4E9F0', borderRadius: 8,
            color: NAVY, fontSize: 12, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            cursor: 'pointer', transition: 'background 130ms',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F7FA')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
        >
          Discard
        </button>
      </div>
    </div>
  );
}
