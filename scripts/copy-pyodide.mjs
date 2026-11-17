// Copies the Pyodide runtime from node_modules into public/pyodide so Python is served
// from our own origin (no CDN, no cross-origin worker loads). Runs before dev and build.
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const src = dirname(require.resolve("pyodide/package.json", { paths: [process.cwd()] }));
const out = join(process.cwd(), "public", "pyodide");
mkdirSync(out, { recursive: true });
const files = ["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"];
for (const f of files) {
  const from = join(src, f);
  if (!existsSync(from)) throw new Error(`Missing ${from}`);
  const to = join(out, f);
  if (!existsSync(to) || statSync(to).size !== statSync(from).size) copyFileSync(from, to);
}
console.log(`pyodide: ${files.length} files in public/pyodide`);
