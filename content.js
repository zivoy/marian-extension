function getDetailBullets() {
  const bullets = document.querySelectorAll('#detailBullets_feature_div li');
  const details = {};

  const excludeStarts = ['Best Sellers Rank', 'Customer Reviews'];
  const excludeExact = ['Item Weight', 'Reading age', 'Dimensions', 'Grade level', 'Lexile measure',
    'Accessibility', 'Screen Reader', 'Enhanced typesetting', 'X-Ray', 'Word Wise', 'Page Flip', 'File size'
  ];

  const bookSeriesRegex = /^Book (\d+) of \d+$/i;

  bullets.forEach(li => {
    const labelSpan = li.querySelector('span.a-text-bold');
    if (!labelSpan) return;

    let label = labelSpan.textContent
      .replace(/[\u200E\u200F\u202A-\u202E:\u00A0\uFEFF‎‏]/g, '')
      .replace(':', '')
      .trim();

    if (
      excludeExact.includes(label) ||
      excludeStarts.some(prefix => label.startsWith(prefix))
    ) return;

    const valueSpan = labelSpan.nextElementSibling;
    let value = valueSpan?.textContent?.replace(/\s+/g, ' ').trim();

    if (!label || !value) return;

    // Handle book series special case
    const match = bookSeriesRegex.exec(label) || bookSeriesRegex.exec(value);
    if (match) {
      details['Series'] = value;
      details['Series Place'] = match[1];
      return;
    }

    // Rename "Print length" to "Pages" and extract number only
    if (label === 'Print length') {
      label = 'Pages';
      const pageMatch = value.match(/\d+/);
      value = pageMatch ? pageMatch[0] : value;
    }

    details[label] = value;
  });

  return details;
}


function getDetails() {
  const title = document.querySelector('#productTitle')?.innerText.trim();
  const imgEl = document.querySelector('#imgBlkFront, #landingImage');
  const img = imgEl?.src ? getHighResImageUrl(imgEl.src) : null;

  const bookDetails = getDetailBullets();
  const audibleDetails = getAudibleDetails();
  const format = getSelectedFormat() || '';
  const description = getBookDescription() || '';

  return {
    title,
    img,
    Description: description,
    Format: format,
    ...bookDetails,
    ...audibleDetails,
  };
}



function getAudibleDetails() {
  const table = document.querySelector('#audibleProductDetails table');
  if (!table) return {};

  const details = {};
  const rows = table.querySelectorAll('tr');

  rows.forEach(row => {
    const label = row.querySelector('th span')?.textContent?.trim();
    const value = row.querySelector('td')?.innerText?.trim();

    if (
      label && value &&
      !label.startsWith('Best Sellers Rank') &&
      !['Listening Length', 'Program Type', 'Version'].includes(label)
    ) {
      if (label === 'Audible.com Release Date') {
        details['Publication date'] = value;
      } else {
        details[label] = value;
      }
    }
  });

  // Extract image (if available)
  const imgEl = document.querySelector('#audibleProductImage img');
  if (imgEl?.src) {
    details.img = imgEl.src;
  }

  return details;
}

function getHighResImageUrl(src) {
  return src.replace(/\._[^.]+(?=\.)/, '');
}

function getSelectedFormat() {
  const selected = document.querySelector('#tmmSwatches .swatchElement.selected .slot-title span[aria-label]');
  if (selected) {
    return selected.getAttribute('aria-label')?.replace(' Format:', '').trim();
  }
  return null;
}

function getBookDescription() {
  const container = document.querySelector('#bookDescription_feature_div .a-expander-content');
  if (!container) return '';
  
  // Get all text from inside the description, ignoring tags like <br>
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
  let text = '';
  while (walker.nextNode()) {
    text += walker.currentNode.nodeValue;
  }
  
  return text.trim().replace(/\s+/g, ' ');
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

console.log('[Extension] content.js loaded');