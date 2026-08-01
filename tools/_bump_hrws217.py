# -*- coding: utf-8 -*-
from pathlib import Path
p = Path('index.html')
t = p.read_text(encoding='utf-8')
if 'hrws216' not in t:
    raise SystemExit('expected hrws216')
p.write_text(t.replace('hrws216', 'hrws217'), encoding='utf-8')
print('ok', p.read_text(encoding='utf-8').count('hrws217'))
