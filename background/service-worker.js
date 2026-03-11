// Open the side panel when the toolbar icon is clicked (latest 2026 pattern)
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error);

// Per-tab state: { meetingId, token, url }
const tabState = new Map();

// Enable/disable the side panel based on whether the tab is a Mindtickle page
// and clean up tab state on navigation — combined into one listener
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Enable/disable side panel
  if (tab.url) {
    const isMindtickle = tab.url.includes('mindtickle.com');
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'index.html',
      enabled: isMindtickle,
    });
  }
  // Clear cached transcript state on page navigation
  if (changeInfo.status === 'loading') {
    tabState.delete(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabState.delete(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'MINDTICKLE_DETECTED': {
      const tabId = sender.tab?.id;
      if (tabId == null) break;
      tabState.set(tabId, {
        meetingId: message.meetingId,
        token: message.token,
        url: message.url,
      });
      break;
    }

    case 'GET_TAB_STATE': {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab) { sendResponse({ found: false }); return; }
        const state = tabState.get(tab.id);
        if (state) {
          sendResponse({ found: true, ...state });
        } else {
          const match = tab.url?.match(/\/recording\/([a-zA-Z0-9_-]+)/);
          if (match) {
            sendResponse({ found: true, meetingId: match[1], token: null, url: tab.url });
          } else {
            sendResponse({ found: false });
          }
        }
      });
      return true;
    }

    case 'FETCH_TRANSCRIPT': {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab) { sendResponse({ success: false, error: 'No active tab found' }); return; }

        chrome.scripting.executeScript(
          { target: { tabId: tab.id }, files: ['content/transcriptFetcher.js'] },
          () => {
            if (chrome.runtime.lastError) { /* already injected — proceed */ }
            chrome.tabs.sendMessage(
              tab.id,
              { type: 'FETCH_TRANSCRIPT', meetingId: message.meetingId, token: message.token },
              (response) => {
                if (chrome.runtime.lastError) {
                  sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                  sendResponse(response);
                }
              }
            );
          }
        );
      });
      return true;
    }

    default:
      break;
  }
});
