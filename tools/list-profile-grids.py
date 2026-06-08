#!/usr/bin/env python3
import re
from pathlib import Path

html = Path(__file__).resolve().parents[1].joinpath('tools/profile-source.html').read_text(encoding='utf-8', errors='ignore')
grids = list(re.finditer(r'<div class="gallery-grid">', html))
print('grids', len(grids))
for i, g in enumerate(grids):
    chunk = html[g.start():g.start() + 300000]
    items = len(re.findall(r'<div class="gallery-item">', chunk[:250000]))
    before = html[max(0, g.start() - 4000):g.start()]
    h2 = list(re.finditer(r'<h2[^>]*>([^<]+)</h2>', before))
    title = re.sub(r'\s+', ' ', h2[-1].group(1).strip()) if h2 else '?'
    print(i, items, title[:70])
