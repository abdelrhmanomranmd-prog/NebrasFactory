#!/usr/bin/env python3
"""Inject Phase 12 HR modules: attendance, documents, payroll, alerts."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HR_JS = os.path.join(ROOT, 'js', 'nebras-hr-platform.js')
PLATFORM_JS = os.path.join(ROOT, 'js', 'nebras-platform.js')
INJECT = os.path.join(ROOT, 'tools', 'hr-phase12-panels.js')

with open(HR_JS, encoding='utf-8') as f:
    hr = f.read()
with open(INJECT, encoding='utf-8') as f:
    inject_code = f.read()
with open(PLATFORM_JS, encoding='utf-8') as f:
    platform = f.read()

MARKER = '/* PHASE12_INJECTED */'
if MARKER in hr:
    # strip old injection
    start = hr.index('/* PHASE12_INJECTED */')
    end = hr.index('function isHrDepartmentAdmin(admin)', start)
    hr = hr[:start] + hr[end:]

# Remove duplicate const from inject if keys already at top - inject has full block

def hr_sub(old, new, label):
    global hr
    if old not in hr:
        print(f'HR MISSING [{label}]')
        sys.exit(1)
    hr = hr.replace(old, new, 1)
    print(f'HR OK: {label}')


hr_sub(
    '    let hrTrackingEditorId = null;\n',
    '    let hrTrackingEditorId = null;\n    let hrDocEditorId = null;\n    let hrPayrollMonth = \'\';\n',
    'phase12 editor vars'
)

if 'HR_ATT_KEY' not in hr:
    hr_sub(
        "    const HR_TRACK_KEY = 'nebrasHrVehicleTracking';\n",
        "    const HR_TRACK_KEY = 'nebrasHrVehicleTracking';\n"
        "    const HR_ATT_KEY = 'nebrasHrAttendance';\n"
        "    const HR_DOC_KEY = 'nebrasHrDocuments';\n"
        "    const HR_PAYROLL_KEY = 'nebrasHrPayroll';\n",
        'phase12 keys'
    )

if 'let hrAttendance' not in hr:
    hr_sub(
        '    let hrVehicleTracking = [];\n',
        '    let hrVehicleTracking = [];\n    let hrAttendance = [];\n    let hrDocuments = [];\n    let hrPayrollRuns = [];\n',
        'phase12 arrays'
    )

hr_sub(
    """        ensureBuiltinHrSeed();
        return { employees: hrEmployees, vehicles: hrVehicles, leave: hrLeaveRequests, tracking: hrVehicleTracking };""",
    """        loadHrPhase12Arrays();
        ensureBuiltinHrSeed();
        ensureBuiltinHrPhase12Seed();
        return { employees: hrEmployees, vehicles: hrVehicles, leave: hrLeaveRequests, tracking: hrVehicleTracking, attendance: hrAttendance, documents: hrDocuments, payroll: hrPayrollRuns };""",
    'loadHrData phase12'
)

hr_sub(
    """            localStorage.setItem(HR_TRACK_KEY, JSON.stringify(hrVehicleTracking));
        } catch (err) { console.warn('HR save failed', err); }""",
    """            localStorage.setItem(HR_TRACK_KEY, JSON.stringify(hrVehicleTracking));
            saveHrPhase12Arrays();
        } catch (err) { console.warn('HR save failed', err); }""",
    'saveHrData phase12'
)

hr_sub(
    '        hrTrackingEditorId = null;\n        renderHrPlatformPanel();',
    '        hrTrackingEditorId = null;\n        hrDocEditorId = null;\n        renderHrPlatformPanel();',
    'switchHrTab doc editor'
)

# Inject panel code before isHrDepartmentAdmin
hr_sub(
    '    function isHrDepartmentAdmin(admin) {',
    MARKER + '\n' + inject_code + '\n    function isHrDepartmentAdmin(admin) {',
    'inject phase12 panels'
)

# Tabs
hr_sub(
    """            { id: 'tracking', icon: 'fas fa-location-dot', label: 'تتبع السيارات' },
            { id: 'leave', icon: 'fas fa-calendar-days', label: 'الإجازات' }
        ];""",
    """            { id: 'tracking', icon: 'fas fa-location-dot', label: 'تتبع السيارات' },
            { id: 'attendance', icon: 'fas fa-fingerprint', label: 'حضور وانصراف' },
            { id: 'documents', icon: 'fas fa-folder-open', label: 'المستندات' },
            { id: 'payroll', icon: 'fas fa-money-check-dollar', label: 'مسير الرواتب' },
            { id: 'alerts', icon: 'fas fa-bell', label: 'التنبيهات' },
            { id: 'leave', icon: 'fas fa-calendar-days', label: 'الإجازات' }
        ];""",
    'tab defs phase12'
)

hr_sub(
    """        else if (hrActiveTab === 'tracking') panelHtml = renderHrVehicleTrackingPanel();
        else if (hrActiveTab === 'leave') panelHtml = renderHrLeavePanel();""",
    """        else if (hrActiveTab === 'tracking') panelHtml = renderHrVehicleTrackingPanel();
        else if (hrActiveTab === 'attendance') panelHtml = renderHrAttendancePanel();
        else if (hrActiveTab === 'documents') panelHtml = renderHrDocumentsPanel();
        else if (hrActiveTab === 'payroll') panelHtml = renderHrPayrollPanel();
        else if (hrActiveTab === 'alerts') panelHtml = renderHrAlertsPanel();
        else if (hrActiveTab === 'leave') panelHtml = renderHrLeavePanel();""",
    'panel routing phase12'
)

# Summary alerts count
hr_sub(
    """        const expiringDocs = hrVehicles.filter(function(v) {
            return isExpiringSoon(v.insuranceExp) || isExpiringSoon(v.inspectionExp) || isExpired(v.insuranceExp);
        }).length;
        syncVehicleCurrentDriversFromTracking();""",
    """        const expiringDocs = hrVehicles.filter(function(v) {
            return isExpiringSoon(v.insuranceExp) || isExpiringSoon(v.inspectionExp) || isExpired(v.insuranceExp);
        }).length;
        const hrAlertsCount = collectHrAlerts().filter(function(a) { return a.level === 'danger' || a.level === 'warn'; }).length;
        syncVehicleCurrentDriversFromTracking();""",
    'alerts count var'
)

hr_sub(
    """                (expiringDocs ? '<div class="erp-stat erp-stat--danger"><strong>' + expiringDocs + '</strong><span>تنبيه وثائق سيارات</span></div>' : '');""",
    """                (expiringDocs ? '<div class="erp-stat erp-stat--danger"><strong>' + expiringDocs + '</strong><span>تنبيه سيارات</span></div>' : '') +
                (hrAlertsCount ? '<div class="erp-stat erp-stat--danger"><strong>' + hrAlertsCount + '</strong><span>تنبيهات HR</span></div>' : '');""",
    'summary alerts stat'
)

# Dashboard alerts snippet
hr_sub(
    """            '<h4 style="margin:14px 0 8px;color:#1a5276"><i class="fas fa-sitemap"></i> الأقسام</h4>' +
            '<div class="nebras-erp-list">' + (deptRows || '<p class="erp-empty">لا بيانات</p>') + '</div>' +
        '</div>';""",
    """            '<h4 style="margin:14px 0 8px;color:#1a5276"><i class="fas fa-sitemap"></i> الأقسام</h4>' +
            '<div class="nebras-erp-list">' + (deptRows || '<p class="erp-empty">لا بيانات</p>') + '</div>' +
            renderHrDashboardAlertsBlock() +
        '</div>';""",
    'dashboard alerts block'
)

# Add dashboard alerts helper before renderHrDashboard if not exists
if 'function renderHrDashboardAlertsBlock' not in hr:
    hr_sub(
        '    function renderHrDashboard(onLeave, assignedVeh, pendingLeave, expiringDocs) {',
        """    function renderHrDashboardAlertsBlock() {
        const alerts = collectHrAlerts().slice(0, 6);
        if (!alerts.length) return '';
        const items = alerts.map(function(a) {
            const cls = a.level === 'danger' ? 'hr-alert--danger' : 'hr-alert--warn';
            return '<article class="hr-alert-row ' + cls + '"><span class="hr-alert-cat">' + esc(a.cat) + '</span><strong>' + esc(a.ref) + '</strong><p>' + esc(a.detail) + '</p></article>';
        }).join('');
        return '<h4 style="margin:14px 0 8px;color:#1a5276"><i class="fas fa-bell"></i> تنبيهات عاجلة <button type="button" class="erp-tag erp-tag--action" onclick="switchHrTab(\\'alerts\\')">عرض الكل</button></h4><div class="hr-alerts-list hr-alerts-list--compact">' + items + '</div>';
    }

    function renderHrDashboard(onLeave, assignedVeh, pendingLeave, expiringDocs) {""",
        'dashboard alerts helper'
    )

# Exports
hr_sub(
    '    global.lookupHrVehicleByPlateEdit = lookupHrVehicleByPlateEdit;\n',
    """    global.lookupHrVehicleByPlateEdit = lookupHrVehicleByPlateEdit;
    global.getHrAttendance = function() { loadHrData(); return hrAttendance; };
    global.getHrDocuments = function() { loadHrData(); return hrDocuments; };
    global.getHrPayrollRuns = function() { loadHrData(); return hrPayrollRuns; };
    global.setHrAttendanceFromCloud = setHrAttendanceFromCloud;
    global.setHrDocumentsFromCloud = setHrDocumentsFromCloud;
    global.setHrPayrollFromCloud = setHrPayrollFromCloud;
    global.addHrAttendance = addHrAttendance;
    global.deleteHrAttendance = deleteHrAttendance;
    global.saveHrDocumentQuick = saveHrDocumentQuick;
    global.saveHrDocumentEdit = saveHrDocumentEdit;
    global.openHrDocEditor = openHrDocEditor;
    global.cancelHrDocEditor = cancelHrDocEditor;
    global.deleteHrDocument = deleteHrDocument;
    global.setHrPayrollMonth = setHrPayrollMonth;
    global.saveHrPayrollDraft = saveHrPayrollDraft;
    global.exportHrPayrollPdf = exportHrPayrollPdf;
""",
    'exports phase12'
)

with open(HR_JS, 'w', encoding='utf-8', newline='\n') as f:
    f.write(hr)

# Platform cloud sync
def plat_sub(old, new, label):
    global platform
    if old not in platform:
        print(f'PLAT MISSING [{label}]')
        sys.exit(1)
    platform = platform.replace(old, new, 1)
    print(f'PLAT OK: {label}')


plat_sub(
    """            { key: 'hr_vehicle_tracking', get: function() {
                return typeof getHrVehicleTracking === 'function' ? getHrVehicleTracking() : [];
            }, set: function(v) {
                if (typeof setHrVehicleTrackingFromCloud === 'function') setHrVehicleTrackingFromCloud(v);
            }},""",
    """            { key: 'hr_vehicle_tracking', get: function() {
                return typeof getHrVehicleTracking === 'function' ? getHrVehicleTracking() : [];
            }, set: function(v) {
                if (typeof setHrVehicleTrackingFromCloud === 'function') setHrVehicleTrackingFromCloud(v);
            }},
            { key: 'hr_attendance', get: function() {
                return typeof getHrAttendance === 'function' ? getHrAttendance() : [];
            }, set: function(v) {
                if (typeof setHrAttendanceFromCloud === 'function') setHrAttendanceFromCloud(v);
            }},
            { key: 'hr_documents', get: function() {
                return typeof getHrDocuments === 'function' ? getHrDocuments() : [];
            }, set: function(v) {
                if (typeof setHrDocumentsFromCloud === 'function') setHrDocumentsFromCloud(v);
            }},
            { key: 'hr_payroll', get: function() {
                return typeof getHrPayrollRuns === 'function' ? getHrPayrollRuns() : [];
            }, set: function(v) {
                if (typeof setHrPayrollFromCloud === 'function') setHrPayrollFromCloud(v);
            }},""",
    'cloud phase12 stores'
)

plat_sub(
    "'hr_vehicle_tracking'];",
    "'hr_vehicle_tracking', 'hr_attendance', 'hr_documents', 'hr_payroll'];",
    'erpKeys phase12'
)

# Dashboard KPIs for HR - add attendance today
plat_sub(
    """                    kpis.push({ v: track.filter(function(t) { return t.status === 'on_road'; }).length, l: 'خارجة الآن', alert: false });
                    kpis.push({ v: track.length, l: 'سجلات تتبع', alert: false });""",
    """                    kpis.push({ v: track.filter(function(t) { return t.status === 'on_road'; }).length, l: 'خارجة الآن', alert: false });
                    kpis.push({ v: track.length, l: 'سجلات تتبع', alert: false });
                    const att = typeof getHrAttendance === 'function' ? getHrAttendance() : [];
                    const todayAtt = att.filter(function(a) { return a.date === new Date().toISOString().slice(0, 10); }).length;
                    kpis.push({ v: todayAtt, l: 'حضور اليوم', alert: false });
                    const docs = typeof getHrDocuments === 'function' ? getHrDocuments() : [];
                    kpis.push({ v: docs.length, l: 'مستندات', alert: false });""",
    'hr dashboard kpis phase12'
)

with open(PLATFORM_JS, 'w', encoding='utf-8', newline='\n') as f:
    f.write(platform)

print('PHASE12 PATCH COMPLETE')
