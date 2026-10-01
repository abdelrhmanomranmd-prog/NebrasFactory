# -*- coding: utf-8 -*-
"""Download Riwaq Nebras door/aluminum/cladding images into Nebras catalog paths."""
import json
import os
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

SITE = "https://www.riwaqnebras.com"
ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "tools" / "_riwaq_cache_riwaq-data.js"
OUT_DOORS = ROOT / "images" / "riwaq-import" / "doors"
OUT_ALU = ROOT / "images" / "riwaq-import" / "aluminum"
OUT_CLAD = ROOT / "images" / "riwaq-import" / "cladding"
OUT_CAT = ROOT / "images" / "riwaq-import" / "catalog"
MAP_PATH = ROOT / "tools" / "riwaq-import-map.json"

UA = {"User-Agent": "NebrasRiwaqImport/1", "Accept": "image/*,*/*"}


def fetch_bytes(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read(), r.headers.get("Content-Type", "")


def ensure_dirs():
    for d in (OUT_DOORS, OUT_ALU, OUT_CLAD, OUT_CAT):
        d.mkdir(parents=True, exist_ok=True)


def collect_paths():
    text = DATA.read_text(encoding="utf-8")
    imgs = re.findall(r'["\'](assets/images/[^"\']+\.(?:png|jpg|jpeg|webp|avif))["\']', text, re.I)
    # also generate doorImage-style candidates that may exist on server even if not listed
    families = [
        "wpc-flat", "wpc-classic", "wpc-glass",
        "upvc-flat", "upvc-classic", "upvc-glass",
    ]
    finishes = ["single", "quarter", "half", "double"]
    looks = ["walnut", "white", "groove", "anthracite", "cream", "twolite"]
    for fam in families:
        for fin in finishes:
            for look in looks:
                imgs.append("assets/images/doors/%s-%s-%s.png" % (fam, fin, look))
            imgs.append("assets/images/doors/%s-%s.png" % (fam, fin))
    # category covers + hero door/alu
    extras = [
        "assets/images/doors/wpc-classic-single.png",
        "assets/images/doors/upvc-glass-single.png",
        "assets/images/catalog/aluminum-curtain-wall.png",
        "assets/images/catalog/aluminum-sliding-window.png",
        "assets/images/catalog/aluminum-sliding-door.png",
        "assets/images/catalog/aluminum-cladding.png",
        "assets/images/catalog/aluminum-cladding-champagne.png",
        "assets/images/catalog/aluminum-sliding-window-bronze.png",
        "assets/images/catalog/aluminum-sliding-window-white.png",
        "assets/images/catalog/aluminum-sliding-door-bronze.png",
        "assets/images/hero-doors-hall.png",
        "assets/images/hero-reel-wpc-flat.png",
        "assets/images/hero-reel-doors-1.png",
        "assets/images/hero-reel-wpc-classic.png",
        "assets/images/hero-reel-wpc-glass.png",
        "assets/images/hero-reel-doors-2.png",
        "assets/images/hero-reel-doors-3.png",
        "assets/images/hero-reel-alu-windows.png",
        "assets/images/hero-reel-aluminum.png",
        "assets/images/hero-reel-alu-doors.png",
        "assets/images/hero-reel-alu-folding.png",
        "assets/images/hero-reel-aluminum-2.png",
    ]
    imgs.extend(extras)
    uniq = []
    seen = set()
    for u in imgs:
        u = u.replace("\\", "/")
        if u not in seen:
            seen.add(u)
            uniq.append(u)
    return uniq


def classify(rel):
    low = rel.lower()
    if "/doors/" in low or "wpc-" in low or "upvc-" in low or "hero-reel-wpc" in low or "hero-reel-doors" in low or "hero-doors" in low:
        return "doors"
    if "clad" in low:
        return "cladding"
    if "aluminum" in low or "alu-" in low or "hero-reel-alu" in low:
        return "aluminum"
    if "/catalog/" in low:
        return "catalog"
    return None


def local_name(rel):
    return rel.split("/")[-1]


def main():
    ensure_dirs()
    paths = collect_paths()
    wanted = [p for p in paths if classify(p)]
    print("candidates", len(wanted))
    mapping = {"doors": [], "aluminum": [], "cladding": [], "catalog": [], "failed": []}
    ok = 0
    for rel in wanted:
        kind = classify(rel)
        if not kind:
            continue
        url = SITE + "/" + rel
        name = local_name(rel)
        if kind == "doors":
            dest = OUT_DOORS / name
        elif kind == "aluminum":
            dest = OUT_ALU / name
        elif kind == "cladding":
            dest = OUT_CLAD / name
        else:
            dest = OUT_CAT / name
        if dest.exists() and dest.stat().st_size > 2000:
            print("SKIP exists", dest.relative_to(ROOT))
            mapping[kind].append({"src": rel, "dest": str(dest.relative_to(ROOT)).replace("\\", "/")})
            ok += 1
            continue
        try:
            data, ct = fetch_bytes(url)
            if len(data) < 800 or "html" in (ct or "").lower():
                print("FAIL small/html", rel, len(data), ct)
                mapping["failed"].append(rel)
                continue
            dest.write_bytes(data)
            print("OK", kind, name, len(data))
            mapping[kind].append({"src": rel, "dest": str(dest.relative_to(ROOT)).replace("\\", "/"), "bytes": len(data)})
            ok += 1
            time.sleep(0.05)
        except urllib.error.HTTPError as e:
            print("HTTP", e.code, rel)
            mapping["failed"].append(rel)
        except Exception as e:
            print("ERR", rel, e)
            mapping["failed"].append(rel)
    MAP_PATH.write_text(json.dumps(mapping, ensure_ascii=False, indent=2), encoding="utf-8")
    print("DONE ok", ok, "failed", len(mapping["failed"]))
    print("map", MAP_PATH)


if __name__ == "__main__":
    main()
