const sec = require('./lib/nebras-security');

function requireMainAdminSession(req) {
    const sess = sec.verifySession(sec.getBearerToken(req));
    if (!sess) return null;
    if (typeof sec.isHqSession === 'function' && sec.isHqSession(sess)) return sess;
    if (String(sess.role || '').toLowerCase() === 'superadmin') return sess;
    if (String(sess.username || '').toUpperCase() === 'NEBRASFACTORY') return sess;
    return null;
}

const MODE_PROMPTS = {
    governance: 'ركّز على الحوكمة: الإدارة الرئيسية · الفروع · الأقسام · الصلاحيات · RBAC. عند اقتراح فتح لوحة أضف [ACTION:open_users] أو [ACTION:open_cloud].',
    products: 'ركّز على المتجر: أصناف · مقاسات · ألوان · أسعار · SKU. عند اقتراح أصناف أخرج JSON: {"product_id":"...","variants":[...]}. لفتح المتجر: [ACTION:open_store].',
    content: 'ركّز على إدارة محتوى الموقع: أيقونات الزوار · المعرض · الصور · PDF · رفع وسائط. لفتح المحتوى: [ACTION:open_content] · للوسائط: [ACTION:open_media] · للمعرض: [ACTION:open_showroom].',
    users: 'ركّز على المستخدمين والصلاحيات. لفتح إدارة المستخدمين: [ACTION:open_users].',
    cloud: 'ركّز على Supabase والمزامنة. للرفع: [ACTION:push_cloud] · للحوكمة: [ACTION:open_cloud].',
    cart: 'ركّز على السلة وطرق الدفع والبنوك. لتفعيل طرق الدفع أخرج JSON: {"payment_methods":[{"id":"mada","enabled":true,"subAr":"..."}]}. لفتح إعدادات الدفع: [ACTION:open_payments].'
};

const DEFAULT_MODELS = [
    'claude-sonnet-4-6',
    'claude-sonnet-4-5',
    'claude-haiku-4-5'
];

const VISION_MODELS = [
    'claude-haiku-4-5',
    'claude-sonnet-4-6',
    'claude-sonnet-4-5'
];

const CLAUDE_TIMEOUT_MS = 25000;

function parseUpstreamError(status, errText) {
    let detail = '';
    try {
        const parsed = JSON.parse(errText);
        detail = String(
            (parsed.error && parsed.error.message) ||
            parsed.message ||
            ''
        ).trim();
    } catch (e) {
        detail = String(errText || '').trim().slice(0, 200);
    }
    const lower = detail.toLowerCase();
    if (status === 401 || lower.indexOf('authentication') >= 0 || lower.indexOf('invalid x-api-key') >= 0) {
        return { error: 'ai_invalid_key', detail: detail };
    }
    if (status === 402 || status === 403 || lower.indexOf('credit') >= 0 || lower.indexOf('billing') >= 0) {
        return { error: 'ai_billing_required', detail: detail };
    }
    if (status === 404 || lower.indexOf('model') >= 0 && lower.indexOf('not found') >= 0) {
        return { error: 'ai_model_not_found', detail: detail };
    }
    if (status === 429 || lower.indexOf('rate') >= 0) {
        return { error: 'ai_rate_limited', detail: detail };
    }
    if (status === 504 || status === 408 || lower.indexOf('timeout') >= 0 || lower.indexOf('timed out') >= 0) {
        return { error: 'ai_timeout', detail: detail };
    }
    return { error: 'ai_upstream_failed', detail: detail };
}

async function fetchClaudeWithTimeout(url, options, timeoutMs) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    let timer = null;
    const opts = Object.assign({}, options);
    if (ctrl) {
        opts.signal = ctrl.signal;
        timer = setTimeout(function() { ctrl.abort(); }, timeoutMs);
    }
    try {
        return await fetch(url, opts);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

async function callClaudeOnce(model, messages, systemPrompt, key, maxTokens) {
    let res;
    try {
        res = await fetchClaudeWithTimeout('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': key,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: model,
                max_tokens: maxTokens || 3200,
                system: systemPrompt,
                messages: messages
            })
        }, CLAUDE_TIMEOUT_MS);
    } catch (fetchErr) {
        const msg = String(fetchErr && fetchErr.message || fetchErr || '').toLowerCase();
        if (msg.indexOf('abort') >= 0 || msg.indexOf('timeout') >= 0) {
            return { error: 'ai_timeout', detail: 'claude_fetch_timeout' };
        }
        return { error: 'ai_upstream_failed', detail: String(fetchErr && fetchErr.message || fetchErr).slice(0, 200) };
    }
    if (!res.ok) {
        const errText = await res.text();
        console.error('Claude API error:', model, res.status, errText.slice(0, 400));
        return parseUpstreamError(res.status, errText);
    }
    let data;
    try {
        data = await res.json();
    } catch (e) {
        return { error: 'ai_upstream_failed', detail: 'invalid_claude_json' };
    }
    const text = data.content && data.content[0] && data.content[0].text ? data.content[0].text : '';
    return { text: text, model: model };
}

