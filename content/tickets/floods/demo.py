# Demo for WDW-17: runs the student's functions on rain_gauges.csv (DATA_CSV) and prints one JSON line.
import json


def _shadowday_demo():
    def short(value):
        text = repr(value)
        return text if len(text) <= 80 else text[:77] + "..."

    roads = [
        {"road": "Wadi Ham Road", "gauge": "G-HAM"},
        {"road": "Wadi Wurayah Road", "gauge": "G-WUR"},
        {"road": "Wadi Saham Road", "gauge": "G-SAH"},
    ]

    readings = [parse_reading(line) for line in DATA_CSV.splitlines()]
    hourly = hourly_totals(readings)
    if not isinstance(hourly, dict) or not hourly:
        raise ValueError(
            "hourly_totals gave back " + short(hourly) + ", so there is nothing to chart yet. "
            "Finish parse_reading and hourly_totals, then run the demo again."
        )
    closed = roads_to_close(hourly, roads)
    if not isinstance(closed, list):
        raise ValueError("roads_to_close gave back " + short(closed) + " instead of a list of road names.")

    series = []
    for road in roads:
        hours = hourly.get(road["gauge"], {})
        heaviest = max([float(mm) for mm in hours.values()] or [0.0])
        series.append({"label": road["road"], "value": round(heaviest, 1), "flagged": road["road"] in closed})
    names = [p["label"] for p in series if p["flagged"]]
    n = len(names)
    total = len(series)

    if n == 0:
        en = "Your code keeps all %d wadi roads open for Khalid." % total
        ar = "بحسب الكود الذي كتبته، تبقى طرق الأودية كلها مفتوحة (%d طرق)." % total
    else:
        en = "Your code would close %d of %d wadi roads for Khalid: %s." % (n, total, ", ".join(names))
        if n == 1:
            count_ar = "طريقاً واحداً"
        elif n == 2:
            count_ar = "طريقين"
        else:
            count_ar = "%d طرق" % n
        ar = "بحسب الكود الذي كتبته، سيُغلق خالد %s من أصل %d طرق أودية." % (count_ar, total)

    result = {
        "title": "Heaviest hour of rain above each wadi road, 14 April 2026",
        "unit": "mm",
        "series": series,
        "summary": {"en": en, "ar": ar},
    }
    print(json.dumps(result, ensure_ascii=False, allow_nan=False))


_shadowday_demo()
