"use client";

import { useLayoutEffect } from "react";
import type { L10n, Lang } from "@/lib/types";
import { useWorld } from "@/lib/world/store";

const STR = {
  brand: { en: "Shadowday", ar: "شادوداي" },
  tagline: { en: "A first day at a tech job, from anywhere in the UAE.", ar: "يومك الأول في وظيفة تقنية، من أي مكان في الإمارات." },
  langSwitch: { en: "العربية", ar: "English" },
  home: { en: "Shadowday home", ar: "Shadowday، الصفحة الرئيسية" },
  dayProgress: { en: "Day progress", ar: "تقدّم اليوم" },
  timeInDay: { en: "Time in your day", ar: "الوقت الذي قضيته في يومك" },

  // start
  startTitle: { en: "Where are you starting from?", ar: "من أين تبدأ يومك؟" },
  startLead: {
    en: "Pick the area closest to you. You'll join a startup working on a real problem there.",
    ar: "اختر المنطقة الأقرب إليك. ستنضم إلى شركة ناشئة تعمل على مشكلة حقيقية هناك.",
  },
  yourName: { en: "Your first name", ar: "اسمك الأول" },
  yourNameHint: { en: "Optional. Your coworkers will use it. It stays on this device.", ar: "اختياري. سيستخدمه زملاؤك. يبقى على هذا الجهاز فقط." },
  kmFromHub: { en: "{km} km from {hub}", ar: "{km} كم عن {hub}" },
  begin: { en: "Start the day at {company}", ar: "ابدأ يومك في {company}" },
  pickArea: { en: "Pick an area to continue", ar: "اختر منطقة للمتابعة" },
  resume: { en: "Resume your day", ar: "تابع يومك" },
  newDay: { en: "Start a new day", ar: "ابدأ يوماً جديداً" },
  viewReport: { en: "View your Shadow Report", ar: "اعرض تقرير يومك" },
  newDayConfirm: {
    en: "Start a new day? This replaces your current day, including its code and Shadow Report.",
    ar: "هل تريد بدء يوم جديد؟ سيحل محل يومك الحالي، بما فيه الكود وتقرير اليوم.",
  },
  distanceNote: {
    en: "Straight-line distance to the nearest startup hub: Dubai Internet City or Hub71 in Abu Dhabi.",
    ar: "المسافة بخط مستقيم إلى أقرب مركز للشركات الناشئة: مدينة دبي للإنترنت أو هب71 في أبوظبي.",
  },

  // phases
  phase_standup: { en: "Standup", ar: "الاجتماع" },
  phase_work: { en: "Build", ar: "البناء" },
  phase_review: { en: "Review", ar: "المراجعة" },
  phase_demo: { en: "Demo", ar: "العرض" },
  phase_report: { en: "Report", ar: "التقرير" },

  // standup
  standupTitle: { en: "Morning standup", ar: "اجتماع الصباح" },
  pickUpTicket: { en: "Pick up {key}", ar: "استلم المهمة {key}" },
  pythonLoading: { en: "Setting up Python in your browser…", ar: "جارٍ تجهيز بايثون في متصفحك…" },
  // Phone form of pythonLoading, next to the Run button (the full sentence did not fit).
  pythonLoadingShort: { en: "Loading Python…", ar: "تحميل بايثون…" },
  pythonReady: { en: "Python is ready", ar: "بايثون جاهز" },
  pythonError: { en: "Python didn't load. Check your connection and try again.", ar: "لم يتم تحميل بايثون. تحقق من الاتصال وحاول مرة أخرى." },
  skip: { en: "Skip", ar: "تخطَّ" },
  retry: { en: "Try again", ar: "حاول مرة أخرى" },
  reachFailed: { en: "Couldn't reach {name}. Check your connection and try again.", ar: "تعذّر الوصول إلى {name}. تحقق من الاتصال وحاول مرة أخرى." },

  // work
  team: { en: "Team", ar: "الفريق" },
  ticket: { en: "Ticket", ar: "المهمة" },
  code: { en: "Code", ar: "الكود" },
  tests: { en: "Tests", ar: "الاختبارات" },
  data: { en: "Data", ar: "البيانات" },
  ticketViews: { en: "Ticket and data", ar: "المهمة والبيانات" },
  runTests: { en: "Run tests", ar: "شغّل الاختبارات" },
  running: { en: "Running…", ar: "جارٍ التشغيل…" },
  resetCode: { en: "Reset file", ar: "أعد الملف" },
  resetConfirm: { en: "Reset your file to the starter code? Your changes will be lost.", ar: "إعادة الملف إلى الكود الأولي؟ ستفقد تعديلاتك." },
  testsNotRun: { en: "Run the tests to see where you stand. They're supposed to fail at first.", ar: "شغّل الاختبارات لترى أين وصلت. من الطبيعي أن تفشل في البداية." },
  passedOf: { en: "{passed} of {total} passing", ar: "{passed} من {total} ناجحة" },
  allPassing: { en: "All tests pass", ar: "كل الاختبارات ناجحة" },
  codeError: { en: "Your file has an error", ar: "في ملفك خطأ" },
  // The code was edited after the last run, so its result no longer vouches for the code in the editor.
  lastRunStale: { en: "Last run: {passed}/{total}", ar: "آخر تشغيل: {passed} من {total}" },
  lastRunStaleError: { en: "Last run: error", ar: "آخر تشغيل: خطأ" },
  errorShort: { en: "Error", ar: "خطأ" },
  line: { en: "line {n}", ar: "السطر {n}" },
  output: { en: "Output", ar: "المخرجات" },
  testPassed: { en: "passed", ar: "نجح" },
  testFailed: { en: "failed", ar: "فشل" },
  fnPassing: { en: "passing", ar: "ناجحة" },
  fnFailing: { en: "failing", ar: "فاشلة" },
  fnNotRun: { en: "not run yet", ar: "لم تُشغَّل بعد" },
  fnStale: { en: "changed since the last run", ar: "تغيّر الكود منذ آخر تشغيل" },
  workspaceNav: { en: "Workspace", ar: "مساحة العمل" },
  symbols: { en: "Symbols", ar: "رموز" },
  indent: { en: "Indent", ar: "مسافة بادئة" },
  askRavi: { en: "Ask Ravi about {fn}", ar: "اسأل رافي عن {fn}" },
  openPr: { en: "Open pull request", ar: "افتح طلب الدمج" },
  openPrLocked: { en: "Open a pull request once every test passes", ar: "افتح طلب الدمج عندما تنجح كل الاختبارات" },
  prShort: { en: "PR", ar: "طلب الدمج" },
  codeChanged: {
    en: "You changed the code after the last run. Run the tests again to open a pull request.",
    ar: "عدّلت الكود بعد آخر تشغيل. شغّل الاختبارات مرة أخرى لتفتح طلب الدمج.",
  },
  runTimeout: {
    en: "Your code ran for more than 10 seconds and was stopped. Check for a loop that never ends.",
    ar: "استمر تشغيل الكود أكثر من 10 ثوانٍ فأُوقف. تحقّق من وجود حلقة لا تنتهي.",
  },
  pythonCrashed: {
    en: "Python stopped while running your code, so it was restarted. Run it again.",
    ar: "توقفت بايثون أثناء تشغيل الكود، فأُعيد تشغيلها. شغّله مرة أخرى.",
  },
  messagePlaceholder: { en: "Message {name}", ar: "اكتب رسالة إلى {name}" },
  send: { en: "Send", ar: "إرسال" },
  typing: { en: "{name} is typing…", ar: "{name} يكتب…" },
  functions: { en: "Functions to write", ar: "الدوال المطلوبة" },
  readOnly: { en: "read-only", ar: "للقراءة فقط" },
  rowsOf: { en: "First {n} of {total} rows", ar: "أول {n} من {total} صفاً" },
  offline: { en: "(offline reply)", ar: "(رد دون اتصال)" },
  revealedBadge: { en: "You found the hidden requirement", ar: "اكتشفت المتطلب المخفي" },

  // review
  prTitle: { en: "Pull request #1", ar: "طلب الدمج رقم 1" },
  prOpen: { en: "Open", ar: "مفتوح" },
  prChanges: { en: "Your changes to {file}", ar: "تعديلاتك على {file}" },
  reviewing: { en: "Ravi is reviewing your code…", ar: "رافي يراجع الكود…" },
  approved: { en: "Approved", ar: "تمت الموافقة" },
  changesRequested: { en: "Changes requested", ar: "مطلوب تعديلات" },
  merge: { en: "Merge and demo it", ar: "ادمج واعرض النتيجة" },
  backToCode: { en: "Back to the code", ar: "عُد إلى الكود" },

  // demo
  demoTitle: { en: "Demo for Mariam", ar: "العرض لمريم" },
  demoLead: { en: "Run your code on {file}, the full dataset for this ticket.", ar: "شغّل الكود على {file}، مجموعة البيانات الكاملة لهذه المهمة." },
  runDemo: { en: "Run it on the full dataset", ar: "شغّله على البيانات الكاملة" },
  demoChart_water: { en: "Water pumped per day at Saeed's farm, July 2026", ar: "كمية المياه المضخوخة يومياً في مزرعة سعيد، يوليو 2026" },
  demoChart_floods: { en: "Heaviest hour of rain above each wadi road, 14 April 2026", ar: "أغزر ساعة مطر فوق كل طريق وادٍ، 14 أبريل 2026" },
  demoChart_heat: { en: "Feels-like temperature at Fatima's site, 14 July 2026", ar: "درجة الحرارة المحسوسة في موقع فاطمة، 14 يوليو 2026" },
  demoUnit_water: { en: "liters", ar: "لتر" },
  demoUnit_floods: { en: "mm", ar: "ملم" },
  demoUnit_heat: { en: "°C", ar: "°م" },
  demoFailed: { en: "The demo hit an error", ar: "واجه العرض خطأً" },
  flagged: { en: "Flagged", ar: "مُعلَّم" },
  notFlagged: { en: "Normal", ar: "طبيعي" },
  wrapUp: { en: "Wrap up the day", ar: "اختم اليوم" },
  wrapping: { en: "Mariam is writing your end-of-day note…", ar: "مريم تكتب ملاحظة نهاية اليوم…" },

  // report
  reportTitle: { en: "Shadow Report", ar: "تقرير اليوم" },
  shipped: { en: "What you shipped", ar: "ما أنجزته" },
  skills: { en: "What you did that engineers do", ar: "ما فعلته كما يفعل المهندسون" },
  skillAsk: { en: "Asked the customer until the requirement was clear", ar: "سألت العميل حتى اتضح المتطلب" },
  skillTest: { en: "Used tests to find and fix problems", ar: "استخدمت الاختبارات لاكتشاف المشكلات وإصلاحها" },
  skillHelp: { en: "Asked a senior engineer for help", ar: "طلبت المساعدة من مهندس أول" },
  skillShip: { en: "Got a pull request approved and merged", ar: "حصلت على موافقة لطلب الدمج ودمجته" },
  skillData: { en: "Ran your code on a realistic field dataset", ar: "شغّلت الكود على بيانات ميدانية واقعية" },
  skillDone: { en: "done", ar: "تم" },
  skillNotDone: { en: "not this time", ar: "ليس هذه المرة" },
  managerNote: { en: "Mariam's note", ar: "ملاحظة مريم" },
  keepGoing: { en: "Keep going, for free", ar: "واصل التعلّم مجاناً" },
  download: { en: "Download your project (.zip)", ar: "نزّل مشروعك (zip.)" },
  print: { en: "Save as PDF", ar: "احفظ بصيغة PDF" },
  anotherDay: { en: "Try another region", ar: "جرّب منطقة أخرى" },
  noReport: { en: "Finish a day first to get your report.", ar: "أنهِ يوماً أولاً لتحصل على تقريرك." },
  goStart: { en: "Pick an area", ar: "اختر منطقة" },
} satisfies Record<string, L10n>;

