(() => {
  const RECORDING_PATTERN = /\/recording\/([a-zA-Z0-9_-]+)/;

  function getMeetingId() {
    const match = window.location.pathname.match(RECORDING_PATTERN);
    return match ? match[1] : null;
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

  function notifyBackground(meetingId, token) {
    try {
      chrome.runtime.sendMessage({
        type: 'MINDTICKLE_DETECTED',
        meetingId,
        token,
        url: window.location.href,
      });
    } catch { /* extension context invalidated — ignore */ }
  }

  function init() {
    const meetingId = getMeetingId();
    if (!meetingId) return;

    const token = getAuthToken();
    notifyBackground(meetingId, token);
  }

  // Run on load and also watch for SPA navigations
  init();

  let lastPath = window.location.pathname;
  const observer = new MutationObserver(() => {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      init();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
