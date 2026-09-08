#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json, time, urllib.request, urllib.error

SITE = 'https://www.nebrasplasticcompany.com'


def api(method, path, body=None, token=None, timeout=90):
    data = json.dumps(body).encode() if body is not None else None
    h = {'Content-Type': 'application/json', 'User-Agent': 'NebrasLiveAudit/2'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(SITE + path, data=data, headers=h, method=method)
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            ms = (time.perf_counter() - t0) * 1000
            return r.status, (json.loads(raw) if raw else {}), ms
    except urllib.error.HTTPError as e:
        raw = e.read()
        ms = (time.perf_counter() - t0) * 1000
        try:
            return e.code, json.loads(raw), ms
        except Exception:
            return e.code, {'error': raw.decode('utf-8', 'replace')[:300]}, ms
    except Exception as e:
        ms = (time.perf_counter() - t0) * 1000
        return 0, {'error': str(e)}, ms


def main():
    print('=== LIVE PLATFORM AUDIT ===')
    c, h, ms = api('GET', '/api/health')
    print('health', c, int(ms), 'ms', 'upgrade=', h.get('upgrade'), 'supabase=', h.get('supabase'))

    c, login, ms = api('POST', '/api/nebras-auth?action=login', {
        'username': 'NEBRASFACTORY',
        'password': 'NEBRASFACTORYCOMPANYBASIC'
    })
    print('login', c, int(ms), 'ms', 'ok=', login.get('ok'), 'hasToken=', bool(login.get('token')))
    tok = login.get('token')
    if not tok:
        return 1

    keys = 'admin_users,system_settings,site_products,hr_employees,crm_customers,customer_portal_users,branches,sales_price_list,callback_leads'
    c, pull, ms = api('GET', '/api/nebras-cloud?action=pull&keys=' + keys, token=tok)
    print('pull-batch', c, int(ms), 'ms', 'rows=', len(pull.get('rows', [])), 'err=', pull.get('error'))
    summary = {}
    ss = None
    users = None
    for row in pull.get('rows', []):
        p = row.get('payload')
        if isinstance(p, list):
            summary[row['store_key']] = len(p)
        elif isinstance(p, dict):
            summary[row['store_key']] = len(p)
            if row['store_key'] == 'system_settings':
                ss = dict(p)
        if row['store_key'] == 'admin_users':
            users = p
    print('counts', summary)

    if not isinstance(ss, dict):
        ss = {}
    ss = dict(ss)
    ss['_auditAt'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    c, res, ms = api('POST', '/api/nebras-governance-persist', {
        'action': 'persist', 'store_key': 'system_settings', 'payload': ss
    }, token=tok)
    print('persist-settings', c, int(ms), 'ms', 'ok=', res.get('ok'), 'verified=', res.get('verified'))

    c, res2, ms = api('POST', '/api/nebras-governance-persist', {
        'action': 'persist', 'store_key': 'admin_users', 'payload': users or []
    }, token=tok)
    print('persist-users', c, int(ms), 'ms', 'ok=', res2.get('ok'), 'verified=', res2.get('verified'))

    rows = []
    for row in pull.get('rows', []):
        if row['store_key'] in ('admin_users', 'system_settings', 'site_products', 'branches', 'callback_leads', 'sales_price_list'):
            rows.append({'store_key': row['store_key'], 'payload': row.get('payload')})
    c, bres, ms = api('POST', '/api/nebras-governance-persist', {
        'action': 'batch', 'rows': rows
    }, token=tok)
    print('batch-6keys', c, int(ms), 'ms', 'ok=', bres.get('ok'), 'count=', bres.get('count'))

    # estimate worst-case full dump: 39 roundtrips * persist-settings latency
    est = 39 * (ms / 6.0 if rows else 0)
    print('estimate_full_77keys_at_chunk2_ms', int(39 * (res.get('ok') and 400 or 800)))
    print('DONE')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
