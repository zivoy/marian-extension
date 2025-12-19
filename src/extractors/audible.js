import { Extractor } from './AbstractExtractor.js';
import {
  getImageScore,
  logMarian,
  getFormattedText,
  queryAllDeep,
  queryDeep,
  clearDeepQueryCache,
  withTimeout,
  cleanText,
} from '../shared/utils.js';

const DEBUG = false;

// Known shadow-hosts / component surfaces to search
// Audible uses a lot of web components
const KNOWN_DEEP_HOSTS = [
  'adbl-product-details',
  'adbl-product-metadata',
  'adbl-title-lockup',
  'adbl-product-hero',
  'adbl-product-image',
  '[data-automation-id="titleSubtitle"]',
  '[data-automation-id="hero-metadata"]',
  '[data-automation-id="hero-art"]',
];

class audibleScraper extends Extractor {
  get _name() { return "Audible Extractor"; }
  _sitePatterns = [
    /^https?:\/\/(www\.)?audible\.[a-z.]+\/pd\/(?:[^/]+\/)*[A-Z0-9]{10}(?:\?.*)?$/,
  ];

  async getDetails() {
    return getAudibleDetails();
  }
}

async function getAudibleDetails() {
  clearDeepQueryCache();
  const details = {};
  const asyncJobs = [];

  try {
    const cover = getPrimaryImage();
    if (cover?.src) {
      const src = cover.src;
      details.img = src;
      asyncJobs.push(
        withTimeout(getImageScore(src), 1500, 0)
          .then(s => { details.imgScore = s; })
          .catch(e => { details.imgScore = 0; })
      );
    } else {
      details.imgScore = 0;
    }

    const title = getFirstText([
      '[data-automation-id="adbl-product-title"]',
      'adbl-title-lockup [slot="title"]',
      'adbl-product-hero [slot="title"]',
      'meta[property="og:title"]',
      'title',
    ]);
    if (title) details.Title = title;

    const description = getDescription();
    if (description) details.Description = description;

    Object.assign(details, collectMetadata());

    // This is audible's ASIN, does not match amazon retail's ASIN
    if (!details.ASIN) {
      const asin = extractAsinFromUrl(window.location.href);
      if (asin) details.ASIN = asin;
    }

    if (!details['Reading Format']) details['Reading Format'] = 'Audiobook';
    if (!details['Edition Format'] && details['Reading Format']) {
      details['Edition Format'] = details['Reading Format'];
    }

    delete details.Edition;
    delete details.Version;

    await Promise.allSettled(asyncJobs);

    logMarian('Audible extraction complete', details);
    return details;
  } catch (e) {
    logMarian('Audible extraction failed', { error: String(e) });
    return details;
  }
}

function collectMetadata() {
  const contributorMap = new Map();
  const fields = {};
  // Collect data from product metadata, product details, and hero from DOM
  const pairs = [
    ...collectListPairs(),
    ...collectMetadataLines(),
    ...collectTablePairs(),
  ];

  // Figure out how they map to the values we show in the UI
  pairs.forEach(({ label, values }) => applyPair(fields, contributorMap, label, values));

  // Serialize all of the contributors found
  const contributors = Array.from(contributorMap.entries()).map(([name, roles]) => ({
    name,
    roles: Array.from(roles),
  }));
  if (contributors.length) fields.Contributors = contributors;
  return fields;
}

function collectListPairs() {
  // Hero subtitle list renders as free text ("Label: value") inside shadow roots
  return queryAllDeep('[data-automation-id="hero-metadata"] li.bc-list-item, [data-automation-id="titleSubtitle"] li.bc-list-item', KNOWN_DEEP_HOSTS)
    .map(node => cleanText(node.textContent))
    .filter(Boolean)
    .map(text => {
      const match = text.match(/^([^:]+):\s*(.+)$/); // "Label: Value" pair
      if (!match) return null;
      return { label: match[1], values: cleanValues([match[2]]) };
    })
    .filter(Boolean);
}

function collectMetadataLines() {
  const pairs = [];
  queryAllDeep('adbl-product-metadata', KNOWN_DEEP_HOSTS).forEach(host => {
    const root = host.shadowRoot || host;
    // Each metadata line exposes optional label/value slots per locale variant
    const lines = root?.querySelectorAll?.('.line[role="group"], [data-automation-id="metadata-line"]');
    lines?.forEach(line => {
      const labelEl = line.querySelector('.label, [slot="label"], [data-automation-id="metadata-label"], dt');
      const label = cleanText(labelEl?.textContent || line.getAttribute('key'));
      if (!label) return;
      const valueNodes = line.querySelectorAll('.values a, .values .text, .values span, [slot="values"] *, [data-automation-id="metadata-value"] *, dd, .value');
      const values = cleanValues(
        valueNodes.length ? Array.from(valueNodes, node => node.textContent) : [line.textContent]
      );
      if (values.length) pairs.push({ label, values });
    });
  });
  return pairs;
}

