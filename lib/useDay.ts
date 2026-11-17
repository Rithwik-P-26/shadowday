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

/** Summary of the latest test run in the shape the agent API expects. */
export function testSummary(): AgentRequest["testSummary"] {
  const run = useWorld.getState().lastRun;
  if (!run) return undefined;
  return {
    passed: run.results.filter((r) => r.passed).length,
    total: run.results.length,
    failing: run.results.filter((r) => !r.passed).map((r) => ({ name: r.name, fn: r.fn, message: r.message })),
  };
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
