#!/usr/bin/env python3
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
path = os.path.join(ROOT, 'js', 'nebras-platform.js')
with open(path, encoding='utf-8') as f:
    s = f.read()
marker1 = "        function editUser(index) {\n            if (!requirePermission('users'"
marker2 = "        function editUser(index) { openUserEditor(index); }"
i = s.find(marker1)
j = s.find(marker2)
if i >= 0 and j > i:
    s = s[:i] + s[j:]
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(s)
    print('OK removed dead editUser')
else:
    print('SKIP', i, j)
