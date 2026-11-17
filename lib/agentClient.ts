"use client";

import type { AgentRequest, AgentResponse } from "@/lib/types";

const OFFLINE: Record<string, { en: string; ar: string }> = {
  manager: {
    en: "Looks like the connection dropped for a moment. Keep going; I'll catch up.",
    ar: "يبدو أن الاتصال انقطع للحظة. تابع العمل، وسألحق بك.",
  },
  stakeholder: {
    en: "Sorry, the signal out here is bad. Can you ask me again in a minute?",
    ar: "عذراً، الإشارة ضعيفة هنا. هل يمكنك أن تسألني مرة أخرى بعد دقيقة؟",
  },
  mentor: {
    en: "My connection dropped. While you wait: re-read the first failing test's message. What exactly does it expect?",
    ar: "انقطع اتصالي. وأنت تنتظر: أعد قراءة رسالة أول اختبار فاشل. ما الذي يتوقعه بالضبط؟",
  },
};

export async function askAgent(req: AgentRequest): Promise<AgentResponse> {
  try {
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as AgentResponse;
    if (!data?.text) throw new Error("empty");
    return data;
  } catch {
    return { text: OFFLINE[req.agent][req.lang], provider: "scripted" };
  }
}
