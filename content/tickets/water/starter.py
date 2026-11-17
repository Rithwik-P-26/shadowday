"""pumps.py: the daily pumping report for Saeed's date farm (Falaj Labs, ticket FLJ-42).

Every line of well_readings.csv is one flow-meter reading, like this:

    2026-07-03 06:00,W1,1250.0

It means well W1 pumped 1250.0 liters in the six hours up to 06:00 on 3 July.
The farm has two wells, W1 and W2, and each one sends a reading every six hours.
Sometimes a meter glitches and sends ERR instead of a number.

Run the tests in tests.py to check your work.
"""


def parse_reading(line: str) -> dict | None:
    """Turn one line of well_readings.csv into a dictionary.

    Remove the spaces and the newline from both ends of the line first.
    Give back None for lines you can't use:
      - the header line "timestamp,well,liters"
      - a blank line
      - a glitched reading, where liters is "ERR" or empty

    The date is the part of the timestamp before the space.
    liters must be a number (a float), not text.

    Examples:
        parse_reading("2026-07-03 06:00,W1,1250")
            gives {"date": "2026-07-03", "well": "W1", "liters": 1250.0}
        parse_reading("2026-07-04 12:00,W2,ERR")
            gives None
    """
    # TODO: strip the line, skip the lines you can't use, then split it on commas.
    return None


def daily_totals(readings: list) -> dict:
    """Add up how many liters the farm pumped each day, across both wells.

    readings is a list of dictionaries from parse_reading. Some items may be
    None (the lines that were skipped), so ignore those.

    Example:
        daily_totals([
            {"date": "2026-07-03", "well": "W1", "liters": 1200.0},
            {"date": "2026-07-03", "well": "W2", "liters": 800.0},
            None,
            {"date": "2026-07-04", "well": "W1", "liters": 950.0},
        ])
            gives {"2026-07-03": 2000.0, "2026-07-04": 950.0}
    """
    # TODO: build a dictionary that maps each date to its total liters.
    return None


def flag_overpumping(totals: dict) -> list:
    """Find the days when Saeed's farm was over-pumping.

    totals is the dictionary from daily_totals, like {"2026-07-03": 9800.0, ...}.
    Give back a list of the over-pumping dates, sorted from earliest to latest.
    If no day is over-pumping, give back an empty list.

    What counts as over-pumping? Saeed knows. Ask him before you write this one.

    Example (made-up numbers):
        flag_overpumping({"2026-07-01": 9800.0, ..., "2026-07-09": 13100.0})
            might give ["2026-07-09"]
    """
    # TODO: ask Saeed what over-pumping means, then flag those days.
    return None
