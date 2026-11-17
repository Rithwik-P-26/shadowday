import { parseAgentRequest } from "@/lib/agents/validate";
import { runAgent } from "@/lib/agents/run";
import { clientIp, rateLimit } from "@/lib/llm/ratelimit";

// POST /api/agent: one turn with Mariam (manager), the customer (stakeholder) or Ravi (mentor).
// Body: AgentRequest. Response: AgentResponse. Bad input gets a 400; everything else gets a reply,
// scripted if the LLMs are unavailable or this client is over the rate limit.

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_CHARS = 100_000;

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

  const { allowed } = rateLimit(clientIp(request.headers));
  const reply = await runAgent(parsed.value, { skipLlm: !allowed });
  return Response.json(reply, { headers: { "Cache-Control": "no-store" } });
}
