import urllib.request, re, time
time.sleep(10)
base = 'https://www.nebrasplasticcompany.com'
html = urllib.request.urlopen(base + '/?_=' + str(time.time()), timeout=40).read().decode('utf-8', 'replace')
deploy = re.search(r'data-nebras-deploy="([^"]+)"', html)
print('deploy', deploy.group(1) if deploy else 'MISSING')
js = urllib.request.urlopen(base + '/js/nebras-aluminum-cutting.js?v=hrws206', timeout=40).read().decode('utf-8', 'replace')
pl = urllib.request.urlopen(base + '/js/nebras-platform.js?v=hrws206', timeout=40).read().decode('utf-8', 'replace')
css = urllib.request.urlopen(base + '/css/57-aluminum-cutting.css?v=hrws206', timeout=40).read().decode('utf-8', 'replace')
checks = [
    ('workspace shell html', 'alu-workspace-section' in html),
    ('showAluminumCuttingShell', 'showAluminumCuttingShell' in js),
    ('closeAluminumCuttingWorkspace', 'closeAluminumCuttingWorkspace' in js),
    ('alu-command-dash', 'alu-command-dash' in js),
    ('title التخصيمات', "titleAr: 'التخصيمات'" in pl),
    ('alu-platform-open', 'alu-platform-open' in pl),
    ('strict stays on dashboard', 'يبقى على الداشبورد' in pl or 'renderDashboardTiles' in pl),
    ('css workspace', 'alu-workspace-section' in css),
    ('css tile premium', 'dashboard-tile-card--alu-cutting' in css),
]
for name, ok in checks:
    print(('OK' if ok else 'FAIL'), name)
print('PASS' if deploy and deploy.group(1) == 'hrws206' and all(c[1] for c in checks) else 'INCOMPLETE')
