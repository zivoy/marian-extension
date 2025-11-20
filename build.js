import fs from "fs";

// Mock the chrome object for Node.js environment
if (typeof global.chrome === "undefined") {
  global.chrome = {};
}
import path from "path";
import esbuild from "esbuild";
const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"));

const SRC_DIR = "src";
const DIST_DIR = "distro";

function copyDir(src, dest) {
  for (const item of fs.readdirSync(src)) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);

    if (item.endsWith("json") || item.endsWith("js")) {
      continue
    }
    // only copy non-script files
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyManifests(target) {
  const destDir = path.join(DIST_DIR, target);
  const baseManifest = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "manifest.base.json")));
  baseManifest.version = process.env.RELEASE_TAG?.replace("v", "") || pkg.version;
  const targetManifest = JSON.parse(fs.readFileSync(path.join(SRC_DIR, `manifest.${target}.json`)));

  const combinedManifest = {
    ...baseManifest,
    ...targetManifest
  }

  fs.writeFileSync(path.join(destDir, "manifest.json"), JSON.stringify(combinedManifest, null, 2))
}

async function buildScripts(outDir) {
  await esbuild.build({
    entryPoints: [path.join(SRC_DIR, "*.js")],
    bundle: true,
    outdir: outDir,
    format: "iife",
    target: ["chrome109"],
    logLevel: "info",
    treeShaking: false,
  });

  // Popup (separately, as module)
  const popupEntry = path.join(SRC_DIR, "popup", "main.js");
  const popupOutFile = path.join(outDir, "popup.js");

  const popupDir = path.dirname(popupOutFile);
  if (!fs.existsSync(popupDir)) fs.mkdirSync(popupDir, { recursive: true });

  await esbuild.build({
    entryPoints: [popupEntry],
    outfile: popupOutFile,
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["chrome109"],
    logLevel: "info",
    treeShaking: false,
  });
}

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

  const AbstractExtractor = await import(path.resolve(SRC_DIR, "extractors", "AbstractExtractor.js"));
  const Extractor = AbstractExtractor.Extractor;

  for (const file of files) {
    const modulePath = path.join(extractorsDir, file);
    const module = await import(path.resolve(modulePath)).catch((err) => {
      if (err.message.includes('chrome is not defined')) {
        global.chrome = {};
        return import(path.resolve(modulePath));
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
import { Extractor } from "./AbstractExtractor";
${imports.join("\n")}

/** @type{Extractor[]} */
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

async function build(target) {
  const destDir = path.join(DIST_DIR, target);

  await generateExtractorsIndex();
  copyDir(SRC_DIR, destDir);
  copyManifests(target);

  // Bundle js specifically for this target
  await buildScripts(destDir);

  console.log(`Built ${target} extension to ${destDir}`);
}

async function main() {
  try {
    await build("chrome");
    await build("firefox");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
