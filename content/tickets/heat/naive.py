"""heat.py written WITHOUT asking Fatima. Parsing and grouping are right; is_unsafe guesses. Never shipped."""

import math


def feels_like(temp_c: float, humidity: float) -> float:
    vapour = humidity / 100 * 6.105 * math.exp(17.27 * temp_c / (237.7 + temp_c))
    return round(temp_c + 0.33 * vapour - 4.0, 1)


def parse_reading(line: str) -> dict | None:
    line = line.strip()
    if not line or line.startswith("time"):
        return None
    timestamp, site, temp, humidity = line.split(",")
    if temp in ("", "ERR") or humidity in ("", "ERR"):
        return None
    return {
        "date": timestamp[:10],
        "time": timestamp[11:],
        "site": site,
        "temp": float(temp),
        "humidity": float(humidity),
    }


def is_unsafe(reading: dict) -> bool:
    # Guess: only the feels-like temperature matters.
    return feels_like(reading["temp"], reading["humidity"]) >= 46.0


def unsafe_times(readings: list) -> dict:
    result = {}
    for reading in readings:
        if reading is None:
            continue
        result.setdefault(reading["date"], [])
        if is_unsafe(reading):
            result[reading["date"]].append(reading["time"])
    return {date: sorted(times) for date, times in result.items()}
