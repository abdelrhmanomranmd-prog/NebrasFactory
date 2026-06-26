#!/usr/bin/env python3
"""Verify visitors can load public catalog from cloud (no admin session)."""
import json
import re
import urllib.error
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'
SUPABASE_URL = 'https://oedldllrjavofpeaputz.supabase.co'
SUPABASE_ANON = 'sb_publishable_bt6rlHxu_pjc1xpkKEWOcg_HZ43JMR0'


def get(path):
    with urllib.request.urlopen(SITE + path, timeout=60) as r:
        return r.read().decode('utf-8', 'replace')


def supabase_read(store_key):
    url = SUPABASE_URL + '/rest/v1/nebras_data_store?store_key=eq.' + store_key + '&select=payload,updated_at'
    req = urllib.request.Request(url, headers={
        'apikey': SUPABASE_ANON,
        'Authorization': 'Bearer ' + SUPABASE_ANON,
    })
    with urllib.request.urlopen(req, timeout=60) as resp:
        rows = json.loads(resp.read())
    if not rows:
        return None
    return rows[0].get('payload')


def count_visible_products(payload):
    if not isinstance(payload, list):
        return 0, 0
    total = len([p for p in payload if isinstance(p, dict)])
    visible = len([
        p for p in payload
        if isinstance(p, dict) and p.get('visible') is not False
    ])
    return total, visible


def count_store_hub_icons(payload):
    if not isinstance(payload, list):
        return 0
    n = 0
    for item in payload:
        if not isinstance(item, dict):
            continue
        if item.get('catalogHub') or item.get('category') in ('store', 'catalog', 'products'):
            n += 1
        elif str(item.get('id', '')).isdigit() and int(item['id']) in range(8, 12):
            n += 1
    return n


def main():
    print('=== PUBLIC VISITOR CLOUD VERIFY ===')
    failed = []

    html = get('/')
    deploy = re.search(r'data-nebras-deploy="([^"]+)"', html)
    v = deploy.group(1) if deploy else 'hrws139'
    print('deploy:', v)

    js = get('/js/nebras-platform.js?v=' + v)
    code_checks = [
        ('pullPublicSiteGovernanceFromCloud', 'pullPublicSiteGovernanceFromCloud' in js),
        ('startNebrasPublicSiteCloudRefresh', 'startNebrasPublicSiteCloudRefresh' in js),
        ('repair_on_public_pull', 'repairStoreHubCatalogBindings' in js and 'pullPublicSiteGovernanceFromCloud' in js),
        ('window_export_public_pull', 'window.pullPublicSiteGovernanceFromCloud' in js),
        ('cloud_timeout_7s', 'mobile ? 5000 : 7000' in js),
        ('reveal_always_catalog', 'if (window._nebrasCloudDataReady)' in js and 'renderAllPublicCatalog()' in js),
    ]
    for name, ok in code_checks:
        print(name + ':', 'OK' if ok else 'FAIL')
        if not ok:
            failed.append(name)

    products = supabase_read('site_products')
    icons = supabase_read('visitor_icons')
    total_p, visible_p = count_visible_products(products)
    hub_icons = count_store_hub_icons(icons)
    print('cloud_site_products_total:', total_p)
    print('cloud_site_products_visible:', visible_p)
    print('cloud_store_hub_icons:', hub_icons)

    if total_p == 0:
        print('WARN: no products in public cloud — add via SCM then wait for green ribbon')
    else:
        print('PASS public site_products readable via anon')

    if visible_p > 0 and hub_icons == 0:
        print('WARN: products exist but no store hub icons — repairStoreHubCatalogBindings on admin save')

    print('\n=== SUMMARY ===')
    if failed:
        print('FAILED:', ', '.join(failed))
        return 1
    print('PUBLIC VISITOR PATH OK —', v)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
