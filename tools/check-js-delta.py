#!/usr/bin/env python3
"""Compare brace/paren/bracket balance counts between committed baseline and working copy."""
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REL = 'js/nebras-platform.js'


def balance(s):
    n = len(s)
    i = 0
    mode = None
    cu = pa = br = 0
    while i < n:
        c = s[i]
        nxt = s[i + 1] if i + 1 < n else ''
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
    return (cu, pa, br, mode)


cur = open(os.path.join(ROOT, REL), encoding='utf-8').read()
base = subprocess.check_output(['git', 'show', 'HEAD:' + REL], cwd=ROOT).decode('utf-8', 'replace')
bc = balance(base)
cc = balance(cur)
print('baseline (cu,pa,br,mode):', bc)
print('working  (cu,pa,br,mode):', cc)
if bc == cc:
    print('DELTA: IDENTICAL balance — edits are structurally consistent with baseline.')
    sys.exit(0)
print('DELTA: DIFFERENT — investigate edited regions.')
sys.exit(1)
