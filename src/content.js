import { getExtractor } from './extractors';
import { logMarian, validate } from './shared/utils.js';


async function getDetails() {
  const url = window.location.href;
  logMarian(`Current URL: ${url}`);
  const extractor = getExtractor(url);
  if (extractor == undefined) return null;

  logMarian(`Getting details from ${extractor}`)
  return await extractor.getDetails()
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg === 'ping') {
    sendResponse('pong');
  }

  if (msg === 'getDetails') {
    const send = async () => {
      try {
        const details = await getDetails();

        // validate required fields are of correct types
        validate(schema, details);

        sendResponse(details);
      } catch (e) {
        logMarian("Error getting info", e);
        sendResponse(null);
      }
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

const schema = {
  type: {
    // Images
    img: { type: String, optional: true },
    imgScore: { type: Number, optional: true },

    // Basic Info
    Title: String,
    Description: { type: String, optional: true },

    // Series
    Series: { type: String, optional: true },
    "Series Place": { type: String, optional: true },

    // Publishing
    "Publication date": { type: [String, Date], optional: true },
    // "Publication date": { type: Date, optional: true }, 

    "Publisher": { type: String, optional: true },
    "Language": { type: String, optional: true },

    // Identifiers
    "ISBN-10": { type: String, optional: true },
    "ISBN-13": { type: String, optional: true },
    "ASIN": { type: String, optional: true },

    // Mappings & Contributors
    Mappings: { type: Object, valueType: [String, [String]], optional: true },
    Contributors: {
      type: [{
        name: String,
        roles: [String]
      }],
      optional: true
    },

    // Format Details
    "Reading Format": { type: String, optional: true },
    "Listening Length": { type: String, optional: true },
    "Pages": { type: [String, Number], optional: true },
    // "Pages": { type: Number, optional: true },

    "Edition Format": { type: String, optional: true },
    "Edition Information": { type: String, optional: true },
  },
  optional: true
}

console.log('[👩🏻‍🏫 Marian] content.js loaded');
