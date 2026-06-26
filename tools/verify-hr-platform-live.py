#!/usr/bin/env python3
"""Verify HR platform boot + scope fixes are live."""
import re
import urllib.request

LIVE = 'https://www.nebrasplasticcompany.com'


def get(path):
    with urllib.request.urlopen(LIVE + path, timeout=60) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    print('=== HR PLATFORM LIVE VERIFY ===')
    html = get('/')
    deploy = re.search(r'data-nebras-deploy="([^"]+)"', html)
    v = deploy.group(1) if deploy else 'hrws135'
    print('deploy:', v)

    js_boot = get('/js/nebras-hr-boot.js?v=' + v)
    js_hr = get('/js/nebras-hr-platform.js?v=' + v)
    checks = [
        ('static fallback hidden', 'id="hr-static-fallback" hidden' in html),
        ('boot ignores static fallback', '#hr-static-fallback' in js_boot),
        ('hr panel ready flag', '__hrPanelReady' in js_hr),
        ('hr scope full for permission', 'صلاحية HR — كل الفروع' in js_hr),
        ('tab scope filter fixed', 'fleet-hub' in js_hr and 'hrGov) return t.id' not in js_hr),
        ('showHrPlatformShell hides dash', 'if (dash) {' in js_hr and 'dash.classList.remove' in js_hr),
        ('hr migrate no reload loop', 'stack overflow' in get('/js/nebras-hr-companies.js?v=' + v)),
    ]
    failed = []
    for name, ok in checks:
        print(name + ':', 'OK' if ok else 'FAIL')
        if not ok:
            failed.append(name)
    print('RESULT:', 'PASS' if not failed else 'FAIL — ' + ', '.join(failed))
    return 0 if not failed else 1


if __name__ == '__main__':
    raise SystemExit(main())
