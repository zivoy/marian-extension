import { getImageScore, logMarian } from '../shared/utils.js';

const remapings = {
  'Auflage': 'Edition Information',
  'Autor': "Author",
  'Verlag': "Publisher",
  "Rubrik": "Category",
}
const remappingKeys = Object.keys(remapings);

async function getIsbnDeDetails() {
  logMarian('Extracting isbn.de details');

  // return for now on audiobooks and ebooks
  if (document.URL.includes("hoerbuch")) {
    logMarian("Not implemented");
    return {};
  }

  const bookDetails = {};

  const coverData = getCover();
  bookDetails["Title"] = getTitle();
  bookDetails["Description"] = getDescription() || "";

  const details = extractTable()

  // TODO: get language from ISBN

  // logMarian("bookDetails", { ...bookDetails, ...details });

  return {
    ...bookDetails,
    ...details,
    ...(await coverData)
  };
}

function getTitle() {
  const container = document.querySelector(".isbnhead");
  let title = container.querySelector("h1")?.textContent?.trim();
  const subtitle = container.querySelector("h2")?.textContent?.trim();
  if (subtitle && !subtitle.toLowerCase().includes("kein Untertitel".toLowerCase())) {
    title = `${title}: ${subtitle}`;
  }
  return title;
}

function getDescription() {
  const container = document.querySelector("#bookdesc");
  return container?.innerText || null;
}

async function getCover() {
  /**@type{string|null}*/
  const coverUrl = document.querySelector("img#ISBNcover")?.src || null;
  const largeUrl = coverUrl?.replace("cover", "gross"); // get large cover

  // check large cover first
  if (largeUrl) {
    const largeScore = await getImageScore(largeUrl);
    if (largeScore !== 0) {
      return {
        img: largeUrl,
        imgScore: largeScore
      }
    }
  }

  // fallback to small
  return {
    img: coverUrl,
    imgScore: coverUrl ? await getImageScore(coverUrl) : 0
  }
}

/** 
  * js date function is dumb, ensuring it will parse date correctly if you are not in us
  *
  * @param {string} date A date string written as DD.MM.YYYY
  * @returns {Date} A js date object
  */
function parseDate(date) {
  const parts = date.split('.');

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const year = parseInt(parts[2], 10);

  return new Date(year, month, day);
}

function extractTable() {
  const container = document.querySelector("div.infotab");

  const table = {};
  container.childNodes.forEach((el) => {
    let children = el.childNodes;

    // exceptions
    const title = children[0].textContent.trim();
    if (title.includes("Einband")) return; // part of paperback -- skip
    if (title.includes("Digitalprodukt")) return; // part of ebook -- skip
    if (title === "Buch" || title === "Softcover" || title.includes("eBook")) {
      let cover = "";
      if (title === "Buch") cover = "Hardcover";
      else if (title === "Softcover") cover = "Paperback";
      else cover = "Ebook";
      table["Reading Format"] = cover;

      const pages = children[1].textContent.trim();
      if (!pages.includes("Seiten")) {
        logMarian("Invalid pages", pages)
      } else {
        table["Pages"] = pages.split(' ')[0].trim();
      }
      return;
    }
    if (title === "erschienen am" || title === "Erscheinungsjahr") {
      let date = children[1].textContent.trim()
      if (title === "Erscheinungsjahr") date = "1.1." + date;
      table["Publication date"] = parseDate(date).toISOString();
      return;
    }
    if (title === "ISBN-13") { // because of the fancy link
      let isbn13 = "";
      for (let i = 1; i < children.length; i++) {
        isbn13 = isbn13 + children[i].textContent.trim();
      }
      table[title] = isbn13;
      return;
    }
    if (title === "Autor") {
      table["Contributors"] = [{ name: children[1].textContent.trim(), roles: ["Author"] }];
      // TODO: check for how multiple authors are handled
      return;
    }
    if (title === "Abmessungen") return; // dimensions -- skip

    // rest of table
    if (children.length !== 2 || children[0].nodeName !== 'DIV') {
      logMarian('invalid row', el.textContent);
      return;
    }

    let key = children[0].textContent?.trim();
    const value = children[1].textContent?.trim();


    if (!key) {
      logMarian("empty key", el.textContent);
      return;
    }

    table[key] = value
  });


  for (let [key, value] of Object.entries(table)) {
    if (remappingKeys.includes(key)) {
      delete table[key];
      key = remapings[key];
    }
    table[key] = value;
  }

  return table;
}

export { getIsbnDeDetails };
