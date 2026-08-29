/**
 * نبراس hrws305 — CSS الإدارة كسول (Accmaa-style)
 * الزائر: CSS storefront فقط · الإدارة: تحميل عند فتح لوحة الدخول أو الجلسة
 */
(function(global) {
    'use strict';

    var VER = 'hrws305';
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
        'css/63-nebras-odoo-quiet.css'
    ];

    function withVer(href) {
        return href + (href.indexOf('?') >= 0 ? '&' : '?') + 'v=' + VER;
    }

    function loadOne(href) {
        if (document.querySelector('link[data-nebras-admin-css="' + href + '"]')) return;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = withVer(href);
        link.setAttribute('data-nebras-admin-css', href);
        (document.head || document.documentElement).appendChild(link);
    }

    function ensureNebrasAdminCss() {
        if (loaded) return Promise.resolve(true);
        if (inflight) return inflight;
        inflight = new Promise(function(resolve) {
            try {
                ADMIN_CSS.forEach(loadOne);
                loaded = true;
                document.body.classList.add('nebras-admin-css-ready');
            } catch (e) {
                console.warn('[Nebras admin-css]', e);
            }
            resolve(true);
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
