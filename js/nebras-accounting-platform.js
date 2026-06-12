/**
 * نبراس — منصة الحسابات
 * تحويلات · مبيعات · مشتريات · هامش ربح · تقارير PDF — المقر والفروع
 */
(function(global) {
    'use strict';

    const ACC_TAB_KEY = 'nebrasAccActiveTab';
    let accActiveTab = 'dashboard';

    const ACC_TABS = [
        { id: 'dashboard', icon: 'fas fa-gauge-high', label: 'لوحة الحسابات', group: 'الرئيسية' },
        { id: 'transfers', icon: 'fas fa-building-columns', label: 'التحويلات البنكية', group: 'العمليات' },
        { id: 'sales', icon: 'fas fa-chart-line', label: 'سجل المبيعات', group: 'العمليات' },
        { id: 'purchases', icon: 'fas fa-truck-ramp-box', label: 'المشتريات', group: 'العمليات' },
        { id: 'profit', icon: 'fas fa-coins', label: 'الربحية', group: 'التقارير' },
        { id: 'reports', icon: 'fas fa-file-pdf', label: 'تصدير PDF', group: 'التقارير' }
    ];

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function escAttr(s) { return esc(s).replace(/'/g, '&#39;'); }

    function canAccessAccounting(user) {
        user = user || (typeof currentAdmin !== 'undefined' ? currentAdmin : null);
        if (!user) return false;
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin(user)) return true;
        if (typeof canManage === 'function') {
            return canManage('accounting', user) || canManage('erp', user);
        }
        return false;
    }

    function requireAccountingAccess() {
        if (!canAccessAccounting()) {
            alert('صلاحية الحسابات غير متاحة لحسابك.');
            return false;
        }
        return true;
    }

    function getAccountingScopeLabel() {
        const u = typeof currentAdmin !== 'undefined' ? currentAdmin : null;
        if (!u) return '—';
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin(u)) return 'الإدارة الرئيسية — كل الفروع';
        return u.assignedBranchCity ? ('فرع ' + u.assignedBranchCity) : 'نطاق محاسبي';
    }

    function getAccountingSnapshot() {
        if (typeof getNebrasAccountingSnapshot === 'function') return getNebrasAccountingSnapshot();
        return { transfers: [], sales: [], purchases: [], scope: '—', salesTotal: 0, transfersTotal: 0, purchasesTotal: 0, profit: 0 };
    }

    function formatMoney(n) {
        const v = Number(n) || 0;
        if (typeof formatSar === 'function') return formatSar(v);
        return v.toLocaleString('ar-SA') + ' ر.س';
    }

    function formatDate(d) {
        if (!d) return '—';
        try { return new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('ar-SA'); } catch (e) { return d; }
    }

    function renderAccNav() {
        const nav = document.getElementById('acc-ws-nav');
        if (!nav) return;
        const groups = [];
        const map = {};
        ACC_TABS.forEach(function(t) {
            const g = t.group || 'النظام';
            if (!map[g]) { map[g] = []; groups.push(g); }
            map[g].push(t);
        });
        nav.innerHTML = groups.map(function(g) {
            return '<div class="hr-ws-nav-group"><span class="hr-ws-nav-group-label">' + esc(g) + '</span>' +
                map[g].map(function(t) {
                    return '<button type="button" class="hr-ws-nav-item' + (accActiveTab === t.id ? ' is-active' : '') +
                        '" data-acc-tab="' + escAttr(t.id) + '" onclick="switchAccountingTab(\'' + escAttr(t.id) + '\')">' +
                        '<i class="' + t.icon + '"></i> ' + esc(t.label) + '</button>';
                }).join('') + '</div>';
        }).join('');
    }

    function renderAccSummary() {
        const strip = document.getElementById('accounting-platform-summary');
        if (!strip) return;
        const s = getAccountingSnapshot();
        strip.innerHTML =
            '<div class="erp-stat erp-stat--accent"><strong>' + formatMoney(s.salesTotal) + '</strong><span>مبيعات</span></div>' +
            '<div class="erp-stat"><strong>' + formatMoney(s.transfersTotal) + '</strong><span>تحويلات</span></div>' +
            '<div class="erp-stat"><strong>' + formatMoney(s.purchasesTotal) + '</strong><span>مشتريات</span></div>' +
            '<div class="erp-stat ' + (s.profit >= 0 ? 'erp-stat--ok' : 'erp-stat--danger') + '"><strong>' + formatMoney(s.profit) + '</strong><span>هامش الربح</span></div>';
    }

    function renderAccDashboard() {
        const s = getAccountingSnapshot();
        return '<div class="acc-command-hero">' +
            '<div class="acc-command-hero-inner">' +
            '<span class="hr-command-pill acc-pill"><i class="fas fa-calculator"></i> نبراس Accounting</span>' +
            '<h2 class="hr-command-title">قسم الحسابات — مصنع نبراس WPC</h2>' +
            '<p class="hr-command-sub">تحويلات بنكية · مبيعات · مشتريات · تقارير PDF — ' + esc(s.scope) + '</p>' +
            '</div></div>' +
            '<div class="acc-dash-grid">' +
            '<article class="acc-dash-card"><h3><i class="fas fa-chart-line"></i> المبيعات</h3><strong>' + formatMoney(s.salesTotal) + '</strong><small>' + s.sales.length + ' عملية</small></article>' +
            '<article class="acc-dash-card"><h3><i class="fas fa-building-columns"></i> التحويلات</h3><strong>' + formatMoney(s.transfersTotal) + '</strong><small>' + s.transfers.length + ' تحويل</small></article>' +
            '<article class="acc-dash-card"><h3><i class="fas fa-truck-ramp-box"></i> المشتريات</h3><strong>' + formatMoney(s.purchasesTotal) + '</strong><small>' + s.purchases.length + ' أمر</small></article>' +
            '<article class="acc-dash-card acc-dash-card--' + (s.profit >= 0 ? 'ok' : 'danger') + '"><h3><i class="fas fa-coins"></i> الربحية</h3><strong>' + formatMoney(s.profit) + '</strong><small>مبيعات − مشتريات</small></article>' +
            '</div>' +
            '<div class="acc-quick-row">' +
            '<button type="button" class="hr-command-quick-btn" onclick="switchAccountingTab(\'transfers\')"><i class="fas fa-plus"></i> تسجيل تحويل</button>' +
            '<button type="button" class="hr-command-quick-btn" onclick="switchAccountingTab(\'reports\')"><i class="fas fa-file-pdf"></i> تقرير PDF شامل</button>' +
            '<button type="button" class="hr-command-quick-btn" onclick="switchAccountingTab(\'purchases\')"><i class="fas fa-truck-ramp-box"></i> المشتريات</button>' +
            '</div>';
    }

    function renderTransferForm() {
        const today = typeof erpToday === 'function' ? erpToday() : new Date().toISOString().slice(0, 10);
        return '<div class="acc-editor">' +
            '<h4><i class="fas fa-building-columns"></i> تسجيل تحويل بنكي</h4>' +
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>التاريخ</span><input type="date" id="acc-trf-date" value="' + today + '"></label>' +
            '<label class="nebras-field"><span>اسم العميل</span><input id="acc-trf-customer" placeholder="اسم العميل"></label>' +
            '<label class="nebras-field"><span>البنك</span><input id="acc-trf-bank" placeholder="الراجحي / الأهلي"></label>' +
            '<label class="nebras-field"><span>المبلغ (ر.س)</span><input type="number" id="acc-trf-amount" min="0" step="any"></label>' +
            '<label class="nebras-field"><span>رقم العملية</span><input id="acc-trf-ref"></label>' +
            '<label class="nebras-field"><span>رقم العرض</span><input id="acc-trf-quote" placeholder="اختياري"></label>' +
            '</div>' +
            '<div class="erp-form-actions"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveAccountingTransfer()"><i class="fas fa-save"></i> حفظ</button></div></div>';
    }

    function renderAccTransfersPanel() {
        const s = getAccountingSnapshot();
        const rows = s.transfers.map(function(t) {
            const src = t.source === 'quote' ? '<span class="erp-tag erp-tag--line">من عرض</span>' : '<span class="erp-tag erp-tag--ok">يدوي</span>';
            const del = t.source === 'quote' ? '' :
                '<button type="button" class="erp-tag erp-tag--danger" onclick="deleteAccountingTransfer(\'' + escAttr(t.id) + '\')"><i class="fas fa-trash"></i></button>';
            return '<article class="acc-row">' +
                '<div><strong>' + esc(t.customerName) + '</strong><small>' + formatDate(t.date) + ' · ' + esc(t.bankAr || '') + ' ' + src + '</small></div>' +
                '<strong class="acc-row-amt">' + formatMoney(t.amount) + '</strong>' + del + '</article>';
        }).join('');
        return renderTransferForm() +
            '<h4><i class="fas fa-list"></i> سجل التحويلات</h4>' +
            (rows || '<p class="erp-empty">لا تحويلات — تُستورد تلقائياً من عروض العملاء.</p>');
    }

    function renderAccSalesPanel() {
        const s = getAccountingSnapshot();
        const rows = s.sales.map(function(x) {
            return '<tr><td>' + formatDate(x.date) + '</td><td>' + esc(x.customerName || x.customer || '—') + '</td>' +
                '<td>' + esc(x.product || x.description || '—') + '</td><td><strong>' + formatMoney(x.amount) + '</strong></td></tr>';
        }).join('');
        return '<div class="acc-toolbar"><button type="button" class="erp-btn erp-btn--primary" onclick="exportAccountingPdf(\'sales\')"><i class="fas fa-file-pdf"></i> PDF المبيعات</button></div>' +
            '<div class="erp-table-wrap"><table class="erp-table"><thead><tr><th>التاريخ</th><th>العميل</th><th>الوصف</th><th>المبلغ</th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="4" class="erp-empty">لا مبيعات في نطاقك</td></tr>') + '</tbody></table></div>';
    }

    function renderAccPurchasesPanel() {
        const s = getAccountingSnapshot();
        const rows = s.purchases.map(function(p) {
            return '<tr><td>' + formatDate(p.date) + '</td><td>' + esc(p.supplier || '—') + '</td>' +
                '<td>' + esc(p.description || p.item || '—') + '</td><td><strong>' + formatMoney(p.total) + '</strong></td></tr>';
        }).join('');
        return '<div class="acc-toolbar">' +
            '<button type="button" class="erp-btn erp-btn--primary" onclick="exportAccountingPdf(\'purchases\')"><i class="fas fa-file-pdf"></i> PDF المشتريات</button>' +
            (typeof openErpProcurement === 'function' ? '<button type="button" class="erp-btn" onclick="openErpProcurement()"><i class="fas fa-plus"></i> إدارة المشتريات</button>' : '') +
            '</div>' +
            '<div class="erp-table-wrap"><table class="erp-table"><thead><tr><th>التاريخ</th><th>المورد</th><th>البيان</th><th>المبلغ</th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="4" class="erp-empty">لا مشتريات</td></tr>') + '</tbody></table></div>';
    }

    function renderAccProfitPanel() {
        const s = getAccountingSnapshot();
        return '<div class="acc-profit-hero">' +
            '<h3>تحليل الربحية التقديري</h3>' +
            '<p>مبيعات − مشتريات = هامش تشغيلي تقريبي (لا يشمل رواتب HR تلقائياً).</p></div>' +
            '<div class="acc-dash-grid">' +
            '<article class="acc-dash-card"><h3>المبيعات</h3><strong>' + formatMoney(s.salesTotal) + '</strong></article>' +
            '<article class="acc-dash-card"><h3>المشتريات</h3><strong>' + formatMoney(s.purchasesTotal) + '</strong></article>' +
            '<article class="acc-dash-card"><h3>التحويلات المستلمة</h3><strong>' + formatMoney(s.transfersTotal) + '</strong></article>' +
            '<article class="acc-dash-card acc-dash-card--' + (s.profit >= 0 ? 'ok' : 'danger') + '"><h3>الهامش</h3><strong>' + formatMoney(s.profit) + '</strong></article>' +
            '</div>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="exportAccountingPdf(\'profit\')"><i class="fas fa-file-pdf"></i> PDF تحليل الربحية</button>';
    }

    function renderAccReportsPanel() {
        return '<div class="acc-reports-grid">' +
            '<article class="acc-report-card"><i class="fas fa-building-columns"></i><h4>تقرير التحويلات</h4><p>كل التحويلات البنكية في نطاقك</p>' +
            '<button type="button" class="erp-btn erp-btn--primary" onclick="exportAccountingPdf(\'transfers\')">PDF</button></article>' +
            '<article class="acc-report-card"><i class="fas fa-chart-line"></i><h4>تقرير المبيعات</h4><p>سجل المبيعات والعملاء</p>' +
            '<button type="button" class="erp-btn erp-btn--primary" onclick="exportAccountingPdf(\'sales\')">PDF</button></article>' +
            '<article class="acc-report-card"><i class="fas fa-truck-ramp-box"></i><h4>تقرير المشتريات</h4><p>أوامر الشراء والموردون</p>' +
            '<button type="button" class="erp-btn erp-btn--primary" onclick="exportAccountingPdf(\'purchases\')">PDF</button></article>' +
            '<article class="acc-report-card"><i class="fas fa-coins"></i><h4>تحليل الربحية</h4><p>هامش مبيعات − مشتريات</p>' +
            '<button type="button" class="erp-btn erp-btn--primary" onclick="exportAccountingPdf(\'profit\')">PDF</button></article>' +
            '<article class="acc-report-card acc-report-card--full"><i class="fas fa-file-contract"></i><h4>التقرير المحاسبي الشامل</h4>' +
            '<p>مبيعات · تحويلات · مشتريات · ربحية — تقرير واحد للإدارة</p>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="exportAccountingPdf(\'full\')"><i class="fas fa-file-pdf"></i> PDF شامل</button></article>' +
            '</div>';
    }

    function renderAccountingPlatformPanel() {
        renderAccNav();
        renderAccSummary();
        const pill = document.getElementById('acc-ws-user-pill');
        if (pill) {
            const u = typeof currentAdmin !== 'undefined' ? currentAdmin : null;
            pill.textContent = (u ? u.username : '') + ' · ' + getAccountingScopeLabel();
        }
        const content = document.getElementById('accounting-platform-content');
        if (!content) return;
        let panel = '';
        if (accActiveTab === 'dashboard') panel = renderAccDashboard();
        else if (accActiveTab === 'transfers') panel = renderAccTransfersPanel();
        else if (accActiveTab === 'sales') panel = renderAccSalesPanel();
        else if (accActiveTab === 'purchases') panel = renderAccPurchasesPanel();
        else if (accActiveTab === 'profit') panel = renderAccProfitPanel();
        else if (accActiveTab === 'reports') panel = renderAccReportsPanel();
        content.innerHTML = '<div class="hr-panel is-active acc-panel">' + panel + '</div>';
    }

    function showAccountingShell() {
        const el = document.getElementById('accounting-platform');
        if (!el) { alert('تعذر فتح الحسابات — أعيدي تحميل الصفحة.'); return false; }
        if (typeof closeAllAdminSections === 'function') {
            document.querySelectorAll('.admin-section.show').forEach(function(n) {
                if (n.id !== 'accounting-platform') { n.classList.remove('show'); n.setAttribute('aria-hidden', 'true'); }
            });
        }
        el.classList.add('show');
        el.setAttribute('aria-hidden', 'false');
        document.body.classList.add('accounting-platform-open');
        if (typeof clearStuckInteractionBlockers === 'function') clearStuckInteractionBlockers();
        return true;
    }

    function closeAccountingWorkspace() {
        const el = document.getElementById('accounting-platform');
        if (el) { el.classList.remove('show'); el.setAttribute('aria-hidden', 'true'); }
        document.body.classList.remove('accounting-platform-open');
        const dash = document.getElementById('admin-dashboard');
        if (dash && typeof currentAdmin !== 'undefined' && currentAdmin) {
            dash.classList.add('show');
            dash.removeAttribute('hidden');
            dash.setAttribute('aria-hidden', 'false');
        }
        if (typeof clearStuckInteractionBlockers === 'function') clearStuckInteractionBlockers();
    }

    function openAccountingPlatform() {
        if (!requireAccountingAccess()) return;
        if (!showAccountingShell()) return;
        renderAccountingPlatformPanel();
    }

    function switchAccountingTab(tab) {
        accActiveTab = tab || 'dashboard';
        try { localStorage.setItem(ACC_TAB_KEY, accActiveTab); } catch (e) { /* ignore */ }
        renderAccountingPlatformPanel();
    }

    function accField(id) {
        const el = document.getElementById(id);
        return el ? String(el.value || '').trim() : '';
    }

    function saveAccountingTransfer() {
        if (!requireAccountingAccess()) return;
        const customer = accField('acc-trf-customer');
        const amount = Number(accField('acc-trf-amount')) || 0;
        if (!customer || amount <= 0) { alert('أدخلي العميل والمبلغ.'); return; }
        if (typeof addNebrasAccountingTransfer === 'function') {
            addNebrasAccountingTransfer({
                date: accField('acc-trf-date'),
                customerName: customer,
                bankAr: accField('acc-trf-bank') || 'تحويل بنكي',
                amount: amount,
                refNo: accField('acc-trf-ref'),
                quoteNo: accField('acc-trf-quote')
            });
        } else if (typeof addErpTransfer === 'function') {
            addErpTransfer();
        }
        renderAccountingPlatformPanel();
        alert('تم تسجيل التحويل.');
    }

    function deleteAccountingTransfer(id) {
        if (!requireAccountingAccess()) return;
        if (typeof deleteErpTransfer === 'function') deleteErpTransfer(id);
        renderAccountingPlatformPanel();
    }

    function buildAccountingPdfHtml(kind) {
        const s = getAccountingSnapshot();
        const now = new Date().toLocaleString('ar-SA');
        const titles = {
            transfers: 'تقرير التحويلات البنكية',
            sales: 'تقرير المبيعات',
            purchases: 'تقرير المشتريات',
            profit: 'تحليل الربحية',
            full: 'التقرير المحاسبي الشامل'
        };
        let body = '<h1>شركة مصنع نبراس للبلاستيك — ' + esc(titles[kind] || 'تقرير') + '</h1>' +
            '<p>النطاق: ' + esc(s.scope) + ' · ' + now + '</p>';

        if (kind === 'transfers' || kind === 'full') {
            body += '<h2>التحويلات (' + s.transfers.length + ')</h2><table><tr><th>التاريخ</th><th>العميل</th><th>البنك</th><th>المبلغ</th></tr>';
            s.transfers.forEach(function(t) {
                body += '<tr><td>' + esc(t.date) + '</td><td>' + esc(t.customerName) + '</td><td>' + esc(t.bankAr) + '</td><td>' + formatMoney(t.amount) + '</td></tr>';
            });
            body += '</table><p><strong>الإجمالي: ' + formatMoney(s.transfersTotal) + '</strong></p>';
        }
        if (kind === 'sales' || kind === 'full') {
            body += '<h2>المبيعات (' + s.sales.length + ')</h2><table><tr><th>التاريخ</th><th>العميل</th><th>الوصف</th><th>المبلغ</th></tr>';
            s.sales.forEach(function(x) {
                body += '<tr><td>' + esc(x.date) + '</td><td>' + esc(x.customerName || x.customer) + '</td><td>' + esc(x.product || x.description) + '</td><td>' + formatMoney(x.amount) + '</td></tr>';
            });
            body += '</table><p><strong>الإجمالي: ' + formatMoney(s.salesTotal) + '</strong></p>';
        }
        if (kind === 'purchases' || kind === 'full') {
            body += '<h2>المشتريات (' + s.purchases.length + ')</h2><table><tr><th>التاريخ</th><th>المورد</th><th>البيان</th><th>المبلغ</th></tr>';
            s.purchases.forEach(function(p) {
                body += '<tr><td>' + esc(p.date) + '</td><td>' + esc(p.supplier) + '</td><td>' + esc(p.description || p.item) + '</td><td>' + formatMoney(p.total) + '</td></tr>';
            });
            body += '</table><p><strong>الإجمالي: ' + formatMoney(s.purchasesTotal) + '</strong></p>';
        }
        if (kind === 'profit' || kind === 'full') {
            body += '<h2>الربحية التقديرية</h2><p>مبيعات: ' + formatMoney(s.salesTotal) + ' · مشتريات: ' + formatMoney(s.purchasesTotal) +
                ' · <strong>الهامش: ' + formatMoney(s.profit) + '</strong></p>';
        }
        body += '<p class="foot">مستند داخلي — قسم الحسابات · نبراس</p>';
        return body;
    }

    function exportAccountingPdf(kind) {
        if (!requireAccountingAccess()) return;
        const w = window.open('', '_blank');
        if (!w) { alert('فعّلي النوافذ المنبثقة للطباعة/PDF.'); return; }
        w.document.write('<html dir="rtl"><head><meta charset="utf-8"><title>نبراس Accounting</title>' +
            '<style>body{font-family:Tahoma,Arial,sans-serif;padding:24px;color:#1a365d}h1{font-size:18px}h2{font-size:14px;margin-top:20px}' +
            'table{width:100%;border-collapse:collapse;margin-top:10px;font-size:11px}th,td{border:1px solid #ccc;padding:6px;text-align:right}th{background:#e8f0f8}.foot{margin-top:24px;font-size:10px;color:#666}</style></head><body>');
        w.document.write(buildAccountingPdfHtml(kind || 'full'));
        w.document.write('</body></html>');
        w.document.close();
        w.print();
        if (typeof addAuditLog === 'function') addAuditLog('تقرير محاسبي PDF', kind || 'full');
    }

    try { accActiveTab = localStorage.getItem(ACC_TAB_KEY) || 'dashboard'; } catch (e) { /* ignore */ }

    global.openAccountingPlatform = openAccountingPlatform;
    global.closeAccountingWorkspace = closeAccountingWorkspace;
    global.switchAccountingTab = switchAccountingTab;
    global.saveAccountingTransfer = saveAccountingTransfer;
    global.deleteAccountingTransfer = deleteAccountingTransfer;
    global.exportAccountingPdf = exportAccountingPdf;
    global.canAccessAccountingPlatform = canAccessAccounting;
    global.renderAccountingPlatformPanel = renderAccountingPlatformPanel;

})(typeof window !== 'undefined' ? window : globalThis);
