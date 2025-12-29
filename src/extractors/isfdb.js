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
    // if (url.match(editionRegex)) return scrapeEdition();
    if (url.match(novelRegex)) return scrapeBook();

    throw new Error("Not implemented")
  }
}


const remapings = remapKeys.bind(undefined, {
  "Series Number": "Series Place",
  "Date": "Publication date",
  "Synopsis": "Description"
});

function scrapeBook() {
  const contentEl = document.querySelector("#wrap div.ContentBox:has(.recordID)");
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
  const container = document.createElement("div");
  for (const con of content) {
    container.innerHTML = con;
    const labelEl = container.querySelector("b");
    let label = cleanText(labelEl.textContent.replace(":", ""));
    labelEl.remove();
    let value = cleanText(container.textContent);

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

  delete details["Current Tags"];
  delete details["Webpages"];
  delete details["User Rating"];

  details = remapings(details);

  recordEl.querySelector("b")?.remove();
  details["Mappings"] = { "ISFDB Title": [cleanText(recordEl.textContent)] };

  console.log("content", content, details);


  return details;
}

export { isfdbScraper };
