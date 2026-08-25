/**
 * نبراس hrws276 — واجهة ERP الإدارية (platformAdminErp · lazy)
 * يُحمَّل مع bootNebrasAdminSession — الزائر لا يحمّل هذا الملف.
 */
        function openErpModule(moduleId) {
            if (typeof window.nebrasOdooReadForPanel === 'function') {
                window.nebrasOdooReadForPanel(moduleId, 'erp');
            }
            const mod = NEBRAS_ERP.modules.find(function(m) { return m.id === moduleId; });
            if (!mod) return;
            if (!canOpenErpModule(mod)) {
                const ui = siteText[currentLang || 'ar'] || siteText.ar;
                alert(ui.platformModuleLocked || 'غير متاح لصلاحياتك.');
                return;
            }
            if (mod.handler.indexOf('iconDetail:') === 0) {
                openIconDetails(mod.handler.split(':')[1]);
                return;
            }
            const fn = DASHBOARD_HANDLER_MAP[mod.handler];
            if (typeof fn === 'function') fn();
        }

        function renderErpHubPanel() {
            const panel = document.getElementById('erp-hub-panel');
            if (!panel || !currentAdmin) return;

            const lang = currentLang || 'ar';
            const ui = siteText[lang] || siteText.ar;
            ensureBuiltinErpData();

            setElementText('erp-hub-title', ui.erpHubTitle);
            setElementText('erp-hub-subtitle', ui.erpHubSubtitle);
            setElementText('erp-benchmark-summary', ui.erpBenchmarkSummary);
            setElementText('erp-bench-col-area', ui.erpBenchColArea);
            setElementText('erp-bench-col-global', ui.erpBenchColGlobal);
            setElementText('erp-bench-col-nebras', ui.erpBenchColNebras);

            const ver = document.getElementById('erp-version-badge');
            if (ver) {
                ver.innerHTML = '<i class="fas fa-cubes" aria-hidden="true"></i> ' +
                    escapeHtmlAttr(NEBRAS_ERP.codename) + ' v' + escapeHtmlAttr(NEBRAS_ERP.version);
            }

            const kpis = getErpKpis();
            const kpiRow = document.getElementById('erp-kpi-row');
            if (kpiRow) {
                kpiRow.innerHTML = [
                    { v: kpis.skuCount, l: ui.erpKpiSku },
                    { v: kpis.lowStock, l: ui.erpKpiLow },
                    { v: kpis.salesCount, l: ui.erpKpiSales },
                    { v: kpis.ordersCount, l: ui.erpKpiOrders },
                    { v: kpis.complaintsCount, l: ui.erpKpiComplaints },
                    { v: kpis.branchesCount, l: ui.erpKpiBranches }
                ].map(function(k) {
                    return '<div class="erp-kpi"><strong>' + escapeHtmlAttr(String(k.v)) + '</strong><span>' + escapeHtmlAttr(k.l) + '</span></div>';
                }).join('');
            }

            const pillarsRow = document.getElementById('erp-pillars-row');
            if (pillarsRow) {
                pillarsRow.innerHTML = NEBRAS_ERP.pillars.map(function(p) {
                    const name = lang === 'en' ? p.nameEn : p.nameAr;
                    return '<span class="erp-pillar-chip">' + escapeHtmlAttr(name) + '</span>';
                }).join('');
            }

            const grid = document.getElementById('erp-modules-grid');
            if (grid) {
                const statusLabel = { live: ui.platformStatusLive, beta: ui.platformStatusBeta, planned: ui.platformStatusPlanned };
                grid.innerHTML = NEBRAS_ERP.modules.map(function(mod) {
                    const name = lang === 'en' ? mod.nameEn : mod.nameAr;
                    const desc = lang === 'en' ? (mod.descEn || mod.descAr) : mod.descAr;
                    const ok = canOpenErpModule(mod);
                    const st = mod.status || 'planned';
                    return '<button type="button" class="erp-module-card' + (ok ? '' : ' disabled') + '" data-erp-module-id="' + escapeHtmlAttr(mod.id) + '" onclick="openErpModule(\'' + escapeHtmlAttr(mod.id) + '\')">' +
                        '<i class="' + escapeHtmlAttr(mod.icon) + '" aria-hidden="true"></i> ' +
                        '<h4>' + escapeHtmlAttr(name) + '</h4><small>' + escapeHtmlAttr(desc) + '</small>' +
                        '<span class="platform-status ' + escapeHtmlAttr(st) + '">' + escapeHtmlAttr(statusLabel[st] || st) + '</span></button>';
                }).join('');
            }

            const benchBody = document.getElementById('erp-benchmark-body');
            if (benchBody) {
                benchBody.innerHTML = GLOBAL_PLATFORM_BENCHMARK.map(function(row) {
                    const area = lang === 'en' ? row.areaEn : row.areaAr;
                    const global = lang === 'en' ? row.globalAr : row.globalAr;
                    const nebras = lang === 'en' ? (row.nebrasEn || row.nebrasAr) : row.nebrasAr;
                    const pc = row.parity === 'high' ? 'parity-high' : row.parity === 'mid' ? 'parity-mid' : 'parity-soon';
                    return '<tr><td>' + escapeHtmlAttr(area) + '</td><td>' + escapeHtmlAttr(global) + '</td><td class="' + pc + '">' + escapeHtmlAttr(nebras) + '</td></tr>';
                }).join('');
            }
            if (currentAdmin) renderDashboardCommandShell(currentAdmin);
        }

        let erpInventoryEditId = null;

        function getErpWarehouseOptions() {
            const wh = [];
            (erpInventory || []).forEach(function(i) {
                const w = String(i.warehouseAr || '').trim();
                if (w && wh.indexOf(w) < 0) wh.push(w);
            });
            getBranchCityOptions().forEach(function(c) {
                if (wh.indexOf(c) < 0) wh.push(c);
            });
            if (wh.indexOf('القصيم — الرئيسي') < 0) wh.unshift('القصيم — الرئيسي');
            return wh;
        }

        function buildErpSelectOptions(values, selected) {
            return values.map(function(v) {
                return '<option value="' + escapeHtmlAttr(v) + '"' + (selected === v ? ' selected' : '') + '>' + escapeHtmlAttr(v) + '</option>';
            }).join('');
        }

        function openErpInventory() {
            if (!requirePermission('inventory', 'صلاحية المخزون ERP مطلوبة.')) return;
            ensureBuiltinErpData();
            erpInventoryEditId = null;
            renderErpInventoryForm();
            displayErpInventory();
            revealPlatformLayer('erp-inventory');
        }

        function renderErpInventoryForm(item) {
            const host = document.getElementById('erp-inventory-form');
            if (!host) return;
            const d = item || {};
            const whOpts = buildErpSelectOptions(getErpWarehouseOptions(), d.warehouseAr || 'القصيم — الرئيسي');
            const prodOpts = (siteProducts || []).map(function(p) {
                return '<option value="' + escapeHtmlAttr(p.id) + '"' + (d.productLink === p.id ? ' selected' : '') + '>' + escapeHtmlAttr(p.titleAr || p.id) + '</option>';
            }).join('');
            host.innerHTML =
                '<h3 class="nebras-erp-subhead"><i class="fas fa-boxes-stacked"></i> ' + (item ? 'تعديل صنف' : 'صنف مخزون جديد') + '</h3>' +
                '<div class="erp-form-grid">' +
                    '<label class="nebras-field"><span>كود SKU</span><input type="text" id="inv-sku" value="' + escapeHtmlAttr(d.sku || '') + '" placeholder="WPC-RAW-80"></label>' +
                    '<label class="nebras-field"><span>الاسم (عربي)</span><input type="text" id="inv-name-ar" value="' + escapeHtmlAttr(d.nameAr || '') + '"></label>' +
                    '<label class="nebras-field"><span>الاسم (إنجليزي)</span><input type="text" id="inv-name-en" value="' + escapeHtmlAttr(d.nameEn || '') + '"></label>' +
                    '<label class="nebras-field"><span>المستودع / الفرع</span><select id="inv-warehouse">' + whOpts + '</select></label>' +
                    '<label class="nebras-field"><span>الكمية الحالية</span><input type="number" id="inv-qty" min="0" step="any" value="' + escapeHtmlAttr(String(d.qty != null ? d.qty : '')) + '"></label>' +
                    '<label class="nebras-field"><span>الحد الأدنى للتنبيه</span><input type="number" id="inv-min-qty" min="0" step="any" value="' + escapeHtmlAttr(String(d.minQty != null ? d.minQty : '')) + '"></label>' +
                    '<label class="nebras-field"><span>الوحدة</span><input type="text" id="inv-unit" value="' + escapeHtmlAttr(d.unitAr || 'قطعة') + '"></label>' +
                    '<label class="nebras-field"><span>ربط بمنتج الموقع</span><select id="inv-product-link"><option value="">— بدون —</option>' + prodOpts + '</select></label>' +
                '</div>' +
                '<div class="erp-form-actions">' +
                    '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveErpInventoryItem()"><i class="fas fa-check"></i> ' + (item ? 'حفظ التعديل' : 'إضافة للمخزون') + '</button>' +
                    (item ? '<button type="button" class="nebras-users-btn" onclick="cancelErpInventoryEdit()">إلغاء</button>' : '') +
                '</div>';
        }

        async function saveErpInventoryItem() {
            if (!requirePermission('inventory')) return;
            const sku = fieldVal('inv-sku');
            const nameAr = fieldVal('inv-name-ar');
            if (!sku || !nameAr) { alert('SKU واسم الصنف مطلوبان.'); return; }
            const snapshot = JSON.parse(JSON.stringify(erpInventory));
            const payload = {
                sku: sku,
                nameAr: nameAr,
                nameEn: fieldVal('inv-name-en') || nameAr,
                warehouseAr: fieldVal('inv-warehouse') || 'القصيم — الرئيسي',
                warehouseEn: fieldVal('inv-warehouse') || 'Qassim main',
                qty: erpNum(fieldVal('inv-qty')),
                minQty: erpNum(fieldVal('inv-min-qty')),
                unitAr: fieldVal('inv-unit') || 'قطعة',
                productLink: fieldVal('inv-product-link')
            };
            if (erpInventoryEditId) {
                const item = erpInventory.find(function(i) { return i.id === erpInventoryEditId; });
                if (item) Object.assign(item, payload);
                addAuditLog('ERP مخزون', 'تعديل ' + sku);
            } else {
                erpInventory.push(Object.assign({ id: 'inv-' + Date.now() }, payload));
                addAuditLog('ERP مخزون', 'إضافة SKU ' + sku);
            }
            erpInventoryEditId = null;
            saveSystemData({ skipCloud: true, skipMutationMark: true });
            const cloudOk = await persistErpStoresWithRollback(['erp_inventory'], function() {
                erpInventory = snapshot;
            });
            if (!cloudOk) {
                renderErpInventoryForm();
                displayErpInventory();
                return;
            }
            renderErpInventoryForm();
            displayErpInventory();
            renderErpHubPanel();
            if (currentAdmin) renderDashboardCommandShell(currentAdmin);
        }

        function editErpInventoryItem(id) {
            if (!requirePermission('inventory')) return;
            const item = erpInventory.find(function(i) { return i.id === id; });
            if (!item) return;
            erpInventoryEditId = id;
            renderErpInventoryForm(item);
        }

        function cancelErpInventoryEdit() {
            erpInventoryEditId = null;
            renderErpInventoryForm();
        }

        async function deleteErpInventoryItem(id) {
            if (!requirePermission('inventory')) return;
            const item = erpInventory.find(function(i) { return i.id === id; });
            if (!item || !assertErpEntryInAdminScope(item, currentAdmin, 'لا يمكنك حذف صنف خارج قسمك/فرعك.')) return;
            if (!confirm('حذف ' + item.sku + '؟')) return;
            const snapshot = JSON.parse(JSON.stringify(erpInventory));
            erpInventory = erpInventory.filter(function(i) { return i.id !== id; });
            saveSystemData({ skipCloud: true, skipMutationMark: true });
            const cloudOk = await persistErpStoresWithRollback(['erp_inventory'], function() {
                erpInventory = snapshot;
            });
            if (!cloudOk) {
                displayErpInventory();
                return;
            }
            displayErpInventory();
            renderErpHubPanel();
        }

        function displayErpInventory() {
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
            list.innerHTML = visible.map(function(item) {
                const name = lang === 'en' && item.nameEn ? item.nameEn : item.nameAr;
                const wh = lang === 'en' && item.warehouseEn ? item.warehouseEn : item.warehouseAr;
                const low = Number(item.qty) <= Number(item.minQty || 0);
                return '<article class="erp-row' + (low ? ' erp-row--alert' : '') + '">' +
                    '<div class="erp-row-main"><strong>' + escapeHtmlAttr(item.sku) + '</strong> — ' + escapeHtmlAttr(name) +
                        '<span class="erp-row-tags"><span class="erp-tag">' + escapeHtmlAttr(wh) + '</span>' +
                            (low ? '<span class="erp-tag erp-tag--status-pending">تحت الحد</span>' : '') + '</span>' +
                        '<small>' + escapeHtmlAttr(String(item.qty)) + ' ' + escapeHtmlAttr(item.unitAr || '') + ' · حد أدنى ' + escapeHtmlAttr(String(item.minQty || 0)) + '</small>' +
                    '</div>' +
                    '<div class="erp-row-actions-inline">' +
                        '<button type="button" onclick="editErpInventoryItem(\'' + item.id + '\')"><i class="fas fa-pen"></i></button>' +
                        '<button type="button" class="erp-row-del" onclick="deleteErpInventoryItem(\'' + item.id + '\')" aria-label="حذف"><i class="fas fa-trash"></i></button>' +
                    '</div></article>';
            }).join('');
        }

        const ERP_ORDER_STATUSES = [
            { id: 'pending', label: 'قيد الانتظار' },
            { id: 'confirmed', label: 'مؤكّد' },
            { id: 'production', label: 'قيد الإنتاج' },
            { id: 'ready', label: 'جاهز للتسليم' },
            { id: 'shipped', label: 'تم الشحن' },
            { id: 'delivered', label: 'مُسلَّم' },
            { id: 'cancelled', label: 'ملغي' }
        ];

        function openErpOrders(focusOrderId) {
            if (!requirePermission('orders', 'صلاحية الطلبات مطلوبة.')) return;
            ensureBuiltinErpData();
            if (focusOrderId) erpOrderFocusId = focusOrderId;
            renderErpOrdersToolbar();
            renderErpOrdersForm();
            displayErpOrders();
            revealPlatformLayer('erp-orders');
        }

        function renderErpOrdersToolbar() {
            const host = document.getElementById('erp-orders-toolbar');
            if (!host) return;
            const statusOpts = '<option value="">كل الحالات</option>' + ERP_ORDER_STATUSES.map(function(s) {
                const sel = erpOrdersStatusFilter === s.id ? ' selected' : '';
                return '<option value="' + s.id + '"' + sel + '>' + s.label + '</option>';
            }).join('');
            host.innerHTML =
                '<label class="audit-search-wrap"><i class="fas fa-search"></i>' +
                    '<input type="search" id="erp-orders-search" placeholder="بحث برقم الطلب أو العميل أو العرض…" value="' + escapeHtmlAttr(erpOrdersSearchQuery) + '" oninput="filterErpOrders()">' +
                '</label>' +
                '<select id="erp-orders-status-filter" class="audit-filter-select" onchange="filterErpOrders()" aria-label="تصفية الحالة">' + statusOpts + '</select>' +
                '<button type="button" class="secondary" onclick="exportErpOrdersCsv()"><i class="fas fa-file-csv"></i> تصدير CSV</button>';
        }

        function filterErpOrders() {
            erpOrdersSearchQuery = fieldVal('erp-orders-search');
            erpOrdersStatusFilter = fieldVal('erp-orders-status-filter');
            displayErpOrders();
        }

        function exportErpOrdersCsv() {
            if (!requirePermission('orders')) return;
            ensureBuiltinErpData();
            const rows = getFilteredErpOrders();
            if (!rows.length) { alert('لا توجد طلبات للتصدير.'); return; }
            const statusMap = {};
            ERP_ORDER_STATUSES.forEach(function(s) { statusMap[s.id] = s.label; });
            const header = ['رقم الطلب', 'التاريخ', 'العميل', 'الجوال', 'الفرع', 'المنتج', 'الكمية', 'الحالة', 'مرجع العرض', 'ملاحظات'];
            const lines = [header.join(',')].concat(rows.map(function(o) {
                return [
                    csvCell(o.orderNo || o.id),
                    csvCell(o.date || ''),
                    csvCell(o.customer || ''),
                    csvCell(o.phone || ''),
                    csvCell(o.branch || ''),
                    csvCell(o.product || ''),
                    csvCell(erpNum(o.qty)),
                    csvCell(statusMap[o.status] || o.status || ''),
                    csvCell(o.quoteRef || ''),
                    csvCell(o.notes || '')
                ].join(',');
            }));
            downloadTextFile('nebras-oms-orders-' + erpToday() + '.csv', '\uFEFF' + lines.join('\n'), 'text/csv;charset=utf-8');
            addAuditLog('تصدير OMS', rows.length + ' طلب — CSV');
        }

        function getFilteredErpOrders() {
            const q = (erpOrdersSearchQuery || '').trim().toLowerCase();
            const scoped = filterErpEntriesForAdmin(erpOrders || [], currentAdmin);
            return scoped.filter(function(o) {
                if (erpOrdersStatusFilter && (o.status || 'pending') !== erpOrdersStatusFilter) return false;
                if (!q) return true;
                const hay = [
                    o.orderNo, o.id, o.customer, o.phone, o.branch, o.product, o.quoteRef, o.notes
                ].join(' ').toLowerCase();
                return hay.indexOf(q) >= 0;
            });
        }

        function renderErpOrdersForm() {
            const host = document.getElementById('erp-orders-form');
            if (!host) return;
            const branchOpts = buildErpSelectOptions(getBranchCityOptions().length ? getBranchCityOptions() : ['القصيم — الرئيسي'], '');
            const statusOpts = ERP_ORDER_STATUSES.map(function(s) {
                return '<option value="' + s.id + '">' + s.label + '</option>';
            }).join('');
            host.innerHTML =
                '<h3 class="nebras-erp-subhead"><i class="fas fa-plus-circle"></i> تسجيل طلب جديد</h3>' +
                '<div class="erp-form-grid">' +
                    '<label class="nebras-field"><span>التاريخ</span><input type="date" id="ord-date" value="' + erpToday() + '"></label>' +
                    '<label class="nebras-field"><span>اسم العميل</span><input type="text" id="ord-customer" placeholder="اسم العميل"></label>' +
                    '<label class="nebras-field"><span>الجوال</span><input type="tel" id="ord-phone" placeholder="05xxxxxxxx"></label>' +
                    '<label class="nebras-field"><span>الفرع المسؤول</span><select id="ord-branch"><option value="">— اختر —</option>' + branchOpts + '</select></label>' +
                    '<label class="nebras-field"><span>المنتج / الطلب</span><input type="text" id="ord-product" placeholder="باب WPC 90×210" list="ord-product-list"></label>' +
                    '<label class="nebras-field"><span>الكمية</span><input type="number" id="ord-qty" min="1" step="1" value="1"></label>' +
                    '<label class="nebras-field"><span>الحالة</span><select id="ord-status">' + statusOpts + '</select></label>' +
                    '<label class="nebras-field"><span>مرجع عرض سعر</span><input type="text" id="ord-quote-ref" placeholder="اختياري"></label>' +
                    '<label class="nebras-field nebras-field--wide"><span>ملاحظات</span><input type="text" id="ord-notes" placeholder="اختياري"></label>' +
                '</div>' +
                '<datalist id="ord-product-list">' +
                    (siteProducts || []).map(function(p) { return '<option value="' + escapeHtmlAttr(p.titleAr || '') + '">'; }).join('') +
                '</datalist>' +
                '<div class="erp-form-actions"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="addErpOrder()"><i class="fas fa-plus"></i> تسجيل الطلب</button></div>';
        }

        function addErpOrder() {
            if (!requirePermission('orders')) return;
            const customer = fieldVal('ord-customer');
            const product = fieldVal('ord-product');
            if (!customer || !product) { alert('اسم العميل والمنتج مطلوبان.'); return; }
            const snapshot = JSON.parse(JSON.stringify(erpOrders));
            const orderNo = 'NB-' + new Date().getFullYear() + '-' + String(erpOrders.length + 1).padStart(4, '0');
            erpOrders.unshift({
                id: 'ORD-' + Date.now(),
                orderNo: orderNo,
                date: fieldVal('ord-date') || erpToday(),
                customer: customer,
                phone: fieldVal('ord-phone'),
                branch: fieldVal('ord-branch'),
                product: product,
                qty: erpNum(fieldVal('ord-qty')) || 1,
                status: fieldVal('ord-status') || 'pending',
                quoteRef: fieldVal('ord-quote-ref'),
                notes: fieldVal('ord-notes'),
                by: erpActor(),
                createdAt: new Date().toISOString()
            });
            saveSystemData({ skipCloud: true, skipMutationMark: true });
            persistErpStoresWithRollback(['erp_orders'], function() {
                erpOrders = snapshot;
            }).then(function(cloudOk) {
                if (!cloudOk) {
                    renderErpOrdersForm();
                    displayErpOrders();
                    return;
                }
                renderErpOrdersForm();
                displayErpOrders();
                renderErpHubPanel();
                if (currentAdmin) renderDashboardCommandShell(currentAdmin);
                addAuditLog('ERP طلب', customer + ' — ' + product);
            });
        }

        async function updateErpOrderStatus(id, status) {
            if (!requirePermission('orders')) return;
            const o = erpOrders.find(function(x) { return x.id === id; });
            if (!o) return;
            const snapshot = JSON.parse(JSON.stringify(erpOrders));
            o.status = status;
            o.updatedAt = new Date().toISOString();
            saveSystemData({ skipCloud: true, skipMutationMark: true });
            const cloudOk = await persistErpStoresWithRollback(['erp_orders'], function() {
                erpOrders = snapshot;
            });
            if (!cloudOk) {
                displayErpOrders();
                return;
            }
            displayErpOrders();
            renderErpHubPanel();
        }

        async function deleteErpOrder(id) {
            if (!requirePermission('orders')) return;
            const o = erpOrders.find(function(x) { return x.id === id; });
            if (!o || !assertErpEntryInAdminScope(o, currentAdmin, 'لا يمكنك حذف طلب خارج فرعك/قسمك.')) return;
            if (!confirm('حذف الطلب ' + (o.orderNo || o.id) + '؟')) return;
            const snapshot = JSON.parse(JSON.stringify(erpOrders));
            erpOrders = erpOrders.filter(function(x) { return x.id !== id; });
            saveSystemData({ skipCloud: true, skipMutationMark: true });
            const cloudOk = await persistErpStoresWithRollback(['erp_orders'], function() {
                erpOrders = snapshot;
            });
            if (!cloudOk) {
                displayErpOrders();
                return;
            }
            displayErpOrders();
            renderErpHubPanel();
        }

        function displayErpOrders() {
            const list = document.getElementById('erp-orders-list');
            if (!list) return;
            const statusMap = {};
            ERP_ORDER_STATUSES.forEach(function(s) { statusMap[s.id] = s.label; });
            const scopedOrders = filterErpEntriesForAdmin(erpOrders || [], currentAdmin);
            const filtered = getFilteredErpOrders();
            const pending = scopedOrders.filter(function(o) { return o.status === 'pending' || o.status === 'confirmed'; }).length;
            const branchNote = isBranchScopedAdmin(currentAdmin) ? ' — فرع ' + escapeHtmlAttr(currentAdmin.assignedBranchCity || '') : '';
            const summary = document.getElementById('erp-orders-summary');
            if (summary) {
                summary.innerHTML =
                    '<div class="erp-stat"><strong>' + scopedOrders.length + '</strong><span>إجمالي الطلبات' + branchNote + '</span></div>' +
                    '<div class="erp-stat' + (pending ? ' erp-stat--alert' : '') + '"><strong>' + pending + '</strong><span>قيد المعالجة</span></div>' +
                    '<div class="erp-stat"><strong>' + filtered.length + '</strong><span>نتائج البحث</span></div>';
            }
            if (!scopedOrders.length) {
                list.innerHTML = '<p class="erp-empty">لا طلبات مسجلة — سجّلوا الطلب الأول من النموذج.</p>';
                return;
            }
            if (!filtered.length) {
                list.innerHTML = '<p class="erp-empty">لا نتائج مطابقة — غيّروا البحث أو التصفية.</p>';
                return;
            }
            list.innerHTML = filtered.map(function(o) {
                const st = o.status || 'pending';
                const nextActions = [];
                if (st === 'pending') nextActions.push({ s: 'confirmed', l: 'تأكيد' });
                if (st === 'confirmed') nextActions.push({ s: 'production', l: 'إنتاج' });
                if (st === 'production') nextActions.push({ s: 'ready', l: 'جاهز' });
                if (st === 'ready') nextActions.push({ s: 'shipped', l: 'شحن' });
                if (st === 'shipped') nextActions.push({ s: 'delivered', l: 'تسليم' });
                const actionBtns = nextActions.map(function(a) {
                    return '<button type="button" class="erp-tag erp-tag--action" onclick="updateErpOrderStatus(\'' + o.id + '\',\'' + a.s + '\')">' + a.l + '</button>';
                }).join('');
                const quoteLink = (o.quoteId || o.quoteRef)
                    ? '<button type="button" class="erp-tag erp-tag--action" onclick="openSalesQuoteFromOrder(\'' + escapeHtmlAttr(o.quoteId || '') + '\',\'' + escapeHtmlAttr(o.quoteRef || '') + '\')"><i class="fas fa-file-invoice"></i> ' + escapeHtmlAttr(o.quoteRef || 'عرض') + '</button>'
                    : '';
                const focusClass = erpOrderFocusId && o.id === erpOrderFocusId ? ' erp-row--focus' : '';
                return '<article class="erp-row' + focusClass + '" data-order-id="' + escapeHtmlAttr(o.id) + '">' +
                    '<div class="erp-row-main"><strong>' + escapeHtmlAttr(o.orderNo || o.id) + '</strong> — ' + escapeHtmlAttr(o.customer) +
                        '<span class="erp-row-tags"><span class="erp-tag erp-tag--status-' + escapeHtmlAttr(st) + '">' + escapeHtmlAttr(statusMap[st] || st) + '</span>' +
                            (o.branch ? '<span class="erp-tag">' + escapeHtmlAttr(o.branch) + '</span>' : '') +
                            quoteLink + '</span>' +
                        '<small>' + escapeHtmlAttr(o.date || '') + ' · ' + escapeHtmlAttr(o.product) + ' × ' + erpNum(o.qty) +
                            (o.phone ? ' · ' + escapeHtmlAttr(o.phone) : '') +
                            (o.notes ? ' · ' + escapeHtmlAttr(o.notes) : '') + '</small>' +
                        (actionBtns ? '<div class="erp-row-quick-actions">' + actionBtns + '</div>' : '') +
                    '</div>' +
                    '<button type="button" class="erp-row-del" onclick="deleteErpOrder(\'' + o.id + '\')" aria-label="حذف"><i class="fas fa-trash"></i></button>' +
                '</article>';
            }).join('');
            if (erpOrderFocusId) {
                const focusEl = list.querySelector('[data-order-id="' + erpOrderFocusId + '"]');
                if (focusEl) {
                    focusEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(function() { erpOrderFocusId = null; }, 4000);
                } else {
                    erpOrderFocusId = null;
                }
            }
        }

        function openSalesQuoteFromOrder(quoteId, quoteRef) {
            if (!canManage('sales')) {
                alert('صلاحية المبيعات مطلوبة لعرض التفاصيل.');
                return;
            }
            const inbox = loadSalesQuotesInbox();
            let entry = quoteId ? inbox.find(function(e) { return e.id === quoteId; }) : null;
            if (!entry && quoteRef) {
                entry = inbox.find(function(e) { return e.quoteNo === quoteRef; });
            }
            if (entry) {
                viewSalesQuoteEntry(entry.id);
                return;
            }
            alert('العرض المرتبط: ' + (quoteRef || quoteId || '—') + '\nافتحي المبيعات للبحث يدوياً إن لزم.');
            openSalesManagement();
        }

        function openErpWarehouseTransfers() {
            if (!canManage('warehouse') && !canManage('inventory')) {
                alert('صلاحية المستودع أو المخزون مطلوبة.');
                return;
            }
            ensureBuiltinErpData();
            ensureErpOperationsData();
            renderErpStockTransferForm();
            displayErpStockTransfers();
            revealPlatformLayer('erp-warehouse-transfers');
        }

        function renderErpStockTransferForm() {
            const host = document.getElementById('erp-stock-transfer-form');
            if (!host) return;
            const whOpts = buildErpSelectOptions(getErpWarehouseOptions(), '');
            const skuOpts = (erpInventory || []).map(function(i) {
                return '<option value="' + escapeHtmlAttr(i.sku) + '" data-name="' + escapeHtmlAttr(i.nameAr || '') + '" data-wh="' + escapeHtmlAttr(i.warehouseAr || '') + '">' +
                    escapeHtmlAttr(i.sku) + ' — ' + escapeHtmlAttr(i.nameAr || '') + ' (' + escapeHtmlAttr(i.warehouseAr || '') + ': ' + erpNum(i.qty) + ')</option>';
            }).join('');
            host.innerHTML =
                '<h3 class="nebras-erp-subhead"><i class="fas fa-exchange-alt"></i> تحويل مخزون بين المستودعات</h3>' +
                '<div class="erp-form-grid">' +
                    '<label class="nebras-field"><span>التاريخ</span><input type="date" id="xfr-date" value="' + erpToday() + '"></label>' +
                    '<label class="nebras-field"><span>الصنف (SKU)</span><select id="xfr-sku"><option value="">— اختر —</option>' + skuOpts + '</select></label>' +
                    '<label class="nebras-field"><span>من مستودع</span><select id="xfr-from">' + whOpts + '</select></label>' +
                    '<label class="nebras-field"><span>إلى مستودع</span><select id="xfr-to">' + whOpts + '</select></label>' +
                    '<label class="nebras-field"><span>الكمية</span><input type="number" id="xfr-qty" min="1" step="1" placeholder="0"></label>' +
                    '<label class="nebras-field nebras-field--wide"><span>ملاحظات</span><input type="text" id="xfr-note" placeholder="اختياري"></label>' +
                '</div>' +
                '<div class="erp-form-actions"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="addErpStockTransfer()"><i class="fas fa-dolly"></i> تنفيذ التحويل</button></div>';
        }

        function findInventoryBySkuWarehouse(sku, warehouse) {
            return erpInventory.find(function(i) {
                return String(i.sku).trim() === String(sku).trim() &&
                    String(i.warehouseAr || '').trim() === String(warehouse || '').trim();
            });
        }

        function applyStockTransferToInventory(transfer) {
            const sku = transfer.sku;
            const qty = erpNum(transfer.qty);
            const fromItem = findInventoryBySkuWarehouse(sku, transfer.fromWarehouse);
            if (!fromItem || erpNum(fromItem.qty) < qty) return false;
            fromItem.qty = erpNum(fromItem.qty) - qty;
            let toItem = findInventoryBySkuWarehouse(sku, transfer.toWarehouse);
            if (toItem) {
                toItem.qty = erpNum(toItem.qty) + qty;
            } else if (fromItem) {
                erpInventory.push({
                    id: 'inv-' + Date.now(),
                    sku: fromItem.sku,
                    nameAr: fromItem.nameAr,
                    nameEn: fromItem.nameEn,
                    warehouseAr: transfer.toWarehouse,
                    warehouseEn: transfer.toWarehouse,
                    qty: qty,
                    minQty: fromItem.minQty || 0,
                    unitAr: fromItem.unitAr || 'قطعة',
                    productLink: fromItem.productLink || ''
                });
            }
            return true;
        }

        function addErpStockTransfer() {
            if (!canManage('warehouse') && !canManage('inventory')) return;
            ensureErpOperationsData();
            const sku = fieldVal('xfr-sku');
            const fromWh = fieldVal('xfr-from');
            const toWh = fieldVal('xfr-to');
            const qty = erpNum(fieldVal('xfr-qty'));
            if (!sku || !fromWh || !toWh) { alert('اختر SKU والمستودعين.'); return; }
            if (fromWh === toWh) { alert('المستودع المصدر والوجهة يجب أن يكونا مختلفين.'); return; }
            if (qty <= 0) { alert('أدخل كمية صحيحة.'); return; }
            const sel = document.getElementById('xfr-sku');
            const opt = sel && sel.selectedOptions && sel.selectedOptions[0];
            const productAr = opt ? (opt.getAttribute('data-name') || sku) : sku;
            const transfer = {
                id: 'xfr-' + Date.now(),
                date: fieldVal('xfr-date') || erpToday(),
                sku: sku,
                productAr: productAr,
                qty: qty,
                fromWarehouse: fromWh,
                toWarehouse: toWh,
                status: 'completed',
                note: fieldVal('xfr-note'),
                by: erpActor()
            };
            const snapshot = {
                transfers: JSON.parse(JSON.stringify(erpStockTransfers)),
                inventory: JSON.parse(JSON.stringify(erpInventory))
            };
            if (!applyStockTransferToInventory(transfer)) {
                alert('الكمية غير متوفرة في المستودع المصدر.');
                return;
            }
            erpStockTransfers.unshift(transfer);
            saveSystemData({ skipCloud: true, skipMutationMark: true });
            persistErpStoresWithRollback(['erp_stock_transfers', 'erp_inventory'], function() {
                erpStockTransfers = snapshot.transfers;
                erpInventory = snapshot.inventory;
            }).then(function(cloudOk) {
                if (!cloudOk) {
                    renderErpStockTransferForm();
                    displayErpStockTransfers();
                    displayErpInventory();
                    return;
                }
                renderErpStockTransferForm();
                displayErpStockTransfers();
                displayErpInventory();
                renderErpHubPanel();
                if (currentAdmin) renderDashboardCommandShell(currentAdmin);
                addAuditLog('تحويل مخزون', sku + ': ' + fromWh + ' → ' + toWh + ' (' + qty + ')');
            });
        }

        function deleteErpStockTransfer(id) {
            if (!canManage('warehouse') && !canManage('inventory')) return;
            const t = erpStockTransfers.find(function(x) { return x.id === id; });
            if (!t || !confirm('حذف سجل التحويل؟ (لن يُعاد المخزون تلقائياً)')) return;
            erpStockTransfers = erpStockTransfers.filter(function(x) { return x.id !== id; });
            saveSystemData();
            displayErpStockTransfers();
        }

        function displayErpStockTransfers() {
            const list = document.getElementById('erp-stock-transfer-list');
            if (!list) return;
            const visible = filterErpEntriesForAdmin(erpStockTransfers || [], currentAdmin);
            const summary = document.getElementById('erp-stock-transfer-summary');
            const branchNote = isBranchScopedAdmin(currentAdmin)
                ? ' — فرع ' + escapeHtmlAttr(currentAdmin.assignedBranchCity || '')
                : '';
            if (summary) {
                summary.innerHTML =
                    '<div class="erp-stat"><strong>' + visible.length + '</strong><span>تحويلات مسجّلة' + branchNote + '</span></div>' +
                    '<div class="erp-stat"><strong>' + visible.filter(function(t) { return t.date === erpToday(); }).length + '</strong><span>اليوم</span></div>';
            }
            if (!visible.length) {
                list.innerHTML = '<p class="erp-empty">لا تحويلات بعد' + (branchNote ? ' لفرعك.' : '.') + '</p>';
                return;
            }
            list.innerHTML = visible.map(function(t) {
                return '<article class="erp-row">' +
                    '<div class="erp-row-main"><strong>' + escapeHtmlAttr(t.sku) + '</strong> — ' + escapeHtmlAttr(t.productAr || '') +
                        '<span class="erp-row-tags"><span class="erp-tag">' + escapeHtmlAttr(t.fromWarehouse) + ' → ' + escapeHtmlAttr(t.toWarehouse) + '</span></span>' +
                        '<small>' + escapeHtmlAttr(t.date) + ' · ' + erpNum(t.qty) + ' قطعة' +
                            (t.note ? ' · ' + escapeHtmlAttr(t.note) : '') + ' · ' + escapeHtmlAttr(t.by || '') + '</small>' +
                    '</div>' +
                    '<button type="button" class="erp-row-del" onclick="deleteErpStockTransfer(\'' + t.id + '\')" aria-label="حذف"><i class="fas fa-trash"></i></button>' +
                '</article>';
            }).join('');
        }

        /* ===================== NebrasERP — وحدات تشغيلية ===================== */
        function erpToday() {
            const d = new Date();
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }
        function erpNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
        function formatSar(v) {
            const n = erpNum(v);
            return n.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ر.س';
        }
        function erpActor() { return currentAdmin ? currentAdmin.username : 'system'; }
        function fieldVal(id) { const el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; }

        function ensureErpOperationsData() {
            if (!Array.isArray(erpProduction)) erpProduction = [];
            if (!Array.isArray(erpPurchases)) erpPurchases = [];
            ensureProcurementRegistry();
            erpPurchases = erpPurchases.map(normalizePurchaseRecord);
            if (!Array.isArray(erpTransfers)) erpTransfers = [];
            if (!Array.isArray(erpStockTransfers)) erpStockTransfers = [];
            if (!Array.isArray(salesPriceList)) salesPriceList = [];
        }

        /* ---------- الإنتاج اليومي ---------- */
        function openErpProduction() {
            if (!requirePermission('production', 'صلاحية الإنتاج مطلوبة.')) return;
            ensureErpOperationsData();
            renderErpProductionForm();
            displayErpProduction();
            revealPlatformLayer('erp-production');
        }

        function renderErpProductionForm() {
            const host = document.getElementById('erp-production-form');
            if (!host) return;
            const colorOpts = ['أبيض', 'بني', 'رمادي', 'بلوط', 'والنت', 'تيك', 'أسود', 'كريمي']
                .map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
            const sizeOpts = ['80×210', '90×210', '100×210', '80×230', '90×230', '100×230', '105×230', 'حسب الطلب']
                .map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join('');
            const lineOpts = ['خط 1', 'خط 2', 'خط 3', 'CNC', 'تجميع', 'تشطيب']
                .map(function(l) { return '<option value="' + l + '">' + l + '</option>'; }).join('');
            host.innerHTML =
                '<div class="erp-form-grid">' +
                    '<label class="nebras-field"><span>التاريخ</span><input type="date" id="prod-date" value="' + erpToday() + '"></label>' +
                    '<label class="nebras-field"><span>المنتج</span><input type="text" id="prod-product" placeholder="باب WPC فلات" list="prod-product-list"></label>' +
                    '<label class="nebras-field"><span>اللون</span><select id="prod-color">' + colorOpts + '</select></label>' +
                    '<label class="nebras-field"><span>المقاس</span><select id="prod-size">' + sizeOpts + '</select></label>' +
                    '<label class="nebras-field"><span>الكمية المُنتَجة</span><input type="number" id="prod-qty" min="0" step="1" placeholder="0"></label>' +
                    '<label class="nebras-field"><span>الوحدة</span><input type="text" id="prod-unit" value="قطعة"></label>' +
                    '<label class="nebras-field"><span>خط الإنتاج</span><select id="prod-line">' + lineOpts + '</select></label>' +
                    '<label class="nebras-field"><span>الفرع/المستودع</span><input type="text" id="prod-branch" value="القصيم — الرئيسي"></label>' +
                    '<label class="nebras-field nebras-field--wide"><span>ملاحظات</span><input type="text" id="prod-note" placeholder="اختياري"></label>' +
                    '<label class="erp-check nebras-field--wide"><input type="checkbox" id="prod-add-stock" checked> إضافة الكمية تلقائياً للمخزون المتاح</label>' +
                '</div>' +
                '<datalist id="prod-product-list">' +
                    (siteProducts || []).map(function(p) { return '<option value="' + escapeHtmlAttr(p.titleAr || '') + '">'; }).join('') +
                '</datalist>' +
                '<div class="erp-form-actions"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="addErpProductionEntry()"><i class="fas fa-plus"></i> تسجيل إنتاج اليوم</button></div>';
        }

        async function addErpProductionEntry() {
            if (!requirePermission('production')) return;
            ensureErpOperationsData();
            const product = fieldVal('prod-product');
            const qty = erpNum(fieldVal('prod-qty'));
            if (!product) { alert('يرجى إدخال اسم المنتج.'); return; }
            if (qty <= 0) { alert('يرجى إدخال كمية صحيحة.'); return; }
            const snapshot = {
                production: JSON.parse(JSON.stringify(erpProduction)),
                inventory: JSON.parse(JSON.stringify(erpInventory))
            };
            const entry = {
                id: 'prod-' + Date.now(),
                date: fieldVal('prod-date') || erpToday(),
                productAr: product,
                color: fieldVal('prod-color'),
                size: fieldVal('prod-size'),
                qty: qty,
                unitAr: fieldVal('prod-unit') || 'قطعة',
                lineAr: fieldVal('prod-line'),
                branch: fieldVal('prod-branch'),
                note: fieldVal('prod-note'),
                by: erpActor(),
                addedToStock: false
            };
            const addStock = (function() { const el = document.getElementById('prod-add-stock'); return el ? el.checked : false; })();
            if (addStock) {
                feedProductionToInventory(entry);
                entry.addedToStock = true;
            }
            erpProduction.unshift(entry);
            saveSystemData({ skipCloud: true, skipMutationMark: true });
            const cloudOk = await persistErpStoresWithRollback(['erp_production', 'erp_inventory'], function() {
                erpProduction = snapshot.production;
                erpInventory = snapshot.inventory;
            });
            if (!cloudOk) {
                renderErpProductionForm();
                displayErpProduction();
                return;
            }
            renderErpProductionForm();
            displayErpProduction();
            if (typeof displayErpInventory === 'function') displayErpInventory();
            renderErpHubPanel();
            addAuditLog('إنتاج', entry.productAr + ' ' + entry.color + ' ' + entry.size + ' × ' + entry.qty);
        }

        function feedProductionToInventory(entry) {
            ensureBuiltinErpData();
            const sku = 'PRD-' + (entry.productAr + '-' + entry.color + '-' + entry.size).replace(/\s+/g, '').toUpperCase().slice(0, 28);
            let item = erpInventory.find(function(i) { return i.sku === sku; });
            if (item) {
                item.qty = erpNum(item.qty) + erpNum(entry.qty);
            } else {
                erpInventory.push({
                    id: 'inv-' + Date.now(),
                    sku: sku,
                    nameAr: entry.productAr + ' ' + entry.color + ' ' + entry.size,
                    nameEn: entry.productAr,
                    warehouseAr: entry.branch || 'القصيم — الرئيسي',
                    warehouseEn: entry.branch || 'Qassim main',
                    qty: erpNum(entry.qty),
                    minQty: 10,
                    unitAr: entry.unitAr || 'قطعة',
                    productLink: ''
                });
            }
        }

        function deleteErpProductionEntry(id) {
            if (!requirePermission('production')) return;
            const entry = erpProduction.find(function(e) { return e.id === id; });
            if (!entry || !assertErpEntryInAdminScope(entry, currentAdmin, 'لا يمكنك حذف إنتاج خارج قسمك/فرعك.')) return;
            if (!confirm('حذف سجل إنتاج ' + entry.productAr + '؟')) return;
            erpProduction = erpProduction.filter(function(e) { return e.id !== id; });
            saveSystemData();
            displayErpProduction();
            renderErpHubPanel();
        }

        function displayErpProduction() {
            const list = document.getElementById('erp-production-list');
            if (!list) return;
            ensureErpOperationsData();
            const visible = filterErpEntriesForAdmin(erpProduction, currentAdmin);
            const today = erpToday();
            const todayQty = visible.filter(function(e) { return e.date === today; })
                .reduce(function(s, e) { return s + erpNum(e.qty); }, 0);
            const totalQty = visible.reduce(function(s, e) { return s + erpNum(e.qty); }, 0);
            const branchNote = isBranchScopedAdmin(currentAdmin) ? ' — فرع ' + escapeHtmlAttr(currentAdmin.assignedBranchCity || '') : '';
            const summary = document.getElementById('erp-production-summary');
            if (summary) {
                summary.innerHTML =
                    '<div class="erp-stat"><strong>' + todayQty + '</strong><span>إنتاج اليوم' + branchNote + '</span></div>' +
                    '<div class="erp-stat"><strong>' + totalQty + '</strong><span>إجمالي مُسجّل</span></div>' +
                    '<div class="erp-stat"><strong>' + visible.length + '</strong><span>عدد السجلات</span></div>';
            }
            if (!visible.length) {
                list.innerHTML = '<p class="erp-empty">لا سجلات إنتاج بعد — سجّل إنتاج اليوم من النموذج بالأعلى.</p>';
                return;
            }
            list.innerHTML = visible.map(function(e) {
                return '<article class="erp-row">' +
                    '<div class="erp-row-main"><strong>' + escapeHtmlAttr(e.productAr) + '</strong>' +
                        '<span class="erp-row-tags">' +
                            (e.color ? '<span class="erp-tag">' + escapeHtmlAttr(e.color) + '</span>' : '') +
                            (e.size ? '<span class="erp-tag">' + escapeHtmlAttr(e.size) + '</span>' : '') +
                            (e.lineAr ? '<span class="erp-tag erp-tag--line">' + escapeHtmlAttr(e.lineAr) + '</span>' : '') +
                            (e.addedToStock ? '<span class="erp-tag erp-tag--ok"><i class="fas fa-check"></i> أُضيف للمخزون</span>' : '') +
                        '</span>' +
                        '<small>' + escapeHtmlAttr(e.date) + ' · ' + escapeHtmlAttr(e.branch || '') + ' · بواسطة ' + escapeHtmlAttr(e.by || '') + (e.note ? ' · ' + escapeHtmlAttr(e.note) : '') + '</small>' +
                    '</div>' +
                    '<div class="erp-row-qty">' + erpNum(e.qty) + ' <small>' + escapeHtmlAttr(e.unitAr || '') + '</small></div>' +
                    '<button type="button" class="erp-row-del" onclick="deleteErpProductionEntry(\'' + e.id + '\')" aria-label="حذف"><i class="fas fa-trash"></i></button>' +
                '</article>';
            }).join('');
        }

        /* ---------- المشتريات — مصنع + فروع (ديناميكي) ---------- */
        function ensureProcurementRegistry() {
            if (!Array.isArray(procurementCustomDepts)) procurementCustomDepts = [];
        }

        function getProcurementDepartmentMap() {
            ensureProcurementRegistry();
            const map = {};
            Object.keys(DEFAULT_PROCUREMENT_DEPTS).forEach(function(k) { map[k] = DEFAULT_PROCUREMENT_DEPTS[k]; });
            if (typeof getHrFactoryDepts === 'function') {
                const hr = getHrFactoryDepts() || {};
                Object.keys(hr).forEach(function(k) { if (!map[k]) map[k] = hr[k]; });
            }
            procurementCustomDepts.forEach(function(d) {
                if (d && d.key && d.labelAr) map[d.key] = d.labelAr;
            });
            return map;
        }

        function getProcurementBranchRegistry() {
            ensureBuiltinBranches();
            const hq = { id: 'hq', city: 'المقر — مصنع نبراس', label: 'مصنع نبراس — المقر', type: 'factory' };
            const branches = (branchesData || []).map(function(b) {
                const city = String(b.city || b.cityAr || '').trim();
                return { id: String(b.id), city: city, label: city, type: 'branch' };
            }).filter(function(b) { return b.city; });
            return [hq].concat(branches);
        }

        function resolveProcurementBranchMeta(branchId) {
            const reg = getProcurementBranchRegistry();
            const hit = reg.find(function(b) { return String(b.id) === String(branchId); });
            if (hit) return { branchId: hit.id, branch: hit.city, scopeType: hit.type === 'factory' ? 'factory' : 'branch' };
            return { branchId: branchId || 'hq', branch: String(branchId || ''), scopeType: 'branch' };
        }

        function resolveProcurementDefaultsForAdmin() {
            const admin = currentAdmin;
            if (admin && !isMainGovernanceAdmin(admin) && getAdminAssignedBranchId(admin) != null) {
                const bid = String(getAdminAssignedBranchId(admin));
                const meta = resolveProcurementBranchMeta(bid);
                procurementViewScope = bid;
                return meta;
            }
            if (procurementViewScope === 'all-branches') {
                const firstBranch = getProcurementBranchRegistry().find(function(b) { return b.type === 'branch'; });
                if (firstBranch) return resolveProcurementBranchMeta(firstBranch.id);
            }
            return resolveProcurementBranchMeta(procurementViewScope === 'hq' ? 'hq' : procurementViewScope);
        }

        function filterPurchasesForProcurementView(purchases) {
            let list = (purchases || []).map(normalizePurchaseRecord);
            list = filterErpEntriesForAdmin(list, currentAdmin);
            if (procurementViewScope === 'all-branches') {
                return list.filter(function(p) { return String(p.branchId) !== 'hq' && p.scopeType !== 'factory'; });
            }
            if (procurementViewScope === 'hq') {
                return list.filter(function(p) {
                    return String(p.branchId) === 'hq' || p.scopeType === 'factory' ||
                        (!p.branchId && !p.branch);
                });
            }
            const branchName = getBranchNameById(procurementViewScope) || '';
            const needle = normalizeText(branchName);
            return list.filter(function(p) {
                if (String(p.branchId) === String(procurementViewScope)) return true;
                const pb = normalizeText(p.branch || '');
                return needle && pb && (pb.indexOf(needle) >= 0 || needle.indexOf(pb) >= 0);
            });
        }

        function normalizePurchaseRecord(p) {
            if (!p) return p;
            const deptMap = getProcurementDepartmentMap();
            if (p.departmentKey && !p.department) p.department = deptMap[p.departmentKey] || p.departmentKey;
            if (!p.branchId && p.branch) {
                const hit = getProcurementBranchRegistry().find(function(b) {
                    return b.city === p.branch || b.label === p.branch;
                });
                if (hit) {
                    p.branchId = hit.id;
                    p.scopeType = hit.type === 'factory' ? 'factory' : 'branch';
                }
            }
            if (!p.scopeType && String(p.branchId) === 'hq') p.scopeType = 'factory';
            return p;
        }

        function renderProcurementScopeToolbar() {
            const host = document.getElementById('erp-procurement-toolbar');
            if (!host) return;
            ensureBuiltinBranches();
            const reg = getProcurementBranchRegistry();
            const branchLocked = currentAdmin && !isMainGovernanceAdmin(currentAdmin) && isBranchScopedAdmin(currentAdmin);
            if (branchLocked) {
                const bid = String(getAdminAssignedBranchId(currentAdmin));
                const branch = reg.find(function(b) { return String(b.id) === bid; }) ||
                    reg.find(function(b) { return b.type === 'branch'; });
                const label = branch ? branch.label : (currentAdmin.assignedBranchCity || 'فرعي');
                host.innerHTML =
                    '<div class="proc-scope-tabs proc-scope-tabs--locked">' +
                        '<span class="proc-scope-lock-badge"><i class="fas fa-lock"></i> نطاق فرعك فقط</span>' +
                        '<button type="button" class="proc-scope-tab proc-scope-tab--branch proc-scope-tab--active" onclick="setProcurementViewScope(\'' + escapeHtmlAttr(bid) + '\')"><i class="fas fa-store"></i> ' + escapeHtmlAttr(label) + '</button>' +
                    '</div>';
                return;
            }
            const branchChips = reg.filter(function(b) { return b.type === 'branch'; }).map(function(b) {
                const active = String(procurementViewScope) === String(b.id) ? ' proc-scope-tab--active' : '';
                return '<button type="button" class="proc-scope-tab proc-scope-tab--branch' + active + '" onclick="setProcurementViewScope(\'' + escapeHtmlAttr(String(b.id)) + '\')"><i class="fas fa-store"></i> ' + escapeHtmlAttr(b.label) + '</button>';
            }).join('');
            const hqActive = procurementViewScope === 'hq' ? ' proc-scope-tab--active' : '';
            const allBranchesActive = procurementViewScope === 'all-branches' ? ' proc-scope-tab--active' : '';
            const canAddDept = isMainGovernanceAdmin();
            host.innerHTML =
                '<div class="proc-scope-tabs">' +
                    '<button type="button" class="proc-scope-tab proc-scope-tab--factory' + hqActive + '" onclick="setProcurementViewScope(\'hq\')"><i class="fas fa-industry"></i> مصنع نبراس</button>' +
                    '<button type="button" class="proc-scope-tab' + allBranchesActive + '" onclick="setProcurementViewScope(\'all-branches\')"><i class="fas fa-map-marked-alt"></i> كل الفروع</button>' +
                    branchChips +
                '</div>' +
                (canAddDept
                    ? '<div class="proc-scope-actions"><button type="button" class="nebras-users-btn" onclick="addProcurementDepartmentFromUi()"><i class="fas fa-plus"></i> قسم مشتريات جديد</button></div>'
                    : '');
        }

        function setProcurementViewScope(scope) {
            procurementViewScope = scope || 'hq';
            renderProcurementScopeToolbar();
            renderErpProcurementForm();
            displayErpProcurement();
        }

        function refreshProcurementPanels() {
            const panel = document.getElementById('erp-procurement');
            if (!panel || !panel.classList.contains('show')) return;
            renderProcurementScopeToolbar();
            renderErpProcurementForm();
            displayErpProcurement();
        }

        function addProcurementDepartmentFromUi() {
            if (!requireMainGovernanceAdmin('إضافة أقسام المشتريات — الإدارة الرئيسية فقط.')) return;
            const label = prompt('اسم القسم الجديد (مثال: مختبر الجودة · ورشة لحام):');
            if (!label || !String(label).trim()) return;
            ensureProcurementRegistry();
            const key = 'custom_' + Date.now();
            procurementCustomDepts.unshift({
                key: key,
                labelAr: String(label).trim(),
                addedBy: erpActor(),
                addedAt: new Date().toISOString()
            });
            saveSystemData();
            renderErpProcurementForm();
            displayErpProcurement();
            addAuditLog('قسم مشتريات', label);
            if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تمت إضافة القسم — يظهر في كل الفروع تلقائياً.', 'ok');
        }

        function openErpProcurement() {
            if (!requirePermission('procurement', 'صلاحية المشتريات مطلوبة.')) return;
            ensureErpOperationsData();
            ensureProcurementRegistry();
            if (currentAdmin && !isMainGovernanceAdmin(currentAdmin) && getAdminAssignedBranchId(currentAdmin) != null) {
                procurementViewScope = String(getAdminAssignedBranchId(currentAdmin));
            }
            renderProcurementScopeToolbar();
            renderErpProcurementForm();
            displayErpProcurement();
            const el = document.getElementById('erp-procurement');
            if (el) revealPlatformLayer('erp-procurement');
        }

        function renderErpProcurementForm() {
            const host = document.getElementById('erp-procurement-form');
            if (!host) return;
            const defaults = resolveProcurementDefaultsForAdmin();
            const branchLocked = currentAdmin && !isMainGovernanceAdmin(currentAdmin) && getAdminAssignedBranchId(currentAdmin) != null;
            const branchOpts = buildProcurementBranchSelectOptions(defaults.branchId);
            const deptOpts = Object.keys(getProcurementDepartmentMap()).map(function(k) {
                const map = getProcurementDepartmentMap();
                return '<option value="' + escapeHtmlAttr(k) + '">' + escapeHtmlAttr(map[k]) + '</option>';
            }).join('');
            const scopeHint = defaults.scopeType === 'factory'
                ? 'تسجيل مشتريات المصنع — المقر'
                : ('مشتريات فرع: ' + escapeHtmlAttr(defaults.branch || ''));
            host.innerHTML =
                '<h3 class="nebras-erp-subhead"><i class="fas fa-plus-circle"></i> أمر شراء جديد — <small>' + scopeHint + '</small></h3>' +
                '<div class="erp-form-grid">' +
                    '<label class="nebras-field"><span>النطاق / الفرع</span><select id="pur-branch"' + (branchLocked ? ' disabled' : '') + ' onchange="onProcurementBranchChange()"><option value="">— اختر —</option>' + branchOpts + '</select></label>' +
                    '<label class="nebras-field"><span>القسم المعني</span><select id="pur-dept" required><option value="">— القسم —</option>' + deptOpts + '</select></label>' +
                    '<label class="nebras-field"><span>التاريخ</span><input type="date" id="pur-date" value="' + erpToday() + '"></label>' +
                    '<label class="nebras-field"><span>المورّد</span><input type="text" id="pur-supplier" placeholder="اسم المورّد"></label>' +
                    '<label class="nebras-field"><span>الصنف / المادة</span><input type="text" id="pur-item" placeholder="حبيبات PVC · قطع غيار · مواد بناء"></label>' +
                    '<label class="nebras-field"><span>الكمية</span><input type="number" id="pur-qty" min="0" step="any" placeholder="0"></label>' +
                    '<label class="nebras-field"><span>سعر الوحدة (ر.س)</span><input type="number" id="pur-cost" min="0" step="any" placeholder="0" oninput="updatePurchaseTotalHint()"></label>' +
                    '<label class="nebras-field"><span>الحالة</span><select id="pur-status"><option value="pending">قيد الطلب</option><option value="received">مستلَم</option><option value="paid">مدفوع</option></select></label>' +
                    '<label class="nebras-field nebras-field--wide"><span>ملاحظات</span><input type="text" id="pur-note" placeholder="اختياري"></label>' +
                '</div>' +
                '<div class="erp-form-actions"><span class="erp-total-hint" id="pur-total-hint">الإجمالي: 0 ر.س</span>' +
                    '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="addErpPurchase()"><i class="fas fa-plus"></i> تسجيل أمر شراء</button></div>';
            const branchSel = document.getElementById('pur-branch');
            if (branchSel && defaults.branchId) branchSel.value = String(defaults.branchId);
        }

        function onProcurementBranchChange() {
            const bid = fieldVal('pur-branch');
            if (bid) procurementViewScope = bid;
        }

        function updatePurchaseTotalHint() {
            const hint = document.getElementById('pur-total-hint');
            if (!hint) return;
            const total = erpNum(fieldVal('pur-qty')) * erpNum(fieldVal('pur-cost'));
            hint.textContent = 'الإجمالي: ' + formatSar(total);
        }

        function buildProcurementBranchSelectOptions(selectedId) {
            return getProcurementBranchRegistry().map(function(b) {
                const sel = String(selectedId) === String(b.id) ? ' selected' : '';
                return '<option value="' + escapeHtmlAttr(b.id) + '"' + sel + '>' + escapeHtmlAttr(b.label) + '</option>';
            }).join('');
        }

        function addErpPurchase() {
            if (!requirePermission('procurement')) return;
            ensureErpOperationsData();
            const supplier = fieldVal('pur-supplier');
            const item = fieldVal('pur-item');
            const qty = erpNum(fieldVal('pur-qty'));
            const unitCost = erpNum(fieldVal('pur-cost'));
            const deptKey = fieldVal('pur-dept');
            const deptMap = getProcurementDepartmentMap();
            if (!supplier || !item) { alert('يرجى إدخال المورّد والصنف.'); return; }
            if (!deptKey) { alert('اختر القسم المعني بالمشتريات.'); return; }
            let branchId = fieldVal('pur-branch') || procurementViewScope;
            if (branchId === 'all-branches') branchId = resolveProcurementDefaultsForAdmin().branchId;
            const branchMeta = resolveProcurementBranchMeta(branchId);
            const draft = normalizePurchaseRecord({
                id: 'pur-' + Date.now(),
                date: fieldVal('pur-date') || erpToday(),
                supplier: supplier,
                item: item,
                qty: qty,
                unitCost: unitCost,
                total: qty * unitCost,
                status: fieldVal('pur-status') || 'pending',
                note: fieldVal('pur-note'),
                branchId: branchMeta.branchId,
                branch: branchMeta.branch,
                scopeType: branchMeta.scopeType,
                departmentKey: deptKey,
                department: deptMap[deptKey] || deptKey,
                by: erpActor()
            });
            if (!assertErpEntryInAdminScope(draft, currentAdmin, 'لا يمكنك تسجيل مشتريات خارج نطاق فرعك أو قسمك.')) return;
            erpPurchases.unshift(draft);
            saveSystemData();
            renderErpProcurementForm();
            displayErpProcurement();
            renderErpHubPanel();
            if (currentAdmin) renderDashboardCommandShell(currentAdmin);
            addAuditLog('مشتريات', branchMeta.branch + ' · ' + (deptMap[deptKey] || deptKey) + ' — ' + supplier + ' — ' + item);
        }

        function deleteErpPurchase(id) {
            if (!requirePermission('procurement')) return;
            const p = erpPurchases.find(function(x) { return x.id === id; });
            if (!p || !confirm('حذف أمر الشراء؟')) return;
            if (!assertErpEntryInAdminScope(p, currentAdmin, 'لا يمكنك حذف مشتريات خارج نطاقك.')) return;
            erpPurchases = erpPurchases.filter(function(x) { return x.id !== id; });
            saveSystemData();
            displayErpProcurement();
        }

        function displayErpProcurement() {
            const list = document.getElementById('erp-procurement-list');
            if (!list) return;
            ensureErpOperationsData();
            const visible = filterPurchasesForProcurementView(erpPurchases);
            const total = visible.reduce(function(s, p) { return s + erpNum(p.total); }, 0);
            const summary = document.getElementById('erp-procurement-summary');
            const reg = getProcurementBranchRegistry();
            const scopeLabel = procurementViewScope === 'hq' ? 'المصنع' :
                (procurementViewScope === 'all-branches' ? 'كل الفروع' :
                    ((reg.find(function(b) { return String(b.id) === String(procurementViewScope); }) || {}).label || procurementViewScope));
            if (summary) {
                summary.innerHTML =
                    '<div class="erp-stat erp-stat--accent"><strong>' + visible.length + '</strong><span>أوامر — ' + escapeHtmlAttr(scopeLabel) + '</span></div>' +
                    '<div class="erp-stat"><strong>' + formatSar(total) + '</strong><span>إجمالي النطاق</span></div>' +
                    '<div class="erp-stat"><strong>' + reg.filter(function(b) { return b.type === 'branch'; }).length + '</strong><span>فروع نشطة</span></div>' +
                    '<div class="erp-stat"><strong>' + Object.keys(getProcurementDepartmentMap()).length + '</strong><span>أقسام معنية</span></div>';
            }
            const statusLabel = { pending: 'قيد الطلب', received: 'مستلَم', paid: 'مدفوع' };
            if (!visible.length) {
                list.innerHTML = '<p class="erp-empty">لا أوامر شراء في هذا النطاق — سجّلي أول أمر من النموذج أعلاه.</p>';
                return;
            }
            list.innerHTML = visible.map(function(p) {
                p = normalizePurchaseRecord(p);
                const deptTag = p.department ? '<span class="erp-tag erp-tag--accent">' + escapeHtmlAttr(p.department) + '</span>' : '';
                const branchTag = p.branch ? '<span class="erp-tag">' + escapeHtmlAttr(p.branch) + '</span>' : '';
                return '<article class="erp-row">' +
                    '<div class="erp-row-main"><strong>' + escapeHtmlAttr(p.item) + '</strong>' +
                        '<span class="erp-row-tags"><span class="erp-tag">' + escapeHtmlAttr(p.supplier) + '</span>' +
                            branchTag + deptTag +
                            '<span class="erp-tag erp-tag--status-' + escapeHtmlAttr(p.status) + '">' + escapeHtmlAttr(statusLabel[p.status] || p.status) + '</span></span>' +
                        '<small>' + escapeHtmlAttr(p.date) + ' · ' + erpNum(p.qty) + ' × ' + formatSar(p.unitCost) + (p.note ? ' · ' + escapeHtmlAttr(p.note) : '') + '</small>' +
                    '</div>' +
                    '<div class="erp-row-qty">' + formatSar(p.total) + '</div>' +
                    '<button type="button" class="erp-row-del" onclick="deleteErpPurchase(\'' + escapeHtmlAttr(String(p.id).replace(/'/g, "\\'")) + '\')" aria-label="حذف"><i class="fas fa-trash"></i></button>' +
                '</article>';
            }).join('');
        }

        /* ---------- المحاسبة والتحويلات ---------- */
        function openErpAccounting() {
            if (!requirePermission('accounting', 'صلاحية المحاسبة مطلوبة.')) return;
            ensureErpOperationsData();
            renderErpAccountingForm();
            displayErpAccounting();
            revealPlatformLayer('erp-accounting');
        }

        function getQuoteTransferEntries() {
            const inbox = (typeof loadSalesQuotesInbox === 'function') ? (loadSalesQuotesInbox() || []) : [];
            return inbox.filter(function(q) { return q && (q.transferReceiptDataUrl || q.bankAr || q.paymentMethod === 'transfer'); })
                .map(function(q) {
                    return {
                        id: 'q-' + (q.id || q.quoteNo),
                        date: (q.at || '').slice(0, 10) || erpToday(),
                        customerName: q.customerName || '—',
                        bankAr: q.bankAr || 'تحويل بنكي',
                        amount: erpNum(q.totalIncVat || q.total || 0),
                        refNo: q.transferRef || '',
                        quoteNo: q.quoteNo || '',
                        status: 'from-quote',
                        source: 'quote'
                    };
                });
        }

        function renderErpAccountingForm() {
            const host = document.getElementById('erp-accounting-form');
            if (!host) return;
            host.innerHTML =
                '<div class="erp-form-grid">' +
                    '<label class="nebras-field"><span>التاريخ</span><input type="date" id="trf-date" value="' + erpToday() + '"></label>' +
                    '<label class="nebras-field"><span>اسم العميل</span><input type="text" id="trf-customer" placeholder="اسم العميل"></label>' +
                    '<label class="nebras-field"><span>البنك</span><input type="text" id="trf-bank" placeholder="الراجحي / الأهلي ..."></label>' +
                    '<label class="nebras-field"><span>المبلغ (ر.س)</span><input type="number" id="trf-amount" min="0" step="any" placeholder="0"></label>' +
                    '<label class="nebras-field"><span>رقم العملية</span><input type="text" id="trf-ref" placeholder="مرجع التحويل"></label>' +
                    '<label class="nebras-field"><span>رقم العرض (اختياري)</span><input type="text" id="trf-quote" placeholder="NEB-..."></label>' +
                '</div>' +
                '<div class="erp-form-actions"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="addErpTransfer()"><i class="fas fa-plus"></i> تسجيل تحويل</button></div>';
        }

        function addErpTransfer() {
            if (!requirePermission('accounting')) return;
            ensureErpOperationsData();
            const customer = fieldVal('trf-customer');
            const amount = erpNum(fieldVal('trf-amount'));
            if (!customer || amount <= 0) { alert('يرجى إدخال العميل والمبلغ.'); return; }
            erpTransfers.unshift({
                id: 'trf-' + Date.now(),
                date: fieldVal('trf-date') || erpToday(),
                customerName: customer,
                bankAr: fieldVal('trf-bank') || 'تحويل بنكي',
                amount: amount,
                refNo: fieldVal('trf-ref'),
                quoteNo: fieldVal('trf-quote'),
                status: 'confirmed',
                by: erpActor()
            });
            saveSystemData();
            renderErpAccountingForm();
            displayErpAccounting();
            addAuditLog('تحويل بنكي', customer + ' — ' + formatSar(amount));
        }

        function deleteErpTransfer(id) {
            if (!requirePermission('accounting')) return;
            erpTransfers = erpTransfers.filter(function(x) { return x.id !== id; });
            saveSystemData();
            displayErpAccounting();
        }

        function getNebrasAccountingSnapshot() {
            ensureErpOperationsData();
            const admin = typeof currentAdmin !== 'undefined' ? currentAdmin : null;
            const manualTransfers = filterErpEntriesForAdmin(erpTransfers.slice(), admin);
            const quoteTransfers = filterErpEntriesForAdmin(getQuoteTransferEntries(), admin);
            const transfers = quoteTransfers.concat(manualTransfers);
            const sales = filterErpEntriesForAdmin(salesData || [], admin);
            const purchases = filterErpEntriesForAdmin(erpPurchases, admin);
            const salesTotal = sales.reduce(function(s, x) { return s + erpNum(x.amount); }, 0);
            const transfersTotal = transfers.reduce(function(s, t) { return s + erpNum(t.amount); }, 0);
            const purchasesTotal = purchases.reduce(function(s, p) { return s + erpNum(p.total); }, 0);
            const scope = admin && isBranchScopedAdmin(admin)
                ? ('فرع ' + (admin.assignedBranchCity || admin.assignedBranchId || ''))
                : 'الإدارة الرئيسية — كل الفروع';
            return {
                transfers: transfers,
                sales: sales,
                purchases: purchases,
                salesTotal: salesTotal,
                transfersTotal: transfersTotal,
                purchasesTotal: purchasesTotal,
                profit: salesTotal - purchasesTotal,
                scope: scope
            };
        }

        function addNebrasAccountingTransfer(payload) {
            if (!requirePermission('accounting')) return false;
            payload = payload || {};
            ensureErpOperationsData();
            const customer = String(payload.customerName || '').trim();
            const amount = erpNum(payload.amount);
            if (!customer || amount <= 0) return false;
            erpTransfers.unshift({
                id: 'trf-' + Date.now(),
                date: payload.date || erpToday(),
                customerName: customer,
                bankAr: payload.bankAr || 'تحويل بنكي',
                amount: amount,
                refNo: payload.refNo || '',
                quoteNo: payload.quoteNo || '',
                status: 'confirmed',
                by: erpActor()
            });
            saveSystemData();
            addAuditLog('تحويل بنكي', customer + ' — ' + formatSar(amount));
            return true;
        }

        function displayErpAccounting() {
            ensureErpOperationsData();
            const manualTransfers = filterErpEntriesForAdmin(erpTransfers.slice(), currentAdmin);
            const quoteTransfers = filterErpEntriesForAdmin(getQuoteTransferEntries(), currentAdmin);
            const allTransfers = quoteTransfers.concat(manualTransfers);
            const scopedSales = filterErpEntriesForAdmin(salesData || [], currentAdmin);
            const scopedPurchases = filterErpEntriesForAdmin(erpPurchases, currentAdmin);
            const transfersTotal = allTransfers.reduce(function(s, t) { return s + erpNum(t.amount); }, 0);
            const salesTotal = scopedSales.reduce(function(s, x) { return s + erpNum(x.amount); }, 0);
            const purchasesTotal = scopedPurchases.reduce(function(s, p) { return s + erpNum(p.total); }, 0);
            const profit = salesTotal - purchasesTotal;
            const branchTag = isBranchScopedAdmin(currentAdmin)
                ? ' — فرع ' + escapeHtmlAttr(currentAdmin.assignedBranchCity || '')
                : '';

            const kpi = document.getElementById('erp-accounting-kpi');
            if (kpi) {
                kpi.innerHTML =
                    '<div class="erp-stat erp-stat--accent"><strong>' + formatSar(salesTotal) + '</strong><span>مبيعات' + branchTag + '</span></div>' +
                    '<div class="erp-stat"><strong>' + formatSar(transfersTotal) + '</strong><span>تحويلات' + branchTag + '</span></div>' +
                    '<div class="erp-stat"><strong>' + formatSar(purchasesTotal) + '</strong><span>مشتريات' + branchTag + '</span></div>' +
                    '<div class="erp-stat ' + (profit >= 0 ? 'erp-stat--ok' : 'erp-stat--danger') + '"><strong>' + formatSar(profit) + '</strong><span>هامش الربح التقديري</span></div>';
            }

            const list = document.getElementById('erp-accounting-list');
            if (list) {
                if (!allTransfers.length) {
                    list.innerHTML = '<p class="erp-empty">لا تحويلات مسجّلة — تظهر هنا تحويلات العملاء من العروض والتسجيل اليدوي.</p>';
                } else {
                    list.innerHTML = allTransfers.map(function(t) {
                        const src = t.source === 'quote'
                            ? '<span class="erp-tag erp-tag--line">من عرض ' + escapeHtmlAttr(t.quoteNo || '') + '</span>'
                            : '<span class="erp-tag erp-tag--ok">يدوي</span>';
                        const delBtn = t.source === 'quote' ? '' :
                            '<button type="button" class="erp-row-del" onclick="deleteErpTransfer(\'' + t.id + '\')" aria-label="حذف"><i class="fas fa-trash"></i></button>';
                        return '<article class="erp-row">' +
                            '<div class="erp-row-main"><strong>' + escapeHtmlAttr(t.customerName) + '</strong>' +
                                '<span class="erp-row-tags"><span class="erp-tag">' + escapeHtmlAttr(t.bankAr) + '</span>' + src + '</span>' +
                                '<small>' + escapeHtmlAttr(t.date) + (t.refNo ? ' · مرجع ' + escapeHtmlAttr(t.refNo) : '') + '</small>' +
                            '</div>' +
                            '<div class="erp-row-qty">' + formatSar(t.amount) + '</div>' + delBtn +
                        '</article>';
                    }).join('');
                }
            }
        }

        if (typeof window !== 'undefined') {
            window.__NEBRAS_ERP_UI_LOADED__ = true;
            window.__nebrasErp_renderErpHubPanel = renderErpHubPanel;
            window.__nebrasErp_openErpModule = openErpModule;
            window.__nebrasErp_openErpInventory = openErpInventory;
            window.__nebrasErp_openErpOrders = openErpOrders;
            window.__nebrasErp_openErpProduction = openErpProduction;
            window.__nebrasErp_openErpProcurement = openErpProcurement;
            window.__nebrasErp_openErpAccounting = openErpAccounting;
            window.__nebrasErp_openErpWarehouseTransfers = openErpWarehouseTransfers;
            window.openErpModule = openErpModule;
            window.openErpInventory = openErpInventory;
            window.openErpProduction = openErpProduction;
            window.addErpProductionEntry = addErpProductionEntry;
            window.deleteErpProductionEntry = deleteErpProductionEntry;
            window.openErpProcurement = openErpProcurement;
            window.addErpPurchase = addErpPurchase;
            window.deleteErpPurchase = deleteErpPurchase;
            window.openErpAccounting = openErpAccounting;
            window.addErpTransfer = addErpTransfer;
            window.deleteErpTransfer = deleteErpTransfer;
            window.openErpOrders = openErpOrders;
            window.addErpOrder = addErpOrder;
            window.updateErpOrderStatus = updateErpOrderStatus;
            window.deleteErpOrder = deleteErpOrder;
            window.saveErpInventoryItem = saveErpInventoryItem;
            window.editErpInventoryItem = editErpInventoryItem;
            window.cancelErpInventoryEdit = cancelErpInventoryEdit;
            window.deleteErpInventoryItem = deleteErpInventoryItem;
            window.openErpWarehouseTransfers = openErpWarehouseTransfers;
            window.addErpStockTransfer = addErpStockTransfer;
            window.deleteErpStockTransfer = deleteErpStockTransfer;
        }
