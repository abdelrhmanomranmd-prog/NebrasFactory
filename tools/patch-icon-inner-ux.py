# -*- coding: utf-8 -*-
from pathlib import Path

JS = Path(__file__).resolve().parent.parent / "js" / "nebras-platform.js"
CSS = Path(__file__).resolve().parent.parent / "css" / "05-products-cards.css"

js = JS.read_text(encoding="utf-8")

start = js.find("        function openVisitorCatalogHub(icon) {")
end = js.find("\n        function openSiteProduct", start)
new_hub = """        function openVisitorCatalogHub(icon, productsOverride) {
            const lang = currentLang || 'ar';
            const ui = siteText[lang] || siteText.ar;
            const products = (productsOverride && productsOverride.length)
                ? productsOverride
                : getProductsForVisitorIcon(icon);
            if (!products.length) {
                alert(ui.catalogHubEmpty || 'لا توجد منتجات — أضيفيها من إدارة المحتوى.');
                return;
            }
            const gridHtml = buildIconInnerHubHtml(products, lang);
            const title = icon ? getVisitorIconDisplayTitle(icon) : (ui.catalogHubTitle || 'كتالوج منتجات نبراس');
            const detail = icon ? (lang === 'en' ? (icon.textEn || icon.textAr) : lang === 'zh' ? (icon.textZh || icon.textAr) : (icon.textAr || icon.textEn)) : '';
            const body = (detail || ui.catalogHubIntro || 'مدخل عالم نبراس — اختر المنتج لرؤية الصورة والشرح والأصناف والأسعار.') +
                '\\n\\n' + products.length + ' ' + (ui.catalogHubCount || 'منتج');
            let primary = { type: 'none', value: '' };
            if (icon) {
                const tg = String(icon.target || '').trim();
                if (tg.startsWith('#')) primary = { type: 'scroll', value: tg };
                else if (/^https?:\\/\\//i.test(tg)) primary = { type: 'external', value: tg };
            }
            showRichIconOverlay(title, body, [], primary, icon ? (icon.documents || []) : [], {
                mode: 'browse',
                variantsHtml: gridHtml,
                innerLayout: 'hub'
            });
        }"""
js = js[:start] + new_hub + js[end:]

start = js.find("        function openVisitorIcon(iconId) {")
end = js.find("\n        function renderVisitorIcons()", start)
new_icon = """        function openVisitorIcon(iconId) {
            const icon = visitorIcons.find(item => item.id === iconId);
            if (!icon) return;
            const lang = currentLang || 'ar';
            const ui = siteText[lang] || siteText.ar;
            const exp = getCatalogExperience(icon);

            if (exp === 'link') {
                const tg = String(icon.target || '').trim();
                if (tg.startsWith('#')) scrollToSection(tg);
                else if (/^https?:\\/\\//i.test(tg)) window.open(tg, '_blank', 'noopener,noreferrer');
                return;
            }

            const linkedProducts = getProductsForVisitorIcon(icon);
            if (linkedProducts.length === 1) {
                openProductCatalog(linkedProducts[0].id);
                return;
            }
            if (linkedProducts.length > 1) {
                openVisitorCatalogHub(icon, linkedProducts);
                return;
            }

            let albumUrls = getVisitorIconAlbumUrls(icon);
            const detailText = lang === 'en'
                ? (icon.textEn || icon.textAr || '')
                : lang === 'zh'
                    ? (icon.textZh || icon.textAr || icon.textEn || '')
                    : (icon.textAr || icon.textEn || '');
            const caption = getVisitorTargetCaption(icon);
            let body = (detailText || caption) + '\\n\\n' + (ui.visitorOverlayIntro || ui.iconInnerSectionIntro || 'استعرض معرض هذا القسم — المحتوى من لوحة الإدارة.');
            let primary = { type: 'none', value: '' };
            const tg = String(icon.target || '').trim();
            if (tg.startsWith('#')) primary = { type: 'scroll', value: tg };
            else if (/^https?:\\/\\//i.test(tg)) primary = { type: 'external', value: tg };
            showRichIconOverlay(getVisitorIconDisplayTitle(icon), body, albumUrls, primary, icon.documents || [], {
                mode: exp === 'shop' ? 'shop' : 'browse',
                innerLayout: 'section'
            });
        }"""
js = js[:start] + new_icon + js[end:]

old = """            const overlay = document.getElementById('icon-overlay');
            if (overlay) overlay.classList.add('show');
        }"""
new = """            const overlay = document.getElementById('icon-overlay');
            const modal = overlay ? overlay.querySelector('.icon-detail-modal') : null;
            if (modal) {
                modal.classList.remove('icon-inner-hub', 'icon-inner-product-detail', 'icon-inner-section');
                const layout = opts.innerLayout || '';
                if (layout === 'hub') modal.classList.add('icon-inner-hub');
                else if (layout === 'product-detail') modal.classList.add('icon-inner-product-detail');
                else if (layout === 'section') modal.classList.add('icon-inner-section');
            }
            if (overlay) overlay.classList.add('show');
        }"""
if old in js:
    js = js.replace(old, new, 1)

