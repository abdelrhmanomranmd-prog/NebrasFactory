# -*- coding: utf-8 -*-
import time, urllib.request, ssl, re
BASE='https://www.nebrasplasticcompany.com'
ctx=ssl.create_default_context()

def get(path):
    req=urllib.request.Request(BASE+path, headers={'User-Agent':'NebrasProve/353'})
    with urllib.request.urlopen(req, context=ctx, timeout=50) as r:
        return r.status, r.read()

def ok(n,c,d=''):
    print(('PASS' if c else 'FAIL'), n, d or ''); return bool(c)

res=[]; tag=''
for i in range(24):
    try:
        _,b=get('/'); html=b.decode('utf-8','replace'); m=re.search(r'data-nebras-deploy=\"([^\"]+)\"', html); tag=m.group(1) if m else ''; print('poll',i,tag)
        if tag=='hrws353': break
    except Exception as e:
        print('poll err', e)
    time.sleep(8)

res.append(ok('deploy', tag=='hrws353', tag))
_,b=get('/js/nebras-platform.js?v=hrws353'); js=b.decode('utf-8','replace')
res.append(ok('scm_queue', 'scmPersistQueue' in js))
res.append(ok('pm_window', 'window.pmQueuePriceSave = pmQueuePriceSave' in js))
res.append(ok('pm_image_warn', 'يفضّل رفع الصورة للسحابة' in js))
_,b=get('/js/nebras-aluminum-cutting.js?v=hrws353')
# may be lazy-loaded - try without version or from dept lazy
alu=b.decode('utf-8','replace')
if 'exportAluBomCsv' not in alu:
    # try find path from dept lazy
    _,dl=get('/js/nebras-dept-lazy.js?v=hrws353')
    dlt=dl.decode('utf-8','replace')
    m=re.search(r'aluminum-cutting\.js[^\"\']*', dlt)
    print('lazy hint', m.group(0) if m else 'none')
    # direct
    _,b=get('/js/nebras-aluminum-cutting.js')
    alu=b.decode('utf-8','replace')
res.append(ok('alu_bom', 'function exportAluBomCsv' in alu))
res.append(ok('alu_honest_save', 'async function saveAluEstimate' in alu and 'حُفظت على السيرفر الحي' in alu))
res.append(ok('alu_flow', 'alu-aaprix-flow' in alu))
print('RESULT', sum(1 for x in res if x), '/', len(res))
raise SystemExit(0 if all(res) else 1)
