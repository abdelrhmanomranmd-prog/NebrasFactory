#!/usr/bin/env python3
import re, sys, time, urllib.request
SITE = 'https://www.nebrasplasticcompany.com'
TARGET = 'hrws371'

def current():
    req = urllib.request.Request(SITE + '/', headers={'User-Agent': 'NebrasWait/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        html = r.read().decode('utf-8', 'replace')
    m = re.search(r'data-nebras-deploy="([^"]+)"', html)
    return m.group(1) if m else 'unknown', html

def main():
    start = time.time()
    while time.time() - start < 1200:
        try:
            d, html = current()
            print('deploy:', d)
            if d == TARGET:
                assert 'nebras-platform.js?v=hrws371' in html
                # U45 must be authentic Nebras photo (~900KB+), not small uPVC overlay
                u45 = urllib.request.urlopen(
                    SITE + '/images/catalog/wpc-photos/by-sku-clean/WPC-RDY-U45-STD.png?v=hrws371',
                    timeout=45
                ).read()
                flat = urllib.request.urlopen(
                    SITE + '/images/catalog/wpc-photos/by-sku-clean/WPC-RDY-FLAT-45-STD.png?v=hrws371',
                    timeout=45
                ).read()
                print('U45 bytes', len(u45), 'FLAT bytes', len(flat))
                assert len(u45) > 500000, 'U45 still looks like wrong small overlay'
                assert 150000 < len(flat) < 400000, 'FLAT should be Riwaq walnut match'
                print('OK —', TARGET, 'is live — door images rematched')
                return 0
        except Exception as e:
            print('check failed:', e)
        time.sleep(15)
    print('TIMEOUT')
    return 1

if __name__ == '__main__':
    sys.exit(main())
