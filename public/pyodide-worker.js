/* Shadowday Python runner: Pyodide in a Web Worker, so student code never blocks the page. */
/* global importScripts, loadPyodide */
const PYODIDE_VERSION = "314.0.8";
const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let ready = null;

function boot() {
  if (!ready) {
    ready = (async () => {
      importScripts(INDEX_URL + "pyodide.js");
      const pyodide = await loadPyodide({ indexURL: INDEX_URL });
      const res = await fetch("/py/harness.py", { cache: "no-cache" });
      if (!res.ok) throw new Error("Could not load the test harness");
      const harness = await res.text();
      pyodide.FS.writeFile("/home/pyodide/harness.py", harness);
      pyodide.runPython("import sys\nsys.path.insert(0, '/home/pyodide')\nimport harness");
      return pyodide;
    })();
  }
  return ready;
}

self.onmessage = async (event) => {
  const { id, type, payload } = event.data || {};
  let pyodide;
  try {
    pyodide = await boot();
  } catch (err) {
    ready = null; // allow a retry on the next message
    self.postMessage({ id, ok: false, error: "Python could not load: " + String((err && err.message) || err) });
    return;
  }
  try {
    if (type === "init") {
      self.postMessage({ id, ok: true, result: "ready" });
      return;
    }
    const harness = pyodide.pyimport("harness");
    let out;
    if (type === "runTests") {
      out = harness.run_tests(payload.code, payload.tests);
    } else if (type === "runDemo") {
      out = harness.run_demo(payload.code, payload.demo, payload.csv);
    } else {
      throw new Error("Unknown message type " + type);
    }
    self.postMessage({ id, ok: true, result: JSON.parse(String(out)) });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err && err.message) || err) });
  }
};
