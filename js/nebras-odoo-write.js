/**
 * نبراس — Odoo Mode (hrws158)
 * A: Write-Through — سيرفر أولاً عند الحفظ
 * B: Read-Through — قراءة من السيرفر عند فتح الأقسام
 * C: Delta Sync — سحب التغييرات فقط
 * D: Quiet UI — بدون تنبيهات مزعجة (فقط عند فشل حقيقي)
 */
(function(global) {
    'use strict';

    global.NEBRAS_ODOO_WRITE_MODE = true;
    global.NEBRAS_ODOO_QUIET_UI = true;

    const ODOO_SYNC_SINCE_KEY = 'nebrasOdooSyncSince';
    const ODOO_DELTA_MS = 45000;
    const PUBLIC_KEYS = [
        'site_products', 'visitor_icons', 'dashboard_tiles', 'site_custom_sections',
        'about_pages', 'system_settings', 'branches', 'site_partners', 'site_certifications',
        'showroom_gallery', 'visitor_analytics'
    ];

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

    const ODOO_ERP_KEYS = [
        'erp_inventory', 'erp_orders', 'erp_production', 'erp_procurement', 'erp_purchases',
        'erp_transfers', 'erp_stock_transfers', 'procurement_custom_depts', 'sales_data', 'sales_price_list'
    ];

    const ODOO_HR_KEYS = [
        'hr_employees', 'hr_vehicles', 'hr_leave', 'hr_vehicle_tracking', 'hr_attendance',
        'hr_documents', 'hr_payroll', 'hr_companies', 'hr_advances', 'hr_vehicle_violations',
        'hr_travel', 'hr_deductions', 'hr_notifications', 'hr_notif_settings', 'hr_email_queue',
        'hr_shift_roster', 'hr_dept_activity'
    ];

    const ODOO_CRM_KEYS = [
        'crm_customers', 'crm_opportunities', 'crm_activities', 'crm_audit',
        'customer_service', 'complaints', 'callback_leads', 'sales_quotes_inbox'
    ];

    let odooSaveChain = Promise.resolve();
    let odooDeltaTimer = null;
    let odooReadInFlight = null;

    function isPublicKey(k) {
        return PUBLIC_KEYS.indexOf(k) >= 0;
    }

    function getOdooSyncSince() {
        try {
            return localStorage.getItem(ODOO_SYNC_SINCE_KEY) || null;
        } catch (e) { return null; }
    }

    function setOdooSyncSince(iso) {
        try {
            localStorage.setItem(ODOO_SYNC_SINCE_KEY, iso || new Date().toISOString());
        } catch (e) { /* ignore */ }
    }

    function applyCloudRow(row) {
        if (!row || !row.store_key) return;
        if (typeof global.applyNebrasRealtimeStorePatch === 'function') {
            global.applyNebrasRealtimeStorePatch(row.store_key, row.payload, row.updated_at || null);
        } else if (typeof global.applyNebrasCloudRow === 'function') {
            global.applyNebrasCloudRow(row.store_key, row.payload, row.updated_at || null);
        }
    }

    function getSupabaseClient() {
        if (typeof global.getNebrasSupabaseClient === 'function') return global.getNebrasSupabaseClient();
        return global.supabaseClient || null;
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

    function odooUiSaving() {
        if (global.NEBRAS_ODOO_QUIET_UI) return;
        if (typeof global.renderNebrasLiveCloudRibbon === 'function') global.renderNebrasLiveCloudRibbon('saving');
        if (typeof global.renderNebrasCloudStatusOrb === 'function') {
            global.renderNebrasCloudStatusOrb('saving', 'جاري الحفظ على السيرفر…');
        }
    }

    function odooUiSaved(ok) {
        if (global.NEBRAS_ODOO_QUIET_UI) {
            if (typeof global.renderNebrasCloudStatusOrb === 'function') {
                global.renderNebrasCloudStatusOrb(ok ? 'idle' : 'error', ok ? '✓ السيرفر' : '✗ فشل الحفظ');
            }
            if (!ok && typeof global.renderNebrasLiveCloudRibbon === 'function') {
                global.renderNebrasLiveCloudRibbon('error');
            }
            return;
        }
        if (typeof global.renderNebrasLiveCloudRibbon === 'function') {
            global.renderNebrasLiveCloudRibbon(ok ? 'ok' : 'error');
        }
        if (typeof global.renderNebrasCloudStatusOrb === 'function') {
            global.renderNebrasCloudStatusOrb(ok ? 'ok' : 'error', ok ? '✓ محفوظ على السيرفر' : '✗ فشل الحفظ');
        }
    }

    async function nebrasOdooSaveSystemDataCore(options) {
        options = options || {};
        if (typeof global.isNebrasCloudHydrating === 'function' && global.isNebrasCloudHydrating()) {
            nebrasOdooFlushLocalCache();
            return true;
        }
        if (typeof global.purgeDeprecatedVisitorIcons === 'function') global.purgeDeprecatedVisitorIcons();
        const keys = options.storeKeys || ODOO_WRITE_KEYS.slice();
        odooUiSaving();
        const ok = await nebrasOdooPersistKeys(keys, { showToast: false, promptReauth: false });
        const localOk = nebrasOdooFlushLocalCache();
        if (ok) {
            if (typeof global.clearSensitiveCloudPending === 'function') global.clearSensitiveCloudPending();
            if (typeof global.clearLocalCloudMutations === 'function') global.clearLocalCloudMutations(keys);
            setOdooSyncSince(new Date().toISOString());
        }
        odooUiSaved(ok);
        if (typeof global.updateCloudSafetyBanner === 'function') global.updateCloudSafetyBanner();
        const showToast = options.showCloudToast === true;
        if (ok && showToast && typeof global.showNebrasAdminToast === 'function') {
            global.showNebrasAdminToast('✓ تم الحفظ على السيرفر — متاح لكل الأجهزة والفروع', 'ok');
        } else if (!ok && !options.silentCloudFail && typeof global.showNebrasAdminToast === 'function') {
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

    /** B+C — Read-Through + Delta من السيرفر */
    async function nebrasOdooReadThroughKeys(storeKeys, options) {
        options = options || {};
        storeKeys = (storeKeys && storeKeys.length) ? storeKeys : ODOO_WRITE_KEYS.slice();
        const full = options.force === true || options.full === true;
        const since = full ? null : getOdooSyncSince();
        let loaded = 0;

        const publicKeys = storeKeys.filter(isPublicKey);
        const sensKeys = storeKeys.filter(function(k) { return !isPublicKey(k); });

        const client = getSupabaseClient();
        if (client && publicKeys.length) {
            try {
                let q = client.from('nebras_data_store').select('store_key, payload, updated_at').in('store_key', publicKeys);
                if (since) q = q.gt('updated_at', since);
                const { data, error } = await q;
                if (!error && data && data.length) {
                    data.forEach(function(row) { applyCloudRow(row); loaded++; });
                }
            } catch (pubErr) {
                console.warn('Odoo public read:', pubErr);
            }
        }

        if (sensKeys.length && typeof global.secureCloudPull === 'function' &&
            typeof global.getNebrasSecureToken === 'function' && global.getNebrasSecureToken()) {
            try {
                const chunkSize = 24;
                for (let i = 0; i < sensKeys.length; i += chunkSize) {
                    const chunk = sensKeys.slice(i, i + chunkSize);
                    const rows = await global.secureCloudPull(chunk, since);
                    (rows || []).forEach(function(row) { applyCloudRow(row); loaded++; });
                }
            } catch (sensErr) {
                console.warn('Odoo sensitive read:', sensErr);
            }
        }

        if (loaded || full) setOdooSyncSince(new Date().toISOString());
        nebrasOdooFlushLocalCache();
        return loaded > 0 || full;
    }

    async function nebrasOdooLoadFromServer(options) {
        options = options || {};
        if (odooReadInFlight) return odooReadInFlight;
        odooReadInFlight = (async function() {
            if (typeof global.isNebrasCloudHydrating === 'function' && global.isNebrasCloudHydrating()) {
                return false;
            }
            if (typeof global.ensureNebrasCloudSessionReady === 'function') {
                await global.ensureNebrasCloudSessionReady({ promptReauth: false });
            }
            const full = options.force === true || options.delta !== true;
            const ok = await nebrasOdooReadThroughKeys(options.storeKeys || ODOO_WRITE_KEYS.slice(), {
                force: full,
                silent: options.silent
            });
            if (typeof global.finalizePlatformDataAfterLoad === 'function') {
                global.finalizePlatformDataAfterLoad({ skipBuiltinSeeds: ok });
            }
            if (!options.silent && typeof global.renderNebrasCloudStatusOrb === 'function') {
                global.renderNebrasCloudStatusOrb('idle', '✓ متزامن مع السيرفر');
            }
            return ok;
        })().finally(function() {
            odooReadInFlight = null;
        });
        return odooReadInFlight;
    }

    function nebrasOdooBeforePanel(panelType) {
        const map = {
            erp: ODOO_ERP_KEYS,
            hr: ODOO_HR_KEYS,
            crm: ODOO_CRM_KEYS,
            analytics: ODOO_CRM_KEYS.concat(['visitor_analytics', 'analytics_governance', 'audit_logs']),
            governance: ['admin_users', 'branches', 'system_settings', 'admin_presence']
        };
        const keys = map[panelType] || [];
        if (!keys.length) return Promise.resolve(false);
        return nebrasOdooReadThroughKeys(keys, { delta: true, silent: true }).then(function(ok) {
            if (panelType === 'erp' && typeof global.renderErpHubPanel === 'function') global.renderErpHubPanel();
            if (panelType === 'hr' && typeof global.renderHrPlatformPanelSafe === 'function') {
                try { global.renderHrPlatformPanelSafe(); } catch (e) { /* ignore */ }
            }
            if (panelType === 'analytics' && typeof global.renderAdminAnalyticsPanel === 'function') {
                global.renderAdminAnalyticsPanel();
            }
            return ok;
        });
    }

    function startNebrasOdooDeltaSync() {
        if (odooDeltaTimer) return;
        odooDeltaTimer = setInterval(function() {
            const admin = typeof global.getNebrasCurrentAdmin === 'function' ? global.getNebrasCurrentAdmin() : null;
            if (!admin) return;
            if (typeof global.isNebrasCloudHydrating === 'function' && global.isNebrasCloudHydrating()) return;
            if (typeof global.hasPendingLocalCloudMutations === 'function' && global.hasPendingLocalCloudMutations()) return;
            nebrasOdooLoadFromServer({ delta: true, silent: true }).catch(function(e) {
                console.warn('Odoo delta sync:', e);
            });
        }, ODOO_DELTA_MS);
    }

    function stopNebrasOdooDeltaSync() {
        if (odooDeltaTimer) {
            clearInterval(odooDeltaTimer);
            odooDeltaTimer = null;
        }
    }

    function initNebrasOdooWriteMode() {
        if (!global.NEBRAS_ODOO_WRITE_MODE) return;
        try {
            document.body.classList.add('nebras-odoo-write-mode');
        } catch (e) { /* ignore */ }
        if (typeof document !== 'undefined') {
            document.addEventListener('nebras-dashboard-ready', function() {
                startNebrasOdooDeltaSync();
            });
        }
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initNebrasOdooWriteMode);
        } else {
            initNebrasOdooWriteMode();
        }
    }

    global.NEBRAS_ODOO_WRITE_KEYS = ODOO_WRITE_KEYS;
    global.NEBRAS_ODOO_ERP_KEYS = ODOO_ERP_KEYS;
    global.NEBRAS_ODOO_HR_KEYS = ODOO_HR_KEYS;
    global.NEBRAS_ODOO_CRM_KEYS = ODOO_CRM_KEYS;
    global.nebrasOdooPersistKeys = nebrasOdooPersistKeys;
    global.nebrasOdooSaveSystemData = nebrasOdooSaveSystemData;
    global.nebrasOdooReadThroughKeys = nebrasOdooReadThroughKeys;
    global.nebrasOdooLoadFromServer = nebrasOdooLoadFromServer;
    global.nebrasOdooBeforePanel = nebrasOdooBeforePanel;
    global.startNebrasOdooDeltaSync = startNebrasOdooDeltaSync;
    global.stopNebrasOdooDeltaSync = stopNebrasOdooDeltaSync;

})(typeof window !== 'undefined' ? window : globalThis);
