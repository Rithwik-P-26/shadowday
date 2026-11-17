// Builds content/tickets/generated.ts from the files in content/tickets/<id>/.
// Usage: npm run tickets   (or: node scripts/build-tickets.mjs)
//
// Each ticket folder holds ticket.json, starter.py, tests.py, data.csv and demo.py, which ship
// to the app, plus solution.py and naive.py, which must NEVER ship. This script only reads the
// shipped files and double-checks that no reference code leaked into the output.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ticketsDir = join(root, "content", "tickets");
const outFile = join(ticketsDir, "generated.ts");

const IDS = ["water", "floods", "heat"];
const SHIPPED = ["ticket.json", "starter.py", "tests.py", "data.csv", "demo.py"];
const NEVER_SHIPPED = ["solution.py", "naive.py"];
const REQUIRED_META = ["key", "title", "body", "fileName", "dataFileName", "testFn", "functions", "hidden", "hints", "conceptTags"];

function fail(message) {
  console.error(`build-tickets: ${message}`);
  process.exit(1);
}

function read(id, name) {
  const path = join(ticketsDir, id, name);
  if (!existsSync(path)) fail(`missing ${relative(root, path)}`);
  return readFileSync(path, "utf8");
}

/** Function bodies from a Python file, used to prove the reference code isn't in the output. */
function functionBodies(src) {
  const bodies = [];
  const parts = src.split(/^def /m).slice(1);
  for (const part of parts) {
    const body = part.split("\n").slice(1).join("\n").split(/^\S/m)[0].trim();
    if (body.length > 40) bodies.push(body);
  }
  return bodies;
}

const tickets = {};
const notes = {};

for (const id of IDS) {
  let meta;
  try {
    meta = JSON.parse(read(id, "ticket.json"));
  } catch (err) {
    fail(`content/tickets/${id}/ticket.json is not valid JSON: ${err.message}`);
  }
  for (const field of REQUIRED_META) {
    if (meta[field] === undefined) fail(`content/tickets/${id}/ticket.json is missing "${field}"`);
  }
  if (!Array.isArray(meta.conceptTags) || !meta.conceptTags.every((c) => typeof c?.en === "string" && typeof c?.ar === "string")) {
    fail(`content/tickets/${id}/ticket.json: every conceptTags entry needs "en" and "ar"`);
  }

  // Key order follows the Ticket interface in lib/types.ts.
  tickets[id] = {
    id,
    key: meta.key,
    title: meta.title,
    body: meta.body,
    fileName: meta.fileName,
    starter: read(id, "starter.py"),
    tests: read(id, "tests.py"),
    testFn: meta.testFn,
    data: { fileName: meta.dataFileName, csv: read(id, "data.csv") },
    demo: read(id, "demo.py"),
    functions: meta.functions,
    hidden: meta.hidden,
    hints: meta.hints,
    conceptTags: meta.conceptTags,
  };
  if (meta.dataNote) notes[id] = meta.dataNote;
}

const indent = (text) => text.replace(/\n/g, "\n  ");
const out = [
  "// generated, do not edit.",
  "// Written by scripts/build-tickets.mjs from content/tickets/<id>/ (run `npm run tickets` after editing those files).",
  "// solution.py and naive.py are never included.",
  'import type { ArchetypeId, L10n, Ticket } from "@/lib/types";',
  "",
  "export const TICKETS: Record<ArchetypeId, Ticket> = {",
  ...IDS.map((id) => `  ${id}: ${indent(JSON.stringify(tickets[id], null, 2))},`),
  "};",
  "",
  '/** "This dataset is fictional" note for each ticket\'s data file. */',
  "export const DATA_NOTES: Partial<Record<ArchetypeId, L10n>> = {",
  ...Object.keys(notes).map((id) => `  ${id}: ${JSON.stringify(notes[id])},`),
  "};",
  "",
].join("\n");

// Belt and braces: the reference and naive code must not appear anywhere in the output.
for (const id of IDS) {
  for (const name of NEVER_SHIPPED) {
    const path = join(ticketsDir, id, name);
    if (!existsSync(path)) continue;
    const starter = read(id, "starter.py");
    for (const body of functionBodies(readFileSync(path, "utf8"))) {
      // Helpers the starter already gives away (like feels_like) are allowed.
      if (starter.includes(body)) continue;
      if (out.includes(JSON.stringify(body).slice(1, -1))) {
        fail(`code from content/tickets/${id}/${name} leaked into generated.ts`);
      }
    }
  }
}

writeFileSync(outFile, out);
console.log(`build-tickets: wrote ${relative(root, outFile)} (${IDS.join(", ")}; shipped ${SHIPPED.join(", ")})`);
