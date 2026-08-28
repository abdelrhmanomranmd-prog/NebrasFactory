#!/usr/bin/env python3
"""Verify hrws292 live: canvas roll compose on store SKU previews."""
import re
import sys
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'
TARGET = 'hrws292'


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'NebrasVerify/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    html = fetch(SITE + '/')
    deploy = re.search(r'data-nebras-deploy="([^"]+)"', html)
    deploy = deploy.group(1) if deploy else 'unknown'
    print('deploy:', deploy)
    if deploy != TARGET:
        print('FAIL deploy not', TARGET)
        return 1

    m = re.search(r'(/js/nebras-platform\.js\?v=[^"\']+)', html)
    if not m:
        print('FAIL platform js not found')
        return 1
    js = fetch(SITE + m.group(1))
    checks = [
        ('applyComposedRollToStoreSkuImg', 'applyComposedRollToStoreSkuImg' in js),
        ('composeDoorPhotoWithRoll in store', 'composeDoorPhotoWithRoll(baseSrc, tex, hex, catIdx' in js),
        ('removed clip-panel tint path', 'has-door-roll-tint--clip-panel' not in js[js.find('function applyWpcStoreSkuRollTint'):js.find('function applyWpcStoreSkuRollTint') + 4500]),
    ]
    ok = True
    for name, passed in checks:
        print(name + ':', 'OK' if passed else 'FAIL')
        ok = ok and passed
    print('RESULT:', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
