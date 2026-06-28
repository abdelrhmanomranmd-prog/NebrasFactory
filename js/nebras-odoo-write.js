/**
 * نبراس — Odoo Write-Through Mode (hrws157)
 * السيرفر أولاً: كل حفظ → Supabase → ثم كاش محلي (مثل Odoo ERP)
 */
(function(global) {
    'use strict';

    global.NEBRAS_ODOO_WRITE_MODE = true;

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

    let odooSaveChain = Promise.resolve();

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
            if (typeof global.persistLocalGovernanceKeys === 'function') {
                ok = global.persistLocalGovernanceKeys() && ok;
            }
            if (typeof global.persistAnalyticsGovernanceLocal === 'function') {
                global.persistAnalyticsGovernanceLocal();
            }
            if (typeof global.saveCallbackLeads === 'function') {
                global.saveCallbackLeads();
            }
        } catch (localErr) {
            console.warn('Odoo local cache:', localErr);
            ok = false;
        }
        return ok;
    }

    async function nebrasOdooSaveSystemDataCore(options) {
        options = options || {};
        if (typeof global.isNebrasCloudHydrating === 'function' && global.isNebrasCloudHydrating()) {
            nebrasOdooFlushLocalCache();
            return true;
        }
        if (typeof global.purgeDeprecatedVisitorIcons === 'function') {
            global.purgeDeprecatedVisitorIcons();
        }
        const keys = options.storeKeys || ODOO_WRITE_KEYS.slice();
        if (typeof global.renderNebrasLiveCloudRibbon === 'function') {
            global.renderNebrasLiveCloudRibbon('saving');
        }
        if (typeof global.renderNebrasCloudStatusOrb === 'function') {
            global.renderNebrasCloudStatusOrb('saving', 'جاري الحفظ على السيرفر…');
        }

        const ok = await nebrasOdooPersistKeys(keys, { showToast: false, promptReauth: false });
        const localOk = nebrasOdooFlushLocalCache();

        if (ok) {
            if (typeof global.clearSensitiveCloudPending === 'function') global.clearSensitiveCloudPending();
            if (typeof global.clearLocalCloudMutations === 'function') {
                global.clearLocalCloudMutations(keys);
            }
        }

        if (typeof global.renderNebrasLiveCloudRibbon === 'function') {
            global.renderNebrasLiveCloudRibbon(ok ? 'ok' : 'error');
        }
        if (typeof global.renderNebrasCloudStatusOrb === 'function') {
            global.renderNebrasCloudStatusOrb(ok ? 'ok' : 'error', ok ? '✓ محفوظ على السيرفر' : '✗ فشل الحفظ');
        }
        if (typeof global.updateCloudSafetyBanner === 'function') {
            global.updateCloudSafetyBanner();
        }

        const showToast = options.showCloudToast === true || options.urgentCloud === true;
        if (ok && showToast && typeof global.showNebrasAdminToast === 'function') {
            global.showNebrasAdminToast('✓ تم الحفظ على السيرفر — متاح لكل الأجهزة والفروع', 'ok');
        } else if (!ok && !options.silentCloudFail && typeof global.showNebrasAdminToast === 'function') {
            global.showNebrasAdminToast('✗ لم يُحفظ على السيرفر — تحققي من الاتصال وأعيدي المحاولة', 'error');
        }
        if (!localOk && typeof global.showNebrasAdminToast === 'function') {
            global.showNebrasAdminToast('تعذّر الكاش المحلي — البيانات على السيرفر إن نجح الرفع', 'warn');
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
        try {
            document.body.classList.add('nebras-odoo-write-mode');
        } catch (e) { /* ignore */ }
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

})(typeof window !== 'undefined' ? window : globalThis);
