import {
  addContributor,
  collectObject,
  getCoverData,
  getFormattedText,
  normalizeReadingFormat,
} from "../shared/utils.js";
import { Extractor } from "./AbstractExtractor.js";

class indieBookstoreScraper extends Extractor {
  get _name() {
    return "indiebookstores.ca Extractor";
  }

  _sitePatterns = [/https:\/\/(?:www\.)?indiebookstores\.ca\/book\/(\d+)/];

  async getDetails() {
    let details = {};
    const coverData = getCoverData(document.querySelector(".sbpt-img").src);

    getProductDetails(details);

    return collectObject([details, coverData]);
  }
}

function getProductDetails(details) {
  details["Title"] = document.querySelector("h1").textContent.trim();
  details["Contributors"] = getContributors();

  for (const el of document.querySelectorAll(".accordion-button")) {
    if (el.textContent == "Description") {
      details["Description"] = getFormattedText(el.nextElementSibling);
    } else if (el.textContent == "Product Details") {
      const rawDetailChildren = el.nextElementSibling.children[0].children;
      const detailChildren = [];

      for (let i = 0; i < rawDetailChildren.length; i++) {
        if (rawDetailChildren[i].tagName == "STRONG") {
          detailChildren.push(rawDetailChildren[i]);
        }
      }

      for (let i = 0; i < detailChildren.length; i++) {
        switch (detailChildren[i].innerText) {
          case "ISBN:":
            if (detailChildren[i].length == 10) {
              details["ISBN-10"] =
                detailChildren[i].nextSibling.textContent.trim();
            } else {
              details["ISBN-13"] =
                detailChildren[i].nextSibling.textContent.trim();
            }
            break;
          case "Format:":
            details["Reading Format"] = normalizeReadingFormat(
              detailChildren[i].nextSibling.textContent.trim()
            );
            details["Edition Format"] =
              detailChildren[i].nextSibling.textContent.trim();
            break;
          case "Pages:":
            details["Pages"] = detailChildren[i].nextSibling.textContent.trim();
            break;
          case "Publisher:":
            details["Publisher"] =
              detailChildren[i].nextSibling.textContent.trim();
            break;
          case "Published:":
            details["Publication Date"] =
              detailChildren[i].nextSibling.textContent.trim();
            break;
        }
      }
    }
  }
}

function getContributors() {
  const rawContributors = document.querySelectorAll(".sbpt-author .author");
  const contributors = [];

  rawContributors.forEach((contributor) =>
    addContributor(contributors, contributor.textContent, "Author")
  );

  return contributors;
}

export { indieBookstoreScraper };
