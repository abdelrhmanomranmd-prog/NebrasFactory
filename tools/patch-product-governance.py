# -*- coding: utf-8 -*-
"""Apply remaining product governance patches to nebras-platform.js"""
from pathlib import Path

path = Path(__file__).resolve().parent.parent / "js" / "nebras-platform.js"
text = path.read_text(encoding="utf-8")
original = text

def sub(old, new, label, count=1):
    global text
    if old not in text:
        raise SystemExit(f"MISSING [{label}]: snippet not found")
    text = text.replace(old, new, count)
    print(f"OK: {label}")

# --- Sales price list ---
sub(
    """        function openSalesPriceList() {
            if (!requirePermission('sales', 'صلاحية المبيعات مطلوبة.')) return;
            ensureErpOperationsData();
            renderSalesPriceListForm();
            displaySalesPriceList();
            document.getElementById('sales-pricelist').classList.add('show');
        }""",
    """        function openSalesPriceList() {
            if (!requirePermission('sales', 'صلاحية المبيعات مطلوبة.') && !canManage('aluminum')) return;
            ensureErpOperationsData();
            if (!salesPriceList.length || !salesPriceList.some(function(x) { return x.syncedFromMaster; })) {
                syncSalesPriceListFromProductMaster();
            }
            renderSalesPriceListForm();
            displaySalesPriceList();
            document.getElementById('sales-pricelist').classList.add('show');
        }""",
    "openSalesPriceList"
)

sub(
    """        function renderSalesPriceListForm() {
            const host = document.getElementById('sales-pricelist-form');
            if (!host) return;
            host.innerHTML =
                '<div class="erp-form-grid">' +""",
    """        function renderSalesPriceListForm() {
            const host = document.getElementById('sales-pricelist-form');
            if (!host) return;
            if (!isMainGovernanceAdmin()) {
                host.innerHTML = '<p class="product-master-price-readonly"><i class="fas fa-crown"></i> الأسعار والأصناف تُحدَّد من <strong>مركز المنتجات والأسعار</strong> (الإدارة الرئيسية) وتظهر هنا تلقائياً.</p>';
                return;
            }
            host.innerHTML =
                '<div class="erp-form-grid">' +""",
    "renderSalesPriceListForm"
)

sub(
    "        function addPriceListItem() {\n            if (!requirePermission('sales')) return;",
    "        function addPriceListItem() {\n            if (!requireProductMasterGovernance('إضافة الأسعار — من مركز المنتجات فقط.')) return;",
    "addPriceListItem"
)

sub(
    "        function deletePriceListItem(id) {\n            if (!requirePermission('sales')) return;",
    "        function deletePriceListItem(id) {\n            if (!requireProductMasterGovernance('حذف الأسعار — من مركز المنتجات فقط.')) return;",
    "deletePriceListItem"
)

