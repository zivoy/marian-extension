/**
 * Abstract Scraper class
 *
 * @class Extractor
 */
class Extractor {
  _name = "<Abstract Extractor>"
  /**@type{RegExp[]}*/
  _sitePatterns = []

  constructor() {
    if (this.constructor == Extractor) {
      throw new Error("Abstract classes can't be instantiated.");
    }
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
}

export { Extractor };
