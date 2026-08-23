#!/usr/bin/env python3
"""Verify hrws259 live: factory photo, door contained inside frame."""
import re
import sys
import time
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'
TARGET = 'hrws259'


def get(path):
    req = urllib.request.Request(
        SITE + path,
        headers={'User-Agent': 'NebrasVerify/259', 'Cache-Control': 'no-cache'},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.status, r.read().decode('utf-8', 'replace')


def main():
    issues = []
    for attempt in range(15):
        issues = []
        try:
            st, html = get('/')
            ver = re.search(r'data-nebras-deploy="([^"]+)"', html)
            ver = ver.group(1) if ver else None
            print('attempt', attempt + 1, 'deploy=', ver)

            st2, health = get('/api/health')
            up = re.search(r'"upgrade"\s*:\s*"([^"]+)"', health)

            jv = ver or TARGET
            st3, js = get('/js/nebras-platform.js?v=' + jv)
            st4, css = get('/css/12-door-designer.css?v=' + jv)

            flags = {
                'deploy': ver == TARGET,
                'health': (up.group(1) if up else None) == TARGET,
                'photo_live': 'DOOR_DESIGNER_LIVE_USE_PHOTO_PRESETS = true' in js,
                'always_compose': 'const needsBake = true' in js,
                'contained_fn': 'drawDoorPhotoPresetContained' in js,
                'css_contain': 'object-position: center center' in css,
                'data_seed': 'v33-factory-photo-contained' in js,
            }
            for k, v in flags.items():
                print(' ', k, v)
                if not v:
                    issues.append(k)

            if st3 != 200 or st4 != 200:
                issues.append('assets')

            if not issues:
                print('RESULT: PASS — hrws259 live')
                return 0
        except Exception as e:
            issues = [str(e)]
            print('error', e)

        time.sleep(8)

    print('RESULT: FAILED', issues)
    return 1


if __name__ == '__main__':
    sys.exit(main())
