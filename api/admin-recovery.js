const crypto = require('crypto');

const OTP_STORE_KEY = 'admin_recovery_otp';
const OTP_TTL_MS = 10 * 60 * 1000;

function primaryRecoveryEmail() {
    return String(process.env.NEBRAS_RECOVERY_EMAIL || 'abdelrhmanomranmd@gmail.com').trim().toLowerCase();
}

function otpSecret() {
    return process.env.OTP_SECRET || process.env.GMAIL_APP_PASSWORD || 'nebras-recovery-fallback-secret';
}

function hashOtp(code) {
    return crypto.createHash('sha256').update(String(code) + '|' + otpSecret()).digest('hex');
}

function supabaseConfig() {
    const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
    const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SECRET_KEY ||
        process.env.SUPABASE_SERVICE_KEY ||
        '';
    return { url, key: String(key).trim() };
}

function supabaseHeaders(key) {
    return {
        apikey: key,
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
    };
}

async function supabaseUpsertOtp(payload) {
    const { url, key } = supabaseConfig();
    if (!url || !key) return { ok: false, code: 'otp_store_unavailable' };

    try {
        await fetch(url + '/rest/v1/nebras_data_store?store_key=eq.' + encodeURIComponent(OTP_STORE_KEY), {
            method: 'DELETE',
            headers: supabaseHeaders(key)
        });

        const res = await fetch(url + '/rest/v1/nebras_data_store', {
            method: 'POST',
            headers: supabaseHeaders(key),
            body: JSON.stringify({
                store_key: OTP_STORE_KEY,
                payload: payload,
                updated_at: new Date().toISOString()
            })
        });

        if (!res.ok) {
            const errText = await res.text().catch(function() { return ''; });
            console.error('Supabase OTP store failed:', res.status, errText);
            return { ok: false, code: res.status === 401 || res.status === 403 ? 'supabase_auth_failed' : 'otp_store_unavailable' };
        }
        return { ok: true };
    } catch (err) {
        console.error('Supabase OTP store error:', err);
        return { ok: false, code: 'otp_store_unavailable' };
    }
}

async function supabaseReadOtp() {
    const { url, key } = supabaseConfig();
    if (!url || !key) return null;
    try {
        const res = await fetch(
            url + '/rest/v1/nebras_data_store?store_key=eq.' + encodeURIComponent(OTP_STORE_KEY) + '&select=payload',
            { headers: supabaseHeaders(key) }
        );
        if (!res.ok) return null;
        const rows = await res.json();
        if (!rows || !rows[0] || !rows[0].payload) return null;
        return rows[0].payload;
    } catch (err) {
        console.error('Supabase OTP read error:', err);
        return null;
    }
}

async function supabaseClearOtp() {
    const { url, key } = supabaseConfig();
    if (!url || !key) return;
    try {
        await fetch(url + '/rest/v1/nebras_data_store?store_key=eq.' + encodeURIComponent(OTP_STORE_KEY), {
            method: 'DELETE',
            headers: supabaseHeaders(key)
        });
    } catch (err) {
        console.error('Supabase OTP clear error:', err);
    }
}

async function sendGmailCode(toEmail, code, username) {
    const user = String(process.env.GMAIL_SMTP_USER || process.env.NEBRAS_RECOVERY_EMAIL || '').trim();
    const pass = String(process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
    if (!user || !pass) {
        const err = new Error('gmail_not_configured');
        err.code = 'gmail_not_configured';
        throw err;
    }

    let nodemailer;
    try {
        nodemailer = require('nodemailer');
    } catch (loadErr) {
        console.error('nodemailer load failed:', loadErr);
        const err = new Error('nodemailer_missing');
        err.code = 'server_error';
        throw err;
    }

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: user, pass: pass },
        connectionTimeout: 15000,
        greetingTimeout: 15000
    });

    await transporter.sendMail({
        from: '"Nebras Admin" <' + user + '>',
        to: toEmail,
        subject: 'رمز تغيير كلمة مرور الإدارة — مصنع نبراس',
        text:
            'مرحباً،\n\n' +
            'طُلب تغيير كلمة مرور حساب الإدارة: ' + (username || '—') + '\n\n' +
            'رمز التحقق (صالح 10 دقائق): ' + code + '\n\n' +
            'إن لم تطلُبي هذا الرمز تجاهلي الرسالة.\n\n' +
            'مصنع نبراس للبلاستيك',
        html:
            '<p>طُلب تغيير كلمة مرور حساب الإدارة: <strong>' +
            String(username || '—') +
            '</strong></p>' +
            '<p style="font-size:22px;letter-spacing:4px"><strong>' +
            code +
            '</strong></p>' +
            '<p>الرمز صالح 10 دقائق. إن لم تطلُبي هذا الرمز تجاهلي الرسالة.</p>'
    });
}

async function handleRecovery(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }));
        return;
    }

    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            body = {};
        }
    }
    if (!body || typeof body !== 'object') body = {};

    const action = String(req.query.action || body.action || '').toLowerCase();
    const allowedEmail = primaryRecoveryEmail();
    const email = String(body.email || '').trim().toLowerCase();

    if (email !== allowedEmail) {
        res.statusCode = 403;
        res.end(JSON.stringify({ ok: false, error: 'email_mismatch' }));
        return;
    }

    if (action === 'send') {
        const username = String(body.username || '').trim();
        if (!username) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: 'username_required' }));
            return;
        }
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const payload = {
            hash: hashOtp(code),
            exp: Date.now() + OTP_TTL_MS,
            username: username,
            email: allowedEmail
        };
        const stored = await supabaseUpsertOtp(payload);
        if (!stored.ok) {
            res.statusCode = 503;
            res.end(JSON.stringify({ ok: false, error: stored.code || 'otp_store_unavailable' }));
            return;
        }
        try {
            await sendGmailCode(allowedEmail, code, username);
        } catch (mailErr) {
            await supabaseClearOtp();
            console.error('Gmail send failed:', mailErr);
            res.statusCode = 503;
            res.end(
                JSON.stringify({
                    ok: false,
                    error: mailErr.code || mailErr.message || 'gmail_send_failed'
                })
            );
            return;
        }
        res.statusCode = 200;
        res.end(JSON.stringify({ ok: true, sent: true }));
        return;
    }

    if (action === 'verify') {
        const code = String(body.code || '').trim();
        const username = String(body.username || '').trim();
        if (!code || !username) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: 'code_required' }));
            return;
        }
        const record = await supabaseReadOtp();
        if (!record || !record.hash || !record.exp) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: 'no_active_code' }));
            return;
        }
        if (Date.now() > Number(record.exp)) {
            await supabaseClearOtp();
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: 'code_expired' }));
            return;
        }
        if (String(record.username || '') !== username) {
            res.statusCode = 403;
            res.end(JSON.stringify({ ok: false, error: 'username_mismatch' }));
            return;
        }
        if (hashOtp(code) !== record.hash) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: 'invalid_code' }));
            return;
        }
        await supabaseClearOtp();
        res.statusCode = 200;
        res.end(JSON.stringify({ ok: true, verified: true }));
        return;
    }

    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: 'invalid_action' }));
}

module.exports = async function handler(req, res) {
    try {
        await handleRecovery(req, res);
    } catch (err) {
        console.error('admin-recovery fatal:', err);
        if (!res.headersSent) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: 'server_error' }));
        }
    }
};
