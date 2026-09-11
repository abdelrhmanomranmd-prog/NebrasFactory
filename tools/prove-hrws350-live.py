# -*- coding: utf-8 -*-
"""Prove hrws350 rolls vs colors + hydra full."""
import time, urllib.request, ssl, re
BASE = "https://www.nebrasplasticcompany.com"
ctx = ssl.create_default_context()

def get(path):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "NebrasProve/350"})
    with urllib.request.urlopen(req, context=ctx, timeout=45) as r:
        return r.status, r.read()

def ok(name, cond, detail=""):
    print(("PASS" if cond else "FAIL"), name, detail or "")
    return bool(cond)

results = []
tag = ""
for i in range(24):
    try:
        _, body = get("/")
        html = body.decode("utf-8", "replace")
        m = re.search(r'data-nebras-deploy="([^"]+)"', html)
        tag = m.group(1) if m else ""
        print("poll", i, tag)
        if tag == "hrws350":
            break
    except Exception as e:
        print("poll err", e)
    time.sleep(8)

results.append(ok("deploy", tag == "hrws350", tag))
_, body = get("/js/nebras-platform.js?v=hrws350")
js = body.decode("utf-8", "replace")
results.append(ok("other_v2", "OTHER_CATALOG_VERSION = 2" in js))
results.append(ok("rolls_not_colors_label", "labelAr: 'رولات'" in js and "رولات الألوان" not in js.split("OTHER_COLOR_ROLLS_SUBCATEGORY")[1][:400]))
results.append(ok("nebras_colors_sub", "other-nebras-colors" in js and "OTHER_NEBRAS_COLORS_SUBCATEGORY" in js))
results.append(ok("no_neb_sku_products", "OTH-ROLL-NEB1" not in js.split("DEFAULT_OTHER_VARIANTS")[1][:3500]))
results.append(ok("hydra_helper", "isNebrasHydraHeroSlide" in js and "hero-slide--hydra-full" in js))
results.append(ok("hydra_css_hero", "hero--hydra-full" in get("/css/03-hero.css?v=hrws350")[1].decode("utf-8", "replace")))
results.append(ok("hydra_css_header", "header-cinematic-slide--hydra-full" in get("/css/13-header-campaign.css?v=hrws350")[1].decode("utf-8", "replace")))
results.append(ok("fix_css", get("/css/67-other-hydra-fix.css?v=hrws350")[0] == 200))
results.append(ok("guide_asset", get("/images/hero-slide-11-wpc-guide.png")[0] == 200))
print("RESULT", sum(1 for x in results if x), "/", len(results))
raise SystemExit(0 if all(results) else 1)
