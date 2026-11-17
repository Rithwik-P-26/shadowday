import type { AgentRequest, ArchetypeId, Ticket } from "@/lib/types";

// Fixture tickets, one per archetype, so the agent tests don't depend on content/tickets/generated.ts.

const base = {
  starter: "def placeholder():\n    # TODO\n    pass\n",
  tests: "def test_placeholder():\n    assert True\n",
  data: { fileName: "data.csv", csv: "a,b\n1,2\n" },
  demo: 'print("{}")',
};

export const WATER: Ticket = {
  ...base,
  id: "water",
  key: "FLJ-42",
  title: { en: "Flag wells that are over-pumping", ar: "تنبيه الآبار التي تضخ أكثر من اللازم" },
  body: {
    en: "Saeed wants an alert when a well pumps too much.\n- Parse the meter lines\n- Total each well per day\n- Flag the wells that pump too much",
    ar: "يريد سعيد تنبيهاً عندما يضخ البئر أكثر من اللازم.\n- حلّل أسطر العداد\n- اجمع ضخ كل بئر في اليوم\n- نبّه على الآبار التي تضخ أكثر من اللازم",
  },
  fileName: "pumps.py",
  testFn: {
    test_parse_valid_line: "parse_reading",
    test_parse_bad_line: "parse_reading",
    test_daily_total: "daily_total",
    test_flag_uses_own_average: "flag_wells",
  },
  functions: [
    { name: "parse_reading", signature: "parse_reading(line: str) -> dict | None", summary: { en: "Turn one meter line into a dict.", ar: "حوّل سطر العداد إلى قاموس." } },
    { name: "daily_total", signature: "daily_total(readings: list, well_id: str) -> float", summary: { en: "Total litres for one well.", ar: "مجموع اللترات لبئر واحد." } },
    { name: "flag_wells", signature: "flag_wells(totals: dict, averages: dict) -> list[str]", summary: { en: "Return the wells to warn about.", ar: "أرجع الآبار التي يجب التنبيه عليها." } },
  ],
  hidden: {
    rule: {
      en: "A well is over-pumping when today's total is more than 20% above that well's own 30-day average, not above one fixed number for every well.",
      ar: "يكون البئر في حالة ضخ زائد عندما يزيد مجموع اليوم بأكثر من 20% عن متوسط البئر نفسه خلال 30 يوماً، وليس عن رقم ثابت لكل الآبار.",
    },
    revealKeywords: ["over-pumping", "pump too much", "what counts", "threshold", "ضخ زائد"],
    revealMarkers: ["20%", "20 percent"],
  },
  hints: {
    parse_reading: [
      { level: 1, text: { en: "What separates the fields in one line?", ar: "ما الذي يفصل بين الحقول في السطر الواحد؟" } },
      { level: 2, text: { en: "split() gives you a list; which index holds the litres?", ar: "تعطيك split() قائمة؛ أي فهرس يحمل اللترات؟" } },
      { level: 3, text: { en: "Split on commas, check you got three parts, convert the last one to a float, else return None.", ar: "قسّم عند الفواصل، وتأكد أن لديك ثلاثة أجزاء، وحوّل الأخير إلى رقم عشري، وإلا أرجع None." } },
    ],
    daily_total: [
      { level: 1, text: { en: "Which readings belong to this well?", ar: "أي القراءات تخص هذا البئر؟" } },
      { level: 2, text: { en: "Keep a running total as you loop.", ar: "احتفظ بمجموع متراكم أثناء التكرار." } },
      { level: 3, text: { en: "Start at zero, add the litres of every reading whose well matches.", ar: "ابدأ من الصفر وأضف لترات كل قراءة يطابق بئرها." } },
    ],
    flag_wells: [
      { level: 1, text: { en: "The ticket says 'too much'. Too much compared to what? Ask Saeed.", ar: "تقول المهمة «أكثر من اللازم». أكثر مقارنة بماذا؟ اسأل سعيد." } },
      { level: 2, text: { en: "Each well has its own normal. Where is that normal stored?", ar: "لكل بئر معدله الطبيعي. أين يُحفظ هذا المعدل؟" } },
      { level: 3, text: { en: "For each well, compare today's total with that well's average using the rule Saeed gave you.", ar: "لكل بئر، قارن مجموع اليوم بمتوسط البئر نفسه باستخدام القاعدة التي أعطاك إياها سعيد." } },
    ],
  },
  conceptTags: [
    { en: "strings", ar: "النصوص" },
    { en: "loops", ar: "الحلقات" },
    { en: "dicts", ar: "القواميس" },
  ],
};

