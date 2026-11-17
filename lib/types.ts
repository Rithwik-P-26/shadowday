// Shared contracts for Shadowday. Every module builds against these types.

export type Lang = "en" | "ar";
export type L10n = { en: string; ar: string };

export type ArchetypeId = "water" | "floods" | "heat";
export type AgentId = "manager" | "stakeholder" | "mentor";
export type Phase = "standup" | "work" | "review" | "demo" | "report";

/** A place a student can pick. */
export interface Area {
  id: string;
  name: L10n;
  emirate: L10n;
  archetype: ArchetypeId;
  lat: number;
  lng: number;
}

export interface Character {
  id: AgentId;
  name: L10n;
  role: L10n;
  initials: string;
  /** CSS colour for the avatar chip */
  color: string;
  bio: L10n;
}

export interface Archetype {
  id: ArchetypeId;
  company: { name: string; tagline: L10n; about: L10n };
  /** The real local problem, one short paragraph */
  problem: L10n;
  stakeholder: Character;
}

export interface TicketFunction {
  name: string;
  /** e.g. "parse_reading(line: str) -> dict | None" */
  signature: string;
  summary: L10n;
}

export interface Hint {
  level: 1 | 2 | 3;
  text: L10n;
}

export interface Ticket {
  id: ArchetypeId;
  /** e.g. "FLJ-42" */
  key: string;
  title: L10n;
  /** The ticket as the manager wrote it: deliberately vague on the hidden rule. Plain text, may use \n and "- " bullets. */
  body: L10n;
  /** Student's file name, e.g. "pumps.py" */
  fileName: string;
  /** Python starter code with TODOs */
  starter: string;
  /** Python tests: top-level test_* functions using plain assert with messages */
  tests: string;
  /** test function name -> the student function it exercises */
  testFn: Record<string, string>;
  /** The real dataset shown in the Data tab and used by the demo */
  data: { fileName: string; csv: string };
  /**
   * Python snippet run after the student's code during the demo. The CSV text is available as
   * the global DATA_CSV. It must print exactly one line of JSON:
   * {"title": str, "unit": str, "series": [{"label": str, "value": number, "flagged": bool}], "summary": {"en": str, "ar": str}}
   */
  demo: string;
  functions: TicketFunction[];
  hidden: {
    /** The rule only the stakeholder knows */
    rule: L10n;
    /** Lower-case words or phrases that count as asking about the rule (scripted fallback) */
    revealKeywords: string[];
    /** Substrings whose presence in a stakeholder reply proves the rule was disclosed, e.g. "20%" */
    revealMarkers: string[];
  };
  /** Ordered hint ladder per student function name (3 levels: nudge, concept, near-pseudocode; never solution code) */
  hints: Record<string, Hint[]>;
  conceptTags: string[];
}

/** Result of running the tests in Pyodide (shape returned by public/py/harness.py run_tests). */
export interface TestResult {
  name: string;
  fn: string;
  passed: boolean;
  message: string;
}
export interface TestRun {
  ok: boolean;
  error?: { type: string; message: string; line?: number };
  stdout: string;
  results: TestResult[];
}

export interface DemoPoint {
  label: string;
  value: number;
  flagged: boolean;
}
export interface DemoResult {
  title: string;
  unit: string;
  series: DemoPoint[];
  summary: L10n;
}

export type ChatFrom = "student" | AgentId;
export interface ChatMessage {
  id: string;
  from: ChatFrom;
  text: string;
  at: number;
  provider?: Provider;
}

export type Provider = "groq" | "gemini" | "scripted";

/** POST /api/agent request body */
export interface AgentRequest {
  agent: AgentId;
  mode: "chat" | "hint" | "review" | "demo" | "eod";
  lang: Lang;
  areaId: string;
  studentName?: string;
  /** chat mode: the student's new message */
  message?: string;
  /** last messages in this channel, oldest first (max 12 used) */
  history: { from: ChatFrom; text: string }[];
  /** mentor modes: the student's current code */
  code?: string;
  testSummary?: {
    passed: number;
    total: number;
    failing: { name: string; fn: string; message: string }[];
  };
  /** hint mode: the function the student is stuck on */
  focusFn?: string;
  /** hint mode: hints already given for focusFn */
  hintLevel?: number;
  /** demo / eod: what the student's code produced on the real data */
  demoSummary?: string;
  /** eod: what happened during the day */
  stats?: {
    testRuns: number;
    questionsAsked: number;
    hintsUsed: number;
    revealed: boolean;
    minutes: number;
  };
}

/** POST /api/agent response body */
export interface AgentResponse {
  text: string;
  provider: Provider;
  /** stakeholder chat: true when this reply disclosed the hidden rule */
  revealed?: boolean;
  /** review mode: true when the PR is approved (all tests pass) */
  approved?: boolean;
}
