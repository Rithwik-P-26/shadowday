import { describe, expect, it } from "vitest";
import { detectReveal, REVEAL_MARKER, stripMarker, violatesNoCode } from "@/lib/agents/guardrails";
import { FLOODS, HEAT, WATER } from "./fixtures";

describe("violatesNoCode", () => {
  it("flags fenced code blocks", () => {
    expect(violatesNoCode("Try this:\n```python\nx = 1\n```", WATER)).toBe(true);
    expect(violatesNoCode("```", WATER)).toBe(true);
  });

  it("flags a definition of a ticket function, even inline", () => {
    expect(violatesNoCode("Start with def flag_wells(totals, averages): and go from there.", WATER)).toBe(true);
    expect(violatesNoCode("def   parse_reading(line):", WATER)).toBe(true);
  });

  it("flags two or more lines that look like Python", () => {
    expect(violatesNoCode("Something like:\nfor r in readings:", WATER)).toBe(false);
    expect(violatesNoCode("Something like:\nfor r in readings:\n    total += r", WATER)).toBe(true);
    expect(violatesNoCode("Like this:\nfor r in readings:\nreturn total", WATER)).toBe(true);
    expect(violatesNoCode("if total > avg:\n    flagged.append(w)\nreturn flagged", WATER)).toBe(true);
    expect(violatesNoCode("import csv\nfrom math import sqrt", WATER)).toBe(true);
    expect(violatesNoCode("Look:\n    total = 0\n    count = len(rows)", WATER)).toBe(true);
    expect(violatesNoCode("def helper(x):\n    return x * 2", WATER)).toBe(true);
  });

  it("flags code in inline backticks, numbered or bulleted lists, and one-liners", () => {
    const backticks = "`for r in readings:`\n`    totals[r['date']] = totals.get(r['date'], 0) + r['liters']`\n`return totals`";
    const numbered = "1. totals = {}\n2. for r in readings: totals[r['date']] = totals.get(r['date'], 0) + r['liters']\n3. return totals";
    const bulleted = "- date, time = parts[0].split()\n- return {'date': date, 'time': time}";
    const comprehension = "You could do it in one go: `[d for d in dates if totals[d] > avg * 1.2]`";
    for (const text of [backticks, numbered, bulleted, comprehension]) expect(violatesNoCode(text, WATER), text).toBe(true);

    expect(violatesNoCode("Then, at the end, `return dates[i]`.", WATER)).toBe(true);
    expect(violatesNoCode("Try `total += r['liters']` inside the loop.", WATER)).toBe(true);
    expect(violatesNoCode("Something like for r in readings: totals[r['date']] += r['liters']", WATER)).toBe(true);
    expect(violatesNoCode("Think about it this way: for each date in the list, add its liters to a running total.", WATER)).toBe(false);
    expect(violatesNoCode("Some readings glitch (for example in July), so skip those (for instance in the test data).", WATER)).toBe(false);
    expect(violatesNoCode("for r in readings: totals[r['date']] += r['liters']", WATER)).toBe(true);
    expect(violatesNoCode("flagged = [d for d in dates if totals[d] > limit]", WATER)).toBe(true);
    expect(violatesNoCode("Use sorted(totals, key=lambda d: totals[d]) here.", WATER)).toBe(true);
    expect(violatesNoCode("* if not line: return None\n* parts = line.split(',')", WATER)).toBe(true);
    expect(violatesNoCode("Step one:\n    `totals.get(r['date'], 0) + r['liters']`\n    `sum(previous) / len(previous) * 1.2`", WATER)).toBe(true);
  });

  it("still allows identifiers, method names and short expressions in backticks", () => {
    expect(violatesNoCode("Have you tried `split()` on the line? `dict.get` could help, and `sorted` keeps the order.", WATER)).toBe(false);
    expect(violatesNoCode("What does `dict.get(date, 0)` give you the first time you see a date?", WATER)).toBe(false);
    expect(violatesNoCode("Check whether `parts[2] == 'ERR'`, and compare with `>=`. Do you have a `return` at the end?", WATER)).toBe(false);
    expect(violatesNoCode("1. Strip the line.\n2. If it is empty or it is the header, give back None.\n3. Split it on commas.", WATER)).toBe(false);
    expect(violatesNoCode("- Use `line.strip().split(',')` to get the parts.\n- Then `float()` the liters.", WATER)).toBe(false);
  });

  it("allows prose with inline identifiers", () => {
    expect(violatesNoCode("Have you tried split() on the line? dict.get could help with missing keys, and sorted keeps the order.", WATER)).toBe(false);
    expect(violatesNoCode("What does parse_reading return when the line is empty?", WATER)).toBe(false);
    expect(violatesNoCode("If the reading is missing: what should happen?\nReturn to the test output and read it again.", WATER)).toBe(false);
  });

  it("allows a numbered review list", () => {
    const review = [
      "Nice use of dict.get to handle missing keys.",
      "1. The name x doesn't say what it holds.",
      "2. What happens with an empty line?",
      "3. Remove the leftover print() calls.",
      "Changes requested: 2 of 4 tests pass.",
    ].join("\n");
    expect(violatesNoCode(review, WATER)).toBe(false);
  });

  it("allows Arabic prose", () => {
    expect(violatesNoCode("جرّب استخدام split() ثم فكّر: ماذا تُرجع parse_reading لسطر فارغ؟", WATER)).toBe(false);
  });

  it("checks function names per ticket", () => {
    expect(violatesNoCode("def roads_to_close(gauges):", FLOODS)).toBe(true);
    expect(violatesNoCode("def roads_to_close(gauges):", HEAT)).toBe(false);
  });
});