export type StrKey = keyof typeof STR;

export function tr(lang: Lang, key: StrKey, vars?: Record<string, string | number>): string {
  let s = STR[key][lang];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** Counted nouns. Arabic: 1 and 2 have their own forms, 3-10 take the plural, 11 and up the singular. */
const COUNTS = {
  runs: { en: ["run", "runs"], ar: { one: "مرة واحدة", two: "مرتين", few: "مرات", many: "مرة" } },
  hints: { en: ["hint", "hints"], ar: { one: "تلميح واحد", two: "تلميحين", few: "تلميحات", many: "تلميحاً" } },
  minutes: { en: ["min", "min"], ar: { one: "دقيقة واحدة", two: "دقيقتان", few: "دقائق", many: "دقيقة" } },
  unchangedLines: {
    en: ["unchanged line", "unchanged lines"],
    ar: { one: "سطر واحد دون تغيير", two: "سطران دون تغيير", few: "أسطر دون تغيير", many: "سطراً دون تغيير" },
  },
} satisfies Record<string, { en: [string, string]; ar: { one: string; two: string; few: string; many: string } }>;

export type CountNoun = keyof typeof COUNTS;

/** The number and its noun are joined by a no-break space so a line never splits "(1 / hint)". */
export function countOf(lang: Lang, noun: CountNoun, n: number): string {
  const f = COUNTS[noun];
  if (lang === "en") return `${n} ${n === 1 ? f.en[0] : f.en[1]}`;
  if (n === 1) return f.ar.one.replace(" ", " ");
  if (n === 2) return f.ar.two;
  return `${n} ${n % 100 >= 3 && n % 100 <= 10 ? f.ar.few : f.ar.many}`;
}

export function useT() {
  const lang = useWorld((s) => s.lang);
  return {
    lang,
    t: (key: StrKey, vars?: Record<string, string | number>) => tr(lang, key, vars),
    l: (v: L10n) => v[lang],
    count: (noun: CountNoun, n: number) => countOf(lang, noun, n),
  };
}

/** Keeps <html lang dir> in sync with the chosen language (before paint, so Arabic never flashes left-to-right). */
export function useLangSync() {
  const lang = useWorld((s) => s.lang);
  useLayoutEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
}
