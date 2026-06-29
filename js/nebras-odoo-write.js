/**
 * نبراس — Odoo ERP Mode (hrws158)
 * A: Write-through — سيرفر أولاً عند الحفظ
 * B: Read-through — سحب من السيرفر عند فتح الوحدات
 * C: Delta sync — تحديثات جزئية كل 12 ثانية
 * D: Quiet UI — بدون تنبيهات إلا عند فشل حقيقي أو انقطاع شبكة
 */
(function(global) {
    'use strict';

    global.NEBRAS_ODOO_WRITE_MODE = true;
    global.NEBRAS_ODOO_QUIET_UI = true;

    const SYNC_CURSOR_KEY = 'nebrasOdooSyncCursor';
    const DELTA_INTERVAL_MS = 12000;

    const ODOO_WRITE_KEYS = [
        'admin_users', 'branches', 'system_settings', 'complaints', 'audit_logs', 'analytics_governance',
        'sales_quotes_inbox', 'sales_data', 'sales_price_list', 'quote_registry', 'callback_leads',
        'customer_service', 'customer_portal_users', 'customer_order_journeys',
        'erp_inventory', 'erp_orders', 'erp_production', 'erp_procurement', 'erp_purchases',
        'erp_transfers', 'erp_stock_transfers', 'procurement_custom_depts',
        'hr_employees', 'hr_vehicles', 'hr_leave', 'hr_vehicle_tracking', 'hr_attendance',
        'hr_documents', 'hr_payroll', 'hr_companies', 'hr_advances', 'hr_vehicle_violations',
        'hr_travel', 'hr_deductions', 'hr_notifications', 'hr_notif_settings', 'hr_email_queue',
        'hr_shift_roster', 'hr_dept_activity',
        'crm_customers', 'crm_opportunities', 'crm_activities', 'crm_audit',
        'legal_contracts', 'legal_rentals', 'legal_cases', 'legal_compliance', 'legal_policies',
        'site_products'
    ];

    const ODOO_HR_KEYS = [
        'hr_employees', 'hr_vehicles', 'hr_leave', 'hr_vehicle_tracking', 'hr_attendance',
        'hr_documents', 'hr_payroll', 'hr_companies', 'hr_advances', 'hr_vehicle_violations',
        'hr_travel', 'hr_deductions', 'hr_notifications', 'hr_notif_settings', 'hr_email_queue',
        'hr_shift_roster', 'hr_dept_activity'
    ];

    const ODOO_ERP_KEYS = [
        'erp_inventory', 'erp_orders', 'erp_production', 'erp_procurement', 'erp_purchases',
        'erp_transfers', 'erp_stock_transfers', 'procurement_custom_depts',
        'sales_quotes_inbox', 'sales_data', 'sales_price_list'
    ];

    const ODOO_PANEL_READ_MAP = {
        'erp-inventory': ['erp_inventory'],
        'erp-orders': ['erp_orders', 'sales_quotes_inbox'],
        'erp-production': ['erp_production'],
        'erp-procurement': ['erp_procurement', 'erp_purchases', 'procurement_custom_depts'],
        'erp-warehouse-transfers': ['erp_transfers', 'erp_stock_transfers', 'erp_inventory'],
        'erp-quote-builder': ['sales_quotes_inbox', 'sales_price_list', 'site_products'],
        'erp-pricelist': ['sales_price_list', 'site_products'],
        'erp-hr-platform': ODOO_HR_KEYS,
        'erp-wpc-dept': ODOO_ERP_KEYS,
        'erp-aluminum-dept': ODOO_ERP_KEYS,
        'crm': ['crm_customers', 'crm_opportunities', 'crm_activities', 'crm_audit'],
        'complaints': ['complaints'],
        'hr': ODOO_HR_KEYS,
        'governance': ['admin_users', 'branches', 'system_settings', 'audit_logs'],
        'content': ['site_products', 'showroom_gallery', 'visitor_icons', 'dashboard_tiles'],
        'accounting': ['erp_purchases', 'sales_data', 'erp_orders']
    };

    let odooSaveChain = Promise.resolve();
    let odooDeltaTimer = null;
    let odooDeltaInFlight = null;

    function isPublicKey(k) {
        return global.NEBRAS_PUBLIC_STORE_KEYS && global.NEBRAS_PUBLIC_STORE_KEYS.indexOf(k) >= 0;
    }

    function isSensitiveKey(k) {
        return typeof global.isSensitiveStoreKey === 'function' ? global.isSensitiveStoreKey(k) : false;
    }

    function getSyncCursor() {
        try {
            return localStorage.getItem(SYNC_CURSOR_KEY) || '';
        } catch (e) { return ''; }
    }

    function setSyncCursor(iso) {
        try {
            if (iso) localStorage.setItem(SYNC_CURSOR_KEY, iso);
        } catch (e) { /* ignore */ }
    }

    function bumpSyncCursor(rows) {
        let max = getSyncCursor();
        (rows || []).forEach(function(row) {
            if (row && row.updated_at && (!max || row.updated_at > max)) max = row.updated_at;
        });
        if (!max) max = new Date().toISOString();
        setSyncCursor(max);
    }

    function applyRow(row) {
        if (!row || !row.store_key) return;
        if (typeof global.applyNebrasRealtimeStorePatch === 'function') {
            global.applyNebrasRealtimeStorePatch(row.store_key, row.payload, row.updated_at);
        } else if (typeof global.applyNebrasCloudRow === 'function') {
            global.applyNebrasCloudRow(row.store_key, row.payload, row.updated_at);
        }
    }

    function filterDeltaRows(rows, since) {
        if (!since || !rows || !rows.length) return rows || [];
        return rows.filter(function(row) {
            if (!row || !row.updated_at) return true;
            try { return new Date(row.updated_at) > new Date(since); } catch (e) { return true; }
        });
    }

    async function pullPublicKeys(keys, since) {
        const client = typeof global.getNebrasSupabaseClient === 'function'
            ? global.getNebrasSupabaseClient()
            : global.supabaseClient;
        if (!client || !keys.length) return [];
        try {
            let q = client.from('nebras_data_store').select('store_key, payload, updated_at').in('store_key', keys);
            if (since) q = q.gt('updated_at', since);
            const { data, error } = await q;
            if (error || !data) return [];
            return data;
        } catch (e) {
            console.warn('Odoo public pull:', e);
            return [];
        }
    }

    async function pullSensitiveKeys(keys, since) {
        if (typeof global.secureCloudPull !== 'function' || typeof global.getNebrasSecureToken !== 'function') return [];
        if (!global.getNebrasSecureToken()) return [];
        try {
            const rows = await global.secureCloudPull(keys, since || '');
            return filterDeltaRows(rows, since);
        } catch (e) {
            console.warn('Odoo sensitive pull:', e);
            return [];
        }
    }

    async function nebrasOdooPullFromServer(options) {
        options = options || {};
        if (typeof global.isNebrasCloudHydrating === 'function' && global.isNebrasCloudHydrating()) {
            return false;
        }
        const since = options.full ? '' : (options.since || getSyncCursor());
        const keys = options.storeKeys || ODOO_WRITE_KEYS.slice();
        const publicKeys = keys.filter(isPublicKey);
        const sensKeys = keys.filter(isSensitiveKey);

        const rows = [];
        if (publicKeys.length) {
            const pub = await pullPublicKeys(publicKeys, since);
            rows.push.apply(rows, pub);
        }
        if (sensKeys.length) {
            const sens = await pullSensitiveKeys(sensKeys, since);
            rows.push.apply(rows, sens);
        }
        if (!rows.length && since) return true;

        rows.forEach(applyRow);
        bumpSyncCursor(rows);
        try {
            if (typeof global.persistLocalGovernanceKeys === 'function') global.persistLocalGovernanceKeys();
            if (typeof global.persistAnalyticsGovernanceLocal === 'function') global.persistAnalyticsGovernanceLocal();
        } catch (e) { /* ignore */ }

        if (typeof global.nebrasCloudSynced !== 'undefined') global.nebrasCloudSynced = true;
        if (typeof global.nebrasLastCloudLoadAt !== 'undefined') global.nebrasLastCloudLoadAt = new Date();
        return rows.length > 0 || !!since;
    }

    async function nebrasOdooDeltaPull() {
        if (odooDeltaInFlight) return odooDeltaInFlight;
        const admin = typeof global.getNebrasCurrentAdmin === 'function' ? global.getNebrasCurrentAdmin() : null;
        if (!admin) return false;
        if (typeof global.isNebrasCloudHydrating === 'function' && global.isNebrasCloudHydrating()) return false;
        odooDeltaInFlight = nebrasOdooPullFromServer({ delta: true }).then(function(ok) {
            if (ok && typeof global.renderNebrasCloudStatusOrb === 'function') {
                global.renderNebrasCloudStatusOrb('idle');
            }
            return ok;
        }).catch(function(err) {
            console.warn('Odoo delta:', err);
            return false;
        }).finally(function() {
            odooDeltaInFlight = null;
        });
        return odooDeltaInFlight;
    }

    async function nebrasOdooReadForPanel(panelId, panelType) {
        if (!global.NEBRAS_ODOO_WRITE_MODE) return false;
        let keys = ODOO_PANEL_READ_MAP[panelId];
        if (!keys && panelType === 'erp') keys = ODOO_ERP_KEYS;
        if (!keys && panelType === 'platform' && panelId && panelId.indexOf('hr') >= 0) keys = ODOO_HR_KEYS;
        if (!keys || !keys.length) return false;
        if (typeof global.waitForNebrasCloudHydrate === 'function') {
            await global.waitForNebrasCloudHydrate();
        }
        return nebrasOdooPullFromServer({ storeKeys: keys, since: '' });
    }

    function startNebrasOdooDeltaSync() {
        if (odooDeltaTimer) return;
        nebrasOdooDeltaPull();
        odooDeltaTimer = setInterval(function() {
            const admin = typeof global.getNebrasCurrentAdmin === 'function' ? global.getNebrasCurrentAdmin() : null;
            if (!admin) return;
            if (document.visibilityState === 'hidden') return;
            nebrasOdooDeltaPull();
        }, DELTA_INTERVAL_MS);
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible') nebrasOdooDeltaPull();
        });
    }

    function stopNebrasOdooDeltaSync() {
        if (odooDeltaTimer) {
            clearInterval(odooDeltaTimer);
            odooDeltaTimer = null;
        }
    }

    async function nebrasOdooPersistKeys(storeKeys, options) {
        options = options || {};
        storeKeys = (storeKeys && storeKeys.length) ? storeKeys : ODOO_WRITE_KEYS.slice();
        if (typeof global.isNebrasCloudHydrating === 'function' && global.isNebrasCloudHydrating()) {
            return false;
        }
        if (typeof global.ensureNebrasCloudSessionReady === 'function') {
            const sess = await global.ensureNebrasCloudSessionReady({ promptReauth: options.promptReauth !== false });
            if (!sess) return false;
        }
        if (typeof global.persistNebrasCriticalStores !== 'function') return false;
        return global.persistNebrasCriticalStores(storeKeys, {
            showToast: options.showToast === true,
            promptReauth: false
        });
    }

    function nebrasOdooFlushLocalCache() {
        let ok = true;
        try {
            if (typeof global.persistLocalGovernanceKeys === 'function') ok = global.persistLocalGovernanceKeys() && ok;
            if (typeof global.persistAnalyticsGovernanceLocal === 'function') global.persistAnalyticsGovernanceLocal();
            if (typeof global.saveCallbackLeads === 'function') global.saveCallbackLeads();
        } catch (localErr) {
            console.warn('Odoo local cache:', localErr);
            ok = false;
        }
        return ok;
    }

    function odooQuietOrb(state, detail) {
        if (!global.NEBRAS_ODOO_QUIET_UI) return;
        if (state === 'saving' || state === 'idle' || state === 'ok') {
            if (typeof global.renderNebrasCloudStatusOrb === 'function') {
                global.renderNebrasCloudStatusOrb('idle', 'متصل بالسيرفر');
            }
            if (typeof global.renderNebrasLiveCloudRibbon === 'function') {
                global.renderNebrasLiveCloudRibbon('idle');
            }
            return true;
        }
        return false;
    }

    async function nebrasOdooSaveSystemDataCore(options) {
        options = options || {};
        if (typeof global.isNebrasCloudHydrating === 'function' && global.isNebrasCloudHydrating()) {
            nebrasOdooFlushLocalCache();
            return true;
        }
        if (typeof global.purgeDeprecatedVisitorIcons === 'function') global.purgeDeprecatedVisitorIcons();
        const keys = options.storeKeys || ODOO_WRITE_KEYS.slice();
        if (!odooQuietOrb('saving')) {
            if (typeof global.renderNebrasLiveCloudRibbon === 'function') global.renderNebrasLiveCloudRibbon('saving');
            if (typeof global.renderNebrasCloudStatusOrb === 'function') {
                global.renderNebrasCloudStatusOrb('saving', 'جاري الحفظ على السيرفر…');
            }
        }

        const ok = await nebrasOdooPersistKeys(keys, { showToast: false, promptReauth: false });
        const localOk = nebrasOdooFlushLocalCache();

        if (ok) {
            setSyncCursor(new Date().toISOString());
            if (typeof global.clearSensitiveCloudPending === 'function') global.clearSensitiveCloudPending();
            if (typeof global.clearLocalCloudMutations === 'function') global.clearLocalCloudMutations(keys);
        }

        if (ok) odooQuietOrb('ok');
        else if (!odooQuietOrb('error')) {
            if (typeof global.renderNebrasLiveCloudRibbon === 'function') global.renderNebrasLiveCloudRibbon('error');
            if (typeof global.renderNebrasCloudStatusOrb === 'function') {
                global.renderNebrasCloudStatusOrb('error', '✗ فشل الحفظ');
            }
        }
        if (typeof global.updateCloudSafetyBanner === 'function') global.updateCloudSafetyBanner();

        const showToast = options.showCloudToast === true;
        if (!ok && !options.silentCloudFail && showToast && typeof global.showNebrasAdminToast === 'function') {
            global.showNebrasAdminToast('✗ لم يُحفظ على السيرفر — تحققي من الاتصال وأعيدي المحاولة', 'error');
        }
        return ok && localOk;
    }

    function nebrasOdooSaveSystemData(options) {
        odooSaveChain = odooSaveChain.then(function() {
            return nebrasOdooSaveSystemDataCore(options || {});
        }).catch(function(err) {
            console.warn('Odoo save chain:', err);
            return false;
        });
        return odooSaveChain;
    }

    function initNebrasOdooWriteMode() {
        if (!global.NEBRAS_ODOO_WRITE_MODE) return;
        try { document.body.classList.add('nebras-odoo-write-mode'); } catch (e) { /* ignore */ }
        const admin = typeof global.getNebrasCurrentAdmin === 'function' ? global.getNebrasCurrentAdmin() : null;
        if (admin) startNebrasOdooDeltaSync();
        document.addEventListener('nebras-dashboard-ready', function() {
            startNebrasOdooDeltaSync();
        });
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initNebrasOdooWriteMode);
        } else {
            initNebrasOdooWriteMode();
        }
    }

    global.NEBRAS_ODOO_WRITE_KEYS = ODOO_WRITE_KEYS;
    global.nebrasOdooPersistKeys = nebrasOdooPersistKeys;
    global.nebrasOdooSaveSystemData = nebrasOdooSaveSystemData;
    global.nebrasOdooPullFromServer = nebrasOdooPullFromServer;
    global.nebrasOdooDeltaPull = nebrasOdooDeltaPull;
    global.nebrasOdooReadForPanel = nebrasOdooReadForPanel;
    global.startNebrasOdooDeltaSync = startNebrasOdooDeltaSync;
    global.stopNebrasOdooDeltaSync = stopNebrasOdooDeltaSync;

})(typeof window !== 'undefined' ? window : globalThis);
