import { isAllowedUrl } from "./shared/allowed-patterns";

const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const detailsEl = document.getElementById('details');

function copyToClipboard(text, labelEl) {
  navigator.clipboard.writeText(text).then(() => {
    // Remove any existing feedback first
    const existing = labelEl.querySelector('.feedback');
    if (existing) existing.remove();

    const feedback = document.createElement('span');
    feedback.className = 'feedback';
    feedback.textContent = 'Copied!';
    labelEl.appendChild(feedback);

    setTimeout(() => feedback.remove(), 2000);
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

function downloadImage(url, bookId) {
  const highResUrl = url.replace(/\._[^.]+(?=\.)/, '');
  fetch(highResUrl)
    .then(res => res.blob())
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      // Clean the ISBN to avoid problematic chars in filename
      const safeId = bookId.replace(/[^a-z0-9]/gi, '');
      a.download = `${safeId}_cover.jpg`;
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
  container.innerHTML = ""; // safety clear 

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
    img.addEventListener('click', () => {
      const fallbackId =
        details['ISBN-13'] ||
        details['ISBN-10'] ||
        details['ASIN'] ||
        details['Source ID'] ||
        details['Title'] ||
        Date.now();
      downloadImage(details.img, fallbackId);
    });

    const imgWrapper = document.createElement('div');
    imgWrapper.style.display = 'flex';
    imgWrapper.style.flexDirection = 'column';
    imgWrapper.style.alignItems = 'center';
    imgWrapper.style.position = 'relative';
    imgWrapper.style.maxWidth = '100px';

    imgWrapper.appendChild(img);

    if (details.imgScore && typeof details.imgScore === 'number') {
      const label = document.createElement('span');
      label.className = 'img-score-label';
      label.textContent = details.imgScore.toLocaleString();

      if (details.imgScore < 33000) {
        label.style.background = '#c0392b';
        label.title = 'Low resolution (ex: 133 x 200)';
        label.textContent = 'Poor';
      } else if (details.imgScore < 100000) {
        label.style.background = '#f39c12';
        label.title = 'Medium resolution (ex: 200 x 300)';
        label.textContent = 'Medium';
      } else {
        label.style.background = '#27ae60';
        label.title = 'High resolution (ex: 300 x 450)';
        label.textContent = 'High';
      }

      imgWrapper.appendChild(label);
    }

    sideBySideWrapper.appendChild(imgWrapper);

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
      // fix: use Title with capital T
      titleVal.addEventListener('click', () => copyToClipboard(details.Title, titleDiv));

      titleDiv.appendChild(document.createTextNode(' '));
      titleDiv.appendChild(titleVal);
      textWrapper.appendChild(titleDiv);
    }

    // Description row
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

      descDiv.appendChild(document.createTextNode(' '));
      descDiv.appendChild(descVal);
      textWrapper.appendChild(descDiv);
    }

    sideBySideWrapper.appendChild(textWrapper);
    container.appendChild(sideBySideWrapper);
  }

  // ===== NEW: Series + Series Place block under the header =====
  if (details.Series || details['Series Place']) {
    const metaTop = document.createElement('div');
    // style to sit a bit under the header block
    metaTop.style.margin = '8px 0 0 0';

    if (details.Series) {
      renderRow(metaTop, 'Series', details.Series);
    }
    if (details['Series Place']) {
      renderRow(metaTop, 'Series Place', details['Series Place']);
    }

    container.appendChild(metaTop);
  }
  // =============================================================

  // Format date if available
  if (details["Publication date"]) {
    details["Publication date"] = formatDate(details["Publication date"]);
  }

  // Separator below image/title/description + metaTop block
  const hr = document.createElement('hr');
  container.appendChild(hr);

  // Render details in a way that reflects the order of a Hardcover Edition edit form
  // NOTE: 'Series' and 'Series Place' were moved up, so we exclude them here
  const orderedKeys = [
    // 'Series',
    // 'Series Place',
    'ISBN-13',
    'ISBN-10',
    'ASIN',
    'Source ID',
    'Contributors',
    'Publisher',
    'Reading Format',
    'Edition Format',
    'Listening Length',
    'Pages',
    'Publication date',
    'Language'
  ];

  const rendered = new Set(['Series', 'Series Place']); // mark as already rendered
  orderedKeys.forEach(key => {
    if (key in details) {
      renderRow(container, key, details[key]);
      rendered.add(key);
    }
  });

  // Filter out keys that shouldn't be rendered in the generic loop
  const filteredKeys = [
    'img',
    'imgScore',
    'Title',
    'Description',
  ];

  // Render remaining keys that weren't in the ordered list
  Object.entries(details).forEach(([key, value]) => {
    if (filteredKeys.includes(key) || rendered.has(key)) return;
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
    // Special handling for Contributors: array of objects with name/roles[]
    if (key === 'Contributors' && value.length && typeof value[0] === 'object' && Array.isArray(value[0].roles)) {
      value.forEach((contributor, idx) => {
        // Name span
        const nameSpan = document.createElement('span');
        nameSpan.className = 'value contributor-name';
        nameSpan.textContent = contributor.name;
        nameSpan.title = 'Click to copy name';
        nameSpan.style.cursor = 'pointer';
        nameSpan.addEventListener('click', () => copyToClipboard(contributor.name, div));
        div.appendChild(nameSpan);

        div.appendChild(document.createTextNode(' ('));

        // Roles, each clickable
        contributor.roles.forEach((role, roleIdx) => {
          const roleSpan = document.createElement('span');
          roleSpan.className = 'value contributor-role';
          roleSpan.textContent = role;
          roleSpan.title = 'Click to copy role';
          roleSpan.style.cursor = 'pointer';
          roleSpan.addEventListener('click', () => copyToClipboard(role, div));
          div.appendChild(roleSpan);

          if (roleIdx !== contributor.roles.length - 1) {
            div.appendChild(document.createTextNode(', '));
          }
        });

        div.appendChild(document.createTextNode(')'));

        if (idx !== value.length - 1) {
          div.appendChild(document.createTextNode(', '));
        }
      });
    } else {
      value.forEach(item => {
        const itemSpan = document.createElement('span');
        itemSpan.className = 'value';
        itemSpan.textContent = item;
        itemSpan.title = 'Click to copy';
        itemSpan.style.cursor = 'pointer';
        if (key === 'Listening Length') {
          const numberMatch = item.match(/\d+/);
          const numberOnly = numberMatch ? numberMatch[0] : item;
          itemSpan.addEventListener('click', () => copyToClipboard(numberOnly, div));
        } else {
          itemSpan.addEventListener('click', () => copyToClipboard(item, div));
        }
        div.appendChild(itemSpan);

        if (item !== value[value.length - 1]) {
          if (key === 'Author' || key === 'Narrator') {
            div.appendChild(document.createTextNode(', '));
          } else {
            div.appendChild(document.createTextNode(' '));
          }
        }
      });
    }
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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "ping") {
    sendResponse("pong");
    return;
  }

  if (msg.type === "REFRESH_SIDEBAR" && msg.url && isAllowedUrl(msg.url)) {
    showLoading();
    tryGetDetails()
      .then(details => {
        showDetails();
        detailsEl.innerHTML = ""; // clear previous content
        renderDetails(details);
      })
      .catch(err => {
        showError(err);
      });
  }
});

