#!/usr/bin/env python3
"""Patch nebras-platform.js for HR ERP module integration."""
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


# Permissions
sub(
    "            productMaster: 'مركز المنتجات والأسعار'\n        };",
    "            productMaster: 'مركز المنتجات والأسعار',\n            hr: 'الموارد البشرية'\n        };",
    "NEBRAS_PERMISSION_LABELS hr"
)

sub(
    "            productMaster: { icon: 'fas fa-database', descAr: 'تحديد أسماء المنتجات وأنواعها ومقاساتها وأسعارها — مصدر النظام الديناميكي' }\n        };",
    "            productMaster: { icon: 'fas fa-database', descAr: 'تحديد أسماء المنتجات وأنواعها ومقاساتها وأسعارها — مصدر النظام الديناميكي' },\n            hr: { icon: 'fas fa-people-roof', descAr: 'منصة HR — موظفون وعمال وسيارات وإجازات لكل الفروع' }\n        };",
    "NEBRAS_PERMISSION_META hr"
)

# HR role definition
sub(
    """            hr: {
                labelAr: 'موارد بشرية', labelEn: 'HR',
                icon: 'fas fa-id-badge', accent: '#7f8c8d',
                descAr: 'متابعة المستخدمين والتقارير الإدارية.',
                permissions: ['users', 'audit']
            },""",
    """            hr: {
                labelAr: 'موارد بشرية', labelEn: 'HR Manager',
                icon: 'fas fa-people-roof', accent: '#2980b9',
                descAr: 'منصة HR الداخلية — موظفون · عمال · سيارات · إجازات · كل الفروع (مثل Bayzat · Jisr).',
                permissions: ['hr', 'audit'],
                companyWide: true
            },""",
    "hr role definition"
)

# Manager gets hr access
sub(
    "                permissions: ['content', 'erp', 'inventory', 'warehouse', 'production', 'procurement', 'accounting', 'orders', 'sales', 'quotes', 'customerService', 'complaints', 'branches', 'audit']\n            },",
    "                permissions: ['content', 'erp', 'inventory', 'warehouse', 'production', 'procurement', 'accounting', 'orders', 'sales', 'quotes', 'customerService', 'complaints', 'branches', 'audit', 'hr']\n            },",
    "manager hr permission"
)

# ERP pillar + module
sub(
    """                { id: 'governance', nameAr: 'الحوكمة والتقارير', nameEn: 'Governance & BI' }
            ],""",
    """                { id: 'governance', nameAr: 'الحوكمة والتقارير', nameEn: 'Governance & BI' },
                { id: 'hr', nameAr: 'الموارد البشرية', nameEn: 'Human Resources' }
            ],""",
    "ERP hr pillar"
)

sub(
    """                { id: 'erp-executive-reports', pillar: 'governance', status: 'live', icon: 'fas fa-chart-bar', permission: 'audit', handler: 'openExecutiveReports', nameAr: 'التقارير التنفيذية', descAr: 'يومي · شهري · سنوي لصاحب الشركة', nameEn: 'Executive reports' }
            ]
        };""",
    """                { id: 'erp-executive-reports', pillar: 'governance', status: 'live', icon: 'fas fa-chart-bar', permission: 'audit', handler: 'openExecutiveReports', nameAr: 'التقارير التنفيذية', descAr: 'يومي · شهري · سنوي لصاحب الشركة', nameEn: 'Executive reports' },
                { id: 'erp-hr-platform', pillar: 'hr', status: 'live', icon: 'fas fa-people-roof', permission: 'hr', handler: 'openHrPlatform', nameAr: 'منصة الموارد البشرية', descAr: 'موظفون · عمال · سيارات · إجازات — كل الفروع', nameEn: 'HR platform' }
            ]
        };""",
    "ERP hr module"
)

