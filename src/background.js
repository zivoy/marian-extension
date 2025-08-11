import { isAllowedUrl } from "./shared/allowed-patterns";

function updateIcon(tabId, isAllowed) {
  chrome.action.setIcon({
    tabId,
    path: isAllowed
      ? { 128: "icons/icon.png" }
      : { 128: "icons/icon-disabled.png" }
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.url) return;
  updateIcon(tabId, isAllowedUrl(tab.url));
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (!tab?.url) return;
    updateIcon(tabId, isAllowedUrl(tab.url));
  });
});

function openSidebar(tab) {
  if (typeof chrome.sidePanel !== "undefined" && chrome.sidePanel.open) {
    // Chrome Side Panel API
    chrome.sidePanel.open({ windowId: tab.windowId });
  } else if (chrome.sidebarAction && chrome.sidebarAction.open) {
    // Firefox Sidebar API
    chrome.sidebarAction.open();
  } else {
    console.warn("No native sidebar API available.");
  }
}

// ---- NEW: Send message when sidebar is ready ----
function sendWhenReady(msg, retries = 10, delay = 150) {
  function attempt(remaining) {
    chrome.runtime.sendMessage({ type: "ping" }, (response) => {
      if (response === "pong") {
        chrome.runtime.sendMessage(msg);
      } else if (remaining > 0) {
        setTimeout(() => attempt(remaining - 1), delay);
      }
    });
  }
  attempt(retries);
}

chrome.action.onClicked.addListener((tab) => {
  if (!tab?.url || !isAllowedUrl(tab.url)) {
    console.warn("Sidebar not available for this page:", tab?.url);
    return;
  }
  openSidebar(tab);
  setTimeout(() => {
    sendWhenReady({ type: "REFRESH_SIDEBAR", url: tab.url });
  }, 300); // give the sidebar a moment to load
});
