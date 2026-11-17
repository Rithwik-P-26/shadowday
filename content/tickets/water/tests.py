"""Tests for pumps.py (ticket FLJ-42).

Each test_ function checks one thing. A test passes when none of its asserts fail.
You don't need to change this file.
"""

import math

# Which of your functions each test checks.
TEST_FN = {
    "test_parse_reading_basic": "parse_reading",
    "test_parse_reading_strips_whitespace": "parse_reading",
    "test_parse_reading_skips_header_and_blank_lines": "parse_reading",
    "test_parse_reading_skips_glitches": "parse_reading",
    "test_daily_totals_adds_both_wells": "daily_totals",
    "test_daily_totals_several_days": "daily_totals",
    "test_daily_totals_skips_none": "daily_totals",
    "test_daily_totals_empty_list": "daily_totals",
    "test_flag_overpumping_clear_spikes": "flag_overpumping",
    "test_flag_overpumping_slow_summer_rise": "flag_overpumping",
    "test_flag_overpumping_jump_after_quiet_week": "flag_overpumping",
    "test_flag_overpumping_busy_second_day": "flag_overpumping",
}

ASK_SAEED = "Saeed knows what counts as over-pumping. Ask him."


# ---------- parse_reading ----------

def test_parse_reading_basic():
    result = parse_reading("2026-07-03 06:00,W1,1250")
    expected = {"date": "2026-07-03", "well": "W1", "liters": 1250.0}
    assert result == expected, (
        f"parse_reading('2026-07-03 06:00,W1,1250') should give {expected}, but your function gave {result!r}."
    )


def test_parse_reading_strips_whitespace():
    result = parse_reading("  2026-07-03 12:00,W2,980.5\n")
    expected = {"date": "2026-07-03", "well": "W2", "liters": 980.5}
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
    _check_real_line_parses("2026-07-03 18:00,W1,1100")
    for line in ["timestamp,well,liters", "timestamp,well,liters\n", "", "\n", "   "]:
        result = parse_reading(line)
        assert result is None, (
            f"parse_reading({line!r}) should give None because that line has no reading in it, "
            f"but your function gave {result!r}."
        )


def test_parse_reading_skips_glitches():
    _check_real_line_parses("2026-07-04 12:00,W2,940")
    for line in ["2026-07-04 12:00,W2,ERR", "2026-07-04 12:00,W2,ERR\n", "2026-07-04 12:00,W2,"]:
        result = parse_reading(line)
        assert result is None, (
            f"parse_reading({line!r}) should give None because the meter glitched, "
            f"but your function gave {result!r}."
        )


# ---------- daily_totals ----------

def _check_totals(result, expected):
    assert isinstance(result, dict), (
        f"daily_totals should give back a dictionary of date -> liters, but it gave back {result!r}."
    )
    assert sorted(result) == sorted(expected), (
        f"Expected the dates {sorted(expected)}, but your dictionary has the dates {sorted(result)}."
    )
    for date in expected:
        assert isinstance(result[date], (int, float)) and math.isclose(result[date], expected[date]), (
            f"Expected {date} to total {expected[date]} liters, but your function gave {result[date]!r}."
        )


def test_daily_totals_adds_both_wells():
    readings = [
        {"date": "2026-07-03", "well": "W1", "liters": 1200.0},
        {"date": "2026-07-03", "well": "W2", "liters": 800.0},
        {"date": "2026-07-03", "well": "W1", "liters": 500.5},
    ]
    _check_totals(daily_totals(readings), {"2026-07-03": 2500.5})


def test_daily_totals_several_days():
    readings = [
        {"date": "2026-07-04", "well": "W1", "liters": 1000.0},
        {"date": "2026-07-03", "well": "W2", "liters": 700.0},
        {"date": "2026-07-04", "well": "W2", "liters": 650.0},
        {"date": "2026-07-05", "well": "W1", "liters": 1300.0},
        {"date": "2026-07-03", "well": "W1", "liters": 900.0},
    ]
    _check_totals(daily_totals(readings), {"2026-07-03": 1600.0, "2026-07-04": 1650.0, "2026-07-05": 1300.0})


def test_daily_totals_skips_none():
    readings = [
        None,
        {"date": "2026-07-06", "well": "W1", "liters": 1100.0},
        None,
        {"date": "2026-07-06", "well": "W2", "liters": 900.0},
    ]
    _check_totals(daily_totals(readings), {"2026-07-06": 2000.0})


def test_daily_totals_empty_list():
    result = daily_totals([])
    assert result == {}, f"daily_totals([]) should give an empty dictionary {{}}, but your function gave {result!r}."


# ---------- flag_overpumping ----------

def _july(values):
    """Daily totals for 2026-07-01, 2026-07-02, ... one value per day, in order."""
    totals = {}
    for i, value in enumerate(values):
        totals[f"2026-07-{i + 1:02d}"] = value
    return totals


def _check_flags(result, expected):
    assert isinstance(result, list), (
        f"flag_overpumping should give back a list of dates, but it gave back {result!r}."
    )
    for date in expected:
        assert date in result, (
            f"Expected {date} to be flagged as over-pumping, but your function didn't flag it. {ASK_SAEED}"
        )
    for date in result:
        assert date in expected, (
            f"Your function flagged {date} as over-pumping, but that day looks normal to Saeed. {ASK_SAEED}"
        )
    assert result == expected, (
        f"You found the right days, but the list should have each date once, sorted from earliest to latest. "
        f"Expected {expected}, got {result}."
    )


def test_flag_overpumping_clear_spikes():
    # A steady week, then two days with a lot more pumping.
    totals = _july([10000.0] * 7 + [13000.0, 10000.0, 10000.0, 14000.0])
    _check_flags(flag_overpumping(totals), ["2026-07-08", "2026-07-11"])


def test_flag_overpumping_slow_summer_rise():
    # Pumping creeps up a little every day as the summer gets hotter.
    totals = _july([9000.0 + 150 * i for i in range(14)])
    _check_flags(flag_overpumping(totals), [])


def test_flag_overpumping_jump_after_quiet_week():
    totals = _july([15000.0] * 3 + [8000.0] * 7 + [10000.0])
    _check_flags(flag_overpumping(totals), ["2026-07-11"])


def test_flag_overpumping_busy_second_day():
    totals = _july([10000.0, 20000.0] + [10000.0] * 7)
    _check_flags(flag_overpumping(totals), [])
