#!/usr/bin/env python3
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
js = (ROOT / 'js/nebras-platform.js').read_text(encoding='utf-8')
html = (ROOT / 'index.html').read_text(encoding='utf-8')

scm_start = html.find('id="site-content-management"')
scm_end = html.find('id="icon-management"')
scm_html = html[scm_start:scm_end] if scm_start >= 0 else ''

funcs = set(re.findall(r'onclick="([a-zA-Z_][a-zA-Z0-9_]*)\(', scm_html))
# dynamic SCM handlers in platform.js
for m in re.finditer(r'onclick="([a-zA-Z_][a-zA-Z0-9_]*)\(', js):
    fn = m.group(1)
    if fn.startswith('event.') or fn in ('if', 'setTimeout'):
        continue
    ctx = js[max(0, m.start() - 200):m.start()]
    if any(k in ctx for k in ('scm-', 'SCM', 'displaySiteProducts', 'displayVisitorIcons', 'displayDashboardTiles', 'displayAboutPages', 'displayPartners', 'displayCertifications', 'showroom', 'CustomSite', 'VisitorIcon')):
        funcs.add(fn)

missing = sorted(f for f in funcs if f'window.{f} =' not in js and f'window.{f}=' not in js)
print('SCM-related onclick functions:', len(funcs))
print('Missing window exports:')
for f in missing:
    print(' -', f)
