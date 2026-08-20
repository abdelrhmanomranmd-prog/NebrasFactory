/**
 * نبراس hrws227 — صحة السيرفر الحية (بدون بيانات حساسة)
 * GET /api/health → { ok, deploy hint, supabase, time }
 */
const sec = require('./lib/nebras-security');

module.exports = async function handler(req, res) {
    try {
        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.statusCode = 204;
            res.end();
            return;
        }
        if (req.method !== 'GET') {
            return sec.jsonRes(res, 405, { ok: false, error: 'method_not_allowed' });
        }

        const cfg = sec.supabaseServiceConfig();
        const supabaseOk = !!(cfg.url && cfg.key && !cfg.invalidKey);
        let storeReachable = false;
        let storeKeysSample = 0;
        if (supabaseOk) {
            try {
                const row = await sec.fetchStoreRow(cfg.url, cfg.key, 'system_settings');
                storeReachable = !!(row && row.payload !== undefined);
                if (storeReachable) storeKeysSample = 1;
            } catch (e) {
                storeReachable = false;
            }
        }

        const payload = {
            ok: supabaseOk && storeReachable,
            service: 'nebras-platform',
            time: new Date().toISOString(),
            supabase: {
                configured: supabaseOk,
                reachable: storeReachable,
                invalidKey: cfg.invalidKey || null
            },
            capacity: {
                maxPayloadBytes: 6 * 1024 * 1024,
                mediaFileLimitBytes: 50 * 1024 * 1024,
                sessionTtlMs: sec.SESSION_TTL_MS,
                sensitiveKeyCount: Array.isArray(sec.SENSITIVE_STORE_KEYS) ? sec.SENSITIVE_STORE_KEYS.length : 0
            },
            upgrade: 'hrws227'
        };
        return sec.jsonRes(res, payload.ok ? 200 : 503, payload);
    } catch (err) {
        console.error('nebras-health error:', err);
        return sec.jsonRes(res, 500, { ok: false, error: 'server_error' });
    }
};
