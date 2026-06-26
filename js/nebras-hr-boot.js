/**
 * نبراس HR Boot — يضمن ظهور المحتوى واستجابة النقرات حتى لو تأخر التحميل
 */
(function(global) {
    'use strict';

    var bootTicks = 0;
    var maxBootTicks = 120;

    function hasLivePanel() {
        var c = document.getElementById('hr-platform-content');
        if (!c) return false;
        if (global.__hrPanelReady) return true;
        var fallback = c.querySelector('#hr-static-fallback');
        if (fallback) return false;
        return !!(c.querySelector('.hr-panel.is-active, .hr-command-hero, .hr-command-kpi-ring, .hr-emp-grid, .hr-leave-table, .hr-fleet-hub-grid, .hr-editor-overlay'));
    }

    function platformOpen() {
        var el = document.getElementById('hr-platform');
        return !!(el && el.classList.contains('show'));
    }

    function forceHrRender(reason) {
        if (!platformOpen()) return false;
        try {
            if (typeof global.scheduleHrWorkspaceRender === 'function') {
                global.scheduleHrWorkspaceRender(0);
                return true;
            }
            if (typeof global.renderHrPlatformPanelSafe === 'function') {
                global.renderHrPlatformPanelSafe();
                return true;
            }
            if (typeof global.__nebrasHrOpenImpl === 'function') {
                global.__nebrasHrOpenImpl();
                return true;
            }
            if (typeof global.openHrWhenReady === 'function') {
                global.openHrWhenReady(0);
                return true;
            }
        } catch (e) {
            console.error('HR boot render', reason, e);
        }
        return false;
    }

    function bindGlobalHrClicks() {
        if (global.__hrBootClicksBound) return;
        global.__hrBootClicksBound = true;
        document.addEventListener('click', function(ev) {
            if (!platformOpen()) return;
            var tabBtn = ev.target.closest('[data-hr-tab], .hr-tab-btn[data-hr-tab]');
            if (tabBtn) {
                ev.preventDefault();
                ev.stopPropagation();
                var tab = tabBtn.getAttribute('data-hr-tab');
                if (!tab) return;
                if (typeof global.switchHrTab === 'function') {
                    global.switchHrTab(tab);
                } else {
                    forceHrRender('tab-' + tab);
                }
                return;
            }
            var retry = ev.target.closest('[data-hr-retry]');
            if (retry) {
                ev.preventDefault();
                forceHrRender('retry');
            }
        }, true);
    }

    function watchHrPlatform() {
        var root = document.getElementById('hr-platform');
        if (!root || root.__hrBootObserved) return;
        root.__hrBootObserved = true;
        if (typeof MutationObserver === 'undefined') return;
        var obs = new MutationObserver(function() {
            if (platformOpen() && !hasLivePanel()) {
                forceHrRender('mutation');
            }
        });
        obs.observe(root, { attributes: true, attributeFilter: ['class'] });
        var content = document.getElementById('hr-platform-content');
        if (content) obs.observe(content, { childList: true, subtree: true });
    }

    function bootLoop() {
        if (!platformOpen()) return;
        if (hasLivePanel()) {
            bootTicks = maxBootTicks;
            return;
        }
        bootTicks++;
        if (bootTicks <= 8) {
            forceHrRender('loop-' + bootTicks);
            if (typeof global.paintHrWorkspaceShell === 'function') {
                try { global.paintHrWorkspaceShell(); } catch (e) { /* ignore */ }
            }
        }
        if (bootTicks < maxBootTicks && platformOpen() && !hasLivePanel()) {
            setTimeout(bootLoop, bootTicks < 4 ? 400 : 1200);
        }
    }

    function startHrBoot() {
        bindGlobalHrClicks();
        watchHrPlatform();
        if (platformOpen()) bootLoop();
    }

    global.forceHrWorkspaceRender = forceHrRender;
    global.startNebrasHrBoot = startHrBoot;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startHrBoot);
    } else {
        startHrBoot();
    }
    global.addEventListener('load', function() {
        startHrBoot();
        if (platformOpen()) bootLoop();
    });

    /* مراقبة خفيفة — فقط إن لم تُحمَّل اللوحة بعد 10 ثوانٍ */
    setInterval(function() {
        if (!platformOpen() || hasLivePanel() || bootTicks >= maxBootTicks) return;
        if (bootTicks > 0 && bootTicks < 12) forceHrRender('interval');
    }, 5000);
})(typeof window !== 'undefined' ? window : globalThis);
