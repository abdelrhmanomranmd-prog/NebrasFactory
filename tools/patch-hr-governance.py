#!/usr/bin/env python3
"""Strict HR governance + vehicle tracking cloud sync."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, 'js', 'nebras-platform.js')

with open(JS, encoding='utf-8') as f:
    text = f.read()
original = text


def sub(old, new, label):
    global text
    if old not in text:
        print(f'MISSING [{label}]')
        sys.exit(1)
    text = text.replace(old, new, 1)
    print(f'OK: {label}')


sub(
    """            hr: {
                labelAr: 'موارد بشرية', labelEn: 'HR Manager',
                icon: 'fas fa-people-roof', accent: '#2980b9',
                descAr: 'منصة HR الداخلية — موظفون · عمال · سيارات · إجازات · كل الفروع (مثل Bayzat · Jisr).',
                permissions: ['hr', 'audit'],
                companyWide: true
            },""",
    """            hr: {
                labelAr: 'موارد بشرية', labelEn: 'HR Manager',
                icon: 'fas fa-people-roof', accent: '#2980b9',
                descAr: 'منصة HR فقط — موظفون · سيارات · تتبع · إجازات. لا صلاحيات خارج HR.',
                permissions: ['hr'],
                companyWide: true
            },""",
    "hr role permissions only"
)

sub(
    """            const visible = dashboardTiles.filter(function(t) {
                if (t.visible === false) return false;
                if (t.superadminOnly && !isMainGovernanceAdmin()) return false;
                if (t.permission && currentAdmin && !canManage(t.permission)) return false;
                return true;
            });""",
    """            let visible = dashboardTiles.filter(function(t) {
                if (t.visible === false) return false;
                if (t.superadminOnly && !isMainGovernanceAdmin()) return false;
                if (t.permission && currentAdmin && !canManage(t.permission)) return false;
                return true;
            });
            if (typeof isHrDepartmentAdmin === 'function' && isHrDepartmentAdmin(currentAdmin)) {
                visible = visible.filter(function(t) { return t.id === 'dash-hr-platform'; });
            }""",
    "renderDashboardTiles hr only"
)

sub(
    """                if (canManage('complaints')) kpis.push({ v: stats.complaintsCount, l: 'شكاوى', alert: stats.complaintsCount > 0 });
                if (canManage('branches')) kpis.push({ v: stats.branchesCount, l: 'فروع', alert: false });
                if (!kpis.length && isMainGovernanceAdmin(user)) {""",
    """                if (canManage('complaints')) kpis.push({ v: stats.complaintsCount, l: 'شكاوى', alert: stats.complaintsCount > 0 });
                if (canManage('branches')) kpis.push({ v: stats.branchesCount, l: 'فروع', alert: false });
                if (typeof isHrDepartmentAdmin === 'function' && isHrDepartmentAdmin(user) && typeof getHrEmployees === 'function') {
                    const emps = getHrEmployees();
                    const vehs = typeof getHrVehicles === 'function' ? getHrVehicles() : [];
                    const track = typeof getHrVehicleTracking === 'function' ? getHrVehicleTracking() : [];
                    kpis.length = 0;
                    kpis.push({ v: emps.length, l: 'موظفون', alert: false });
                    kpis.push({ v: vehs.length, l: 'سيارات', alert: false });
                    kpis.push({ v: track.filter(function(t) { return t.status === 'on_road'; }).length, l: 'خارجة الآن', alert: false });
                    kpis.push({ v: track.length, l: 'سجلات تتبع', alert: false });
                }
                if (!kpis.length && isMainGovernanceAdmin(user)) {""",
    "dashboard KPIs hr only"
)

sub(
    """                { roles: ['hr'], icon: 'fas fa-people-roof', label: 'منصة HR', handler: 'openHrPlatform', perm: 'hr' },
                { roles: ['superadmin', 'manager'], icon: 'fas fa-people-roof', label: 'منصة HR', handler: 'openHrPlatform', perm: 'hr' },""",
    """                { roles: ['hr'], icon: 'fas fa-people-roof', label: 'منصة الموارد البشرية', handler: 'openHrPlatform', perm: 'hr' },
                { roles: ['hr'], icon: 'fas fa-shield-halved', label: 'أمان حسابي', handler: 'openAccountSecurity', perm: null },
                { roles: ['superadmin', 'manager'], icon: 'fas fa-people-roof', label: 'منصة HR', handler: 'openHrPlatform', perm: 'hr' },""",
    "quick actions hr strict"
)

sub(
    """                if (item.handler === 'openHrPlatform' && typeof canAccessHrPlatform === 'function' && !canAccessHrPlatform()) return;
                if (item.perm && !canManage(item.perm)) return;""",
    """                if (item.handler === 'openHrPlatform' && typeof canAccessHrPlatform === 'function' && !canAccessHrPlatform()) return;
                if (item.handler === 'openAccountSecurity' && typeof isHrDepartmentAdmin === 'function' && isHrDepartmentAdmin(currentAdmin)) { /* مسموح */ }
                else if (item.roles && item.roles.indexOf('hr') >= 0 && item.roles.length === 1 && item.handler !== 'openHrPlatform' && item.handler !== 'openAccountSecurity') return;
                if (item.perm && !canManage(item.perm)) return;""",
    "quick actions hr filter strict"
)

sub(
    """            hr: {
                greetingAr: 'منصة الموارد البشرية',
                descAr: 'إدارة الموظفين والعمال والسيارات والإجازات — المقر الرئيسي وجميع فروع المملكة.',
                scrollTo: 'erp-hub-panel',
                openHandler: 'openHrPlatform',
                hideSections: ['dashboard-company-identity', 'dashboard-partners-block', 'platform-hub-panel', 'dashboard-channels-panel', 'dashboard-occasion-panel', 'dashboard-official-hub', 'erp-hub-panel']
            }""",
    """            hr: {
                greetingAr: 'منصة الموارد البشرية — HR فقط',
                descAr: 'موظفون · تتبع سيارات · إجازات — صلاحياتك محصورة في HR. التقارير التنفيذية للإدارة الرئيسية.',
                scrollTo: 'dashboard-actions-grid',
                openHandler: 'openHrPlatform',
                hideSections: [
                    'dashboard-company-identity', 'dashboard-partners-block', 'platform-hub-panel',
                    'dashboard-channels-panel', 'dashboard-occasion-panel', 'dashboard-official-hub',
                    'erp-hub-panel', 'dashboard-main-nav', 'dashboard-hub-intro', 'dashboard-secondary-grid'
                ]
            }""",
    "DASHBOARD_ROLE_FOCUS hr strict"
)

sub(
    """            applyRoleDashboardScope(user);
            startDashboardClock();""",
    """            applyRoleDashboardScope(user);
            if (typeof applyHrStrictDashboardGovernance === 'function') applyHrStrictDashboardGovernance(user);
            startDashboardClock();""",
    "showAdminDashboard hr governance"
)

sub(
    """            { key: 'hr_leave', get: function() {
                return typeof getHrLeaveRequests === 'function' ? getHrLeaveRequests() : [];
            }, set: function(v) {
                if (typeof setHrLeaveFromCloud === 'function') setHrLeaveFromCloud(v);
            }},""",
    """            { key: 'hr_leave', get: function() {
                return typeof getHrLeaveRequests === 'function' ? getHrLeaveRequests() : [];
            }, set: function(v) {
                if (typeof setHrLeaveFromCloud === 'function') setHrLeaveFromCloud(v);
            }},
            { key: 'hr_vehicle_tracking', get: function() {
                return typeof getHrVehicleTracking === 'function' ? getHrVehicleTracking() : [];
            }, set: function(v) {
                if (typeof setHrVehicleTrackingFromCloud === 'function') setHrVehicleTrackingFromCloud(v);
            }},""",
    "cloud hr_vehicle_tracking"
)

sub(
    "            const erpKeys = ['erp_inventory', 'erp_orders', 'erp_production', 'erp_purchases', 'erp_transfers', 'erp_stock_transfers', 'sales_price_list', 'sales_data', 'customer_service', 'hr_employees', 'hr_vehicles', 'hr_leave'];",
    "            const erpKeys = ['erp_inventory', 'erp_orders', 'erp_production', 'erp_purchases', 'erp_transfers', 'erp_stock_transfers', 'sales_price_list', 'sales_data', 'customer_service', 'hr_employees', 'hr_vehicles', 'hr_leave', 'hr_vehicle_tracking'];",
    "erpKeys tracking"
)

sub(
    """                { id: 'erp-hr-platform', pillar: 'hr', status: 'live', icon: 'fas fa-people-roof', permission: 'hr', handler: 'openHrPlatform', nameAr: 'منصة الموارد البشرية', descAr: 'موظفون · عمال · سيارات · إجازات — كل الفروع', nameEn: 'HR platform' }""",
    """                { id: 'erp-hr-platform', pillar: 'hr', status: 'live', icon: 'fas fa-people-roof', permission: 'hr', handler: 'openHrPlatform', nameAr: 'منصة الموارد البشرية', descAr: 'موظفون · تتبع سيارات · إجازات — حوكمة HR', nameEn: 'HR platform' }""",
    "erp hr module desc"
)

if text != original:
    with open(JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print('PATCH COMPLETE')
else:
    print('NO CHANGES')
