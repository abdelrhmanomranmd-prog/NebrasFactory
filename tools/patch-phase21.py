#!/usr/bin/env python3
"""Phase 21: Admin enterprise UI polish — unified design, analytics tabs, live BI."""
import os
import sys
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLATFORM_JS = os.path.join(ROOT, 'js', 'nebras-platform.js')
INDEX_HTML = os.path.join(ROOT, 'index.html')
INJECT = os.path.join(ROOT, 'tools', 'phase21-admin-polish.js')

with open(PLATFORM_JS, encoding='utf-8') as f:
    plat = f.read()
with open(INJECT, encoding='utf-8') as f:
    p21 = f.read()
with open(INDEX_HTML, encoding='utf-8') as f:
    html = f.read()

MARKER = '/* PHASE21_INJECTED */'


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

# Remove duplicate buildMainAdminExecutiveBiHtml from phase20 (phase21 replaces)
OLD_BI = re.compile(
    r'    function buildMainAdminExecutiveBiHtml\(ctx\) \{.*?'
    r"        return '<section class=\"nebras-executive-bi\" id=\"executive-bi-charts-panel\">' \+.*?"
    r'            \'</div></section>\';\n    \}\n\n',
    re.DOTALL
)
if OLD_BI.search(plat):
    plat = OLD_BI.sub('', plat, count=1)
    print('OK: remove old buildMainAdminExecutiveBiHtml')

plat = sub(plat,
    '        function buildCartBankPaymentHtmlCore(lang) {',
    MARKER + '\n' + p21 + '\n        function buildCartBankPaymentHtmlCore(lang) {',
    'inject phase21')

