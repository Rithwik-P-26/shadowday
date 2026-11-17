import type { Archetype, ArchetypeId, Area, Character } from "@/lib/types";

// UAE region pack. Adding a region elsewhere in the world means another file shaped like this one.

export const HUBS = [
  { id: "dubai", name: { en: "Dubai Internet City", ar: "مدينة دبي للإنترنت" }, lat: 25.095, lng: 55.16 },
  { id: "abudhabi", name: { en: "Hub71, Abu Dhabi", ar: "هب71، أبوظبي" }, lat: 24.501, lng: 54.389 },
];

export const AREAS: Area[] = [
  { id: "liwa", name: { en: "Liwa", ar: "ليوا" }, emirate: { en: "Abu Dhabi · Al Dhafra", ar: "أبوظبي · الظفرة" }, archetype: "water", lat: 23.12, lng: 53.77 },
  { id: "madinat-zayed", name: { en: "Madinat Zayed", ar: "مدينة زايد" }, emirate: { en: "Abu Dhabi · Al Dhafra", ar: "أبوظبي · الظفرة" }, archetype: "water", lat: 23.68, lng: 53.7 },
  { id: "al-ain", name: { en: "Al Ain", ar: "العين" }, emirate: { en: "Abu Dhabi", ar: "أبوظبي" }, archetype: "water", lat: 24.21, lng: 55.74 },
  { id: "ruwais", name: { en: "Ruwais", ar: "الرويس" }, emirate: { en: "Abu Dhabi · Al Dhafra", ar: "أبوظبي · الظفرة" }, archetype: "heat", lat: 24.11, lng: 52.73 },
  { id: "musaffah", name: { en: "Musaffah", ar: "مصفح" }, emirate: { en: "Abu Dhabi", ar: "أبوظبي" }, archetype: "heat", lat: 24.35, lng: 54.5 },
  { id: "sharjah", name: { en: "Sharjah", ar: "الشارقة" }, emirate: { en: "Sharjah", ar: "الشارقة" }, archetype: "heat", lat: 25.31, lng: 55.42 },
  { id: "ajman", name: { en: "Ajman", ar: "عجمان" }, emirate: { en: "Ajman", ar: "عجمان" }, archetype: "heat", lat: 25.41, lng: 55.45 },
  { id: "umm-al-quwain", name: { en: "Umm Al Quwain", ar: "أم القيوين" }, emirate: { en: "Umm Al Quwain", ar: "أم القيوين" }, archetype: "heat", lat: 25.56, lng: 55.55 },
  { id: "ras-al-khaimah", name: { en: "Ras Al Khaimah", ar: "رأس الخيمة" }, emirate: { en: "Ras Al Khaimah", ar: "رأس الخيمة" }, archetype: "floods", lat: 25.79, lng: 55.94 },
  { id: "hatta", name: { en: "Hatta", ar: "حتا" }, emirate: { en: "Dubai", ar: "دبي" }, archetype: "floods", lat: 24.8, lng: 56.12 },
  { id: "fujairah", name: { en: "Fujairah", ar: "الفجيرة" }, emirate: { en: "Fujairah", ar: "الفجيرة" }, archetype: "floods", lat: 25.13, lng: 56.33 },
  { id: "dibba", name: { en: "Dibba Al Fujairah", ar: "دبا الفجيرة" }, emirate: { en: "Fujairah", ar: "الفجيرة" }, archetype: "floods", lat: 25.59, lng: 56.26 },
  { id: "khor-fakkan", name: { en: "Khor Fakkan", ar: "خورفكان" }, emirate: { en: "Sharjah", ar: "الشارقة" }, archetype: "floods", lat: 25.34, lng: 56.35 },
  { id: "kalba", name: { en: "Kalba", ar: "كلباء" }, emirate: { en: "Sharjah", ar: "الشارقة" }, archetype: "floods", lat: 25.05, lng: 56.35 },
];

export function getArea(id: string): Area {
  return AREAS.find((a) => a.id === id) ?? AREAS[0];
}

/** Straight-line distance in km to the nearest startup hub (haversine). */
export function kmToNearestHub(area: Pick<Area, "lat" | "lng">): { km: number; hub: (typeof HUBS)[number] } {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  let best = { km: Infinity, hub: HUBS[0] };
  for (const hub of HUBS) {
    const dLat = rad(hub.lat - area.lat);
    const dLng = rad(hub.lng - area.lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(area.lat)) * Math.cos(rad(hub.lat)) * Math.sin(dLng / 2) ** 2;
    const km = 2 * R * Math.asin(Math.sqrt(a));
    if (km < best.km) best = { km: Math.round(km), hub };
  }
  return best;
}

export const MANAGER: Character = {
  id: "manager",
  name: { en: "Mariam", ar: "مريم" },
  role: { en: "Engineering manager", ar: "مديرة الهندسة" },
  initials: "M",
  color: "#0f766e",
  bio: {
    en: "Runs the morning standup, assigns tickets and reviews what shipped at the end of the day. Started as a junior engineer herself.",
    ar: "تدير اجتماع الصباح وتوزّع المهام وتراجع ما تم إنجازه في نهاية اليوم. بدأت مسيرتها مهندسة مبتدئة.",
  },
};

export const MENTOR: Character = {
  id: "mentor",
  name: { en: "Ravi", ar: "رافي" },
  role: { en: "Senior engineer", ar: "مهندس أول" },
  initials: "R",
  color: "#b45309",
  bio: {
    en: "Reviews every pull request. Answers questions with questions, and never writes your code for you.",
    ar: "يراجع كل طلب دمج. يجيب عن الأسئلة بأسئلة، ولا يكتب الكود بدلاً منك أبداً.",
  },
};

