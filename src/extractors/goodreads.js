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

function getGoodreadsDetails() {
    console.log('[👩🏻‍🏫 Marian] Extracting GoodReads details');

    const imgEl = document.querySelector('.BookCover__image img');
    bookDetails["img"] = imgEl?.src ? getHighResImageUrl(imgEl.src) : null;
    console.log(bookDetails["img"]);
}

export { getGoodreadsDetails };
