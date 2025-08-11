import { isAllowedUrl } from "./shared/allowed-patterns";

function updateIcon(tabId, isAllowed) {
  chrome.action.setIcon({
    tabId,
    path: isAllowed
      ? { 128: "icons/icon.png" }
      : { 128: "icons/icon-disabled.png" }
  });
}

// Update icon when tabs change
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

// Always open and refresh sidebar
chrome.action.onClicked.addListener((tab) => {
  if (chrome.sidePanel?.open) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  } else if (chrome.sidebarAction?.open) {
    chrome.sidebarAction.open();
  }

  chrome.runtime.sendMessage({
    type: "REFRESH_SIDEBAR",
    url: tab.url
  });
});
