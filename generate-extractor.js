import fs from "fs";

import path from "path";
import { pathToFileURL } from "url";

// Mock the chrome object for Node.js environment
if (typeof global.chrome === "undefined") {
  global.chrome = {};
}

const SRC_DIR = "src";

async function generateExtractorsIndex() {
  const extractorsDir = path.join(SRC_DIR, "extractors");
  const indexPath = path.join(extractorsDir, "index.js");

  const files = fs.readdirSync(extractorsDir).filter(
    (file) =>
      file.endsWith(".js") &&
      file !== "index.js" &&
      file !== "AbstractExtractor.js"
  );

  const imports = [];
  const instances = [];

  const AbstractExtractor = await import(pathToFileURL(path.resolve(SRC_DIR, "extractors", "AbstractExtractor.js")).href);
  const Extractor = AbstractExtractor.Extractor;

  for (const file of files) {
    const modulePath = path.join(extractorsDir, file);
    const module = await import(pathToFileURL(path.resolve(modulePath)).href).catch((err) => {
      if (err.message.includes('chrome is not defined')) {
        global.chrome = {};
        return import(pathToFileURL(path.resolve(modulePath)).href);
      }
      throw err;
    });

    const classImports = [];
    for (const [exportName, exported] of Object.entries(module)) {
      if (typeof exported === "function" && exported.prototype instanceof Extractor) {
        const className = exportName;
        classImports.push(className);
        instances.push(`  new ${className}(),`);
      }
    }
    classImports.sort();
    imports.push(`import { ${classImports.join(", ")} } from "./${file.replace(/\.js$/, "")}";`);
  }

  imports.sort();
  instances.sort();

  const content = `// Auto-generated file. Do not edit manually.
${imports.join("\n")}

/** @import { Extractor } from "./AbstractExtractor";
 * @type{Extractor[]} */
const extractors = [
${instances.join("\n")}
];

/** @param {string} url */
function getExtractor(url) {
  return extractors.find((ex) => ex.isSupported(url));
}

/** @param {string} url */
function isAllowedUrl(url) {
  return getExtractor(url) != undefined;
}

export { extractors, getExtractor, isAllowedUrl };
`;

  fs.writeFileSync(indexPath, content);
  console.log("Generated extractors index.js");
}

async function main() {
  try {
    await generateExtractorsIndex();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
