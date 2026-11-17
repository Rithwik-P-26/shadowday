"""heat.py reference solution for BRD-08. Never shipped to the app."""

import math


def feels_like(temp_c: float, humidity: float) -> float:
    vapour = humidity / 100 * 6.105 * math.exp(17.27 * temp_c / (237.7 + temp_c))
    return round(temp_c + 0.33 * vapour - 4.0, 1)


def parse_reading(line: str) -> dict | None:
    line = line.strip()
    if line == "" or line.startswith("time"):
        return None
    parts = [part.strip() for part in line.split(",")]
    if "ERR" in parts or "" in parts:
        return None
    timestamp, site, temp, humidity = parts
    date, time = timestamp.split(" ")
    return {"date": date, "time": time, "site": site, "temp": float(temp), "humidity": float(humidity)}


def is_unsafe(reading: dict) -> bool:
    # Fatima: feels-like 46 or more is always unsafe. From June 15 to September 15
    # the midday break also applies: 12:30 up to (not including) 15:00 is unsafe.
    if feels_like(reading["temp"], reading["humidity"]) >= 46.0:
        return True
    month_day = reading["date"][5:]
    in_summer = "06-15" <= month_day <= "09-15"
    in_break = "12:30" <= reading["time"] < "15:00"
    return in_summer and in_break


def unsafe_times(readings: list) -> dict:
    result = {}
    for reading in readings:
        if reading is None:
            continue
        date = reading["date"]
        if date not in result:
            result[date] = []
        if is_unsafe(reading):
            result[date].append(reading["time"])
    for date in result:
        result[date].sort()
    return result
