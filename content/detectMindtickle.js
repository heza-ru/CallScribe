(() => {
  const RECORDING_PATTERN = /\/recording\/([a-zA-Z0-9_-]+)/;

  function getMeetingId() {
    const match = window.location.pathname.match(RECORDING_PATTERN);
    return match ? match[1] : null;
  }

  function getCallTitle() {
    try {
      // Try known data-testid selectors
      const byTestId = document.querySelector('[data-testid="text-recording-title"] div[aria-label]');
      if (byTestId) {
        const t = byTestId.getAttribute('aria-label')?.trim() || byTestId.textContent?.trim();
        if (t) return t;
      }

      // Try aria-label on the container itself
      const byContainer = document.querySelector('[data-testid="text-recording-title"]');
      if (byContainer) {
        const t = byContainer.getAttribute('aria-label')?.trim() || byContainer.textContent?.trim();
        if (t) return t;
      }

      // Try document.title — Mindtickle SPAs typically set it to the call name
      const docTitle = document.title?.trim();
      if (docTitle && docTitle.toLowerCase() !== 'mindtickle' && docTitle.length > 0) {
        return docTitle;
      }
    } catch {}
    return null;
  }

  function getAuthToken() {
    try {
      const config = window._wfx_data?.end_user?.custom?.config;
      if (config?.token) return config.token;
      if (config?.authToken) return config.authToken;
      if (config?.accessToken) return config.accessToken;

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
    } catch {}
    return null;
  }

  function notifyBackground(meetingId, token, callTitle) {
    try {
      chrome.runtime.sendMessage(
        { type: 'MINDTICKLE_DETECTED', meetingId, token, callTitle, url: window.location.href },
        () => { void chrome.runtime.lastError; }
      );
    } catch { /* extension context invalidated */ }
  }

  function init() {
    const meetingId = getMeetingId();
    if (!meetingId) return;

    const token = getAuthToken();
    const callTitle = getCallTitle();
    notifyBackground(meetingId, token, callTitle);
  }

  init();

  // Re-query title on demand (called when user clicks sync and title was missing)
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== 'GET_CALL_TITLE') return false;
    sendResponse({ callTitle: getCallTitle() });
    return false;
  });

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
      lastTitle = currentTitle;
      const meetingId = getMeetingId();
      if (meetingId) notifyBackground(meetingId, getAuthToken(), currentTitle);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
