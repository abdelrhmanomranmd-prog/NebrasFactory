/**
 * نبراس — مركز قيادة ERP والعمليات
 * لوحة موحّدة: مخزون · طلبات · إنتاج · مشتريات · مبيعات · تحويلات
 */
(function(global) {
    'use strict';

    const ERP_MODULES = [
        { id: 'inventory', icon: 'fas fa-warehouse', label: 'المخزون والمستودع', desc: 'SKU · كميات · تنبيهات', handler: 'openErpInventory', perm: 'inventory' },
        { id: 'orders', icon: 'fas fa-clipboard-list', label: 'طلبات OMS', desc: 'أوامر العملاء والإنتاج', handler: 'openErpOrders', perm: 'erp' },
        { id: 'production', icon: 'fas fa-industry', label: 'الإنتاج WPC', desc: 'مخرجات يومية · خطوط', handler: 'openErpProduction', perm: 'production' },
        { id: 'procurement', icon: 'fas fa-truck-ramp-box', label: 'المشتريات SCM', desc: 'أوامر شراء · موردون', handler: 'openErpProcurement', perm: 'procurement' },
        { id: 'transfers', icon: 'fas fa-dolly', label: 'تحويلات المستودع', desc: 'بين الفروع والمخازن', handler: 'openErpWarehouseTransfers', perm: 'warehouse' },
        { id: 'sales', icon: 'fas fa-file-invoice-dollar', label: 'المبيعات والفواتير', desc: 'عروض · مبيعات · A4', handler: 'openSalesManagement', perm: 'sales' },
        { id: 'pricelist', icon: 'fas fa-tags', label: 'قائمة الأسعار', desc: 'أسعار المنتجات', handler: 'openSalesPriceList', perm: 'sales' },
        { id: 'products', icon: 'fas fa-cubes', label: 'كتالوج المنتجات', desc: 'Master SKU · متغيرات', handler: 'openProductMasterHub', perm: 'storeCatalog' },
        { id: 'wpc', icon: 'fas fa-door-open', label: 'قسم WPC', desc: 'أبواب · إنتاج', handler: 'openWpcProductionDepartment', perm: 'production' },
        { id: 'alu', icon: 'fas fa-border-all', label: 'قسم الألومنيوم', desc: 'منتجات ALU', handler: 'openAluminumDepartment', perm: 'aluminum' },
        { id: 'journey', icon: 'fas fa-route', label: 'مسار نبراس', desc: 'رحلة العميل', handler: 'openOrderJourneyOps', perm: 'orderJourney' },
        { id: 'accounting', icon: 'fas fa-calculator', label: 'الحسابات', desc: 'تحويلات · PDF', handler: 'openAccountingPlatform', perm: 'accounting' }
    ];

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function readJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) { return fallback; }
    }

    function getErpCommandKpis() {
        if (typeof global.getErpKpis === 'function') return global.getErpKpis();
        const inv = readJson('nebrasErpInventory', []);
        const orders = readJson('nebrasErpOrders', []);
        const prod = readJson('nebrasErpProduction', []);
        const purch = readJson('nebrasErpPurchases', []);
        const low = (inv || []).filter(function(i) {
            return Number(i.qty) <= Number(i.minQty || 0);
        }).length;
        return {
            skuCount: (inv || []).length,
            lowStock: low,
            ordersCount: (orders || []).length,
            productionCount: (prod || []).length,
            purchasesCount: (purch || []).length,
            salesCount: (readJson('nebrasSalesData', []) || []).length
        };
    }

    function canOpenErpModule(mod) {
        const admin = typeof global.getNebrasCurrentAdmin === 'function' ? global.getNebrasCurrentAdmin() : null;
        if (!admin) return false;
        if (typeof global.isMainGovernanceAdmin === 'function' && global.isMainGovernanceAdmin(admin)) return true;
        if (typeof global.canManage === 'function' && mod.perm) return global.canManage(mod.perm, admin);
        return true;
    }

    function requireErpCommandAccess() {
        const admin = typeof global.getNebrasCurrentAdmin === 'function' ? global.getNebrasCurrentAdmin() : null;
        if (!admin) { alert('سجّل الدخول للإدارة أولاً.'); return false; }
        const ok = ERP_MODULES.some(function(m) { return canOpenErpModule(m); });
        if (!ok) { alert('صلاحية ERP غير متاحة لحسابك.'); return false; }
        return true;
    }

    function runErpHandler(handler) {
        if (!handler || typeof global[handler] !== 'function') {
            alert('الوحدة غير متاحة — أعيدي تحميل الصفحة.');
            return;
        }
        try { global[handler](); } catch (e) { console.error(handler, e); alert('تعذّر فتح الوحدة.'); }
    }

    function renderErpCommandDashboard() {
        const k = getErpCommandKpis();
        const modules = ERP_MODULES.filter(function(m) { return canOpenErpModule(m); });
        const scope = typeof global.getNebrasCurrentAdmin === 'function' && global.getNebrasCurrentAdmin()
            ? (global.getNebrasCurrentAdmin().assignedBranchCity || 'المقر — كل الفروع')
            : '—';
        const cards = modules.map(function(m) {
            return '<article class="dept-module-card" role="button" tabindex="0" onclick="runErpModuleHandler(\'' + esc(m.handler) + '\')">' +
                '<i class="' + m.icon + '"></i>' +
                '<strong>' + esc(m.label) + '</strong>' +
                '<small>' + esc(m.desc) + '</small></article>';
        }).join('');
        return '<div class="erp-command-hero dept-command-hero">' +
            '<div class="erp-command-hero-glow dept-command-hero-glow"></div>' +
            '<div class="erp-command-hero-inner">' +
                '<span class="hr-command-pill erp-pill"><i class="fas fa-cubes"></i> مركز عمليات ERP</span>' +
                '<h2 class="dept-command-title">المخزون · الإنتاج · المشتريات · المبيعات</h2>' +
                '<p class="dept-command-sub">لوحة قيادة شاملة لمصنع نبراس — ' + esc(scope) + ' · كل وحدة مرتبطة بالسحابة</p>' +
            '</div></div>' +
            '<div class="dept-scope-banner"><i class="fas fa-cloud"></i> الحفظ والرفع تلقائي — البيانات محمية بنسخ احتياطية</div>' +
            '<div class="dept-kpi-ring hr-command-kpi-ring">' +
                '<div class="dept-kpi"><strong>' + k.skuCount + '</strong><span>أصناف SKU</span></div>' +
                '<div class="dept-kpi' + (k.lowStock ? ' dept-kpi--warn' : '') + '"><strong>' + k.lowStock + '</strong><span>تنبيه مخزون</span></div>' +
                '<div class="dept-kpi"><strong>' + k.ordersCount + '</strong><span>طلبات OMS</span></div>' +
                '<div class="dept-kpi"><strong>' + k.productionCount + '</strong><span>سجلات إنتاج</span></div>' +
                '<div class="dept-kpi"><strong>' + k.purchasesCount + '</strong><span>مشتريات</span></div>' +
                '<div class="dept-kpi dept-kpi--ok"><strong>' + k.salesCount + '</strong><span>مبيعات</span></div>' +
            '</div>' +
            '<div class="dept-quick-row hr-command-quick-row">' +
                '<button type="button" class="hr-command-quick-btn" onclick="runErpModuleHandler(\'openErpInventory\')"><i class="fas fa-warehouse"></i> المخزون</button>' +
                '<button type="button" class="hr-command-quick-btn" onclick="runErpModuleHandler(\'openErpOrders\')"><i class="fas fa-clipboard-list"></i> الطلبات</button>' +
                '<button type="button" class="hr-command-quick-btn" onclick="runErpModuleHandler(\'openErpProduction\')"><i class="fas fa-industry"></i> الإنتاج</button>' +
                '<button type="button" class="hr-command-quick-btn" onclick="runErpModuleHandler(\'openSalesManagement\')"><i class="fas fa-file-invoice"></i> المبيعات</button>' +
                '<button type="button" class="hr-command-quick-btn" onclick="typeof openCloudGovernance===\'function\'&&openCloudGovernance()"><i class="fas fa-cloud"></i> السحابة</button>' +
            '</div>' +
            '<h4 class="hr-tracking-section-title"><i class="fas fa-th-large"></i> وحدات ERP — اختاري القسم</h4>' +
            '<div class="dept-module-grid">' + (cards || '<p class="erp-empty">لا وحدات متاحة لصلاحياتك</p>') + '</div>';
    }

    function renderErpCommandPanel() {
        const content = document.getElementById('erp-command-content');
        const summary = document.getElementById('erp-command-summary');
        if (summary) {
            const k = getErpCommandKpis();
            summary.innerHTML =
                '<div class="erp-stat erp-stat--accent"><strong>' + k.skuCount + '</strong><span>SKU</span></div>' +
                '<div class="erp-stat' + (k.lowStock ? ' erp-stat--danger' : '') + '"><strong>' + k.lowStock + '</strong><span>تنبيه مخزون</span></div>' +
                '<div class="erp-stat"><strong>' + k.ordersCount + '</strong><span>طلبات</span></div>' +
                '<div class="erp-stat erp-stat--ok"><strong>' + k.productionCount + '</strong><span>إنتاج</span></div>';
        }
        const pill = document.getElementById('erp-ws-user-pill');
        if (pill) {
            const u = typeof global.getNebrasCurrentAdmin === 'function' ? global.getNebrasCurrentAdmin() : null;
            pill.textContent = u ? u.username : '';
        }
        if (content) content.innerHTML = '<div class="hr-panel is-active">' + renderErpCommandDashboard() + '</div>';
    }

    function showErpCommandShell() {
        const el = document.getElementById('erp-command-center');
        if (!el) { alert('مركز ERP غير موجود — أعيدي تحميل الصفحة.'); return false; }
        if (typeof global.closeAllAdminSections === 'function') {
            document.querySelectorAll('.admin-section.show').forEach(function(n) {
                if (n.id !== 'erp-command-center') { n.classList.remove('show'); n.setAttribute('aria-hidden', 'true'); }
            });
        }
        el.classList.add('show');
        el.setAttribute('aria-hidden', 'false');
        document.body.classList.add('erp-command-open');
        if (typeof global.syncPlatformInteractionLayers === 'function') global.syncPlatformInteractionLayers();
        return true;
    }

    function closeErpCommandCenter() {
        const el = document.getElementById('erp-command-center');
        if (el) { el.classList.remove('show'); el.setAttribute('aria-hidden', 'true'); }
        document.body.classList.remove('erp-command-open');
        const dash = document.getElementById('admin-dashboard');
        if (dash && typeof global.getNebrasCurrentAdmin === 'function' && global.getNebrasCurrentAdmin()) {
            dash.classList.add('show');
            dash.removeAttribute('hidden');
            dash.setAttribute('aria-hidden', 'false');
        }
        if (typeof global.syncPlatformInteractionLayers === 'function') global.syncPlatformInteractionLayers();
    }

    function openErpCommandCenter() {
        if (!requireErpCommandAccess()) return;
        if (!showErpCommandShell()) return;
        renderErpCommandPanel();
    }

    global.openErpCommandCenter = openErpCommandCenter;
    global.closeErpCommandCenter = closeErpCommandCenter;
    global.runErpModuleHandler = runErpHandler;
    global.renderErpCommandPanel = renderErpCommandPanel;
    global.getErpCommandKpis = getErpCommandKpis;

})(typeof window !== 'undefined' ? window : globalThis);
