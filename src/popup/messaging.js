// TODO: try to not have this be imported to reduce output side
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

// Polling function to try multiple times before giving up
export function tryGetDetails(retries = 8, delay = 300) {
  let injectRefresh = false;

  return new Promise((resolve, reject) => {
    function attempt(remaining) {
      // NOTE: can this be taken out one layer so that you can start the scrape and switch tab?
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (!tab?.id) {
          reject('No active tab found.');
          return;
        }

        if (tab.status !== 'complete') {
          console.log('Tab is still loading, delaying content-script ping...');
          setTimeout(() => attempt(remaining), delay);
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
          } else {
            // FIXME: this is causing the scraping to happen more then once
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js']
            }, () => {
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
            });
            return;
          }
        }

        chrome.tabs.sendMessage(tab.id, 'ping', (response) => {
          console.log('Ping response:', response, 'Remaining attempts:', remaining);
          if (chrome.runtime.lastError || response !== 'pong') {
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

          chrome.tabs.sendMessage(tab.id, 'getDetails', (details) => {
            if (chrome.runtime.lastError || !details) {
              reject('Failed to retrieve book details.');
              return;
            }
            resolve(details);
          });
        });
      });
    }
    attempt(retries);
  });
}
