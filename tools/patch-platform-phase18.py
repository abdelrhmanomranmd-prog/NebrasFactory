#!/usr/bin/env python3
"""Phase 18: Sales rep quotes-only, rep library, Odoo-like data persistence."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLATFORM_JS = os.path.join(ROOT, 'js', 'nebras-platform.js')
CSS_FILE = os.path.join(ROOT, 'css', '32-executive-reports.css')
INJECT = os.path.join(ROOT, 'tools', 'phase18-rep-odoo.js')

with open(PLATFORM_JS, encoding='utf-8') as f:
    plat = f.read()
with open(INJECT, encoding='utf-8') as f:
    p18 = f.read()
with open(CSS_FILE, encoding='utf-8') as f:
    css = f.read()

MARKER = '/* PHASE18_INJECTED */'


def sub(text, old, new, label):
    if old not in text:
        print(f'MISSING [{label}]')
        sys.exit(1)
    print(f'OK: {label}')
    return text.replace(old, new, 1)


# Remove prior inject
if MARKER in plat:
    start = plat.index(MARKER)
    end = plat.index('        function openCustomerComplaints()', start)
    plat = plat[:start] + plat[end:]

plat = sub(plat,
    '        function openCustomerComplaints() {',
    MARKER + '\n' + p18 + '\n        function openCustomerComplaints() {',
    'inject phase18')

# Sales rep role — quotes only
plat = sub(plat,
    """            sales_rep: {
                labelAr: 'مندوب مبيعات', labelEn: 'Sales Representative',
                icon: 'fas fa-user-headset', accent: '#2aa9c9',
                descAr: 'ينشئ عروض الأسعار للعملاء من البيانات التي يحددها مدير المبيعات.',
                permissions: ['quotes', 'customerService']
            },""",
    """            sales_rep: {
                labelAr: 'مندوب مبيعات', labelEn: 'Sales Representative',
                icon: 'fas fa-user-headset', accent: '#2aa9c9',
                descAr: 'عروض أسعار فقط — إنشاء · معاينة · استخراج PDF · تنزيل للعملاء. لا صلاحيات أخرى.',
                permissions: ['quotes'],
                quotesOnly: true
            },""",
    'sales_rep quotes only')

# Dashboard focus — rep sees quotes workspace only
plat = sub(plat,
    """            sales_rep: {
                greetingAr: 'مركز مندوب المبيعات',
                descAr: 'أنشئ عروض الأسعار للعملاء من قائمة الأسعار التي يحددها مدير المبيعات.',
                scrollTo: 'erp-hub-panel',
                openHandler: 'openRepQuoteBuilder',
                hideSections: ['dashboard-company-identity', 'dashboard-partners-block', 'platform-hub-panel', 'dashboard-channels-panel', 'dashboard-occasion-panel', 'dashboard-official-hub']
            },""",
    """            sales_rep: {
                greetingAr: 'مركز عروض الأسعار — مندوب المبيعات',
                descAr: 'مهمتك: بناء عروض سعر للعملاء · معاينة A4 · استخراج وتنزيل PDF — من القائمة المعتمدة فقط.',
                scrollTo: 'dashboard-actions-grid',
                openHandler: 'openRepQuoteBuilder',
                hideSections: [
                    'dashboard-company-identity', 'dashboard-partners-block', 'platform-hub-panel',
                    'dashboard-channels-panel', 'dashboard-occasion-panel', 'dashboard-official-hub',
                    'erp-hub-panel', 'dashboard-main-nav', 'dashboard-hub-intro', 'dashboard-secondary-grid',
                    'dashboard-command-extended'
                ]
            },""",
    'sales_rep dashboard scope')

# Quick actions — rep gets quotes + my quotes + account security
plat = sub(plat,
    """                { roles: ['sales_manager', 'sales_rep', 'branch_manager'], icon: 'fas fa-file-signature', label: 'عروض الأسعار', handler: 'openRepQuoteBuilder', perm: 'quotes' },""",
    """                { roles: ['sales_manager', 'sales_rep', 'branch_manager'], icon: 'fas fa-file-signature', label: 'بناء عرض سعر', handler: 'openRepQuoteBuilder', perm: 'quotes' },
                { roles: ['sales_rep'], icon: 'fas fa-folder-open', label: 'عروضي المحفوظة', handler: 'openRepMyQuotes', perm: 'quotes' },
                { roles: ['sales_rep'], icon: 'fas fa-shield-halved', label: 'أمان حسابي', handler: 'openAccountSecurity', perm: null },""",
    'rep quick actions')

# Quote A4 preview — allow quotes permission for reps
plat = sub(plat,
    """        function openSalesQuoteA4Preview(entry, options) {
            options = options || {};
            if (!requirePermission('sales', 'معاينة عرض السعر تتطلب صلاحية المبيعات.')) return;""",
    """        function openSalesQuoteA4Preview(entry, options) {
            options = options || {};
            if (!options.repAccess && !canAccessQuoteDocumentOps()) {
                if (!requirePermission('sales', 'معاينة عرض السعر تتطلب صلاحية المبيعات.')) return;
            } else if (!canAccessQuoteDocumentOps()) {
                if (!requirePermission('quotes', 'صلاحية عروض الأسعار مطلوبة.')) return;
            }""",
    'quote preview quotes perm')

# saveRepQuote — stamp rep identity + branch
plat = sub(plat,
    """                quoteKind: 'rep-built',
                quoteType: 'quote',
                messageFormat: 'a4-quote-pdf',
                by: erpActor(),
                assignedBranchCity: (currentAdmin && currentAdmin.assignedBranchCity) || ''
            };""",
    """                quoteKind: 'rep-built',
                quoteType: 'quote',
                messageFormat: 'a4-quote-pdf',
                by: erpActor(),
                repUsername: currentAdmin ? currentAdmin.username : '',
                repUserId: currentAdmin ? currentAdmin.id : '',
                branchId: (typeof getAdminAssignedBranchId === 'function' ? getAdminAssignedBranchId(currentAdmin) : null) || 'hq',
                assignedBranchCity: (currentAdmin && currentAdmin.assignedBranchCity) || ''
            };""",
    'saveRepQuote metadata')

# renderRepQuoteBuilder — add my quotes library
plat = sub(plat,
    """                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveRepQuote()"><i class="fas fa-floppy-disk"></i> حفظ وإرسال للمبيعات</button>' +
                '</div>';
        }""",
    """                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveRepQuote()"><i class="fas fa-floppy-disk"></i> حفظ وإرسال للمبيعات</button>' +
                '</div>' +
                (typeof renderRepMyQuotesSection === 'function' ? renderRepMyQuotesSection() : '');
        }""",
    'rep quotes library in builder')

# showAdminDashboard — skip heavy panels for reps
plat = sub(plat,
    """            displayUsers();
            displaySales();
            displaySalesQuotesInbox();
            displayCustomerService();
            displayComplaints();
            updateSalesQuoteFab();
            renderAdminAnalyticsPanel();""",
    """            if (!isStrictSalesRep(user)) {
                displayUsers();
                displaySales();
                displaySalesQuotesInbox();
                displayCustomerService();
                displayComplaints();
                renderAdminAnalyticsPanel();
            }
            updateSalesQuoteFab();""",
    'rep dashboard lean load')

# finalizePlatformDataAfterLoad — preserve user scope fields
OLD_FINALIZE_USERS = """            adminUsers = (Array.isArray(adminUsers) ? adminUsers : []).map(function(user, index) {
                const role = user && allowedRoles.includes(String(user.role || '').toLowerCase()) ? String(user.role).toLowerCase() : 'manager';
                const isPrimary = user && (user.isPrimary === true || PRIMARY_GOVERNANCE_ADMIN_IDS.indexOf(user.id) >= 0 ||
                    PRIMARY_GOVERNANCE_USERNAMES.indexOf(String(user.username || '').toUpperCase()) >= 0);
                return {
                    id: user && user.id ? user.id : 'user-' + Date.now() + '-' + index,
                    username: user && user.username ? user.username : 'user' + (index + 1),
                    password: user && user.password ? user.password : 'ChangeMe123',
                    role: role,
                    permissions: Array.isArray(user && user.permissions) ? user.permissions.filter(Boolean) : null,
                    assignedBranchCity: (user && user.assignedBranchCity) ? String(user.assignedBranchCity).trim() : '',
                    isPrimary: !!isPrimary
                };
            });"""

NEW_FINALIZE_USERS = """            adminUsers = (Array.isArray(adminUsers) ? adminUsers : []).map(function(user, index) {
                return typeof normalizeAdminUserRecord === 'function'
                    ? normalizeAdminUserRecord(user, index)
                    : user;
            });"""

plat = sub(plat, OLD_FINALIZE_USERS, NEW_FINALIZE_USERS, 'finalize users normalize')

# loadSystemData — same user normalize + analytics governance load
OLD_LOAD_USERS = """            adminUsers = (Array.isArray(adminUsers) ? adminUsers : []).map((user, index) => {
                const role = user && allowedRoles.includes(String(user.role || '').toLowerCase()) ? String(user.role).toLowerCase() : 'manager';
                const isPrimary = user && (user.isPrimary === true || PRIMARY_GOVERNANCE_ADMIN_IDS.indexOf(user.id) >= 0 ||
                    PRIMARY_GOVERNANCE_USERNAMES.indexOf(String(user.username || '').toUpperCase()) >= 0);
                return {
                id: user && user.id ? user.id : `user-${Date.now()}-${index}`,
                username: user && user.username ? user.username : `user${index + 1}`,
                password: user && user.password ? user.password : 'ChangeMe123',
                    role: role,
                    permissions: Array.isArray(user && user.permissions) ? user.permissions.filter(Boolean) : null,
                    assignedBranchCity: (user && user.assignedBranchCity) ? String(user.assignedBranchCity).trim() : '',
                    isPrimary: !!isPrimary
                };
            });"""

NEW_LOAD_USERS = """            adminUsers = (Array.isArray(adminUsers) ? adminUsers : []).map(function(user, index) {
                return typeof normalizeAdminUserRecord === 'function'
                    ? normalizeAdminUserRecord(user, index)
                    : user;
            });"""

plat = sub(plat, OLD_LOAD_USERS, NEW_LOAD_USERS, 'loadSystemData users normalize')

plat = sub(plat,
    '            ensureVisitorAnalytics();\n            if (typeof loadCallbackLeads === \'function\') loadCallbackLeads();',
    '            ensureVisitorAnalytics();\n            if (typeof loadAnalyticsGovernanceLocal === \'function\') loadAnalyticsGovernanceLocal();\n            if (typeof loadCallbackLeads === \'function\') loadCallbackLeads();',
    'load analytics governance local')

# saveSystemData — persist analytics governance
plat = sub(plat,
    """            ensureVisitorAnalytics();
            localStorage.setItem(VISITOR_ANALYTICS_KEY, JSON.stringify(visitorAnalytics));
            if (typeof saveCallbackLeads === 'function') saveCallbackLeads();""",
    """            ensureVisitorAnalytics();
            localStorage.setItem(VISITOR_ANALYTICS_KEY, JSON.stringify(visitorAnalytics));
            if (typeof persistAnalyticsGovernanceLocal === 'function') persistAnalyticsGovernanceLocal();
            if (typeof saveCallbackLeads === 'function') saveCallbackLeads();""",
    'save analytics governance local')

# Cloud — quote registry
if 'quote_registry' not in plat:
    plat = sub(plat,
        """            { key: 'hr_dept_activity', get: function() {
                return typeof getHrDeptActivity === 'function' ? getHrDeptActivity() : [];
            }, set: function(v) {
                if (typeof setHrDeptActivityFromCloud === 'function') setHrDeptActivityFromCloud(v);
            }},""",
        """            { key: 'hr_dept_activity', get: function() {
                return typeof getHrDeptActivity === 'function' ? getHrDeptActivity() : [];
            }, set: function(v) {
                if (typeof setHrDeptActivityFromCloud === 'function') setHrDeptActivityFromCloud(v);
            }},
            { key: 'quote_registry', get: function() {
                return typeof loadQuoteRegistryForCloud === 'function' ? loadQuoteRegistryForCloud() : { byDate: {} };
            }, set: function(v) {
                if (typeof setQuoteRegistryFromCloud === 'function') setQuoteRegistryFromCloud(v);
            }},""",
        'cloud quote_registry')

# archiveAnalyticsRecord — ensure local persist (grep for saveSystemData after archive)
plat = sub(plat,
    '            saveSystemData();\n            renderAdminAnalyticsPanel();',
    '            saveSystemData();\n            if (typeof persistAnalyticsGovernanceLocal === \'function\') persistAnalyticsGovernanceLocal();\n            renderAdminAnalyticsPanel();',
    'archive analytics persist')

# Dashboard tile — rep my quotes
if 'dash-rep-my-quotes' not in plat:
    plat = sub(plat,
        """            { id: 'dash-rep-quotes', zone: 'grid', dashGroup: 'erp', sortOrder: 10, iconClass: 'fas fa-file-signature', titleAr: 'بناء عرض سعر', titleEn: 'Quote Builder', textAr: 'للمندوبين — من القائمة المعتمدة.', textEn: 'Sales rep quote builder.', cssClass: 'card-rep-quotes', handler: 'openRepQuoteBuilder', permission: 'quotes', visible: true },""",
        """            { id: 'dash-rep-quotes', zone: 'grid', dashGroup: 'erp', sortOrder: 10, iconClass: 'fas fa-file-signature', titleAr: 'بناء عرض سعر', titleEn: 'Quote Builder', textAr: 'للمندوبين — من القائمة المعتمدة.', textEn: 'Sales rep quote builder.', cssClass: 'card-rep-quotes', handler: 'openRepQuoteBuilder', permission: 'quotes', visible: true },
            { id: 'dash-rep-my-quotes', zone: 'grid', dashGroup: 'erp', sortOrder: 11, iconClass: 'fas fa-folder-open', titleAr: 'عروضي المحفوظة', titleEn: 'My Quotes', textAr: 'معاينة وتنزيل عروضك المحفوظة.', textEn: 'Preview and download your saved quotes.', cssClass: 'card-rep-my-quotes', handler: 'openRepMyQuotes', permission: 'quotes', visible: true },""",
        'dash rep my quotes tile')

# Window exports
EXPORTS = """
        window.isStrictSalesRep = isStrictSalesRep;
        window.openRepMyQuotes = openRepMyQuotes;
        window.previewRepQuoteEntryA4 = previewRepQuoteEntryA4;
        window.downloadRepQuoteEntryPdf = downloadRepQuoteEntryPdf;
        window.normalizeAdminUserRecord = normalizeAdminUserRecord;
        window.loadQuoteRegistryForCloud = loadQuoteRegistryForCloud;
        window.setQuoteRegistryFromCloud = setQuoteRegistryFromCloud;
