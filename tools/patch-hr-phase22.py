#!/usr/bin/env python3
"""Phase 22: HR scope enforcement + period purge."""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HR_JS = os.path.join(ROOT, 'js', 'nebras-hr-platform.js')
INJECT = os.path.join(ROOT, 'tools', 'phase22-hr-security.js')

with open(HR_JS, encoding='utf-8') as f:
    hr = f.read()
with open(INJECT, encoding='utf-8') as f:
    p22 = f.read()

MARKER = '/* PHASE22_HR_INJECTED */'


def sub(text, old, new, label):
    if old not in text:
        print(f'MISSING [{label}]')
        sys.exit(1)
    print(f'OK: {label}')
    return text.replace(old, new, 1)


if MARKER in hr:
    start = hr.index(MARKER)
    end = hr.index('    function isHrDepartmentAdmin(admin)', start)
    hr = hr[:start] + hr[end:]

# Remove functions replaced by phase22
for pat, name in [
    (r'    function getHrAdminScope\(admin\) \{.*?return \{ mode: mode.*?\};\n    \}\n\n', 'getHrAdminScope'),
    (r'    function collectHrAlerts\(\) \{.*?return alerts\.sort\(function.*?\);\n    \}\n\n', 'collectHrAlerts'),
    (r'    function getSalesRepUsers\(\) \{.*?return adminUsers\.filter.*?\}\);\n    \}\n\n', 'getSalesRepUsers'),
    (r'    function isHrFleetRepsTabAllowed\(\) \{.*?return false;\n    \}\n\n', 'isHrFleetRepsTabAllowed'),
]:
    m = re.search(pat, hr, re.DOTALL)
    if m:
        hr = hr[:m.start()] + hr[m.end():]
        print(f'OK: remove old {name}')

# filterHrFactoryEmployees - may exist in phase16
m = re.search(r'    function filterHrFactoryEmployees\([^)]*\) \{.*?\n    \}\n\n', hr, re.DOTALL)
if m and 'applyHrScopeFilter(list, \'employee\')' not in m.group(0):
    hr = hr[:m.start()] + hr[m.end():]
    print('OK: remove old filterHrFactoryEmployees')

hr = sub(hr,
    '    function isHrDepartmentAdmin(admin) {',
    MARKER + '\n' + p22 + '\n    function isHrDepartmentAdmin(admin) {',
    'inject phase22 hr')

# saveHrEmployee scope guards
hr = sub(hr,
    """    function saveHrEmployee(id) {
        if (!requireHrAccess()) return;
        const nameAr = hrField('he-name-ar');""",
    """    function saveHrEmployee(id) {
        if (!requireHrAccess()) return;
        if (id) {
            const existing = getEmployeeById(id);
            if (existing && typeof requireHrRecordInScope === 'function' && !requireHrRecordInScope(existing, 'employee')) return;
        }
        const nameAr = hrField('he-name-ar');""",
    'saveHrEmployee scope')

hr = sub(hr,
    """        if (newVehId) {
            const nv = getVehicleById(newVehId);
            if (nv) {
                hrVehicles.forEach(function(v) {
                    if (v.assignedEmployeeId === record.id && v.id !== newVehId) v.assignedEmployeeId = null;
                });
                nv.assignedEmployeeId = record.id;
            }
        }

        saveHrData();""",
    """        if (newVehId) {
            const nv = getVehicleById(newVehId);
            if (nv) {
                hrVehicles.forEach(function(v) {
                    if (v.assignedEmployeeId === record.id && v.id !== newVehId) v.assignedEmployeeId = null;
                });
                nv.assignedEmployeeId = record.id;
            }
        }
        if (typeof assertHrNewRecordInScope === 'function' && !assertHrNewRecordInScope(record)) return;

        saveHrData();""",
    'saveHrEmployee new scope')

hr = sub(hr,
    """    function deleteHrEmployee(id) {
        if (!requireHrAccess()) return;
        const e = getEmployeeById(id);
        if (!e || !confirm('حذف ' + e.nameAr + ' من سجلات HR؟')) return;""",
    """    function deleteHrEmployee(id) {
        if (!requireHrAccess()) return;
        const e = getEmployeeById(id);
        if (!e || !confirm('حذف ' + e.nameAr + ' من سجلات HR؟')) return;
        if (typeof requireHrRecordInScope === 'function' && !requireHrRecordInScope(e, 'employee')) return;""",
    'deleteHrEmployee scope')

# deleteHrVehicle
hr = sub(hr,
    """    function deleteHrVehicle(id) {
        if (!requireHrAccess()) return;
        const v = getVehicleById(id);
        if (!v || !confirm('حذف المركبة ' + v.plateNo + '؟')) return;""",
    """    function deleteHrVehicle(id) {
        if (!requireHrAccess()) return;
        const v = getVehicleById(id);
        if (!v || !confirm('حذف المركبة ' + v.plateNo + '؟')) return;
        if (typeof requireHrRecordInScope === 'function' && !requireHrRecordInScope(v, 'vehicle')) return;""",
    'deleteHrVehicle scope')

hr = sub(hr,
    """        const t = hrVehicleTracking.find(function(x) { return x.id === id; });
        if (!t || !confirm('حذف سجل التتبع — ' + t.plateNo + ' / ' + t.driverName + '؟')) return;
        hrVehicleTracking = hrVehicleTracking.filter""",
    """        const t = hrVehicleTracking.find(function(x) { return x.id === id; });
        if (!t || !confirm('حذف سجل التتبع — ' + t.plateNo + ' / ' + t.driverName + '؟')) return;
        if (typeof requireHrRecordInScope === 'function' && !requireHrRecordInScope(t, 'tracking')) return;
        hrVehicleTracking = hrVehicleTracking.filter""",
    'deleteHrTracking scope')

# HR reports purge buttons for main admin
hr = sub(hr,
    """                '<button type="button" class="nebras-users-btn" onclick="printHrReport()"><i class="fas fa-print"></i> طباعة</button>' +
            '</div>' +""",
    """                '<button type="button" class="nebras-users-btn" onclick="printHrReport()"><i class="fas fa-print"></i> طباعة</button>' +
                '<button type="button" class="nebras-users-btn analytics-period-btn" onclick="purgeHrAnalyticsByPeriod(\\'daily\\')"><i class="fas fa-sun"></i> حذف حضور — اليوم</button>' +
                '<button type="button" class="nebras-users-btn analytics-period-btn" onclick="purgeHrAnalyticsByPeriod(\\'monthly\\')"><i class="fas fa-calendar"></i> حذف حضور — الشهر</button>' +
            '</div>' +""",
    'hr reports purge buttons')

# Global export
if 'global.purgeHrAnalyticsByPeriod' not in hr:
    hr = sub(hr,
        '    global.renderHrSalesFleetPanel = renderHrSalesFleetPanel;',
        '    global.purgeHrAnalyticsByPeriod = purgeHrAnalyticsByPeriod;\n'
        '    global.requireHrRecordInScope = requireHrRecordInScope;\n'
        '    global.renderHrSalesFleetPanel = renderHrSalesFleetPanel;',
        'global exports phase22 hr')

with open(HR_JS, 'w', encoding='utf-8') as f:
    f.write(hr)

print('Phase 22 HR patch complete.')
