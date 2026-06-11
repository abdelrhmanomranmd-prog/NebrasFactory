#!/usr/bin/env python3
"""Phase 24: Fix analytics purge (cloud+local) and HR platform open."""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLATFORM_JS = os.path.join(ROOT, 'js', 'nebras-platform.js')
HR_JS = os.path.join(ROOT, 'js', 'nebras-hr-platform.js')
CSS34 = os.path.join(ROOT, 'css', '34-hr-platform.css')
INJECT = os.path.join(ROOT, 'tools', 'phase24-analytics-hr-fix.js')

with open(PLATFORM_JS, encoding='utf-8') as f:
    plat = f.read()
with open(HR_JS, encoding='utf-8') as f:
    hr = f.read()
with open(CSS34, encoding='utf-8') as f:
    css = f.read()
with open(INJECT, encoding='utf-8') as f:
    p24 = f.read()

MARKER = '/* PHASE24_INJECTED */'


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

plat = sub(plat,
    '        function buildCartBankPaymentHtmlCore(lang) {',
    MARKER + '\n' + p24 + '\n        function buildCartBankPaymentHtmlCore(lang) {',
    'inject phase24')

# Replace purgeAnalyticsByPeriod quotes branch + finalize other branches
old_purge_quotes = """        if (category === 'quotes') {
            const inbox = loadSalesQuotesInbox();
            const keep = [];
            inbox.forEach(function(entry) {
                if (entry && matchesExecutiveReportPeriod(entry, period)) {
                    archiveAnalyticsRecord('quotes', entry.id || entry.quoteNo, entry, entry.quoteNo || entry.customerName);
                    removed++;
                } else {
                    keep.push(entry);
                }
            });
            saveSalesQuotesInbox(keep);
            displaySalesQuotesInbox();
        }"""

new_purge_quotes = """        if (category === 'quotes') {
            if (!skipConfirm) {
                const pl = period === 'daily' ? 'اليوم' : (period === 'monthly' ? 'هذا الشهر' : 'هذه السنة');
                if (!confirm('حذف تحليلات «عروض الأسعار» لـ ' + pl + '؟')) return 0;
            }
            purgeAnalyticsQuotesByPeriod(period, true).then(function(qRemoved) {
                removed = qRemoved;
                if (!skipConfirm) {
                    const pl2 = period === 'daily' ? 'اليوم' : (period === 'monthly' ? 'هذا الشهر' : 'هذه السنة');
                    if (typeof showNebrasAdminToast === 'function') {
                        showNebrasAdminToast(qRemoved ? ('تم حذف ' + qRemoved + ' عرض — ' + pl2) : ('لا عروض في هذه الفترة — ' + pl2), qRemoved ? 'ok' : 'warn');
                    } else if (!qRemoved) alert('لا عروض في الفترة المحددة (' + pl2 + ').');
                    renderAdminAnalyticsPanel();
                    if (typeof refreshDashboardExecutiveBi === 'function' && currentAdmin) refreshDashboardExecutiveBi(currentAdmin);
                }
            }).catch(function(err) {
                console.warn('purgeAnalyticsQuotesByPeriod', err);
                alert('تعذّر حذف العروض — تحققي من الاتصال وأعيدي المحاولة.');
            });
            return 0;
        }"""

if old_purge_quotes in plat:
    plat = plat.replace(old_purge_quotes, new_purge_quotes, 1)
    print('OK: purge quotes branch')
else:
    print('MISSING [purge quotes branch]')
    sys.exit(1)

# Add finalize after purge block (before skipConfirm feedback)
old_purge_tail = """        if (!skipConfirm) {
            addAuditLog('حذف تحليلات بالفترة', catLabel + ' — ' + periodLabel + ' (' + removed + ' سجل)');
            if (typeof showNebrasAdminToast === 'function') {
                showNebrasAdminToast('تم حذف ' + removed + ' سجل — ' + catLabel + ' / ' + periodLabel, 'ok');
            }
            renderAdminAnalyticsPanel();
            if (typeof refreshDashboardExecutiveBi === 'function' && currentAdmin) refreshDashboardExecutiveBi(currentAdmin);
        }
        return removed;
    }

    function purgeAllAnalyticsByPeriod(period) {"""

