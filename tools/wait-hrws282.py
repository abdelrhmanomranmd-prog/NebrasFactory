#!/usr/bin/env python3
"""Wait until hrws282 is live on production."""
import re
import sys
import time
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'
TARGET = 'hrws282'
MAX_WAIT = 900
INTERVAL = 15


def current_deploy():
    req = urllib.request.Request(SITE + '/', headers={'User-Agent': 'NebrasWait/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        html = r.read().decode('utf-8', 'replace')
    m = re.search(r'data-nebras-deploy="([^"]+)"', html)
    return m.group(1) if m else 'unknown'


def main():
    start = time.time()
    while time.time() - start < MAX_WAIT:
        try:
            deploy = current_deploy()
            print('deploy:', deploy)
            if deploy == TARGET:
                print('OK —', TARGET, 'is live')
                return 0
        except Exception as e:
            print('check failed:', e)
        time.sleep(INTERVAL)
    print('TIMEOUT waiting for', TARGET)
    return 1


if __name__ == '__main__':
    sys.exit(main())
