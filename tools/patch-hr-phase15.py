#!/usr/bin/env python3
"""Phase 15: Nebras WPC Factory HR — shifts, production, Saudization."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HR_JS = os.path.join(ROOT, 'js', 'nebras-hr-platform.js')
PLATFORM_JS = os.path.join(ROOT, 'js', 'nebras-platform.js')
INDEX_HTML = os.path.join(ROOT, 'index.html')
INJECT = os.path.join(ROOT, 'tools', 'hr-phase15-panels.js')

with open(HR_JS, encoding='utf-8') as f:
    hr = f.read()
with open(INJECT, encoding='utf-8') as f:
    p15 = f.read()
with open(PLATFORM_JS, encoding='utf-8') as f:
    plat = f.read()
with open(INDEX_HTML, encoding='utf-8') as f:
    html = f.read()

MARKER = '/* PHASE15_INJECTED */'
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
    '        loadHrPhase14Data();\n        return { employees:',
    '        loadHrPhase14Data();\n        loadHrPhase15Data();\n        ensureBuiltinHrPhase15Seed();\n        return { employees:',
    'loadHrData phase15')

hr = sub(hr,
    '            saveHrPhase14Data();\n        } catch (err) { console.warn(\'HR save failed\', err); }',
    '            saveHrPhase14Data();\n            saveHrPhase15Data();\n        } catch (err) { console.warn(\'HR save failed\', err); }',
    'saveHrData phase15')

if 'let hrShiftRoster' not in hr:
    hr = sub(hr,
        '    let hrEmailQueue = [];\n',
        '    let hrEmailQueue = [];\n    let hrShiftRoster = [];\n',
        'phase15 vars')

hr = sub(hr,
    '    function isHrDepartmentAdmin(admin) {',
    MARKER + '\n' + p15 + '\n    function isHrDepartmentAdmin(admin) {',
    'inject phase15')

# Tab factory
hr = sub(hr,
    """            { id: 'employees', icon: 'fas fa-users', label: 'الموظفون والعمال' },
            { id: 'vehicles', icon: 'fas fa-car', label: 'سجل السيارات' },""",
    """            { id: 'employees', icon: 'fas fa-users', label: 'الموظفون والعمال' },
            { id: 'factory', icon: 'fas fa-industry', label: 'عمليات المصنع WPC' },
            { id: 'vehicles', icon: 'fas fa-car', label: 'سجل السيارات' },""",
    'tab factory')

hr = sub(hr,
    """        else if (hrActiveTab === 'employees') panelHtml = renderHrEmployeesPanel(emps);
        else if (hrActiveTab === 'vehicles') panelHtml = renderHrVehiclesPanel(vehs);""",
    """        else if (hrActiveTab === 'employees') panelHtml = renderHrEmployeesPanel(emps);
        else if (hrActiveTab === 'factory') panelHtml = renderHrFactoryPanel();
        else if (hrActiveTab === 'vehicles') panelHtml = renderHrVehiclesPanel(vehs);""",
    'panel factory')

# Dashboard — factory block
hr = sub(hr,
    """            '<h4 style="margin:14px 0 8px;color:#1a5276"><i class="fas fa-sitemap"></i> الأقسام</h4>' +
            '<div class="nebras-erp-list">' + (deptRows || '<p class="erp-empty">لا بيانات</p>') + '</div>' +
            renderHrDashboardAlertsBlock() +""",
    """            renderHrFactoryDashboardBlock() +
            '<h4 style="margin:14px 0 8px;color:#1a5276"><i class="fas fa-sitemap"></i> الأقسام</h4>' +
            '<div class="nebras-erp-list">' + (deptRows || '<p class="erp-empty">لا بيانات</p>') + '</div>' +
            renderHrDashboardAlertsBlock() +""",
    'dashboard factory block')

hr = sub(hr,
    """            '<p class="hr-platform-note"><i class="fas fa-people-roof"></i> منصة الموارد البشرية — موظفون · سيارات · تتبع · إجازات. <strong>صلاحياتك HR فقط</strong> — التقارير التنفيذية للإدارة الرئيسية.</p>' +""",
    """            '<p class="hr-platform-note"><i class="fas fa-industry"></i> <strong>نبراس للأبواب WPC</strong> — موارد بشرية المصنع: إنتاج · ورديات · سعودة · حضور · رواتب. التقارير التنفيذية للإدارة الرئيسية.</p>' +""",
    'dashboard note wpc')

# Employee editor — factory fields
hr = sub(hr,
    """                '<label class="nebras-field"><span>القسم</span><input id="he-dept" value="' + esc(e.department || '') + '" placeholder="مبيعات · إنتاج · إدارة"></label>' +
                '<label class="nebras-field"><span>المسمى الوظيفي</span><input id="he-job" value="' + esc(e.jobTitle || '') + '"></label>' +""",
    """                '<label class="nebras-field"><span>قسم المصنع</span><select id="he-dept-key">' +
                    '<option value="">— اختر —</option>' +
                    Object.keys(typeof HR_FACTORY_DEPTS !== 'undefined' ? HR_FACTORY_DEPTS : {}).map(function(k) {
                        return '<option value="' + k + '"' + ((e.departmentKey || '') === k ? ' selected' : '') + '>' + (HR_FACTORY_DEPTS[k] || k) + '</option>';
                    }).join('') +
                '</select></label>' +
                '<label class="nebras-field"><span>المسمى الوظيفي</span><input id="he-job" value="' + esc(e.jobTitle || '') + '"></label>' +
                '<label class="nebras-field"><span>الوردية</span><select id="he-shift">' +
                    Object.keys(typeof HR_SHIFTS !== 'undefined' ? HR_SHIFTS : { admin: { label: 'إداري' } }).map(function(k) {
                        return '<option value="' + k + '"' + ((e.shiftId || 'admin') === k ? ' selected' : '') + '>' + ((HR_SHIFTS[k] || {}).label || k) + '</option>';
                    }).join('') +
                '</select></label>' +
                '<label class="nebras-field"><span>خط الإنتاج</span><select id="he-line">' +
                    '<option value="">—</option>' +
                    Object.keys(typeof HR_PROD_LINES !== 'undefined' ? HR_PROD_LINES : {}).map(function(k) {
                        return '<option value="' + k + '"' + ((e.productionLine || '') === k ? ' selected' : '') + '>' + (HR_PROD_LINES[k] || k) + '</option>';
                    }).join('') +
                '</select></label>' +
                '<label class="nebras-field"><span>المستوى</span><select id="he-skill">' +
                    Object.keys(typeof HR_SKILL_LEVELS !== 'undefined' ? HR_SKILL_LEVELS : {}).map(function(k) {
                        return '<option value="' + k + '"' + ((e.skillLevel || '') === k ? ' selected' : '') + '>' + (HR_SKILL_LEVELS[k] || k) + '</option>';
                    }).join('') +
                '</select></label>' +
                '<label class="nebras-field"><span>نهاية التجربة</span><input type="date" id="he-probation" value="' + esc(e.probationEnd || '') + '"></label>' +""",
    'employee factory fields')

# saveHrEmployee — factory fields
hr = sub(hr,
    """            branchId: hrField('he-branch') || 'hq',
            department: hrField('he-dept'),
            jobTitle: hrField('he-job'),""",
    """            branchId: hrField('he-branch') || 'hq',
            departmentKey: hrField('he-dept-key'),
            department: (typeof HR_FACTORY_DEPTS !== 'undefined' && HR_FACTORY_DEPTS[hrField('he-dept-key')]) ? HR_FACTORY_DEPTS[hrField('he-dept-key')] : hrField('he-dept-key'),
            jobTitle: hrField('he-job'),
            shiftId: hrField('he-shift') || 'admin',
            productionLine: hrField('he-line') || '',
            skillLevel: hrField('he-skill') || 'operator',
            probationEnd: hrField('he-probation'),""",
    'saveHrEmployee factory')

# Employee card — show shift/line
hr = sub(hr,
    """                    (e.department ? '<span class="erp-tag">' + esc(e.department) + '</span>' : '') +
                '</div>' +""",
    """                    (e.department ? '<span class="erp-tag">' + esc(e.department) + '</span>' : '') +
                    (e.shiftId && typeof HR_SHIFTS !== 'undefined' && HR_SHIFTS[e.shiftId] ? '<span class="erp-tag"><i class="fas fa-clock"></i> ' + esc(HR_SHIFTS[e.shiftId].label) + '</span>' : '') +
                    (e.productionLine && typeof HR_PROD_LINES !== 'undefined' && HR_PROD_LINES[e.productionLine] ? '<span class="erp-tag"><i class="fas fa-layer-group"></i> ' + esc(HR_PROD_LINES[e.productionLine]) + '</span>' : '') +
                '</div>' +""",
    'emp card shift line')

# calcAttHours — overtime
hr = sub(hr,
    """    function calcAttHours(checkIn, checkOut) {
        if (!checkIn || !checkOut) return 0;
        const p = function(t) {
            const parts = String(t).split(':');
            return (parseInt(parts[0], 10) || 0) + (parseInt(parts[1], 10) || 0) / 60;
        };
        return Math.max(0, Math.round((p(checkOut) - p(checkIn)) * 100) / 100);
    }""",
    """    function calcAttHours(checkIn, checkOut, stdHours) {
        if (!checkIn || !checkOut) return 0;
        const p = function(t) {
            const parts = String(t).split(':');
            return (parseInt(parts[0], 10) || 0) + (parseInt(parts[1], 10) || 0) / 60;
        };
        return Math.max(0, Math.round((p(checkOut) - p(checkIn)) * 100) / 100);
    }

    function enrichAttendanceRecord(rec) {
        if (!rec) return rec;
        const emp = getEmployeeById(rec.employeeId);
        const sh = emp && emp.shiftId && typeof HR_SHIFTS !== 'undefined' ? HR_SHIFTS[emp.shiftId] : null;
        const std = sh ? sh.stdHours : 8;
        if (rec.hours > 0) rec.overtimeHours = calcOvertimeHours(rec.hours, std);
        return rec;
    }""",
    'calcAttHours overtime')

# addHrAttendance — enrich
hr = sub(hr,
    """        hrAttendance.unshift({
            id: 'att-' + Date.now(), employeeId: emp.id, employeeNo: emp.employeeNo, employeeName: emp.nameAr,
            branchId: emp.branchId || 'hq', date: date, checkIn: checkIn, checkOut: checkOut,
            hours: calcAttHours(checkIn, checkOut), status: hrField('ha-status') || 'present',
            checkInMethod: hrField('ha-method') || 'manual', geoNote: '',
            note: hrField('ha-note'), createdAt: date
        });""",
    """        const rec = {
            id: 'att-' + Date.now(), employeeId: emp.id, employeeNo: emp.employeeNo, employeeName: emp.nameAr,
            branchId: emp.branchId || 'hq', date: date, checkIn: checkIn, checkOut: checkOut,
            hours: calcAttHours(checkIn, checkOut), status: hrField('ha-status') || 'present',
            checkInMethod: hrField('ha-method') || 'manual', geoNote: '',
            note: hrField('ha-note'), createdAt: date
        };
        enrichAttendanceRecord(rec);
        hrAttendance.unshift(rec);""",
    'addHrAttendance overtime')

# hrQuickCheckOut — overtime on checkout
hr = sub(hr,
    """        existing.checkOut = now;
        existing.hours = calcAttHours(existing.checkIn, now);
        saveHrData();""",
    """        existing.checkOut = now;
        existing.hours = calcAttHours(existing.checkIn, now);
        enrichAttendanceRecord(existing);
        saveHrData();""",
    'quick checkout overtime')

# buildHrExecutiveReportData — saudization kpi
hr = sub(hr,
    """        const expDocs = hrDocuments.filter(function(d) {
            if (!scopeBranch(d) || !d.expiryDate) return false;
            const days = Math.round((new Date(d.expiryDate + 'T12:00:00') - new Date()) / (1000 * 60 * 60 * 24));
            return days <= 60;
        }).length;

        const rows = att.slice(0, 12).map(function(a) {""",
    """        const expDocs = hrDocuments.filter(function(d) {
            if (!scopeBranch(d) || !d.expiryDate) return false;
            const days = Math.round((new Date(d.expiryDate + 'T12:00:00') - new Date()) / (1000 * 60 * 60 * 24));
            return days <= 60;
        }).length;
        const saud = calcSaudizationStats(emps);
        const otMonth = att.reduce(function(s, a) { return s + (a.overtimeHours || 0); }, 0);

        const rows = att.slice(0, 12).map(function(a) {""",
    'exec saud vars')

hr = sub(hr,
    """            kpis: [
                { label: 'موظفون', val: emps.length },
                { label: 'نشطون', val: activeEmps },
                { label: 'سجلات حضور', val: att.length },
                { label: 'دخول مسجّل', val: withCheckIn },
                { label: 'بصمة / GPS', val: bioCount + ' / ' + mobileCount },
                { label: 'سيارات خارجة', val: onRoad },
                { label: 'مستندات قريبة الانتهاء', val: expDocs }
            ],""",
    """            kpis: [
                { label: 'موظفون', val: emps.length },
                { label: 'نشطون', val: activeEmps },
                { label: 'سعودة', val: saud.pct + '%' },
                { label: 'سجلات حضور', val: att.length },
                { label: 'ساعات إضافية', val: otMonth + 'h' },
                { label: 'بصمة / GPS', val: bioCount + ' / ' + mobileCount },
                { label: 'سيارات خارجة', val: onRoad }
            ],""",
    'exec saud kpis')

# Exports
hr = sub(hr,
    '    global.saveHrEmailWebhookSetting = saveHrEmailWebhookSetting;\n',
    """    global.saveHrEmailWebhookSetting = saveHrEmailWebhookSetting;
    global.getHrShiftRoster = function() { loadHrData(); return hrShiftRoster; };
    global.setHrShiftRosterFromCloud = setHrShiftRosterFromCloud;
    global.renderHrFactoryPanel = renderHrFactoryPanel;
    global.addHrShiftRoster = addHrShiftRoster;
    global.deleteHrShiftRoster = deleteHrShiftRoster;
    global.exportHrFactoryCsv = exportHrFactoryCsv;
    global.calcSaudizationStats = calcSaudizationStats;
""",
    'exports phase15')

with open(HR_JS, 'w', encoding='utf-8', newline='\n') as f:
    f.write(hr)

# index.html branding
html = sub(html,
    '                        <h2>منصة الموارد البشرية</h2>\n                        <p>موظفون · عمال · سيارات · إجازات — المقر الرئيسي وجميع فروع نبراس</p>',
    '                        <h2>الموارد البشرية — مصنع نبراس WPC</h2>\n                        <p>إنتاج · ورديات · سعودة · حضور · رواتب · سيارات — المقر والفروع</p>',
    'index hr title')

html = sub(html,
    'منصة HR متكاملة: موظفون · حضور · مستندات · رواتب · تتبع سيارات · تنبيهات. موظف HR = صلاحيات HR فقط · التقارير وPDF الرواتب للإدارة الرئيسية.',
    'منصة HR لمصنع الأبواب WPC: موظفون وعمال الإنتاج · ورديات · سعودة · حضور وبصمة · مستندات وإقامات · رواتب · أسطول وتتبع. موظف HR = HR فقط · التقارير للإدارة الرئيسية.',
    'index hr note')

with open(INDEX_HTML, 'w', encoding='utf-8', newline='\n') as f:
    f.write(html)

# Cloud sync
if "'hr_shift_roster'" not in plat:
    plat = sub(plat,
        """            { key: 'hr_email_queue', get: function() {
                return typeof getHrEmailQueue === 'function' ? getHrEmailQueue() : [];
            }, set: function(v) {
                if (typeof setHrEmailQueueFromCloud === 'function') setHrEmailQueueFromCloud(v);
            }},""",
        """            { key: 'hr_email_queue', get: function() {
                return typeof getHrEmailQueue === 'function' ? getHrEmailQueue() : [];
            }, set: function(v) {
                if (typeof setHrEmailQueueFromCloud === 'function') setHrEmailQueueFromCloud(v);
            }},
            { key: 'hr_shift_roster', get: function() {
                return typeof getHrShiftRoster === 'function' ? getHrShiftRoster() : [];
            }, set: function(v) {
                if (typeof setHrShiftRosterFromCloud === 'function') setHrShiftRosterFromCloud(v);
            }},""",
        'cloud phase15')
    plat = sub(plat,
        "'hr_notif_settings', 'hr_email_queue'];",
        "'hr_notif_settings', 'hr_email_queue', 'hr_shift_roster'];",
        'erpKeys phase15')
    with open(PLATFORM_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write(plat)

print('PHASE15 PATCH COMPLETE')
