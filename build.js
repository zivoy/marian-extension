const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");
const package = require("./package.json");

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
  baseManifest.version = process.env.RELEASE_TAG || package.version;
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
}

async function build(target) {
  const destDir = path.join(DIST_DIR, target);

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
