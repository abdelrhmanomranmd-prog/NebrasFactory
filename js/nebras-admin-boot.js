/**
 * نبراس hrws311 — boot موحّد للإدارة (Accmaa-style)
 * CSS · adminCore · portal · ERP UI · inits — ترتيب واحد دقيق
 */
(function(global) {
    'use strict';

    var VER = 'hrws311';
    var inflight = null;

    function bootNebrasAdminSession(options) {
        options = options || {};
        if (inflight) return inflight;
        inflight = (async function() {
            const tasks = [];
            if (typeof global.ensureNebrasAdminCss === 'function') {
                tasks.push(global.ensureNebrasAdminCss().catch(function(e) {
                    console.warn('[admin-boot] css', e);
                }));
            }
            if (typeof global.ensureNebrasAdminCoreBundle === 'function') {
                tasks.push(global.ensureNebrasAdminCoreBundle().catch(function(e) {
                    console.warn('[admin-boot] adminCore', e);
                }));
            }
            if (options.withPortal !== false && typeof global.ensureNebrasPortalBundle === 'function') {
                tasks.push(global.ensureNebrasPortalBundle().catch(function(e) {
                    console.warn('[admin-boot] portal', e);
                }));
            }
            if (options.withErp !== false && typeof global.ensureNebrasPlatformAdminErp === 'function') {
                tasks.push(global.ensureNebrasPlatformAdminErp().catch(function(e) {
                    console.warn('[admin-boot] erp ui', e);
                }));
            }
            await Promise.all(tasks);
            if (typeof global.bindAdminPlatformInits === 'function') {
                try { global.bindAdminPlatformInits(); } catch (initErr) {
                    console.warn('[admin-boot] inits', initErr);
                }
            }
            try {
                global.dispatchEvent(new CustomEvent('nebras-admin-boot-ready', { detail: { ver: VER } }));
            } catch (evErr) { /* ignore */ }
            return true;
        })().finally(function() {
            inflight = null;
        });
        return inflight;
    }

    function prefetchNebrasAdminBoot() {
        if (typeof global.nebrasRunWhenIdle === 'function') {
            global.nebrasRunWhenIdle(function() {
                bootNebrasAdminSession({ withPortal: false }).catch(function() { /* soft */ });
            }, 600);
        }
    }

    if (typeof document !== 'undefined') {
        document.addEventListener('click', function(ev) {
            var t = ev.target && ev.target.closest
                ? ev.target.closest('[onclick*="openAdminPanel"], [data-nebras-open-admin], #nav-admin-login, .nav-admin-trigger, #nav-admin')
                : null;
            if (t) prefetchNebrasAdminBoot();
        }, { capture: true, passive: true });
    }

    global.bootNebrasAdminSession = bootNebrasAdminSession;
    global.prefetchNebrasAdminBoot = prefetchNebrasAdminBoot;
    global.__NEBRAS_ADMIN_BOOT__ = VER;
})(typeof window !== 'undefined' ? window : globalThis);
