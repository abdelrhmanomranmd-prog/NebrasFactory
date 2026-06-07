#!/usr/bin/env python3
import json
import re
import sys
import urllib.request

url = sys.argv[1] if len(sys.argv) > 1 else 'https://linktr.ee/abdelrhmanomranmd'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req, timeout=20).read().decode('utf-8', 'replace')
m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
if not m:
    print('NO_NEXT_DATA')
    sys.exit(1)
data = json.loads(m.group(1))
pp = data.get('props', {}).get('pageProps', {})
links = pp.get('links') or []
if not links and isinstance(pp.get('account'), dict):
    links = pp['account'].get('links') or []
if not links and isinstance(pp.get('profile'), dict):
    links = pp['profile'].get('links') or []
for link in links:
    print(json.dumps({
        'title': link.get('title') or link.get('label') or '',
        'url': link.get('url') or link.get('href') or ''
    }, ensure_ascii=False))
