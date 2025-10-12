import { getImageScore, logMarian, sendMessage, getFormattedText } from '../shared/utils.js';

async function getOverdriveDetails() {
  const id = document.querySelector(".cover img")?.dataset?.id;
  if (id == undefined) throw "Id not found";
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

  if (id == undefined) throw "Id not found";
  return getDetailsFromOverdriveId(id);
}

const apiUrl = "https://thunder.api.overdrive.com/v2/media/bulk";

async function getDetailsFromOverdriveId(id) {
  // retrieve data
  const url = new URL(apiUrl);
  url.searchParams.set('titleIds', id);
  url.searchParams.set('x-client-id', "marian"); // dewey

  const req = await fetch(url);
  if (!req.ok) {
    throw "Failed to retrive data from api";  // failed to retrieve data
  }
  let data = await req.json();
  if (data.length < 1) {
    throw "Data not found"
  }
  data = data[0];

  logMarian("book data", data);

  const details = {};

  // Get relevant details
  // cover
  const cover = Object.values(data.covers)
    .reduce((cover, { width, height, href }) => cover.res > (width * height) ? cover : { res: width * height, href }) // get cover with highest resolution
  details["img"] = cover.href;
  details["imgScore"] = cover.res; // save on calling getImageScore because we already have the resolution

  // contributors
  const contributors = Object.values(data.creators.reduce((acc, { id, name, role }) => {
    if (!acc[id]) {
      acc[id] = { name, roles: [] };
    }
    acc[id].roles.push(role);
    return acc;
  }, {}));
  details["Contributors"] = contributors;

  // description
  details["Description"] = getFormattedText(data.fullDescription);

  // title
  let title = data.title;
  if (data.subtitle) {
    title = title + ": " + data.subtitle
  }
  details["Title"] = title

  // format
  details["Edition Format"] = data.type?.name; // eBook most of the time

  // publisher
  details["Publisher"] = data.publisher?.name;
  details["Publisher Account"] = data.publisherAccount?.name; // ??

  details["Imprint"] = data.imprint?.name;

  // date
  details["Publication date"] = data.publishDate ?? data.estimatedReleaseDate;

  // Format data


  logMarian("book details", details);

  return details;
}

export { getOverdriveDetails, getLibbyDetails };