async function callClaude(messages, systemPrompt, hasImages) {
    const key = String(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '').trim();
    if (!key) return { error: 'ai_not_configured' };
    const envModel = String(process.env.ANTHROPIC_MODEL || '').trim();
    const models = hasImages ? VISION_MODELS.slice() : [];
    if (envModel) models.unshift(envModel);
    (hasImages ? VISION_MODELS : DEFAULT_MODELS).forEach(function(m) {
        if (models.indexOf(m) < 0) models.push(m);
    });
    const maxTokens = hasImages ? 2048 : 3200;
    let lastError = { error: 'ai_upstream_failed' };
    for (let i = 0; i < models.length; i++) {
        const result = await callClaudeOnce(models[i], messages, systemPrompt, key, maxTokens);
        if (result.text) return result;
        lastError = result;
        if (result.error === 'ai_invalid_key' || result.error === 'ai_billing_required' || result.error === 'ai_rate_limited') {
            return result;
        }
        if (result.error === 'ai_timeout' && i < models.length - 1) continue;
    }
    return lastError;
}

function sanitizeHistory(history) {
    if (!Array.isArray(history)) return [];
    return history.slice(-12).filter(function(m) {
        return m && (m.role === 'user' || m.role === 'assistant') && String(m.content || '').trim();
    }).map(function(m) {
        return {
            role: m.role,
            content: String(m.content).trim().slice(0, 3000)
        };
    });
}

function sanitizeImages(images) {
    if (!Array.isArray(images)) return [];
    return images.slice(0, 2).filter(function(img) {
        return img && img.media_type && img.data && String(img.data).length < 520000;
    }).map(function(img) {
        return {
            media_type: String(img.media_type).slice(0, 64),
            data: String(img.data).slice(0, 520000)
        };
    });
}

function buildUserMessage(prompt, context, images) {
    const text = context
        ? ('سياق المنصة:\n' + context + '\n\nطلب الإدارة:\n' + prompt)
        : prompt;
    const blocks = [];
    images.forEach(function(img) {
        blocks.push({
            type: 'image',
            source: {
                type: 'base64',
                media_type: img.media_type,
                data: img.data
            }
        });
    });
    blocks.push({ type: 'text', text: text });
    if (blocks.length === 1) return text;
    return blocks;
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
        const sess = requireMainAdminSession(req);
        if (!sess) return sec.jsonRes(res, 403, { ok: false, error: 'main_admin_only' });

        const body = sec.parseBody(req);
        const rawLen = Number(req.headers['content-length'] || 0);
        if (rawLen > 4500000) {
            return sec.jsonRes(res, 413, { ok: false, error: 'payload_too_large', detail: 'request_too_large' });
        }
        const prompt = String(body.prompt || '').trim();
        const context = String(body.context || '').trim().slice(0, 4000);
        const mode = String(body.mode || 'governance').toLowerCase();
        const history = sanitizeHistory(body.history);
        const images = sanitizeImages(body.images);
        if (!prompt && !images.length) return sec.jsonRes(res, 400, { ok: false, error: 'prompt_required' });

        const modeHint = MODE_PROMPTS[mode] || MODE_PROMPTS.governance;
        const systemPrompt =
            'أنت Claude — المساعد الشخصي للإدارة الرئيسية في منصة نبراس (مصنع نبراس للبلاستيك WPC). ' +
            'تتصرّف مثل Microsoft Copilot داخل Excel وWord وPowerPoint: محادثة طبيعية، خطوات عملية، وتنفيذ مباشر في المنصة. ' +
            'صلاحياتك كاملة للإدارة الرئيسية: رفع وسائط · إضافة منتجات · تعديل محتوى · تفعيل طرق دفع · إدارة مستخدمين · مزامنة سحابة. ' +
            'كل الفروع والمستخدمين والعملاء تحت حوكمة HQ. ' +
            'ساعد في: المتجر · المحتوى · السلة · طرق الدفع · البنوك · المستخدمين · HR · CRM · السحابة · مصمّم الأبواب · المعرض. ' +
            (images.length ? 'الإدارة أرفقت صورة/صور — حلّليها واقترحي خطوات عملية في المنصة. ' : '') +
            modeHint + ' ' +
            'أجب بالعربية. كن مختصراً وعملياً. عند اقتراح فتح قسم في المنصة أضف وسماً: [ACTION:اسم] حيث الاسم أحد: ' +
            'open_content, open_store, open_showroom, open_users, open_cloud, open_hr, open_media, push_cloud, open_settings, open_payments, export_store. ' +
            'لتفعيل طرق دفع أخرج JSON: {"payment_methods":[{"id":"mada","enabled":true,"subAr":"نشط عبر بوابة الدفع"}]}. ' +
            'لإضافة أصناف أخرج JSON: {"product_id":"...","variants":[...]}. ' +
            'لا تخترع أسعاراً حقيقية.';

        const messages = history.slice();
        messages.push({
            role: 'user',
            content: buildUserMessage(prompt || 'حلّلي الصورة المرفقة.', context, images)
        });

        const result = await callClaude(messages, systemPrompt, images.length > 0);
        if (result.error) {
            const code = result.error === 'ai_not_configured' ? 503
                : result.error === 'ai_timeout' ? 504 : 502;
            return sec.jsonRes(res, code, {
                ok: false,
                error: result.error,
                detail: result.detail || ''
            });
        }
        return sec.jsonRes(res, 200, {
            ok: true,
            reply: result.text,
            mode: mode,
            model: result.model || '',
            by: sess.username
        });
    } catch (err) {
        console.error('nebras-ai error:', err);
        return sec.jsonRes(res, 500, { ok: false, error: 'server_error' });
    }
};
