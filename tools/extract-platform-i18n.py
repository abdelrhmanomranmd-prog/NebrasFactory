#!/usr/bin/env python3
"""Extract siteText from nebras-platform.js into nebras-platform-i18n.js (hrws274)."""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLATFORM = os.path.join(ROOT, 'js', 'nebras-platform.js')
I18N = os.path.join(ROOT, 'js', 'nebras-platform-i18n.js')

lines = open(PLATFORM, encoding='utf-8').readlines()

start = None
end = None
for i, line in enumerate(lines):
    if start is None and re.match(r'\s+const siteText = \{', line):
        start = i
    if start is not None and i > start and re.match(r'\s+\};\s*$', line):
        # siteText closes with `        };` after zh block
        if 'zh:' in ''.join(lines[start:i + 1]) or i - start > 100:
            end = i
            break

if start is None or end is None:
    raise SystemExit('Could not locate siteText block')

block = ''.join(lines[start:end + 1])
# shared lexical scope — brand constants live in platform.js loaded first
header = (
    '/**\n'
    ' * نبراس hrws274 — نصوص الواجهة (siteText) — منفصلة عن المنصة لتسريع التحميل\n'
    ' * يُحمَّل بعد nebras-platform.js (يعتمد NEBRAS_BRAND_* و getNebrasBrand*)\n'
    ' */\n'
)
body = block.replace('        const siteText = {', '        var siteText = {', 1)
footer = (
    '\n        if (typeof window !== \'undefined\') {\n'
    '            window.siteText = siteText;\n'
    '            window.__NEBRAS_I18N__ = \'hrws274\';\n'
    '        }\n'
)

open(I18N, 'w', encoding='utf-8', newline='\n').write(header + body + footer)

replacement = (
    '        /* siteText → js/nebras-platform-i18n.js (hrws274) */\n'
    '        var siteText = (typeof window !== \'undefined\' && window.siteText) ? window.siteText : { ar: {}, en: {}, zh: {} };\n'
)
new_lines = lines[:start] + [replacement] + lines[end + 1:]
open(PLATFORM, 'w', encoding='utf-8', newline='\n').writelines(new_lines)

print('Extracted lines', start + 1, '-', end + 1, '->', os.path.relpath(I18N, ROOT))
print('Removed', end - start + 1, 'lines from platform.js')
