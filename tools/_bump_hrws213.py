# -*- coding: utf-8 -*-
from pathlib import Path
p = Path('index.html')
t = p.read_text(encoding='utf-8')
n = t.replace('hrws212', 'hrws213')
if n == t:
    raise SystemExit('no hrws212 found')
p.write_text(n, encoding='utf-8')
print('bumped', n.count('hrws213'), 'deploy', 'data-nebras-deploy="hrws213"' in n)
