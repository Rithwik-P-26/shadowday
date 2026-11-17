"""heat.py: unsafe outdoor work times for Fatima's site (Barid Labs, ticket BRD-08).

Every line of site_sensors.csv is one sensor reading, like this:

    2026-07-14 13:30,S1,44.0,35

It means sensor S1 measured 44.0 °C and 35% humidity at 13:30 on 14 July.
The sensor sends a reading every 30 minutes from 06:00 to 18:00.
Sometimes it glitches and sends ERR instead of a number.

Run the tests in tests.py to check your work.
"""

import math


def feels_like(temp_c: float, humidity: float) -> float:
    """How hot it feels to a person, in °C, rounded to 1 decimal place.

    This is the Australian Bureau of Meteorology (BoM) apparent temperature
    formula, without the wind part. Humid air makes heat feel worse, because
    sweat can't cool you down. It's already written for you: don't change it.

    Example:
        feels_like(44.0, 35.0) gives 50.5
    """
    vapour = humidity / 100 * 6.105 * math.exp(17.27 * temp_c / (237.7 + temp_c))
    return round(temp_c + 0.33 * vapour - 4.0, 1)


def parse_reading(line: str) -> dict | None:
    """Turn one line of site_sensors.csv into a dictionary.

    Remove the spaces and the newline from both ends of the line first.
    Give back None for lines you can't use:
      - the header line "time,site,temp_c,humidity"
      - a blank line
      - a glitched reading, where any value is "ERR" or empty

    Split the time column into "date" and "time". temp and humidity must be
    numbers (floats), not text.

    Examples:
        parse_reading("2026-07-14 13:30,S1,44.0,35")
            gives {"date": "2026-07-14", "time": "13:30", "site": "S1", "temp": 44.0, "humidity": 35.0}
        parse_reading("2026-07-15 10:00,S1,39.7,ERR")
            gives None
    """
    # TODO: strip the line, skip the lines you can't use, then split it on commas.
    return None


def is_unsafe(reading: dict) -> bool:
    """Is it unsafe for the crew to work outdoors at the time of this reading?

    reading is one dictionary from parse_reading.
    Give back True if it is unsafe, False if it is safe.

    Fatima treats a feels-like temperature of 46 °C or more as dangerous.
    Use feels_like() for that. She has the full safety rules, so ask her
    before you write this one.

    Example:
        is_unsafe({"date": "2026-07-14", "time": "10:00", "site": "S1", "temp": 44.0, "humidity": 35.0})
            gives True (it feels like 50.5 °C)
    """
    # TODO: ask Fatima for all of her safety rules, then check them here.
    return None


def unsafe_times(readings: list) -> dict:
    """List the unsafe times for each date.

    readings is a list of dictionaries from parse_reading. Some items may be
    None (the lines that were skipped), so ignore those.
    Give back a dictionary: date -> sorted list of the "HH:MM" times that are
    unsafe. Every date in the readings gets a key, even if its list is empty.

    Example:
        unsafe_times([
            {"date": "2026-07-14", "time": "10:00", "site": "S1", "temp": 44.0, "humidity": 35.0},
            {"date": "2026-07-14", "time": "07:00", "site": "S1", "temp": 30.0, "humidity": 40.0},
            None,
            {"date": "2026-07-15", "time": "07:00", "site": "S1", "temp": 31.0, "humidity": 60.0},
        ])
            gives {"2026-07-14": ["10:00"], "2026-07-15": []}
    """
    # TODO: use is_unsafe() on each reading and group the unsafe times by date.
    return None
