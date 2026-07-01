#!/usr/bin/env python3
import re
import time
import urllib.request

BASE = "https://www.nebrasplasticcompany.com/"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "NebrasVerify/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8", "replace"), resp.status


def main():
    for attempt in range(15):
        try:
            html, _ = fetch(BASE)
            if "hrws173" not in html:
                print("attempt", attempt + 1, "waiting")
                time.sleep(10)
                continue
            m = re.search(r"nebras-platform\.js\?v=([^\"']+)", html)
            ver = m.group(1) if m else "unknown"
            js, _ = fetch(BASE + "js/nebras-platform.js?v=" + ver)
            print("DEPLOY_OK", ver)
            print("refreshAdminDashboardAfterGovernanceSync:", "refreshAdminDashboardAfterGovernanceSync" in js)
            print("forceRestoreHqDashboardTilesFromDefaults:", "forceRestoreHqDashboardTilesFromDefaults" in js)
            print("admin-dashboard html:", 'id="admin-dashboard"' in html)
            return 0
        except Exception as exc:
            print("attempt", attempt + 1, "error", exc)
            time.sleep(10)
    print("DEPLOY_NOT_READY")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
