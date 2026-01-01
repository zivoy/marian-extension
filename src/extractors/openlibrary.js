import { Extractor } from "./AbstractExtractor.js"
import { addContributor, collectObject, getCoverData, normalizeReadingFormat, remapKeys } from "../shared/utils.js";

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

    return getDetails(id);
  }
}

const mappingDict = {
  "goodreads": "Goodreads",
  "google": "Google Books",
  "project_gutenberg": "Project Gutenberg",
  "librarything": "LibraryThing",

  "paperback": "Paperback",
  "hardcover": "Hardcover",
}
function remappings(text) {
  if (text in mappingDict) return mappingDict[text];
  return text;
}

async function getDetails(idUrl) {
  const data = await fetchJson(idUrl);
  const isEdition = getFirstKey(data["type"])?.includes("edition");
  console.log("data", data);

  let detailsList = [];
  let mappings = {};

  if (isEdition) {
    addMapping(mappings, "Open Liberary Edition", data["key"]);

    const work = getFirstKey(data["works"]);
    if (work) {
      detailsList.push(getDetails(work));
    }
  } else {
    addMapping(mappings, "Open Liberary Work", data["key"]);
  }
  if ("covers" in data) {
    const covers = data["covers"].filter((i) => i > 0);
    if (covers.length > 0) {
      const coverId = covers[0];
      detailsList.push(getCoverData(`https://covers.openlibrary.org/b/id/${coverId}-L.jpg`));
    }
  }

  let details = {};
  detailsList.push(details);

  if ("physical_format" in data) {
    details["Edition Format"] = remappings(data["physical_format"]);
    details["Reading Format"] = normalizeReadingFormat(data["physical_format"]);
  }
  if ("number_of_pages" in data) {
    details["Pages"] = data["number_of_pages"];
  }
  if ("pagination" in data) {
    details["Pagination"] = data["pagination"];
  }
  if ("title" in data) {
    details["Title"] = data["title"];
  }
  if ("description" in data) {
    details["Description"] = data["description"];
  }
  if ("identifiers" in data) {
    Object.entries(data["identifiers"]).forEach(([k, v]) => {
      k = remappings(k);
      if (k === "amazon") {
        detailsList.push({ "ASIN": v[0] });
        return;
      }
      v.forEach(i => addMapping(mappings, k, i));
    });
  }

  if ("publish_places" in data) {
    const location = data["publish_places"][0];
    if (location) {
      details["Country"] = location;
    }
  }

  if ("isbn_13" in data) {
    const isbn = data["isbn_13"][0];
    if (isbn) {
      details["ISBN-13"] = isbn;
    }
  }
  if ("isbn_10" in data) {
    const isbn = data["isbn_10"][0];
    if (isbn) {
      details["ISBN-10"] = isbn;
    }
  }

  if ("edition_name" in data) {
    details["Edition Information"] = data["edition_name"];
  }
  if ("publish_date" in data) {
    details["Publication date"] = parseDateLocal(data["publish_date"]);
  }
  if ("publishers" in data) {
    details["Publisher"] = data["publishers"][0];
  }

  if ("languages" in data) {
    detailsList.push(new Promise(async (r) => {
      const languageId = getFirstKey(data["languages"]);
      const langData = await fetchJson(languageId);
      const name = langData["name"];
      if (name) {
        return r({ "Language": name });
      }
      r({});
    }));
  }

  if ("translated_from" in data) {
    detailsList.push(new Promise(async (r) => {
      const languageId = getFirstKey(data["translated_from"]);
      const langData = await fetchJson(languageId);
      const name = langData["name"];
      if (name) {
        return r({ "Original Language": name });
      }
      r({});
    }));
  }

  if ("authors" in data) {
    detailsList.push(new Promise(async (r) => {
      const authors = data["authors"];
      let contributors = [];
      for (const author of authors) {
        if (author.key == undefined) continue;
        const authorData = await fetchJson(author.key);
        const name = authorData["name"];
        if (name) {
          addContributor(contributors, name, "Author");
        }
      }
      r(contributors.length > 0 ? { "Contributors": contributors } : {});
    }));
  }

  let result = await collectObject(detailsList);

  if (result["Mappings"]) Object.entries(result["Mappings"]).forEach(([k, v]) => {
    v.forEach(i => {
      addMapping(mappings, k, i);
    })
  });
  result["Mappings"] = mappings;
  return result;
}

function addMapping(mappings, name, idUrl) {
  let map = mappings[name] ?? [];
  map.push(idOnly ? idUrl.match(/OL\d+\w/)[0] : idUrl);
  mappings[name] = map;
  return mappings;
}

function getFirstKey(obj) {
  if (Array.isArray(obj)) {
    obj = obj[0];
    if (obj == undefined) return;
  }
  return obj?.key;
}

function parseDateLocal(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);

  return new Date(
    year,
    (month - 1) || 0,
    day || 1
  );
}

/**
 * fetch JSON endpoint for OpenLibrary api
 * @param {string} idUrl - the id / path for the endpoint
 */
async function fetchJson(idUrl) {
  if (!idUrl.startsWith("/")) idUrl = `/${idUrl}`;
  try {
    const response = await fetch(`https://openlibrary.org${idUrl}.json`);
    if (!response.ok) {
      throw new Error(`API error! status: ${response.status}`);
    }
    const json = await response.json();

    return json;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

export { openlibraryScraper };