if "visitorQuickWpcDoors" not in js:
    js = js.replace(
        "                ]\n            }\n        ];",
        "                ]\n            },\n            {\n                id: 5,\n                titleKey: 'visitorQuickWpcDoors',\n                title: 'أبواب WPC',\n                iconClass: 'fas fa-door-closed',\n                visitorMode: 'browse',\n                target: '#doors',\n                album: ['images/wpc-background.avif', 'images/wpc-background.jpg']\n            },\n            {\n                id: 6,\n                titleKey: 'visitorQuickAluminum',\n                title: 'الألومنيوم',\n                iconClass: 'fas fa-industry',\n                visitorMode: 'browse',\n                target: '#aluminum',\n                album: ['images/aluminum-background.webp']\n            }\n        ];",
        1,
    )

i18n = [
    ("visitorQuickBankAccounts: 'حسابات شركة مصنع نبراس البنكية',",
     "visitorQuickBankAccounts: 'حسابات شركة مصنع نبراس البنكية',\n                visitorQuickWpcDoors: 'أبواب WPC',\n                visitorQuickAluminum: 'الألومنيوم',"),
    ("catalogHubPick: 'اختر المنتج — صورة · شرح · سعر',",
     "catalogHubPick: 'اختر المنتج — صورة · شرح · سعر',\n                iconInnerOpenProduct: 'عرض التفاصيل والأصناف',\n                iconInnerProductIntro: 'صورة المنتج وشرحه — ثم الأنواع والمقاسات والألوان والأسعار أدناه.',\n                iconInnerSectionIntro: 'استعرض معرض هذا القسم — المحتوى من لوحة الإدارة.',"),
    ("visitorQuickBankAccounts: 'Nebras bank accounts',",
     "visitorQuickBankAccounts: 'Nebras bank accounts',\n                visitorQuickWpcDoors: 'WPC doors',\n                visitorQuickAluminum: 'Aluminum',"),
    ("catalogHubPick: 'Choose a product — image · details · price',",
     "catalogHubPick: 'Choose a product — image · details · price',\n                iconInnerOpenProduct: 'View details & variants',\n                iconInnerProductIntro: 'Product image and description — then types, sizes, colors and prices below.',\n                iconInnerSectionIntro: 'Browse this section gallery — content from admin.',"),
    ("visitorQuickBankAccounts: 'Nebras 银行账户',",
     "visitorQuickBankAccounts: 'Nebras 银行账户',\n                visitorQuickWpcDoors: 'WPC 门',\n                visitorQuickAluminum: '铝制品',"),
    ("catalogHubPick: '选择产品 — 图片 · 说明 · 价格',",
     "catalogHubPick: '选择产品 — 图片 · 说明 · 价格',\n                iconInnerOpenProduct: '查看详情与规格',\n                iconInnerProductIntro: '产品图片与说明 — 下方为类型、尺寸、颜色与价格。',\n                iconInnerSectionIntro: '浏览本板块图库 — 内容由管理后台维护。',"),
]
for old_s, new_s in i18n:
    idx = js.find(old_s)
    if idx >= 0 and "iconInnerOpenProduct" not in js[idx:idx + 280]:
        js = js.replace(old_s, new_s, 1)

JS.write_text(js, encoding="utf-8")
print("JS patched")

css = CSS.read_text(encoding="utf-8")
if "icon-inner-product-detail" not in css:
    css += """

/* —— عالم داخلي للأيقونات: صورة ثم شرح أسفلها */
.icon-detail-modal.icon-inner-hub .icon-overlay-gallery,
.icon-detail-modal.icon-inner-product-detail .icon-overlay-gallery {
    display: none !important;
}

.icon-inner-products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
    max-height: none;
    overflow: visible;
    padding: 2px 0 10px;
}

.icon-inner-product-card {
    display: flex;
    flex-direction: column;
    text-align: start;
    background: rgba(255, 255, 255, 0.07);
    border-radius: 14px;
    overflow: hidden;
}

.icon-inner-product-card .icon-inner-product-media img {
    width: 100%;
    height: 168px;
    object-fit: cover;
    display: block;
}

.icon-inner-product-card .icon-inner-product-media .variant-no-img {
    height: 168px;
    font-size: 2rem;
}

.icon-inner-product-body {
    padding: 12px 14px 14px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.icon-inner-product-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 800;
    line-height: 1.35;
}

.icon-inner-product-desc {
    margin: 0;
    font-size: 0.86rem;
    line-height: 1.55;
    opacity: 0.9;
    min-height: auto;
    max-height: none;
    display: block;
}

.catalog-hub-card .catalog-hub-desc.icon-inner-product-desc {
    min-height: auto;
}

.icon-inner-product-price {
    margin: 4px 0 0;
    font-weight: 800;
}

.icon-inner-product-cta {
    margin-top: auto;
    padding-top: 8px;
    font-size: 0.82rem;
    opacity: 0.85;
    color: #7dd3fc;
}

.icon-inner-product-detail {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.icon-inner-detail-hero img {
    width: 100%;
    max-height: min(340px, 42vh);
    object-fit: cover;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.14);
}

.icon-inner-detail-title {
    margin: 4px 0 0;
    font-size: 1.15rem;
    font-weight: 800;
}

.icon-inner-detail-desc {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.65;
    white-space: pre-wrap;
}

.icon-inner-detail-thumbs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.icon-inner-detail-thumbs img {
    width: 72px;
    height: 72px;
    object-fit: cover;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
}

.icon-detail-modal.icon-inner-product-detail .icon-overlay-text {
    font-size: 0.88rem;
    opacity: 0.85;
}

@media (max-width: 640px) {
    .icon-inner-products-grid {
        grid-template-columns: 1fr;
    }
}
"""
    CSS.write_text(css, encoding="utf-8")
    print("CSS patched")
