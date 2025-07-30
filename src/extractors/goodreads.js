const bookSeriesRegex = "";
const includedLabels = [
    'Author',
    'Narrator',
    'Publisher',
    'Publication date',
    'Audible.com Release Date',
    'Program Type',
    'Language',
    'Print length',
    'Listening Length',
    'ISBN-10',
    'ISBN-13',
    'ASIN',
    'Series',
    'Series Place',
  ];

async function getGoodreadsDetails() {
    console.log('[👩🏻‍🏫 Marian] Extracting GoodReads details');
    const bookDetails = {};

    const imgEl = document.querySelector('.BookCover__image img');
    bookDetails["img"] = imgEl?.src ? getHighResImageUrl(imgEl.src) : null;
    bookDetails["Title"] = document.querySelector('[data-testid="bookTitle"]')?.innerText.trim();

    const button = document.querySelector('.ContributorLinksList button[aria-label="Show all contributors"]');
    if (button) {
        button.click();
        await delay(1500); // wait for contributors to load
    }

    getContributors(bookDetails);

    // Extract edition format and pages
    const editionFormatEl = document.querySelector('[data-testid="pagesFormat"]')?.innerText.trim();
    if (editionFormatEl) {
        const pagesMatch = editionFormatEl.match(/^(\d+)\s+pages,\s*(.+)$/);
        if (pagesMatch) {
            bookDetails["pages"] = parseInt(pagesMatch[1], 10);
            bookDetails["Edition Format"] = pagesMatch[2];
        } else {
            bookDetails["Edition Format"] = editionFormatEl;
        }
    }
    const descriptionEl = document.querySelector('[data-testid="contentContainer"] .Formatted');
    bookDetails["Description"] = descriptionEl ? descriptionEl.innerText.trim() : null;

    if (bookDetails["Edition Format"]?.includes("Kindle")) {
        bookDetails['Reading Format'] = 'Ebook'; 
    } else if (bookDetails["Edition Format"].includes("Audible") || bookDetails["Edition Format"].includes("Audiobook")) {
        bookDetails['Reading Format'] = 'Audiobook';
    } else {
        bookDetails['Reading Format'] = 'Physical Book';
    }

    bookDetails["Publisher"] = "";
    bookDetails["Publication date"] = "";
    bookDetails["Language"] = "";
    bookDetails["Print Length"] = "";
    bookDetails["Listening Length"] = "";
    bookDetails["ISBN-10"] = "";
    bookDetails["ISBN-13"] = "";
    bookDetails["ASIN"] = "";
    bookDetails["Series"] = "";
    bookDetails["Series Place"] = "";


    console.log(bookDetails);

    return {
    ...bookDetails,
  };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getHighResImageUrl(src) {
//   return src.replace(/\/compressed\.photo\./, '/');
    return src
}

function getContributors(bookDetails) {
    // Extract authors and narrators
    const authorList = [];
    const narratorList = [];

    document.querySelectorAll('.ContributorLinksList [data-testid="name"]').forEach(nameEl => {
        const roleEl = nameEl.parentElement.querySelector('[data-testid="role"]');
        const name = nameEl.innerText.trim();
        const roles = roleEl?.innerText || "";
        console.log(`Found name: "${name}" with roles: "${roles}"`);

        if (roles.includes("Author")) authorList.push(name);
        if (roles.includes("Narrator")) narratorList.push(name);
    });

    if (authorList.length) bookDetails["Author"] = authorList.length === 1 ? authorList[0] : authorList;
    if (narratorList.length) bookDetails["Narrator"] = narratorList.length === 1 ? narratorList[0] : narratorList;
}

export { getGoodreadsDetails };
