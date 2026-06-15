const sec = require('./lib/nebras-security');

function requireSession(req) {
    return sec.verifySession(sec.getBearerToken(req));
}

const MAX_CLOUD_PAYLOAD_BYTES = 6 * 1024 * 1024;
const PUSH_BATCH_SIZE = 8;

function chunkRows(rows, size) {
    const out = [];
    for (let i = 0; i < rows.length; i += size) {
        out.push(rows.slice(i, i + size));
    }
    return out;
}

async function handlePull(req, sess) {
    const q = String(req.query.keys || '').trim();
    let keys = q ? q.split(',').map(function(k) { return k.trim(); }).filter(Boolean) : sec.SENSITIVE_STORE_KEYS.slice();
    keys = keys.filter(function(k) { return sec.isSensitiveKey(k); });
    keys = sec.keysAllowedForSession(sess, keys);
    if (!keys.length) return { code: 403, data: { ok: false, error: 'forbidden_keys' } };
    const { url, key } = sec.supabaseServiceConfig();
    if (!url || !key) return { code: 503, data: { ok: false, error: 'service_unavailable' } };
    const rows = [];
    for (let i = 0; i < keys.length; i++) {
        const payload = await sec.fetchStoreRow(url, key, keys[i]);
        if (payload !== null && payload !== undefined) {
            rows.push({ store_key: keys[i], payload: sec.sanitizePayloadForPull(keys[i], payload) });
        }
    }
    return { code: 200, data: { ok: true, rows: rows, by: sess.username } };
}

async function handlePush(body, sess) {
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!rows.length) return { code: 400, data: { ok: false, error: 'rows_required' } };
    const safe = rows.filter(function(r) {
        return r && r.store_key && sec.isSensitiveKey(r.store_key) && r.payload !== undefined;
    });
    const allowed = sec.keysAllowedForSession(sess, safe.map(function(r) { return r.store_key; }));
    const filtered = safe.filter(function(r) { return allowed.indexOf(r.store_key) >= 0; });
    const oversized = filtered.filter(function(r) {
        try {
            return JSON.stringify(r.payload || {}).length > MAX_CLOUD_PAYLOAD_BYTES;
        } catch (e) { return true; }
    });
    if (oversized.length) {
        return { code: 413, data: { ok: false, error: 'payload_too_large', keys: oversized.map(function(r) { return r.store_key; }) } };
    }
    if (!filtered.length) return { code: 403, data: { ok: false, error: 'forbidden_keys' } };
    const { url, key } = sec.supabaseServiceConfig();
    if (!url || !key) return { code: 503, data: { ok: false, error: 'service_unavailable' } };
    let total = 0;
    const batches = chunkRows(filtered, PUSH_BATCH_SIZE);
    for (let i = 0; i < batches.length; i++) {
        const result = await sec.upsertStoreRows(url, key, batches[i]);
        if (!result || !result.ok) {
            return {
                code: 500,
                data: {
                    ok: false,
                    error: 'upsert_failed',
                    batch: i + 1,
                    batches: batches.length,
                    status: result && result.status,
                    detail: (result && (result.detail || result.error)) || ''
                }
            };
        }
        total += result.count || batches[i].length;
    }
    return { code: 200, data: { ok: true, count: total, by: sess.username } };
}

module.exports = async function handler(req, res) {
    try {
        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.statusCode = 204;
            res.end();
            return;
        }
        const sess = requireSession(req);
        if (!sess) return sec.jsonRes(res, 401, { ok: false, error: 'unauthorized' });

        const body = sec.parseBody(req);
        const action = String(req.query.action || body.action || '').toLowerCase();

        if (action === 'pull' && req.method === 'GET') {
            const result = await handlePull(req, sess);
            return sec.jsonRes(res, result.code, result.data);
        }
        if (action === 'push' && req.method === 'POST') {
            const result = await handlePush(body, sess);
            return sec.jsonRes(res, result.code, result.data);
        }
        return sec.jsonRes(res, 400, { ok: false, error: 'invalid_action' });
    } catch (err) {
        console.error('nebras-cloud error:', err);
        return sec.jsonRes(res, 500, { ok: false, error: 'server_error' });
    }
};
