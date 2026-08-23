/**
 * نبراس hrws268 — فحص حي خفيف (<100ms) بدون استعلام Supabase
 * GET /api/ping
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
        res.setHeader('Cache-Control', 'no-store');
        return sec.jsonRes(res, 200, {
            ok: true,
            service: 'nebras-platform',
            ping: true,
            time: new Date().toISOString(),
            upgrade: 'hrws268'
        });
    } catch (err) {
        console.error('nebras-ping error:', err);
        return sec.jsonRes(res, 500, { ok: false, error: 'server_error' });
    }
};
