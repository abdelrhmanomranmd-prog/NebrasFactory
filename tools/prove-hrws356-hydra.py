#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re
import urllib.request

SITE = "https://www.nebrasplasticcompany.com"
TAG = "hrws356"
CHECKS = []


def ok(name, cond, detail=""):
    CHECKS.append((name, bool(cond), detail))
    print(("PASS" if cond else "FAIL"), name, detail)


def main():
    html = urllib.request.urlopen(SITE + "/", timeout=40).read().decode("utf-8", "replace")
    ok("deploy", f'data-nebras-deploy="{TAG}"' in html, TAG)
    ok("css_stage", "69-nebras-hydra-stage.css" in html)
    plat = urllib.request.urlopen(SITE + f"/js/nebras-platform.js?v={TAG}", timeout=90).read().decode("utf-8", "replace")
    ok("hydra_stage", "hydra-products" in plat and "buildNebrasHydraStageHtml" in plat)
    ok("doors_default", "header-showcase/door-01.png" in plat)
    ok("no_old_hydra_first", "hero-slide-11-wpc-guide" not in re.search(
        r"const HERO_SLIDESHOW_DEFAULT = \[([\s\S]*?)\];", plat
    ).group(1) if re.search(r"const HERO_SLIDESHOW_DEFAULT = \[([\s\S]*?)\];", plat) else "")
    css = urllib.request.urlopen(SITE + f"/css/69-nebras-hydra-stage.css?v={TAG}", timeout=40).read().decode("utf-8", "replace")
    ok("stage_css", "nebras-hydra-stage-doors" in css)
    hero = urllib.request.urlopen(SITE + f"/css/03-hero.css?v={TAG}", timeout=40).read().decode("utf-8", "replace")
    ok("cover_default", "object-fit: cover" in hero)
    door = urllib.request.urlopen(SITE + "/images/doors/header-showcase/door-01.png", timeout=40)
    ok("door_asset", door.status == 200)
    failed = [n for n, c, _ in CHECKS if not c]
    print("RESULT", "PASS" if not failed else "FAIL", f"{len(CHECKS)-len(failed)}/{len(CHECKS)}")
    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
