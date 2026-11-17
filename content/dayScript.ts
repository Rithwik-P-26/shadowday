import type { Archetype, ArchetypeId, Area, L10n, Lang, Ticket } from "@/lib/types";
import { MANAGER, MENTOR } from "@/content/regions";

// Scripted lines that never need an LLM: the standup and the first message from each coworker.

const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

export function standupLines(lang: Lang, ctx: { name: string; area: Area; archetype: Archetype; ticket: Ticket }): string[] {
  const { area, archetype, ticket } = ctx;
  const vars = {
    name: ctx.name || (lang === "ar" ? "زميلنا الجديد" : "there"),
    company: archetype.company.name,
    tagline: lang === "en" ? archetype.company.tagline.en.charAt(0).toLowerCase() + archetype.company.tagline.en.slice(1) : archetype.company.tagline.ar,
    area: area.name[lang],
    problem: archetype.problem[lang],
    stakeholder: archetype.stakeholder.name[lang],
    stakeholderRole: archetype.stakeholder.role[lang],
    mentor: MENTOR.name[lang],
    key: ticket.key,
    title: ticket.title[lang],
    file: ticket.fileName,
  };
  const en = [
    "Good morning {name}, and welcome to {company}! I'm Mariam, I run engineering here. We build {tagline}.",
    "Some context on why we exist: {problem}",
    "You'll be working with two people today. {stakeholder} is our customer ({stakeholderRole}). {mentor} is our senior engineer; he reviews every pull request.",
    "Your ticket is {key}: {title}. Everything's in the ticket. The tests are in tests.py, and you're done when they all pass and {mentor} approves your pull request.",
    "One tip: if a ticket is vague, don't guess. Ask the customer. That's half of this job.",
  ];
  const ar = [
    "صباح الخير يا {name}، وأهلاً بك في {company}! أنا مريم، أدير فريق الهندسة هنا. نحن نصنع {tagline}.",
    "قليل من السياق عن سبب وجودنا: {problem}",
    "ستعمل اليوم مع شخصين. {stakeholder} هو عميلنا ({stakeholderRole}). و{mentor} هو مهندسنا الأول، ويراجع كل طلب دمج.",
    "مهمتك هي {key}: {title}. كل التفاصيل في المهمة. الاختبارات في tests.py، وتنتهي عندما تنجح كلها ويوافق {mentor} على طلب الدمج.",
    "نصيحة واحدة: إذا كانت المهمة غامضة فلا تخمّن. اسأل العميل. هذا نصف العمل.",
  ];
  return (lang === "ar" ? ar : en).map((s) => fill(s, vars));
}

const STAKEHOLDER_HELLO: Record<ArchetypeId, L10n> = {
  water: {
    en: "Salaam {name}. Mariam says you're the one fixing the alerts for my wells. Ask me anything about the farm. I know these wells better than any computer.",
    ar: "السلام عليكم يا {name}. تقول مريم إنك من سيصلح تنبيهات آباري. اسألني أي شيء عن المزرعة، فأنا أعرف هذه الآبار أكثر من أي حاسوب.",
  },
  floods: {
    en: "Hello {name}. I'm the one who has to decide which wadi roads close when it rains. Ask me whatever you need. I'd rather you ask than guess.",
    ar: "مرحباً يا {name}. أنا من يقرّر أي طرق الأودية تُغلق عندما تمطر. اسألني ما تحتاج، فأنا أفضّل أن تسأل على أن تخمّن.",
  },
  heat: {
    en: "Hi {name}. I'm responsible for the crew on site, so this alert matters to me. If anything in the ticket isn't clear, ask me. I know the safety rules by heart.",
    ar: "مرحباً يا {name}. أنا مسؤولة عن العمال في الموقع، لذلك هذا التنبيه مهم بالنسبة لي. إذا كان أي شيء في المهمة غير واضح فاسألني، فأنا أحفظ قواعد السلامة.",
  },
};

const MENTOR_HELLO: L10n = {
  en: "Hey {name}, I'm Ravi. Run the tests early: red is normal at the start. When you're stuck, tell me which test fails and what you've tried, and I'll ask you the right question.",
  ar: "أهلاً يا {name}، أنا رافي. شغّل الاختبارات مبكراً، فمن الطبيعي أن تفشل في البداية. إذا علقت، أخبرني أي اختبار يفشل وما الذي جربته، وسأطرح عليك السؤال المناسب.",
};

export function stakeholderHello(lang: Lang, archetype: ArchetypeId, name: string) {
  return fill(STAKEHOLDER_HELLO[archetype][lang], { name: name || (lang === "ar" ? "صديقي" : "there") });
}

export function mentorHello(lang: Lang, name: string) {
  return fill(MENTOR_HELLO[lang], { name: name || (lang === "ar" ? "صديقي" : "there") });
}

export const FREE_RESOURCES = [
  { name: "CS50's Introduction to Programming with Python", by: "Harvard", url: "https://cs50.harvard.edu/python/" },
  { name: "Python", by: "Kaggle Learn", url: "https://www.kaggle.com/learn/python" },
  { name: "Elements of AI", by: "University of Helsinki", url: "https://www.elementsofai.com/" },
  { name: "Scientific Computing with Python", by: "freeCodeCamp", url: "https://www.freecodecamp.org/learn/" },
];

export { MANAGER, MENTOR };
