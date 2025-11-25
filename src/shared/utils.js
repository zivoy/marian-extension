// Check if the 'browser' namespace is available (Firefox) and use it,
// otherwise fall back to the 'chrome' namespace (Chrome).
export const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

/**
  * @param {string} url URL of image to check  
  * @returns {Promise<number>} The score of the image
  */
export async function getImageScore(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth * img.naturalHeight);
    img.onerror = () => resolve(0); // fallback score if image fails to load
    img.src = url;
  });
}

const marianLogHead = "[👩🏻‍🏫 Marian]";
export function logMarian(message, object = null) {
  if (!object) {
    console.log(`${marianLogHead} ${message}`);
  } else {
    console.group(`${marianLogHead} ${message}`);
    console.log(object);
    console.groupEnd();
  }
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Race a promise against a timeout, resolving with a fallback value if the timeout finishes first.
 *
 * @template T
 * @param {Promise<T>} promise Promise to await.
 * @param {number} ms Timeout length in milliseconds.
 * @param {T} fallback Value to resolve with if the timeout elapses first.
 * @returns {Promise<T>} Promise that settles with either the original result or the fallback.
 */
export function withTimeout(promise, ms, fallback) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise(resolve => {
      timer = setTimeout(() => resolve(fallback), ms);
    })
  ]);
}

/**
 * Extract text from HTML element while preserving paragraph breaks
 *
 * @param {HTMLElement} element HTML element to extract text from
 * @returns {string} Formatted text with preserved paragraph breaks
 */
export function getFormattedText(element) {
  let result = '';

  function processNode(/**@type {HTMLElement}*/node) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Add text content, normalizing whitespace
      result += node.textContent.replace(/\s+/g, ' ');
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();

      // Process child nodes first
      for (const child of node.childNodes) {
        processNode(child);
      }

      // Add appropriate line breaks after processing content
      if (tagName === 'p') {
        result += '\n\n'; // Double newline after paragraphs
      } else if (tagName === 'br') {
        result += '\n';   // Single newline for <br>
      } else if (['div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'].includes(tagName)) {
        result += '\n';   // Single newline for other block elements
      }
    }
  }

  processNode(element);

  result = result
    .replace(/[ \t]+/g, ' ')    // Multiple spaces/tabs to single space
    .replace(/\n /g, '\n')      // Remove spaces after newlines
    .replace(/ \n/g, '\n')      // Remove spaces before newlines
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .trim();

  return result;
  // return cleanText(result);
}

export function sendMessage(message) {
  return new Promise(async (resolve) => {
    await runtime.sendMessage(message, resolve);
  });
}

const deepQueryCache = new Map();

/**
 * Clear cached deep query results, typically once per extraction run.
 */
export function clearDeepQueryCache() {
  deepQueryCache.clear();
}

/**
 * Perform a deep DOM query that includes shadow roots under the provided hosts.
 *
 * @param {string} selector CSS selector to match.
 * @param {string[]} [hostSelectors=[]] CSS selectors whose shadow roots should be traversed.
 * @returns {Element[]} Unique matching elements discovered across light and shadow DOM.
 */
export function queryAllDeep(selector, hostSelectors = []) {
  const cacheKey = `${selector}::${hostSelectors.join(',')}`;
  if (deepQueryCache.has(cacheKey)) {
    return deepQueryCache.get(cacheKey);
  }

  const results = new Set();

  document.querySelectorAll(selector).forEach(el => results.add(el));

  const stack = [];

  if (hostSelectors.length) {
    document.querySelectorAll(hostSelectors.join(',')).forEach(host => {
      stack.push(host);
      if (host.shadowRoot) stack.push(host.shadowRoot);
    });
  }

  const visited = new Set();

  while (stack.length) {
    const root = stack.pop();
    if (!root || visited.has(root)) continue;
    visited.add(root);

    if (typeof root.querySelectorAll !== 'function') continue;

    root.querySelectorAll(selector).forEach(el => results.add(el));

    root.querySelectorAll('*').forEach(node => {
      if (node.shadowRoot) stack.push(node.shadowRoot);
    });
  }

  const arr = Array.from(results);
  deepQueryCache.set(cacheKey, arr);
  return arr;
}