export const ARCHETYPES: Record<ArchetypeId, Archetype> = {
  water: {
    id: "water",
    company: {
      name: "Falaj Labs",
      tagline: { en: "Sensors that help date farms pump less groundwater", ar: "حساسات تساعد مزارع النخيل على ضخ مياه جوفية أقل" },
      about: {
        en: "A six-person startup that fits flow meters to farm wells and tells owners when they are pumping more than their palms need.",
        ar: "شركة ناشئة من ستة أشخاص تركّب عدادات تدفق على آبار المزارع وتنبّه أصحابها عندما يضخّون أكثر مما يحتاجه النخيل.",
      },
    },
    problem: {
      en: "Farms in Abu Dhabi irrigate almost entirely with groundwater, and the aquifers under the Liwa Crescent have been falling for years. Over-pumping also makes the water saltier, which hurts the palms.",
      ar: "تعتمد المزارع في أبوظبي في الري بشكل شبه كامل على المياه الجوفية، ومستوى الخزانات تحت هلال ليوا ينخفض منذ سنوات. كما أن الضخ الزائد يزيد ملوحة المياه ويضر بالنخيل.",
    },
    stakeholder: {
      id: "stakeholder",
      name: { en: "Saeed", ar: "سعيد" },
      role: { en: "Date farm owner, Falaj Labs' first customer", ar: "صاحب مزرعة نخيل، أول عميل لدى فلج لابز" },
      initials: "S",
      color: "#4d7c0f",
      bio: {
        en: "Has farmed dates for thirty years. Knows exactly when a well is being pushed too hard, but explains it in farmer's terms, not engineer's.",
        ar: "يزرع النخيل منذ ثلاثين عاماً. يعرف تماماً متى يُرهَق البئر، لكنه يشرح ذلك بلغة المزارع لا بلغة المهندس.",
      },
    },
  },
  floods: {
    id: "floods",
    company: {
      name: "WadiWatch",
      tagline: { en: "Rain gauges that tell towns when to close wadi roads", ar: "مقاييس أمطار تخبر المدن متى تغلق طرق الأودية" },
      about: {
        en: "A small team that puts rain gauges in the mountains above wadi roads and sends closure alerts before the water arrives.",
        ar: "فريق صغير يضع مقاييس للأمطار في الجبال فوق طرق الأودية ويرسل تنبيهات الإغلاق قبل وصول المياه.",
      },
    },
    problem: {
      en: "Flash floods can fill a dry wadi within an hour, and roads that cross wadis in the eastern mountains become dangerous fast. In April 2024 the UAE saw some of the heaviest rain in its recorded history.",
      ar: "يمكن للسيول أن تملأ وادياً جافاً خلال ساعة، وتصبح الطرق التي تعبر الأودية في الجبال الشرقية خطرة بسرعة. وفي أبريل 2024 شهدت الإمارات من أغزر الأمطار في تاريخها المسجّل.",
    },
    stakeholder: {
      id: "stakeholder",
      name: { en: "Khalid", ar: "خالد" },
      role: { en: "Roads coordinator for the town, WadiWatch's customer", ar: "منسّق الطرق في البلدة، عميل وادي ووتش" },
      initials: "K",
      color: "#1d4ed8",
      bio: {
        en: "Decides which roads close during storms. Cares about one thing: nobody drives into a flooded wadi.",
        ar: "يقرّر أي الطرق تُغلق أثناء العواصف. يهتم بأمر واحد: ألا يقود أحد سيارته إلى وادٍ غمرته المياه.",
      },
    },
  },
  heat: {
    id: "heat",
    company: {
      name: "Barid Labs",
      tagline: { en: "Heat sensors that keep outdoor crews safe", ar: "حساسات حرارة تحمي فرق العمل في الهواء الطلق" },
      about: {
        en: "A startup that puts temperature and humidity sensors on construction sites and tells supervisors when outdoor work has to stop.",
        ar: "شركة ناشئة تضع حساسات للحرارة والرطوبة في مواقع البناء وتخبر المشرفين متى يجب إيقاف العمل في الهواء الطلق.",
      },
    },
    problem: {
      en: "Summer days on the coast combine extreme heat with high humidity. The UAE requires a midday break for outdoor work every summer, and crews still need to know which other hours are unsafe.",
      ar: "تجمع أيام الصيف على الساحل بين الحرارة الشديدة والرطوبة العالية. وتفرض الإمارات استراحة منتصف النهار للعمل في الهواء الطلق كل صيف، ومع ذلك يحتاج العمال إلى معرفة الساعات الأخرى غير الآمنة.",
    },
    stakeholder: {
      id: "stakeholder",
      name: { en: "Fatima", ar: "فاطمة" },
      role: { en: "Site safety officer, Barid Labs' customer", ar: "مسؤولة السلامة في الموقع، عميلة باريد لابز" },
      initials: "F",
      color: "#be123c",
      bio: {
        en: "Responsible for two hundred workers on a construction site. Knows the safety rules by heart and will not bend them.",
        ar: "مسؤولة عن مئتي عامل في موقع بناء. تحفظ قواعد السلامة عن ظهر قلب ولا تتهاون فيها.",
      },
    },
  },
};

export function getArchetype(areaId: string): Archetype {
  return ARCHETYPES[getArea(areaId).archetype];
}

export function getCharacter(areaId: string, agent: "manager" | "stakeholder" | "mentor"): Character {
  if (agent === "manager") return MANAGER;
  if (agent === "mentor") return MENTOR;
  return getArchetype(areaId).stakeholder;
}
