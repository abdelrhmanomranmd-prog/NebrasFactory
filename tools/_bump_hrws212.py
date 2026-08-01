# -*- coding: utf-8 -*-
from pathlib import Path

p = Path("index.html")
t = p.read_text(encoding="utf-8")
t = t.replace("hrws211", "hrws212")
needle = 'js/nebras-aluminum-cutting.js?v=hrws212'
complete = 'js/nebras-aluminum-complete.js?v=hrws212'
if "nebras-aluminum-complete.js" not in t:
    old = f'<script src="{needle}" defer></script>'
    new = old + f'\n    <script src="{complete}" defer></script>'
    if old not in t:
        raise SystemExit("aluminum cutting script tag not found after bump")
    t = t.replace(old, new)
    print("script injected")
else:
    t = t.replace("nebras-aluminum-complete.js?v=hrws211", complete)
    print("script already present")
p.write_text(t, encoding="utf-8", newline="\n")
print("hrws212 count:", t.count("hrws212"))
print("deploy attr:", "data-nebras-deploy=\"hrws212\"" in t)
