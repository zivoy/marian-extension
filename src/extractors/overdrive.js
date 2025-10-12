import { getImageScore, logMarian, sendMessage, getFormattedText } from '../shared/utils.js';

async function getOverdriveDetails() {
  const id = document.querySelector(".cover img")?.dataset?.id;
  if (id == undefined) return {};
  return getDetailsFromOverdriveId(id);
}

async function getLibbyDetails() {
  // normal libby app
  let id = document.querySelector(".cover-box img")?.dataset?.coverId;

  // share page
  if (id == undefined) {
    const shareScript = document.querySelector("script");
    if (shareScript != undefined) {
      const idMatch = shareScript.textContent.match(/'\/availability\/'\+library\+'(\d+)'\+location\.search/);
      if (idMatch != undefined) {
        id = idMatch[1];
      }
    }
  }

  if (id == undefined) return {};
  return getDetailsFromOverdriveId(id);
}

async function getDetailsFromOverdriveId(id) {
  throw "Not implemented"
}

export { getOverdriveDetails, getLibbyDetails };
