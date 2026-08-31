/**
 * نبراس — تحميل كسول لوحدات الإدارات (hrws317)
 * فتح فوري + prefetch ذكي حسب الدور — بدون إثقال الزائر.
 */
(function (global) {
    'use strict';

    var VER = 'hrws317';
    var loaded = Object.create(null);
    var inflight = Object.create(null);
    var bundleDone = Object.create(null);
    var bundleWait = Object.create(null);
    var prefetchStarted = false;
    var priorityLoaded = false;

    var BUNDLES = {
        adminCore: [
            'js/nebras-odoo-write.js',
            'js/nebras-cloud-safety.js'
        ],
        aluminum: ['js/nebras-aluminum-cutting.js'],
        wpc: ['js/nebras-wpc-cutting.js'],
        hr: [
            'js/nebras-hr-hcm-suite.js',
            'js/nebras-hr-advances.js',
            'js/nebras-hr-violations.js',
            'js/nebras-hr-gps-tracker.js',
            'js/nebras-hr-companies.js',
            'js/nebras-hr-platform.js',
            'js/nebras-hr-boot.js'
        ],
        legal: [
            'js/nebras-legal-platform.js',
            'js/nebras-legal-dispatch.js'
        ],
        crm: ['js/nebras-crm-platform.js'],
        accounting: ['js/nebras-accounting-platform.js'],
        empire: [
            'js/nebras-erp-command-center.js',
            'js/nebras-empire-bridges.js',
            'js/nebras-empire-hub.js'
        ],
        adminTools: [
            'js/nebras-launch-health.js',
            'js/nebras-admin-ai.js',
            'js/nebras-site-database.js',
            'js/nebras-data-warehouse.js',
            'js/nebras-media-admin.js'
        ],
        visitor: [
            'js/nebras-mobile-app.js',
            'js/nebras-order-journey.js'
        ],
        portal: ['js/nebras-customer-portal.js'],
        platformAdminErp: ['js/nebras-platform-admin-erp.js']
    };

    /** ترتيب التحميل — الأخف أولاً؛ aluminum ثقيل (~2MB) دائماً آخر */
    var PREFETCH_LIGHT = ['wpc', 'crm', 'legal', 'accounting', 'adminTools', 'empire'];
    var PREFETCH_HEAVY = ['hr', 'aluminum'];

    var STUBS = [
        { name: 'openAluminumCutting', bundle: 'aluminum' },
        { name: 'openWpcCutting', bundle: 'wpc' },
        { name: 'openLegalPlatform', bundle: 'legal' },
        { name: 'openCrmPlatform', bundle: 'crm' },
        { name: 'openAccountingPlatform', bundle: 'accounting' },
        { name: 'openNebrasEmpireHub', bundle: 'empire' },
        { name: 'openNebrasAdminAi', bundle: 'adminTools' },
        { name: 'openNebrasDataWarehouse', bundle: 'adminTools' },
        { name: 'openNebrasEmpireBridges', bundle: 'empire' },
        { name: 'openPlatformIntegrationHub', bundle: 'empire' },
        { name: 'openCustomerPortalLogin', bundle: 'portal' },
        { name: 'openCustomerPortalGovernance', bundle: 'portal' },
        { name: 'openCustomerLoyaltyAnalytics', bundle: 'portal' },
        { name: 'resumeCustomerPortalAfterBootstrap', bundle: 'portal' }
    ];

    function withVer(path) {
        if (!path) return path;
        return path + (path.indexOf('?') >= 0 ? '&' : '?') + 'v=' + VER;
    }

    function loadScriptOnce(path) {
        if (loaded[path]) return Promise.resolve();
        if (inflight[path]) return inflight[path];
        inflight[path] = new Promise(function (resolve, reject) {
            var existing = document.querySelector('script[data-nebras-lazy="' + path + '"]');
            if (existing) {
                if (loaded[path]) {
                    resolve();
                    return;
                }
                existing.addEventListener('load', function () {
                    loaded[path] = true;
                    delete inflight[path];
                    resolve();
                });
                existing.addEventListener('error', function () {
                    delete inflight[path];
                    reject(new Error('lazy-script-fail:' + path));
                });
                return;
            }
            var s = document.createElement('script');
            s.src = withVer(path);
            s.async = true;
            s.setAttribute('data-nebras-lazy', path);
            s.onload = function () {
                loaded[path] = true;
                delete inflight[path];
                resolve();
            };
            s.onerror = function () {
                delete inflight[path];
                reject(new Error('lazy-script-fail:' + path));
            };
            (document.head || document.documentElement).appendChild(s);
        });
        return inflight[path];
    }

    function loadBundle(name) {
        if (bundleDone[name]) return Promise.resolve(true);
        if (bundleWait[name]) return bundleWait[name];
        var list = BUNDLES[name] || [];
        bundleWait[name] = list.reduce(function (chain, path) {
            return chain.then(function () { return loadScriptOnce(path); });
        }, Promise.resolve()).then(function () {
            bundleDone[name] = true;
            delete bundleWait[name];
            return true;
        }).catch(function (err) {
            delete bundleWait[name];
            throw err;
        });
        return bundleWait[name];
    }

    function ensureNebrasDeptBundle(name) {
        return loadBundle(name);
    }

    function showDeptLoadingHint() {
        if (typeof global.showNebrasAdminToast === 'function') {
            global.showNebrasAdminToast('⏳ جاري فتح الوحدة…', 'ok');
        }
    }

    function installStub(entry) {
        var fnName = entry.name;
        var bundle = entry.bundle;
        var current = global[fnName];
        if (typeof current === 'function' && !current.__nebrasLazyStub) return;

        function stub() {
            var args = arguments;
            var self = stub;
            if (!bundleDone[bundle]) showDeptLoadingHint();
            return ensureNebrasDeptBundle(bundle).then(function () {
                var real = global[fnName];
                if (typeof real === 'function' && real !== self) {
                    return real.apply(global, args);
                }
                if (typeof global.showNebrasAdminToast === 'function') {
                    global.showNebrasAdminToast('تعذّر تحميل الوحدة — أعيدي المحاولة', 'warn');
                }
                return null;
            }).catch(function (err) {
                console.error('[Nebras lazy]', fnName, err);
                if (typeof global.showNebrasAdminToast === 'function') {
                    global.showNebrasAdminToast('تعذّر تحميل الوحدة — تحققي من الاتصال', 'err');
                } else {
                    alert('تعذّر تحميل الوحدة — تحققي من الاتصال وأعيدي المحاولة.');
                }
                return null;
            });
        }
        stub.__nebrasLazyStub = true;
        global[fnName] = stub;
    }

    function installAllStubs() {
        STUBS.forEach(installStub);
    }

    function adminPrefetchQueue() {
        var admin = typeof global.currentAdmin !== 'undefined' ? global.currentAdmin : null;
        var role = admin && admin.role ? admin.role : '';
        if (role === 'aluminum_manager') {
            return ['aluminum', 'wpc'];
        }
        if (role === 'wpc_manager' || role === 'production_manager') {
            return ['wpc', 'crm'];
        }
        if (role === 'superadmin' || role === 'manager') {
            return PREFETCH_LIGHT.concat(PREFETCH_HEAVY);
        }
        return ['wpc', 'crm', 'legal'];
    }

    function priorityBundleForRole() {
        var q = adminPrefetchQueue();
        return q.length ? q[0] : 'wpc';
    }

    function prefetchBundlesParallel(names) {
        (names || []).forEach(function (name) {
            if (!name || bundleDone[name]) return;
            loadBundle(name).catch(function () { /* soft */ });
        });
    }

    function prefetchBundlesSequentialHeavy(names) {
        if (!names || !names.length) return;
        var i = 0;
        function next() {
            if (i >= names.length) return;
            var name = names[i++];
            loadBundle(name).catch(function () { /* soft */ }).then(function () {
                var gap = name === 'aluminum' ? 5000 : name === 'hr' ? 3500 : 1000;
                setTimeout(next, gap);
            });
        }
        next();
    }

    function prefetchNebrasAdminDepts() {
        if (prefetchStarted) return;
        if (document.visibilityState === 'hidden') return;
        prefetchStarted = true;
        var queue = adminPrefetchQueue();
        var priority = queue[0];
        var light = queue.filter(function (n) { return PREFETCH_LIGHT.indexOf(n) >= 0 && n !== priority; });
        var heavy = queue.filter(function (n) { return PREFETCH_HEAVY.indexOf(n) >= 0; });

        loadBundle(priority).catch(function () { /* soft */ }).then(function () {
            setTimeout(function () {
                prefetchBundlesParallel(light);
                setTimeout(function () {
                    prefetchBundlesSequentialHeavy(heavy);
                }, 1200);
            }, 400);
        });
    }

    function prefetchPriorityImmediately() {
        if (priorityLoaded) return;
        priorityLoaded = true;
        var name = priorityBundleForRole();
        loadBundle(name).catch(function () { /* soft */ });
    }

    function schedulePrefetch() {
        window.addEventListener('nebras-admin-session', function () {
            ensureNebrasDeptBundle('adminCore').catch(function () { /* soft */ }).then(function () {
                loadBundle('portal').catch(function () { /* soft */ });
                prefetchPriorityImmediately();
                function startFullPrefetch() {
                    setTimeout(function () {
                        if (typeof requestIdleCallback === 'function') {
                            requestIdleCallback(prefetchNebrasAdminDepts, { timeout: 9000 });
                        } else {
                            setTimeout(prefetchNebrasAdminDepts, 2000);
                        }
                    }, 1200);
                }
                if (typeof global.waitForNebrasCloudHydrate === 'function') {
                    global.waitForNebrasCloudHydrate().then(startFullPrefetch).catch(startFullPrefetch);
                } else {
                    startFullPrefetch();
                }
            });
        });
    }

    installAllStubs();
    schedulePrefetch();

    function scheduleVisitorBundleWarmup() {
        function warm() {
            if (document.visibilityState === 'hidden') return;
            loadBundle('visitor').catch(function() { /* soft */ });
        }
        if (typeof global.nebrasRunWhenIdle === 'function') {
            global.nebrasRunWhenIdle(warm, 12000);
        } else {
            setTimeout(warm, 8000);
        }
        document.addEventListener('click', function(ev) {
            var t = ev.target && ev.target.closest ? ev.target.closest('#nav-customer-portal, [data-nebras-open-portal], .customer-portal-trigger') : null;
            if (t) loadBundle('portal').catch(function() { /* soft */ });
        }, { capture: true, passive: true });
        try {
            if (localStorage.getItem('nebrasCustomerPortalSession')) {
                loadBundle('portal').catch(function() { /* soft */ });
            }
        } catch (cpHint) { /* ignore */ }
    }
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', scheduleVisitorBundleWarmup, { once: true });
        } else {
            scheduleVisitorBundleWarmup();
        }
    }

    global.ensureNebrasDeptBundle = ensureNebrasDeptBundle;
    global.prefetchNebrasAdminDepts = prefetchNebrasAdminDepts;
    global.ensureNebrasVisitorBundle = function() { return loadBundle('visitor'); };
    global.ensureNebrasPortalBundle = function() { return loadBundle('portal'); };
    global.ensureNebrasPlatformAdminErp = function() { return loadBundle('platformAdminErp'); };
    global.ensureNebrasAdminCoreBundle = function() { return loadBundle('adminCore'); };
    global.__NEBRAS_DEPT_LAZY__ = VER;
})(typeof window !== 'undefined' ? window : globalThis);
