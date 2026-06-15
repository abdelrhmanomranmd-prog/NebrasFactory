#!/usr/bin/env python3
import re
import urllib.request

url = 'https://www.nebrasplasticcompany.com/'
with urllib.request.urlopen(url, timeout=60) as r:
    c = r.read().decode('utf-8', 'replace')

m = re.search(r'data-nebras-deploy="([^"]+)"', c)
print('deploy:', m.group(1) if m else 'NOT FOUND')
m2 = re.search(r'nebras-platform\.js\?v=(hrws\d+)', c)
print('platform:', m2.group(1) if m2 else 'NOT FOUND')
print('data-warehouse:', 'yes' if 'nebras-data-warehouse.js' in c else 'no')
print('empire-bridges:', 'yes' if 'nebras-empire-bridges.js' in c else 'no')
for v in ['hrws69', 'hrws68', 'hrws67', 'hrws63']:
    print(v + ' count:', c.count(v))
