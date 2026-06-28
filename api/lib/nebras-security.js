const crypto = require('crypto');

const SUPABASE_FALLBACK_URL = 'https://oedldllrjavofpeaputz.supabase.co';
const NEBRAS_PW_HASH_PREFIX = 'nbh1:';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const FALLBACK_HQ_USERS = [
    {
        id: 'nebras-factory-admin',
        username: 'NEBRASFACTORY',
        password: 'NEBRASFACTORYCOMPANYBASIC',
        role: 'superadmin',
        isPrimary: true,
        isActive: true
    }
];

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

function apiSecret() {
    const secret = process.env.NEBRAS_API_SECRET || process.env.OTP_SECRET;
    if (secret) return String(secret);
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        throw new Error('NEBRAS_API_SECRET is required in production');
    }
    return 'nebras-dev-local-only';
}

function supabaseServiceConfig() {
    const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_FALLBACK_URL).replace(/\/$/, '');
    const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SECRET_KEY ||
        process.env.SUPABASE_SERVICE_KEY ||
        '';
    const keyStr = String(key).trim();
    if (keyStr && !/^[\x20-\x7E]+$/.test(keyStr)) {
        return { url, key: '', invalidKey: 'non_ascii_service_key' };
    }
    return { url, key: keyStr };
}

function supabaseHeaders(key) {
    return {
        apikey: key,
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
    };
}

function hashNebrasPasswordSync(pw) {
    let h1 = 5381;
    let h2 = 0;
    const s = String(pw) + '|NEBRAS_FACTORY_SALT_v1';
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        h1 = ((h1 << 5) + h1 + c) >>> 0;
        h2 = (h2 * 31 + c) >>> 0;
    }
    return NEBRAS_PW_HASH_PREFIX + h1.toString(16) + h2.toString(16);
}

function verifyNebrasPassword(stored, input) {
    const s = String(stored || '');
    const p = String(input || '');
    if (!s || !p) return false;
    if (s.indexOf(NEBRAS_PW_HASH_PREFIX) === 0) return hashNebrasPasswordSync(p) === s;
    return s === p;
}

function signSession(payload) {
    const body = JSON.stringify(payload);
    const sig = crypto.createHmac('sha256', apiSecret()).update(body).digest('hex');
    return Buffer.from(JSON.stringify({ p: payload, s: sig })).toString('base64url');
}

function verifySession(token) {
    if (!token) return null;
    try {
        const raw = JSON.parse(Buffer.from(String(token), 'base64url').toString('utf8'));
        if (!raw || !raw.p || !raw.s) return null;
        const expected = crypto.createHmac('sha256', apiSecret()).update(JSON.stringify(raw.p)).digest('hex');
        if (expected !== raw.s) return null;
        if (Date.now() > Number(raw.p.exp || 0)) return null;
        return raw.p;
    } catch (e) {
        return null;
    }
}

function sanitizeAdminUser(user) {
    if (!user) return null;
    const safe = Object.assign({}, user);
    delete safe.password;
    return safe;
}

function sanitizePortalUser(user) {
    if (!user) return null;
    const safe = Object.assign({}, user);
    delete safe.password;
    return safe;
}

async function loadCustomerPortalUsers() {
    try {
        const { url, key } = supabaseServiceConfig();
        if (!url || !key) return [];
        const row = await fetchStoreRow(url, key, 'customer_portal_users');
        const payload = row && row.payload !== undefined ? row.payload : null;
        return Array.isArray(payload) ? payload : [];
    } catch (err) {
        console.error('loadCustomerPortalUsers error:', err);
        return [];
    }
}

function sanitizePayloadForPull(storeKey, payload, sess) {
    if (storeKey === 'admin_users' && Array.isArray(payload)) {
        return payload.map(sanitizeAdminUser);
    }
    if (!sess || isHqSession(sess)) return payload;
    return filterPayloadForBranchSession(storeKey, payload, sess);
}

