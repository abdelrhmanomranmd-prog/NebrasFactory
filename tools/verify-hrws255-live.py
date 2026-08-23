#!/usr/bin/env python3
"""Verify hrws255 live: canonical door model, MDF bake-transom, 160° turntable."""
import re
import sys
import time
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'
TARGET = 'hrws255'


def get(path):
    req = urllib.request.Request(
        SITE + path,
        headers={'User-Agent': 'NebrasVerify/255', 'Cache-Control': 'no-cache'},
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
            print('attempt', attempt + 1, 'HOME', st, 'deploy=', ver)

            st2, health = get('/api/health')
            up = re.search(r'"upgrade"\s*:\s*"([^"]+)"', health)
            print('HEALTH', st2, 'upgrade=', up.group(1) if up else None)

            jv = ver or TARGET
            st3, js = get('/js/nebras-platform.js?v=' + jv)
            st4, css = get('/css/12-door-designer.css?v=' + jv)
            print('JS', st3, 'bytes=', len(js), 'CSS', st4, 'bytes=', len(css))

            flags = {
                'deploy_hrws255': ver == TARGET,
                'health_hrws255': (up.group(1) if up else None) == TARGET,
                'photo_presets_on': 'DOOR_DESIGNER_LIVE_USE_PHOTO_PRESETS = true' in js,
                'studio_live': "designCanvasMode: 'studio-live'" in js,
                'canonical_base': 'DOOR_PHOTO_CANONICAL' in js,
                'contained_draw': 'drawDoorPhotoPresetContained' in js,
                'bake_transom': "mode: 'bake-transom'" in js,
                'rot_160': 'const ROT_MIN = -80' in js and 'const ROT_MAX = 80' in js,
                'skip_leaf_mask': 'skipLeafMask: true' in js,
                'data_seed': 'v31-door-canonical-mdf160' in js,
                'preset_cache_34': "DOOR_PHOTO_PRESET_CACHE = '34'" in js,
                'css_turntable_photo': 'photo-preset .wpc-door-turntable' in css,
            }
            for k, v in flags.items():
                print(' ', k, v)
                if not v:
                    issues.append(k)

            for path in [
                '/js/nebras-dept-lazy.js?v=' + jv,
                '/images/doors/presets/edge-band/edge-1/outer-flat-plain.png',
                '/images/doors/presets/u-channel/_shared/transom-cladding-flat.png',
            ]:
                stp, _ = get(path)
                print(' ASSET', path.split('?')[0], stp)
                if stp != 200:
                    issues.append('asset ' + path)

            if not issues:
                print('RESULT: PASS — hrws255 live')
                return 0
        except Exception as e:
            issues = [str(e)]
            print('error', e)

        time.sleep(8)

    print('RESULT: FAILED', issues)
    return 1


if __name__ == '__main__':
    sys.exit(main())
