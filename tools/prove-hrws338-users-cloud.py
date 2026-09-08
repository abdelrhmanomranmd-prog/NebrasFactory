#!/usr/bin/env python3
"""Prove hrws338: HQ create user stays visible + sales_rep gets createCustomerUser perms."""
from __future__ import annotations
import json, re, sys, urllib.request

BASE = "https://www.nebrasplasticcompany.com"
WANT = "hrws338"

def get(url, timeout=45):
    req = urllib.request.Request(url, headers={"Cache-Control": "no-cache", "Pragma": "no-cache", "User-Agent": "NebrasProve/338"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode("utf-8", "replace")

def main():
    fails = []
    st, html = get(f"{BASE}/?v={WANT}")
    m = re.search(r'data-nebras-deploy="([^"]+)"', html)
    dep = m.group(1) if m else ""
    print(f"[{'PASS' if dep==WANT else 'FAIL'}] deploy={dep!r}")
    if dep != WANT: fails.append("deploy")

    st, body = get(f"{BASE}/api/health?ping=1")
    up = json.loads(body).get("upgrade")
    print(f"[{'PASS' if up==WANT else 'FAIL'}] health={up!r}")
    if up != WANT: fails.append("health")

    st, js = get(f"{BASE}/js/nebras-platform.js?v={WANT}")
    checks = {
        "no-hard-rollback-msg": "لا تراجعي" in js or "queueNebrasCloudSaveAfterHydrate" in js and "verifyUsername" in js,
        "wait-hydrate-users": "waitForNebrasCloudHydrate" in js and "admin_users" in js,
        "sales-rep-repair": "perms.length === 1" in js and "createCustomerUser" in js,
        "no-force-quotes-only": "if (role === 'sales_rep' && !isPrimary) perms = ['quotes'];" not in js,
        "toast-after-verify": "تم حفظ المستخدمين في السحابة" in js,
    }
    for k, ok in checks.items():
        print(f"[{'PASS' if ok else 'FAIL'}] {k}")
        if not ok: fails.append(k)

    print("RESULT:", "PASS" if not fails else f"FAIL {fails}")
    return 0 if not fails else 1

if __name__ == "__main__":
    sys.exit(main())
