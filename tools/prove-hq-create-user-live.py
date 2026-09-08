#!/usr/bin/env python3
"""إثبات ديناميكية السيرفر: الإدارة الرئيسية تنشئ مستخدماً → يُحفظ في السحابة → يدخل → يُحذف."""
import json
import sys
import time
import urllib.error
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'
NEBRAS_PW_HASH_PREFIX = 'nbh1:'
TEST_USER = 'NEBRASTESTREP'
TEST_PASS = 'NebrasTestRep2026!'
TEST_ID = 'prove-dyn-rep-001'


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
    h = {'Content-Type': 'application/json', 'User-Agent': 'NebrasProveUsers/1'}
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
    return {
        'id': 'nebras-factory-admin',
        'username': 'NEBRASFACTORY',
        'password': hash_nebras_password('NEBRASFACTORYCOMPANYBASIC'),
        'role': 'superadmin',
        'isPrimary': True,
        'isActive': True,
        'permissions': None,
        'createdAt': '2026-01-01T00:00:00.000Z',
        'updatedAt': '2026-01-01T00:00:00.000Z'
    }


def test_rep():
    now = time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    return {
        'id': TEST_ID,
        'username': TEST_USER,
        'password': hash_nebras_password(TEST_PASS),
        'role': 'sales_rep',
        'permissions': ['sales', 'quotes', 'createCustomerUser'],
        'isPrimary': False,
        'isActive': True,
        'phone': '0500000999',
        'createdAt': now,
        'updatedAt': now,
        'createdBy': 'NEBRASFACTORY'
    }


def persist_users(token, users):
    code, res = api('POST', '/api/nebras-governance-persist', {
        'action': 'batch',
        'rows': [{'store_key': 'admin_users', 'payload': users}]
    }, token=token)
    return code, res


def pull_users(token):
    code, pull = api('GET', '/api/nebras-cloud?action=pull&keys=admin_users', token=token)
    for row in pull.get('rows', []):
        if row.get('store_key') == 'admin_users':
            return row.get('payload') or []
    return []


def main():
    print('=== PROVE HQ CREATE USER -> LIVE CLOUD ===')
    code, login = api('POST', '/api/nebras-auth?action=login', {
        'username': 'NEBRASFACTORY',
        'password': 'NEBRASFACTORYCOMPANYBASIC'
    })
    if not login.get('ok'):
        print('FAIL HQ login', code, login)
        return 1
    token = login['token']
    print('PASS HQ login')

    # 1) Start from HQ only
    code, res = persist_users(token, [primary_admin()])
    if not res.get('ok'):
        print('FAIL reset HQ-only', code, res)
        return 1
    names = [u.get('username') for u in pull_users(token) if isinstance(u, dict)]
    print('STEP1 HQ-only:', names)
    if names != ['NEBRASFACTORY']:
        print('FAIL expected only NEBRASFACTORY')
        return 1

    # 2) HQ creates staff user (same path as dashboard save)
    code, res = persist_users(token, [primary_admin(), test_rep()])
    if not res.get('ok'):
        print('FAIL create user persist', code, res)
        return 1
    users = pull_users(token)
    names = [u.get('username') for u in users if isinstance(u, dict)]
    print('STEP2 after create:', names)
    if TEST_USER not in names or 'NEBRASFACTORY' not in names:
        print('FAIL user not in cloud pull')
        return 1

    # 3) New user can login on live auth API
    code, ulogin = api('POST', '/api/nebras-auth?action=login', {
        'username': TEST_USER,
        'password': TEST_PASS
    })
    if not ulogin.get('ok'):
        print('FAIL test user login', code, ulogin)
        persist_users(token, [primary_admin()])
        return 1
    print('PASS test user live login · role=', ulogin.get('user', {}).get('role'))

    # 4) Cleanup → HQ only again
    code, res = persist_users(token, [primary_admin()])
    if not res.get('ok'):
        print('FAIL cleanup', code, res)
        return 1
    names = [u.get('username') for u in pull_users(token) if isinstance(u, dict)]
    print('STEP4 cleaned:', names)
    if names != ['NEBRASFACTORY']:
        print('FAIL cleanup incomplete', names)
        return 1

    # 5) Confirm test user can no longer login
    code, ulogin2 = api('POST', '/api/nebras-auth?action=login', {
        'username': TEST_USER,
        'password': TEST_PASS
    })
    if ulogin2.get('ok'):
        print('FAIL deleted user still logs in')
        return 1
    print('PASS deleted user rejected')
    print('RESULT: LIVE USER DYNAMICS OK — HQ create/login/delete works on server')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