export const FLOODS: Ticket = {
  ...base,
  id: "floods",
  key: "WW-17",
  title: { en: "Decide which wadi roads to close", ar: "تحديد طرق الأودية التي يجب إغلاقها" },
  body: {
    en: "Khalid needs a list of roads to close when the rain gets heavy.\n- Parse gauge rows\n- Sum the rain in the last hour\n- Return the roads to close",
    ar: "يحتاج خالد قائمة بالطرق التي يجب إغلاقها عندما يشتد المطر.\n- حلّل صفوف المقياس\n- اجمع المطر في الساعة الأخيرة\n- أرجع الطرق التي يجب إغلاقها",
  },
  fileName: "alerts.py",
  testFn: {
    test_parse_gauge: "parse_gauge",
    test_rain_last_hour: "rain_last_hour",
    test_close_on_upstream_rain: "roads_to_close",
  },
  functions: [
    { name: "parse_gauge", signature: "parse_gauge(row: str) -> tuple | None", summary: { en: "Read one gauge row.", ar: "اقرأ صف مقياس واحد." } },
    { name: "rain_last_hour", signature: "rain_last_hour(rows: list, now: int) -> float", summary: { en: "Millimetres in the last 60 minutes.", ar: "الملليمترات في آخر 60 دقيقة." } },
    { name: "roads_to_close", signature: "roads_to_close(gauges: dict) -> list[str]", summary: { en: "Roads that must close.", ar: "الطرق التي يجب إغلاقها." } },
  ],
  hidden: {
    rule: {
      en: "Close a road when the gauge upstream of it records 15 mm or more in any 60-minute window, even if it is not raining in town.",
      ar: "أغلق الطريق عندما يسجّل المقياس الذي في أعلى الوادي 15 ملم أو أكثر خلال أي 60 دقيقة، حتى لو لم تكن تمطر في البلدة.",
    },
    revealKeywords: ["close a road", "how much rain", "heavy rain", "متى تغلق"],
    revealMarkers: ["15 mm", "15mm", "15 ملم"],
  },
  hints: {
    parse_gauge: [
      { level: 1, text: { en: "What does one row look like?", ar: "كيف يبدو الصف الواحد؟" } },
      { level: 2, text: { en: "Which parts are numbers?", ar: "أي الأجزاء أرقام؟" } },
      { level: 3, text: { en: "Split the row and convert the minute and the millimetres.", ar: "قسّم الصف وحوّل الدقيقة والملليمترات." } },
    ],
    rain_last_hour: [
      { level: 1, text: { en: "Which rows are inside the last hour?", ar: "أي الصفوف داخل الساعة الأخيرة؟" } },
      { level: 2, text: { en: "Compare each minute with now minus 60.", ar: "قارن كل دقيقة بالوقت الحالي ناقص 60." } },
      { level: 3, text: { en: "Add up the millimetres of rows newer than now minus 60.", ar: "اجمع ملليمترات الصفوف الأحدث من الوقت الحالي ناقص 60." } },
    ],
    roads_to_close: [
      { level: 1, text: { en: "When does Khalid close a road? Ask him.", ar: "متى يغلق خالد الطريق؟ اسأله." } },
      { level: 2, text: { en: "Which gauge matters for which road?", ar: "أي مقياس يهم أي طريق؟" } },
      { level: 3, text: { en: "Loop over the roads and apply Khalid's rule to the upstream gauge.", ar: "مرّ على الطرق وطبّق قاعدة خالد على المقياس الأعلى." } },
    ],
  },
  conceptTags: [
    { en: "time windows", ar: "النوافذ الزمنية" },
    { en: "sums", ar: "المجاميع" },
  ],
};

