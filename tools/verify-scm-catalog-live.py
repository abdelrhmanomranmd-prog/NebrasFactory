#!/usr/bin/env python3
"""Verify structured SCM catalog UI is live."""
import re
import urllib.request

LIVE = 'https://www.nebrasplasticcompany.com'

def get(path):
    with urllib.request.urlopen(LIVE + path, timeout=45) as r:
        return r.read().decode('utf-8', 'replace')

html = get('/')
deploy = re.search(r'data-nebras-deploy="([^"]+)"', html)
v = deploy.group(1) if deploy else 'hrws129'
print('deploy:', v)

js = get('/js/nebras-platform.js?v=' + v)
css = get('/css/29-scm-professional.css?v=' + v)

checks = [
    ('NEBRAS_CATALOG_CATEGORIES', 'NEBRAS_CATALOG_CATEGORIES' in js),
    ('renderScmProductCatalogPanel', 'renderScmProductCatalogPanel' in js),
    ('openScmVariantEditor', 'window.openScmVariantEditor' in js),
    ('saveScmCatalogNow', 'window.saveScmCatalogNow' in js),
    ('persistScmContentHonest', 'window.persistScmContentHonest' in js),
    ('renderScmCloudSaveStatus', 'window.renderScmCloudSaveStatus' in js),
    ('scm-cloud-save-bar', 'scm-cloud-save-bar' in html),
    ('syncScmCatalogStepsUi', 'syncScmCatalogStepsUi' in js),
    ('scm-category-summary', 'scm-category-summary' in html),
    ('scm-products-catalog', 'scm-products-catalog' in html),
    ('scm-catalog-steps', 'scm-catalog-steps' in html),
    ('category chip active css', '.scm-store-chip.is-active' in css),
    ('product card grid css', '.scm-products-catalog' in css),
]
failed = []
for name, ok in checks:
    print(name + ':', 'OK' if ok else 'FAIL')
    if not ok:
        failed.append(name)
print('RESULT:', 'PASS' if not failed else 'FAIL — ' + ', '.join(failed))
raise SystemExit(0 if not failed else 1)
