#!/usr/bin/env python3
"""Verify hrws258: real factory door photos live, per-selection, 360°."""
import re
import sys
import time
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'
TARGET = 'hrws258'


def get(path):
    req = urllib.request.Request(
        SITE + path,
        headers={'User-Agent': 'NebrasVerify/258', 'Cache-Control': 'no-cache'},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.status, r.read().decode('utf-8', 'replace')


def main():
    issues = []
    for attempt in range(15):
        issues = []
        try:
            st, html = get('/')
            dep = re.search(r'data-nebras-deploy="([^"]+)"', html)
            ver = dep.group(1) if dep else None
            print('attempt', attempt + 1, 'deploy=', ver)

            st2, health = get('/api/health')
            up = re.search(r'"upgrade"\s*:\s*"([^"]+)"', health)

            jv = ver or TARGET
            st3, js = get('/js/nebras-platform.js?v=' + jv)

            flags = {
                'deploy': ver == TARGET,
                'health': (up.group(1) if up else None) == TARGET,
                'photo_live': 'DOOR_DESIGNER_LIVE_USE_PHOTO_PRESETS = true' in js,
                'per_model': 'DOOR_PHOTO_PRESET_MAP' in js and "mode: 'bake-transom'" in js,
                'rot_360': 'const ROT_MIN = -180' in js and 'const ROT_MAX = 180' in js,
                'data_seed': 'v33-factory-photo-live' in js,
                'cache_36': "DOOR_PHOTO_PRESET_CACHE = '36'" in js,
            }
            for k, v in flags.items():
                print(' ', k, v)
                if not v:
                    issues.append(k)

            if not issues:
                print('RESULT: PASS — hrws258 live')
                return 0
        except Exception as e:
            issues = [str(e)]
            print('error', e)

        time.sleep(8)

    print('RESULT: FAILED', issues)
    return 1


if __name__ == '__main__':
    sys.exit(main())
