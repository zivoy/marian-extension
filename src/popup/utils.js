export function normalizeUrl(u) {
  try {
    const x = new URL(u);
    // Preserve key product identifiers when the format is encoded in query params.
    const keepParams = ['ean', 'isbn', 'upc'];
    const kept = keepParams
      .filter((key) => x.searchParams.has(key))
      .map((key) => `${key}=${x.searchParams.get(key)}`);
    const suffix = kept.length ? `?${kept.join('&')}` : '';
    return `${x.origin}${x.pathname}${suffix}`;
  } catch {
    return u || '';
  }
}

let __lastFetchedNorm = '';

export function setLastFetchedUrl(url) {
  __lastFetchedNorm = normalizeUrl(url);
}

export function getLastFetchedUrl() {
  return __lastFetchedNorm;
}

export function buildIssueUrl(tabUrl) {
  let domain = '(unknown domain)';
  try { domain = new URL(tabUrl).hostname.replace(/^www\./, ''); } catch { }
  const title = `Unsupported URL detected on ${domain}`;
  const body = [
    'This page is not currently supported by the Marian extension:',
    '', tabUrl, '',
    '**Steps to reproduce:**',
    '1. Open the above URL with the extension installed',
    '2. Open the extension sidebar',
    '3. See that details are not loaded',
    '', '**Expected behavior:**',
    'Details should load for supported product pages.'
  ].join('\n');
  const labels = 'bug';
  return 'https://github.com/jacobtender/marian-extension/issues/new'
    + `?title=${encodeURIComponent(title)}`
    + `&body=${encodeURIComponent(body)}`
    + `&labels=${encodeURIComponent(labels)}`;
}

/**
 * Gets the current active tab
 * 
 * @returns {Promise<chrome.tabs.Tab | undefined>} A promise that resolves to the active tab object, or undefined if no active tab is found.
 */
export async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}