# Benchmark
sub(
    """            { areaAr: 'صلاحيات وموظفين', areaEn: 'RBAC & admin', globalAr: 'أدوار · سجل عمليات', nebrasAr: 'يعمل — كامل', parity: 'high' },""",
    """            { areaAr: 'صلاحيات وموظفين', areaEn: 'RBAC & admin', globalAr: 'أدوار · سجل عمليات', nebrasAr: 'يعمل — كامل', parity: 'high' },
            { areaAr: 'موارد بشرية HR', areaEn: 'HR & payroll', globalAr: 'Bayzat · Jisr · Zein', nebrasAr: 'يعمل — موظفون وسيارات وإجازات', parity: 'mid' },""",
    "benchmark hr row"
)

# Dashboard tile
sub(
    """            { id: 'dash-aluminum-dept', zone: 'quick', dashGroup: 'command', sortOrder: 1.1, iconClass: 'fas fa-industry', titleAr: 'قسم الألومنيوم', titleEn: 'Aluminum Dept.', textAr: 'مخزون · إنتاج · عروض · طلبات ALU.', textEn: 'Aluminum ops only.', handler: 'openAluminumDepartment', permission: 'aluminum', visible: true },""",
    """            { id: 'dash-aluminum-dept', zone: 'quick', dashGroup: 'command', sortOrder: 1.1, iconClass: 'fas fa-industry', titleAr: 'قسم الألومنيوم', titleEn: 'Aluminum Dept.', textAr: 'مخزون · إنتاج · عروض · طلبات ALU.', textEn: 'Aluminum ops only.', handler: 'openAluminumDepartment', permission: 'aluminum', visible: true },
            { id: 'dash-hr-platform', zone: 'quick', dashGroup: 'command', sortOrder: 1.05, iconClass: 'fas fa-people-roof', titleAr: 'منصة الموارد البشرية', titleEn: 'HR Platform', textAr: 'موظفون · عمال · سيارات · إجازات — المقر وجميع الفروع.', textEn: 'Employees, fleet, leave — all branches.', handler: 'openHrPlatform', permission: 'hr', visible: true },""",
    "dashboard hr tile"
)

# DASHBOARD_HANDLER_MAP
sub(
    "            openAluminumDepartment: function() { openAluminumDepartment(); },",
    "            openAluminumDepartment: function() { openAluminumDepartment(); },\n            openHrPlatform: function() { if (typeof openHrPlatform === 'function') openHrPlatform(); },",
    "DASHBOARD_HANDLER_MAP hr"
)

# ADMIN_GOVERNANCE_TILE_REGISTRY
sub(
    "            { id: 'dash-aluminum-dept', publicEffect: 'تشغيل قسم الألومنيوم فقط', handler: 'openAluminumDepartment' },",
    "            { id: 'dash-aluminum-dept', publicEffect: 'تشغيل قسم الألومنيوم فقط', handler: 'openAluminumDepartment' },\n            { id: 'dash-hr-platform', publicEffect: 'سجلات الموظفين والسيارات والإجازات لكل الفروع', handler: 'openHrPlatform' },",
    "ADMIN_GOVERNANCE_TILE_REGISTRY hr"
)

# applyAdminPermissionsUI
sub(
    "                { id: 'aluminum-department', key: 'aluminum' }\n            ].forEach(function(block) {",
    "                { id: 'aluminum-department', key: 'aluminum' },\n                { id: 'hr-platform', key: 'hr' }\n            ].forEach(function(block) {",
    "applyAdminPermissionsUI hr-platform"
)

# canOpenErpModule - HR scope
sub(
    """            if (isAluminumDepartmentAdmin(currentAdmin)) {
                const allowed = ['erp-aluminum-dept', 'erp-inventory', 'erp-production', 'erp-warehouse-transfers', 'erp-quote-builder', 'erp-orders', 'erp-pricelist'];
                if (allowed.indexOf(mod.id) < 0) return false;
            }
            return true;""",
    """            if (isAluminumDepartmentAdmin(currentAdmin)) {
                const allowed = ['erp-aluminum-dept', 'erp-inventory', 'erp-production', 'erp-warehouse-transfers', 'erp-quote-builder', 'erp-orders', 'erp-pricelist'];
                if (allowed.indexOf(mod.id) < 0) return false;
            }
            if (typeof isHrDepartmentAdmin === 'function' && isHrDepartmentAdmin(currentAdmin)) {
                if (mod.id !== 'erp-hr-platform') return false;
            }
            return true;""",
    "canOpenErpModule hr"
)

