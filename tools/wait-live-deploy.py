import re
import sys
import time
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'
TARGETS = set(sys.argv[1:]) if len(sys.argv) > 1 else {'hrws118', 'hrws119'}


def current():
    req = urllib.request.Request(SITE + '/index.html', headers={
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'User-Agent': 'NebrasDeployWait/1'
    })
    html = urllib.request.urlopen(req, timeout=40).read().decode('utf-8', 'replace')
    m = re.search(r'data-nebras-deploy="([^"]+)"', html)
    return m.group(1) if m else 'none'


def main():
    for i in range(20):
        try:
            v = current()
            print('check', i + 1, ':', v)
            if v in TARGETS:
                print('READY:', v)
                return 0
        except Exception as e:
            print('check', i + 1, 'error:', e)
        time.sleep(20)
    print('TIMEOUT: still on', current())
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
