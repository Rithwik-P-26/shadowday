"""pumps.py reference solution for FLJ-42. Never shipped to the app."""


def parse_reading(line: str) -> dict | None:
    line = line.strip()
    if line == "" or line.startswith("timestamp"):
        return None
    timestamp, well, liters = line.split(",")
    liters = liters.strip()
    if liters == "" or liters == "ERR":
        return None
    date = timestamp.split(" ")[0]
    return {"date": date, "well": well.strip(), "liters": float(liters)}


def daily_totals(readings: list) -> dict:
    totals = {}
    for reading in readings:
        if reading is None:
            continue
        date = reading["date"]
        totals[date] = totals.get(date, 0.0) + reading["liters"]
    return totals


def flag_overpumping(totals: dict) -> list:
    # Saeed: a day is over-pumping when it is more than 20% above the average
    # of the 7 days before it. Days without 7 earlier days are never flagged.
    dates = sorted(totals)
    flagged = []
    for i in range(7, len(dates)):
        previous = [totals[d] for d in dates[i - 7:i]]
        average = sum(previous) / 7
        if totals[dates[i]] > average * 1.2:
            flagged.append(dates[i])
    return flagged
