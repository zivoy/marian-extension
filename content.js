function getDetailBullets() {
  const bullets = document.querySelectorAll('#detailBullets_feature_div li');
  const details = {};

  const excludeStarts = ['Best Sellers Rank', 'Customer Reviews'];
  const excludeExact = ['Item Weight', 'Reading age', 'Dimensions', 'Grade level', 'Lexile measure'];

  bullets.forEach(li => {
    const labelSpan = li.querySelector('span.a-text-bold');
    if (!labelSpan) return;

    const label = labelSpan.textContent
      .replace(/[\u200E\u200F\u202A-\u202E:\u00A0\uFEFF‎‏]/g, '')
      .replace(':', '')
      .trim();

    if (
      excludeExact.includes(label) ||
      excludeStarts.some(prefix => label.startsWith(prefix))
    ) return;

    const valueSpan = labelSpan.nextElementSibling;
    const value = valueSpan?.textContent?.replace(/\s+/g, ' ').trim();

    if (label && value) {
      details[label] = value;
    }
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

  let allDetails = {
    title,
    img,
    Description: description,
    Format: format,
    ...bookDetails,
    ...audibleDetails,
  };

  const priorityKeys = [
    'img',
    'title',
    'Description',
    'ISBN-13',
    'ISBN-10',
    'ASIN',
    // 'Author(s)',
    'Publisher',
    'Format',
    'Print length',
    'Publication date',
    'Language'
  ];

  const ordered = {};
  for (const key of priorityKeys) {
    if (allDetails[key]) {
      ordered[key] = allDetails[key];
      delete allDetails[key];
    }
  }

  return { ...ordered, ...allDetails };
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


chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg === 'getDetails') {
    respond(getDetails());
  }
});

console.log('[Extension] content.js loaded');

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
  const descEl = document.querySelector('#bookDescription_feature_div .a-expander-content span');
  return descEl?.textContent.trim() || null;
}
