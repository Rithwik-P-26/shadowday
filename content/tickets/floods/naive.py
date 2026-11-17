"""gauges.py written WITHOUT asking Khalid. First two functions are right; the third guesses. Never shipped."""

ROADS = [
    {"road": "Wadi Ham Road", "gauge": "G-HAM"},
    {"road": "Wadi Wurayah Road", "gauge": "G-WUR"},
    {"road": "Wadi Saham Road", "gauge": "G-SAH"},
]


def parse_reading(line: str) -> dict | None:
    line = line.strip()
    if not line or line.startswith("time"):
        return None
    parts = line.split(",")
    if parts[2] == "ERR":
        return None
    return {"hour": parts[0].split(":")[0], "gauge": parts[1], "mm": float(parts[2])}


def hourly_totals(readings: list) -> dict:
    hourly = {}
    for r in readings:
        if r is None:
            continue
        hourly.setdefault(r["gauge"], {})
        hourly[r["gauge"]][r["hour"]] = hourly[r["gauge"]].get(r["hour"], 0) + r["mm"]
    return hourly


def roads_to_close(hourly: dict, roads: list) -> list:
    # Guess: close a road when any hour goes over 20 mm.
    closed = []
    for road in roads:
        hours = hourly.get(road["gauge"], {})
        if any(mm > 20 for mm in hours.values()):
            closed.append(road["road"])
    return sorted(closed)