new_purge_tail = """        if (category !== 'quotes') finalizeAnalyticsGovernanceMutation('حذف تحليلات بالفترة', catLabel + ' — ' + periodLabel + ' (' + removed + ')');
        if (!skipConfirm && category !== 'quotes') {
            if (typeof showNebrasAdminToast === 'function') {
                showNebrasAdminToast(removed ? ('تم حذف ' + removed + ' سجل — ' + catLabel + ' / ' + periodLabel) : ('لا سجلات في الفترة — ' + catLabel + ' / ' + periodLabel), removed ? 'ok' : 'warn');
            } else if (!removed) alert('لا سجلات في الفترة المحددة (' + periodLabel + ').');
            renderAdminAnalyticsPanel();
            if (typeof refreshDashboardExecutiveBi === 'function' && currentAdmin) refreshDashboardExecutiveBi(currentAdmin);
        }
        return removed;
    }

    function purgeAllAnalyticsByPeriod(period) {"""

if old_purge_tail in plat:
    plat = plat.replace(old_purge_tail, new_purge_tail, 1)
    print('OK: purge tail finalize')
else:
    print('MISSING [purge tail]')
    sys.exit(1)

# Replace inner clearAllAnalyticsQuotes (duplicate) with thin wrapper if still present
old_clear = """        function clearAllAnalyticsQuotes() {
            if (!requireMainGovernanceAdmin()) return;
            const inbox = loadSalesQuotesInbox();
            if (!inbox.length) { alert('لا عروض أسعار لإفراغها.'); return; }
            if (!confirm('إفراغ كل عروض الأسعار من التقارير؟ (تُحفظ في سلة الاستعادة)')) return;
            inbox.forEach(function(entry) {
                archiveAnalyticsRecord('quotes', entry.id || entry.quoteNo, entry, entry.quoteNo || entry.customerName);
            });
            saveSalesQuotesInbox([]);
            displaySalesQuotesInbox();
            renderAdminAnalyticsPanel();
        }"""

if old_clear in plat:
    plat = plat.replace(old_clear, """        function clearAllAnalyticsQuotes() {
            if (typeof clearAllAnalyticsQuotesAsync === 'function') {
                clearAllAnalyticsQuotesAsync().catch(function(err) {
                    console.warn('clearAllAnalyticsQuotes', err);
                    alert('تعذّر إفراغ العروض — أعيدي تحميل الصفحة.');
                });
                return;
            }
            if (!requireMainGovernanceAdmin()) return;
            const inbox = loadSalesQuotesInbox();
            if (!inbox.length) { alert('لا عروض أسعار لإفراغها.'); return; }
            if (!confirm('إفراغ كل عروض الأسعار من التقارير؟ (تُحفظ في سلة الاستعادة)')) return;
            inbox.forEach(function(entry) {
                if (typeof archiveAnalyticsQuoteKeys === 'function') archiveAnalyticsQuoteKeys(entry);
                else archiveAnalyticsRecord('quotes', entry.id || entry.quoteNo, entry, entry.quoteNo || entry.customerName);
            });
            saveSalesQuotesInbox([]);
            displaySalesQuotesInbox();
            if (typeof finalizeAnalyticsGovernanceMutation === 'function') finalizeAnalyticsGovernanceMutation('إفراغ كل العروض', String(inbox.length));
            else saveSystemData();
            renderAdminAnalyticsPanel();
        }""", 1)
    print('OK: clearAllAnalyticsQuotes inner')
else:
    print('SKIP: inner clearAllAnalyticsQuotes already patched')

# emptyAnalyticsRestoreBin finalize
plat = sub(plat,
    """            analyticsGovernance.deleted = { quotes: [], visitors: [], complaints: [], sales: [], customers: [] };
            saveSystemData();
            addAuditLog('إفراغ سلة الاستعادة', String(total) + ' عنصر');
            renderAdminAnalyticsPanel();
        }""",
    """            analyticsGovernance.deleted = { quotes: [], visitors: [], complaints: [], sales: [], customers: [] };
            if (typeof finalizeAnalyticsGovernanceMutation === 'function') {
                finalizeAnalyticsGovernanceMutation('إفراغ سلة الاستعادة', String(total) + ' عنصر');
            } else {
                saveSystemData();
                addAuditLog('إفراغ سلة الاستعادة', String(total) + ' عنصر');
            }
            if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تم الحذف النهائي لـ ' + total + ' عنصر من سلة الاستعادة', 'ok');
            renderAdminAnalyticsPanel();
        }""",
    'emptyAnalyticsRestoreBin')

