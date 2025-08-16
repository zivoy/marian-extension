// Keys
export const LAST_FETCHED_URL_KEY = 'lastFetchedUrl';

// Compare origin+path to avoid noisy query/hash differences
export function normalizeUrl(u) {
  try {
    const url = new URL(u);
    return `${url.origin}${url.pathname}`;
  } catch { return u || ''; }
}

// Simple guards
export function once(fn) {
  let ran = false;
  return (...args) => { if (!ran) { ran = true; return fn(...args); } };
}

export function buildIssueUrl(tabUrl) {
  let domain = '(unknown domain)';
  try { domain = new URL(tabUrl).hostname.replace(/^www\./, ''); } catch {}
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
