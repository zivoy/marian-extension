import { Extractor } from "./AbstractExtractor.js"
import {
  addContributor,
  collectObject,
  getCoverData,
  addMapping as addMappingFunc
} from "../shared/utils.js";

class inventaireScraper extends Extractor {
  get _name() { return "inventaire Extractor"; }

  needsReload = false;
  _sitePatterns = [
    /https:\/\/inventaire\.io\/entity\/((?:wd|isbn|inv):[a-zA-Z0-9]+)/
  ];

  async getDetails() {
    const match = document.location.href.match(this._sitePatterns[0]);
    if (!match) throw new Error("Invalid URL");

    const id = match[1];
    return await getInventaireDetails(id);
  }
}

/**
 * Fetch entity data from Inventaire API
 * @param {string} uri - Entity URI (e.g., "wd:Q74287", "isbn:9782070116270")
 */
async function fetchEntity(uri) {
  const url = `https://inventaire.io/api/entities?action=by-uris&uris=${encodeURIComponent(uri)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error! status: ${response.status}`);
  }
  const data = await response.json();
  return data.entities?.[uri];
}

/**
 * Get the first available label from the labels object
 * @param {Object} labels - Labels object with language codes as keys
 * @param {string} preferredLang - Preferred language code (default: "en")
 */
function getLabel(labels, preferredLang = "en") {
  if (!labels) return null;
  // Try preferred language first, then English, then any available
  return labels[preferredLang] || labels["en"] || Object.values(labels)[0];
}

/**
 * Extract common mappings from entity claims
 * @param {Object} claims - Entity claims object
 * @param {Object} mappings - Mappings object to populate
 */
function extractMappings(claims, mappings) {
  if (!claims) return;

  // Wikidata property to mapping name
  const mappingProperties = {
    "wdt:P648": "Open Library",
    "wdt:P8383": "Goodreads",
    "wdt:P1085": "LibraryThing",
    "wdt:P214": "VIAF",
    "wdt:P244": "Library of Congress",
    "wdt:P227": "GND",
    "wdt:P268": "BnF",
    "wdt:P950": "BNE",
    "wdt:P5331": "OCLC",
    "wdt:P1274": "ISFDB",
  };

  Object.entries(mappingProperties).forEach(([property, name]) => {
    const values = claims[property];
    if (values && values.length > 0) {
      values.forEach(value => addMappingFunc(mappings, name, value));
    }
  });
}

/**
 * Extract details from Inventaire entity
 */
