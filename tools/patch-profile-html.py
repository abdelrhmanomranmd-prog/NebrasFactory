#!/usr/bin/env python3
import re
import pathlib

p = pathlib.Path(__file__).resolve().parent.parent / 'nebras-company-profile-2026.html'
html = p.read_text(encoding='utf-8')

BGS = [
    'images/hero-slide-01-factory-banner.png',
    'images/background-our-vision.jpg',
    'images/hero-slide-12-factory-national.png',
    'images/hero-slide-05-doors-showcase.png',
    'images/profile-2026/doors/doors-07.jpg',
    'images/profile-2026/doors/doors-11.jpg',
    'images/profile-2026/gallery-extra/gallery-extra-06.jpg',
    'images/profile-2026/doors/doors-09.jpg',
    'images/hero-slide-06-color-catalog.png',
    'images/hero-slide-13-wpc-protection.png',
    'images/nebras-service-manufacturing-bg.png',
    'images/profile-2026/hero-cover.jpg',
    'images/hero-slide-07-quality.png',
    'images/hero-slide-10-kingdom-map.png',
    'images/nebras-branches-coverage-bg.png',
    'images/hero-slide-04-exhibition.png',
    'images/hero-slide-02-wpc-pvc.png',
]
FOOT = (
    '<footer class="bp-page-foot">'
    '<img src="images/nebras-logo.png" alt="نبراس" onerror="this.src=\'images/logo-nebras-mark.png\'">'
    '</footer>'
)
DECO = '<div class="bp-slab-bg"></div><div class="bp-page-deco"></div><div class="bp-watermark"></div>'
TOPBAR_OLD = '<span class="bp-topbar-brand">شركة مصنع نبراس للبلاستيك</span>'
TOPBAR_NEW = (
    '<span class="bp-topbar-brand">'
    '<img src="images/logo-nebras-mark.png" alt="" class="bp-topbar-logo"> '
    'شركة مصنع نبراس للبلاستيك</span>'
)

html = html.replace(TOPBAR_OLD, TOPBAR_NEW)
html = html.replace(
    '<div class="bp-opener-body">',
    '<div class="bp-opener-body"><img class="bp-opener-logo" src="images/logo-nebras-mark.png" alt="نبراس">'
)
html = html.replace(
    '<section class="bp-page bp-page--toc">',
    '<section class="bp-page bp-page--toc bp-page--inner" data-bp-bg="images/profile-2026/hero-cover.jpg">' + DECO
)
html = html.replace(
    '<section class="bp-page bp-page--contact">',
    '<section class="bp-page bp-page--contact bp-page--inner" data-bp-bg="images/hero-slide-03-premium-wpc.png">' + DECO
)

def wrap_img(m):
    return '<div class="bp-img-card">' + m.group(0) + '</div>'

html = re.sub(r'<img src="images/[^"]+" alt="">', wrap_img, html)

bg_i = 0

def patch_section(m):
    global bg_i
    tag = m.group(1)
    if any(x in tag for x in ('bp-page--cover', 'bp-page--opener', 'bp-page--toc', 'bp-page--contact', 'bp-page--back')):
        return m.group(0)
    bg = BGS[bg_i % len(BGS)] if bg_i < len(BGS) else BGS[-1]
    bg_i += 1
    new_tag = tag.replace('class="bp-page"', 'class="bp-page bp-page--inner" data-bp-bg="' + bg + '"')
    return new_tag + DECO

html = re.sub(r'(<section class="bp-page[^"]*">)', patch_section, html)
html = html.replace(DECO + DECO, DECO)

parts = html.split('</section>')
out = []
for part in parts[:-1]:
    chunk = part + '</section>'
    if 'bp-page--inner' in chunk and 'bp-page-foot' not in chunk:
        chunk = chunk.replace('</section>', FOOT + '</section>', 1)
    out.append(chunk)
html = ''.join(out) + parts[-1]

inject = """document.querySelectorAll('.bp-page--inner[data-bp-bg]').forEach(function(pg){
            var bg=pg.getAttribute('data-bp-bg');
            var slab=pg.querySelector('.bp-slab-bg');
            if(slab&&bg) slab.style.backgroundImage=\"url('\"+bg+\"')\";
        });
        """
if 'applyBpBackgrounds' not in html and inject.strip() not in html:
    html = html.replace('document.getElementById', inject + 'document.getElementById', 1)

# Gallery page: add fill class
html = html.replace(
    '<div class="bp-gallery">\n            <div class="bp-img-card">',
    '<div class="bp-gallery bp-gallery--fill">\n            <div class="bp-img-card">',
    1
)

p.write_text(html, encoding='utf-8')
print('OK footers:', html.count('bp-page-foot'), 'img-cards:', html.count('bp-img-card'), 'inner:', html.count('bp-page--inner'))
