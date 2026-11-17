import type { Provider } from "@/lib/types";

// Free-tier LLM providers over plain fetch. No SDKs. Keys come from the environment at call time
// and are never logged or put in a URL.

export type LlmProviderId = Exclude<Provider, "scripted">;

export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmInput {
  system: string;
  messages: LlmMessage[];
  maxTokens: number;
  temperature: number;
  signal?: AbortSignal;
}

export type LlmProvider = (input: LlmInput) => Promise<string>;

export interface NamedProvider {
  id: LlmProviderId;
  call: LlmProvider;
}

export type ProviderErrorKind = "http" | "network" | "timeout" | "empty" | "bad_response";

export class ProviderError extends Error {
  readonly provider: LlmProviderId;
  readonly kind: ProviderErrorKind;
  /** HTTP status, or 0 when no response arrived (network error, timeout). */
  readonly status: number;

  constructor(provider: LlmProviderId, kind: ProviderErrorKind, status: number, message: string) {
    super(`${provider}: ${message}`);
    this.name = "ProviderError";
    this.provider = provider;
    this.kind = kind;
    this.status = status;
  }
}

export const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
export const DEFAULT_GEMINI_MODEL = "gemini-flash-lite-latest";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

function redact(text: string, secret: string): string {
  return secret ? text.split(secret).join("[redacted]") : text;
}

async function postJson(
  provider: LlmProviderId,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  signal: AbortSignal | undefined,
  secret: string,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    const aborted = signal?.aborted || (err instanceof Error && err.name === "AbortError");
    throw new ProviderError(provider, aborted ? "timeout" : "network", 0, aborted ? "request aborted" : "network error");
  }
  if (!res.ok) {
    let detail = "";
    try {
      detail = redact((await res.text()).slice(0, 200), secret).replace(/\s+/g, " ").trim();
    } catch {
      // ignore unreadable error bodies
    }
    throw new ProviderError(provider, "http", res.status, `HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  try {
    return await res.json();
  } catch {
    throw new ProviderError(provider, "bad_response", res.status, "response was not JSON");
  }
}

/** Groq's OpenAI-compatible chat completions endpoint. */
export function createGroqProvider(apiKey: string, model: string = DEFAULT_GROQ_MODEL): LlmProvider {
  return async ({ system, messages, maxTokens, temperature, signal }) => {
    const data = (await postJson(
      "groq",
      GROQ_URL,
      { Authorization: `Bearer ${apiKey}` },
      {
        model,
        messages: [{ role: "system", content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
        max_completion_tokens: maxTokens,
        temperature,
        stream: false,
      },
      signal,
      apiKey,
    )) as { choices?: { message?: { content?: unknown } }[] };
    const content = data?.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content.trim() : "";
    if (!text) throw new ProviderError("groq", "empty", 200, "empty completion");
    return text;
  };
}

type GeminiContent = { role: "user" | "model"; parts: { text: string }[] };

/** Gemini wants user/model turns that alternate and start with the user. */
export function toGeminiContents(messages: LlmMessage[]): GeminiContent[] {
  const out: GeminiContent[] = [];
  for (const m of messages) {
    if (!m.content.trim()) continue;
    const role = m.role === "assistant" ? "model" : "user";
    const last = out[out.length - 1];
    if (last && last.role === role) last.parts[0].text += `\n\n${m.content}`;
    else out.push({ role, parts: [{ text: m.content }] });
  }
  if (out.length === 0 || out[0].role !== "user") out.unshift({ role: "user", parts: [{ text: "(start of conversation)" }] });
  return out;
}

/** Gemini generateContent. The key travels in the x-goog-api-key header, never in the URL. */
export function createGeminiProvider(apiKey: string, model: string = DEFAULT_GEMINI_MODEL): LlmProvider {
  const modelId = model.replace(/^models\//, "");
  const url = `${GEMINI_BASE_URL}/${encodeURIComponent(modelId)}:generateContent`;
  return async ({ system, messages, maxTokens, temperature, signal }) => {
    const data = (await postJson(
      "gemini",
      url,
      { "x-goog-api-key": apiKey },
      {
        systemInstruction: { parts: [{ text: system }] },
        contents: toGeminiContents(messages),
        generationConfig: { maxOutputTokens: maxTokens, temperature },
      },
      signal,
      apiKey,
    )) as { candidates?: { content?: { parts?: { text?: unknown; thought?: boolean }[] } }[] };
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .filter((p) => !p.thought && typeof p.text === "string")
      .map((p) => p.text as string)
      .join("")
      .trim();
    if (!text) throw new ProviderError("gemini", "empty", 200, "empty completion");
    return text;
  };
}

/** Providers in failover order (Groq, then Gemini). A provider without a key is skipped. */
export function configuredProviders(): NamedProvider[] {
  const list: NamedProvider[] = [];
  const groqKey = env("GROQ_API_KEY");
  if (groqKey) list.push({ id: "groq", call: createGroqProvider(groqKey, env("GROQ_MODEL") ?? DEFAULT_GROQ_MODEL) });
  const geminiKey = env("GEMINI_API_KEY");
  if (geminiKey) list.push({ id: "gemini", call: createGeminiProvider(geminiKey, env("GEMINI_MODEL") ?? DEFAULT_GEMINI_MODEL) });
  return list;
}
