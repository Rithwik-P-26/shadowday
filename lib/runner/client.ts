"use client";

import { tr, type StrKey } from "@/lib/i18n";
import type { DemoResult, TestRun } from "@/lib/types";
import { useWorld } from "@/lib/world/store";

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };

/** Per run, counted only once Python is ready. */
const RUN_TIMEOUT_MS = 10_000;
/** Downloading ~13 MB of Python on a slow school connection can take a while. */
const BOOT_TIMEOUT_MS = 180_000;

/** Error types the runner itself produces (everything else comes from the student's Python). */
export const PYTHON_LOAD_ERROR = "PythonLoad";
const TIMEOUT_ERROR = "TimeoutError";
const CRASH_ERROR = "RunnerError";

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();
let bootPromise: Promise<void> | null = null;
let status: "idle" | "loading" | "ready" | "error" = "idle";
const listeners = new Set<(s: typeof status) => void>();

function setStatus(s: typeof status) {
  status = s;
  listeners.forEach((l) => l(s));
}

export function onRunnerStatus(fn: (s: typeof status) => void) {
  listeners.add(fn);
  fn(status);
  return () => {
    listeners.delete(fn);
  };
}

const say = (key: StrKey) => tr(useWorld.getState().lang, key);

/** Stops the worker and fails whatever was still waiting on it. The next call spawns a fresh one. */
function killWorker(reason?: Error) {
  worker?.terminate();
  worker = null;
  bootPromise = null;
  for (const [id, p] of pending) {
    clearTimeout(p.timer);
    pending.delete(id);
    if (reason) p.reject(reason);
  }
}

function spawn() {
  const w = new Worker("/pyodide-worker.mjs", { type: "module" });
  worker = w;
  w.onmessage = (e: MessageEvent) => {
    const { id, ok, result, error } = e.data || {};
    const p = pending.get(id);
    if (!p) return;
    clearTimeout(p.timer);
    pending.delete(id);
    if (ok) p.resolve(result);
    else p.reject(new Error(error || "Runner error"));
  };
  // Fires when the worker script or /pyodide/pyodide.mjs can't load, or the worker dies.
  w.onerror = (e) => {
    e.preventDefault();
    if (worker !== w) return;
    const booted = status === "ready";
    killWorker(new Error(booted ? "PY_CRASHED" : "PY_LOAD_FAILED"));
    setStatus(booted ? "idle" : "error");
  };
}

function call<T>(type: string, payload: unknown, timeoutMs: number, timeoutCode = "TIMEOUT"): Promise<T> {
  if (!worker) spawn();
  const id = ++seq;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      // A stuck run (e.g. an infinite loop) can only be stopped by killing the worker.
      killWorker(new Error(timeoutCode));
      setStatus("idle");
      reject(new Error(timeoutCode));
    }, timeoutMs);
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
    worker!.postMessage({ id, type, payload });
  });
}

/**
 * Start downloading Python early (during the standup) so it's ready when the student codes.
 * Rejects with PY_LOAD_FAILED if Python can't load; calling it again starts over with a new worker.
 */
export function preloadPython(): Promise<void> {
  if (!bootPromise) {
    setStatus("loading");
    const p: Promise<void> = call<string>("init", null, BOOT_TIMEOUT_MS, "BOOT_TIMEOUT").then(
      () => {
        if (bootPromise === p) setStatus("ready");
      },
      () => {
        if (bootPromise === p || bootPromise === null) {
          killWorker();
          setStatus("error");
        }
        throw new Error("PY_LOAD_FAILED");
      },
    );
    bootPromise = p;
  }
  return bootPromise;
}

/** Pyodide can't be trusted after a JS-level failure (os._exit, blown JS stack...): start a fresh one. */
function recycle() {
  killWorker();
  setStatus("idle");
  preloadPython().catch(() => {});
}

type RunnerFailure = { type: string; message: string };
type Outcome<T> = { ok: true; value: T } | { ok: false; error: RunnerFailure };

async function runInWorker<T>(type: string, payload: unknown): Promise<Outcome<T>> {
  try {
    await preloadPython();
  } catch {
    return { ok: false, error: { type: PYTHON_LOAD_ERROR, message: say("pythonError") } };
  }
  try {
    // The 10 s budget starts only now, after Python is ready.
    return { ok: true, value: await call<T>(type, payload, RUN_TIMEOUT_MS) };
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "TIMEOUT") {
      preloadPython().catch(() => {});
      return { ok: false, error: { type: TIMEOUT_ERROR, message: say("runTimeout") } };
    }
    if (msg === "PY_LOAD_FAILED") return { ok: false, error: { type: PYTHON_LOAD_ERROR, message: say("pythonError") } };
    // harness.py catches every Python exception, so anything that reaches here broke Pyodide itself.
    recycle();
    return { ok: false, error: { type: CRASH_ERROR, message: say("pythonCrashed") } };
  }
}

export async function runTests(code: string, tests: string): Promise<TestRun> {
  const out = await runInWorker<TestRun>("runTests", { code, tests });
  return out.ok ? out.value : { ok: false, error: out.error, stdout: "", results: [] };
}

export async function runDemo(code: string, demo: string, csv: string): Promise<DemoResult | { error: { type: string; message: string } }> {
  const out = await runInWorker<DemoResult | { error: { type: string; message: string } }>("runDemo", { code, demo, csv });
  return out.ok ? out.value : { error: out.error };
}
