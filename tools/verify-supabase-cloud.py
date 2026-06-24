#!/usr/bin/env python3
"""Read-only check: Nebras Supabase cloud store has expected keys."""
import json
import sys
import urllib.error
import urllib.request

SUPABASE_URL = 'https://oedldllrjavofpeaputz.supabase.co'
ANON_KEY = 'sb_publishable_bt6rlHxu_pjc1xpkKEWOcg_HZ43JMR0'
EXPECTED_PUBLIC_KEYS = {
    'about_pages', 'branches', 'dashboard_tiles', 'showroom_gallery', 'site_certifications',
    'site_custom_sections', 'site_partners', 'site_products', 'system_settings',
    'visitor_analytics', 'visitor_icons',
}


def main():
    url = SUPABASE_URL + '/rest/v1/nebras_data_store?select=store_key,updated_at'
    req = urllib.request.Request(url, headers={
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + ANON_KEY,
    })
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            rows = json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print('ERROR: Supabase HTTP', e.code, e.read().decode('utf-8', errors='replace')[:300])
        sys.exit(1)
    except Exception as e:
        print('ERROR: Supabase unreachable:', e)
        sys.exit(1)

    keys = {r.get('store_key') for r in rows if r.get('store_key')}
    missing = EXPECTED_PUBLIC_KEYS - keys
    print('=== NEBRAS SUPABASE CLOUD ===')
    print('Rows (anon-visible):', len(rows))
    print('Keys:', ', '.join(sorted(keys)))
    if missing:
        print('WARN: missing public keys:', ', '.join(sorted(missing)))
    else:
        print('All expected public keys present.')
    sensitive_probe = 'admin_users'
    try:
        sreq = urllib.request.Request(
            SUPABASE_URL + '/rest/v1/nebras_data_store?store_key=eq.' + sensitive_probe + '&select=store_key',
            headers={'apikey': ANON_KEY, 'Authorization': 'Bearer ' + ANON_KEY},
        )
        with urllib.request.urlopen(sreq, timeout=15) as sresp:
            sens = json.loads(sresp.read())
        if len(sens) == 0:
            print('RLS OK: sensitive keys hidden from anon (' + sensitive_probe + ')')
        else:
            print('SECURITY RISK: anon can read', sensitive_probe)
    except Exception as e:
        print('RLS probe:', str(e)[:80])
    partners = next((r for r in rows if r.get('store_key') == 'site_partners'), None)
    settings = next((r for r in rows if r.get('store_key') == 'system_settings'), None)
    if settings:
        print('system_settings updated_at:', settings.get('updated_at'))
    if partners:
        print('site_partners updated_at:', partners.get('updated_at'))
    sys.exit(0 if not missing else 0)


if __name__ == '__main__':
    main()
