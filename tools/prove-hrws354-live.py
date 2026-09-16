import json
import ssl
import time
import urllib.error
import urllib.request

BASE = "https://www.nebrasplasticcompany.com"
CTX = ssl.create_default_context()


def request(path, method="GET", body=None, token=None):
    headers = {"User-Agent": "Nebras-hrws354-proof/1.0", "Cache-Control": "no-cache"}
    if body is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(body).encode("utf-8")
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, context=CTX, timeout=30) as res:
            return res.status, res.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as err:
        return err.code, err.read().decode("utf-8", "replace")


def check(name, ok):
    print(("PASS " if ok else "FAIL ") + name)
    return bool(ok)


for attempt in range(18):
    code, index = request("/?proof=hrws354-" + str(attempt))
    if code == 200 and 'data-nebras-deploy="hrws354"' in index:
        break
    print("poll", attempt, code, "hrws354" if "hrws354" in index else "old")
    time.sleep(5)

results = []
results.append(check("deploy_hrws354", code == 200 and 'data-nebras-deploy="hrws354"' in index))

_, platform = request("/js/nebras-platform.js?v=hrws354&proof=1")
_, css_loader = request("/js/nebras-admin-css-lazy.js?v=hrws354&proof=1")
_, dept_loader = request("/js/nebras-dept-lazy.js?v=hrws354&proof=1")
css_code, organizer_css = request("/css/68-hq-dashboard-organizer.css?v=hrws354")

results.append(check("single_tile_click", 'onclick="onDashboardTileClick' not in platform))
results.append(check("single_layer_observer", "subtree: false" in platform and "data-layer-state" in platform))
results.append(check("quote_request_dedupe", "salesQuotesCloudInFlight" in platform))
results.append(check("hq_organizer", "HQ_DASHBOARD_CATEGORIES" in platform and "filterHqDashboardTiles" in platform))
results.append(check("css_wait_and_dedupe", "Promise.all(ADMIN_CSS.map(loadOne))" in css_loader))
results.append(check("organizer_css", css_code == 200 and ".dashboard-hq-organizer" in organizer_css))
results.append(check("no_duplicate_odoo_bundle", "adminCore: [\n            'js/nebras-odoo-write.js'" not in dept_loader))
results.append(check("no_plain_hq_password_client", "NEBRASFACTORYCOMPANYBASIC" not in platform))

login_code, login_raw = request(
    "/api/nebras-auth?action=login",
    method="POST",
    body={"username": "NEBRASFACTORY", "password": "NEBRASFACTORYCOMPANYBASIC"},
)
try:
    login = json.loads(login_raw)
except json.JSONDecodeError:
    login = {}
token = login.get("token", "")
results.append(check("signed_login", login_code == 200 and login.get("ok") and bool(token)))

verify_code, verify_raw = request("/api/nebras-auth?action=verify", token=token)
try:
    verify = json.loads(verify_raw)
except json.JSONDecodeError:
    verify = {}
session = verify.get("session") or {}
scope_keys = {"hrScopeBranchId", "hrScopeDepartmentKey", "hrScopeCompanyId", "legalScopeCompanyId"}
results.append(check("live_session_validation_and_scopes", verify_code == 200 and verify.get("ok") and scope_keys.issubset(session)))

pull_code, pull_raw = request("/api/nebras-cloud?action=pull&keys=dashboard_tiles", token=token)
try:
    pull = json.loads(pull_raw)
except json.JSONDecodeError:
    pull = {}
results.append(check("signed_public_content_pull", pull_code == 200 and pull.get("ok") and isinstance(pull.get("rows"), list)))

print("RESULT", sum(results), "/", len(results))
raise SystemExit(0 if all(results) else 1)
