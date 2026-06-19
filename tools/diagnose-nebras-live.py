"""Diagnose live Nebras API + HTML deploy."""
import json
import re
import urllib.error
import urllib.request

SITE = "https://www.nebrasplasticcompany.com"

def get(path):
    req = urllib.request.Request(SITE + path, headers={"User-Agent": "NebrasDiag/1"})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.status, r.read().decode("utf-8", "replace")

def post_json(path, body):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        SITE + path,
        data=data,
        headers={"Content-Type": "application/json", "User-Agent": "NebrasDiag/1"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"raw": raw[:500]}

def main():
    print("=== Nebras Live Diagnosis ===")
    st, html = get("/")
    m = re.search(r'data-nebras-deploy="([^"]+)"', html)
    print("deploy:", m.group(1) if m else "?")
    m2 = re.search(r'nebras-platform\.js\?v=([^"]+)', html)
    print("js:", m2.group(1) if m2 else "?")

    st, login = post_json("/api/nebras-auth?action=login", {
        "username": "NEBRASFACTORY",
        "password": "NEBRASFACTORYCOMPANYBASIC",
    })
    print("auth status:", st, "ok:", login.get("ok"), "error:", login.get("error"), "hint:", login.get("hint", ""))
    token = login.get("token") if isinstance(login, dict) else None
    if not token:
        print("STOP: API login failed — cloud save for users/HR will NOT work")
        return

    # Supabase anon read (public keys only — never push test data to production)
    try:
        url = "https://oedldllrjavofpeaputz.supabase.co/rest/v1/nebras_data_store?select=store_key,updated_at&store_key=eq.site_products&limit=1"
        req2 = urllib.request.Request(url, headers={
            "apikey": "sb_publishable_bt6rlHxu_pjc1xpkKEWOcg_HZ43JMR0",
            "Authorization": "Bearer sb_publishable_bt6rlHxu_pjc1xpkKEWOcg_HZ43JMR0",
        })
        with urllib.request.urlopen(req2, timeout=30) as r:
            rows = json.loads(r.read().decode())
            if rows:
                print("supabase site_products updated_at:", rows[0].get("updated_at"))
            else:
                print("supabase site_products: no row yet")
    except urllib.error.HTTPError as e:
        print("supabase read:", e.code, e.read().decode()[:200])

if __name__ == "__main__":
    main()
