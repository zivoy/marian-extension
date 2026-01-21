import { Extractor } from "./AbstractExtractor.js";
import { addContributor, addMapping, cleanText, collectObject, getCoverData, getFormattedText, normalizeReadingFormat, remapKeys } from "../shared/utils.js";

const nameRemap = remapKeys.bind(undefined, {
  "Genre": undefined,
  "Page Count": "Pages",
  "On Sale": "Publication date",
});


class torPublishingScraper extends Extractor {
  get _name() { return "Tor Publishing Group Extractor"; }

  needsReload = false;
  _sitePatterns = [
    /https:\/\/torpublishinggroup\.com\/+(.+?)\/+/
  ];

  async getDetails() {
    const bookMain = document.querySelector(`post-hero`);
    const bookDetails = document.querySelector(`book-details`)
    if (!bookDetails || !bookMain) throw new Error("Missing book information");

    const coverDetails = getCoverData(bookMain.querySelector("img")?.src);

    let details = {};

    details["Publisher"] = "Tor Publishing Group";

    details["Title"] = cleanText(bookMain.querySelector("h1")?.textContent ?? "");
    const contributors = [];
    bookMain.querySelectorAll(".author-item").forEach((author) => {
      addContributor(contributors, cleanText(author.textContent ?? ""), "Author");
    });
    details["Contributors"] = contributors;
    const formatSelect = bookMain.querySelector("select");
    details["Edition Format"] = cleanText(formatSelect.options[formatSelect.selectedIndex].textContent ?? "");
    details["Reading Format"] = normalizeReadingFormat(details["Edition Format"]);
    details["Description"] = getFormattedText(bookMain.querySelector(".prose"));

    const detailsList = bookDetails.querySelectorAll("li");
    for (const detail of detailsList) {
      let [title, value] = detail.textContent.split(":").map(cleanText);

      if (title === "ISBN") {
        if (value.length === 13) title = "ISBN-13"
        else if (value.length === 10) title = "ISBN-10"
      }

      details[title] = value
    }

    for (const buy of bookMain.querySelectorAll("a.buy-buttons")) {
      const link = buy.href ?? "";
      const amazonMatch = link.match(/amazon\..*?\/(?:dp|gp\/product)\/.*?(B[\dA-Z]{9}|\d{9}(?:X|\d))/);
      if (amazonMatch) details["ASIN"] = amazonMatch[1];

    }

    details = nameRemap(details);

    return collectObject([
      coverDetails,
      details,
    ]);
  }
}

export { torPublishingScraper };
