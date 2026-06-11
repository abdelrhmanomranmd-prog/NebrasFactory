/* Phase 21 — Admin enterprise polish: compact BI, analytics tabs, live data */

    var analyticsActiveTab = 'overview';

    function buildDashboardExecutiveBiCompact(ctx) {
        ctx = ctx || {};
        if (!isMainGovernanceAdmin(currentAdmin)) return '';
        const erp = ctx.erpStats || {};
        const tiles = [
            { icon: 'fas fa-file-invoice', val: ctx.quotesCount || 0, label: 'عروض أسعار' },
            { icon: 'fas fa-sack-dollar', val: ctx.salesCount || 0, label: 'مبيعات' },
            { icon: 'fas fa-car-side', val: ctx.fleetOnRoad || 0, label: 'سيارات خارجة' },
            { icon: 'fas fa-user-tie', val: ctx.salesReps || 0, label: 'مندوبون' },
            { icon: 'fas fa-users', val: adminUsers.filter(function(u) { return u.isActive !== false; }).length, label: 'مستخدمون نشطون' },
            { icon: 'fas fa-signal', val: adminUsers.filter(function(u) { return typeof isUserOnline === 'function' && isUserOnline(u); }).length, label: 'متصلون الآن' }
        ];
        return '<div class="dashboard-bi-compact" role="region" aria-label="ملخص تنفيذي">' +
            '<div class="dashboard-bi-compact-head">' +
                '<h4><i class="fas fa-gauge-high"></i> المؤشرات التنفيذية</h4>' +
                '<button type="button" class="dashboard-bi-compact-link" onclick="openAdminAnalytics();switchAnalyticsTab(\'overview\')">' +
                    '<i class="fas fa-chart-line"></i> التحليلات الكاملة</button>' +
            '</div>' +
            '<div class="dashboard-bi-compact-grid">' +
                tiles.map(function(t) {
                    return '<article class="dashboard-bi-compact-tile">' +
                        '<i class="' + t.icon + '"></i>' +
                        '<strong>' + escapeHtmlAttr(String(t.val)) + '</strong>' +
                        '<span>' + escapeHtmlAttr(t.label) + '</span></article>';
                }).join('') +
            '</div></div>';
    }

    function buildMainAdminExecutiveBiHtml(ctx) {
        ctx = ctx || {};
        if (!isMainGovernanceAdmin(currentAdmin)) return '';
        const panelId = ctx.panelId || 'executive-bi-charts-panel-full';
        const quotes = ctx.quotes || [];
        const erp = ctx.erpStats || {};
        const fleetOnRoad = ctx.fleetOnRoad || 0;
        const fleetTotal = ctx.fleetTotal || 0;
        const reps = ctx.salesReps || 0;
        const repQuotes = ctx.repQuotes || 0;
        const salesRows = [
            { label: 'عروض أسعار', val: quotes.length },
            { label: 'مبيعات مسجّلة', val: (ctx.salesCount || 0) },
            { label: 'طلبات OMS', val: erp.ordersCount || 0 },
            { label: 'إنتاج اليوم', val: erp.prodToday || 0 }
        ];
        const fleetRows = [
            { label: 'سيارات خارجة', val: fleetOnRoad },
            { label: 'أسطول الشركة', val: fleetTotal },
            { label: 'مندوبو مبيعات', val: reps },
            { label: 'عروض المندوبين', val: repQuotes }
        ];
        const govRows = [
            { label: 'مستخدمون', val: adminUsers.length },
            { label: 'نشطون', val: adminUsers.filter(function(u) { return u.isActive !== false; }).length },
            { label: 'متصلون', val: adminUsers.filter(function(u) { return typeof isUserOnline === 'function' && isUserOnline(u); }).length },
            { label: 'فروع', val: (branchesData || []).length }
        ];
        return '<section class="nebras-executive-bi nebras-executive-bi--full" id="' + escapeHtmlAttr(panelId) + '">' +
            '<h4><i class="fas fa-chart-pie"></i> لوحة التحليل البياني — الإدارة الرئيسية</h4>' +
            '<div class="nebras-bi-grid">' +
                '<article class="nebras-bi-card"><h5>المبيعات والعمليات</h5>' + renderNebrasBiChart(salesRows, 'لا بيانات') + '</article>' +
                '<article class="nebras-bi-card"><h5>الأسطول والمندوبون</h5>' + renderNebrasBiChart(fleetRows, 'لا بيانات') + '</article>' +
                '<article class="nebras-bi-card"><h5>حوكمة المستخدمين</h5>' + renderNebrasBiChart(govRows, 'لا بيانات') + '</article>' +
            '</div></section>';
    }

    async function refreshDashboardExecutiveBi(user) {
        const dashBi = document.getElementById('dashboard-executive-bi-mini');
        if (!dashBi || !user || !isMainGovernanceAdmin(user)) {
            if (dashBi) { dashBi.hidden = true; dashBi.innerHTML = ''; }
            return;
        }
        const fleetBi = typeof collectFleetStatsForBi === 'function' ? collectFleetStatsForBi() : { onRoad: 0, total: 0 };
        const repBi = typeof collectSalesRepStatsForBi === 'function' ? collectSalesRepStatsForBi() : { reps: 0, repQuotes: 0 };
        const st = getDashboardExtendedStats();
        let quotesCount = 0;
        try {
            if (typeof getMergedSalesQuotesForAnalytics === 'function') {
                let q = await getMergedSalesQuotesForAnalytics();
                q = typeof filterQuotesForAdmin === 'function' ? filterQuotesForAdmin(q, user) : q;
                quotesCount = q.length;
            }
        } catch (e) { /* ignore */ }
        dashBi.hidden = false;
        dashBi.innerHTML = buildDashboardExecutiveBiCompact({
            quotesCount: quotesCount,
            erpStats: st,
            fleetOnRoad: fleetBi.onRoad,
            fleetTotal: fleetBi.total,
            salesReps: repBi.reps,
            repQuotes: repBi.repQuotes,
            salesCount: st.salesCount || 0
        });
    }

    var ANALYTICS_TAB_MAP = {
        overview: ['admin-analytics-kpis', 'executive-bi-charts-mount', 'admin-analytics-charts'],
        sales: ['sales-crm-panel', 'quote-ranking-panel', 'quote-catalog-panel', 'bank-transfers-panel', 'callback-leads-panel'],
        service: ['complaints-report-panel', 'chart-complaints', 'visitor-report-panel'],
        operations: ['erp-operations-panel', 'analytics-restore-mount']
    };

    function renderAnalyticsTabNav() {
        const tabs = [
            { id: 'overview', icon: 'fas fa-gauge-high', label: 'نظرة عامة' },
            { id: 'sales', icon: 'fas fa-chart-line', label: 'المبيعات' },
            { id: 'service', icon: 'fas fa-headset', label: 'العملاء والشكاوى' },
            { id: 'operations', icon: 'fas fa-industry', label: 'العمليات ERP' }
        ];
        return '<nav class="admin-analytics-tabs" id="admin-analytics-tabs" role="tablist" aria-label="أقسام التحليلات">' +
            tabs.map(function(t) {
                const active = analyticsActiveTab === t.id ? ' is-active' : '';
                return '<button type="button" role="tab" class="admin-analytics-tab' + active + '" data-analytics-tab="' + t.id + '" ' +
                    'aria-selected="' + (analyticsActiveTab === t.id ? 'true' : 'false') + '" onclick="switchAnalyticsTab(\'' + t.id + '\')">' +
                    '<i class="' + t.icon + '"></i> ' + escapeHtmlAttr(t.label) + '</button>';
            }).join('') +
        '</nav>';
    }

    function switchAnalyticsTab(tabId) {
        analyticsActiveTab = tabId || 'overview';
        const navHost = document.getElementById('admin-analytics-tabs-mount');
        if (navHost) navHost.innerHTML = renderAnalyticsTabNav();
        applyAnalyticsTabVisibility();
    }

    function applyAnalyticsTabVisibility() {
        const hub = document.getElementById('admin-analytics-hub');
        if (!hub) return;
        const allIds = [];
        Object.keys(ANALYTICS_TAB_MAP).forEach(function(k) {
            ANALYTICS_TAB_MAP[k].forEach(function(id) { if (allIds.indexOf(id) < 0) allIds.push(id); });
        });
        allIds.forEach(function(id) {
            const el = document.getElementById(id);
            if (!el) return;
            let show = false;
            Object.keys(ANALYTICS_TAB_MAP).forEach(function(tab) {
                if (tab === analyticsActiveTab && ANALYTICS_TAB_MAP[tab].indexOf(id) >= 0) show = true;
            });
            el.classList.toggle('analytics-tab-hidden', !show);
        });
        const tablesWrap = hub.querySelector('.admin-analytics-tables');
        if (tablesWrap && analyticsActiveTab === 'overview') {
            tablesWrap.classList.add('analytics-tables--overview-only');
        } else if (tablesWrap) {
            tablesWrap.classList.remove('analytics-tables--overview-only');
        }
    }

    function mountAnalyticsTabSystem() {
        let navHost = document.getElementById('admin-analytics-tabs-mount');
        if (!navHost) {
            const kpis = document.getElementById('admin-analytics-kpis');
            if (kpis && kpis.parentNode) {
                navHost = document.createElement('div');
                navHost.id = 'admin-analytics-tabs-mount';
                kpis.parentNode.insertBefore(navHost, kpis);
            }
        }
        if (navHost) navHost.innerHTML = renderAnalyticsTabNav();
        applyAnalyticsTabVisibility();
    }

    function showNebrasAdminToast(msg, type) {
        let host = document.getElementById('nebras-admin-toast-host');
        if (!host) {
            host = document.createElement('div');
            host.id = 'nebras-admin-toast-host';
            host.className = 'nebras-admin-toast-host';
            document.body.appendChild(host);
        }
        const el = document.createElement('div');
        const toastType = type || 'info';
        el.className = 'nebras-admin-toast nebras-admin-toast--' + toastType;
        const icon = toastType === 'error' ? 'circle-exclamation' : (toastType === 'ok' ? 'circle-check' : 'info-circle');
        el.innerHTML = '<i class="fas fa-' + icon + '"></i> ' + escapeHtmlAttr(msg || '');
        host.appendChild(el);
        setTimeout(function() { el.classList.add('is-out'); }, 2800);
        setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 3400);
    }
