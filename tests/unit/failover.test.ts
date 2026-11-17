import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateWithFailover, RATE_LIMIT_COOLDOWN_MS, resetFailoverState } from "@/lib/llm/failover";
import {
  configuredProviders,
  createGroqProvider,
  GEMINI_BASE_URL,
  GROQ_URL,
  ProviderError,
  toGeminiContents,
  type LlmInput,
} from "@/lib/llm/providers";

const GROQ_KEY = "gsk_test_groq_key_123";
const GEMINI_KEY = "gm_test_gemini_key_456";

const input: Omit<LlmInput, "signal"> = {
  system: "You are a test.",
  messages: [
    { role: "user", content: "hello" },
    { role: "assistant", content: "hi there" },
    { role: "user", content: "what counts?" },
  ],
  maxTokens: 100,
  temperature: 0.5,
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const groqOk = (text: string) => json({ choices: [{ message: { role: "assistant", content: text } }] });
const geminiOk = (text: string) => json({ candidates: [{ content: { role: "model", parts: [{ text }] } }] });
const fail = (status: number) => json({ error: { message: "nope" } }, status);

type FetchArgs = [string, RequestInit];
function mockFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => handler(String(url), init ?? {}));
  vi.stubGlobal("fetch", fn);
  return fn;
}
const calls = (fn: ReturnType<typeof mockFetch>) => fn.mock.calls as unknown as FetchArgs[];
const isGroq = (url: string) => url.startsWith(GROQ_URL);
const isGemini = (url: string) => url.startsWith(GEMINI_BASE_URL);