sub(
    """        function displaySalesPriceList() {
            const list = document.getElementById('sales-pricelist-list');
            if (!list) return;
            ensureErpOperationsData();
            const summary = document.getElementById('sales-pricelist-summary');
            if (summary) {
                summary.innerHTML = '<div class="erp-stat"><strong>' + salesPriceList.length + '</strong><span>أصناف معتمدة للبيع</span></div>';
            }
            if (!salesPriceList.length) {
                list.innerHTML = '<p class="erp-empty">لا أصناف بعد — مدير المبيعات يحدد المنتجات والأسعار التي يعمل عليها المندوبون.</p>';
                return;
            }
            list.innerHTML = salesPriceList.map(function(it) {
                return '<article class="erp-row">' +
                    '<div class="erp-row-main"><strong>' + escapeHtmlAttr(it.productAr) + '</strong>' +
                        '<span class="erp-row-tags">' +
                            (it.sku ? '<span class="erp-tag">' + escapeHtmlAttr(it.sku) + '</span>' : '') +
                            (it.color ? '<span class="erp-tag">' + escapeHtmlAttr(it.color) + '</span>' : '') +
                            (it.size ? '<span class="erp-tag">' + escapeHtmlAttr(it.size) + '</span>' : '') +
                        '</span>' +
                        '<small>المدى المسموح: ' + formatSar(it.minPrice) + ' — ' + formatSar(it.maxPrice) + '</small>' +
                    '</div>' +
                    '<div class="erp-row-qty">' + formatSar(it.basePrice) + '</div>' +
                    '<button type="button" class="erp-row-del" onclick="deletePriceListItem(\\'' + it.id + '\\')" aria-label="حذف"><i class="fas fa-trash"></i></button>' +
                '</article>';
            }).join('');
        }""",
    """        function displaySalesPriceList() {
            const list = document.getElementById('sales-pricelist-list');
            if (!list) return;
            ensureErpOperationsData();
            const visible = getEffectiveSalesPriceList(currentAdmin);
            const synced = visible.filter(function(x) { return x.syncedFromMaster; }).length;
            const summary = document.getElementById('sales-pricelist-summary');
            if (summary) {
                summary.innerHTML =
                    '<div class="erp-stat"><strong>' + visible.length + '</strong><span>أصناف معتمدة</span></div>' +
                    '<div class="erp-stat erp-stat--accent"><strong>' + synced + '</strong><span>من مركز المنتجات</span></div>';
            }
            if (!visible.length) {
                list.innerHTML = '<p class="erp-empty">لا أصناف بعد — الإدارة الرئيسية تحددها من مركز المنتجات والأسعار.</p>';
                return;
            }
            list.innerHTML = visible.map(function(it) {
                return '<article class="erp-row">' +
                    '<div class="erp-row-main"><strong>' + escapeHtmlAttr(it.productAr) + '</strong>' +
                        '<span class="erp-row-tags">' +
                            (it.sku ? '<span class="erp-tag">' + escapeHtmlAttr(it.sku) + '</span>' : '') +
                            (it.color ? '<span class="erp-tag">' + escapeHtmlAttr(it.color) + '</span>' : '') +
                            (it.size ? '<span class="erp-tag">' + escapeHtmlAttr(it.size) + '</span>' : '') +
                            (it.syncedFromMaster ? '<span class="erp-tag erp-tag--ok">⟳ ديناميكي</span>' : '') +
                        '</span>' +
                        '<small>المدى المسموح: ' + formatSar(it.minPrice) + ' — ' + formatSar(it.maxPrice) + '</small>' +
                    '</div>' +
                    '<div class="erp-row-qty">' + formatSar(it.basePrice) + '</div>' +
                    (isMainGovernanceAdmin() && !it.syncedFromMaster
                        ? '<button type="button" class="erp-row-del" onclick="deletePriceListItem(\\'' + it.id + '\\')" aria-label="حذف"><i class="fas fa-trash"></i></button>'
                        : '') +
                '</article>';
            }).join('');
        }""",
    "displaySalesPriceList"
)

sub(
    """        function openRepQuoteBuilder() {
            if (!requirePermission('quotes', 'صلاحية عروض الأسعار مطلوبة.')) return;
            ensureErpOperationsData();
            if (!salesPriceList.length) {
                alert('لا توجد قائمة أسعار بعد — يحددها مدير المبيعات أولاً من وحدة "قائمة الأسعار".');
            }""",
    """        function openRepQuoteBuilder() {
            if (!requirePermission('quotes', 'صلاحية عروض الأسعار مطلوبة.') && !canManage('aluminum')) return;
            ensureErpOperationsData();
            if (!getEffectiveSalesPriceList(currentAdmin).length) {
                alert('لا توجد قائمة أسعار — الإدارة الرئيسية تحددها من مركز المنتجات والأسعار.');
            }""",
    "openRepQuoteBuilder"
)

sub(
    """            ensureErpOperationsData();
            const opts = salesPriceList.map(function(it) {
                return '<option value="' + it.id + '">' + escapeHtmlAttr(it.productAr + ' ' + (it.color || '') + ' ' + (it.size || '')) + ' — ' + formatSar(it.basePrice) + '</option>';
            }).join('');""",
    """            ensureErpOperationsData();
            const priceList = getEffectiveSalesPriceList(currentAdmin);
            const opts = priceList.map(function(it) {
                return '<option value="' + it.id + '">' + escapeHtmlAttr(it.productAr + ' ' + (it.color || '') + ' ' + (it.size || '')) + ' — ' + formatSar(it.basePrice) + '</option>';
            }).join('');""",
    "renderRepQuoteBuilder opts"
)

sub(
    """            const it = salesPriceList.find(function(x) { return x.id === id; });
            if (!it) { alert('اختر صنفاً من القائمة.'); return; }""",
    """            const it = getEffectiveSalesPriceList(currentAdmin).find(function(x) { return x.id === id; });
            if (!it) { alert('اختر صنفاً من القائمة.'); return; }""",
    "addRepQuoteLine find"
)

