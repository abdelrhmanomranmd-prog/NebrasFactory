const sec = require('./lib/nebras-security');

/** مفاتيح تُحفظ فوراً عبر API — مستخدمون · عملاء · موارد بشرية */
const GOVERNANCE_STORE_KEYS = [
    'admin_users', 'customer_portal_users', 'customer_portal_audit', 'hr_employees'
];

function requireSession(req) {
    return sec.verifySession(sec.getBearerToken(req));
}

function payloadItemCount(payload) {
    if (Array.isArray(payload)) return payload.length;
    if (payload && typeof payload === 'object') return Object.keys(payload).length;
    return payload == null ? 0 : 1;
}

async function handlePersist(body, sess) {
    const storeKey = String(body.store_key || '').trim();
    const payload = body.payload;
    if (!storeKey || payload === undefined) {
        return { code: 400, data: { ok: false, error: 'store_key_and_payload_required' } };
    }
    if (GOVERNANCE_STORE_KEYS.indexOf(storeKey) < 0) {
        return { code: 403, data: { ok: false, error: 'forbidden_store_key' } };
    }
    const allowed = sec.keysAllowedForSession(sess, [storeKey]);
    if (!allowed.length) {
        return { code: 403, data: { ok: false, error: 'forbidden_for_role' } };
    }
    let size = 0;
    try {
        size = JSON.stringify(payload).length;
    } catch (e) {
        return { code: 400, data: { ok: false, error: 'invalid_payload' } };
    }
    if (size > 6 * 1024 * 1024) {
        return { code: 413, data: { ok: false, error: 'payload_too_large' } };
    }
    const { url, key, invalidKey } = sec.supabaseServiceConfig();
    if (!url || !key) {
        return {
            code: 503,
            data: {
                ok: false,
                error: invalidKey === 'non_ascii_service_key' ? 'invalid_service_key_encoding' : 'service_unavailable',
                hint: 'SUPABASE_SERVICE_ROLE_KEY'
            }
        };
    }
    const upsert = await sec.upsertStoreRows(url, key, [{
        store_key: storeKey,
        payload: payload,
        updated_at: new Date().toISOString()
    }]);
    if (!upsert || !upsert.ok) {
        return {
            code: 500,
            data: {
                ok: false,
                error: 'upsert_failed',
                status: upsert && upsert.status,
                detail: (upsert && (upsert.detail || upsert.error)) || ''
            }
        };
    }
    const verify = await sec.fetchStoreRow(url, key, storeKey);
    const verified = !!(verify && verify.payload !== undefined && verify.payload !== null);
    const count = verified ? payloadItemCount(verify.payload) : 0;
    return {
        code: 200,
        data: {
            ok: true,
            store_key: storeKey,
            count: count,
            verified: verified,
            by: sess.username
        }
    };
}

module.exports = async function handler(req, res) {
    try {
        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.statusCode = 204;
            res.end();
            return;
        }
        if (req.method !== 'POST') {
            return sec.jsonRes(res, 405, { ok: false, error: 'method_not_allowed' });
        }
        const sess = requireSession(req);
        if (!sess) return sec.jsonRes(res, 401, { ok: false, error: 'unauthorized' });
        const body = sec.parseBody(req);
        const result = await handlePersist(body, sess);
        return sec.jsonRes(res, result.code, result.data);
    } catch (err) {
        console.error('nebras-governance-persist error:', err);
        return sec.jsonRes(res, 500, { ok: false, error: 'server_error' });
    }
};
