// Makes the landing page's share image an absolute URL at build time (link previews ignore relative og:image).
// Uses SITE_URL, or the production domain Vercel exposes during builds. Does nothing locally when neither is set.
import fs from "node:fs";

const host = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
if (!host) {
  console.log("stamp-site-url: no SITE_URL or VERCEL_PROJECT_PRODUCTION_URL, leaving public/index.html as is");
  process.exit(0);
}
const base = host.replace(/\/+$/, "");
const file = new URL("../public/index.html", import.meta.url);
let html = fs.readFileSync(file, "utf8");
html = html
  .replace('<meta property="og:image" content="share.jpg">', `<meta property="og:image" content="${base}/share.jpg">\n<meta property="og:url" content="${base}/">`)
  .replace(/<!-- <link rel="canonical"[^>]*-->/, `<link rel="canonical" href="${base}/">`);
fs.writeFileSync(file, html);
console.log(`stamp-site-url: share links now point at ${base}`);
