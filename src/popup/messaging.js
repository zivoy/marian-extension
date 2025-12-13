import { getExtractor } from "../extractors/index.js";
import { showStatus } from "./ui.js";

function buildIssueUrl(tabUrl) {
  const domain = new URL(tabUrl).hostname.replace(/^www\./, '');
  const title = `Unsupported URL detected on ${domain}`;
  const body = [
    'This page is not currently supported by Marian:',
    '',
    tabUrl,
    '',
    '**Steps to reproduce:**',
    '1. Open the above URL with the extension installed',
    '2. Open the extension sidebar',
    '3. See that details are not loaded',
    '',
    '**Expected behavior:**',
    'Details should load for supported product pages.'
  ].join('\n');

  return 'https://github.com/jacobtender/marian-extension/issues/new'
    + `?title=${encodeURIComponent(title)}`
    + `&body=${encodeURIComponent(body)}`
    + `&labels=${encodeURIComponent('bug')}`;
}

/**
 * Gets the current active tab
 * 
 * @returns {Promise<chrome.tabs.Tab | undefined>} A promise that resolves to the active tab object, or undefined if no active tab is found.
 */
export async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/**
  * Polling function to try multiple times before giving up
  *
  * @param {chrome.tabs.Tab} tab 
  * @param {number} [retries=8] number of time to retry
  * @param {number} [delay=300] delay in ms
  * @returns {Promise<{tab: any, details: Record<string,any>}>}
  */
export async function tryGetDetails(tab, retries = 8, delay = 300) {
  let injectRefresh = false;

  return await new Promise((resolve, reject) => {
    if (!tab?.id) {
      reject('No active tab found.');
      return;
    }

    async function attempt(remaining) {
      tab = await waitForTabToComplete(tab.id)

      const pingResp = await chrome.tabs.sendMessage(tab.id, 'ping').catch(() => undefined);
      console.log('Ping response:', pingResp, 'Remaining attempts:', remaining);
      const pingFail = chrome.runtime.lastError || pingResp !== 'pong';

      if (pingFail && injectRefresh) {
        if (chrome.runtime.lastError) {
          console.error('Content script not ready:', chrome.runtime.lastError.message);
        }

        if (remaining > 0) {
          setTimeout(() => attempt(remaining - 1), delay);
          return;
        }

        console.log('All attempts exhausted. Content script not responding.');
        const issueUrl = buildIssueUrl(tab?.url || '(unknown URL)');
        reject(`
This site is supported, but either this page isn't yet or you've encountered an error.<br/><br/>
Please <a href="${issueUrl}" target="_blank" rel="noopener noreferrer">report</a> the full URL of this page so we can add support!
`);
        return;
      }

      const extractor = getExtractor(tab?.url || "");
      const wantsReload = extractor != undefined && extractor.needsReload;

      if (!injectRefresh) {
        injectRefresh = true;
        if (wantsReload) {
          // showStatus("Content script not ready, refreshing tab...");
          chrome.tabs.reload(tab.id, { bypassCache: true }); // issue might be here
          showStatus("Tab reloaded, fetching details...");

          const onUpdated = (updatedTabId, info) => {
            if (updatedTabId === tab.id && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(onUpdated);
              console.log(retries, 'Tab reloaded, fetching details again...');
              setTimeout(() => attempt(retries), 350);
            }
          };
          chrome.tabs.onUpdated.addListener(onUpdated);
          return;
        } else if (pingFail) { // only inject if pinging failed
          console.log("injecting new script");
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          }).catch();
          const error = chrome.runtime.lastError;

          if (error) {
            console.error("Script injection failed: ", error.message);
            showStatus("Cannot access this page.");
            return;
          }

          showStatus("Script injected, retrying...");

          // Wait a tiny bit for the script to initialize listeners, then retry
          setTimeout(() => {
            console.log(retries, 'Script injected manually, retrying...');
            attempt(retries);
          }, 100);
          return;
        }
      }

      chrome.tabs.sendMessage(tab.id, 'getDetails', (details) => {
        if (chrome.runtime.lastError || !details) {
          reject('Failed to retrieve book details.');
          return;
        }
        resolve(details);
      });
    }
    attempt(retries);
  });
}

/**
 * Waits for a specific tab to reach the 'complete' status.
 *
 * This function first checks the current status of the tab. If it is already
 * complete, it resolves immediately. Otherwise, it sets up a one-time listener
 * on `chrome.tabs.onUpdated` to resolve when the status changes to 'complete'.
 *
 * @param {number} tabId - The unique ID of the tab to wait for.
 * @returns {Promise<chrome.tabs.Tab>} A promise that resolves with the fully loaded Tab object.
 */
function waitForTabToComplete(tabId) {
  return new Promise((resolve) => {
    // get the current status just in case it finished loading
    chrome.tabs.get(tabId, (tab) => {
      if (tab.status === 'complete') {
        resolve(tab);
      } else {
        // not complete, wait for the "complete" update
        function listener(updatedTabId, changeInfo, updatedTab) {
          if (updatedTabId === tabId && changeInfo.status === 'complete') {
            // clean up
            chrome.tabs.onUpdated.removeListener(listener);
            resolve(updatedTab);
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
      }
    });
  });
}