beforeEach(() => {
  resetFailoverState();
  vi.stubEnv("GROQ_API_KEY", GROQ_KEY);
  vi.stubEnv("GEMINI_API_KEY", GEMINI_KEY);
  vi.stubEnv("GROQ_MODEL", "");
  vi.stubEnv("GEMINI_MODEL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("failover order", () => {
  it("uses Groq when Groq answers", async () => {
    const fetchFn = mockFetch((url) => (isGroq(url) ? groqOk("From Groq.") : geminiOk("From Gemini.")));
    const res = await generateWithFailover(input);
    expect(res).toEqual({ text: "From Groq.", provider: "groq" });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const [url, init] = calls(fetchFn)[0];
    expect(url).toBe(GROQ_URL);
    expect(new Headers(init.headers).get("authorization")).toBe(`Bearer ${GROQ_KEY}`);
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("llama-3.3-70b-versatile");
    expect(body.messages[0]).toEqual({ role: "system", content: input.system });
    expect(body.messages.slice(1)).toEqual(input.messages);
    expect(body.temperature).toBe(0.5);
  });

  it("falls through to Gemini when Groq returns 429", async () => {
    const fetchFn = mockFetch((url) => (isGroq(url) ? fail(429) : geminiOk("From Gemini.")));
    const res = await generateWithFailover(input);
    expect(res).toEqual({ text: "From Gemini.", provider: "gemini" });
    expect(calls(fetchFn).map(([u]) => (isGroq(u) ? "groq" : "gemini"))).toEqual(["groq", "gemini"]);
  });

  it("falls through on 5xx, network errors and empty text", async () => {
    for (const groqReply of [() => fail(503), () => Promise.reject(new TypeError("fetch failed")), () => groqOk("   ")]) {
      resetFailoverState();
      mockFetch((url) => (isGroq(url) ? groqReply() : geminiOk("Gemini saves the day.")));
      expect(await generateWithFailover(input)).toEqual({ text: "Gemini saves the day.", provider: "gemini" });
    }
  });

  it("falls through when Groq times out", async () => {
    mockFetch((url, init) => {
      if (isGemini(url)) return geminiOk("Gemini was faster.");
      return new Promise<Response>((_, reject) => {
        init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
      });
    });
    const res = await generateWithFailover(input, { timeoutMs: 25 });
    expect(res).toEqual({ text: "Gemini was faster.", provider: "gemini" });
  });

  it("times out even if a provider ignores the abort signal", async () => {
    const res = await generateWithFailover(input, {
      timeoutMs: 25,
      providers: [
        { id: "groq", call: () => new Promise<string>(() => {}) },
        { id: "gemini", call: async () => "ok" },
      ],
    });
    expect(res).toEqual({ text: "ok", provider: "gemini" });
  });

  it("returns null when both providers fail", async () => {
    const fetchFn = mockFetch((url) => (isGroq(url) ? fail(500) : fail(429)));
    expect(await generateWithFailover(input)).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("returns null without any fetch when no keys are set", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "  ");
    const fetchFn = mockFetch(() => groqOk("should not be called"));
    expect(configuredProviders()).toEqual([]);
    expect(await generateWithFailover(input)).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("skips a provider without a key", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const fetchFn = mockFetch((url) => (isGroq(url) ? groqOk("no") : geminiOk("Only Gemini.")));
    expect(await generateWithFailover(input)).toEqual({ text: "Only Gemini.", provider: "gemini" });
    expect(calls(fetchFn).every(([u]) => isGemini(u))).toBe(true);
  });

  it("skips a provider for 60 s after a 429", async () => {
    let t = 1_000_000;
    const now = () => t;
    const fetchFn = mockFetch((url) => (isGroq(url) ? fail(429) : geminiOk("Gemini.")));
    await generateWithFailover(input, { now });
    expect(calls(fetchFn).filter(([u]) => isGroq(u))).toHaveLength(1);

    t += RATE_LIMIT_COOLDOWN_MS / 2;
    await generateWithFailover(input, { now });
    expect(calls(fetchFn).filter(([u]) => isGroq(u))).toHaveLength(1);

    t += RATE_LIMIT_COOLDOWN_MS;
    await generateWithFailover(input, { now });
    expect(calls(fetchFn).filter(([u]) => isGroq(u))).toHaveLength(2);
  });

  it("does not cool down after a 500", async () => {
    const fetchFn = mockFetch((url) => (isGroq(url) ? fail(500) : geminiOk("Gemini.")));
    await generateWithFailover(input);
    await generateWithFailover(input);
    expect(calls(fetchFn).filter(([u]) => isGroq(u))).toHaveLength(2);
  });

  it("uses model names from the environment", async () => {
    vi.stubEnv("GROQ_MODEL", "llama-test");
    vi.stubEnv("GEMINI_MODEL", "gemini-test");
    const fetchFn = mockFetch((url) => (isGroq(url) ? fail(429) : geminiOk("ok")));
    await generateWithFailover(input);
    const [[, groqInit], [geminiUrl]] = calls(fetchFn);
    expect(JSON.parse(String(groqInit.body)).model).toBe("llama-test");
    expect(geminiUrl).toBe(`${GEMINI_BASE_URL}/gemini-test:generateContent`);
  });
});

describe("Gemini request", () => {
  it("sends the key in the x-goog-api-key header, never in the URL", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const fetchFn = mockFetch(() => geminiOk("Hello from Gemini."));
    await generateWithFailover(input);
    const [url, init] = calls(fetchFn)[0];
    expect(url).toBe(`${GEMINI_BASE_URL}/gemini-flash-lite-latest:generateContent`);
    expect(url).not.toContain(GEMINI_KEY);
    expect(url).not.toContain("key=");
    expect(new Headers(init.headers).get("x-goog-api-key")).toBe(GEMINI_KEY);
    expect(init.method).toBe("POST");
  });

  it("uses systemInstruction, user/model contents and generationConfig", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const fetchFn = mockFetch(() => geminiOk("ok"));
    await generateWithFailover(input);
    const body = JSON.parse(String(calls(fetchFn)[0][1].body));
    expect(body.systemInstruction).toEqual({ parts: [{ text: input.system }] });
    expect(body.contents.map((c: { role: string }) => c.role)).toEqual(["user", "model", "user"]);
    expect(body.contents[2].parts[0].text).toBe("what counts?");
    expect(body.generationConfig).toEqual({ maxOutputTokens: 100, temperature: 0.5 });
  });

  it("ignores thought parts and joins text parts", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    mockFetch(() => json({ candidates: [{ content: { parts: [{ text: "thinking...", thought: true }, { text: "Hello " }, { text: "there." }] } }] }));
    expect(await generateWithFailover(input)).toEqual({ text: "Hello there.", provider: "gemini" });
  });

  it("merges same-role turns and starts with a user turn", () => {
    const contents = toGeminiContents([
      { role: "assistant", content: "Welcome!" },
      { role: "user", content: "a" },
      { role: "user", content: "b" },
    ]);
    expect(contents.map((c) => c.role)).toEqual(["user", "model", "user"]);
    expect(contents[2].parts[0].text).toBe("a\n\nb");
  });
});

describe("provider errors", () => {
  it("throws a typed error with the status and never echoes the key", async () => {
    mockFetch(() => new Response(`invalid api key ${GROQ_KEY}`, { status: 401 }));
    const call = createGroqProvider(GROQ_KEY);
    const err = await call(input).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect((err as ProviderError).status).toBe(401);
    expect((err as ProviderError).provider).toBe("groq");
    expect((err as ProviderError).message).not.toContain(GROQ_KEY);
  });
});
