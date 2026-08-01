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
    if v == "hrws213":
        js = urllib.request.urlopen(base + "/js/nebras-aluminum-cutting.js?v=hrws213", timeout=40).read().decode(
            "utf-8", "replace"
        )
        css = urllib.request.urlopen(base + "/css/57-aluminum-cutting.css?v=hrws213", timeout=40).read().decode(
            "utf-8", "replace"
        )
        checks = {
            "no complete.js": "nebras-aluminum-complete.js" not in html,
            "pricing_only": "pricing_only" in js and "بند تسعير فقط" in js,
            "editAluPart": "function editAluPart" in js,
            "openAluPartKit": "function openAluPartKit" in js,
            "scanAluBarcode": "function scanAluBarcode" in js,
            "exportCsv": "function exportAluCutCsv" in js,
            "exportDxf": "function exportAluCutDxf" in js,
            "supplierInvoice": "function addAluSupplierInvoice" in js,
            "double glass": "alu-glass-dbl" in js and "toggleAluGlassExtra" in js,
            "est search": "function setAluEstSearch" in js,
            "est tree": "alu-est-tree" in js,
            "warehouse": "consumeAluWarehouse" in js,
            "css toolbar": "alu-est-toolbar" in css,
            "css scan": "alu-scan-box" in css,
            "selftest 213": "pricing-only-total" in js and "double-glass-priced" in js,
            "print images export": "global.printAluImagesReport = printAluImagesReport" in js,
            "kit code": "·KIT·" in js,
        }
        for k, ok in checks.items():
            print(k, ok)
        raise SystemExit(0 if all(checks.values()) else 2)
raise SystemExit(1)
