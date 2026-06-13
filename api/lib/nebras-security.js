const crypto = require('crypto');

const SUPABASE_FALLBACK_URL = 'https://oedldllrjavofpeaputz.supabase.co';
const NEBRAS_PW_HASH_PREFIX = 'nbh1:';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

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
    'hr_gps_consents', 'hr_travel', 'hr_deductions',
    'legal_contracts', 'legal_cases', 'legal_compliance', 'legal_policies',
    'legal_correspondence', 'legal_activity',
    'crm_customers', 'crm_opportunities', 'crm_activities', 'crm_audit',
    'nebras_cloud_snapshots', 'nebras_platform_integrity'
];

function apiSecret() {
    return (
        process.env.NEBRAS_API_SECRET ||
        process.env.OTP_SECRET ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        'nebras-api-fallback-change-me'
    );
}

function supabaseServiceConfig() {
    const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_FALLBACK_URL).replace(/\/$/, '');
    const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SECRET_KEY ||
        process.env.SUPABASE_SERVICE_KEY ||
        '';
    return { url, key: String(key).trim() };
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

async function fetchStoreRow(url, key, storeKey) {
    const res = await fetch(
        url + '/rest/v1/nebras_data_store?store_key=eq.' + encodeURIComponent(storeKey) + '&select=payload',
        { headers: supabaseHeaders(key) }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows || !rows[0]) return null;
    return rows[0].payload;
}

async function upsertStoreRows(url, key, rows) {
    const body = rows.map(function(r) {
        return {
            store_key: r.store_key,
            payload: r.payload,
            updated_at: new Date().toISOString()
        };
    });
    const res = await fetch(url + '/rest/v1/nebras_data_store', {
        method: 'POST',
        headers: Object.assign({}, supabaseHeaders(key), { Prefer: 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify(body)
    });
    return res.ok;
}

async function loadAdminUsers() {
    const { url, key } = supabaseServiceConfig();
    if (!url || !key) return [];
    const payload = await fetchStoreRow(url, key, 'admin_users');
    return Array.isArray(payload) ? payload : [];
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

module.exports = {
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
    fetchStoreRow,
    upsertStoreRows,
    loadAdminUsers,
    parseBody,
    getBearerToken,
    jsonRes,
    isSensitiveKey: function(k) { return SENSITIVE_STORE_KEYS.indexOf(k) >= 0; },
    isPublicKey: function(k) { return PUBLIC_STORE_KEYS.indexOf(k) >= 0; }
};
