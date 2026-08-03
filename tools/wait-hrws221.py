# -*- coding: utf-8 -*-
"""انتظر حتى يظهر hrws221 على الموقع الحي."""
import re
import sys
import time
import urllib.request

URL = 'https://www.nebrasplasticcompany.com/'
HEALTH = 'https://www.nebrasplasticcompany.com/api/health'
MARKER = 'hrws221'
TRIES = 36
SLEEP = 10


def fetch(url):
    req = urllib.request.Request(url, headers={'Cache-Control': 'no-cache', 'Pragma': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    for i in range(1, TRIES + 1):
        try:
            html = fetch(URL)
            health = fetch(HEALTH)
            ok_html = MARKER in html and 'nebras-dept-lazy.js' in html
            ok_health = MARKER in health
            print(f'[{i}/{TRIES}] html={ok_html} health={ok_health} deploy={re.search(r"data-nebras-deploy=\"([^\"]+)\"", html).group(1) if "data-nebras-deploy" in html else "?"}')
            if ok_html and ok_health:
                # حجم التحميل الأول: سكربتات defer في الصفحة (بدون lazy)
                scripts = re.findall(r'<script[^>]+src=\"([^\"]+)\"', html)
                print('script_tags', len(scripts))
                print('has_html2canvas', any('html2canvas' in s for s in scripts))
                print('has_jspdf', any('jspdf' in s for s in scripts))
                print('has_aluminum_eager', any('aluminum-cutting' in s for s in scripts))
                print('has_lazy', any('dept-lazy' in s for s in scripts))
                print('READY', MARKER)
                return 0
        except Exception as e:
            print(f'[{i}/{TRIES}] err', e)
        time.sleep(SLEEP)
    print('TIMEOUT')
    return 1


if __name__ == '__main__':
    sys.exit(main())
