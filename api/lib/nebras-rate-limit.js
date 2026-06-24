/**
 * حد معدّل بسيط لحماية API من هجمات القوة الغاشمة
 */
const buckets = new Map();
const MAX_BUCKETS = 8000;

function clientIp(req) {
    const fwd = req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For'] || '';
    if (fwd) return String(fwd).split(',')[0].trim();
    const real = req.headers['x-real-ip'] || req.headers['X-Real-Ip'] || '';
    if (real) return String(real).trim();
    return 'unknown';
}

function pruneBuckets(now) {
    if (buckets.size <= MAX_BUCKETS) return;
    buckets.forEach(function(v, k) {
        if (now > v.reset) buckets.delete(k);
    });
}

function checkRateLimit(req, options) {
    options = options || {};
    const max = Number(options.max || 30);
    const windowMs = Number(options.windowMs || 60000);
    const key = String(options.key || 'default');
    const ip = clientIp(req);
    const id = key + ':' + ip;
    const now = Date.now();
    pruneBuckets(now);
    let bucket = buckets.get(id);
    if (!bucket || now > bucket.reset) {
        bucket = { count: 0, reset: now + windowMs };
        buckets.set(id, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
        return {
            ok: false,
            retryAfterSec: Math.max(1, Math.ceil((bucket.reset - now) / 1000))
        };
    }
    return { ok: true, remaining: max - bucket.count };
}

function rateLimitResponse(res, retryAfterSec) {
    res.setHeader('Retry-After', String(retryAfterSec || 60));
    return { code: 429, data: { ok: false, error: 'rate_limited', retryAfter: retryAfterSec || 60 } };
}

module.exports = { checkRateLimit, rateLimitResponse, clientIp };
