/**
 * مركز الملف التعريفي الكامل 2026 — يعرض البروفايل بالكامل ويربط كل قسم بأيقونته
 */
(function(global) {
    'use strict';

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function img(folder, n) {
        return 'images/profile-2026/' + folder + '/' + folder + '-' + String(n).padStart(2, '0') + '.jpg';
    }

    function galleryExtra(n) {
        return 'images/profile-2026/gallery-extra/gallery-extra-' + String(n).padStart(2, '0') + '.jpg';
    }

    function isEn(lang) { return lang === 'en'; }

    const GALLERY_SECTIONS = [
        { id: 'doors', showroomKey: 'doors', folder: 'doors', count: 12, num: '04', icon: 'fas fa-door-open', titleAr: 'أبواب نبراس', titleEn: 'Nebras Doors' },
        { id: 'cabinets', showroomKey: 'cabinets', folder: 'cabinets', count: 20, num: '05', icon: 'fas fa-archive', titleAr: 'خزائن نبراس', titleEn: 'Nebras Cabinets' },
        { id: 'wpcDoors', showroomKey: 'wpcDoors', folder: 'gallery-extra', extraStart: 1, extraEnd: 24, count: 24, num: '06', icon: 'fas fa-door-closed', titleAr: 'أبواب WPC', titleEn: 'WPC Doors' },
        { id: 'wpcCabinets', showroomKey: 'wpcCabinets', folder: 'gallery-extra', extraStart: 25, extraEnd: 47, count: 23, num: '07', icon: 'fas fa-boxes-stacked', titleAr: 'خزائن WPC', titleEn: 'WPC Cabinets' },
        { id: 'cnc', showroomKey: 'cnc', folder: 'cnc', count: 15, num: '08', icon: 'fas fa-cogs', titleAr: 'قطع CNC', titleEn: 'CNC Parts' }
    ];

    function getProfileHubData(lang) {
        const en = isEn(lang);
        return {
            cover: {
                badge: en ? 'NHC · SASO · ISO · Approved Supplier' : 'مورد معتمد NHC · SASO · ISO',
                saudi: en ? '100% Saudi Made' : 'صناعة وطنية 100%',
                title: en ? 'Nebras Plastic Factory' : 'مصنع نبراس للبلاستيك',
                subtitle: 'NEBRAS PLASTIC FACTORY · EST. 2018 · QASSIM, SAUDI ARABIA',
                desc: en
                    ? 'Leaders in premium WPC doors — combining composite durability with natural wood aesthetics. Serving thousands across KSA since 2018.'
                    : 'رائدون في تصنيع أبواب WPC عالية الجودة — نجمع بين متانة البلاستيك المركّب وجماليات الخشب الطبيعي. شركة سعودية تخدم آلاف العملاء منذ 2018.',
                stats: [
                    { val: '2018', label: en ? 'Founded' : 'تأسست' },
                    { val: '1,250+', label: en ? 'Approved contractors' : 'مقاول وشركة معتمدة' },
                    { val: '3', label: en ? 'ISO certificates' : 'شهادات ISO' },
                    { val: '10', label: en ? 'Years warranty' : 'ضمان سنوات' }
                ],
                hero: 'images/profile-2026/hero-cover.jpg'
            },
            productTypes: [
                { id: 'flat', title: en ? 'Flat WPC Doors' : 'أبواب سادة — فلات', desc: en ? 'Smooth modern surface — ideal for housing projects.' : 'درف WPC ملساء بتصميم عصري نظيف — الخيار الأمثل للمشاريع الحديثة والإسكانية.', tags: en ? ['Flat', 'Modern', 'Water resistant'] : ['فلات', 'عصري', 'مقاوم للماء'], icon: 'fas fa-square' },
                { id: 'uchannel', title: en ? 'U-Channel Frame Doors' : 'أبواب إيطارات يوتشانيل', desc: en ? 'Advanced U-channel frames — acoustic & thermal insulation.' : 'درف WPC بإطارات يوتشانيل المتطورة — إحكام تام وعزل صوتي وحراري ممتاز.', tags: en ? ['U-Channel', 'Sealed', 'Insulation'] : ['يوتشانيل', 'إحكام', 'عزل'], icon: 'fas fa-border-all' },
                { id: 'slats', title: en ? 'Slats Doors' : 'أبواب شرائح', desc: en ? 'Elegant horizontal slats for modern and classic décor.' : 'درف WPC بتصميم شرائح أفقية أنيقة — تناسب الديكورات الحديثة والكلاسيكية.', tags: en ? ['Slats', 'Distinctive', 'WPC'] : ['شرائح', 'مميز', 'WPC'], icon: 'fas fa-grip-lines' },
                { id: 'classic', title: en ? 'Classic & Glass' : 'أبواب كلاسيك وزجاج', desc: en ? 'Luxury classic design with distinctive glass panels.' : 'درف WPC كلاسيكي فاخر مع إطارات زجاجية — فخامة تقليدية وأداء حديث.', tags: en ? ['Classic', 'Glass', 'WPC'] : ['كلاسيك', 'زجاج', 'WPC'], icon: 'fas fa-columns' }
            ],
            coverage: {
                title: en ? 'Where to find us' : 'أين تجدنا — التغطية الجغرافية',
                hq: en ? 'Unaizah — HQ · Qassim' : 'عنيزة — المقر الرئيسي',
                cities: ['الرياض', 'جدة', 'الدمام', 'الطائف', 'عسير', 'جازان', 'حائل', 'القصيم', 'المدينة المنورة', 'تبوك', 'نجران', 'الباحة', 'الجوف', 'حفر الباطن', 'الإحساء']
            },
            datasheet: {
                title: en ? 'Technical Data Sheet' : 'المواصفات التقنية — Data Sheet',
                materials: [
                    { key: 'PVC Resin', ar: 'راتنج PVC — البوليمر الأساسي' },
                    { key: 'CaCO₃', ar: 'كربونات الكالسيوم — للصلابة' },
                    { key: 'Wooden Fiber', ar: 'ألياف خشبية — مسحوق الخشب' },
                    { key: 'Additives', ar: 'أصباغ وعوامل ترابط PE · PP · PVC' }
                ],
                features: en
                    ? ['Eco-Friendly & Recyclable', 'High-quality colorants', 'Coupling agents']
                    : ['صديق للبيئة وقابل لإعادة التدوير', 'أصباغ عالية الجودة', 'عوامل ترابط متقدمة']
            },
            sections: [
                { id: 'about', num: '01', icon: 'fas fa-industry', titleAr: 'من نحن', titleEn: 'About Us', action: "openAboutPage('who')", iconRef: 'about' },
                { id: 'vision', num: '02', icon: 'fas fa-eye', titleAr: 'الرؤية والرسالة', titleEn: 'Vision & Mission', action: "openAboutPage('vision')", iconRef: 'about' },
                { id: 'products', num: '03', icon: 'fas fa-door-open', titleAr: 'تشكيلة أبواب WPC', titleEn: 'WPC Product Range', action: "openNebrasWorkspace({pillar:'store',view:'catalog-all'})", iconRef: 'store-8-9' },
                { id: 'doors', num: '04', icon: 'fas fa-door-open', titleAr: 'أبواب نبراس', titleEn: 'Nebras Doors', action: "openShowroomHub('doors')", iconRef: 'showroom' },
                { id: 'cabinets', num: '05', icon: 'fas fa-archive', titleAr: 'خزائن نبراس', titleEn: 'Nebras Cabinets', action: "openShowroomHub('cabinets')", iconRef: 'showroom' },
                { id: 'wpcDoors', num: '06', icon: 'fas fa-door-closed', titleAr: 'أبواب WPC', titleEn: 'WPC Doors', action: "openShowroomHub('wpcDoors')", iconRef: 'showroom' },
                { id: 'wpcCabinets', num: '07', icon: 'fas fa-boxes-stacked', titleAr: 'خزائن WPC', titleEn: 'WPC Cabinets', action: "openShowroomHub('wpcCabinets')", iconRef: 'showroom' },
                { id: 'cnc', num: '08', icon: 'fas fa-cogs', titleAr: 'قطع CNC', titleEn: 'CNC Parts', action: "openShowroomHub('cnc')", iconRef: 'showroom' },
                { id: 'strengths', num: '09', icon: 'fas fa-star', titleAr: 'نقاط قوة المنتج', titleEn: 'Product Strengths', action: "openCompanyProfileSection('strengths')", iconRef: 'profile' },
                { id: 'certs', num: '10', icon: 'fas fa-award', titleAr: 'الشهادات والاعتمادات', titleEn: 'Certifications', action: "openNebrasWorkspace({pillar:'showroom',view:'certifications'})", iconRef: 'icon-7' },
                { id: 'projects', num: '11', icon: 'fas fa-building', titleAr: 'المشاريع الكبرى', titleEn: 'Major Projects', action: "openShowroomHub('projects')", iconRef: 'showroom' },
                { id: 'coverage', num: '12', icon: 'fas fa-map-marked-alt', titleAr: 'التغطية الجغرافية', titleEn: 'Geographic Coverage', action: "openNebrasWorkspace({pillar:'platform',view:'branches'})", iconRef: 'icon-2' },
                { id: 'datasheet', num: '13', icon: 'fas fa-flask', titleAr: 'المواصفات الفنية', titleEn: 'Technical Specs', action: "openCompanyProfileSection('datasheet')", iconRef: 'profile' },
                { id: 'banks', num: '14', icon: 'fas fa-building-columns', titleAr: 'الحسابات البنكية', titleEn: 'Bank Accounts', action: "openVisitorIcon(4)", iconRef: 'icon-4' }
            ]
        };
    }

    function buildGalleryStripFromFolder(folder, count, label) {
        let html = '<div class="cph-gallery-strip">';
        for (let i = 1; i <= Math.min(count, 6); i++) {
            const src = img(folder, i);
            html += '<img src="' + esc(src) + '" data-full-src="' + esc(src) + '" alt="' + esc(label) + '" loading="lazy" decoding="async">';
        }
        if (count > 6) {
            html += '<span class="cph-gallery-more">+' + (count - 6) + '</span>';
        }
        html += '</div>';
        return html;
    }

    function buildGalleryStripFromExtra(start, end, label) {
        let html = '<div class="cph-gallery-strip">';
        const total = end - start + 1;
        let shown = 0;
        for (let i = start; i <= end && shown < 6; i++, shown++) {
            const src = galleryExtra(i);
            html += '<img src="' + esc(src) + '" data-full-src="' + esc(src) + '" alt="' + esc(label) + '" loading="lazy" decoding="async">';
        }
        if (total > 6) {
            html += '<span class="cph-gallery-more">+' + (total - 6) + '</span>';
        }
        html += '</div>';
        return html;
    }

    function buildGallerySectionHtml(sec, en) {
        const title = en ? sec.titleEn : sec.titleAr;
        const action = "openShowroomHub('" + sec.showroomKey + "')";
        let strip = '';
        if (sec.extraStart != null) {
            strip = buildGalleryStripFromExtra(sec.extraStart, sec.extraEnd, title);
        } else {
            strip = buildGalleryStripFromFolder(sec.folder, sec.count, title);
        }
        return '<section class="cph-section" id="cph-' + sec.id + '">' +
            '<div class="cph-section-head"><span class="cph-section-num">' + sec.num + '</span><h3>' + esc(title) + '</h3>' +
            '<button type="button" class="cph-open-icon" onclick="' + action + '"><i class="' + sec.icon + '"></i> ' +
            esc(en ? 'Open Gallery (' + sec.count + ')' : 'فتح المعرض (' + sec.count + ')') + '</button></div>' +
            strip + '</section>';
    }

    function buildCompanyProfileHubHtml(lang, activeSection) {
        const en = isEn(lang);
        const d = getProfileHubData(lang);
        const ui = (typeof siteText !== 'undefined' && siteText[lang]) ? siteText[lang] : {};
        const strengths = (global.NEBRAS_PROFILE_2026 && global.NEBRAS_PROFILE_2026.customSection && global.NEBRAS_PROFILE_2026.customSection.items) || [];

        let nav = '<nav class="cph-nav" aria-label="' + esc(en ? 'Profile sections' : 'أقسام الملف التعريفي') + '">';
        d.sections.forEach(function(sec) {
            const t = en ? sec.titleEn : sec.titleAr;
            nav += '<button type="button" class="cph-nav-btn" onclick="openCompanyProfileSection(\'' + sec.id + '\')">' +
                '<span class="cph-nav-num">' + sec.num + '</span>' + esc(t) + '</button>';
        });
        nav += '</nav>';

        let html = '<div class="company-profile-hub" id="company-profile-hub">';

        html += '<header class="cph-cover" id="cph-cover">' +
            '<div class="cph-cover-bg" style="background-image:url(\'' + esc(d.cover.hero) + '\')"></div>' +
            '<div class="cph-cover-overlay"></div>' +
            '<div class="cph-cover-content">' +
            '<img class="cph-cover-logo" src="images/logo.png" alt="Nebras" onerror="if(typeof siteLogoImgFallback===\'function\')siteLogoImgFallback(this)">' +
            '<p class="cph-cover-badge"><span class="cph-dot"></span>' + esc(d.cover.badge) + '</p>' +
            '<p class="cph-cover-saudi">🇸🇦 ' + esc(d.cover.saudi) + '</p>' +
            '<h2 class="cph-cover-title">' + esc(d.cover.title) + '</h2>' +
            '<p class="cph-cover-sub">' + esc(d.cover.subtitle) + '</p>' +
            '<p class="cph-cover-desc">' + esc(d.cover.desc) + '</p>' +
            '<div class="cph-stats">' + d.cover.stats.map(function(s) {
                return '<div class="cph-stat"><strong>' + esc(s.val) + '</strong><span>' + esc(s.label) + '</span></div>';
            }).join('') + '</div></div></header>';

        html += nav;

        html += '<section class="cph-section" id="cph-about">' +
            '<div class="cph-section-head"><span class="cph-section-num">01</span><h3>' + esc(en ? 'About Us' : 'من نحن') + '</h3>' +
            '<button type="button" class="cph-open-icon" onclick="openAboutPage(\'who\')"><i class="fas fa-external-link-alt"></i> ' + esc(en ? 'Open in About' : 'فتح في من نحن') + '</button></div>' +
            '<p class="cph-section-text">' + esc(ui.aboutText1 || (en ? 'Leading Saudi WPC manufacturer since 2018.' : 'شركة سعودية رائدة في أبواب WPC منذ 2018.')) + '</p>' +
            buildGalleryStripFromFolder('doors', 3, 'about') + '</section>';

        html += '<section class="cph-section" id="cph-vision">' +
            '<div class="cph-section-head"><span class="cph-section-num">02</span><h3>' + esc(en ? 'Vision & Mission' : 'الرؤية والرسالة') + '</h3>' +
            '<button type="button" class="cph-open-icon" onclick="openAboutPage(\'vision\')"><i class="fas fa-external-link-alt"></i> ' + esc(en ? 'Open Vision' : 'فتح الرؤية') + '</button></div>' +
            '<p class="cph-section-text">' + esc(ui.aboutText2 || '') + '</p></section>';

        html += '<section class="cph-section" id="cph-products">' +
            '<div class="cph-section-head"><span class="cph-section-num">03</span><h3>' + esc(en ? 'WPC Door Range' : 'تشكيلة أبواب WPC') + '</h3>' +
            '<button type="button" class="cph-open-icon" onclick="openNebrasWorkspace({pillar:\'store\',view:\'catalog-all\'})"><i class="fas fa-store"></i> ' + esc(en ? 'Open Store' : 'فتح المتجر') + '</button></div>' +
            '<div class="cph-product-types">' + d.productTypes.map(function(p) {
                return '<article class="cph-product-card"><i class="' + esc(p.icon) + '" aria-hidden="true"></i><h4>' + esc(p.title) + '</h4><p>' + esc(p.desc) + '</p>' +
                    '<div class="cph-tags">' + p.tags.map(function(t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div></article>';
            }).join('') + '</div></section>';

        GALLERY_SECTIONS.forEach(function(sec) {
            html += buildGallerySectionHtml(sec, en);
        });

        html += '<section class="cph-section" id="cph-strengths">' +
            '<div class="cph-section-head"><span class="cph-section-num">09</span><h3>' + esc(en ? 'Why Nebras WPC?' : 'لماذا تختار أبواب نبراس WPC؟') + '</h3></div>' +
            '<div class="cph-strengths-grid">' + strengths.map(function(s) {
                return '<div class="cph-strength"><i class="' + esc(s.iconClass || 'fas fa-check') + '"></i><strong>' + esc(en ? (s.titleEn || s.titleAr) : s.titleAr) + '</strong><span>' + esc(en ? (s.textEn || s.textAr) : s.textAr) + '</span></div>';
            }).join('') + '</div></section>';

        html += '<section class="cph-section" id="cph-certs">' +
            '<div class="cph-section-head"><span class="cph-section-num">10</span><h3>' + esc(en ? 'Certifications' : 'الشهادات والاعتمادات') + '</h3>' +
            '<button type="button" class="cph-open-icon" onclick="openNebrasWorkspace({pillar:\'showroom\',view:\'certifications\'})"><i class="fas fa-award"></i> ' + esc(en ? 'Open Certifications' : 'فتح الشهادات') + ' (6)</button></div>' +
            '<div class="cph-cert-chips">' +
            '<span>ISO 9001</span><span>ISO 14001</span><span>ISO 45001</span><span>SASO COC</span><span>NHC Zone C</span><span>NHC Zone D</span></div></section>';

        html += '<section class="cph-section" id="cph-projects">' +
            '<div class="cph-section-head"><span class="cph-section-num">11</span><h3>' + esc(en ? 'Major Projects' : 'اعتمادات المشاريع الكبرى') + '</h3>' +
            '<button type="button" class="cph-open-icon" onclick="openShowroomHub(\'projects\')"><i class="fas fa-building"></i> ' + esc(en ? 'Open Projects' : 'فتح المشاريع') + '</button></div>' +
            '<ul class="cph-project-list">' +
            '<li>NHC · المشرقية Zone D · أبان — B Approved · مايو 2025</li>' +
            '<li>NHC · المشرقية Zone C · مشراف المدائن — يناير 2025</li>' +
            '<li>NHC · Zone C · Achieve Ultimate — نوفمبر 2024</li>' +
            '<li>فيلا كود WPC · Material-00378 — Under Process</li></ul></section>';

        html += '<section class="cph-section" id="cph-coverage">' +
            '<div class="cph-section-head"><span class="cph-section-num">12</span><h3>' + esc(d.coverage.title) + '</h3>' +
            '<button type="button" class="cph-open-icon" onclick="openNebrasWorkspace({pillar:\'platform\',view:\'branches\'})"><i class="fas fa-map-marked-alt"></i> ' + esc(en ? 'Branches' : 'الفروع') + '</button></div>' +
            '<p class="cph-hq"><i class="fas fa-star"></i> ' + esc(d.coverage.hq) + '</p>' +
            '<div class="cph-cities">' + d.coverage.cities.map(function(c) { return '<span>' + esc(c) + '</span>'; }).join('') + '</div></section>';

        html += '<section class="cph-section' + (activeSection === 'datasheet' ? ' is-highlight' : '') + '" id="cph-datasheet">' +
            '<div class="cph-section-head"><span class="cph-section-num">13</span><h3>' + esc(d.datasheet.title) + '</h3></div>' +
            '<div class="cph-datasheet-grid">' + d.datasheet.materials.map(function(m) {
                return '<div class="cph-ds-item"><strong>' + esc(m.key) + '</strong><span>' + esc(en ? m.key : m.ar) + '</span></div>';
            }).join('') + '</div>' +
            '<p class="cph-ds-features">' + d.datasheet.features.map(esc).join(' · ') + '</p></section>';

        html += '<section class="cph-section" id="cph-banks">' +
            '<div class="cph-section-head"><span class="cph-section-num">14</span><h3>' + esc(en ? 'Official Bank IBANs' : 'الحسابات البنكية الرسمية') + '</h3>' +
            '<button type="button" class="cph-open-icon" onclick="openVisitorIcon(4)"><i class="fas fa-building-columns"></i> ' + esc(en ? 'Open Banks' : 'فتح الحسابات') + '</button></div>' +
            '<p class="cph-section-text">' + esc(en ? 'Commercial Register: 1128185177' : 'السجل التجاري: 1128185177') + '</p>' +
            '<div class="cph-bank-note">' + esc(en ? 'SNB · Al Rajhi · Riyad Bank — full IBANs in bank accounts section.' : 'البنك الأهلي · الراجحي · الرياض — أرقام الآيبان الكاملة في أيقونة الحسابات البنكية.') + '</div></section>';

        html += '<footer class="cph-footer">' +
            '<p>' + esc(en ? 'Complete Company Profile 2025–2026 · Nebras Plastic Factory · Vision 2030' : 'الملف التعريفي المتكامل 2025–2026 · مصنع نبراس للبلاستيك · رؤية المملكة 2030') + '</p>' +
            '<div class="cph-footer-badges">ISO 9001 · ISO 14001 · ISO 45001 · SASO · NHC · 10 Years Warranty</div></footer>';

        html += '</div>';
        return html;
    }

    function openCompanyProfileHub() {
        if (typeof openNebrasWorkspace === 'function') {
            openNebrasWorkspace({ pillar: 'platform', view: 'company-profile' });
        }
    }

    function openCompanyProfileSection(sectionId) {
        if (typeof openNebrasWorkspace === 'function') {
            openNebrasWorkspace({ pillar: 'platform', view: 'company-profile', sectionId: sectionId || '' });
        }
        requestAnimationFrame(function() {
            setTimeout(function() {
                const el = document.getElementById('cph-' + sectionId) || document.getElementById('company-profile-hub');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 120);
        });
    }

    global.getProfileHubData = getProfileHubData;
    global.buildCompanyProfileHubHtml = buildCompanyProfileHubHtml;
    global.openCompanyProfileHub = openCompanyProfileHub;
    global.openCompanyProfileSection = openCompanyProfileSection;
})(typeof window !== 'undefined' ? window : globalThis);