# --- displayErpInventory filter ---
sub(
    """        function displayErpInventory() {
            const list = document.getElementById('erp-inventory-list');
            if (!list) return;
            ensureBuiltinErpData();
            const lang = currentLang || 'ar';
            const lowCount = erpInventory.filter(function(i) { return Number(i.qty) <= Number(i.minQty || 0); }).length;
            const summary = document.getElementById('erp-inventory-summary');
            if (summary) {
                summary.innerHTML =
                    '<div class="erp-stat"><strong>' + erpInventory.length + '</strong><span>أصناف SKU</span></div>' +
                    '<div class="erp-stat' + (lowCount ? ' erp-stat--alert' : '') + '"><strong>' + lowCount + '</strong><span>تحت الحد الأدنى</span></div>' +
                    '<div class="erp-stat"><strong>' + getErpWarehouseOptions().length + '</strong><span>مستودعات</span></div>';
            }
            if (!erpInventory.length) {
                list.innerHTML = '<p class="erp-empty">لا أصناف — أضيفوا SKU من النموذج أعلاه.</p>';
                return;
            }
            list.innerHTML = erpInventory.map(function(item) {""",
    """        function displayErpInventory() {
            const list = document.getElementById('erp-inventory-list');
            if (!list) return;
            ensureBuiltinErpData();
            const visible = filterErpEntriesForAdmin(erpInventory, currentAdmin);
            const lang = currentLang || 'ar';
            const lowCount = visible.filter(function(i) { return Number(i.qty) <= Number(i.minQty || 0); }).length;
            const deptNote = getAdminDepartmentProductId(currentAdmin) ? ' — قسم محدود' : '';
            const summary = document.getElementById('erp-inventory-summary');
            if (summary) {
                summary.innerHTML =
                    '<div class="erp-stat"><strong>' + visible.length + '</strong><span>أصناف SKU' + deptNote + '</span></div>' +
                    '<div class="erp-stat' + (lowCount ? ' erp-stat--alert' : '') + '"><strong>' + lowCount + '</strong><span>تحت الحد الأدنى</span></div>' +
                    '<div class="erp-stat"><strong>' + getErpWarehouseOptions().length + '</strong><span>مستودعات</span></div>';
            }
            if (!visible.length) {
                list.innerHTML = '<p class="erp-empty">لا أصناف — أضيفوا SKU من النموذج أعلاه.</p>';
                return;
            }
            list.innerHTML = visible.map(function(item) {""",
    "displayErpInventory"
)

# --- manageProductVariants panel refresh ---
sub(
    """            saveContentData();
            displaySiteProductsAdmin();
            addAuditLog('أسعار المنتج', product.titleAr || productId);
        }

        function cloudLoadWithTimeout(ms) {""",
    """            saveContentData();
            displaySiteProductsAdmin();
            if (document.getElementById('product-master-hub') && document.getElementById('product-master-hub').classList.contains('show')) {
                renderProductMasterPanel();
            }
            addAuditLog('أسعار المنتج', product.titleAr || productId);
        }

        function cloudLoadWithTimeout(ms) {""",
    "manageProductVariants refresh"
)

# --- applyAdminPermissionsUI ---
sub(
    """                { id: 'branch-team-management', key: null, branchTeamOnly: true }
            ].forEach(function(block) {
                const el = document.getElementById(block.id);
                if (!el) return;
                if (!logged) {
                    el.classList.remove('show');
                    return;
                }
                if (block.superOnly && !isSuper) el.classList.remove('show');
                if (block.branchTeamOnly && !canManageBranchTeam()) el.classList.remove('show');
                if (block.key && !perm(block.key)) el.classList.remove('show');
            });""",
    """                { id: 'branch-team-management', key: null, branchTeamOnly: true },
                { id: 'product-master-hub', key: null, productMasterOnly: true },
                { id: 'aluminum-department', key: 'aluminum' }
            ].forEach(function(block) {
                const el = document.getElementById(block.id);
                if (!el) return;
                if (!logged) {
                    el.classList.remove('show');
                    return;
                }
                if (block.superOnly && !isSuper) el.classList.remove('show');
                if (block.branchTeamOnly && !canManageBranchTeam()) el.classList.remove('show');
                if (block.productMasterOnly && !isMainGovernanceAdmin()) el.classList.remove('show');
                if (block.id === 'sales-pricelist' && !(perm('sales') || perm('aluminum'))) el.classList.remove('show');
                else if (block.id === 'rep-quote-builder' && !(perm('quotes') || perm('aluminum'))) el.classList.remove('show');
                else if (block.key && !perm(block.key)) el.classList.remove('show');
            });""",
    "applyAdminPermissionsUI"
)

