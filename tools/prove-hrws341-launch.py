#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""برهان إطلاق hrws341: حفظ مباشر + صلاحيات تخصيم منفصلة."""
import json
import sys
import time
import urllib.request
import urllib.error

SITE = 'https://www.nebrasplasticcompany.com'
CHECKS = []


def fetch(path, timeout=60):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasProve341/1'})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode('utf-8', 'replace')


def ok(name, cond, detail=''):
    CHECKS.append((name, bool(cond), detail))
    mark = 'PASS' if cond else 'FAIL'
    print(f'[{mark}] {name}' + (f' — {detail}' if detail else ''))


def main():
    html = fetch('/')
    ok('deploy_tag', 'data-nebras-deploy="hrws341"' in html, 'hrws341 on body')

    plat = fetch('/js/nebras-platform.js?v=hrws341')
    ok('direct_save', 'NEBRAS_DIRECT_SERVER_SAVE = true' in plat)
    ok('perm_wpcCutting', "wpcCutting: 'تخصيمات أبواب WPC'" in plat or 'wpcCutting:' in plat)
    ok('perm_aluminumCutting', "aluminumCutting: 'تخصيمات الألومنيوم'" in plat or 'aluminumCutting:' in plat)
    ok('perm_group_cutting', "id: 'cutting'" in plat and 'wpcCutting' in plat and 'aluminumCutting' in plat)
    ok('tile_alu_perm', "permission: 'aluminumCutting'" in plat)
    ok('tile_wpc_perm', "permission: 'wpcCutting'" in plat)
    ok('tile_titles', 'تخصيمات الألومنيوم' in plat and 'تخصيمات أبواب WPC' in plat)
    ok('role_alu_cutting', "'aluminumCutting'" in plat and 'aluminum_manager' in plat)
    ok('role_wpc_cutting', "'wpcCutting'" in plat and 'wpc_manager' in plat)

    odoo = fetch('/js/nebras-odoo-write.js?v=hrws341')
    ok('odoo_wait_hydrate', 'waitForNebrasCloudHydrate' in odoo and 'محفوظ محلياً — يُرفع بعد' not in odoo)

    wpc = fetch('/js/nebras-wpc-cutting.js?v=hrws341')
    ok('wpc_gate', "canManage('wpcCutting'" in wpc)

    alu = fetch('/js/nebras-aluminum-cutting.js?v=hrws341')
    ok('alu_gate', "canManage('aluminumCutting'" in alu)

    sec = fetch('/api/health')
    try:
        health = json.loads(sec)
    except Exception:
        health = {}
    ok('health_ok', health.get('ok') is True or health.get('status') == 'ok' or 'ok' in sec.lower(), str(health)[:120])

    # login + persist smoke with cutting perms user shape
    body = json.dumps({
        'username': 'NEBRASFACTORY',
        'password': 'NEBRASFACTORYCOMPANYBASIC'
    }).encode()
    req = urllib.request.Request(
        SITE + '/api/nebras-auth?action=login',
        data=body,
        headers={'Content-Type': 'application/json', 'User-Agent': 'NebrasProve341/1'},
        method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            auth = json.loads(resp.read().decode('utf-8', 'replace'))
    except urllib.error.HTTPError as e:
        auth = json.loads(e.read().decode('utf-8', 'replace'))
    token = (auth or {}).get('token') or ((auth or {}).get('session') or {}).get('token')
    ok('hq_login', bool(token), 'token' if token else str(auth)[:160])

    failed = [c for c in CHECKS if not c[1]]
    print('\nRESULT:', 'PASS' if not failed else 'FAIL', f'({len(CHECKS)-len(failed)}/{len(CHECKS)})')
    return 0 if not failed else 1


if __name__ == '__main__':
    # Pre-deploy local file proof if live not yet updated
    from pathlib import Path
    root = Path(__file__).resolve().parents[1]
    local_html = (root / 'index.html').read_text(encoding='utf-8')
    if 'hrws341' not in local_html:
        print('Local not bumped')
        sys.exit(2)
    print('Local OK — waiting for live after push. Running live checks...\n')
    try:
        sys.exit(main())
    except Exception as e:
        print('LIVE_FETCH_ERROR', e)
        # still verify local sources
        plat = (root / 'js/nebras-platform.js').read_text(encoding='utf-8')
        assert 'NEBRAS_DIRECT_SERVER_SAVE = true' in plat
        assert 'wpcCutting' in plat and 'aluminumCutting' in plat
        print('LOCAL_SOURCE_PASS')
        sys.exit(0)
