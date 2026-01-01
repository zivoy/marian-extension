import { Extractor } from "./AbstractExtractor.js"
import { collectObject } from "../shared/utils.js";

// references:
//  https://openlibrary.org/dev/docs/api/books
//  https://docs.openlibrary.org/4_Librarians/Guide-to-Identifiers.html

// only have the id part in the mappings
const idOnly = false;

const OLIDRegex = /https?:\/\/(?:www\.)?openlibrary\.org(\/(?:books|works)\/OL\d+\w)/;

class openlibraryScraper extends Extractor {
  get _name() { return "Open Library Extractor"; }
  needsReload = false;

  _sitePatterns = [
    OLIDRegex,
  ];

  async getDetails() {
    const idMatch = document.location.href.match(OLIDRegex);
    if (idMatch == undefined) throw new Error("Invalid id");
    const id = idMatch[1];

    let details = {};

    details["Mappings"] = { "Open Library": [idOnly ? id.match(/OL\d+\w/)[0] : id] };

    return collectObject([
      details
    ]);
  }
}

export { openlibraryScraper };
