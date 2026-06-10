/**
 * بذرة محتوى الملف التعريفي 2026 — github.io/NIBRAS-FACTORY-PROFILE-2026
 * تُدمج في finalizePlatformDataAfterLoad عبر applyNebrasProfile2026Seed()
 */
(function(global) {
    'use strict';

    const PROFILE_2026_SEED_VERSION = 8;
    const PROFILE_STORAGE_KEY = 'nebrasProfile2026SeedVersion';
    const SHOWROOM_CATALOG_VERSION = 8;
    const SHOWROOM_CATALOG_STORAGE_KEY = 'nebrasShowroomCatalogVersion';

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
                visitorQuickNebrasProfile: 'البروفايل التعريفي لنبراس',
                visitorQuickBranches: 'استكشف فروع نبراس',
                visitorQuickShowroom: 'استكشف معرض نبراس',
                companyProfileTitle: 'البروفايل التعريفي لنبراس',
                companyProfileIntro: 'البروفايل التعريفي الرسمي — عرض كامل 24 صفحة داخل الأيقونة مع تنزيل PDF.',
                aboutTitle2: 'نحو التميّز في صناعة الأبواب',
                visionProfileEmbedIntro: 'الملف التعريفي الرسمي 2026 — كل أقسام المصنع والمنتجات والشهادات والمعرض داخل صفحة نحو التميّز في صناعة الأبواب.',
                gatewayLanePlatformHint: 'البروفايل التعريفي · فروع · حسابات بنكية · خدمات المصنع',
                dashCompanyProfileTitle: 'البروفايل التعريفي لنبراس',
                dashCompanyProfileText: 'عرض البروفايل الكامل داخل المنصة — 24 صفحة مع تنزيل PDF.',
                dashShowroomText: 'استكشف معرض نبراس — أبواب · خزائن · WPC · CNC · مشاريع NHC.'
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
                visitorQuickNebrasProfile: 'Nebras Company Profile',
                visitorQuickBranches: 'Explore Nebras Branches',
                visitorQuickShowroom: 'Explore Nebras Showroom',
                companyProfileTitle: 'Nebras Company Profile',
                companyProfileIntro: 'Official profile — full viewer with PDF download.',
                aboutTitle2: 'Excellence in Door Manufacturing',
                dashCompanyProfileTitle: 'Nebras Company Profile',
                dashCompanyProfileText: 'Full profile viewer with PDF download — 24 pages.',
                dashShowroomText: 'Explore Nebras Showroom — doors, cabinets, WPC, CNC, NHC.'
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
                album: ['images/profile-2026/hero-cover.jpg'],
                gallery: []
            },
            vision: {
                titleAr: 'نحو التميّز في صناعة الأبواب',
                titleEn: 'Excellence in Door Manufacturing',
                summaryAr: 'الريادة في أبواب WPC بما يتماشى مع رؤية المملكة 2030 نحو جودة الحياة والبناء المستدام.',
                summaryEn: 'WPC leadership aligned with Saudi Vision 2030.',
                bodyAr: 'رسالتنا · Mission\nتقديم الخدمات بأعلى معايير الجودة مع مراعاة عنصر الوقت المحدد مسبقاً، وتطوير خدمات ما بعد البيع بفريق عالي الكفاءات.\n\nرؤيتنا · Vision\nأن يكون مصنع نبراس رائداً في مجال أبواب WPC وخياراً مثالياً أمام كافة العملاء بما يتماشى مع رؤية المملكة 2030.\n\n2018 — سنة التأسيس\n1,250+ — مقاول وشركة عقارية معتمدة\n10 — سنوات ضمان\n100% — ضد الماء',
                bodyEn: 'Mission: deliver services at the highest quality standards on time with expert after-sales.\nVision: lead WPC doors aligned with Vision 2030.\nFounded 2018 · 1,250+ partners · 10-year warranty · 100% water resistant.',
                backgroundImage: 'images/background-our-vision.jpg',
                album: ['images/background-our-vision.jpg'],
                gallery: []
            }
        },
        certifications: [
            { id: 'cert-iso-9001', titleAr: 'ISO 9001:2015 — نظام إدارة الجودة', titleEn: 'ISO 9001:2015 Quality Management', captionAr: 'AMER12640 · Americo QSR — تصنيع ألواح أبواب WPC والإطارات وأثاث WPC. ساري · إعادة اعتماد 2026', captionEn: 'AMER12640 · Americo QSR — WPC doors, frames, furniture.', mediaUrl: '', mediaType: 'pending', sortOrder: 1, visible: true },
            { id: 'cert-iso-14001', titleAr: 'ISO 14001:2015 — الإدارة البيئية', titleEn: 'ISO 14001:2015 Environmental', captionAr: 'AMER12641 · Americo QSR — أعلى معايير الحماية البيئية. ساري · 2026', captionEn: 'AMER12641 · Americo QSR', mediaUrl: '', mediaType: 'pending', sortOrder: 2, visible: true },
            { id: 'cert-iso-45001', titleAr: 'ISO 45001:2018 — الصحة والسلامة', titleEn: 'ISO 45001:2018 OHS', captionAr: 'AMER12642 · Americo QSR — السلامة المهنية في تصنيع WPC. ساري · 2026', captionEn: 'AMER12642 · Americo QSR', mediaUrl: '', mediaType: 'pending', sortOrder: 3, visible: true },
            { id: 'cert-saso-coc', titleAr: 'SASO ASTC+ — شهادة مطابقة المنتج', titleEn: 'SASO ASTC+ COC', captionAr: '45006-084-24-1394731 — WPC Profile Belsonwpc · اللوائح التقنية للأبواب والنوافذ. COC معتمدة 2024', captionEn: 'SASO COC — doors & windows technical regulations.', mediaUrl: '', mediaType: 'pending', sortOrder: 4, visible: true },
            { id: 'cert-nhc-zone-d', titleAr: 'اعتماد مورد NHC — Zone D', titleEn: 'NHC Supplier Approval Zone D', captionAr: 'ABN-MSH-D-AR-50244-0 — أبان للمقاولات · مشروع المشرقية. B - Approved As Noted · مايو 2025', captionEn: 'Aban Contracting · Masharqiyah Zone D.', mediaUrl: '', mediaType: 'pending', sortOrder: 5, visible: true },
            { id: 'cert-nhc-zone-c', titleAr: 'اعتماد مورد NHC — Zone C', titleEn: 'NHC Supplier Approval Zone C', captionAr: 'MMC-MSH-C-AR-50295-0 — مشراف المدائن و Achieve Ultimate · Zone C. B - Approved · 2024-2025', captionEn: 'MMC & Achieve Ultimate · Zone C.', mediaUrl: '', mediaType: 'pending', sortOrder: 6, visible: true }
        ],
        projects: [
            { titleAr: 'مشروع المشرقية — Zone D · أبان', titleEn: 'Masharqiyah Zone D · Aban', captionAr: 'توريد أبواب الغرف الداخلية WPC — اعتماد المهندس محمد هنداوي ومدير المشروع محمد عساف. B - Approved · مايو 2025', captionEn: 'WPC interior doors supply — NHC approved May 2025', imageUrl: 'images/projects/nhc/mashriqiyah-aerial.png' },
            { titleAr: 'مشروع المشرقية — Zone C · مشراف المدائن', titleEn: 'Masharqiyah Zone C · MMC', captionAr: 'توريد أبواب الغرف الداخلية عبر شركة مشراف المدائن. B - Approved · يناير 2025', captionEn: 'Interior doors via MMC — Jan 2025', imageUrl: 'images/projects/nhc/daniya-mashriqiyah.png' },
            { titleAr: 'مشروع المشرقية — Zone C · Achieve Ultimate', titleEn: 'Zone C · Achieve Ultimate', captionAr: 'توريد أبواب الغرف الداخلية — اعتماد فريق NHC الهندسي. B - Approved · نوفمبر 2024', captionEn: 'Achieve Ultimate Company — Nov 2024', imageUrl: 'images/projects/nhc/mashriqiyah-2-render.png' },
            { titleAr: 'فيلا كود WPC — Zone D', titleEn: 'Villa Code WPC Zone D', captionAr: 'Material-00378 — طلب اعتماد فيلا كود لأبواب WPC عبر أبان للمقاولات. ABN-MSH-D-AR-50185-0 · Under Process', captionEn: 'Villa Code Material-00378 — under process', imageUrl: 'images/projects/nhc/mashriqiyah-destination.png' }
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
            logoUrl: 'images/logo-nebras-mark.png'
        }
    };

    function catalogItem(idPrefix, order, imageUrl, titleAr, titleEn, captionAr, captionEn) {
        return {
            id: idPrefix + '-' + order,
            imageUrl: imageUrl,
            titleAr: titleAr,
            titleEn: titleEn,
            captionAr: captionAr || (titleAr + ' — مصنع نبراس للبلاستيك'),
            captionEn: captionEn || (titleEn + ' — Nebras Plastic Factory'),
            sortOrder: order,
            visible: true
        };
    }

    function buildCuratedItems(idPrefix, rows) {
        return rows.map(function(row, idx) {
            return catalogItem(idPrefix, idx + 1, row[0], row[1], row[2], row[3], row[4]);
        });
    }

    const SHOWROOM_DOORS_CATALOG = [
        [img('doors', 1), 'باب كلاسيك ثنائي اللوح', 'Classic two-panel door'],
        [img('doors', 2), 'باب زجاج مزدوج كلاسيك', 'Double classic glass door'],
        [img('doors', 3), 'باب فلات أبيض', 'Flat white door'],
        [img('doors', 4), 'باب فلات للحمام', 'Flat bathroom door'],
        [img('doors', 5), 'باب فلات مع علوية ثابتة', 'Flat door with transom'],
        [img('doors', 6), 'باب يوتشانيل بخشب فاتح', 'Light wood U-channel door'],
        [img('doors', 7), 'باب يوتشانيل خشبي مع علوية', 'Wood U-channel door with transom'],
        [img('doors', 8), 'باب شرائح أفقية خشبي', 'Horizontal slat wood door'],
        [img('doors', 9), 'باب كلاسيك ثلاثي اللوح', 'Classic three-panel door'],
        [img('doors', 10), 'باب فلات خشبي بعلوية', 'Wood flat door with transom'],
        [img('doors', 11), 'باب شرائح منزلق مزدوج', 'Double sliding slat door'],
        [img('doors', 12), 'باب سحاب خشبي مزدوج', 'Double wood sliding door']
    ];

    const SHOWROOM_CABINETS_CATALOG = [
        [img('cabinets', 1), 'قواطع حمامات WPC', 'WPC toilet partitions'],
        [img('cabinets', 2), 'قواطع حمامات بمؤشر LED', 'Partitions with LED occupancy'],
        [img('cabinets', 3), 'قواطع حمامات بخشب وعاجي', 'Wood and cream partitions'],
        [img('cabinets', 4), 'خزانة مطبخ علوية بيضاء', 'White upper kitchen cabinet'],
        [img('cabinets', 5), 'خزانة ملابس بلون عاجي', 'Ivory wardrobe cabinet'],
        [img('cabinets', 6), 'خزانة ملابس فاخرة بزخارف', 'Premium decorative wardrobe'],
        [img('cabinets', 7), 'خزانة تخزين عصرية', 'Modern storage cabinet'],
        [img('cabinets', 8), 'خزانة حمام مع مرآة', 'Bathroom vanity cabinet'],
        [img('cabinets', 9), 'خزانة حائط معلقة', 'Wall-mounted cabinet'],
        [img('cabinets', 10), 'وحدة تلفزيون رخامية', 'Marble TV wall unit'],
        [img('cabinets', 11), 'خزانة مطبخ زاوية', 'Corner kitchen cabinet'],
        [img('cabinets', 12), 'خزانة عرض وكتب', 'Display and bookshelf unit'],
        [img('cabinets', 13), 'خزانة ملابس انزلاقية', 'Sliding wardrobe cabinet'],
        [img('cabinets', 14), 'خزانة مطبخ بإطار ذهبي', 'Kitchen cabinet with gold trim'],
        [img('cabinets', 15), 'خزانة أدراج بيضاء', 'White drawer cabinet'],
        [img('cabinets', 16), 'خزانة أطفال ملونة', 'Children room cabinet'],
        [img('cabinets', 17), 'خزانة وحدات مدمجة', 'Integrated modular cabinet'],
        [img('cabinets', 18), 'خزانة تخزين مطبخ — مصنع', 'Factory kitchen storage unit'],
        [img('cabinets', 19), 'خزانة مفتوحة ودرج', 'Open shelf and drawer unit'],
        [img('cabinets', 20), 'خزانة زاوية بأبواب زجاج', 'Corner glass-door wardrobe']
    ];

    const SHOWROOM_WPC_DOORS_CATALOG = SHOWROOM_DOORS_CATALOG.map(function(row) {
        return [row[0], 'باب WPC — ' + row[1], 'WPC door — ' + row[2]];
    }).concat([
        [galleryExtra(1), 'باب WPC داخلي كلاسيك أبيض', 'WPC classic white interior door'],
        [galleryExtra(2), 'باب WPC كلاسيك لوحين', 'WPC two-panel classic door'],
        [galleryExtra(3), 'باب WPC فلات عصري', 'WPC modern flat door'],
        [galleryExtra(4), 'باب WPC فلات حمام', 'WPC bathroom flat door'],
        [galleryExtra(5), 'باب WPC بعلوية ثابتة', 'WPC door with transom'],
        [galleryExtra(6), 'باب WPC يوتشانيل خشبي', 'WPC wood U-channel door'],
        [galleryExtra(7), 'باب WPC يوتشانيل مع علوية', 'WPC U-channel with transom'],
        [galleryExtra(8), 'باب WPC شرائح أفقية', 'WPC horizontal slat door'],
        [galleryExtra(9), 'باب WPC كلاسيك ثلاثي', 'WPC three-panel classic door'],
        [galleryExtra(10), 'باب WPC فلات خشبي', 'WPC wood flat door'],
        [galleryExtra(11), 'باب WPC شرائح منزلق', 'WPC sliding slat door'],
        [galleryExtra(12), 'باب WPC سحاب مزدوج', 'WPC double sliding door'],
        [galleryExtra(13), 'باب WPC داخلي مفصلي', 'WPC hinged interior door'],
        [galleryExtra(14), 'باب WPC زجاج ولوحات', 'WPC glass panel door'],
        [galleryExtra(15), 'باب WPC سادة فلات', 'WPC plain flat door'],
        [galleryExtra(16), 'باب WPC يوتشانيل سادة', 'WPC plain U-channel door'],
        [galleryExtra(17), 'باب WPC شرائح عمودية', 'WPC vertical slat door'],
        [galleryExtra(18), 'باب WPC كلاسيك بزجاج', 'WPC classic glass door'],
        [galleryExtra(19), 'باب WPC مزدوج داخلي', 'WPC double interior door'],
        [galleryExtra(20), 'باب WPC فلات ضد الماء', 'WPC water-resistant flat door'],
        [galleryExtra(21), 'باب WPC غرف نوم', 'WPC bedroom door'],
        [galleryExtra(22), 'باب WPC مدخل داخلي', 'WPC internal entry door'],
        [galleryExtra(23), 'باب WPC ضد الرطوبة', 'WPC moisture-resistant door'],
        [galleryExtra(24), 'باب WPC تشطيب فاخر', 'WPC premium finish door'],
        [galleryExtra(33), 'باب WPC منحوت كلاسيك', 'WPC carved classic door'],
        [galleryExtra(40), 'باب WPC خشبي مزدوج', 'WPC double wood door']
    ]);

    const SHOWROOM_WPC_CABINETS_CATALOG = [
        [img('cabinets', 4), 'خزانة WPC مطبخ علوية', 'WPC upper kitchen cabinet'],
        [img('cabinets', 5), 'خزانة WPC ملابس عاجية', 'WPC ivory wardrobe'],
        [img('cabinets', 6), 'خزانة WPC ملابس فاخرة', 'WPC premium wardrobe'],
        [img('cabinets', 7), 'خزانة WPC تخزين عصرية', 'WPC modern storage'],
        [img('cabinets', 8), 'خزانة WPC حمام', 'WPC bathroom vanity'],
        [img('cabinets', 9), 'خزانة WPC حائط معلقة', 'WPC wall cabinet'],
        [img('cabinets', 10), 'وحدة WPC تلفزيون رخامية', 'WPC marble TV unit'],
        [img('cabinets', 11), 'خزانة WPC مطبخ زاوية', 'WPC corner kitchen'],
        [img('cabinets', 12), 'خزانة WPC عرض وكتب', 'WPC display bookshelf'],
        [img('cabinets', 13), 'خزانة WPC انزلاقية', 'WPC sliding wardrobe'],
        [img('cabinets', 14), 'خزانة WPC مطبخ ذهبية', 'WPC gold-trim kitchen'],
        [img('cabinets', 15), 'خزانة WPC أدراج', 'WPC drawer cabinet'],
        [img('cabinets', 16), 'خزانة WPC أطفال', 'WPC children cabinet'],
        [img('cabinets', 17), 'خزانة WPC وحدات مدمجة', 'WPC modular cabinet'],
        [img('cabinets', 18), 'خزانة WPC تخزين مطبخ', 'WPC kitchen storage'],
        [img('cabinets', 19), 'خزانة WPC مفتوحة', 'WPC open shelf unit'],
        [img('cabinets', 20), 'خزانة WPC زجاج زاوية', 'WPC glass corner wardrobe'],
        [galleryExtra(26), 'وحدة WPC تلفزيون ورفوف', 'WPC TV wall with shelves'],
        [galleryExtra(28), 'خزانة WPC مطبخ مدمجة', 'WPC built-in kitchen'],
        [galleryExtra(30), 'خزانة WPC تخزين مصنع', 'WPC factory storage unit'],
        [galleryExtra(31), 'خزانة WPC درج مطبخ', 'WPC kitchen drawer bank'],
        [galleryExtra(32), 'خزانة WPC حائط كاملة', 'WPC full wall cabinet'],
        [galleryExtra(34), 'خزانة WPC غرفة نوم', 'WPC bedroom cabinet'],
        [galleryExtra(35), 'خزانة WPC ركنية', 'WPC corner cabinet'],
        [galleryExtra(36), 'خزانة WPC أحذية', 'WPC shoe cabinet'],
        [galleryExtra(37), 'خزانة WPC معرض', 'WPC display cabinet'],
        [galleryExtra(38), 'خزانة WPC مكتب', 'WPC office cabinet'],
        [galleryExtra(39), 'خزانة WPC درج عميق', 'WPC deep drawer unit'],
        [galleryExtra(41), 'خزانة WPC مطبخ علوية وسفلية', 'WPC upper and base kitchen'],
        [galleryExtra(42), 'خزانة WPC حمام معلقة', 'WPC floating bathroom cabinet'],
        [galleryExtra(43), 'خزانة WPC تخزين منزلي', 'WPC home storage unit'],
        [galleryExtra(44), 'خزانة WPC رفوف مفتوحة', 'WPC open shelving unit'],
        [galleryExtra(45), 'خزانة WPC دريسينغ', 'WPC dressing cabinet'],
        [galleryExtra(46), 'خزانة WPC مطبخ عصرية', 'WPC modern kitchen'],
        [galleryExtra(47), 'خزانة WPC تخزين ضيقة', 'WPC slim storage cabinet']
    ];

    const SHOWROOM_CNC_CATALOG = [
        [img('cnc', 2), 'لوح زخرفي CNC — أوراق ذهبية', 'CNC gold leaf relief panel'],
        [img('cnc', 3), 'نقش زخرفي CNC على WPC', 'CNC decorative WPC carving'],
        [img('cnc', 6), 'واجهة منحوتة CNC', 'CNC carved facade panel'],
        [img('cnc', 7), 'لوح ألواح CNC هندسي', 'CNC geometric panel'],
        [img('cnc', 8), 'زخرفة واجهة CNC', 'CNC facade ornament'],
        [img('cnc', 9), 'قطع ديكور CNC للجدران', 'CNC wall decor parts'],
        [img('cnc', 10), 'حفر CNC على WPC', 'CNC engraving on WPC'],
        [img('cnc', 11), 'لوح جدار CNC ثلاثي', 'CNC 3D wall panel'],
        [img('cnc', 12), 'نقش عربي CNC', 'CNC Arabic pattern carving'],
        [img('cnc', 13), 'واجهة CNC بارزة', 'CNC raised relief facade'],
        [img('cnc', 14), 'قطع ستائر CNC', 'CNC decorative screen parts'],
        [img('cnc', 15), 'تشطيب CNC باب وخزانة', 'CNC door and cabinet finish']
    ];

    function persistShowroomGalleryLocal() {
        try {
            if (typeof showroomGallery !== 'undefined' && showroomGallery) {
                localStorage.setItem('nebrasShowroomGallery', JSON.stringify(showroomGallery));
            }
        } catch (e) { /* ignore */ }
    }

    function showroomHasGenericLabels() {
        const doors = showroomGallery && showroomGallery.doors && showroomGallery.doors.items;
        if (!doors || !doors.length) return true;
        const first = String(doors[0].titleAr || '');
        return /^باب نبراس\s+\d+$/i.test(first) || /^Nebras Door\s+\d+$/i.test(String(doors[0].titleEn || ''));
    }

    function getStoredShowroomCatalogVersion() {
        try {
            return parseInt(localStorage.getItem(SHOWROOM_CATALOG_STORAGE_KEY) || '0', 10) || 0;
        } catch (e) {
            return 0;
        }
    }

    function markShowroomCatalogApplied() {
        try {
            localStorage.setItem(SHOWROOM_CATALOG_STORAGE_KEY, String(SHOWROOM_CATALOG_VERSION));
        } catch (e) { /* ignore */ }
    }

    function buildShowroomProjectItems() {
        return PROFILE_2026.projects.map(function(p, idx) {
            return {
                id: 'showroom-projects-nhc-' + (idx + 1),
                imageUrl: p.imageUrl || '',
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
            Object.assign(aboutPages[key], patch);
            if (Array.isArray(patch.album)) aboutPages[key].album = patch.album.slice();
            aboutPages[key].gallery = Array.isArray(patch.gallery) ? patch.gallery.slice() : [];
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
            introAr: 'تشكيلة أبواب نبراس — أسماء مطابقة للصور من الملف التعريفي 2026',
            introEn: 'Nebras doors — image-matched labels from 2026 profile',
            items: buildCuratedItems('showroom-doors', SHOWROOM_DOORS_CATALOG)
        };
        showroomGallery.cabinets = {
            titleAr: 'خزائن نبراس',
            titleEn: 'Nebras Cabinets',
            introAr: 'خزائن وقواطع ووحدات تخزين — تسمية دقيقة لكل صورة',
            introEn: 'Cabinets, partitions, and storage — accurate labels per image',
            items: buildCuratedItems('showroom-cabinets', SHOWROOM_CABINETS_CATALOG)
        };
        showroomGallery.wpcDoors = {
            titleAr: 'أبواب WPC',
            titleEn: 'WPC Doors',
            introAr: 'أبواب WPC — مقاومة للماء والمناخ السعودي · ضمان 10 سنوات',
            introEn: 'WPC doors — water & climate resistant · 10-year warranty',
            items: buildCuratedItems('showroom-wpc-doors', SHOWROOM_WPC_DOORS_CATALOG)
        };
        showroomGallery.wpcCabinets = {
            titleAr: 'خزائن WPC',
            titleEn: 'WPC Cabinets',
            introAr: 'خزائن ومطابخ ووحدات تلفزيون WPC — بدون صور غير مطابقة',
            introEn: 'WPC cabinets, kitchens, and TV units — matched imagery only',
            items: buildCuratedItems('showroom-wpc-cabinets', SHOWROOM_WPC_CABINETS_CATALOG)
        };
        showroomGallery.cnc = {
            titleAr: 'قطع CNC',
            titleEn: 'CNC Parts',
            introAr: 'أعمال CNC وزخارف ولوحات — تصنيع حسب الطلب',
            introEn: 'CNC panels, carvings, and decor — made to order',
            items: buildCuratedItems('showroom-cnc', SHOWROOM_CNC_CATALOG)
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
        markShowroomCatalogApplied();
        persistShowroomGalleryLocal();
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
        const projectItems = (showroomGallery.projects && showroomGallery.projects.items) || [];
        const projectsNeedImages = !projectItems.length || projectItems.some(function(it) {
            if (!it || String(it.id || '').indexOf('showroom-projects-nhc-') !== 0) return false;
            const url = String(it.imageUrl || '');
            return !url || url.indexOf('images/projects/nhc/') !== 0;
        });
        const catalogStale = getStoredShowroomCatalogVersion() < SHOWROOM_CATALOG_VERSION;
        const needsRepair = catalogStale || showroomHasGenericLabels() ||
            !showroomGallery.wpcDoors || !showroomGallery.wpcDoors.items || !showroomGallery.wpcDoors.items.length ||
            !showroomGallery.wpcCabinets || !showroomGallery.wpcCabinets.items || !showroomGallery.wpcCabinets.items.length ||
            !showroomGallery.doors || !showroomGallery.doors.items || showroomGallery.doors.items.length < 5 ||
            projectsNeedImages;
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
