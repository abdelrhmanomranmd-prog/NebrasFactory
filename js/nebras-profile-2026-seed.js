/**
 * بذرة محتوى الملف التعريفي 2026 — github.io/NIBRAS-FACTORY-PROFILE-2026
 * تُدمج في finalizePlatformDataAfterLoad عبر applyNebrasProfile2026Seed()
 */
(function(global) {
    'use strict';

    const PROFILE_2026_SEED_VERSION = 4;
    const PROFILE_STORAGE_KEY = 'nebrasProfile2026SeedVersion';

    function img(folder, n) {
        return 'images/profile-2026/' + folder + '/' + folder + '-' + String(n).padStart(2, '0') + '.jpg';
    }

    function galleryExtra(n) {
        return 'images/profile-2026/gallery-extra/gallery-extra-' + String(n).padStart(2, '0') + '.jpg';
    }

    const PROFILE_2026 = {
        siteTextPatch: {
            ar: {
                pageTitle: 'مصنع نبراس للبلاستيك | منصة نبراس الرسمية — أبواب WPC',
                pageDescription: 'رائدون في تصنيع أبواب WPC عالية الجودة منذ 2018 — مورد معتمد NHC · SASO · ISO. شركة سعودية من القصيم تخدم آلاف العملاء في أنحاء المملكة.',
                introEyebrow: 'مورد معتمد NHC · SASO · ISO',
                introTagline: 'رائدون في تصنيع أبواب WPC — نجمع بين متانة البلاستيك المركّب وجماليات الخشب الطبيعي',
                heroEyebrow: 'NEBRAS PLASTIC FACTORY · EST. 2018',
                heroHeadline: 'مصنع نبراس للبلاستيك',
                heroTaglineShort: 'شركة سعودية متخصصة في أبواب WPC عالية الجودة — من القصيم إلى كل المملكة منذ عام 2018',
                heroDynamicHeadlines: [
                    'مصنع نبراس للبلاستيك',
                    'أبواب WPC — جودة سعودية معتمدة',
                    'مورد رسمي NHC · SASO · ISO'
                ],
                heroStatWarrantyVal: '10',
                heroStatWarranty: 'سنوات ضمان',
                heroStatInstallVal: '1,250+',
                heroStatInstall: 'مقاول وشركة معتمدة',
                heroStatYearsVal: '2018',
                heroStatYears: 'سنة التأسيس',
                trustItem1Title: 'مورد معتمد',
                trustItem1Sub: 'NHC · SASO · ISO',
                trustItem2Title: 'صناعة وطنية',
                trustItem2Sub: '100% Saudi Made',
                trustItem3Title: '3 شهادات ISO',
                trustItem3Sub: 'جودة دولية معتمدة',
                trustItem4Title: 'ضمان 10 سنوات',
                trustItem4Sub: 'أبواب WPC ضد الماء',
                aboutTitle1: 'من نحن',
                aboutText1: 'شركة سعودية رائدة في أبواب WPC — أكثر من 7 سنوات من الجودة والابتكار. مصنع متكامل في القصيم مجهّز بأحدث خطوط الإنتاج وفرق تركيب وصيانة.',
                aboutTitle2: 'رؤيتنا ورسالتنا',
                aboutText2: 'الريادة في أبواب WPC بما يتماشى مع رؤية 2030 — تقديم الخدمات بأعلى معايير الجودة مع مراعاة الوقت المحدد وتطوير خدمات ما بعد البيع.',
                serviceTitle1: 'تصنيع WPC متكامل',
                serviceText1: 'مصنع متكامل في عنيزة — المنطقة الصناعية — امتداد طريق الزلفي. أبواب سادة، يوتشانيل، شرائح، كلاسيك وزجاج.',
                serviceTitle2: 'فرق تركيب وصيانة',
                serviceText2: 'اسطول متخصص من فرق التركيبات والصيانة لخدمة ما بعد البيع — من المقاسات إلى التسليم.',
                serviceTitle3: 'إدارة الجودة',
                serviceText3: '3 شهادات ISO دولية — ISO 9001 · 14001 · 45001 معتمدة من Americo QSR، ومطابقة SASO للأبواب والنوافذ.',
                serviceTitleInstall: 'ضمان وخدمة',
                serviceTextInstall: 'ضمان 10 سنوات — أبواب WPC ضد الماء والنمل الأبيض. منتجات جاهزة لا تحتاج صبغاً أو سنفرة.',
                partnersPublicSubtitle: 'معتمدون من NHC والشركة الوطنية للإسكان — شركاء في أضخم مشاريع الإسكان الوطني',
                showroomHubIntro: 'معرض نبراس — أبواب نبراس · خزائن نبراس · أبواب WPC · خزائن WPC · قطع CNC · مشاريع NHC',
                showroomDoorsEmpty: 'معرض أبواب نبراس — يُحمّل من الملف التعريفي 2026.',
                showroomCabinetsEmpty: 'معرض خزائن نبراس — يُحمّل من الملف التعريفي 2026.',
                showroomWpcDoorsEmpty: 'معرض أبواب WPC — يُحمّل من الملف التعريفي 2026.',
                showroomWpcCabinetsEmpty: 'معرض خزائن WPC — يُحمّل من الملف التعريفي 2026.',
                showroomCncEmpty: 'معرض قطع CNC — يُحمّل من الملف التعريفي 2026.',
                showroomProjectsEmpty: 'مشاريع واعتمادات NHC — من الملف التعريفي 2026.',
                certsEmptyHintPublic: 'شهادات ISO · SASO · اعتمادات NHC — مصنع نبراس للبلاستيك',
                visitorQuickCompanyProfile: 'الملف التعريفي الكامل 2026',
                companyProfileTitle: 'الملف التعريفي الكامل — مصنع نبراس',
                companyProfileIntro: 'كل محتوى الملف التعريفي الرسمي — منظم ومرتبط بأيقونات الموقع.',
                gatewayLanePlatformHint: 'الملف التعريفي · فروع · حسابات بنكية · خدمات المصنع',
                dashCompanyProfileTitle: 'الملف التعريفي الكامل 2026',
                dashCompanyProfileText: 'البروفايل الرسمي كاملاً — 12 قسماً مرتبطة بأيقونات الموقع.',
                dashShowroomText: '5 أقسام: أبواب نبراس · خزائن نبراس · WPC · CNC · مشاريع NHC.'
            },
            en: {
                pageDescription: 'Saudi WPC door manufacturer since 2018 — NHC · SASO · ISO approved supplier.',
                introTagline: 'Premium WPC doors — composite durability with natural wood aesthetics',
                heroHeadline: 'Nebras Plastic Factory',
                heroTaglineShort: 'Saudi WPC door specialist serving clients across KSA since 2018',
                heroStatInstallVal: '1,250+',
                heroStatInstall: 'Approved contractors',
                heroStatYearsVal: '2018',
                heroStatYears: 'Year founded',
                trustItem1Title: 'Approved supplier',
                trustItem1Sub: 'NHC · SASO · ISO',
                trustItem2Title: 'Saudi made',
                trustItem2Sub: '100% local manufacturing',
                aboutText1: 'A leading Saudi WPC door company — 7+ years of quality and innovation with a full factory in Qassim.',
                aboutText2: 'Leadership in WPC aligned with Vision 2030 — highest quality standards and after-sales excellence.',
                showroomHubIntro: 'Nebras Showroom — doors, cabinets, WPC, CNC, NHC projects',
                visitorQuickCompanyProfile: 'Full Company Profile 2026',
                companyProfileTitle: 'Nebras Company Profile',
                companyProfileIntro: 'Official profile — all sections linked to site icons.',
                dashCompanyProfileTitle: 'Full Company Profile 2026',
                dashCompanyProfileText: 'Complete official profile — 12 sections mapped to icons.',
                dashShowroomText: '5 galleries: doors, cabinets, WPC, CNC, NHC projects.'
            }
        },
        aboutPages: {
            who: {
                titleAr: 'شركة سعودية رائدة في أبواب WPC',
                titleEn: 'Leading Saudi WPC Door Manufacturer',
                summaryAr: 'أكثر من 7 سنوات من الجودة والابتكار في صناعة أبواب البلاستيك الخشبي — آلاف العملاء في أنحاء المملكة.',
                summaryEn: '7+ years of WPC innovation — thousands of clients across Saudi Arabia.',
                bodyAr: 'منذ عام 2018 بدأت شركة نبراس بالعمل في المملكة العربية السعودية لتكون شركة سعودية متخصصة في تصنيع الأبواب من مادة WPC عالية الجودة.\n\nخلال سبع سنوات تشرّفنا بخدمة آلاف العملاء على مستوى المملكة، وبفضل الجودة العالية والشكل الجمالي للأبواب حرصنا دائماً على تقديم وتطوير خدمات ما بعد البيع بفريق عالي الكفاءات.\n\nتمتلك الشركة مصنعاً متكاملاً لإنتاج الأبواب والديكورات مجهّزاً بفريق من المهندسين والعمال المتخصصين، إضافةً إلى اسطول كبير من فرق التركيبات والصيانة.\n\n🏭 مصنع متكامل في القصيم — عنيزة، المنطقة الصناعية، امتداد طريق الزلفي\n🏆 معتمد من NHC رسمياً — Zone C و Zone D\n✅ 3 شهادات ISO دولية — Americo QSR\n🇸🇦 مطابقة SASO للأبواب والنوافذ\n🔧 فرق تركيب وصيانة متخصصة',
                bodyEn: 'Since 2018 Nebras has served thousands of clients across KSA with premium WPC doors, a fully integrated Qassim factory, NHC approval, ISO certifications, SASO compliance, and dedicated install teams.',
                backgroundImage: 'images/profile-2026/hero-cover.jpg',
                album: [img('doors', 1), img('doors', 2), img('doors', 3), img('cabinets', 1)]
            },
            vision: {
                titleAr: 'نحو التميّز في صناعة الأبواب',
                titleEn: 'Excellence in Door Manufacturing',
                summaryAr: 'الريادة في أبواب WPC بما يتماشى مع رؤية المملكة 2030 نحو جودة الحياة والبناء المستدام.',
                summaryEn: 'WPC leadership aligned with Saudi Vision 2030.',
                bodyAr: 'رسالتنا · Mission\nتقديم الخدمات بأعلى معايير الجودة مع مراعاة عنصر الوقت المحدد مسبقاً، وتطوير خدمات ما بعد البيع بفريق عالي الكفاءات.\n\nرؤيتنا · Vision\nأن يكون مصنع نبراس رائداً في مجال أبواب WPC وخياراً مثالياً أمام كافة العملاء بما يتماشى مع رؤية المملكة 2030.\n\n2018 — سنة التأسيس\n1,250+ — مقاول وشركة عقارية معتمدة\n10 — سنوات ضمان\n100% — ضد الماء',
                bodyEn: 'Mission: deliver services at the highest quality standards on time with expert after-sales.\nVision: lead WPC doors aligned with Vision 2030.\nFounded 2018 · 1,250+ partners · 10-year warranty · 100% water resistant.',
                backgroundImage: 'images/profile-2026/doors/doors-04.jpg',
                album: [img('doors', 4), img('doors', 5)]
            }
        },
        certifications: [
            { id: 'cert-iso-9001', titleAr: 'ISO 9001:2015 — نظام إدارة الجودة', titleEn: 'ISO 9001:2015 Quality Management', captionAr: 'AMER12640 · Americo QSR — تصنيع ألواح أبواب WPC والإطارات وأثاث WPC. ساري · إعادة اعتماد 2026', captionEn: 'AMER12640 · Americo QSR — WPC doors, frames, furniture.', mediaUrl: img('doors', 6), mediaType: 'image', sortOrder: 1, visible: true },
            { id: 'cert-iso-14001', titleAr: 'ISO 14001:2015 — الإدارة البيئية', titleEn: 'ISO 14001:2015 Environmental', captionAr: 'AMER12641 · Americo QSR — أعلى معايير الحماية البيئية. ساري · 2026', captionEn: 'AMER12641 · Americo QSR', mediaUrl: img('doors', 7), mediaType: 'image', sortOrder: 2, visible: true },
            { id: 'cert-iso-45001', titleAr: 'ISO 45001:2018 — الصحة والسلامة', titleEn: 'ISO 45001:2018 OHS', captionAr: 'AMER12642 · Americo QSR — السلامة المهنية في تصنيع WPC. ساري · 2026', captionEn: 'AMER12642 · Americo QSR', mediaUrl: img('doors', 8), mediaType: 'image', sortOrder: 3, visible: true },
            { id: 'cert-saso-coc', titleAr: 'SASO ASTC+ — شهادة مطابقة المنتج', titleEn: 'SASO ASTC+ COC', captionAr: '45006-084-24-1394731 — WPC Profile Belsonwpc · اللوائح التقنية للأبواب والنوافذ. COC معتمدة 2024', captionEn: 'SASO COC — doors & windows technical regulations.', mediaUrl: img('doors', 9), mediaType: 'image', sortOrder: 4, visible: true },
            { id: 'cert-nhc-zone-d', titleAr: 'اعتماد مورد NHC — Zone D', titleEn: 'NHC Supplier Approval Zone D', captionAr: 'ABN-MSH-D-AR-50244-0 — أبان للمقاولات · مشروع المشرقية. B - Approved As Noted · مايو 2025', captionEn: 'Aban Contracting · Masharqiyah Zone D.', mediaUrl: img('doors', 10), mediaType: 'image', sortOrder: 5, visible: true },
            { id: 'cert-nhc-zone-c', titleAr: 'اعتماد مورد NHC — Zone C', titleEn: 'NHC Supplier Approval Zone C', captionAr: 'MMC-MSH-C-AR-50295-0 — مشراف المدائن و Achieve Ultimate · Zone C. B - Approved · 2024-2025', captionEn: 'MMC & Achieve Ultimate · Zone C.', mediaUrl: img('doors', 11), mediaType: 'image', sortOrder: 6, visible: true }
        ],
        projects: [
            { titleAr: 'مشروع المشرقية — Zone D · أبان', titleEn: 'Masharqiyah Zone D · Aban', captionAr: 'توريد أبواب الغرف الداخلية WPC — اعتماد المهندس محمد هنداوي ومدير المشروع محمد عساف. B - Approved · مايو 2025', captionEn: 'WPC interior doors supply — NHC approved May 2025', imageUrl: img('doors', 12) },
            { titleAr: 'مشروع المشرقية — Zone C · مشراف المدائن', titleEn: 'Masharqiyah Zone C · MMC', captionAr: 'توريد أبواب الغرف الداخلية عبر شركة مشراف المدائن. B - Approved · يناير 2025', captionEn: 'Interior doors via MMC — Jan 2025', imageUrl: img('cabinets', 1) },
            { titleAr: 'مشروع المشرقية — Zone C · Achieve Ultimate', titleEn: 'Zone C · Achieve Ultimate', captionAr: 'توريد أبواب الغرف الداخلية — اعتماد فريق NHC الهندسي. B - Approved · نوفمبر 2024', captionEn: 'Achieve Ultimate Company — Nov 2024', imageUrl: img('cabinets', 2) },
            { titleAr: 'فيلا كود WPC — Zone D', titleEn: 'Villa Code WPC Zone D', captionAr: 'Material-00378 — طلب اعتماد فيلا كود لأبواب WPC عبر أبان للمقاولات. ABN-MSH-D-AR-50185-0 · Under Process', captionEn: 'Villa Code Material-00378 — under process', imageUrl: img('cabinets', 3) }
        ],
        productTexts: {
            'prod-wpc': {
                textAr: 'تشكيلة أبواب WPC: سادة فلات · إيطارات يوتشانيل · شرائح · كلاسيك وزجاج — مصممة لتحمّل المناخ السعودي.',
                textEn: 'WPC door range: flat, U-channel, slats, classic & glass — built for Saudi climate.'
            },
            'prod-wpc-raw': {
                textAr: 'أبواب WPC عضم للورش — سادة، يوتشانيل، شرائح. صناعة محلية 100% مع ضمان 10 سنوات ضد الماء.',
                textEn: 'Raw WPC leaves for workshops — flat, U-channel, slats. 10-year water-resistant warranty.'
            },
            'prod-other': {
                textAr: 'خزائن WPC و أعمال CNC — دقة عالية وتصاميم تناسب المساحات السكنية والتجارية.',
                textEn: 'WPC cabinets and CNC works — precision manufacturing for residential and commercial spaces.'
            }
        },
        customSection: {
            id: 'sec-wpc-strengths-2026',
            sortOrder: 1,
            titleAr: 'لماذا تختار أبواب نبراس WPC؟',
            titleEn: 'Why Nebras WPC Doors?',
            subtitleAr: 'مزايا استثنائية تجعل أبوابنا الخيار الأمثل لكل مشروع',
            subtitleEn: 'Exceptional advantages for every project',
            visible: true,
            layout: 'wpc-strengths-light',
            items: [
                { id: 'str-1', iconClass: 'fas fa-tint', titleAr: 'ضد الماء بنسبة 100%', textAr: 'مقاومة كاملة للرطوبة والمياه', sortOrder: 1, visible: true },
                { id: 'str-2', iconClass: 'fas fa-shield-alt', titleAr: 'مقاوم للتعفن والانشقاق', textAr: 'لا يتأثر بالزمن', sortOrder: 2, visible: true },
                { id: 'str-3', iconClass: 'fas fa-temperature-high', titleAr: 'مقاوم للتغيرات المناخية', textAr: 'و درجات الحرارة العالية', sortOrder: 3, visible: true },
                { id: 'str-4', iconClass: 'fas fa-bolt', titleAr: 'ثبات البراغي', textAr: 'بقوة أكبر من الخشب الطبيعي', sortOrder: 4, visible: true },
                { id: 'str-5', iconClass: 'fas fa-magic', titleAr: 'منتجات جاهزة', textAr: 'لا تحتاج صبغ أو تنظيف أو سنفرة', sortOrder: 5, visible: true },
                { id: 'str-6', iconClass: 'fas fa-palette', titleAr: 'لا تتطلب صبغاً دورياً', textAr: 'ألوان ثابتة لا تتغير', sortOrder: 6, visible: true },
                { id: 'str-7', iconClass: 'fas fa-bug', titleAr: 'ضد الأرضة والحشرات', textAr: 'حماية شاملة', sortOrder: 7, visible: true },
                { id: 'str-8', iconClass: 'fas fa-eraser', titleAr: 'مقاومة ممتازة للخدش', textAr: 'وسهولة المعالجة عند الخدوش المتعمدة', sortOrder: 8, visible: true },
                { id: 'str-9', iconClass: 'fas fa-leaf', titleAr: 'صديق للبيئة', textAr: 'لا يحتوي على مواد كيميائية سامة أو حافظة', sortOrder: 9, visible: true },
                { id: 'str-10', iconClass: 'fas fa-volume-mute', titleAr: 'عازل للصوت', textAr: 'عزل تام للضوضاء وأعلى درجات الهدوء', sortOrder: 10, visible: true },
                { id: 'str-11', iconClass: 'fas fa-tools', titleAr: 'تكاليف صيانة منخفضة', textAr: 'لجودة المنتج العالية', sortOrder: 11, visible: true },
                { id: 'str-12', iconClass: 'fas fa-hammer', titleAr: 'سهل التركيب', textAr: 'منتجات جاهزة للتنصيب فور الاستلام', sortOrder: 12, visible: true }
            ]
        },
        systemSettings: {
            companyAddressAr: 'القصيم · عنيزة · المنطقة الصناعية · امتداد طريق الزلفي',
            companyAddressEn: 'Qassim · Unaizah · Industrial Zone · Zulfi Road Extension',
            heroBannerImageUrl: 'images/profile-2026/hero-cover.jpg',
            logoUrl: 'images/logo-white.svg'
        }
    };

    function buildFolderItems(folder, count, prefixAr, prefixEn, captionAr, captionEn, idPrefix) {
        const items = [];
        for (let i = 1; i <= count; i++) {
            items.push({
                id: idPrefix + '-' + i,
                imageUrl: img(folder, i),
                titleAr: prefixAr + ' ' + i,
                titleEn: prefixEn + ' ' + i,
                captionAr: captionAr,
                captionEn: captionEn,
                sortOrder: i,
                visible: true
            });
        }
        return items;
    }

    function buildGalleryExtraItems(start, end, prefixAr, prefixEn, captionAr, captionEn, idPrefix) {
        const items = [];
        let order = 1;
        for (let i = start; i <= end; i++) {
            items.push({
                id: idPrefix + '-' + i,
                imageUrl: galleryExtra(i),
                titleAr: prefixAr + ' ' + order,
                titleEn: prefixEn + ' ' + order,
                captionAr: captionAr,
                captionEn: captionEn,
                sortOrder: order,
                visible: true
            });
            order++;
        }
        return items;
    }

    function buildShowroomProjectItems() {
        return PROFILE_2026.projects.map(function(p, idx) {
            return {
                id: 'showroom-projects-nhc-' + (idx + 1),
                imageUrl: p.imageUrl,
                titleAr: p.titleAr,
                titleEn: p.titleEn,
                captionAr: p.captionAr,
                captionEn: p.captionEn,
                sortOrder: idx + 1,
                visible: true
            };
        });
    }

    function mergeSiteText() {
        if (typeof siteText !== 'object' || !siteText) return;
        Object.keys(PROFILE_2026.siteTextPatch).forEach(function(lang) {
            if (!siteText[lang]) siteText[lang] = {};
            Object.assign(siteText[lang], PROFILE_2026.siteTextPatch[lang]);
        });
    }

    function mergeAboutPages() {
        if (typeof aboutPages !== 'object' || !aboutPages) return;
        Object.keys(PROFILE_2026.aboutPages).forEach(function(key) {
            const patch = PROFILE_2026.aboutPages[key];
            if (!aboutPages[key]) aboutPages[key] = {};
            Object.keys(patch).forEach(function(field) {
                aboutPages[key][field] = patch[field];
            });
            if (!aboutPages[key].gallery) aboutPages[key].gallery = [];
        });
    }

    function mergeCertifications() {
        siteCertifications = PROFILE_2026.certifications.map(function(c) { return Object.assign({}, c); });
    }

    function mergeShowroomGallery() {
        if (typeof ensureShowroomGallery === 'function') ensureShowroomGallery();
        if (!showroomGallery || typeof showroomGallery !== 'object') showroomGallery = {};

        showroomGallery.doors = {
            titleAr: 'أبواب نبراس',
            titleEn: 'Nebras Doors',
            introAr: 'تشكيلة أبواب نبراس — من الملف التعريفي الرسمي 2026',
            introEn: 'Nebras door collection — official 2026 profile',
            items: buildFolderItems('doors', 12, 'باب نبراس', 'Nebras Door', 'باب نبراس — مصنع نبراس للبلاستيك', 'Nebras door — Nebras Plastic Factory', 'showroom-doors')
        };
        showroomGallery.cabinets = {
            titleAr: 'خزائن نبراس',
            titleEn: 'Nebras Cabinets',
            introAr: 'خزائن وتشطيبات نبراس بتصاميم عصرية',
            introEn: 'Nebras cabinets and finishes',
            items: buildFolderItems('cabinets', 20, 'خزانة نبراس', 'Nebras Cabinet', 'خزانة نبراس — مصنع نبراس', 'Nebras cabinet — Nebras Factory', 'showroom-cabinets')
        };
        showroomGallery.wpcDoors = {
            titleAr: 'أبواب WPC',
            titleEn: 'WPC Doors',
            introAr: 'أبواب WPC — مقاومة للماء والمناخ السعودي · ضمان 10 سنوات',
            introEn: 'WPC doors — water & climate resistant · 10-year warranty',
            items: buildGalleryExtraItems(1, 24, 'باب WPC', 'WPC Door', 'باب WPC — مصنع نبراس', 'WPC door — Nebras Factory', 'showroom-wpc-doors')
        };
        showroomGallery.wpcCabinets = {
            titleAr: 'خزائن WPC',
            titleEn: 'WPC Cabinets',
            introAr: 'خزائن WPC عالية الجودة من مصنع نبراس',
            introEn: 'Premium WPC cabinets from Nebras',
            items: buildGalleryExtraItems(25, 47, 'خزانة WPC', 'WPC Cabinet', 'خزانة WPC — مصنع نبراس', 'WPC cabinet — Nebras Factory', 'showroom-wpc-cabinets')
        };
        showroomGallery.cnc = {
            titleAr: 'قطع CNC',
            titleEn: 'CNC Parts',
            introAr: 'أعمال CNC بدقة عالية — تصنيع حسب الطلب',
            introEn: 'Precision CNC manufacturing',
            items: buildFolderItems('cnc', 15, 'قطع CNC', 'CNC Part', 'عمل CNC — مصنع نبراس', 'CNC work — Nebras Factory', 'showroom-cnc')
        };
        showroomGallery.projects = {
            titleAr: 'مشاريع واعتمادات NHC',
            titleEn: 'NHC Projects & Approvals',
            introAr: 'شركاء في أضخم مشاريع الإسكان الوطني — Zone C و Zone D',
            introEn: 'Partners in national housing megaprojects — Zone C & D',
            items: buildShowroomProjectItems()
        };

        if (typeof normalizeShowroomGallery === 'function') {
            showroomGallery = normalizeShowroomGallery(showroomGallery);
        }
    }

    function mergeProducts() {
        if (!Array.isArray(siteProducts)) return;
        Object.keys(PROFILE_2026.productTexts).forEach(function(pid) {
            const patch = PROFILE_2026.productTexts[pid];
            const prod = siteProducts.find(function(p) { return p && p.id === pid; });
            if (!prod || !patch) return;
            if (patch.textAr) prod.textAr = patch.textAr;
            if (patch.textEn) prod.textEn = patch.textEn;
        });
    }

    function mergeCustomSection() {
        if (!Array.isArray(siteCustomSections)) siteCustomSections = [];
        const fresh = JSON.parse(JSON.stringify(PROFILE_2026.customSection));
        const idx = siteCustomSections.findIndex(function(s) { return s && s.id === PROFILE_2026.customSection.id; });
        if (idx < 0) {
            siteCustomSections.unshift(fresh);
        } else {
            siteCustomSections[idx] = Object.assign({}, siteCustomSections[idx], fresh, { items: fresh.items });
        }
    }

    function mergeSystemSettings() {
        if (!systemSettings || typeof systemSettings !== 'object') return;
        Object.assign(systemSettings, PROFILE_2026.systemSettings);
    }

    function applyProfile2026ThemeClass() {
        if (typeof document === 'undefined' || !document.body) return;
        document.body.classList.add('nebras-profile-2026-theme');
    }

    function repairShowroomGallerySections() {
        if (typeof ensureShowroomGallery !== 'function' || typeof getShowroomGallerySectionKeys !== 'function') return false;
        ensureShowroomGallery();
        const needsRepair = !showroomGallery.wpcDoors || !showroomGallery.wpcDoors.items || !showroomGallery.wpcDoors.items.length ||
            !showroomGallery.wpcCabinets || !showroomGallery.wpcCabinets.items || !showroomGallery.wpcCabinets.items.length ||
            !showroomGallery.doors || !showroomGallery.doors.items || showroomGallery.doors.items.length < 5;
        if (!needsRepair) return false;
        mergeShowroomGallery();
        return true;
    }

    function applyNebrasProfile2026Seed(force) {
        let stored = 0;
        try {
            stored = parseInt(localStorage.getItem(PROFILE_STORAGE_KEY) || '0', 10) || 0;
        } catch (e) { stored = 0; }
        if (!force && stored >= PROFILE_2026_SEED_VERSION) {
            applyProfile2026ThemeClass();
            return false;
        }

        mergeSiteText();
        mergeAboutPages();
        mergeCertifications();
        mergeShowroomGallery();
        mergeProducts();
        mergeCustomSection();
        mergeSystemSettings();

        try {
            localStorage.setItem(PROFILE_STORAGE_KEY, String(PROFILE_2026_SEED_VERSION));
        } catch (e) { /* ignore */ }

        applyProfile2026ThemeClass();
        return true;
    }

    global.NEBRAS_PROFILE_2026 = PROFILE_2026;
    global.PROFILE_2026_SEED_VERSION = PROFILE_2026_SEED_VERSION;
    global.applyNebrasProfile2026Seed = applyNebrasProfile2026Seed;
    global.repairShowroomGallerySections = repairShowroomGallerySections;
})(typeof window !== 'undefined' ? window : globalThis);
