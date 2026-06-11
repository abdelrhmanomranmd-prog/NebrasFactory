#!/usr/bin/env python3
"""Phase 22: Governance security, period purge, quote isolation."""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLATFORM_JS = os.path.join(ROOT, 'js', 'nebras-platform.js')
INDEX_HTML = os.path.join(ROOT, 'index.html')
INJECT = os.path.join(ROOT, 'tools', 'phase22-governance-security.js')

with open(PLATFORM_JS, encoding='utf-8') as f:
    plat = f.read()
with open(INJECT, encoding='utf-8') as f:
    p22 = f.read()
with open(INDEX_HTML, encoding='utf-8') as f:
    html = f.read()

MARKER = '/* PHASE22_INJECTED */'


def sub(text, old, new, label):
    if old not in text:
        print(f'MISSING [{label}]')
        sys.exit(1)
    print(f'OK: {label}')
    return text.replace(old, new, 1)


if MARKER in plat:
    start = plat.index(MARKER)
    end = plat.index('        function buildCartBankPaymentHtmlCore(lang)', start)
    plat = plat[:start] + plat[end:]

# Remove old duplicates replaced by phase22
for pat, name in [
    (r'    function repQuoteOwnedBy\(entry, admin\) \{[^}]+\}[^}]+return false;\n    \}\n\n', 'repQuoteOwnedBy'),
    (r'        function buildAnalyticsGovernanceToolbarHtml\(\) \{.*?\'</div></div>\';\n        \}\n\n', 'buildAnalyticsGovernanceToolbarHtml'),
]:
    m = re.search(pat, plat, re.DOTALL)
    if m:
        plat = plat[:m.start()] + plat[m.end():]
        print(f'OK: remove old {name}')

plat = sub(plat,
    '        function buildCartBankPaymentHtmlCore(lang) {',
    MARKER + '\n' + p22 + '\n        function buildCartBankPaymentHtmlCore(lang) {',
    'inject phase22')

# Quote access guard
plat = sub(plat,
    """        async function previewSalesQuoteA4(entryId) {
            const entry = await resolveSalesQuoteEntry(entryId);
            if (!entry) { alert('لم يُعثر على العرض.'); return; }
            openSalesQuoteA4Preview(entry, { allowEmpty: true });
        }""",
    """        async function previewSalesQuoteA4(entryId) {
            const entry = await assertQuoteEntryAccess(entryId);
            if (!entry) return;
            openSalesQuoteA4Preview(entry, { allowEmpty: true, repAccess: typeof isStrictSalesRep === 'function' && isStrictSalesRep() });
        }""",
    'preview quote access')

plat = sub(plat,
    """        async function downloadSalesQuoteA4Pdf(entryId) {
            if (!requirePermission('sales')) return;
            const entry = await resolveSalesQuoteEntry(entryId);
            if (!entry) { alert('لم يُعثر على العرض.'); return; }""",
    """        async function downloadSalesQuoteA4Pdf(entryId) {
            if (!requirePermission('sales') && !(typeof isStrictSalesRep === 'function' && isStrictSalesRep())) return;
            const entry = await assertQuoteEntryAccess(entryId);
            if (!entry) return;""",
    'download quote access')

# User scope lock banner in command shell
if 'dashboard-user-scope-lock' not in plat:
    plat = sub(plat,
        """            const specHost = document.getElementById('dashboard-role-specialization');
            if (specHost && typeof renderRoleSpecializationBanner === 'function') {
                specHost.innerHTML = renderRoleSpecializationBanner(user);
            }""",
        """            const scopeLock = document.getElementById('dashboard-user-scope-lock');
            if (scopeLock && typeof renderUserScopeLockBanner === 'function') {
                const banner = renderUserScopeLockBanner(user);
                scopeLock.innerHTML = banner;
                scopeLock.hidden = !banner;
            }
            const specHost = document.getElementById('dashboard-role-specialization');
            if (specHost && typeof renderRoleSpecializationBanner === 'function') {
                specHost.innerHTML = renderRoleSpecializationBanner(user);
            }""",
        'scope lock banner')

# Window exports
exports = [
    'window.purgeAnalyticsByPeriod = purgeAnalyticsByPeriod;',
    'window.purgeAllAnalyticsByPeriod = purgeAllAnalyticsByPeriod;',
    'window.assertQuoteAccess = assertQuoteAccess;',
]
block = '\n        '.join(exports)
if 'purgeAnalyticsByPeriod' not in plat.split('window.setCheckoutPaymentMethod')[0][-500:]:
    plat = sub(plat,
        '        window.switchAnalyticsTab = switchAnalyticsTab;',
        '        ' + block + '\n        window.switchAnalyticsTab = switchAnalyticsTab;',
        'window exports phase22')

with open(PLATFORM_JS, 'w', encoding='utf-8') as f:
    f.write(plat)

if '38-governance-security.css' not in html:
    html = html.replace(
        '    <link rel="stylesheet" href="css/37-admin-enterprise-unified.css">',
        '    <link rel="stylesheet" href="css/37-admin-enterprise-unified.css">\n'
        '    <link rel="stylesheet" href="css/38-governance-security.css">',
        1)
    print('OK: css 38 link')

if 'dashboard-user-scope-lock' not in html:
    html = html.replace(
        '            <div id="dashboard-role-specialization" class="dashboard-role-specialization"></div>',
        '            <div id="dashboard-user-scope-lock" class="dashboard-user-scope-lock" hidden></div>\n'
        '            <div id="dashboard-role-specialization" class="dashboard-role-specialization"></div>',
        1)
    print('OK: scope lock mount')

with open(INDEX_HTML, 'w', encoding='utf-8') as f:
    f.write(html)

print('Phase 22 platform patch complete.')
