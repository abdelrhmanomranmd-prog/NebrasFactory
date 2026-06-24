#!/usr/bin/env python3
"""تدقيق شامل لمنصة نبراس — بنية · أمان · موقع حي · سحابة."""
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIVE = 'https://www.nebrasplasticcompany.com'
SUPABASE_URL = 'https://oedldllrjavofpeaputz.supabase.co'
ANON_KEY = 'sb_publishable_bt6rlHxu_pjc1xpkKEWOcg_HZ43JMR0'

REQUIRED_DIRS = ['api', 'api/lib', 'css', 'js', 'images', 'supabase', 'tools', 'documents']
REQUIRED_API = [
    'nebras-auth.js', 'nebras-cloud.js', 'nebras-ai.js', 'nebras-visitor-intake.js',
    'lib/nebras-security.js', 'lib/nebras-rate-limit.js',
]
REQUIRED_JS = [
    'nebras-platform.js', 'nebras-secure-cloud.js', 'nebras-platform-integrity.js',
    'nebras-hr-platform.js', 'nebras-customer-portal.js',
]

issues = []
warnings = []
passed = []


def ok(msg):
    passed.append(msg)


def warn(msg):
    warnings.append(msg)


def fail(msg):
    issues.append(msg)


def fetch(url, timeout=25):
    req = urllib.request.Request(url, headers={'User-Agent': 'NebrasEnterpriseAudit/1'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode('utf-8', errors='replace')


def run_tool(name):
    path = os.path.join(ROOT, 'tools', name)
    if not os.path.isfile(path):
        return 'MISSING'
    try:
        out = subprocess.check_output([sys.executable, path], cwd=ROOT, stderr=subprocess.STDOUT, timeout=120)
        text = out.decode('utf-8', errors='replace')
        if 'RESULT: PASS' in text or 'ALL CLEAR' in text or 'RESULT: ALL CLEAR' in text:
            return 'PASS'
        if 'RESULT: FAILED' in text or 'ERRORS:' in text and 'ERRORS: 0' not in text:
            return 'FAIL'
        return 'REVIEW'
    except subprocess.CalledProcessError:
        return 'FAIL'


def audit_structure():
    for d in REQUIRED_DIRS:
        p = os.path.join(ROOT, d)
        if os.path.isdir(p):
            ok('folder:' + d)
        else:
            fail('missing folder: ' + d)
    for rel in REQUIRED_API:
        p = os.path.join(ROOT, 'api', rel.replace('/', os.sep))
        if os.path.isfile(p):
            ok('api:' + rel)
        else:
            fail('missing api file: ' + rel)
    for j in REQUIRED_JS:
        p = os.path.join(ROOT, 'js', j)
        if os.path.isfile(p):
            ok('js:' + j)
        else:
            fail('missing js: ' + j)
    idx = os.path.join(ROOT, 'index.html')
    if os.path.isfile(idx):
        ok('index.html')
    else:
        fail('missing index.html')


def audit_security():
    anon_url = SUPABASE_URL + '/rest/v1/nebras_data_store?store_key=eq.admin_users&select=store_key'
    req = urllib.request.Request(anon_url, headers={
        'apikey': ANON_KEY, 'Authorization': 'Bearer ' + ANON_KEY,
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            rows = json.loads(r.read())
        if len(rows) == 0:
            ok('RLS: admin_users hidden from anon')
        else:
            fail('SECURITY: anon can read admin_users — run supabase/018-rls-sensitive-keys.sql')
    except Exception as e:
        warn('RLS check inconclusive: ' + str(e)[:80])

    sec_path = os.path.join(ROOT, 'api', 'lib', 'nebras-security.js')
    with open(sec_path, encoding='utf-8') as f:
        sec = f.read()
    if 'NEBRAS_API_SECRET is required in production' in sec:
        ok('API secret enforced in production')
    else:
        warn('API secret production check missing')

    gps_path = os.path.join(ROOT, 'api', 'hr-gps-ping.js')
    with open(gps_path, encoding='utf-8') as f:
        gps = f.read()
    if 'SUPABASE_ANON_KEY' in gps or 'FALLBACK_ANON' in gps:
        fail('hr-gps-ping must use SERVICE_ROLE only')
    else:
        ok('hr-gps-ping uses service role only')

    auth_path = os.path.join(ROOT, 'api', 'nebras-auth.js')
    with open(auth_path, encoding='utf-8') as f:
        auth = f.read()
    if 'checkRateLimit' in auth or 'nebras-rate-limit' in auth:
        ok('auth rate limiting enabled')
    else:
        warn('auth rate limiting not found')


def audit_live():
    try:
        st, html = fetch(LIVE + '/')
        if st != 200:
            fail('live homepage HTTP ' + str(st))
            return
        ok('live homepage 200')
        deploy = re.search(r'data-nebras-deploy="([^"]+)"', html)
        if deploy:
            ok('live deploy=' + deploy.group(1))
        else:
            fail('live deploy marker missing')
        scripts = re.findall(r'src="(js/[^"]+\.js[^"]*)"', html)
        missing = []
        for s in scripts:
            if 'cdn.' in s:
                continue
            url = LIVE + '/' + s.lstrip('/')
            try:
                sst, _ = fetch(url, 15)
                if sst != 200:
                    missing.append(s + ' -> ' + str(sst))
            except Exception as e:
                missing.append(s + ' -> ' + str(e)[:40])
        if missing:
            for m in missing[:8]:
                fail('live asset: ' + m)
        else:
            ok('all local JS assets load on live (' + str(len(scripts)) + ')')
        plat = re.search(r'flushPushToNebrasCloud', html)
        if not plat:
            _, plat_js = fetch(LIVE + '/js/nebras-platform.js?v=' + (deploy.group(1) if deploy else ''), 40)
            if 'flushPushToNebrasCloud' in plat_js and 'window.flushPushToNebrasCloud' in plat_js:
                ok('cloud auto-save exported on live')
            elif 'flushPushToNebrasCloud' in plat_js:
                warn('flushPushToNebrasCloud exists but window export missing on live')
            else:
                fail('cloud save function missing on live platform.js')
    except Exception as e:
        fail('live audit: ' + str(e))


def audit_tools():
    for name in [
        'verify-project-health.py', 'verify-governance.py', 'verify-site-full.py',
        'verify-empire-governance.py', 'diagnose-nebras-live.py',
    ]:
        state = run_tool(name)
        if state == 'PASS':
            ok('tool:' + name)
        elif state == 'FAIL':
            fail('tool failed: ' + name)
        else:
            warn('tool review: ' + name)


def main():
    print('=== NEBRAS ENTERPRISE AUDIT ===\n')
    audit_structure()
    audit_security()
    audit_live()
    audit_tools()

    print('PASSED:', len(passed))
    print('WARNINGS:', len(warnings))
    for w in warnings:
        print('  WARN:', w)
    print('ISSUES:', len(issues))
    for e in issues:
        print('  ERROR:', e)

    if issues:
        print('\nRESULT: NEEDS FIXES')
        sys.exit(1)
    print('\nRESULT: ENTERPRISE READY' + (' (with warnings)' if warnings else ''))
    sys.exit(0)


if __name__ == '__main__':
    main()
