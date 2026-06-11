#!/usr/bin/env python3
"""Phase 17: HR dept governor, activity log, executive governance reports."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HR_JS = os.path.join(ROOT, 'js', 'nebras-hr-platform.js')
PLATFORM_JS = os.path.join(ROOT, 'js', 'nebras-platform.js')
INDEX_HTML = os.path.join(ROOT, 'index.html')
CSS_FILE = os.path.join(ROOT, 'css', '34-hr-platform.css')
INJECT = os.path.join(ROOT, 'tools', 'hr-phase17-governance.js')

with open(HR_JS, encoding='utf-8') as f:
    hr = f.read()
with open(INJECT, encoding='utf-8') as f:
    p17 = f.read()
with open(PLATFORM_JS, encoding='utf-8') as f:
    plat = f.read()
with open(INDEX_HTML, encoding='utf-8') as f:
    html = f.read()
with open(CSS_FILE, encoding='utf-8') as f:
    css = f.read()

MARKER = '/* PHASE17_INJECTED */'


def sub(text, old, new, label):
    if old not in text:
        print(f'MISSING [{label}]')
        sys.exit(1)
    print(f'OK: {label}')
    return text.replace(old, new, 1)


# Remove prior phase17 inject
if MARKER in hr:
    start = hr.index(MARKER)
    end = hr.index('    function isHrDepartmentAdmin(admin)', start)
    hr = hr[:start] + hr[end:]

# Remove old buildHrExecutiveReportData (replaced by phase17)
OLD_BUILD = """    function buildHrExecutiveReportData(period, branchId) {
        loadHrData();
        const scopeBranch = function(entry) {
            if (branchId == null || branchId === '') return true;
            const bid = String(branchId);
            if (bid === 'hq') return String(entry.branchId) === 'hq';
            return String(entry.branchId) === bid;
        };
        const scopePeriod = function(entry) {
            const raw = entry.date || entry.createdAt;
            if (!raw) return false;
            if (typeof matchesExecutiveReportPeriod === 'function') {
                return matchesExecutiveReportPeriod({ date: raw }, period);
            }
            const dd = new Date(String(raw).length === 10 ? raw + 'T12:00:00' : raw);
            if (isNaN(dd.getTime())) return false;
            const now = new Date();
            if (period === 'daily') return dd.toDateString() === now.toDateString();
            if (period === 'monthly') return dd.getFullYear() === now.getFullYear() && dd.getMonth() === now.getMonth();
            if (period === 'yearly') return dd.getFullYear() === now.getFullYear();
            return true;
        };

        const att = hrAttendance.filter(function(a) { return scopeBranch(a) && scopePeriod(a); });
        const emps = hrEmployees.filter(scopeBranch);
        const activeEmps = emps.filter(function(e) { return e.status === 'active'; }).length;
        const withCheckIn = att.filter(function(a) { return a.checkIn; }).length;
        const bioCount = att.filter(function(a) { return a.checkInMethod === 'biometric' || a.bioVerified; }).length;
        const mobileCount = att.filter(function(a) { return a.checkInMethod === 'mobile'; }).length;
        const onRoad = hrVehicleTracking.filter(function(t) {
            return t.status === 'on_road' && scopeBranch(t);
        }).length;
        const expDocs = hrDocuments.filter(function(d) {
            if (!scopeBranch(d) || !d.expiryDate) return false;
            const days = Math.round((new Date(d.expiryDate + 'T12:00:00') - new Date()) / (1000 * 60 * 60 * 24));
            return days <= 60;
        }).length;
        const saud = calcSaudizationStats(emps);
        const otMonth = att.reduce(function(s, a) { return s + (a.overtimeHours || 0); }, 0);

        const rows = att.slice(0, 12).map(function(a) {
            const meth = (typeof HR_ATT_METHOD !== 'undefined' && HR_ATT_METHOD[a.checkInMethod]) || a.checkInMethod || '—';
            return [
                a.date,
                (a.employeeNo || '') + ' — ' + (a.employeeName || ''),
                (a.checkIn || '—') + ' → ' + (a.checkOut || '—'),
                meth
            ];
        });

        return {
            kpis: [
                { label: 'موظفون', val: emps.length },
                { label: 'نشطون', val: activeEmps },
                { label: 'سعودة', val: saud.pct + '%' },
                { label: 'سجلات حضور', val: att.length },
                { label: 'ساعات إضافية', val: otMonth + 'h' },
                { label: 'بصمة / GPS', val: bioCount + ' / ' + mobileCount },
                { label: 'سيارات خارجة', val: onRoad }
            ],
            rows: rows
        };
    }

