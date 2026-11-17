# Demo for FLJ-42: runs the student's functions on well_readings.csv (DATA_CSV) and prints one JSON line.
import json


def _shadowday_demo():
    def short(value):
        text = repr(value)
        return text if len(text) <= 80 else text[:77] + "..."

    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    def label(date):
        try:
            return months[int(date[5:7]) - 1] + " " + date[8:10]
        except Exception:
            return str(date)

    readings = [parse_reading(line) for line in DATA_CSV.splitlines()]
    totals = daily_totals(readings)
    if not isinstance(totals, dict) or not totals:
        raise ValueError(
            "daily_totals gave back " + short(totals) + ", so there is nothing to chart yet. "
            "Finish parse_reading and daily_totals, then run the demo again."
        )
    flagged = flag_overpumping(totals)
    if not isinstance(flagged, list):
        raise ValueError("flag_overpumping gave back " + short(flagged) + " instead of a list of dates.")

    series = []
    for date in sorted(totals):
        series.append({"label": label(date), "value": round(float(totals[date]), 1), "flagged": date in flagged})
    days = [p["label"] for p in series if p["flagged"]]
    n = len(days)

    if n == 0:
        en = "Your code didn't flag any days of over-pumping at Saeed's farm."
        ar = "لم يرصد الكود الذي كتبته أي يوم ضخ زائد في مزرعة سعيد."
    else:
        en = "Your code flagged %d day%s of over-pumping at Saeed's farm: %s." % (n, "" if n == 1 else "s", ", ".join(days))
        if n == 1:
            count_ar = "يوماً واحداً"
        elif n == 2:
            count_ar = "يومين"
        elif n <= 10:
            count_ar = "%d أيام" % n
        else:
            count_ar = "%d يوماً" % n
        ar = "رصد الكود الذي كتبته %s من الضخ الزائد في مزرعة سعيد." % count_ar

    result = {
        "title": "Water pumped per day at Saeed's farm, July 2026",
        "unit": "liters",
        "series": series,
        "summary": {"en": en, "ar": ar},
    }
    print(json.dumps(result, ensure_ascii=False, allow_nan=False))


_shadowday_demo()
