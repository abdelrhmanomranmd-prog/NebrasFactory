# -*- coding: utf-8 -*-
import json
import re
import time
import urllib.request

base = "https://www.nebrasplasticcompany.com"
deadline = time.time() + 240

while time.time() < deadline:
    try:
        html = urllib.request.urlopen(base + "/", timeout=40).read().decode("utf-8", "replace")
        m = re.search(r'data-nebras-deploy="([^"]+)"', html)
        v = m.group(1) if m else "?"
        print("deploy", v)
        if v == "hrws220":
            js = urllib.request.urlopen(base + "/js/nebras-aluminum-cutting.js?v=hrws220", timeout=40).read().decode("utf-8", "replace")
            integ = urllib.request.urlopen(base + "/js/nebras-platform-integrity.js?v=hrws220", timeout=40).read().decode("utf-8", "replace")
            health = urllib.request.urlopen(base + "/api/health", timeout=40)
            hdata = json.loads(health.read().decode("utf-8", "replace"))
            ok = (
                "validateAluEstimateForWorkshop" in js
                and "sys-technal" in js
                and "sys-custom-generic" in js
                and "aluminum_systems" in integ
                and "nebrasDailySnapStamp" in integ
                and hdata.get("ok") is True
                and hdata.get("upgrade") == "hrws220"
            )
            print("markers", ok, "health", hdata.get("ok"), hdata.get("supabase"))
            raise SystemExit(0 if ok else 2)
    except SystemExit:
        raise
    except Exception as e:
        print("wait", e)
    time.sleep(8)
raise SystemExit(1)