function normalizeBranchMatchText(v) {
    return String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function entryMatchesBranchSession(entry, sess) {
    if (!entry || typeof entry !== 'object') return false;
    const bid = sess.assignedBranchId != null ? Number(sess.assignedBranchId) : null;
    const city = normalizeBranchMatchText(sess.assignedBranchCity);
    if (entry.branchId != null && bid != null && Number(entry.branchId) === bid) return true;
    const fields = [
        entry.city, entry.branchCity, entry.assignedBranchCity, entry.branch,
        entry.fromWarehouse, entry.toWarehouse, entry.warehouse
    ];
    for (let i = 0; i < fields.length; i++) {
        const f = normalizeBranchMatchText(fields[i]);
        if (!f || !city) continue;
        if (f === city || f.indexOf(city) >= 0 || city.indexOf(f) >= 0) return true;
    }
    if (String(sess.role || '') === 'sales_rep') {
        if (entry.assignedRepId && sess.sub && String(entry.assignedRepId) === String(sess.sub)) return true;
        if (entry.assignedRepUsername && sess.username &&
            normalizeBranchMatchText(entry.assignedRepUsername) === normalizeBranchMatchText(sess.username)) return true;
        if (entry.createdBy && sess.username &&
            normalizeBranchMatchText(entry.createdBy) === normalizeBranchMatchText(sess.username)) return true;
    }
    return false;
}

const BRANCH_FILTER_STORE_PREFIXES = ['erp_', 'hr_', 'sales_', 'crm_', 'customer_', 'legal_', 'quote_'];
const BRANCH_FILTER_STORE_EXACT = [
    'complaints', 'callback_leads', 'sales_quotes_inbox', 'quote_registry',
    'customer_order_journeys', 'customer_service', 'customer_portal_users', 'customer_portal_audit',
    'procurement_custom_depts', 'sales_data', 'sales_price_list'
];

function storeKeyIsBranchFilterable(storeKey) {
    if (!storeKey) return false;
    if (BRANCH_FILTER_STORE_EXACT.indexOf(storeKey) >= 0) return true;
    return BRANCH_FILTER_STORE_PREFIXES.some(function(p) { return storeKey.indexOf(p) === 0; });
}

function filterPayloadForBranchSession(storeKey, payload, sess) {
    if (!sess || isHqSession(sess)) return payload;
    if (!storeKeyIsBranchFilterable(storeKey)) return payload;
    if (!Array.isArray(payload)) return payload;
    const role = String(sess.role || '');
    const hasBranch = sess.assignedBranchId != null || normalizeBranchMatchText(sess.assignedBranchCity);
    if (!hasBranch && role !== 'sales_rep') return payload;
    if (role === 'sales_rep' && storeKey === 'customer_portal_users') {
        return payload.filter(function(item) { return entryMatchesBranchSession(item, sess); });
    }
    const branchRoles = ['sales_manager', 'branch_manager', 'accountant', 'accounting_manager'];
    if (branchRoles.indexOf(role) >= 0 || hasBranch) {
        return payload.filter(function(item) { return entryMatchesBranchSession(item, sess); });
    }
    return payload;
}

function mergeBranchScopedStorePayload(storeKey, incoming, serverPayload, sess) {
    if (!sess || isHqSession(sess) || !Array.isArray(incoming)) return incoming;
    if (!storeKeyIsBranchFilterable(storeKey)) return incoming;
    const server = Array.isArray(serverPayload) ? serverPayload.slice() : [];
    const incomingScoped = incoming.filter(function(item) { return entryMatchesBranchSession(item, sess); });
    if (!incomingScoped.length && incoming.length) {
        return null;
    }
    const outOfScope = incoming.filter(function(item) { return !entryMatchesBranchSession(item, sess); });
    if (outOfScope.length) {
        console.warn('mergeBranchScopedStorePayload: rejected out-of-scope rows for', storeKey, outOfScope.length);
    }
    const idKey = function(item) {
        if (!item || typeof item !== 'object') return '';
        return String(item.id || item.employeeId || item.quoteNo || item.sku || item.username || '');
    };
    const scopedIds = {};
    incomingScoped.forEach(function(item) {
        const k = idKey(item);
        if (k) scopedIds[k] = true;
    });
    const kept = server.filter(function(item) {
        if (!entryMatchesBranchSession(item, sess)) return true;
        const k = idKey(item);
        return k && !scopedIds[k];
    });
    return kept.concat(incomingScoped);
}

async function fetchStoreRowsForKeys(url, key, keys, since) {
    if (!url || !key || !Array.isArray(keys) || !keys.length) return [];
    try {
        const inList = keys.map(function(k) { return encodeURIComponent(String(k)); }).join(',');
        let apiUrl = url + '/rest/v1/nebras_data_store?select=store_key,payload,updated_at&store_key=in.(' + inList + ')';
        if (since) apiUrl += '&updated_at=gt.' + encodeURIComponent(since);
        const res = await fetch(apiUrl, { headers: supabaseHeaders(key) });
        if (!res.ok) {
            const errText = await res.text().catch(function() { return ''; });
            console.error('fetchStoreRowsForKeys failed:', res.status, errText.slice(0, 200));
            return [];
        }
        const rows = await res.json();
        if (!Array.isArray(rows)) return [];
        return rows.map(function(r) {
            return {
                store_key: r.store_key,
                payload: r.payload,
                updated_at: r.updated_at || null
            };
        });
    } catch (err) {
        console.error('fetchStoreRowsForKeys error:', err);
        return [];
    }
}

async function fetchStoreRow(url, key, storeKey) {
    try {
        const res = await fetch(
            url + '/rest/v1/nebras_data_store?store_key=eq.' + encodeURIComponent(storeKey) + '&select=payload,updated_at',
            { headers: supabaseHeaders(key) }
        );
        if (!res.ok) {
            const errText = await res.text().catch(function() { return ''; });
            console.error('fetchStoreRow failed:', storeKey, res.status, errText.slice(0, 200));
            return null;
        }
        const rows = await res.json();
        if (!rows || !rows[0]) return null;
        return { payload: rows[0].payload, updated_at: rows[0].updated_at || null };
    } catch (err) {
        console.error('fetchStoreRow error:', storeKey, err);
        return null;
    }
}

async function upsertStoreRows(url, key, rows) {
    if (!url || !key || !rows || !rows.length) return { ok: false, error: 'rows_required' };
    try {
        const body = rows.map(function(r) {
            return {
                store_key: r.store_key,
                payload: r.payload,
                updated_at: new Date().toISOString()
            };
        });
        const res = await fetch(
            url + '/rest/v1/nebras_data_store?on_conflict=store_key',
            {
                method: 'POST',
                headers: Object.assign({}, supabaseHeaders(key), {
                    Prefer: 'resolution=merge-duplicates,return=minimal'
                }),
                body: JSON.stringify(body)
            }
        );
        if (!res.ok) {
            const errText = await res.text().catch(function() { return ''; });
            console.error('upsertStoreRows failed:', res.status, errText.slice(0, 500));
            return { ok: false, status: res.status, detail: errText.slice(0, 300) };
        }
        return { ok: true, count: rows.length };
    } catch (err) {
        console.error('upsertStoreRows error:', err);
        return { ok: false, error: String(err && err.message || err) };
    }
}

async function loadAdminUsers() {
    try {
        const { url, key } = supabaseServiceConfig();
        if (!url || !key) return FALLBACK_HQ_USERS.slice();
        const row = await fetchStoreRow(url, key, 'admin_users');
        const payload = row && row.payload !== undefined ? row.payload : null;
        const users = Array.isArray(payload) ? payload : [];
        return users.length ? users : FALLBACK_HQ_USERS.slice();
    } catch (err) {
        console.error('loadAdminUsers error:', err);
        return FALLBACK_HQ_USERS.slice();
    }
}

function parseBody(req) {
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    return body && typeof body === 'object' ? body : {};
}

function getBearerToken(req) {
    const h = String(req.headers.authorization || req.headers.Authorization || '');
    if (h.toLowerCase().indexOf('bearer ') === 0) return h.slice(7).trim();
    return '';
}

function jsonRes(res, code, obj) {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
}

function isHqSession(sess) {
    if (!sess) return false;
    return !!sess.isPrimary && String(sess.username || '').toUpperCase() === 'NEBRASFACTORY';
}

const MANAGER_ALLOWED_PREFIXES = ['erp_', 'sales_', 'quote_', 'customer_', 'crm_', 'hr_', 'legal_', 'procurement', 'complaints', 'callback_', 'audit_'];
const MANAGER_ALLOWED_EXACT = [
    'complaints', 'callback_leads', 'audit_logs', 'sales_quotes_inbox', 'quote_registry',
    'customer_order_journeys', 'customer_service', 'customer_portal_users', 'customer_portal_audit',
    'procurement_custom_depts', 'branches', 'site_products', 'site_custom_sections', 'about_pages',
    'site_partners', 'site_certifications', 'showroom_gallery', 'visitor_analytics',
    'sales_data', 'sales_price_list', 'nebras_cloud_snapshots'
];

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

function normalizeBranchCity(v) {
    return String(v || '').trim().toLowerCase();
}

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

function mergeBranchTeamAdminUsers(sess, incoming, current) {
    const role = String(sess.role || '');
    if (role !== 'sales_manager' && role !== 'branch_manager') return null;
    const branch = normalizeBranchCity(sess.assignedBranchCity);
    if (!branch) return null;
    const currentArr = Array.isArray(current) ? current : [];
    const incomingArr = Array.isArray(incoming) ? incoming : [];

    for (let i = 0; i < currentArr.length; i++) {
        const cur = currentArr[i];
        if (!cur) continue;
        const inc = incomingArr.find(function(x) { return x && String(x.id) === String(cur.id); });
        if (!inc) {
            if (cur.role === 'sales_rep' && normalizeBranchCity(cur.assignedBranchCity) === branch) continue;
            return null;
        }
        if (cur.role !== 'sales_rep') {
            if (String(cur.role || '') !== String(inc.role || '') || String(cur.username || '').toUpperCase() !== String(inc.username || '').toUpperCase()) {
                return null;
            }
        } else if (normalizeBranchCity(cur.assignedBranchCity) !== branch) {
            if (normalizeBranchCity(inc.assignedBranchCity) !== normalizeBranchCity(cur.assignedBranchCity)) return null;
            if (String(cur.role || '') !== String(inc.role || '')) return null;
        }
    }
    for (let j = 0; j < incomingArr.length; j++) {
        const inc = incomingArr[j];
        if (!inc) continue;
        if (inc.role === 'sales_rep' && normalizeBranchCity(inc.assignedBranchCity) !== branch) return null;
        if (inc.role !== 'sales_rep' && !currentArr.find(function(c) { return c && String(c.id) === String(inc.id); })) return null;
    }

    const ourReps = incomingArr.filter(function(u) {
        return u && u.role === 'sales_rep' && normalizeBranchCity(u.assignedBranchCity) === branch;
    });
    return currentArr.filter(function(u) {
        if (!u) return false;
        if (u.role === 'sales_rep' && normalizeBranchCity(u.assignedBranchCity) === branch) return false;
        return true;
    }).concat(ourReps);
}

function managerMayAccessKey(k) {
    if (MANAGER_ALLOWED_EXACT.indexOf(k) >= 0) return true;
    return MANAGER_ALLOWED_PREFIXES.some(function(p) { return k.indexOf(p) === 0; });
}

const HQ_ONLY_STORE_KEYS = [
    'admin_users', 'admin_recovery_otp', 'analytics_governance', 'nebras_platform_integrity'
];

async function validateActiveSession(sess) {
    if (!sess || !sess.sub) return { ok: false, error: 'invalid_session' };
    const users = await loadAdminUsers();
    const user = users.find(function(u) {
        return String(u.id) === String(sess.sub);
    });
    if (!user || user.isActive === false) return { ok: false, error: 'user_inactive' };
    return { ok: true, user: user };
}

function keysAllowedForSession(sess, keys) {
    if (!sess || !Array.isArray(keys)) return [];
    if (isHqSession(sess)) return keys.slice();
    if (Array.isArray(sess.permissions) && sess.permissions.length) {
        return keysAllowedByCustomPermissions(sess.permissions, keys);
    }
    const role = String(sess.role || '');
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
            if (Array.isArray(sess.permissions) && sess.permissions.indexOf('hr') >= 0) {
                if (k.indexOf('hr_') === 0 || k === 'audit_logs') return true;
            }
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

module.exports = {
    FALLBACK_HQ_USERS,
    PUBLIC_STORE_KEYS,
    SENSITIVE_STORE_KEYS,
    SESSION_TTL_MS,
    supabaseServiceConfig,
    supabaseHeaders,
    verifyNebrasPassword,
    hashNebrasPasswordSync,
    signSession,
    verifySession,
    sanitizeAdminUser,
    sanitizePortalUser,
    sanitizePayloadForPull,
    fetchStoreRow,
    fetchStoreRowsForKeys,
    upsertStoreRows,
    loadAdminUsers,
    loadCustomerPortalUsers,
    parseBody,
    getBearerToken,
    jsonRes,
    isSensitiveKey: function(k) { return SENSITIVE_STORE_KEYS.indexOf(k) >= 0; },
    isPublicKey: function(k) { return PUBLIC_STORE_KEYS.indexOf(k) >= 0; },
    isHqSession: isHqSession,
    keysAllowedForSession: keysAllowedForSession,
    keysAllowedByCustomPermissions: keysAllowedByCustomPermissions,
    validateActiveSession: validateActiveSession,
    mergeBranchTeamAdminUsers: mergeBranchTeamAdminUsers,
    storeKeyIsBranchFilterable: storeKeyIsBranchFilterable,
    filterPayloadForBranchSession: filterPayloadForBranchSession,
    mergeBranchScopedStorePayload: mergeBranchScopedStorePayload,
    entryMatchesBranchSession: entryMatchesBranchSession,
    HQ_ONLY_STORE_KEYS: HQ_ONLY_STORE_KEYS
};
