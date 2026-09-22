/**
 * نبراس hrws362 — CSS ميزات ثقيلة كسول (زائر أسرع)
 * باب المصمم · بوابة العميل · عرض السعر A4 — تُحمَّل عند الحاجة أو Idle
 */
(function(global) {
    'use strict';

    var VER = 'hrws362';
    var loaded = {};

    var FEATURES = {
        doorDesigner: ['css/12-door-designer.css'],
        portal: ['css/42-customer-portal.css'],
        quoteA4: ['css/19-quote-official-a4.css']
    };

    function withVer(href) {
        return href + (href.indexOf('?') >= 0 ? '&' : '?') + 'v=' + VER;
    }

    function loadOne(href) {
        var existing = Array.prototype.find.call(document.querySelectorAll('link[rel="stylesheet"][href]'), function(link) {
            var raw = String(link.getAttribute('href') || '').split('?')[0];
            return raw === href || raw.slice(-(href.length + 1)) === '/' + href;
        });
        if (existing) return Promise.resolve(true);
        var tag = 'data-nebras-feature-css';
        if (document.querySelector('link[' + tag + '="' + href + '"]')) return Promise.resolve(true);
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = withVer(href);
        link.setAttribute(tag, href);
        return new Promise(function(resolve) {
            link.onload = function() { resolve(true); };
            link.onerror = function() { resolve(false); };
            (document.head || document.documentElement).appendChild(link);
        });
    }

    function ensureNebrasFeatureCss(feature) {
        var list = FEATURES[feature];
        if (!list || !list.length) return Promise.resolve(true);
        if (loaded[feature]) return Promise.resolve(true);
        return Promise.all(list.map(loadOne)).then(function(results) {
            loaded[feature] = results.every(function(ok) { return ok !== false; });
            return loaded[feature];
        });
    }

    function prefetchHeavyFeatureCss() {
        ['doorDesigner', 'portal', 'quoteA4'].forEach(function(name) {
            ensureNebrasFeatureCss(name);
        });
    }

    if (typeof document !== 'undefined') {
        document.addEventListener('click', function(ev) {
            var t = ev.target && ev.target.closest ? ev.target.closest(
                '[onclick*="door-designer"], [onclick*="DoorDesigner"], #header-aside-doors, ' +
                '#nav-customer-portal, [data-nebras-open-portal], .customer-portal-trigger, ' +
                '[onclick*="print"], [onclick*="Quote"], [onclick*="quote"]'
            ) : null;
            if (!t) return;
            var html = (t.getAttribute('onclick') || '') + (t.id || '') + (t.className || '');
            if (/door|Door|aside-doors/.test(html)) ensureNebrasFeatureCss('doorDesigner');
            if (/portal|Portal/.test(html)) ensureNebrasFeatureCss('portal');
            if (/quote|Quote|print|Print/.test(html)) ensureNebrasFeatureCss('quoteA4');
        }, { capture: true, passive: true });

        function idlePrefetch() {
            if (typeof global.nebrasRunWhenIdle === 'function') {
                global.nebrasRunWhenIdle(prefetchHeavyFeatureCss, 2500);
            } else {
                setTimeout(prefetchHeavyFeatureCss, 3500);
            }
        }
        if (document.readyState === 'complete') idlePrefetch();
        else window.addEventListener('load', idlePrefetch);
    }

    global.ensureNebrasFeatureCss = ensureNebrasFeatureCss;
    global.prefetchNebrasFeatureCss = prefetchHeavyFeatureCss;
})(typeof window !== 'undefined' ? window : globalThis);
