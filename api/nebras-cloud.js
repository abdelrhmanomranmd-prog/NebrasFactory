const sec = require('./lib/nebras-security');

function requireSession(req) {
    return sec.verifySession(sec.getBearerToken(req));
}

const MAX_CLOUD_PAYLOAD_BYTES = 6 * 1024 * 1024;
const PUSH_BATCH_SIZE = 20;

function chunkRows(rows, size) {
    const out = [];
    for (let i = 0; i < rows.length; i += size) {
        out.push(rows.slice(i, i + size));
    }
    return out;
}

async function handlePull(req, sess) {
    const q = String(req.query.keys || '').trim();
    const since = String(req.query.since || '').trim();
    let keys = q ? q.split(',').map(function(k) { return k.trim(); }).filter(Boolean) : sec.SENSITIVE_STORE_KEYS.slice();
    /* HQ يسحب الحساس + العام عبر API — سابقاً العام كان يُرفض فيسبب «حفظ بدون قراءة» */
    keys = keys.filter(function(k) {
        return sec.isSensitiveKey(k) || sec.isPublicKey(k);
    });
    keys = sec.keysAllowedForSession(sess, keys);
    if (!keys.length) return { code: 403, data: { ok: false, error: 'forbidden_keys' } };
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
    const byKey = await sec.fetchStoreRows(url, key, keys, since || '');
    const rows = [];
    keys.forEach(function(storeKey) {
        const row = byKey[storeKey];
        if (!row || row.payload === null || row.payload === undefined) return;
        rows.push({
            store_key: storeKey,
            payload: sec.sanitizePayloadForPull(storeKey, row.payload, sess),
            updated_at: row.updated_at || null
        });
    });
    return { code: 200, data: { ok: true, rows: rows, by: sess.username, batched: true } };
}

async function handlePush(body, sess) {
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!rows.length) return { code: 400, data: { ok: false, error: 'rows_required' } };
    const hq = sec.isHqSession(sess);
    const safe = rows.filter(function(r) {
        if (!r || !r.store_key || r.payload === undefined) return false;
        if (sec.isSensitiveKey(r.store_key)) return true;
        if (sec.PUBLIC_STORE_KEYS.indexOf(r.store_key) >= 0) return true;
        return false;
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
    if (!filtered.length) return { code: 200, data: { ok: true, count: 0, by: sess.username, note: 'no_allowed_keys' } };
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
    /* حماية كلمات مرور المستخدمين — لا تُفرَّغ عبر مسار push */
    const prepared = [];
    for (let i = 0; i < filtered.length; i++) {
        const row = filtered[i];
        let payload = row.payload;
        if (row.store_key === 'admin_users') {
            try {
                const currentUsers = await sec.loadAdminUsersRaw();
                if (!hq) {
                    const merged = sec.mergeBranchTeamAdminUsers(sess, payload, currentUsers);
                    if (!merged) continue;
                    payload = merged;
                }
                payload = sec.mergeAdminUsersForPush(payload, currentUsers, {
                    replaceAll: !!(row.replaceAll || body.replaceAdminUsers)
                });
                if (Array.isArray(payload)) {
                    payload = payload.map(function(u) {
                        if (!u || String(u.username || '').toUpperCase() !== 'NEBRASFACTORY') return u;
                        if (u.password && String(u.password).trim()) return u;
                        return Object.assign({}, u, {
                            password: sec.hashNebrasPasswordSync('NEBRASFACTORYCOMPANYBASIC'),
                            isPrimary: true,
                            role: 'superadmin',
                            isActive: true
                        });
                    });
                }
            } catch (mergeErr) {
                console.warn('nebras-cloud admin_users merge:', mergeErr);
                continue;
            }
        }
        prepared.push({
            store_key: row.store_key,
            payload: payload,
            updated_at: row.updated_at || new Date().toISOString()
        });
    }
    if (!prepared.length) {
        return { code: 200, data: { ok: true, count: 0, by: sess.username, note: 'no_prepared_rows' } };
    }
    let total = 0;
    const batches = chunkRows(prepared, PUSH_BATCH_SIZE);
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
