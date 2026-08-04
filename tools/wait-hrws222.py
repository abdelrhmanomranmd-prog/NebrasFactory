# -*- coding: utf-8 -*-
import re, sys, time, urllib.request
URL='https://www.nebrasplasticcompany.com/'
HEALTH='https://www.nebrasplasticcompany.com/api/health'
MARKER='hrws222'

def fetch(u):
    req=urllib.request.Request(u, headers={'Cache-Control':'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8','replace')

for i in range(1, 40):
    try:
        html=fetch(URL); health=fetch(HEALTH)
        ok='hrws222' in html and 'hrws222' in health
        m=re.search(r'data-nebras-deploy="([^"]+)"', html)
        print(f'[{i}] deploy={m.group(1) if m else "?"} ok={ok}')
        if ok:
            print('READY'); sys.exit(0)
    except Exception as e:
        print(f'[{i}] err', e)
    time.sleep(10)
print('TIMEOUT'); sys.exit(1)
