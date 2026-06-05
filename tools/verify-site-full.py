#!/usr/bin/env python3
"""Full Nebras site audit: i18n keys, partners, celebration, admin paths."""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, 'js', 'nebras-platform.js')
INDEX = os.path.join(ROOT, 'index.html')
ERRORS = []
WARNINGS = []


def err(m):
    ERRORS.append(m)


def warn(m):
    WARNINGS.append(m)


def main():
    with open(JS, encoding='utf-8') as f:
        js = f.read()
    with open(INDEX, encoding='utf-8') as f:
        html = f.read()

    try:
        syntax = subprocess.run(['node', '--check', JS], capture_output=True, text=True, timeout=30)
        if syntax.returncode != 0:
            err('nebras-platform.js has a JavaScript syntax error — site will not load')
            if syntax.stderr:
                err(syntax.stderr.strip().splitlines()[-1])
    except FileNotFoundError:
        warn('node not available — skipped JS syntax check')

    if 'markPartnersMarqueesStatic' in js and ', true)' in js and 'applyPartnersTrack(document.getElementById(\'nebras-partners-track-public-a\'), htmlA, \'\', true)' in js:
        warn('Partners public track forced static')

    for el in ['site-celebration-overlay', 'nebras-partners-section', 'partners-public-title']:
        if el not in html:
            err(f'Missing #{el} in index.html')

    if 'function setLanguage' not in js:
        err('setLanguage missing')
    else:
        sl_start = js.find('function setLanguage')
        sl_end = js.find('\n        function ', sl_start + 20)
        if sl_end < 0:
            sl_end = sl_start + 12000
        set_lang_body = js[sl_start:sl_end]
        for fn in ['renderPartnersMarquees', 'applyOccasionTheme', 'renderAllPublicCatalog']:
            if fn + '(' not in set_lang_body and fn not in ('renderPartnersMarquees',):
                warn(f'setLanguage may not call {fn}')
        if 'renderAllPublicCatalog' not in set_lang_body:
            warn('setLanguage may not call renderAllPublicCatalog')

    if 'submitCartOrQuote' not in js:
        err('submitCartOrQuote missing — optional sales/CS send broken')
    if 'buildQuoteA4WhatsAppMessage' not in js:
        err('buildQuoteA4WhatsAppMessage missing — A4 WhatsApp format broken')
    if 'buildCartOrderWhatsAppMessage' not in js:
        err('buildCartOrderWhatsAppMessage missing — cart order format broken')
    if 'submitQuoteA4Pdf' not in js:
        err('submitQuoteA4Pdf missing — cart A4 PDF send broken')
    if 'captureQuoteA4AsPdfBlob' not in js:
        err('captureQuoteA4AsPdfBlob missing — PDF generation broken')
    if 'quote-daily-stats' in js and "class=\"quote-daily-stats\"" in js[js.find('function renderQuotePreviewDocument'):js.find('function renderQuotePreviewDocument') + 6000]:
        warn('quote-daily-stats still rendered in customer A4 — should be admin-only')
    if 'PRIMARY_GOVERNANCE_USERNAMES' not in js:
        err('PRIMARY_GOVERNANCE_USERNAMES missing')
    for fn in ('manageStoreIconProducts', 'purgeStaleCatalogReferences', 'removeProductReferences', 'toggleSiteProductVisibility'):
        if 'function ' + fn not in js:
            err(f'{fn} missing — admin store governance broken')
    if 'scm-store-icons-list' not in html:
        err('scm-store-icons-list missing — store icon admin panel broken')
    for el in ('fab-send-sales', 'fab-send-cs', 'cart-send-sales-btn', 'cart-send-cs-btn',
               'quote-send-sales-btn', 'quote-send-cs-btn'):
        if el not in html:
            err(f'Missing #{el} in index.html — send channel UI broken')
    if 'buildQuoteFactoryCardHtml' not in js:
        err('buildQuoteFactoryCardHtml missing — A4 quote layout broken')
    if 'buildQuoteHeaderLogoStripHtml' not in js:
        err('buildQuoteHeaderLogoStripHtml missing — A4 header logo strip broken')
    if 'quote-hero-logo' not in open(os.path.join(ROOT, 'css', '04-occasion.css'), encoding='utf-8').read():
        err('quote-hero-logo CSS missing — A4 top logo not styled')
    if "submitQuoteA4Pdf('sales')" not in html:
        err('cart sales icon must call submitQuoteA4Pdf(sales)')
    if 'html2canvas' not in html or 'jspdf' not in html:
        err('html2canvas or jspdf CDN missing — A4 PDF send broken')

    langs = re.findall(r"siteText\s*=\s*\{", js)
    if not langs:
        warn('siteText object not found via regex')

    site_text_start = js.find('const siteText')
    site_text_chunk = js[site_text_start:site_text_start + 500000] if site_text_start >= 0 else js
    for lang in ('ar', 'en', 'zh'):
        if not re.search(r'\b' + lang + r'\s*:\s*\{', site_text_chunk):
            err(f'siteText.{lang} block missing')
    for key in ('partnersPublicTitle', 'heroTitle', 'doorDesignerQuoteBtn'):
        hits = len(re.findall(r'\b' + key + r'\s*:', site_text_chunk))
        if hits < 3:
            warn(f'siteText may lack {key} in all languages (found {hits}/3)')
    for lang in ('ar', 'en', 'zh'):
        if not re.search(r'\b' + lang + r'\s*:\s*\{[\s\S]*?\bnav\s*:\s*\{', site_text_chunk):
            warn(f'siteText.{lang} may lack nav object')

    if 'grayscale(1)' in open(os.path.join(ROOT, 'css', '12-door-designer.css'), encoding='utf-8').read():
        warn('Door designer still uses grayscale(1) — may cause dark preview')

    for fn in ('initHeroSlideshow', 'goHeroSlide', 'preloadHeroSlideImages', 'HERO_SLIDESHOW_DEFAULT',
               'downloadQuoteA4Pdf', 'buildHeroSlideMarkup', 'getHeroSlideHeadlines'):
        if fn not in js:
            err(f'{fn} missing — hero slideshow or quote PDF broken')
    for el in ('cart-download-quote-btn', 'quote-download-pdf-btn'):
        if el not in html:
            err(f'Missing #{el} in index.html — quote PDF download broken')
    hero_slide_paths = re.findall(r"images/hero-slide-\d{2}-[^'\"]+\.png", js)
    if 'WPC يتفوّق على PVC' in js or 'WPC beats PVC' in js:
        warn('Old PVC hero headline still present — should be replaced')
    hero_slide_paths += re.findall(r"images/nebras-door-designer-icon-bg\.png", js)
    for rel in sorted(set(hero_slide_paths)):
        if not os.path.isfile(os.path.join(ROOT, rel.replace('/', os.sep))):
            err(f'Hero slide asset missing: {rel}')
    if 'hero-slideshow' not in html or 'hero-dynamic-headline' not in html:
        err('Hero slideshow markup missing in index.html')
    slide_count = len(re.findall(r"\{ src: 'images/hero-slide-", js))
    if slide_count < 12:
        warn(f'HERO_SLIDESHOW_DEFAULT may have too few slides (found {slide_count})')
    if 'downloadQuoteA4Pdf' not in js or 'cart-download-quote-btn' not in html:
        err('Quote PDF download flow missing')
    for fn in ('submitQuoteA4Pdf', 'captureQuoteA4AsPdfBlob', 'deliverQuoteViaWhatsApp', 'initQuoteCommerceHandlers'):
        if fn not in js:
            err(f'{fn} missing — quote PDF send/cart flow broken')

    print('=== NEBRAS FULL SITE AUDIT ===')
    print(f'ERRORS: {len(ERRORS)}')
    for e in ERRORS:
        print(f'  ERROR: {e}')
    print(f'WARNINGS: {len(WARNINGS)}')
    for w in WARNINGS:
        print(f'  WARN: {w}')
    if ERRORS:
        print('RESULT: FAILED')
        sys.exit(1)
    print('RESULT: PASS (review warnings)')
    sys.exit(0)


if __name__ == '__main__':
    main()
