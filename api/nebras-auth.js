const sec = require('./lib/nebras-security');

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
    const user = users.find(function(u) {
        return String(u.username || '').toUpperCase() === username.toUpperCase() && u.isActive !== false;
    });
    if (!user || !sec.verifyNebrasPassword(user.password, password)) {
        return { code: 401, data: { ok: false, error: 'invalid_credentials' } };
    }
    const exp = Date.now() + sec.SESSION_TTL_MS;
    const session = sec.signSession({
        sub: user.id,
        username: user.username,
        role: user.role,
        exp: exp
    });
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
            const result = await handleLogin(body);
            return sec.jsonRes(res, result.code, result.data);
        }
        if (action === 'verify' && req.method === 'GET') {
            const result = await handleVerify(req);
            return sec.jsonRes(res, result.code, result.data);
        }
        return sec.jsonRes(res, 405, { ok: false, error: 'method_not_allowed' });
    } catch (err) {
        console.error('nebras-auth error:', err);
        return sec.jsonRes(res, 500, { ok: false, error: 'server_error' });
    }
};
