import { Extractor } from "./AbstractExtractor.js";
import { collectObject, cleanText, fetchHTML, getCoverData, getFormattedText, addContributor, remapKeys, addMapping } from "../shared/utils.js";

class libraryThingScraper extends Extractor {
  get _name() { return "LibraryThing Extractor"; }

  needsReload = false;
  _sitePatterns = [
    /https:\/\/www\.librarything\.com\/+work\/+(\d+)\/*(?:(\d+)|work\/+(\d+))?/,
  ];

  async getDetails() {
    return collectObject([
      getCover(),
      getFacts(),
      getCommonKnowledge(),
      getTitle(),
      getDescription(),
      getAuthor(),
    ]);
  }
}

function getTitle() {
  return {
    "Title": cleanText(document.querySelector(`.work_info_area .h1_work_title`)?.textContent ?? "")
  };
}

function getDescription() {
  const descriptionElm = document.querySelector(`#section_description`);
  if (!descriptionElm) return {};

  const clonedDescription = descriptionElm.cloneNode(true);

  const headerElm = clonedDescription.querySelector(`h2`);
  headerElm.remove();

  const showMoreElms = clonedDescription.querySelectorAll(`.showlessmore_link`);
  for (const showMoreElm of showMoreElms) showMoreElm.remove();

  return {
    "Description": getFormattedText(clonedDescription)
  };
}

function getAuthor() {
  const authorElm = document.querySelector(`.h3_work_author`);
  if (!authorElm) return {};

  const contributors = [];
  const authors = authorElm.querySelectorAll(`span.ltil_item`);
  for (const author of authors) {
    let name = cleanText(author.textContent).replace(/,$/, "");

    let role = "Author";
    const match = name.match(/(.+) \((.*)\)/);
    if (match) {
      name = match[1];
      role = match[2];
    }

    addContributor(contributors, name, role);
  }

  return {
    "Contributors": contributors
  };
}


const mappingDict = {
  "Published": "Publication date",
  "Original publication date": "Publication date",
}
function remappings(text) {
  if (text in mappingDict) return mappingDict[text];
  return text;
}

const nameRemap = remapKeys.bind(undefined, {
  "Genres": undefined,
  "Canonical title": undefined,
  "Epigraph": undefined,
  "Dedication": undefined,
  "People/Characters": undefined,
  "Important places": undefined,
  "Important events": undefined,
  "First words": undefined,
  "Quotations": undefined,
  "Last words": undefined,
  "Blurbers": undefined,
  "Disambiguation notice": undefined,
  "Related movies": undefined,

  "Alternate titles": "Alt Title",
});

function getFacts() {
  const quickFactsElm = document.querySelector(`#section_quickfacts`);
  if (!quickFactsElm) return {};

  const listElm = quickFactsElm.querySelector("dl");
  if (!listElm) return {};

  let details = {};

  for (let i = 0; i < listElm.children.length; i += 2) {
    const titleElm = listElm.children[i];
    const valueElm = listElm.children[i + 1];
    if (!titleElm || !valueElm) continue;
    if (!titleElm.classList.contains("fact")) continue;

    let title = cleanText(titleElm.textContent);
    let value = cleanText(valueElm.textContent);
    title = remappings(title)

    if (title === "Publication date" && value.match(/^\d+$/)) {
      value = new Date(value, 0);
    }
    if (title === "LCC" || title === "DDC/MDS") {
      value = addMapping(details["Mappings"] ?? {}, title, value)
      title = "Mappings"
    }

    details[title] = value;
  }

  details = nameRemap(details);
  return details;
}

function getCommonKnowledge() {
  const commonKnowledgeElm = document.querySelector(`#section_common_knowledge`);
  if (!commonKnowledgeElm) return {};

  const listElm = commonKnowledgeElm.querySelector("dl");
  if (!listElm) return {};

  let details = {};

  for (let i = 0; i < listElm.children.length; i += 2) {
    const titleElm = listElm.children[i];
    const valueElm = listElm.children[i + 1];
    if (!titleElm || !valueElm) continue;

    let title = cleanText(titleElm.textContent);
    let value = cleanText(valueElm.textContent);
    title = title.replace(/\*$/, "");
    title = remappings(title)

    if (title === "Publication date" && value.match(/^\d+$/)) {
      value = new Date(value, 0);
    } else if (title === "Publication date") {
      value = new Date(value);
    }
    if (title === "Canonical DDC/MDS" || title === "Canonical LCC") {
      // skip, is in quick facts
      continue;
    }

    details[title] = value;
  }

  details = nameRemap(details);
  if ("Original language" in details && !("Language" in details)) {
    details["Language"] = details["Original language"];
    delete details["Original language"];
  }
  return details;
}

async function getCover() {
  const covers = new Set();

  const coverContainer = document.querySelector(`#lt2_mainimage_container img`); if (coverContainer) {
    covers.add(coverContainer.src);
    coverContainer.srcset?.split(" ")
      ?.filter(x => x.includes("http"))
      ?.map(x => covers.add(x));
  }

  const bigCovers = await getBigCovers();
  if (bigCovers) {
    bigCovers.forEach(cover => {
      if (cover) covers.add(cover);
    });
  }

  covers.forEach(x => { if (x) covers.add(getHighResImageUrl(x)); });
  console.log("covers", covers);
  return getCoverData([...covers]);
}

function getHighResImageUrl(src) {
  return src.replace(/\._[^.]+(?=\.)/, "");
}

async function getBigCovers() {
  const coverMag = document.querySelector("#covermag");
  if (!coverMag) return [];

  //covertype, coverid, workID, bookID
  const params = coverMag.outerHTML
    ?.split("event,")[1]
    ?.split(")")[0]
    ?.split(",")?.map(x => x.replaceAll("'", "").trim());
  if (!params || params.length < 2) return [];
  const covertype = params[0];
  const coverid = params[1];
  const workID = params[2];
  const bookID = params[3];

  var myArray = coverid.split(':');
  var theid = myArray[1];

  var url = 'https://www.librarything.com/ajax_coverinfo_lt2.php';
  var urlParams = new URLSearchParams({
    covertype: covertype,
    id: theid,
    work: workID,
    book: bookID,
    workpage: 1
  });

  const dom = await fetchHTML(`${url}?${urlParams.toString()}`);
  // console.log("dom", dom);
  if (!dom) return [];

  const covers = [];
  const coverContainer = dom.querySelector(`#maincover_box img`);
  if (coverContainer) {
    covers.push(coverContainer.src);
    coverContainer.srcset?.split(" ")
      ?.filter(x => x.includes("http"))
      ?.map(x => covers.push(x));
  }

  return covers;
}

export { libraryThingScraper };
