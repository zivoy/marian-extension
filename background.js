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

importScripts('shared/allowed-patterns.js');

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
