const sec = require('./lib/nebras-security');

function requireSession(req) {
    return sec.verifySession(sec.getBearerToken(req));
}

function payloadItemCount(payload) {
    if (Array.isArray(payload)) return payload.length;
    if (payload && typeof payload === 'object') return Object.keys(payload).length;
    return payload == null ? 0 : 1;
}

function isStoreKeyAllowed(storeKey, sess) {
    if (!storeKey || !sess) return false;
    const hq = sec.isHqSession(sess);
    if (sec.isSensitiveKey(storeKey)) {
        return sec.keysAllowedForSession(sess, [storeKey]).length > 0;
    }
    if (hq && sec.isPublicKey(storeKey)) return true;
    return false;
}

async function persistOne(storeKey, payload, sess) {
    if (!isStoreKeyAllowed(storeKey, sess)) {
        return { ok: false, error: 'forbidden_for_role', store_key: storeKey };
    }
    let size = 0;
    try {
        size = JSON.stringify(payload).length;
    } catch (e) {
        return { ok: false, error: 'invalid_payload', store_key: storeKey };
    }
    if (size > 6 * 1024 * 1024) {
        return { ok: false, error: 'payload_too_large', store_key: storeKey };
    }
    const { url, key, invalidKey } = sec.supabaseServiceConfig();
    if (!url || !key) {
        return {
            ok: false,
            error: invalidKey === 'non_ascii_service_key' ? 'invalid_service_key_encoding' : 'service_unavailable',
            hint: 'SUPABASE_SERVICE_ROLE_KEY',
            store_key: storeKey
        };
    }
    const upsert = await sec.upsertStoreRows(url, key, [{
        store_key: storeKey,
        payload: payload,
        updated_at: new Date().toISOString()
    }]);
    if (!upsert || !upsert.ok) {
        return {
            ok: false,
            error: 'upsert_failed',
            store_key: storeKey,
            status: upsert && upsert.status,
            detail: (upsert && (upsert.detail || upsert.error)) || ''
        };
    }
    const verify = await sec.fetchStoreRow(url, key, storeKey);
    const verified = !!(verify && verify.payload !== undefined && verify.payload !== null);
    return {
        ok: true,
        store_key: storeKey,
        count: verified ? payloadItemCount(verify.payload) : 0,
        verified: verified
    };
}

async function handlePersist(body, sess) {
    const storeKey = String(body.store_key || '').trim();
    const payload = body.payload;
    if (!storeKey || payload === undefined) {
        return { code: 400, data: { ok: false, error: 'store_key_and_payload_required' } };
    }
    const result = await persistOne(storeKey, payload, sess);
    if (!result.ok) {
        const code = result.error === 'forbidden_for_role' ? 403 : (result.error === 'service_unavailable' ? 503 : 500);
        return { code: code, data: result };
    }
    return { code: 200, data: Object.assign({ ok: true, by: sess.username }, result) };
}

async function handleBatch(body, sess) {
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!rows.length) return { code: 400, data: { ok: false, error: 'rows_required' } };
    let total = 0;
    const saved = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row.store_key || row.payload === undefined) continue;
        const result = await persistOne(row.store_key, row.payload, sess);
        if (!result.ok) {
            return {
                code: result.error === 'forbidden_for_role' ? 403 : 500,
                data: Object.assign({ ok: false, batch_index: i, saved: saved }, result)
            };
        }
        total += 1;
        saved.push(row.store_key);
    }
    return { code: 200, data: { ok: true, count: total, keys: saved, by: sess.username } };
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
        const action = String(body.action || req.query.action || 'persist').toLowerCase();
        const result = action === 'batch' ? await handleBatch(body, sess) : await handlePersist(body, sess);
        return sec.jsonRes(res, result.code, result.data);
    } catch (err) {
        console.error('nebras-governance-persist error:', err);
        return sec.jsonRes(res, 500, { ok: false, error: 'server_error' });
    }
};
