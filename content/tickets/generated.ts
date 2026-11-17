// generated, do not edit.
// Written by scripts/build-tickets.mjs from content/tickets/<id>/ (run `npm run tickets` after editing those files).
// solution.py and naive.py are never included.
import type { ArchetypeId, L10n, Ticket } from "@/lib/types";

export const TICKETS: Record<ArchetypeId, Ticket> = {
  water: {
    "id": "water",
    "key": "FLJ-42",
    "title": {
      "en": "Daily pumping report for Saeed's farm",
      "ar": "تقرير الضخ اليومي لمزرعة سعيد"
    },
    "body": {
      "en": "Morning! Here's your first ticket.\nSaeed's flow meters send us a reading from each of his two wells every 6 hours (it's all in well_readings.csv). He wants a simple daily report:\n- parse_reading: turn one line of the CSV into a dict\n- daily_totals: add up the liters pumped each day, across both wells\n- flag_overpumping: flag the days when the farm is over-pumping. Saeed can tell you what that means\nHeads up: the meters glitch sometimes and send ERR. The tests are in tests.py, so run them as you go. Shout if you get stuck!",
      "ar": "صباح الخير! هذه أول مهمة لك.\nترسل لنا عدادات سعيد قراءة من كل بئر من بئريه كل 6 ساعات (كلها في ملف well_readings.csv)، وهو يريد تقريراً يومياً بسيطاً:\n- parse_reading: حوّل سطراً واحداً من ملف CSV إلى قاموس (dict)\n- daily_totals: اجمع اللترات التي ضُخّت في كل يوم من البئرين معاً\n- flag_overpumping: حدّد الأيام التي يحدث فيها ضخ زائد في المزرعة. سعيد يستطيع أن يشرح لك ما المقصود بذلك\nانتبه: العدادات تتعطل أحياناً وترسل ERR. الاختبارات موجودة في tests.py، فشغّلها كلما تقدمت. وإذا علقت في شيء فأخبرني!"
    },
    "fileName": "pumps.py",
    "starter": "\"\"\"pumps.py: the daily pumping report for Saeed's date farm (Falaj Labs, ticket FLJ-42).\n\nEvery line of well_readings.csv is one flow-meter reading, like this:\n\n    2026-07-03 06:00,W1,1250.0\n\nIt means well W1 pumped 1250.0 liters in the six hours up to 06:00 on 3 July.\nThe farm has two wells, W1 and W2, and each one sends a reading every six hours.\nSometimes a meter glitches and sends ERR instead of a number.\n\nRun the tests in tests.py to check your work.\n\"\"\"\n\n\ndef parse_reading(line: str) -> dict | None:\n    \"\"\"Turn one line of well_readings.csv into a dictionary.\n\n    Remove the spaces and the newline from both ends of the line first.\n    Give back None for lines you can't use:\n      - the header line \"timestamp,well,liters\"\n      - a blank line\n      - a glitched reading, where liters is \"ERR\" or empty\n\n    The date is the part of the timestamp before the space.\n    liters must be a number (a float), not text.\n\n    Examples:\n        parse_reading(\"2026-07-03 06:00,W1,1250\")\n            gives {\"date\": \"2026-07-03\", \"well\": \"W1\", \"liters\": 1250.0}\n        parse_reading(\"2026-07-04 12:00,W2,ERR\")\n            gives None\n    \"\"\"\n    # TODO: strip the line, skip the lines you can't use, then split it on commas.\n    return None\n\n\ndef daily_totals(readings: list) -> dict:\n    \"\"\"Add up how many liters the farm pumped each day, across both wells.\n\n    readings is a list of dictionaries from parse_reading. Some items may be\n    None (the lines that were skipped), so ignore those.\n\n    Example:\n        daily_totals([\n            {\"date\": \"2026-07-03\", \"well\": \"W1\", \"liters\": 1200.0},\n            {\"date\": \"2026-07-03\", \"well\": \"W2\", \"liters\": 800.0},\n            None,\n            {\"date\": \"2026-07-04\", \"well\": \"W1\", \"liters\": 950.0},\n        ])\n            gives {\"2026-07-03\": 2000.0, \"2026-07-04\": 950.0}\n    \"\"\"\n    # TODO: build a dictionary that maps each date to its total liters.\n    return None\n\n\ndef flag_overpumping(totals: dict) -> list:\n    \"\"\"Find the days when Saeed's farm was over-pumping.\n\n    totals is the dictionary from daily_totals, like {\"2026-07-03\": 9800.0, ...}.\n    Give back a list of the over-pumping dates, sorted from earliest to latest.\n    If no day is over-pumping, give back an empty list.\n\n    What counts as over-pumping? Saeed knows. Ask him before you write this one.\n\n    Example (made-up numbers):\n        flag_overpumping({\"2026-07-01\": 9800.0, ..., \"2026-07-09\": 13100.0})\n            might give [\"2026-07-09\"]\n    \"\"\"\n    # TODO: ask Saeed what over-pumping means, then flag those days.\n    return None\n",
    "tests": "\"\"\"Tests for pumps.py (ticket FLJ-42).\n\nEach test_ function checks one thing. A test passes when none of its asserts fail.\nYou don't need to change this file.\n\"\"\"\n\nimport math\n\n# Which of your functions each test checks.\nTEST_FN = {\n    \"test_parse_reading_basic\": \"parse_reading\",\n    \"test_parse_reading_strips_whitespace\": \"parse_reading\",\n    \"test_parse_reading_skips_header_and_blank_lines\": \"parse_reading\",\n    \"test_parse_reading_skips_glitches\": \"parse_reading\",\n    \"test_daily_totals_adds_both_wells\": \"daily_totals\",\n    \"test_daily_totals_several_days\": \"daily_totals\",\n    \"test_daily_totals_skips_none\": \"daily_totals\",\n    \"test_daily_totals_empty_list\": \"daily_totals\",\n    \"test_flag_overpumping_clear_spikes\": \"flag_overpumping\",\n    \"test_flag_overpumping_slow_summer_rise\": \"flag_overpumping\",\n    \"test_flag_overpumping_jump_after_quiet_week\": \"flag_overpumping\",\n    \"test_flag_overpumping_busy_second_day\": \"flag_overpumping\",\n}\n\nASK_SAEED = \"Saeed knows what counts as over-pumping. Ask him.\"\n\n\n# ---------- parse_reading ----------\n\ndef test_parse_reading_basic():\n    result = parse_reading(\"2026-07-03 06:00,W1,1250\")\n    expected = {\"date\": \"2026-07-03\", \"well\": \"W1\", \"liters\": 1250.0}\n    assert result == expected, (\n        f\"parse_reading('2026-07-03 06:00,W1,1250') should give {expected}, but your function gave {result!r}.\"\n    )\n\n\ndef test_parse_reading_strips_whitespace():\n    result = parse_reading(\"  2026-07-03 12:00,W2,980.5\\n\")\n    expected = {\"date\": \"2026-07-03\", \"well\": \"W2\", \"liters\": 980.5}\n    assert result == expected, (\n        f\"A line with spaces at the start and a newline at the end should give {expected}, \"\n        f\"but your function gave {result!r}. Try strip().\"\n    )\n\n\ndef _check_real_line_parses(line):\n    # A function that gives back None for every line must not pass the \"skip\" tests below.\n    result = parse_reading(line)\n    assert isinstance(result, dict), (\n        f\"parse_reading({line!r}) is a real reading, so it should give a dictionary, but your function gave {result!r}. \"\n        f\"Get real readings working first, then give back None for the lines to skip.\"\n    )\n\n\ndef test_parse_reading_skips_header_and_blank_lines():\n    _check_real_line_parses(\"2026-07-03 18:00,W1,1100\")\n    for line in [\"timestamp,well,liters\", \"timestamp,well,liters\\n\", \"\", \"\\n\", \"   \"]:\n        result = parse_reading(line)\n        assert result is None, (\n            f\"parse_reading({line!r}) should give None because that line has no reading in it, \"\n            f\"but your function gave {result!r}.\"\n        )\n\n\ndef test_parse_reading_skips_glitches():\n    _check_real_line_parses(\"2026-07-04 12:00,W2,940\")\n    for line in [\"2026-07-04 12:00,W2,ERR\", \"2026-07-04 12:00,W2,ERR\\n\", \"2026-07-04 12:00,W2,\"]:\n        result = parse_reading(line)\n        assert result is None, (\n            f\"parse_reading({line!r}) should give None because the meter glitched, \"\n            f\"but your function gave {result!r}.\"\n        )\n\n\n# ---------- daily_totals ----------\n\ndef _check_totals(result, expected):\n    assert isinstance(result, dict), (\n        f\"daily_totals should give back a dictionary of date -> liters, but it gave back {result!r}.\"\n    )\n    assert sorted(result) == sorted(expected), (\n        f\"Expected the dates {sorted(expected)}, but your dictionary has the dates {sorted(result)}.\"\n    )\n    for date in expected:\n        assert isinstance(result[date], (int, float)) and math.isclose(result[date], expected[date]), (\n            f\"Expected {date} to total {expected[date]} liters, but your function gave {result[date]!r}.\"\n        )\n\n\ndef test_daily_totals_adds_both_wells():\n    readings = [\n        {\"date\": \"2026-07-03\", \"well\": \"W1\", \"liters\": 1200.0},\n        {\"date\": \"2026-07-03\", \"well\": \"W2\", \"liters\": 800.0},\n        {\"date\": \"2026-07-03\", \"well\": \"W1\", \"liters\": 500.5},\n    ]\n    _check_totals(daily_totals(readings), {\"2026-07-03\": 2500.5})\n\n\ndef test_daily_totals_several_days():\n    readings = [\n        {\"date\": \"2026-07-04\", \"well\": \"W1\", \"liters\": 1000.0},\n        {\"date\": \"2026-07-03\", \"well\": \"W2\", \"liters\": 700.0},\n        {\"date\": \"2026-07-04\", \"well\": \"W2\", \"liters\": 650.0},\n        {\"date\": \"2026-07-05\", \"well\": \"W1\", \"liters\": 1300.0},\n        {\"date\": \"2026-07-03\", \"well\": \"W1\", \"liters\": 900.0},\n    ]\n    _check_totals(daily_totals(readings), {\"2026-07-03\": 1600.0, \"2026-07-04\": 1650.0, \"2026-07-05\": 1300.0})\n\n\ndef test_daily_totals_skips_none():\n    readings = [\n        None,\n        {\"date\": \"2026-07-06\", \"well\": \"W1\", \"liters\": 1100.0},\n        None,\n        {\"date\": \"2026-07-06\", \"well\": \"W2\", \"liters\": 900.0},\n    ]\n    _check_totals(daily_totals(readings), {\"2026-07-06\": 2000.0})\n\n\ndef test_daily_totals_empty_list():\n    result = daily_totals([])\n    assert result == {}, f\"daily_totals([]) should give an empty dictionary {{}}, but your function gave {result!r}.\"\n\n\n# ---------- flag_overpumping ----------\n\ndef _july(values):\n    \"\"\"Daily totals for 2026-07-01, 2026-07-02, ... one value per day, in order.\"\"\"\n    totals = {}\n    for i, value in enumerate(values):\n        totals[f\"2026-07-{i + 1:02d}\"] = value\n    return totals\n\n\ndef _check_flags(result, expected):\n    assert isinstance(result, list), (\n        f\"flag_overpumping should give back a list of dates, but it gave back {result!r}.\"\n    )\n    for date in expected:\n        assert date in result, (\n            f\"Expected {date} to be flagged as over-pumping, but your function didn't flag it. {ASK_SAEED}\"\n        )\n    for date in result:\n        assert date in expected, (\n            f\"Your function flagged {date} as over-pumping, but that day looks normal to Saeed. {ASK_SAEED}\"\n        )\n    assert result == expected, (\n        f\"You found the right days, but the list should have each date once, sorted from earliest to latest. \"\n        f\"Expected {expected}, got {result}.\"\n    )\n\n\ndef test_flag_overpumping_clear_spikes():\n    # A steady week, then two days with a lot more pumping.\n    totals = _july([10000.0] * 7 + [13000.0, 10000.0, 10000.0, 14000.0])\n    _check_flags(flag_overpumping(totals), [\"2026-07-08\", \"2026-07-11\"])\n\n\ndef test_flag_overpumping_slow_summer_rise():\n    # Pumping creeps up a little every day as the summer gets hotter.\n    totals = _july([9000.0 + 150 * i for i in range(14)])\n    _check_flags(flag_overpumping(totals), [])\n\n\ndef test_flag_overpumping_jump_after_quiet_week():\n    totals = _july([15000.0] * 3 + [8000.0] * 7 + [10000.0])\n    _check_flags(flag_overpumping(totals), [\"2026-07-11\"])\n\n\ndef test_flag_overpumping_busy_second_day():\n    totals = _july([10000.0, 20000.0] + [10000.0] * 7)\n    _check_flags(flag_overpumping(totals), [])\n",
    "testFn": {
      "test_parse_reading_basic": "parse_reading",
      "test_parse_reading_strips_whitespace": "parse_reading",
      "test_parse_reading_skips_header_and_blank_lines": "parse_reading",
      "test_parse_reading_skips_glitches": "parse_reading",
      "test_daily_totals_adds_both_wells": "daily_totals",
      "test_daily_totals_several_days": "daily_totals",
      "test_daily_totals_skips_none": "daily_totals",
      "test_daily_totals_empty_list": "daily_totals",
      "test_flag_overpumping_clear_spikes": "flag_overpumping",
      "test_flag_overpumping_slow_summer_rise": "flag_overpumping",
      "test_flag_overpumping_jump_after_quiet_week": "flag_overpumping",
      "test_flag_overpumping_busy_second_day": "flag_overpumping"
    },
    "data": {
      "fileName": "well_readings.csv",
      "csv": "timestamp,well,liters\n2026-07-01 00:00,W1,1505.0\n2026-07-01 00:00,W2,1136.0\n2026-07-01 06:00,W1,1588.0\n2026-07-01 06:00,W2,1234.1\n2026-07-01 12:00,W1,656.7\n2026-07-01 12:00,W2,497.8\n2026-07-01 18:00,W1,1220.9\n2026-07-01 18:00,W2,980.6\n2026-07-02 00:00,W1,1553.2\n2026-07-02 00:00,W2,1172.4\n2026-07-02 06:00,W1,1638.8\n2026-07-02 06:00,W2,1273.6\n2026-07-02 12:00,W1,677.7\n2026-07-02 12:00,W2,513.8\n2026-07-02 18:00,W1,1260.0\n2026-07-02 18:00,W2,1012.0\n2026-07-03 00:00,W1,1902.4\n2026-07-03 00:00,W2,1436.0\n2026-07-03 06:00,W1,2007.3\n2026-07-03 06:00,W2,1559.9\n2026-07-03 12:00,W1,830.0\n2026-07-03 12:00,W2,629.3\n2026-07-03 18:00,W1,1543.3\n2026-07-03 18:00,W2,1239.5\n2026-07-04 00:00,W1,1572.4\n2026-07-04 00:00,W2,1186.9\n2026-07-04 06:00,W1,1659.1\n2026-07-04 06:00,W2,1289.3\n2026-07-04 12:00,W1,686.1\n2026-07-04 12:00,W2,ERR\n2026-07-04 18:00,W1,1275.6\n2026-07-04 18:00,W2,1024.5\n2026-07-05 00:00,W1,1532.3\n2026-07-05 00:00,W2,1156.7\n2026-07-05 06:00,W1,1616.8\n2026-07-05 06:00,W2,1256.5\n2026-07-05 12:00,W1,668.6\n2026-07-05 12:00,W2,506.9\n2026-07-05 18:00,W1,1243.1\n2026-07-05 18:00,W2,998.4\n2026-07-06 00:00,W1,1600.5\n2026-07-06 00:00,W2,1208.1\n2026-07-06 06:00,W1,1688.8\n2026-07-06 06:00,W2,1312.4\n2026-07-06 12:00,W1,698.3\n2026-07-06 12:00,W2,529.4\n2026-07-06 18:00,W1,1298.4\n2026-07-06 18:00,W2,1042.8\n2026-07-07 00:00,W1,1629.7\n2026-07-07 00:00,W2,1230.2\n2026-07-07 06:00,W1,1719.6\n2026-07-07 06:00,W2,1336.4\n2026-07-07 12:00,W1,711.1\n2026-07-07 12:00,W2,539.1\n2026-07-07 18:00,W1,1322.1\n2026-07-07 18:00,W2,1061.8\n2026-07-08 00:00,W1,1609.0\n2026-07-08 00:00,W2,1214.6\n2026-07-08 06:00,W1,1697.8\n2026-07-08 06:00,W2,1319.4\n2026-07-08 12:00,W1,702.0\n2026-07-08 12:00,W2,532.2\n2026-07-08 18:00,W1,1305.3\n2026-07-08 18:00,W2,1048.4\n2026-07-09 00:00,W1,2141.8\n2026-07-09 00:00,W2,1616.7\n2026-07-09 06:00,W1,2259.9\n2026-07-09 06:00,W2,1756.3\n2026-07-09 12:00,W1,934.5\n2026-07-09 12:00,W2,708.5\n2026-07-09 18:00,W1,1737.5\n2026-07-09 18:00,W2,1395.5\n2026-07-10 00:00,W1,1626.5\n2026-07-10 00:00,W2,1227.7\n2026-07-10 06:00,W1,1716.2\n2026-07-10 06:00,W2,1333.7\n2026-07-10 12:00,W1,709.6\n2026-07-10 12:00,W2,538.0\n2026-07-10 18:00,W1,1319.4\n2026-07-10 18:00,W2,1059.7\n2026-07-11 00:00,W1,1705.8\n2026-07-11 00:00,W2,1287.6\n2026-07-11 06:00,W1,1799.9\n2026-07-11 06:00,W2,1398.8\n2026-07-11 12:00,W1,744.3\n2026-07-11 12:00,W2,564.3\n2026-07-11 18:00,W1,1383.8\n2026-07-11 18:00,W2,1111.4\n2026-07-12 00:00,W1,1668.6\n2026-07-12 00:00,W2,1259.5\n2026-07-12 06:00,W1,1760.6\n2026-07-12 06:00,W2,1368.2\n2026-07-12 12:00,W1,ERR\n2026-07-12 12:00,W2,551.9\n2026-07-12 18:00,W1,1353.6\n2026-07-12 18:00,W2,1087.2\n2026-07-13 00:00,W1,1718.7\n2026-07-13 00:00,W2,1297.3\n2026-07-13 06:00,W1,1813.4\n2026-07-13 06:00,W2,1409.3\n2026-07-13 12:00,W1,749.9\n2026-07-13 12:00,W2,568.5\n2026-07-13 18:00,W1,1394.2\n2026-07-13 18:00,W2,1119.8\n2026-07-14 00:00,W1,2179.6\n2026-07-14 00:00,W2,1645.3\n2026-07-14 06:00,W1,2299.8\n2026-07-14 06:00,W2,1787.2\n2026-07-14 12:00,W1,951.0\n2026-07-14 12:00,W2,721.0\n2026-07-14 18:00,W1,1768.2\n2026-07-14 18:00,W2,1420.1\n2026-07-15 00:00,W1,1697.8\n2026-07-15 00:00,W2,1281.6\n2026-07-15 06:00,W1,1791.4\n2026-07-15 06:00,W2,1392.2\n2026-07-15 12:00,W1,740.8\n2026-07-15 12:00,W2,561.6\n2026-07-15 18:00,W1,1377.3\n2026-07-15 18:00,W2,1106.2\n2026-07-16 00:00,W1,1773.2\n2026-07-16 00:00,W2,1338.5\n2026-07-16 06:00,W1,1871.0\n2026-07-16 06:00,W2,1454.0\n2026-07-16 12:00,W1,773.7\n2026-07-16 12:00,W2,586.5\n2026-07-16 18:00,W1,1438.5\n2026-07-16 18:00,W2,1155.3\n2026-07-17 00:00,W1,1745.6\n2026-07-17 00:00,W2,1317.6\n2026-07-17 06:00,W1,1841.8\n2026-07-17 06:00,W2,1431.3\n2026-07-17 12:00,W1,761.6\n2026-07-17 12:00,W2,577.4\n2026-07-17 18:00,W1,1416.0\n2026-07-17 18:00,W2,ERR\n2026-07-18 00:00,W1,1791.9\n2026-07-18 00:00,W2,1352.6\n2026-07-18 06:00,W1,1890.7\n2026-07-18 06:00,W2,1469.3\n2026-07-18 12:00,W1,781.8\n2026-07-18 12:00,W2,592.7\n2026-07-18 18:00,W1,1453.6\n2026-07-18 18:00,W2,1167.5\n2026-07-19 00:00,W1,2318.7\n2026-07-19 00:00,W2,1750.3\n2026-07-19 06:00,W1,2446.6\n2026-07-19 06:00,W2,1901.3\n2026-07-19 12:00,W1,1011.7\n2026-07-19 12:00,W2,767.0\n2026-07-19 18:00,W1,1881.0\n2026-07-19 18:00,W2,1510.8\n2026-07-20 00:00,W1,1850.0\n2026-07-20 00:00,W2,1396.4\n2026-07-20 06:00,W1,1952.0\n2026-07-20 06:00,W2,1517.0\n2026-07-20 12:00,W1,807.2\n2026-07-20 12:00,W2,611.9\n2026-07-20 18:00,W1,1500.8\n2026-07-20 18:00,W2,1205.3\n2026-07-21 00:00,W1,1806.2\n2026-07-21 00:00,W2,1363.4\n2026-07-21 06:00,W1,1905.8\n2026-07-21 06:00,W2,1481.0\n2026-07-21 12:00,W1,788.1\n2026-07-21 12:00,W2,597.4\n2026-07-21 18:00,W1,1465.2\n2026-07-21 18:00,W2,1176.8\n"
    },
    "demo": "# Demo for FLJ-42: runs the student's functions on well_readings.csv (DATA_CSV) and prints one JSON line.\nimport json\n\n\ndef _shadowday_demo():\n    def short(value):\n        text = repr(value)\n        return text if len(text) <= 80 else text[:77] + \"...\"\n\n    months = [\"Jan\", \"Feb\", \"Mar\", \"Apr\", \"May\", \"Jun\", \"Jul\", \"Aug\", \"Sep\", \"Oct\", \"Nov\", \"Dec\"]\n\n    def label(date):\n        try:\n            return months[int(date[5:7]) - 1] + \" \" + date[8:10]\n        except Exception:\n            return str(date)\n\n    readings = [parse_reading(line) for line in DATA_CSV.splitlines()]\n    totals = daily_totals(readings)\n    if not isinstance(totals, dict) or not totals:\n        raise ValueError(\n            \"daily_totals gave back \" + short(totals) + \", so there is nothing to chart yet. \"\n            \"Finish parse_reading and daily_totals, then run the demo again.\"\n        )\n    flagged = flag_overpumping(totals)\n    if not isinstance(flagged, list):\n        raise ValueError(\"flag_overpumping gave back \" + short(flagged) + \" instead of a list of dates.\")\n\n    series = []\n    for date in sorted(totals):\n        series.append({\"label\": label(date), \"value\": round(float(totals[date]), 1), \"flagged\": date in flagged})\n    days = [p[\"label\"] for p in series if p[\"flagged\"]]\n    n = len(days)\n\n    if n == 0:\n        en = \"Your code didn't flag any days of over-pumping at Saeed's farm.\"\n        ar = \"لم يرصد الكود الذي كتبته أي يوم ضخ زائد في مزرعة سعيد.\"\n    else:\n        en = \"Your code flagged %d day%s of over-pumping at Saeed's farm: %s.\" % (n, \"\" if n == 1 else \"s\", \", \".join(days))\n        if n == 1:\n            count_ar = \"يوماً واحداً\"\n        elif n == 2:\n            count_ar = \"يومين\"\n        elif n <= 10:\n            count_ar = \"%d أيام\" % n\n        else:\n            count_ar = \"%d يوماً\" % n\n        ar = \"رصد الكود الذي كتبته %s من الضخ الزائد في مزرعة سعيد.\" % count_ar\n\n    result = {\n        \"title\": \"Water pumped per day at Saeed's farm, July 2026\",\n        \"unit\": \"liters\",\n        \"series\": series,\n        \"summary\": {\"en\": en, \"ar\": ar},\n    }\n    print(json.dumps(result, ensure_ascii=False, allow_nan=False))\n\n\n_shadowday_demo()\n",
    "functions": [
      {
        "name": "parse_reading",
        "signature": "parse_reading(line: str) -> dict | None",
        "summary": {
          "en": "Turn one line of the CSV into a reading, or None for a line to skip.",
          "ar": "حوّل سطراً واحداً من ملف CSV إلى قراءة، أو None إذا كان يجب تجاهل السطر."
        }
      },
      {
        "name": "daily_totals",
        "signature": "daily_totals(readings: list) -> dict",
        "summary": {
          "en": "Add up the liters pumped each day, across both wells.",
          "ar": "اجمع اللترات التي ضُخّت في كل يوم من البئرين معاً."
        }
      },
      {
        "name": "flag_overpumping",
        "signature": "flag_overpumping(totals: dict) -> list",
        "summary": {
          "en": "List the days when the farm was over-pumping, sorted by date.",
          "ar": "اذكر الأيام التي حدث فيها ضخ زائد في المزرعة، مرتبة حسب التاريخ."
        }
      }
    ],
    "hidden": {
      "rule": {
        "en": "A day is over-pumping when the farm pumps more than 20% above its average for the 7 days before it. So if the last week averaged 10,000 liters a day, anything over 12,000 is too much. If there aren't 7 earlier days to compare with, don't flag that day, because I can't judge it yet.",
        "ar": "يكون في اليوم ضخ زائد عندما تضخ المزرعة أكثر من 20% فوق متوسطها في الأيام السبعة التي قبله. يعني لو كان متوسط الأسبوع الذي قبله 10,000 لتر في اليوم، فأي شيء فوق 12,000 لتر كثير. وإذا لم تكن هناك 7 أيام قبله للمقارنة فلا تحدّده، لأنني لا أستطيع الحكم عليه بعد."
      },
      "revealKeywords": [
        "over-pumping",
        "overpumping",
        "over pumping",
        "pumping too much",
        "too much water",
        "how much is too much",
        "what counts",
        "what does it mean",
        "how do you know",
        "rule",
        "threshold",
        "limit",
        "normal",
        "average",
        "الضخ الزائد",
        "ضخ زائد",
        "أكثر من اللازم",
        "ماذا يعني",
        "ما المقصود",
        "كيف تعرف",
        "متى يكون",
        "القاعدة",
        "الحد",
        "المتوسط",
        "المعدل"
      ],
      "revealMarkers": [
        "20%",
        "20 %",
        "20 percent",
        "20 per cent",
        "twenty percent",
        "twenty per cent",
        "7 days",
        "seven days",
        "7 previous days",
        "seven previous days",
        "previous 7",
        "previous seven",
        "٢٠٪",
        "٢٠ ٪",
        "٢٠%",
        "20٪",
        "20 ٪",
        "عشرين بالمئة",
        "عشرين في المئة",
        "عشرين بالمائة",
        "عشرين في المائة",
        "سبعة أيام",
        "7 أيام",
        "٧ أيام",
        "الأيام السبعة"
      ]
    },
    "hints": {
      "parse_reading": [
        {
          "level": 1,
          "text": {
            "en": "Look at one line of well_readings.csv. Which three pieces do you need, and which lines have no real reading in them?",
            "ar": "انظر إلى سطر واحد من well_readings.csv. ما القطع الثلاث التي تحتاجها، وما الأسطر التي لا تحتوي على قراءة حقيقية؟"
          }
        },
        {
          "level": 2,
          "text": {
            "en": "strip() cleans both ends of a string, and split(',') cuts it into a list at every comma. float() turns text like '1250' into the number 1250.0.",
            "ar": "الدالة `strip()` تنظّف طرفي النص، و `split(',')` تقطعه إلى قائمة عند كل فاصلة. أما `float()` فتحوّل نصاً مثل `'1250'` إلى العدد `1250.0`."
          }
        },
        {
          "level": 3,
          "text": {
            "en": "1. Strip the line.\n2. If it is empty or it is the header, give back None.\n3. Split it on commas into the timestamp, the well and the liters.\n4. If the liters part is 'ERR' or empty, give back None.\n5. The date is the part of the timestamp before the space.\n6. Build a dictionary with the date, the well and the liters as a float, and give it back.",
            "ar": "1. أزل المسافات من طرفي السطر.\n2. إذا كان السطر فارغاً أو كان سطر العناوين، أعد None.\n3. اقسم السطر عند الفواصل إلى الوقت والبئر وعدد اللترات.\n4. إذا كان جزء اللترات 'ERR' أو فارغاً، أعد None.\n5. التاريخ هو الجزء الذي يسبق المسافة في الوقت.\n6. كوّن قاموساً فيه التاريخ والبئر وعدد اللترات كعدد عشري (float)، ثم أعده."
          }
        }
      ],
      "daily_totals": [
        {
          "level": 1,
          "text": {
            "en": "You need one total per date. What should happen the first time you see a date, and what should happen the next time you see it?",
            "ar": "تحتاج إلى مجموع واحد لكل تاريخ. ماذا يجب أن يحدث أول مرة ترى فيها تاريخاً، وماذا يجب أن يحدث في المرة التالية؟"
          }
        },
        {
          "level": 2,
          "text": {
            "en": "Use a dictionary to keep running totals. dict.get(date, 0) gives you the total so far, or 0 if that date isn't in the dictionary yet.",
            "ar": "استخدم قاموساً لتحتفظ فيه بالمجاميع أثناء الحساب. الدالة `dict.get(date, 0)` تعطيك المجموع حتى الآن، أو 0 إذا لم يكن التاريخ في القاموس بعد."
          }
        },
        {
          "level": 3,
          "text": {
            "en": "1. Start with an empty dictionary.\n2. Loop over the readings.\n3. Skip a reading if it is None.\n4. Look up the total so far for that reading's date (0 if it is new) and add the reading's liters.\n5. Store the new total under that date.\n6. After the loop, give back the dictionary.",
            "ar": "1. ابدأ بقاموس فارغ.\n2. مرّ على القراءات بحلقة تكرار.\n3. تجاوز أي قراءة قيمتها None.\n4. ابحث عن المجموع الحالي لتاريخ القراءة (0 إذا كان جديداً) وأضف إليه لترات القراءة.\n5. خزّن المجموع الجديد تحت ذلك التاريخ.\n6. بعد انتهاء الحلقة، أعد القاموس."
          }
        }
      ],
      "flag_overpumping": [
        {
          "level": 1,
          "text": {
            "en": "Do you actually know what 'over-pumping' means for Saeed's farm? What would you compare each day with, and who could tell you?",
            "ar": "هل تعرف فعلاً ما معنى 'الضخ الزائد' في مزرعة سعيد؟ بماذا ستقارن كل يوم، ومن يستطيع أن يخبرك؟"
          }
        },
        {
          "level": 2,
          "text": {
            "en": "sorted() gives you the dates in order. A loop over range() gives you each position, so you can reach other days with an index or a slice. sum() and len() help you work out an average.",
            "ar": "الدالة `sorted()` تعطيك التواريخ مرتبة. والحلقة على `range()` تعطيك موقع كل تاريخ، فتستطيع الوصول إلى أيام أخرى بالفهرس أو بالتقطيع (slice). وتساعدك الدالتان `sum()` و `len()` على حساب المتوسط."
          }
        },
        {
          "level": 3,
          "text": {
            "en": "1. Ask Saeed exactly what counts as over-pumping, and write his rule in a comment.\n2. Put the dates in order with sorted().\n3. Loop over the dates by position, so you can look at the days around each one.\n4. For each date, work out the number Saeed compares it with.\n5. If that day breaks Saeed's rule, add the date to a list.\n6. Give back the list, earliest date first.",
            "ar": "1. اسأل سعيد بالضبط ما الذي يُعدّ ضخاً زائداً، واكتب قاعدته في تعليق.\n2. رتّب التواريخ باستخدام `sorted()`.\n3. مرّ على التواريخ حسب موقعها، لتتمكن من النظر إلى الأيام المحيطة بكل يوم.\n4. لكل تاريخ، احسب الرقم الذي يقارنه به سعيد.\n5. إذا خالف ذلك اليوم قاعدة سعيد، أضف التاريخ إلى قائمة.\n6. أعد القائمة، بدءاً من أقدم تاريخ."
          }
        }
      ]
    },
    "conceptTags": [
      {
        "en": "string parsing",
        "ar": "تحليل النصوص"
      },
      {
        "en": "dictionaries",
        "ar": "القواميس"
      },
      {
        "en": "loops",
        "ar": "الحلقات"
      },
      {
        "en": "averages",
        "ar": "المتوسطات"
      },
      {
        "en": "sorting",
        "ar": "الترتيب"
      }
    ]
  },
  floods: {
    "id": "floods",
    "key": "WDW-17",
    "title": {
      "en": "Road closure alerts from the rain gauges",
      "ar": "تنبيهات إغلاق الطرق من مقاييس الأمطار"
    },
    "body": {
      "en": "Hi, welcome to WadiWatch! Your first ticket is a real one.\nOur gauges above three wadi roads send a rain reading every 15 minutes (see rain_gauges.csv). Khalid needs to know which roads to close:\n- parse_reading: turn one line of the CSV into a dict\n- hourly_totals: add up the rain at each gauge, hour by hour\n- roads_to_close: decide which roads to close. Heavy rain, roughly 20 mm in an hour, is the danger, but Khalid has the exact rules, so check with him\nThe gauges glitch sometimes and send ERR. The tests are in tests.py, so run them often!",
      "ar": "أهلاً بك في وادي ووتش! أول مهمة لك مهمة حقيقية.\nترسل مقاييسنا المثبّتة فوق ثلاثة طرق أودية قراءة للمطر كل 15 دقيقة (انظر ملف rain_gauges.csv). ويحتاج خالد إلى معرفة الطرق التي يجب إغلاقها:\n- parse_reading: حوّل سطراً واحداً من ملف CSV إلى قاموس (dict)\n- hourly_totals: اجمع المطر عند كل مقياس، ساعة بساعة\n- roads_to_close: قرّر أي الطرق يجب إغلاقها. الخطر هو المطر الغزير، نحو 20 ملم في الساعة، لكن القواعد الدقيقة عند خالد، فتحقّق منها معه\nالمقاييس تتعطل أحياناً وترسل ERR. الاختبارات موجودة في tests.py، فشغّلها كثيراً!"
    },
    "fileName": "gauges.py",
    "starter": "\"\"\"gauges.py: road-closure alerts for Khalid (WadiWatch, ticket WDW-17).\n\nEvery line of rain_gauges.csv is one rain-gauge reading, like this:\n\n    2026-04-14 13:15,G-HAM,2.4\n\nIt means gauge G-HAM measured 2.4 mm of rain in the 15 minutes up to 13:15\non 14 April. Each gauge sits in the mountains above one wadi road, and sends\na reading every 15 minutes. Sometimes a gauge glitches and sends ERR.\n\nRun the tests in tests.py to check your work.\n\"\"\"\n\n# Each wadi road and the rain gauge that watches it. Don't change this.\nROADS = [\n    {\"road\": \"Wadi Ham Road\", \"gauge\": \"G-HAM\"},\n    {\"road\": \"Wadi Wurayah Road\", \"gauge\": \"G-WUR\"},\n    {\"road\": \"Wadi Saham Road\", \"gauge\": \"G-SAH\"},\n]\n\n\ndef parse_reading(line: str) -> dict | None:\n    \"\"\"Turn one line of rain_gauges.csv into a dictionary.\n\n    Remove the spaces and the newline from both ends of the line first.\n    Give back None for lines you can't use:\n      - the header line \"time,gauge,mm\"\n      - a blank line\n      - a glitched reading, where mm is \"ERR\"\n\n    \"hour\" is the date and the hour of the time, without the minutes,\n    for example \"2026-04-14 13\". mm must be a number (a float), not text.\n\n    Examples:\n        parse_reading(\"2026-04-14 13:15,G-HAM,2.4\")\n            gives {\"hour\": \"2026-04-14 13\", \"gauge\": \"G-HAM\", \"mm\": 2.4}\n        parse_reading(\"2026-04-14 09:45,G-WUR,ERR\")\n            gives None\n    \"\"\"\n    # TODO: strip the line, skip the lines you can't use, then split it on commas.\n    return None\n\n\ndef hourly_totals(readings: list) -> dict:\n    \"\"\"Add up the rain at each gauge, hour by hour.\n\n    readings is a list of dictionaries from parse_reading. Some items may be\n    None (the lines that were skipped), so ignore those.\n    Give back a dictionary of dictionaries: gauge -> hour -> total mm.\n\n    Example:\n        hourly_totals([\n            {\"hour\": \"2026-04-14 13\", \"gauge\": \"G-HAM\", \"mm\": 2.4},\n            {\"hour\": \"2026-04-14 13\", \"gauge\": \"G-HAM\", \"mm\": 1.6},\n            None,\n            {\"hour\": \"2026-04-14 14\", \"gauge\": \"G-HAM\", \"mm\": 0.5},\n            {\"hour\": \"2026-04-14 13\", \"gauge\": \"G-SAH\", \"mm\": 0.2},\n        ])\n            gives {\"G-HAM\": {\"2026-04-14 13\": 4.0, \"2026-04-14 14\": 0.5},\n                   \"G-SAH\": {\"2026-04-14 13\": 0.2}}\n    \"\"\"\n    # TODO: build the nested dictionary of hourly totals.\n    return None\n\n\ndef roads_to_close(hourly: dict, roads: list) -> list:\n    \"\"\"Decide which wadi roads Khalid should close.\n\n    hourly is the dictionary from hourly_totals. roads is a list like ROADS.\n    Give back the names of the roads to close, sorted alphabetically.\n    If every road can stay open, give back an empty list.\n\n    Heavy rain is the danger. Khalid has the exact rules for when a road\n    closes, so ask him before you write this one.\n\n    Example (made-up numbers):\n        roads_to_close({\"G-HAM\": {\"2026-04-14 12\": 25.0}, ...}, ROADS)\n            might give [\"Wadi Ham Road\"]\n    \"\"\"\n    # TODO: ask Khalid when a road must close, then check every road.\n    return None\n",
    "tests": "\"\"\"Tests for gauges.py (ticket WDW-17).\n\nEach test_ function checks one thing. A test passes when none of its asserts fail.\nYou don't need to change this file.\n\"\"\"\n\nimport math\n\n# Which of your functions each test checks.\nTEST_FN = {\n    \"test_parse_reading_basic\": \"parse_reading\",\n    \"test_parse_reading_strips_whitespace\": \"parse_reading\",\n    \"test_parse_reading_skips_header_and_blank_lines\": \"parse_reading\",\n    \"test_parse_reading_skips_glitches\": \"parse_reading\",\n    \"test_hourly_totals_adds_up_one_hour\": \"hourly_totals\",\n    \"test_hourly_totals_keeps_gauges_and_hours_apart\": \"hourly_totals\",\n    \"test_hourly_totals_skips_none\": \"hourly_totals\",\n    \"test_roads_to_close_one_downpour\": \"roads_to_close\",\n    \"test_roads_to_close_names_are_sorted\": \"roads_to_close\",\n    \"test_roads_to_close_light_rain_stays_open\": \"roads_to_close\",\n    \"test_roads_to_close_saham_at_noon\": \"roads_to_close\",\n    \"test_roads_to_close_wurayah_in_the_afternoon\": \"roads_to_close\",\n}\n\nASK_KHALID = \"Khalid decides when a road is too dangerous. Ask him.\"\n\n# The same roads as ROADS in gauges.py.\nTEST_ROADS = [\n    {\"road\": \"Wadi Ham Road\", \"gauge\": \"G-HAM\"},\n    {\"road\": \"Wadi Wurayah Road\", \"gauge\": \"G-WUR\"},\n    {\"road\": \"Wadi Saham Road\", \"gauge\": \"G-SAH\"},\n]\n\n\n# ---------- parse_reading ----------\n\ndef test_parse_reading_basic():\n    result = parse_reading(\"2026-04-14 13:15,G-HAM,2.4\")\n    expected = {\"hour\": \"2026-04-14 13\", \"gauge\": \"G-HAM\", \"mm\": 2.4}\n    assert result == expected, (\n        f\"parse_reading('2026-04-14 13:15,G-HAM,2.4') should give {expected}, but your function gave {result!r}.\"\n    )\n\n\ndef test_parse_reading_strips_whitespace():\n    result = parse_reading(\"  2026-04-14 09:45,G-SAH,0.0\\n\")\n    expected = {\"hour\": \"2026-04-14 09\", \"gauge\": \"G-SAH\", \"mm\": 0.0}\n    assert result == expected, (\n        f\"A line with spaces at the start and a newline at the end should give {expected}, \"\n        f\"but your function gave {result!r}. Try strip().\"\n    )\n\n\ndef _check_real_line_parses(line):\n    # A function that gives back None for every line must not pass the \"skip\" tests below.\n    result = parse_reading(line)\n    assert isinstance(result, dict), (\n        f\"parse_reading({line!r}) is a real reading, so it should give a dictionary, but your function gave {result!r}. \"\n        f\"Get real readings working first, then give back None for the lines to skip.\"\n    )\n\n\ndef test_parse_reading_skips_header_and_blank_lines():\n    _check_real_line_parses(\"2026-04-14 10:00,G-HAM,1.2\")\n    for line in [\"time,gauge,mm\", \"time,gauge,mm\\n\", \"\", \"\\n\", \"   \"]:\n        result = parse_reading(line)\n        assert result is None, (\n            f\"parse_reading({line!r}) should give None because that line has no reading in it, \"\n            f\"but your function gave {result!r}.\"\n        )\n\n\ndef test_parse_reading_skips_glitches():\n    _check_real_line_parses(\"2026-04-14 09:45,G-WUR,3.1\")\n    for line in [\"2026-04-14 09:45,G-WUR,ERR\", \"2026-04-14 09:45,G-WUR,ERR\\n\"]:\n        result = parse_reading(line)\n        assert result is None, (\n            f\"parse_reading({line!r}) should give None because the gauge glitched, \"\n            f\"but your function gave {result!r}.\"\n        )\n\n\n# ---------- hourly_totals ----------\n\ndef _check_hourly(result, expected):\n    assert isinstance(result, dict), (\n        f\"hourly_totals should give back a dictionary of gauge -> hour -> mm, but it gave back {result!r}.\"\n    )\n    assert sorted(result) == sorted(expected), (\n        f\"Expected the gauges {sorted(expected)}, but your dictionary has {sorted(result)}.\"\n    )\n    for gauge in expected:\n        hours = result[gauge]\n        assert isinstance(hours, dict), (\n            f\"result[{gauge!r}] should be a dictionary of hour -> mm, but it is {hours!r}.\"\n        )\n        assert sorted(hours) == sorted(expected[gauge]), (\n            f\"Expected {gauge} to have the hours {sorted(expected[gauge])}, but it has {sorted(hours)}.\"\n        )\n        for hour in expected[gauge]:\n            mm = hours[hour]\n            assert isinstance(mm, (int, float)) and math.isclose(mm, expected[gauge][hour]), (\n                f\"Expected {gauge} to have {expected[gauge][hour]} mm in hour {hour}, but your function gave {mm!r}.\"\n            )\n\n\ndef test_hourly_totals_adds_up_one_hour():\n    readings = [\n        {\"hour\": \"2026-04-14 13\", \"gauge\": \"G-HAM\", \"mm\": 2.4},\n        {\"hour\": \"2026-04-14 13\", \"gauge\": \"G-HAM\", \"mm\": 3.1},\n        {\"hour\": \"2026-04-14 13\", \"gauge\": \"G-HAM\", \"mm\": 0.5},\n        {\"hour\": \"2026-04-14 13\", \"gauge\": \"G-HAM\", \"mm\": 1.0},\n    ]\n    _check_hourly(hourly_totals(readings), {\"G-HAM\": {\"2026-04-14 13\": 7.0}})\n\n\ndef test_hourly_totals_keeps_gauges_and_hours_apart():\n    readings = [\n        {\"hour\": \"2026-04-14 13\", \"gauge\": \"G-HAM\", \"mm\": 2.0},\n        {\"hour\": \"2026-04-14 13\", \"gauge\": \"G-WUR\", \"mm\": 0.8},\n        {\"hour\": \"2026-04-14 14\", \"gauge\": \"G-HAM\", \"mm\": 1.5},\n        {\"hour\": \"2026-04-14 13\", \"gauge\": \"G-HAM\", \"mm\": 1.0},\n    ]\n    expected = {\n        \"G-HAM\": {\"2026-04-14 13\": 3.0, \"2026-04-14 14\": 1.5},\n        \"G-WUR\": {\"2026-04-14 13\": 0.8},\n    }\n    _check_hourly(hourly_totals(readings), expected)\n\n\ndef test_hourly_totals_skips_none():\n    readings = [None, {\"hour\": \"2026-04-14 09\", \"gauge\": \"G-SAH\", \"mm\": 0.6}, None]\n    _check_hourly(hourly_totals(readings), {\"G-SAH\": {\"2026-04-14 09\": 0.6}})\n\n\n# ---------- roads_to_close ----------\n\ndef _check_closed(result, expected):\n    assert isinstance(result, list), (\n        f\"roads_to_close should give back a list of road names, but it gave back {result!r}.\"\n    )\n    for road in expected:\n        assert road in result, (\n            f\"Expected {road} to be closed, but your function kept it open. {ASK_KHALID}\"\n        )\n    for road in result:\n        assert road in expected, (\n            f\"Your function closed {road}, but Khalid would keep it open with this rain. {ASK_KHALID}\"\n        )\n    assert result == expected, (\n        f\"You picked the right roads, but the list should have each name once, sorted alphabetically. \"\n        f\"Expected {expected}, got {result}.\"\n    )\n\n\ndef test_roads_to_close_one_downpour():\n    hourly = {\n        \"G-HAM\": {\"2026-04-14 10\": 2.0, \"2026-04-14 11\": 26.5, \"2026-04-14 12\": 8.0},\n        \"G-WUR\": {\"2026-04-14 10\": 1.0, \"2026-04-14 11\": 0.5, \"2026-04-14 12\": 1.5},\n        \"G-SAH\": {\"2026-04-14 10\": 0.0, \"2026-04-14 11\": 3.0, \"2026-04-14 12\": 1.0},\n    }\n    _check_closed(roads_to_close(hourly, TEST_ROADS), [\"Wadi Ham Road\"])\n\n\ndef test_roads_to_close_names_are_sorted():\n    hourly = {\n        \"G-HAM\": {\"2026-04-14 10\": 1.0, \"2026-04-14 11\": 0.0, \"2026-04-14 12\": 0.4},\n        \"G-WUR\": {\"2026-04-14 10\": 5.0, \"2026-04-14 11\": 31.0, \"2026-04-14 12\": 12.0},\n        \"G-SAH\": {\"2026-04-14 10\": 22.4, \"2026-04-14 11\": 9.0, \"2026-04-14 12\": 3.0},\n    }\n    _check_closed(roads_to_close(hourly, TEST_ROADS), [\"Wadi Saham Road\", \"Wadi Wurayah Road\"])\n\n\ndef test_roads_to_close_light_rain_stays_open():\n    hourly = {\n        \"G-HAM\": {\n            \"2026-04-14 08\": 4.0, \"2026-04-14 09\": 2.5, \"2026-04-14 10\": 6.0,\n            \"2026-04-14 11\": 3.5, \"2026-04-14 12\": 7.5, \"2026-04-14 13\": 1.0,\n        },\n        \"G-WUR\": {\n            \"2026-04-14 08\": 0.0, \"2026-04-14 09\": 0.0, \"2026-04-14 10\": 1.2,\n            \"2026-04-14 11\": 0.6, \"2026-04-14 12\": 0.6, \"2026-04-14 13\": 0.3,\n        },\n        \"G-SAH\": {\n            \"2026-04-14 08\": 12.0, \"2026-04-14 09\": 9.5, \"2026-04-14 10\": 15.0,\n            \"2026-04-14 11\": 6.0, \"2026-04-14 12\": 19.5, \"2026-04-14 13\": 2.0,\n        },\n    }\n    _check_closed(roads_to_close(hourly, TEST_ROADS), [])\n\n\ndef test_roads_to_close_saham_at_noon():\n    hourly = {\n        \"G-HAM\": {\"2026-04-14 11\": 3.0, \"2026-04-14 12\": 1.0, \"2026-04-14 13\": 2.0},\n        \"G-WUR\": {\"2026-04-14 11\": 0.5, \"2026-04-14 12\": 0.0, \"2026-04-14 13\": 0.0},\n        \"G-SAH\": {\"2026-04-14 11\": 6.0, \"2026-04-14 12\": 20.0, \"2026-04-14 13\": 4.5},\n    }\n    _check_closed(roads_to_close(hourly, TEST_ROADS), [\"Wadi Saham Road\"])\n\n\ndef test_roads_to_close_wurayah_in_the_afternoon():\n    hourly = {\n        \"G-HAM\": {\n            \"2026-04-14 13\": 1.0, \"2026-04-14 14\": 0.2, \"2026-04-14 15\": 0.8,\n            \"2026-04-14 16\": 0.0, \"2026-04-14 17\": 0.0,\n        },\n        \"G-WUR\": {\n            \"2026-04-14 13\": 2.0, \"2026-04-14 14\": 0.5, \"2026-04-14 15\": 1.5,\n            \"2026-04-14 16\": 4.0, \"2026-04-14 17\": 3.0,\n        },\n        \"G-SAH\": {\n            \"2026-04-14 13\": 0.4, \"2026-04-14 14\": 0.6, \"2026-04-14 15\": 0.6,\n            \"2026-04-14 16\": 0.1, \"2026-04-14 17\": 0.0,\n        },\n    }\n    _check_closed(roads_to_close(hourly, TEST_ROADS), [\"Wadi Wurayah Road\"])\n",
    "testFn": {
      "test_parse_reading_basic": "parse_reading",
      "test_parse_reading_strips_whitespace": "parse_reading",
      "test_parse_reading_skips_header_and_blank_lines": "parse_reading",
      "test_parse_reading_skips_glitches": "parse_reading",
      "test_hourly_totals_adds_up_one_hour": "hourly_totals",
      "test_hourly_totals_keeps_gauges_and_hours_apart": "hourly_totals",
      "test_hourly_totals_skips_none": "hourly_totals",
      "test_roads_to_close_one_downpour": "roads_to_close",
      "test_roads_to_close_names_are_sorted": "roads_to_close",
      "test_roads_to_close_light_rain_stays_open": "roads_to_close",
      "test_roads_to_close_saham_at_noon": "roads_to_close",
      "test_roads_to_close_wurayah_in_the_afternoon": "roads_to_close"
    },
    "data": {
      "fileName": "rain_gauges.csv",
      "csv": "time,gauge,mm\n2026-04-14 08:00,G-HAM,0.1\n2026-04-14 08:00,G-WUR,0.0\n2026-04-14 08:00,G-SAH,0.0\n2026-04-14 08:15,G-HAM,0.1\n2026-04-14 08:15,G-WUR,0.0\n2026-04-14 08:15,G-SAH,0.0\n2026-04-14 08:30,G-HAM,0.1\n2026-04-14 08:30,G-WUR,0.0\n2026-04-14 08:30,G-SAH,0.0\n2026-04-14 08:45,G-HAM,0.3\n2026-04-14 08:45,G-WUR,0.0\n2026-04-14 08:45,G-SAH,0.2\n2026-04-14 09:00,G-HAM,0.0\n2026-04-14 09:00,G-WUR,0.0\n2026-04-14 09:00,G-SAH,0.0\n2026-04-14 09:15,G-HAM,0.0\n2026-04-14 09:15,G-WUR,0.0\n2026-04-14 09:15,G-SAH,0.0\n2026-04-14 09:30,G-HAM,0.0\n2026-04-14 09:30,G-WUR,0.0\n2026-04-14 09:30,G-SAH,0.0\n2026-04-14 09:45,G-HAM,0.2\n2026-04-14 09:45,G-WUR,ERR\n2026-04-14 09:45,G-SAH,0.0\n2026-04-14 10:00,G-HAM,0.2\n2026-04-14 10:00,G-WUR,0.1\n2026-04-14 10:00,G-SAH,0.2\n2026-04-14 10:15,G-HAM,0.3\n2026-04-14 10:15,G-WUR,0.2\n2026-04-14 10:15,G-SAH,0.4\n2026-04-14 10:30,G-HAM,0.4\n2026-04-14 10:30,G-WUR,0.2\n2026-04-14 10:30,G-SAH,0.4\n2026-04-14 10:45,G-HAM,0.5\n2026-04-14 10:45,G-WUR,0.3\n2026-04-14 10:45,G-SAH,0.6\n2026-04-14 11:00,G-HAM,0.2\n2026-04-14 11:00,G-WUR,0.1\n2026-04-14 11:00,G-SAH,0.3\n2026-04-14 11:15,G-HAM,0.1\n2026-04-14 11:15,G-WUR,0.0\n2026-04-14 11:15,G-SAH,0.2\n2026-04-14 11:30,G-HAM,0.1\n2026-04-14 11:30,G-WUR,0.0\n2026-04-14 11:30,G-SAH,ERR\n2026-04-14 11:45,G-HAM,0.4\n2026-04-14 11:45,G-WUR,0.3\n2026-04-14 11:45,G-SAH,0.4\n2026-04-14 12:00,G-HAM,6.1\n2026-04-14 12:00,G-WUR,0.6\n2026-04-14 12:00,G-SAH,0.8\n2026-04-14 12:15,G-HAM,7.3\n2026-04-14 12:15,G-WUR,0.7\n2026-04-14 12:15,G-SAH,1.0\n2026-04-14 12:30,G-HAM,6.1\n2026-04-14 12:30,G-WUR,0.6\n2026-04-14 12:30,G-SAH,0.8\n2026-04-14 12:45,G-HAM,5.1\n2026-04-14 12:45,G-WUR,0.7\n2026-04-14 12:45,G-SAH,0.8\n2026-04-14 13:00,G-HAM,2.3\n2026-04-14 13:00,G-WUR,1.1\n2026-04-14 13:00,G-SAH,0.4\n2026-04-14 13:15,G-HAM,3.5\n2026-04-14 13:15,G-WUR,1.7\n2026-04-14 13:15,G-SAH,0.6\n2026-04-14 13:30,G-HAM,3.5\n2026-04-14 13:30,G-WUR,1.7\n2026-04-14 13:30,G-SAH,0.6\n2026-04-14 13:45,G-HAM,2.5\n2026-04-14 13:45,G-WUR,1.4\n2026-04-14 13:45,G-SAH,0.5\n2026-04-14 14:00,G-HAM,1.4\n2026-04-14 14:00,G-WUR,3.3\n2026-04-14 14:00,G-SAH,1.4\n2026-04-14 14:15,G-HAM,1.0\n2026-04-14 14:15,G-WUR,2.4\n2026-04-14 14:15,G-SAH,1.0\n2026-04-14 14:30,G-HAM,1.0\n2026-04-14 14:30,G-WUR,2.4\n2026-04-14 14:30,G-SAH,1.0\n2026-04-14 14:45,G-HAM,0.7\n2026-04-14 14:45,G-WUR,1.6\n2026-04-14 14:45,G-SAH,0.6\n2026-04-14 15:00,G-HAM,0.2\n2026-04-14 15:00,G-WUR,0.9\n2026-04-14 15:00,G-SAH,0.2\n2026-04-14 15:15,G-HAM,ERR\n2026-04-14 15:15,G-WUR,1.5\n2026-04-14 15:15,G-SAH,0.4\n2026-04-14 15:30,G-HAM,0.4\n2026-04-14 15:30,G-WUR,1.8\n2026-04-14 15:30,G-SAH,0.5\n2026-04-14 15:45,G-HAM,0.4\n2026-04-14 15:45,G-WUR,2.1\n2026-04-14 15:45,G-SAH,0.7\n2026-04-14 16:00,G-HAM,0.0\n2026-04-14 16:00,G-WUR,0.6\n2026-04-14 16:00,G-SAH,0.6\n2026-04-14 16:15,G-HAM,0.0\n2026-04-14 16:15,G-WUR,0.4\n2026-04-14 16:15,G-SAH,0.4\n2026-04-14 16:30,G-HAM,0.0\n2026-04-14 16:30,G-WUR,0.4\n2026-04-14 16:30,G-SAH,0.4\n2026-04-14 16:45,G-HAM,0.2\n2026-04-14 16:45,G-WUR,0.8\n2026-04-14 16:45,G-SAH,0.9\n2026-04-14 17:00,G-HAM,0.0\n2026-04-14 17:00,G-WUR,0.1\n2026-04-14 17:00,G-SAH,0.1\n2026-04-14 17:15,G-HAM,0.0\n2026-04-14 17:15,G-WUR,0.1\n2026-04-14 17:15,G-SAH,0.1\n2026-04-14 17:30,G-HAM,0.0\n2026-04-14 17:30,G-WUR,0.1\n2026-04-14 17:30,G-SAH,0.1\n2026-04-14 17:45,G-HAM,0.0\n2026-04-14 17:45,G-WUR,0.3\n2026-04-14 17:45,G-SAH,0.2\n"
    },
    "demo": "# Demo for WDW-17: runs the student's functions on rain_gauges.csv (DATA_CSV) and prints one JSON line.\nimport json\n\n\ndef _shadowday_demo():\n    def short(value):\n        text = repr(value)\n        return text if len(text) <= 80 else text[:77] + \"...\"\n\n    roads = [\n        {\"road\": \"Wadi Ham Road\", \"gauge\": \"G-HAM\"},\n        {\"road\": \"Wadi Wurayah Road\", \"gauge\": \"G-WUR\"},\n        {\"road\": \"Wadi Saham Road\", \"gauge\": \"G-SAH\"},\n    ]\n\n    readings = [parse_reading(line) for line in DATA_CSV.splitlines()]\n    hourly = hourly_totals(readings)\n    if not isinstance(hourly, dict) or not hourly:\n        raise ValueError(\n            \"hourly_totals gave back \" + short(hourly) + \", so there is nothing to chart yet. \"\n            \"Finish parse_reading and hourly_totals, then run the demo again.\"\n        )\n    closed = roads_to_close(hourly, roads)\n    if not isinstance(closed, list):\n        raise ValueError(\"roads_to_close gave back \" + short(closed) + \" instead of a list of road names.\")\n\n    series = []\n    for road in roads:\n        hours = hourly.get(road[\"gauge\"], {})\n        heaviest = max([float(mm) for mm in hours.values()] or [0.0])\n        series.append({\"label\": road[\"road\"], \"value\": round(heaviest, 1), \"flagged\": road[\"road\"] in closed})\n    names = [p[\"label\"] for p in series if p[\"flagged\"]]\n    n = len(names)\n    total = len(series)\n\n    if n == 0:\n        en = \"Your code keeps all %d wadi roads open for Khalid.\" % total\n        ar = \"بحسب الكود الذي كتبته، تبقى طرق الأودية كلها مفتوحة (%d طرق).\" % total\n    else:\n        en = \"Your code would close %d of %d wadi roads for Khalid: %s.\" % (n, total, \", \".join(names))\n        if n == 1:\n            count_ar = \"طريقاً واحداً\"\n        elif n == 2:\n            count_ar = \"طريقين\"\n        else:\n            count_ar = \"%d طرق\" % n\n        ar = \"بحسب الكود الذي كتبته، سيُغلق خالد %s من أصل %d طرق أودية.\" % (count_ar, total)\n\n    result = {\n        \"title\": \"Heaviest hour of rain above each wadi road, 14 April 2026\",\n        \"unit\": \"mm\",\n        \"series\": series,\n        \"summary\": {\"en\": en, \"ar\": ar},\n    }\n    print(json.dumps(result, ensure_ascii=False, allow_nan=False))\n\n\n_shadowday_demo()\n",
    "functions": [
      {
        "name": "parse_reading",
        "signature": "parse_reading(line: str) -> dict | None",
        "summary": {
          "en": "Turn one line of the CSV into a reading, or None for a line to skip.",
          "ar": "حوّل سطراً واحداً من ملف CSV إلى قراءة، أو None إذا كان يجب تجاهل السطر."
        }
      },
      {
        "name": "hourly_totals",
        "signature": "hourly_totals(readings: list) -> dict",
        "summary": {
          "en": "Add up the rain at each gauge, hour by hour.",
          "ar": "اجمع كمية المطر عند كل مقياس، ساعة بساعة."
        }
      },
      {
        "name": "roads_to_close",
        "signature": "roads_to_close(hourly: dict, roads: list) -> list",
        "summary": {
          "en": "Decide which wadi roads to close, sorted by name.",
          "ar": "قرّر أي طرق الأودية يجب إغلاقها، مرتبة حسب الاسم."
        }
      }
    ],
    "hidden": {
      "rule": {
        "en": "I close a road if any single hour at its gauge gets 20 mm of rain or more. I also close it if the hourly rain climbs three hours in a row, each hour wetter than the one before, like 2, then 5, then 9 mm, even if it never reaches 20, because that means the storm is building over the mountains. Otherwise the road stays open.",
        "ar": "أُغلق الطريق إذا سجّل مقياسه 20 ملم من المطر أو أكثر في أي ساعة واحدة. وأُغلقه أيضاً إذا ارتفع المطر على مدى ثلاث ساعات متتالية، كل ساعة أغزر من التي قبلها، مثل 2 ثم 5 ثم 9 ملم، حتى لو لم يصل إلى 20 أبداً، لأن ذلك يعني أن العاصفة تشتد فوق الجبال. وفي غير ذلك يبقى الطريق مفتوحاً."
      },
      "revealKeywords": [
        "close",
        "closing",
        "closure",
        "rule",
        "when do you",
        "when should",
        "how much rain",
        "dangerous",
        "threshold",
        "limit",
        "exactly",
        "20 mm",
        "إغلاق",
        "تغلق",
        "يُغلق",
        "نغلق",
        "القاعدة",
        "القواعد",
        "متى",
        "كمية المطر",
        "خطر",
        "الحد"
      ],
      "revealMarkers": [
        "three hours",
        "3 hours",
        "in a row",
        "three straight hours",
        "3 straight hours",
        "20 mm or more",
        "20mm or more",
        "20 mm of rain or more",
        "at least 20",
        "ثلاث ساعات",
        "3 ساعات",
        "٣ ساعات",
        "متتالية",
        "على التوالي",
        "20 ملم أو أكثر",
        "٢٠ ملم أو أكثر",
        "20 ملم من المطر أو أكثر",
        "عشرين ملم أو أكثر"
      ]
    },
    "hints": {
      "parse_reading": [
        {
          "level": 1,
          "text": {
            "en": "Look at '2026-04-14 13:15,G-HAM,2.4'. Which part of the time tells you the hour, and which lines have no rain reading at all?",
            "ar": "انظر إلى السطر `2026-04-14 13:15,G-HAM,2.4`. أي جزء من الوقت يدلّك على الساعة، وما الأسطر التي لا تحتوي على قراءة مطر أصلاً؟"
          }
        },
        {
          "level": 2,
          "text": {
            "en": "strip() and split(',') break the line into pieces. String slicing keeps just part of a string: the first 13 characters of the time are the date and the hour. float() turns '2.4' into 2.4.",
            "ar": "الدالتان `strip()` و `split(',')` تقسمان السطر إلى أجزاء. وتقطيع النصوص (slicing) يحتفظ بجزء من النص فقط: أول 13 حرفاً من الوقت هي التاريخ والساعة. أما `float()` فتحوّل `'2.4'` إلى `2.4`."
          }
        },
        {
          "level": 3,
          "text": {
            "en": "1. Strip the line.\n2. Give back None for a blank line or the header.\n3. Split it on commas into the time, the gauge and the mm.\n4. Give back None if the mm part is 'ERR'.\n5. Keep the first 13 characters of the time: that's the date and the hour.\n6. Build a dictionary with the hour, the gauge and the mm as a float, and give it back.",
            "ar": "1. أزل المسافات من طرفي السطر.\n2. أعد None إذا كان السطر فارغاً أو كان سطر العناوين.\n3. اقسم السطر عند الفواصل إلى الوقت والمقياس وكمية المطر.\n4. أعد None إذا كان جزء كمية المطر 'ERR'.\n5. احتفظ بأول 13 حرفاً من الوقت: هذه هي التاريخ والساعة.\n6. كوّن قاموساً فيه الساعة والمقياس وكمية المطر كعدد عشري (float)، ثم أعده."
          }
        }
      ],
      "hourly_totals": [
        {
          "level": 1,
          "text": {
            "en": "The answer is a dictionary inside a dictionary. What is the outer key, and what is the inner key?",
            "ar": "الناتج قاموس داخل قاموس. ما المفتاح الخارجي، وما المفتاح الداخلي؟"
          }
        },
        {
          "level": 2,
          "text": {
            "en": "Nested dictionaries. The in operator tells you whether a gauge already has its own dictionary, and dict.get(hour, 0) gives you the total so far for an hour.",
            "ar": "القواميس المتداخلة. العامل `in` يخبرك إن كان للمقياس قاموس خاص به بالفعل، والدالة `dict.get(hour, 0)` تعطيك المجموع حتى الآن لساعة معيّنة."
          }
        },
        {
          "level": 3,
          "text": {
            "en": "1. Start with an empty dictionary.\n2. Loop over the readings and skip any that are None.\n3. If the reading's gauge isn't in the dictionary yet, give it an empty dictionary of its own.\n4. In that gauge's dictionary, add the reading's mm to the total for its hour (starting from 0).\n5. After the loop, give back the outer dictionary.",
            "ar": "1. ابدأ بقاموس فارغ.\n2. مرّ على القراءات وتجاوز أي قراءة قيمتها None.\n3. إذا لم يكن مقياس القراءة في القاموس بعد، فأعطه قاموساً فارغاً خاصاً به.\n4. في قاموس ذلك المقياس، أضف كمية المطر إلى مجموع ساعتها (ابدأ من 0).\n5. بعد انتهاء الحلقة، أعد القاموس الخارجي."
          }
        }
      ],
      "roads_to_close": [
        {
          "level": 1,
          "text": {
            "en": "For each road, which gauge's numbers do you need? And are you sure one heavy hour is the only reason Khalid would close a road? Who could tell you?",
            "ar": "لكل طريق، أي مقياس تحتاج إلى أرقامه؟ وهل أنت متأكد أن ساعة واحدة من المطر الغزير هي السبب الوحيد الذي يجعل خالد يغلق الطريق؟ من يستطيع أن يخبرك؟"
          }
        },
        {
          "level": 2,
          "text": {
            "en": "Loop over the roads list. Each road has a 'gauge' key that you can look up in hourly with dict.get(). sorted() lists that gauge's hours in time order, and max() finds the biggest number in a list. Collect the road names in a list and sort it at the end.",
            "ar": "مرّ على قائمة الطرق. لكل طريق مفتاح `'gauge'` تستطيع البحث عنه في `hourly` باستخدام `dict.get()`. الدالة `sorted()` ترتّب ساعات ذلك المقياس حسب الوقت، و `max()` تجد أكبر رقم في القائمة. اجمع أسماء الطرق في قائمة ورتّبها في النهاية."
          }
        },
        {
          "level": 3,
          "text": {
            "en": "1. Ask Khalid exactly when a road must close, and write each of his conditions in a comment.\n2. Loop over the roads.\n3. Find the road's gauge, then list its hourly totals in time order.\n4. Check each of Khalid's conditions against those numbers.\n5. If any condition is true, add the road's name to your list.\n6. Give back the list sorted alphabetically.",
            "ar": "1. اسأل خالد بالضبط متى يجب إغلاق الطريق، واكتب كل شرط من شروطه في تعليق.\n2. مرّ على الطرق بحلقة تكرار.\n3. جد مقياس الطريق، ثم رتّب مجاميعه لكل ساعة حسب الوقت.\n4. افحص كل شرط من شروط خالد على هذه الأرقام.\n5. إذا تحقق أي شرط، أضف اسم الطريق إلى قائمتك.\n6. أعد القائمة مرتبة أبجدياً."
          }
        }
      ]
    },
    "conceptTags": [
      {
        "en": "string slicing",
        "ar": "تقطيع النصوص"
      },
      {
        "en": "nested dictionaries",
        "ar": "القواميس المتداخلة"
      },
      {
        "en": "comparisons",
        "ar": "المقارنات"
      },
      {
        "en": "sorting",
        "ar": "الترتيب"
      }
    ]
  },
  heat: {
    "id": "heat",
    "key": "BRD-08",
    "title": {
      "en": "Unsafe outdoor work times from the site sensors",
      "ar": "أوقات العمل غير الآمنة في الهواء الطلق من حساسات الموقع"
    },
    "body": {
      "en": "Hey, welcome to Barid Labs! Here's your first ticket.\nThe sensor at Fatima's site sends temperature and humidity every 30 minutes (see site_sensors.csv). She needs to know when the crew has to stop working outdoors:\n- parse_reading: turn one line of the CSV into a dict\n- is_unsafe: decide if a reading is unsafe. Fatima's danger line is a feels-like temperature of 46 °C or more, and feels_like() is already written for you. She has the full safety rules though, so check with her\n- unsafe_times: list the unsafe times for each date\nThe sensor glitches sometimes and sends ERR. The tests are in tests.py, so run them often!",
      "ar": "أهلاً بك في باريد لابز! هذه أول مهمة لك.\nيرسل الحساس في موقع فاطمة درجة الحرارة والرطوبة كل 30 دقيقة (انظر ملف site_sensors.csv). وهي تحتاج إلى معرفة الأوقات التي يجب أن يتوقف فيها العمال عن العمل في الهواء الطلق:\n- parse_reading: حوّل سطراً واحداً من ملف CSV إلى قاموس (dict)\n- is_unsafe: قرّر إن كانت القراءة غير آمنة. خط الخطر عند فاطمة هو درجة حرارة محسوسة تبلغ 46 درجة مئوية أو أكثر، والدالة `feels_like()` مكتوبة لك مسبقاً. لكن قواعد السلامة الكاملة عند فاطمة، فتحقّق منها معها\n- unsafe_times: اذكر الأوقات غير الآمنة لكل تاريخ\nالحساس يتعطل أحياناً ويرسل ERR. الاختبارات موجودة في tests.py، فشغّلها كثيراً!"
    },
    "fileName": "heat.py",
    "starter": "\"\"\"heat.py: unsafe outdoor work times for Fatima's site (Barid Labs, ticket BRD-08).\n\nEvery line of site_sensors.csv is one sensor reading, like this:\n\n    2026-07-14 13:30,S1,44.0,35\n\nIt means sensor S1 measured 44.0 °C and 35% humidity at 13:30 on 14 July.\nThe sensor sends a reading every 30 minutes from 06:00 to 18:00.\nSometimes it glitches and sends ERR instead of a number.\n\nRun the tests in tests.py to check your work.\n\"\"\"\n\nimport math\n\n\ndef feels_like(temp_c: float, humidity: float) -> float:\n    \"\"\"How hot it feels to a person, in °C, rounded to 1 decimal place.\n\n    This is the Australian Bureau of Meteorology (BoM) apparent temperature\n    formula, without the wind part. Humid air makes heat feel worse, because\n    sweat can't cool you down. It's already written for you: don't change it.\n\n    Example:\n        feels_like(44.0, 35.0) gives 50.5\n    \"\"\"\n    vapour = humidity / 100 * 6.105 * math.exp(17.27 * temp_c / (237.7 + temp_c))\n    return round(temp_c + 0.33 * vapour - 4.0, 1)\n\n\ndef parse_reading(line: str) -> dict | None:\n    \"\"\"Turn one line of site_sensors.csv into a dictionary.\n\n    Remove the spaces and the newline from both ends of the line first.\n    Give back None for lines you can't use:\n      - the header line \"time,site,temp_c,humidity\"\n      - a blank line\n      - a glitched reading, where any value is \"ERR\" or empty\n\n    Split the time column into \"date\" and \"time\". temp and humidity must be\n    numbers (floats), not text.\n\n    Examples:\n        parse_reading(\"2026-07-14 13:30,S1,44.0,35\")\n            gives {\"date\": \"2026-07-14\", \"time\": \"13:30\", \"site\": \"S1\", \"temp\": 44.0, \"humidity\": 35.0}\n        parse_reading(\"2026-07-15 10:00,S1,39.7,ERR\")\n            gives None\n    \"\"\"\n    # TODO: strip the line, skip the lines you can't use, then split it on commas.\n    return None\n\n\ndef is_unsafe(reading: dict) -> bool:\n    \"\"\"Is it unsafe for the crew to work outdoors at the time of this reading?\n\n    reading is one dictionary from parse_reading.\n    Give back True if it is unsafe, False if it is safe.\n\n    Fatima treats a feels-like temperature of 46 °C or more as dangerous.\n    Use feels_like() for that. She has the full safety rules, so ask her\n    before you write this one.\n\n    Example:\n        is_unsafe({\"date\": \"2026-07-14\", \"time\": \"10:00\", \"site\": \"S1\", \"temp\": 44.0, \"humidity\": 35.0})\n            gives True (it feels like 50.5 °C)\n    \"\"\"\n    # TODO: ask Fatima for all of her safety rules, then check them here.\n    return None\n\n\ndef unsafe_times(readings: list) -> dict:\n    \"\"\"List the unsafe times for each date.\n\n    readings is a list of dictionaries from parse_reading. Some items may be\n    None (the lines that were skipped), so ignore those.\n    Give back a dictionary: date -> sorted list of the \"HH:MM\" times that are\n    unsafe. Every date in the readings gets a key, even if its list is empty.\n\n    Example:\n        unsafe_times([\n            {\"date\": \"2026-07-14\", \"time\": \"10:00\", \"site\": \"S1\", \"temp\": 44.0, \"humidity\": 35.0},\n            {\"date\": \"2026-07-14\", \"time\": \"07:00\", \"site\": \"S1\", \"temp\": 30.0, \"humidity\": 40.0},\n            None,\n            {\"date\": \"2026-07-15\", \"time\": \"07:00\", \"site\": \"S1\", \"temp\": 31.0, \"humidity\": 60.0},\n        ])\n            gives {\"2026-07-14\": [\"10:00\"], \"2026-07-15\": []}\n    \"\"\"\n    # TODO: use is_unsafe() on each reading and group the unsafe times by date.\n    return None\n",
    "tests": "\"\"\"Tests for heat.py (ticket BRD-08).\n\nEach test_ function checks one thing. A test passes when none of its asserts fail.\nYou don't need to change this file.\n\"\"\"\n\n# Which of your functions each test checks.\nTEST_FN = {\n    \"test_parse_reading_basic\": \"parse_reading\",\n    \"test_parse_reading_strips_whitespace\": \"parse_reading\",\n    \"test_parse_reading_skips_header_and_blank_lines\": \"parse_reading\",\n    \"test_parse_reading_skips_glitches\": \"parse_reading\",\n    \"test_is_unsafe_very_hot_mornings\": \"is_unsafe\",\n    \"test_is_unsafe_mild_mornings\": \"is_unsafe\",\n    \"test_is_unsafe_july_lunchtime\": \"is_unsafe\",\n    \"test_is_unsafe_early_june_lunchtime\": \"is_unsafe\",\n    \"test_is_unsafe_around_lunchtime\": \"is_unsafe\",\n    \"test_unsafe_times_groups_and_sorts\": \"unsafe_times\",\n    \"test_unsafe_times_keeps_safe_dates\": \"unsafe_times\",\n    \"test_unsafe_times_skips_none\": \"unsafe_times\",\n}\n\nASK_FATIMA = \"Fatima knows the site's safety rules. Ask her.\"\n\n\ndef _reading(date, time, temp, humidity):\n    return {\"date\": date, \"time\": time, \"site\": \"S1\", \"temp\": temp, \"humidity\": humidity}\n\n\n# ---------- parse_reading ----------\n\ndef test_parse_reading_basic():\n    result = parse_reading(\"2026-07-14 13:30,S1,44.0,35\")\n    expected = {\"date\": \"2026-07-14\", \"time\": \"13:30\", \"site\": \"S1\", \"temp\": 44.0, \"humidity\": 35.0}\n    assert result == expected, (\n        f\"parse_reading('2026-07-14 13:30,S1,44.0,35') should give {expected}, but your function gave {result!r}.\"\n    )\n\n\ndef test_parse_reading_strips_whitespace():\n    result = parse_reading(\"  2026-06-10 06:00,S1,30.5,62\\n\")\n    expected = {\"date\": \"2026-06-10\", \"time\": \"06:00\", \"site\": \"S1\", \"temp\": 30.5, \"humidity\": 62.0}\n    assert result == expected, (\n        f\"A line with spaces at the start and a newline at the end should give {expected}, \"\n        f\"but your function gave {result!r}. Try strip().\"\n    )\n\n\ndef _check_real_line_parses(line):\n    # A function that gives back None for every line must not pass the \"skip\" tests below.\n    result = parse_reading(line)\n    assert isinstance(result, dict), (\n        f\"parse_reading({line!r}) is a real reading, so it should give a dictionary, but your function gave {result!r}. \"\n        f\"Get real readings working first, then give back None for the lines to skip.\"\n    )\n\n\ndef test_parse_reading_skips_header_and_blank_lines():\n    _check_real_line_parses(\"2026-07-14 06:00,S1,33.5,70\")\n    for line in [\"time,site,temp_c,humidity\", \"time,site,temp_c,humidity\\n\", \"\", \"\\n\", \"   \"]:\n        result = parse_reading(line)\n        assert result is None, (\n            f\"parse_reading({line!r}) should give None because that line has no reading in it, \"\n            f\"but your function gave {result!r}.\"\n        )\n\n\ndef test_parse_reading_skips_glitches():\n    _check_real_line_parses(\"2026-07-15 10:00,S1,39.7,48\")\n    glitches = [\n        \"2026-07-14 06:30,S1,ERR,72\",\n        \"2026-07-15 10:00,S1,39.7,ERR\",\n        \"2026-07-15 10:00,S1,39.7,ERR\\n\",\n        \"2026-07-15 10:30,S1,,49\",\n        \"2026-07-15 10:30,S1,40.5,\",\n    ]\n    for line in glitches:\n        result = parse_reading(line)\n        assert result is None, (\n            f\"parse_reading({line!r}) should give None because the sensor glitched, \"\n            f\"but your function gave {result!r}.\"\n        )\n\n\n# ---------- is_unsafe ----------\n\ndef _check_unsafe(reading, expected, feels):\n    result = is_unsafe(reading)\n    assert result is True or result is False, (\n        f\"is_unsafe should give back True or False, but for the {reading['time']} reading on {reading['date']} \"\n        f\"it gave back {result!r}.\"\n    )\n    if expected:\n        assert result is True, (\n            f\"Expected the {reading['time']} reading on {reading['date']} (feels like {feels} °C) to be unsafe, \"\n            f\"but your function said it was safe. {ASK_FATIMA}\"\n        )\n    else:\n        assert result is False, (\n            f\"Expected the {reading['time']} reading on {reading['date']} (feels like {feels} °C) to be safe, \"\n            f\"but your function said it was unsafe. {ASK_FATIMA}\"\n        )\n\n\ndef test_is_unsafe_very_hot_mornings():\n    _check_unsafe(_reading(\"2026-07-14\", \"10:00\", 44.0, 35.0), True, 50.5)\n    _check_unsafe(_reading(\"2026-08-02\", \"09:30\", 38.0, 65.0), True, 48.2)\n    _check_unsafe(_reading(\"2026-07-14\", \"08:30\", 38.0, 55.0), True, 46.0)\n\n\ndef test_is_unsafe_mild_mornings():\n    _check_unsafe(_reading(\"2026-07-14\", \"07:00\", 30.0, 40.0), False, 31.6)\n    _check_unsafe(_reading(\"2026-07-15\", \"17:30\", 36.0, 40.0), False, 39.8)\n\n\ndef test_is_unsafe_july_lunchtime():\n    _check_unsafe(_reading(\"2026-07-14\", \"13:00\", 41.0, 20.0), True, 42.1)\n\n\ndef test_is_unsafe_early_june_lunchtime():\n    _check_unsafe(_reading(\"2026-06-10\", \"13:00\", 41.0, 20.0), False, 42.1)\n\n\ndef test_is_unsafe_around_lunchtime():\n    cases = [\n        (\"2026-07-14\", \"12:00\", False),\n        (\"2026-07-14\", \"12:30\", True),\n        (\"2026-07-14\", \"14:30\", True),\n        (\"2026-07-14\", \"15:00\", False),\n        (\"2026-06-14\", \"13:30\", False),\n        (\"2026-06-15\", \"13:30\", True),\n        (\"2026-09-15\", \"13:30\", True),\n        (\"2026-09-16\", \"13:30\", False),\n    ]\n    for date, time, expected in cases:\n        _check_unsafe(_reading(date, time, 40.0, 20.0), expected, 40.8)\n\n\n# ---------- unsafe_times ----------\n\ndef _check_times(result, expected):\n    assert isinstance(result, dict), (\n        f\"unsafe_times should give back a dictionary of date -> list of times, but it gave back {result!r}.\"\n    )\n    assert sorted(result) == sorted(expected), (\n        f\"Expected the dates {sorted(expected)}, but your dictionary has {sorted(result)}. \"\n        f\"Every date in the readings needs a key, even if it has no unsafe times.\"\n    )\n    for date in expected:\n        assert result[date] == expected[date], (\n            f\"Expected the unsafe times on {date} to be {expected[date]}, but your function gave {result[date]!r}.\"\n        )\n\n\ndef test_unsafe_times_groups_and_sorts():\n    readings = [\n        _reading(\"2026-07-14\", \"16:00\", 42.0, 45.0),   # feels like 50.1\n        _reading(\"2026-07-15\", \"10:30\", 40.0, 50.0),   # feels like 48.1\n        _reading(\"2026-07-14\", \"07:00\", 31.0, 60.0),   # feels like 35.9\n        _reading(\"2026-07-14\", \"09:00\", 38.0, 65.0),   # feels like 48.2\n        _reading(\"2026-07-15\", \"17:30\", 36.0, 40.0),   # feels like 39.8\n    ]\n    expected = {\"2026-07-14\": [\"09:00\", \"16:00\"], \"2026-07-15\": [\"10:30\"]}\n    _check_times(unsafe_times(readings), expected)\n\n\ndef test_unsafe_times_keeps_safe_dates():\n    readings = [\n        _reading(\"2026-06-10\", \"13:00\", 41.0, 18.0),   # feels like 41.6\n        _reading(\"2026-06-10\", \"09:00\", 36.0, 40.0),   # feels like 39.8\n        _reading(\"2026-07-14\", \"10:00\", 44.0, 35.0),   # feels like 50.5\n    ]\n    expected = {\"2026-06-10\": [], \"2026-07-14\": [\"10:00\"]}\n    _check_times(unsafe_times(readings), expected)\n\n\ndef test_unsafe_times_skips_none():\n    readings = [None, _reading(\"2026-07-15\", \"09:00\", 38.0, 65.0), None]\n    _check_times(unsafe_times(readings), {\"2026-07-15\": [\"09:00\"]})\n",
    "testFn": {
      "test_parse_reading_basic": "parse_reading",
      "test_parse_reading_strips_whitespace": "parse_reading",
      "test_parse_reading_skips_header_and_blank_lines": "parse_reading",
      "test_parse_reading_skips_glitches": "parse_reading",
      "test_is_unsafe_very_hot_mornings": "is_unsafe",
      "test_is_unsafe_mild_mornings": "is_unsafe",
      "test_is_unsafe_july_lunchtime": "is_unsafe",
      "test_is_unsafe_early_june_lunchtime": "is_unsafe",
      "test_is_unsafe_around_lunchtime": "is_unsafe",
      "test_unsafe_times_groups_and_sorts": "unsafe_times",
      "test_unsafe_times_keeps_safe_dates": "unsafe_times",
      "test_unsafe_times_skips_none": "unsafe_times"
    },
    "data": {
      "fileName": "site_sensors.csv",
      "csv": "time,site,temp_c,humidity\n2026-06-10 06:00,S1,30.5,62\n2026-06-10 06:30,S1,31.2,60\n2026-06-10 07:00,S1,32.0,57\n2026-06-10 07:30,S1,33.1,54\n2026-06-10 08:00,S1,34.0,50\n2026-06-10 08:30,S1,35.2,46\n2026-06-10 09:00,S1,36.1,42\n2026-06-10 09:30,S1,37.0,38\n2026-06-10 10:00,S1,38.0,33\n2026-06-10 10:30,S1,38.8,29\n2026-06-10 11:00,S1,39.5,25\n2026-06-10 11:30,S1,40.1,22\n2026-06-10 12:00,S1,40.6,20\n2026-06-10 12:30,S1,41.0,18\n2026-06-10 13:00,S1,41.3,17\n2026-06-10 13:30,S1,41.4,17\n2026-06-10 14:00,S1,41.2,18\n2026-06-10 14:30,S1,40.8,19\n2026-06-10 15:00,S1,40.1,21\n2026-06-10 15:30,S1,39.4,ERR\n2026-06-10 16:00,S1,38.5,27\n2026-06-10 16:30,S1,37.6,31\n2026-06-10 17:00,S1,36.4,35\n2026-06-10 17:30,S1,35.3,40\n2026-06-10 18:00,S1,34.2,44\n2026-07-14 06:00,S1,32.5,74\n2026-07-14 06:30,S1,ERR,72\n2026-07-14 07:00,S1,34.0,70\n2026-07-14 07:30,S1,34.8,68\n2026-07-14 08:00,S1,35.6,67\n2026-07-14 08:30,S1,36.5,63\n2026-07-14 09:00,S1,37.3,65\n2026-07-14 09:30,S1,38.2,62\n2026-07-14 10:00,S1,39.0,58\n2026-07-14 10:30,S1,39.8,51\n2026-07-14 11:00,S1,40.6,42\n2026-07-14 11:30,S1,41.3,32\n2026-07-14 12:00,S1,41.9,26\n2026-07-14 12:30,S1,42.4,21\n2026-07-14 13:00,S1,42.8,18\n2026-07-14 13:30,S1,43.1,16\n2026-07-14 14:00,S1,43.0,17\n2026-07-14 14:30,S1,42.7,20\n2026-07-14 15:00,S1,42.1,26\n2026-07-14 15:30,S1,41.3,36\n2026-07-14 16:00,S1,40.2,44\n2026-07-14 16:30,S1,39.0,45\n2026-07-14 17:00,S1,37.6,52\n2026-07-14 17:30,S1,36.5,56\n2026-07-14 18:00,S1,35.6,60\n2026-07-15 06:00,S1,33.0,78\n2026-07-15 06:30,S1,33.8,76\n2026-07-15 07:00,S1,34.6,74\n2026-07-15 07:30,S1,35.5,72\n2026-07-15 08:00,S1,36.3,73\n2026-07-15 08:30,S1,37.2,69\n2026-07-15 09:00,S1,38.0,65\n2026-07-15 09:30,S1,38.9,60\n2026-07-15 10:00,S1,39.7,ERR\n2026-07-15 10:30,S1,40.5,49\n2026-07-15 11:00,S1,41.2,43\n2026-07-15 11:30,S1,41.9,36\n2026-07-15 12:00,S1,42.5,31\n2026-07-15 12:30,S1,43.0,28\n2026-07-15 13:00,S1,43.4,25\n2026-07-15 13:30,S1,43.6,24\n2026-07-15 14:00,S1,43.5,25\n2026-07-15 14:30,S1,43.1,28\n2026-07-15 15:00,S1,42.5,32\n2026-07-15 15:30,S1,41.7,37\n2026-07-15 16:00,S1,40.6,42\n2026-07-15 16:30,S1,39.4,47\n2026-07-15 17:00,S1,38.1,51\n2026-07-15 17:30,S1,37.0,57\n2026-07-15 18:00,S1,36.1,62\n"
    },
    "demo": "# Demo for BRD-08: runs the student's functions on site_sensors.csv (DATA_CSV) and prints one JSON line.\nimport json\nimport math\n\n\ndef _shadowday_demo():\n    def short(value):\n        text = repr(value)\n        return text if len(text) <= 80 else text[:77] + \"...\"\n\n    def feels(temp_c, humidity):\n        vapour = humidity / 100 * 6.105 * math.exp(17.27 * temp_c / (237.7 + temp_c))\n        return round(temp_c + 0.33 * vapour - 4.0, 1)\n\n    day = \"2026-07-14\"\n    readings = [parse_reading(line) for line in DATA_CSV.splitlines()]\n    todays = [r for r in readings if isinstance(r, dict) and r.get(\"date\") == day]\n    if not todays:\n        raise ValueError(\n            \"parse_reading didn't give back any readings for \" + day + \", so there is nothing to chart yet. \"\n            \"Finish parse_reading, then run the demo again.\"\n        )\n    times = unsafe_times(readings)\n    if not isinstance(times, dict):\n        raise ValueError(\"unsafe_times gave back \" + short(times) + \" instead of a dictionary of date -> times.\")\n    unsafe = times.get(day, [])\n    if not isinstance(unsafe, list):\n        raise ValueError(\"unsafe_times gave \" + short(unsafe) + \" for \" + day + \" instead of a list of times.\")\n\n    series = []\n    for r in sorted(todays, key=lambda r: str(r.get(\"time\"))):\n        value = feels(float(r[\"temp\"]), float(r[\"humidity\"]))\n        series.append({\"label\": str(r[\"time\"]), \"value\": value, \"flagged\": r[\"time\"] in unsafe})\n    n = sum(1 for p in series if p[\"flagged\"])\n    total = len(series)\n\n    if n == 0:\n        en = \"Your code marked none of the %d readings on 14 July as unsafe for outdoor work at Fatima's site.\" % total\n        ar = \"لم يصنّف الكود الذي كتبته أياً من القراءات الـ%d يوم 14 يوليو على أنها غير آمنة للعمل في الهواء الطلق في موقع فاطمة.\" % total\n    else:\n        en = \"Your code marked %d of %d half-hour readings on 14 July as unsafe for outdoor work at Fatima's site.\" % (n, total)\n        ar = \"صنّف الكود الذي كتبته %d من أصل %d قراءة (كل نصف ساعة) يوم 14 يوليو على أنها غير آمنة للعمل في الهواء الطلق في موقع فاطمة.\" % (n, total)\n\n    result = {\n        \"title\": \"Feels-like temperature at Fatima's site, 14 July 2026\",\n        \"unit\": \"°C\",\n        \"series\": series,\n        \"summary\": {\"en\": en, \"ar\": ar},\n    }\n    print(json.dumps(result, ensure_ascii=False, allow_nan=False))\n\n\n_shadowday_demo()\n",
    "functions": [
      {
        "name": "parse_reading",
        "signature": "parse_reading(line: str) -> dict | None",
        "summary": {
          "en": "Turn one line of the CSV into a reading, or None for a line to skip.",
          "ar": "حوّل سطراً واحداً من ملف CSV إلى قراءة، أو None إذا كان يجب تجاهل السطر."
        }
      },
      {
        "name": "is_unsafe",
        "signature": "is_unsafe(reading: dict) -> bool",
        "summary": {
          "en": "Decide whether outdoor work is unsafe at the time of one reading.",
          "ar": "قرّر إن كان العمل في الهواء الطلق غير آمن في وقت قراءة معيّنة."
        }
      },
      {
        "name": "unsafe_times",
        "signature": "unsafe_times(readings: list) -> dict",
        "summary": {
          "en": "List the unsafe times for every date, sorted.",
          "ar": "اذكر الأوقات غير الآمنة لكل تاريخ، مرتبة."
        }
      }
    ],
    "hidden": {
      "rule": {
        "en": "Any reading that feels like 46 °C or more is unsafe, on any day of the year. On top of that, from June 15 to September 15 the UAE midday break applies: no outdoor work from 12:30 until 3:00 pm, so any reading from 12:30 up to (but not including) 15:00 is unsafe, whatever the temperature. Before June 15 and after September 15, the break doesn't apply.",
        "ar": "أي قراءة تكون فيها درجة الحرارة المحسوسة 46 درجة مئوية أو أكثر غير آمنة، في أي يوم من أيام السنة. وفوق ذلك، تُطبَّق في الإمارات استراحة منتصف النهار من 15 يونيو إلى 15 سبتمبر: لا عمل في الهواء الطلق من الساعة 12:30 حتى الساعة 3:00 عصراً، لذلك فإن أي قراءة من 12:30 حتى ما قبل 15:00 غير آمنة مهما كانت درجة الحرارة. أما قبل 15 يونيو وبعد 15 سبتمبر فلا تُطبَّق الاستراحة."
      },
      "revealKeywords": [
        "unsafe",
        "safe",
        "safety",
        "rule",
        "rules",
        "other rules",
        "danger",
        "when should",
        "stop work",
        "stop working",
        "break",
        "midday",
        "غير آمن",
        "آمن",
        "السلامة",
        "القواعد",
        "القاعدة",
        "قواعد أخرى",
        "خطر",
        "متى",
        "إيقاف العمل",
        "يتوقف",
        "استراحة",
        "منتصف النهار"
      ],
      "revealMarkers": [
        "12:30",
        "3:00 pm",
        "3 pm",
        "3pm",
        "15:00",
        "june 15",
        "June 15",
        "15 june",
        "15 June",
        "september 15",
        "September 15",
        "15 september",
        "15 September",
        "midday break",
        "Midday break",
        "١٢:٣٠",
        "١٥:٠٠",
        "15 يونيو",
        "١٥ يونيو",
        "15 سبتمبر",
        "١٥ سبتمبر",
        "استراحة منتصف النهار",
        "الثالثة عصراً",
        "3:00 عصراً"
      ]
    },
    "hints": {
      "parse_reading": [
        {
          "level": 1,
          "text": {
            "en": "Look at '2026-07-14 13:30,S1,44.0,35'. The first column holds two things. How can you pull them apart?",
            "ar": "انظر إلى السطر `2026-07-14 13:30,S1,44.0,35`. العمود الأول يحتوي على شيئين. كيف تفصل بينهما؟"
          }
        },
        {
          "level": 2,
          "text": {
            "en": "split(',') cuts the line into columns, and split() with nothing inside the brackets cuts '2026-07-14 13:30' at the space. The in operator tells you whether 'ERR' or an empty string is anywhere in a list. float() turns text into a number.",
            "ar": "الدالة `split(',')` تقطع السطر إلى أعمدة، و `split()` من دون أي شيء بين القوسين تقطع `'2026-07-14 13:30'` عند المسافة. والعامل `in` يخبرك إن كان `'ERR'` أو نص فارغ موجوداً في أي مكان من القائمة. أما `float()` فتحوّل النص إلى عدد."
          }
        },
        {
          "level": 3,
          "text": {
            "en": "1. Strip the line.\n2. Give back None for a blank line or the header.\n3. Split it on commas into four parts.\n4. If any part is 'ERR' or empty, give back None.\n5. Split the first part at the space into the date and the time.\n6. Build the dictionary with the date, the time, the site, and temp and humidity as floats, and give it back.",
            "ar": "1. أزل المسافات من طرفي السطر.\n2. أعد None إذا كان السطر فارغاً أو كان سطر العناوين.\n3. اقسم السطر عند الفواصل إلى أربعة أجزاء.\n4. إذا كان أي جزء 'ERR' أو فارغاً، أعد None.\n5. اقسم الجزء الأول عند المسافة إلى التاريخ والوقت.\n6. كوّن القاموس بالتاريخ والوقت والموقع، ودرجة الحرارة والرطوبة كعددين عشريين (float)، ثم أعده."
          }
        }
      ],
      "is_unsafe": [
        {
          "level": 1,
          "text": {
            "en": "feels_like() already handles the heat. Is a high feels-like temperature really the only thing that makes outdoor work unsafe at Fatima's site? Who would know?",
            "ar": "الدالة `feels_like()` تتولى أمر الحرارة. لكن هل ارتفاع درجة الحرارة المحسوسة هو فعلاً الشيء الوحيد الذي يجعل العمل في الهواء الطلق غير آمن في موقع فاطمة؟ من يعرف الجواب؟"
          }
        },
        {
          "level": 2,
          "text": {
            "en": "Call feels_like() with the reading's temp and humidity, and compare the answer using >=. Text like '13:30' or '07-14' compares in the right order with < and <=, and slicing can keep just the month and day of a date.",
            "ar": "استدعِ `feels_like()` بدرجة حرارة القراءة ورطوبتها، وقارن الناتج باستخدام `>=`. والنصوص مثل `'13:30'` أو `'07-14'` تُقارَن بالترتيب الصحيح باستخدام `<` و `<=`، ويمكن للتقطيع (slicing) أن يحتفظ بالشهر واليوم فقط من التاريخ."
          }
        },
        {
          "level": 3,
          "text": {
            "en": "1. Ask Fatima for her complete safety rules, and write each one in a comment.\n2. Work out the feels-like temperature with feels_like() and check it against her heat rule.\n3. Check any of her rules that depend on the date or the time of day.\n4. Give back True if any rule says unsafe, otherwise False.",
            "ar": "1. اطلب من فاطمة قواعد السلامة كاملة، واكتب كل قاعدة في تعليق.\n2. احسب درجة الحرارة المحسوسة باستخدام `feels_like()` وافحصها حسب قاعدة الحرارة عندها.\n3. افحص أي قاعدة من قواعدها تعتمد على التاريخ أو على وقت اليوم.\n4. أعد True إذا قالت أي قاعدة إن الوضع غير آمن، وإلا فأعد False."
          }
        }
      ],
      "unsafe_times": [
        {
          "level": 1,
          "text": {
            "en": "Every date in the readings needs a key, even a date with no unsafe times. When should you add that key?",
            "ar": "كل تاريخ في القراءات يحتاج إلى مفتاح، حتى التاريخ الذي ليس فيه أي وقت غير آمن. متى يجب أن تضيف ذلك المفتاح؟"
          }
        },
        {
          "level": 2,
          "text": {
            "en": "A dictionary of lists. Add an empty list the first time you see a date, use append() to add unsafe times, and sort() each list at the end. Let is_unsafe() make the decision for you.",
            "ar": "قاموس من القوائم. أضف قائمة فارغة أول مرة ترى فيها تاريخاً، واستخدم `append()` لإضافة الأوقات غير الآمنة، ثم `sort()` لترتيب كل قائمة في النهاية. ودع `is_unsafe()` تتخذ القرار عنك."
          }
        },
        {
          "level": 3,
          "text": {
            "en": "1. Start with an empty dictionary.\n2. Loop over the readings and skip any that are None.\n3. If the date isn't in the dictionary yet, add it with an empty list.\n4. If is_unsafe() says the reading is unsafe, append its time to that date's list.\n5. After the loop, sort every list.\n6. Give back the dictionary.",
            "ar": "1. ابدأ بقاموس فارغ.\n2. مرّ على القراءات وتجاوز أي قراءة قيمتها None.\n3. إذا لم يكن التاريخ في القاموس بعد، فأضفه مع قائمة فارغة.\n4. إذا قالت `is_unsafe()` إن القراءة غير آمنة، فأضف وقتها إلى قائمة ذلك التاريخ.\n5. بعد انتهاء الحلقة، رتّب كل قائمة.\n6. أعد القاموس."
          }
        }
      ]
    },
    "conceptTags": [
      {
        "en": "string parsing",
        "ar": "تحليل النصوص"
      },
      {
        "en": "booleans",
        "ar": "القيم المنطقية"
      },
      {
        "en": "comparing strings",
        "ar": "مقارنة النصوص"
      },
      {
        "en": "dictionaries of lists",
        "ar": "قواميس من القوائم"
      }
    ]
  },
};

/** "This dataset is fictional" note for each ticket's data file. */
export const DATA_NOTES: Partial<Record<ArchetypeId, L10n>> = {
  water: {"en":"This dataset is fictional. It was made up for Shadowday and does not come from a real farm.","ar":"هذه البيانات خيالية، أُعدّت خصيصاً لـ Shadowday وليست من مزرعة حقيقية."},
  floods: {"en":"This dataset is fictional. It was made up for Shadowday and does not come from real rain gauges.","ar":"هذه البيانات خيالية، أُعدّت خصيصاً لـ Shadowday وليست من مقاييس أمطار حقيقية."},
  heat: {"en":"This dataset is fictional. It was made up for Shadowday and does not come from a real construction site.","ar":"هذه البيانات خيالية، أُعدّت خصيصاً لـ Shadowday وليست من موقع بناء حقيقي."},
};
