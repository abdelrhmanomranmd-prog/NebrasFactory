/**
 * نبراس — السحابة الآمنة (API + جلسة إدارية)
 * المفاتيح الحساسة تمر عبر Vercel API + SERVICE_ROLE — لا تُقرأ من anon
 */
(function(global) {
    'use strict';

    const SESSION_KEY = 'nebrasSecureAdminToken';
    const SESSION_EXP_KEY = 'nebrasSecureAdminExp';

    const PUBLIC_STORE_KEYS = [
        'site_products', 'visitor_icons', 'dashboard_tiles', 'site_custom_sections',
        'about_pages', 'system_settings', 'branches', 'site_partners', 'site_certifications',
        'showroom_gallery', 'visitor_analytics'
    ];

    const SENSITIVE_STORE_KEYS = [
        'admin_users', 'admin_recovery_otp', 'admin_presence', 'audit_logs', 'analytics_governance',
        'sales_quotes_inbox', 'sales_data', 'quote_registry', 'callback_leads',
        'customer_portal_users', 'customer_portal_audit', 'customer_order_journeys', 'customer_service',
        'complaints', 'erp_inventory', 'erp_orders', 'erp_production', 'erp_procurement', 'erp_purchases',
        'erp_transfers', 'erp_stock_transfers', 'sales_price_list', 'procurement_custom_depts',
        'hr_employees', 'hr_vehicles', 'hr_leave', 'hr_vehicle_tracking', 'hr_attendance',
        'hr_documents', 'hr_payroll', 'hr_notifications', 'hr_notif_settings', 'hr_email_queue',
        'hr_shift_roster', 'hr_dept_activity', 'hr_companies', 'hr_gps_positions', 'hr_gps_settings',
        'hr_gps_consents', 'hr_travel', 'hr_deductions', 'hr_advances',
        'legal_contracts', 'legal_cases', 'legal_compliance', 'legal_policies',
        'legal_correspondence', 'legal_activity', 'legal_rentals', 'legal_notif_settings',
        'crm_customers', 'crm_opportunities', 'crm_activities', 'crm_audit',
        'nebras_cloud_snapshots', 'nebras_platform_integrity'
    ];

    function isSensitiveStoreKey(k) {
        return SENSITIVE_STORE_KEYS.indexOf(k) >= 0;
    }

    function isPublicStoreKey(k) {
        return PUBLIC_STORE_KEYS.indexOf(k) >= 0;
    }

    function getSecureToken() {
        try {
            const t = sessionStorage.getItem(SESSION_KEY);
            const exp = Number(sessionStorage.getItem(SESSION_EXP_KEY) || 0);
            if (!t || !exp || Date.now() > exp) return '';
            return t;
        } catch (e) { return ''; }
    }

    function setSecureToken(token, expiresAt) {
        try {
            if (!token) {
                sessionStorage.removeItem(SESSION_KEY);
                sessionStorage.removeItem(SESSION_EXP_KEY);
                return;
            }
            sessionStorage.setItem(SESSION_KEY, token);
            sessionStorage.setItem(SESSION_EXP_KEY, String(expiresAt || Date.now() + 28800000));
        } catch (e) { /* ignore */ }
    }

    function clearSecureSession() {
        setSecureToken('', 0);
    }

    function apiBase() {
        if (typeof global.NEBRAS_API_BASE === 'string' && global.NEBRAS_API_BASE) return global.NEBRAS_API_BASE;
        return '';
    }

    async function secureApiLogin(username, password) {
        try {
            const res = await fetch(apiBase() + '/api/nebras-auth?action=login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, password: password })
            });
            const data = await res.json();
            if (!res.ok || !data.ok || !data.token) return null;
            setSecureToken(data.token, data.expiresAt);
            return data;
        } catch (e) {
            console.warn('secureApiLogin failed:', e);
            return null;
        }
    }

    async function secureCloudPull(keys) {
        const token = getSecureToken();
        if (!token) return [];
        const qs = keys && keys.length ? '&keys=' + encodeURIComponent(keys.join(',')) : '';
        try {
            const res = await fetch(apiBase() + '/api/nebras-cloud?action=pull' + qs, {
                headers: { Authorization: 'Bearer ' + token }
            });
            const data = await res.json();
            if (!res.ok || !data.ok || !data.rows) return [];
            return data.rows;
        } catch (e) {
            console.warn('secureCloudPull failed:', e);
            return [];
        }
    }

    async function secureCloudPush(rows) {
        const token = getSecureToken();
        if (!token || !rows || !rows.length) return false;
        try {
            const res = await fetch(apiBase() + '/api/nebras-cloud?action=push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + token
                },
                body: JSON.stringify({ rows: rows })
            });
            const data = await res.json();
            return !!(res.ok && data.ok);
        } catch (e) {
            console.warn('secureCloudPush failed:', e);
            return false;
        }
    }

    async function establishSecureSession(username, password) {
        if (!username || !password) return false;
        const r = await secureApiLogin(username, password);
        return !!(r && r.token);
    }

    async function pullSensitiveCloudAndApply(applyFn) {
        const rows = await secureCloudPull(SENSITIVE_STORE_KEYS);
        if (!rows.length || typeof applyFn !== 'function') return false;
        rows.forEach(function(row) {
            if (row && row.store_key) applyFn(row.store_key, row.payload);
        });
        return true;
    }

    function mergeApiAdminUser(user) {
        if (!user || typeof global.getNebrasCurrentAdmin === 'undefined') return;
        try {
            if (typeof adminUsers !== 'undefined' && Array.isArray(adminUsers)) {
                const idx = adminUsers.findIndex(function(u) { return u.id === user.id; });
                if (idx >= 0) adminUsers[idx] = Object.assign({}, adminUsers[idx], user);
                else adminUsers.push(user);
                if (typeof saveSystemData === 'function') saveSystemData({ skipCloud: true });
            }
        } catch (e) { /* ignore */ }
    }

    global.NEBRAS_PUBLIC_STORE_KEYS = PUBLIC_STORE_KEYS;
    global.NEBRAS_SENSITIVE_STORE_KEYS = SENSITIVE_STORE_KEYS;
    global.isSensitiveStoreKey = isSensitiveStoreKey;
    global.isPublicStoreKey = isPublicStoreKey;
    global.getNebrasSecureToken = getSecureToken;
    global.clearNebrasSecureSession = clearSecureSession;
    global.establishNebrasSecureSession = establishSecureSession;
    global.secureApiLogin = secureApiLogin;
    global.secureCloudPull = secureCloudPull;
    global.secureCloudPush = secureCloudPush;
    global.pullSensitiveCloudAndApply = pullSensitiveCloudAndApply;
    global.mergeApiAdminUser = mergeApiAdminUser;

})(typeof window !== 'undefined' ? window : globalThis);
