import groups from "./groups.json";

const entries = Object.entries(/**@type{{[prefix: string]: [string, [string, string][]]}}*/(groups))
/**@type{[string, string][]}*/
const compareList = entries.map(([key, [name]]) => [key.replace("-", ""), name]); // tuple compare representation
const searchList = entries.map(([key]) => parseFloat(key.replace("-", ".")));            // search representation

/** 
  * searches the groupname for an isbn, works with both isbn 13 and 10 
  * returns undefined if no match found
  *
  * @param {string} isbn ISBN-13 or ISBN-10
  * @returns {string|undefined} group name
  */
export function searchIsbn(isbn) {
  const item = getPrefix(isbn);
  if (item == undefined) return undefined;
  return item.name;
}

/**
  * @param {string} isbn 
  * @returns {{prefix:string, name: string, is10: bool, idx: number}|undefined}
  */
function getPrefix(isbn) {
  isbn = isbn.replaceAll("-", ""); // remove dashes
  if (isbn.length !== 13 && isbn.length !== 10) {
    throw "Unsupported isbn";
  }
  let is10 = false;
  if (isbn.length === 10) {
    is10 = true;
    isbn = "978" + isbn;
  }
  // only isbn 13 from here

  // find the index of the first float bigger then it
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

  // make sure the right isbn was matched
  const item = compareList[idx];
  for (let i = 0; i < item[0].length; i++) {
    if (item[0][i] !== isbn[i]) {
      // mismatch found
      return undefined;
    }
  }
  return { name: item[1], prefix: item[0], is10, idx };
}