"""

if 'window.openRepMyQuotes' not in plat:
    plat = sub(plat,
        '        window.previewRepQuoteA4 = previewRepQuoteA4;',
        '        window.previewRepQuoteA4 = previewRepQuoteA4;' + EXPORTS,
        'window exports phase18')

with open(PLATFORM_JS, 'w', encoding='utf-8', newline='\n') as f:
    f.write(plat)

# CSS for rep quotes library
if '.rep-quotes-library' not in css:
    css += """

/* Phase 18 — Rep quote library */
.rep-quotes-library {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
}

.rep-quotes-library h4 {
    margin: 0 0 10px;
    font-size: 0.95rem;
    color: #1a5276;
}

.rep-quotes-count {
    display: inline-block;
    margin-right: 6px;
    padding: 2px 8px;
    border-radius: 999px;
    background: #ebf8ff;
    color: #2b6cb0;
    font-size: 0.75rem;
}

.rep-quotes-actions {
    white-space: nowrap;
}

.rep-quotes-table td {
    font-size: 0.82rem;
}

.dashboard-role-scoped .dashboard-section--role-hidden {
    display: none !important;
}
"""
    with open(CSS_FILE, 'w', encoding='utf-8', newline='\n') as f:
        f.write(css)
    print('OK: css rep quotes')

print('PHASE18 PATCH COMPLETE')
