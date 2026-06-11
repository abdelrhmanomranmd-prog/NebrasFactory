#!/usr/bin/env python3
"""Phase 16: HR branch/department scope + creative scoped dashboards."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HR_JS = os.path.join(ROOT, 'js', 'nebras-hr-platform.js')
PLATFORM_JS = os.path.join(ROOT, 'js', 'nebras-platform.js')
INDEX_HTML = os.path.join(ROOT, 'index.html')
INJECT = os.path.join(ROOT, 'tools', 'hr-phase16-scoped.js')

with open(HR_JS, encoding='utf-8') as f:
    hr = f.read()
with open(INJECT, encoding='utf-8') as f:
    p16 = f.read()
with open(PLATFORM_JS, encoding='utf-8') as f:
    plat = f.read()
with open(INDEX_HTML, encoding='utf-8') as f:
    html = f.read()

MARKER = '/* PHASE16_INJECTED */'
if MARKER in hr:
    start = hr.index(MARKER)
    end = hr.index('    function isHrDepartmentAdmin(admin)', start)
    hr = hr[:start] + hr[end:]


def sub(text, old, new, label):
    if old not in text:
        print(f'MISSING [{label}]')
        sys.exit(1)
    print(f'OK: {label}')
    return text.replace(old, new, 1)


hr = sub(hr,
    '        ensureBuiltinHrPhase15Seed();\n        return { employees:',
    '        ensureBuiltinHrPhase15Seed();\n        applyHrScopeDefaultsOnLogin();\n        return { employees:',
    'loadHrData phase16')

hr = sub(hr,
    '    function isHrDepartmentAdmin(admin) {',
    MARKER + '\n' + p16 + '\n    function isHrDepartmentAdmin(admin) {',
    'inject phase16')

# Scope filters
hr = sub(hr,
    """    function filterHrEmployees() {
        let list = hrEmployees.slice();
        if (hrBranchFilter) {""",
    """    function filterHrEmployees() {
        let list = applyHrScopeFilter(hrEmployees.slice(), 'employee');
        if (hrBranchFilter) {""",
    'filter employees scope')

hr = sub(hr,
    """    function filterHrVehicles() {
        let list = hrVehicles.slice();
        if (hrBranchFilter) {""",
    """    function filterHrVehicles() {
        let list = applyHrScopeFilter(hrVehicles.slice(), 'vehicle');
        if (hrBranchFilter) {""",
    'filter vehicles scope')

hr = sub(hr,
    """    function filterHrTracking() {
        let list = hrVehicleTracking.slice();
        if (hrBranchFilter) {""",
    """    function filterHrTracking() {
        let list = applyHrScopeFilter(hrVehicleTracking.slice(), 'tracking');
        if (hrBranchFilter) {""",
    'filter tracking scope')

hr = sub(hr,
    """    function filterHrAttendance() {
        let list = hrAttendance.slice();
        if (hrBranchFilter) list = list.filter(function(a) { return String(a.branchId) === String(hrBranchFilter); });""",
    """    function filterHrAttendance() {
        let list = applyHrScopeFilter(hrAttendance.slice(), 'attendance');
        if (hrBranchFilter) list = list.filter(function(a) { return String(a.branchId) === String(hrBranchFilter); });""",
    'filter attendance scope')

hr = sub(hr,
    """    function filterHrDocuments() {
        let list = hrDocuments.slice();
        if (hrBranchFilter) list = list.filter(function(d) { return String(d.branchId) === String(hrBranchFilter); });""",
    """    function filterHrDocuments() {
        let list = applyHrScopeFilter(hrDocuments.slice(), 'document');
        if (hrBranchFilter) list = list.filter(function(d) { return String(d.branchId) === String(hrBranchFilter); });""",
    'filter documents scope')

# Tab defs — scope filter
hr = sub(hr,
    """        if (canViewHrExecutiveReports()) {
            tabDefs.push({ id: 'reports', icon: 'fas fa-file-export', label: 'تقارير الإدارة الرئيسية' });
        }

        if (tabs) {
            tabs.innerHTML = tabDefs.map(function(t) {""",
    """        if (canViewHrExecutiveReports()) {
            tabDefs.push({ id: 'reports', icon: 'fas fa-file-export', label: 'تقارير الإدارة الرئيسية' });
        }
        tabDefs = tabDefs.filter(function(t) { return isHrTabAllowedForScope(t.id); });

        if (tabs) {
            tabs.innerHTML = tabDefs.map(function(t) {""",
    'tabs scope filter')

# Dashboard — scoped for HR users
hr = sub(hr,
    """        if (hrActiveTab === 'dashboard') panelHtml = renderHrDashboard(onLeave, assignedVeh, pendingLeave, expiringDocs);""",
    """        if (hrActiveTab === 'dashboard') {
            panelHtml = (typeof isStrictHrUser === 'function' && isStrictHrUser()) ? renderHrScopedDashboard(onLeave, assignedVeh, pendingLeave, expiringDocs) : renderHrDashboard(onLeave, assignedVeh, pendingLeave, expiringDocs);
        }""",
    'scoped hr dashboard')

# Toolbar + scope banner in content
hr = sub(hr,
    """        content.innerHTML = toolbar + '<div class="hr-panels">' + panelHtml + '</div>';""",
    """        const scopeBanner = isStrictHrUser() && hrActiveTab !== 'dashboard' ? renderHrScopeBanner() : '';
        content.innerHTML = toolbar + scopeBanner + '<div class="hr-panels">' + panelHtml + '</div>';""",
    'scope banner in panels')

# applyHrStrictDashboardGovernance — command center, no auto-open
OLD_GOV = """        setTimeout(function() {
            if (typeof openHrPlatform === 'function') openHrPlatform();
        }, 500);
    }"""

NEW_GOV = """        if (typeof renderHrAdminCommandCenter === 'function') renderHrAdminCommandCenter(user);
        const cmdTitle = document.getElementById('dashboard-command-title');
        const cmdSub = document.getElementById('dashboard-command-subtitle');
        if (cmdTitle) cmdTitle.textContent = 'HR — نبراس WPC';
        if (cmdSub) {
            const sc = typeof getHrAdminScope === 'function' ? getHrAdminScope(user) : null;
            cmdSub.textContent = sc ? sc.label : 'منصة الموارد البشرية';
        }
    }

    function applyHrScopeDefaultsOnLogin() {
        const scope = getHrAdminScope();
        if (scope.mode !== 'full' && scope.branchId && !hrBranchFilter) {
            hrBranchFilter = scope.branchId;
        }
    }"""

hr = sub(hr, OLD_GOV, NEW_GOV, 'governance command center')

# Exports
hr = sub(hr,
    '    global.calcSaudizationStats = calcSaudizationStats;\n',
    """    global.calcSaudizationStats = calcSaudizationStats;
    global.getHrAdminScope = getHrAdminScope;
    global.getHrFactoryDepts = function() { return typeof HR_FACTORY_DEPTS !== 'undefined' ? HR_FACTORY_DEPTS : {}; };
    global.renderHrAdminCommandCenter = renderHrAdminCommandCenter;
    global.renderHrScopedDashboard = renderHrScopedDashboard;
    global.employeeMatchesHrScope = employeeMatchesHrScope;
    global.vehicleMatchesHrScope = vehicleMatchesHrScope;
""",
    'exports phase16')

with open(HR_JS, 'w', encoding='utf-8', newline='\n') as f:
    f.write(hr)

# index — HR command center on admin dashboard
if 'id="hr-command-center"' not in html:
    html = sub(html,
        '            <div class="dashboard-quick-actions" id="dashboard-quick-actions"></div>\n        </div>',
        '            <div class="dashboard-quick-actions" id="dashboard-quick-actions"></div>\n            <div id="hr-command-center" class="hr-command-center dashboard-section" hidden></div>\n        </div>',
        'index hr command center')
    with open(INDEX_HTML, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)

# Platform — user editor HR scope fields
if 'hrScopeDepartmentKey' not in plat:
    plat = sub(plat,
        """                assignedBranchCity: user ? (user.assignedBranchCity || '') : '',
                permissions: user ? getUserEffectivePermissions(user) : (rolePermissions[defaultRole] || []).slice()
            };""",
        """                assignedBranchCity: user ? (user.assignedBranchCity || '') : '',
                hrScopeBranchId: user ? (user.hrScopeBranchId || '') : '',
                hrScopeDepartmentKey: user ? (user.hrScopeDepartmentKey || '') : '',
                permissions: user ? getUserEffectivePermissions(user) : (rolePermissions[defaultRole] || []).slice()
            };""",
        'editor state hr scope')

    HR_SCOPE_INLINE = r"""
                    (st.role === 'hr' && !st.isPrimary ? (function() {
                const branchOpts = ['<option value="">— كل الفروع —</option><option value="hq"' + (st.hrScopeBranchId === 'hq' ? ' selected' : '') + '>المقر الرئيسي — القصيم</option>']
                    .concat((branchesData || []).map(function(b) {
                        return '<option value="' + b.id + '"' + (String(st.hrScopeBranchId) === String(b.id) ? ' selected' : '') + '>' + escapeHtmlAttr(b.city || b.cityAr || '') + '</option>';
                    })).join('');
                const depts = typeof getHrFactoryDepts === 'function' ? getHrFactoryDepts() : {};
                const deptOpts = ['<option value="">— كل الأقسام (مدير فرع) —</option>'].concat(
                    Object.keys(depts).map(function(k) {
                        return '<option value="' + k + '"' + (st.hrScopeDepartmentKey === k ? ' selected' : '') + '>' + escapeHtmlAttr(depts[k]) + '</option>';
                    })
                ).join('');
                return '<div class="nebras-editor-grid nebras-editor-grid--hr-scope">' +
                    '<label class="nebras-field"><span>فرع HR</span><select id="ue-hr-branch" onchange="onUserEditorHrBranchChange(this.value)">' + branchOpts + '</select></label>' +
                    '<label class="nebras-field"><span>قسم HR (خصوصية)</span><select id="ue-hr-dept" onchange="onUserEditorHrDeptChange(this.value)">' + deptOpts + '</select></label>' +
                    '<p class="nebras-editor-hint nebras-field--wide"><i class="fas fa-lock"></i> كل مستخدم HR يرى داشبورد قسمه فقط — لا يطلع على أقسام أخرى. الإدارة الرئيسية تحدد النطاق.</p>' +
                '</div>';
            })() : '';"""

    plat = sub(plat,
        """                        '<label class="nebras-field nebras-field--wide"><span>الفرع المخصّص</span><select id="ue-branch" onchange="onUserEditorBranchChange(this.value)" ' + (st.isPrimary ? 'disabled' : '') + '>' + branchOptions + '</select>' + branchHint + '</label>' +
                    '</div>' +""",
        """                        '<label class="nebras-field nebras-field--wide"><span>الفرع المخصّص</span><select id="ue-branch" onchange="onUserEditorBranchChange(this.value)" ' + (st.isPrimary ? 'disabled' : '') + '>' + branchOptions + '</select>' + branchHint + '</label>' +
                    '</div>' +
                    hrScopeBlock +""",
        'editor form hr scope')

    # Fix - hrScopeBlock needs to be inserted as JS code in the template string, not as variable name in Python
    # The above won't work - I need to embed the block directly in the replacement string

    plat = plat.replace("                    hrScopeBlock +", HR_SCOPE_FIELDS.strip() + "\n                    ")

    plat = sub(plat,
        """        function onUserEditorBranchChange(city) {
            if (!nebrasUserEditorState) return;
            nebrasUserEditorState.assignedBranchCity = String(city || '').trim();
        }""",
        """        function onUserEditorBranchChange(city) {
            if (!nebrasUserEditorState) return;
            nebrasUserEditorState.assignedBranchCity = String(city || '').trim();
        }

        function onUserEditorHrBranchChange(branchId) {
            if (!nebrasUserEditorState) return;
            nebrasUserEditorState.hrScopeBranchId = String(branchId || '').trim();
        }

        function onUserEditorHrDeptChange(deptKey) {
            if (!nebrasUserEditorState) return;
            nebrasUserEditorState.hrScopeDepartmentKey = String(deptKey || '').trim();
        }""",
        'hr scope change handlers')

    plat = sub(plat,
        """                    assignedBranchCity: st.isPrimary ? '' : st.assignedBranchCity,
                    isPrimary: !!st.isPrimary
                });""",
        """                    assignedBranchCity: st.isPrimary ? '' : st.assignedBranchCity,
                    hrScopeBranchId: st.isPrimary || st.role !== 'hr' ? '' : (st.hrScopeBranchId || ''),
                    hrScopeDepartmentKey: st.isPrimary || st.role !== 'hr' ? '' : (st.hrScopeDepartmentKey || ''),
                    isPrimary: !!st.isPrimary
                });""",
        'save user hr scope edit')

    plat = sub(plat,
        """                adminUsers.push({
                    id: id, username: username, password: password,
                    role: st.role, permissions: st.permissions.slice(),
                    assignedBranchCity: st.assignedBranchCity, isPrimary: false
                });""",
        """                adminUsers.push({
                    id: id, username: username, password: password,
                    role: st.role, permissions: st.permissions.slice(),
                    assignedBranchCity: st.assignedBranchCity,
                    hrScopeBranchId: st.role === 'hr' ? (st.hrScopeBranchId || '') : '',
                    hrScopeDepartmentKey: st.role === 'hr' ? (st.hrScopeDepartmentKey || '') : '',
                    isPrimary: false
                });""",
        'save user hr scope new')

    plat = sub(plat,
        """                descAr: 'منصة HR فقط — موظفون · سيارات · تتبع · إجازات. لا صلاحيات خارج HR.',
                permissions: ['hr'],
                companyWide: true""",
        """                descAr: 'منصة HR — داشبورد خاص بقسمه/فرعه فقط. الإدارة الرئيسية تحدد النطاق.',
                permissions: ['hr'],
                hrScoped: true""",
        'hr role definition')

    plat = sub(plat,
        """                if (typeof isHrDepartmentAdmin === 'function' && isHrDepartmentAdmin(user) && typeof getHrEmployees === 'function') {
                    const emps = getHrEmployees();
                    const vehs = typeof getHrVehicles === 'function' ? getHrVehicles() : [];
                    const track = typeof getHrVehicleTracking === 'function' ? getHrVehicleTracking() : [];
                    kpis.length = 0;
                    kpis.push({ v: emps.length, l: 'موظفون', alert: false });
                    kpis.push({ v: vehs.length, l: 'سيارات', alert: false });
                    kpis.push({ v: track.filter(function(t) { return t.status === 'on_road'; }).length, l: 'خارجة الآن', alert: false });
                    kpis.push({ v: track.length, l: 'سجلات تتبع', alert: false });
                    const att = typeof getHrAttendance === 'function' ? getHrAttendance() : [];
                    const todayAtt = att.filter(function(a) { return a.date === new Date().toISOString().slice(0, 10); }).length;
                    kpis.push({ v: todayAtt, l: 'حضور اليوم', alert: false });
                    const docs = typeof getHrDocuments === 'function' ? getHrDocuments() : [];
                    kpis.push({ v: docs.length, l: 'مستندات', alert: false });
                }""",
        """                if (typeof isHrDepartmentAdmin === 'function' && isHrDepartmentAdmin(user) && typeof getHrEmployees === 'function') {
                    const scope = typeof getHrAdminScope === 'function' ? getHrAdminScope(user) : null;
                    const emps = typeof employeeMatchesHrScope === 'function'
                        ? getHrEmployees().filter(function(e) { return employeeMatchesHrScope(e, scope); })
                        : getHrEmployees();
                    const vehs = typeof getHrVehicles === 'function' ? getHrVehicles().filter(function(v) {
                        return typeof vehicleMatchesHrScope === 'function' ? vehicleMatchesHrScope(v, scope) : true;
                    }) : [];
                    const track = typeof getHrVehicleTracking === 'function' ? getHrVehicleTracking() : [];
                    kpis.length = 0;
                    kpis.push({ v: emps.length, l: 'فريق نطاقك', alert: false });
                    kpis.push({ v: vehs.length, l: 'سيارات النطاق', alert: false });
                    kpis.push({ v: track.filter(function(t) { return t.status === 'on_road'; }).length, l: 'خارجة', alert: false });
                    const att = typeof getHrAttendance === 'function' ? getHrAttendance() : [];
                    const teamIds = emps.map(function(e) { return e.id; });
                    const today = new Date().toISOString().slice(0, 10);
                    kpis.push({ v: att.filter(function(a) { return a.date === today && a.checkIn && teamIds.indexOf(a.employeeId) >= 0; }).length, l: 'حضور اليوم', alert: false });
                    if (scope && scope.label) kpis.push({ v: scope.label.length > 18 ? '…' : scope.label, l: 'نطاقك', alert: false });
                }""",
        'dashboard kpi scoped')

    plat = sub(plat,
        """                greetingAr: 'HR مصنع نبراس للأبواب WPC — صلاحيات HR فقط',
                descAr: 'موظفون · تتبع سيارات · إجازات — صلاحياتك محصورة في HR. التقارير التنفيذية للإدارة الرئيسية.',""",
        """                greetingAr: 'مركز HR — قسمك وفرعك فقط',
                descAr: 'داشبورد خاص بنطاقك — موظفون · سيارات · حضور · إجازات. خصوصية قسمك — لا تظهر أقسام أخرى.',""",
        'hr focus banner')

    with open(PLATFORM_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write(plat)

print('PHASE16 PATCH COMPLETE')
