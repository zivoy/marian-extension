(() => {
  // app/dist/content.js
  (() => {
    (() => {
      (() => {
        (() => {
          (() => {
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
              const bookDetails = getDetailBullets();
              const audibleDetails = getAudibleDetails();
              bookDetails["Edition Format"] = getSelectedFormat() || "";
              bookDetails["Title"] = document.querySelector("#productTitle")?.innerText.trim();
              bookDetails["Description"] = getBookDescription() || "";
              bookDetails["img"] = imgEl?.src ? getHighResImageUrl(imgEl.src) : null;
              if (bookDetails["Edition Format"] == "Kindle") {
                bookDetails["Reading Format"] = "Ebook";
              } else if (bookDetails["Edition Format"] == "Audible") {
                bookDetails["Reading Format"] = "Audiobook";
              } else {
                bookDetails["Reading Format"] = "Physical Book";
              }
              return {
                ...bookDetails,
                ...audibleDetails
              };
            }
            function getHighResImageUrl(src) {
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
              //todo
              "ISBN-10",
              "ISBN-13",
              "ASIN",
              "Series",
              "Series Place"
            ];
            async function getGoodreadsDetails() {
              console.log("[\u{1F469}\u{1F3FB}\u200D\u{1F3EB} Marian] Extracting GoodReads details");
              const bookDetails = {};
              const imgEl = document.querySelector(".BookCover__image img");
              bookDetails["img"] = imgEl?.src ? getHighResImageUrl2(imgEl.src) : null;
              bookDetails["Title"] = document.querySelector('[data-testid="bookTitle"]')?.innerText.trim();
              const button = document.querySelector('.ContributorLinksList button[aria-label="Show all contributors"]');
              if (button) {
                button.click();
                await delay(1500);
              }
              getContributors(bookDetails);
              extractEditionDetails(bookDetails);
              extractSeriesInfo(bookDetails);
              const editionFormatEl = document.querySelector('[data-testid="pagesFormat"]')?.innerText.trim();
              if (editionFormatEl) {
                const pagesMatch = editionFormatEl.match(/^(\d+)\s+pages,\s*(.+)$/);
                if (pagesMatch) {
                  bookDetails["Pages"] = parseInt(pagesMatch[1], 10);
                  bookDetails["Edition Format"] = pagesMatch[2];
                } else {
                  bookDetails["Edition Format"] = editionFormatEl;
                }
              }
              const descriptionEl = document.querySelector('[data-testid="contentContainer"] .Formatted');
              bookDetails["Description"] = descriptionEl ? descriptionEl.innerText.trim() : null;
              if (bookDetails["Edition Format"]?.includes("Kindle")) {
                bookDetails["Reading Format"] = "Ebook";
              } else if (bookDetails["Edition Format"].includes("Audible") || bookDetails["Edition Format"].includes("Audiobook")) {
                bookDetails["Reading Format"] = "Audiobook";
              } else {
                bookDetails["Reading Format"] = "Physical Book";
              }
              console.log("Final:", bookDetails);
              return {
                ...bookDetails
              };
            }
            function delay(ms) {
              return new Promise((resolve) => setTimeout(resolve, ms));
            }
            function getHighResImageUrl2(src) {
              return src;
            }
            function getContributors(bookDetails) {
              const authorList = [];
              const narratorList = [];
              document.querySelectorAll('.ContributorLinksList [data-testid="name"]').forEach((nameEl) => {
                const roleEl = nameEl.parentElement.querySelector('[data-testid="role"]');
                const name = nameEl.innerText.trim();
                const roles = roleEl?.innerText || "";
                console.log(`Found name: "${name}" with roles: "${roles}"`);
                if (roles.includes("Author")) authorList.push(name);
                if (!roles) authorList.push(name);
                if (roles.includes("Narrator")) narratorList.push(name);
              });
              if (authorList.length) bookDetails["Author"] = authorList.length === 1 ? authorList[0] : authorList;
              if (narratorList.length) bookDetails["Narrator"] = narratorList.length === 1 ? narratorList[0] : narratorList;
            }
            function extractEditionDetails(bookDetails) {
              const editionRoot = document.querySelector(".EditionDetails dl");
              if (!editionRoot) return;
              console.log("Extracting edition details");
              editionRoot.querySelectorAll(".DescListItem").forEach((item) => {
                const label = item.querySelector("dt")?.innerText.trim();
                const content = item.querySelector('[data-testid="contentContainer"]')?.innerText.trim();
                console.log(`Found label: "${label}", content: "${content}"`);
                if (!label || !content) return;
                if (label === "Published") {
                  const [datePart, publisherPart] = content.split(" by ");
                  bookDetails["Publication date"] = datePart?.trim();
                  bookDetails["Publisher"] = publisherPart?.trim();
                }
                if (label === "ISBN") {
                  const isbn13Match = content.match(/\b\d{13}\b/);
                  const isbn10Match = content.match(/ISBN10:\s*([\dX]{10})/i);
                  if (isbn13Match) bookDetails["ISBN-13"] = isbn13Match[0];
                  if (isbn10Match) bookDetails["ISBN-10"] = isbn10Match[1];
                }
                if (label === "ASIN") {
                  bookDetails["ASIN"] = content;
                }
                if (label === "Language") {
                  bookDetails["Language"] = content;
                }
              });
            }
            function extractSeriesInfo(bookDetails) {
              const workDetails = document.querySelector(".WorkDetails");
              if (!workDetails) return;
              workDetails.querySelectorAll(".DescListItem").forEach((item) => {
                const label = item.querySelector("dt")?.innerText.trim();
                if (label !== "Series") return;
                const contentEl = item.querySelector('[data-testid="contentContainer"]');
                if (!contentEl) return;
                const seriesLink = contentEl.querySelector("a");
                const fullText = contentEl.innerText.trim();
                const seriesName = seriesLink?.innerText.trim() || "";
                const seriesPlaceMatch = fullText.match(/\(#(\d+)\)/);
                if (seriesName) {
                  bookDetails["Series"] = seriesName;
                }
                if (seriesPlaceMatch) {
                  bookDetails["Series Place"] = seriesPlaceMatch[1];
                }
              });
            }
            function getStoryGraphDetails() {
              console.log("[\u{1F469}\u{1F3FB}\u200D\u{1F3EB} Marian] Extracting The StoryGraph details");
            }
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
                const send = async () => {
                  const details = await getDetails();
                  sendResponse(details);
                };
                if (document.readyState === "loading") {
                  document.addEventListener("DOMContentLoaded", send);
                } else {
                  send();
                }
                return true;
              }
            });
            console.log("[\u{1F469}\u{1F3FB}\u200D\u{1F3EB} Marian] content.js loaded");
          })();
        })();
      })();
    })();
  })();
})();
