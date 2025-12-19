import { Extractor } from "./AbstractExtractor.js"
import { logMarian, getFormattedText, getCoverData, addContributor, cleanText, normalizeReadingFormat, collectObject } from '../shared/utils.js';


const MODAL_DELAY = 1500;
const REGEX_HOURS = /(\d+)\s*h/;
const REGEX_MINUTES = /(\d+)\s*m/;
const REGEX_SERIES_PLACE = /#(\d+)/;
const REGEX_BRACKET_CONTENT = /\([^()]*\)/;
const SECONDS_IN_HOUR = 3600;
const SECONDS_IN_MINUTE = 60;

class barnesAndNobleScraper extends Extractor {
  get _name() { return "Barnes & Noble Extractor"; }
  needsReload = false;
  _sitePatterns = [
    /https:\/\/(?:www\.)?barnesandnoble\.com\/.+\/(\d+)/
  ];

  async getDetails() {
    logMarian('Extracting Barnes & Noble details');
    const bookDetails = getProductDetails();

    bookDetails['Reading Format'] = getSelectedFormat();
    bookDetails['Title'] = document.querySelector('h1').textContent.trim();
    bookDetails['Contributors'] = getContributors();

    return {
      ...(await getCover()),
      ...(await getBookDescription()),
      ...getAudioBookTimes(),
      ...bookDetails,
    };
  }
}

async function getCover() {
  const imgEl = document.querySelector('#pdpMainImage');
  return getCoverData(imgEl.src);
}

function getContributors() {
  const rawContributors = document.querySelector('#key-contributors');
  // No need to press "View More" if there's lots of narrators, as the names are still in the HTML
  const rawNarrators = document.querySelector('#key-contributors p');
  const contributors = [];

  for (let i = 0; i < rawContributors?.children.length; i++) {
    if (rawContributors.children[i].nodeName == 'A') {
      const contributorName = rawContributors.children[i].text
        .replace(REGEX_BRACKET_CONTENT, '')
        .trim();

      const rawContributorRole = REGEX_BRACKET_CONTENT.exec(
        rawContributors.children[i].text
      );

      let contributorRole;

      if (rawContributorRole) {
        contributorRole = rawContributorRole[0]
          .replace('(', '')
          .replace(')', '');
      }

      switch (contributorRole) {
        case 'Read by':
          contributors.push({
            name: contributorName,
            roles: ['Narrator'],
          });
          break;
        case 'Artist':
          contributors.push({
            name: contributorName,
            roles: ['Illustrator'],
          });
          break;
        case undefined:
          contributors.push({
            name: contributorName,
            roles: ['Author'],
          });
          break;
        default:
          contributors.push({
            name: contributorName,
            roles: [contributorRole],
          });
      }
    }
  }

  if (rawNarrators) {
    for (let i = 0; i < rawNarrators?.children.length; i++) {
      if (rawNarrators.children[i].nodeName == 'A') {
        contributors.push({
          name: rawNarrators.children[i].text,
          roles: ['Narrator'],
        });
      }
    }
  }

  return contributors;
}

function getProductDetails() {
  const details = {};

  const detailsTable = document.querySelector('#ProductDetailsTab table tbody');
  if (detailsTable) {
    for (let i = 0; i < detailsTable.rows.length; i++) {
      switch (detailsTable.rows[i].children[0].innerText) {
        case 'ISBN-13:':
          details['ISBN-13'] = detailsTable.rows[i].children[1].innerText;
          break;
        case 'ISBN-10:':
          details['ISBN-10'] = detailsTable.rows[i].children[1].innerText;
          break;
        case 'Publisher:':
          details['Publisher'] = detailsTable.rows[i].children[1].innerText;
          break;
        case 'Publication date:':
          details['Publication date'] =
            detailsTable.rows[i].children[1].innerText;
          break;
        case 'Series:':
          const seriesPlace = REGEX_SERIES_PLACE.exec(
            detailsTable.rows[i].children[1].innerText
          );

          if (seriesPlace) {
            details['Series Place'] = seriesPlace[1] || null;
          }

          const series = detailsTable.rows[i].children[1].children[0].text;

          details['Series'] = series;

          break;
        case 'Pages:':
          details['Pages'] = detailsTable.rows[i].children[1].innerText;
          break;
        case 'Edition description:':
          details['Edition Information'] =
            detailsTable.rows[i].children[1].innerText;
          break;
        case 'Language:':
          details['Language'] = detailsTable.rows[i].children[1].innerText;
          break;
      }
    }
  }

  return details;
}

async function getBookDescription() {
  const description = {};

  const readFullOverviewButton = document.querySelector('.read-full-ov');

  if (readFullOverviewButton) {
    readFullOverviewButton.click();
    await delay(MODAL_DELAY);
    const overview = document.querySelector('#overview-content');
    description['Description'] = getFormattedText(overview);
  } else {
    const overview = document.querySelector('.overview-cntnt');
    description['Description'] = getFormattedText(overview);
  }

  return description;
}

function getSelectedFormat() {
  const edition = document.querySelector(
    '.otherAvailFormats .selected-format-chiclet p span'
  )?.innerText;

  if (
    edition.toLowerCase() == 'paperback' ||
    edition.toLowerCase() == 'hardcover'
  ) {
    return 'Physical Book';
  } else if (
    edition.toLowerCase().includes('cd') ||
    edition.toLowerCase().includes('mp3')
  ) {
    return 'Audiobook';
  } else {
    return edition || null;
  }
}

function getAudioBookTimes() {
  // Same class name for abridged / adapted and unabridged audiobooks
  const rawAudiobookTime =
    document.querySelector('.unabridged-time')?.textContent;
  const audiobook = {};

  if (rawAudiobookTime) {
    const time = rawAudiobookTime
      .substring(rawAudiobookTime.indexOf('—') + 1)
      .replace(',', '');
    const hours = REGEX_HOURS.exec(time);
    const minutes = REGEX_MINUTES.exec(time);
    let totalTimeSeconds = 0;

    if (hours) {
      totalTimeSeconds += hours * SECONDS_IN_HOUR;
    }

    if (minutes) {
      totalTimeSeconds += minutes * SECONDS_IN_MINUTE;
    }

    audiobook['Listening Length'] = time.trim();

    if (totalTimeSeconds) {
      audiobook['Listening Length Seconds'] = totalTimeSeconds;
    }
  }

  return audiobook;
}

export { barnesAndNobleScraper };
