"use client";

import { useEffect } from "react";
import type { L10n, Lang } from "@/lib/types";
import { useWorld } from "@/lib/world/store";

const STR = {
  brand: { en: "Shadowday", ar: "شادوداي" },
  tagline: { en: "A first day at a tech job, from anywhere in the UAE.", ar: "يومك الأول في وظيفة تقنية، من أي مكان في الإمارات." },
  langSwitch: { en: "العربية", ar: "English" },

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
  pythonReady: { en: "Python is ready", ar: "بايثون جاهز" },
  pythonError: { en: "Python didn't load. Check your connection and reload.", ar: "لم يتم تحميل بايثون. تحقق من الاتصال وأعد التحميل." },

  // work
  team: { en: "Team", ar: "الفريق" },
  ticket: { en: "Ticket", ar: "المهمة" },
  code: { en: "Code", ar: "الكود" },
  tests: { en: "Tests", ar: "الاختبارات" },
  data: { en: "Data", ar: "البيانات" },
  runTests: { en: "Run tests", ar: "شغّل الاختبارات" },
  running: { en: "Running…", ar: "جارٍ التشغيل…" },
  resetCode: { en: "Reset file", ar: "أعد الملف" },
  resetConfirm: { en: "Reset your file to the starter code? Your changes will be lost.", ar: "إعادة الملف إلى الكود الأولي؟ ستفقد تعديلاتك." },
  testsNotRun: { en: "Run the tests to see where you stand. They're supposed to fail at first.", ar: "شغّل الاختبارات لترى أين وصلت. من الطبيعي أن تفشل في البداية." },
  passedOf: { en: "{passed} of {total} passing", ar: "{passed} من {total} ناجحة" },
  allPassing: { en: "All tests pass", ar: "كل الاختبارات ناجحة" },
  codeError: { en: "Your file has an error", ar: "في ملفك خطأ" },
  line: { en: "line {n}", ar: "السطر {n}" },
  output: { en: "Output", ar: "المخرجات" },
  askRavi: { en: "Ask Ravi about {fn}", ar: "اسأل رافي عن {fn}" },
  openPr: { en: "Open pull request", ar: "افتح طلب الدمج" },
  openPrLocked: { en: "Open a pull request once every test passes", ar: "افتح طلب الدمج عندما تنجح كل الاختبارات" },
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
  prChanges: { en: "Your changes to {file}", ar: "تعديلاتك على {file}" },
  reviewing: { en: "Ravi is reviewing your code…", ar: "رافي يراجع الكود…" },
  approved: { en: "Approved", ar: "تمت الموافقة" },
  changesRequested: { en: "Changes requested", ar: "مطلوب تعديلات" },
  merge: { en: "Merge and demo it", ar: "ادمج واعرض النتيجة" },
  backToCode: { en: "Back to the code", ar: "عُد إلى الكود" },

  // demo
  demoTitle: { en: "Demo for Mariam", ar: "العرض لمريم" },
  demoLead: { en: "Run your code on {file}, the real readings from the field.", ar: "شغّل الكود على {file}، القراءات الحقيقية من الميدان." },
  runDemo: { en: "Run it on the real data", ar: "شغّله على البيانات الحقيقية" },
  demoFailed: { en: "The demo hit an error", ar: "واجه العرض خطأً" },
  flagged: { en: "Flagged", ar: "مُعلَّم" },
  notFlagged: { en: "Normal", ar: "طبيعي" },
  wrapUp: { en: "Wrap up the day", ar: "اختم اليوم" },
  wrapping: { en: "Mariam is writing your end-of-day note…", ar: "مريم تكتب ملاحظة نهاية اليوم…" },

  // report
  reportTitle: { en: "Shadow Report", ar: "تقرير اليوم" },
  reportFor: { en: "{name} · {area} · {company}", ar: "{name} · {area} · {company}" },
  shipped: { en: "What you shipped", ar: "ما أنجزته" },
  skills: { en: "What you did that engineers do", ar: "ما فعلته كما يفعل المهندسون" },
  skillAsk: { en: "Asked the customer until the requirement was clear", ar: "سألت العميل حتى اتضح المتطلب" },
  skillTest: { en: "Used tests to find and fix problems ({n} runs)", ar: "استخدمت الاختبارات لاكتشاف المشكلات وإصلاحها ({n} مرات)" },
  skillHelp: { en: "Asked a senior engineer for help ({n} hints)", ar: "طلبت المساعدة من مهندس أول ({n} تلميحات)" },
  skillShip: { en: "Got a pull request approved and merged", ar: "حصلت على موافقة لطلب الدمج ودمجته" },
  skillData: { en: "Ran your code on real field data", ar: "شغّلت الكود على بيانات ميدانية حقيقية" },
  managerNote: { en: "Mariam's note", ar: "ملاحظة مريم" },
  keepGoing: { en: "Keep going, for free", ar: "واصل التعلّم مجاناً" },
  download: { en: "Download your project (.zip)", ar: "نزّل مشروعك (zip.)" },
  print: { en: "Save as PDF", ar: "احفظ بصيغة PDF" },
  anotherDay: { en: "Try another region", ar: "جرّب منطقة أخرى" },
  minutes: { en: "{n} min", ar: "{n} دقيقة" },
  noReport: { en: "Finish a day first to get your report.", ar: "أنهِ يوماً أولاً لتحصل على تقريرك." },
  goStart: { en: "Pick an area", ar: "اختر منطقة" },
} satisfies Record<string, L10n>;

export type StrKey = keyof typeof STR;

export function tr(lang: Lang, key: StrKey, vars?: Record<string, string | number>): string {
  let s = STR[key][lang];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function useT() {
  const lang = useWorld((s) => s.lang);
  return {
    lang,
    t: (key: StrKey, vars?: Record<string, string | number>) => tr(lang, key, vars),
    l: (v: L10n) => v[lang],
  };
}

/** Keeps <html lang dir> in sync with the chosen language. */
export function useLangSync() {
  const lang = useWorld((s) => s.lang);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
}
