#!/usr/bin/env python3
"""فحص جاهزية الإطلاق الرسمي — سحابة · حفظ · رفع · واجهة."""
import json
import re
import subprocess
import sys
import urllib.request

ROOT = __import__('os').path.dirname(__import__('os').path.abspath(__file__))
ROOT = __import__('os').path.dirname(ROOT)
SITE = 'https://www.nebrasplasticcompany.com'


def get(path):
    with urllib.request.urlopen(SITE + path, timeout=60) as r:
        return r.read().decode('utf-8', 'replace')


def run_tool(name):
    path = __import__('os').path.join(ROOT, 'tools', name)
    r = subprocess.run([sys.executable, path], cwd=ROOT, capture_output=True, text=True)
    ok = r.returncode == 0
    tail = (r.stdout or r.stderr or '').strip().split('\n')[-1]
    return ok, tail


def main():
    print('=== NEBRAS OFFICIAL LAUNCH READINESS ===')
    html = get('/')
    deploy = re.search(r'data-nebras-deploy="([^"]+)"', html)
    v = deploy.group(1) if deploy else 'unknown'
    print('deploy:', v)

    js = get('/js/nebras-platform.js?v=' + v)
    markers = [
        ('production_live_mode', 'NEBRAS_PRODUCTION_LIVE_MODE = true' in js),
        ('demo_admin_purge', 'NEBRAS_DEMO_ADMIN_USERNAME_RE' in js),
        ('chrome_empty_skip', 'NEBRAS_CHROME_EMPTY_CLOUD_SKIP_KEYS' in js and "'about_pages'" in js),
        ('fast_cloud_debounce', '}, 180);' in js),
        ('media_upload', 'uploadNebrasMediaFile' in js and "NEBRAS_MEDIA_BUCKET = 'nebras-media'" in js),
        ('critical_persist', 'persistNebrasCriticalStores' in js),
        ('cloud_guard', 'guardCloudPushRow' in js),
        ('hr_platform', 'nebras-hr-platform.js' in html),
        ('scm_honest_save', 'persistScmContentHonest' in js),
        ('data_warehouse', 'nebras-data-warehouse.js' in html),
    ]
    failed = []
    for name, ok in markers:
        print(name + ':', 'OK' if ok else 'FAIL')
        if not ok:
            failed.append(name)

    scripts = [
        'verify-production-live.py',
        'verify-hr-platform-live.py',
        'verify-showroom-chrome-live.py',
        'verify-cloud-storage-live.py',
        'verify-scm-content-persist-live.py',
        'verify-site-chrome-live.py',
        'test-real-persist-live.py',
        'verify-project-health.py',
    ]
    for script in scripts:
        ok, tail = run_tool(script)
        print('tool', script + ':', 'PASS' if ok else 'FAIL', '—', tail)
        if not ok:
            failed.append(script)

    print('---')
    if failed:
        print('LAUNCH STATUS: NOT READY —', ', '.join(failed))
        return 1
    print('LAUNCH STATUS: READY — المنصة جاهزة للاعتماد الرسمي')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
