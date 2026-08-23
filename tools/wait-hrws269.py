#!/usr/bin/env python3
"""Wait until hrws269 is live on production."""
import json
import re
import time
import urllib.error
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'
TARGET = 'hrws269'


def main():
    for i in range(20):
        try:
            req = urllib.request.Request(SITE + '/', headers={'User-Agent': 'NebrasDeployWait/1', 'Cache-Control': 'no-cache'})
            html = urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'replace')
            m = re.search(r'data-nebras-deploy="([^"]+)"', html)
            v = m.group(1) if m else '?'
            print('attempt', i + 1, 'deploy', v)
            if v == TARGET:
                ping = json.loads(urllib.request.urlopen(SITE + '/api/health?ping=1', timeout=15).read().decode())
                health = json.loads(urllib.request.urlopen(SITE + '/api/health', timeout=25).read().decode())
                print('PING', ping.get('upgrade'), ping.get('ok'))
                print('HEALTH', health.get('upgrade'), health.get('ok'), health.get('supabase'))
                print('scripts', len(re.findall(r'<script[^>]+src=', html)))
                print('has_perf', 'nebras-perf.js' in html)
                print('has_portal', 'nebras-customer-portal.js' in html)
                return 0
        except urllib.error.HTTPError as e:
            print('attempt', i + 1, 'http', e.code)
        except Exception as e:
            print('attempt', i + 1, 'err', e)
        time.sleep(15)
    print('TIMEOUT waiting for', TARGET)
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
