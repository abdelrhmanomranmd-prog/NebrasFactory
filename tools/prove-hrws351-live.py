# -*- coding: utf-8 -*-
import time, urllib.request, ssl, re
BASE='https://www.nebrasplasticcompany.com'
ctx=ssl.create_default_context()
def get(path):
    req=urllib.request.Request(BASE+path, headers={'User-Agent':'NebrasProve/351'})
    with urllib.request.urlopen(req, context=ctx, timeout=45) as r:
        return r.status, r.read()
def ok(n,c,d=''):
    print(('PASS' if c else 'FAIL'), n, d or ''); return bool(c)
res=[]; tag=''
for i in range(24):
    try:
        _,b=get('/'); html=b.decode('utf-8','replace'); m=re.search(r'data-nebras-deploy="([^"]+)"', html); tag=m.group(1) if m else ''; print('poll',i,tag)
        if tag=='hrws351': break
    except Exception as e: print('poll err',e)
    time.sleep(8)
res.append(ok('deploy', tag=='hrws351', tag))
_,b=get('/js/nebras-platform.js?v=hrws351'); js=b.decode('utf-8','replace')
res.append(ok('v3', 'OTHER_CATALOG_VERSION = 3' in js))
res.append(ok('twenty_skus', js.count("sku: 'OTH-ROLL-N") >= 20))
res.append(ok('walnut_name', 'والنت كلاسيك' in js))
res.append(ok('caramel_name', 'أوك كراميل' in js))
res.append(ok('n21', 'OTH-ROLL-N21' in js and 'images/rolls/N-21.jpg' in js))
code,_=get('/images/rolls/N-1.jpg'); res.append(ok('asset_n1', code==200))
code,_=get('/images/rolls/N-21.jpg'); res.append(ok('asset_n21', code==200))
print('RESULT', sum(1 for x in res if x), '/', len(res))
raise SystemExit(0 if all(res) else 1)
