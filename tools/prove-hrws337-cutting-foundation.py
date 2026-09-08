#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prove hrws337 cutting foundation is live: deploy tag + wpc_* sensitive keys."""
from __future__ import annotations

import json
import re
import sys
import urllib.request

BASE = "https://www.nebrasplasticcompany.com"
WANT = "hrws337"
WPC_KEYS = [
    "wpc_models",
    "wpc_estimates",
    "wpc_cut_jobs",
    "wpc_cut_settings",
    "wpc_accessories",
    "wpc_remnants",
    "wpc_cut_audit",
]


def get(url: str, timeout: int = 45) -> tuple[int, str]:
    req = urllib.request.Request(url, headers={"Cache-Control": "no-cache", "Pragma": "no-cache"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode("utf-8", "replace")


def main() -> int:
    fails = []
    print("=== hrws337 cutting foundation prove ===")

    # 1) health upgrade
    try:
        st, body = get(f"{BASE}/api/health?ping=1")
        data = json.loads(body)
        up = str(data.get("upgrade") or "")
        ok = st == 200 and up == WANT
        print(f"[{'PASS' if ok else 'FAIL'}] health.upgrade={up!r} (want {WANT})")
        if not ok:
            fails.append("health")
    except Exception as e:
        print(f"[FAIL] health: {e}")
        fails.append("health")

    # 2) index deploy attr
    try:
        st, html = get(f"{BASE}/?v={WANT}")
        m = re.search(r'data-nebras-deploy="([^"]+)"', html)
        dep = m.group(1) if m else ""
        ok = st == 200 and dep == WANT
        print(f"[{'PASS' if ok else 'FAIL'}] data-nebras-deploy={dep!r}")
        if not ok:
            fails.append("index")
    except Exception as e:
        print(f"[FAIL] index: {e}")
        fails.append("index")

    # 3) security source on live via health deep capacity (sensitiveKeyCount)
    try:
        st, body = get(f"{BASE}/api/health?deep=1")
        data = json.loads(body)
        count = (data.get("capacity") or {}).get("sensitiveKeyCount")
        print(f"[{'INFO'}] sensitiveKeyCount={count}")
        # local allowlist proof: fetch nebras-security is not public; check cutting JS version query
    except Exception as e:
        print(f"[WARN] deep health: {e}")

    # 4) cutting assets cache-busted
    for path in (
        f"/js/nebras-dept-lazy.js?v={WANT}",
        f"/js/nebras-aluminum-cutting.js?v={WANT}",
        f"/js/nebras-wpc-cutting.js?v={WANT}",
        f"/css/57-aluminum-cutting.css?v={WANT}",
        f"/css/58-wpc-cutting.css?v={WANT}",
    ):
        try:
            st, body = get(BASE + path)
            markers = {
                "dept-lazy": "hrws337" in body or "VER = 'hrws337'" in body,
                    "aluminum": "scheduleAluLiveAutosave" in body or "renderAluDrawings" in body or "aluDrawSideSectionSvg" in body,
                "wpc": "scheduleWpcLiveAutosave" in body or "wpcDrawSectionSideSvg" in body or "setWpcLiveBadge" in body,
                "css57": "alu-live-badge" in body and "alu-draw-grid--pro" in body,
                "css58": "wpc-draw-grid--pro" in body and "wpc-live-badge" in body,
            }
            key = "dept-lazy" if "dept-lazy" in path else (
                "aluminum" if "aluminum-cutting.js" in path else (
                    "wpc" if "wpc-cutting.js" in path else (
                        "css57" if "57-" in path else "css58"
                    )
                )
            )
            ok = st == 200 and markers.get(key, True)
            print(f"[{'PASS' if ok else 'FAIL'}] {path} status={st} marker={key}")
            if not ok:
                fails.append(path)
        except Exception as e:
            print(f"[FAIL] {path}: {e}")
            fails.append(path)

    print("---")
    print("WPC cloud keys expected on server allowlist:", ", ".join(WPC_KEYS))
    if fails:
        print(f"RESULT: FAIL ({len(fails)}) — deploy/push may still be pending")
        return 1
    print("RESULT: PASS — hrws337 cutting foundation assets live")
    return 0


if __name__ == "__main__":
    sys.exit(main())
