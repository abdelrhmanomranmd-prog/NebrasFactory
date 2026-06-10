#!/usr/bin/env python3
"""Heuristic brace/paren/bracket balance check (strings, template literals, comments aware)."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'js', 'nebras-platform.js')
s = open(path, encoding='utf-8').read()
n = len(s)
i = 0
line = 1
mode = None  # None, 'line', 'block', or a quote char
cu = pa = br = 0
neg = None
while i < n:
    c = s[i]
    nxt = s[i + 1] if i + 1 < n else ''
    if c == '\n':
        line += 1
    if mode is None:
        if c == '/' and nxt == '/':
            mode = 'line'; i += 2; continue
        if c == '/' and nxt == '*':
            mode = 'block'; i += 2; continue
        if c in ('"', "'", '`'):
            mode = c; i += 1; continue
        if c == '{': cu += 1
        elif c == '}': cu -= 1
        elif c == '(': pa += 1
        elif c == ')': pa -= 1
        elif c == '[': br += 1
        elif c == ']': br -= 1
        if (cu < 0 or pa < 0 or br < 0) and neg is None:
            neg = (line, cu, pa, br)
    elif mode == 'line':
        if c == '\n':
            mode = None
    elif mode == 'block':
        if c == '*' and nxt == '/':
            mode = None; i += 2; continue
    else:
        if c == '\\':
            i += 2; continue
        if c == mode:
            mode = None
    i += 1

print('file:', os.path.relpath(path, ROOT))
print('braces {}:', cu, '| parens ():', pa, '| brackets []:', br, '| end-mode:', mode)
if neg:
    print('FIRST NEGATIVE at line', neg[0], '->', neg[1:])
ok = (cu == 0 and pa == 0 and br == 0 and mode is None and neg is None)
print('BALANCE:', 'OK' if ok else 'CHECK')
sys.exit(0 if ok else 1)