/**
 * Variant of queryAllDeep that returns only the first match.
 *
 * @param {string} selector CSS selector to match.
 * @param {string[]} [hostSelectors=[]] CSS selectors whose shadow roots should be traversed.
 * @returns {Element | null} First matching element, or null when none found.
 */
export function queryDeep(selector, hostSelectors = []) {
  const matches = queryAllDeep(selector, hostSelectors);
  return matches[0] || null;
}

/**
  * takes a cover URL, or a list of covers and returns the details of the one with the best score
  *
  * @typedef {{img: string, imgScore: number}} CoverObject image URL and image score
  * @param {string | string[] | undefined} covers the cover URL, or a list of cover URLs
  * @return {Promise<CoverObject>} the image URL and score of the best cover
  */
export async function getCoverData(covers) {
  if (covers && covers.length === 0) {
    covers = undefined;
  }

  if (!Array.isArray(covers)) {
    // single URL was passed
    const coverUrl = covers;
    return {
      img: coverUrl,
      imgScore: coverUrl ? await getImageScore(coverUrl) : 0
    }
  }

  // an array of images was passed in
  const coversSettled = await Promise.allSettled(covers.map(getCoverData));
  const coversObj = coversSettled
    .filter(({ status }) => status === "fulfilled")
    .map((res) => /**@type{CoverObject}*/(res.value));

  // get the best one
  const highestScoreCover = coversObj.reduce((highest, current) =>
    current.imgScore > highest.imgScore ? current : highest
  );

  // logMarian("covers", { covers, coversObj, highestScoreCover });

  return highestScoreCover;
}

/**
 * Returns a new object with keys renamed according to the mapping.
 * Keys not in the mapping are preserved as-is.
 *
 * @param {Record<string, string>} mapping - Map of old keys to new keys
 * @param {Record<string,any>} object - Source object
 * @returns {Record<string, any>} New object with mapped keys
 */
export function remapKeys(mapping, object) {
  const newObj = {};

  for (const key of Object.keys(object)) {
    // If the key exists in mapping, use the new name, otherwise keep original
    const finalKey = Object.hasOwn(mapping, key) ? mapping[key] : key;
    newObj[finalKey] = object[key];
  }

  return newObj;
}

/**
 * @typedef {{name: string, roles: string[]}} contributor
 */

/**
 * adds a contributor with one or more roles to the contributor list
 *
 * @param {contributor[]} contributors - list of contributors
 * @param {string} name - name of the contributor 
 * @param {string | string[]} roles - a role or list of roles to add to a contributor
 */
export function addContributor(contributors, name, roles) {
  if (!Array.isArray(roles)) {
    roles = [roles];
  }

  const contributor = contributors.findIndex((contributor) => contributor.name === name);
  if (contributor == -1) {
    contributors.push({ name, roles: roles });
    return contributors;
  }

  for (const role of roles) {
    if (contributors[contributor].roles.includes(role)) continue;
    contributors[contributor].roles.push(role);
  }

  return contributors;
}

/**
 * Normalize arbitrary text by stripping invisible characters and squeezing whitespace.
 *
 * @param {string | null | undefined} text Raw text content to sanitize.
 * @returns {string} Sanitized text with normalized spacing.
 */
export function cleanText(text) {
  if (!text) return '';
  return text
    .normalize('NFKC')                                        // Normalize Unicode to one style
    .replace(/\p{Cf}/gu, '')                                  // Remove Unicode control chars
    .replace(/[\u200E\u200F\u202A-\u202E\u00A0\uFEFF‎‏]/g, ' ') // Normalize invisible formatting chars (NBSP, BOM, Bidi marks) to spaces (should not be needed but keeping for consistency)
    .replace(/^\s*,+\s*/, '')                                 // Remove artifact leading commas/spaces (e.g. ", value")
    .replace(/\s+/g, ' ')                                     // Collapse all recurring whitespace (tabs, newlines) into a single space
    .trim();
}

