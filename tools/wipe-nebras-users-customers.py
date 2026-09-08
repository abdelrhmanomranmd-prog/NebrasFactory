#!/usr/bin/env python3
"""تصفير المستخدمين والعملاء فقط — يبقى NEBRASFACTORY. لا يمس المنتجات."""
import json
import sys
import urllib.error
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'
NEBRAS_PW_HASH_PREFIX = 'nbh1:'


def hash_nebras_password(pw):
    h1 = 5381
    h2 = 0
    s = str(pw) + '|NEBRAS_FACTORY_SALT_v1'
    for ch in s:
        c = ord(ch)
        h1 = ((h1 << 5) + h1 + c) & 0xFFFFFFFF
        h2 = (h2 * 31 + c) & 0xFFFFFFFF
    return NEBRAS_PW_HASH_PREFIX + format(h1, 'x') + format(h2, 'x')


def api(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {'Content-Type': 'application/json', 'User-Agent': 'NebrasUsersWipe/1'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(SITE + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {'error': raw.decode('utf-8', 'replace')[:400]}


def primary_admin():
    return [{
        'id': 'nebras-factory-admin',
        'username': 'NEBRASFACTORY',
        'password': hash_nebras_password('NEBRASFACTORYCOMPANYBASIC'),
        'role': 'superadmin',
        'isPrimary': True,
        'isActive': True,
        'permissions': None,
        'createdAt': '2026-01-01T00:00:00.000Z',
        'updatedAt': '2026-01-01T00:00:00.000Z'
    }]


def wipe_rows():
    rows = [
        ('admin_users', primary_admin()),
        ('customer_portal_users', []),
        ('customer_portal_audit', []),
        ('customer_registration_requests', []),
        ('customer_order_journeys', []),
        ('crm_customers', []),
        ('crm_opportunities', []),
        ('crm_activities', []),
        ('crm_audit', []),
        ('customer_service', []),
        ('admin_presence', {}),
        # موظفون / تشغيل — بداية من الصفر (ليست حسابات دخول، لكن بيانات موظفين)
        ('hr_employees', []),
        ('hr_vehicles', []),
        ('hr_leave', []),
        ('hr_vehicle_tracking', []),
        ('hr_attendance', []),
        ('hr_documents', []),
        ('hr_payroll', []),
        ('hr_companies', []),
        ('hr_gps_positions', []),
        ('hr_travel', []),
        ('hr_deductions', []),
        ('hr_advances', []),
        ('hr_vehicle_violations', []),
        ('callback_leads', []),
        ('complaints', {}),
        ('sales_data', []),
        ('sales_quotes_inbox', []),
    ]
    return [{'store_key': k, 'payload': p} for k, p in rows]


def main():
    print('=== NEBRAS WIPE USERS + CUSTOMERS (keep HQ only) ===')
    code, login = api('POST', '/api/nebras-auth?action=login', {
        'username': 'NEBRASFACTORY',
        'password': 'NEBRASFACTORYCOMPANYBASIC'
    })
    if not login.get('ok'):
        print('FAIL login:', code, login)
        return 1
    token = login['token']
    print('PASS login')

    rows = wipe_rows()
    batch_size = 6
    ok_count = 0
    for i in range(0, len(rows), batch_size):
        chunk = rows[i:i + batch_size]
        code, res = api('POST', '/api/nebras-governance-persist', {
            'action': 'batch',
            'rows': chunk
        }, token=token)
        if not res.get('ok'):
            print('FAIL batch', i // batch_size + 1, code, res)
            return 1
        ok_count += res.get('count', len(chunk))
        print('OK batch', i // batch_size + 1, 'keys:', [r['store_key'] for r in chunk])

    keys = 'admin_users,customer_portal_users,crm_customers,customer_registration_requests,hr_employees,callback_leads'
    code, pull = api('GET', '/api/nebras-cloud?action=pull&keys=' + keys, token=token)
    summary = {}
    users = []
    for row in pull.get('rows', []):
        p = row.get('payload')
        if row.get('store_key') == 'admin_users':
            users = p if isinstance(p, list) else []
        if isinstance(p, list):
            summary[row['store_key']] = len(p)
        elif isinstance(p, dict):
            summary[row['store_key']] = len(p)
        else:
            summary[row['store_key']] = 0
    names = [u.get('username') for u in users if isinstance(u, dict)]
    print('VERIFY:', summary)
    print('admin_users:', names)
    if names != ['NEBRASFACTORY']:
        print('FAIL: expected only NEBRASFACTORY, got', names)
        return 1
    for k in ('customer_portal_users', 'crm_customers', 'hr_employees', 'callback_leads'):
        if summary.get(k, 0):
            print('FAIL: not empty', k, summary.get(k))
            return 1
    print('RESULT: FRESH START OK — HQ only · no customers · no employees')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
