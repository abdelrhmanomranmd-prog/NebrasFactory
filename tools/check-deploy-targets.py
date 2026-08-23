#!/usr/bin/env python3
import json
import re
import urllib.error
import urllib.request

TARGETS = [
    'https://www.nebrasplasticcompany.com/',
    'https://nebras-factory-site.vercel.app/',
]


def probe(base):
    out = {'base': base}
    try:
        req = urllib.request.Request(base, headers={'User-Agent': 'NebrasDeployProbe/1', 'Cache-Control': 'no-cache'})
        html = urllib.request.urlopen(req, timeout=25).read().decode('utf-8', 'replace')
        m = re.search(r'data-nebras-deploy="([^"]+)"', html)
        out['deploy'] = m.group(1) if m else 'unknown'
        out['scripts'] = len(re.findall(r'<script[^>]+src=', html))
        out['has_perf'] = 'nebras-perf.js' in html
        out['has_portal_inline'] = 'nebras-customer-portal.js' in html
        out['home'] = 200
    except Exception as e:
        out['home_error'] = str(e)
    for path in ['/api/health', '/api/ping']:
        try:
            req = urllib.request.Request(base.rstrip('/') + path, headers={'User-Agent': 'NebrasDeployProbe/1'})
            body = urllib.request.urlopen(req, timeout=20).read().decode('utf-8', 'replace')
            out[path] = json.loads(body)
        except urllib.error.HTTPError as e:
            out[path] = {'http': e.code}
        except Exception as e:
            out[path] = {'error': str(e)[:80]}
    return out


def main():
    for base in TARGETS:
        print('===', base, '===')
        print(json.dumps(probe(base), ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
