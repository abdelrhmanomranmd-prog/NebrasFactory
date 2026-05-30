# -*- coding: utf-8 -*-
"""Insert dashboard v1 (partners + certifications) into nebras-platform.js"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "js" / "nebras-platform.js"
text = JS.read_text(encoding="utf-8")

# 1) variables
text = text.replace(
    "        let siteCustomSections = [];\n        let nebrasCart = [];",
    "        let siteCustomSections = [];\n        let sitePartners = [];\n        let siteCertifications = [];\n        let nebrasCart = [];",
    1,
)

# 2) default dashboard tile
old_tile = "            { id: 'dash-about-pages', zone: 'quick', sortOrder: 0.2,"
new_tile = (
    "            { id: 'dash-certs', zone: 'quick', sortOrder: 0.15, iconClass: 'fas fa-award', titleIcon: 'fas fa-certificate', titleAr: 'اعتمادات وشهادات نبراس', titleEn: 'Nebras Certifications', titleZh: '认证与证书', textAr: 'جميع شهادات واعتمادات المصنع — صور وPDF مع شرح تحت كل وثيقة.', textEn: 'Factory certificates and accreditations with captions.', textZh: '工厂认证与证书。', backgroundImage: '', cssClass: 'dashboard-tile-card--certs', handler: 'openCertificationsHub', permission: 'content', visible: true },\n"
    "            { id: 'dash-about-pages', zone: 'quick', sortOrder: 0.2,"
)
if old_tile in text:
    text = text.replace(old_tile, new_tile, 1)

# 3) handlers
text = text.replace(
    "            scrollErpHub: function() { scrollErpHub(); },",
    "            scrollErpHub: function() { scrollErpHub(); },\n"
    "            openCertificationsHub: function() { openCertificationsHub(); },\n"
    "            openPartnersAdmin: function() { openSiteContentManager(); switchScmTab('partners'); },",
    1,
)

# 4) cloud specs
text = text.replace(
    "            { key: 'erp_procurement', get: function() { return erpProcurement; }, set: function(v) { erpProcurement = Array.isArray(v) ? v : []; } }\n        ];",
    "            { key: 'erp_procurement', get: function() { return erpProcurement; }, set: function(v) { erpProcurement = Array.isArray(v) ? v : []; } },\n"
    "            { key: 'site_partners', get: function() { return sitePartners; }, set: function(v) { sitePartners = Array.isArray(v) ? v : []; } },\n"
    "            { key: 'site_certifications', get: function() { return siteCertifications; }, set: function(v) { siteCertifications = Array.isArray(v) ? v : []; } }\n"
    "        ];",
    1,
)

# 5) save/load
text = text.replace(
    "            localStorage.setItem('nebrasAboutPages', JSON.stringify(aboutPages));\n            schedulePushToNebrasCloud();",
    "            localStorage.setItem('nebrasAboutPages', JSON.stringify(aboutPages));\n"
    "            localStorage.setItem('nebrasSitePartners', JSON.stringify(sitePartners));\n"
    "            localStorage.setItem('nebrasSiteCertifications', JSON.stringify(siteCertifications));\n"
    "            schedulePushToNebrasCloud();",
    1,
)

if "nebrasSitePartners" not in text.split("function loadSystemData")[1][:4000]:
    text = text.replace(
        "            const savedAboutPages = localStorage.getItem('nebrasAboutPages');",
        "            const savedAboutPages = localStorage.getItem('nebrasAboutPages');\n"
        "            const savedSitePartners = localStorage.getItem('nebrasSitePartners');\n"
        "            const savedSiteCertifications = localStorage.getItem('nebrasSiteCertifications');",
        1,
    )
    text = text.replace(
        "            if (savedAboutPages) {\n                try {\n                    aboutPages = JSON.parse(savedAboutPages);",
        "            if (savedSitePartners) {\n                try { sitePartners = JSON.parse(savedSitePartners); } catch (e) { console.warn('Partners parse error', e); }\n            }\n"
        "            if (savedSiteCertifications) {\n                try { siteCertifications = JSON.parse(savedSiteCertifications); } catch (e) { console.warn('Certifications parse error', e); }\n            }\n"
        "            if (savedAboutPages) {\n                try {\n                    aboutPages = JSON.parse(savedAboutPages);",
        1,
    )

# 6) finalize
text = text.replace(
    "            ensureBuiltinVisitorIcons();",
    "            ensureBuiltinVisitorIcons();\n            ensureBuiltinDashboardTiles();\n            if (!Array.isArray(sitePartners)) sitePartners = [];\n            if (!Array.isArray(siteCertifications)) siteCertifications = [];",
    1,
)

INSERT_MARKER = "        /* === NEBRAS DASHBOARD V1 (partners + certifications) === */"
if INSERT_MARKER not in text:
    block = Path(__file__).with_name("dashboard-v1-block.js").read_text(encoding="utf-8")
    anchor = "        function renderDashboardTiles() {"
    if anchor not in text:
        raise SystemExit("anchor not found")
    text = text.replace(anchor, block + "\n" + anchor, 1)

# 7) replace renderDashboardTiles body - find and replace whole function
import re
pat = r"        function renderDashboardTiles\(\) \{[\s\S]*?\n        \}\n\n        function openCustomSectionItem"
m = re.search(pat, text)
if m:
    new_fn = Path(__file__).with_name("dashboard-v1-render.js").read_text(encoding="utf-8")
    text = text[: m.start()] + new_fn + "\n\n        function openCustomSectionItem" + text[m.end() - len("        function openCustomSectionItem") :]
else:
    print("WARN: renderDashboardTiles pattern not matched")

# 8) renderAllPublicCatalog
text = text.replace(
    "            renderAboutCards(currentLang || 'ar');\n            if (currentAdmin) renderDashboardTiles();",
    "            renderAboutCards(currentLang || 'ar');\n            renderPartnersMarquees();\n            if (currentAdmin) renderDashboardTiles();",
    1,
)

# 9) openSiteContentManager
text = text.replace(
    "            displayAboutPagesAdmin();\n            document.getElementById('site-content-management').classList.add('show');",
    "            displayAboutPagesAdmin();\n            displayPartnersAdmin();\n            displayCertificationsAdmin();\n            document.getElementById('site-content-management').classList.add('show');",
    1,
)

# 10) showRichIconOverlay certifications layout + grid html
text = text.replace(
    "                else if (layout === 'section') modal.classList.add('icon-inner-section');",
    "                else if (layout === 'section') modal.classList.add('icon-inner-section');\n"
    "                else if (layout === 'certifications') modal.classList.add('icon-inner-certifications');",
    1,
)
text = text.replace(
    "            const imgs = (imageUrls || []).filter(Boolean);\n            if (gallery) {",
    "            const imgs = (imageUrls || []).filter(Boolean);\n"
    "            if (gallery && opts.innerLayout === 'certifications' && opts.certificationsHtml) {\n"
    "                gallery.classList.remove('grid-empty');\n"
    "                gallery.classList.add('nebras-cert-grid');\n"
    "                gallery.innerHTML = opts.certificationsHtml;\n"
    "                gallery.style.display = 'grid';\n"
    "            } else if (gallery) {",
    1,
)

# 11) applyLanguage partners titles
text = text.replace(
    "            setElementText('quick-services-subtitle', text.quickServicesSubtitle);",
    "            setElementText('quick-services-subtitle', text.quickServicesSubtitle);\n"
    "            setElementText('partners-public-title', text.partnersPublicTitle || 'شركاؤنا');\n"
    "            setElementText('partners-public-subtitle', text.partnersPublicSubtitle || '');\n"
    "            setElementText('dashboard-partners-title', text.dashboardPartnersTitle || 'شركاؤنا');\n"
    "            setElementText('dashboard-hub-intro-title', text.dashboardHubIntroTitle || '');\n"
    "            setElementText('dashboard-hub-intro-text', text.dashboardHubIntroText || '');",
    1,
)

# 12) i18n in siteText.ar - find siteText = { ar:
if "partnersPublicTitle" not in text:
    text = text.replace(
        "                quickServicesSubtitle: 'الأيقونات الخارجية والألبومات تدار من داخل لوحة الإدارة.',",
        "                quickServicesSubtitle: 'الأيقونات الخارجية والألبومات تدار من داخل لوحة الإدارة.',\n"
        "                partnersPublicTitle: 'شركاؤنا',\n"
        "                partnersPublicSubtitle: 'شركاء نجاح مصنع نبراس — يُضافون من الإدارة',\n"
        "                dashboardPartnersTitle: 'شركاؤنا',\n"
        "                dashboardHubIntroTitle: 'مركز التحكم — نبراس',\n"
        "                dashboardHubIntroText: 'اختر أيقونة للانتقال: كل أيقونة تفتح محتواها. الشركاء يظهرون متحركين في الموقع والداشبورد.',\n"
        "                certsOverlayTitle: 'اعتمادات وشهادات نبراس',\n"
        "                certsOverlayIntro: 'شهادات واعتمادات مصنع نبراس — اضغط على PDF لفتحه.',",
        1,
    )

# 13) visitor icon certifications (public)
if "visitorQuickCertifications" not in text:
    text = text.replace(
        "                album: ['images/nebras-bank-accounts.jpg',\n"
        "                    'images/nebras-bank-accounts.png',\n"
        "                    'images/nebras-bank-accounts.webp'\n"
        "                ]\n"
        "            }\n"
        "        ];",
        "                album: ['images/nebras-bank-accounts.jpg',\n"
        "                    'images/nebras-bank-accounts.png',\n"
        "                    'images/nebras-bank-accounts.webp'\n"
        "                ]\n"
        "            },\n"
        "            {\n"
        "                id: 7,\n"
        "                titleKey: 'visitorQuickCertifications',\n"
        "                title: 'اعتمادات وشهادات نبراس',\n"
        "                iconClass: 'fas fa-award',\n"
        "                visitorMode: 'browse',\n"
        "                openHandler: 'certifications',\n"
        "                target: '',\n"
        "                album: ['images/background-quality-managment.jpeg']\n"
        "            }\n"
        "        ];",
        1,
    )
if "visitorQuickCertifications:" not in text:
    text = text.replace(
        "                visitorQuickBankAccounts: 'حسابات شركة مصنع نبراس البنكية',",
        "                visitorQuickBankAccounts: 'حسابات شركة مصنع نبراس البنكية',\n"
        "                visitorQuickCertifications: 'اعتمادات وشهادات نبراس',",
        1,
    )
if "icon.openHandler === 'certifications'" not in text:
    text = text.replace(
        "            const exp = getCatalogExperience(icon);\n\n            if (exp === 'link') {",
        "            if (icon.openHandler === 'certifications') {\n                openCertificationsHub();\n                return;\n            }\n            const exp = getCatalogExperience(icon);\n\n            if (exp === 'link') {",
        1,
    )

JS.write_text(text, encoding="utf-8")
print("OK: nebras-platform.js patched")
