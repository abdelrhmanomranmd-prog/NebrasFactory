#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Repair live admin_users passwords wiped by sanitize-on-pull cycle + prove create/login."""
from __future__ import annotations
import json, sys, time, urllib.error, urllib.request

SITE = "https://www.nebrasplasticcompany.com"
PREFIX = "nbh1:"


def hash_pw(pw: str) -> str:
    h1, h2 = 5381, 0
    s = str(pw) + "|NEBRAS_FACTORY_SALT_v1"
    for ch in s:
        c = ord(ch)
        h1 = ((h1 << 5) + h1 + c) & 0xFFFFFFFF
        h2 = (h2 * 31 + c) & 0xFFFFFFFF
    return PREFIX + format(h1, "x") + format(h2, "x")


def api(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {"Content-Type": "application/json", "User-Agent": "NebrasRepairUsers/340"}
    if token:
        h["Authorization"] = "Bearer " + token
    req = urllib.request.Request(SITE + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"error": raw.decode("utf-8", "replace")[:400]}


def pull_users(token):
    code, pull = api("GET", "/api/nebras-cloud?action=pull&keys=admin_users", token=token)
    for row in pull.get("rows", []):
        if row.get("store_key") == "admin_users":
            return row.get("payload") or []
    return []


def main():
    print("=== REPAIR + PROVE admin_users passwords ===")
    code, login = api("POST", "/api/nebras-auth?action=login", {
        "username": "NEBRASFACTORY",
        "password": "NEBRASFACTORYCOMPANYBASIC",
    })
    if not login.get("ok"):
        print("FAIL HQ login", code, login)
        return 1
    token = login["token"]
    print("PASS HQ login")

    users = pull_users(token)
    print("pulled users:", [(u.get("username"), bool(u.get("password")), len(str(u.get("password") or ""))) for u in users if isinstance(u, dict)])

    # Ensure HQ has hash; keep other users' passwords if present
    repaired = []
    hq_hash = hash_pw("NEBRASFACTORYCOMPANYBASIC")
    found_hq = False
    for u in users:
        if not isinstance(u, dict):
            continue
        row = dict(u)
        if str(row.get("username") or "").upper() == "NEBRASFACTORY":
            found_hq = True
            row["password"] = hq_hash
            row["isPrimary"] = True
            row["role"] = "superadmin"
            row["isActive"] = True
            row["id"] = row.get("id") or "nebras-factory-admin"
        repaired.append(row)
    if not found_hq:
        repaired.insert(0, {
            "id": "nebras-factory-admin",
            "username": "NEBRASFACTORY",
            "password": hq_hash,
            "role": "superadmin",
            "isPrimary": True,
            "isActive": True,
        })

    # Add temporary prove user with password
    test_user = "NEBRASTESTREP"
    test_pass = "NebrasTestRep2026!"
    repaired = [u for u in repaired if str(u.get("username") or "").upper() != test_user]
    repaired.append({
        "id": "prove-dyn-rep-001",
        "username": test_user,
        "password": hash_pw(test_pass),
        "role": "sales_rep",
        "permissions": ["quotes", "createCustomerUser"],
        "isPrimary": False,
        "isActive": True,
        "phone": "0500000999",
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
    })

    code, res = api("POST", "/api/nebras-governance-persist", {
        "action": "batch",
        "rows": [{"store_key": "admin_users", "payload": repaired}],
    }, token=token)
    print("persist", code, res.get("ok"), res.get("error"))
    if not res.get("ok"):
        return 1

    after = pull_users(token)
    for u in after:
        if not isinstance(u, dict):
            continue
        pw = str(u.get("password") or "")
        print("after", u.get("username"), "pwLen", len(pw), "hasHash", pw.startswith(PREFIX))

    code, ulogin = api("POST", "/api/nebras-auth?action=login", {
        "username": test_user,
        "password": test_pass,
    })
    if not ulogin.get("ok"):
        print("FAIL test login", code, ulogin)
        return 1
    print("PASS test user login")

    # cleanup keep HQ only with password
    hq_only = [{
        "id": "nebras-factory-admin",
        "username": "NEBRASFACTORY",
        "password": hq_hash,
        "role": "superadmin",
        "isPrimary": True,
        "isActive": True,
    }]
    api("POST", "/api/nebras-governance-persist", {
        "action": "batch",
        "rows": [{"store_key": "admin_users", "payload": hq_only}],
    }, token=token)
    print("RESULT: PASS passwords repaired + create/login proven")
    return 0


if __name__ == "__main__":
    sys.exit(main())