describe("stripMarker", () => {
  it("removes the marker wherever it is", () => {
    expect(stripMarker(`Over 20% is too much. ${REVEAL_MARKER}`)).toBe("Over 20% is too much.");
    expect(stripMarker(`${REVEAL_MARKER} Over 20%`)).toBe("Over 20%");
    expect(stripMarker("a [[ revealed ]] b [[REVEALED]]")).toBe("a b");
  });

  it("leaves text without a marker alone", () => {
    expect(stripMarker("Ask me about the farm.")).toBe("Ask me about the farm.");
  });
});

describe("detectReveal", () => {
  it("detects the marker", () => {
    expect(detectReveal(`Here is the rule. ${REVEAL_MARKER}`, WATER)).toBe(true);
  });

  it("detects any reveal-marker substring, case-insensitively", () => {
    expect(detectReveal("More than 20% above its own average.", WATER)).toBe(true);
    expect(detectReveal("More than 20 PERCENT above normal.", WATER)).toBe(true);
    expect(detectReveal("If the gauge shows 15 mm in an hour, close it.", FLOODS)).toBe(true);
  });

  it("detects markers written with Arabic-Indic digits", () => {
    expect(detectReveal("إذا زاد بأكثر من ٢٠٪ عن متوسطه", WATER)).toBe(true);
  });

  it("ignores markers the student could already read in public text, but never the explicit marker", () => {
    const pub = "The UAE requires a midday break for outdoor work every summer.";
    expect(detectReveal("We all respect the midday break here.", HEAT)).toBe(true);
    expect(detectReveal("We all respect the midday break here.", HEAT, pub)).toBe(false);
    expect(detectReveal("Anything at a heat index of 41 or more stops work.", HEAT, pub)).toBe(true);
    expect(detectReveal(`The midday break, and more. ${REVEAL_MARKER}`, HEAT, pub)).toBe(true);
  });

  it("doesn't count everyday phrases or the public half of the rule on their own", () => {
    const floods = { ...FLOODS, hidden: { ...FLOODS.hidden, revealMarkers: ["three hours", "3 hours", "in a row", "20 mm or more", "at least 20", "متتالية", "ثلاث ساعات"] } };
    const water = { ...WATER, hidden: { ...WATER.hidden, revealMarkers: ["20%", "7 days", "seven days", "previous 7"] } };
    const heat = { ...HEAT, hidden: { ...HEAT.hidden, revealMarkers: ["12:30", "3 pm", "3pm", "june 15"] } };
    const floodsPublic = "Heavy rain, roughly 20 mm in an hour, is the danger.";
    expect(detectReveal("My crews worked three nights in a row last April.", floods, floodsPublic)).toBe(false);
    expect(detectReveal("It takes 3 hours to drive the wadi road.", floods, floodsPublic)).toBe(false);
    expect(detectReveal("Yes, 20 mm or more in an hour and I close it.", floods, floodsPublic)).toBe(false);
    expect(detectReveal("عملت فرقي ليالي متتالية.", floods, floodsPublic)).toBe(false);
    expect(detectReveal("I am on the farm 7 days a week.", water)).toBe(false);
    expect(detectReveal("I do my rounds at 3 pm every day.", heat)).toBe(false);
    // ...but they still count together, and the specific markers count alone.
    expect(detectReveal("If the rain climbs three hours in a row, I close it.", floods, floodsPublic)).toBe(true);
    expect(detectReveal("إذا زاد المطر ثلاث ساعات متتالية أغلق الطريق.", floods, floodsPublic)).toBe(true);
    expect(detectReveal("More than 20% above the previous 7 days.", water)).toBe(true);
    expect(detectReveal("No work from 12:30 in summer.", heat)).toBe(true);
  });

  it("ignores markers the student typed in their own question", () => {
    expect(detectReveal("20% sounds like a lot. Why that number?", WATER, "", "Is it 20% above normal?")).toBe(false);
    expect(detectReveal("More than 20% above its own average.", WATER, "", "What counts as over-pumping?")).toBe(true);
    expect(detectReveal(`Yes, that's it. ${REVEAL_MARKER}`, WATER, "", "Is it 20% above normal?")).toBe(true);
  });

  it("returns false when the rule wasn't disclosed", () => {
    expect(detectReveal("I'm not a computer person. Ask me about the farm.", WATER)).toBe(false);
    expect(detectReveal("", WATER)).toBe(false);
    expect(detectReveal("If the gauge shows 15 mm in an hour, close it.", WATER)).toBe(false);
  });
});
