/**
 * نبراس hrws354 — CSS الإدارة كسول (Accmaa-style)
 * الزائر: CSS storefront فقط · الإدارة: تحميل عند فتح لوحة الدخول أو الجلسة
 */
(function(global) {
    'use strict';

    var VER = 'hrws365';
    var loaded = false;
    var inflight = null;

    var ADMIN_CSS = [
        'css/07-admin-storefront.css',
        'css/08-dashboard-creative.css',
        'css/15-admin-analytics.css',
        'css/27-governance-users.css',
        'css/28-erp-dashboard-shell.css',
        'css/29-scm-professional.css',
        'css/30-platform-settings-audit.css',
        'css/31-cloud-security.css',
        'css/32-executive-reports.css',
        'css/33-product-governance.css',
        'css/34-hr-platform.css',
        'css/35-store-enterprise.css',
        'css/36-executive-bi.css',
        'css/37-admin-enterprise-unified.css',
        'css/38-empire-hub.css',
        'css/39-crm-platform.css',
        'css/40-accounting-platform.css',
        'css/41-governance-dashboard.css',
        'css/43-procurement-platform.css',
        'css/44-dashboard-click-fix.css',
        'css/45-governance-org.css',
        'css/49-platform-integrity.css',
        'css/50-admin-ai.css',
        'css/51-data-warehouse.css',
        'css/54-hr-legal-enterprise.css',
        'css/55-department-unified.css',
        'css/57-aluminum-cutting.css',
        'css/58-wpc-cutting.css',
        'css/59-branch-empire-governance.css',
        'css/60-nebras-dashboard-premium.css',
        'css/66-nebras-navy-white-artistry.css',
        'css/61-nebras-cloud-safety.css',
        'css/63-nebras-odoo-quiet.css',
        'css/68-hq-dashboard-organizer.css',
        'css/70-nebras-rawaq-dashboard.css',
        /* أخيراً: وضوح النص بعد أي إعادة تحميل لثيم السطح الفاتح */
        'css/53-platform-text-readability.css'
    ];

    function withVer(href) {
        return href + (href.indexOf('?') >= 0 ? '&' : '?') + 'v=' + VER;
    }

    function loadOne(href) {
        var existing = Array.prototype.find.call(document.querySelectorAll('link[rel="stylesheet"][href]'), function(link) {
            var raw = String(link.getAttribute('href') || '').split('?')[0];
            return raw === href || raw.slice(-(href.length + 1)) === '/' + href;
        });
        if (existing) return Promise.resolve(true);
        var tagged = document.querySelector('link[data-nebras-admin-css="' + href + '"]');
        if (tagged) return Promise.resolve(true);
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = withVer(href);
        link.setAttribute('data-nebras-admin-css', href);
        return new Promise(function(resolve) {
            link.onload = function() { resolve(true); };
            link.onerror = function() {
                console.warn('[Nebras admin-css] failed:', href);
                resolve(false);
            };
            (document.head || document.documentElement).appendChild(link);
        });
    }

    function ensureNebrasAdminCss() {
        if (loaded) return Promise.resolve(true);
        if (inflight) return inflight;
        inflight = Promise.resolve().then(function() {
            try {
                return Promise.all(ADMIN_CSS.map(loadOne));
            } catch (e) {
                console.warn('[Nebras admin-css]', e);
                return [];
            }
        }).then(function(results) {
            try {
                loaded = true;
                document.body.classList.add('nebras-admin-css-ready');
            } catch (e) {
                console.warn('[Nebras admin-css]', e);
            }
            return results.every(function(ok) { return ok !== false; });
        }).finally(function() {
            inflight = null;
        });
        return inflight;
    }

    function prefetchNebrasAdminCss() {
        if (loaded || inflight) return;
        if (typeof global.nebrasRunWhenIdle === 'function') {
            global.nebrasRunWhenIdle(function() { ensureNebrasAdminCss(); }, 800);
        } else {
            setTimeout(function() { ensureNebrasAdminCss(); }, 400);
        }
    }

    if (typeof document !== 'undefined') {
        document.addEventListener('click', function(ev) {
            var t = ev.target && ev.target.closest
                ? ev.target.closest('[onclick*="openAdminPanel"], [data-nebras-open-admin], #nav-admin-login, .nav-admin-trigger')
                : null;
            if (t) prefetchNebrasAdminCss();
        }, { capture: true, passive: true });
        window.addEventListener('nebras-admin-session', function() {
            ensureNebrasAdminCss();
        });
        try {
            if (localStorage.getItem('nebrasAdminUiSession')) ensureNebrasAdminCss();
        } catch (e) { /* ignore */ }
    }

    global.ensureNebrasAdminCss = ensureNebrasAdminCss;
    global.prefetchNebrasAdminCss = prefetchNebrasAdminCss;
    global.__NEBRAS_ADMIN_CSS__ = VER;
})(typeof window !== 'undefined' ? window : globalThis);
