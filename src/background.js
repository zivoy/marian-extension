import { isAllowedUrl } from "./shared/allowed-patterns";

function updateIcon(tabId, isAllowed) {
  // console.log(`Updating icon for tab ${tabId}: ${isAllowed ? 'allowed' : 'not allowed'}`);
  chrome.action.setIcon({
    tabId,
    path: isAllowed
      ? {
        128: "icons/icon.png"
      }
      : {
        128: "icons/icon-disabled.png",
      }
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
    // Chrome with Side Panel API
    chrome.sidePanel.open({ windowId: tab.windowId });
  } else if (chrome.sidebarAction && chrome.sidebarAction.open) {
    // Firefox Sidebar Action API
    chrome.sidebarAction.open();
  } else {
    console.warn("No native sidebar API available.");
  }
}

chrome.action.onClicked.addListener((tab) => {
  openSidebar(tab);
});
