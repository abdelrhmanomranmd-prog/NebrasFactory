#!/usr/bin/env python3
"""Verify WPC catalog SKUs in code match live Supabase site_products."""
import json
import os
import re
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://www.nebrasplasticcompany.com'
SUPABASE_URL = 'https://oedldllrjavofpeaputz.supabase.co'
SUPABASE_ANON = 'sb_publishable_bt6rlHxu_pjc1xpkKEWOcg_HZ43JMR0'


def extract_skus_from_array(js, const_name):
    m = re.search(rf'{re.escape(const_name)} = \[(.*?)\];', js, re.S)
    if not m:
        return []
    return re.findall(r"sku: '([^']+)'", m.group(1))


def extract_raw_skus(js):
    rows = re.findall(r"WPC_RAW_(?:BARE|CLAD)_ROWS = \[(.*?)\];", js, re.S)
    skus = []
    for block in rows:
        skus.extend(re.findall(r"'(WPC-RAW-[^']+)'", block))
    return skus


def extract_wpc_photo_paths(js):
    m = re.search(r'WPC_CATALOG_PHOTOS = \{(.*?)\};', js, re.S)
    if not m:
        return []
    return re.findall(r"'([^']+\.png)'", m.group(1))


def supabase_site_products():
    url = SUPABASE_URL + '/rest/v1/nebras_data_store?store_key=eq.site_products&select=payload'
    req = urllib.request.Request(url, headers={
        'apikey': SUPABASE_ANON,
        'Authorization': 'Bearer ' + SUPABASE_ANON,
    })
    with urllib.request.urlopen(req, timeout=60) as resp:
        rows = json.loads(resp.read())
    if not rows:
        return []
    payload = rows[0].get('payload')
    return payload if isinstance(payload, list) else []


def check_images_live(rel_dir, ext='.svg'):
    local = os.path.join(ROOT, rel_dir.replace('/', os.sep))
    if not os.path.isdir(local):
        return 0, 0, ['missing local dir']
    files = sorted(f for f in os.listdir(local) if f.endswith(ext))
    fails = []
    for f in files:
        url = SITE + '/' + rel_dir + '/' + f
        try:
            with urllib.request.urlopen(url, timeout=25) as r:
                if r.status != 200:
                    fails.append(f)
        except Exception:
            fails.append(f)
    return len(files), len(fails), fails


def check_photo_files_live(rel_paths):
    fails = []
    ok = 0
    for rel in rel_paths:
        url = SITE + '/' + rel
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                if r.status == 200 and r.length and r.length > 5000:
                    ok += 1
                else:
                    fails.append(rel + ' (small or bad status)')
        except Exception as e:
            fails.append(rel + ' (' + str(e)[:40] + ')')
    return ok, fails


