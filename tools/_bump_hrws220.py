# -*- coding: utf-8 -*-
from pathlib import Path
p = Path('index.html')
t = p.read_text(encoding='utf-8')
if 'hrws219' not in t:
    raise SystemExit('expected hrws219')
p.write_text(t.replace('hrws219', 'hrws220'), encoding='utf-8')
print('ok', p.read_text(encoding='utf-8').count('hrws220'))