/**
 * Normalizes raw format string to one of: Audiobook, Ebook, or Physical Book.
 * @param {string} rawFormat
 * @returns {string} 'Audiobook' | 'Ebook' | 'Physical Book'
 */
export function normalizeReadingFormat(rawFormat) {
  if (!rawFormat) return 'Physical Book';
  const format = rawFormat.toLowerCase();

  if (
    format.includes("audio") ||
    format.includes("audible") ||
    format.includes("narrat") ||
    format.includes("mp3") ||
    format.includes("cd")
  ) return "Audiobook";

  if (
    format.includes("ebook") ||
    format.includes("e-book") ||
    format.includes("digital") ||
    format.includes("kindle")
  ) {
    return "Ebook";
  }

  if (
    format.includes("physical") ||
    format.includes("hardcover") ||
    format.includes("paperback") ||
    format.includes("book")
  ) {
    return "Physical Book";
  }

  return "Physical Book"; // Fallback
}

/**
 * Validates an object against a structural schema.
 * The schema can contain:
 * - Constructors (String, Number, Boolean) to validate types.
 * - Literal values (strings, numbers) to ensure exact matches.
 * - Nested objects for recursive validation.
 * - Arrays for list validation:
 * - \[Type\] (length 1): Validates an array where all elements match Type.
 * - \[Type1, Type2\] (length > 1): Validates a fixed-length tuple where elements match by index.
 * @param {Object} schema - The template object defining structure and types.
 * @param {Object} subject - The object to validate.
 * @param {boolean} [allowExtraFields=false] - If true, the subject can contain keys not present in the schema.
 * @returns {boolean} True if the subject conforms to the schema, false otherwise.
 */
export function validateObject(schema, subject, allowExtraFields = false) {
  if (typeof subject !== 'object' || subject === null) {
    return false;
  }

  const schemaKeys = Object.keys(schema);
  const subjectKeys = Object.keys(subject);

  if (!allowExtraFields) {
    for (const key of subjectKeys) {
      if (!schemaKeys.includes(key)) {
        console.warn(`${marianLogHead} Validation failed: Unexpected field '${key}'`);
        return false;
      }
    }
  }

  for (const key of schemaKeys) {
    const expected = schema[key];
    const actual = subject[key];

    if (!(key in subject)) {
      console.warn(`${marianLogHead} Validation failed: Missing key '${key}'`);
      return false;
    }

    if (!validateValue(expected, actual, allowExtraFields)) {
      console.warn(`${marianLogHead} Validation failed: Key '${key}' value mismatch`);
      return false;
    }
  }

  return true;
}

/**
 * Validate a single value against a schema rule.
 * Handles Constructors, Arrays, Objects, and Literals.
 *
 * @param {any} expected
 * @param {any} actual
 * @param {boolean?} allowExtraFields
 * @returns {boolean}
 */
export function validateValue(expected, actual, allowExtraFields = undefined) {
  allowExtraFields = allowExtraFields === true;

  if (expected === String) return typeof actual === 'string';
  if (expected === Number) return typeof actual === 'number';
  if (expected === Boolean) return typeof actual === 'boolean';

  // arrays
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return false;

    if (expected.length === 0) {
      return actual.length === 0;
    }

    // checks if every item in the actual array is of the single type
    if (expected.length === 1) {
      const type = expected[0];
      return actual.every(item => validateValue(type, item, allowExtraFields));
    }

    // else - fixed structure
    if (actual.length !== expected.length) return false;
    return actual.every((item, i) => validateValue(expected[i], item, allowExtraFields));
  }

  // nested objects
  if (typeof expected === 'object' && expected !== null) {
    return validateObject(expected, actual, allowExtraFields);
  }

  // exact literals
  return actual === expected;
}
