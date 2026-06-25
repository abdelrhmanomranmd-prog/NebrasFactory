const sec = require('./lib/nebras-security');
const rate = require('./lib/nebras-rate-limit');

async function handleLogin(body) {
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();
    if (!username || !password) {
        return { code: 400, data: { ok: false, error: 'credentials_required' } };
    }
    const { url, key } = sec.supabaseServiceConfig();
    if (!url || !key) {
        return { code: 503, data: { ok: false, error: 'service_unavailable' } };
    }
    const users = await sec.loadAdminUsers();
    const unUpper = username.toUpperCase();
    let user = users.find(function(u) {
        return String(u.username || '').toUpperCase() === unUpper && u.isActive !== false;
    });
    let authed = user && sec.verifyNebrasPassword(user.password, password);
    if (!authed) {
        user = sec.FALLBACK_HQ_USERS.find(function(u) {
            return String(u.username || '').toUpperCase() === unUpper && u.isActive !== false;
        });
        authed = user && sec.verifyNebrasPassword(user.password, password);
    }
    if (!authed) {
        return { code: 401, data: { ok: false, error: 'invalid_credentials' } };
    }
    const exp = Date.now() + sec.SESSION_TTL_MS;
    let session;
    try {
        session = sec.signSession({
            sub: user.id,
            username: user.username,
            role: user.role,
            isPrimary: !!user.isPrimary,
            exp: exp
        });
    } catch (signErr) {
        console.error('signSession failed:', signErr);
        return {
            code: 503,
            data: { ok: false, error: 'server_misconfigured', hint: 'NEBRAS_API_SECRET' }
        };
    }
    return {
        code: 200,
        data: {
            ok: true,
            token: session,
            expiresAt: exp,
            user: sec.sanitizeAdminUser(user)
        }
    };
}

async function handleVerify(req) {
    const sess = sec.verifySession(sec.getBearerToken(req));
    if (!sess) return { code: 401, data: { ok: false, error: 'invalid_session' } };
    return { code: 200, data: { ok: true, session: sess } };
}

async function handlePortalLogin(body) {
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();
    if (!username || !password) {
        return { code: 400, data: { ok: false, error: 'credentials_required' } };
    }
    const { url, key } = sec.supabaseServiceConfig();
    if (!url || !key) {
        return { code: 503, data: { ok: false, error: 'service_unavailable' } };
    }
    const users = await sec.loadCustomerPortalUsers();
    const unLower = username.toLowerCase();
    const user = users.find(function(u) {
        return u && u.isActive !== false && String(u.username || '').toLowerCase() === unLower;
    });
    if (!user || !sec.verifyNebrasPassword(user.password, password)) {
        return { code: 401, data: { ok: false, error: 'invalid_credentials' } };
    }
    return {
        code: 200,
        data: {
            ok: true,
            user: sec.sanitizePortalUser(user)
        }
    };
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
        const body = sec.parseBody(req);
        const action = String(req.query.action || body.action || 'login').toLowerCase();

        if (action === 'login' && req.method === 'POST') {
            const rl = rate.checkRateLimit(req, { key: 'auth_login', max: 20, windowMs: 300000 });
            if (!rl.ok) {
                const blocked = rate.rateLimitResponse(res, rl.retryAfterSec);
                return sec.jsonRes(res, blocked.code, blocked.data);
            }
            const result = await handleLogin(body);
            return sec.jsonRes(res, result.code, result.data);
        }
        if (action === 'verify' && req.method === 'GET') {
            const result = await handleVerify(req);
            return sec.jsonRes(res, result.code, result.data);
        }
        if (action === 'portal-login' && req.method === 'POST') {
            const rl = rate.checkRateLimit(req, { key: 'portal_login', max: 25, windowMs: 300000 });
            if (!rl.ok) {
                const blocked = rate.rateLimitResponse(res, rl.retryAfterSec);
                return sec.jsonRes(res, blocked.code, blocked.data);
            }
            const result = await handlePortalLogin(body);
            return sec.jsonRes(res, result.code, result.data);
        }
        return sec.jsonRes(res, 405, { ok: false, error: 'method_not_allowed' });
    } catch (err) {
        console.error('nebras-auth error:', err);
        const msg = String(err && err.message || '');
        if (msg.indexOf('NEBRAS_API_SECRET') >= 0) {
            return sec.jsonRes(res, 503, { ok: false, error: 'server_misconfigured', hint: 'NEBRAS_API_SECRET' });
        }
        return sec.jsonRes(res, 500, { ok: false, error: 'server_error' });
    }
};
