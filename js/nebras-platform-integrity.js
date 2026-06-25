/**
 * نبراس — تكامل المنصة · حماية السحابة · لوحة الارتباط
 * يضمن: عدم مسح البيانات · نسخ احتياطي · خصوصية الأقسام · مراقبة الترابط
 */
(function(global) {
    'use strict';

    const SNAPSHOTS_KEY = 'nebrasCloudSnapshots';
    const INTEGRITY_KEY = 'nebrasPlatformIntegrity';
    const CRITICAL_STORE_KEYS = [
        'admin_users', 'branches', 'site_products', 'visitor_icons', 'dashboard_tiles',
        'sales_quotes_inbox', 'customer_order_journeys', 'customer_portal_users', 'hr_employees',
        'hr_advances', 'hr_vehicle_violations', 'crm_customers', 'crm_opportunities', 'erp_orders',
        'legal_contracts', 'legal_rentals', 'erp_inventory', 'erp_production', 'sales_data',
        'sales_price_list', 'analytics_governance', 'system_settings', 'about_pages', 'showroom_gallery'
    ];
    const LOCAL_MUTATION_KEY = 'nebrasLocalCloudMutationAt';
    const SENSITIVE_PENDING_KEY = 'nebrasSensitiveCloudPending';
    const GOV_REVISION_KEY = 'nebrasGovernanceRevision';
    const MUTATION_GRACE_MS = 86400000;
    const LOCAL_STORAGE_STORE_MAP = {
        admin_users: 'nebrasAdminUsers',
        site_products: 'nebrasSiteProducts',
        visitor_icons: 'nebrasVisitorIcons',
        dashboard_tiles: 'nebrasDashboardTiles',
        branches: 'nebrasBranches',
        hr_employees: 'nebrasHrEmployees',
        hr_vehicles: 'nebrasHrVehicles',
        legal_contracts: 'nebrasLegalContracts',
        erp_inventory: 'nebrasErpInventory',
        erp_orders: 'nebrasErpOrders',
        customer_portal_users: 'nebrasCustomerPortalUsers',
        crm_customers: 'nebrasCrmCustomers',
        sales_data: 'nebrasSalesData',
        system_settings: 'nebrasSystemSettings'
    };
    const PRODUCTION_RESET_TOKEN_KEY = 'nebrasProductionResetToken';
    const PRODUCTION_RESET_TOKEN_VALUE = 'prod-live-2';
    const PRODUCTION_LOCAL_PURGE_KEYS = [
        'nebrasAdminUsers', 'nebrasSiteProducts', 'nebrasDashboardTiles',
        'nebrasHrEmployees', 'nebrasHrVehicles', 'nebrasHrLeave', 'nebrasHrVehicleTracking',
        'nebrasHrAttendance', 'nebrasHrDocuments', 'nebrasHrPayroll', 'nebrasHrCompanies',
        'nebrasLegalContracts', 'nebrasCrmCustomers', 'nebrasCrmOpportunities', 'nebrasCrmActivities',
        'nebrasErpInventory', 'nebrasErpOrders', 'nebrasErpProduction', 'nebrasErpProcurement',
        'nebrasErpPurchases', 'nebrasSalesData', 'nebrasSalesPriceList', 'nebrasCustomerPortalUsers',
        'nebrasCustomerPortalAudit', 'nebrasComplaints', 'nebrasAuditLogs', 'nebrasCallbackLeads',
        'nebrasSalesQuotesInbox', 'nebrasCustomerService',
    ];

    function purgeProductionLocalCacheIfNeeded() {
        if (typeof global.NEBRAS_PRODUCTION_LIVE_MODE === 'undefined' || !global.NEBRAS_PRODUCTION_LIVE_MODE) return false;
        try {
            if (localStorage.getItem(PRODUCTION_RESET_TOKEN_KEY) === PRODUCTION_RESET_TOKEN_VALUE) return false;
            PRODUCTION_LOCAL_PURGE_KEYS.forEach(function(k) {
                try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
            });
            localStorage.removeItem(LOCAL_MUTATION_KEY);
            localStorage.removeItem(SENSITIVE_PENDING_KEY);
            localStorage.removeItem(GOV_REVISION_KEY);
            localStorage.setItem(PRODUCTION_RESET_TOKEN_KEY, PRODUCTION_RESET_TOKEN_VALUE);
            return true;
        } catch (e) { return false; }
    }

    function markSensitiveCloudPending() {
        try { localStorage.setItem(SENSITIVE_PENDING_KEY, String(Date.now())); } catch (e) { /* ignore */ }
    }

    function clearSensitiveCloudPending() {
        try { localStorage.removeItem(SENSITIVE_PENDING_KEY); } catch (e) { /* ignore */ }
    }

    function hasSensitiveCloudPending() {
        try { return !!localStorage.getItem(SENSITIVE_PENDING_KEY); } catch (e) { return false; }
    }

    function markGovernanceRevision() {
        try { localStorage.setItem(GOV_REVISION_KEY, String(Date.now())); } catch (e) { /* ignore */ }
    }

    function ensureGovernanceRevisionFromLocalData() {
        try {
            const rev = localStorage.getItem(GOV_REVISION_KEY);
            if (rev && rev !== 'bootstrap') return;
            const probeKeys = [
                'nebrasAdminUsers', 'nebrasSiteProducts', 'nebrasHrEmployees',
                'nebrasLegalContracts', 'nebrasErpInventory', 'nebrasVisitorIcons'
            ];
            const hasData = probeKeys.some(function(k) {
                const raw = localStorage.getItem(k);
                if (!raw || raw.length < 12) return false;
                return raw !== '[]' && raw !== '{}' && raw !== 'null';
            });
            if (hasData) markGovernanceRevision();
        } catch (e) { /* ignore */ }
    }

    function markGovernanceBootstrapRevision() {
        try {
            if (!localStorage.getItem(GOV_REVISION_KEY)) {
                localStorage.setItem(GOV_REVISION_KEY, 'bootstrap');
            }
        } catch (e) { /* ignore */ }
    }

    function isGovernanceBootstrapOnly() {
        try { return localStorage.getItem(GOV_REVISION_KEY) === 'bootstrap'; } catch (e) { return false; }
    }

    function getNebrasPersistedPayloadSize(storeKey) {
        const lsKey = LOCAL_STORAGE_STORE_MAP[storeKey];
        if (lsKey) {
            try {
                const raw = localStorage.getItem(lsKey);
                if (raw) return payloadSize(JSON.parse(raw));
            } catch (e) { /* ignore */ }
        }
        const memFn = global.getNebrasLocalCloudPayloadSize;
        if (typeof memFn === 'function') return Number(memFn(storeKey) || 0);
        return 0;
    }

    function nebrasHasLocalGovernanceData() {
        if (hasPendingLocalCloudMutations() || hasSensitiveCloudPending()) return true;
        try {
            return localStorage.getItem(GOV_REVISION_KEY) &&
                localStorage.getItem(GOV_REVISION_KEY) !== 'bootstrap';
        } catch (e) { return false; }
    }
    const MAX_SNAPSHOTS_PER_KEY = 10;
    const MAX_SNAPSHOT_PAYLOAD_CHARS = 150000;

    let localCloudMutations = {};
    let cloudSnapshots = { byKey: {}, updatedAt: null };
    let platformIntegrity = { modules: {}, lastAuditAt: null };
    let integrityReady = false;

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function loadIntegrityData() {
        if (integrityReady) return;
        try {
            const s = localStorage.getItem(SNAPSHOTS_KEY);
            cloudSnapshots = s ? JSON.parse(s) : { byKey: {}, updatedAt: null };
            if (!cloudSnapshots.byKey) cloudSnapshots.byKey = {};
        } catch (e) { cloudSnapshots = { byKey: {}, updatedAt: null }; }
        try {
            const i = localStorage.getItem(INTEGRITY_KEY);
            platformIntegrity = i ? JSON.parse(i) : { modules: {}, lastAuditAt: null };
            if (!platformIntegrity.modules) platformIntegrity.modules = {};
        } catch (e) { platformIntegrity = { modules: {}, lastAuditAt: null }; }
        try {
            const m = localStorage.getItem(LOCAL_MUTATION_KEY);
            localCloudMutations = m ? JSON.parse(m) : {};
            if (!localCloudMutations || typeof localCloudMutations !== 'object') localCloudMutations = {};
        } catch (e2) { localCloudMutations = {}; }
        integrityReady = true;
    }

    function persistLocalMutations() {
        try { localStorage.setItem(LOCAL_MUTATION_KEY, JSON.stringify(localCloudMutations)); } catch (e) { /* ignore */ }
    }

    function markLocalCloudMutation(storeKey) {
        if (!storeKey) return;
        loadIntegrityData();
        localCloudMutations[storeKey] = Date.now();
        persistLocalMutations();
    }

    function markLocalCloudMutationBatch(keys) {
        if (!keys || !keys.length) return;
        loadIntegrityData();
        const now = Date.now();
        keys.forEach(function(k) { if (k) localCloudMutations[k] = now; });
        persistLocalMutations();
    }

    function clearLocalCloudMutations(keys) {
        loadIntegrityData();
        if (!keys || !keys.length) {
            localCloudMutations = {};
        } else {
            keys.forEach(function(k) { delete localCloudMutations[k]; });
        }
        persistLocalMutations();
    }

    function hasPendingLocalCloudMutations() {
        loadIntegrityData();
        const now = Date.now();
        return Object.keys(localCloudMutations).some(function(k) {
            return (now - Number(localCloudMutations[k] || 0)) < MUTATION_GRACE_MS;
        });
    }

    function hasLocalCloudMutation(storeKey) {
        loadIntegrityData();
        const localAt = Number(localCloudMutations[storeKey] || 0);
        return localAt > 0 && (Date.now() - localAt) < MUTATION_GRACE_MS;
    }

    /** لا نقبل سحابة أقل من المحلي — يحمي حتى بعد مسح علامات المزامنة بالخطأ */
    function shouldRejectRegressiveCloudPull(storeKey, payload) {
        if (CRITICAL_STORE_KEYS.indexOf(storeKey) < 0) return false;
        const localSize = getNebrasPersistedPayloadSize(storeKey);
        const cloudSize = payloadSize(payload);
        if (localSize > 0 && cloudSize === 0) return true;
        if (localSize > cloudSize) return true;
        return false;
    }

    /** لا نستبدل بيانات محلية أحدث بسحابة قديمة أو فارغة */
    function shouldRejectStaleCloudPull(storeKey, cloudUpdatedAt, payload) {
        loadIntegrityData();
        if (shouldRejectRegressiveCloudPull(storeKey, payload)) return true;
        const localAt = Number(localCloudMutations[storeKey] || 0);
        if (!localAt) return false;
        const cloudAt = cloudUpdatedAt ? new Date(cloudUpdatedAt).getTime() : 0;
        const size = payloadSize(payload);
        if (size === 0 && (Date.now() - localAt) < MUTATION_GRACE_MS) return true;
        if (localAt > cloudAt && (Date.now() - localAt) < MUTATION_GRACE_MS) return true;
        return false;
    }

    function saveSnapshotsLocal() {
        cloudSnapshots.updatedAt = new Date().toISOString();
        try { localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(cloudSnapshots)); } catch (e) { /* ignore */ }
    }

    function saveIntegrityLocal() {
        platformIntegrity.lastAuditAt = new Date().toISOString();
        try { localStorage.setItem(INTEGRITY_KEY, JSON.stringify(platformIntegrity)); } catch (e) { /* ignore */ }
    }

    function getCloudSnapshotsForCloud() {
        loadIntegrityData();
        return cloudSnapshots;
    }

    function setCloudSnapshotsFromCloud(v) {
        cloudSnapshots = v && typeof v === 'object' ? v : { byKey: {}, updatedAt: null };
        if (!cloudSnapshots.byKey) cloudSnapshots.byKey = {};
        integrityReady = true;
        try { localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(cloudSnapshots)); } catch (e) { /* ignore */ }
    }

    function payloadSize(payload) {
        if (Array.isArray(payload)) return payload.length;
        if (payload && typeof payload === 'object') return Object.keys(payload).length;
        return payload ? 1 : 0;
    }

    function clonePayload(payload) {
        try { return JSON.parse(JSON.stringify(payload)); } catch (e) { return payload; }
    }

    /** لا نرفع مصفوفة فارغة إذا كان لدينا نسخة محمية — يمنع اختفاء البيانات */
    function guardCloudPushRow(storeKey, payload) {
        loadIntegrityData();
        if (!CRITICAL_STORE_KEYS.includes(storeKey)) return payload;
        const size = payloadSize(payload);
        const bytes = typeof global.nebrasJsonBytes === 'function' ? global.nebrasJsonBytes(payload) : 0;
        if (size > 0) {
            if (!cloudSnapshots.byKey[storeKey]) cloudSnapshots.byKey[storeKey] = [];
            const snap = {
                at: new Date().toISOString(),
                recordCount: size,
                bytes: bytes
            };
            try {
                const cloned = clonePayload(payload);
                const json = JSON.stringify(cloned);
                if (json.length <= MAX_SNAPSHOT_PAYLOAD_CHARS) {
                    snap.payload = cloned;
                    snap.restorable = true;
                }
            } catch (e) { /* metadata only */ }
            cloudSnapshots.byKey[storeKey].unshift(snap);
            cloudSnapshots.byKey[storeKey] = cloudSnapshots.byKey[storeKey].slice(0, MAX_SNAPSHOTS_PER_KEY);
            saveSnapshotsLocal();
            return payload;
        }
        const hist = cloudSnapshots.byKey[storeKey];
        if (hist && hist.length && (hist[0].recordCount > 0 || (hist[0].payload && payloadSize(hist[0].payload) > 0))) {
            if (global.__NEBRAS_LAUNCH_DEBUG__) {
                console.warn('[Nebras Cloud Guard] منع مسح ' + storeKey + ' — رفض رفع بيانات فارغة');
            }
            return undefined;
        }
        return payload;
    }

    /** عند التحميل من السحابة — لا نقبل فراغاً على مفاتيح حرجة إذا لدينا نسخة محلية */
    function guardCloudPullRow(storeKey, payload) {
        loadIntegrityData();
        if (!CRITICAL_STORE_KEYS.includes(storeKey)) return payload;
        if (payloadSize(payload) > 0) return payload;
        const hist = cloudSnapshots.byKey[storeKey];
        if (hist && hist.length && hist[0].payload && payloadSize(hist[0].payload) > 0) {
            return clonePayload(hist[0].payload);
        }
        if (hist && hist.length && hist[0].recordCount > 0) {
            if (global.__NEBRAS_LAUNCH_DEBUG__) {
                console.warn('[Nebras Cloud Guard] سحابة فارغة لـ ' + storeKey + ' — الاحتفاظ بالمحلي');
            }
            return undefined;
        }
        return payload;
    }

    function buildModuleIntegrationMatrix() {
        const admin = typeof global.getNebrasCurrentAdmin === 'function' ? global.getNebrasCurrentAdmin() : null;
        const cloudCount = typeof global.getNebrasCloudStoreCount === 'function' ? global.getNebrasCloudStoreCount() : 0;
        const modules = [
            { id: 'governance', nameAr: 'الإدارة الرئيسية', icon: 'fa-crown', scope: 'كامل المنصة', cloud: true, perm: 'users' },
            { id: 'hr', nameAr: 'الموارد البشرية', icon: 'fa-people-roof', scope: 'فرع/قسم — HR Scope', cloud: true, perm: 'hr' },
            { id: 'legal', nameAr: 'الشؤون القانونية', icon: 'fa-scale-balanced', scope: 'شركة/مجموعة — Legal Scope', cloud: true, perm: 'legal' },
            { id: 'crm', nameAr: 'CRM', icon: 'fa-handshake', scope: 'فرع — Branch Scope', cloud: true, perm: 'customerService' },
            { id: 'accounting', nameAr: 'الحسابات', icon: 'fa-calculator', scope: 'فرع — Accounting Scope', cloud: true, perm: 'accounting' },
            { id: 'sales', nameAr: 'المبيعات والفروع', icon: 'fa-chart-line', scope: 'فرع + مندوبين', cloud: true, perm: 'sales' },
            { id: 'journey', nameAr: 'مسار نبراس', icon: 'fa-route', scope: 'عميل ↔ مبيعات ↔ إنتاج ↔ مستودع', cloud: true, perm: 'orderJourney' },
            { id: 'portal', nameAr: 'بوابة العملاء', icon: 'fa-user-circle', scope: 'خصوصية كاملة لكل عميل', cloud: true, perm: 'customerPortal' },
            { id: 'erp', nameAr: 'ERP', icon: 'fa-cubes', scope: 'مخزون · طلبات · إنتاج · مشتريات', cloud: true, perm: 'erp' },
            { id: 'production', nameAr: 'الإنتاج WPC', icon: 'fa-industry', scope: 'قسم الإنتاج', cloud: true, perm: 'production' },
            { id: 'warehouse', nameAr: 'المستودع', icon: 'fa-warehouse', scope: 'فرع/مستودع', cloud: true, perm: 'warehouse' },
            { id: 'aluminum', nameAr: 'قسم الألومنيوم', icon: 'fa-industry', scope: 'منتجات · مخزون · عملاء ALU', cloud: true, perm: 'aluminum' },
            { id: 'store', nameAr: 'المتجر والسلة', icon: 'fa-store', scope: 'كتالوج · سلة · عروض 4 صفحات', cloud: true, perm: 'storeCatalog' },
            { id: 'dataWarehouse', nameAr: 'مستودع البيانات', icon: 'fa-database', scope: 'Excel · PDF · JSON — كل التخزين', cloud: true, perm: 'audit' },
            { id: 'empireBridges', nameAr: 'جسور الإمبراطورية', icon: 'fa-link', scope: 'Odoo-like — متجر ↔ CRM ↔ مسار نبراس', cloud: true, perm: 'erp' }
        ];
        return modules.map(function(m) {
            const canAccess = admin && typeof global.canManage === 'function' ? global.canManage(m.perm, admin) : false;
            const isMain = typeof global.isMainGovernanceAdmin === 'function' && global.isMainGovernanceAdmin(admin);
            return Object.assign({}, m, {
                active: canAccess || isMain,
                synced: m.cloud && cloudCount >= 60
            });
        });
    }

    function restoreCloudSnapshot(storeKey, snapIndex) {
        loadIntegrityData();
        const hist = cloudSnapshots.byKey[storeKey] || [];
        const snap = hist[snapIndex];
        if (!snap || !snap.payload) {
            alert('هذه النسخة لا تحتوي بيانات قابلة للاستعادة.\nاستخدمي «نسخة احتياطية كاملة JSON» من الحوكمة السحابية.');
            return false;
        }
        if (!confirm('استعادة «' + storeKey + '» من نسخة ' + (snap.at || '').slice(0, 16) + '؟\nسيتم استبدال البيانات الحالية لهذا المخزن.')) return false;
        const specs = typeof global.NEBRAS_CLOUD_STORE_SPECS !== 'undefined' ? global.NEBRAS_CLOUD_STORE_SPECS : [];
        const spec = specs.find(function(s) { return s.key === storeKey; });
        if (!spec || typeof spec.set !== 'function') {
            alert('لم يُعثر على مخزن ' + storeKey);
            return false;
        }
        try {
            spec.set(clonePayload(snap.payload));
            if (typeof global.markLocalCloudMutation === 'function') global.markLocalCloudMutation(storeKey);
            if (typeof global.saveSystemData === 'function') global.saveSystemData();
            if (typeof global.addAuditLog === 'function') {
                global.addAuditLog('استعادة نسخة احتياطية', storeKey + ' — ' + snap.at);
            }
            if (typeof global.showNebrasAdminToast === 'function') {
                global.showNebrasAdminToast('تمت استعادة ' + storeKey + ' بنجاح', 'ok');
            } else {
                alert('تمت الاستعادة بنجاح — ' + storeKey);
            }
            renderPlatformIntegrationPanel();
            return true;
        } catch (e) {
            alert('فشل الاستعادة: ' + (e && e.message ? e.message : e));
            return false;
        }
    }

    function buildSnapshotRestoreSectionHtml() {
        loadIntegrityData();
        const rows = CRITICAL_STORE_KEYS.map(function(k) {
            const hist = cloudSnapshots.byKey[k] || [];
            const restorable = hist.filter(function(s) { return s.payload && s.restorable !== false; });
            if (!restorable.length) {
                return '<li><strong>' + esc(k) + '</strong> — <span class="erp-tag">بانتظار أول حفظ</span></li>';
            }
            const btns = restorable.slice(0, 3).map(function(s, idx) {
                const realIdx = hist.indexOf(s);
                return '<button type="button" class="erp-tag erp-tag--action" onclick="restoreCloudSnapshot(\'' + esc(k) + '\',' + realIdx + ')" title="' + esc(s.at) + '">' +
                    '<i class="fas fa-rotate-left"></i> ' + esc((s.at || '').slice(0, 10)) + ' (' + (s.recordCount || 0) + ')</button>';
            }).join(' ');
            return '<li><strong>' + esc(k) + '</strong> — ' + restorable.length + ' نسخة قابلة للاستعادة<br>' + btns + '</li>';
        }).join('');
        return rows;
    }

    function renderPlatformIntegrationPanel() {
        loadIntegrityData();
        const summary = document.getElementById('platform-integration-summary');
        const body = document.getElementById('platform-integration-body');
        if (!summary || !body) return;
        const modules = buildModuleIntegrationMatrix();
        const activeCount = modules.filter(function(m) { return m.active; }).length;
        const snapCount = Object.keys(cloudSnapshots.byKey || {}).reduce(function(n, k) {
            return n + (cloudSnapshots.byKey[k] || []).length;
        }, 0);
        const cloudStores = typeof global.getNebrasCloudStoreCount === 'function' ? global.getNebrasCloudStoreCount() : 0;
        summary.innerHTML =
            '<div class="erp-stat erp-stat--accent"><strong>' + modules.length + '</strong><span>وحدات مترابطة</span></div>' +
            '<div class="erp-stat erp-stat--ok"><strong>' + cloudStores + '</strong><span>مخازن سحابة</span></div>' +
            '<div class="erp-stat"><strong>' + snapCount + '</strong><span>نسخ احتياطية محمية</span></div>' +
            '<div class="erp-stat"><strong>' + activeCount + '</strong><span>وحدات متاحة لك</span></div>';
        body.innerHTML =
            '<p class="scm-hint"><i class="fas fa-shield-halved"></i> كل تعديل يُحفظ محلياً + Supabase · النسخ الاحتياطية تمنع مسح البيانات عند الترقية أو انقطاع الشبكة</p>' +
            '<div class="pi-module-grid">' + modules.map(function(m) {
                return '<article class="pi-module-card' + (m.active ? ' pi-module-card--on' : '') + '">' +
                    '<header><i class="fas ' + m.icon + '"></i><strong>' + esc(m.nameAr) + '</strong></header>' +
                    '<p class="pi-scope">' + esc(m.scope) + '</p>' +
                    '<footer>' +
                        '<span class="erp-tag' + (m.synced ? ' erp-tag--ok' : '') + '"><i class="fas fa-cloud"></i> ' + (m.synced ? 'سحابة متزامنة' : 'سحابة') + '</span>' +
                        '<span class="erp-tag' + (m.active ? ' erp-tag--accent' : '') + '">' + (m.active ? 'صلاحيتك فعّالة' : 'خارج نطاقك') + '</span>' +
                    '</footer></article>';
            }).join('') + '</div>' +
            '<div class="workspace-actions-row pi-quick-actions">' +
            '<button type="button" class="workspace-action-btn workspace-action-btn--primary" onclick="typeof openNebrasDataWarehouse===\'function\'&&openNebrasDataWarehouse()"><i class="fas fa-database"></i> مستودع البيانات</button>' +
            '<button type="button" class="workspace-action-btn" onclick="typeof openNebrasEmpireBridges===\'function\'&&openNebrasEmpireBridges()"><i class="fas fa-link"></i> جسور الإمبراطورية</button>' +
            '<button type="button" class="workspace-action-btn" onclick="typeof openNebrasEmpireHub===\'function\'&&openNebrasEmpireHub()"><i class="fas fa-crown"></i> مركز الإمبراطورية</button>' +
            '</div>' +
            '<section class="pi-snapshot-section"><h3><i class="fas fa-database"></i> حماية التخزين السحابي</h3>' +
            '<p class="scm-hint"><i class="fas fa-shield-halved"></i> تُحفظ نسخة احتياطية تلقائياً عند كل رفع — حتى 10 نسخ لكل مخزن حرج. للاستعادة الكاملة استخدمي JSON من الحوكمة السحابية.</p>' +
            '<div class="workspace-actions-row pi-quick-actions" style="margin-bottom:0.75rem">' +
            '<button type="button" class="workspace-action-btn workspace-action-btn--primary" onclick="typeof exportNebrasGovernanceBundle===\'function\'&&exportNebrasGovernanceBundle()"><i class="fas fa-download"></i> نسخة احتياطية كاملة</button>' +
            '<button type="button" class="workspace-action-btn" onclick="typeof openNebrasGovernanceImportPicker===\'function\'&&openNebrasGovernanceImportPicker()"><i class="fas fa-upload"></i> استعادة من JSON</button>' +
            '<button type="button" class="workspace-action-btn" onclick="typeof openCloudGovernance===\'function\'&&openCloudGovernance()"><i class="fas fa-cloud"></i> الحوكمة السحابية</button>' +
            '</div>' +
            '<ul class="pi-snapshot-list">' + buildSnapshotRestoreSectionHtml() + '</ul></section>';
        saveIntegrityLocal();
    }

    function openPlatformIntegrationHub() {
        const admin = typeof global.getNebrasCurrentAdmin === 'function' ? global.getNebrasCurrentAdmin() : null;
        if (!admin) { alert('سجّلي الدخول للإدارة أولاً.'); return; }
        if (typeof global.closeAllAdminSections === 'function') global.closeAllAdminSections();
        const el = document.getElementById('platform-integration-hub');
        if (el) {
            el.classList.add('show');
            el.setAttribute('aria-hidden', 'false');
        }
        if (typeof global.revealPlatformLayer === 'function') global.revealPlatformLayer('platform-integration-hub');
        else if (typeof global.syncPlatformInteractionLayers === 'function') global.syncPlatformInteractionLayers();
        renderPlatformIntegrationPanel();
    }

    function closePlatformIntegrationHub() {
        const el = document.getElementById('platform-integration-hub');
        if (el) {
            el.classList.remove('show');
            el.setAttribute('aria-hidden', 'true');
        }
        if (typeof global.syncPlatformInteractionLayers === 'function') global.syncPlatformInteractionLayers();
    }

    global.guardCloudPushRow = guardCloudPushRow;
    global.guardCloudPullRow = guardCloudPullRow;
    global.markLocalCloudMutation = markLocalCloudMutation;
    global.markLocalCloudMutationBatch = markLocalCloudMutationBatch;
    global.clearLocalCloudMutations = clearLocalCloudMutations;
    global.hasPendingLocalCloudMutations = hasPendingLocalCloudMutations;
    global.hasLocalCloudMutation = hasLocalCloudMutation;
    global.hasSensitiveCloudPending = hasSensitiveCloudPending;
    global.markSensitiveCloudPending = markSensitiveCloudPending;
    global.clearSensitiveCloudPending = clearSensitiveCloudPending;
    global.markGovernanceRevision = markGovernanceRevision;
    global.markGovernanceBootstrapRevision = markGovernanceBootstrapRevision;
    global.nebrasHasLocalGovernanceData = nebrasHasLocalGovernanceData;
    global.isGovernanceBootstrapOnly = isGovernanceBootstrapOnly;
    global.ensureGovernanceRevisionFromLocalData = ensureGovernanceRevisionFromLocalData;
    global.purgeProductionLocalCacheIfNeeded = purgeProductionLocalCacheIfNeeded;
    global.shouldRejectStaleCloudPull = shouldRejectStaleCloudPull;
    global.shouldRejectRegressiveCloudPull = shouldRejectRegressiveCloudPull;
    global.getCloudSnapshotsForCloud = getCloudSnapshotsForCloud;
    global.setCloudSnapshotsFromCloud = setCloudSnapshotsFromCloud;
    global.openPlatformIntegrationHub = openPlatformIntegrationHub;
    global.closePlatformIntegrationHub = closePlatformIntegrationHub;
    global.renderPlatformIntegrationPanel = renderPlatformIntegrationPanel;
    global.restoreCloudSnapshot = restoreCloudSnapshot;
    global.NEBRAS_CRITICAL_CLOUD_KEYS = CRITICAL_STORE_KEYS;

    let cloudAutoSyncTimer = null;
    let cloudAutoPullTimer = null;
    function nebrasFlushCloudIfAdmin() {
        const admin = typeof global.getNebrasCurrentAdmin === 'function' ? global.getNebrasCurrentAdmin() : null;
        if (!admin) return;
        const sensPending = hasSensitiveCloudPending();
        if (sensPending && typeof global.persistNebrasCriticalStores === 'function') {
            const keys = [
                'admin_users', 'customer_portal_users', 'customer_portal_audit', 'hr_employees',
                'crm_customers', 'crm_opportunities', 'legal_contracts', 'sales_quotes_inbox',
                'erp_orders', 'erp_inventory', 'complaints', 'audit_logs'
            ];
            try {
                global.persistNebrasCriticalStores(keys, { showToast: false, promptReauth: false, keepalive: true });
                return;
            } catch (e) { /* fallback below */ }
        }
        if (typeof global.flushPushToNebrasCloud === 'function') {
            try { global.flushPushToNebrasCloud({ silentCloud: true }); } catch (e) { /* ignore */ }
        }
    }
    function nebrasPullCloudIfAdmin() {
        const admin = typeof global.getNebrasCurrentAdmin === 'function' ? global.getNebrasCurrentAdmin() : null;
        if (!admin || typeof global.refreshNebrasCloudFromServer !== 'function') return;
        try { global.refreshNebrasCloudFromServer({ silent: true }); } catch (e) { /* ignore */ }
    }
    function startNebrasCloudAutoSync() {
        if (cloudAutoSyncTimer) return;
        nebrasFlushCloudIfAdmin();
        nebrasPullCloudIfAdmin();
        cloudAutoSyncTimer = setInterval(nebrasFlushCloudIfAdmin, 15000);
        cloudAutoPullTimer = setInterval(nebrasPullCloudIfAdmin, 45000);
        if (typeof window !== 'undefined' && !window._nebrasCloudUnloadHook) {
            window._nebrasCloudUnloadHook = true;
            window.addEventListener('pagehide', function() { nebrasFlushCloudIfAdmin(); });
            document.addEventListener('visibilitychange', function() {
                if (document.visibilityState === 'hidden') nebrasFlushCloudIfAdmin();
                if (document.visibilityState === 'visible') nebrasPullCloudIfAdmin();
            });
        }
    }
    function stopNebrasCloudAutoSync() {
        if (cloudAutoSyncTimer) { clearInterval(cloudAutoSyncTimer); cloudAutoSyncTimer = null; }
        if (cloudAutoPullTimer) { clearInterval(cloudAutoPullTimer); cloudAutoPullTimer = null; }
    }
    global.startNebrasCloudAutoSync = startNebrasCloudAutoSync;
    global.stopNebrasCloudAutoSync = stopNebrasCloudAutoSync;

})(typeof window !== 'undefined' ? window : globalThis);
