// Open the side panel when the toolbar icon is clicked (latest 2026 pattern)
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error);

// Per-tab state key prefix in chrome.storage.session
// storage.session survives worker sleep/restart but clears on browser restart
const stateKey = (tabId) => `tab_${tabId}`;

async function getTabState(tabId) {
  const result = await chrome.storage.session.get([stateKey(tabId)]);
  return result[stateKey(tabId)] ?? null;
}

async function setTabState(tabId, data) {
  await chrome.storage.session.set({ [stateKey(tabId)]: data });
}

async function deleteTabState(tabId) {
  await chrome.storage.session.remove([stateKey(tabId)]);
}

// Enable/disable the side panel based on whether the tab is a Mindtickle page
// and clean up tab state on navigation — combined into one listener
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab.url) {
    const isMindtickle = tab.url.includes('mindtickle.com');
    await chrome.sidePanel.setOptions({ tabId, path: 'index.html', enabled: isMindtickle });
  }
  // Clear cached state on full page load OR SPA URL change
  if (changeInfo.status === 'loading' || changeInfo.url) {
    await deleteTabState(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  deleteTabState(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {

    case 'MINDTICKLE_DETECTED': {
      const tabId = sender.tab?.id;
      if (tabId == null) { sendResponse({}); break; }
      (async () => {
        const prev = await getTabState(tabId);
        const next = {
          meetingId: message.meetingId,
          token:     message.token,
          callTitle: message.callTitle ?? prev?.callTitle ?? null,
          url:       message.url,
        };
        await setTabState(tabId, next);

        if (prev?.meetingId !== message.meetingId) {
          chrome.runtime.sendMessage({
            type: 'MEETING_CHANGED',
            meetingId: message.meetingId,
            token:     message.token,
            callTitle: message.callTitle ?? null,
          }).catch(() => {});
        } else if (message.callTitle && message.callTitle !== prev?.callTitle) {
          chrome.runtime.sendMessage({
            type: 'CALL_TITLE_UPDATED',
            callTitle: message.callTitle,
          }).catch(() => {});
        }

        sendResponse({});
      })();
      return true;
    }

    case 'GET_TAB_STATE': {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const tab = tabs[0];
        if (!tab) { sendResponse({ found: false }); return; }
        const state = await getTabState(tab.id);
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

    case 'REFRESH_CALL_TITLE': {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab) { sendResponse({ callTitle: null }); return; }
        chrome.tabs.sendMessage(tab.id, { type: 'GET_CALL_TITLE' }, (res) => {
          if (chrome.runtime.lastError) { sendResponse({ callTitle: null }); return; }
          const title = res?.callTitle ?? null;
          if (title) {
            getTabState(tab.id).then(state => {
              if (state) setTabState(tab.id, { ...state, callTitle: title });
            });
          }
          sendResponse({ callTitle: title });
        });
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