# --- canOpenErpModule aluminum scope ---
sub(
    """        function canOpenErpModule(mod) {
            if (!mod || !currentAdmin) return false;
            if (mod.status === 'planned') return false;
            if (mod.permission && !canManage(mod.permission)) return false;
            return true;
        }""",
    """        function canOpenErpModule(mod) {
            if (!mod || !currentAdmin) return false;
            if (mod.status === 'planned') return false;
            if (mod.permission && !canManage(mod.permission)) return false;
            if (isAluminumDepartmentAdmin(currentAdmin)) {
                const allowed = ['erp-aluminum-dept', 'erp-inventory', 'erp-production', 'erp-warehouse-transfers', 'erp-quote-builder', 'erp-orders', 'erp-pricelist'];
                if (allowed.indexOf(mod.id) < 0) return false;
            }
            return true;
        }""",
    "canOpenErpModule"
)

# --- ERP modules ---
sub(
    """                { id: 'erp-catalog', pillar: 'master', status: 'live', icon: 'fas fa-database', permission: 'content', handler: 'openSiteContentManager', nameAr: 'كتالوج المنتجات', descAr: 'ربط المتجر بالمواد', nameEn: 'Product master' },
                { id: 'erp-production', pillar: 'supply', status: 'live', icon: 'fas fa-industry', permission: 'production', handler: 'openErpProduction', nameAr: 'الإنتاج اليومي', descAr: 'كميات الإنتاج المتاحة', nameEn: 'Production' },""",
    """                { id: 'erp-product-master', pillar: 'master', status: 'live', icon: 'fas fa-database', permission: 'productMaster', handler: 'openProductMasterHub', nameAr: 'مركز المنتجات والأسعار', descAr: 'مصدر ديناميكي — أسماء · أنواع · مقاسات · أسعار', nameEn: 'Product & pricing hub' },
                { id: 'erp-aluminum-dept', pillar: 'supply', status: 'live', icon: 'fas fa-industry', permission: 'aluminum', handler: 'openAluminumDepartment', nameAr: 'قسم الألومنيوم', descAr: 'مخزون · إنتاج · عروض ALU فقط', nameEn: 'Aluminum department' },
                { id: 'erp-catalog', pillar: 'master', status: 'live', icon: 'fas fa-database', permission: 'content', handler: 'openSiteContentManager', nameAr: 'كتالوج المنتجات', descAr: 'صور ومحتوى المتجر', nameEn: 'Store catalogue' },
                { id: 'erp-production', pillar: 'supply', status: 'live', icon: 'fas fa-industry', permission: 'production', handler: 'openErpProduction', nameAr: 'الإنتاج اليومي', descAr: 'كميات الإنتاج المتاحة', nameEn: 'Production' },""",
    "NEBRAS_ERP modules"
)

sub(
    """                { id: 'erp-pricelist', pillar: 'commerce', status: 'live', icon: 'fas fa-tags', permission: 'sales', handler: 'openSalesPriceList', nameAr: 'قائمة الأسعار', descAr: 'يحددها مدير المبيعات', nameEn: 'Price list' },""",
    """                { id: 'erp-pricelist', pillar: 'commerce', status: 'live', icon: 'fas fa-tags', permission: 'sales', handler: 'openSalesPriceList', nameAr: 'قائمة الأسعار', descAr: 'مزامَنة من مركز المنتجات', nameEn: 'Price list' },""",
    "erp-pricelist desc"
)