export const HEAT: Ticket = {
  ...base,
  id: "heat",
  key: "BRD-8",
  title: { en: "Mark the unsafe work hours", ar: "تحديد ساعات العمل غير الآمنة" },
  body: {
    en: "Fatima wants to know which hours are unsafe for outdoor work.\n- Parse sensor rows\n- Compute the heat index\n- List the unsafe hours",
    ar: "تريد فاطمة أن تعرف أي الساعات غير آمنة للعمل في الخارج.\n- حلّل صفوف الحساس\n- احسب مؤشر الحرارة\n- اذكر الساعات غير الآمنة",
  },
  fileName: "heat.py",
  testFn: {
    test_parse_row: "parse_row",
    test_heat_index: "heat_index",
    test_unsafe_hours_rule: "unsafe_hours",
  },
  functions: [
    { name: "parse_row", signature: "parse_row(row: str) -> dict | None", summary: { en: "Read one sensor row.", ar: "اقرأ صف حساس واحد." } },
    { name: "heat_index", signature: "heat_index(temp_c: float, humidity: float) -> float", summary: { en: "Feels-like temperature.", ar: "درجة الحرارة المحسوسة." } },
    { name: "unsafe_hours", signature: "unsafe_hours(rows: list) -> list[int]", summary: { en: "Hours when work must stop.", ar: "الساعات التي يجب إيقاف العمل فيها." } },
  ],
  hidden: {
    rule: {
      en: "Work must stop in any hour when the heat index reaches 41 or more, even if the air temperature alone looks fine.",
      ar: "يجب إيقاف العمل في أي ساعة يبلغ فيها مؤشر الحرارة 41 أو أكثر، حتى لو بدت درجة حرارة الهواء وحدها مقبولة.",
    },
    revealKeywords: ["unsafe", "stop work", "too hot", "متى نوقف"],
    // "midday break" is also in the public heat problem text (content/regions.ts), like the real ticket.
    revealMarkers: ["41 or more", "41 أو أكثر", "index of 41", "midday break"],
  },
  hints: {
    parse_row: [
      { level: 1, text: { en: "What are the columns?", ar: "ما الأعمدة؟" } },
      { level: 2, text: { en: "Which values need converting?", ar: "أي القيم تحتاج إلى تحويل؟" } },
      { level: 3, text: { en: "Split, convert hour to int and the readings to float.", ar: "قسّم، وحوّل الساعة إلى عدد صحيح والقراءات إلى أعداد عشرية." } },
    ],
    heat_index: [
      { level: 1, text: { en: "Humidity makes heat feel worse. How?", ar: "الرطوبة تجعل الحر أسوأ. كيف؟" } },
      { level: 2, text: { en: "The formula is in the ticket's link.", ar: "المعادلة في رابط المهمة." } },
      { level: 3, text: { en: "Plug the two values into the formula, step by step.", ar: "عوّض القيمتين في المعادلة خطوة بخطوة." } },
    ],
    unsafe_hours: [
      { level: 1, text: { en: "Unsafe by whose rule? Ask Fatima.", ar: "غير آمنة وفق قاعدة من؟ اسأل فاطمة." } },
      { level: 2, text: { en: "Compute the heat index for every hour first.", ar: "احسب مؤشر الحرارة لكل ساعة أولاً." } },
      { level: 3, text: { en: "Keep the hours that break Fatima's rule.", ar: "احتفظ بالساعات التي تخالف قاعدة فاطمة." } },
    ],
  },
  conceptTags: [
    { en: "formulas", ar: "المعادلات" },
    { en: "filtering", ar: "التصفية" },
  ],
};

export const FIXTURE_TICKETS: Record<ArchetypeId, Ticket> = { water: WATER, floods: FLOODS, heat: HEAT };

export function getFixtureTicket(id: ArchetypeId): Ticket {
  return FIXTURE_TICKETS[id];
}

/** One real area per archetype from content/regions.ts. */
export const AREA_FOR: Record<ArchetypeId, string> = { water: "liwa", floods: "hatta", heat: "ruwais" };

export const SAMPLE_CODE = `def parse_reading(line):
    """Turn one meter line into a dict."""
    parts = line.strip().split(",")
    if len(parts) != 3:
        return None
    return {"well": parts[0], "litres": float(parts[2])}

def daily_total(readings, well_id):
    total = 0
    for r in readings:
        if r.get("well") == well_id:
            total += r["litres"]
    return total

def flag_wells(totals, averages):
    # TODO
    print(totals)
    return []
`;

export function baseRequest(overrides: Partial<AgentRequest> = {}): AgentRequest {
  return { agent: "mentor", mode: "chat", lang: "en", areaId: "liwa", history: [], ...overrides };
}