# Shell BI — async live data + compact UI
plat = sub(plat,
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
            }""",
    """            if (typeof refreshDashboardExecutiveBi === 'function') {
                refreshDashboardExecutiveBi(user);
            }""",
    'shell compact BI async')

# Analytics — full BI panel id + tab system
plat = sub(plat,
    """                biMount.innerHTML = buildMainAdminExecutiveBiHtml({
                    quotes: quotes,
                    erpStats: erpStats,
                    fleetOnRoad: fleetBi.onRoad,
                    fleetTotal: fleetBi.total,
                    salesReps: repBi.reps,
                    repQuotes: repBi.repQuotes,
                    salesCount: salesFromQuotes + manualSalesCount
                });
            }""",
    """                biMount.innerHTML = buildMainAdminExecutiveBiHtml({
                    panelId: 'executive-bi-charts-panel-full',
                    quotes: quotes,
                    erpStats: erpStats,
                    fleetOnRoad: fleetBi.onRoad,
                    fleetTotal: fleetBi.total,
                    salesReps: repBi.reps,
                    repQuotes: repBi.repQuotes,
                    salesCount: salesFromQuotes + manualSalesCount
                });
            }""",
    'analytics BI id + tabs')

# mountAnalyticsTabSystem at end of renderAdminAnalyticsPanel
if 'restoreMount) restoreMount.innerHTML = buildAnalyticsRestorePanelHtml();\n            if (typeof mountAnalyticsTabSystem' not in plat:
    plat = sub(plat,
        """            const restoreMount = document.getElementById('analytics-restore-mount');
            if (restoreMount) restoreMount.innerHTML = buildAnalyticsRestorePanelHtml();
        }

        function openAdminAnalytics() {""",
        """            const restoreMount = document.getElementById('analytics-restore-mount');
            if (restoreMount) restoreMount.innerHTML = buildAnalyticsRestorePanelHtml();
            if (typeof mountAnalyticsTabSystem === 'function') mountAnalyticsTabSystem();
        }

        function openAdminAnalytics() {""",
        'analytics tabs at end')

# Store payment — compact coming soon
plat = sub(plat,
    """            '<div class="cart-pay-methods-grid">' + grid + '</div>' +
            bankBlock +
        '</section>';""",
    """            '<div class="cart-pay-methods-grid cart-pay-methods-grid--compact">' + grid + '</div>' +
            '<p class="cart-pay-coming-soon"><i class="fas fa-clock"></i> ' + escapeHtmlAttr(ui.payComingSoonNote || 'مدى · Visa · Apple Pay · Tabby · Tamara — قريباً عبر بوابة دفع معتمدة') + '</p>' +
            bankBlock +
        '</section>';""",
    'payment coming soon note')

# Window exports
if 'window.switchAnalyticsTab' not in plat:
    plat = sub(plat,
        '        window.setCheckoutPaymentMethod = setCheckoutPaymentMethod;',
        '        window.switchAnalyticsTab = switchAnalyticsTab;\n'
        '        window.showNebrasAdminToast = showNebrasAdminToast;\n'
        '        window.refreshDashboardExecutiveBi = refreshDashboardExecutiveBi;\n'
        '        window.setCheckoutPaymentMethod = setCheckoutPaymentMethod;',
        'window exports phase21')

with open(PLATFORM_JS, 'w', encoding='utf-8') as f:
    f.write(plat)

# index.html updates
if '37-admin-enterprise-unified.css' not in html:
    html = html.replace(
        '    <link rel="stylesheet" href="css/36-executive-bi.css">',
        '    <link rel="stylesheet" href="css/36-executive-bi.css">\n'
        '    <link rel="stylesheet" href="css/37-admin-enterprise-unified.css">',
        1)
    print('OK: css 37 link')

# Login overlay enterprise
OLD_LOGIN = """    <div class="admin-overlay" id="admin-overlay">
        <div class="admin-modal">
            <h2 id="admin-login-title">تسجيل دخول الإدارة</h2>
            <p class="status" id="admin-status-message"></p>
            <input id="admin-username" type="text" placeholder="اسم المستخدم" autocomplete="username">
            <input id="admin-password" type="password" placeholder="كلمة المرور" autocomplete="current-password">
            <button class="primary" id="admin-login-btn" onclick="loginAdmin()">دخول</button>
            <button class="secondary" id="admin-login-cancel" onclick="closeAdminOverlay()">إلغاء</button>
        </div>
    </div>"""

NEW_LOGIN = """    <div class="admin-overlay admin-overlay--enterprise" id="admin-overlay">
        <div class="admin-modal admin-modal--enterprise">
            <div class="admin-modal-head">
                <span class="admin-modal-logo" aria-hidden="true"><i class="fas fa-industry"></i></span>
                <div>
                    <h2 id="admin-login-title">تسجيل دخول الإدارة</h2>
                    <p class="admin-modal-sub">منصة نبراس ERP — للموظفين المصرّح لهم فقط</p>
                </div>
            </div>
            <div class="admin-modal-body">
                <p class="status" id="admin-status-message"></p>
                <input id="admin-username" type="text" placeholder="اسم المستخدم" autocomplete="username">
                <input id="admin-password" type="password" placeholder="كلمة المرور" autocomplete="current-password">
                <div class="admin-modal-actions">
                    <button class="primary" id="admin-login-btn" onclick="loginAdmin()"><i class="fas fa-right-to-bracket"></i> دخول آمن</button>
                    <button class="secondary" id="admin-login-cancel" onclick="closeAdminOverlay()">إلغاء</button>
                </div>
            </div>
        </div>
    </div>"""

if 'admin-overlay--enterprise' not in html:
    if OLD_LOGIN in html:
        html = html.replace(OLD_LOGIN, NEW_LOGIN, 1)
        print('OK: enterprise login overlay')
    else:
        print('SKIP: login overlay already updated or structure changed')

# Fix partners HTML nesting
OLD_PARTNERS = """            <div class="nebras-partners-stage nebras-partners-stage--dashboard" id="nebras-partners-stage-dashboard">
                <div class="nebras-partners-marquee nebras-partners-marquee--premium nebras-partners-marquee--row1">
                    <div class="nebras-partners-track" id="nebras-partners-track-dashboard-a"></div>
            </div>
                <div class="nebras-partners-marquee nebras-partners-marquee--premium nebras-partners-marquee--row2">
                    <div class="nebras-partners-track nebras-partners-track--reverse" id="nebras-partners-track-dashboard-b"></div>
        </div>
            </div>"""

NEW_PARTNERS = """            <div class="nebras-partners-stage nebras-partners-stage--dashboard" id="nebras-partners-stage-dashboard">
                <div class="nebras-partners-marquee nebras-partners-marquee--premium nebras-partners-marquee--row1">
                    <div class="nebras-partners-track" id="nebras-partners-track-dashboard-a"></div>
                </div>
                <div class="nebras-partners-marquee nebras-partners-marquee--premium nebras-partners-marquee--row2">
                    <div class="nebras-partners-track nebras-partners-track--reverse" id="nebras-partners-track-dashboard-b"></div>
                </div>
            </div>"""

if OLD_PARTNERS in html:
    html = html.replace(OLD_PARTNERS, NEW_PARTNERS, 1)
    print('OK: partners HTML fix')

# Fix identity block indentation
OLD_IDENTITY = """                <div class="dashboard-identity-headcopy">
                    <p class="dashboard-identity-kicker" id="dashboard-identity-kicker"><i class="fas fa-star" aria-hidden="true"></i> شركة مصنع نبراس للبلاستيك</p>
            <h3 id="dashboard-legal-title" class="admin-only-ui">بيانات مصنع نبراس الرسمية (داخلية + خارجية)</h3>
                </div>"""

NEW_IDENTITY = """                <div class="dashboard-identity-headcopy">
                    <p class="dashboard-identity-kicker" id="dashboard-identity-kicker"><i class="fas fa-star" aria-hidden="true"></i> شركة مصنع نبراس للبلاستيك</p>
                    <h3 id="dashboard-legal-title" class="admin-only-ui">بيانات مصنع نبراس الرسمية (داخلية + خارجية)</h3>
                </div>"""

if OLD_IDENTITY in html:
    html = html.replace(OLD_IDENTITY, NEW_IDENTITY, 1)
    print('OK: identity indentation fix')

with open(INDEX_HTML, 'w', encoding='utf-8') as f:
    f.write(html)

print('Phase 21 patch complete.')