async function getInventaireDetails(id) {
  const entity = await fetchEntity(id);
  if (!entity) throw new Error("Entity not found");

  const detailsList = [];
  const mappings = {};

  // Add Inventaire mapping
  addMappingFunc(mappings, "Inventaire", id);

  if (entity.type === "edition") {
    // For editions, fetch the work data as well
    const workUri = entity.claims?.["wdt:P629"]?.[0];
    if (workUri) {
      detailsList.push(getInventaireDetails(workUri));
    }

    // Edition-specific fields
    const details = {};

    // ISBN-13
    const isbn13 = entity.claims?.["wdt:P212"]?.[0];
    if (isbn13) {
      details["ISBN-13"] = isbn13;
    }

    // ISBN-10
    const isbn10 = entity.claims?.["wdt:P957"]?.[0];
    if (isbn10) {
      details["ISBN-10"] = isbn10;
    }

    // Pages
    const pages = entity.claims?.["wdt:P1104"]?.[0];
    if (pages) {
      details["Pages"] = pages;
    }

    // Publication date
    const pubDate = entity.claims?.["wdt:P577"]?.[0];
    if (pubDate) {
      details["Publication date"] = new Date(pubDate);
    }

    // Language - fetch language entity
    const langUri = entity.claims?.["wdt:P407"]?.[0];
    if (langUri) {
      detailsList.push(fetchEntity(langUri).then(langEntity => {
        const language = getLabel(langEntity?.labels);
        return language ? { "Language": language } : {};
      }).catch(() => ({})));
    }

    // Extract all available mappings for editions
    extractMappings(entity.claims, mappings);

    // Cover image
    if (entity.image?.url) {
      const imageUrl = entity.image.url.startsWith("http")
        ? entity.image.url
        : `https://inventaire.io${entity.image.url}`;
      detailsList.push(getCoverData(imageUrl));
    }

    // Title from labels
    const title = getLabel(entity.labels);
    if (title) {
      details["Title"] = title;
    }

    detailsList.push(details);

  } else if (entity.type === "work") {
    // Work-specific fields
    const details = {};

    // Title
    const title = getLabel(entity.labels);
    if (title) {
      details["Title"] = title;
    }

    // Description
    const description = getLabel(entity.descriptions);
    if (description) {
      details["Description"] = description;
    }

    // Cover image
    if (entity.image?.url) {
      const imageUrl = entity.image.url.startsWith("http")
        ? entity.image.url
        : `https://inventaire.io${entity.image.url}`;
      detailsList.push(getCoverData(imageUrl));
    }

    // Contributors - Authors (wdt:P50)
    const authorUris = entity.claims?.["wdt:P50"] || [];
    if (authorUris.length > 0) {
      detailsList.push(Promise.all(authorUris.map(uri =>
        fetchEntity(uri)
          .then(authorEntity => getLabel(authorEntity?.labels))
          .catch(() => null)
      )).then(authors => {
        const contributors = [];
        authors.forEach(name => {
          if (name) addContributor(contributors, name, "Author");
        });
        return contributors.length > 0 ? { "Contributors": contributors } : {};
      }));
    }

    // Contributors - Illustrators (wdt:P110)
    const illustratorUris = entity.claims?.["wdt:P110"] || [];
    if (illustratorUris.length > 0) {
      detailsList.push(Promise.all(illustratorUris.map(uri =>
        fetchEntity(uri)
          .then(illustratorEntity => getLabel(illustratorEntity?.labels))
          .catch(() => null)
      )).then(illustrators => {
        const contributors = [];
        illustrators.forEach(name => {
          if (name) addContributor(contributors, name, "Illustrator");
        });
        return contributors.length > 0 ? { "Contributors": contributors } : {};
      }));
    }

    // Extract all available mappings for works
    extractMappings(entity.claims, mappings);

    // Series information
    const seriesUri = entity.claims?.["wdt:P179"]?.[0];
    if (seriesUri) {
      detailsList.push(fetchEntity(seriesUri).then(seriesEntity => {
        const seriesName = getLabel(seriesEntity?.labels);
        return seriesName ? { "Series": seriesName } : {};
      }).catch(() => ({})));
    }

    // Series place/position
    const seriesPlace = entity.claims?.["wdt:P1545"]?.[0];
    if (seriesPlace) {
      details["Series Place"] = seriesPlace;
    }

    // Publisher - fetch publisher entity
    const publisherUri = entity.claims?.["wdt:P123"]?.[0];
    if (publisherUri) {
      detailsList.push(fetchEntity(publisherUri).then(publisherEntity => {
        const publisherName = getLabel(publisherEntity?.labels);
        return publisherName ? { "Publisher": publisherName } : {};
      }).catch(() => ({})));
    }

    detailsList.push(details);
  }

  // Collect all details
  const result = await collectObject(detailsList);

  // Merge contributors
  let contributors = result["Contributors"] || [];
  if (Array.isArray(result["Contributors"])) {
    contributors = result["Contributors"];
  }
  delete result["Contributors"];
  result["Contributors"] = contributors;

  // Merge mappings
  if (result["Mappings"]) {
    Object.entries(result["Mappings"]).forEach(([k, v]) => {
      v.forEach(i => addMappingFunc(mappings, k, i));
    });
  }
  result["Mappings"] = mappings;

  return result;
}

export { inventaireScraper };
