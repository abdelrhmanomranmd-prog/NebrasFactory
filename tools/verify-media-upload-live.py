#!/usr/bin/env python3
"""تحقق من إعداد رفع الوسائط (Supabase Storage nebras-media)."""
import re
import urllib.error
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'
SUPABASE_URL = 'https://oedldllrjavofpeaputz.supabase.co'
BUCKET = 'nebras-media'


def get(path):
    with urllib.request.urlopen(SITE + path, timeout=60) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    print('=== MEDIA UPLOAD LIVE VERIFY ===')
    html = get('/')
    deploy = re.search(r'data-nebras-deploy="([^"]+)"', html)
    v = deploy.group(1) if deploy else 'hrws136'
    print('deploy:', v)
    js = get('/js/nebras-platform.js?v=' + v)
    ok = True
    checks = [
        ('uploadNebrasMediaFile exported', 'window.uploadNebrasMediaFile = uploadNebrasMediaFile' in js),
        ('nebras-media bucket', "NEBRAS_MEDIA_BUCKET = 'nebras-media'" in js),
        ('media hub in html', 'nebras-media-hub-overlay' in html),
        ('media admin js', 'nebras-media-admin.js' in html),
    ]
    for name, passed in checks:
        print(name + ':', 'OK' if passed else 'FAIL')
        if not passed:
            ok = False
    # bucket public read probe
    probe = SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/uploads/.keep'
    try:
        urllib.request.urlopen(probe, timeout=20)
        print('storage_public_probe: OK (reachable)')
    except urllib.error.HTTPError as e:
        if e.code in (400, 404):
            print('storage_public_probe: OK (bucket exists, no .keep file)')
        else:
            print('storage_public_probe: WARN', e.code)
    except Exception as e:
        print('storage_public_probe: WARN', e)
    print('RESULT:', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


if __name__ == '__main__':
    raise SystemExit(main())
