#!/usr/bin/env python3
"""Ensure all Nebras cloud store keys exist in Supabase (insert missing only — no overwrite)."""
import json
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

SUPABASE_URL = 'https://oedldllrjavofpeaputz.supabase.co'
ANON_KEY = 'sb_publishable_bt6rlHxu_pjc1xpkKEWOcg_HZ43JMR0'

ALL_KEYS = {
    'site_products': [],
    'visitor_icons': [],
    'dashboard_tiles': [],
    'site_custom_sections': [],
    'about_pages': {},
    'system_settings': {},
    'admin_users': [],
    'branches': [],
    'complaints': [],
    'audit_logs': [],
    'erp_inventory': [],
    'erp_orders': [],
    'erp_procurement': [],
    'erp_production': [],
    'erp_purchases': [],
    'erp_transfers': [],
    'erp_stock_transfers': [],
    'sales_price_list': [],
    'site_partners': [],
    'site_certifications': [],
    'showroom_gallery': {},
    'visitor_analytics': {'sessions': [], 'totalVisits': 0, 'totalPageViews': 0, 'lastUpdated': 0},
    'sales_data': [],
    'customer_service': [],
    'sales_quotes_inbox': [],
    'analytics_governance': {'deleted': {'quotes': [], 'visitors': [], 'complaints': [], 'sales': [], 'customers': []}},
    'hr_employees': [],
    'hr_vehicles': [],
    'hr_leave': [],
    'hr_vehicle_tracking': [],
    'hr_attendance': [],
    'hr_documents': [],
    'hr_payroll': [],
    'hr_notifications': [],
    'hr_notif_settings': {},
    'hr_email_queue': [],
    'hr_shift_roster': [],
    'hr_dept_activity': [],
    'quote_registry': {'byDate': {}},
    'callback_leads': [],
}


def api_get(path):
    url = SUPABASE_URL + path
    req = urllib.request.Request(url, headers={
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + ANON_KEY,
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode('utf-8'))


def api_post(path, body, prefer='return=minimal'):
    url = SUPABASE_URL + path
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='POST', headers={
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': prefer,
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        if prefer == 'return=representation':
            return json.loads(resp.read().decode('utf-8'))
        return None


def main():
    print('=== PUSH NEBRAS SUPABASE CLOUD KEYS ===')
    try:
        rows = api_get('/rest/v1/nebras_data_store?select=store_key')
    except urllib.error.HTTPError as e:
        print('ERROR: cannot read nebras_data_store:', e.code, e.read().decode('utf-8', errors='replace')[:400])
        sys.exit(1)
    except Exception as e:
        print('ERROR:', e)
        sys.exit(1)

    existing = {r.get('store_key') for r in rows if r.get('store_key')}
    missing = [k for k in sorted(ALL_KEYS.keys()) if k not in existing]
    print('Existing keys:', len(existing))
    print('Expected keys:', len(ALL_KEYS))
    if not missing:
        print('OK: all keys already present — nothing to insert.')
        sys.exit(0)

    now = datetime.now(timezone.utc).isoformat()
    to_insert = [{
        'store_key': k,
        'payload': ALL_KEYS[k],
        'updated_at': now,
    } for k in missing]

    print('Inserting missing keys:', ', '.join(missing))
    try:
        api_post('/rest/v1/nebras_data_store', to_insert)
    except urllib.error.HTTPError as e:
        print('ERROR: insert failed:', e.code, e.read().decode('utf-8', errors='replace')[:500])
        sys.exit(1)

    print('OK: inserted', len(missing), 'keys.')
    sys.exit(0)


if __name__ == '__main__':
    main()
