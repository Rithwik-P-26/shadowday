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
    expect(violatesNoCode("Something like:\nfor r in readings:\n    total += r", WATER)).toBe(false);
    expect(violatesNoCode("Like this:\nfor r in readings:\nreturn total", WATER)).toBe(true);
    expect(violatesNoCode("if total > avg:\n    flagged.append(w)\nreturn flagged", WATER)).toBe(true);
    expect(violatesNoCode("import csv\nfrom math import sqrt", WATER)).toBe(true);
    expect(violatesNoCode("Look:\n    total = 0\n    count = len(rows)", WATER)).toBe(true);
    expect(violatesNoCode("def helper(x):\n    return x * 2", WATER)).toBe(true);
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

  it("returns false when the rule wasn't disclosed", () => {
    expect(detectReveal("I'm not a computer person. Ask me about the farm.", WATER)).toBe(false);
    expect(detectReveal("", WATER)).toBe(false);
    expect(detectReveal("If the gauge shows 15 mm in an hour, close it.", WATER)).toBe(false);
  });
});
