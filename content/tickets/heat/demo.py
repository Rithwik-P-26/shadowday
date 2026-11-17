# Demo for BRD-08: runs the student's functions on site_sensors.csv (DATA_CSV) and prints one JSON line.
import json
import math


def _shadowday_demo():
    def short(value):
        text = repr(value)
        return text if len(text) <= 80 else text[:77] + "..."

    def feels(temp_c, humidity):
        vapour = humidity / 100 * 6.105 * math.exp(17.27 * temp_c / (237.7 + temp_c))
        return round(temp_c + 0.33 * vapour - 4.0, 1)

    day = "2026-07-14"
    readings = [parse_reading(line) for line in DATA_CSV.splitlines()]
    todays = [r for r in readings if isinstance(r, dict) and r.get("date") == day]
    if not todays:
        raise ValueError(
            "parse_reading didn't give back any readings for " + day + ", so there is nothing to chart yet. "
            "Finish parse_reading, then run the demo again."
        )
    times = unsafe_times(readings)
    if not isinstance(times, dict):
        raise ValueError("unsafe_times gave back " + short(times) + " instead of a dictionary of date -> times.")
    unsafe = times.get(day, [])
    if not isinstance(unsafe, list):
        raise ValueError("unsafe_times gave " + short(unsafe) + " for " + day + " instead of a list of times.")

    series = []
    for r in sorted(todays, key=lambda r: str(r.get("time"))):
        value = feels(float(r["temp"]), float(r["humidity"]))
        series.append({"label": str(r["time"]), "value": value, "flagged": r["time"] in unsafe})
    n = sum(1 for p in series if p["flagged"])
    total = len(series)

    if n == 0:
        en = "Your code marked none of the %d readings on 14 July as unsafe for outdoor work at Fatima's site." % total
        ar = "لم يصنّف الكود الذي كتبته أياً من القراءات الـ%d يوم 14 يوليو على أنها غير آمنة للعمل في الهواء الطلق في موقع فاطمة." % total
    else:
        en = "Your code marked %d of %d half-hour readings on 14 July as unsafe for outdoor work at Fatima's site." % (n, total)
        ar = "صنّف الكود الذي كتبته %d من أصل %d قراءة (كل نصف ساعة) يوم 14 يوليو على أنها غير آمنة للعمل في الهواء الطلق في موقع فاطمة." % (n, total)

    result = {
        "title": "Feels-like temperature at Fatima's site, 14 July 2026",
        "unit": "°C",
        "series": series,
        "summary": {"en": en, "ar": ar},
    }
    print(json.dumps(result, ensure_ascii=False, allow_nan=False))


_shadowday_demo()
