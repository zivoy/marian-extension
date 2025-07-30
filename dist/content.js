(() => {
  // src/extractors/amazon.js
  var bookSeriesRegex = /^Book (\d+) of \d+$/i;
  var includedLabels = [
    "Author",
    "Narrator",
    "Publisher",
    "Publication date",
    "Audible.com Release Date",
    "Program Type",
    "Language",
    "Print length",
    "Listening Length",
    "ISBN-10",
    "ISBN-13",
    "ASIN",
    "Series",
    "Series Place"
  ];
  function getAmazonDetails() {
    console.log("[\u{1F469}\u{1F3FB}\u200D\u{1F3EB} Marian] Extracting Amazon details");
    const imgEl = document.querySelector("#imgBlkFront, #landingImage");
    const bookDetails2 = getDetailBullets();
    const audibleDetails = getAudibleDetails();
    bookDetails2["Edition Format"] = getSelectedFormat() || "";
    bookDetails2["Title"] = document.querySelector("#productTitle")?.innerText.trim();
    bookDetails2["Description"] = getBookDescription() || "";
    bookDetails2["img"] = imgEl?.src ? getHighResImageUrl2(imgEl.src) : null;
    if (bookDetails2["Edition Format"] == "Kindle") {
      bookDetails2["Reading Format"] = "Ebook";
    } else if (bookDetails2["Edition Format"] == "Audible") {
      bookDetails2["Reading Format"] = "Audiobook";
    } else {
      bookDetails2["Reading Format"] = "Physical Book";
    }
    return {
      ...bookDetails2,
      ...audibleDetails
    };
  }
  function getHighResImageUrl2(src) {
    return src.replace(/\._[^.]+(?=\.)/, "");
  }
  function getDetailBullets() {
    const bullets = document.querySelectorAll("#detailBullets_feature_div li");
    const details = {};
    bullets.forEach((li) => {
      const labelSpan = li.querySelector("span.a-text-bold");
      if (!labelSpan) return;
      let label = labelSpan.textContent.replace(/[\u200E\u200F\u202A-\u202E:\u00A0\uFEFF‎‏]/g, "").replace(":", "").trim();
      const valueSpan = labelSpan.nextElementSibling;
      let value = valueSpan?.textContent?.replace(/\s+/g, " ").trim();
      const match = bookSeriesRegex.exec(label) || bookSeriesRegex.exec(value);
      if (match) {
        details["Series"] = value;
        details["Series Place"] = match[1];
        return;
      }
      if (!includedLabels.includes(label)) {
        return;
      }
      if (!label || !value) return;
      if (label === "Print length") {
        label = "Pages";
        const pageMatch = value.match(/\d+/);
        value = pageMatch ? pageMatch[0] : value;
      }
      details[label] = value;
    });
    return details;
  }
  function getAudibleDetails() {
    const table = document.querySelector("#audibleProductDetails table");
    if (!table) return {};
    const details = {};
    const rows = table.querySelectorAll("tr");
    rows.forEach((row) => {
      const label = row.querySelector("th span")?.textContent?.trim();
      const value = row.querySelector("td")?.innerText?.trim();
      const match = bookSeriesRegex.exec(label) || bookSeriesRegex.exec(value);
      if (match) {
        details["Series"] = value;
        details["Series Place"] = match[1];
        return;
      }
      if (!includedLabels.includes(label)) {
        return;
      }
      if (label === "Audible.com Release Date") {
        details["Publication date"] = value;
      } else if (label === "Program Type") {
        details["Reading Format"] = value;
        details["Edition Format"] = "Audible";
      } else if (label === "Listening Length") {
        const timeMatch = value.match(/(\d+)\s*hours?\s*(?:and)?\s*(\d+)?\s*minutes?/i);
        if (timeMatch) {
          const arr = [];
          if (timeMatch[1]) arr.push(`${timeMatch[1]} hours`);
          if (timeMatch[2]) arr.push(`${timeMatch[2]} minutes`);
          details["Listening Length"] = arr;
        } else {
          details["Listening Length"] = value;
        }
      } else if (label === "Narrator" || label === "Author") {
        const names = value.split(/,\s*|\band\b\s*/).map((name) => name.trim());
        details[label] = names.length > 1 ? names : names[0];
      } else if (label && value) {
        details[label] = value;
      }
    });
    const imgEl = document.querySelector("#audibleProductImage img");
    if (imgEl?.src) {
      details.img = imgEl.src;
    }
    return details;
  }
  function getBookDescription() {
    const container = document.querySelector("#bookDescription_feature_div .a-expander-content");
    if (!container) return "";
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    let text = "";
    while (walker.nextNode()) {
      text += walker.currentNode.nodeValue;
    }
    return text.trim().replace(/\s+/g, " ");
  }
  function getSelectedFormat() {
    const selected = document.querySelector("#tmmSwatches .swatchElement.selected .slot-title span[aria-label]");
    if (selected) {
      return selected.getAttribute("aria-label")?.replace(" Format:", "").trim();
    }
    return null;
  }

  // src/extractors/goodreads.js
  var bookSeriesRegex2 = "";
  var includedLabels2 = [
    "Author",
    "Narrator",
    "Publisher",
    "Publication date",
    "Audible.com Release Date",
    "Program Type",
    "Language",
    "Print length",
    "Listening Length",
    "ISBN-10",
    "ISBN-13",
    "ASIN",
    "Series",
    "Series Place"
  ];
  function getGoodreadsDetails() {
    console.log("[\u{1F469}\u{1F3FB}\u200D\u{1F3EB} Marian] Extracting GoodReads details");
    const imgEl = document.querySelector(".BookCover__image img");
    bookDetails["img"] = imgEl?.src ? getHighResImageUrl(imgEl.src) : null;
    console.log(bookDetails["img"]);
  }

  // src/extractors/storygraph.js
  function getStoryGraphDetails() {
    console.log("[\u{1F469}\u{1F3FB}\u200D\u{1F3EB} Marian] Extracting The StoryGraph details");
  }

  // src/content.js
  function getDetails() {
    const url = window.location.href;
    console.log(`[\u{1F469}\u{1F3FB}\u200D\u{1F3EB} Marian] Current URL: ${url}`);
    if (url.includes("amazon.com")) return getAmazonDetails();
    if (url.includes("goodreads.com")) return getGoodreadsDetails();
    if (url.includes("thestorygraph.com")) return getStoryGraphDetails();
    if (url.includes("isbnsearch.org")) return getIsbnSearchDetails();
    return {};
  }
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg === "ping") {
      sendResponse("pong");
    }
    if (msg === "getDetails") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
          sendResponse(getDetails());
        });
        return true;
      } else {
        sendResponse(getDetails());
      }
    }
  });
  console.log("[\u{1F469}\u{1F3FB}\u200D\u{1F3EB} Marian] content.js loaded");
})();
