import type { Archetype, ArchetypeId, L10n, Lang } from "@/lib/types";

// Per-archetype colour used by both the LLM prompts and the scripted replies.
// Nothing here may contain a ticket's hidden rule.

export interface ArchetypeFlavor {
  companyAr: string;
  /** What the stakeholder talks about, e.g. "the farm, the wells and the palms" */
  world: L10n;
  /** Why the demo result matters to the stakeholder (a clause that follows "because") */
  why: L10n;
  /** What engineers at a startup like this actually do day to day */
  roleNote: L10n;
}

export const ARCHETYPE_FLAVOR: Record<ArchetypeId, ArchetypeFlavor> = {
  water: {
    companyAr: "فلج لابز",
    world: { en: "the farm, the wells, the pumps and the palms", ar: "المزرعة والآبار والمضخات والنخيل" },
    why: {
      en: "every night a well over-pumps lowers the aquifer and makes the water saltier for the palms",
      ar: "كل ليلة ضخ زائد تُخفض مستوى المياه الجوفية وتزيد ملوحة الماء الذي يسقي النخيل",
    },
    roleNote: {
      en: "Engineers at a startup like {company} spend their days much like yours today: reading sensor data, writing small tested functions, and calling farmers to check the numbers make sense. Some weeks they drive out to the farms to fix a meter.",
      ar: "يقضي المهندسون في شركة ناشئة مثل {company} أيامهم كما قضيت يومك اليوم: يقرؤون بيانات الحساسات، ويكتبون دوال صغيرة مع اختباراتها، ويتصلون بالمزارعين للتأكد من أن الأرقام منطقية. وفي بعض الأسابيع يذهبون إلى المزارع لإصلاح عداد.",
    },
  },
  floods: {
    companyAr: "وادي ووتش",
    world: { en: "the roads, the rain, the wadis and the road crews", ar: "الطرق والأمطار والأودية وفرق الطرق" },
    why: {
      en: "an alert that comes late can mean a car driving into a flooded wadi",
      ar: "التنبيه المتأخر قد يعني أن تدخل سيارة وادياً غمرته المياه",
    },
    roleNote: {
      en: "Engineers at {company} write code that turns rain gauge readings into alerts, test it against past storms, and sit with road crews to learn what a useful alert looks like. In storm season they take turns being on call.",
      ar: "يكتب المهندسون في {company} كوداً يحوّل قراءات مقاييس المطر إلى تنبيهات، ويختبرونه على عواصف سابقة، ويجلسون مع فرق الطرق ليعرفوا شكل التنبيه المفيد. وفي موسم العواصف يتناوبون على المناوبة.",
    },
  },
  heat: {
    companyAr: "باريد لابز",
    world: { en: "the construction site, the weather and the workers", ar: "موقع البناء والطقس والعمال" },
    why: {
      en: "these flags tell the site when to bring two hundred workers in from the heat",
      ar: "هذه التنبيهات تخبر الموقع متى يجب إدخال مئتي عامل بعيداً عن الحر",
    },
    roleNote: {
      en: "Engineers at {company} build the code that turns temperature and humidity into safety decisions, check it against the summer work rules, and visit sites to see how supervisors really use it.",
      ar: "يبني المهندسون في {company} الكود الذي يحوّل الحرارة والرطوبة إلى قرارات سلامة، ويتحققون منه وفق قواعد العمل في الصيف، ويزورون المواقع ليروا كيف يستخدمه المشرفون فعلاً.",
    },
  },
};

export function companyName(archetype: Archetype, lang: Lang): string {
  return lang === "ar" ? ARCHETYPE_FLAVOR[archetype.id]?.companyAr ?? archetype.company.name : archetype.company.name;
}
