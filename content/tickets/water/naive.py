"""pumps.py written WITHOUT asking Saeed. First two functions are right; the third guesses. Never shipped."""


def parse_reading(line: str) -> dict | None:
    line = line.strip()
    if line == "" or line.startswith("timestamp"):
        return None
    timestamp, well, liters = line.split(",")
    if liters == "" or liters == "ERR":
        return None
    return {"date": timestamp[:10], "well": well, "liters": float(liters)}


def daily_totals(readings: list) -> dict:
    totals = {}
    for reading in readings:
        if reading is not None:
            totals[reading["date"]] = totals.get(reading["date"], 0) + reading["liters"]
    return totals


def flag_overpumping(totals: dict) -> list:
    # Guess: anything above the overall average is over-pumping.
    if not totals:
        return []
    average = sum(totals.values()) / len(totals)
    return sorted(date for date in totals if totals[date] > average)
