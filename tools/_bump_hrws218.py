# -*- coding: utf-8 -*-
from pathlib import Path
p = Path('index.html')
t = p.read_text(encoding='utf-8')
if 'hrws217' not in t:
    raise SystemExit('expected hrws217, got other')
p.write_text(t.replace('hrws217', 'hrws218'), encoding='utf-8')
print('ok', p.read_text(encoding='utf-8').count('hrws218'))
