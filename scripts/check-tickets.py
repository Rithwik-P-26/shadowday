"""Check every Shadowday ticket against the test harness.

Run from the project root:

    python3 -I scripts/check-tickets.py

For each ticket in content/tickets/<id>/ it checks:
  (a) solution.py passes every test
  (b) starter.py runs and fails at least one test per function (or errors gracefully)
  (c) naive.py fails only tests of the hidden-rule function, and at least one of them
  (d) the demo with solution.py prints a valid DemoResult with flagged and unflagged points
  (e) the demo with starter.py gives an error JSON or a valid result, without crashing
  (f) testFn mirrors TEST_FN in tests.py, every function has hints at levels 1, 2 and 3
  (g) no hint contains code ("def ", "return ", " = ", or an indented line)
  (h) no bilingual (L10n) field is empty in either language
  (i) data and content shape: CSV size and glitches, test counts, keywords, markers, story
Plus a few self-tests of public/py/harness.py. Exits non-zero if anything fails.
"""

import importlib.util
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TICKETS_DIR = ROOT / "content" / "tickets"
HARNESS_PATH = ROOT / "public" / "py" / "harness.py"
TICKET_IDS = ["water", "floods", "heat"]
KEYS = {"water": "FLJ-42", "floods": "WDW-17", "heat": "BRD-08"}
REQUIRED_FILES = ["ticket.json", "starter.py", "tests.py", "solution.py", "naive.py", "data.csv", "demo.py"]
CHECKS = [
    ("a", "solution passes all tests"),
    ("b", "starter fails gracefully"),
    ("c", "naive fails only the hidden rule"),
    ("d", "solution demo is valid"),
    ("e", "starter demo doesn't crash"),
    ("f", "testFn and hint ladders"),
    ("g", "hints contain no code"),
    ("h", "no empty L10n fields"),
    ("i", "data and content shape"),
]


class CheckFailed(Exception):
    pass


def need(condition, message):
    if not condition:
        raise CheckFailed(message)


