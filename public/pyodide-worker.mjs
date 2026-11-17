// Shadowday Python runner: Pyodide in a module Web Worker, served from our own origin.
import { loadPyodide } from "/pyodide/pyodide.mjs";

let ready = null;

function boot() {
  if (!ready) {
    ready = (async () => {
      const pyodide = await loadPyodide({ indexURL: "/pyodide/" });
      const res = await fetch("/py/harness.py", { cache: "no-cache" });
      if (!res.ok) throw new Error("Could not load the test harness");
      pyodide.FS.writeFile("/home/pyodide/harness.py", await res.text());
      pyodide.runPython("import sys\nsys.path.insert(0, '/home/pyodide')\nimport harness");
      return pyodide;
    })().catch((err) => {
      ready = null; // allow a retry on the next message
      throw err;
    });
  }
  return ready;
}

self.onmessage = async (event) => {
  const { id, type, payload } = event.data || {};
  let pyodide;
  try {
    pyodide = await boot();
  } catch (err) {
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
    if (type === "runTests") out = harness.run_tests(payload.code, payload.tests);
    else if (type === "runDemo") out = harness.run_demo(payload.code, payload.demo, payload.csv);
    else throw new Error("Unknown message type " + type);
    self.postMessage({ id, ok: true, result: JSON.parse(String(out)) });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err && err.message) || err) });
  }
};
