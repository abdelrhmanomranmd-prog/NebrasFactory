# -*- coding: utf-8 -*-
"""Prove hrws349: other products catalog + assets live."""
import json, time, urllib.request, ssl
BASE = "https://www.nebrasplasticcompany.com"
ctx = ssl.create_default_context()

def get(path):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "NebrasProve/349"})
    with urllib.request.urlopen(req, context=ctx, timeout=45) as r:
        return r.status, r.read()

def ok(name, cond, detail=""):
    print(("PASS" if cond else "FAIL"), name, detail or "")
    return bool(cond)

results = []
# wait deploy
tag = ""
for i in range(24):
    try:
        code, body = get("/")
        html = body.decode("utf-8", "replace")
        import re
        m = re.search(r'data-nebras-deploy="([^"]+)"', html)
        tag = m.group(1) if m else ""
        print("poll", i, tag)
        if tag == "hrws349":
            break
    except Exception as e:
        print("poll err", e)
    time.sleep(8)

results.append(ok("deploy", tag == "hrws349", tag))

code, body = get("/js/nebras-platform.js?v=hrws349")
js = body.decode("utf-8", "replace")
results.append(ok("seedOtherCatalog", "function seedOtherCatalog" in js))
results.append(ok("other_sub_wpc_acc", "other-wpc-accessories" in js))
results.append(ok("other_sub_foam", "other-foam" in js and "OTH-FOAM-XPS" in js))
results.append(ok("other_sub_silicone", "other-silicone" in js and "OTH-SIL-CLEAR" in js))
results.append(ok("other_sub_rolls", "other-color-rolls" in js and "OTH-ROLL-OAK" in js))
results.append(ok("hq_price_label", "storeOtherPriceByHq" in js or "السعر من الإدارة الرئيسية" in js))
results.append(ok("has_acc_sku", "OTH-ACC-SET" in js and "OTH-ACC-HANDLE" in js))
results.append(ok("stub_filtered_in_seed", "OTH-001" in js and "sku !== 'OTH-001'" in js))

assets = [
    "/images/catalog/other/by-sku/OTH-ACC-SET.png",
    "/images/catalog/other/by-sku/OTH-FOAM-XPS.png",
    "/images/catalog/other/by-sku/OTH-SIL-CLEAR.png",
    "/images/catalog/other/by-sku/OTH-ROLL-OAK.png",
    "/images/rolls/NEB-1.jpg",
]
for a in assets:
    try:
        code, body = get(a)
        results.append(ok("asset " + a.split("/")[-1], code == 200 and len(body) > 500, str(len(body))))
    except Exception as e:
        results.append(ok("asset " + a.split("/")[-1], False, str(e)))

print("RESULT", sum(1 for x in results if x), "/", len(results))
raise SystemExit(0 if all(results) else 1)
