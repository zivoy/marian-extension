import { Extractor } from './AbstractExtractor.js';
import {
  logMarian, getFormattedText, getCoverData, remapKeys,
  addContributor, cleanText,
  collectObject
} from '../shared/utils.js';

class isbndbScraper extends Extractor {
  get _name() { return "ISBNdb Extractor"; }
  _sitePatterns = [
    /https:\/\/(?:www\.)?isbndb\.com\/book\/((?:\d{3})?\d{9}(?:X|x|\d))\b/,
  ];

  async getDetails() {
    const container = document.querySelector(".book-table table");
    if (!container) return null;

    const coverData = getCover(container);

    const bookDetails = extractTable(container)

    // logMarian("bookDetails", bookDetails);

    return collectObject([
      coverData,
    ]);
  }
}

const remapings = {
  "ISBN": "ISBN-10",
  "ISBN13": "ISBN-13",
  "Binding": "Edition Format",
  "Edition": "Edition Information",
  "Full Title": "Title",
}
const nameRemap = remapKeys.bind(undefined, remapings);

async function getCover() {
  /**@type{string|null}*/
  const coverUrl = document.querySelector(".artwork object")?.data || null;

  return getCoverData(coverUrl);
}

function extractTable(/**@type{HTMLTableElement}*/container) {
  const table = {};
  const rows = container.querySelectorAll("tr");
  for (let i = 0; i < rows.length; i++) {
    const el = rows[i];
    if (el.childNodes.length === 0) {
      continue;
    }

    const th = el.querySelector("th");
    const td = el.querySelector("td");
    if (td.classList.contains("blurred")) {
      // blurred row, skip
      continue;
    }

    if (td == null || th == null) {
      logMarian('invalid row', el.textContent);
      continue;
    }

    const key = cleanText(th.textContent?.replace(":", ""));
    let value = cleanText(td.textContent);

    // rest of table
    if (!key) {
      logMarian("empty key", el.textContent);
      continue;
    }

    // exceptions
    if (key === "Authors") {
      const contributors = [];
      td.childNodes.forEach((node) => {
        if (node.nodeName === "BR") return;
        const author = cleanText(node.textContent);
        if (!author) return;
        addContributor(contributors, author, "Author");
      })
      table["Contributors"] = contributors;
      continue;
    }
    if (key === "Publish Date" && value != undefined) {
      try {
        value = new Date(value);
      } catch { }
      table["Publication date"] = value;
      continue;
    }
    if (key === "Pages" && value != undefined) {
      table["Pages"] = value.split(" ")[0].trim(); // remove pages text
      continue;
    }
    if (key === "Synopsis") {
      text = getFormattedText(td)
      table["Description"] = text;
      continue;
    }
    if (key === "Subjects") continue; // skip these

    table[key] = value
  }

  return nameRemap(table);
}

export { isbndbScraper };
