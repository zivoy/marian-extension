const xml2js = require("xml2js");
const fs = require("fs/promises");

const parseString = (str) => new Promise((resolve, reject) => xml2js.parseString(str, (err, result) => err != null ? reject(err) : resolve(result)));

// TODO: fetch from link

fs.readFile("./RangeMessage.xml", "utf8")
  .then(parseString)
  .then(json => json["ISBNRangeMessage"]["RegistrationGroups"][0]["Group"]) // get groups
  // .then(groups => groups.map(group => [group["Prefix"][0], group["Agency"][0]])) // get a list of tuples of prefix and group name
  .then(groups => groups.map(group => ({ [group["Prefix"][0]]: group["Agency"][0] }))) // get a list of maps of prefix to group name
  .then(groups => groups.reduce((acc, obj) => ({ ...acc, ...obj }), {})) // flatten it
  .then(list => JSON.stringify(list, undefined, 2))
  .then(str => fs.writeFile("./src/shared/groups.json", str))
  .catch(console.error);

