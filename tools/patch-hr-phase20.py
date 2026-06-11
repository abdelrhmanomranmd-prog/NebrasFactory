#!/usr/bin/env python3
"""Phase 20: HR fleet + sales rep monitoring tab."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HR_JS = os.path.join(ROOT, 'js', 'nebras-hr-platform.js')
CSS_FILE = os.path.join(ROOT, 'css', '34-hr-platform.css')
INJECT = os.path.join(ROOT, 'tools', 'phase20-hr-fleet-reps.js')

with open(HR_JS, encoding='utf-8') as f:
    hr = f.read()
with open(INJECT, encoding='utf-8') as f:
    p20 = f.read()
with open(CSS_FILE, encoding='utf-8') as f:
    css = f.read()

MARKER = '/* PHASE20_HR_INJECTED */'


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

hr = sub(hr,
    '    function isHrDepartmentAdmin(admin) {',
    MARKER + '\n' + p20 + '\n    function isHrDepartmentAdmin(admin) {',
    'inject phase20 hr fleet')

# Tab definition
hr = sub(hr,
    """            { id: 'tracking', icon: 'fas fa-location-dot', label: 'تتبع السيارات' },
            { id: 'attendance', icon: 'fas fa-fingerprint', label: 'حضور وانصراف' },""",
    """            { id: 'tracking', icon: 'fas fa-location-dot', label: 'تتبع السيارات' },
            { id: 'fleet-reps', icon: 'fas fa-user-tie', label: 'أسطول المندوبين' },
            { id: 'attendance', icon: 'fas fa-fingerprint', label: 'حضور وانصراف' },""",
    'fleet-reps tab')

# Panel switch
hr = sub(hr,
    "        else if (hrActiveTab === 'tracking') panelHtml = renderHrVehicleTrackingPanel();\n        else if (hrActiveTab === 'attendance')",
    "        else if (hrActiveTab === 'tracking') panelHtml = renderHrVehicleTrackingPanel();\n"
    "        else if (hrActiveTab === 'fleet-reps' && typeof renderHrSalesFleetPanel === 'function') panelHtml = renderHrSalesFleetPanel();\n"
    "        else if (hrActiveTab === 'attendance')",
    'fleet-reps panel')

# Tab scope
hr = sub(hr,
    """            if ((tabId === 'vehicles' || tabId === 'tracking') && fleetDepts.indexOf(scope.departmentKey) < 0) return false;
        }
        return true;""",
    """            if ((tabId === 'vehicles' || tabId === 'tracking' || tabId === 'fleet-reps') && fleetDepts.indexOf(scope.departmentKey) < 0) return false;
        }
        if (tabId === 'fleet-reps' && typeof isHrFleetRepsTabAllowed === 'function') return isHrFleetRepsTabAllowed();
        return true;""",
    'fleet-reps scope')

# Executive reports — add driver phone column
hr = sub(hr,
    """        const trackRows = hrVehicleTracking.slice(0, 50).map(function(t) {
            return '<tr><td>' + esc(t.plateNo) + '</td><td>' + esc(t.driverName) + '</td><td>' + esc(t.driverEmployeeNo || '') + '</td><td>' + formatHrDate(t.assignedDate) + '</td><td>' + esc((HR_TRACK_STATUS[t.status] || {}).label || t.status) + '</td></tr>';
        }).join('');""",
    """        const trackRows = hrVehicleTracking.slice(0, 50).map(function(t) {
            return '<tr><td>' + esc(t.plateNo) + '</td><td>' + esc(t.driverName) + '</td><td>' + (t.driverPhone ? '<a href="tel:' + esc(t.driverPhone) + '">' + esc(t.driverPhone) + '</a>' : '—') + '</td><td>' + esc(t.driverEmployeeNo || '') + '</td><td>' + formatHrDate(t.assignedDate) + '</td><td>' + esc((HR_TRACK_STATUS[t.status] || {}).label || t.status) + '</td></tr>';
        }).join('');""",
    'reports driver phone')

hr = sub(hr,
    """                '<table class="hr-leave-table"><thead><tr>' +
                    '<th>اللوحة</th><th>السائق</th><th>رقم السائق</th><th>التاريخ</th><th>الحالة</th>' +
                '</tr></thead><tbody>' + (trackRows || '<tr><td colspan="5">لا سجلات</td></tr>') + '</tbody></table>' +""",
    """                '<table class="hr-leave-table"><thead><tr>' +
                    '<th>اللوحة</th><th>السائق</th><th>جوال السائق</th><th>رقم السائق</th><th>التاريخ</th><th>الحالة</th>' +
                '</tr></thead><tbody>' + (trackRows || '<tr><td colspan="6">لا سجلات</td></tr>') + '</tbody></table>' +""",
    'reports table header phone')

# Quick tabs on scoped dashboard
hr = sub(hr,
    "        if (isHrTabAllowedForScope('tracking')) quickTabs.push({ id: 'tracking', icon: 'fas fa-location-dot', label: 'تتبع' });",
    "        if (isHrTabAllowedForScope('tracking')) quickTabs.push({ id: 'tracking', icon: 'fas fa-location-dot', label: 'تتبع' });\n"
    "        if (isHrTabAllowedForScope('fleet-reps')) quickTabs.push({ id: 'fleet-reps', icon: 'fas fa-user-tie', label: 'المندوبون' });",
    'quick tab fleet-reps')

# Global export
if 'global.renderHrSalesFleetPanel' not in hr:
    hr = sub(hr,
        '    global.switchHrTab = switchHrTab;',
        '    global.renderHrSalesFleetPanel = renderHrSalesFleetPanel;\n    global.switchHrTab = switchHrTab;',
        'global export fleet panel')

# CSS for fleet-reps banner
FLEET_CSS = """
/* Phase 20 — HR fleet + sales reps */
.hr-gov-owner-banner--main { border-color: #155e94; background: linear-gradient(135deg, #eaf4fb, #f8fbff); }
.hr-tracking-section-title { margin: 1rem 0 0.5rem; font-size: 0.92rem; color: #1a5276; display: flex; align-items: center; gap: 0.4rem; }
"""
if 'Phase 20 — HR fleet' not in css:
    css += FLEET_CSS
    print('OK: hr fleet css')

with open(HR_JS, 'w', encoding='utf-8') as f:
    f.write(hr)
with open(CSS_FILE, 'w', encoding='utf-8') as f:
    f.write(css)

print('Phase 20 HR patch complete.')
