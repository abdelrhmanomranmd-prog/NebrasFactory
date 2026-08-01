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
    if v == "hrws212":
        js = urllib.request.urlopen(base + "/js/nebras-aluminum-cutting.js?v=hrws212", timeout=40).read().decode(
            "utf-8", "replace"
        )
        complete = urllib.request.urlopen(base + "/js/nebras-aluminum-complete.js?v=hrws212", timeout=40).read().decode(
            "utf-8", "replace"
        )
        css = urllib.request.urlopen(base + "/css/57-aluminum-cutting.css?v=hrws212", timeout=40).read().decode(
            "utf-8", "replace"
        )
        checks = {
            "complete script in index": "nebras-aluminum-complete.js?v=hrws212" in html,
            "glass-double in core": "glassMode === 'double'" in js or 'glassMode === "double"' in js,
            "pricing_only": "pricing_only" in js,
            "phone field": "alu-est-phone" in js,
            "toggle glass mode": "function toggleAluGlassModeFields" in js,
            "complete layer": "alu-complete" in complete and "aluMergePartKitsIntoAccessories" in complete,
            "warehouse": "مخزن أعواد" in complete,
            "est tree": "alu-est-tree" in complete,
            "code128": "encodeCode128B" in complete,
            "csv export": "exportAluCutCsv" in complete,
            "css toolbar": "alu-est-toolbar" in css,
            "css kit": "alu-kit-modal" in css or "#alu-kit-modal" in css,
            "selftest glass": "glass-double-layers" in js,
        }
        for k, ok in checks.items():
            print(k, ok)
        raise SystemExit(0 if all(checks.values()) else 2)
raise SystemExit(1)