# DASHBOARD_ROLE_FOCUS
sub(
    """            aluminum_manager: {
                greetingAr: 'مركز قسم الألومنيوم',
                descAr: 'مخزون · إنتاج · عروض · طلبات الألومنيوم — الأسعار من الإدارة الرئيسية.',
                scrollTo: 'erp-hub-panel',
                openHandler: 'openAluminumDepartment',
                hideSections: ['dashboard-company-identity', 'dashboard-partners-block', 'platform-hub-panel', 'dashboard-channels-panel', 'dashboard-occasion-panel', 'dashboard-official-hub']
            }
        };""",
    """            aluminum_manager: {
                greetingAr: 'مركز قسم الألومنيوم',
                descAr: 'مخزون · إنتاج · عروض · طلبات الألومنيوم — الأسعار من الإدارة الرئيسية.',
                scrollTo: 'erp-hub-panel',
                openHandler: 'openAluminumDepartment',
                hideSections: ['dashboard-company-identity', 'dashboard-partners-block', 'platform-hub-panel', 'dashboard-channels-panel', 'dashboard-occasion-panel', 'dashboard-official-hub']
            },
            hr: {
                greetingAr: 'منصة الموارد البشرية',
                descAr: 'إدارة الموظفين والعمال والسيارات والإجازات — المقر الرئيسي وجميع فروع المملكة.',
                scrollTo: 'erp-hub-panel',
                openHandler: 'openHrPlatform',
                hideSections: ['dashboard-company-identity', 'dashboard-partners-block', 'platform-hub-panel', 'dashboard-channels-panel', 'dashboard-occasion-panel', 'dashboard-official-hub', 'erp-hub-panel']
            }
        };""",
    "DASHBOARD_ROLE_FOCUS hr"
)

# getRoleQuickActions - remove hr from users, add HR platform
sub(
    "                { roles: ['superadmin', 'manager', 'hr'], icon: 'fas fa-users-cog', label: 'المستخدمون', handler: 'openUserManagement', perm: 'users' },",
    "                { roles: ['superadmin', 'manager'], icon: 'fas fa-users-cog', label: 'المستخدمون', handler: 'openUserManagement', perm: 'users' },",
    "quick actions remove hr from users"
)

sub(
    "                { roles: ['aluminum_manager'], icon: 'fas fa-industry', label: 'قسم الألومنيوم', handler: 'openAluminumDepartment', perm: 'aluminum' },",
    "                { roles: ['aluminum_manager'], icon: 'fas fa-industry', label: 'قسم الألومنيوم', handler: 'openAluminumDepartment', perm: 'aluminum' },\n                { roles: ['hr'], icon: 'fas fa-people-roof', label: 'منصة HR', handler: 'openHrPlatform', perm: 'hr' },\n                { roles: ['superadmin', 'manager'], icon: 'fas fa-people-roof', label: 'منصة HR', handler: 'openHrPlatform', perm: 'hr' },",
    "quick actions hr platform"
)

sub(
    "                if (item.handler === 'openAluminumDepartment' && !canManage('aluminum') && !isMainGovernanceAdmin()) return;",
    "                if (item.handler === 'openAluminumDepartment' && !canManage('aluminum') && !isMainGovernanceAdmin()) return;\n                if (item.handler === 'openHrPlatform' && typeof canAccessHrPlatform === 'function' && !canAccessHrPlatform()) return;",
    "quick actions hr filter"
)

