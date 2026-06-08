#!/usr/bin/env python3
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'tools' / 'profile-source.html').read_text(encoding='utf-8', errors='ignore')

# CSS variables
for pat in [r':root\s*\{[^}]+\}', r'--[a-z-]+:\s*[^;]+;', r'background[^;]{0,120};']:
    pass
vars_found = sorted(set(re.findall(r'--[a-zA-Z0-9-]+:\s*[^;]+', html)))
print('CSS vars sample:')
for v in vars_found[:25]:
    print(' ', v[:100])

# hero / logo snippets
for label, pat in [
    ('hero class', r'class="hero[^"]*"'),
    ('logo', r'logo[^"\']{0,40}'),
    ('badge', r'مورد معتمد'),
]:
    m = re.search(pat, html, re.I)
    if m:
        start = max(0, m.start() - 80)
        chunk = re.sub(r'\s+', ' ', html[start:start+500])
        print('\n===', label, '===')
        print(chunk[:400])

# gallery img indices in order with nearby alt/title
imgs = list(re.finditer(r'<img[^>]+src="(data:image/[^"]+)"[^>]*>', html))
print('\nIMG tags', len(imgs))
for i, m in enumerate(imgs[:15]):
    tag = m.group(0)
    alt = re.search(r'alt="([^"]*)"', tag)
    cls = re.search(r'class="([^"]*)"', tag)
    print(i, (alt.group(1) if alt else ''), (cls.group(1) if cls else '')[:60])

# doors section first img index
for name, needle in [('doors', 'معرض الأبواب'), ('cabinets', 'معرض الخزائن'), ('cnc', 'معرض CNC'), ('cert', 'الشهادات والاعتمادات'), ('projects', 'اعتمادات المشاريع')]:
    pos = html.find(needle)
    if pos < 0:
        print(name, 'NOT FOUND')
        continue
    sub = html[pos:pos+500000]
    local_imgs = list(re.finditer(r'<img[^>]+src="data:image/', sub))
    print(name, 'first img at local', local_imgs[0].start() if local_imgs else 'none', 'count', len(local_imgs))
