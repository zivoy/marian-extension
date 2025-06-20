function copyToClipboard(text, labelEl) {
  navigator.clipboard.writeText(text).then(() => {
    const feedback = document.createElement('span');
    feedback.className = 'feedback';
    feedback.textContent = 'Copied!';
    labelEl.appendChild(feedback);

    setTimeout(() => feedback.remove(), 1000);
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
  console.log('Received details:', details);
  const container = document.getElementById('details');

  // Create a flex wrapper for image + buttons
  const headerDiv = document.createElement('div');
  headerDiv.style.display = 'flex';
  headerDiv.style.alignItems = 'center';
  headerDiv.style.gap = '10px'; // space between image and buttons
  container.appendChild(headerDiv);

  if (details.img) {
    const img = document.createElement('img');
    img.src = getHighResImageUrl(details.img);
    img.alt = 'Cover Image';
    img.title = 'Click to download';
    img.style.maxWidth = '100px';
    img.style.height = 'auto';
    img.style.cursor = 'pointer';
    img.addEventListener('click', () => downloadImage(getHighResImageUrl(details.img), details['ISBN-13']));
    headerDiv.appendChild(img);
  }

  // Buttons container beside image
  const buttonsDiv = document.createElement('div');
  buttonsDiv.style.display = 'flex';
  buttonsDiv.style.flexDirection = 'row';
  buttonsDiv.style.gap = '10px';
  headerDiv.appendChild(buttonsDiv);

  const jsonBtn = document.createElement('button');
  jsonBtn.id = 'download-json';
  jsonBtn.textContent = 'Download JSON';
  buttonsDiv.appendChild(jsonBtn);

  const csvBtn = document.createElement('button');
  csvBtn.id = 'download-csv';
  csvBtn.textContent = 'Download CSV';
  buttonsDiv.appendChild(csvBtn);

  if (details["Publication date"]) {
    details["Publication date"] = formatDate(details["Publication date"]);
  }

  Object.entries(details).forEach(([key, value]) => {
    if (key === 'img') return;

    const div = document.createElement('div');
    div.className = 'row';

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = (key === 'title') ? 'Title:' : `${key}:`;

    const val = document.createElement('span');
    val.className = 'value';
    val.textContent = value;
    val.title = 'Click to copy';
    val.addEventListener('click', () => copyToClipboard(value, div));

    div.appendChild(label);
    div.appendChild(document.createTextNode(' '));
    div.appendChild(val);
    container.appendChild(div);
  });

  // Attach event listeners for buttons
  jsonBtn.addEventListener('click', () => {
    downloadFile('book-details.json', JSON.stringify(details, null, 2), 'application/json');
  });

  csvBtn.addEventListener('click', () => {
    downloadFile('book-details.csv', toCSV(details), 'text/csv');
  });
}


chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  chrome.tabs.sendMessage(tab.id, 'getDetails', renderDetails);
});
