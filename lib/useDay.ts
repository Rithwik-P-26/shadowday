"use client";

import { useMemo } from "react";
import { getArea, getArchetype, MANAGER, MENTOR } from "@/content/regions";
import { getTicket } from "@/content/tickets";
import { useWorld } from "@/lib/world/store";
import type { AgentId, AgentRequest, Character } from "@/lib/types";

export function useDay() {
  const session = useWorld((s) => s.session);
  return useMemo(() => {
    if (!session) return null;
    const area = getArea(session.areaId);
    const archetype = getArchetype(session.areaId);
    const ticket = getTicket(archetype.id);
    const people: Record<AgentId, Character> = { manager: MANAGER, mentor: MENTOR, stakeholder: archetype.stakeholder };
    return { session, area, archetype, ticket, people };
  }, [session]);
}

type Summary = NonNullable<AgentRequest["testSummary"]> & { error?: { type: string; message: string; line?: number } };

/**
 * Summary of the latest test run in the shape the agent API expects.
 * With `fresh`, it is only returned when that run used the code that is in the editor now
 * (the PR review must never approve code that was edited after the last green run).
 */
export function testSummary(opts: { fresh?: boolean } = {}): AgentRequest["testSummary"] {
  const { lastRun: run, lastRunCode, code } = useWorld.getState();
  if (!run) return undefined;
  if (opts.fresh && lastRunCode !== code) return undefined;
  const summary: Summary = {
    passed: run.results.filter((r) => r.passed).length,
    total: run.results.length,
    failing: run.results.filter((r) => !r.passed).map((r) => ({ name: r.name, fn: r.fn, message: r.message })),
  };
  // A file that doesn't load (e.g. IndentationError) has no results; pass the error on so Ravi can talk about it.
  if (run.error) summary.error = { type: run.error.type, message: run.error.message.slice(0, 300), line: run.error.line };
  return summary;
}

/** Status per student function from the latest run: true = all its tests pass. */
export function functionStatus(fnNames: string[]): Record<string, "pass" | "fail" | "unknown"> {
  const run = useWorld.getState().lastRun;
  const out: Record<string, "pass" | "fail" | "unknown"> = {};
  for (const fn of fnNames) {
    const rs = run?.results.filter((r) => r.fn === fn) ?? [];
    out[fn] = !run || !run.ok || rs.length === 0 ? "unknown" : rs.every((r) => r.passed) ? "pass" : "fail";
  }
  return out;
}
