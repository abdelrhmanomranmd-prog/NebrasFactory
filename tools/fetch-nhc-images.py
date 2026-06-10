#!/usr/bin/env python3
import re
import ssl
import urllib.request

ctx = ssl.create_default_context()
urls = [
    'https://www.nhc.sa/real-estate-development/communities/309/',
    'https://nhc.sa/real-estate-development/projects/47475/',
    'https://nhc.sa/real-estate-development/projects/47494/',
]
for url in urls:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        html = urllib.request.urlopen(req, timeout=20, context=ctx).read().decode('utf-8', 'replace')
        imgs = re.findall(r'https?://[^"\'\s>]+\.(?:jpg|jpeg|png|webp)', html)
        print('URL:', url)
        for i in imgs[:12]:
            print(' ', i)
        print('count:', len(imgs), '\n')
    except Exception as e:
        print('ERR', url, e, '\n')
