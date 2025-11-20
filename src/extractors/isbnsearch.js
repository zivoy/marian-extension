import { Extractor } from './AbstractExtractor.js';
import { addContributor, getCoverData, logMarian, remapKeys } from '../shared/utils.js';

class isbnSearchScraper extends Extractor {
  get _name() { return "ISBN Search Extractor"; }
  _sitePatterns = [
    /^https?:\/\/isbnsearch\.(?:org|com)\/isbn\/((?:\d{3})?\d{9}(?:X|\d))\b/,
  ];

  async getDetails() {
    return getIsbnSearchDetails();
  }
}

const remapings = {
  'Edition': 'Edition Information',
  'Binding': 'Edition Format',
  'Published': 'Publication date'
}
const nameRemap = remapKeys.bind(undefined, remapings);

async function getIsbnSearchDetails() {
  logMarian('Extracting ISBNSearch details');

  const imgEl = document.querySelector('.image img');
  const coverData = getCoverData(imgEl?.src);

  const details = extractTable()
  const bookDetails = nameRemap(details);

  getContributers(bookDetails);

  // Treat as local time when parsing
  bookDetails['Publication date'] = bookDetails['Publication date'] + "T00:00:00";

  if (bookDetails["Edition Format"]?.includes("Kindle")) {
    bookDetails['Reading Format'] = 'Ebook';
  } else if (
    bookDetails["Edition Format"]?.toLowerCase().includes("audio") ||
    bookDetails["Edition Format"]?.toLowerCase().includes("audible") ||
    bookDetails["Edition Format"]?.toLowerCase().includes("mp3") ||
    bookDetails["Edition Format"]?.toLowerCase().includes("cd")
  ) {
    bookDetails['Reading Format'] = 'Audiobook';
  } else {
    bookDetails['Reading Format'] = 'Physical Book';
  }

  // TODO: get language from ISBN

  // logMarian("bookDetails", bookDetails);

  return {
    ...(await coverData),
    ...bookDetails,
  };
}

function getContributers(bookDetails) {
  const contributors = [];

  if ('Author' in bookDetails) {
    addContributor(contributors, bookDetails['Author'], "Author");
    delete bookDetails['Author']
  }
  if ("Authors" in bookDetails) {
    bookDetails['Authors']
      .split(';')
      .forEach(author => addContributor(contributors, author.trim(), "Author"));
    delete bookDetails['Authors']
  }

  if (contributors.length) {
    bookDetails['Contributors'] = contributors;
  }
}

function extractTable() {
  const container = document.querySelector('.bookinfo');
  const Title = container.querySelector('h1').textContent.trim();

  const table = {};
  container.querySelectorAll('p').forEach((el) => {
    let children = el.childNodes;
    if (children.length === 3 && children[1].textContent === ' ') {
      children = [children[0], children[2]];
    } else if (el.textContent.includes("Sell this book")) {
      return;
    }

    if (children.length !== 2 || children[0].nodeName !== 'STRONG') {
      logMarian('invalid row', el.textContent);
      return;
    }

    let key = children[0].textContent?.trim();
    const value = children[1].textContent?.trim();


    if (!key) {
      logMarian("empty key", el.textContent);
      return;
    } else if (!key.endsWith(':')) {
      logMarian("bad key", key);
      return;
    }

    key = key.substring(0, key.length - 1).trim();
    table[key] = value
  });

  return {
    Title,
    ...table
  }
}

export { isbnSearchScraper };
