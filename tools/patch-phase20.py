#!/usr/bin/env python3
"""Phase 20: Enterprise store payments + executive BI charts."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLATFORM_JS = os.path.join(ROOT, 'js', 'nebras-platform.js')
INDEX_HTML = os.path.join(ROOT, 'index.html')
CSS_STORE = os.path.join(ROOT, 'css', '35-store-enterprise.css')
CSS_BI = os.path.join(ROOT, 'css', '36-executive-bi.css')
INJECT_STORE = os.path.join(ROOT, 'tools', 'phase20-store-enterprise.js')
INJECT_BI = os.path.join(ROOT, 'tools', 'phase20-bi-executive.js')

with open(PLATFORM_JS, encoding='utf-8') as f:
    plat = f.read()
with open(INJECT_STORE, encoding='utf-8') as f:
    p20_store = f.read()
with open(INJECT_BI, encoding='utf-8') as f:
    p20_bi = f.read()
with open(INDEX_HTML, encoding='utf-8') as f:
    html = f.read()

MARKER = '/* PHASE20_INJECTED */'


def sub(text, old, new, label):
    if old not in text:
        print(f'MISSING [{label}]')
        sys.exit(1)
    print(f'OK: {label}')
    return text.replace(old, new, 1)


# Remove prior inject
if MARKER in plat:
    start = plat.index(MARKER)
    end = plat.index('        function buildCartBankPaymentHtmlCore(lang)', start)
    plat = plat[:start] + plat[end:]

# Rename bank payment core + inject phase20
plat = sub(plat,
    '        function buildCartBankPaymentHtml(lang) {',
    MARKER + '\n' + p20_store + '\n' + p20_bi + '\n        function buildCartBankPaymentHtmlCore(lang) {',
    'inject phase20 + rename bank core')

# Cart checkout uses enterprise payment UI
plat = sub(plat,
    "if (payMount) payMount.innerHTML = nebrasCart.length ? buildCartBankPaymentHtml(lang) : '';",
    "if (payMount) payMount.innerHTML = nebrasCart.length ? buildCartEnterprisePaymentHtml(lang) : '';",
    'cart enterprise payment mount')

# Executive BI in analytics panel
plat = sub(plat,
    """            if (kpisEl) {
                kpisEl.innerHTML = [
                    { v: uniqueVisitors, l: 'زوار (جلسات)' },
                    { v: callbackLeadsScoped.length, l: 'طلبات «نبراس يتصل بك»' },
                    { v: quotes.length, l: 'عروض + مبيعات' },
                    { v: formatSar(salesTotal).replace(' ر.س', ''), l: 'مبيعات (ر.س)' },
                    { v: erpStats.ordersPending, l: 'طلبات OMS معلّقة' },
                    { v: erpStats.lowStock, l: 'مخزون منخفض' },
                    { v: erpStats.prodToday, l: 'إنتاج اليوم' },
                    { v: csOpen, l: 'CRM مفتوح' },
                    { v: openComplaints, l: 'شكاوى مفتوحة' },
                    { v: shopProductCount, l: 'منتجات متجر' }
                ].map(function(k) {
                    return '<div class="admin-analytics-kpi"><strong>' + k.v + '</strong><span>' + escapeHtmlAttr(k.l) + '</span></div>';
                }).join('');
            }""",
    """            if (kpisEl) {
                kpisEl.innerHTML = [
                    { v: uniqueVisitors, l: 'زوار (جلسات)' },
                    { v: callbackLeadsScoped.length, l: 'طلبات «نبراس يتصل بك»' },
                    { v: quotes.length, l: 'عروض + مبيعات' },
                    { v: formatSar(salesTotal).replace(' ر.س', ''), l: 'مبيعات (ر.س)' },
                    { v: erpStats.ordersPending, l: 'طلبات OMS معلّقة' },
                    { v: erpStats.lowStock, l: 'مخزون منخفض' },
                    { v: erpStats.prodToday, l: 'إنتاج اليوم' },
                    { v: csOpen, l: 'CRM مفتوح' },
                    { v: openComplaints, l: 'شكاوى مفتوحة' },
                    { v: shopProductCount, l: 'منتجات متجر' }
                ].map(function(k) {
                    return '<div class="admin-analytics-kpi"><strong>' + k.v + '</strong><span>' + escapeHtmlAttr(k.l) + '</span></div>';
                }).join('');
            }
            const biMount = document.getElementById('executive-bi-charts-mount');
            if (biMount && typeof buildMainAdminExecutiveBiHtml === 'function') {
                const fleetBi = typeof collectFleetStatsForBi === 'function' ? collectFleetStatsForBi() : { onRoad: 0, total: 0 };
                const repBi = typeof collectSalesRepStatsForBi === 'function' ? collectSalesRepStatsForBi() : { reps: 0, repQuotes: 0 };
                biMount.innerHTML = buildMainAdminExecutiveBiHtml({
                    quotes: quotes,
                    erpStats: erpStats,
                    fleetOnRoad: fleetBi.onRoad,
                    fleetTotal: fleetBi.total,
                    salesReps: repBi.reps,
                    repQuotes: repBi.repQuotes,
                    salesCount: salesFromQuotes + manualSalesCount
                });
            }""",
    'executive BI mount in analytics')

# Dashboard command shell — mini BI for main admin
plat = sub(plat,
    """            const focusBanner = document.getElementById('dashboard-role-focus-banner');
            const focus = DASHBOARD_ROLE_FOCUS[user.role];""",
    """            const dashBi = document.getElementById('dashboard-executive-bi-mini');
            if (dashBi && isMainGovernanceAdmin(user) && typeof buildMainAdminExecutiveBiHtml === 'function') {
                const fleetBi = typeof collectFleetStatsForBi === 'function' ? collectFleetStatsForBi() : { onRoad: 0, total: 0 };
                const repBi = typeof collectSalesRepStatsForBi === 'function' ? collectSalesRepStatsForBi() : { reps: 0, repQuotes: 0 };
                const st = getDashboardExtendedStats();
                dashBi.hidden = false;
                dashBi.innerHTML = buildMainAdminExecutiveBiHtml({
                    quotes: [],
                    erpStats: st,
                    fleetOnRoad: fleetBi.onRoad,
                    fleetTotal: fleetBi.total,
                    salesReps: repBi.reps,
                    repQuotes: repBi.repQuotes,
                    salesCount: st.salesCount || 0
                });
            } else if (dashBi) {
                dashBi.hidden = true;
                dashBi.innerHTML = '';
            }

            const focusBanner = document.getElementById('dashboard-role-focus-banner');
            const focus = DASHBOARD_ROLE_FOCUS[user.role];""",
    'dashboard executive BI mini')

# Window exports
if 'window.setCheckoutPaymentMethod' not in plat:
    plat = sub(plat,
        '        window.renderAdminAnalyticsPanel = renderAdminAnalyticsPanel;',
        '        window.setCheckoutPaymentMethod = setCheckoutPaymentMethod;\n'
        '        window.buildCartEnterprisePaymentHtml = buildCartEnterprisePaymentHtml;\n'
        '        window.renderAdminAnalyticsPanel = renderAdminAnalyticsPanel;',
        'window exports phase20')

with open(PLATFORM_JS, 'w', encoding='utf-8') as f:
    f.write(plat)

# index.html — CSS + mounts
if '35-store-enterprise.css' not in html:
    html = html.replace(
        '    <link rel="stylesheet" href="css/34-hr-platform.css">',
        '    <link rel="stylesheet" href="css/34-hr-platform.css">\n'
        '    <link rel="stylesheet" href="css/35-store-enterprise.css">\n'
        '    <link rel="stylesheet" href="css/36-executive-bi.css">',
        1)
    print('OK: index css links')

if 'executive-bi-charts-mount' not in html:
    html = html.replace(
        '            <div class="admin-analytics-kpis" id="admin-analytics-kpis" aria-live="polite"></div>',
        '            <div class="admin-analytics-kpis" id="admin-analytics-kpis" aria-live="polite"></div>\n'
        '            <div id="executive-bi-charts-mount" aria-live="polite"></div>',
        1)
    print('OK: analytics bi mount')

if 'dashboard-executive-bi-mini' not in html:
    html = html.replace(
        '            <div id="dashboard-gov-users-strip" class="dashboard-gov-users-strip" hidden></div>',
        '            <div id="dashboard-gov-users-strip" class="dashboard-gov-users-strip" hidden></div>\n'
        '            <div id="dashboard-executive-bi-mini" class="dashboard-executive-bi-mini" hidden></div>',
        1)
    print('OK: dashboard bi mini mount')

with open(INDEX_HTML, 'w', encoding='utf-8') as f:
    f.write(html)

print('Phase 20 platform patch complete.')
