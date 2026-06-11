#!/usr/bin/env python3
"""Full codebase audit: HTML, CSS refs, onclick handlers, deploy markers."""
import os
import re
import subprocess
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ERRORS = []
WARNINGS = []


def rel(p):
    return os.path.relpath(p, ROOT).replace('\\', '/')


def audit_index():
    path = os.path.join(ROOT, 'index.html')
    with open(path, encoding='utf-8') as f:
        html = f.read()
    for m in re.finditer(r'(?:href|src)="((?:css|js|images|audio)/[^"#?]+)"', html):
        ref = m.group(1)
        if not os.path.isfile(os.path.join(ROOT, ref.replace('/', os.sep))):
            ERRORS.append(f'index.html missing: {ref}')
    ids = re.findall(r'id="([^"]+)"', html)
    for name, count in Counter(ids).items():
        if count > 1:
            ERRORS.append(f'duplicate id="{name}" ({count}x)')
    for tag in ('html', 'head', 'body'):
        o = len(re.findall(r'<' + tag + r'[\s>]', html, re.I))
        c = len(re.findall(r'</' + tag + r'>', html, re.I))
        if o != c:
            WARNINGS.append(f'<{tag}> imbalance open={o} close={c}')


def audit_css_urls():
    css_dir = os.path.join(ROOT, 'css')
    for name in os.listdir(css_dir):
        if not name.endswith('.css'):
            continue
        path = os.path.join(css_dir, name)
        with open(path, encoding='utf-8', errors='ignore') as f:
            text = f.read()
        for m in re.finditer(r"url\(['\"]?(\.\./images/[^)'\"]+)['\"]?\)", text):
            ref = m.group(1)
            fp = os.path.join(ROOT, 'css', ref)
            norm = os.path.normpath(fp)
            if not os.path.isfile(norm):
                WARNINGS.append(f'CSS url() missing in {name}: {ref}')


def load_index_js_blob():
    index = os.path.join(ROOT, 'index.html')
    with open(index, encoding='utf-8') as f:
        html = f.read()
    scripts = re.findall(r'<script[^>]+src="(js/[^"]+)"', html)
    blob = ''
    for rel in scripts:
        path = os.path.join(ROOT, rel.replace('/', os.sep))
        if os.path.isfile(path):
            with open(path, encoding='utf-8', errors='ignore') as f:
                blob += f.read() + '\n'
    return html, blob


def audit_onclick():
    html, blob = load_index_js_blob()
    skip = {'window', 'event', 'this', 'return'}
    names = set(re.findall(r'onclick="([a-zA-Z_][\w]*)\s*\(', html))
    for fn in sorted(names):
        if fn in skip:
            continue
        if (fn + '(') not in blob and f'window.{fn}' not in blob and f'global.{fn}' not in blob:
            ERRORS.append(f'onclick missing handler: {fn}()')


def run_tool(script):
    p = os.path.join(ROOT, 'tools', script)
    if not os.path.isfile(p):
        return script, 'MISSING'
    try:
        out = subprocess.check_output([sys.executable, p], cwd=ROOT, stderr=subprocess.STDOUT, timeout=120)
        t = out.decode('utf-8', errors='replace')
        if 'RESULT: PASS' in t or 'ALL CHECKS PASSED' in t:
            return script, 'PASS'
        if 'ERRORS: 0' in t and 'FAIL' not in t:
            return script, 'PASS'
        return script, 'REVIEW'
    except subprocess.CalledProcessError as e:
        return script, 'FAIL'


def main():
    print('=== NEBRAS FULL CODEBASE AUDIT ===\n')
    audit_index()
    audit_css_urls()
    audit_onclick()
    for script in ['verify-governance.py', 'verify-site-full.py', 'verify-project-health.py', 'verify-supabase-cloud.py', 'verify-full-deploy.py']:
        name, status = run_tool(script)
        print(f'TOOL {name}: {status}')
    print()
    print(f'ERRORS: {len(ERRORS)}')
    for e in ERRORS[:30]:
        print(f'  ERROR: {e}')
    print(f'WARNINGS: {len(WARNINGS)}')
    for w in WARNINGS[:30]:
        print(f'  WARN: {w}')
    if ERRORS:
        print('\nRESULT: FAIL')
        sys.exit(1)
    print('\nRESULT: PASS' + (' (review warnings)' if WARNINGS else ''))
    sys.exit(0)


if __name__ == '__main__':
    main()
