import { configuredProviders, ProviderError, type LlmInput, type LlmProviderId, type NamedProvider } from "@/lib/llm/providers";

// Try each configured provider in order. Any failure (429, 5xx, timeout, empty text) moves on to the next.
// Returns null when every provider fails, so the caller can fall back to a scripted reply.

export const PROVIDER_TIMEOUT_MS = 12_000;
export const RATE_LIMIT_COOLDOWN_MS = 60_000;

export interface FailoverResult {
  text: string;
  provider: LlmProviderId;
}

export interface FailoverOptions {
  /** Defaults to the providers that have keys in the environment. */
  providers?: NamedProvider[];
  timeoutMs?: number;
  now?: () => number;
}

/** provider -> epoch ms until which it is skipped (set after a 429). In-memory, per server instance. */
const cooldownUntil = new Map<LlmProviderId, number>();

export function resetFailoverState(): void {
  cooldownUntil.clear();
}

export function isCoolingDown(id: LlmProviderId, now: number = Date.now()): boolean {
  const until = cooldownUntil.get(id);
  return until !== undefined && now < until;
}

function logFailure(id: LlmProviderId, err: unknown): void {
  if (process.env.NODE_ENV === "test") return;
  // Status and kind only: never the request, headers or key.
  const detail = err instanceof ProviderError ? `${err.kind} ${err.status}` : "error";
  console.warn(`[shadowday/llm] ${id} failed (${detail}), trying next`);
}

async function callWithTimeout(p: NamedProvider, input: Omit<LlmInput, "signal">, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new ProviderError(p.id, "timeout", 0, `timed out after ${timeoutMs} ms`));
    }, timeoutMs);
  });
  try {
    // Race as well as abort, so a provider that ignores the signal still can't hang the request.
    return await Promise.race([p.call({ ...input, signal: controller.signal }), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export async function generateWithFailover(input: Omit<LlmInput, "signal">, opts: FailoverOptions = {}): Promise<FailoverResult | null> {
  const providers = opts.providers ?? configuredProviders();
  const now = opts.now ?? Date.now;
  const timeoutMs = opts.timeoutMs ?? PROVIDER_TIMEOUT_MS;

  for (const p of providers) {
    if (isCoolingDown(p.id, now())) continue;
    try {
      const text = (await callWithTimeout(p, input, timeoutMs)).trim();
      if (!text) throw new ProviderError(p.id, "empty", 200, "empty completion");
      return { text, provider: p.id };
    } catch (err) {
      if (err instanceof ProviderError && err.status === 429) cooldownUntil.set(p.id, now() + RATE_LIMIT_COOLDOWN_MS);
      logFailure(p.id, err);
    }
  }
  return null;
}
