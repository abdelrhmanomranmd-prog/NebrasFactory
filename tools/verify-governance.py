#!/usr/bin/env python3
"""Verify admin governance, handlers, celebrations, partners, cloud sync hooks."""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, 'js', 'nebras-platform.js')
INDEX = os.path.join(ROOT, 'index.html')
MEDIA_JS = os.path.join(ROOT, 'js', 'nebras-media-admin.js')
CALLBACK_JS = os.path.join(ROOT, 'js', 'nebras-callback-concierge.js')
PLATFORM_JS_FILES = (
    'js/nebras-hr-platform.js',
    'js/nebras-legal-platform.js',
    'js/nebras-crm-platform.js',
    'js/nebras-accounting-platform.js',
    'js/nebras-empire-hub.js',
    'js/nebras-hr-companies.js',
    'js/nebras-hr-boot.js',
    'js/nebras-hr-hcm-suite.js',
    'js/nebras-customer-portal.js',
    'js/nebras-order-journey.js',
    'js/nebras-erp-command-center.js',
    'js/nebras-admin-ai.js',
    'js/nebras-data-warehouse.js',
    'js/nebras-empire-bridges.js',
    'js/nebras-platform-integrity.js',
    'js/nebras-secure-cloud.js',
    'js/nebras-storage-guard.js',
    'js/nebras-launch-health.js',
    'js/nebras-site-database.js',
)
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
    with open(CALLBACK_JS, encoding='utf-8') as f:
        callback_js = f.read()
    platform_js = ''
    for rel in PLATFORM_JS_FILES:
        path = os.path.join(ROOT, rel)
        if os.path.isfile(path):
            with open(path, encoding='utf-8') as f:
                platform_js += f.read()

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

    for el_id in ('dashboard-official-hub', 'dashboard-linktree-link', 'dashboard-qr-img'):
        if el_id not in html:
            err(f'Dashboard official hub element missing: #{el_id}')

    for el_id in ('nebras-visitor-qr-section', 'nebras-visitor-qr-img', 'door-size-catalog-admin-block', 'store-catalog-governance-block'):
        if el_id not in html:
            err(f'Public governance element missing: #{el_id}')

    for fn in ('getStoreCatalogColorFilterOptions', 'getStoreCatalogSizeFilterOptions', 'renderVisitorQrSection'):
        if fn not in js:
            err(f'Store catalog governance function missing: {fn}')

    profile_html = os.path.join(ROOT, 'nebras-company-profile-2026.html')
    profile_css = os.path.join(ROOT, 'css', '26-nebras-profile-bp.css')
    if not os.path.isfile(profile_html):
        err('nebras-company-profile-2026.html missing (company profile PDF slides)')
    if not os.path.isfile(profile_css):
        err('css/26-nebras-profile-bp.css missing (company profile PDF styles)')

    qr_path = os.path.join(ROOT, 'images', 'nebras-site-qr.png')
    if not os.path.isfile(qr_path):
        err('images/nebras-site-qr.png missing (site QR)')

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
        bundle = js + platform_js + media_js + callback_js
        ok = (
            f'function {name}' in bundle
            or f'window.{name} =' in bundle
            or f'window.{name}=' in bundle
            or f'global.{name} =' in bundle
            or f'global.{name}=' in bundle
            or (name == 'dialNumber' and 'function dialNumber' in bundle)
        )
        if not ok:
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

    # User management guards — editor-based flow
    editor_start = js.find('function openUserEditor')
    if editor_start < 0:
        err('openUserEditor function missing (professional user editor)')
    elif 'isMainGovernanceAdmin()' not in js[editor_start:editor_start + 900]:
        err('openUserEditor missing isMainGovernanceAdmin guard')
    for sym in ('saveUserFromEditor', 'renderUserEditorForm', 'NEBRAS_ROLE_DEFINITIONS', 'getUserEffectivePermissions', 'ASSIGNABLE_ROLES'):
        if sym not in js:
            err(f'User governance symbol missing: {sym}')

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
