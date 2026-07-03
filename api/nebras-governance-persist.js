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
    if (sec.isSensitiveKey(storeKey)) {
        return sec.keysAllowedForSession(sess, [storeKey]).length > 0;
    }
    if (sec.isPublicKey(storeKey)) {
        return sec.keysAllowedForSession(sess, [storeKey]).length > 0;
    }
    return false;
}

async function persistOne(storeKey, payload, sess) {
    if (!isStoreKeyAllowed(storeKey, sess)) {
        return { ok: false, error: 'forbidden_for_role', store_key: storeKey };
    }
    let finalPayload = payload;
    if (storeKey === 'admin_users' && !sec.isHqSession(sess)) {
        const currentUsers = await sec.loadAdminUsers();
        const merged = sec.mergeBranchTeamAdminUsers(sess, payload, currentUsers);
        if (!merged) {
            return { ok: false, error: 'forbidden_for_role', store_key: storeKey };
        }
        finalPayload = merged;
    } else if (!sec.isHqSession(sess) && sec.storeKeyIsBranchFilterable(storeKey) && Array.isArray(payload)) {
        const cfg = sec.supabaseServiceConfig();
        if (cfg.url && cfg.key) {
            const serverRow = await sec.fetchStoreRow(cfg.url, cfg.key, storeKey);
            const serverPayload = serverRow && Array.isArray(serverRow.payload) ? serverRow.payload : [];
            const merged = sec.mergeBranchScopedStorePayload(storeKey, payload, serverPayload, sess);
            if (merged === null) {
                return { ok: false, error: 'forbidden_branch_scope', store_key: storeKey };
            }
            finalPayload = merged;
        }
    }
    let size = 0;
    try {
        size = JSON.stringify(finalPayload).length;
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
        payload: finalPayload,
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
    const cfg = sec.supabaseServiceConfig();
    if (!cfg.url || !cfg.key) {
        return {
            code: 503,
            data: {
                ok: false,
                error: cfg.invalidKey === 'non_ascii_service_key' ? 'invalid_service_key_encoding' : 'service_unavailable',
                hint: 'SUPABASE_SERVICE_ROLE_KEY'
            }
        };
    }
    const prepared = [];
    const skipped = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row.store_key || row.payload === undefined) continue;
        const storeKey = String(row.store_key).trim();
        if (!isStoreKeyAllowed(storeKey, sess)) {
            skipped.push({ store_key: storeKey, reason: 'forbidden_for_role' });
            continue;
        }
        let finalPayload = row.payload;
        try {
            if (storeKey === 'admin_users' && !sec.isHqSession(sess)) {
                const currentUsers = await sec.loadAdminUsers();
                const merged = sec.mergeBranchTeamAdminUsers(sess, finalPayload, currentUsers);
                if (!merged) { skipped.push({ store_key: storeKey, reason: 'forbidden_branch_scope' }); continue; }
                finalPayload = merged;
            } else if (!sec.isHqSession(sess) && sec.storeKeyIsBranchFilterable(storeKey) && Array.isArray(finalPayload)) {
                const serverRow = await sec.fetchStoreRow(cfg.url, cfg.key, storeKey);
                const serverPayload = serverRow && Array.isArray(serverRow.payload) ? serverRow.payload : [];
                const merged = sec.mergeBranchScopedStorePayload(storeKey, finalPayload, serverPayload, sess);
                if (merged === null) { skipped.push({ store_key: storeKey, reason: 'forbidden_branch_scope' }); continue; }
                finalPayload = merged;
            }
        } catch (mergeErr) {
            skipped.push({ store_key: storeKey, reason: 'merge_error' });
            continue;
        }
        let size = 0;
        try { size = JSON.stringify(finalPayload).length; } catch (e) {
            skipped.push({ store_key: storeKey, reason: 'invalid_payload' });
            continue;
        }
        if (size > 6 * 1024 * 1024) {
            skipped.push({ store_key: storeKey, reason: 'payload_too_large' });
            continue;
        }
        prepared.push({ store_key: storeKey, payload: finalPayload, updated_at: new Date().toISOString() });
    }
    if (!prepared.length) {
        return { code: 200, data: { ok: true, count: 0, keys: [], skipped: skipped, by: sess.username } };
    }
    const CHUNK = 20;
    const savedKeys = [];
    for (let i = 0; i < prepared.length; i += CHUNK) {
        const chunk = prepared.slice(i, i + CHUNK);
        const upsert = await sec.upsertStoreRows(cfg.url, cfg.key, chunk);
        if (!upsert || !upsert.ok) {
            return {
                code: 500,
                data: {
                    ok: false,
                    error: 'upsert_failed',
                    saved: savedKeys,
                    skipped: skipped,
                    status: upsert && upsert.status,
                    detail: (upsert && (upsert.detail || upsert.error)) || ''
                }
            };
        }
        chunk.forEach(function(r) { savedKeys.push(r.store_key); });
    }
    return {
        code: 200,
        data: {
            ok: true,
            count: savedKeys.length,
            keys: savedKeys,
            skipped: skipped,
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
        const live = await sec.validateActiveSession(sess);
        if (!live.ok) return sec.jsonRes(res, 401, { ok: false, error: live.error || 'invalid_session' });
        const body = sec.parseBody(req);
        const action = String(body.action || req.query.action || 'persist').toLowerCase();
        const result = action === 'batch' ? await handleBatch(body, sess) : await handlePersist(body, sess);
        return sec.jsonRes(res, result.code, result.data);
    } catch (err) {
        console.error('nebras-governance-persist error:', err);
        return sec.jsonRes(res, 500, { ok: false, error: 'server_error' });
    }
};
