#!/usr/bin/env python3
import base64
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
html_path = ROOT / 'tools' / 'profile-source.html'
out_dir = ROOT / 'images' / 'profile-2026'
out_dir.mkdir(parents=True, exist_ok=True)

with open(html_path, 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

print('HTML size', len(html))

# external refs
ext = sorted(set(re.findall(r'(?:src|href)=["\']([^"\']+\.(?:png|jpg|jpeg|webp|svg|gif|pdf|css))["\']', html, re.I)))
print('External assets', len(ext))
for x in ext[:30]:
    print(' ', x)

# data urls
data_urls = re.findall(r'(data:image/[^;]+;base64,[A-Za-z0-9+/=]+)', html)
print('Data URL images', len(data_urls))

saved = []
for i, du in enumerate(data_urls[:120]):
    m = re.match(r'data:image/([^;]+);base64,(.+)', du)
    if not m:
        continue
    extn = m.group(1).replace('jpeg', 'jpg')
    if extn not in ('png', 'jpg', 'webp', 'gif', 'svg+xml'):
        extn = 'png'
    if extn == 'svg+xml':
        extn = 'svg'
    raw = base64.b64decode(m.group(2))
    if len(raw) < 800:
        continue
    fname = f'profile-img-{i:03d}.{extn}'
    path = out_dir / fname
    if not path.exists():
        path.write_bytes(raw)
    saved.append((fname, len(raw)))

print('Saved images', len(saved))
for s in saved[:25]:
    print(' ', s)

# extract text blocks near section markers
markers = ['من نحن', 'الرؤية', 'الشهادات', 'المشاريع', 'معرض الأبواب', 'معرض الخزائن', 'معرض CNC', 'الحسابات البنكية']
for mk in markers:
    idx = html.find(mk)
    if idx >= 0:
        snippet = re.sub(r'<[^>]+>', ' ', html[idx:idx+400])
        snippet = re.sub(r'\s+', ' ', snippet).strip()
        print('---', mk, '---')
        print(snippet[:220])
