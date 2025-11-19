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
   */
  async getDetails() {
    throw "Not Implemented"
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
}

export { Extractor };
