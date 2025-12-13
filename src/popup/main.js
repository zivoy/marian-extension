import { isAllowedUrl } from "../extractors";
import { tryGetDetails, getCurrentTab } from "./messaging.js";
import {
  showStatus, showDetails, renderDetails, initSidebarLogger,
  addRefreshButton, updateRefreshButtonForUrl
} from "./ui.js";
import { setLastFetchedUrl } from "./utils.js";

const DEBUG = false;
let sidebarWindowId = null;

function rememberWindowId(windowInfo) {
  if (windowInfo && typeof windowInfo.id === "number") {
    sidebarWindowId = windowInfo.id;
  }
}

function notifyBackground(type, params = {}) {
  if (type === "SIDEBAR_UNLOADED" && typeof sidebarWindowId === "number") {
    chrome.runtime.sendMessage({ type, windowId: sidebarWindowId }, () => {
      void chrome.runtime.lastError;
    });
    return;
  }

  chrome.windows.getCurrent((windowInfo) => {
    rememberWindowId(windowInfo);
    const windowId = typeof sidebarWindowId === "number" ? sidebarWindowId : windowInfo?.id;
    chrome.runtime.sendMessage({ type, windowId, ...params }, () => {
      // ignore missing listeners; background may be sleeping in some contexts
      void chrome.runtime.lastError;
    });
  });
}

function isForThisSidebar(messageWindowId) {
  if (typeof messageWindowId !== "number") return true;
  if (typeof sidebarWindowId !== "number") return false;
  return messageWindowId === sidebarWindowId;
}

document.addEventListener("DOMContentLoaded", () => {
  notifyBackground("SIDEBAR_READY");
  window.addEventListener("pagehide", () => notifyBackground("SIDEBAR_UNLOADED"));

  chrome.windows.getCurrent(rememberWindowId);

  if (DEBUG) initSidebarLogger(); // DEBUG: Initialize sidebar logger

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    const url = tab?.url || "";

    updateRefreshButtonForUrl(url);

    if (!isAllowedUrl(url)) {
      showStatus("This extension only works on supported product pages.");
      return;
    }

    showStatus("DOM Loaded, fetching details...");
  });
});

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg === "ping" || msg?.type === "ping") {
    sendResponse("pong");
    return;
  }

  if (msg?.type === "SIDEBAR_PING") {
    if (isForThisSidebar(msg.windowId)) {
      sendResponse("pong");
    }
    return;
  }

  if (msg.type === "REFRESH_SIDEBAR" && isForThisSidebar(msg.windowId) && msg.url && isAllowedUrl(msg.url)) {
    showStatus("Loading details...");
    let tab = await getCurrentTab();
    tryGetDetails(tab)
      .then((details) => {
        showDetails();
        const detailsEl = document.getElementById('details');
        if (detailsEl) detailsEl.innerHTML = "";
        renderDetails(details);

        addRefreshButton(async () => {
          showStatus("Refreshing...");
          tab = await getCurrentTab();
          try {
            const details = tryGetDetails(tab)
            showDetails();
            renderDetails(details);
          } catch (err) {
            notifyBackground("REFRESH_ICON", { tab });
            showStatus(err);
          };
        });

        setLastFetchedUrl(tab?.url || "");
        chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
          updateRefreshButtonForUrl(activeTab?.url || "");
        });
      })
      .catch(err => {
        showStatus(err);
        notifyBackground("REFRESH_ICON", { tab });
      });
  }

  if (msg.type === "TAB_URL_CHANGED" && isForThisSidebar(msg.windowId)) {
    updateRefreshButtonForUrl(msg.url);
  }
});
