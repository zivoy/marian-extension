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

  function isIncludedLabel(label) {
    return includedLabels.includes(label);
  }

  function getIncludedLabels() {
    return includedLabels;
  }