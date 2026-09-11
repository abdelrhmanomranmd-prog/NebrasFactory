# -*- coding: utf-8 -*-
import time, urllib.request, ssl, re
BASE = "https://www.nebrasplasticcompany.com"
ctx = ssl.create_default_context()

def get(path):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "NebrasProve/352"})
    with urllib.request.urlopen(req, context=ctx, timeout=45) as r:
        return r.status, r.read()

def ok(n, c, d=""):
    print(("PASS" if c else "FAIL"), n, d or "")
    return bool(c)

res = []
tag = ""
for i in range(24):
    try:
        _, b = get("/")
        html = b.decode("utf-8", "replace")
        m = re.search(r'data-nebras-deploy="([^"]+)"', html)
        tag = m.group(1) if m else ""
        print("poll", i, tag)
        if tag == "hrws352":
            break
    except Exception as e:
        print("poll err", e)
    time.sleep(8)

res.append(ok("deploy", tag == "hrws352", tag))
_, b = get("/js/nebras-platform.js?v=hrws352")
js = b.decode("utf-8", "replace")
res.append(ok("desk_render", "product-master-table--desk" in js))
res.append(ok("patch_fn", "function applyVariantPriceImagePatch" in js))
res.append(ok("pick_img", "function pmPickVariantImage" in js))
res.append(ok("queue_price", "function pmQueuePriceSave" in js))
res.append(ok("manage_idx", "manageProductVariants(productId, variantIndex)" in js))
res.append(ok("sync_pricelist_on_save", "sales_price_list" in js[js.find("applyVariantPriceImagePatch"):js.find("applyVariantPriceImagePatch")+900]))
_, cb = get("/css/33-product-governance.css?v=hrws352")
res.append(ok("desk_css", b"pm-desk-filter" in cb or b"pm-price-edit" in cb))
print("RESULT", sum(1 for x in res if x), "/", len(res))
raise SystemExit(0 if all(res) else 1)
