#!/usr/bin/env node
/**
 * Build: minify src/index.html -> dist/conqueror-os.html
 *
 * The runtime app has no dependencies; this script only exists for maintainers.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { minify } = require("html-minifier-terser");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src", "index.html");
const OUT = path.join(ROOT, "dist", "conqueror-os.html");

const options = {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeAttributeQuotes: true,
  useShortDoctype: true,
  minifyCSS: true,
  minifyJS: true,
  sortAttributes: true,
  sortClassName: true
};

(async () => {
  const html = fs.readFileSync(SRC, "utf8");
  const out = await minify(html, options);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, out);

  const kb = n => (n / 1024).toFixed(1) + " KB";
  console.log(`src/index.html      ${kb(Buffer.byteLength(html))}`);
  console.log(`dist/conqueror-os.html  ${kb(Buffer.byteLength(out))}`);
  console.log(`reduction           ${(100 * (1 - Buffer.byteLength(out) / Buffer.byteLength(html))).toFixed(1)}%`);
})().catch(err => {
  console.error("Build failed:", err);
  process.exit(1);
});
