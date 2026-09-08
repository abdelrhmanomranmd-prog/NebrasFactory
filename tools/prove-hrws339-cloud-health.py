#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prove hrws339 cloud health diagnostics are live."""
from __future__ import annotations
import json, re, sys, urllib.request

BASE = "https://www.nebrasplasticcompany.com"
WANT = "hrws339"

def get(url, timeout=45):
    req = urllib.request.Request(url, headers={"Cache-Control": "no-cache", "Pragma": "no-cache", "User-Agent": "NebrasProve/339"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode("utf-8", "replace")

def main():
    fails = []
    st, html = get(f"{BASE}/?v={WANT}")
    m = re.search(r'data-nebras-deploy="([^"]+)"', html)
    dep = m.group(1) if m else ""
    print(f"[{'PASS' if dep == WANT else 'FAIL'}] deploy={dep!r}")
    if dep != WANT:
        fails.append("deploy")

    for needle in ["cloud-health-board", "nebrasCloudDiagRunAndRender", "صحة السحابة والحوكمة"]:
        ok = needle in html
        print(f"[{'PASS' if ok else 'FAIL'}] index:{needle}")
        if not ok:
            fails.append(needle)

    st, health = get(f"{BASE}/api/health?deep=1")
    data = json.loads(health)
    ok = st == 200 and data.get("ok") is True and data.get("upgrade") == WANT
    print(f"[{'PASS' if ok else 'FAIL'}] health ok={data.get('ok')} upgrade={data.get('upgrade')!r} supabase={data.get('supabase')}")
    if not ok:
        fails.append("health")

    st, js = get(f"{BASE}/js/nebras-cloud-diagnostics.js?v={WANT}")
    markers = ["NebrasCloudDiag", "runFullDiagnose", "fetchLiveHealth", "CRITICAL_KEYS"]
    for mname in markers:
        ok = mname in js
        print(f"[{'PASS' if ok else 'FAIL'}] diag:{mname}")
        if not ok:
            fails.append(mname)

    st, plat = get(f"{BASE}/js/nebras-platform.js?v={WANT}")
    for mname in ["nebrasCloudDiagRunAndRender", "dash-cloud-health", "persist_ok", "wait_hydrate"]:
        ok = mname in plat
        print(f"[{'PASS' if ok else 'FAIL'}] platform:{mname}")
        if not ok:
            fails.append("plat:" + mname)

    st, lazy = get(f"{BASE}/js/nebras-dept-lazy.js?v={WANT}")
    ok = "nebras-cloud-diagnostics.js" in lazy and "hrws339" in lazy
    print(f"[{'PASS' if ok else 'FAIL'}] lazy loads diagnostics")
    if not ok:
        fails.append("lazy")

    st, css = get(f"{BASE}/css/31-cloud-security.css?v={WANT}")
    ok = "cloud-health-board" in css
    print(f"[{'PASS' if ok else 'FAIL'}] css cloud-health-board")
    if not ok:
        fails.append("css")

    # HQ create still works
    try:
        import subprocess
        r = subprocess.run([sys.executable, "tools/prove-hq-create-user-live.py"], cwd=".", capture_output=True, text=True, timeout=120)
        ok = r.returncode == 0 and "LIVE USER DYNAMICS OK" in (r.stdout or "")
        print(f"[{'PASS' if ok else 'FAIL'}] hq-create-user-live")
        if not ok:
            print((r.stdout or "")[-500:])
            print((r.stderr or "")[-300:])
            fails.append("hq-create")
    except Exception as e:
        print(f"[FAIL] hq-create exception: {e}")
        fails.append("hq-create")

    print("RESULT:", "PASS" if not fails else f"FAIL {fails}")
    return 0 if not fails else 1

if __name__ == "__main__":
    sys.exit(main())
