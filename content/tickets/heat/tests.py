"""Tests for heat.py (ticket BRD-08).

Each test_ function checks one thing. A test passes when none of its asserts fail.
You don't need to change this file.
"""

# Which of your functions each test checks.
TEST_FN = {
    "test_parse_reading_basic": "parse_reading",
    "test_parse_reading_strips_whitespace": "parse_reading",
    "test_parse_reading_skips_header_and_blank_lines": "parse_reading",
    "test_parse_reading_skips_glitches": "parse_reading",
    "test_is_unsafe_very_hot_mornings": "is_unsafe",
    "test_is_unsafe_mild_mornings": "is_unsafe",
    "test_is_unsafe_july_lunchtime": "is_unsafe",
    "test_is_unsafe_early_june_lunchtime": "is_unsafe",
    "test_is_unsafe_around_lunchtime": "is_unsafe",
    "test_unsafe_times_groups_and_sorts": "unsafe_times",
    "test_unsafe_times_keeps_safe_dates": "unsafe_times",
    "test_unsafe_times_skips_none": "unsafe_times",
}

ASK_FATIMA = "Fatima knows the site's safety rules. Ask her."


def _reading(date, time, temp, humidity):
    return {"date": date, "time": time, "site": "S1", "temp": temp, "humidity": humidity}


# ---------- parse_reading ----------

def test_parse_reading_basic():
    result = parse_reading("2026-07-14 13:30,S1,44.0,35")
    expected = {"date": "2026-07-14", "time": "13:30", "site": "S1", "temp": 44.0, "humidity": 35.0}
    assert result == expected, (
        f"parse_reading('2026-07-14 13:30,S1,44.0,35') should give {expected}, but your function gave {result!r}."
    )


def test_parse_reading_strips_whitespace():
    result = parse_reading("  2026-06-10 06:00,S1,30.5,62\n")
    expected = {"date": "2026-06-10", "time": "06:00", "site": "S1", "temp": 30.5, "humidity": 62.0}
    assert result == expected, (
        f"A line with spaces at the start and a newline at the end should give {expected}, "
        f"but your function gave {result!r}. Try strip()."
    )


def _check_real_line_parses(line):
    # A function that gives back None for every line must not pass the "skip" tests below.
    result = parse_reading(line)
    assert isinstance(result, dict), (
        f"parse_reading({line!r}) is a real reading, so it should give a dictionary, but your function gave {result!r}. "
        f"Get real readings working first, then give back None for the lines to skip."
    )


def test_parse_reading_skips_header_and_blank_lines():
    _check_real_line_parses("2026-07-14 06:00,S1,33.5,70")
    for line in ["time,site,temp_c,humidity", "time,site,temp_c,humidity\n", "", "\n", "   "]:
        result = parse_reading(line)
        assert result is None, (
            f"parse_reading({line!r}) should give None because that line has no reading in it, "
            f"but your function gave {result!r}."
        )


def test_parse_reading_skips_glitches():
    _check_real_line_parses("2026-07-15 10:00,S1,39.7,48")
    glitches = [
        "2026-07-14 06:30,S1,ERR,72",
        "2026-07-15 10:00,S1,39.7,ERR",
        "2026-07-15 10:00,S1,39.7,ERR\n",
        "2026-07-15 10:30,S1,,49",
        "2026-07-15 10:30,S1,40.5,",
    ]
    for line in glitches:
        result = parse_reading(line)
        assert result is None, (
            f"parse_reading({line!r}) should give None because the sensor glitched, "
            f"but your function gave {result!r}."
        )


# ---------- is_unsafe ----------

