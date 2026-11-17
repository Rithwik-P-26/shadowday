"""Tests for gauges.py (ticket WDW-17).

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
    "test_hourly_totals_adds_up_one_hour": "hourly_totals",
    "test_hourly_totals_keeps_gauges_and_hours_apart": "hourly_totals",
    "test_hourly_totals_skips_none": "hourly_totals",
    "test_roads_to_close_one_downpour": "roads_to_close",
    "test_roads_to_close_names_are_sorted": "roads_to_close",
    "test_roads_to_close_light_rain_stays_open": "roads_to_close",
    "test_roads_to_close_saham_at_noon": "roads_to_close",
    "test_roads_to_close_wurayah_in_the_afternoon": "roads_to_close",
}

ASK_KHALID = "Khalid decides when a road is too dangerous. Ask him."

# The same roads as ROADS in gauges.py.
TEST_ROADS = [
    {"road": "Wadi Ham Road", "gauge": "G-HAM"},
    {"road": "Wadi Wurayah Road", "gauge": "G-WUR"},
    {"road": "Wadi Saham Road", "gauge": "G-SAH"},
]


# ---------- parse_reading ----------

def test_parse_reading_basic():
    result = parse_reading("2026-04-14 13:15,G-HAM,2.4")
    expected = {"hour": "2026-04-14 13", "gauge": "G-HAM", "mm": 2.4}
    assert result == expected, (
        f"parse_reading('2026-04-14 13:15,G-HAM,2.4') should give {expected}, but your function gave {result!r}."
    )


def test_parse_reading_strips_whitespace():
    result = parse_reading("  2026-04-14 09:45,G-SAH,0.0\n")
    expected = {"hour": "2026-04-14 09", "gauge": "G-SAH", "mm": 0.0}
    assert result == expected, (
        f"A line with spaces at the start and a newline at the end should give {expected}, "
        f"but your function gave {result!r}. Try strip()."
    )


def test_parse_reading_skips_header_and_blank_lines():
    for line in ["time,gauge,mm", "time,gauge,mm\n", "", "\n", "   "]:
        result = parse_reading(line)
        assert result is None, (
            f"parse_reading({line!r}) should give None because that line has no reading in it, "
            f"but your function gave {result!r}."
        )


def test_parse_reading_skips_glitches():
    for line in ["2026-04-14 09:45,G-WUR,ERR", "2026-04-14 09:45,G-WUR,ERR\n"]:
        result = parse_reading(line)
        assert result is None, (
            f"parse_reading({line!r}) should give None because the gauge glitched, "
            f"but your function gave {result!r}."
        )


# ---------- hourly_totals ----------

def _check_hourly(result, expected):
    assert isinstance(result, dict), (
        f"hourly_totals should give back a dictionary of gauge -> hour -> mm, but it gave back {result!r}."
    )
    assert sorted(result) == sorted(expected), (
        f"Expected the gauges {sorted(expected)}, but your dictionary has {sorted(result)}."
    )
    for gauge in expected:
        hours = result[gauge]
        assert isinstance(hours, dict), (
            f"result[{gauge!r}] should be a dictionary of hour -> mm, but it is {hours!r}."
        )
        assert sorted(hours) == sorted(expected[gauge]), (
            f"Expected {gauge} to have the hours {sorted(expected[gauge])}, but it has {sorted(hours)}."
        )
        for hour in expected[gauge]:
            mm = hours[hour]
            assert isinstance(mm, (int, float)) and math.isclose(mm, expected[gauge][hour]), (
                f"Expected {gauge} to have {expected[gauge][hour]} mm in hour {hour}, but your function gave {mm!r}."
            )


def test_hourly_totals_adds_up_one_hour():
    readings = [
        {"hour": "2026-04-14 13", "gauge": "G-HAM", "mm": 2.4},
        {"hour": "2026-04-14 13", "gauge": "G-HAM", "mm": 3.1},
        {"hour": "2026-04-14 13", "gauge": "G-HAM", "mm": 0.5},
        {"hour": "2026-04-14 13", "gauge": "G-HAM", "mm": 1.0},
    ]
    _check_hourly(hourly_totals(readings), {"G-HAM": {"2026-04-14 13": 7.0}})


def test_hourly_totals_keeps_gauges_and_hours_apart():
    readings = [
        {"hour": "2026-04-14 13", "gauge": "G-HAM", "mm": 2.0},
        {"hour": "2026-04-14 13", "gauge": "G-WUR", "mm": 0.8},
        {"hour": "2026-04-14 14", "gauge": "G-HAM", "mm": 1.5},
        {"hour": "2026-04-14 13", "gauge": "G-HAM", "mm": 1.0},
    ]
    expected = {
        "G-HAM": {"2026-04-14 13": 3.0, "2026-04-14 14": 1.5},
        "G-WUR": {"2026-04-14 13": 0.8},
    }
    _check_hourly(hourly_totals(readings), expected)


def test_hourly_totals_skips_none():
    readings = [None, {"hour": "2026-04-14 09", "gauge": "G-SAH", "mm": 0.6}, None]
    _check_hourly(hourly_totals(readings), {"G-SAH": {"2026-04-14 09": 0.6}})


# ---------- roads_to_close ----------

def _check_closed(result, expected):
    assert isinstance(result, list), (
        f"roads_to_close should give back a list of road names, but it gave back {result!r}."
    )
    for road in expected:
        assert road in result, (
            f"Expected {road} to be closed, but your function kept it open. {ASK_KHALID}"
        )
    for road in result:
        assert road in expected, (
            f"Your function closed {road}, but Khalid would keep it open with this rain. {ASK_KHALID}"
        )
    assert result == expected, (
        f"You picked the right roads, but the list should have each name once, sorted alphabetically. "
        f"Expected {expected}, got {result}."
    )


def test_roads_to_close_one_downpour():
    hourly = {
        "G-HAM": {"2026-04-14 10": 2.0, "2026-04-14 11": 26.5, "2026-04-14 12": 8.0},
        "G-WUR": {"2026-04-14 10": 1.0, "2026-04-14 11": 0.5, "2026-04-14 12": 1.5},
        "G-SAH": {"2026-04-14 10": 0.0, "2026-04-14 11": 3.0, "2026-04-14 12": 1.0},
    }
    _check_closed(roads_to_close(hourly, TEST_ROADS), ["Wadi Ham Road"])


def test_roads_to_close_names_are_sorted():
    hourly = {
        "G-HAM": {"2026-04-14 10": 1.0, "2026-04-14 11": 0.0, "2026-04-14 12": 0.4},
        "G-WUR": {"2026-04-14 10": 5.0, "2026-04-14 11": 31.0, "2026-04-14 12": 12.0},
        "G-SAH": {"2026-04-14 10": 22.4, "2026-04-14 11": 9.0, "2026-04-14 12": 3.0},
    }
    _check_closed(roads_to_close(hourly, TEST_ROADS), ["Wadi Saham Road", "Wadi Wurayah Road"])


def test_roads_to_close_light_rain_stays_open():
    hourly = {
        "G-HAM": {
            "2026-04-14 08": 4.0, "2026-04-14 09": 2.5, "2026-04-14 10": 6.0,
            "2026-04-14 11": 3.5, "2026-04-14 12": 7.5, "2026-04-14 13": 1.0,
        },
        "G-WUR": {
            "2026-04-14 08": 0.0, "2026-04-14 09": 0.0, "2026-04-14 10": 1.2,
            "2026-04-14 11": 0.6, "2026-04-14 12": 0.6, "2026-04-14 13": 0.3,
        },
        "G-SAH": {
            "2026-04-14 08": 12.0, "2026-04-14 09": 9.5, "2026-04-14 10": 15.0,
            "2026-04-14 11": 6.0, "2026-04-14 12": 19.5, "2026-04-14 13": 2.0,
        },
    }
    _check_closed(roads_to_close(hourly, TEST_ROADS), [])


def test_roads_to_close_saham_at_noon():
    hourly = {
        "G-HAM": {"2026-04-14 11": 3.0, "2026-04-14 12": 1.0, "2026-04-14 13": 2.0},
        "G-WUR": {"2026-04-14 11": 0.5, "2026-04-14 12": 0.0, "2026-04-14 13": 0.0},
        "G-SAH": {"2026-04-14 11": 6.0, "2026-04-14 12": 20.0, "2026-04-14 13": 4.5},
    }
    _check_closed(roads_to_close(hourly, TEST_ROADS), ["Wadi Saham Road"])


def test_roads_to_close_wurayah_in_the_afternoon():
    hourly = {
        "G-HAM": {
            "2026-04-14 13": 1.0, "2026-04-14 14": 0.2, "2026-04-14 15": 0.8,
            "2026-04-14 16": 0.0, "2026-04-14 17": 0.0,
        },
        "G-WUR": {
            "2026-04-14 13": 2.0, "2026-04-14 14": 0.5, "2026-04-14 15": 1.5,
            "2026-04-14 16": 4.0, "2026-04-14 17": 3.0,
        },
        "G-SAH": {
            "2026-04-14 13": 0.4, "2026-04-14 14": 0.6, "2026-04-14 15": 0.6,
            "2026-04-14 16": 0.1, "2026-04-14 17": 0.0,
        },
    }
    _check_closed(roads_to_close(hourly, TEST_ROADS), ["Wadi Wurayah Road"])