"""
if OLD_BUILD in hr:
    hr = hr.replace(OLD_BUILD, '', 1)
    print('OK: remove old buildHrExecutiveReportData')
else:
    print('SKIP: old buildHrExecutiveReportData not found (may already be patched)')

hr = sub(hr,
    '    function isHrDepartmentAdmin(admin) {',
    MARKER + '\n' + p17 + '\n    function isHrDepartmentAdmin(admin) {',
    'inject phase17')

hr = sub(hr,
    """    function hrAudit(action, detail) {
        if (typeof addAuditLog === 'function') addAuditLog(action, detail);
    }""",
    """    function hrAudit(action, detail) {
        if (typeof addAuditLog === 'function') addAuditLog(action, detail);
        if (typeof logHrDeptActivity === 'function') logHrDeptActivity(action, detail);
    }""",
    'hrAudit activity log')

hr = sub(hr,
    '        loadHrPhase15Data();\n        ensureBuiltinHrPhase15Seed();',
    '        loadHrPhase15Data();\n        loadHrPhase17Data();\n        ensureBuiltinHrPhase15Seed();',
    'loadHrData phase17')

hr = sub(hr,
    '            saveHrPhase15Data();\n        } catch (err) { console.warn(\'HR save failed\', err); }',
    '            saveHrPhase15Data();\n            saveHrPhase17Data();\n        } catch (err) { console.warn(\'HR save failed\', err); }',
    'saveHrData phase17')

hr = sub(hr,
    """        if (canViewHrExecutiveReports()) {
            tabDefs.push({ id: 'reports', icon: 'fas fa-file-export', label: 'تقارير الإدارة الرئيسية' });
        }
        tabDefs = tabDefs.filter(function(t) { return isHrTabAllowedForScope(t.id); });""",
    """        if (typeof isHrDeptGovernor === 'function' && (isHrDeptGovernor() || canViewHrExecutiveReports())) {
            tabDefs.push({ id: 'governance', icon: 'fas fa-shield-halved', label: 'حوكمة القسم' });
        }
        if (canViewHrExecutiveReports()) {
            tabDefs.push({ id: 'reports', icon: 'fas fa-file-export', label: 'تقارير الإدارة الرئيسية' });
        }
        tabDefs = tabDefs.filter(function(t) { return isHrTabAllowedForScope(t.id); });""",
    'governance tab')

hr = sub(hr,
    """        else if (hrActiveTab === 'leave') panelHtml = renderHrLeavePanel();
        else if (hrActiveTab === 'reports' && canViewHrExecutiveReports()) panelHtml = renderHrReportsPanel();""",
    """        else if (hrActiveTab === 'leave') panelHtml = renderHrLeavePanel();
        else if (hrActiveTab === 'governance') panelHtml = renderHrGovernancePanel();
        else if (hrActiveTab === 'reports' && canViewHrExecutiveReports()) panelHtml = renderHrReportsPanel();""",
    'governance panel route')

hr = sub(hr,
    """    function isHrTabAllowedForScope(tabId) {
        const scope = getHrAdminScope();
        if (scope.mode === 'full') return true;
        if (tabId === 'reports') return canViewHrExecutiveReports();""",
    """    function isHrTabAllowedForScope(tabId) {
        const scope = getHrAdminScope();
        if (scope.mode === 'full') return true;
        if (tabId === 'governance') return true;
        if (tabId === 'reports') return canViewHrExecutiveReports();""",
    'governance tab scope')

hr = sub(hr,
    """                    '<h2 class="hr-command-title">مركز HR — مصنع نبراس للأبواب WPC</h2>' +
                    '<p class="hr-command-sub">إدارة موظفيك وسيارات نطاقك · منظم · خاص · آمن</p>' +""",
    """                    '<h2 class="hr-command-title">مسؤول إدارة وحوكمة القسم</h2>' +
                    '<p class="hr-command-sub">تدير منظومة HR وموظفي أقسامك داخل نطاقك — صلاحيات كاملة · خصوصية قسمك</p>' +""",
    'scoped dashboard hero')

hr = sub(hr,
    """        if (isHrTabAllowedForScope('factory')) quickTabs.push({ id: 'factory', icon: 'fas fa-industry', label: 'المصنع' });

        const quickHtml = quickTabs.map(function(t) {""",
    """        if (isHrTabAllowedForScope('factory')) quickTabs.push({ id: 'factory', icon: 'fas fa-industry', label: 'المصنع' });
        quickTabs.push({ id: 'governance', icon: 'fas fa-shield-halved', label: 'حوكمة' });

        const quickHtml = quickTabs.map(function(t) {""",
    'governance quick tab')

# Expand main admin HR reports panel
OLD_REPORTS_END = """                '<table class="hr-leave-table"><thead><tr>' +
                    '<th>اللوحة</th><th>السائق</th><th>رقم السائق</th><th>التاريخ</th><th>الحالة</th>' +
                '</tr></thead><tbody>' + (trackRows || '<tr><td colspan="5">لا سجلات</td></tr>') + '</tbody></table>' +
            '</div></div>';
    }"""

NEW_REPORTS_END = """                '<table class="hr-leave-table"><thead><tr>' +
                    '<th>اللوحة</th><th>السائق</th><th>رقم السائق</th><th>التاريخ</th><th>الحالة</th>' +
                '</tr></thead><tbody>' + (trackRows || '<tr><td colspan="5">لا سجلات</td></tr>') + '</tbody></table>' +
                (function() {
                    const period = typeof executiveReportPeriod !== 'undefined' ? executiveReportPeriod : 'monthly';
                    const matrix = typeof buildHrDeptGovernanceMatrix === 'function' ? buildHrDeptGovernanceMatrix(period, '') : [];
                    const govRows = matrix.map(function(r) {
                        return '<tr><td>' + esc(r.cells[0]) + '</td><td>' + esc(r.cells[1]) + '</td><td>' + esc(r.cells[2]) + '</td><td>' + esc(r.cells[3]) + '</td></tr>';
                    }).join('');
                    const acts = (typeof getHrDeptActivity === 'function' ? getHrDeptActivity() : []).slice(0, 20).map(function(a) {
                        return '<tr><td>' + formatHrDate(a.date) + ' ' + esc(a.time || '') + '</td><td>' + esc(a.username || '') + '</td>' +
                            '<td>' + esc(a.scopeLabel || '') + '</td><td>' + esc(a.action) + ' — ' + esc(a.detail) + '</td></tr>';
                    }).join('');
                    return '<h4 style="margin-top:16px">حوكمة HR — الأقسام × الفروع (يومي/شهري في التقارير التنفيذية)</h4>' +
                        '<table class="hr-leave-table"><thead><tr><th>قسم HR</th><th>الفرع</th><th>القوى العاملة</th><th>مؤشرات</th></tr></thead><tbody>' +
                        (govRows || '<tr><td colspan="4">لا بيانات</td></tr>') + '</tbody></table>' +
                        '<h4 style="margin-top:16px">سجل عمليات مسؤولي HR</h4>' +
                        '<table class="hr-leave-table"><thead><tr><th>الوقت</th><th>المستخدم</th><th>النطاق</th><th>العملية</th></tr></thead><tbody>' +
                        (acts || '<tr><td colspan="4">لا عمليات</td></tr>') + '</tbody></table>';
                })() +
            '</div></div>';
    }"""

hr = sub(hr, OLD_REPORTS_END, NEW_REPORTS_END, 'reports governance tables')

hr = sub(hr,
    '    global.vehicleMatchesHrScope = vehicleMatchesHrScope;\n',
    """    global.vehicleMatchesHrScope = vehicleMatchesHrScope;
    global.isHrDeptGovernor = isHrDeptGovernor;
    global.renderHrGovernancePanel = renderHrGovernancePanel;
    global.buildHrDeptGovernanceMatrix = buildHrDeptGovernanceMatrix;
    global.exportHrGovernanceCsv = exportHrGovernanceCsv;
    global.getHrDeptActivity = getHrDeptActivity;
    global.setHrDeptActivityFromCloud = setHrDeptActivityFromCloud;
""",
    'exports phase17')

with open(HR_JS, 'w', encoding='utf-8', newline='\n') as f:
    f.write(hr)

# Platform — executive reports HR governance sections
OLD_PUSH = """            function pushSection(id, title, icon, kpis, rows) {
                if (dept !== 'all' && dept !== id) return;
                sections.push({ id: id, title: title, icon: icon, kpis: kpis, rows: rows || [] });
            }"""

NEW_PUSH = """            function pushSection(id, title, icon, kpis, rows, headers) {
                if (dept !== 'all') {
                    if (dept === 'hr' && (id === 'hr' || id === 'hr-gov' || id === 'hr-activity')) { /* ok */ }
                    else if (dept !== id) return;
                }
                sections.push({ id: id, title: title, icon: icon, kpis: kpis, rows: rows || [], headers: headers || null });
            }"""

plat = sub(plat, OLD_PUSH, NEW_PUSH, 'pushSection headers')

OLD_HR_EXEC = """            if (typeof buildHrExecutiveReportData === 'function') {
                const hrExec = buildHrExecutiveReportData(period, branchId);
                pushSection('hr', 'الموارد البشرية', 'fas fa-people-roof', hrExec.kpis, hrExec.rows);
            }"""

NEW_HR_EXEC = """            if (typeof buildHrExecutiveReportData === 'function') {
                const hrExec = buildHrExecutiveReportData(period, branchId);
                pushSection('hr', 'الموارد البشرية', 'fas fa-people-roof', hrExec.kpis, hrExec.rows);
                if (hrExec.deptRows && hrExec.deptRows.length) {
                    pushSection('hr-gov', 'حوكمة HR — الأقسام والفروع', 'fas fa-sitemap', [
                        { label: 'أقسام نشطة', val: hrExec.govMatrix ? hrExec.govMatrix.length : hrExec.deptRows.length },
                        { label: 'عمليات HR', val: (hrExec.kpis.find(function(k) { return k.label === 'عمليات HR'; }) || {}).val || 0 },
                        { label: 'الفترة', val: periodLabel }
                    ], hrExec.deptRows, ['قسم HR', 'الفرع', 'القوى العاملة', 'مؤشرات']);
                }
                if (hrExec.activityRows && hrExec.activityRows.length) {
                    pushSection('hr-activity', 'سجل عمليات مسؤولي HR', 'fas fa-clock-rotate-left', [
                        { label: 'عمليات', val: hrExec.activityRows.length },
                        { label: 'الفترة', val: periodLabel }
                    ], hrExec.activityRows, ['الوقت', 'المستخدم', 'الإجراء', 'التفاصيل']);
                }
            }"""

plat = sub(plat, OLD_HR_EXEC, NEW_HR_EXEC, 'hr executive governance')

OLD_TABLE = """                const tableHtml = sec.rows.length
                    ? '<table class="exec-report-table"><thead><tr><th>المرجع</th><th>العميل/الوصف</th><th>الحالة</th><th>تفاصيل</th></tr></thead><tbody>' +
                        sec.rows.map(function(r) {
                            return '<tr><td>' + escapeHtmlAttr(r[0]) + '</td><td>' + escapeHtmlAttr(r[1]) + '</td><td>' + escapeHtmlAttr(r[2]) + '</td><td>' + escapeHtmlAttr(r[3]) + '</td></tr>';
                        }).join('') + '</tbody></table>'
                    : '<p class="erp-empty">لا بيانات في هذه الفترة.</p>';"""

NEW_TABLE = """                const hdrs = sec.headers || ['المرجع', 'العميل/الوصف', 'الحالة', 'تفاصيل'];
                const tableHtml = sec.rows.length
                    ? '<table class="exec-report-table"><thead><tr>' + hdrs.map(function(h) {
                        return '<th>' + escapeHtmlAttr(h) + '</th>';
                    }).join('') + '</tr></thead><tbody>' +
                        sec.rows.map(function(r) {
                            return '<tr><td>' + escapeHtmlAttr(r[0]) + '</td><td>' + escapeHtmlAttr(r[1]) + '</td><td>' + escapeHtmlAttr(r[2]) + '</td><td>' + escapeHtmlAttr(r[3]) + '</td></tr>';
                        }).join('') + '</tbody></table>'
                    : '<p class="erp-empty">لا بيانات في هذه الفترة.</p>';"""

plat = sub(plat, OLD_TABLE, NEW_TABLE, 'exec table custom headers')

# Cloud sync
if 'hr_dept_activity' not in plat:
    plat = sub(plat,
        """            { key: 'hr_shift_roster', get: function() {
                return typeof getHrShiftRoster === 'function' ? getHrShiftRoster() : [];
            }, set: function(v) {
                if (typeof setHrShiftRosterFromCloud === 'function') setHrShiftRosterFromCloud(v);
            }},""",
        """            { key: 'hr_shift_roster', get: function() {
                return typeof getHrShiftRoster === 'function' ? getHrShiftRoster() : [];
            }, set: function(v) {
                if (typeof setHrShiftRosterFromCloud === 'function') setHrShiftRosterFromCloud(v);
            }},
            { key: 'hr_dept_activity', get: function() {
                return typeof getHrDeptActivity === 'function' ? getHrDeptActivity() : [];
            }, set: function(v) {
                if (typeof setHrDeptActivityFromCloud === 'function') setHrDeptActivityFromCloud(v);
            }},""",
        'cloud hr_dept_activity')

with open(PLATFORM_JS, 'w', encoding='utf-8', newline='\n') as f:
    f.write(plat)

# index — hr-gov filter option
if 'hr-gov' not in html:
    html = sub(html,
        '                    <option value="hr">الموارد البشرية</option>\n                </select>',
        '                    <option value="hr">الموارد البشرية</option>\n                    <option value="hr-gov">حوكمة HR — الأقسام</option>\n                </select>',
        'index hr-gov option')
    with open(INDEX_HTML, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)

# CSS
if '.hr-gov-owner-banner' not in css:
    css += """

/* Phase 17 — HR dept governance */
.hr-gov-owner-banner {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    padding: 16px 18px;
    margin-bottom: 16px;
    border-radius: 12px;
    border: 1px solid #bee3f8;
    background: linear-gradient(135deg, #ebf8ff 0%, #f0fff4 100%);
}

.hr-gov-owner-banner--main {
    border-color: #f6e05e;
    background: linear-gradient(135deg, #fffff0 0%, #ebf8ff 100%);
}

.hr-gov-owner-banner > i {
    font-size: 1.6rem;
    color: #2b6cb0;
    margin-top: 2px;
}

.hr-gov-owner-banner strong {
    display: block;
    color: #1a365d;
    margin-bottom: 4px;
}

.hr-gov-owner-banner p {
    margin: 0;
    font-size: 0.85rem;
    color: #4a5568;
    line-height: 1.5;
}

.hr-gov-owner-banner em {
    font-style: normal;
    font-weight: 600;
    color: #2c5282;
}
"""
    with open(CSS_FILE, 'w', encoding='utf-8', newline='\n') as f:
        f.write(css)
    print('OK: css governance')

# pushSection hr-gov dept filter
if "dept === 'hr-gov'" not in plat:
    plat2 = plat.replace(
        "if (dept === 'hr' && (id === 'hr' || id === 'hr-gov' || id === 'hr-activity')) { /* ok */ }",
        "if ((dept === 'hr' && (id === 'hr' || id === 'hr-gov' || id === 'hr-activity')) || (dept === 'hr-gov' && id === 'hr-gov')) { /* ok */ }"
    )
    with open(PLATFORM_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write(plat2)
    print('OK: hr-gov dept filter')

print('PHASE17 PATCH COMPLETE')