def _check_unsafe(reading, expected, feels):
    result = is_unsafe(reading)
    assert result is True or result is False, (
        f"is_unsafe should give back True or False, but for the {reading['time']} reading on {reading['date']} "
        f"it gave back {result!r}."
    )
    if expected:
        assert result is True, (
            f"Expected the {reading['time']} reading on {reading['date']} (feels like {feels} °C) to be unsafe, "
            f"but your function said it was safe. {ASK_FATIMA}"
        )
    else:
        assert result is False, (
            f"Expected the {reading['time']} reading on {reading['date']} (feels like {feels} °C) to be safe, "
            f"but your function said it was unsafe. {ASK_FATIMA}"
        )


def test_is_unsafe_very_hot_mornings():
    _check_unsafe(_reading("2026-07-14", "10:00", 44.0, 35.0), True, 50.5)
    _check_unsafe(_reading("2026-08-02", "09:30", 38.0, 65.0), True, 48.2)
    _check_unsafe(_reading("2026-07-14", "08:30", 38.0, 55.0), True, 46.0)


def test_is_unsafe_mild_mornings():
    _check_unsafe(_reading("2026-07-14", "07:00", 30.0, 40.0), False, 31.6)
    _check_unsafe(_reading("2026-07-15", "17:30", 36.0, 40.0), False, 39.8)


def test_is_unsafe_july_lunchtime():
    _check_unsafe(_reading("2026-07-14", "13:00", 41.0, 20.0), True, 42.1)


def test_is_unsafe_early_june_lunchtime():
    _check_unsafe(_reading("2026-06-10", "13:00", 41.0, 20.0), False, 42.1)


def test_is_unsafe_around_lunchtime():
    cases = [
        ("2026-07-14", "12:00", False),
        ("2026-07-14", "12:30", True),
        ("2026-07-14", "14:30", True),
        ("2026-07-14", "15:00", False),
        ("2026-06-14", "13:30", False),
        ("2026-06-15", "13:30", True),
        ("2026-09-15", "13:30", True),
        ("2026-09-16", "13:30", False),
    ]
    for date, time, expected in cases:
        _check_unsafe(_reading(date, time, 40.0, 20.0), expected, 40.8)


# ---------- unsafe_times ----------

def _check_times(result, expected):
    assert isinstance(result, dict), (
        f"unsafe_times should give back a dictionary of date -> list of times, but it gave back {result!r}."
    )
    assert sorted(result) == sorted(expected), (
        f"Expected the dates {sorted(expected)}, but your dictionary has {sorted(result)}. "
        f"Every date in the readings needs a key, even if it has no unsafe times."
    )
    for date in expected:
        assert result[date] == expected[date], (
            f"Expected the unsafe times on {date} to be {expected[date]}, but your function gave {result[date]!r}."
        )


def test_unsafe_times_groups_and_sorts():
    readings = [
        _reading("2026-07-14", "16:00", 42.0, 45.0),   # feels like 50.1
        _reading("2026-07-15", "10:30", 40.0, 50.0),   # feels like 48.1
        _reading("2026-07-14", "07:00", 31.0, 60.0),   # feels like 35.9
        _reading("2026-07-14", "09:00", 38.0, 65.0),   # feels like 48.2
        _reading("2026-07-15", "17:30", 36.0, 40.0),   # feels like 39.8
    ]
    expected = {"2026-07-14": ["09:00", "16:00"], "2026-07-15": ["10:30"]}
    _check_times(unsafe_times(readings), expected)


def test_unsafe_times_keeps_safe_dates():
    readings = [
        _reading("2026-06-10", "13:00", 41.0, 18.0),   # feels like 41.6
        _reading("2026-06-10", "09:00", 36.0, 40.0),   # feels like 39.8
        _reading("2026-07-14", "10:00", 44.0, 35.0),   # feels like 50.5
    ]
    expected = {"2026-06-10": [], "2026-07-14": ["10:00"]}
    _check_times(unsafe_times(readings), expected)


def test_unsafe_times_skips_none():
    readings = [None, _reading("2026-07-15", "09:00", 38.0, 65.0), None]
    _check_times(unsafe_times(readings), {"2026-07-15": ["09:00"]})