# DASHBOARD_HANDLER_MAP HR handler
plat = sub(plat,
    "            openHrPlatform: function() { if (typeof openHrPlatform === 'function') openHrPlatform(); },",
    "            openHrPlatform: function() {\n                const fn = window.openHrPlatform;\n                if (typeof fn === 'function') fn();\n                else alert('منصة HR قيد التحميل — أعيدي تحميل الصفحة.');\n            },",
    'DASHBOARD_HANDLER_MAP openHrPlatform')

# closeAdminSection uses closeAllAdminSections
plat = sub(plat,
    """        function closeAdminSection(sectionId) {
            document.getElementById(sectionId).classList.remove('show');
        }""",
    """        function closeAllAdminSections() {
            document.querySelectorAll('.admin-section.show').forEach(function(el) {
                el.classList.remove('show');
                el.setAttribute('aria-hidden', 'true');
            });
            document.body.classList.remove('hr-platform-open');
        }

        function closeAdminSection(sectionId) {
            const el = document.getElementById(sectionId);
            if (el) {
                el.classList.remove('show');
                el.setAttribute('aria-hidden', 'true');
            }
            if (!document.querySelector('.admin-section.show')) {
                document.body.classList.remove('hr-platform-open');
            }
        }""",
    'closeAdminSection')

# window exports
if 'window.closeAllAdminSections' not in plat:
    plat = sub(plat,
        '        window.purgeAnalyticsByPeriod = purgeAnalyticsByPeriod;',
        '        window.closeAllAdminSections = closeAllAdminSections;\n        window.finalizeAnalyticsGovernanceMutation = finalizeAnalyticsGovernanceMutation;\n        window.purgeAnalyticsQuotesByPeriod = purgeAnalyticsQuotesByPeriod;\n        window.clearAllAnalyticsQuotesAsync = clearAllAnalyticsQuotesAsync;\n        window.purgeAnalyticsByPeriod = purgeAnalyticsByPeriod;',
        'window exports phase24')

# HR openHrPlatform
hr = sub(hr,
    """    function openHrPlatform() {
        if (!requireHrAccess()) return;
        loadHrData();
        renderHrPlatformPanel();
        const el = document.getElementById('hr-platform');
        if (el) el.classList.add('show');
    }""",
    """    function openHrPlatform() {
        if (!requireHrAccess()) return;
        loadHrData();
        if (typeof closeAllAdminSections === 'function') closeAllAdminSections();
        else document.querySelectorAll('.admin-section.show').forEach(function(node) { node.classList.remove('show'); });
        renderHrPlatformPanel();
        const el = document.getElementById('hr-platform');
        if (!el) {
            alert('تعذر فتح منصة HR — أعيدي تحميل الصفحة.');
            return;
        }
        el.classList.add('show');
        el.setAttribute('aria-hidden', 'false');
        document.body.classList.add('hr-platform-open');
        try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { /* ignore */ }
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('منصة الموارد البشرية — جاهزة', 'ok');
    }""",
    'openHrPlatform')

# HR CSS z-index
if '#hr-platform.admin-section.show' not in css:
    css += """

/* Phase 24 — ضمان ظهور منصة HR فوق الداشبورد */
#hr-platform.admin-section.show {
    z-index: 10050;
    visibility: visible;
    opacity: 1;
    pointer-events: auto;
}
body.hr-platform-open {
    overflow: hidden;
}
"""
    print('OK: hr css z-index')
else:
    print('SKIP: hr css already patched')

with open(PLATFORM_JS, 'w', encoding='utf-8') as f:
    f.write(plat)
with open(HR_JS, 'w', encoding='utf-8') as f:
    f.write(hr)
with open(CSS34, 'w', encoding='utf-8') as f:
    f.write(css)

print('PHASE24_DONE')
