import { addContributor, cleanText, collectObject, getFormattedText, remapKeys } from "../shared/utils.js";
import { Extractor } from "./AbstractExtractor.js"

const editionRegex = /https:\/\/(?:www\.)?isfdb\.org\/cgi-bin\/pl\.cgi\?(\d+)/;
const novelRegex = /https:\/\/(?:www\.)?isfdb\.org\/cgi-bin\/title\.cgi\?(\d+)/;

class isfdbScraper extends Extractor {
  get _name() { return "ISFDB Extractor"; }

  needsReload = false;

  _sitePatterns = [
    novelRegex,
    editionRegex,
  ];

  async getDetails() {
    const url = window.location.href;
    if (url.match(editionRegex)) return scrapeEdition();
    if (url.match(novelRegex)) return scrapeBook();

    throw new Error("Not implemented");
  }
}


const remapings = remapKeys.bind(undefined, {
  "Series Number": "Series Place",
  "Date": "Publication date",
  "Synopsis": "Description",

  "Current Tags": undefined,
  "Webpages": undefined,
  "User Rating": undefined,
});

function scrapeBook(doc = document) {
  const contentEl = doc.querySelector("#wrap div.ContentBox:has(.recordID)");
  if (contentEl == undefined) throw new Error("Failed to find book element");
  const clonedContent = contentEl.cloneNode(true);

  const recordEl = clonedContent.querySelector(".recordID");
  recordEl.remove();

  const notesEl = clonedContent.querySelector(".notes");
  if (notesEl) {
    notesEl.after(document.createElement("br"));
    notesEl.remove();
  }

  const content = clonedContent.innerHTML.split(/<br>/i);
  if (notesEl) content.push.apply(content, notesEl.innerHTML.split(/<br>/i));

  let details = {};

  recordEl.querySelector("b")?.remove();
  details["Mappings"] = { "ISFDB Title": [cleanText(recordEl.textContent)] };

  const container = document.createElement("div");
  for (const con of content) {
    container.innerHTML = con;
    const labelEl = container.querySelector("b");
    let label = cleanText(labelEl.textContent.replace(":", ""));
    labelEl.remove();
    let value = cleanText(container.textContent);

    if (label === "Date") {
      const valSplit = value.split("-");
      if (valSplit.length === 3) {
        value = new Date(valSplit[0], Math.max(0, valSplit[1] - 1), valSplit[2]);
      }
    }
    if (label === "Author") {
      value = addContributor(details["Contributors"] ?? [], value, "Author");
      label = "Contributors";
    }
    if (label === "Authors") {
      let contrbutors = details["Contributors"] ?? [];
      for (const author of container.querySelectorAll("a")) {
        value = addContributor(contrbutors, cleanText(author.textContent), "Author");
      }
      label = "Contributors";
    }
    if (label === "Synopsis") {
      value = getFormattedText(container);
    }

    details[label] = value;
  }

  details = remapings(details);

  return details;
}

async function scrapeEdition() {
  const contentEl = document.querySelector("#wrap div.ContentBox:has(.recordID)");
  if (contentEl == undefined) throw new Error("Failed to find edition element");
  const clonedContent = contentEl.cloneNode(true);

  const titlesBoxEl = document.querySelector("#wrap div.ContentBox:not(:has(.recordID))");
  if (titlesBoxEl == undefined) throw new Error("Failed to find book info element");

  const recordEl = clonedContent.querySelector(".recordID");
  recordEl.remove();

  let details = {};

  details["Title"] = "Foundation's Edge";

  recordEl.querySelector("b")?.remove();
  const editionId = cleanText(recordEl.textContent);

  const titlesLi = [...titlesBoxEl.querySelectorAll("li")];
  const titleLinks = titlesLi
    .map(i => [...i.querySelectorAll("a")])
    .flat()
    .filter(i => i.href.includes("title.cgi"));
  const titleLink = (titleLinks
    .filter(i => cleanText(i.textContent) === details["Title"])[0]
    ?? titleLinks[0]
  )?.href;

  console.log("titleLink", titleLink);

  details = await collectObject([
    new Promise((resolve, reject) => {
      if (titleLink == undefined) {
        resolve({});
        return;
      }
      fetchHTML(titleLink)
        .then((doc) => {
          if (doc == undefined) {
            reject("No document");
            return;
          }

          resolve(scrapeBook(doc));
        })
        .catch(reject);
    }),
    details,
  ]);

  const mappings = details["Mappings"] ?? {};
  mappings["ISFDB Edition"] = [editionId];
  details["Mappings"] = mappings;

  return details;
}

async function fetchHTML(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    return doc;
  } catch (error) {
    console.error('Error fetching HTML:', error);
  }
}

export { isfdbScraper };
