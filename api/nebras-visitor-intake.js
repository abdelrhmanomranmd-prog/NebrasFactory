const sec = require('./lib/nebras-security');
const rate = require('./lib/nebras-rate-limit');

const ALLOWED_TYPES = ['complaint', 'callback_lead'];
const MAX_CALLBACK_LEADS = 5000;

function cleanStr(v, max) {
    return String(v == null ? '' : v).trim().slice(0, max || 500);
}

function cleanPhone(v) {
    return cleanStr(v, 32).replace(/[^\d+\s-]/g, '');
}

async function mergeComplaint(data) {
    const id = cleanStr(data.id, 32);
    const item = data.item && typeof data.item === 'object' ? data.item : null;
    if (!id || !item) return { ok: false, error: 'invalid_complaint' };
    const name = cleanStr(item.customerName, 120);
    const phone = cleanPhone(item.phone);
    const description = cleanStr(item.description, 2000);
    if (!name || !phone || !description) return { ok: false, error: 'complaint_fields_required' };

    const complaint = {
        status: cleanStr(item.status, 32) || 'pending',
        description: description,
        customerName: name,
        phone: phone,
        branch: cleanStr(item.branch, 120) || 'غير محدد',
        routedSalesPhone: cleanStr(item.routedSalesPhone, 32),
        routedSalesBranch: cleanStr(item.routedSalesBranch, 120),
        createdAt: item.createdAt || new Date().toISOString(),
        sessionId: cleanStr(item.sessionId, 64)
    };

    const { url, key, invalidKey } = sec.supabaseServiceConfig();
    if (!url || !key) {
        return {
            ok: false,
            error: invalidKey === 'non_ascii_service_key' ? 'invalid_service_key_encoding' : 'service_unavailable'
        };
    }

    const row = await sec.fetchStoreRow(url, key, 'complaints');
    const current = row && row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
        ? row.payload : {};
    current[id] = complaint;
    const upsert = await sec.upsertStoreRows(url, key, [{ store_key: 'complaints', payload: current }]);
    if (!upsert || !upsert.ok) return { ok: false, error: 'upsert_failed', detail: upsert && upsert.detail };
    return { ok: true, id: id };
}

async function mergeCallbackLead(data) {
    const lead = data && typeof data === 'object' ? data : null;
    if (!lead) return { ok: false, error: 'invalid_lead' };
    const name = cleanStr(lead.customerName, 120);
    const phone = cleanPhone(lead.phone);
    if (!name || name.length < 2) return { ok: false, error: 'name_required' };
    if (!phone || phone.replace(/\D/g, '').length < 9) return { ok: false, error: 'phone_required' };

    const normalized = {
        id: cleanStr(lead.id, 64) || ('cb-' + Date.now()),
        customerName: name,
        phone: phone,
        city: cleanStr(lead.city, 120) || 'عنيزة — المقر',
        branchId: lead.branchId == null ? null : Number(lead.branchId),
        need: cleanStr(lead.need, 500),
        status: 'new',
        createdAt: Number(lead.createdAt) || Date.now(),
        sessionId: cleanStr(lead.sessionId, 64)
    };

    const { url, key, invalidKey } = sec.supabaseServiceConfig();
    if (!url || !key) {
        return {
            ok: false,
            error: invalidKey === 'non_ascii_service_key' ? 'invalid_service_key_encoding' : 'service_unavailable'
        };
    }

    const row = await sec.fetchStoreRow(url, key, 'callback_leads');
    let current = row && Array.isArray(row.payload) ? row.payload.slice() : [];
    current = current.filter(function(l) { return l && l.id !== normalized.id; });
    current.unshift(normalized);
    if (current.length > MAX_CALLBACK_LEADS) current = current.slice(0, MAX_CALLBACK_LEADS);

    const upsert = await sec.upsertStoreRows(url, key, [{ store_key: 'callback_leads', payload: current }]);
    if (!upsert || !upsert.ok) return { ok: false, error: 'upsert_failed', detail: upsert && upsert.detail };
    return { ok: true, id: normalized.id };
}

module.exports = async function handler(req, res) {
    try {
        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.statusCode = 204;
            res.end();
            return;
        }
        if (req.method !== 'POST') {
            return sec.jsonRes(res, 405, { ok: false, error: 'method_not_allowed' });
        }

        const rl = rate.checkRateLimit(req, { key: 'visitor_intake', max: 40, windowMs: 3600000 });
        if (!rl.ok) {
            const blocked = rate.rateLimitResponse(res, rl.retryAfterSec);
            return sec.jsonRes(res, blocked.code, blocked.data);
        }

        const body = sec.parseBody(req);
        const type = String(body.type || '').toLowerCase();
        if (ALLOWED_TYPES.indexOf(type) < 0) {
            return sec.jsonRes(res, 400, { ok: false, error: 'invalid_type' });
        }

        let result;
        if (type === 'complaint') result = await mergeComplaint(body.data || body);
        else result = await mergeCallbackLead(body.data || body);

        if (!result.ok) {
            const code = result.error === 'service_unavailable' ? 503 : 400;
            return sec.jsonRes(res, code, result);
        }
        return sec.jsonRes(res, 200, result);
    } catch (err) {
        console.error('nebras-visitor-intake error:', err);
        return sec.jsonRes(res, 500, { ok: false, error: 'server_error' });
    }
};
