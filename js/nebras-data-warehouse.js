/**
 * نبراس — مستودع البيانات والتقارير (Empire Storage Hub)
 * استخراج ديناميكي · Excel CSV · PDF · حالة التخزين
 */
(function(global) {
    'use strict';

    function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function canOpenWarehouse() {
        if (typeof global.isMainGovernanceAdmin === 'function' && global.isMainGovernanceAdmin()) return true;
        if (typeof global.canManage === 'function') {
            const a = global.getNebrasCurrentAdmin && global.getNebrasCurrentAdmin();
            return a && (global.canManage('audit', a) || global.canManage('erp', a) || global.canManage('accounting', a));
        }
        return false;
    }

    function csvCell(v) {
        const s = String(v == null ? '' : v);
        if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    }

    function downloadCsv(filename, rows) {
        const blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function exportSalesQuotesCsv() {
        const list = typeof global.loadSalesQuotesInbox === 'function' ? global.loadSalesQuotesInbox() : [];
        const rows = [['quote_no', 'date', 'customer', 'phone', 'city', 'status', 'type', 'subtotal', 'vat', 'total_inc', 'lines_count'].map(csvCell).join(',')];
        list.forEach(function(e) {
            if (!e) return;
            rows.push([
                e.quoteNo, new Date(e.at || 0).toISOString().slice(0, 10),
                e.customerName, e.phone, e.city, e.status, e.quoteType,
                e.subtotalExVat || e.total, e.vatAmount, e.totalIncVat,
                (e.lines || []).length
            ].map(csvCell).join(','));
        });
        downloadCsv('nebras-sales-quotes-' + Date.now() + '.csv', rows);
        if (typeof global.addAuditLog === 'function') global.addAuditLog('تصدير مستودع', 'عروض المبيعات CSV — ' + list.length);
    }

    function exportErpInventoryCsv() {
        const inv = global.erpInventory || [];
        const rows = [['sku', 'name_ar', 'warehouse', 'qty', 'min_qty', 'unit'].map(csvCell).join(',')];
        inv.forEach(function(e) {
            if (!e) return;
            rows.push([e.sku, e.nameAr, e.warehouseAr || e.warehouseEn, e.qty, e.minQty, e.unitAr].map(csvCell).join(','));
        });
        downloadCsv('nebras-inventory-' + Date.now() + '.csv', rows);
        if (typeof global.addAuditLog === 'function') global.addAuditLog('تصدير مستودع', 'مخزون ERP CSV — ' + inv.length);
    }

    function exportCrmCustomersCsv() {
        const list = typeof global.getCrmCustomers === 'function' ? global.getCrmCustomers() : [];
        const rows = [['id', 'name', 'phone', 'email', 'city', 'source', 'created_at'].map(csvCell).join(',')];
        list.forEach(function(c) {
            if (!c) return;
            rows.push([c.id, c.name || c.nameAr, c.phone, c.email, c.city, c.source, c.createdAt].map(csvCell).join(','));
        });
        downloadCsv('nebras-crm-customers-' + Date.now() + '.csv', rows);
        if (typeof global.addAuditLog === 'function') global.addAuditLog('تصدير مستودع', 'عملاء CRM CSV — ' + list.length);
    }

    function exportAdminUsersCsv() {
        if (!global.isMainGovernanceAdmin || !global.isMainGovernanceAdmin()) {
            alert('تصدير المستخدمين — الإدارة الرئيسية فقط.');
            return;
        }
        const users = global.adminUsers || [];
        const rows = [['id', 'username', 'role', 'branch', 'active', 'last_login'].map(csvCell).join(',')];
        users.forEach(function(u) {
            if (!u) return;
            rows.push([u.id, u.username, u.role, u.assignedBranchCity, u.isActive !== false ? 'yes' : 'no', u.lastLoginAt || ''].map(csvCell).join(','));
        });
        downloadCsv('nebras-admin-users-' + Date.now() + '.csv', rows);
        if (typeof global.addAuditLog === 'function') global.addAuditLog('تصدير مستودع', 'مستخدمون CSV — ' + users.length);
    }

    function exportStorageAuditJson() {
        if (!global.isMainGovernanceAdmin || !global.isMainGovernanceAdmin()) {
            alert('تصدير التخزين الكامل — الإدارة الرئيسية فقط.');
            return;
        }
        const specs = typeof global.NEBRAS_CLOUD_STORE_SPECS !== 'undefined' ? global.NEBRAS_CLOUD_STORE_SPECS : [];
        const audit = { exportedAt: new Date().toISOString(), stores: {} };
        if (specs.length) {
            specs.forEach(function(s) {
                try {
                    const payload = s.get();
                    audit.stores[s.key] = {
                        size: Array.isArray(payload) ? payload.length : (payload && typeof payload === 'object' ? Object.keys(payload).length : 1)
                    };
                } catch (e) {
                    audit.stores[s.key] = { error: true };
                }
            });
        }
        if (typeof global.getCloudSnapshotsForCloud === 'function') {
            audit.snapshots = global.getCloudSnapshotsForCloud();
        }
        const blob = new Blob([JSON.stringify(audit, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'nebras-storage-audit-' + Date.now() + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
        if (typeof global.addAuditLog === 'function') global.addAuditLog('تصدير مستودع', 'تدقيق JSON — ' + Object.keys(audit.stores).length + ' مخزن');
    }

    function exportEmpireSummaryPdf() {
        const win = window.open('', '_blank');
        if (!win) { alert('اسمحي بفتح نافذة للتقرير.'); return; }
        const quotes = typeof global.loadSalesQuotesInbox === 'function' ? global.loadSalesQuotesInbox().length : 0;
        const products = (global.siteProducts || []).filter(function(p) { return p && p.visible !== false; }).length;
        const inv = (global.erpInventory || []).length;
        const orders = (global.erpOrders || []).length;
        const cloud = typeof global.getNebrasCloudStoreCount === 'function' ? global.getNebrasCloudStoreCount() : 0;
        const snap = typeof global.getCloudSnapshotsForCloud === 'function' ? global.getCloudSnapshotsForCloud() : { byKey: {} };
        const snapN = Object.keys(snap.byKey || {}).reduce(function(n, k) { return n + (snap.byKey[k] || []).length; }, 0);
        win.document.write('<html dir="rtl"><head><meta charset="utf-8"><title>تقرير إمبراطورية نبراس</title>' +
            '<style>body{font-family:Cairo,Tahoma,sans-serif;padding:28px;color:#0d2840}h1{border-bottom:3px solid #00a8ff;padding-bottom:8px}' +
            '.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0}.card{border:1px solid #ccc;border-radius:12px;padding:14px}' +
            '.card strong{font-size:1.4rem;color:#155e94;display:block}</style></head><body>' +
            '<h1>🏭 تقرير إمبراطورية نبراس — مستودع البيانات</h1>' +
            '<p>تاريخ: ' + new Date().toLocaleString('ar-SA') + '</p>' +
            '<div class="grid">' +
            '<div class="card"><strong>' + products + '</strong>منتجات المتجر</div>' +
            '<div class="card"><strong>' + quotes + '</strong>عروض وطلبات</div>' +
            '<div class="card"><strong>' + inv + '</strong>أصناف مخزون</div>' +
            '<div class="card"><strong>' + orders + '</strong>طلبات OMS</div>' +
            '<div class="card"><strong>' + cloud + '</strong>مخازن سحابة</div>' +
            '<div class="card"><strong>' + snapN + '</strong>نسخ احتياطية</div></div>' +
            '<p>المتجر · السلة · عروض 4 صفحات · ERP · HR · CRM · Legal · مسار نبراس</p></body></html>');
        win.document.close();
        win.focus();
        win.print();
        if (typeof global.addAuditLog === 'function') global.addAuditLog('تصدير مستودع', 'تقرير إمبراطورية PDF');
    }

    function renderDataWarehousePanel() {
        const summary = document.getElementById('data-warehouse-summary');
        const body = document.getElementById('data-warehouse-body');
        if (!body) return;
        const quotes = typeof global.loadSalesQuotesInbox === 'function' ? global.loadSalesQuotesInbox().length : 0;
        const products = (global.siteProducts || []).length;
        const cloud = typeof global.getNebrasCloudStoreCount === 'function' ? global.getNebrasCloudStoreCount() : 0;
        const pending = typeof global.hasPendingLocalCloudMutations === 'function' && global.hasPendingLocalCloudMutations();
        if (summary) {
            summary.innerHTML =
                '<div class="erp-stat erp-stat--accent"><strong>' + cloud + '</strong><span>مخازن سحابة</span></div>' +
                '<div class="erp-stat"><strong>' + quotes + '</strong><span>عروض/طلبات</span></div>' +
                '<div class="erp-stat"><strong>' + products + '</strong><span>منتجات</span></div>' +
                '<div class="erp-stat' + (pending ? ' erp-stat--warn' : ' erp-stat--ok') + '"><strong>' + (pending ? '⏳' : '✓') + '</strong><span>' + (pending ? 'مزامنة معلّقة' : 'متزامن') + '</span></div>';
        }
        body.innerHTML =
            '<p class="scm-hint"><i class="fas fa-database"></i> مستودع البيانات — كل ما يُحفظ ديناميكياً في المنصة · استخراج Excel وPDF</p>' +
            '<div class="dw-export-grid">' +
            '<button type="button" class="dw-export-card" onclick="exportSalesQuotesCsv()"><i class="fas fa-file-csv"></i><strong>عروض المبيعات</strong><small>Excel CSV</small></button>' +
            '<button type="button" class="dw-export-card" onclick="exportErpInventoryCsv()"><i class="fas fa-boxes-stacked"></i><strong>المخزون ERP</strong><small>Excel CSV</small></button>' +
            '<button type="button" class="dw-export-card" onclick="exportCrmCustomersCsv()"><i class="fas fa-handshake"></i><strong>عملاء CRM</strong><small>Excel CSV</small></button>' +
            '<button type="button" class="dw-export-card" onclick="typeof exportStoreCatalogCsv===\'function\'&&exportStoreCatalogCsv()"><i class="fas fa-store"></i><strong>كتالوج المتجر</strong><small>Excel CSV</small></button>' +
            '<button type="button" class="dw-export-card" onclick="exportAdminUsersCsv()"><i class="fas fa-users-cog"></i><strong>المستخدمون</strong><small>Excel CSV</small></button>' +
            '<button type="button" class="dw-export-card" onclick="exportStorageAuditJson()"><i class="fas fa-code"></i><strong>تدقيق التخزين</strong><small>JSON</small></button>' +
            '<button type="button" class="dw-export-card" onclick="exportEmpireSummaryPdf()"><i class="fas fa-file-pdf"></i><strong>تقرير الإمبراطورية</strong><small>PDF</small></button>' +
            '</div>' +
            (global.isMainGovernanceAdmin && global.isMainGovernanceAdmin()
                ? '<section class="dw-governance-section"><h3><i class="fas fa-shield-halved"></i> حوكمة الموقع — الإدارة الرئيسية فقط</h3>' +
                '<p class="scm-hint">استيراد/تصدير JSON لكل مخازن المنصة — منتجات · أيقونات · إعدادات · ERP · HR · CRM</p>' +
                '<div class="workspace-actions-row">' +
                '<button type="button" class="workspace-action-btn workspace-action-btn--primary" onclick="typeof exportNebrasGovernanceBundle===\'function\'&&exportNebrasGovernanceBundle()"><i class="fas fa-file-export"></i> تصدير حزمة الموقع JSON</button>' +
                '<button type="button" class="workspace-action-btn" onclick="typeof openNebrasGovernanceImportPicker===\'function\'&&openNebrasGovernanceImportPicker()"><i class="fas fa-file-import"></i> استيراد حزمة الموقع JSON</button>' +
                '</div></section>'
                : '') +
            '<div class="workspace-actions-row" style="margin-top:16px">' +
            '<button type="button" class="workspace-action-btn workspace-action-btn--primary" onclick="typeof syncPushToNebrasCloudNow===\'function\'&&syncPushToNebrasCloudNow()"><i class="fas fa-cloud-upload-alt"></i> رفع للسحابة</button>' +
            '<button type="button" class="workspace-action-btn" onclick="typeof openPlatformIntegrationHub===\'function\'&&openPlatformIntegrationHub()"><i class="fas fa-shield-halved"></i> حماية البيانات</button>' +
            '</div>';
    }

    function openNebrasDataWarehouse() {
        if (!canOpenWarehouse()) {
            alert('مستودع البيانات — الإدارة الرئيسية أو صلاحية التدقيق/ERP.');
            return;
        }
        if (typeof global.closeAllAdminSections === 'function') global.closeAllAdminSections();
        const el = document.getElementById('data-warehouse-hub');
        if (el) { el.classList.add('show'); el.setAttribute('aria-hidden', 'false'); }
        if (typeof global.revealPlatformLayer === 'function') global.revealPlatformLayer('data-warehouse-hub');
        renderDataWarehousePanel();
    }

    function closeNebrasDataWarehouse() {
        const el = document.getElementById('data-warehouse-hub');
        if (el) { el.classList.remove('show'); el.setAttribute('aria-hidden', 'true'); }
        if (typeof global.syncPlatformInteractionLayers === 'function') global.syncPlatformInteractionLayers();
    }

    global.openNebrasDataWarehouse = openNebrasDataWarehouse;
    global.closeNebrasDataWarehouse = closeNebrasDataWarehouse;
    global.renderDataWarehousePanel = renderDataWarehousePanel;
    global.exportSalesQuotesCsv = exportSalesQuotesCsv;
    global.exportErpInventoryCsv = exportErpInventoryCsv;
    global.exportCrmCustomersCsv = exportCrmCustomersCsv;
    global.exportAdminUsersCsv = exportAdminUsersCsv;
    global.exportStorageAuditJson = exportStorageAuditJson;
    global.exportEmpireSummaryPdf = exportEmpireSummaryPdf;

})(typeof window !== 'undefined' ? window : globalThis);
