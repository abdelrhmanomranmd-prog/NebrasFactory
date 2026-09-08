#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import time
import urllib.request
SITE = 'https://www.nebrasplasticcompany.com'
TAG = 'hrws342'
for i in range(45):
    try:
        html = urllib.request.urlopen(SITE + '/', timeout=40).read().decode('utf-8', 'replace')
        if f'data-nebras-deploy="{TAG}"' in html:
            print('LIVE', TAG)
            raise SystemExit(0)
        print(i + 1, 'waiting')
    except SystemExit:
        raise
    except Exception as e:
        print(i + 1, 'err', e)
    time.sleep(8)
print('TIMEOUT')
raise SystemExit(1)
