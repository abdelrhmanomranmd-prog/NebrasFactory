#!/usr/bin/env python3
"""Phase 25: Cloud guard, analytics hardening, HR org tree, deploy markers."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLATFORM_JS = os.path.join(ROOT, 'js', 'nebras-platform.js')
HR_JS = os.path.join(ROOT, 'js', 'nebras-hr-platform.js')
CSS34 = os.path.join(ROOT, 'css', '34-hr-platform.css')
VERIFY = os.path.join(ROOT, 'tools', 'verify-full-deploy.py')
INJECT = os.path.join(ROOT, 'tools', 'phase25-governance-hr-tree.js')

with open(PLATFORM_JS, encoding='utf-8') as f:
    plat = f.read()
with open(HR_JS, encoding='utf-8') as f:
    hr = f.read()
with open(CSS34, encoding='utf-8') as f:
    css = f.read()
with open(INJECT, encoding='utf-8') as f:
    p25 = f.read()
with open(VERIFY, encoding='utf-8') as f:
    verify = f.read()

MARKER = '/* PHASE25_INJECTED */'


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
    MARKER + '\n' + p25 + '\n        function buildCartBankPaymentHtmlCore(lang) {',
    'inject phase25')

# Cloud stale guard in applyNebrasCloudRow
plat = sub(plat,
    """        function applyNebrasCloudRow(storeKey, payload) {
            const spec = NEBRAS_CLOUD_STORE_SPECS.find(function(s) { return s.key === storeKey; });
            if (!spec || payload === undefined || payload === null) return;""",
    """        function applyNebrasCloudRow(storeKey, payload) {
            if (typeof shouldSkipStaleCloudGovernanceRow === 'function' && shouldSkipStaleCloudGovernanceRow(storeKey)) {
                return;
            }
            const spec = NEBRAS_CLOUD_STORE_SPECS.find(function(s) { return s.key === storeKey; });
            if (!spec || payload === undefined || payload === null) return;""",
    'cloud stale guard')

# mark mutation in finalizeAnalyticsGovernanceMutation
plat = sub(plat,
    """    function finalizeAnalyticsGovernanceMutation(actionLabel, detail) {
        if (typeof persistAnalyticsGovernanceLocal === 'function') persistAnalyticsGovernanceLocal();""",
    """    function finalizeAnalyticsGovernanceMutation(actionLabel, detail) {
        if (typeof markGovernanceMutation === 'function') markGovernanceMutation();
        if (typeof persistAnalyticsGovernanceLocal === 'function') persistAnalyticsGovernanceLocal();""",
    'mark governance mutation')

# Fix double confirm on quotes purge
plat = sub(plat,
    """        if (!skipConfirm && !confirm('حذف تحليلات «' + catLabel + '» لـ ' + periodLabel + '؟ لا يمكن التراجع إلا من سلة الاستعادة (إن وُجدت).')) return 0;

        let removed = 0;
        if (category === 'quotes') {
            if (!skipConfirm) {
                const pl = period === 'daily' ? 'اليوم' : (period === 'monthly' ? 'هذا الشهر' : 'هذه السنة');
                if (!confirm('حذف تحليلات «عروض الأسعار» لـ ' + pl + '؟')) return 0;
            }""",
    """        if (category !== 'quotes' && !skipConfirm && !confirm('حذف تحليلات «' + catLabel + '» لـ ' + periodLabel + '؟ لا يمكن التراجع إلا من سلة الاستعادة (إن وُجدت).')) return 0;
        if (category === 'quotes' && !skipConfirm && !confirm('حذف تحليلات «عروض الأسعار» لـ ' + periodLabel + '؟')) return 0;

        let removed = 0;
        if (category === 'quotes') {""",
    'fix double confirm quotes')

# Remove duplicate clearAllAnalyticsQuotes from phase24 inject
plat = sub(plat,
    """    function clearAllAnalyticsQuotes() {
        clearAllAnalyticsQuotesAsync().catch(function(err) {
            console.warn('clearAllAnalyticsQuotes', err);
            alert('تعذّر إفراغ العروض — أعيدي تحميل الصفحة وحاولي مرة أخرى.');
        });
    }

        function buildCartBankPaymentHtmlCore(lang) {""",
    """        function buildCartBankPaymentHtmlCore(lang) {""",
    'remove duplicate clearAllAnalyticsQuotes')

# Replace inner clear transfers/customers with async delegates
plat = sub(plat,
    """        function clearAllAnalyticsTransfers() {
            if (!requireMainGovernanceAdmin()) return;
            const inbox = loadSalesQuotesInbox();
            const transferEntries = inbox.filter(function(e) {
                return e && (e.transferReceiptDataUrl || e.transferDeclared);
            });
            if (!transferEntries.length) { alert('لا حوالات لإفراغها.'); return; }
            if (!confirm('إفراغ تقرير الحوالات (' + transferEntries.length + ')؟ تُحذف الطلبات المرتبطة من التقارير.')) return;
            transferEntries.forEach(function(entry) {
                archiveAnalyticsRecord('quotes', entry.id || entry.quoteNo, entry, 'حوالة: ' + (entry.quoteNo || entry.customerName));
            });
            const remaining = inbox.filter(function(e) {
                return !e || (!e.transferReceiptDataUrl && !e.transferDeclared);
            });
            saveSalesQuotesInbox(remaining);
            if (typeof finalizeAnalyticsGovernanceMutation === 'function') finalizeAnalyticsGovernanceMutation('إفراغ الحوالات', String(transferEntries.length));
            else saveSystemData();
            displaySalesQuotesInbox();
            renderAdminAnalyticsPanel();
        }""",
    """        function clearAllAnalyticsTransfers() {
            if (typeof clearAllAnalyticsTransfersAsync === 'function') {
                clearAllAnalyticsTransfersAsync().catch(function(err) {
                    console.warn('clearAllAnalyticsTransfers', err);
                    alert('تعذّر إفراغ الحوالات.');
                });
                return;
            }
            if (!requireMainGovernanceAdmin()) return;
            alert('جاري تحميل وحدة الحوكمة — أعيدي المحاولة.');
        }""",
    'clearAllAnalyticsTransfers delegate')

plat = sub(plat,
    """        function clearAllAnalyticsCustomers() {
            if (!requireMainGovernanceAdmin()) return;
            const inbox = loadSalesQuotesInbox();
            if (!inbox.length && !(salesData || []).length) { alert('لا بيانات عملاء لإفراغها.'); return; }
            if (!confirm('إفراغ تقرير العملاء؟ تُحذف كل عروض الأسعار والمبيعات المرتبطة (مع الاستعادة لاحقاً).')) return;
            inbox.forEach(function(entry) {
                archiveAnalyticsRecord('quotes', entry.id || entry.quoteNo, entry, entry.customerName || entry.quoteNo);
            });
            (salesData || []).slice().forEach(function(s) {
                archiveAnalyticsRecord('sales', s.id || s.quoteNo, s, s.customerName || s.product);
            });
            saveSalesQuotesInbox([]);
            salesData = [];
            if (typeof finalizeAnalyticsGovernanceMutation === 'function') finalizeAnalyticsGovernanceMutation('إفراغ العملاء', String(inbox.length));
            else saveSystemData();
            displaySales();
            renderAdminAnalyticsPanel();
        }""",
    """        function clearAllAnalyticsCustomers() {
            if (typeof clearAllAnalyticsCustomersAsync === 'function') {
                clearAllAnalyticsCustomersAsync().catch(function(err) {
                    console.warn('clearAllAnalyticsCustomers', err);
                    alert('تعذّر إفراغ العملاء.');
                });
                return;
            }
            if (!requireMainGovernanceAdmin()) return;
            alert('جاري تحميل وحدة الحوكمة — أعيدي المحاولة.');
        }""",
    'clearAllAnalyticsCustomers delegate')

# Window exports phase25
if 'window.markGovernanceMutation' not in plat:
    plat = sub(plat,
        '        window.closeAllAdminSections = closeAllAdminSections;',
        '        window.markGovernanceMutation = markGovernanceMutation;\n        window.clearAllAnalyticsTransfersAsync = clearAllAnalyticsTransfersAsync;\n        window.clearAllAnalyticsCustomersAsync = clearAllAnalyticsCustomersAsync;\n        window.closeAllAdminSections = closeAllAdminSections;',
        'window exports phase25')

# HR org tree tab + panel
if "id: 'org-tree'" not in hr:
    hr = sub(hr,
        "{ id: 'factory', icon: 'fas fa-industry', label: 'عمليات المصنع WPC' },",
        "{ id: 'org-tree', icon: 'fas fa-sitemap', label: 'شجرة العمل' },\n            { id: 'factory', icon: 'fas fa-industry', label: 'عمليات المصنع WPC' },",
        'hr org-tree tab')

    hr = sub(hr,
        "else if (hrActiveTab === 'factory') panelHtml = renderHrFactoryPanel();",
        "else if (hrActiveTab === 'org-tree') panelHtml = renderHrOrgTreePanel();\n        else if (hrActiveTab === 'factory') panelHtml = renderHrFactoryPanel();",
        'hr org-tree render branch')

ORG_TREE_FN = r'''
    function renderHrOrgTreePanel() {
        loadHrData();
        const team = applyHrScopeFilter(hrEmployees.filter(function(e) { return e.status !== 'terminated'; }), 'employee');
        const depts = typeof HR_FACTORY_DEPTS !== 'undefined' ? HR_FACTORY_DEPTS : {};
        const deptKeys = Object.keys(depts);
        const byDept = {};
        deptKeys.forEach(function(k) { byDept[k] = []; });
        team.forEach(function(e) {
            const k = e.departmentKey || 'admin';
            if (!byDept[k]) byDept[k] = [];
            byDept[k].push(e);
        });
        const branchLabel = function(e) {
            return typeof resolveHrBranchLabel === 'function' ? resolveHrBranchLabel(e.branchId) : (e.branchId || '—');
        };
        const treeHtml = deptKeys.map(function(dk) {
            const list = byDept[dk] || [];
            if (!list.length) return '';
            const cards = list.map(function(e) {
                const skill = (typeof HR_SKILL_LEVELS !== 'undefined' && e.skillLevel && HR_SKILL_LEVELS[e.skillLevel]) ? HR_SKILL_LEVELS[e.skillLevel] : (e.jobTitle || '—');
                return '<div class="hr-org-node" role="treeitem">' +
                    '<div class="hr-org-node-head"><strong>' + esc(e.nameAr || e.nameEn || '—') + '</strong>' +
                    '<span class="erp-tag">' + esc(e.employeeNo || '') + '</span></div>' +
                    '<p class="hr-org-node-meta">' + esc(skill) + ' · ' + esc(branchLabel(e)) + '</p>' +
                    '<div class="hr-org-node-actions">' +
                        '<button type="button" class="erp-tag erp-tag--action" onclick="openHrEmployeeEditor(\'' + esc(e.id) + '\')"><i class="fas fa-pen"></i> تعديل</button>' +
                        (e.assignedVehicleId ? '<span class="erp-tag"><i class="fas fa-car"></i> سيارة</span>' : '') +
                    '</div></div>';
            }).join('');
            return '<section class="hr-org-branch" role="group" aria-label="' + esc(depts[dk]) + '">' +
                '<header class="hr-org-branch-head"><i class="fas fa-folder-tree"></i><h4>' + esc(depts[dk]) + '</h4>' +
                '<span class="hr-org-count">' + list.length + ' موظف</span></header>' +
                '<div class="hr-org-children" role="group">' + cards + '</div></section>';
        }).join('');

        return '<div class="hr-panel is-active hr-org-tree-panel">' +
            '<div class="hr-org-tree-intro">' +
                '<h4><i class="fas fa-sitemap"></i> شجرة العمل — هيكل المصنع</h4>' +
                '<p>بناء الشجرة: أضيفي موظفين وحددي <strong>قسم المصنع</strong> و<strong>المسمى</strong> من تبويب الموظفون — تظهر تلقائياً هنا حسب القسم والفرع.</p>' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="openHrEmployeeEditor()"><i class="fas fa-user-plus"></i> إضافة موظف للشجرة</button>' +
            '</div>' +
            '<div class="hr-org-tree-root" role="tree">' +
                (treeHtml || '<p class="erp-empty">لا موظفين في نطاقك — ابدئي بإضافة موظف وتحديد قسمه.</p>') +
            '</div></div>';
    }

'''

if 'function renderHrOrgTreePanel' not in hr:
    anchor = '    function renderHrFactoryPanel() {'
    if anchor not in hr:
        print('MISSING [renderHrFactoryPanel anchor]')
        sys.exit(1)
    hr = hr.replace(anchor, ORG_TREE_FN + '\n' + anchor, 1)
    print('OK: renderHrOrgTreePanel')

if 'global.renderHrOrgTreePanel' not in hr:
    hr = sub(hr,
        '    global.renderHrFactoryPanel = renderHrFactoryPanel;',
        '    global.renderHrOrgTreePanel = renderHrOrgTreePanel;\n    global.renderHrFactoryPanel = renderHrFactoryPanel;',
        'export renderHrOrgTreePanel')

# HR CSS org tree
if '.hr-org-tree-panel' not in css:
    css += """

/* Phase 25 — شجرة العمل HR */
.hr-org-tree-panel { padding: 4px 0; }
.hr-org-tree-intro {
    margin: 0 0 16px;
    padding: 14px 16px;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(41, 128, 185, 0.08), rgba(39, 174, 96, 0.06));
    border: 1px solid rgba(41, 128, 185, 0.2);
}
.hr-org-tree-intro h4 { margin: 0 0 8px; color: #1a5276; }
.hr-org-tree-intro p { margin: 0 0 12px; font-size: 0.86rem; color: #2c5282; }
.hr-org-tree-root { display: flex; flex-direction: column; gap: 14px; }
.hr-org-branch {
    border: 1px solid #d8e2ec;
    border-radius: 14px;
    background: #f8fafc;
    overflow: hidden;
}
.hr-org-branch-head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    background: linear-gradient(135deg, #0d2840, #155e94);
    color: #fff;
}
.hr-org-branch-head h4 { margin: 0; flex: 1; font-size: 0.95rem; }
.hr-org-count { font-size: 0.78rem; opacity: 0.85; }
.hr-org-children {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 10px;
    padding: 12px;
}
.hr-org-node {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 12px;
    background: #fff;
}
.hr-org-node-head { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
.hr-org-node-meta { margin: 6px 0 8px; font-size: 0.78rem; color: #5a6a7a; }
.hr-org-node-actions { display: flex; flex-wrap: wrap; gap: 6px; }
"""
    print('OK: hr org tree css')

# Update verify markers
if 'PHASE24_INJECTED' not in verify:
    verify = verify.replace(
        "'js/nebras-platform.js': ['PHASE22_INJECTED', 'purgeAnalyticsByPeriod', 'renderUserScopeLockBanner', 'assertQuoteAccess'],",
        "'js/nebras-platform.js': ['PHASE24_INJECTED', 'PHASE25_INJECTED', 'finalizeAnalyticsGovernanceMutation', 'mergeAllQuotesForGovernanceAsync', 'purgeAnalyticsByPeriod'],",
        1)
    verify = verify.replace(
        "'js/nebras-hr-platform.js': ['PHASE22_HR_INJECTED', 'requireHrRecordInScope', 'purgeHrAnalyticsByPeriod'],",
        "'js/nebras-hr-platform.js': ['PHASE22_HR_INJECTED', 'renderHrOrgTreePanel', 'openHrPlatform', 'requireHrRecordInScope'],",
        1)
    print('OK: verify markers')

with open(PLATFORM_JS, 'w', encoding='utf-8') as f:
    f.write(plat)
with open(HR_JS, 'w', encoding='utf-8') as f:
    f.write(hr)
with open(CSS34, 'w', encoding='utf-8') as f:
    f.write(css)
with open(VERIFY, 'w', encoding='utf-8') as f:
    f.write(verify)

print('PHASE25_DONE')