function collectTablePairs() {
  const rows = document.querySelectorAll('#audibleProductDetails table tr, #productDetails table tr');
  const pairs = [];
  rows.forEach(row => {
    const label = cleanText(row.querySelector('th, td:first-child')?.textContent);
    const value = cleanText(row.querySelector('td:last-child')?.textContent);
    if (label && value) pairs.push({ label, values: [value] });
  });
  return pairs;
}

function applyPair(fields, contributors, label, rawValues) {
  const normalized = normalizeLabel(label);
  const values = cleanValues(rawValues);
  if (!normalized || !values.length) return;

  let handled = true;

  switch (normalized) {
    case 'by':
    case 'written by':
    case 'author':
    case 'authors':
      addContributors(contributors, values, 'Author');
      break;
    case 'narrated by':
    case 'narrator':
    case 'narrators':
      addContributors(contributors, values, 'Narrator');
      break;
    case 'performed by':
    case 'performed':
      addContributors(contributors, values, 'Narrator');
      break;
    case 'directed by':
      addContributors(contributors, values, 'Director');
      break;
    case 'translated by':
    case 'translator':
      addContributors(contributors, values, 'Translator');
      break;
    case 'composer':
      addContributors(contributors, values, 'Composer');
      break;
    case 'publisher':
      setField(fields, 'Publisher', values.join(', '));
      break;
    case 'language':
      setField(fields, 'Language', values.join(', '));
      break;
    case 'length':
    case 'listening length':
    case 'runtime':
    case 'runtime length':
    case 'audio length':
      setField(fields, 'Listening Length', parseListeningLength(values[0]));
      break;
    case 'release date':
    case 'publication date':
    case 'audible release date':
    case 'audible.com release date':
    case 'audible com release date':
      setField(fields, 'Publication date', values[0]);
      break;
    case 'program type':
      applyProgramType(fields, values[0]);
      break;
    case 'format':
    case 'edition':
      fields['Edition Format'] ??= values[0];
      break;
    case 'version':
      setField(fields, 'Edition Information', values[0]);
      break;
    case 'series':
      values.forEach(value => applySeries(fields, value));
      break;
    case 'series number':
    case 'series place':
      setField(fields, 'Series Place', values[0]);
      break;
    case 'asin':
      fields.ASIN ??= values[0];
      break;
    default:
      handled = false;
      if (DEBUG) logMarian('Unhandled label', { label, normalized, values });
      break;
  }

}

function addContributors(map, values, role) {
  values.flatMap(splitContributorNames).forEach(name => {
    if (!name) return;
    const roles = map.get(name) || new Set();
    roles.add(role);
    map.set(name, roles);
  });
}

function splitContributorNames(value) {
  const chunks = value
    .split(/\s+(?:and|&)\s+/i) // Split between "and" and "&"
    .map(cleanText)
    .filter(Boolean);
  const out = [];
  for (const chunk of chunks) {
    if (/,.*,.*/.test(chunk)) { // Check for two commas
      // Likely "A, B, C" list
      out.push(...chunk.split(/\s*,\s*/).map(cleanText).filter(Boolean)); // Split on commas
    } else {
      out.push(chunk);
    }
  }
  return out;
}

function setField(fields, key, value) {
  if (!value || fields[key]) return;
  if (Array.isArray(value) && !value.length) return;
  fields[key] = value;
}

function applyProgramType(fields, value) {
  if (!value) return;
  const lower = value.toLowerCase();
  if (lower.includes('podcast')) {
    setField(fields, 'Reading Format', 'Podcast');
  } else if (lower.includes('audio')) {
    setField(fields, 'Reading Format', 'Audiobook');
  } else {
    setField(fields, 'Reading Format', value);
  }
  fields['Edition Format'] ??= value;
}

