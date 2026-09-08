#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""إثبات حي: الإدارة الرئيسية تحفظ على السيرفر/السحابة بدون قيود."""
import json
import time
import urllib.parse
import urllib.request
import urllib.error

SITE = 'https://www.nebrasplasticcompany.com'
SUPABASE = 'https://oedldllrjavofpeaputz.supabase.co'
ANON = 'sb_publishable_bt6rlHxu_pjc1xpkKEWOcg_HZ43JMR0'
TS = str(int(time.time()))
MARKER = '_nebrasUnrestricted_' + TS[-8:]
CHECKS = []


def ok(name, cond, detail=''):
    CHECKS.append((name, bool(cond), detail))
    print(('PASS' if cond else 'FAIL'), name, detail)


def api(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {'Content-Type': 'application/json', 'User-Agent': 'NebrasUnrestrictedProof/1'}
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
            return e.code, {'error': raw.decode('utf-8', 'replace')[:300]}


def sb(store_key):
    url = (
        SUPABASE + '/rest/v1/nebras_data_store?store_key=eq.' + store_key +
        '&select=payload,updated_at'
    )
    req = urllib.request.Request(url, headers={'apikey': ANON, 'Authorization': 'Bearer ' + ANON})
    with urllib.request.urlopen(req, timeout=60) as resp:
        rows = json.loads(resp.read())
    if not rows:
        return None, None
    return rows[0].get('payload'), rows[0].get('updated_at')


def pull_keys(token, keys):
    qs = urllib.parse.urlencode({'action': 'pull', 'keys': ','.join(keys)})
    return api('GET', '/api/nebras-cloud?' + qs, token=token)


def main():
    html = urllib.request.urlopen(SITE + '/', timeout=40).read().decode('utf-8', 'replace')
    tag_ok = 'data-nebras-deploy="hrws342"' in html
    ok('live_hrws342', tag_ok, 'deploy tag')

    ver = 'hrws342' if tag_ok else 'hrws341'
    plat = urllib.request.urlopen(SITE + '/js/nebras-platform.js?v=' + ver, timeout=60).read().decode('utf-8', 'replace')
    ok('direct_flag', 'NEBRAS_DIRECT_SERVER_SAVE = true' in plat)
    ok('push_waits', 'push_wait_hydrate' in plat or 'رفع كامل: انتظار التحميل' in plat)

    code, health = api('GET', '/api/health')
    ok('health', code == 200 and health.get('ok') is True, str(health.get('supabase') or '')[:80])

    code, login = api('POST', '/api/nebras-auth?action=login', {
        'username': 'NEBRASFACTORY',
        'password': 'NEBRASFACTORYCOMPANYBASIC'
    })
    token = login.get('token')
    ok('hq_login', code == 200 and bool(token))
    if not token:
        print('RESULT FAIL')
        return 1

    # Snapshot originals
    code, pulled0 = pull_keys(token, ['system_settings', 'wpc_cut_settings', 'aluminum_cut_settings'])
    ok('pull_ok', code == 200 and pulled0.get('ok') is True, str(pulled0.get('error') or 'rows=' + str(len(pulled0.get('rows') or []))))
    originals = {}
    for r in pulled0.get('rows') or []:
        if r and r.get('store_key'):
            originals[r['store_key']] = r.get('payload')

    settings = dict(originals.get('system_settings') or {})
    if not isinstance(settings, dict):
        settings = {}
    settings[MARKER] = TS

    wpc = originals.get('wpc_cut_settings')
    if not isinstance(wpc, dict):
        wpc = {}
    else:
        wpc = dict(wpc)
    wpc[MARKER] = TS

    alu = originals.get('aluminum_cut_settings')
    if not isinstance(alu, dict):
        alu = {}
    else:
        alu = dict(alu)
    alu[MARKER] = TS

    code, batch = api('POST', '/api/nebras-governance-persist', {
        'action': 'batch',
        'rows': [
            {'store_key': 'system_settings', 'payload': settings},
            {'store_key': 'wpc_cut_settings', 'payload': wpc},
            {'store_key': 'aluminum_cut_settings', 'payload': alu},
        ]
    }, token=token)
    ok('batch_no_restrict', code == 200 and batch.get('ok') is True, str(batch)[:140])
    skipped = batch.get('skipped') or []
    ok('zero_forbidden', not any('forbidden' in str(s).lower() for s in skipped), str(skipped)[:80])

    time.sleep(0.8)

    sb_set, at = sb('system_settings')
    ok('settings_in_supabase', isinstance(sb_set, dict) and sb_set.get(MARKER) == TS, at or '')

    code, pulled1 = pull_keys(token, ['wpc_cut_settings', 'aluminum_cut_settings', 'system_settings'])
    got = {r['store_key']: r.get('payload') for r in (pulled1.get('rows') or []) if r and r.get('store_key')}
    ok('wpc_cut_cloud', isinstance(got.get('wpc_cut_settings'), dict) and got['wpc_cut_settings'].get(MARKER) == TS)
    ok('alu_cut_cloud', isinstance(got.get('aluminum_cut_settings'), dict) and got['aluminum_cut_settings'].get(MARKER) == TS)

    # Restore originals (strip marker)
    restore_rows = []
    for key, payload in originals.items():
        if key == 'system_settings' and isinstance(payload, dict):
            p = dict(payload)
            p.pop(MARKER, None)
            restore_rows.append({'store_key': key, 'payload': p})
        elif isinstance(payload, dict):
            p = dict(payload)
            p.pop(MARKER, None)
            restore_rows.append({'store_key': key, 'payload': p})
        elif payload is not None:
            restore_rows.append({'store_key': key, 'payload': payload})
    if restore_rows:
        api('POST', '/api/nebras-governance-persist', {'action': 'batch', 'rows': restore_rows}, token=token)

    failed = [c for c in CHECKS if not c[1]]
    print('\nRESULT', 'PASS' if not failed else 'FAIL', f'{len(CHECKS)-len(failed)}/{len(CHECKS)}')
    for name, good, detail in failed:
        print(' -', name, detail)
    return 0 if not failed else 1


if __name__ == '__main__':
    raise SystemExit(main())
