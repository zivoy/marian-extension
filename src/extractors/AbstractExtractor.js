// Cross-browser compatibility
const storageAPI = (typeof browser !== 'undefined' ? browser : chrome)?.storage;

/**
 * Abstract Scraper class
 *
 * @class Extractor
 */
class Extractor {
  get _name() { return "<Abstract Extractor>" }
  /**@type{RegExp[]}*/
  _sitePatterns = [];
  needsReload = true;
  _state = {};

  get _storage_name() { return `scraper.${this._name}`; }

  constructor() {
    if (this.constructor == Extractor) {
      throw new Error("Abstract classes can't be instantiated.");
    }

    this._init();
  }

  _storageInitialized = false;
  async _init() {
    if (this._storageInitialized) return;

    const Self = this;
    storageAPI?.onChanged?.addListener((changes, areaName) => {
      const name = Self._storage_name;
      if (areaName === "local" && name in changes) {
        Self._state = changes[name].newValue;
        Self._handleStateUpdate(Self._state);
      }
    });

    // get data
    const name = this._storage_name;
    const data = await storageAPI?.local?.get(name);
    if (data == undefined || !(name in data)) return;
    this._state = data[name];
    this._handleStateUpdate(this._state);

    this._storageInitialized = true;
  }


  /**
   * @param {string} url
   * @returns {boolean} if the provided url is supported
   */
  isSupported(url) {
    return this._sitePatterns.some(pattern => pattern.test(url));
  }

  /**
   * @returns {Promise<Record<string, any>>}
   * @abstract
   */
  async getDetails() {
    throw new Error("Method 'getDetails()' must be implemented.");
  }

  toString() {
    return this._name;
  }

  _handleStateUpdate(state) { }

  async _saveState(state) {
    if (state == undefined) {
      state = this._state;
    }
    let obj = {};
    obj[this._storage_name] = state;
    await storageAPI?.local?.set(obj);
  }

  /**
   * Takes in a url and returns a url with only the components needed to identify the book
   * 
   * @param {string} u 
   * @returns {string}
   */
  normalizeUrl(u) {
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

  // NOTE: maybe add extraction functions into methods on the class
}

export { Extractor };
