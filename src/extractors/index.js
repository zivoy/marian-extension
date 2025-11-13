import { Extractor } from "./AbstractExtractor";
import { amazonScraper } from "./amazon";
import { audibleScraper } from "./audible";
import { dnbdeScraper } from "./dnbde";
import { goodreadsScraper } from "./goodreads";
import { googleBooksScraper } from "./googlebooks";
import { isbndbScraper } from "./isbndb";
import { isbndeScraper } from "./isbnde";
import { isbnSearchScraper } from "./isbnsearch";
import { koboScraper } from "./kobo";
import { librofmScraper } from "./librofm";
import { libbyScraper, overdriveScraper, teachingbooksScraper } from "./overdrive";
import { storygraphScraper } from "./storygraph";

/** @type{Extractor[]} */
const extractors = [
  new amazonScraper(),
  new audibleScraper(),
  new dnbdeScraper(),
  new goodreadsScraper(),
  new googleBooksScraper(),
  new isbnSearchScraper(),
  new isbndbScraper(),
  new isbndeScraper(),
  new koboScraper(),
  new libbyScraper(),
  new librofmScraper(),
  new overdriveScraper(),
  new storygraphScraper(),
  new teachingbooksScraper(),
]

function getExtractor(url) {
  return extractors.find((ex) => ex.isSupported(url))
}

function isAllowedUrl(url) {
  return getExtractor(url) != undefined;
}

export { extractors, getExtractor, isAllowedUrl }
