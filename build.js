// build.js
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/content.js'],      // your main file
  bundle: true,
  outfile: 'dist/content.js',           // where to write bundled version
  format: 'iife',                       // content scripts can't be modules
  target: ['chrome109'],                // for Manifest V3
  logLevel: 'info',
  treeShaking: false,                   // force include everything, prevents cleaning of imported modules
}).catch(() => process.exit(1));