function applySeries(fields, value) {
  const text = cleanText(value);
  if (!text) return;
  const position = parseSeriesPlace(text);
  // remove patterns like ", Book 3", "Vol. 2", "#1.5" etc. at the end
  const SERIES_TRAIL = /(?:,?\s*(?:Book|Volume|Vol\.?|Part)\s*\d+(?:\.\d+)?|#\s*\d+(?:\.\d+)?)\s*$/i;
  // remove patterns like "Book 2: " or "Vol. 3 - " at the beginning
  const SERIES_LEAD = /^(?:Book|Volume|Vol\.?|Part|#)\s*\d+(?:\.\d+)?\s*[:,\-\u2013]\s*/i;
  // remove trailing parentheses like "(Book 2)" at the end
  const SERIES_PAREN = /\(\s*(?:Book|Volume|Vol\.?|Part|#)\s*\d+(?:\.\d+)?\s*\)\s*$/i;

  let name = text
    .replace(SERIES_TRAIL, '')
    .replace(SERIES_LEAD, '')
    .replace(SERIES_PAREN, '');
  name = name.replace(/^[\s,:-]+|[\s,:-]+$/g, '').trim();
  if (name) setField(fields, 'Series', name);
  if (position) setField(fields, 'Series Place', position);
}

function parseSeriesPlace(value) {
  // Extracts a number after keywords like “Book” or “#”
  const match = value.match(/(?:Book|Volume|Vol\.?|Part|#)\s*(\d+(?:\.\d+)?)/i);
  return match ? match[1] : null;
}

function parseListeningLength(value) {
  if (!value) return value;
  const text = cleanText(Array.isArray(value) ? value.join(' ') : value);
  const hours = +(text.match(/(\d+)\s*(?:hours?|hrs?)/i)?.[1] || 0);
  const minutes = +(text.match(/(\d+)\s*(?:minutes?|mins?)/i)?.[1] || 0);
  const seconds = +(text.match(/(\d+)\s*(?:seconds?|secs?)/i)?.[1] || 0);
  const parts = [];
  if (hours) parts.push(`${hours} hours`);
  if (minutes) parts.push(`${minutes} minutes`);
  if (seconds) parts.push(`${seconds} seconds`);
  return parts.length ? parts : text;
}

function getDescription() {
  const selectors = [
    'adbl-product-details [slot="summary"]',
    'adbl-product-details adbl-text-block[slot="summary"]',
    '[data-automation-id="productDescription"]',
    '[data-automation-id="adbl-product-description"]',
    '#publisher-summary',
    '#publisher-s-summary',
    '#product-description',
  ];

  for (const selector of selectors) {
    const el = queryDeep(selector, KNOWN_DEEP_HOSTS);
    if (!el) continue;
    const text = getFormattedText(el);
    if (text) return text;
  }

  const meta = document.querySelector('meta[name="description"]')?.getAttribute('content');
  return cleanText(meta);
}

function getPrimaryImage() {
  return (
    queryDeep('.adbl-product-image img', KNOWN_DEEP_HOSTS) ||
    queryDeep('[data-automation-id="hero-art"] img', KNOWN_DEEP_HOSTS) ||
    queryDeep('img.bc-pub-media', KNOWN_DEEP_HOSTS) ||
    document.querySelector('img[alt*="cover art" i]') ||
    document.querySelector('img[alt*="portada" i]')
  );
}

function getFirstText(selectors) {
  for (const selector of selectors) {
    if (selector === 'title') {
      const text = cleanText(document.title);
      if (text) return text;
      continue;
    }

    if (selector.startsWith('meta[')) {
      const meta = document.querySelector(selector);
      const content = cleanText(meta?.getAttribute('content'));
      if (content) return content;
      continue;
    }

    const el = queryDeep(selector, KNOWN_DEEP_HOSTS);
    const text = cleanText(el?.textContent);
    if (text) return text;
  }
  return null;
}

/**
 * Deduplicate, normalize, and explode composite value strings.
 *
 * @param {Array<string | null | undefined>} values Raw value candidates (possibly pipe-delimited).
 * @returns {string[]} Unique sanitized values.
 */
function cleanValues(values) {
  const seen = new Set();
  const result = [];

  values
    .filter(Boolean)
    .map(cleanText)
    .forEach(value => {
      if (!value) return;
      value.split(/\s*\|\s*/).forEach(part => {
        const piece = cleanText(part);
        if (piece && !seen.has(piece)) {
          seen.add(piece);
          result.push(piece);
        }
      });
    });

  return result;
}

/**
 * Produce a lowercase variant of a label after cleaning it.
 *
 * @param {string | null | undefined} label Label text to normalize.
 * @returns {string} Lowercase sanitized label.
 */
function normalizeLabel(label) {
  return cleanText(label).toLowerCase();
}

/**
 * Parse an ASIN identifier from Audible URLs.
 *
 * @param {string | null | undefined} url URL that may contain an ASIN.
 * @returns {string | null} Parsed ASIN in uppercase, or null if none found.
 */
function extractAsinFromUrl(url) {
  if (!url) return null;
  const match = url.match(/\/(?:pd|p)\/[^/]+\/([A-Z0-9]{10})(?:[/?]|$)/i) || url.match(/asin=([A-Z0-9]{10})/i);
  return match ? match[1].toUpperCase() : null;
}

export { audibleScraper };
