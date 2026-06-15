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
    content: 'ركّز على إدارة محتوى الموقع: أيقونات الزوار الأربع · المعرض · الصور · PDF. لفتح المحتوى: [ACTION:open_content] · للوسائط: [ACTION:open_media].',
    users: 'ركّز على المستخدمين والصلاحيات. لفتح إدارة المستخدمين: [ACTION:open_users].',
    cloud: 'ركّز على Supabase والمزامنة. للرفع: [ACTION:push_cloud] · للحوكمة: [ACTION:open_cloud].'
};

async function callClaude(messages, systemPrompt) {
    const key = String(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '').trim();
    if (!key) return { error: 'ai_not_configured' };
    const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: model,
            max_tokens: 3200,
            system: systemPrompt,
            messages: messages
        })
    });
    if (!res.ok) {
        const errText = await res.text();
        console.error('Claude API error:', res.status, errText.slice(0, 400));
        return { error: 'ai_upstream_failed' };
    }
    const data = await res.json();
    const text = data.content && data.content[0] && data.content[0].text ? data.content[0].text : '';
    return { text: text };
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
        const prompt = String(body.prompt || '').trim();
        const context = String(body.context || '').trim().slice(0, 4000);
        const mode = String(body.mode || 'governance').toLowerCase();
        const history = sanitizeHistory(body.history);
        if (!prompt) return sec.jsonRes(res, 400, { ok: false, error: 'prompt_required' });

        const modeHint = MODE_PROMPTS[mode] || MODE_PROMPTS.governance;
        const systemPrompt =
            'أنت Claude — المساعد الشخصي للإدارة الرئيسية في منصة نبراس (مصنع نبراس للبلاستيك WPC). ' +
            'تتصرّف مثل Microsoft Copilot داخل Excel: محادثة طبيعية، خطوات عملية، واقتراحات قابلة للتنفيذ. ' +
            'كل الفروع والمستخدمين والعملاء تحت حوكمة HQ. ' +
            'ساعد في: المتجر · المحتوى · السلة · البنوك · المستخدمين · HR · CRM · السحابة · مصمّم الأبواب. ' +
            modeHint + ' ' +
            'أجب بالعربية. كن مختصراً وعملياً. عند اقتراح فتح قسم في المنصة أضف وسماً: [ACTION:اسم] حيث الاسم أحد: open_content, open_store, open_users, open_cloud, open_hr, open_media, push_cloud, open_settings, export_store. ' +
            'لا تخترع أسعاراً حقيقية.';

        const messages = history.slice();
        const userContent = context
            ? ('سياق المنصة:\n' + context + '\n\nطلب الإدارة:\n' + prompt)
            : prompt;
        messages.push({ role: 'user', content: userContent });

        const result = await callClaude(messages, systemPrompt);
        if (result.error) {
            return sec.jsonRes(res, result.error === 'ai_not_configured' ? 503 : 502, { ok: false, error: result.error });
        }
        return sec.jsonRes(res, 200, { ok: true, reply: result.text, mode: mode, by: sess.username });
    } catch (err) {
        console.error('nebras-ai error:', err);
        return sec.jsonRes(res, 500, { ok: false, error: 'server_error' });
    }
};
