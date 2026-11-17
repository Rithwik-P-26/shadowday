import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST, runtime } from "@/app/api/agent/route";
import { resetRateLimits, RATE_LIMIT, rateLimit, clientIp, RATE_WINDOW_MS } from "@/lib/llm/ratelimit";
import { resetFailoverState } from "@/lib/llm/failover";
import { parseAgentRequest } from "@/lib/agents/validate";

vi.mock("@/content/tickets", async () => {
  const f = await import("./fixtures");
  return { getTicket: f.getFixtureTicket, TICKETS: f.FIXTURE_TICKETS };
});

function post(body: unknown, ip = "203.0.113.7") {
  return POST(
    new Request("http://localhost/api/agent", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `${ip}, 10.0.0.1` },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

const valid = { agent: "stakeholder", mode: "chat", lang: "en", areaId: "liwa", message: "What counts as over-pumping?", history: [] };

beforeEach(() => {
  resetRateLimits();
  resetFailoverState();
  vi.stubEnv("GROQ_API_KEY", "");
  vi.stubEnv("GEMINI_API_KEY", "");
  vi.stubEnv("SHADOWDAY_SCRIPTED", "0");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/agent", () => {
  it("runs on the Node.js runtime", () => {
    expect(runtime).toBe("nodejs");
  });

  it("returns an AgentResponse for a valid request with no keys", async () => {
    const res = await post(valid);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.provider).toBe("scripted");
    expect(data.revealed).toBe(true);
    expect(typeof data.text).toBe("string");
  });

  it("rejects bad input with a 400 and a short error", async () => {
    const cases: unknown[] = [
      "not json",
      "[]",
      { ...valid, agent: "ceo" },
      { ...valid, mode: "sing" },
      { ...valid, lang: "fr" },
      { ...valid, areaId: "atlantis" },
      { ...valid, areaId: 3 },
      { ...valid, history: "nope" },
      { ...valid, history: [{ from: "hacker", text: "x" }] },
      { ...valid, message: 42 },
      { ...valid, hintLevel: "2" },
      { ...valid, testSummary: { passed: "all" } },
      { ...valid, stats: { testRuns: "many" } },
    ];
    for (const body of cases) {
      const res = await post(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      const data = await res.json();
      expect(typeof data.error).toBe("string");
      expect(data.error.length).toBeLessThan(120);
    }
  });

  it("accepts a request without history", async () => {
    const rest: Record<string, unknown> = { ...valid };
    delete rest.history;
    expect((await post(rest)).status).toBe(200);
  });

  it("serves scripted replies, not errors, once an IP is over the limit", async () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_test");
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "From Groq." } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchFn);

    for (let i = 0; i < RATE_LIMIT; i++) {
      const data = await (await post({ ...valid, agent: "manager", message: "hi" })).json();
      expect(data.provider).toBe("groq");
    }
    const limited = await post({ ...valid, agent: "manager", message: "hi" });
    expect(limited.status).toBe(200);
    expect((await limited.json()).provider).toBe("scripted");
    expect(fetchFn).toHaveBeenCalledTimes(RATE_LIMIT);

    const otherIp = await (await post({ ...valid, agent: "manager", message: "hi" }, "198.51.100.1")).json();
    expect(otherIp.provider).toBe("groq");
  });
});

describe("rate limit", () => {
  it("allows 30 requests per 5 minutes per key, as a sliding window", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < RATE_LIMIT; i++) expect(rateLimit("a", t0 + i).allowed).toBe(true);
    expect(rateLimit("a", t0 + 100).allowed).toBe(false);
    expect(rateLimit("b", t0 + 100).allowed).toBe(true);
    expect(rateLimit("a", t0 + RATE_WINDOW_MS).allowed).toBe(true);
    expect(rateLimit("a", t0 + RATE_WINDOW_MS + 1).allowed).toBe(true);
  });

  it("reads the client IP from x-forwarded-for", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "198.51.100.4, 10.0.0.2" }))).toBe("198.51.100.4");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.5" }))).toBe("198.51.100.5");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("parseAgentRequest", () => {
  it("keeps only known fields", () => {
    const parsed = parseAgentRequest({ ...valid, studentName: "Sara", extra: true, testSummary: { passed: 1, total: 2, failing: [{ name: "t", fn: "f" }] } });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value).not.toHaveProperty("extra");
      expect(parsed.value.testSummary?.failing[0]).toEqual({ name: "t", fn: "f", message: "" });
    }
  });
});
