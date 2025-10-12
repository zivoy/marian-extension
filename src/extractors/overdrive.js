import { logMarian, getFormattedText, delay } from '../shared/utils.js';

async function getOverdriveDetails() {
  const id = document.querySelector(".cover img")?.dataset?.id;
  if (id == undefined) throw "Id not found";
  return getDetailsFromOverdriveId(id);
}

async function getLibbyDetails() {
  // await for data to load so we can rip it
  await delay(300);
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

  // TODO: make sure JSON conforms to expectations

  // Get relevant details
  // source id
  details["Source ID"] = data.id;

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
  let description = data.fullDescription || data.description;
  description = description.replaceAll("<br/>", "<br/><br/>") // double space paragraphs
  const descriptionEl = document.createElement('div');
  descriptionEl.innerHTML = description;
  details["Description"] = getFormattedText(descriptionEl);

  // title
  let title = data.title;
  if (data.subtitle) {
    title = title + ": " + data.subtitle
  }
  details["Title"] = title

  // format
  details["Edition Format"] = data.type?.name; // eBook most of the time
  details["Edition Information"] = data.edition;

  // publisher
  details["Publisher"] = data.publisher?.name;
  details["Publisher Account"] = data.publisherAccount?.name; // ??

  details["Imprint"] = data.imprint?.name;

  // date
  details["Publication date"] = data.publishDate ?? data.estimatedReleaseDate;

  // language
  if (data.languages.length > 1) {
    details["Languages"] = data.languages.map(language => language.name).join(", ");
  }
  details["Language"] = data.languages[0].name;


  // series
  if (data.detailedSeries) {
    details["Series"] = data.detailedSeries.seriesName;
    details["Series Place"] = data.detailedSeries.readingOrder;
  }

  // Format data


  logMarian("book details", details);

  return details;
}

export { getOverdriveDetails, getLibbyDetails };
