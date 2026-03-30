// Open the side panel when the toolbar icon is clicked (latest 2026 pattern)
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error);

// Per-tab state: { meetingId, token, callTitle, url }
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
  // Clear cached state on full page load OR SPA URL change
  if (changeInfo.status === 'loading' || changeInfo.url) {
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
      const prev = tabState.get(tabId);
      tabState.set(tabId, {
        meetingId: message.meetingId,
        token: message.token,
        callTitle: message.callTitle ?? prev?.callTitle ?? null,
        url: message.url,
      });
      // Notify the side panel when a different call is detected or title arrives
      if (prev?.meetingId !== message.meetingId) {
        chrome.runtime.sendMessage({
          type: 'MEETING_CHANGED',
          meetingId: message.meetingId,
          token: message.token,
          callTitle: message.callTitle ?? null,
        }).catch(() => {}); // side panel may not be open — ignore
      } else if (message.callTitle && message.callTitle !== prev?.callTitle) {
        // Same call but title just became available — notify panel
        chrome.runtime.sendMessage({
          type: 'CALL_TITLE_UPDATED',
          callTitle: message.callTitle,
        }).catch(() => {});
      }
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
            sendResponse({ found: true, meetingId: match[1], token: null, callTitle: null, url: tab.url });
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
