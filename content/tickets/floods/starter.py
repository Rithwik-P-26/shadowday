"""gauges.py: road-closure alerts for Khalid (WadiWatch, ticket WDW-17).

Every line of rain_gauges.csv is one rain-gauge reading, like this:

    2026-04-14 13:15,G-HAM,2.4

It means gauge G-HAM measured 2.4 mm of rain in the 15 minutes up to 13:15
on 14 April. Each gauge sits in the mountains above one wadi road, and sends
a reading every 15 minutes. Sometimes a gauge glitches and sends ERR.

Run the tests in tests.py to check your work.
"""

# Each wadi road and the rain gauge that watches it. Don't change this.
ROADS = [
    {"road": "Wadi Ham Road", "gauge": "G-HAM"},
    {"road": "Wadi Wurayah Road", "gauge": "G-WUR"},
    {"road": "Wadi Saham Road", "gauge": "G-SAH"},
]


def parse_reading(line: str) -> dict | None:
    """Turn one line of rain_gauges.csv into a dictionary.

    Remove the spaces and the newline from both ends of the line first.
    Give back None for lines you can't use:
      - the header line "time,gauge,mm"
      - a blank line
      - a glitched reading, where mm is "ERR"

    "hour" is the date and the hour of the time, without the minutes,
    for example "2026-04-14 13". mm must be a number (a float), not text.

    Examples:
        parse_reading("2026-04-14 13:15,G-HAM,2.4")
            gives {"hour": "2026-04-14 13", "gauge": "G-HAM", "mm": 2.4}
        parse_reading("2026-04-14 09:45,G-WUR,ERR")
            gives None
    """
    # TODO: strip the line, skip the lines you can't use, then split it on commas.
    return None


def hourly_totals(readings: list) -> dict:
    """Add up the rain at each gauge, hour by hour.

    readings is a list of dictionaries from parse_reading. Some items may be
    None (the lines that were skipped), so ignore those.
    Give back a dictionary of dictionaries: gauge -> hour -> total mm.

    Example:
        hourly_totals([
            {"hour": "2026-04-14 13", "gauge": "G-HAM", "mm": 2.4},
            {"hour": "2026-04-14 13", "gauge": "G-HAM", "mm": 1.6},
            None,
            {"hour": "2026-04-14 14", "gauge": "G-HAM", "mm": 0.5},
            {"hour": "2026-04-14 13", "gauge": "G-SAH", "mm": 0.2},
        ])
            gives {"G-HAM": {"2026-04-14 13": 4.0, "2026-04-14 14": 0.5},
                   "G-SAH": {"2026-04-14 13": 0.2}}
    """
    # TODO: build the nested dictionary of hourly totals.
    return None


def roads_to_close(hourly: dict, roads: list) -> list:
    """Decide which wadi roads Khalid should close.

    hourly is the dictionary from hourly_totals. roads is a list like ROADS.
    Give back the names of the roads to close, sorted alphabetically.
    If every road can stay open, give back an empty list.

    Heavy rain is the danger. Khalid has the exact rules for when a road
    closes, so ask him before you write this one.

    Example (made-up numbers):
        roads_to_close({"G-HAM": {"2026-04-14 12": 25.0}, ...}, ROADS)
            might give ["Wadi Ham Road"]
    """
    # TODO: ask Khalid when a road must close, then check every road.
    return None