# --- Dashboard tile ---
sub(
    """            { id: 'dash-content', zone: 'quick', dashGroup: 'command', sortOrder: 1, iconClass: 'fas fa-pen-to-square', titleAr: 'إدارة محتوى الموقع', titleEn: 'Site Content', textAr: 'منتجات، بوابة الزائر، شركاء، شهادات — ديناميكي بالكامل.', textEn: 'Products, gateway icons, partners, certs — fully dynamic.', handler: 'openSiteContentManager', permission: 'content', visible: true },
            { id: 'dash-about-pages', zone: 'quick', dashGroup: 'command', sortOrder: 2, iconClass: 'fas fa-building', titleAr: 'من نحن ورؤيتنا', titleEn: 'About & Vision', textAr: 'نصوص المصنع ووثائق الصفحات الداخلية.', textEn: 'Factory pages and documents.', handler: 'openAboutContentAdmin', permission: 'content', visible: true },""",
    """            { id: 'dash-product-master', zone: 'quick', dashGroup: 'command', sortOrder: 0.9, iconClass: 'fas fa-database', titleAr: 'مركز المنتجات والأسعار', titleEn: 'Product Master', textAr: 'أسماء · أنواع · مقاسات · أسعار — مصدر النظام الديناميكي.', textEn: 'Names, types, sizes, prices — single source of truth.', handler: 'openProductMasterHub', permission: 'productMaster', superadminOnly: true, visible: true },
            { id: 'dash-aluminum-dept', zone: 'quick', dashGroup: 'command', sortOrder: 1.1, iconClass: 'fas fa-industry', titleAr: 'قسم الألومنيوم', titleEn: 'Aluminum Dept.', textAr: 'مخزون · إنتاج · عروض · طلبات ALU.', textEn: 'Aluminum ops only.', handler: 'openAluminumDepartment', permission: 'aluminum', visible: true },
            { id: 'dash-content', zone: 'quick', dashGroup: 'command', sortOrder: 1, iconClass: 'fas fa-pen-to-square', titleAr: 'إدارة محتوى الموقع', titleEn: 'Site Content', textAr: 'منتجات، بوابة الزائر، شركاء، شهادات — ديناميكي بالكامل.', textEn: 'Products, gateway icons, partners, certs — fully dynamic.', handler: 'openSiteContentManager', permission: 'content', visible: true },
            { id: 'dash-about-pages', zone: 'quick', dashGroup: 'command', sortOrder: 2, iconClass: 'fas fa-building', titleAr: 'من نحن ورؤيتنا', titleEn: 'About & Vision', textAr: 'نصوص المصنع ووثائق الصفحات الداخلية.', textEn: 'Factory pages and documents.', handler: 'openAboutContentAdmin', permission: 'content', visible: true },""",
    "dashboard tiles"
)

# --- DASHBOARD_ROLE_FOCUS ---
sub(
    """            branch_manager: {
                greetingAr: 'مركز إدارة الفرع',
                descAr: 'مبيعات وعروض وخدمة عملاء وشكاوى فرعك فقط.',
                scrollTo: 'erp-hub-panel',
                hideSections: ['dashboard-company-identity', 'dashboard-partners-block']
            }
        };""",
    """            branch_manager: {
                greetingAr: 'مركز إدارة الفرع',
                descAr: 'مبيعات وعروض وخدمة عملاء وشكاوى فرعك فقط.',
                scrollTo: 'erp-hub-panel',
                hideSections: ['dashboard-company-identity', 'dashboard-partners-block']
            },
            aluminum_manager: {
                greetingAr: 'مركز قسم الألومنيوم',
                descAr: 'مخزون · إنتاج · عروض · طلبات الألومنيوم — الأسعار من الإدارة الرئيسية.',
                scrollTo: 'erp-hub-panel',
                openHandler: 'openAluminumDepartment',
                hideSections: ['dashboard-company-identity', 'dashboard-partners-block', 'platform-hub-panel', 'dashboard-channels-panel', 'dashboard-occasion-panel', 'dashboard-official-hub']
            }
        };""",
    "DASHBOARD_ROLE_FOCUS"
)

# --- getRoleQuickActions ---
sub(
    """                { roles: ['superadmin', 'manager'], icon: 'fas fa-paint-roller', label: 'محتوى الموقع', handler: 'openSiteContentManager', perm: 'content' },
                { roles: ['superadmin', 'manager'], icon: 'fas fa-cloud-upload-alt', label: 'رفع وسائط', handler: 'openNebrasMediaHubQuick', perm: 'content' },""",
    """                { roles: ['superadmin'], icon: 'fas fa-database', label: 'مركز المنتجات', handler: 'openProductMasterHub', perm: null },
                { roles: ['aluminum_manager'], icon: 'fas fa-industry', label: 'قسم الألومنيوم', handler: 'openAluminumDepartment', perm: 'aluminum' },
                { roles: ['superadmin', 'manager'], icon: 'fas fa-paint-roller', label: 'محتوى الموقع', handler: 'openSiteContentManager', perm: 'content' },
                { roles: ['superadmin', 'manager'], icon: 'fas fa-cloud-upload-alt', label: 'رفع وسائط', handler: 'openNebrasMediaHubQuick', perm: 'content' },""",
    "getRoleQuickActions"
)

