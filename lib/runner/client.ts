"use client";

import type { DemoResult, TestRun } from "@/lib/types";

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };

const RUN_TIMEOUT_MS = 10_000;
const BOOT_TIMEOUT_MS = 90_000;

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

function spawn() {
  worker = new Worker("/pyodide-worker.js");
  worker.onmessage = (e: MessageEvent) => {
    const { id, ok, result, error } = e.data || {};
    const p = pending.get(id);
    if (!p) return;
    clearTimeout(p.timer);
    pending.delete(id);
    if (ok) p.resolve(result);
    else p.reject(new Error(error || "Runner error"));
  };
  worker.onerror = () => {
    setStatus("error");
  };
}

function call<T>(type: string, payload: unknown, timeoutMs: number): Promise<T> {
  if (!worker) spawn();
  const id = ++seq;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      // A stuck run (e.g. an infinite loop) can only be stopped by killing the worker.
      worker?.terminate();
      worker = null;
      bootPromise = null;
      setStatus("idle");
      reject(new Error("TIMEOUT"));
    }, timeoutMs);
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
    worker!.postMessage({ id, type, payload });
  });
}

/** Start downloading Python early (during the standup) so it's ready when the student codes. */
export function preloadPython(): Promise<void> {
  if (!bootPromise) {
    setStatus("loading");
    bootPromise = call<string>("init", null, BOOT_TIMEOUT_MS)
      .then(() => setStatus("ready"))
      .catch((e) => {
        bootPromise = null;
        setStatus("error");
        throw e;
      });
  }
  return bootPromise;
}

export async function runTests(code: string, tests: string): Promise<TestRun> {
  try {
    await preloadPython();
    return await call<TestRun>("runTests", { code, tests }, RUN_TIMEOUT_MS);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "TIMEOUT") {
      preloadPython().catch(() => {});
      return {
        ok: false,
        error: { type: "Timeout", message: "Your code ran for more than 10 seconds and was stopped. Check for a loop that never ends." },
        stdout: "",
        results: [],
      };
    }
    return { ok: false, error: { type: "RunnerError", message: msg }, stdout: "", results: [] };
  }
}

export async function runDemo(code: string, demo: string, csv: string): Promise<DemoResult | { error: { type: string; message: string } }> {
  try {
    await preloadPython();
    return await call<DemoResult | { error: { type: string; message: string } }>("runDemo", { code, demo, csv }, RUN_TIMEOUT_MS);
  } catch (e) {
    return { error: { type: "RunnerError", message: (e as Error).message } };
  }
}
