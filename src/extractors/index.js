// Auto-generated file. Do not edit manually.
import { Extractor } from "./AbstractExtractor";

import { abeBooksScraper } from "./abebooks";
import { amazonScraper } from "./amazon";
import { audibleScraper } from "./audible";
import { barnesAndNobleScraper } from "./barnesnoble";
import { booksAMillionScraper } from "./booksamillion";
import { bookshopScraper } from "./bookshopOrg";
import { dnbdeScraper } from "./dnbde";
import { goodreadsScraper } from "./goodreads";
import { googleBooksScraper } from "./googlebooks";
import { indieBookstoreScraper } from "./indiebookstore";
import { inventaireScraper } from "./inventaire";
import { isbnSearchScraper } from "./isbnsearch";
import { isbndbScraper } from "./isbndb";
import { isbndeScraper } from "./isbnde";
import { isfdbScraper } from "./isfdb";
import { koboScraper } from "./kobo";
import { libbyScraper, overdriveScraper, teachingbooksScraper } from "./overdrive";
import { libraryThingScraper } from "./librarything";
import { librofmScraper } from "./librofm";
import { openlibraryScraper } from "./openlibrary";
import { penguinRandomHouseScraper } from "./penguinrandomhouse";
import { romanceIoScraper } from "./romanceio";
import { storygraphScraper } from "./storygraph";
import { torPublishingScraper } from "./torpub";
import { worldCatScraper } from "./worldcat";

/** @type{Extractor[]} */
const extractors = [
  new abeBooksScraper(),
  new amazonScraper(),
  new audibleScraper(),
  new barnesAndNobleScraper(),
  new booksAMillionScraper(),
  new bookshopScraper(),
  new dnbdeScraper(),
  new goodreadsScraper(),
  new googleBooksScraper(),
  new indieBookstoreScraper(),
  new inventaireScraper(),
  new isbnSearchScraper(),
  new isbndbScraper(),
  new isbndeScraper(),
  new isfdbScraper(),
  new koboScraper(),
  new libbyScraper(),
  new libraryThingScraper(),
  new librofmScraper(),
  new openlibraryScraper(),
  new overdriveScraper(),
  new penguinRandomHouseScraper(),
  new romanceIoScraper(),
  new storygraphScraper(),
  new teachingbooksScraper(),
  new torPublishingScraper(),
  new worldCatScraper(),
];

/** @param {string} url */
function getExtractor(url) {
  return extractors.find((ex) => ex.isSupported(url));
}

/** @param {string} url */
function isAllowedUrl(url) {
  return getExtractor(url) != undefined;
}

/** @param {string} url */
function normalizeUrl(url) {
  const extractor = getExtractor(url);
  if (extractor) return extractor.normalizeUrl(url);
  return Extractor.prototype.normalizeUrl.call(null, url);
}

export { extractors, getExtractor, isAllowedUrl, normalizeUrl };
