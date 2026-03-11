import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Eye, EyeOff, CheckCircle2, Lock, ExternalLink } from 'lucide-react';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { SCREENS } from '../constants';

// ── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeader({ label, href, linkLabel }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: 14, paddingBottom: 5,
    }}>
      <span style={{
        fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: '#aaa',
      }}>
        {label}
      </span>
      {href && (
        <a href={href} target="_blank" rel="noopener noreferrer" style={{
          display: 'flex', alignItems: 'center', gap: 3,
          fontSize: 10, fontWeight: 600, color: '#2b21ba',
          textDecoration: 'none', opacity: 0.8,
        }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
        >
          {linkLabel} <ExternalLink size={9} />
        </a>
      )}
    </div>
  );
}

function FieldHint({ children }) {
  return (
    <div style={{
      fontSize: 10.5, color: '#999', lineHeight: 1.5, marginTop: 3,
    }}>
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
          style={{ paddingRight: 36 }}
          autoComplete="off"
          spellCheck="false"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          style={{
            position: 'absolute', right: 10, top: '50%',
            transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#bbb', display: 'flex', padding: 0, transition: 'color 130ms',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#2b21ba')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#bbb')}
        >
          {visible ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
      {hint && <FieldHint>{hint}</FieldHint>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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
    const settings = {
      claudeApiKey,
      jiraBaseUrl,
      jiraEmail,
      jiraApiToken,
      jiraProjectKey,
      productboardApiKey,
    };
    chrome.storage.sync.set(settings, () => {
      dispatch({ type: 'SETTINGS_SAVED', settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <div className="screen anim-slide-in-right">
      {/* ── Header ── */}
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
          <div className="anim-pop-in" style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, color: '#16a34a', fontWeight: 600,
          }}>
            <CheckCircle2 size={12} /> Saved
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="screen-body" style={{ paddingTop: 2, paddingBottom: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* ── Claude AI ── */}
          <SectionHeader
            label="Claude AI"
            href="https://console.anthropic.com/settings/keys"
            linkLabel="Get API key"
          />
          <SecretField
            id="claude-key" label="API Key"
            value={claudeApiKey} onChange={setClaudeApiKey}
            placeholder="sk-ant-api03-…"
            hint="From console.anthropic.com → Settings → API Keys"
          />

          {/* ── JIRA ── */}
          <SectionHeader
            label="JIRA"
            href="https://id.atlassian.com/manage-profile/security/api-tokens"
            linkLabel="Get API token"
          />

          <div className="form-group">
            <label htmlFor="jira-url">Base URL</label>
            <input
              id="jira-url" type="url"
              value={jiraBaseUrl}
              onChange={(e) => setJiraBaseUrl(e.target.value)}
              placeholder="https://yourorg.atlassian.net"
            />
            <FieldHint>
              Just the domain — <strong>no path after .net</strong>.
              e.g. <code style={{ fontFamily: 'monospace', fontSize: 10 }}>https://whatfix.atlassian.net</code>
            </FieldHint>
          </div>

          <div className="form-group">
            <label htmlFor="jira-email">Atlassian account email</label>
            <input
              id="jira-email" type="email"
              value={jiraEmail}
              onChange={(e) => setJiraEmail(e.target.value)}
              placeholder="you@whatfix.com"
            />
          </div>

          <SecretField
            id="jira-token" label="API Token"
            value={jiraApiToken} onChange={setJiraApiToken}
            placeholder="ATATT3xFf…"
            hint="From id.atlassian.com → Security → API tokens"
          />

          <div className="form-group">
            <label htmlFor="jira-project">Project Key</label>
            <input
              id="jira-project"
              value={jiraProjectKey}
              onChange={(e) => setJiraProjectKey(e.target.value.toUpperCase())}
              placeholder="e.g. WPD"
            />
            <FieldHint>
              The short key in your JIRA project URL: <code style={{ fontFamily: 'monospace', fontSize: 10 }}>/browse/<strong>WPD</strong>-123</code>.
              This is a JIRA <em>project</em> key — not a Confluence space key.
            </FieldHint>
          </div>

          {/* ── Productboard ── */}
          <SectionHeader
            label="Productboard"
            href="https://app.productboard.com/settings/integrations"
            linkLabel="Get developer token"
          />

          <SecretField
            id="pb-key" label="Developer Token"
            value={productboardApiKey} onChange={setProductboardApiKey}
            placeholder="your-developer-token"
            hint={
              <span>
                Must be a <strong>Developer Token</strong> from Productboard → Settings → Integrations.
                A regular user password or OAuth token will return 422 Unauthorized.
              </span>
            }
          />

          {/* ── Security note ── */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '9px 11px', marginTop: 4,
            background: '#f5f3ff', borderRadius: 9,
            boxShadow: '0 0 0 1px rgba(43,33,186,0.10)',
            fontSize: 11, color: '#555', lineHeight: 1.5,
          }}>
            <Lock size={11} style={{ color: '#2b21ba', flexShrink: 0, marginTop: 2 }} />
            Stored locally in{' '}
            <code style={{ fontFamily: 'monospace', fontSize: 10 }}>chrome.storage.sync</code>.
            {' '}Never sent to third parties.
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="screen-footer">
        <Button fullWidth size="lg" icon={Save} onClick={handleSave}>
          Save Settings
        </Button>
      </div>
    </div>
  );
}
