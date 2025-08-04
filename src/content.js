import { getAmazonDetails } from './extractors/amazon.js';
import { getGoodreadsDetails } from './extractors/goodreads.js';
import { getStoryGraphDetails } from './extractors/storygraph.js';
import { logMarian } from './shared/utils.js';


async function getDetails() {
  const url = window.location.href;
  logMarian(`[👩🏻‍🏫 Marian] Current URL: ${url}`);
  if (url.includes('amazon.com')) return await getAmazonDetails();
  if (url.includes('goodreads.com')) return await getGoodreadsDetails();
  if (url.includes('thestorygraph.com')) return await getStoryGraphDetails();
  if (url.includes('isbnsearch.org')) return await getIsbnSearchDetails();
  return {};
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg === 'ping') {
    sendResponse('pong');
  }

  if (msg === 'getDetails') {
    const send = async () => {
      const details = await getDetails();
      sendResponse(details);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', send);
    } else {
      send();
    }

    // Important: keep the message channel open for async response
    return true;
  }
});

console.log('[👩🏻‍🏫 Marian] content.js loaded');