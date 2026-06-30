#!/usr/bin/env python3
"""Download Nebras profile gallery photos for catalog (real product images)."""
import json
import os
import urllib.request

BASE = 'https://www.nebrasplasticcompany.com/'
ROOT = os.path.join(os.path.dirname(__file__), '..')


def main():
    manifest_path = os.path.join(ROOT, 'images', 'profile-2026', 'manifest.json')
    with urllib.request.urlopen(BASE + 'images/profile-2026/manifest.json', timeout=60) as r:
        manifest = json.load(r)
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    paths = []
    for key in ('hero', 'doors', 'cabinets', 'cnc', 'gallery-extra'):
        paths.extend(manifest.get(key, []))

    saved = skipped = failed = 0
    for rel in paths:
        out = os.path.join(ROOT, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(out), exist_ok=True)
        if os.path.isfile(out) and os.path.getsize(out) > 1000:
            skipped += 1
            continue
        url = BASE + rel
        try:
            urllib.request.urlretrieve(url, out)
            saved += 1
            print('OK', rel)
        except Exception as exc:
            failed += 1
            print('FAIL', rel, exc)

    print('done saved=%s skipped=%s failed=%s total=%s' % (saved, skipped, failed, len(paths)))


if __name__ == '__main__':
    main()
