import { getImageScore, logMarian } from '../shared/utils.js';

async function getDnbDeDetails() {
  logMarian('Extracting isbn.de details');

  const container = document.querySelector("#fullRecordTable");
  if (!container) return null;

  const bookDetails = {};

  const coverData = getCover(container);

  logMarian("bookDetails", { ...bookDetails, ...details });

  return {
    ...bookDetails,
    ...(await coverData)
  };
}

async function getCover(container) {
  /**@type{string|null}*/
  const coverUrl = container.querySelector("img[title='Cover']")?.src || null;
  const largeUrl = coverUrl?.replace("size=", "sz="); // get large cover

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

export { getDnbDeDetails };
