#!/usr/bin/env python3
"""Read-only check: Nebras Supabase cloud store has expected keys."""
import json
import sys
import urllib.error
import urllib.request

SUPABASE_URL = 'https://oedldllrjavofpeaputz.supabase.co'
ANON_KEY = 'sb_publishable_bt6rlHxu_pjc1xpkKEWOcg_HZ43JMR0'
EXPECTED_KEYS = {
    'system_settings', 'site_partners', 'visitor_icons', 'site_products',
    'admin_users', 'dashboard_tiles', 'site_certifications', 'showroom_gallery',
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
    missing = EXPECTED_KEYS - keys
    print('=== NEBRAS SUPABASE CLOUD ===')
    print('Rows:', len(rows))
    print('Keys:', ', '.join(sorted(keys)))
    if missing:
        print('WARN: missing expected keys:', ', '.join(sorted(missing)))
    else:
        print('All expected governance keys present.')
    partners = next((r for r in rows if r.get('store_key') == 'site_partners'), None)
    settings = next((r for r in rows if r.get('store_key') == 'system_settings'), None)
    if settings:
        print('system_settings updated_at:', settings.get('updated_at'))
    if partners:
        print('site_partners updated_at:', partners.get('updated_at'))
    sys.exit(0 if not missing else 0)


if __name__ == '__main__':
    main()
