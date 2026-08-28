#!/usr/bin/env python3
"""Verify hrws295 live — showroom sections + store worlds nav."""
import re
import sys
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def fetch(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasVerify/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    html = fetch('/')
    js = fetch('/js/nebras-platform.js?v=hrws295')
    seed = fetch('/js/nebras-profile-2026-seed.js')

    checks = {
        'deploy_hrws295': 'data-nebras-deploy="hrws295"' in html,
        'showroom_kitchens': "'kitchens'" in js or 'key: \'kitchens\'' in js,
        'showroom_aluminum': "'aluminum'" in js or 'key: \'aluminum\'' in js,
        'store_worlds_nav': 'buildStoreWorldsNavHtml' in js,
        'showroom_hub_hero': 'buildShowroomHubHeroHtml' in js,
        'catalog_version_10': 'SHOWROOM_CATALOG_VERSION = 10' in seed,
        'roll_cache_270': "DOOR_PHOTO_PRESET_CACHE = '270'" in js,
        'per_profile_clip': "sliding: { clip: '14%" in js,
    }
    ok = all(checks.values())
    for k, v in checks.items():
        print(('PASS' if v else 'FAIL'), k)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
