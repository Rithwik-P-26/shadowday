"""gauges.py reference solution for WDW-17. Never shipped to the app."""

ROADS = [
    {"road": "Wadi Ham Road", "gauge": "G-HAM"},
    {"road": "Wadi Wurayah Road", "gauge": "G-WUR"},
    {"road": "Wadi Saham Road", "gauge": "G-SAH"},
]


def parse_reading(line: str) -> dict | None:
    line = line.strip()
    if line == "" or line.startswith("time"):
        return None
    time, gauge, mm = line.split(",")
    mm = mm.strip()
    if mm == "" or mm == "ERR":
        return None
    return {"hour": time[:13], "gauge": gauge.strip(), "mm": float(mm)}


def hourly_totals(readings: list) -> dict:
    hourly = {}
    for reading in readings:
        if reading is None:
            continue
        gauge = reading["gauge"]
        if gauge not in hourly:
            hourly[gauge] = {}
        hours = hourly[gauge]
        hours[reading["hour"]] = hours.get(reading["hour"], 0.0) + reading["mm"]
    return hourly


def roads_to_close(hourly: dict, roads: list) -> list:
    # Khalid: close if any hour has 20 mm or more, OR if the hourly rain
    # rose three hours in a row (a < b < c), even when it stays under 20 mm.
    closed = []
    for road in roads:
        hours = hourly.get(road["gauge"], {})
        values = [hours[h] for h in sorted(hours)]
        close = any(v >= 20 for v in values)
        for i in range(len(values) - 2):
            if values[i] < values[i + 1] < values[i + 2]:
                close = True
        if close:
            closed.append(road["road"])
    return sorted(closed)
