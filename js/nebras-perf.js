/**
 * نبراس — أدوات الأداء (Accmaa-style · hrws274)
 * تأجيل العمل غير الحرج · perf-lite للجوال · فحص API خفيف
 */
(function(global) {
    'use strict';

    global.nebrasRunWhenIdle = function(fn, timeout) {
        if (typeof requestIdleCallback === 'function') {
            return requestIdleCallback(fn, { timeout: timeout || 2200 });
        }
        return setTimeout(fn, 64);
    };

    global.nebrasDefer = function(fn, ms) {
        return setTimeout(fn, ms == null ? 0 : ms);
    };

    let finalRenderLock = false;
    global.nebrasFinalRenderOnce = function(fn) {
        if (finalRenderLock) return;
        finalRenderLock = true;
        try { fn(); } finally {
            global.nebrasDefer(function() { finalRenderLock = false; }, 420);
        }
    };

    function shouldUseNebrasPerfLite() {
        if (!global.matchMedia) return false;
        if (global.matchMedia('(max-width: 900px)').matches) return true;
        if (global.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn) {
            if (conn.saveData) return true;
            if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') return true;
        }
        return false;
    }

    function applyPerfLite() {
        if (shouldUseNebrasPerfLite()) document.body.classList.add('perf-lite');
    }
    if (document.body) applyPerfLite();
    else document.addEventListener('DOMContentLoaded', applyPerfLite, { once: true });

    let apiOnlineCache = null;
    let apiOnlineAt = 0;
    const API_ONLINE_TTL_MS = 45000;

    global.isNebrasApiOnline = function(options) {
        options = options || {};
        const force = !!options.force;
        const now = Date.now();
        if (!force && apiOnlineCache !== null && (now - apiOnlineAt) < API_ONLINE_TTL_MS) {
            return Promise.resolve(apiOnlineCache);
        }
        const timeoutMs = options.timeoutMs || 8000;
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = controller ? setTimeout(function() { controller.abort(); }, timeoutMs) : null;
        const url = (options.deep ? '/api/health?deep=1' : '/api/health?ping=1') + '&t=' + now;
        return fetch(url, {
            method: 'GET',
            cache: 'no-store',
            credentials: 'same-origin',
            signal: controller ? controller.signal : undefined
        }).then(function(res) {
            if (timer) clearTimeout(timer);
            return res.json().catch(function() { return {}; }).then(function(body) {
                const ok = !!(res.ok && body && body.ok !== false);
                apiOnlineCache = ok;
                apiOnlineAt = Date.now();
                return ok;
            });
        }).catch(function() {
            if (timer) clearTimeout(timer);
            apiOnlineCache = false;
            apiOnlineAt = Date.now();
            return false;
        });
    };

    global.clearNebrasApiOnlineCache = function() {
        apiOnlineCache = null;
        apiOnlineAt = 0;
    };

})(typeof window !== 'undefined' ? window : globalThis);
