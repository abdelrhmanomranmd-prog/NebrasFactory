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
    governance: 'ركّز على الحوكمة: الإدارة الرئيسية · الفروع · الأقسام · الصلاحيات · RBAC · الفصل بين HQ والفروع.',
    products: 'ركّز على المتجر الإلكتروني: أصناف · مقاسات · ألوان · أسعار · SKU · صور. عند اقتراح أصناف أخرج JSON قابلاً للتطبيق: {"product_id":"...","variants":[{"type_ar":"","size_ar":"","color_ar":"","price_ex_vat":0,"sku":"","image":""}]}',
    users: 'ركّز على المستخدمين: أدوار · صلاحيات · store_manager · مندوبين · عملاء البوابة — كلها تحت إدارة HQ.',
    cloud: 'ركّز على السحابة Supabase: مزامنة · نسخ احتياطية · حماية البيانات · site_products · admin_users.'
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
            max_tokens: 2400,
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
        if (!prompt) return sec.jsonRes(res, 400, { ok: false, error: 'prompt_required' });

        const modeHint = MODE_PROMPTS[mode] || MODE_PROMPTS.governance;
        const systemPrompt =
            'أنت مساعد Claude السحابي لمنصة نبراس (Nebras Plastic Factory) — للإدارة الرئيسية فقط. ' +
            'كل الفروع والأقسام والمستخدمين والعملاء تحت حوكمة الإدارة الرئيسية (HQ). ' +
            'ساعد في: إدارة المتجر · المنتجات · المستخدمين والصلاحيات · الفروع · الأقسام · ERP · HR · CRM · السحابة. ' +
            modeHint + ' ' +
            'أجب بالعربية باختصار وعملي. لا تخترع أسعاراً حقيقية — اقترح هيكل البيانات فقط.';

        const userContent = context
            ? ('سياق المنصة الحالي:\n' + context + '\n\nطلب الإدارة الرئيسية:\n' + prompt)
            : prompt;
        const result = await callClaude([{ role: 'user', content: userContent }], systemPrompt);
        if (result.error) {
            return sec.jsonRes(res, result.error === 'ai_not_configured' ? 503 : 502, { ok: false, error: result.error });
        }
        return sec.jsonRes(res, 200, { ok: true, reply: result.text, mode: mode, by: sess.username });
    } catch (err) {
        console.error('nebras-ai error:', err);
        return sec.jsonRes(res, 500, { ok: false, error: 'server_error' });
    }
};
