# -*- coding: utf-8 -*-
from pathlib import Path
p = Path('index.html')
t = p.read_text(encoding='utf-8')
if 'hrws218' not in t:
    raise SystemExit('expected hrws218')
p.write_text(t.replace('hrws218', 'hrws219'), encoding='utf-8')
print('ok', p.read_text(encoding='utf-8').count('hrws219'))
