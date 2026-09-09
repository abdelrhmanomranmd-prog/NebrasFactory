#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""برهان الدفتين: تخصيمات أبواب WPC + تخصيمات الألومنيوم — حي ومنفصل."""
import json
import time
import urllib.parse
import urllib.request
import urllib.error

SITE = 'https://www.nebrasplasticcompany.com'
CHECKS = []


def ok(name, cond, detail=''):
    CHECKS.append((name, bool(cond), detail))
    print(('PASS' if cond else 'FAIL'), name, detail)


def api(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {'Content-Type': 'application/json', 'User-Agent': 'NebrasDualBooks/1'}
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
            return e.code, {'error': raw.decode('utf-8', 'replace')[:200]}


def main():
    html = urllib.request.urlopen(SITE + '/', timeout=40).read().decode('utf-8', 'replace')
    ok('shell_alu', 'id="aluminum-cutting"' in html)
    ok('shell_wpc', 'id="wpc-cutting"' in html)
    ok('title_alu', 'تخصيمات الألومنيوم' in html)
    ok('title_wpc', 'تخصيمات أبواب WPC' in html or 'تخصيمات WPC' in html)
    ok('badge_alu', 'alu-live-save-badge' in html)
    ok('badge_wpc', 'wpc-live-save-badge' in html)

    ver = 'hrws344' if 'hrws344' in html else ('hrws343' if 'hrws343' in html else 'hrws342')
    ok('deploy', ver in html, ver)

    plat = urllib.request.urlopen(SITE + '/js/nebras-platform.js?v=' + ver, timeout=60).read().decode('utf-8', 'replace')
    ok('perm_split', 'wpcCutting' in plat and 'aluminumCutting' in plat)
    ok('tile_alu', "permission: 'aluminumCutting'" in plat)
    ok('tile_wpc', "permission: 'wpcCutting'" in plat)
    ok('erp_alu_cutting', 'erp-aluminum-cutting' in plat or ver < 'hrws344')

    wpc = urllib.request.urlopen(SITE + '/js/nebras-wpc-cutting.js?v=' + ver, timeout=60).read().decode('utf-8', 'replace')
    alu = urllib.request.urlopen(SITE + '/js/nebras-aluminum-cutting.js?v=' + ver, timeout=60).read().decode('utf-8', 'replace')
    ok('wpc_persist', 'persistWpcCuttingCloud' in wpc and 'waitHydrate' in wpc)
    ok('alu_persist', 'persistAluminumCuttingCloud' in alu and 'waitHydrate' in alu)
    ok('wpc_gate', "canManage('wpcCutting'" in wpc)
    ok('alu_gate', "canManage('aluminumCutting'" in alu)
    ok('separate_books', 'aluminum_manager' in wpc and 'return false' in wpc)

    code, login = api('POST', '/api/nebras-auth?action=login', {
        'username': 'NEBRASFACTORY', 'password': 'NEBRASFACTORYCOMPANYBASIC'
    })
    token = login.get('token')
    ok('hq_login', bool(token))
    if token:
        marker = '_dualBooks_' + str(int(time.time()))[-6:]
        code, batch = api('POST', '/api/nebras-governance-persist', {
            'action': 'batch',
            'rows': [
                {'store_key': 'wpc_cut_settings', 'payload': {'_dual': marker, 'book': 'wpc'}},
                {'store_key': 'aluminum_cut_settings', 'payload': {'_dual': marker, 'book': 'alu'}},
            ]
        }, token=token)
        ok('cloud_both_books', code == 200 and batch.get('ok') is True, str(batch.get('keys')))
        qs = urllib.parse.urlencode({
            'action': 'pull',
            'keys': 'wpc_cut_settings,aluminum_cut_settings'
        })
        code, pulled = api('GET', '/api/nebras-cloud?' + qs, token=token)
        rows = {r['store_key']: r.get('payload') for r in (pulled.get('rows') or []) if r}
        ok('pull_wpc', isinstance(rows.get('wpc_cut_settings'), dict) and rows['wpc_cut_settings'].get('_dual') == marker)
        ok('pull_alu', isinstance(rows.get('aluminum_cut_settings'), dict) and rows['aluminum_cut_settings'].get('_dual') == marker)

    failed = [c for c in CHECKS if not c[1]]
    print('\nRESULT', 'PASS' if not failed else 'FAIL', f'{len(CHECKS)-len(failed)}/{len(CHECKS)}')
    for n, g, d in failed:
        print(' -', n, d)
    return 0 if not failed else 1


if __name__ == '__main__':
    raise SystemExit(main())
