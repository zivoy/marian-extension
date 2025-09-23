import { getImageScore, logMarian } from '../shared/utils.js';

const remapings = {
  'Edition': 'Edition Information',
  'Binding': 'Edition Format',
  'Published': 'Publication date'
}
const remappingKeys = Object.keys(remapings);

async function getIsbnSearchDetails() {
  logMarian('Extracting ISBNSearch details');

  const bookDetails = {};

  const imgEl = document.querySelector('.image img');
  bookDetails["img"] = imgEl?.src || null;
  bookDetails["imgScore"] = imgEl?.src ? await getImageScore(imgEl.src) : 0;

  const details = extractTable()

  for (let [key, value] of Object.entries(details)) {
    if (remappingKeys.includes(key)) {
      key = remapings[key];
    }
    bookDetails[key] = value;
  }

  getContributers(bookDetails);
  // TODO: check if book is actually physical, they don't seem to have pages for ebooks with ISBNs
  bookDetails['Reading Format'] = 'Physical Book';

  // TODO: get language from ISBN

  // logMarian("bookDetails", bookDetails);

  return {
    ...bookDetails,
  };
}

function getContributers(bookDetails) {
  const contributors = [];

  if ('Author' in bookDetails) {
    contributors.push({ name: bookDetails['Author'], roles: ['Author'] })
    delete bookDetails['Author']
  }
  if ("Authors" in bookDetails) {
    bookDetails['Authors']
      .split(';')
      .forEach(author => contributors.push({ name: author.trim(), roles: ['Author'] }));
    delete bookDetails['Authors']
  }

  if (contributors.length) {
    bookDetails['Contributors'] = contributors;
  }
}

function extractTable() {
  const container = document.querySelector('.bookinfo');
  const Title = container.querySelector('h1').textContent.trim();

  const table = {};
  container.querySelectorAll('p').forEach((el) => {
    let children = el.childNodes;
    if (children.length === 3 && children[1].textContent === ' ') {
      children = [children[0], children[2]];
    } else if (el.textContent.includes("Sell this book")) {
      return;
    }

    if (children.length !== 2 || children[0].nodeName !== 'STRONG') {
      logMarian('invalid row', el.textContent);
      return;
    }

    let key = children[0].textContent?.trim();
    const value = children[1].textContent?.trim();


    if (!key) {
      logMarian("empty key", el.textContent);
      return;
    } else if (!key.endsWith(':')) {
      logMarian("bad key", key);
      return;
    }

    key = key.substring(0, key.length - 1).trim();
    table[key] = value
  });

  return {
    Title,
    ...table
  }
}

export { getIsbnSearchDetails };