# Cloud store specs
sub(
    """            { key: 'callback_leads', get: function() {
                return typeof getCallbackLeads === 'function' ? getCallbackLeads() : [];
            }, set: function(v) {""",
    """            { key: 'hr_employees', get: function() {
                return typeof getHrEmployees === 'function' ? getHrEmployees() : [];
            }, set: function(v) {
                if (typeof setHrEmployeesFromCloud === 'function') setHrEmployeesFromCloud(v);
            }},
            { key: 'hr_vehicles', get: function() {
                return typeof getHrVehicles === 'function' ? getHrVehicles() : [];
            }, set: function(v) {
                if (typeof setHrVehiclesFromCloud === 'function') setHrVehiclesFromCloud(v);
            }},
            { key: 'hr_leave', get: function() {
                return typeof getHrLeaveRequests === 'function' ? getHrLeaveRequests() : [];
            }, set: function(v) {
                if (typeof setHrLeaveFromCloud === 'function') setHrLeaveFromCloud(v);
            }},
            { key: 'callback_leads', get: function() {
                return typeof getCallbackLeads === 'function' ? getCallbackLeads() : [];
            }, set: function(v) {""",
    "NEBRAS_CLOUD_STORE_SPECS hr"
)

sub(
    "            const erpKeys = ['erp_inventory', 'erp_orders', 'erp_production', 'erp_purchases', 'erp_transfers', 'erp_stock_transfers', 'sales_price_list', 'sales_data', 'customer_service'];",
    "            const erpKeys = ['erp_inventory', 'erp_orders', 'erp_production', 'erp_purchases', 'erp_transfers', 'erp_stock_transfers', 'sales_price_list', 'sales_data', 'customer_service', 'hr_employees', 'hr_vehicles', 'hr_leave'];",
    "cloud erpKeys hr"
)

# finalizePlatformDataAfterLoad
sub(
    "            ensureAnalyticsGovernance();",
    "            ensureAnalyticsGovernance();\n            if (typeof ensureHrData === 'function') ensureHrData();",
    "finalizePlatformDataAfterLoad ensureHrData"
)

# window exports
sub(
    "        window.openAluminumDepartment = openAluminumDepartment;\n",
    "        window.openAluminumDepartment = openAluminumDepartment;\n        if (typeof openHrPlatform === 'function') window.openHrPlatform = openHrPlatform;\n",
    "window openHrPlatform export"
)

# NEBRAS_PLATFORM module (optional - add hr to platform modules list)
sub(
    """                { id: 'audit', status: 'live', icon: 'fas fa-clipboard-check', permission: 'audit', handler: 'openAuditLog', nameAr: 'سجل العمليات', descAr: 'تتبع كل إجراء إداري', nameEn: 'Audit log' },
                { id: 'system', status: 'live', icon: 'fas fa-sliders', superadminOnly: true, handler: 'openSystemSettings', nameAr: 'إعدادات المنصة', descAr: 'سجل تجاري، ضريبي، بنوك، احتفال', nameEn: 'Platform settings' }
            ]
        };""",
    """                { id: 'audit', status: 'live', icon: 'fas fa-clipboard-check', permission: 'audit', handler: 'openAuditLog', nameAr: 'سجل العمليات', descAr: 'تتبع كل إجراء إداري', nameEn: 'Audit log' },
                { id: 'hr', status: 'live', icon: 'fas fa-people-roof', permission: 'hr', handler: 'openHrPlatform', nameAr: 'الموارد البشرية', descAr: 'موظفون وسيارات وإجازات — كل الفروع', nameEn: 'HR platform' },
                { id: 'system', status: 'live', icon: 'fas fa-sliders', superadminOnly: true, handler: 'openSystemSettings', nameAr: 'إعدادات المنصة', descAr: 'سجل تجاري، ضريبي، بنوك، احتفال', nameEn: 'Platform settings' }
            ]
        };""",
    "NEBRAS_PLATFORM hr module"
)

if text != original:
    with open(JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print('PATCH COMPLETE')
else:
    print('NO CHANGES')
