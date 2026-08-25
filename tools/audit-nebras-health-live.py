#!/usr/bin/env python3
"""Full live health audit for Nebras site."""
import json
import os
import re
import urllib.error
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
issues = []
notes = []


def get(path, timeout=45):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasAudit/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read()


def code_of(path, method='GET', body=None, headers=None):
    h = {'User-Agent': 'NebrasAudit/1', 'Content-Type': 'application/json'}
    if headers:
        h.update(headers)
    data = body.encode() if isinstance(body, str) else body
    req = urllib.request.Request(SITE + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode('utf-8', 'replace')[:200]
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', 'replace')[:200]


def main():
    print('=== NEBRAS LIVE HEALTH AUDIT ===\n')
    st, html_b = get('/')
    html = html_b.decode('utf-8', 'replace')
    m = re.search(r'data-nebras-deploy="([^"]+)"', html)
    v = m.group(1) if m else 'unknown'
    print('HTTP /:', st, '| deploy:', v)
    if st != 200:
        issues.append('Homepage not 200')
    if v != 'hrws271':
        notes.append('Deploy tag is ' + v + ' (expected hrws271 if latest)')

    # assets linked
    refs = re.findall(r'(?:href|src)="((?:css|js)/[^"#?]+(?:\?v=[^"]+)?)"', html)
    fail_assets = []
    for rel in refs:
        try:
            code, _ = get('/' + rel.lstrip('/'))
            if code != 200:
                fail_assets.append((rel, code))
        except Exception as e:
            fail_assets.append((rel, str(e)[:50]))
    print('Linked assets:', len(refs), '| fail:', len(fail_assets))
    if fail_assets:
        issues.append('Broken assets: ' + ', '.join(a[0] for a in fail_assets[:8]))

    # critical feature flags
    _, pl_b = get('/js/nebras-platform.js?v=' + v)
    pl = pl_b.decode('utf-8', 'replace')
    _, od_b = get('/js/nebras-odoo-write.js?v=' + v)
    od = od_b.decode('utf-8', 'replace')
    _, integ_b = get('/js/nebras-platform-integrity.js?v=' + v)
    integ = integ_b.decode('utf-8', 'replace')
    _, mob_b = get('/js/nebras-mobile-app.js?v=' + v)
    mob = mob_b.decode('utf-8', 'replace')
    _, cp_b = get('/js/nebras-customer-portal.js?v=' + v)
    cp = cp_b.decode('utf-8', 'replace')

    flags = [
        ('SERVER_FIRST', 'NEBRAS_SERVER_FIRST_MODE = true' in pl),
        ('PRODUCTION_LIVE', 'NEBRAS_PRODUCTION_LIVE_MODE = true' in pl),
        ('prod-live-5', 'prod-live-5' in pl or 'prod-live-5' in integ),
        ('quiet_UI', 'NEBRAS_ODOO_QUIET_UI' in od),
        ('session_restore', 'restoreNebrasUserSessionsAfterBootstrap' in pl),
        ('live_save', 'persistNebrasLiveNow' in pl),
        ('public_pull_keys', 'PUBLIC_LIVE_PULL_KEYS' in integ),
        ('realtime_sync', 'isNebrasRealtimeActive' in open(os.path.join(ROOT, 'js/nebras-realtime-sync.js'), encoding='utf-8').read()),
        ('perf_module', 'nebrasRunWhenIdle' in open(os.path.join(ROOT, 'js/nebras-perf.js'), encoding='utf-8').read()),
        ('public_poll_120s', 'NEBRAS_PUBLIC_SITE_POLL_MS = 120000' in pl),
        ('visitor_lazy', 'visitor:' in open(os.path.join(ROOT, 'js/nebras-dept-lazy.js'), encoding='utf-8').read()),
        ('mobile_app', 'resolveAppPersona' in mob or 'visitor:' in open(os.path.join(ROOT, 'js/nebras-dept-lazy.js'), encoding='utf-8').read()),
        ('customer_portal_inline', 'nebras-customer-portal.js' in html),
        ('customer_type', 'CP_CUSTOMER_TYPE_BUSINESS' in cp),
        ('portal_session', 'resumeCustomerPortalAfterBootstrap' in cp),
        ('registration_approval', 'approveCpRegistration' in cp and 'portal_register' in open(os.path.join(ROOT, 'api/nebras-visitor-intake.js'), encoding='utf-8').read()),
        ('admin_autosync', 'nebras-admin-session' in open(os.path.join(ROOT, 'js/nebras-platform-integrity.js'), encoding='utf-8').read()),
        ('admin_core_lazy', 'adminCore' in open(os.path.join(ROOT, 'js/nebras-dept-lazy.js'), encoding='utf-8').read()),
        ('hq_decision_queue', 'renderHqDecisionQueueStrip' in pl),
        ('visitor_slim_load', 'loadAdminBusinessCacheFromLocal' in pl),
    ]
    print('\nFeature flags:')
    for name, ok in flags:
        print(' ', 'PASS' if ok else 'FAIL', name)
        if not ok:
            issues.append('Missing feature: ' + name)

    # APIs
    print('\nAPIs:')
    api_checks = [
        ('auth verify (no token)', '/api/nebras-auth?action=verify', 'GET', None, {401}),
        ('auth login empty', '/api/nebras-auth?action=login', 'POST', '{}', {400}),
        ('privacy policy', '/privacy-policy.html', 'GET', None, {200}),
        ('app mode', '/?app=1', 'GET', None, {200}),
        ('manifest', '/site.webmanifest', 'GET', None, {200}),
    ]
    for label, path, method, body, expect in api_checks:
        code, _ = code_of(path, method, body)
        ok = code in expect
        print(' ', 'PASS' if ok else 'FAIL', label, code)
        if not ok:
            issues.append(label + ' unexpected status ' + str(code))

    # syntax smoke: unmatched obvious broken patterns in platform
    print('\nStatic smoke:')
    smoke = [
        ('platform ends cleanly', pl.rstrip().endswith('}') or 'bindNebrasHrPlatformGlobals' in pl[-500:]),
        ('no FIXME critical in integrity', integ.count('FIXME') < 5),
        ('mobile app loaded in index', 'nebras-mobile-app.js' in html or 'visitor:' in open(os.path.join(ROOT, 'js/nebras-dept-lazy.js'), encoding='utf-8').read()),
        ('customer portal css', '42-customer-portal.css' in html),
        ('54 mobile app css', '54-nebras-mobile-app.css' in html),
    ]
    for name, ok in smoke:
        print(' ', 'PASS' if ok else 'FAIL', name)
        if not ok:
            issues.append(name)

    # catalog quick
    SUPABASE = 'https://oedldllrjavofpeaputz.supabase.co'
    ANON = 'sb_publishable_bt6rlHxu_pjc1xpkKEWOcg_HZ43JMR0'
    url = SUPABASE + '/rest/v1/nebras_data_store?store_key=eq.site_products&select=payload'
    req = urllib.request.Request(url, headers={'apikey': ANON, 'Authorization': 'Bearer ' + ANON})
    rows = json.loads(urllib.request.urlopen(req, timeout=40).read())
    products = rows[0]['payload'] if rows else []
    by = {p.get('id'): p for p in products if isinstance(p, dict)}
    wpc = len((by.get('prod-wpc') or {}).get('variants') or [])
    raw = len((by.get('prod-wpc-raw') or {}).get('variants') or [])
    print('\nCatalog cloud: products=', len(by), 'wpc=', wpc, 'raw=', raw)
    if wpc < 40:
        issues.append('WPC ready variants unexpectedly low: ' + str(wpc))
    if raw < 40:
        issues.append('WPC raw variants unexpectedly low: ' + str(raw))

    print('\n=== SUMMARY ===')
    if not issues:
        print('NO CRITICAL ISSUES — site healthy on', v)
    else:
        print('ISSUES FOUND:', len(issues))
        for i in issues:
            print(' -', i)
    if notes:
        print('Notes:')
        for n in notes:
            print(' -', n)
    return 0 if not issues else 1


if __name__ == '__main__':
    raise SystemExit(main())
