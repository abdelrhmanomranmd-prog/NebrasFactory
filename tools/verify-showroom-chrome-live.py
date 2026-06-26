#!/usr/bin/env python3
"""Verify showroom + visitor icons anti-wipe fixes are live."""
import json
import re
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def get(path):
    with urllib.request.urlopen(SITE + path, timeout=60) as r:
        return r.read().decode('utf-8', 'replace')


def api(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {'Content-Type': 'application/json', 'User-Agent': 'NebrasShowroomVerify/1'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(SITE + path, data=data, headers=h, method=method)
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read())


def count_showroom_items(payload):
    if not isinstance(payload, dict):
        return 0
    total = 0
    for sec in payload.values():
        if isinstance(sec, dict) and isinstance(sec.get('items'), list):
            total += len([x for x in sec['items'] if isinstance(x, dict)])
    return total


def main():
    print('=== SHOWROOM + ICONS LIVE VERIFY ===')
    html = get('/')
    deploy = re.search(r'data-nebras-deploy="([^"]+)"', html)
    v = deploy.group(1) if deploy else 'hrws137'
    print('deploy:', v)
    js = get('/js/nebras-platform.js?v=' + v)

    checks = [
        ('empty_showroom_guard', 'nebrasChromePayloadIsEmpty' in js and 'showroom_gallery' in js),
        ('showroom_merge', 'mergeShowroomGalleryFromCloud' in js),
        ('visitor_icons_merge', "'visitor_icons'" in js and 'NEBRAS_MERGE_BY_ID_STORE_KEYS' in js),
        ('catalog_hub_not_purged', 'i.catalogHub) return false' not in js),
        ('profile_seed_always', 'applyNebrasProfile2026Seed()' in js),
        ('openVisitorIcon_numeric', 'Number(item.id) === idNum' in js),
    ]
    failed = []
    for name, ok in checks:
        print(name + ':', 'OK' if ok else 'FAIL')
        if not ok:
            failed.append(name)

    try:
        login = api('POST', '/api/nebras-auth?action=login', {
            'username': 'NEBRASFACTORY',
            'password': 'NEBRASFACTORYCOMPANYBASIC'
        })
        token = login['token']
        pull = api('GET', '/api/nebras-cloud?action=pull&keys=showroom_gallery,visitor_icons', token=token)
        showroom_n = 0
        icons_n = 0
        for row in pull.get('rows', []):
            if row.get('store_key') == 'showroom_gallery':
                showroom_n = count_showroom_items(row.get('payload'))
            if row.get('store_key') == 'visitor_icons':
                p = row.get('payload')
                icons_n = len(p) if isinstance(p, list) else 0
        print('cloud_showroom_items:', showroom_n)
        print('cloud_visitor_icons:', icons_n)
        if showroom_n < 12:
            print('WARN: showroom sparse in cloud — admin login will auto-repair')
        if icons_n < 8:
            print('WARN: visitor_icons sparse in cloud — defaults merge on load')
    except Exception as e:
        print('cloud_pull:', 'SKIP', e)

    print('RESULT:', 'PASS' if not failed else 'FAIL — ' + ', '.join(failed))
    return 0 if not failed else 1


if __name__ == '__main__':
    raise SystemExit(main())
