#!/usr/bin/env python3
"""Split nebras-platform-i18n.js into ar bootstrap + lazy en/zh (hrws275)."""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'js', 'nebras-platform-i18n.js')
JS = os.path.join(ROOT, 'js')

text = open(SRC, encoding='utf-8').read()

# Extract locale blocks from `var siteText = { ar: {...}, en: {...}, zh: {...} };`
m = re.search(r'var siteText = \{\s*ar:\s*(\{.*?\}),\s*en:\s*(\{.*?\}),\s*zh:\s*(\{.*?\})\s*\};', text, re.S)
if not m:
    raise SystemExit('Could not parse siteText locales')

ar_block, en_block, zh_block = m.group(1), m.group(2), m.group(3)

bootstrap = '''/**
 * نبراس hrws275 — i18n: العربية فوراً · EN/ZH كسول عند تغيير اللغة
 * يُحمَّل بعد nebras-platform.js (NEBRAS_BRAND_* · getNebrasBrand*)
 */
(function(global) {
    'use strict';

    var VER = 'hrws275';
    var localeInflight = Object.create(null);
    var localeLoaded = { ar: true };

    global.siteText = {
        ar: %s
    };

    function loadLocaleScript(lang) {
        return new Promise(function(resolve, reject) {
            if (global.document && global.document.querySelector('script[data-nebras-i18n="' + lang + '"]')) {
                resolve(true);
                return;
            }
            var s = global.document.createElement('script');
            s.src = 'js/nebras-platform-i18n-' + lang + '.js?v=' + VER;
            s.defer = true;
            s.setAttribute('data-nebras-i18n', lang);
            s.onload = function() { resolve(true); };
            s.onerror = function() { reject(new Error('locale-load-' + lang)); };
            (global.document.head || global.document.documentElement).appendChild(s);
        });
    }

    global.ensureNebrasLocale = function(lang) {
        lang = String(lang || 'ar').toLowerCase();
        if (lang === 'ar' || localeLoaded[lang]) return Promise.resolve(true);
        if (localeInflight[lang]) return localeInflight[lang];
        localeInflight[lang] = loadLocaleScript(lang).then(function() {
            localeLoaded[lang] = true;
            return !!(global.siteText && global.siteText[lang]);
        }).catch(function(err) {
            console.warn('[Nebras i18n]', lang, err);
            return false;
        }).finally(function() {
            delete localeInflight[lang];
        });
        return localeInflight[lang];
    };

    global.__NEBRAS_I18N__ = VER;
})(typeof window !== 'undefined' ? window : globalThis);
''' % ar_block

en_js = '''/**
 * نبراس hrws275 — siteText.en (lazy)
 */
(function(global) {
    'use strict';
    if (!global.siteText) global.siteText = {};
    global.siteText.en = %s;
})(typeof window !== 'undefined' ? window : globalThis);
''' % en_block

zh_js = '''/**
 * نبراس hrws275 — siteText.zh (lazy)
 */
(function(global) {
    'use strict';
    if (!global.siteText) global.siteText = {};
    global.siteText.zh = %s;
})(typeof window !== 'undefined' ? window : globalThis);
''' % zh_block

open(os.path.join(JS, 'nebras-platform-i18n.js'), 'w', encoding='utf-8', newline='\n').write(bootstrap)
open(os.path.join(JS, 'nebras-platform-i18n-en.js'), 'w', encoding='utf-8', newline='\n').write(en_js)
open(os.path.join(JS, 'nebras-platform-i18n-zh.js'), 'w', encoding='utf-8', newline='\n').write(zh_js)

for name in ['nebras-platform-i18n.js', 'nebras-platform-i18n-en.js', 'nebras-platform-i18n-zh.js']:
    path = os.path.join(JS, name)
    print(name, '->', os.path.getsize(path), 'bytes')
