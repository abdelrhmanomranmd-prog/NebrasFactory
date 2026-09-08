#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Restore site_products + system_settings from cloud snapshots after accidental diag overwrite."""
import json
import urllib.request
import urllib.error

SITE = 'https://www.nebrasplasticcompany.com'


def api(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {'Content-Type': 'application/json', 'User-Agent': 'NebrasRestore/2'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(SITE + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {'error': raw.decode('utf-8', 'replace')[:500]}


def main():
    code, login = api('POST', '/api/nebras-auth?action=login', {
        'username': 'NEBRASFACTORY',
        'password': 'NEBRASFACTORYCOMPANYBASIC'
    })
    if not login.get('ok'):
        print('FAIL login', code, login)
        return 1
    tok = login['token']
    code, pull = api('GET', '/api/nebras-cloud?action=pull&keys=nebras_cloud_snapshots', token=tok)
    snaps = {}
    for row in pull.get('rows', []):
        if row.get('store_key') == 'nebras_cloud_snapshots':
            snaps = row.get('payload') or {}
    by = snaps.get('byKey') or {}

    def best_snapshot(key, prefer_len=None):
        arr = by.get(key) or []
        if not arr:
            return None
        # prefer largest list / richest dict that is not the diag wipe
        best = None
        best_score = -1
        for s in arr:
            pay = s.get('payload') if isinstance(s, dict) else None
            if pay is None:
                continue
            if isinstance(pay, list):
                if len(pay) == 1 and isinstance(pay[0], dict) and str(pay[0].get('id') or '').startswith('diag'):
                    continue
                score = len(pay)
            elif isinstance(pay, dict):
                if pay.get('_diag') or pay.get('probe') is True:
                    continue
                score = len(pay.keys())
            else:
                continue
            if score > best_score:
                best_score = score
                best = pay
        return best

    products = best_snapshot('site_products')
    settings = best_snapshot('system_settings')
    print('restore products', len(products) if isinstance(products, list) else None)
    print('restore settings keys', len(settings) if isinstance(settings, dict) else None)
    if not products or not settings:
        print('FAIL missing snapshot data')
        return 1

    code, res = api('POST', '/api/nebras-governance-persist', {
        'action': 'batch',
        'rows': [
            {'store_key': 'site_products', 'payload': products},
            {'store_key': 'system_settings', 'payload': settings},
        ]
    }, token=tok)
    print('persist', code, res)
    if not res.get('ok'):
        return 1

    # verify via single persist verified path
    code, v1 = api('POST', '/api/nebras-governance-persist', {
        'action': 'persist', 'store_key': 'site_products', 'payload': products
    }, token=tok)
    print('verify products', v1.get('ok'), v1.get('count'), v1.get('verified'))
    code, v2 = api('POST', '/api/nebras-governance-persist', {
        'action': 'persist', 'store_key': 'system_settings', 'payload': settings
    }, token=tok)
    print('verify settings', v2.get('ok'), v2.get('count'), v2.get('verified'))
    print('RESULT: RESTORED')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
