/**
 * نبراس — تكامل المنصة · حماية السحابة · لوحة الارتباط
 * يضمن: عدم مسح البيانات · نسخ احتياطي · خصوصية الأقسام · مراقبة الترابط
 */
(function(global) {
    'use strict';

    const SNAPSHOTS_KEY = 'nebrasCloudSnapshots';
    const INTEGRITY_KEY = 'nebrasPlatformIntegrity';
    const CRITICAL_STORE_KEYS = [
        'admin_users', 'branches', 'site_products', 'sales_quotes_inbox',
        'customer_order_journeys', 'customer_portal_users', 'hr_employees',
        'crm_customers', 'erp_orders', 'legal_contracts', 'erp_inventory',
        'sales_data', 'analytics_governance'
    ];
    const MAX_SNAPSHOTS_PER_KEY = 6;

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
        integrityReady = true;
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
        if (size > 0) {
            if (!cloudSnapshots.byKey[storeKey]) cloudSnapshots.byKey[storeKey] = [];
            cloudSnapshots.byKey[storeKey].unshift({
                at: new Date().toISOString(),
                size: size,
                payload: clonePayload(payload)
            });
            cloudSnapshots.byKey[storeKey] = cloudSnapshots.byKey[storeKey].slice(0, MAX_SNAPSHOTS_PER_KEY);
            saveSnapshotsLocal();
            return payload;
        }
        const hist = cloudSnapshots.byKey[storeKey];
        if (hist && hist.length && hist[0].payload && payloadSize(hist[0].payload) > 0) {
            console.warn('[Nebras Cloud Guard] منع مسح ' + storeKey + ' — استعادة آخر نسخة محمية');
            return clonePayload(hist[0].payload);
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
            { id: 'warehouse', nameAr: 'المستودع', icon: 'fa-warehouse', scope: 'فرع/مستودع', cloud: true, perm: 'warehouse' }
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
            '<section class="pi-snapshot-section"><h3><i class="fas fa-database"></i> حماية التخزين السحابي</h3>' +
            '<ul class="pi-snapshot-list">' + CRITICAL_STORE_KEYS.map(function(k) {
                const n = (cloudSnapshots.byKey[k] || []).length;
                return '<li><strong>' + esc(k) + '</strong> — ' + n + ' نسخة احتياطية' +
                    (n ? ' <span class="erp-tag erp-tag--ok">محمي</span>' : ' <span class="erp-tag">بانتظار أول حفظ</span>') + '</li>';
            }).join('') + '</ul></section>';
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
    global.getCloudSnapshotsForCloud = getCloudSnapshotsForCloud;
    global.setCloudSnapshotsFromCloud = setCloudSnapshotsFromCloud;
    global.openPlatformIntegrationHub = openPlatformIntegrationHub;
    global.closePlatformIntegrationHub = closePlatformIntegrationHub;
    global.renderPlatformIntegrationPanel = renderPlatformIntegrationPanel;
    global.NEBRAS_CRITICAL_CLOUD_KEYS = CRITICAL_STORE_KEYS;

})(typeof window !== 'undefined' ? window : globalThis);
