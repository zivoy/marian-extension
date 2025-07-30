import { getAmazonDetails } from './extractors/amazon.js';
import { getGoodreadsDetails } from './extractors/goodreads.js';
import { getStoryGraphDetails } from './extractors/storygraph.js';


function getDetails() {
  const url = window.location.href;
  console.log(`[👩🏻‍🏫 Marian] Current URL: ${url}`);
  if (url.includes('amazon.com')) return getAmazonDetails();
  if (url.includes('goodreads.com')) return getGoodreadsDetails();
  if (url.includes('thestorygraph.com')) return getStoryGraphDetails();
  if (url.includes('isbnsearch.org')) return getIsbnSearchDetails();
  return {};
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg === 'ping') {
    sendResponse('pong');
  }

  if (msg === 'getDetails') {
    // Make sure page is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        sendResponse(getDetails());
      });
      // Required for asynchronous response
      return true;
    } else {
      sendResponse(getDetails());
    }
  }
});

console.log('[👩🏻‍🏫 Marian] content.js loaded');