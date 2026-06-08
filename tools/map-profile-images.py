#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'tools' / 'profile-source.html').read_text(encoding='utf-8', errors='ignore')

# split by major section comments or headings
section_patterns = [
    ('hero', r'class="hero'),
    ('about', r'>01<|من نحن'),
    ('vision', r'>02<|الرؤية والرسالة'),
    ('products', r'>03<|منتجاتنا'),
    ('doors_gallery', r'>04<|معرض الأبواب'),
    ('cabinets_gallery', r'>05<|معرض الخزائن'),
    ('cnc_gallery', r'>06<|معرض CNC'),
    ('strengths', r'>07<|نقاط قوة'),
    ('certifications', r'>08<|الشهادات'),
    ('projects', r'>09<|المشاريع'),
    ('coverage', r'>📍|أين تجدنا'),
    ('datasheet', r'>10<|المواصفات'),
    ('banks', r'>11<|الحسابات البنكية'),
    ('contact', r'>12<|تواصل معنا'),
]

positions = []
for name, pat in section_patterns:
    m = re.search(pat, html)
    if m:
        positions.append((m.start(), name))
positions.sort()
positions.append((len(html), 'end'))

sections = {}
for i in range(len(positions) - 1):
    start, name = positions[i]
    end = positions[i + 1][0]
    chunk = html[start:end]
    imgs = re.findall(r'data:image/[^;]+;base64,', chunk)
    sections[name] = len(imgs)
    print(f'{name}: {len(imgs)} images, chars={len(chunk)}')

# map saved files order globally
all_imgs = list(re.finditer(r'data:image/([^;]+);base64,', html))
print('total image tags', len(all_imgs))

# assign global index ranges per section
idx = 0
mapping = {}
for i in range(len(positions) - 1):
    start, name = positions[i]
    end = positions[i + 1][0]
    count = len(re.findall(r'data:image/[^;]+;base64,', html[start:end]))
    mapping[name] = list(range(idx, idx + count))
    idx += count

out = ROOT / 'tools' / 'profile-image-map.json'
out.write_text(json.dumps(mapping, ensure_ascii=False, indent=2), encoding='utf-8')
print('wrote', out)
