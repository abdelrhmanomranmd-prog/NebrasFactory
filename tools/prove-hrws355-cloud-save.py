#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""hrws355 — إثبات حي: السيرفر حي + حفظ لا يُرفض بالكامل + محتوى حي يُرفع."""
import json
import time
import urllib.error
import urllib.request

SITE = "https://www.nebrasplasticcompany.com"
TAG = "hrws355"
CHECKS = []


def ok(name, cond, detail=""):
    CHECKS.append((name, bool(cond), detail))
    print(("PASS" if cond else "FAIL"), name, detail)


def api(method, path, body=None, token=None, timeout=90):
    data = json.dumps(body).encode() if body is not None else None
    h = {"Content-Type": "application/json", "User-Agent": "NebrasHrws355/1", "Cache-Control": "no-cache"}
    if token:
        h["Authorization"] = "Bearer " + token
    req = urllib.request.Request(SITE + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"error": raw.decode("utf-8", "replace")[:300]}


def main():
    html = urllib.request.urlopen(SITE + "/", timeout=40).read().decode("utf-8", "replace")
    ok("live_deploy", f'data-nebras-deploy="{TAG}"' in html, TAG)

    plat = urllib.request.urlopen(SITE + f"/js/nebras-platform.js?v={TAG}", timeout=90).read().decode("utf-8", "replace")
    odoo = urllib.request.urlopen(SITE + f"/js/nebras-odoo-write.js?v={TAG}", timeout=60).read().decode("utf-8", "replace")
    secure = urllib.request.urlopen(SITE + f"/js/nebras-secure-cloud.js?v={TAG}", timeout=60).read().decode("utf-8", "replace")

    ok("fallback_live_content", "NEBRAS_LIVE_CONTENT_KEYS.slice()" in odoo or "محتوى الموقع الحي" in odoo)
    ok("no_fake_empty_success", "لا تعتبر الحفظ ناجحاً عندما لا يتبقى مفتاح" in odoo or "لا صلاحية رفع لهذه البيانات" in odoo)
    ok("batch_role_filter", "filterPersistableCloudRows" in secure or "no_allowed_rows" in secure)
    ok("snapshots_guard", "nebras_cloud_snapshots" in plat and "dirtySnap" in plat)
    ok("customer_reg_sensitive", "customer_registration_requests" in secure)

    code, health = api("GET", "/api/health")
    ok("health", code == 200 and health.get("ok") is True, str(health.get("supabase") or "")[:80])

    code, login = api("POST", "/api/nebras-auth?action=login", {
        "username": "NEBRASFACTORY",
        "password": "NEBRASFACTORYCOMPANYBASIC",
    })
    token = login.get("token")
    ok("hq_login", code == 200 and bool(token))
    if not token:
        print("RESULT FAIL")
        return 1

    # Mixed batch: allowed + unknown — must SAVE allowed (soft-skip), not reject all
    code, pulled = api("GET", "/api/nebras-cloud?action=pull&keys=system_settings", token=token)
    ss = (pulled.get("rows") or [{}])[0].get("payload") or {}
    marker = "_hrws355_" + str(int(time.time()))[-6:]
    ss2 = dict(ss) if isinstance(ss, dict) else {}
    ss2[marker] = True
    code, data = api("POST", "/api/nebras-governance-persist", {
        "action": "batch",
        "rows": [
            {"store_key": "system_settings", "payload": ss2},
            {"store_key": "cnc", "payload": {"x": 1}},
        ],
    }, token=token)
    ok("soft_skip_batch", code == 200 and data.get("ok") is True and "system_settings" in (data.get("keys") or []),
       str(data)[:180])

    code, pulled2 = api("GET", "/api/nebras-cloud?action=pull&keys=system_settings", token=token)
    ss3 = (pulled2.get("rows") or [{}])[0].get("payload") or {}
    ok("roundtrip_marker", isinstance(ss3, dict) and ss3.get(marker) is True)

    # cleanup marker
    ss4 = dict(ss3)
    ss4.pop(marker, None)
    api("POST", "/api/nebras-governance-persist", {
        "action": "batch",
        "rows": [{"store_key": "system_settings", "payload": ss4}],
    }, token=token)

    # live content batch
    code, pulled3 = api("GET", "/api/nebras-cloud?action=pull&keys=site_products,showroom_gallery,branches", token=token)
    rows = pulled3.get("rows") or []
    code, data = api("POST", "/api/nebras-governance-persist", {
        "action": "batch",
        "rows": [{"store_key": r["store_key"], "payload": r.get("payload")} for r in rows if r.get("store_key")],
    }, token=token)
    ok("live_content_persist", code == 200 and data.get("ok") is True and int(data.get("count") or 0) >= 1,
       str({"count": data.get("count"), "keys": data.get("keys")}))

    failed = [n for n, c, _ in CHECKS if not c]
    print("RESULT", "PASS" if not failed else "FAIL", f"{len(CHECKS)-len(failed)}/{len(CHECKS)}")
    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
