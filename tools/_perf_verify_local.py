# -*- coding: utf-8 -*-
from pathlib import Path
import re
t = Path('index.html').read_text(encoding='utf-8')
m = re.search(r'data-nebras-deploy="([^"]+)"', t)
print('deploy', m.group(1) if m else None)
print('eager_scripts', len(re.findall(r'<script[^>]+src=', t)))
print('lazy', 'nebras-dept-lazy' in t)
print('alu_eager', 'aluminum-cutting.js' in t)
print('pdf_cdn', ('html2canvas.min' in t) or ('jspdf.umd' in t))
print('hrws220_left', t.count('hrws220'))
print('hrws221', t.count('hrws221'))
