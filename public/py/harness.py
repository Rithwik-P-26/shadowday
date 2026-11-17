"""Shadowday test harness.

Runs a student's code against a ticket's tests (run_tests) or against the ticket's
real dataset (run_demo). Pure standard library, so it works the same in CPython 3.12+
and in Pyodide. Both entry points return a JSON string and never raise.
"""

import json
import sys
import traceback

STUDENT_FILE = "solution.py"
TESTS_FILE = "tests.py"
DEMO_FILE = "demo.py"
STDOUT_CAP = 4000
MESSAGE_CAP = 1500
DEMO_STDOUT_CAP = 2_000_000


class _Capture:
    """A stand-in for sys.stdout that keeps at most `cap` characters."""

    def __init__(self, cap):
        self.cap = cap
        self.parts = []
        self.size = 0
        self.truncated = False

    def write(self, text):
        if not isinstance(text, str):
            text = str(text)
        room = self.cap - self.size
        if room <= 0:
            if text:
                self.truncated = True
            return len(text)
        if len(text) > room:
            self.truncated = True
            text = text[:room]
        self.parts.append(text)
        self.size += len(text)
        return len(text)

    def flush(self):
        pass

    def isatty(self):
        return False

    def getvalue(self):
        out = "".join(self.parts)
        if self.truncated:
            note = "\n... (output cut off at %d characters)" % self.cap
            out = out[: max(0, self.cap - len(note))] + note
        return out


def _safe_str(value):
    try:
        return str(value)
    except BaseException:  # a broken __str__ must not crash the harness
        return "<unprintable %s>" % type(value).__name__


def _clip(text, cap=MESSAGE_CAP):
    return text if len(text) <= cap else text[: cap - 3] + "..."


def _student_line(tb):
    """Line number of the deepest traceback frame inside the student's file, or None."""
    line = None
    for frame, lineno in traceback.walk_tb(tb):
        if frame.f_code.co_filename == STUDENT_FILE:
            line = lineno
    return line


def _error_dict(exc, filename=STUDENT_FILE):
    info = {"type": type(exc).__name__, "message": _safe_str(exc)}
    if isinstance(exc, SyntaxError):
        info["message"] = _safe_str(exc.msg or exc)
        if exc.filename == filename and exc.lineno:
            info["line"] = exc.lineno
    else:
        line = _student_line(exc.__traceback__)
        if line is not None:
            info["line"] = line
    return info


def _is_fatal(exc):
    # KeyboardInterrupt is how Pyodide interrupts a run; let it through.
    return isinstance(exc, KeyboardInterrupt)


def _load_student(student_src):
    """Exec the student's code in a fresh namespace. Returns (namespace, error_dict)."""
    namespace = {"__name__": "solution", "__file__": STUDENT_FILE}
    try:
        code = compile(student_src, STUDENT_FILE, "exec")
        exec(code, namespace)
    except BaseException as exc:
        if _is_fatal(exc):
            raise
        return None, _error_dict(exc)
    return namespace, None


def _exception_message(exc, fn):
    """'<Type>: <msg>' plus a plain-words note on where it happened."""
    name = type(exc).__name__
    text = _safe_str(exc)
    head = "%s: %s" % (name, text) if text else name
    line = _student_line(exc.__traceback__)
    target = fn or "your function"
    if line is not None:
        return head + " (your function %s raised this on line %d of your code)" % (target, line)
    if isinstance(exc, NameError) and fn and repr(fn) in text:
        return head + ". Your code has no function called %s. Did you rename or delete it?" % fn
    return head + " (this happened while checking what %s gave back)" % target


def _test_functions(test_ns):
    """Top-level test_* functions defined in the tests file, in definition order."""
    found = []
    for name, value in list(test_ns.items()):
        code = getattr(value, "__code__", None)
        if name.startswith("test_") and callable(value) and code is not None and code.co_filename == TESTS_FILE:
            found.append((code.co_firstlineno, name, value))
    found.sort(key=lambda item: item[0])
    return [(name, value) for _, name, value in found]


def run_tests(student_src: str, tests_src: str) -> str:
    """Run every test_* function in tests_src against student_src. Returns TestRun JSON."""
    capture = _Capture(STDOUT_CAP)
    saved_stdout = sys.stdout
    report = {"ok": True, "stdout": "", "results": []}
    try:
        sys.stdout = capture
        namespace, error = _load_student(student_src)
        if error is not None:
            report["ok"] = False
            report["error"] = error
            return _finish(report, capture)

        test_ns = dict(namespace)
        test_ns["__name__"] = "tests"
        test_ns["__file__"] = TESTS_FILE
        try:
            exec(compile(tests_src, TESTS_FILE, "exec"), test_ns)
        except BaseException as exc:
            if _is_fatal(exc):
                raise
            info = _error_dict(exc)  # "line" only ever points into the student file
            info["message"] = "The tests could not start: %s" % info["message"]
            report["ok"] = False
            report["error"] = info
            return _finish(report, capture)

        test_fn = test_ns.get("TEST_FN")
        if not isinstance(test_fn, dict):
            test_fn = {}

        for name, func in _test_functions(test_ns):
            fn = _safe_str(test_fn.get(name, ""))
            try:
                func()
            except AssertionError as exc:
                message = _clip(_safe_str(exc) or "A check in %s failed." % name)
                report["results"].append({"name": name, "fn": fn, "passed": False, "message": message})
            except BaseException as exc:
                if _is_fatal(exc):
                    raise
                report["results"].append(
                    {"name": name, "fn": fn, "passed": False, "message": _clip(_exception_message(exc, fn))}
                )
            else:
                report["results"].append({"name": name, "fn": fn, "passed": True, "message": ""})
        return _finish(report, capture)
    except BaseException as exc:
        if _is_fatal(exc):
            raise
        report["ok"] = False
        report["error"] = {"type": "HarnessError", "message": _safe_str(exc)}
        return _finish(report, capture)
    finally:
        sys.stdout = saved_stdout


def _finish(report, capture):
    report["stdout"] = capture.getvalue()
    return json.dumps(report)


def _demo_error(type_name, message):
    return json.dumps({"error": {"type": type_name, "message": message}})


def _find_result_line(output):
    for line in reversed(output.splitlines()):
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            value = json.loads(line)
        except ValueError:
            continue
        if isinstance(value, dict) and "series" in value:
            return line
    return None


def run_demo(student_src: str, demo_src: str, csv_text: str) -> str:
    """Run the ticket's demo on the real data with the student's code. Returns DemoResult JSON."""
    capture = _Capture(DEMO_STDOUT_CAP)
    saved_stdout = sys.stdout
    try:
        sys.stdout = capture
        namespace, error = _load_student(student_src)
        if error is not None:
            message = error["message"]
            if "line" in error:
                message += " (line %d of your code)" % error["line"]
            return _demo_error(error["type"], message)
        namespace["DATA_CSV"] = csv_text
        try:
            exec(compile(demo_src, DEMO_FILE, "exec"), namespace)
        except BaseException as exc:
            if _is_fatal(exc):
                raise
            message = _safe_str(exc) or type(exc).__name__
            line = _student_line(exc.__traceback__)
            if line is not None:
                message += " (line %d of your code)" % line
            return _demo_error(type(exc).__name__, message)
        line = _find_result_line(capture.getvalue())
        if line is None:
            return _demo_error("DemoError", "The demo finished without printing a result.")
        return line
    except BaseException as exc:
        if _is_fatal(exc):
            raise
        return _demo_error(type(exc).__name__, _safe_str(exc))
    finally:
        sys.stdout = saved_stdout