sub(
    """                if (item.handler === 'openBranchTeamManagement' && !canManageBranchTeam()) return;
                if (item.handler === 'openExecutiveReports' && !canViewExecutiveReports()) return;
                if (item.perm && !canManage(item.perm)) return;""",
    """                if (item.handler === 'openBranchTeamManagement' && !canManageBranchTeam()) return;
                if (item.handler === 'openExecutiveReports' && !canViewExecutiveReports()) return;
                if (item.handler === 'openProductMasterHub' && !isMainGovernanceAdmin()) return;
                if (item.handler === 'openAluminumDepartment' && !canManage('aluminum') && !isMainGovernanceAdmin()) return;
                if (item.perm && !canManage(item.perm)) return;""",
    "getRoleQuickActions filter"
)

# --- DASHBOARD_HANDLER_MAP ---
sub(
    """            openErpProcurement: function() { openErpProcurement(); },
            scrollErpHub: function() { scrollErpHub(); },""",
    """            openErpProcurement: function() { openErpProcurement(); },
            openProductMasterHub: function() { openProductMasterHub(); },
            openAluminumDepartment: function() { openAluminumDepartment(); },
            openExecutiveReports: function() { openExecutiveReports(); },
            syncPlatformFromProductMaster: function() { syncPlatformFromProductMaster(); },
            scrollErpHub: function() { scrollErpHub(); },""",
    "DASHBOARD_HANDLER_MAP"
)

# --- finalizePlatformDataAfterLoad sync ---
sub(
    """            ensureAnalyticsGovernance();
            adminUsers = (Array.isArray(adminUsers) ? adminUsers : []).map(function(user, index) {""",
    """            ensureAnalyticsGovernance();
            if (typeof syncSalesPriceListFromProductMaster === 'function') {
                syncSalesPriceListFromProductMaster();
                syncDoorDesignerCatalogFromProductMaster();
            }
            adminUsers = (Array.isArray(adminUsers) ? adminUsers : []).map(function(user, index) {""",
    "finalizePlatformDataAfterLoad"
)

# --- window exports ---
sub(
    """        window.exportErpOrdersCsv = exportErpOrdersCsv;

""",
    """        window.exportErpOrdersCsv = exportErpOrdersCsv;
        window.openProductMasterHub = openProductMasterHub;
        window.syncPlatformFromProductMaster = syncPlatformFromProductMaster;
        window.openAluminumDepartment = openAluminumDepartment;

""",
    "window exports"
)

# --- ADMIN_GOVERNANCE registry ---
sub(
    """            { id: 'dash-content', publicEffect: 'منتجات المتجر · أيقونات الزوار · أقسام إضافية', handler: 'openSiteContentManager' },
            { id: 'dash-about-pages', publicEffect: 'بطاقات من نحن / رؤيتنا + محتوى داخلي', handler: 'openAboutContentAdmin' },""",
    """            { id: 'dash-product-master', publicEffect: 'أسماء · أنواع · مقاسات · أسعار — مصدر ديناميكي للنظام', handler: 'openProductMasterHub' },
            { id: 'dash-aluminum-dept', publicEffect: 'تشغيل قسم الألومنيوم فقط', handler: 'openAluminumDepartment' },
            { id: 'dash-content', publicEffect: 'منتجات المتجر · أيقونات الزوار · أقسام إضافية', handler: 'openSiteContentManager' },
            { id: 'dash-about-pages', publicEffect: 'بطاقات من نحن / رؤيتنا + محتوى داخلي', handler: 'openAboutContentAdmin' },""",
    "ADMIN_GOVERNANCE_TILE_REGISTRY"
)

if text == original:
    raise SystemExit("No changes applied")
path.write_text(text, encoding="utf-8")
print("PATCH COMPLETE")
