# -*- coding: utf-8 -*-
import urllib.request
import re
import time

base = "https://www.nebrasplasticcompany.com"
for i in range(30):
    time.sleep(12)
    html = urllib.request.urlopen(base + "/?_=" + str(time.time()), timeout=40).read().decode("utf-8", "replace")
    m = re.search(r'data-nebras-deploy="([^"]+)"', html)
    v = m.group(1) if m else "?"
    print(i + 1, v, flush=True)
    if v == "hrws214":
        js = urllib.request.urlopen(base + "/js/nebras-aluminum-cutting.js?v=hrws214", timeout=40).read().decode(
            "utf-8", "replace"
        )
        checks = {
            "warehouse tab": "مخزن الأعواد" in js and "function renderAluWarehouse" in js,
            "stock debit": "خصم من مخزن الأعواد التفصيلي" in js,
            "georgian draw": "شبكة جورجيا على الزجاج" in js,
            "cnc opt": "function exportAluCutCnc" in js and "NEBRAS-CNC-OPT" in js,
            "cnc button": "exportAluCutCnc()" in js,
            "materials geo": "كتالوج جورجيا" in js,
            "selftest 214": "warehouse-stock-debit" in js and "georgian-draw" in js,
            "no complete.js": "nebras-aluminum-complete.js" not in html,
        }
        for k, ok in checks.items():
            print(k, ok)
        raise SystemExit(0 if all(checks.values()) else 2)
raise SystemExit(1)
