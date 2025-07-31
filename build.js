const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const SRC_DIR = "extension";
const DIST_DIR = "distro";

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);

    // Skip manifests and content.js since handled separately
    if (!item.startsWith("manifest.") && item !== "content.js") {
      if (fs.statSync(srcPath).isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

function copyManifests(target) {
  const destDir = path.join(DIST_DIR, target);
  const manifest = target === "chrome" ? "manifest.v3.json" : "manifest.v2.json";
  fs.copyFileSync(path.join(SRC_DIR, manifest), path.join(destDir, "manifest.json"));
}

async function buildContentScript(target) {
  const outFile = path.join(DIST_DIR, target, "dist", "content.js");
  await esbuild.build({
    entryPoints: [path.join(SRC_DIR, "content.js")],
    bundle: true,
    outfile: outFile,
    format: "iife",
    target: ["chrome109"],
    logLevel: "info",
    treeShaking: false,
  });
}

async function build(target) {
  const destDir = path.join(DIST_DIR, target);

  copyDir(SRC_DIR, destDir);
  copyManifests(target);

  // Bundle content.js specifically for this target
  await buildContentScript(target);

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
