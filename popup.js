const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const detailsEl = document.getElementById('details');

function copyToClipboard(text, labelEl) {
  navigator.clipboard.writeText(text).then(() => {
    const feedback = document.createElement('span');
    feedback.className = 'feedback';
    feedback.textContent = 'Copied!';
    labelEl.appendChild(feedback);

    setTimeout(() => feedback.remove(), 8000);
  });
}

function getHighResImageUrl(src) {
  return src.replace(/\._[^.]+(?=\.)/, '');
}

function formatDate(dateStr) {
  // Try parsing full date first
  const date = new Date(dateStr);
  if (!isNaN(date)) {
    // Check if input was just a year (4 digits)
    if (/^\d{4}$/.test(dateStr.trim())) {
      return `01/01/${dateStr.trim()}`;
    }
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }

  // If parsing fails, fallback
  return dateStr;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadImage(url, isbn13) {
  const highResUrl = url.replace(/\._[^.]+(?=\.)/, '');
  fetch(highResUrl)
    .then(res => res.blob())
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      // Clean the ISBN to avoid problematic chars in filename
      const safeIsbn = isbn13.replace(/[^a-z0-9]/gi, '');
      a.download = `${safeIsbn}_cover.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    })
    .catch(err => console.error('Image download failed:', err));
}

function toCSV(obj) {
  const keys = Object.keys(obj).filter(k => k !== 'img');
  const values = keys.map(k => `"${obj[k]}"`);
  return keys.join(',') + '\n' + values.join(',');
}

function renderDetails(details) {
  console.log('[Extension] Rendering details:', details);
  const container = document.getElementById('details');

  if (details.img) {
    const sideBySideWrapper = document.createElement('div');
    sideBySideWrapper.style.display = 'flex';
    sideBySideWrapper.style.alignItems = 'flex-start';
    sideBySideWrapper.style.gap = '1rem';

    const img = document.createElement('img');
    img.src = getHighResImageUrl(details.img);
    img.alt = 'Cover Image';
    img.title = 'Click to download';
    img.style.maxWidth = '100px';
    img.style.cursor = 'pointer';
    img.addEventListener('click', () => downloadImage(details.img, details['ISBN-13']));
    sideBySideWrapper.appendChild(img);

    const textWrapper = document.createElement('div');
    textWrapper.style.flex = '1';

    // Title row
    if (details.Title) {
      const titleDiv = document.createElement('div');
      titleDiv.className = 'row';

      const titleLabel = document.createElement('span');
      titleLabel.className = 'label';
      titleLabel.textContent = 'Title:';

      const titleVal = document.createElement('span');
      titleVal.className = 'value title';
      titleVal.textContent = details.Title;
      titleVal.title = 'Click to copy';
      titleVal.style.cursor = 'pointer';
      titleVal.addEventListener('click', () => copyToClipboard(details.title, titleDiv));

      titleDiv.appendChild(titleLabel);
      titleDiv.appendChild(document.createTextNode(' '));
      titleDiv.appendChild(titleVal);
      textWrapper.appendChild(titleDiv);
    }

    // Description row (truncate if needed via CSS)
    if (details.Description) {
      const descDiv = document.createElement('div');
      descDiv.className = 'row';

      const descLabel = document.createElement('span');
      descLabel.className = 'label';
      descLabel.textContent = 'Description:';

      const descVal = document.createElement('span');
      descVal.className = 'value description';
      descVal.textContent = details.Description;
      descVal.title = 'Click to copy';
      descVal.style.cursor = 'pointer';
      descVal.addEventListener('click', () => copyToClipboard(details.Description, descDiv));

      descDiv.appendChild(descLabel);
      descDiv.appendChild(document.createTextNode(' '));
      descDiv.appendChild(descVal);

      textWrapper.appendChild(descDiv);
    }

    sideBySideWrapper.appendChild(textWrapper);
    container.appendChild(sideBySideWrapper);
  }

  // Format date if available
  if (details["Publication date"]) {
    details["Publication date"] = formatDate(details["Publication date"]);
  }

  // Separator below image/title/description block
  const hr = document.createElement('hr');
  container.appendChild(hr);

  const orderedKeys = [
    'Series',
    'Series Place',
    'ISBN-13',
    'ISBN-10',
    'ASIN',
    'Author',
    'Narrator',
    'Publisher',
    'Reading Format',
    'Edition Format',
    'Listening Length',
    'Pages',
    'Publication date',
    'Language'
  ];
  const rendered = new Set();

  orderedKeys.forEach(key => {
    if (key in details) {
      renderRow(container, key, details[key]);
      rendered.add(key);
    }
  });

  Object.entries(details).forEach(([key, value]) => {
    if (key === 'img' || key === 'Title' || key === 'Description' || rendered.has(key)) return;
        renderRow(container, key, value);
  });
}

function renderRow(container, key, value) {
  const div = document.createElement('div');
  div.className = 'row';

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = (key === 'title') ? 'Title:' : `${key}:`;

  div.appendChild(label);
  div.appendChild(document.createTextNode(' '));

  if (Array.isArray(value)) {
    value.forEach(item => {
      const itemSpan = document.createElement('span');
      itemSpan.className = 'value';
      itemSpan.textContent = item;
      itemSpan.title = 'Click to copy';
      itemSpan.style.cursor = 'pointer';
      if (key === 'Listening Length') {
        // Only copy the number part (e.g., "9" from "9 Hours")
        const numberMatch = item.match(/\d+/);
        const numberOnly = numberMatch ? numberMatch[0] : item;
        itemSpan.addEventListener('click', () => copyToClipboard(numberOnly, div));
      } else {
        itemSpan.addEventListener('click', () => copyToClipboard(item, div));
      }

      div.appendChild(itemSpan);
      
      if (item !== value[value.length - 1]) {
        if (key === 'Author' || key === 'Narrator') {
          div.appendChild(document.createTextNode(', ')); // comma between authors/narrators
        } else {
          div.appendChild(document.createTextNode(' ')); // space between items
        }
      }
    });
  } else {
    const val = document.createElement('span');
    val.className = 'value';
    val.textContent = value;
    val.title = 'Click to copy';
    if (key === 'Description') {
      val.classList.add('description');
    }
    val.addEventListener('click', () => copyToClipboard(value, div));
    div.appendChild(val);
  }

  container.appendChild(div);
}


function showLoading() {
  loadingEl.style.display = 'block';
  errorEl.style.display = 'none';
  detailsEl.style.display = 'none';
}

function showError(message) {
  loadingEl.style.display = 'none';
  errorEl.textContent = message;
  errorEl.style.display = 'block';
  detailsEl.style.display = 'none';
}

function showDetails() {
  loadingEl.style.display = 'none';
  errorEl.style.display = 'none';
  detailsEl.style.display = 'block';
}

// Polling function to try multiple times before giving up
function tryGetDetails(retries = 8, delay = 300) {
  return new Promise((resolve, reject) => {
    function attempt(remaining) {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (!tab?.id) {
          reject('No active tab found.');
          return;
        }

        chrome.tabs.sendMessage(tab.id, 'ping', (response) => {
          if (chrome.runtime.lastError || response !== 'pong') {
            if (remaining > 0) {
              setTimeout(() => attempt(remaining - 1), delay);
            } else {
              chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
                if (tab?.id) chrome.tabs.reload(tab.id);
              });
              setTimeout(() => location.reload(), 1500);
              reject('Content script not ready or unavailable. Refreshing Page...');
            }
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

document.addEventListener("DOMContentLoaded", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    const url = tab?.url || "";

    if (!isAllowedUrl(url)) {
      showError("This extension only works on supported product pages.");
      return;
    }

    showLoading();

    tryGetDetails()
      .then(details => {
        showDetails();
        renderDetails(details);
      })
      .catch(err => {
        showError(err);
      });
  });
});