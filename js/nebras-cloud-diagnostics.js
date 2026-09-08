/**
 * نبراس hrws339 — تشخيص السحابة (HQ Cloud Diagnostics)
 * سجل أحداث · فحص صحة · مصفوفة مفاتيح حرجة — بدون بيانات سرية في الواجهة.
 */
(function (global) {
    'use strict';

    var MAX_EVENTS = 80;
    var events = [];
    var lastHealth = null;
    var lastHealthAt = 0;
    var keyStatus = Object.create(null);

    var CRITICAL_KEYS = [
        'admin_users',
        'site_products',
        'system_settings',
        'hr_employees',
        'customer_portal_users',
        'sales_quotes_inbox',
        'erp_inventory',
        'aluminum_estimates',
        'wpc_estimates',
        'crm_customers'
    ];

    function nowIso() {
        return new Date().toISOString();
    }

    function pushEvent(type, detail, meta) {
        var row = {
            at: nowIso(),
            type: String(type || 'info'),
            detail: String(detail || ''),
            meta: meta || null
        };
        events.unshift(row);
        if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
        try {
            if (meta && meta.key) {
                keyStatus[meta.key] = {
                    at: row.at,
                    ok: meta.ok !== false && type !== 'error' && type !== 'warn',
                    type: row.type,
                    detail: row.detail,
                    code: meta.code || null
                };
            }
            if (Array.isArray(meta && meta.keys)) {
                meta.keys.forEach(function (k) {
                    keyStatus[k] = {
                        at: row.at,
                        ok: meta.ok !== false && type !== 'error' && type !== 'warn',
                        type: row.type,
                        detail: row.detail,
                        code: meta.code || null
                    };
                });
            }
        } catch (e) { /* ignore */ }
        return row;
    }

    function getEvents(limit) {
        var n = Math.max(1, Math.min(MAX_EVENTS, limit || 40));
        return events.slice(0, n);
    }

    function getKeyStatus(key) {
        return keyStatus[key] || null;
    }

    function getSnapshot() {
        var dirty = [];
        try {
            if (typeof global.getPendingDirtyStoreKeys === 'function') {
                dirty = global.getPendingDirtyStoreKeys() || [];
            }
        } catch (e) { dirty = []; }
        var pendingSensitive = false;
        try {
            pendingSensitive = !!(typeof global.hasSensitiveCloudPending === 'function' && global.hasSensitiveCloudPending());
        } catch (e2) { pendingSensitive = false; }
        var token = '';
        try {
            token = (typeof global.getNebrasSecureToken === 'function' && global.getNebrasSecureToken()) || '';
        } catch (e3) { token = ''; }
        var hydrating = !!(typeof global.isNebrasCloudHydrating === 'function' && global.isNebrasCloudHydrating());
        var deploy = '';
        try {
            deploy = (document.body && document.body.getAttribute('data-nebras-deploy')) || '';
        } catch (e4) { deploy = ''; }
        return {
            at: nowIso(),
            deploy: deploy,
            hydrating: hydrating,
            session: !!token,
            sessionPreview: token ? (String(token).slice(0, 8) + '…') : '',
            dirtyKeys: dirty.slice(0, 40),
            dirtyCount: dirty.length,
            pendingSensitive: pendingSensitive,
            health: lastHealth,
            healthAt: lastHealthAt ? new Date(lastHealthAt).toISOString() : null,
            events: getEvents(25),
            critical: CRITICAL_KEYS.map(function (k) {
                var st = keyStatus[k] || null;
                var localMeta = null;
                try {
                    if (typeof global.getNebrasCloudStoreLocalMeta === 'function') {
                        localMeta = global.getNebrasCloudStoreLocalMeta(k);
                    }
                } catch (e5) { localMeta = null; }
                return {
                    key: k,
                    status: st,
                    local: localMeta
                };
            })
        };
    }

    async function fetchLiveHealth(force) {
        var now = Date.now();
        if (!force && lastHealth && (now - lastHealthAt) < 20000) {
            return lastHealth;
        }
        pushEvent('info', 'فحص /api/health…', { code: 'health_check' });
        try {
            var res = await fetch('/api/health?deep=1&t=' + now, {
                method: 'GET',
                cache: 'no-store',
                headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
            });
            var data = await res.json().catch(function () { return null; });
            lastHealth = data || { ok: false, error: 'bad_json', status: res.status };
            lastHealthAt = Date.now();
            if (lastHealth && lastHealth.ok) {
                pushEvent('ok', 'السيرفر والسحابة متاحان', {
                    ok: true,
                    code: 'health_ok',
                    upgrade: lastHealth.upgrade
                });
            } else {
                pushEvent('error', 'صحة السيرفر ضعيفة أو غير متاحة', {
                    ok: false,
                    code: 'health_fail',
                    status: res.status
                });
            }
            return lastHealth;
        } catch (err) {
            lastHealth = { ok: false, error: String(err && err.message || err || 'network') };
            lastHealthAt = Date.now();
            pushEvent('error', 'تعذّر الوصول لـ /api/health — ' + lastHealth.error, {
                ok: false,
                code: 'health_network'
            });
            return lastHealth;
        }
    }

    async function runFullDiagnose() {
        pushEvent('info', 'بدء تشخيص سحابة كامل', { code: 'diag_start' });
        var health = await fetchLiveHealth(true);
        var snap = getSnapshot();
        var score = 100;
        var issues = [];
        if (!health || !health.ok) {
            score -= 40;
            issues.push('السيرفر/Supabase غير جاهز');
        }
        if (!snap.session) {
            score -= 25;
            issues.push('لا جلسة سحابة آمنة — أعيدي تسجيل الدخول');
        }
        if (snap.hydrating) {
            score -= 10;
            issues.push('التحميل من السحابة ما زال جارياً — انتظري');
        }
        if (snap.dirtyCount > 0) {
            score -= Math.min(20, snap.dirtyCount * 2);
            issues.push(snap.dirtyCount + ' مفتاح معلّق للرفع');
        }
        if (snap.pendingSensitive) {
            score -= 15;
            issues.push('رفع حسّاس معلّق');
        }
        score = Math.max(0, Math.min(100, score));
        var verdict = score >= 90 ? 'ممتاز' : (score >= 70 ? 'جيد مع تنبيهات' : (score >= 40 ? 'يحتاج تدخل' : 'حرج'));
        pushEvent(score >= 70 ? 'ok' : 'warn', 'نتيجة التشخيص: ' + score + '% — ' + verdict, {
            ok: score >= 70,
            code: 'diag_result',
            score: score,
            issues: issues
        });
        return {
            score: score,
            verdict: verdict,
            issues: issues,
            snapshot: getSnapshot(),
            health: health
        };
    }

    async function flushPendingNow() {
        pushEvent('info', 'طلب رفع المعلّق الآن', { code: 'flush_start' });
        var ok = false;
        try {
            if (typeof global.nebrasCloudSafetyFlushNow === 'function') {
                ok = !!(await global.nebrasCloudSafetyFlushNow());
            } else if (typeof global.flushPushToNebrasCloud === 'function') {
                ok = !!(await global.flushPushToNebrasCloud({ showCloudToast: true }));
            } else if (typeof global.persistNebrasCriticalStores === 'function' && typeof global.getPendingDirtyStoreKeys === 'function') {
                var keys = global.getPendingDirtyStoreKeys() || [];
                if (keys.length) {
                    ok = !!(await global.persistNebrasCriticalStores(keys, {
                        showToast: true,
                        waitHydrate: true,
                        promptReauth: true
                    }));
                } else {
                    ok = true;
                }
            }
        } catch (e) {
            pushEvent('error', 'فشل الرفع: ' + (e && e.message || e), { ok: false, code: 'flush_error' });
            return false;
        }
        pushEvent(ok ? 'ok' : 'error', ok ? 'اكتمل رفع المعلّق' : 'تعذّر رفع كل المعلّق', {
            ok: ok,
            code: ok ? 'flush_ok' : 'flush_fail'
        });
        return ok;
    }

    global.NebrasCloudDiag = {
        CRITICAL_KEYS: CRITICAL_KEYS,
        log: pushEvent,
        getEvents: getEvents,
        getKeyStatus: getKeyStatus,
        getSnapshot: getSnapshot,
        fetchLiveHealth: fetchLiveHealth,
        runFullDiagnose: runFullDiagnose,
        flushPendingNow: flushPendingNow
    };
    global.nebrasCloudDiagLog = pushEvent;
})(typeof window !== 'undefined' ? window : this);
