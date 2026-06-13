const sec = require('./lib/nebras-security');

function requireSession(req) {
    return sec.verifySession(sec.getBearerToken(req));
}

async function handlePull(req, sess) {
    const q = String(req.query.keys || '').trim();
    let keys = q ? q.split(',').map(function(k) { return k.trim(); }).filter(Boolean) : sec.SENSITIVE_STORE_KEYS.slice();
    keys = keys.filter(function(k) { return sec.isSensitiveKey(k); });
    const { url, key } = sec.supabaseServiceConfig();
    if (!url || !key) return { code: 503, data: { ok: false, error: 'service_unavailable' } };
    const rows = [];
    for (let i = 0; i < keys.length; i++) {
        const payload = await sec.fetchStoreRow(url, key, keys[i]);
        if (payload !== null && payload !== undefined) {
            rows.push({ store_key: keys[i], payload: payload });
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
    if (!safe.length) return { code: 400, data: { ok: false, error: 'no_sensitive_rows' } };
    const { url, key } = sec.supabaseServiceConfig();
    if (!url || !key) return { code: 503, data: { ok: false, error: 'service_unavailable' } };
    const ok = await sec.upsertStoreRows(url, key, safe);
    return ok
        ? { code: 200, data: { ok: true, count: safe.length, by: sess.username } }
        : { code: 500, data: { ok: false, error: 'upsert_failed' } };
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
