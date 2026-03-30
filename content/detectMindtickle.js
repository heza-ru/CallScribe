(() => {
  const RECORDING_PATTERN = /\/recording\/([a-zA-Z0-9_-]+)/;

  function getMeetingId() {
    const match = window.location.pathname.match(RECORDING_PATTERN);
    return match ? match[1] : null;
  }

  function getCallTitle() {
    try {
      const el = document.querySelector('[data-testid="text-recording-title"]');
      if (!el) return null;
      // Prefer aria-label on inner div (handles HTML entities cleanly)
      const inner = el.querySelector('[aria-label]');
      const raw = inner?.getAttribute('aria-label') || el.textContent;
      return raw?.trim() || null;
    } catch {
      return null;
    }
  }

  function getAuthToken() {
    try {
      const config = window._wfx_data?.end_user?.custom?.config;
      if (config?.token) return config.token;
      if (config?.authToken) return config.authToken;
      if (config?.accessToken) return config.accessToken;

      // Fallback: scan localStorage for a token key
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth'))) {
          try {
            const val = JSON.parse(localStorage.getItem(key));
            if (typeof val === 'string' && val.length > 20) return val;
            if (val?.token) return val.token;
            if (val?.accessToken) return val.accessToken;
          } catch {
            const raw = localStorage.getItem(key);
            if (raw && raw.length > 20 && !raw.includes(' ')) return raw;
          }
        }
      }
    } catch {
      // silent
    }
    return null;
  }

  function notifyBackground(meetingId, token, callTitle) {
    try {
      chrome.runtime.sendMessage({
        type: 'MINDTICKLE_DETECTED',
        meetingId,
        token,
        callTitle,
        url: window.location.href,
      });
    } catch { /* extension context invalidated — ignore */ }
  }

  function init() {
    const meetingId = getMeetingId();
    if (!meetingId) return;

    const token = getAuthToken();
    const callTitle = getCallTitle();
    notifyBackground(meetingId, token, callTitle);
  }

  // Run on load and also watch for SPA navigations and late-loading title
  init();

  let lastPath = window.location.pathname;
  let lastTitle = getCallTitle();

  const observer = new MutationObserver(() => {
    const currentPath = window.location.pathname;
    const currentTitle = getCallTitle();

    if (currentPath !== lastPath) {
      lastPath = currentPath;
      lastTitle = currentTitle;
      init();
    } else if (currentTitle && currentTitle !== lastTitle) {
      // Title appeared or changed after initial detection — re-send with updated title
      lastTitle = currentTitle;
      const meetingId = getMeetingId();
      if (meetingId) notifyBackground(meetingId, getAuthToken(), currentTitle);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
