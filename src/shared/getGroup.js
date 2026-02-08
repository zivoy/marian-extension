import groups from "./groups.json"

// Initialize the groups data into two parallel lists for efficient ISBN range lookups
let compareList = Object.entries(groups)
// Create searchList with float representations (e.g., "978-0-123" → 978.0123) for binary search comparison
const searchList = compareList.map(([key]) => parseFloat(key.replace("-", ".")));  // search representation
// Transform compareList to remove dashes from ISBN prefix keys for character-by-character verification
compareList = compareList.map(([key, value]) => [key.replace("-", ""), value[0]]); // tuple compare representation

/** 
  * Searches a structured ISBN group registry to determine the publishing group/country for a given ISBN.
  * Uses a binary search algorithm on ISBN prefixes to efficiently locate the correct group.
  * Supports both ISBN-13 and ISBN-10 formats; ISBN-10 values are automatically converted to ISBN-13.
  * 
  * Algorithm:
  * 1. Normalizes input and converts ISBN-10 to ISBN-13 if needed
  * 2. Performs binary search on float-encoded ISBN prefixes to find the candidate group
  * 3. Validates the match by comparing character-by-character with the stored prefix
  *
  * @param {string} isbn ISBN-13 (with or without dashes) or ISBN-10 (with or without dashes)
  * @returns {string|undefined} The group name (e.g., "United States", "United Kingdom") or undefined if no match
  * @throws {Error} If ISBN is not exactly 10 or 13 digits
  */
export function searchIsbn(isbn) {
  // Normalize input: remove all dashes to get clean digit string
  isbn = isbn.replaceAll("-", ""); // remove dashes
  if (isbn.length !== 13 && isbn.length !== 10) {
    throw new Error("Unsupported isbn");
  }
  // Convert ISBN-10 to ISBN-13 by prepending the standard prefix
  if (isbn.length === 10) {
    isbn = "978" + isbn;
  }
  // All subsequent logic operates on ISBN-13 format

  // Binary search: find the first group whose prefix is greater than the input ISBN,
  // then step back one index to get the group that contains this ISBN's range
  const searchRepr = parseFloat(isbn.substring(0, 3) + "." + isbn.substring(3));
  let idx = 0;
  for (; idx < compareList.length; idx++) {
    if (searchRepr < searchList[idx]) {
      break;
    }
  }
  idx--;

  if (idx === -1) {
    return undefined;
  }

  // Verify the match is valid: ensure the ISBN actually starts with the matched prefix.
  // Groups have variable-length prefixes, so we validate character-by-character.
  const item = compareList[idx];
  for (let i = 0; i < item[0].length; i++) {
    if (item[0][i] !== isbn[i]) {
      // Mismatch found: the ISBN falls between group ranges, no valid group exists
      return undefined;
    }
  }
  // Return the group name associated with the matched prefix
  return item[1];
}
