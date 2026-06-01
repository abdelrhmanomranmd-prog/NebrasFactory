#!/usr/bin/env python3
"""Verify admin governance, handlers, celebrations, partners, cloud sync hooks."""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, 'js', 'nebras-platform.js')
INDEX = os.path.join(ROOT, 'index.html')
MEDIA_JS = os.path.join(ROOT, 'js', 'nebras-media-admin.js')
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
    with open(MEDIA_JS, encoding='utf-8') as f:
        media_js = f.read()

    # Core governance
    for sym in (
        'isMainGovernanceAdmin', 'canManage', 'requirePermission', 'requireMainGovernanceAdmin',
        'PRIMARY_GOVERNANCE_USERNAMES', 'PRIMARY_RECOVERY_EMAIL', 'ensurePrimaryRecoveryEmail',
        'manageStoreIconProducts', 'purgeStaleCatalogReferences',
        'toggleSiteProductVisibility', 'saveContentData', 'syncNebrasCloudInBackground',
        'NEBRAS_CLOUD_STORE_SPECS', 'applyOccasionTheme', 'renderPartnersMarquees',
        'ensureBuiltinSitePartners', 'initQuoteCommerceHandlers', 'window.confirmAndOpenQuote',
    ):
        if sym not in js:
            err(f'Missing governance symbol: {sym}')

    if 'scm-store-icons-list' not in html:
        err('scm-store-icons-list missing in index.html')

    if 'abdelrhmanomranmd@gmail.com' not in js:
        err('PRIMARY_RECOVERY_EMAIL (abdelrhmanomranmd@gmail.com) missing in nebras-platform.js')

    for showcase_id in ('header-hero-door-showcase', 'top-partners-showcase', 'header-aside-partners', 'header-hero-band', 'header-campaign-action-strip'):
        if showcase_id not in html:
            err(f'Header showcase element missing: #{showcase_id}')

    if not os.path.isfile(os.path.join(ROOT, 'api', 'admin-recovery.js')):
        err('api/admin-recovery.js missing (Gmail recovery API)')

    # Dashboard handler map vs registry
    map_block = re.search(r'const DASHBOARD_HANDLER_MAP = \{([^}]+)\}', js, re.S)
    if map_block:
        keys = re.findall(r'(\w+)\s*:', map_block.group(1))
        for k in keys:
            if f'{k}:' not in map_block.group(0) and f'{k} ' not in map_block.group(0):
                continue
            if f'function {k}' not in js and f'{k}: function' not in js and f'{k}:' not in map_block.group(0):
                if k not in ('erpFinanceStub',):
                    warn(f'DASHBOARD_HANDLER_MAP key may lack implementation: {k}')

    # onclick handlers in index.html (simple names only)
    onclick_names = set(re.findall(r'onclick="([a-zA-Z_][a-zA-Z0-9_]*)', html))
    onclick_names -= {'if', 'event', 'window'}
    for name in sorted(onclick_names):
        if name == 'window':
            continue
        ok = (
            f'function {name}' in js
            or f'window.{name} =' in js
            or f'window.{name}=' in js
            or name in ('dialNumber',) and 'function dialNumber' in js
        )
        if not ok and name not in media_js:
            err(f'onclick handler not found in JS: {name}()')

    # Celebration mobile fix
    css_occ = open(os.path.join(ROOT, 'css', '04-occasion.css'), encoding='utf-8').read()
    css_dash = open(os.path.join(ROOT, 'css', '08-dashboard-creative.css'), encoding='utf-8').read()
    if 'mask-image: none' not in css_dash and '-webkit-mask-image: none' not in css_dash:
        warn('Partners mobile mask-image clear may be missing in 08-dashboard-creative.css')
    if 'nebras-partners-scroll' not in css_dash:
        err('Partners marquee animation keyframes missing')

    # Media admin overrides
    if 'initNebrasMediaAdminOverrides' not in media_js:
        err('nebras-media-admin.js missing initNebrasMediaAdminOverrides')
    if 'window.saveContentData' not in media_js and 'saveContentData()' not in media_js:
        warn('Media admin may not call saveContentData on save')

    # Quote commerce exports
    for exp in ('submitQuoteA4Pdf', 'confirmAndOpenQuote', 'openQuotePreview', 'openCartDrawer'):
        if f'window.{exp} =' not in js:
            err(f'window.{exp} not exported')

    # User management guards
    if 'isMainGovernanceAdmin()' not in js[js.find('function addNewUser'):js.find('function addNewUser') + 800]:
        err('addNewUser missing isMainGovernanceAdmin guard')

    print('=== NEBRAS GOVERNANCE AUDIT ===')
    print(f'onclick handlers checked: {len(onclick_names)}')
    print(f'ERRORS: {len(ERRORS)}')
    for e in ERRORS:
        print(f'  ERROR: {e}')
    print(f'WARNINGS: {len(WARNINGS)}')
    for w in WARNINGS:
        print(f'  WARN: {w}')
    if ERRORS:
        print('RESULT: FAILED')
        sys.exit(1)
    print('RESULT: PASS')
    sys.exit(0)


if __name__ == '__main__':
    main()
