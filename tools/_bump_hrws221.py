# -*- coding: utf-8 -*-
from pathlib import Path
p = Path('index.html')
t = p.read_text(encoding='utf-8')
if 'hrws220' in t:
    p.write_text(t.replace('hrws220', 'hrws221'), encoding='utf-8')
print('hrws221 count', p.read_text(encoding='utf-8').count('hrws221'))
