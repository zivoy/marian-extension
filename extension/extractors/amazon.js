// importScripts('shared/included-labels.js');

const bookSeriesRegex = /^Book (\d+) of \d+$/i;
// const includedLabels = getIncludedLabels();

const includedLabels = [
    'Author',
    'Narrator',
    'Publisher',
    'Publication date',
    'Audible.com Release Date',
    'Program Type',
    'Language',
    'Print length',
    'Listening Length',
    'ISBN-10',
    'ISBN-13',
    'ASIN',
    'Series',
    'Series Place',
  ];

function getAmazonDetails() {
	console.log('[👩🏻‍🏫 Marian] Extracting Amazon details');

  const imgEl = document.querySelector('#imgBlkFront, #landingImage');
  const bookDetails = getDetailBullets();
  const audibleDetails = getAudibleDetails();

  bookDetails["Edition Format"] = getSelectedFormat() || '';
  bookDetails["Title"] = document.querySelector('#productTitle')?.innerText.trim();
  bookDetails["Description"] = getBookDescription() || '';
  bookDetails["img"] = imgEl?.src ? getHighResImageUrl(imgEl.src) : null;
  
  if (bookDetails["Edition Format"] == "Kindle") {
    bookDetails['Reading Format'] = 'Ebook'; 
  } else if (bookDetails["Edition Format"] == "Audible") {
    bookDetails['Reading Format'] = 'Audiobook';
  } else {
    bookDetails['Reading Format'] = 'Physical Book';
  }
 
  return {
    ...bookDetails,
    ...audibleDetails,
  };
}

function getHighResImageUrl(src) {
  return src.replace(/\._[^.]+(?=\.)/, '');
}

function getDetailBullets() {
  const bullets = document.querySelectorAll('#detailBullets_feature_div li');
  const details = {};

  bullets.forEach(li => {
    // Identify the edition labels, skip if not found
    const labelSpan = li.querySelector('span.a-text-bold');
    if (!labelSpan) return;

    // Clean up label text
    let label = labelSpan.textContent
      .replace(/[\u200E\u200F\u202A-\u202E:\u00A0\uFEFF‎‏]/g, '')
      .replace(':', '')
      .trim();

    // Fetch and clean the value of the detail
    const valueSpan = labelSpan.nextElementSibling;
    let value = valueSpan?.textContent?.replace(/\s+/g, ' ').trim();

    // Handle book series special case
    const match = bookSeriesRegex.exec(label) || bookSeriesRegex.exec(value);
    if (match) {
      details['Series'] = value;
      details['Series Place'] = match[1];
      return;
    }

    // console.log(label, includedLabels.includes(label));
    // Print debug info for labels not included
    // skip if not included in the list
    if (!includedLabels.includes(label)) {
      // console.log(`Label not currently included: "${label}"`);
      return;
    }

    // Final check that both label and value are present
    if (!label || !value) return;

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

function getAudibleDetails() {
  const table = document.querySelector('#audibleProductDetails table');
  if (!table) return {};

  const details = {};
  const rows = table.querySelectorAll('tr');

  rows.forEach(row => {
    const label = row.querySelector('th span')?.textContent?.trim();
    const value = row.querySelector('td')?.innerText?.trim();
    const match = bookSeriesRegex.exec(label) || bookSeriesRegex.exec(value);

    // Handle book series special case
    if (match) {
      details['Series'] = value;
      details['Series Place'] = match[1];
      return;
    }

    // console.log(label, includedLabels.includes(label));
    // Print debug info for labels not included
    // skip if not included in the list
    if (!includedLabels.includes(label)) {
      // console.log(`Label not currently included: "${label}"`);
      return;
    }

    if (label === 'Audible.com Release Date') {
      details['Publication date'] = value;
    } else if (label === 'Program Type') {
      details['Reading Format'] = value;
      details['Edition Format'] = "Audible";
    } else if (label === 'Listening Length') {
      const timeMatch = value.match(/(\d+)\s*hours?\s*(?:and)?\s*(\d+)?\s*minutes?/i);
      if (timeMatch) {
        const arr = [];
        if (timeMatch[1]) arr.push(`${timeMatch[1]} hours`);
        if (timeMatch[2]) arr.push(`${timeMatch[2]} minutes`);
        details['Listening Length'] = arr;
      } else {
        details['Listening Length'] = value;
      }
    } else if (label === 'Narrator' || label === 'Author') {
      // Handle multiple narrators/authors
      const names = value.split(/,\s*|\band\b\s*/).map(name => name.trim());
      details[label] = names.length > 1 ? names : names[0];
    }
     else if (label && value) {
      details[label] = value;
    }
  });

  // Extract image (if available)
  const imgEl = document.querySelector('#audibleProductImage img');
  if (imgEl?.src) {
    details.img = imgEl.src;
  }

  return details;
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

function getSelectedFormat() {
  const selected = document.querySelector('#tmmSwatches .swatchElement.selected .slot-title span[aria-label]');
  if (selected) {
    return selected.getAttribute('aria-label')?.replace(' Format:', '').trim();
  }
  return null;
}

export { getAmazonDetails };
