#!/usr/bin/env python3
import re, sys, time, urllib.request
SITE = 'https://www.nebrasplasticcompany.com'
TARGET = 'hrws364'

def current():
    req = urllib.request.Request(SITE + '/', headers={'User-Agent': 'NebrasWait/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        html = r.read().decode('utf-8', 'replace')
    m = re.search(r'data-nebras-deploy="([^"]+)"', html)
    return m.group(1) if m else 'unknown'

def main():
    start = time.time()
    while time.time() - start < 900:
        try:
            d = current()
            print('deploy:', d)
            if d == TARGET:
                print('OK —', TARGET, 'is live')
                return 0
        except Exception as e:
            print('check failed:', e)
        time.sleep(15)
    print('TIMEOUT')
    return 1

if __name__ == '__main__':
    sys.exit(main())
