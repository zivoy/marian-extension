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
 * Validates an object against a schema with support for Optional fields.
 * The Schema Syntax:
 * - Simple: { name: String }
 * - Optional: { name: { type: String, optional: true } }
 * - Arrays: { tags: [String] }
 * @param {Object} schema - The structure definition.
 * @param {Object} subject - The data to validate.
 * @return {{ isValid: boolean, error: string|null }}
 */
export function validate(schema, subject, path = "root") {
  if (subject === null || subject === undefined) {
    // If we are validating a primitive type (String, Number) against null/undefined, it's a fail
    // (Unless the parent caller handled 'optional', but here we deal with the raw value)
    return { isValid: false, error: `${path} is null or undefined` };
  }

  if (schema === String) {
    return typeof subject === 'string'
      ? { isValid: true }
      : { isValid: false, error: `Expected String at ${path}, got ${typeof subject}` };
  }
  if (schema === Number) {
    return typeof subject === 'number'
      ? { isValid: true }
      : { isValid: false, error: `Expected Number at ${path}, got ${typeof subject}` };
  }
  if (schema === Boolean) {
    return typeof subject === 'boolean'
      ? { isValid: true }
      : { isValid: false, error: `Expected Boolean at ${path}, got ${typeof subject}` };
  }

  // Handle Arrays [Type] (Union or Array of Types)
  if (Array.isArray(schema)) {
    // 1. Union Check: Try to match subject against ANY type in the schema array
    // This supports { type: [String, Number] } -> String | Number
    for (const type of schema) {
      if (validate(type, subject, path).isValid) return { isValid: true };
    }

    // 2. Array Check: If subject is Array, check if items match the schema
    // This supports { type: [ItemType] } -> Array<ItemType>
    // And { type: [TypeA, TypeB] } -> Array<TypeA | TypeB>
    if (Array.isArray(subject)) {
      for (let i = 0; i < subject.length; i++) {
        let itemMatch = false;
        // Each item must match AT LEAST ONE of the types in schema
        for (const type of schema) {
          if (validate(type, subject[i], `${path}[${i}]`).isValid) {
            itemMatch = true;
            break;
          }
        }
        if (!itemMatch) return { isValid: false, error: `Item at ${path}[${i}] does not match any allowed type` };
      }
      return { isValid: true };
    }

    return { isValid: false, error: `Expected match for union types or array at ${path}` };
  }

  // Handle Objects (Recursive)
  if (typeof schema === 'object') {
    // Check for "Special Configuration" wrapper: { type: String, optional: true }
    // We ensure it only contains 'type', 'optional', and 'valueType'
    const isWrapper = schema.hasOwnProperty('type') &&
      Object.keys(schema).every(k => k === 'type' || k === 'optional' || k === 'valueType');

    if (isWrapper) {
      // Check optionality for top-level wrapper
      if (schema.optional === true && (subject === null || subject === undefined)) {
        return { isValid: true };
      }

      // Handle valueType (Record validation: all values must match valueType)
      if (schema.valueType) {
        if (typeof subject !== 'object' || subject === null) {
          return { isValid: false, error: `Expected Object for Record at ${path}` };
        }
        for (const [key, val] of Object.entries(subject)) {
          const res = validate(schema.valueType, val, `${path}.${key}`);
          if (!res.isValid) return res;
        }
        return { isValid: true };
      }

      // This is a config object, not a nested data object. 
      return validate(schema.type, subject, path);
    }

    const schemaKeys = Object.keys(schema);

    for (const key of schemaKeys) {
      const fieldRule = schema[key];
      const fieldValue = subject[key];
      const fieldPath = `${path}.${key}`;

      // Check for Optional/Config object wrapper
      let rule = fieldRule;
      let isOptional = false;

      // Detect if the rule is like { type: ..., optional: true }
      // We check if it has a 'type' property that is a Constructor or Object/Array
      if (fieldRule && typeof fieldRule === 'object' && fieldRule.type && fieldRule.optional === true) {
        rule = fieldRule.type;
        isOptional = true;
      }

      // Missing Key Check
      if (fieldValue === undefined || fieldValue === null) {
        if (isOptional) continue; // Skip validation for missing optional fields
        return { isValid: false, error: `Missing required field: ${fieldPath}` };
      }

      const result = validate(rule, fieldValue, fieldPath);
      if (!result.isValid) return result;
    }

    return { isValid: true };
  }

  return { isValid: true };
}
