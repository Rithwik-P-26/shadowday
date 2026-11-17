import { parseAgentRequest } from "@/lib/agents/validate";
import { runAgent } from "@/lib/agents/run";
import { clientIp, rateLimit } from "@/lib/llm/ratelimit";

// POST /api/agent: one turn with Mariam (manager), the customer (stakeholder) or Ravi (mentor).
// Body: AgentRequest. Response: AgentResponse. Bad input gets a 400; everything else gets a reply,
// scripted if the LLMs are unavailable or this client is over the rate limit.

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_CHARS = 100_000;

/**
 * Test hook: a request with the header "x-shadowday-scripted: 1" skips the LLMs and gets the scripted reply
 * (lib/llm/scripted.ts). The automated e2e suite sends it so replies are deterministic and it doesn't burn the
 * free Groq/Gemini quota. It doesn't count against the rate limit, since no LLM is called. Harmless if a
 * student sends it: they just get the scripted characters.
 */
export const SCRIPTED_HEADER = "x-shadowday-scripted";

function wantsScripted(request: Request): boolean {
  return request.headers.get(SCRIPTED_HEADER)?.trim() === "1";
}

function badRequest(error: string): Response {
  return Response.json({ error }, { status: 400, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_CHARS * 4) return badRequest("Request too large");

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return badRequest("Could not read the request body");
  }
  if (raw.length > MAX_BODY_CHARS) return badRequest("Request too large");

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return badRequest("Body must be JSON");
  }

  const parsed = parseAgentRequest(body);
  if (!parsed.ok) return badRequest(parsed.error);

  const scripted = wantsScripted(request);
  const allowed = scripted || rateLimit(clientIp(request.headers)).allowed;
  const reply = await runAgent(parsed.value, { skipLlm: scripted || !allowed });
  return Response.json(reply, { headers: { "Cache-Control": "no-store" } });
}
