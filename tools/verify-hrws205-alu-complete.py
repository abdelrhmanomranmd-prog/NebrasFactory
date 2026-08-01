import urllib.request, re, time
time.sleep(8)
base = 'https://www.nebrasplasticcompany.com'
html = urllib.request.urlopen(base + '/?_=' + str(time.time()), timeout=40).read().decode('utf-8', 'replace')
deploy = re.search(r'data-nebras-deploy="([^"]+)"', html)
print('deploy', deploy.group(1) if deploy else 'MISSING')
js = urllib.request.urlopen(base + '/js/nebras-aluminum-cutting.js?v=hrws205', timeout=40).read().decode('utf-8', 'replace')
pl = urllib.request.urlopen(base + '/js/nebras-platform.js?v=hrws205', timeout=40).read().decode('utf-8', 'replace')
print('alu bytes', len(js))
checks = [
    ('facade_bay', 'facade_bay' in js),
    ('facade_panel', 'facade_panel' in js),
    ('Curtain Wall', 'Curtain Wall' in js),
    ('__nebrasAluSelfTest', '__nebrasAluSelfTest' in js),
    ('remnantsCommitted', 'remnantsCommitted' in js),
    ('beadInsetMm', 'beadInsetMm' in js),
    ('editAluItem', 'editAluItem' in js),
    ('shapeCutsWithMeta', 'shapeCutsWithMeta' in js),
    ('missingPart', 'missingPart' in js),
    ('applyScope', 'alu-acc-scope' in js),
    ('merge aluminum', 'aluminum_estimates' in pl and 'NEBRAS_MERGE_BY_ID_STORE_KEYS' in pl),
]
for name, ok in checks:
    print(('OK' if ok else 'FAIL'), name)
print('PASS' if deploy and deploy.group(1) == 'hrws205' and all(c[1] for c in checks) else 'INCOMPLETE')