def load_harness():
    sys.dont_write_bytecode = True  # never leave a __pycache__ inside public/
    spec = importlib.util.spec_from_file_location("shadowday_harness", HARNESS_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def read(ticket_dir, name):
    return (ticket_dir / name).read_text(encoding="utf-8")


def run_tests(harness, student_src, tests_src):
    raw = harness.run_tests(student_src, tests_src)
    need(isinstance(raw, str), "run_tests must return a JSON string, got %r" % type(raw).__name__)
    report = json.loads(raw)
    need(isinstance(report.get("ok"), bool), "TestRun.ok must be a bool")
    need(isinstance(report.get("stdout"), str), "TestRun.stdout must be a string")
    need(isinstance(report.get("results"), list), "TestRun.results must be a list")
    for result in report["results"]:
        need(set(result) == {"name", "fn", "passed", "message"}, "bad TestResult keys: %r" % sorted(result))
        need(isinstance(result["passed"], bool), "TestResult.passed must be a bool")
    if not report["ok"]:
        error = report.get("error")
        need(isinstance(error, dict) and isinstance(error.get("type"), str) and isinstance(error.get("message"), str),
             "TestRun with ok:false needs error {type, message}")
    return report


def validate_demo(raw):
    """Parse a DemoResult JSON string; raise CheckFailed if the shape is wrong."""
    need(isinstance(raw, str), "run_demo must return a JSON string")
    need("\n" not in raw.strip(), "the demo result must be a single line")
    value = json.loads(raw)
    need(isinstance(value, dict), "DemoResult must be an object")
    need("error" not in value, "demo returned an error: %r" % value.get("error"))
    need(set(value) == {"title", "unit", "series", "summary"}, "bad DemoResult keys: %r" % sorted(value))
    need(isinstance(value["title"], str) and value["title"].strip(), "DemoResult.title must be a non-empty string")
    need(isinstance(value["unit"], str) and value["unit"].strip(), "DemoResult.unit must be a non-empty string")
    need(isinstance(value["series"], list) and value["series"], "DemoResult.series must be a non-empty list")
    for point in value["series"]:
        need(isinstance(point, dict) and set(point) == {"label", "value", "flagged"}, "bad DemoPoint: %r" % point)
        need(isinstance(point["label"], str) and point["label"], "DemoPoint.label must be a non-empty string")
        number = point["value"]
        need(isinstance(number, (int, float)) and not isinstance(number, bool) and math.isfinite(number),
             "DemoPoint.value must be a finite number, got %r" % number)
        need(isinstance(point["flagged"], bool), "DemoPoint.flagged must be a bool")
    summary = value["summary"]
    need(isinstance(summary, dict) and set(summary) == {"en", "ar"}, "DemoResult.summary must be {en, ar}")
    need(isinstance(summary["en"], str) and summary["en"].strip(), "summary.en is empty")
    need(isinstance(summary["ar"], str) and summary["ar"].strip(), "summary.ar is empty")
    return value


def test_fn_from_tests(tests_src):
    namespace = {}
    exec(compile(tests_src, "tests.py", "exec"), namespace)
    table = namespace.get("TEST_FN")
    need(isinstance(table, dict), "tests.py must define a dict TEST_FN")
    defined = [name for name, value in namespace.items() if name.startswith("test_") and callable(value)]
    return table, defined


def walk_l10n(value, path="ticket"):
    """Yield (path, dict) for every {en, ar} object inside value."""
    if isinstance(value, dict):
        if set(value) == {"en", "ar"}:
            yield path, value
            return
        for key, child in value.items():
            yield from walk_l10n(child, "%s.%s" % (path, key))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from walk_l10n(child, "%s[%d]" % (path, index))


# ---------- the checks ----------

def check_a(ctx):
    report = run_tests(ctx["harness"], ctx["solution"], ctx["tests"])
    need(report["ok"], "solution.py did not run: %r" % report.get("error"))
    need(report["results"], "no tests ran")
    failed = [r["name"] + ": " + r["message"] for r in report["results"] if not r["passed"]]
    need(not failed, "solution.py fails: " + " | ".join(failed))
    return "%d/%d tests pass" % (len(report["results"]), len(report["results"]))


def check_b(ctx):
    report = run_tests(ctx["harness"], ctx["starter"], ctx["tests"])
    if not report["ok"]:
        return "graceful error: %s" % report["error"]["type"]
    for fn in ctx["fn_names"]:
        mine = [r for r in report["results"] if r["fn"] == fn]
        need(mine, "no tests ran for %s" % fn)
        need(any(not r["passed"] for r in mine), "starter already passes every test of %s" % fn)
    failing = sum(1 for r in report["results"] if not r["passed"])
    return "%d/%d tests fail" % (failing, len(report["results"]))


def check_c(ctx):
    hidden = ctx["meta"]["hiddenFn"]
    report = run_tests(ctx["harness"], ctx["naive"], ctx["tests"])
    need(report["ok"], "naive.py did not run: %r" % report.get("error"))
    wrong = [r["name"] for r in report["results"] if not r["passed"] and r["fn"] != hidden]
    need(not wrong, "naive.py fails tests outside %s: %s" % (hidden, ", ".join(wrong)))
    hidden_fails = [r for r in report["results"] if not r["passed"] and r["fn"] == hidden]
    need(hidden_fails, "naive.py passes every test of %s, so the hidden rule is never needed" % hidden)
    stakeholder = ctx["stakeholder"]
    for r in hidden_fails:
        need(stakeholder in r["message"], "failing message doesn't point to %s: %r" % (stakeholder, r["message"]))
    total = sum(1 for r in report["results"] if r["fn"] == hidden)
    return "fails %d/%d %s tests" % (len(hidden_fails), total, hidden)


def check_d(ctx):
    demo = validate_demo(ctx["harness"].run_demo(ctx["solution"], ctx["demo"], ctx["csv"]))
    flagged = sum(1 for p in demo["series"] if p["flagged"])
    need(flagged >= 1, "no flagged points")
    need(flagged < len(demo["series"]), "every point is flagged")
    ctx["solution_demo"] = demo
    return "%d of %d flagged" % (flagged, len(demo["series"]))


def check_e(ctx):
    raw = ctx["harness"].run_demo(ctx["starter"], ctx["demo"], ctx["csv"])
    need(isinstance(raw, str), "run_demo must return a JSON string")
    value = json.loads(raw)
    if isinstance(value, dict) and "error" in value:
        error = value["error"]
        need(isinstance(error, dict) and isinstance(error.get("type"), str) and isinstance(error.get("message"), str),
             "error JSON must be {error: {type, message}}")
        need(set(value) == {"error"}, "error JSON must only have the error key")
        return "error: %s" % error["type"]
    validate_demo(raw)
    return "valid result"


def check_f(ctx):
    meta = ctx["meta"]
    table, defined = test_fn_from_tests(ctx["tests"])
    need(meta["testFn"] == table, "ticket.json testFn doesn't match TEST_FN in tests.py")
    for name in meta["testFn"]:
        need(name in defined, "testFn names %s, but tests.py has no such function" % name)
    for name in defined:
        need(name in meta["testFn"], "tests.py defines %s, but it is missing from testFn" % name)
    for fn in set(meta["testFn"].values()):
        need(fn in ctx["fn_names"], "testFn points at %s, which is not in functions" % fn)
    for fn in ctx["fn_names"]:
        hints = meta["hints"].get(fn)
        need(isinstance(hints, list) and len(hints) == 3, "%s needs exactly 3 hints" % fn)
        need([h["level"] for h in hints] == [1, 2, 3], "%s hints must be levels 1, 2, 3 in order" % fn)
    need(set(meta["hints"]) == set(ctx["fn_names"]), "hints keys must match the functions")
    return "%d tests, %d hint ladders" % (len(table), len(meta["hints"]))


def check_g(ctx):
    bad_bits = ["def ", "return ", " = ", "\n    "]
    meta = ctx["meta"]
    count = 0
    for fn, hints in meta["hints"].items():
        for hint in hints:
            for lang in ("en", "ar"):
                text = hint["text"][lang]
                count += 1
                for bit in bad_bits:
                    need(bit not in text, "%s L%d (%s) contains %r" % (fn, hint["level"], lang, bit))
                need("```" not in text, "%s L%d (%s) contains a code block" % (fn, hint["level"], lang))
    # The hidden-rule ladder never states the rule, and at least one level says to ask the stakeholder.
    hidden = meta["hiddenFn"]
    asks = False
    for hint in meta["hints"][hidden]:
        for lang in ("en", "ar"):
            text = hint["text"][lang]
            for marker in meta["hidden"]["revealMarkers"]:
                need(marker not in text, "%s L%d (%s) gives away the rule with %r" % (hidden, hint["level"], lang, marker))
        en = hint["text"]["en"]
        if "Ask " + ctx["stakeholder"] in en:
            asks = True
    need(asks, "no %s hint tells the student to ask %s" % (hidden, ctx["stakeholder"]))
    return "%d hint texts clean" % count


def check_h(ctx):
    count = 0
    for path, value in walk_l10n(ctx["meta"]):
        count += 1
        for lang in ("en", "ar"):
            need(isinstance(value[lang], str) and value[lang].strip(), "%s.%s is empty" % (path, lang))
    meta = ctx["meta"]
    expected = 4 + len(meta["functions"]) + sum(len(h) for h in meta["hints"].values())
    need(count == expected, "expected %d L10n fields (title, body, dataNote, rule, summaries, hints), found %d"
         % (expected, count))
    return "%d fields filled" % count


def check_i(ctx):
    meta = ctx["meta"]
    tid = ctx["id"]
    need(meta["key"] == KEYS[tid], "key should be %s" % KEYS[tid])
    for field in ("fileName", "dataFileName"):
        need(isinstance(meta.get(field), str) and meta[field], "%s is missing" % field)
    # Data: header, at most 250 rows, 2-3 ERR glitches.
    lines = ctx["csv"].strip("\n").split("\n")
    need(len(lines) - 1 <= 250, "data.csv has %d rows (max 250)" % (len(lines) - 1))
    need("ERR" not in lines[0] and not lines[0][0].isdigit(), "data.csv must start with a header line")
    glitches = sum(1 for line in lines if "ERR" in line.split(","))
    need(2 <= glitches <= 3, "data.csv has %d ERR rows (want 2-3)" % glitches)
    need(not any(line.startswith("#") for line in lines), "data.csv must not contain comments")
    # Tests: 3-5 per function.
    for fn in ctx["fn_names"]:
        n = sum(1 for v in meta["testFn"].values() if v == fn)
        need(3 <= n <= 5, "%s has %d tests (want 3-5)" % (fn, n))
    # Text shape.
    body_lines = meta["body"]["en"].split("\n")
    need(4 <= len(body_lines) <= 8, "body.en has %d lines (want 4-8)" % len(body_lines))
    need("tests.py" in meta["body"]["en"] and "tests.py" in meta["body"]["ar"], "body must mention tests.py")
    need(ctx["stakeholder"] in meta["body"]["en"], "body must mention %s" % ctx["stakeholder"])
    keywords = meta["hidden"]["revealKeywords"]
    need(len(keywords) >= 12, "only %d revealKeywords (want 12+)" % len(keywords))
    need(all(k == k.lower() for k in keywords), "revealKeywords must be lower-case")
    need(any(any("؀" <= ch <= "ۿ" for ch in k) for k in keywords), "revealKeywords need Arabic entries")
    markers = meta["hidden"]["revealMarkers"]
    need(len(markers) >= 6, "too few revealMarkers")
    need(any(any("؀" <= ch <= "ۿ" for ch in m) for m in markers), "revealMarkers need Arabic entries")
    rule = meta["hidden"]["rule"]
    need(any(m in rule["en"] for m in markers), "hidden.rule.en contains no revealMarker")
    need(any(m in rule["ar"] for m in markers), "hidden.rule.ar contains no revealMarker")
    public_text = [meta["body"]["en"], meta["body"]["ar"], ctx["starter"]]
    for marker in markers:
        for text in public_text:
            need(marker not in text, "revealMarker %r already appears in the body or starter" % marker)
    need(3 <= len(meta["conceptTags"]) <= 5, "conceptTags must have 3-5 entries")
    need(isinstance(meta.get("dataNote"), dict), "dataNote is missing")
    # The starter ships no reference code and no third-party imports.
    for line in ctx["starter"].splitlines():
        stripped = line.strip()
        if stripped.startswith(("import ", "from ")):
            module = stripped.split()[1].split(".")[0]
            need(module in sys.stdlib_module_names, "starter imports non-stdlib module %s" % module)
    # Story checks on the real data.
    story = STORIES[tid](ctx)
    return story


def story_water(ctx):
    demo = ctx.get("solution_demo") or validate_demo(ctx["harness"].run_demo(ctx["solution"], ctx["demo"], ctx["csv"]))
    flagged = [p["label"] for p in demo["series"] if p["flagged"]]
    need(3 <= len(flagged) <= 4, "water should flag 3-4 days, flagged %r" % flagged)
    need(len(demo["series"]) == 21, "water demo should have 21 days")
    naive = validate_demo(ctx["harness"].run_demo(ctx["naive"], ctx["demo"], ctx["csv"]))
    need([p["flagged"] for p in naive["series"]] != [p["flagged"] for p in demo["series"]],
         "the naive demo looks the same as the solution demo")
    return "flags " + ", ".join(flagged)


def story_floods(ctx):
    demo = ctx.get("solution_demo") or validate_demo(ctx["harness"].run_demo(ctx["solution"], ctx["demo"], ctx["csv"]))
    by_label = {p["label"]: p for p in demo["series"]}
    need(len(by_label) == 3, "floods demo should have 3 roads")
    by_threshold = [p for p in demo["series"] if p["flagged"] and p["value"] >= 20]
    by_rising = [p for p in demo["series"] if p["flagged"] and p["value"] < 20]
    still_open = [p for p in demo["series"] if not p["flagged"]]
    need(len(by_threshold) == 1, "exactly one road should close by the 20 mm threshold")
    need(len(by_rising) == 1, "exactly one road should close by the rising rule while under 20 mm")
    need(len(still_open) == 1, "exactly one road should stay open")
    # The threshold road must not also be rising, so each road shows one reason.
    namespace = {}
    exec(compile(ctx["solution"], "solution.py", "exec"), namespace)
    readings = [namespace["parse_reading"](line) for line in ctx["csv"].splitlines()]
    hourly = namespace["hourly_totals"](readings)
    gauges = {road["road"]: road["gauge"] for road in namespace["ROADS"]}
    values = [hourly[gauges[by_threshold[0]["label"]]][h] for h in sorted(hourly[gauges[by_threshold[0]["label"]]])]
    need(not any(values[i] < values[i + 1] < values[i + 2] for i in range(len(values) - 2)),
         "the threshold road also has a rising run")
    for gauge, hours in hourly.items():
        ordered = [hours[h] for h in sorted(hours)]
        gaps = [abs(b - a) for a, b in zip(ordered, ordered[1:]) if a != b]
        need(min(gaps) >= 0.1, "%s has hours too close together for float sums" % gauge)
    naive = validate_demo(ctx["harness"].run_demo(ctx["naive"], ctx["demo"], ctx["csv"]))
    need([p["flagged"] for p in naive["series"]] != [p["flagged"] for p in demo["series"]],
         "the naive demo looks the same as the solution demo")
    return "%s by 20 mm, %s by rising rain, %s open" % (
        by_threshold[0]["label"], by_rising[0]["label"], still_open[0]["label"])


def story_heat(ctx):
    demo = ctx.get("solution_demo") or validate_demo(ctx["harness"].run_demo(ctx["solution"], ctx["demo"], ctx["csv"]))
    namespace = {}
    exec(compile(ctx["solution"], "solution.py", "exec"), namespace)
    readings = [r for r in (namespace["parse_reading"](line) for line in ctx["csv"].splitlines()) if r]
    dates = sorted({r["date"] for r in readings})
    need(dates == ["2026-06-10", "2026-07-14", "2026-07-15"], "unexpected dates %r" % dates)
    feels = namespace["feels_like"]
    for r in readings:
        # Keep every reading clear of the 46 line and of rounding edges, so a different
        # math library (Pyodide vs CPython) can never flip a result.
        exact = r["temp"] + 0.33 * (r["humidity"] / 100 * 6.105 * math.exp(17.27 * r["temp"] / (237.7 + r["temp"]))) - 4.0
        need(abs(exact - 46.0) >= 0.2, "feels-like %.2f too close to 46 at %s %s" % (exact, r["date"], r["time"]))
        need(abs((exact * 10) % 1 - 0.5) > 1e-6, "feels-like %r sits on a rounding edge" % exact)
        if r["date"] == "2026-06-10" and "12:30" <= r["time"] < "15:00":
            need(feels(r["temp"], r["humidity"]) < 46.0, "June 10 midday must be safe by feels-like alone")
    times = namespace["unsafe_times"](readings)
    need(times["2026-06-10"] == [], "June 10 should have no unsafe times")
    july14 = [r for r in readings if r["date"] == "2026-07-14"]
    break_only = [r["time"] for r in july14 if "12:30" <= r["time"] < "15:00" and feels(r["temp"], r["humidity"]) < 46.0]
    heat_only = [r["time"] for r in july14 if not ("12:30" <= r["time"] < "15:00") and feels(r["temp"], r["humidity"]) >= 46.0]
    need(break_only, "July 14 needs midday readings that are unsafe only because of the break")
    need(heat_only, "July 14 needs readings outside the break that are unsafe by heat")
    need(len(demo["series"]) == len(july14), "heat demo should chart every July 14 reading")
    naive = validate_demo(ctx["harness"].run_demo(ctx["naive"], ctx["demo"], ctx["csv"]))
    need([p["flagged"] for p in naive["series"]] != [p["flagged"] for p in demo["series"]],
         "the naive demo looks the same as the solution demo")
    return "Jul 14: %d break-only, %d heat-only unsafe" % (len(break_only), len(heat_only))


STORIES = {"water": story_water, "floods": story_floods, "heat": story_heat}


# ---------- harness self-tests ----------

def harness_self_tests(harness):
    results = []

    def case(name, fn):
        try:
            fn()
            results.append((name, True, ""))
        except Exception as exc:  # report every failure, keep going
            results.append((name, False, "%s: %s" % (type(exc).__name__, exc)))

    tests_src = (
        "TEST_FN = {'test_one': 'add', 'test_two': 'add', 'test_three': 'add'}\n"
        "def test_one():\n    assert add(1, 2) == 3, 'one plus two'\n"
        "def test_two():\n    print('from tests')\n    assert add(2, 2) == 5, 'expected 5'\n"
        "def test_three():\n    add(None, 1)\n"
    )

    def syntax_error():
        report = json.loads(harness.run_tests("x = 1\ndef add(a, b)\n    return a + b\n", tests_src))
        need(report["ok"] is False and report["results"] == [], "should be ok:false with no results")
        need(report["error"]["type"] == "SyntaxError" and report["error"].get("line") == 2, report["error"])

    def runtime_error():
        report = json.loads(harness.run_tests("x = 1\ny = [][3]\n", tests_src))
        need(report["ok"] is False and report["error"]["type"] == "IndexError", report)
        need(report["error"].get("line") == 2, "line should be 2, got %r" % report["error"].get("line"))

    def results_and_stdout():
        report = json.loads(harness.run_tests("print('hello')\ndef add(a, b):\n    return a + b\n", tests_src))
        need(report["ok"] is True, report)
        names = [r["name"] for r in report["results"]]
        need(names == ["test_one", "test_two", "test_three"], "definition order: %r" % names)
        passed = [r["passed"] for r in report["results"]]
        need(passed == [True, False, False], passed)
        need(report["results"][1]["message"] == "expected 5", report["results"][1])
        need(report["results"][2]["message"].startswith("TypeError: "), report["results"][2])
        need("add" in report["results"][2]["message"], report["results"][2])
        need(all(r["fn"] == "add" for r in report["results"]), "fn should come from TEST_FN")
        need("hello" in report["stdout"] and "from tests" in report["stdout"], report["stdout"])

    def stdout_capped_and_restored():
        before = sys.stdout
        report = json.loads(harness.run_tests("for i in range(3000):\n    print('xxxxxxxxxx')\ndef add(a, b):\n    return a + b\n", tests_src))
        need(sys.stdout is before, "sys.stdout was not restored")
        need(len(report["stdout"]) <= 4000, "stdout not capped: %d chars" % len(report["stdout"]))
        need("cut off" in report["stdout"], "capped stdout should say it was cut off")
        json.loads(harness.run_tests("import sys\nsys.exit(3)\n", tests_src))
        need(sys.stdout is before, "sys.stdout was not restored after sys.exit")

    def student_test_functions_ignored():
        src = "def add(a, b):\n    return a + b\ndef test_sneaky():\n    pass\n"
        report = json.loads(harness.run_tests(src, tests_src))
        need([r["name"] for r in report["results"]] == ["test_one", "test_two", "test_three"], report["results"])

    def demo_errors():
        out = json.loads(harness.run_demo("def f(:\n", "print('{}')", "a,b\n"))
        need(out["error"]["type"] == "SyntaxError", out)
        out = json.loads(harness.run_demo("def f():\n    return 1 / 0\n", "f()", "a,b\n"))
        need(out["error"]["type"] == "ZeroDivisionError", out)
        out = json.loads(harness.run_demo("x = 1\n", "y = 2", ""))
        need(out["error"]["type"] == "DemoError", out)

    def demo_result_line():
        demo = (
            "import json\nprint('noise')\n"
            "print(json.dumps({'title': 't', 'unit': 'u', 'series': [{'label': DATA_CSV.strip(), 'value': 1, 'flagged': True}],"
            " 'summary': {'en': 'e', 'ar': 'a'}}))\n"
        )
        out = json.loads(harness.run_demo("print('student noise')\n", demo, "abc\n"))
        need(out["series"][0]["label"] == "abc", out)

    case("syntax error -> ok:false with line", syntax_error)
    case("top-level runtime error -> line", runtime_error)
    case("results, order, messages, stdout", results_and_stdout)
    case("stdout capped and restored", stdout_capped_and_restored)
    case("student test_* functions ignored", student_test_functions_ignored)
    case("demo errors are JSON", demo_errors)
    case("demo result line found", demo_result_line)
    return results


# ---------- main ----------

def main():
    try:
        harness = load_harness()
    except Exception as exc:
        print("FAIL: could not import %s: %s: %s" % (HARNESS_PATH, type(exc).__name__, exc))
        return 1

    all_ok = True
    print("Harness self-tests (%s)" % HARNESS_PATH.relative_to(ROOT))
    for name, ok, detail in harness_self_tests(harness):
        all_ok &= ok
        print("  %-4s %s%s" % ("PASS" if ok else "FAIL", name, "" if ok else "  ->  " + detail))
    print()

    stakeholders = {"water": "Saeed", "floods": "Khalid", "heat": "Fatima"}
    table = {}
    for tid in TICKET_IDS:
        ticket_dir = TICKETS_DIR / tid
        missing = [name for name in REQUIRED_FILES if not (ticket_dir / name).is_file()]
        if missing:
            for letter, _ in CHECKS:
                table[(tid, letter)] = (False, "missing files: " + ", ".join(missing))
            continue
        try:
            meta = json.loads(read(ticket_dir, "ticket.json"))
        except Exception as exc:
            for letter, _ in CHECKS:
                table[(tid, letter)] = (False, "ticket.json: %s" % exc)
            continue
        ctx = {
            "id": tid,
            "harness": harness,
            "meta": meta,
            "stakeholder": stakeholders[tid],
            "fn_names": [f["name"] for f in meta.get("functions", [])],
            "starter": read(ticket_dir, "starter.py"),
            "tests": read(ticket_dir, "tests.py"),
            "solution": read(ticket_dir, "solution.py"),
            "naive": read(ticket_dir, "naive.py"),
            "csv": read(ticket_dir, "data.csv"),
            "demo": read(ticket_dir, "demo.py"),
        }
        for letter, _ in CHECKS:
            check = globals()["check_" + letter]
            saved = sys.stdout
            try:
                detail = check(ctx)
                table[(tid, letter)] = (True, detail)
            except CheckFailed as exc:
                table[(tid, letter)] = (False, str(exc))
            except Exception as exc:
                table[(tid, letter)] = (False, "crashed: %s: %s" % (type(exc).__name__, exc))
            finally:
                if sys.stdout is not saved:
                    table[(tid, letter)] = (False, "sys.stdout was left replaced")
                    sys.stdout = saved

    width = 38
    print("%-*s" % (width, "Check") + "".join("%-8s" % tid for tid in TICKET_IDS))
    print("-" * (width + 8 * len(TICKET_IDS)))
    for letter, label in CHECKS:
        row = "%-*s" % (width, "(%s) %s" % (letter, label))
        for tid in TICKET_IDS:
            ok, _ = table[(tid, letter)]
            all_ok &= ok
            row += "%-8s" % ("PASS" if ok else "FAIL")
        print(row)
    print()
    print("Details")
    for tid in TICKET_IDS:
        for letter, _ in CHECKS:
            ok, detail = table[(tid, letter)]
            print("  %-4s %-7s (%s) %s" % ("ok" if ok else "FAIL", tid, letter, detail))
    print()
    print("ALL CHECKS PASSED" if all_ok else "SOME CHECKS FAILED")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
