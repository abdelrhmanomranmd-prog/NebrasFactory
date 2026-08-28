/**
 * نبراس hrws294 — صحة السيرفر الحية (بدون بيانات حساسة)
 * GET /api/health → { ok, deploy hint, supabase, time }
 * GET /api/health?ping=1 → فحص خفيف بدون Supabase
 */
const sec = require('./lib/nebras-security');

let healthCache = null;
let healthCacheAt = 0;
const HEALTH_CACHE_MS = 45000;

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

        const isPing = String(req.query && req.query.ping || '') === '1';
        if (isPing) {
            res.setHeader('Cache-Control', 'no-store');
            return sec.jsonRes(res, 200, {
                ok: true,
                service: 'nebras-platform',
                ping: true,
                time: new Date().toISOString(),
                upgrade: 'hrws294'
            });
        }

        const now = Date.now();
        const skipCache = String(req.query && req.query.deep || '') === '1';
        if (!skipCache && healthCache && (now - healthCacheAt) < HEALTH_CACHE_MS) {
            res.setHeader('Cache-Control', 'private, max-age=15');
            return sec.jsonRes(res, healthCache.ok ? 200 : 503, Object.assign({}, healthCache, { cached: true }));
        }

        const cfg = sec.supabaseServiceConfig();
        const supabaseOk = !!(cfg.url && cfg.key && !cfg.invalidKey);
        let storeReachable = false;
        if (supabaseOk) {
            try {
                const row = await sec.fetchStoreRow(cfg.url, cfg.key, 'system_settings');
                storeReachable = !!(row && row.payload !== undefined);
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
            upgrade: 'hrws294'
        };
        healthCache = payload;
        healthCacheAt = now;
        res.setHeader('Cache-Control', 'private, max-age=15');
        return sec.jsonRes(res, payload.ok ? 200 : 503, payload);
    } catch (err) {
        console.error('nebras-health error:', err);
        return sec.jsonRes(res, 500, { ok: false, error: 'server_error' });
    }
};
