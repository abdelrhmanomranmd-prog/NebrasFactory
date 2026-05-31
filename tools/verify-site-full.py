#!/usr/bin/env python3
"""Full Nebras site audit: i18n keys, partners, celebration, admin paths."""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, 'js', 'nebras-platform.js')
INDEX = os.path.join(ROOT, 'index.html')
ERRORS = []
WARNINGS = []


def err(m):
    ERRORS.append(m)


def warn(m):
    WARNINGS.append(m)


def main():
    with open(JS, encoding='utf-8') as f:
        js = f.read()
    with open(INDEX, encoding='utf-8') as f:
        html = f.read()

    if 'markPartnersMarqueesStatic' in js and ', true)' in js and 'applyPartnersTrack(document.getElementById(\'nebras-partners-track-public-a\'), htmlA, \'\', true)' in js:
        warn('Partners public track forced static')

    for el in ['site-celebration-overlay', 'nebras-partners-section', 'partners-public-title']:
        if el not in html:
            err(f'Missing #{el} in index.html')

    if 'function setLanguage' not in js:
        err('setLanguage missing')
    else:
        for fn in ['renderPartnersMarquees', 'applyOccasionTheme', 'renderAllPublicCatalog']:
            if fn + '(' not in js[js.find('function setLanguage'):js.find('function setLanguage') + 8000]:
                warn(f'setLanguage may not call {fn}')

    if 'isMainGovernanceAdmin' not in js:
        err('isMainGovernanceAdmin missing')
    if 'PRIMARY_GOVERNANCE_USERNAMES' not in js:
        err('PRIMARY_GOVERNANCE_USERNAMES missing')

    langs = re.findall(r"siteText\s*=\s*\{", js)
    if not langs:
        warn('siteText object not found via regex')

    for lang in ('ar', 'en', 'zh'):
        block = re.search(r"\b" + lang + r"\s*:\s*\{", js)
        if not block:
            err(f'siteText.{lang} block missing')
            continue
        start = block.start()
        snippet = js[start:start + 12000]
        for key in ('partnersPublicTitle', 'nav', 'heroTitle', 'doorDesignerQuoteBtn'):
            if key not in snippet:
                warn(f'siteText.{lang} may lack {key}')

    if 'grayscale(1)' in open(os.path.join(ROOT, 'css', '12-door-designer.css'), encoding='utf-8').read():
        warn('Door designer still uses grayscale(1) — may cause dark preview')

    print('=== NEBRAS FULL SITE AUDIT ===')
    print(f'ERRORS: {len(ERRORS)}')
    for e in ERRORS:
        print(f'  ERROR: {e}')
    print(f'WARNINGS: {len(WARNINGS)}')
    for w in WARNINGS:
        print(f'  WARN: {w}')
    if ERRORS:
        print('RESULT: FAILED')
        sys.exit(1)
    print('RESULT: PASS (review warnings)')
    sys.exit(0)


if __name__ == '__main__':
    main()
