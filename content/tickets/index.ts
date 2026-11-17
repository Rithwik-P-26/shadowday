import type { ArchetypeId, Ticket } from "@/lib/types";
import { TICKETS } from "./generated";

// generated.ts is written by scripts/build-tickets.mjs from content/tickets/<id>/ files.
export function getTicket(id: ArchetypeId): Ticket {
  return TICKETS[id];
}

export { TICKETS };
