import urllib.request, re, time
time.sleep(8)
base = 'https://www.nebrasplasticcompany.com'
html = urllib.request.urlopen(base + '/?_=' + str(time.time()), timeout=40).read().decode('utf-8', 'replace')
deploy = re.search(r'data-nebras-deploy="([^"]+)"', html)
print('deploy', deploy.group(1) if deploy else 'MISSING')
js = urllib.request.urlopen(base + '/js/nebras-aluminum-cutting.js?v=hrws207', timeout=40).read().decode('utf-8', 'replace')
css = urllib.request.urlopen(base + '/css/57-aluminum-cutting.css?v=hrws207', timeout=40).read().decode('utf-8', 'replace')
checks = [
    ('production board', "id: 'production'" in js and 'renderAluProductionBoard' in js),
    ('barcode stickers', 'aluBarcodeSvg' in js and 'printAluStickers' in js),
    ('worker cut list', 'printAluWorkerCutList' in js),
    ('install pack', 'printAluInstallPack' in js),
    ('advance status', 'advanceAluEstimateStatus' in js),
    ('ready_install', 'ready_install' in js),
    ('pipe board css', 'alu-pipe-board' in css),
    ('pipe strip css', 'alu-pipe-strip' in css),
]
for name, ok in checks:
    print(('OK' if ok else 'FAIL'), name)
print('PASS' if deploy and deploy.group(1) == 'hrws207' and all(c[1] for c in checks) else 'INCOMPLETE')
