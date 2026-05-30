#!/usr/bin/env python3
"""Verify NebrasFactory project: syntax refs, zero-byte files, broken assets."""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGE_EXT = {'.png', '.jpg', '.jpeg', '.webp', '.avif', '.svg', '.gif'}
WARNINGS = []
ERRORS = []


def rel(path):
    return os.path.relpath(path, ROOT).replace('\\', '/')


def check_zero_byte_files():
    for dirpath, _, filenames in os.walk(ROOT):
        if '.git' in dirpath.replace('\\', '/').split('/'):
            continue
        for name in filenames:
            fp = os.path.join(dirpath, name)
            if os.path.getsize(fp) == 0:
                ERRORS.append(f'Zero-byte file: {rel(fp)}')


def check_html():
    index_path = os.path.join(ROOT, 'index.html')
    with open(index_path, encoding='utf-8') as f:
        html = f.read()
    for m in re.finditer(r'(?:href|src)="((?:css|js|images)/[^"#?]+)"', html):
        p = os.path.join(ROOT, m.group(1).replace('/', os.sep))
        if not os.path.isfile(p):
            ERRORS.append(f'index.html missing ref: {m.group(1)}')
    ids = re.findall(r'id="([^"]+)"', html)
    from collections import Counter
    for id_name, count in Counter(ids).items():
        if count > 1:
            ERRORS.append(f'index.html duplicate id: {id_name} ({count}x)')
    for tag in ('html', 'head', 'body'):
        opens = len(re.findall(r'<' + tag + r'[\s>]', html, re.I))
        closes = len(re.findall(r'</' + tag + r'>', html, re.I))
        if opens != closes:
            WARNINGS.append(f'index.html tag imbalance <{tag}>: open={opens} close={closes}')


def check_index_refs():
    check_html()


def extract_asset_refs(text):
    refs = set()
    for m in re.finditer(r"['\"]((?:images|css)/[^'\"\s#?]+)['\"]", text):
        refs.add(m.group(1))
    return refs


def check_js_asset_refs():
    js_files = [
        'js/nebras-platform.js',
        'js/nebras-media-admin.js',
        'js/nebras-door-compositor.js',
        'js/nebras-door-3d.js',
    ]
    all_refs = {}
    for js in js_files:
        path = os.path.join(ROOT, js)
        if not os.path.isfile(path):
            ERRORS.append(f'Missing JS: {js}')
            continue
        with open(path, encoding='utf-8', errors='ignore') as f:
            text = f.read()
        for ref in extract_asset_refs(text):
            all_refs.setdefault(ref, []).append(js)
    missing = []
    for ref, sources in sorted(all_refs.items()):
        if ref.endswith('/'):
            continue
        p = os.path.join(ROOT, ref.replace('/', os.sep))
        if not os.path.isfile(p):
            missing.append((ref, sources))
    for ref, sources in missing:
        ERRORS.append(f'Broken asset ref in {", ".join(sources)}: {ref}')
    return len(all_refs), len(missing)


def check_css_files():
    css_dir = os.path.join(ROOT, 'css')
    for name in os.listdir(css_dir):
        if not name.endswith('.css'):
            continue
        path = os.path.join(css_dir, name)
        with open(path, encoding='utf-8', errors='ignore') as f:
            text = f.read()
        # unclosed braces rough check
        opens = text.count('{')
        closes = text.count('}')
        if opens != closes:
            ERRORS.append(f'CSS brace mismatch in {name}: {{={opens} }}={closes}')
        for m in re.finditer(r'url\(["\']?([^"\')\s]+)["\']?\)', text):
            u = m.group(1)
            if u.startswith('data:') or u.startswith('http'):
                continue
            if u.startswith('../'):
                p = os.path.normpath(os.path.join(css_dir, u))
            elif u.startswith('images/'):
                p = os.path.join(ROOT, u.replace('/', os.sep))
            else:
                continue
            if not os.path.isfile(p):
                WARNINGS.append(f'CSS url() missing in {name}: {u}')


def check_images():
    img_root = os.path.join(ROOT, 'images')
    count = 0
    bad = []
    for dirpath, _, filenames in os.walk(img_root):
        for name in filenames:
            ext = os.path.splitext(name)[1].lower()
            if ext not in IMAGE_EXT:
                continue
            fp = os.path.join(dirpath, name)
            count += 1
            size = os.path.getsize(fp)
            if size == 0:
                bad.append(rel(fp) + ' (zero bytes)')
            elif size < 50 and ext != '.svg':
                WARNINGS.append(f'Very small image ({size}B): {rel(fp)}')
    if bad:
        for b in bad:
            ERRORS.append(f'Bad image: {b}')
    return count


def check_supabase_sql():
    sb = os.path.join(ROOT, 'supabase')
    for name in sorted(os.listdir(sb)):
        if not name.endswith('.sql'):
            continue
        path = os.path.join(sb, name)
        with open(path, encoding='utf-8', errors='ignore') as f:
            text = f.read()
        if not text.strip():
            ERRORS.append(f'Empty SQL: supabase/{name}')


def main():
    check_zero_byte_files()
    check_index_refs()
    total_refs, missing_refs = check_js_asset_refs()
    img_count = check_images()
    check_css_files()
    check_supabase_sql()

    print('=== NEBRAS PROJECT HEALTH ===')
    print(f'Root: {ROOT}')
    print(f'JS asset refs scanned: {total_refs} (missing: {missing_refs})')
    print(f'Images checked: {img_count}')
    print(f'ERRORS: {len(ERRORS)}')
    print(f'WARNINGS: {len(WARNINGS)}')
    for e in ERRORS:
        print(f'  ERROR: {e}')
    for w in WARNINGS:
        print(f'  WARN: {w}')
    if not ERRORS and not WARNINGS:
        print('RESULT: ALL CLEAR — no errors or warnings detected.')
    elif not ERRORS:
        print('RESULT: No errors; review warnings above.')
    else:
        print('RESULT: FIX ERRORS before deploy.')
    return 1 if ERRORS else (0 if not WARNINGS else 0)


if __name__ == '__main__':
    sys.exit(main())
