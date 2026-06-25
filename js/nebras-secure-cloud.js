/**
 * نبراس — السحابة الآمنة (API + جلسة إدارية)
 * المفاتيح الحساسة تمر عبر Vercel API + SERVICE_ROLE — لا تُقرأ من anon
 */
(function(global) {
    'use strict';

    const SESSION_KEY = 'nebrasSecureAdminToken';
    const SESSION_EXP_KEY = 'nebrasSecureAdminExp';
    const SESSION_PERSIST_KEY = 'nebrasSecureAdminTokenPersist';
    const SESSION_PERSIST_EXP_KEY = 'nebrasSecureAdminExpPersist';

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
        'hr_gps_consents', 'hr_travel', 'hr_deductions', 'hr_advances', 'hr_vehicle_violations',
        'legal_contracts', 'legal_cases', 'legal_compliance', 'legal_policies',
        'legal_correspondence', 'legal_activity', 'legal_rentals', 'legal_notif_settings',
        'crm_customers', 'crm_opportunities', 'crm_activities', 'crm_audit',
        'nebras_cloud_snapshots', 'nebras_platform_integrity'
    ];

    const HQ_ONLY_STORE_KEYS = [
        'admin_users', 'admin_recovery_otp', 'analytics_governance', 'nebras_platform_integrity'
    ];

    function isHqAdmin(admin) {
        if (!admin) return false;
        return !!admin.isPrimary && String(admin.username || '').toUpperCase() === 'NEBRASFACTORY';
    }

    const PERMISSION_STORE_EXACT = {
        users: ['admin_users'],
        content: ['site_products', 'visitor_icons', 'showroom_gallery', 'site_custom_sections', 'about_pages', 'site_certifications', 'dashboard_tiles'],
        inventory: ['erp_inventory'],
        warehouse: ['erp_inventory', 'erp_transfers', 'erp_stock_transfers'],
        production: ['erp_production'],
        procurement: ['erp_procurement', 'erp_purchases', 'procurement_custom_depts'],
        accounting: ['erp_purchases', 'sales_data'],
        orders: ['erp_orders', 'customer_order_journeys'],
        sales: ['sales_data', 'sales_price_list'],
        quotes: ['sales_quotes_inbox', 'quote_registry'],
        customerService: ['customer_service'],
        complaints: ['complaints'],
        branches: ['branches'],
        audit: ['audit_logs'],
        productMaster: ['site_products', 'sales_price_list'],
        customerPortal: ['customer_portal_users', 'customer_portal_audit'],
        createCustomerUser: ['customer_portal_users'],
        orderJourney: ['customer_order_journeys'],
        storeCatalog: ['site_products']
    };

    function keysAllowedByCustomPermissions(permissions, keys) {
        if (!Array.isArray(permissions) || !permissions.length || !Array.isArray(keys)) return [];
        const allowed = {};
        permissions.forEach(function(perm) {
            const exact = PERMISSION_STORE_EXACT[perm];
            if (exact) exact.forEach(function(k) { allowed[k] = true; });
            if (perm === 'erp' || perm === 'aluminum') {
                keys.forEach(function(k) {
                    if (k.indexOf('erp_') === 0) allowed[k] = true;
                });
            }
            if (perm === 'hr') {
                keys.forEach(function(k) {
                    if (k.indexOf('hr_') === 0) allowed[k] = true;
                });
            }
            if (perm === 'legal') {
                keys.forEach(function(k) {
                    if (k.indexOf('legal_') === 0) allowed[k] = true;
                });
            }
        });
        return keys.filter(function(k) {
            if (HQ_ONLY_STORE_KEYS.indexOf(k) >= 0) return false;
            return !!allowed[k];
        });
    }

    function managerMayAccessKey(k) {
        const prefixes = ['erp_', 'sales_', 'quote_', 'customer_', 'crm_', 'hr_', 'legal_', 'procurement', 'complaints', 'callback_', 'audit_'];
        const exact = [
            'complaints', 'callback_leads', 'audit_logs', 'sales_quotes_inbox', 'quote_registry',
            'customer_order_journeys', 'customer_service', 'customer_portal_users', 'customer_portal_audit',
            'procurement_custom_depts', 'branches', 'site_products', 'site_custom_sections', 'about_pages',
            'site_partners', 'site_certifications', 'showroom_gallery', 'visitor_analytics',
            'sales_data', 'sales_price_list', 'nebras_cloud_snapshots'
        ];
        if (exact.indexOf(k) >= 0) return true;
        return prefixes.some(function(p) { return k.indexOf(p) === 0; });
    }

    function keysAllowedForAdmin(admin, keys) {
        if (!admin || !Array.isArray(keys)) return [];
        if (isHqAdmin(admin)) return keys.slice();
        if (Array.isArray(admin.permissions) && admin.permissions.length) {
            return keysAllowedByCustomPermissions(admin.permissions, keys);
        }
        const role = String(admin.role || '');
        return keys.filter(function(k) {
            if (HQ_ONLY_STORE_KEYS.indexOf(k) >= 0) return false;
            if (role === 'sales_rep') {
                return ['sales_quotes_inbox', 'quote_registry', 'customer_order_journeys'].indexOf(k) >= 0;
            }
            if (role === 'hr' || role === 'hr_manager' || role === 'hr_admin') {
                return k.indexOf('hr_') === 0 || k === 'audit_logs';
            }
            if (role === 'legal' || role === 'legal_manager') {
                return k.indexOf('legal_') === 0 || k === 'audit_logs';
            }
            if (role === 'aluminum_manager' || role === 'wpc_manager' || role === 'production_manager') {
                return k.indexOf('erp_') === 0 || k.indexOf('sales_') === 0 || k.indexOf('quote_') === 0 || k === 'audit_logs';
            }
            if (role === 'accountant' || role === 'accounting_manager') {
                return k.indexOf('erp_') === 0 || k.indexOf('sales_') === 0 || k === 'audit_logs' || k.indexOf('procurement') >= 0;
            }
            if (role === 'sales_manager' || role === 'branch_manager') {
                if (k === 'admin_users') return true;
                return k.indexOf('sales_') === 0 || k.indexOf('quote_') === 0 || k.indexOf('erp_') === 0 ||
                    k.indexOf('customer_') === 0 || k === 'callback_leads' || k === 'audit_logs';
            }
            if (role === 'manager') return managerMayAccessKey(k);
            if (role === 'inventory_manager' || role === 'warehouse_manager') {
                return k.indexOf('erp_') === 0 || k === 'audit_logs';
            }
            if (role === 'store_manager') {
                return k === 'site_products' || k === 'audit_logs';
            }
            return false;
        });
    }

    function filterCloudRowsForAdminSession(rows, admin) {
        if (!rows || !rows.length || !admin) return [];
        const allowed = keysAllowedForAdmin(admin, rows.map(function(r) { return r && r.store_key; }).filter(Boolean));
        const set = {};
        allowed.forEach(function(k) { set[k] = true; });
        return rows.filter(function(r) { return r && r.store_key && set[r.store_key]; });
    }

    function getCurrentAdminUser() {
        return typeof global.getNebrasCurrentAdmin === 'function' ? global.getNebrasCurrentAdmin() : null;
    }


    function isSensitiveStoreKey(k) {
        return SENSITIVE_STORE_KEYS.indexOf(k) >= 0;
    }

    function isPublicStoreKey(k) {
        return PUBLIC_STORE_KEYS.indexOf(k) >= 0;
    }

    function getSecureToken() {
        try {
            let t = sessionStorage.getItem(SESSION_KEY);
            let exp = Number(sessionStorage.getItem(SESSION_EXP_KEY) || 0);
            if (!t || !exp || Date.now() > exp) {
                t = localStorage.getItem(SESSION_PERSIST_KEY);
                exp = Number(localStorage.getItem(SESSION_PERSIST_EXP_KEY) || 0);
                if (t && exp && Date.now() <= exp) {
                    sessionStorage.setItem(SESSION_KEY, t);
                    sessionStorage.setItem(SESSION_EXP_KEY, String(exp));
                }
            }
            if (!t || !exp || Date.now() > exp) return '';
            return t;
        } catch (e) { return ''; }
    }

    function hasSecureSession() {
        return !!getSecureToken();
    }

    function setSecureToken(token, expiresAt) {
        try {
            if (!token) {
                sessionStorage.removeItem(SESSION_KEY);
                sessionStorage.removeItem(SESSION_EXP_KEY);
                localStorage.removeItem(SESSION_PERSIST_KEY);
                localStorage.removeItem(SESSION_PERSIST_EXP_KEY);
                return;
            }
            const exp = expiresAt || Date.now() + 28800000;
            sessionStorage.setItem(SESSION_KEY, token);
            sessionStorage.setItem(SESSION_EXP_KEY, String(exp));
            localStorage.setItem(SESSION_PERSIST_KEY, token);
            localStorage.setItem(SESSION_PERSIST_EXP_KEY, String(exp));
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
            if (!res.ok || !data.ok || !data.token) {
                return { ok: false, error: data.error || 'login_failed', hint: data.hint || '' };
            }
            setSecureToken(data.token, data.expiresAt);
            return data;
        } catch (e) {
            console.warn('secureApiLogin failed:', e);
            return { ok: false, error: 'network_error' };
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
        if (!token || !rows || !rows.length) return { ok: false, error: 'no_token_or_rows' };
        const admin = getCurrentAdminUser();
        const scoped = admin ? filterCloudRowsForAdminSession(rows, admin) : rows.slice();
        if (!scoped.length) return { ok: true, count: 0, note: 'no_allowed_rows' };
        const batchSize = 8;
        let pushed = 0;
        try {
            for (let i = 0; i < scoped.length; i += batchSize) {
                const chunk = scoped.slice(i, i + batchSize);
                const res = await fetch(apiBase() + '/api/nebras-cloud?action=push', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer ' + token
                    },
                    body: JSON.stringify({ rows: chunk })
                });
                const data = await res.json().catch(function() { return {}; });
                if (!res.ok || !data.ok) {
                    console.warn('secureCloudPush batch failed:', data);
                    return {
                        ok: false,
                        error: data.error || 'push_failed',
                        detail: data.detail || '',
                        pushed: pushed
                    };
                }
                pushed += Number(data.count || chunk.length);
            }
            return { ok: true, count: pushed };
        } catch (e) {
            console.warn('secureCloudPush failed:', e);
            return { ok: false, error: 'network_error', pushed: pushed };
        }
    }

    async function establishSecureSession(username, password) {
        if (!username || !password) return false;
        const r = await secureApiLogin(username, password);
        return !!(r && r.ok && r.token);
    }

    async function ensureNebrasCloudSessionReady(options) {
        options = options || {};
        if (getSecureToken()) return true;
        const admin = getCurrentAdminUser();
        if (!admin) return false;
        let password = '';
        try {
            if (typeof global.getNebrasLastLoginPassword === 'function') {
                password = global.getNebrasLastLoginPassword() || '';
            }
        } catch (e) { /* ignore */ }
        if (password) {
            const ok = await establishSecureSession(admin.username, password);
            if (ok) return true;
        }
        if (options.promptReauth) {
            const entered = window.prompt('أدخل كلمة مرورك لحفظ البيانات في السحابة:');
            if (entered) {
                const ok = await establishSecureSession(admin.username, entered);
                if (ok) {
                    try {
                        if (typeof global.setNebrasLastLoginPassword === 'function') global.setNebrasLastLoginPassword(entered);
                    } catch (e2) { /* ignore */ }
                    return true;
                }
            }
        }
        return false;
    }

    async function persistGovernanceStore(storeKey, payload, options) {
        options = options || {};
        const sessionOk = await ensureNebrasCloudSessionReady(options);
        if (!sessionOk) return { ok: false, error: 'no_session' };
        const token = getSecureToken();
        if (!token) return { ok: false, error: 'no_token' };
        try {
            const res = await fetch(apiBase() + '/api/nebras-governance-persist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + token
                },
                body: JSON.stringify({ store_key: storeKey, payload: payload }),
                keepalive: !!options.keepalive
            });
            const data = await res.json().catch(function() { return {}; });
            if (!res.ok || !data.ok) {
                return {
                    ok: false,
                    error: data.error || 'persist_failed',
                    detail: data.detail || '',
                    status: res.status
                };
            }
            return data;
        } catch (e) {
            console.warn('persistGovernanceStore failed:', storeKey, e);
            return { ok: false, error: 'network_error' };
        }
    }

    async function persistGovernanceBatch(rows, options) {
        options = options || {};
        if (!rows || !rows.length) return { ok: false, error: 'no_rows' };
        const sessionOk = await ensureNebrasCloudSessionReady(options);
        if (!sessionOk) return { ok: false, error: 'no_session' };
        const token = getSecureToken();
        if (!token) return { ok: false, error: 'no_token' };
        try {
            const res = await fetch(apiBase() + '/api/nebras-governance-persist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + token
                },
                body: JSON.stringify({ action: 'batch', rows: rows }),
                keepalive: !!options.keepalive
            });
            const data = await res.json().catch(function() { return {}; });
            if (!res.ok || !data.ok) {
                return {
                    ok: false,
                    error: data.error || 'batch_failed',
                    detail: data.detail || '',
                    status: res.status,
                    saved: data.saved || []
                };
            }
            return data;
        } catch (e) {
            console.warn('persistGovernanceBatch failed:', e);
            return { ok: false, error: 'network_error' };
        }
    }

    async function securePortalLogin(username, password) {
        try {
            const res = await fetch(apiBase() + '/api/nebras-auth?action=portal-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, password: password })
            });
            const data = await res.json();
            if (!res.ok || !data.ok || !data.user) {
                return { ok: false, error: data.error || 'login_failed' };
            }
            return data;
        } catch (e) {
            console.warn('securePortalLogin failed:', e);
            return { ok: false, error: 'network_error' };
        }
    }

    async function pullSensitiveCloudAndApply(applyFn) {
        const admin = getCurrentAdminUser();
        const keys = admin ? keysAllowedForAdmin(admin, SENSITIVE_STORE_KEYS) : SENSITIVE_STORE_KEYS.slice();
        const rows = await secureCloudPull(keys);
        if (!rows.length || typeof applyFn !== 'function') return false;
        rows.forEach(function(row) {
            if (row && row.store_key) applyFn(row.store_key, row.payload, row.updated_at || null);
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
                if (typeof saveSystemData === 'function') saveSystemData({ skipCloud: true, skipMutationMark: true });
            }
        } catch (e) { /* ignore */ }
    }

    async function submitNebrasVisitorIntake(type, data) {
        try {
            const res = await fetch(apiBase() + '/api/nebras-visitor-intake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: type, data: data })
            });
            const text = await res.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                return { ok: false, error: 'invalid_response', status: res.status };
            }
        } catch (e) {
            console.warn('submitNebrasVisitorIntake failed:', e);
            return { ok: false, error: 'network_error' };
        }
    }

    global.NEBRAS_PUBLIC_STORE_KEYS = PUBLIC_STORE_KEYS;
    global.NEBRAS_SENSITIVE_STORE_KEYS = SENSITIVE_STORE_KEYS;
    global.isSensitiveStoreKey = isSensitiveStoreKey;
    global.filterCloudRowsForAdminSession = filterCloudRowsForAdminSession;
    global.keysAllowedForNebrasAdmin = keysAllowedForAdmin;
    global.isPublicStoreKey = isPublicStoreKey;
    global.getNebrasSecureToken = getSecureToken;
    global.clearNebrasSecureSession = clearSecureSession;
    global.establishNebrasSecureSession = establishSecureSession;
    global.secureApiLogin = secureApiLogin;
    global.hasNebrasSecureSession = hasSecureSession;
    global.secureCloudPull = secureCloudPull;
    global.secureCloudPush = secureCloudPush;
    global.pullSensitiveCloudAndApply = pullSensitiveCloudAndApply;
    global.mergeApiAdminUser = mergeApiAdminUser;
    global.submitNebrasVisitorIntake = submitNebrasVisitorIntake;
    global.persistGovernanceStore = persistGovernanceStore;
    global.persistGovernanceBatch = persistGovernanceBatch;
    global.ensureNebrasCloudSessionReady = ensureNebrasCloudSessionReady;
    global.securePortalLogin = securePortalLogin;

})(typeof window !== 'undefined' ? window : globalThis);