def main():
    print('=== WPC CATALOG LIVE VERIFY ===\n')
    js_path = os.path.join(ROOT, 'js', 'nebras-platform.js')
    js = open(js_path, encoding='utf-8').read()

    expected_install = extract_skus_from_array(js, 'DEFAULT_WPC_READY_INSTALL_VARIANTS')
    expected_supply = extract_skus_from_array(js, 'DEFAULT_WPC_READY_SUPPLY_VARIANTS')
    expected_raw = extract_raw_skus(js)
    expected_ready = set(expected_install + expected_supply)
    wpc_photos = extract_wpc_photo_paths(js)
    print('Code defaults:')
    print('  install SKUs:', len(expected_install))
    print('  supply SKUs:', len(expected_supply))
    print('  raw SKUs:', len(expected_raw))
    print('  ready total:', len(expected_ready))
    print('  WPC photo assets:', len(wpc_photos))

    products = supabase_site_products()
    by_id = {p.get('id'): p for p in products if isinstance(p, dict)}
    print('\nLive site_products:', len(by_id))
    for pid in sorted(by_id.keys()):
        p = by_id[pid]
        vc = len(p.get('variants') or [])
        subs = [s.get('id') for s in (p.get('subCategories') or []) if isinstance(s, dict)]
        print(f'  {pid}: {vc} variants', ('subs=' + ','.join(subs)) if subs else '')

    wpc = by_id.get('prod-wpc', {})
    live_ready = [v.get('sku') for v in (wpc.get('variants') or []) if v and v.get('sku')]
    live_ready_set = set(live_ready)
    missing_ready = sorted(expected_ready - live_ready_set)
    extra_ready = sorted(live_ready_set - expected_ready)

    print('\n--- prod-wpc (ready doors) ---')
    print('Live variants:', len(live_ready))
    print('Missing from cloud:', len(missing_ready))
    for s in missing_ready:
        print('  MISSING', s)
    print('Extra in cloud (not in code):', len(extra_ready))
    for s in extra_ready[:20]:
        print('  EXTRA', s)

    raw = by_id.get('prod-wpc-raw', {})
    live_raw = [v.get('sku') for v in (raw.get('variants') or []) if v and v.get('sku')]
    live_raw_set = set(live_raw)
    expected_raw_set = set(expected_raw)
    missing_raw = sorted(expected_raw_set - live_raw_set)
    extra_raw = sorted(live_raw_set - expected_raw_set)

    print('\n--- prod-wpc-raw (workshop) ---')
    print('Live variants:', len(live_raw))
    print('Missing from cloud:', len(missing_raw))
    for s in missing_raw[:30]:
        print('  MISSING', s)
    if len(missing_raw) > 30:
        print('  ...', len(missing_raw) - 30, 'more')
    print('Extra in cloud:', len(extra_raw))
    for s in extra_raw:
        v = next((x for x in (raw.get('variants') or []) if x and x.get('sku') == s), {})
        print('  EXTRA', s, '-', v.get('typeAr', ''), '|', v.get('subCategoryId', ''))

    print('\n--- real WPC product photos (live) ---')
    photo_ok, photo_fails = check_photo_files_live(wpc_photos)
    photo_fail_n = len(photo_fails)
    print(f'  {"OK" if photo_fail_n == 0 else "FAIL"} wpc-photos: {photo_ok}/{len(wpc_photos)} live')
    for f in photo_fails:
        print('   FAIL', f)
    code_has_mapping = all(
        x in js for x in [
            'resolveWpcCatalogPhotoForVariant',
            'buildWpcStoreRollCssFilterForPhoto',
            'variantSupportsWpcRollColorPicker',
            'pickWpcStoreSkuRoll'
        ]
    )
    print('  Roll color + photo mapping in platform.js:', 'OK' if code_has_mapping else 'FAIL')

    print('\n--- legacy SVG catalog dirs (live) ---')
    img_fail_total = 0
    for d in [
        'images/catalog/wpc-ready-install',
        'images/catalog/wpc-ready-supply',
        'images/catalog/wpc-raw-bare',
        'images/catalog/wpc-raw-clad',
    ]:
        total, fails_n, fails = check_images_live(d)
        img_fail_total += fails_n
        status = 'OK' if fails_n == 0 else 'FAIL'
        print(f'  {status} {d}: {total} files, fail={fails_n}', fails[:5] if fails else '')

    ok = (
        not missing_ready and not missing_raw
        and photo_fail_n == 0
        and code_has_mapping
        and len(wpc_photos) >= 10
    )
    print('\nRESULT:', 'PASS — catalog + real photos + roll picker ready' if ok else 'ISSUES FOUND')
    if missing_ready or missing_raw:
        print('  Ready match:', len(expected_ready) - len(missing_ready), '/', len(expected_ready))
        print('  Raw match:', len(expected_raw_set) - len(missing_raw), '/', len(expected_raw_set))
    return 0 if ok else 1


if __name__ == '__main__':
    raise SystemExit(main())
