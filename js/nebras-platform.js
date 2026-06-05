        const SUPABASE_URL = 'https://oedldllrjavofpeaputz.supabase.co';
        const SUPABASE_ANON_KEY = 'sb_publishable_bt6rlHxu_pjc1xpkKEWOcg_HZ43JMR0';
        let supabaseClient = null;
        try {
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            }
        } catch (supabaseInitErr) {
            console.warn('Supabase unavailable — local mode only:', supabaseInitErr);
        }
        const NEBRAS_MEDIA_BUCKET = 'nebras-media';
        const NEBRAS_MEDIA_MAX_BYTES = 8 * 1024 * 1024;
        const NEBRAS_PDF_MAX_BYTES = 12 * 1024 * 1024;
        const NEBRAS_VIDEO_MAX_BYTES = 48 * 1024 * 1024;
        const NEBRAS_IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif,image/svg+xml,image/bmp,image/heic,image/heif';
        const NEBRAS_VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime,video/ogg';
        const NEBRAS_MEDIA_ACCEPT_ALL = NEBRAS_IMAGE_ACCEPT + ',application/pdf';
        const NEBRAS_SHOWROOM_MEDIA_ACCEPT = NEBRAS_IMAGE_ACCEPT + ',' + NEBRAS_VIDEO_ACCEPT + ',application/pdf';
        const NEBRAS_IMAGE_EXT_RE = /\.(jpe?g|png|webp|avif|gif|svg|bmp|ico|heic|heif)(\?|#|$)/i;
        const NEBRAS_VIDEO_EXT_RE = /\.(mp4|webm|mov|ogg)(\?|#|$)/i;
        window.NEBRAS_IMAGE_ACCEPT = NEBRAS_IMAGE_ACCEPT;
        window.NEBRAS_MEDIA_ACCEPT_ALL = NEBRAS_MEDIA_ACCEPT_ALL;
        window.NEBRAS_SHOWROOM_MEDIA_ACCEPT = NEBRAS_SHOWROOM_MEDIA_ACCEPT;
        const PRIMARY_GOVERNANCE_ADMIN_IDS = ['base-admin', 'nebras-factory-admin'];
        const PRIMARY_GOVERNANCE_USERNAMES = ['NEBRASFACTORY', 'NEBRASBASIC'];
        const PRIMARY_RECOVERY_EMAIL = 'abdelrhmanomranmd@gmail.com';
        const NEBRAS_LINKTREE_URL = 'https://linktr.ee/abdelrhmanomranmd';
        const NEBRAS_PUBLIC_SITE_URL = 'https://www.nebrasplasticcompany.com';
        const NEBRAS_SITE_QR_IMAGE = 'images/nebras-site-qr.png';
        const NEBRAS_PERMISSION_LABELS = {
            users: 'المستخدمون',
            content: 'المحتوى والمعرض',
            erp: 'ERP',
            inventory: 'المخزون',
            orders: 'الطلبات',
            sales: 'المبيعات',
            customerService: 'خدمة العملاء',
            complaints: 'الشكاوى',
            branches: 'الفروع',
            audit: 'التدقيق والتقارير'
        };
        const SHOP_CATALOG_PRODUCT_IDS = ['prod-wpc-raw', 'prod-wpc', 'prod-aluminum', 'prod-other'];

        function canUploadNebrasMedia(permissionKey) {
            if (!currentAdmin) return false;
            if (isMainGovernanceAdmin(currentAdmin)) return true;
            const key = permissionKey || 'content';
            if (Array.isArray(currentAdmin.permissions) && currentAdmin.permissions.length) {
                return currentAdmin.permissions.indexOf(key) >= 0;
            }
            const allowed = rolePermissions[currentAdmin.role] || [];
            return allowed.indexOf(key) !== -1;
        }

        function openNebrasMediaFilePicker(callback, accept) {
            let input = document.getElementById('nebras-admin-media-input');
            if (!input) {
                input = document.createElement('input');
                input.type = 'file';
                input.id = 'nebras-admin-media-input';
                input.hidden = true;
                document.body.appendChild(input);
            }
            input.accept = accept || NEBRAS_MEDIA_ACCEPT_ALL;
            input.value = '';
            input.onchange = function() {
                const file = input.files && input.files[0];
                input.onchange = null;
                callback(file || null);
            };
            input.click();
        }

        function fileToDataUrl(file) {
            return new Promise(function(resolve) {
                const reader = new FileReader();
                reader.onload = function() { resolve(reader.result || null); };
                reader.onerror = function() { resolve(null); };
                reader.readAsDataURL(file);
            });
        }

        async function uploadNebrasMediaFile(file) {
            if (!file) return null;
            if (currentAdmin && !canUploadNebrasMedia('content')) {
                alert('لا تملكين صلاحية رفع الصور أو الملفات. الإدارة الرئيسية (NEBRASFACTORY) تملك الصلاحية الكاملة.');
                return null;
            }
            if (!supabaseClient) {
                alert('Supabase غير متصل — استخدمي خيار 2 (مسار images/...) أو سجّلي الدخول للإدارة.');
                return null;
            }
            const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
            const isVideo = (file.type && file.type.indexOf('video/') === 0) || NEBRAS_VIDEO_EXT_RE.test(file.name || '');
            const maxBytes = isPdf ? NEBRAS_PDF_MAX_BYTES : (isVideo ? NEBRAS_VIDEO_MAX_BYTES : NEBRAS_MEDIA_MAX_BYTES);
            if (file.size > maxBytes) {
                alert('حجم الملف كبير — الحد الأقصى ' + (isPdf ? '12' : (isVideo ? '48' : '8')) + ' ميجابايت.');
                return null;
            }
            const ext = (file.name.split('.').pop() || (isPdf ? 'pdf' : (isVideo ? 'mp4' : 'jpg'))).toLowerCase().replace(/[^a-z0-9]/g, '') || (isPdf ? 'pdf' : (isVideo ? 'mp4' : 'jpg'));
            const path = 'uploads/' + Date.now() + '-' + Math.random().toString(36).slice(2, 10) + '.' + ext;
            try {
                const { data, error } = await supabaseClient.storage.from(NEBRAS_MEDIA_BUCKET).upload(path, file, {
                    cacheControl: '31536000',
                    upsert: false,
                    contentType: file.type || (isPdf ? 'application/pdf' : undefined)
                });
                if (error) {
                    if (file.type && file.type.indexOf('image/') === 0 && file.size < 1500000) {
                        const local = await fileToDataUrl(file);
                        if (local && confirm('تعذّر الرفع للسحابة.\n\nحفظ الصورة محلياً في الموقع (مؤقت)؟\n\nللحل الدائم: نفّذي supabase/002-storage-nebras-media.sql في Supabase.')) {
                            alert('تم الحفظ محلياً — للإنتاج نفّذي سكربت التخزين.');
                            return local;
                        }
                    }
                    alert('فشل رفع الصورة:\n' + (error.message || error) + '\n\nنفّذي: supabase/002-storage-nebras-media.sql\nأو استخدمي مسار images/... يدوياً (خيار 2).');
                    return null;
                }
                const uploadedPath = (data && data.path) || path;
                const { data: pub } = supabaseClient.storage.from(NEBRAS_MEDIA_BUCKET).getPublicUrl(uploadedPath);
                return (pub && pub.publicUrl) ? pub.publicUrl : uploadedPath;
            } catch (err) {
                alert('خطأ أثناء الرفع: ' + (err.message || err));
                return null;
            }
        }

        function pickMediaPathLegacyPrompt(options) {
            options = options || {};
            return new Promise(function(resolve) {
                if (!currentAdmin) {
                    alert('يجب تسجيل الدخول للإدارة أولاً (NEBRASFACTORY) لرفع الصور.');
                    resolve(null);
                    return;
                }
                if (!canUploadNebrasMedia(options.permission)) {
                    alert(options.permissionMessage || 'صلاحية المحتوى (manager أو superadmin) مطلوبة لرفع الصور والوثائق.');
                    resolve(null);
                    return;
                }
                const label = options.label || 'الصورة';
                const def = options.defaultValue || '';
                const mode = prompt(
                    label + '\n\n1 = رفع صورة من الجهاز (موصى به)\n2 = مسار images/... أو رابط كامل\n\nاكتب 1 أو 2:',
                    '1'
                );
                if (mode === null) {
                    resolve(null);
                    return;
                }
                if (String(mode).trim() === '2') {
                    const manual = prompt('مسار أو رابط الصورة:', def);
                    resolve(manual === null ? null : manual.trim());
                    return;
                }
                openNebrasMediaFilePicker(function(file) {
                    if (!file) {
                        resolve(null);
                        return;
                    }
                    uploadNebrasMediaFile(file).then(function(url) {
                        if (url) {
                            const isPdf = /\.pdf(\?|$)/i.test(url) || (file && file.type === 'application/pdf');
                            alert(isPdf ? 'تم رفع الوثيقة (PDF) بنجاح.' : 'تم رفع الملف بنجاح.');
                        }
                        resolve(url);
                    });
                }, options.accept || NEBRAS_MEDIA_ACCEPT_ALL);
            });
        }

        function pickMediaPath(options) {
            options = options || {};
            if (typeof window.openNebrasMediaHub === 'function') {
                return window.openNebrasMediaHub(Object.assign({
                    accept: NEBRAS_MEDIA_ACCEPT_ALL,
                    hint: 'JPEG · PNG · WebP · GIF · AVIF · SVG · PDF — رفع من الإدارة'
                }, options));
            }
            return pickMediaPathLegacyPrompt(options);
        }

        async function pickMediaAlbumInteractive(existingAlbum) {
            let album = (existingAlbum || []).slice();
            let keepGoing = true;
            while (keepGoing) {
                const url = await pickMediaPath({ label: 'صورة للألبوم (' + (album.length + 1) + ')' });
                if (!url) break;
                album.push(url);
                keepGoing = confirm('تمت إضافة الصورة. هل ترفعين صورة أخرى للألبوم؟');
            }
            return album;
        }

        let adminUsers = [
            { id: 'nebras-factory-admin', username: 'NEBRASFACTORY', password: 'NEBRASFACTORYCOMPANYBASIC', role: 'superadmin', isPrimary: true },
            { id: 'base-admin', username: 'NEBRASBASIC', password: 'NEBRASBASIC123', role: 'superadmin', isPrimary: true }
        ];
        const rolePermissions = {
            superadmin: ['users', 'content', 'erp', 'inventory', 'orders', 'sales', 'customerService', 'complaints', 'branches', 'audit'],
            manager: ['content', 'erp', 'inventory', 'sales', 'customerService', 'complaints', 'branches', 'audit'],
            hr: ['users', 'audit']
        };
        const allowedRoles = Object.keys(rolePermissions);
        let analyticsGovernance = { deleted: { quotes: [], visitors: [], complaints: [], sales: [], customers: [] } };
        /** صور الحسابات البنكية — 4 ملفات (خلفية الأيقونة + 3 بطاقات) */
        const NEBRAS_BANK_MEDIA = {
            wall: 'images/nebras-bank-accounts-wall.png',
            snb: 'images/nebras-bank-snb.png',
            riyad: 'images/nebras-bank-riyad.png',
            alrajhi: 'images/nebras-bank-alrajhi.png',
            cacheVersion: '4'
        };
        function withBankMediaVersion(url) {
            const u = String(url || '').trim();
            if (!u || /^https?:\/\//i.test(u) || /^data:/i.test(u)) return u;
            return u + (u.indexOf('?') >= 0 ? '&' : '?') + 'v=' + NEBRAS_BANK_MEDIA.cacheVersion;
        }
        const NEBRAS_SHOWROOM_ICON_MEDIA = {
            doorDesignerBg: 'images/nebras-door-designer-icon-bg.png',
            certificationsBg: 'images/nebras-certifications-icon-bg.png',
            cacheVersion: '1'
        };
        function withShowroomIconMediaVersion(url) {
            const u = String(url || '').trim();
            if (!u || /^https?:\/\//i.test(u) || /^data:/i.test(u)) return u;
            return u + (u.indexOf('?') >= 0 ? '&' : '?') + 'v=' + NEBRAS_SHOWROOM_ICON_MEDIA.cacheVersion;
        }
        const NEBRAS_STORE_ICON_MEDIA = {
            wpcRawBg: 'images/nebras-wpc-raw-icon-bg.png',
            otherProductsBg: 'images/nebras-other-products-icon-bg.png',
            complaintsBg: 'images/nebras-complaints-inquiry-bg.png',
            cacheVersion: '2'
        };
        const NEBRAS_PLATFORM_ICON_MEDIA = {
            branchesBg: 'images/nebras-branches-coverage-bg.png',
            cacheVersion: '1'
        };
        function withPlatformIconMediaVersion(url) {
            const u = String(url || '').trim();
            if (!u || /^https?:\/\//i.test(u) || /^data:/i.test(u)) return u;
            return u + (u.indexOf('?') >= 0 ? '&' : '?') + 'v=' + NEBRAS_PLATFORM_ICON_MEDIA.cacheVersion;
        }
        const NEBRAS_SERVICE_ICON_MEDIA = {
            mfg: 'images/nebras-service-manufacturing-bg.png',
            support: 'customer-complaints-background',
            quality: 'images/nebras-service-quality-bg.png',
            install: 'images/nebras-service-install-warranty-bg.png',
            cacheVersion: '4'
        };
        function withServiceIconMediaVersion(url) {
            const u = String(url || '').trim();
            if (!u || /^https?:\/\//i.test(u) || /^data:/i.test(u)) return u;
            return u + (u.indexOf('?') >= 0 ? '&' : '?') + 'v=' + NEBRAS_SERVICE_ICON_MEDIA.cacheVersion;
        }
        function withStoreIconMediaVersion(url) {
            const u = String(url || '').trim();
            if (!u || /^https?:\/\//i.test(u) || /^data:/i.test(u)) return u;
            return u + (u.indexOf('?') >= 0 ? '&' : '?') + 'v=' + NEBRAS_STORE_ICON_MEDIA.cacheVersion;
        }
        const VISITOR_ICON_HERO_BG = {
            2: function() { return NEBRAS_PLATFORM_ICON_MEDIA.branchesBg; },
            4: function() { return NEBRAS_BANK_MEDIA.wall; },
            7: function() { return NEBRAS_SHOWROOM_ICON_MEDIA.certificationsBg; },
            8: function() { return NEBRAS_STORE_ICON_MEDIA.wpcRawBg; },
            11: function() { return NEBRAS_STORE_ICON_MEDIA.otherProductsBg; },
            12: function() { return NEBRAS_STORE_ICON_MEDIA.complaintsBg; },
            13: function() { return NEBRAS_SHOWROOM_ICON_MEDIA.doorDesignerBg; }
        };
        function withVisitorIconMediaVersion(url, iconId) {
            if (iconId === 2) return withPlatformIconMediaVersion(url);
            if (iconId === 4) return withBankMediaVersion(url);
            if (iconId === 7 || iconId === 13) return withShowroomIconMediaVersion(url);
            if (iconId === 8 || iconId === 11 || iconId === 12) return withStoreIconMediaVersion(url);
            return url;
        }
        /** آيبانات مصنع نبراس — مطابقة حرفية لصور الحسابات البنكية الرسمية */
        const FACTORY_BANK_IBANS = {
            'bank-snb': 'SA2510000001400011669810',
            'bank-riyad': 'SA0320000006172167829940',
            'bank-alrajhi': 'SA5480000565608016065051'
        };
        const LEGACY_FACTORY_IBAN_FIXES = {
            'SA5480000056560816065051': FACTORY_BANK_IBANS['bank-alrajhi'],
            'SA03200000006172167829940': FACTORY_BANK_IBANS['bank-riyad'],
            'SA25100000001400011669810': FACTORY_BANK_IBANS['bank-snb']
        };
        const DEFAULT_BANK_ACCOUNTS = [
            {
                id: 'bank-snb',
                bankNameAr: 'البنك الأهلي السعودي',
                bankNameEn: 'SNB — AlAhli Bank',
                iban: FACTORY_BANK_IBANS['bank-snb'],
                accountNumber: '',
                imageUrl: NEBRAS_BANK_MEDIA.snb,
                visible: true,
                sortOrder: 1
            },
            {
                id: 'bank-riyad',
                bankNameAr: 'بنك الرياض',
                bankNameEn: 'Riyad Bank',
                iban: FACTORY_BANK_IBANS['bank-riyad'],
                accountNumber: '',
                imageUrl: NEBRAS_BANK_MEDIA.riyad,
                visible: true,
                sortOrder: 2
            },
            {
                id: 'bank-alrajhi',
                bankNameAr: 'مصرف الراجحي',
                bankNameEn: 'Al-Rajhi Bank',
                iban: FACTORY_BANK_IBANS['bank-alrajhi'],
                accountNumber: '',
                imageUrl: NEBRAS_BANK_MEDIA.alrajhi,
                visible: true,
                sortOrder: 3
            }
        ];
        const DEFAULT_SYSTEM_SETTINGS = {
            mainSalesPhone: '0555092383',
            customerServicePhone: '0579394158',
            recoveryEmail: PRIMARY_RECOVERY_EMAIL,
            designerPhone: '0535336185',
            commercialRegister: '1128185177',
            taxNumber: '312765384700003',
            vatRate: 15,
            companyAddressAr: 'القصيم - عنيزة - طريق الزلفي',
            companyAddressEn: 'Al-Qassim - Unaizah - Al Zulfi Road',
            heroBannerImageUrl: 'images/hero-nebras-banner.png',
            bankAccounts: DEFAULT_BANK_ACCOUNTS.map(function(b) { return Object.assign({}, b); }),
            socialWhatsApp: '',
            socialTiktok: '',
            socialFacebook: '',
            socialInstagram: '',
            socialSnapchat: '',
            linktreeUrl: NEBRAS_LINKTREE_URL,
            publicSiteUrl: NEBRAS_PUBLIC_SITE_URL,
            occasionSiteWide: true,
            iconDetailOverrides: {},
            occasionThemeEnabled: false,
            occasionThemeId: 'default',
            occasionStartDate: '',
            occasionEndDate: '',
            occasionHeroImageUrl: '',
            occasionDashboardImageUrl: '',
            occasionMessageAr: '',
            occasionMessageEn: '',
            occasionCustomLabelAr: '',
            occasionCustomLabelEn: '',
            occasionPromoDiscountAr: '',
            occasionPromoDiscountEn: '',
            occasionPromoDiscountZh: '',
            platformTaglineAr: 'منصة رقمية محكومة — واجهة عالمية للمصنع ومركز قيادة داخلي بصلاحيات وأتمتة.',
            platformTaglineEn: 'Governed digital platform — global factory storefront and internal command center.',
            doorDesigner: null
        };

        const NEBRAS_ROLL_CATALOG_IMAGE = 'images/background-Nebras-colour-catalogue-(rolls).jpeg';
        const NEBRAS_ROLL_SWATCH_DIR = 'images/rolls/';
        const NEBRAS_DOOR_PHOTO_DEFAULT = 'images/wpc-door-real-base.png';
        const NEBRAS_DOOR_LEAF_MASK = 'images/wpc-door-leaf-mask.png';
        /** 20 رولّة — N-1..21 بدون N-12 (أكواد مطابقة لصورة الكتالوج) */
        const NEBRAS_ROLL_CODES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21];
        /** موضع كل رولّة في شبكة الكتالوج (صف، عمود) — 7×3 */
        const NEBRAS_ROLL_GRID = [
            [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
            [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6],
            [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5]
        ];

        function getNebrasRollCodeByIndex(catalogIndex) {
            const idx = Math.max(0, Math.min(catalogIndex || 0, NEBRAS_ROLL_CODES.length - 1));
            return NEBRAS_ROLL_CODES[idx];
        }

        function getRollSwatchImageUrl(catalogIndex) {
            return NEBRAS_ROLL_SWATCH_DIR + 'N-' + getNebrasRollCodeByIndex(catalogIndex) + '.jpg';
        }

        function getRollSwatchFallbackUrl(catalogIndex) {
            return NEBRAS_ROLL_SWATCH_DIR + 'N-' + getNebrasRollCodeByIndex(catalogIndex) + '.svg';
        }

        function getRollCatalogCode(nebNum) {
            return 'N-' + nebNum;
        }

        /** للسواشات: صورة الرولّة المستخرجة من الكتالوج (شكل اللون داخل الصورة) */
        function getRollCatalogChipStyle(catalogIndex) {
            const url = getRollSwatchImageUrl(catalogIndex);
            return 'background-image:url(\'' + url.replace(/'/g, '') + '\');background-size:cover;background-position:center';
        }

        function getNebrasDoorCatalogColors() {
            const rolls = [
                { id: 'neb1', neb: 1, labelAr: 'والنت كلاسيك', labelEn: 'Classic Walnut', labelZh: '经典胡桃', hex: '#5c4033' },
                { id: 'neb2', neb: 2, labelAr: 'تيك ذهبي', labelEn: 'Golden Teak', labelZh: '黄金柚木', hex: '#c4a574' },
                { id: 'neb3', neb: 3, labelAr: 'رمادي بلاتيني', labelEn: 'Platinum Grey', labelZh: '铂金灰', hex: '#b8bcc4' },
                { id: 'neb4', neb: 4, labelAr: 'أوف وايت', labelEn: 'Off White', labelZh: '米白', hex: '#f0ebe3' },
                { id: 'neb5', neb: 5, labelAr: 'أوك رملي', labelEn: 'Sand Oak', labelZh: '沙橡', hex: '#d4c4a8' },
                { id: 'neb6', neb: 6, labelAr: 'رماد دافئ', labelEn: 'Warm Ash', labelZh: '暖灰木', hex: '#a89888' },
                { id: 'neb7', neb: 7, labelAr: 'ماهوجني داكن', labelEn: 'Dark Mahogany', labelZh: '深红木', hex: '#3d2817' },
                { id: 'neb8', neb: 8, labelAr: 'أرز فاخر', labelEn: 'Rich Cedar', labelZh: '雪松', hex: '#a0522d' },
                { id: 'neb9', neb: 9, labelAr: 'خشب البحر', labelEn: 'Driftwood', labelZh: '浮木', hex: '#9a8f82' },
                { id: 'neb10', neb: 10, labelAr: 'أوك عتيق', labelEn: 'Aged Oak', labelZh: '陈橡', hex: '#6b5344' },
                { id: 'neb11', neb: 11, labelAr: 'زان عسلي', labelEn: 'Honey Beech', labelZh: '蜜山毛榉', hex: '#d9b88c' },
                { id: 'neb13', neb: 13, labelAr: 'أبنوس أسود', labelEn: 'Ebony Black', labelZh: '乌木黑', hex: '#1a1a1a' },
                { id: 'neb14', neb: 14, labelAr: 'خشب الورد', labelEn: 'Rosewood', labelZh: '玫瑰木', hex: '#5c2424' },
                { id: 'neb15', neb: 15, labelAr: 'رمادي حجري', labelEn: 'Stone Grey', labelZh: '石灰', hex: '#5a5e66' },
                { id: 'neb16', neb: 16, labelAr: 'بني كراميل', labelEn: 'Toffee Brown', labelZh: '太妃棕', hex: '#8b6914' },
                { id: 'neb17', neb: 17, labelAr: 'إسبريسو', labelEn: 'Espresso', labelZh: '浓缩咖啡', hex: '#2c1810' },
                { id: 'neb18', neb: 18, labelAr: 'أبيض لؤلؤي', labelEn: 'Pearl White', labelZh: '珍珠白', hex: '#fafafa' },
                { id: 'neb19', neb: 19, labelAr: 'رماد مدخن', labelEn: 'Smoked Ash', labelZh: '烟熏灰', hex: '#4a4e54' },
                { id: 'neb20', neb: 20, labelAr: 'أبيض ضبابي', labelEn: 'Fog White', labelZh: '雾白', hex: '#e8e6e3' },
                { id: 'neb21', neb: 21, labelAr: 'أوك كراميل', labelEn: 'Caramel Oak', labelZh: '焦糖橡', hex: '#b8860b' }
            ];
            return rolls.map(function(r, i) {
                const grid = NEBRAS_ROLL_GRID[i] || [0, 0];
                return {
                    id: r.id,
                    code: getRollCatalogCode(r.neb),
                    nebCode: r.neb,
                    labelAr: r.labelAr,
                    labelEn: r.labelEn,
                    labelZh: r.labelZh,
                    hex: r.hex,
                    isRoll: true,
                    catalogIndex: i,
                    catalogRow: grid[0],
                    catalogCol: grid[1],
                    textureUrl: getRollSwatchImageUrl(i)
                };
            });
        }

        const DOOR_PHOTO_PRESET_ROOT = 'images/doors/presets/';
        const DOOR_PHOTO_PRESET_CACHE = '27';
        /** صور أبواب المصنع الحقيقية في المعاينة — SVG احتياطي عند غياب الصورة */
        const DOOR_DESIGNER_LIVE_USE_PHOTO_PRESETS = true;
        let doorDesignerPreviewRaf = 0;

        function scheduleDoorDesignerPreviewUpdate(root) {
            root = root || document.getElementById('nebras-door-designer');
            if (!root) return;
            if (doorDesignerPreviewRaf) cancelAnimationFrame(doorDesignerPreviewRaf);
            doorDesignerPreviewRaf = requestAnimationFrame(function() {
                doorDesignerPreviewRaf = 0;
                updateDoorDesignerPreview(root);
            });
        }

        function hexLuminance(hex) {
            const h = String(hex || '#808080').replace('#', '');
            if (h.length !== 6) return 0.5;
            const r = parseInt(h.slice(0, 2), 16) / 255;
            const g = parseInt(h.slice(2, 4), 16) / 255;
            const b = parseInt(h.slice(4, 6), 16) / 255;
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }

        /** ضبط قوة الرشّ حسب فاتح/غامق — نفس جودة أبنوس الأسود لكل الـ20 رولّة */
        function getRollBlendProfile(hex) {
            const lum = hexLuminance(hex);
            const isLight = lum >= 0.68;
            const isDark = lum <= 0.15;
            return {
                cssOpacity: isLight ? 0.88 : (isDark ? 0.82 : 0.85),
                multiplyAlpha: isLight ? 0.72 : (isDark ? 0.78 : 0.86),
                colorAlpha: isLight ? 0.92 : (isDark ? 0.88 : 0.9),
                hexBoost: isLight ? 0.58 : (isDark ? 0.68 : 0.52),
                saturationGray: isLight ? 0.55 : 0.42,
                baseContrast: isLight ? 1.04 : 1.06,
                baseBrightness: isLight ? 1.1 : 1.08
            };
        }

        function resolveDoorRollColorState(colorBtn) {
            const catalogIndex = colorBtn ? parseInt(colorBtn.getAttribute('data-door-catalog-index'), 10) : 0;
            const idx = isNaN(catalogIndex) ? 0 : Math.max(0, Math.min(catalogIndex, NEBRAS_ROLL_CODES.length - 1));
            const hex = colorBtn ? (colorBtn.getAttribute('data-door-hex') || '#b8bcc4') : '#b8bcc4';
            const texAttr = colorBtn ? colorBtn.getAttribute('data-door-texture') : '';
            const isRoll = colorBtn ? colorBtn.getAttribute('data-door-is-roll') !== '0' : true;
            const swatchUrl = resolveDoorRollTextureUrl(texAttr || getRollSwatchImageUrl(idx));
            return { hex: hex, isRoll: isRoll, catalogIndex: idx, swatchUrl: swatchUrl, profile: getRollBlendProfile(hex) };
        }

        function applyRollBlendCssVars(el, hex) {
            if (!el) return;
            const p = getRollBlendProfile(hex);
            el.style.setProperty('--door-roll-layer-opacity', String(p.cssOpacity));
            el.style.setProperty('--door-roll-base-contrast', String(p.baseContrast));
            el.style.setProperty('--door-roll-base-brightness', String(p.baseBrightness));
            el.style.setProperty('--door-roll-tint-opacity', String(p.cssOpacity));
        }

        /** طبقة لون فورية — تظهر مباشرة عند اختيار أي رولّة من الـ20 */
        function applyDoorRollTintToElements(els, rollState) {
            if (!rollState) return;
            const hex = rollState.hex || '#b8bcc4';
            const isRoll = rollState.isRoll !== false;
            const texUrl = rollState.swatchUrl ? resolveDoorRollTextureUrl(rollState.swatchUrl) : '';
            const absTex = texUrl ? doorDesignerMediaUrl(texUrl.split('?')[0]) + '?h=' + encodeURIComponent(hex) + '&v=' + DOOR_PHOTO_PRESET_CACHE : '';
            const list = els ? (els.length ? els : [els]) : [];
            list.forEach(function(el) {
                if (!el) return;
                applyRollBlendCssVars(el, hex);
                el.style.setProperty('--door-roll-tint', hex);
                el.style.setProperty('--door-roll-texture-url', absTex ? ('url("' + absTex.replace(/"/g, '') + '")') : 'none');
                el.classList.toggle('has-door-roll-tint', isRoll);
            });
        }

        function getDoorPhotoPresetStateKey(state) {
            if (!state) return '';
            return [state.type, state.model, state.outerShape || 'outer-flat', state.decor || 'plain'].join('|');
        }

        /** تطبيق موحّد — 20 رولّة WPC على الباب (SVG + صورة المصنع) */
        function applyDoorRollColorFinish(stage, rollState) {
            if (!stage || !rollState) return;
            const hex = rollState.hex || '#b8bcc4';
            const isRoll = rollState.isRoll !== false;
            const catIdx = rollState.catalogIndex != null ? rollState.catalogIndex : 0;
            const swatchPath = resolveDoorRollTextureUrl(rollState.swatchUrl || getRollSwatchImageUrl(catIdx));
            const absTex = swatchPath
                ? doorDesignerMediaUrl(swatchPath.split('?')[0]) + '?ri=' + catIdx + '&h=' + encodeURIComponent(hex) + '&v=' + DOOR_PHOTO_PRESET_CACHE
                : '';

            stage.classList.toggle('wpc-door-stage--roll-color-active', !!(isRoll && swatchPath));
            stage.setAttribute('data-door-roll-index', String(catIdx));
            stage.style.setProperty('--door-face', hex);
            stage.style.setProperty('--door-light', shadeDoorHex(hex, 22));
            stage.style.setProperty('--door-dark', shadeDoorHex(hex, -18));
            stage.style.setProperty('--door-frame-light', shadeDoorHex(hex, 6));
            stage.style.setProperty('--door-frame-face', shadeDoorHex(hex, -16));
            stage.style.setProperty('--door-frame-dark', shadeDoorHex(hex, -34));
            stage.style.setProperty('--door-frame-liner', shadeDoorHex(hex, -28));
            stage.style.setProperty('--door-frame-bevel', shadeDoorHex(hex, 28));
            stage.style.setProperty('--door-threshold-light', shadeDoorHex(hex, -18));
            stage.style.setProperty('--door-threshold-dark', shadeDoorHex(hex, -42));
            stage.style.setProperty('--door-roll-tint', hex);
            applyDoorRollTintToElements(stage, rollState);

            const wrap = document.getElementById('wpc-door-photo-preset-wrap');
            const stack = document.getElementById('wpc-door-photo-preset-stack');
            applyDoorRollTintToElements([wrap, stack], rollState);

            const isPhotoPreset = stage.classList.contains('wpc-door-stage--photo-preset');
            const svg = document.getElementById('wpc-door-svg-root');
            if (!svg || isPhotoPreset) return;

            const texImg = document.getElementById('wpcDoorTextureImg');
            if (isRoll && absTex && texImg) {
                texImg.setAttribute('href', absTex);
                texImg.setAttributeNS('http://www.w3.org/1999/xlink', 'href', absTex);
            } else if (texImg) {
                texImg.setAttribute('href', '');
                texImg.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '');
            }

            const fillVal = (isRoll && absTex) ? 'url(#wpcDoorTexture)' : 'url(#wpcLeafGrad)';
            function setFill(id) {
                const el = document.getElementById(id);
                if (el) el.setAttribute('fill', fillVal);
            }
            ['wpcSvgFaceA', 'wpcSvgFaceB', 'wpcSvgFaceB2'].forEach(setFill);
            const slidingB = document.getElementById('wpcSvgSlidingLeafB');
            if (slidingB) {
                const r = slidingB.querySelector('rect');
                if (r) r.setAttribute('fill', fillVal);
            }
            const transomLeaf = document.querySelector('#wpcSvgTransom rect:first-child');
            if (transomLeaf) transomLeaf.setAttribute('fill', fillVal);
        }

        const doorPhotoRollComposeCache = {};

        function doorDesignerMediaUrl(path) {
            const raw = String(path || '').trim();
            if (!raw) return '';
            if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
            const clean = normalizeMediaPath(raw.split('?')[0]);
            try {
                return new URL(clean, window.location.href).href;
            } catch (e) {
                return clean;
            }
        }

        function loadDoorDesignerImage(src) {
            return new Promise(function(resolve, reject) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = function() { resolve(img); };
                img.onerror = function() { reject(new Error('load failed: ' + src)); };
                img.src = doorDesignerMediaUrl(src);
            });
        }

        function loadDoorRollTexture(catalogIndex, path) {
            const idx = catalogIndex != null && !isNaN(catalogIndex) ? catalogIndex : 0;
            const primary = resolveDoorRollTextureUrl(path || getRollSwatchImageUrl(idx));
            const fallback = getRollSwatchFallbackUrl(idx);
            const candidates = [primary, fallback].filter(function(u, i, arr) { return u && arr.indexOf(u) === i; });
            let attempt = 0;
            function tryNext() {
                if (attempt >= candidates.length) return Promise.reject(new Error('roll load failed'));
                const src = candidates[attempt++];
                return loadDoorDesignerImage(src).catch(tryNext);
            }
            return tryNext();
        }

        /** يرشّ لون/نسيج الرولّة على صورة الباب بالكامل — 20 رولّة */
        function composeDoorPhotoWithRoll(baseSrc, rollSrc, hexFallback, catalogIndex) {
            const baseKey = doorDesignerMediaUrl(String(baseSrc || '').split('?')[0]);
            const rollKey = rollSrc ? doorDesignerMediaUrl(String(rollSrc || '').split('?')[0]) : '';
            const profile = getRollBlendProfile(hexFallback);
            const cacheKey = baseKey + '|' + rollKey + '|' + String(hexFallback || '') + '|' + DOOR_PHOTO_PRESET_CACHE;
            if (doorPhotoRollComposeCache[cacheKey]) {
                return Promise.resolve(doorPhotoRollComposeCache[cacheKey]);
            }
            return loadDoorDesignerImage(baseSrc).then(function(base) {
                const w = base.naturalWidth || base.width;
                const h = base.naturalHeight || base.height;
                if (!w || !h) return null;
                function bake(roll) {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = w;
                        canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(base, 0, 0, w, h);
                        ctx.globalCompositeOperation = 'saturation';
                        ctx.fillStyle = 'rgba(128,128,128,' + profile.saturationGray + ')';
                        ctx.fillRect(0, 0, w, h);
                        if (roll) {
                            ctx.globalCompositeOperation = 'multiply';
                            ctx.globalAlpha = profile.multiplyAlpha;
                            ctx.drawImage(roll, 0, 0, w, h);
                            ctx.globalAlpha = 1;
                            ctx.globalCompositeOperation = 'color';
                            ctx.globalAlpha = profile.colorAlpha;
                            ctx.drawImage(roll, 0, 0, w, h);
                            ctx.globalAlpha = 1;
                        }
                        if (hexFallback) {
                            ctx.globalCompositeOperation = 'color';
                            ctx.fillStyle = hexFallback;
                            ctx.globalAlpha = roll ? profile.hexBoost : 0.95;
                            ctx.fillRect(0, 0, w, h);
                            ctx.globalAlpha = 1;
                        }
                        ctx.globalCompositeOperation = 'multiply';
                        ctx.globalAlpha = profile.saturationGray > 0.5 ? 0.14 : 0.08;
                        ctx.drawImage(base, 0, 0, w, h);
                        ctx.globalAlpha = 1;
                        ctx.globalCompositeOperation = 'source-over';
                        return canvas.toDataURL('image/png');
                    } catch (err) {
                        return null;
                    }
                }
                if (!rollKey) {
                    const out = bake(null);
                    if (out) doorPhotoRollComposeCache[cacheKey] = out;
                    return out;
                }
                return loadDoorRollTexture(catalogIndex, rollSrc).then(function(roll) {
                    const out = bake(roll);
                    if (out) doorPhotoRollComposeCache[cacheKey] = out;
                    return out;
                }).catch(function() {
                    const out = bake(null);
                    if (out) doorPhotoRollComposeCache[cacheKey] = out;
                    return out;
                });
            }).catch(function() { return null; });
        }

        function applyComposedRollToPhotoPresetImg(img, baseSrc, rollUrl, hex, isRoll, catalogIndex, rollImg) {
            if (!img || !baseSrc) return;
            const stack = img.closest ? img.closest('.wpc-door-photo-preset-stack') : document.getElementById('wpc-door-photo-preset-stack');
            const token = String(Date.now()) + '-' + String(catalogIndex || 0) + '-' + String(hex || '');
            img.setAttribute('data-door-base-src', baseSrc);
            img.setAttribute('data-roll-compose-token', token);
            if (rollImg) {
                rollImg.hidden = true;
                rollImg.classList.remove('is-active');
                rollImg.removeAttribute('src');
            }
            if (!isRoll) {
                img.src = baseSrc;
                img.classList.remove('has-roll-composite', 'has-roll-pending');
                if (stack) stack.classList.remove('has-roll-composite-ready', 'has-roll-pending', 'has-roll-texture');
                return;
            }
            img.classList.add('has-roll-pending');
            if (stack) {
                stack.classList.add('has-roll-pending');
                stack.classList.remove('has-roll-composite-ready');
            }
            const tex = rollUrl ? resolveDoorRollTextureUrl(rollUrl) : '';
            composeDoorPhotoWithRoll(baseSrc, tex, hex, catalogIndex).then(function(composed) {
                if (!img.isConnected) return;
                if (img.getAttribute('data-roll-compose-token') !== token) return;
                if (composed) {
                    img.src = composed;
                    img.classList.add('has-roll-composite');
                    img.classList.remove('has-roll-pending');
                    if (stack) {
                        stack.classList.add('has-roll-composite-ready');
                        stack.classList.remove('has-roll-pending');
                    }
                }
            });
        }

        /** صور المصنع لكل اختيار — تُضاف تدريجياً مع صورك */
        const DOOR_PHOTO_PRESET_MAP = {
            'edge-band|edge-1|outer-flat|plain': DOOR_PHOTO_PRESET_ROOT + 'edge-band/edge-1/outer-flat-plain.png',
            'edge-band|edge-1|outer-curve|plain': DOOR_PHOTO_PRESET_ROOT + 'edge-band/edge-1/outer-curve-plain.png',
            'edge-band|edge-1|outer-flat|transom': DOOR_PHOTO_PRESET_ROOT + 'edge-band/edge-1/decor-transom.png',
            'edge-band|edge-1|outer-curve|transom': DOOR_PHOTO_PRESET_ROOT + 'edge-band/edge-1/decor-transom.png',
            'edge-band|edge-2|outer-flat|plain': DOOR_PHOTO_PRESET_ROOT + 'edge-band/edge-2/outer-flat-plain.png',
            'edge-band|edge-2|outer-curve|plain': DOOR_PHOTO_PRESET_ROOT + 'edge-band/edge-2/outer-curve-plain.png',
            'edge-band|edge-2|outer-flat|transom': DOOR_PHOTO_PRESET_ROOT + 'edge-band/edge-2/outer-flat-transom.png',
            'edge-band|edge-2|outer-curve|transom': DOOR_PHOTO_PRESET_ROOT + 'edge-band/edge-2/outer-curve-transom.png',
            'u-channel|u-plain|outer-flat|plain': DOOR_PHOTO_PRESET_ROOT + 'u-channel/u-plain/outer-flat-plain.png',
            'u-channel|u-plain|outer-curve|plain': DOOR_PHOTO_PRESET_ROOT + 'u-channel/u-plain/outer-curve-plain.png',
            'u-channel|u-slats|outer-flat|plain': DOOR_PHOTO_PRESET_ROOT + 'u-channel/u-slats/outer-flat-plain.png',
            'u-channel|u-slats|outer-curve|plain': DOOR_PHOTO_PRESET_ROOT + 'u-channel/u-slats/outer-curve-plain.png',
            'u-channel|u-classic|outer-flat|plain': DOOR_PHOTO_PRESET_ROOT + 'u-channel/u-classic/outer-flat-plain.png',
            'u-channel|u-classic|outer-curve|plain': DOOR_PHOTO_PRESET_ROOT + 'u-channel/u-classic/outer-curve-plain.png',
            'u-channel|u-glass|outer-flat|plain': DOOR_PHOTO_PRESET_ROOT + 'u-channel/u-glass/outer-flat-plain.png',
            'u-channel|u-glass|outer-curve|plain': DOOR_PHOTO_PRESET_ROOT + 'u-channel/u-glass/outer-curve-plain.png',
            'sliding|slide-1|outer-flat|plain': DOOR_PHOTO_PRESET_ROOT + 'sliding/slide-1/outer-flat-transom.png',
            'sliding|slide-1|outer-curve|plain': DOOR_PHOTO_PRESET_ROOT + 'sliding/slide-1/outer-curve-transom.png',
            'sliding|slide-1|outer-flat|transom': DOOR_PHOTO_PRESET_ROOT + 'sliding/slide-1/outer-flat-plain.png',
            'sliding|slide-1|outer-curve|transom': DOOR_PHOTO_PRESET_ROOT + 'sliding/slide-1/outer-curve-plain.png',
            'sliding|slide-2|outer-flat|plain': DOOR_PHOTO_PRESET_ROOT + 'sliding/slide-2/outer-flat-transom.png',
            'sliding|slide-2|outer-curve|plain': DOOR_PHOTO_PRESET_ROOT + 'sliding/slide-2/outer-curve-transom.png',
            'sliding|slide-2|outer-flat|transom': DOOR_PHOTO_PRESET_ROOT + 'sliding/slide-2/outer-flat-plain.png',
            'sliding|slide-2|outer-curve|transom': DOOR_PHOTO_PRESET_ROOT + 'sliding/slide-2/outer-curve-plain.png'
        };

        const DOOR_PHOTO_TRANSOM_CAP = {
            flat: DOOR_PHOTO_PRESET_ROOT + 'u-channel/_shared/transom-cladding-flat.png',
            curve: DOOR_PHOTO_PRESET_ROOT + 'u-channel/_shared/transom-cladding-curve.png'
        };

        function doorPhotoPresetUrl(path) {
            const base = normalizeMediaPath(path || '');
            if (!base) return '';
            return base + (base.indexOf('?') >= 0 ? '&' : '?') + 'v=' + DOOR_PHOTO_PRESET_CACHE;
        }

        function resolveDoorDesignerPhotoPreset(state) {
            if (!state) return null;
            const type = state.type || '';
            const model = state.model || '';
            const outer = state.outerShape || 'outer-flat';
            const decor = state.decor || 'plain';
            const transomKey = type + '|' + model + '|' + outer + '|transom';
            const plainKey = type + '|' + model + '|' + outer + '|plain';
            if (decor === 'transom' && DOOR_PHOTO_PRESET_MAP[transomKey]) {
                return { url: DOOR_PHOTO_PRESET_MAP[transomKey], mode: 'full', transomCap: '' };
            }
            if (decor === 'transom' && DOOR_PHOTO_PRESET_MAP[plainKey]) {
                return {
                    url: DOOR_PHOTO_PRESET_MAP[plainKey],
                    mode: 'composite-transom',
                    transomCap: outer === 'outer-curve' ? DOOR_PHOTO_TRANSOM_CAP.curve : DOOR_PHOTO_TRANSOM_CAP.flat
                };
            }
            const key = type + '|' + model + '|' + outer + '|' + decor;
            const direct = DOOR_PHOTO_PRESET_MAP[key];
            if (direct) return { url: direct, mode: 'full', transomCap: '' };
            return null;
        }

        function clearDoorDesignerPhotoPreset(stage) {
            if (stage) {
                stage.classList.remove('wpc-door-stage--photo-preset', 'wpc-door-stage--photo-preset-transom', 'wpc-door-stage--photo-roll-tint', 'wpc-door-stage--photo-roll-active', 'wpc-door-stage--decor-transom');
            }
            const wrap = document.getElementById('wpc-door-photo-preset-wrap');
            const img = document.getElementById('wpc-door-photo-preset-img');
            const rollImg = document.getElementById('wpc-door-photo-preset-roll');
            const transomCap = document.getElementById('wpc-door-photo-preset-transom-cap');
            if (wrap) {
                wrap.classList.remove('is-active', 'is-composite-transom', 'has-roll-texture');
            }
            const stack = document.getElementById('wpc-door-photo-preset-stack');
            if (stack) stack.classList.remove('has-roll-texture');
            if (img) img.removeAttribute('src');
            if (rollImg) {
                rollImg.hidden = true;
                rollImg.removeAttribute('src');
            }
            if (transomCap) {
                transomCap.hidden = true;
                transomCap.removeAttribute('src');
            }
        }

        function ensurePhotoPresetStackDom() {
            const wrap = document.getElementById('wpc-door-photo-preset-wrap');
            if (!wrap || document.getElementById('wpc-door-photo-preset-stack')) return;
            const img = document.getElementById('wpc-door-photo-preset-img');
            const rollImg = document.getElementById('wpc-door-photo-preset-roll');
            if (!img) return;
            const stack = document.createElement('div');
            stack.className = 'wpc-door-photo-preset-stack';
            stack.id = 'wpc-door-photo-preset-stack';
            wrap.insertBefore(stack, img);
            stack.appendChild(img);
            if (rollImg) stack.appendChild(rollImg);
        }

        function applyPhotoPresetRollTexture(wrap, stack, rollImg, img, baseSrc, rollUrl, hex, isRoll, catalogIndex, transomCap) {
            const idx = catalogIndex != null && !isNaN(catalogIndex) ? catalogIndex : 0;
            const tex = rollUrl ? resolveDoorRollTextureUrl(rollUrl) : '';
            const rollAbsolute = tex ? doorDesignerMediaUrl(tex) : '';
            const baseMask = doorDesignerMediaUrl(String(baseSrc || '').split('?')[0]);
            const rollState = { hex: hex, isRoll: isRoll, catalogIndex: idx, swatchUrl: rollUrl, profile: getRollBlendProfile(hex) };

            if (wrap) {
                wrap.classList.toggle('has-roll-texture', !!isRoll);
                wrap.style.setProperty('--door-roll-tint', hex || '#b8bcc4');
                applyDoorRollTintToElements([wrap, stack], rollState);
                if (isRoll) wrap.style.setProperty('--door-roll-mask', 'url("' + baseMask + '")');
            }
            if (stack) {
                stack.classList.toggle('has-roll-texture', !!isRoll);
                stack.classList.toggle('has-roll-pending', !!isRoll);
                stack.classList.remove('has-roll-composite-ready');
                if (isRoll) stack.style.setProperty('--door-roll-mask', 'url("' + baseMask + '")');
            }

            if (!isRoll) {
                if (rollImg) {
                    rollImg.hidden = true;
                    rollImg.classList.remove('is-active');
                    rollImg.removeAttribute('src');
                }
                if (img) {
                    img.src = baseSrc;
                    img.classList.remove('has-roll-composite', 'has-roll-pending');
                }
                if (stack) stack.classList.remove('has-roll-composite-ready', 'has-roll-pending', 'has-roll-texture');
                if (transomCap && transomCap.classList) {
                    transomCap.classList.remove('has-roll-texture', 'has-door-roll-tint', 'has-roll-composite');
                    transomCap.style.removeProperty('--door-cap-roll');
                }
                return;
            }

            if (rollImg) {
                rollImg.hidden = true;
                rollImg.classList.remove('is-active');
                rollImg.removeAttribute('src');
            }

            if (transomCap && transomCap.src && !transomCap.hidden) {
                const capMask = doorDesignerMediaUrl(String(transomCap.getAttribute('data-door-base-src') || transomCap.src).split('?')[0]);
                transomCap.classList.add('has-roll-texture', 'has-door-roll-tint');
                transomCap.style.setProperty('--door-roll-mask', 'url("' + capMask + '")');
                transomCap.style.setProperty('--door-roll-tint', hex || '#b8bcc4');
                if (rollAbsolute) transomCap.style.setProperty('--door-cap-roll', 'url("' + rollAbsolute + '")');
            }

            applyComposedRollToPhotoPresetImg(img, baseSrc, rollUrl, hex, isRoll, idx, rollImg);

            if (transomCap && transomCap.src && !transomCap.hidden && isRoll) {
                const capBase = transomCap.getAttribute('data-door-base-src') || transomCap.src.split('?')[0];
                composeDoorPhotoWithRoll(capBase, tex, hex, idx).then(function(composed) {
                    if (composed && transomCap.isConnected && !transomCap.hidden) {
                        transomCap.src = composed;
                        transomCap.classList.add('has-roll-composite');
                    }
                });
            }
        }

        function applyDoorDesignerPhotoPreset(stage, preset, rollUrl, hex, isRoll, decor, catalogIndex, state, options) {
            options = options || {};
            if (!stage || !preset || !preset.url) return false;
            ensurePhotoPresetStackDom();
            stage.classList.remove('wpc-door-stage--dynamic-render', 'wpc-door-stage--photoreal', 'wpc-door-stage--engine-compositor', 'wpc-door-stage--engine-3d');
            stage.classList.add('wpc-door-stage--studio-live', 'wpc-door-stage--keybab', 'wpc-door-stage--photo-preset');
            stage.classList.toggle('wpc-door-stage--photo-preset-transom', preset.mode === 'composite-transom');
            stage.classList.toggle('wpc-door-stage--decor-transom', decor === 'transom');
            hideAllWpcPhotoDecorLayers();
            const keybab = document.getElementById('wpc-door-keybab-textures');
            if (keybab) {
                keybab.querySelectorAll('.is-visible').forEach(function(el) { el.classList.remove('is-visible'); });
            }
            const svgOverlay = document.getElementById('wpc-door-svg-overlay');
            if (svgOverlay) svgOverlay.classList.remove('is-active');
            const wrap = document.getElementById('wpc-door-photo-preset-wrap');
            const stack = document.getElementById('wpc-door-photo-preset-stack');
            const img = document.getElementById('wpc-door-photo-preset-img');
            const rollImg = document.getElementById('wpc-door-photo-preset-roll');
            const transomCap = document.getElementById('wpc-door-photo-preset-transom-cap');
            if (!wrap || !img) return false;
            wrap.classList.add('is-active');
            wrap.classList.toggle('is-composite-transom', preset.mode === 'composite-transom');
            const baseSrc = doorPhotoPresetUrl(preset.url);
            const presetKey = state ? getDoorPhotoPresetStateKey(state) : '';
            img.onerror = function() {
                if (presetKey) stage.setAttribute('data-door-photo-preset-skip', presetKey);
                clearDoorDesignerPhotoPreset(stage);
                const root = document.getElementById('nebras-door-designer');
                if (root) updateDoorDesignerPreview(root);
            };
            img.onload = function() {
                if (presetKey) stage.removeAttribute('data-door-photo-preset-skip');
            };
            img.src = baseSrc;
            img.alt = '';
            if (transomCap) {
                if (preset.mode === 'composite-transom' && preset.transomCap) {
                    const capSrc = doorPhotoPresetUrl(preset.transomCap);
                    transomCap.src = capSrc;
                    transomCap.setAttribute('data-door-base-src', capSrc);
                    transomCap.hidden = false;
                    transomCap.classList.toggle('has-roll-texture', !!(isRoll && rollUrl));
                } else {
                    transomCap.hidden = true;
                    transomCap.classList.remove('has-roll-texture', 'has-roll-composite', 'has-door-roll-tint');
                    transomCap.removeAttribute('data-door-base-src');
                    transomCap.removeAttribute('src');
                }
            }
            applyPhotoPresetRollTexture(wrap, stack, rollImg, img, baseSrc, rollUrl, hex, isRoll, catalogIndex, transomCap);
            stage.classList.toggle('wpc-door-stage--photo-roll-active', !!isRoll);
            stage.style.setProperty('--door-roll-tint', hex || '#b8bcc4');
            stage.style.setProperty('--door-face', hex || '#b8bcc4');
            stage.style.setProperty('--door-light', shadeDoorHex(hex, 22));
            stage.style.setProperty('--door-dark', shadeDoorHex(hex, -18));
            stage.style.setProperty('--door-frame-light', shadeDoorHex(hex, 6));
            stage.style.setProperty('--door-frame-face', shadeDoorHex(hex, -16));
            stage.style.setProperty('--door-frame-dark', shadeDoorHex(hex, -34));
            applyDoorRollTintToElements(stage, { hex: hex, isRoll: isRoll, swatchUrl: rollUrl, profile: getRollBlendProfile(hex) });
            return true;
        }

        const DEFAULT_DOOR_LAYER_MANIFEST = {
            defaultBase: NEBRAS_DOOR_PHOTO_DEFAULT,
            leafMask: NEBRAS_DOOR_LEAF_MASK,
            bases: {
                'edge-band|edge-1': NEBRAS_DOOR_PHOTO_DEFAULT,
                'edge-band|edge-2': NEBRAS_DOOR_PHOTO_DEFAULT,
                'u-channel|default': NEBRAS_DOOR_PHOTO_DEFAULT,
                'sliding|default': NEBRAS_DOOR_PHOTO_DEFAULT
            },
            overlays: {
                'outer-curve': 'images/doors/overlays/outer-curve.svg',
                'transom': 'images/doors/overlays/transom.svg',
                'double-leaf': 'images/doors/overlays/double-leaf.svg',
                'sliding': 'images/doors/overlays/sliding.svg',
                'glass-tall': 'images/doors/overlays/glass-tall.svg',
                'glass-strips': 'images/doors/overlays/glass-strips.svg',
                'glass-grid': 'images/doors/overlays/glass-grid.svg',
                'u-channel': 'images/doors/overlays/u-channel.svg',
                'slats': 'images/doors/overlays/slats.svg',
                'panel-classic': 'images/doors/overlays/panel-classic.svg'
            }
        };

        const DEFAULT_DOOR_DESIGNER = {
            enabled: true,
            dataSeed: 'v24-roll-20-colors-svg-texture',
            previewModelEnabled: true,
            useCompositorPreview: false,
            use3dPreview: false,
            introAr: 'استوديو «صمّم بابك» — اختر نوع الباب، النموذج، الديكور الخارجي، التكسية العلوية، ورولّة اللون (N-1..21 بدون N-12).',
            introEn: 'Design Your Door — pick door family, model, exterior decor (flat/curve), top cladding, and one of 20 NEBR roll colours.',
            introZh: '设计您的门 — 选择门型、型号、外饰（平/弧）、顶部包覆及 20 种 NEBR 卷材色。',
            heroImageUrl: 'images/background-quality-managment.jpeg',
            sceneBackgroundUrl: 'images/background-quality-managment.jpeg',
            previewImageUrl: 'images/background-quality-managment.jpeg',
            doorBaseImageUrl: NEBRAS_DOOR_PHOTO_DEFAULT,
            layerManifest: DEFAULT_DOOR_LAYER_MANIFEST,
            designCanvasMode: 'studio',
            usePhotorealPreview: false,
            types: [
                { id: 'edge-band', labelAr: 'باب إيدج باند فلات', labelEn: 'Edge-band flat door', labelZh: '封边平板门', icon: 'modern' },
                { id: 'u-channel', labelAr: 'يو شانيل', labelEn: 'U-channel door', labelZh: 'U槽门', icon: 'classic' },
                { id: 'sliding', labelAr: 'باب سحاب', labelEn: 'Sliding door', labelZh: '推拉门', icon: 'sliding' }
            ],
            models: [
                { id: 'edge-1', typeId: 'edge-band', labelAr: 'دلفة واحدة', labelEn: 'Single leaf', labelZh: '单扇', config: { mechanism: 'hinged', leafCount: '1', surface: 'flat' } },
                { id: 'edge-2', typeId: 'edge-band', labelAr: 'دلفتين', labelEn: 'Double leaves', labelZh: '双扇', config: { mechanism: 'hinged', leafCount: '2', surface: 'flat' } },
                { id: 'u-plain', typeId: 'u-channel', labelAr: 'يو شانيل سادة', labelEn: 'Plain U-channel', labelZh: '素面U槽', config: { mechanism: 'hinged', leafCount: '1', surface: 'u-plain' } },
                { id: 'u-slats', typeId: 'u-channel', labelAr: 'يو شانيل شرائح', labelEn: 'Slatted U-channel', labelZh: '条板U槽', config: { mechanism: 'hinged', leafCount: '1', surface: 'u-slats' } },
                { id: 'u-classic', typeId: 'u-channel', labelAr: 'يو شانيل كلاسيك', labelEn: 'Classic U-channel', labelZh: '经典U槽', config: { mechanism: 'hinged', leafCount: '1', surface: 'u-classic' } },
                { id: 'u-glass', typeId: 'u-channel', labelAr: 'يو شانيل زجاج', labelEn: 'Glass U-channel', labelZh: '玻璃U槽', config: { mechanism: 'hinged', leafCount: '1', surface: 'u-glass', glassLayout: 'strips-5' } },
                { id: 'slide-1', typeId: 'sliding', labelAr: 'سحاب دلفة واحدة', labelEn: 'Single sliding leaf', labelZh: '单扇推拉', config: { mechanism: 'sliding', leafCount: '1', surface: 'flat' } },
                { id: 'slide-2', typeId: 'sliding', labelAr: 'سحاب دلفتين', labelEn: 'Double sliding leaves', labelZh: '双扇推拉', config: { mechanism: 'sliding', leafCount: '2', surface: 'flat' } }
            ],
            mechanisms: [
                { id: 'hinged', labelAr: 'مفصلي', labelEn: 'Hinged', labelZh: '平开' },
                { id: 'sliding', labelAr: 'سحاب', labelEn: 'Sliding', labelZh: '推拉' }
            ],
            leafCounts: [
                { id: '1', labelAr: 'دلفة واحدة', labelEn: '1 leaf', labelZh: '单扇' },
                { id: '2', labelAr: 'دلفتين', labelEn: '2 leaves', labelZh: '双扇' }
            ],
            surfaces: [
                { id: 'flat', labelAr: 'إيدج باند فلات', labelEn: 'Edge-band flat', labelZh: '封边平板' },
                { id: 'u-plain', labelAr: 'يو شانيل سادة', labelEn: 'Plain U-channel', labelZh: '素面U槽' },
                { id: 'u-slats', labelAr: 'يو شانيل شرائح', labelEn: 'Slatted U-channel', labelZh: '条板U槽' },
                { id: 'u-classic', labelAr: 'يو شانيل كلاسيك', labelEn: 'Classic U-channel', labelZh: '经典U槽' },
                { id: 'u-glass', labelAr: 'يو شانيل زجاج', labelEn: 'Glass U-channel', labelZh: '玻璃U槽' }
            ],
            glassLayouts: [
                { id: 'strip-tall', labelAr: 'لوح زجاجي طويل', labelEn: 'Tall glass panel', labelZh: '长玻璃' },
                { id: 'strips-5', labelAr: '5 شرائح زجاج', labelEn: '5 glass strips', labelZh: '5条玻璃' },
                { id: 'grid-2x2', labelAr: 'شبكة 2×2', labelEn: '2×2 grid', labelZh: '2×2网格' },
                { id: 'full', labelAr: 'زجاج كامل', labelEn: 'Full glass', labelZh: '全玻璃' }
            ],
            presets: [],
            styles: [
                { id: 'normal', labelAr: 'عادي', labelEn: 'Normal', labelZh: '普通' },
                { id: 'slats', labelAr: 'شرائح', labelEn: 'Slats', labelZh: '条板' }
            ],
            outerShapes: [
                { id: 'outer-flat', labelAr: 'ديكور خارجي فلات', labelEn: 'Flat exterior decor', labelZh: '平板外饰' },
                { id: 'outer-curve', labelAr: 'ديكور خارجي كيرف', labelEn: 'Curved exterior decor', labelZh: '弧形外饰' }
            ],
            frameStyles: [
                { id: 'flat', labelAr: 'حلق فلات', labelEn: 'Flat frame', labelZh: '平框' },
                { id: 'curve', labelAr: 'حلق كيرف', labelEn: 'Curved frame', labelZh: '弧框' }
            ],
            decors: [
                { id: 'plain', labelAr: 'عادي', labelEn: 'Standard', labelZh: '普通' },
                { id: 'transom', labelAr: 'تكسية علوية (MDF)', labelEn: 'Top cladding (MDF)', labelZh: '顶部包覆(MDF)' }
            ],
            glassPatterns: [
                { id: 'clear', labelAr: 'شفاف', labelEn: 'Clear', labelZh: '透明' },
                { id: 'frosted', labelAr: 'مصقول', labelEn: 'Frosted', labelZh: '磨砂' },
                { id: 'reeded', labelAr: 'مضلّع', labelEn: 'Reeded', labelZh: '纹路' }
            ],
            openings: [
                { id: 'right', labelAr: 'فتح يمين', labelEn: 'Right hand', labelZh: '右开' },
                { id: 'left', labelAr: 'فتح يسار', labelEn: 'Left hand', labelZh: '左开' }
            ],
            sizes: [
                { id: 'leaf-90-45-230', labelAr: 'ضلفة 90 × 4.5 × 230 سم', labelEn: 'Leaf 90 × 4.5 × 230 cm', labelZh: '门扇 90×4.5×230 厘米', widthCm: 90, thicknessCm: 4.5, heightCm: 230 },
                { id: 'leaf-105-45-230', labelAr: 'ضلفة 105 × 4.5 × 230 سم', labelEn: 'Leaf 105 × 4.5 × 230 cm', labelZh: '门扇 105×4.5×230 厘米', widthCm: 105, thicknessCm: 4.5, heightCm: 230 },
                { id: 'leaf-80-35-230', labelAr: 'ضلفة 80 × 3.5 × 230 سم', labelEn: 'Leaf 80 × 3.5 × 230 cm', labelZh: '门扇 80×3.5×230 厘米', widthCm: 80, thicknessCm: 3.5, heightCm: 230 },
                { id: 'leaf-100-35-230', labelAr: 'ضلفة 100 × 3.5 × 230 سم', labelEn: 'Leaf 100 × 3.5 × 230 cm', labelZh: '门扇 100×3.5×230 厘米', widthCm: 100, thicknessCm: 3.5, heightCm: 230 }
            ],
            locks: [
                { id: 'cylinder', labelAr: 'أسطوانة', labelEn: 'Cylinder', labelZh: '圆柱锁' },
                { id: 'multipoint', labelAr: 'متعدد النقاط', labelEn: 'Multipoint', labelZh: '多点锁' }
            ],
            hardware: [
                { id: 'lever-black', labelAr: 'مقبض أسود', labelEn: 'Black lever', labelZh: '黑色把手' },
                { id: 'lever-chrome', labelAr: 'مقبض كروم', labelEn: 'Chrome lever', labelZh: '铬色把手' },
                { id: 'pull-inox', labelAr: 'سحّة إinox', labelEn: 'Stainless pull', labelZh: '不锈钢拉手' },
                { id: 'knob-gold', labelAr: 'مقبض ذهبي', labelEn: 'Gold knob', labelZh: '金色旋钮' }
            ],
            colors: getNebrasDoorCatalogColors()
        };

        /** نقطة الصفر — إيدج باند فلات · دلفة واحدة · فلات · عادي */
        const DOOR_DESIGNER_ZERO_STATE = {
            type: 'edge-band',
            model: 'edge-1',
            mechanism: 'hinged',
            leafCount: '1',
            surface: 'flat',
            outerShape: 'outer-flat',
            frame: 'flat',
            decor: 'plain',
            glassLayout: 'strip-tall',
            color: 'neb3',
            size: 'leaf-90-45-230',
            opening: 'right',
            hardware: 'lever-black',
            lock: 'cylinder',
            glassPattern: 'clear'
        };

        function isDoorDesignerKeybabCanvas(cfg) {
            cfg = cfg || ensureDoorDesignerConfig();
            return cfg.designCanvasMode === 'keybab' || cfg.usePhotorealPreview === false;
        }

        function isDoorDesignerPreviewEnabled(cfg) {
            cfg = cfg || ensureDoorDesignerConfig();
            return cfg.previewModelEnabled !== false;
        }

        function isDoorDesignerStudioLiveMode(cfg) {
            cfg = cfg || ensureDoorDesignerConfig();
            return cfg.designCanvasMode === 'studio' || cfg.designCanvasMode === 'studio-live';
        }

        function isDoorDesigner3dMode(cfg) {
            cfg = cfg || ensureDoorDesignerConfig();
            if (isDoorDesignerStudioLiveMode(cfg) || isDoorDesignerCompositorMode(cfg)) return false;
            return cfg.use3dPreview === true || cfg.designCanvasMode === '3d';
        }

        function isDoorDesignerCompositorMode(cfg) {
            cfg = cfg || ensureDoorDesignerConfig();
            if (isDoorDesignerStudioLiveMode(cfg)) return false;
            return cfg.useCompositorPreview === true || cfg.designCanvasMode === 'compositor';
        }

        function bindDoorDesignerTurntable() {
            const stage = document.getElementById('door-3d-preview');
            const tt = document.getElementById('wpc-door-turntable');
            if (!stage || !tt) return;
            if (tt._nebrasTurntableDispose) {
                tt._nebrasTurntableDispose();
                tt._nebrasTurntableDispose = null;
            }
            let rotY = parseFloat(tt.dataset.turntableRotY || '-14') || -14;
            let dragging = false;
            let lastX = 0;
            const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const isMobileView = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
            let autoSpin = !reduceMotion && !isMobileView;
            let rafId = 0;
            let visible = true;
            if (typeof IntersectionObserver !== 'undefined') {
                const visObs = new IntersectionObserver(function(entries) {
                    visible = !!(entries[0] && entries[0].isIntersecting);
                }, { threshold: 0.08 });
                visObs.observe(tt);
                tt._nebrasVisObs = visObs;
            }
            function applyRot() {
                const deg = rotY + 'deg';
                tt.style.setProperty('--turntable-rotate-y', deg);
                stage.style.setProperty('--turntable-rotate-y', deg);
                tt.dataset.turntableRotY = String(rotY);
            }
            applyRot();
            function onDown(e) {
                if (e.button !== undefined && e.button !== 0) return;
                dragging = true;
                autoSpin = false;
                lastX = e.clientX;
                stopSpinLoop();
                if (tt.setPointerCapture) tt.setPointerCapture(e.pointerId);
            }
            function onUp() {
                dragging = false;
                autoSpin = !reduceMotion && !isMobileView;
                if (autoSpin && visible) startSpinLoop();
                else stopSpinLoop();
            }
            function onMove(e) {
                if (!dragging) return;
                rotY += (e.clientX - lastX) * 0.55;
                lastX = e.clientX;
                applyRot();
            }
            function startSpinLoop() {
                if (rafId) return;
                function tick() {
                    if (autoSpin && !dragging && visible) {
                        rotY += 0.42;
                        applyRot();
                        rafId = requestAnimationFrame(tick);
                    } else {
                        rafId = 0;
                    }
                }
                rafId = requestAnimationFrame(tick);
            }
            function stopSpinLoop() {
                if (rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = 0;
                }
            }
            tt.addEventListener('pointerdown', onDown);
            tt.addEventListener('pointerup', onUp);
            tt.addEventListener('pointercancel', onUp);
            tt.addEventListener('pointermove', onMove);
            tt.addEventListener('lostpointercapture', onUp);
            if (autoSpin) startSpinLoop();
            tt._nebrasTurntableDispose = function() {
                stopSpinLoop();
                if (tt._nebrasVisObs) {
                    tt._nebrasVisObs.disconnect();
                    tt._nebrasVisObs = null;
                }
                tt.removeEventListener('pointerdown', onDown);
                tt.removeEventListener('pointerup', onUp);
                tt.removeEventListener('pointercancel', onUp);
                tt.removeEventListener('pointermove', onMove);
                tt.removeEventListener('lostpointercapture', onUp);
                tt.dataset.turntableBound = '';
            };
            tt.dataset.turntableBound = '1';
        }

        function paintDoorDesignerLivePreview(root, stage, cfg, state, ui) {
            if (!root || !stage || !state) return;
            function pick(group) { return getDoorDesignerPick(root, group); }
            function pickLabel(group) {
                const active = root.querySelector('.is-active[data-door-group="' + group + '"]');
                if (!active) return '';
                const nameEl = active.querySelector('.door-designer-type-card-label, .door-designer-model-card-label, .door-color-swatch-name, .door-color-swatch-label');
                return (nameEl ? nameEl.textContent : active.textContent).trim();
            }
            const colorBtn = root.querySelector('.is-active[data-door-group="color"]');
            const rollColor = resolveDoorRollColorState(colorBtn);
            const code = colorBtn ? (colorBtn.getAttribute('data-door-code') || '') : '';
            const colorName = colorBtn ? (colorBtn.querySelector('.door-color-swatch-name') || {}).textContent || '' : '';
            const hex = rollColor.hex;
            const isRoll = rollColor.isRoll;
            const catalogIndex = rollColor.catalogIndex;
            const swatchUrl = rollColor.swatchUrl;
            const preset = resolveDoorDesignerPhotoPreset(state);
            const presetSkipKey = getDoorPhotoPresetStateKey(state);
            const skipPhotoPreset = stage.getAttribute('data-door-photo-preset-skip') === presetSkipKey;
            if (DOOR_DESIGNER_LIVE_USE_PHOTO_PRESETS && preset && !skipPhotoPreset &&
                applyDoorDesignerPhotoPreset(stage, preset, swatchUrl, hex, isRoll, state.decor, catalogIndex, state)) {
                applyDoorRollColorFinish(stage, rollColor);
                syncDoorDesignerOptionStates(root);
                const rollSuffixP = isRoll ? (' (' + (ui.doorDesignerRollTag || 'رولّة') + ')') : '';
                const labelElP = document.getElementById('door-active-color-label');
                if (labelElP) labelElP.textContent = code ? (code + ' — ' + colorName + rollSuffixP) : colorName;
                const size = state.size || pick('size');
                const specElP = document.getElementById('door-spec-label');
                if (specElP) {
                    const sizeObjP = (cfg.sizes || []).find(function(s) { return s && s.id === size; }) || null;
                    const sizeDimP = sizeObjP ? [sizeObjP.widthCm, sizeObjP.thicknessCm, sizeObjP.heightCm].filter(Boolean).join('×') + ' سم' : pickLabel('size');
                    const partsP = [pickLabel('type'), pickLabel('model'), pickLabel('outerShape'), state.decor === 'transom' ? pickLabel('decor') : '', sizeDimP].filter(Boolean);
                    specElP.textContent = partsP.join(' · ');
                }
                return;
            }
            clearDoorDesignerPhotoPreset(stage);
            const frame = state.frame;
            const outerShape = state.outerShape;
            const decor = state.decor;
            const glassPattern = state.glassPattern;
            const opening = state.opening;
            const size = state.size || pick('size');
            const lock = state.lock;
            let hardware = state.hardware;
            if (state.isSliding && hardware.indexOf('pull') === -1 && hardware.indexOf('lever') !== -1) {
                hardware = 'pull-inox';
            }
            stage.classList.remove('wpc-door-stage--dynamic-render', 'wpc-door-stage--photoreal', 'wpc-door-stage--engine-compositor', 'wpc-door-stage--engine-3d');
            stage.classList.add('wpc-door-stage--studio-live', 'wpc-door-stage--keybab');
            const svg = document.getElementById('wpc-door-svg-root');
            const styleKey = (state.surface === 'u-plain' || state.surface === 'u-slats' || state.surface === 'u-glass') ? 'slats' : 'normal';
            applyWpcSvgDoorSurface(svg, state);
            applyWpcSvgMechanism(stage, svg, state);
            applyWpcSvgModelProfile(stage, state);
            applyWpcSvgOuterShape(stage, svg, outerShape);
            applyWpcSvgFrameStyle(stage, svg, frame);
            applyWpcSvgModel(stage, state.surface === 'flat' ? 'plain' : 'frame');
            applyWpcSvgDecor(svg, decor, state.isSliding);
            applyWpcSvgGlassPattern(svg, glassPattern, state.surface === 'full-glass' || state.surface === 'u-glass');
            if (!state.isSliding) applyWpcSvgOpening(stage, svg, opening);
            applyWpcSvgSize(stage, size, cfg);
            applyWpcSvgLock(svg, lock);
            applyWpcSvgHardware(svg, hardware);
            applyDoorLeafMask(stage, decor);
            applyWpcStudioVisualLayers(stage, state, swatchUrl);
            applyWpcSvgDoorColor(stage, hex, swatchUrl, styleKey, { isRoll: isRoll, catalogIndex: isNaN(catalogIndex) ? 0 : catalogIndex });
            if (stage.classList.contains('wpc-door-stage--keybab')) {
                applyWpcKeybabLeafTextures(stage, state, swatchUrl, hex, isRoll);
            }
            applyDoorRollColorFinish(stage, rollColor);
            const svgOverlay = document.getElementById('wpc-door-svg-overlay');
            if (svgOverlay) svgOverlay.classList.add('is-active');
            syncDoorDesignerOptionStates(root);
            const rollSuffix = isRoll ? (' (' + (ui.doorDesignerRollTag || 'رولّة') + ')') : '';
            const labelEl = document.getElementById('door-active-color-label');
            if (labelEl) labelEl.textContent = code ? (code + ' — ' + colorName + rollSuffix) : colorName;
            const specEl = document.getElementById('door-spec-label');
            if (specEl) {
                const sizeObj = (cfg.sizes || []).find(function(s) { return s && s.id === size; }) || null;
                const sizeDim = sizeObj ? [sizeObj.widthCm, sizeObj.thicknessCm, sizeObj.heightCm].filter(Boolean).join('×') + ' سم' : pickLabel('size');
                const parts = [pickLabel('type'), pickLabel('model'), pickLabel('outerShape'), decor === 'transom' ? pickLabel('decor') : '', sizeDim].filter(Boolean);
                specEl.textContent = parts.join(' · ');
            }
        }

        function isDoorDesignerCompositorReady() {
            return !!(window.NebrasDoorCompositor && window.NebrasDoorCompositor.ready);
        }

        function getDoorDesignerLayerManifest(cfg) {
            cfg = cfg || ensureDoorDesignerConfig();
            const m = cfg.layerManifest || DEFAULT_DOOR_LAYER_MANIFEST;
            return {
                defaultBase: m.defaultBase || NEBRAS_DOOR_PHOTO_DEFAULT,
                leafMask: m.leafMask || NEBRAS_DOOR_LEAF_MASK,
                bases: Object.assign({}, DEFAULT_DOOR_LAYER_MANIFEST.bases, m.bases || {}),
                overlays: Object.assign({}, DEFAULT_DOOR_LAYER_MANIFEST.overlays, m.overlays || {})
            };
        }

        function tryMountDoorDesignerCompositor(root) {
            if (!isDoorDesignerCompositorMode() || !root) return;
            const viewport = document.getElementById('nebras-door-compositor-viewport');
            if (!viewport || !isDoorDesignerCompositorReady()) return;
            if (NebrasDoorCompositor.mount(viewport)) {
                const loading = document.getElementById('nebras-door-compositor-loading');
                if (loading) loading.remove();
                const badge = document.getElementById('nebras-door-compositor-badge');
                if (badge) badge.hidden = false;
            }
            updateDoorDesignerPreview(root);
        }

        function disposeDoorDesigner3dEngine() {
            if (window.NebrasDoor3D && typeof window.NebrasDoor3D.dispose === 'function') {
                window.NebrasDoor3D.dispose();
            }
        }

        function isDoorDesigner3dEngineReady() {
            return !!(window.NebrasDoor3D && window.NebrasDoor3D.ready && typeof window.NebrasDoor3D.mount === 'function');
        }

        function unhideDoorDesignerLegacyCanvas() {
            const stage = document.getElementById('door-3d-preview');
            const viewport = document.getElementById('nebras-door-3d-viewport');
            if (viewport) viewport.hidden = true;
            injectDoorDesignerLegacyCanvas();
            const legacyCanvas = document.getElementById('wpc-door-preview-unit');
            if (legacyCanvas) legacyCanvas.classList.remove('wpc-door-canvas--legacy-hidden');
            if (stage) stage.classList.remove('wpc-door-stage--engine-3d');
        }

        function showDoorDesigner3dReadyBadge() {
            const badge = document.getElementById('nebras-door-3d-badge');
            const viewport = document.getElementById('nebras-door-3d-viewport');
            if (badge) badge.hidden = false;
            if (viewport) viewport.setAttribute('data-3d-ready', '1');
        }

        function tryMountDoorDesigner3d(root, attempt) {
            if (!isDoorDesigner3dMode() || !root) return;
            const viewport = document.getElementById('nebras-door-3d-viewport');
            if (!viewport) return;
            loadNebrasThreeJs().then(function() {
                if (isDoorDesigner3dEngineReady()) {
                    const ok = NebrasDoor3D.mount(viewport);
                    if (ok) {
                        const loading = document.getElementById('nebras-door-3d-loading');
                        if (loading) loading.remove();
                        showDoorDesigner3dReadyBadge();
                    }
                    updateDoorDesignerPreview(root);
                    return;
                }
                if ((attempt || 0) < 24) {
                    setTimeout(function() { tryMountDoorDesigner3d(root, (attempt || 0) + 1); }, 120);
                } else {
                    const loading = document.getElementById('nebras-door-3d-loading');
                    const lang = currentLang || 'ar';
                    const ui = siteText[lang] || siteText.ar;
                    const failMsg = ui.doorDesigner3dFail || 'تعذّر تحميل المعاينة ثلاثية الأبعاد. تحقّق من الاتصال أو أعد تحميل الصفحة (Ctrl+F5).';
                    if (loading) {
                        loading.className = 'nebras-door-3d-error';
                        loading.innerHTML = '<i class="fas fa-triangle-exclamation" aria-hidden="true"></i> ' + failMsg;
                    } else if (viewport) {
                        viewport.innerHTML = '<p class="nebras-door-3d-error"><i class="fas fa-triangle-exclamation"></i> ' + failMsg + '</p>';
                    }
                    updateDoorDesignerPreview(root);
                }
            }).catch(function() {
                if ((attempt || 0) < 8) {
                    setTimeout(function() { tryMountDoorDesigner3d(root, (attempt || 0) + 1); }, 200);
                }
            });
        }

        function setDoorDesignerGroupValue(root, group, value) {
            if (!root || !group || value == null) return;
            const btn = root.querySelector('[data-door-group="' + group + '"][data-door-value="' + value + '"]');
            if (!btn) return;
            root.querySelectorAll('[data-door-group="' + group + '"]').forEach(function(b) {
                b.classList.toggle('is-active', b === btn);
            });
        }

        function applyDoorDesignerStateValues(root, stateObj) {
            if (!root || !stateObj) return;
            Object.keys(stateObj).forEach(function(group) {
                setDoorDesignerGroupValue(root, group, stateObj[group]);
            });
            root.querySelectorAll('.door-preset-btn').forEach(function(b) { b.classList.remove('is-active'); });
        }

        function hideAllWpcPhotoDecorLayers() {
            ['wpc-door-panel-overlay', 'wpc-door-slats-overlay', 'wpc-door-uchannel-overlay',
                'wpc-door-glass-strips-overlay', 'wpc-door-glass-grid-overlay', 'wpc-door-glass-tall-overlay',
                'wpc-door-transom-roll', 'wpc-door-sliding-gap'].forEach(function(id) {
                const el = document.getElementById(id);
                if (el) el.classList.remove('is-visible');
            });
            const rollLayer = document.getElementById('wpc-door-roll-texture');
            if (rollLayer) {
                rollLayer.style.opacity = '0';
                rollLayer.style.backgroundImage = 'none';
            }
        }

        function getDoorDesignerModelById(modelId) {
            const cfg = ensureDoorDesignerConfig();
            return (cfg.models || []).find(function(m) { return m && m.id === modelId; }) || null;
        }

        function getDoorDesignerModelsForType(typeId) {
            const cfg = ensureDoorDesignerConfig();
            return (cfg.models || []).filter(function(m) { return m && m.typeId === typeId; });
        }

        function applyDoorDesignerModelConfig(root, model) {
            if (!root || !model || !model.config) return;
            Object.keys(model.config).forEach(function(group) {
                setDoorDesignerGroupValue(root, group, model.config[group]);
            });
        }

        function normalizeDoorDesignerConflicts(root, changedGroup) {
            if (!root) return;
            const cfg = ensureDoorDesignerConfig();
            if (changedGroup === 'type') {
                const typeId = getDoorDesignerPick(root, 'type') || 'edge-band';
                const models = getDoorDesignerModelsForType(typeId);
                if (models.length) {
                    setDoorDesignerGroupValue(root, 'model', models[0].id);
                    applyDoorDesignerModelConfig(root, models[0]);
                }
            }
            if (changedGroup === 'model') {
                const model = getDoorDesignerModelById(getDoorDesignerPick(root, 'model'));
                if (model) applyDoorDesignerModelConfig(root, model);
            }
            const state = resolveDoorDesignerState(root);
            if (changedGroup === 'mechanism' && state.isSliding) {
                setDoorDesignerGroupValue(root, 'decor', 'plain');
                setDoorDesignerGroupValue(root, 'hardware', 'pull-inox');
            }
            if (changedGroup === 'mechanism' && !state.isSliding) {
                const hw = getDoorDesignerPick(root, 'hardware');
                if (hw === 'pull-inox') setDoorDesignerGroupValue(root, 'hardware', 'lever-black');
            }
            if (changedGroup === 'surface') {
                if (state.surface === 'u-glass') {
                    const gl = getDoorDesignerPick(root, 'glassLayout');
                    if (gl === 'grid-2x2' || gl === 'full') setDoorDesignerGroupValue(root, 'glassLayout', 'strips-5');
                } else if (state.surface === 'full-glass') {
                    const gl = getDoorDesignerPick(root, 'glassLayout');
                    if (gl === 'strip-tall') setDoorDesignerGroupValue(root, 'glassLayout', 'grid-2x2');
                } else {
                    setDoorDesignerGroupValue(root, 'glassLayout', 'strip-tall');
                }
            }
            if (changedGroup === 'outerShape') {
                setDoorDesignerGroupValue(root, 'frame', state.outerShape === 'outer-curve' ? 'curve' : 'flat');
            }
            if (changedGroup === 'frame') {
                setDoorDesignerGroupValue(root, 'outerShape', state.frame === 'curve' ? 'outer-curve' : 'outer-flat');
            }
            if (changedGroup && changedGroup !== 'preset' && changedGroup !== 'color') {
                root.querySelectorAll('.door-preset-btn').forEach(function(b) { b.classList.remove('is-active'); });
            }
        }

        /** هيكل المنصة — مثل أمازون/علي بابا/جرير: طبقات + وحدات + حالة التشغيل */
        const NEBRAS_PLATFORM = {
            version: '1.0.0',
            codename: 'NebrasGlobal',
            layers: [
                { id: 'storefront', icon: 'fas fa-store', nameAr: 'الواجهة العامة (زوار / متجر / معرض)', nameEn: 'Public storefront' },
                { id: 'command', icon: 'fas fa-server', nameAr: 'مركز القيادة (إدارة / صلاحيات / أتمتة)', nameEn: 'Internal command center' },
                { id: 'erp', icon: 'fas fa-cubes', nameAr: 'نظام ERP (عمليات المصنع الداخلية)', nameEn: 'ERP core (factory operations)' }
            ],
            modules: [
                { id: 'content', status: 'live', icon: 'fas fa-pen-to-square', permission: 'content', handler: 'openSiteContentManager', nameAr: 'المحتوى والكتالوج', descAr: 'منتجات بأصناف وأسعار، من نحن، أيقونات — بدون كود', nameEn: 'Content & catalogue' },
                { id: 'celebration', status: 'live', icon: 'fas fa-wand-magic-sparkles', superadminOnly: true, handler: 'openSystemSettingsForOccasion', nameAr: 'الوضع الاحتفالي', descAr: 'تهيئة شكل المناسبات للداشبورد والموقع', nameEn: 'Celebration mode' },
                { id: 'users', status: 'live', icon: 'fas fa-users-cog', permission: 'users', handler: 'openUserManagement', nameAr: 'المستخدمون والصلاحيات', descAr: 'أدوار، حسابات، حوكمة الوصول', nameEn: 'Users & RBAC' },
                { id: 'branches', status: 'live', icon: 'fas fa-map-marked-alt', permission: 'branches', handler: 'openBranchesManagement', nameAr: 'الفروع', descAr: 'شبكة فروع المملكة وأرقام المبيعات', nameEn: 'Branches' },
                { id: 'complaints', status: 'live', icon: 'fas fa-exclamation-triangle', permission: 'complaints', handler: 'openComplaintsManagement', nameAr: 'الشكاوى', descAr: 'استقبال ومتابعة وحل الشكاوى', nameEn: 'Complaints' },
                { id: 'sales', status: 'beta', icon: 'fas fa-chart-line', permission: 'sales', handler: 'openSalesManagement', nameAr: 'المبيعات', descAr: 'تسجيل مبيعات وتقارير — توسعة قادمة', nameEn: 'Sales' },
                { id: 'customers', status: 'beta', icon: 'fas fa-headset', permission: 'customerService', handler: 'openCustomerServiceManagement', nameAr: 'خدمة العملاء', descAr: 'استفسارات وردود — توسعة قادمة', nameEn: 'Customer service' },
                { id: 'inventory', status: 'live', icon: 'fas fa-warehouse', permission: 'inventory', handler: 'openErpInventory', nameAr: 'المخزون ERP', descAr: 'SKU، مستودعات، تنبيهات — يعمل الآن', nameEn: 'ERP Inventory' },
                { id: 'erp', status: 'live', icon: 'fas fa-cubes', permission: 'erp', handler: 'scrollErpHub', nameAr: 'لوحة ERP', descAr: 'نظام التخطيط الداخلي الكامل', nameEn: 'ERP console' },
                { id: 'orders', status: 'beta', icon: 'fas fa-truck', permission: 'orders', handler: 'openErpOrders', nameAr: 'الطلبات OMS', descAr: 'تسجيل ومتابعة الطلبات — تجريبي', nameEn: 'Orders OMS' },
                { id: 'procurement', status: 'beta', icon: 'fas fa-truck-loading', permission: 'erp', handler: 'openErpProcurement', nameAr: 'المشتريات', descAr: 'توريد وموردون — تجريبي', nameEn: 'Procurement' },
                { id: 'analytics', status: 'live', icon: 'fas fa-chart-pie', permission: 'audit', handler: 'openAdminAnalytics', nameAr: 'التحليلات', descAr: 'منتجات · ألوان · شكاوى · زوار · ترتيب العروض', nameEn: 'Analytics' },
                { id: 'audit', status: 'live', icon: 'fas fa-clipboard-check', permission: 'audit', handler: 'openAuditLog', nameAr: 'سجل العمليات', descAr: 'تتبع كل إجراء إداري', nameEn: 'Audit log' },
                { id: 'system', status: 'live', icon: 'fas fa-sliders', superadminOnly: true, handler: 'openSystemSettings', nameAr: 'إعدادات المنصة', descAr: 'سجل تجاري، ضريبي، بنوك، احتفال', nameEn: 'Platform settings' }
            ]
        };

        const NEBRAS_ERP = {
            version: '0.9.0',
            codename: 'NebrasERP',
            pillars: [
                { id: 'master', nameAr: 'البيانات المرجعية', nameEn: 'Master data' },
                { id: 'commerce', nameAr: 'التجارة والطلبات', nameEn: 'Commerce & OMS' },
                { id: 'supply', nameAr: 'سلسلة التوريد', nameEn: 'Supply chain' },
                { id: 'crm', nameAr: 'العملاء والخدمة', nameEn: 'CRM & service' },
                { id: 'governance', nameAr: 'الحوكمة والتقارير', nameEn: 'Governance & BI' }
            ],
            modules: [
                { id: 'erp-catalog', pillar: 'master', status: 'live', icon: 'fas fa-database', permission: 'content', handler: 'openSiteContentManager', nameAr: 'كتالوج المنتجات', descAr: 'ربط المتجر بالمواد', nameEn: 'Product master' },
                { id: 'erp-inventory', pillar: 'supply', status: 'live', icon: 'fas fa-warehouse', permission: 'inventory', handler: 'openErpInventory', nameAr: 'المخزون WMS', descAr: 'SKU وكميات ومستودعات', nameEn: 'Inventory' },
                { id: 'erp-sales', pillar: 'commerce', status: 'live', icon: 'fas fa-file-invoice-dollar', permission: 'sales', handler: 'openSalesManagement', nameAr: 'المبيعات', descAr: 'فواتير وعمليات بيع', nameEn: 'Sales' },
                { id: 'erp-orders', pillar: 'commerce', status: 'beta', icon: 'fas fa-truck', permission: 'orders', handler: 'openErpOrders', nameAr: 'الطلبات OMS', descAr: 'متابعة التنفيذ', nameEn: 'Orders' },
                { id: 'erp-procurement', pillar: 'supply', status: 'beta', icon: 'fas fa-truck-loading', permission: 'erp', handler: 'openErpProcurement', nameAr: 'المشتريات', descAr: 'موردون وتوريد', nameEn: 'Procurement' },
                { id: 'erp-branches', pillar: 'master', status: 'live', icon: 'fas fa-map-marked-alt', permission: 'branches', handler: 'openBranchesManagement', nameAr: 'الفروع', descAr: 'شبكة المملكة', nameEn: 'Branches' },
                { id: 'erp-complaints', pillar: 'crm', status: 'live', icon: 'fas fa-headset', permission: 'complaints', handler: 'openComplaintsManagement', nameAr: 'الشكاوى CRM', descAr: 'متابعة العملاء', nameEn: 'Complaints' },
                { id: 'erp-customers', pillar: 'crm', status: 'live', icon: 'fas fa-users', permission: 'customerService', handler: 'openCustomerServiceManagement', nameAr: 'خدمة العملاء', descAr: 'استفسارات وردود', nameEn: 'Customer care' },
                { id: 'erp-analytics', pillar: 'governance', status: 'live', icon: 'fas fa-chart-pie', permission: 'audit', handler: 'openAdminAnalytics', nameAr: 'ذكاء الأعمال BI', descAr: 'تقارير حية للإدارة', nameEn: 'Analytics' },
                { id: 'erp-finance', pillar: 'governance', status: 'planned', icon: 'fas fa-coins', permission: 'erp', handler: 'erpFinanceStub', nameAr: 'المالية', descAr: 'محاسبة وتكاليف', nameEn: 'Finance' }
            ]
        };

        const GLOBAL_PLATFORM_BENCHMARK = [
            { areaAr: 'واجهة متجر / معرض', areaEn: 'Storefront & catalogue', globalAr: 'أمازون · جرير · علي بابا', nebrasAr: 'يعمل — محكوم من الإدارة', parity: 'high' },
            { areaAr: 'ERP مخزون WMS', areaEn: 'Inventory / WMS', globalAr: 'مستودعات · SKU', nebrasAr: 'يعمل — SKU ومستودعات', parity: 'mid' },
            { areaAr: 'طلبات وشحن OMS', areaEn: 'Orders & fulfillment', globalAr: 'تتبع · فروع · شحن', nebrasAr: 'تجريبي — توسعة قادمة', parity: 'soon' },
            { areaAr: 'B2B / مشتريات', areaEn: 'Procurement B2B', globalAr: 'علي بابا · موردون', nebrasAr: 'تجريبي — هيكل جاهز', parity: 'soon' },
            { areaAr: 'صلاحيات وموظفين', areaEn: 'RBAC & admin', globalAr: 'أدوار · سجل عمليات', nebrasAr: 'يعمل — كامل', parity: 'high' },
            { areaAr: 'CRM وشكاوى', areaEn: 'CRM & support', globalAr: 'تذاكر · فروع', nebrasAr: 'يعمل', parity: 'high' },
            { areaAr: 'دفع إلكتروني', areaEn: 'Payments', globalAr: 'بوابات · محفظة', nebrasAr: 'مرحلة قادمة', parity: 'soon' },
            { areaAr: 'تحليلات BI', areaEn: 'Analytics BI', globalAr: 'لوحات · تنبؤ', nebrasAr: 'مرحلة قادمة', parity: 'soon' }
        ];

        const DEFAULT_ERP_INVENTORY = [
            { id: 'inv-1', sku: 'WPC-RAW-80', nameAr: 'باب WPC عضم 80×210', nameEn: 'WPC raw door 80×210', warehouseAr: 'القصيم — الرئيسي', warehouseEn: 'Qassim main', qty: 320, minQty: 40, unitAr: 'قطعة', productLink: 'prod-wpc-raw' },
            { id: 'inv-2', sku: 'WPC-DOOR-STD', nameAr: 'باب WPC قياسي', nameEn: 'WPC door standard', warehouseAr: 'الرياض', warehouseEn: 'Riyadh', qty: 180, minQty: 30, unitAr: 'قطعة', productLink: 'prod-wpc' },
            { id: 'inv-3', sku: 'ALU-PROF-6M', nameAr: 'بروفيل ألومنيوم 6م', nameEn: 'Aluminum profile 6m', warehouseAr: 'جدة', warehouseEn: 'Jeddah', qty: 920, minQty: 150, unitAr: 'قطعة', productLink: 'prod-aluminum' }
        ];

        let erpInventory = [];
        let erpOrders = [];
        let erpProcurement = [];

        const OCCASION_THEME_PRESETS = {
            default: {
                id: 'default',
                icon: 'fas fa-industry',
                ribbonAr: '',
                ribbonEn: '',
                badgeAr: '',
                badgeEn: '',
                decoIcons: [],
                statusAr: 'الوضع العادي — بدون احتفال',
                statusEn: 'Normal mode — no celebration'
            },
            ramadan: {
                id: 'ramadan',
                icon: 'fas fa-moon',
                ribbonAr: 'رمضان كريم — كل عام وأنتم بخير',
                ribbonEn: 'Ramadan Kareem',
                badgeAr: 'احتفال رمضان',
                badgeEn: 'Ramadan celebration',
                decoIcons: ['fas fa-moon', 'fas fa-star', 'fas fa-mosque', 'fas fa-star-and-crescent'],
                statusAr: 'وضع احتفالي رمضان — داشبورد بزينة هادئة ذهبية',
                statusEn: 'Ramadan celebration — golden festive dashboard'
            },
            'eid-fitr': {
                id: 'eid-fitr',
                icon: 'fas fa-gifts',
                ribbonAr: 'عيد فطر مبارك',
                ribbonEn: 'Eid Al-Fitr Mubarak',
                badgeAr: 'احتفال عيد الفطر',
                badgeEn: 'Eid Al-Fitr',
                decoIcons: ['fas fa-gifts', 'fas fa-star', 'fas fa-heart', 'fas fa-face-smile-beam'],
                statusAr: 'وضع احتفالي عيد الفطر — أخضر وذهبي',
                statusEn: 'Eid Al-Fitr celebration — green & gold'
            },
            'eid-adha': {
                id: 'eid-adha',
                icon: 'fas fa-kaaba',
                ribbonAr: 'عيد أضحى مبارك',
                ribbonEn: 'Eid Al-Adha Mubarak',
                badgeAr: 'احتفال عيد الأضحى',
                badgeEn: 'Eid Al-Adha',
                decoIcons: ['fas fa-hand-holding-heart', 'fas fa-star', 'fas fa-sun', 'fas fa-moon'],
                statusAr: 'وضع احتفالي عيد الأضحى — دفء واحتفال',
                statusEn: 'Eid Al-Adha celebration'
            },
            'national-day': {
                id: 'national-day',
                icon: 'fas fa-flag',
                ribbonAr: 'اليوم الوطني السعودي — عزنا بكرمنا',
                ribbonEn: 'Saudi National Day',
                badgeAr: 'اليوم الوطني',
                badgeEn: 'National Day',
                decoIcons: ['fas fa-flag', 'fas fa-star', 'fas fa-landmark', 'fas fa-flag-checkered'],
                statusAr: 'احتفال اليوم الوطني — ألوان العلم في الداشبورد',
                statusEn: 'National Day celebration'
            },
            'founding-day': {
                id: 'founding-day',
                icon: 'fas fa-landmark',
                ribbonAr: 'يوم التأسيس — فخر واعتزاز',
                ribbonEn: 'Founding Day',
                badgeAr: 'يوم التأسيس',
                badgeEn: 'Founding Day',
                decoIcons: ['fas fa-landmark', 'fas fa-star', 'fas fa-building', 'fas fa-flag'],
                statusAr: 'احتفال يوم التأسيس — طابع تراثي',
                statusEn: 'Founding Day celebration'
            },
            'new-year': {
                id: 'new-year',
                icon: 'fas fa-champagne-glasses',
                ribbonAr: 'سنة جديدة سعيدة',
                ribbonEn: 'Happy New Year',
                badgeAr: 'رأس السنة',
                badgeEn: 'New Year',
                decoIcons: ['fas fa-champagne-glasses', 'fas fa-star', 'fas fa-wand-magic-sparkles', 'fas fa-burst'],
                statusAr: 'احتفال رأس السنة — بريق وأضواء',
                statusEn: 'New Year celebration'
            },
            custom: {
                id: 'custom',
                icon: 'fas fa-wand-magic-sparkles',
                ribbonAr: '',
                ribbonEn: '',
                badgeAr: 'عرض احتفالي مخصص',
                badgeEn: 'Custom celebration',
                decoIcons: ['fas fa-wand-magic-sparkles', 'fas fa-star', 'fas fa-gift', 'fas fa-heart'],
                statusAr: 'عرض مخصص — شكل احتفالي حسب إعداداتكم',
                statusEn: 'Custom celebration display'
            }
        };

        const OCCASION_ACCENT_MAP = {
            ramadan: '#d4af37',
            'eid-fitr': '#1e8449',
            'eid-adha': '#e67e22',
            'national-day': '#006c35',
            'founding-day': '#8b6914',
            'new-year': '#7ec8ff',
            custom: '#9b59b6'
        };

        /** زينة مخصصة لكل مناسبة — أيقونات ورموز */
        const OCCASION_DECO_MIX = {
            ramadan: [
                { icon: 'fas fa-moon' }, { icon: 'fas fa-star-and-crescent' }, { icon: 'fas fa-mosque' },
                { symbol: '☪', className: 'celebration-float--symbol' }, { icon: 'fas fa-star' },
                { icon: 'fas fa-moon' }, { symbol: '☪', className: 'celebration-float--symbol' }
            ],
            'eid-fitr': [
                { icon: 'fas fa-gifts' }, { icon: 'fas fa-moon' }, { icon: 'fas fa-star' },
                { icon: 'fas fa-face-smile-beam' }, { icon: 'fas fa-heart' }, { icon: 'fas fa-gifts' }
            ],
            'eid-adha': [
                { icon: 'fas fa-hand-holding-heart' }, { icon: 'fas fa-kaaba' }, { icon: 'fas fa-sun' },
                { symbol: '🐑', className: 'celebration-float--symbol' }, { icon: 'fas fa-star' },
                { icon: 'fas fa-hand-holding-heart' }, { icon: 'fas fa-moon' }
            ],
            'national-day': [
                { icon: 'fas fa-flag' }, { icon: 'fas fa-star' }, { icon: 'fas fa-landmark' },
                { icon: 'fas fa-flag-checkered' }, { icon: 'fas fa-flag' }
            ],
            'founding-day': [
                { icon: 'fas fa-landmark' }, { icon: 'fas fa-building' }, { icon: 'fas fa-star' },
                { icon: 'fas fa-flag' }, { icon: 'fas fa-landmark' }
            ],
            'new-year': [
                { icon: 'fas fa-champagne-glasses' }, { icon: 'fas fa-wand-magic-sparkles' },
                { icon: 'fas fa-burst' }, { icon: 'fas fa-star' }
            ],
            custom: [
                { icon: 'fas fa-wand-magic-sparkles' }, { icon: 'fas fa-star' },
                { icon: 'fas fa-gift' }, { icon: 'fas fa-heart' }
            ]
        };

        const BRANCH_CITY_I18N = {
            'القصيم - الفرع الرئيسي': { en: 'Qassim — Main Branch', zh: '盖西姆（总部）' },
            'الرياض': { en: 'Riyadh', zh: '利雅得' },
            'المدينة': { en: 'Madinah', zh: '麦地那' },
            'الأحساء': { en: 'Al-Ahsa', zh: '艾赫萨' },
            'خميس مشيط': { en: 'Khamis Mushait', zh: '海米س穆谢特' },
            'تبوك': { en: 'Tabuk', zh: '塔布克' },
            'جدة': { en: 'Jeddah', zh: '吉达' }
        };

        const QUOTE_REGISTRY_KEY = 'nebrasQuoteRegistry';
        const SALES_QUOTES_INBOX_KEY = 'nebrasSalesQuotesInbox';
        const VISITOR_ANALYTICS_KEY = 'nebrasVisitorAnalytics';
        let visitorAnalytics = { sessions: [], totalVisits: 0, totalPageViews: 0, lastUpdated: 0 };
        let currentQuoteIssue = null;
        let pendingTileHandler = null;

        let systemSettings = Object.assign({}, DEFAULT_SYSTEM_SETTINGS);
        let currentAdmin = null;
        let currentLang = 'ar';
        let auditLogs = [];
        let dynamicContentBlocks = {};
        let dynamicSiteSections = {};
        let passwordRecoveryVerified = false;
        /** أيقونات الزوار المدمجة — العناوين تُعرض من siteText عبر titleKey عند تغيير اللغة */
        /** بوابة الزائر — ثلاث طبقات (متجر · معرض · منصة) بدون «كتالوج المنتجات» المجمّع */
        const DEFAULT_VISITOR_ICONS = [
            { id: 8, lane: 'store', sortOrder: 10, titleKey: 'visitorQuickWpcRaw', title: 'أبواب WPC عضم', iconClass: 'fas fa-industry', visitorMode: 'shop', catalogHub: true, target: '#products', backgroundImage: NEBRAS_STORE_ICON_MEDIA.wpcRawBg, album: [NEBRAS_STORE_ICON_MEDIA.wpcRawBg] },
            { id: 9, lane: 'store', sortOrder: 11, titleKey: 'visitorQuickWpcReady', title: 'أبواب WPC جاهزة', iconClass: 'fas fa-door-closed', visitorMode: 'shop', catalogHub: true, target: '#doors', album: ['images/wpc-background.avif'] },
            { id: 10, lane: 'store', sortOrder: 12, titleKey: 'visitorQuickAluminum', title: 'الألومنيوم', iconClass: 'fas fa-cog', visitorMode: 'shop', catalogHub: true, target: '#aluminum', album: ['images/aluminum-background.webp'] },
            { id: 11, lane: 'store', sortOrder: 13, titleKey: 'visitorQuickOtherProducts', title: 'منتجات أخرى', iconClass: 'fas fa-boxes', visitorMode: 'shop', catalogHub: true, target: '#products', backgroundImage: NEBRAS_STORE_ICON_MEDIA.otherProductsBg, album: [NEBRAS_STORE_ICON_MEDIA.otherProductsBg] },
            { id: 14, placement: 'services', sortOrder: 1, titleKey: 'serviceTitle1', title: 'خدمات التصنيع', iconClass: 'fas fa-tools', visitorMode: 'browse', target: '', backgroundImage: NEBRAS_SERVICE_ICON_MEDIA.mfg, album: [NEBRAS_SERVICE_ICON_MEDIA.mfg], textAr: 'تصنيع منتجات بلاستيكية عالية الجودة مع مراعاة أعلى معايير الأمان والاستدامة المناسبة للمشاريع الكبيرة.' },
            { id: 15, placement: 'services', sortOrder: 2, titleKey: 'serviceTitle2', title: 'الدعم الفني', iconClass: 'fas fa-shield-alt', visitorMode: 'browse', target: '', backgroundImage: NEBRAS_SERVICE_ICON_MEDIA.support, album: ['images/customer-complaints-background.jpeg'], textAr: 'فريق دعم متكامل لمتابعة الطلبات وحل المشكلات بسرعة، مع تقديم الدعم الفني للعملاء والمشاريع بحرفية.' },
            { id: 16, placement: 'services', sortOrder: 3, titleKey: 'serviceTitle3', title: 'إدارة الجودة', iconClass: 'fas fa-chart-line', visitorMode: 'browse', target: '', backgroundImage: NEBRAS_SERVICE_ICON_MEDIA.quality, album: [NEBRAS_SERVICE_ICON_MEDIA.quality], textAr: 'مراقبة جودة دقيقة لكل منتج ومرحلة إنتاجية، لضمان منتج نهائي يناسب متطلبات السوق ورضا العملاء.' },
            { id: 17, placement: 'services', sortOrder: 4, titleKey: 'serviceTitleInstall', title: 'خدمات التركيب والضمان', iconClass: 'fas fa-screwdriver-wrench', visitorMode: 'browse', target: '', backgroundImage: NEBRAS_SERVICE_ICON_MEDIA.install, album: [NEBRAS_SERVICE_ICON_MEDIA.install], textAr: 'خدماتنا الميدانية المتكاملة: من المقاسات إلى التسليم — فرق محترفة جاهزة لخدمتكم في كل خطوة.' },
            { id: 3, lane: 'showroom', sortOrder: 30, titleKey: 'visitorQuickColorRolls', title: 'كتالوج ألوان نبراس (رولات)', iconClass: 'fas fa-swatchbook', visitorMode: 'browse', openHandler: 'color-rolls', target: '', album: ['images/background-Nebras-colour-catalogue-(rolls).jpeg'] },
            { id: 7, lane: 'showroom', sortOrder: 31, titleKey: 'visitorQuickCertifications', title: 'اعتمادات وشهادات نبراس', iconClass: 'fas fa-award', visitorMode: 'browse', openHandler: 'certifications', target: '', backgroundImage: NEBRAS_SHOWROOM_ICON_MEDIA.certificationsBg, album: [NEBRAS_SHOWROOM_ICON_MEDIA.certificationsBg] },
            { id: 2, lane: 'platform', sortOrder: 20, titleKey: 'visitorQuickBranches', title: 'فروع نبراس', iconClass: 'fas fa-map-marked-alt', visitorMode: 'browse', openHandler: 'branches-hub', target: '', backgroundImage: NEBRAS_PLATFORM_ICON_MEDIA.branchesBg, album: [NEBRAS_PLATFORM_ICON_MEDIA.branchesBg], textAr: 'تغطية شاملة لكامل المملكة — فروع ومناديب نبراس في جميع المناطق.' },
            { id: 4, lane: 'platform', sortOrder: 21, titleKey: 'visitorQuickBankAccounts', title: 'حسابات بنكية', iconClass: 'fas fa-building-columns', visitorMode: 'browse', target: '#bank-accounts-section', backgroundImage: NEBRAS_BANK_MEDIA.wall, album: [NEBRAS_BANK_MEDIA.snb, NEBRAS_BANK_MEDIA.riyad, NEBRAS_BANK_MEDIA.alrajhi] },
            { id: 12, lane: 'platform', sortOrder: 22, titleKey: 'visitorQuickComplaints', title: 'استفسار الشكاوى', iconClass: 'fas fa-search', visitorMode: 'browse', openHandler: 'complaints-inquiry', target: '', backgroundImage: NEBRAS_STORE_ICON_MEDIA.complaintsBg, album: [NEBRAS_STORE_ICON_MEDIA.complaintsBg], textAr: 'قسم استفسارات وشكاوى العملاء — نستمع لاستفساراتكم لخدمة أفضل.' },
            { id: 13, lane: 'showroom', sortOrder: 28, titleKey: 'visitorQuickDoorDesigner', title: 'صمّم بابك مع نبراس', iconClass: 'fas fa-pencil-ruler', visitorMode: 'browse', openHandler: 'door-designer', target: '', backgroundImage: NEBRAS_SHOWROOM_ICON_MEDIA.doorDesignerBg, album: [NEBRAS_SHOWROOM_ICON_MEDIA.doorDesignerBg] }
        ];

        const SITE_PARTNERS_SEED_VERSION = 2;
        const DEFAULT_SITE_PARTNERS = [
            { id: 'partner-amana-qassim', nameAr: 'أمانة منطقة القصيم', nameEn: 'Al-Qassim Municipality', logoUrl: 'images/partners/partner-amana-qassim.png', linkUrl: '', sortOrder: 1, visible: true, logoOnly: true },
            { id: 'partner-najd-chemicals', nameAr: 'كيمياء نجد التجارية', nameEn: 'Najd Chemicals Trading', logoUrl: 'images/partners/partner-najd-chemicals.png', linkUrl: '', sortOrder: 2, visible: true, logoOnly: true },
            { id: 'partner-trading-industry', nameAr: 'تجارة وصناعة ومقاولات', nameEn: 'Trading, Industry & Contracting', logoUrl: 'images/partners/partner-trading-industry.png', linkUrl: '', sortOrder: 3, visible: true, logoOnly: true },
            { id: 'partner-golden-materials', nameAr: 'شركة المواد الذهبية — إعمار الأسطورة', nameEn: 'Golden Materials Company', logoUrl: 'images/partners/partner-golden-materials.png', linkUrl: '', sortOrder: 4, visible: true, logoOnly: true },
            { id: 'partner-amwaj-polymeric', nameAr: 'مصنع أمواج اللدائن', nameEn: 'Amwaj Polymeric', logoUrl: 'images/partners/partner-amwaj-polymeric.png', linkUrl: '', sortOrder: 5, visible: true, logoOnly: true },
            { id: 'partner-aramco', nameAr: 'أرامكو السعودية', nameEn: 'Saudi Aramco', logoUrl: 'images/partners/partner-aramco.png', linkUrl: '', sortOrder: 6, visible: true, logoOnly: true },
            { id: 'partner-traffic', nameAr: 'الأمن العام — المرور', nameEn: 'Saudi Traffic Department', logoUrl: 'images/partners/partner-traffic.png', linkUrl: '', sortOrder: 7, visible: true, logoOnly: true },
            { id: 'partner-red-crescent', nameAr: 'هيئة الهلال الأحمر السعودي', nameEn: 'Saudi Red Crescent Authority', logoUrl: 'images/partners/partner-red-crescent.png', linkUrl: '', sortOrder: 8, visible: true, logoOnly: true },
            { id: 'partner-national-guard', nameAr: 'وزارة الحرس الوطني', nameEn: 'Ministry of National Guard', logoUrl: 'images/partners/partner-national-guard.png', linkUrl: '', sortOrder: 9, visible: true, logoOnly: true },
            { id: 'partner-housing', nameAr: 'وزارة الإسكان', nameEn: 'Ministry of Housing', logoUrl: 'images/partners/partner-housing.png', linkUrl: '', sortOrder: 10, visible: true, logoOnly: true },
            { id: 'partner-health', nameAr: 'وزارة الصحة', nameEn: 'Ministry of Health', logoUrl: 'images/partners/partner-health.png', linkUrl: '', sortOrder: 11, visible: true, logoOnly: true },
            { id: 'partner-qassim-university', nameAr: 'جامعة القصيم', nameEn: 'Qassim University', logoUrl: 'images/partners/partner-qassim-university.png', linkUrl: '', sortOrder: 12, visible: true, logoOnly: true },
            { id: 'partner-police', nameAr: 'الأمن العام — الشرطة', nameEn: 'Saudi Public Security', logoUrl: 'images/partners/partner-police.png', linkUrl: '', sortOrder: 13, visible: true, logoOnly: true }
        ];

        let visitorIcons = [];
        let siteProducts = [];
        let dashboardTiles = [];
        let siteCustomSections = [];
        let sitePartners = [];
        let siteCertifications = [];
        /** معرض نبراس — قسمان: منتجات + مشاريع (تُدار بالكامل من الإدارة) */
        let showroomGallery = null;
        const DEFAULT_SHOWROOM_GALLERY = {
            products: {
                titleAr: 'منتجات نبراس',
                titleEn: 'Nebras Products',
                introAr: 'صور من خط إنتاج نبراس — أبواب WPC، بلاستيك، وألومنيوم.',
                introEn: 'Images from Nebras production lines — WPC, plastic, and aluminum.',
                items: []
            },
            projects: {
                titleAr: 'مشاريع نبراس',
                titleEn: 'Nebras Projects',
                introAr: 'مشاريع منفّذة ونجاحات موثّقة مع عملائنا في المملكة.',
                introEn: 'Delivered projects and documented success across KSA.',
                items: []
            }
        };
        let nebrasCart = [];

        /** صفحات من نحن / رؤيتنا — محتوى داخلي + شهادات (تُدار من الإدارة) */
        const DEFAULT_ABOUT_PAGES = {
            who: {
                id: 'who',
                iconClass: 'fas fa-industry',
                backgroundImage: 'background-about-us',
                titleAr: 'من نحن — مصنع نبراس',
                titleEn: 'About Nebras Factory',
                titleZh: '关于 Nebras 工厂',
                summaryAr: 'نحن شركة مصنع نبراس للبلاستيك، نقدم حلولاً متكاملة للصناعة والمقاولات بشفافية وجودة سعودية أصيلة.',
                summaryEn: 'Nebras Plastic Factory delivers integrated industrial solutions with Saudi quality.',
                summaryZh: 'Nebras 塑料工厂提供一体化工业解决方案。',
                bodyAr: 'مصنع نبراس للبلاستيك من القصيم — عنيزة. نصنع أبواب WPC، حلول بلاستيكية، وألومنيوم لعملائنا في المملكة.\n\n• خبرة صناعية وتوريد موثوق\n• جودة ومعايير سعودية\n• فريق مبيعات وخدمة عملاء على مدار الطلب',
                bodyEn: 'Nebras Plastic Factory — Qassim, Unaizah. WPC doors, plastic solutions, and aluminum for clients across KSA.\n\n• Industrial expertise\n• Saudi quality standards\n• Sales and customer service teams',
                bodyZh: 'Nebras 工厂位于卡西姆省。为沙特客户提供 WPC 门、塑料与铝材解决方案。',
                album: ['images/background-about-us.png'],
                gallery: [
                    { id: 'cert-1', labelAr: 'شهادة/وثيقة معتمدة', labelEn: 'Certified document', captionAr: 'وثائق معتمدة لمصنع نبراس', captionEn: 'Nebras certified documents', image: 'images/background-about-us.png' }
                ]
            },
            vision: {
                id: 'vision',
                iconClass: 'fas fa-eye',
                backgroundImage: 'background-our-vision',
                titleAr: 'رؤيتنا',
                titleEn: 'Our Vision',
                titleZh: '我们的愿景',
                summaryAr: 'نسعى لتوسيع حضورنا الصناعي وتقديم تجربة رقمية احترافية مع شراكة عملائنا.',
                summaryEn: 'We aim to grow industrially and deliver a professional digital experience.',
                summaryZh: '致力于工业扩展与专业数字体验。',
                bodyAr: 'رؤيتنا: أن نكون الخيار الأول في حلول WPC والبلاستيك والألومنيوم في المملكة، مع تجربة رقمية عالمية لعملائنا.\n\n• الريادة في حلول WPC والبلاستيك\n• ابتكار وتطوير مستمر\n• شراكة طويلة مع الورش والمصانع',
                bodyEn: 'Our vision: to lead WPC, plastic, and aluminum solutions in KSA with a world-class digital experience for our clients.',
                bodyZh: '愿景：打造 Nebras 全球数字平台与内部 ERP。',
                album: ['images/background-our-vision.jpg'],
                gallery: []
            }
        };

        let aboutPages = {};

        const DEFAULT_WPC_RAW_VARIANTS = [
            { id: 'wpc-raw-80-w', image: 'images/wpc-background.avif', colorAr: 'أبيض', colorEn: 'White', sizeAr: '80 × 210 سم', sizeEn: '80×210 cm', typeAr: 'ضلفة عضم', typeEn: 'Raw leaf', price: 0, sku: 'WPC-RAW-80-W' },
            { id: 'wpc-raw-90-w', image: 'images/wpc-background.avif', colorAr: 'أبيض', colorEn: 'White', sizeAr: '90 × 210 سم', sizeEn: '90×210 cm', typeAr: 'ضلفة عضم', typeEn: 'Raw leaf', price: 0, sku: 'WPC-RAW-90-W' },
            { id: 'wpc-raw-100-oak', image: 'images/wpc-background.avif', colorAr: 'بلوط', colorEn: 'Oak', sizeAr: '100 × 210 سم', sizeEn: '100×210 cm', typeAr: 'ضلفة عضم', typeEn: 'Raw leaf', price: 0, sku: 'WPC-RAW-100-O' }
        ];

        const DEFAULT_WPC_READY_VARIANTS = [
            { id: 'wpc-ready-80', image: 'images/wpc-background.avif', colorAr: 'أبيض', colorEn: 'White', sizeAr: '80 × 210 سم', sizeEn: '80×210 cm', typeAr: 'جاهز للتركيب', typeEn: 'Ready to install', price: 0, sku: 'WPC-RDY-80' },
            { id: 'wpc-ready-90', image: 'images/wpc-background.avif', colorAr: 'رمادي', colorEn: 'Grey', sizeAr: '90 × 210 سم', sizeEn: '90×210 cm', typeAr: 'جاهز للتركيب', typeEn: 'Ready to install', price: 0, sku: 'WPC-RDY-90' }
        ];

        /** أصناف الألومنيوم — شكل/نوع + مقاس + لون (تُدار بالكامل من الإدارة) */
        const DEFAULT_ALUMINUM_VARIANTS = [
            { id: 'alu-prof-6m', image: 'images/aluminum-background.webp', colorAr: 'فضي', colorEn: 'Silver', sizeAr: '6 م — بروفيل', sizeEn: '6 m profile', typeAr: 'بروفيل', typeEn: 'Profile', price: 0, sku: 'ALU-PROF-6M' },
            { id: 'alu-sheet-122', image: 'images/aluminum-background.webp', colorAr: 'أبيض', colorEn: 'White', sizeAr: '122 × 244 سم', sizeEn: '122×244 cm', typeAr: 'صفائح', typeEn: 'Sheet', price: 0, sku: 'ALU-SHT-122' },
            { id: 'alu-angle-40', image: 'images/aluminum-background.webp', colorAr: 'طبيعي', colorEn: 'Natural', sizeAr: '40 × 40 مم', sizeEn: '40×40 mm', typeAr: 'زاوية', typeEn: 'Angle', price: 0, sku: 'ALU-ANG-40' }
        ];

        const DEFAULT_OTHER_VARIANTS = [
            { id: 'other-sol-1', image: 'images/background-other-products.jpeg', colorAr: 'متعدد', colorEn: 'Various', sizeAr: 'حسب الطلب', sizeEn: 'On request', typeAr: 'حلول إضافية', typeEn: 'Additional solution', price: 0, sku: 'OTH-001' },
            { id: 'other-sol-2', image: 'images/background-other-products.jpeg', colorAr: 'مخصص', colorEn: 'Custom', sizeAr: 'حسب المشروع', sizeEn: 'Per project', typeAr: 'منتج مخصص', typeEn: 'Custom product', price: 0, sku: 'OTH-002' }
        ];

        const DEFAULT_SITE_PRODUCTS = [
            { id: 'prod-wpc-raw', sortOrder: 1, cssClass: 'card-wpc-raw', iconClass: 'fas fa-door-open', titleIcon: 'fas fa-industry', legacyKey: 'wpc-raw', titleAr: 'أبواب WPC عضم (للورش والمصانع)', titleEn: 'WPC Raw Doors (Workshops)', titleZh: 'WPC 毛坯门', textAr: 'أبواب WPC عضم غير ملبّسة وغير جاهزة — للورش والمصانع التي تكمل التشطيب والتركيب.', textEn: 'Unfinished WPC door leaves for workshops and factories.', textZh: '供车间加工的 WPC 毛坯门。', backgroundImage: 'wpc-background', album: ['images/wpc-background.avif'], target: '#products', action: 'shop', anchorId: 'products', visible: true, shopEnabled: true, variants: DEFAULT_WPC_RAW_VARIANTS },
            { id: 'prod-wpc', sortOrder: 2, cssClass: 'card-wpc', iconClass: 'fas fa-door-closed', titleIcon: 'fas fa-door-open', legacyKey: 'wpc', titleAr: 'أبواب WPC جاهزة للتركيب', titleEn: 'WPC Ready Doors', titleZh: 'WPC 成品门', textAr: 'أبواب WPC جاهزة للتركيب — تجمع بين فخامة المظهر وصمود البلاستيك للمنازل والمشاريع.', textEn: 'Ready-to-install WPC doors for homes and projects.', textZh: '即装型 WPC 门。', backgroundImage: 'wpc-background', album: ['images/wpc-background.avif'], target: '#doors', action: 'shop', anchorId: 'doors', visible: true, shopEnabled: true, variants: DEFAULT_WPC_READY_VARIANTS },
            { id: 'prod-aluminum', sortOrder: 3, cssClass: 'card-aluminum', iconClass: 'fas fa-industry', titleIcon: 'fas fa-cog', legacyKey: 'aluminum', titleAr: 'الألومنيوم', titleEn: 'Aluminum', titleZh: '铝制品', textAr: 'منتجات ألومنيوم متينة وتصميمات ذكية تناسب مشاريع البناء والتشطيب.', textEn: 'Durable aluminum for construction and finishing.', textZh: '适用于建筑与装修的耐用铝材。', backgroundImage: 'aluminum-background', album: ['images/aluminum-background.webp'], target: '#aluminum', action: 'shop', anchorId: 'aluminum', visible: true, shopEnabled: true, variants: DEFAULT_ALUMINUM_VARIANTS },
            { id: 'prod-other', sortOrder: 4, cssClass: 'card-other-products', iconClass: 'fas fa-boxes', titleIcon: 'fas fa-boxes', legacyKey: 'otherProducts', titleAr: 'منتجات أخرى', titleEn: 'Other Products', titleZh: '其他产品', textAr: 'مجموعة متنوعة من المنتجات الإضافية والحلول المبتكرة.', textEn: 'A diverse range of additional products.', textZh: '多样化的附加产品与创新方案。', backgroundImage: 'background-other-products', album: ['images/background-other-products.jpeg'], target: '#products', visitorMode: 'shop', action: 'shop', anchorId: '', visible: true, shopEnabled: true, variants: DEFAULT_OTHER_VARIANTS },
            { id: 'prod-complaints', sortOrder: 5, cssClass: 'card-customer-complaints', iconClass: 'fas fa-search', titleIcon: 'fas fa-search', legacyKey: 'complaints', titleAr: 'استفسار عن الشكاوى', titleEn: 'Complaint Inquiry', titleZh: '投诉查询', textAr: 'تحقق من حالة شكواك بإدخال رقم الشكوى.', textEn: 'Check your complaint status with the complaint number.', textZh: '输入投诉编号查询处理状态。', backgroundImage: '', album: [], target: '', action: 'complaint', anchorId: '', visible: true }
        ];

        const DEFAULT_DASHBOARD_TILES = [
            { id: 'dash-content', zone: 'quick', dashGroup: 'command', sortOrder: 1, iconClass: 'fas fa-pen-to-square', titleAr: 'إدارة محتوى الموقع', titleEn: 'Site Content', textAr: 'منتجات، بوابة الزائر، شركاء، شهادات — ديناميكي بالكامل.', textEn: 'Products, gateway icons, partners, certs — fully dynamic.', handler: 'openSiteContentManager', permission: 'content', visible: true },
            { id: 'dash-about-pages', zone: 'quick', dashGroup: 'command', sortOrder: 2, iconClass: 'fas fa-building', titleAr: 'من نحن ورؤيتنا', titleEn: 'About & Vision', textAr: 'نصوص المصنع ووثائق الصفحات الداخلية.', textEn: 'Factory pages and documents.', handler: 'openAboutContentAdmin', permission: 'content', visible: true },
            { id: 'dash-certs', zone: 'quick', dashGroup: 'command', sortOrder: 3, iconClass: 'fas fa-award', titleAr: 'اعتمادات وشهادات', titleEn: 'Certifications', textAr: 'شهادات المعرض — صور وPDF.', textEn: 'Showroom certificates.', cssClass: 'dashboard-tile-card--certs', handler: 'openCertificationsHub', permission: 'content', visible: true },
            { id: 'dash-showroom', zone: 'quick', dashGroup: 'command', sortOrder: 4, iconClass: 'fas fa-images', titleAr: 'معرض نبراس', titleEn: 'Nebras Showroom', textAr: 'منتجات نبراس + مشاريع نبراس — صور وسلة.', textEn: 'Products & projects galleries.', handler: 'openShowroomHub', permission: 'content', visible: true },
            { id: 'dash-users', zone: 'quick', dashGroup: 'command', sortOrder: 4, iconClass: 'fas fa-users-cog', titleAr: 'المستخدمون والصلاحيات', titleEn: 'Users & RBAC', textAr: 'أدوار وصلاحيات كاملة للموقع.', textEn: 'Roles and full site permissions.', handler: 'openUserManagement', permission: 'users', visible: true },
            { id: 'dash-audit', zone: 'quick', dashGroup: 'command', sortOrder: 5, iconClass: 'fas fa-clipboard-check', titleAr: 'سجل العمليات', titleEn: 'Audit Log', textAr: 'تتبع كل إجراء إداري.', textEn: 'Track admin actions.', handler: 'openAuditLog', permission: 'audit', visible: true },
            { id: 'dash-sales', zone: 'quick', dashGroup: 'command', sortOrder: 6, iconClass: 'fas fa-chart-line', titleAr: 'المبيعات', titleEn: 'Sales', textAr: 'عروض الأسعار الواردة والمبيعات.', textEn: 'Quotes and sales.', handler: 'openSalesManagement', permission: 'sales', visible: true },
            { id: 'dash-cs', zone: 'quick', dashGroup: 'command', sortOrder: 7, iconClass: 'fas fa-headset', titleAr: 'خدمة العملاء', titleEn: 'Customer Service', textAr: 'استفسارات وردود العملاء.', textEn: 'Customer care.', handler: 'openCustomerServiceManagement', permission: 'customerService', visible: true },
            { id: 'dash-complaints', zone: 'quick', dashGroup: 'command', sortOrder: 8, iconClass: 'fas fa-exclamation-triangle', titleAr: 'الشكاوى', titleEn: 'Complaints', textAr: 'متابعة وحل الشكاوى.', textEn: 'Complaint resolution.', handler: 'openComplaintsManagement', permission: 'complaints', visible: true },
            { id: 'dash-branches', zone: 'quick', dashGroup: 'command', sortOrder: 9, iconClass: 'fas fa-map-marked-alt', titleAr: 'الفروع', titleEn: 'Branches', textAr: 'شبكة فروع المملكة.', textEn: 'KSA branch network.', handler: 'openBranchesManagement', permission: 'branches', visible: true },
            { id: 'dash-erp', zone: 'grid', dashGroup: 'erp', sortOrder: 1, iconClass: 'fas fa-cubes', titleAr: 'لوحة ERP', titleEn: 'ERP Console', textAr: 'نظام تخطيط موارد المصنع.', textEn: 'Factory ERP hub.', handler: 'scrollErpHub', permission: 'erp', visible: true },
            { id: 'dash-inventory', zone: 'grid', dashGroup: 'erp', sortOrder: 2, iconClass: 'fas fa-warehouse', titleAr: 'مخزون ERP', titleEn: 'Inventory WMS', textAr: 'SKU ومستودعات وتنبيهات.', textEn: 'SKU and warehouses.', cssClass: 'card-inventory-management', backgroundImage: 'pvc-background', handler: 'openErpInventory', permission: 'inventory', visible: true },
            { id: 'dash-sales-report', zone: 'grid', dashGroup: 'erp', sortOrder: 3, iconClass: 'fas fa-file-invoice-dollar', titleAr: 'تقارير المبيعات', titleEn: 'Sales Reports', textAr: 'تحليل أداء المبيعات.', textEn: 'Sales performance.', cssClass: 'card-sales-reports', backgroundImage: 'background', handler: 'openSalesManagement', permission: 'sales', visible: true },
            { id: 'dash-customers', zone: 'grid', dashGroup: 'erp', sortOrder: 4, iconClass: 'fas fa-user-friends', titleAr: 'إدارة العملاء', titleEn: 'CRM', textAr: 'علاقات العملاء.', textEn: 'Customer relationships.', cssClass: 'card-customer-management', backgroundImage: 'customer-complaints-background', handler: 'openCustomerServiceManagement', permission: 'customerService', visible: true },
            { id: 'dash-analytics', zone: 'grid', dashGroup: 'erp', sortOrder: 5, iconClass: 'fas fa-chart-pie', titleAr: 'التحليلات', titleEn: 'Analytics', textAr: 'منتجات · ألوان · شكاوى · زوار.', textEn: 'Live BI insights.', cssClass: 'card-analytics', backgroundImage: 'background-other-products', handler: 'openAdminAnalytics', permission: 'audit', visible: true },
            { id: 'dash-settings', zone: 'quick', dashGroup: 'command', sortOrder: 11, iconClass: 'fas fa-sliders-h', titleAr: 'إعدادات المنصة', titleEn: 'Platform Settings', textAr: 'بانر، بنوك، ضريبة، احتفال — Super Admin.', textEn: 'Banner, banks, VAT, occasions.', handler: 'openSystemSettings', permission: 'users', superadminOnly: true, visible: true }
        ];

        /** ربط أيقونات الداشبورد / iconDetail بمنتجات الموقع الديناميكية */
        const ICON_KEY_TO_PRODUCT_ID = {
            pvc: 'prod-wpc-raw',
            wpc: 'prod-wpc',
            aluminum: 'prod-aluminum',
            otherProducts: 'prod-other'
        };

        const DASHBOARD_HANDLER_MAP = {
            openUserManagement: openUserManagement,
            openSalesManagement: openSalesManagement,
            openCustomerServiceManagement: openCustomerServiceManagement,
            openComplaintsManagement: openComplaintsManagement,
            openBranchesManagement: openBranchesManagement,
            openAuditLog: openAuditLog,
            openSiteContentManager: openSiteContentManager,
            openAboutContentAdmin: function() {
                openSiteContentManager();
                switchScmTab('about');
            },
            openSystemSettings: function() { openSystemSettings(); },
            openErpInventory: function() { openErpInventory(); },
            openErpOrders: function() { openErpOrders(); },
            openErpProcurement: function() { openErpProcurement(); },
            scrollErpHub: function() { scrollErpHub(); },
            openCertificationsHub: function() { openCertificationsHub(); },
            openShowroomHub: function() { openShowroomHub(); },
            openPartnersAdmin: function() { openSiteContentManager(); switchScmTab('partners'); },
            openShowroomAdmin: function() { openSiteContentManager(); switchScmTab('showroom'); },
            erpFinanceStub: function() {
                alert('وحدة المالية ERP — مرحلة قادمة (محاسبة وتكاليف إنتاج).');
            },
            openAdminAnalytics: function() { openAdminAnalytics(); }
        };

        const DEPRECATED_VISITOR_ICON_IDS = [1, 5, 6];
        const DEPRECATED_VISITOR_ICON_KEYS = ['visitorQuickCatalogProducts', 'visitorQuickWpcDoors'];

        function purgeDeprecatedVisitorIcons() {
            if (!Array.isArray(visitorIcons)) return;
            visitorIcons = visitorIcons.filter(function(i) {
                if (!i) return false;
                if (DEPRECATED_VISITOR_ICON_IDS.indexOf(Number(i.id)) >= 0) return false;
                if (i.catalogHub) return false;
                if (i.titleKey && DEPRECATED_VISITOR_ICON_KEYS.indexOf(i.titleKey) >= 0) return false;
                return true;
            });
        }

        function isServicePlacementIcon(icon) {
            return !!(icon && icon.placement === 'services');
        }

        function isGatewayVisitorIcon(icon) {
            return !!(icon && icon.visible !== false && !isServicePlacementIcon(icon));
        }

        function getVisitorIconLane(icon) {
            if (!icon) return 'platform';
            if (isServicePlacementIcon(icon)) return '';
            if (icon.lane === 'store' || icon.lane === 'showroom' || icon.lane === 'platform') return icon.lane;
            if (icon.openHandler === 'certifications') return 'showroom';
            if (icon.linkedProductId || getCatalogExperience(icon) === 'shop') return 'store';
            const tg = String(icon.target || '').trim().toLowerCase();
            if (tg === '#branches' || tg === '#bank-accounts-section') return 'platform';
            if (icon.openHandler === 'color-rolls') return 'showroom';
            return 'showroom';
        }

        function ensureBuiltinVisitorIcons() {
            if (!Array.isArray(visitorIcons)) visitorIcons = [];
            purgeDeprecatedVisitorIcons();
            const byId = {};
            visitorIcons.forEach(function(i) {
                if (i && i.id != null) byId[i.id] = i;
            });
            DEFAULT_VISITOR_ICONS.forEach(function(def) {
                if (!byId[def.id]) {
                    visitorIcons.push(Object.assign({}, def));
                    byId[def.id] = visitorIcons[visitorIcons.length - 1];
                } else {
                    const cur = byId[def.id];
                    if (def.titleKey && !cur.titleKey) cur.titleKey = def.titleKey;
                    if (def.lane && !cur.lane) cur.lane = def.lane;
                    if (def.placement && !cur.placement) cur.placement = def.placement;
                    if (def.sortOrder != null && cur.sortOrder == null) cur.sortOrder = def.sortOrder;
                    if (def.linkedProductId && !cur.linkedProductId) cur.linkedProductId = def.linkedProductId;
                    if (def.id === 11 && (!cur.visitorMode || cur.visitorMode === 'browse')) {
                        cur.visitorMode = 'shop';
                        if (!cur.linkedProductId) cur.linkedProductId = 'prod-other';
                    }
                    if (def.id >= 14 && def.id <= 16) {
                        if (!cur.placement) cur.placement = 'services';
                        cur.target = '';
                        delete cur.linkedProductId;
                        if (def.backgroundImage) cur.backgroundImage = def.backgroundImage;
                        if (def.album && def.album.length) cur.album = def.album.slice();
                        if (def.textAr && !cur.textAr) cur.textAr = def.textAr;
                        if (def.textAr && !cur.textEn) cur.textEn = def.textAr;
                    }
                    if (def.id === 4) {
                        delete cur.iconPreset;
                        if (!cur.iconClass || cur.iconClass === 'fas fa-landmark') {
                            cur.iconClass = 'fas fa-building-columns';
                        }
                        cur.backgroundImage = NEBRAS_BANK_MEDIA.wall;
                        cur.album = [NEBRAS_BANK_MEDIA.snb, NEBRAS_BANK_MEDIA.riyad, NEBRAS_BANK_MEDIA.alrajhi];
                    }
                    if (def.id === 7) {
                        cur.backgroundImage = NEBRAS_SHOWROOM_ICON_MEDIA.certificationsBg;
                        cur.album = [NEBRAS_SHOWROOM_ICON_MEDIA.certificationsBg];
                    }
                    if (def.id === 13) {
                        cur.backgroundImage = NEBRAS_SHOWROOM_ICON_MEDIA.doorDesignerBg;
                        cur.album = [NEBRAS_SHOWROOM_ICON_MEDIA.doorDesignerBg];
                    }
                    if (def.id === 8) {
                        cur.backgroundImage = NEBRAS_STORE_ICON_MEDIA.wpcRawBg;
                        cur.album = [NEBRAS_STORE_ICON_MEDIA.wpcRawBg];
                    }
                    if (def.id === 11) {
                        cur.backgroundImage = NEBRAS_STORE_ICON_MEDIA.otherProductsBg;
                        cur.album = [NEBRAS_STORE_ICON_MEDIA.otherProductsBg];
                    }
                    if (def.id === 12) {
                        cur.backgroundImage = NEBRAS_STORE_ICON_MEDIA.complaintsBg;
                        cur.album = [NEBRAS_STORE_ICON_MEDIA.complaintsBg];
                        cur.visitorMode = 'browse';
                        cur.openHandler = 'complaints-inquiry';
                        delete cur.linkedProductId;
                    }
                    if (def.id === 14) {
                        cur.backgroundImage = NEBRAS_SERVICE_ICON_MEDIA.mfg;
                        cur.album = [NEBRAS_SERVICE_ICON_MEDIA.mfg];
                        cur.placement = 'services';
                        cur.target = '';
                    }
                    if (def.id === 15) {
                        cur.backgroundImage = NEBRAS_SERVICE_ICON_MEDIA.support;
                        cur.placement = 'services';
                        cur.target = '';
                        if (!cur.album || !cur.album.length) cur.album = ['images/customer-complaints-background.jpeg'];
                    }
                    if (def.id === 16) {
                        cur.backgroundImage = NEBRAS_SERVICE_ICON_MEDIA.quality;
                        cur.album = [NEBRAS_SERVICE_ICON_MEDIA.quality];
                        cur.placement = 'services';
                        cur.target = '';
                    }
                    if (def.id === 17) {
                        cur.backgroundImage = NEBRAS_SERVICE_ICON_MEDIA.install;
                        cur.album = [NEBRAS_SERVICE_ICON_MEDIA.install];
                        cur.placement = 'services';
                        cur.target = '';
                        if (!cur.titleKey) cur.titleKey = 'serviceTitleInstall';
                    }
                    if (def.id === 2) {
                        cur.backgroundImage = NEBRAS_PLATFORM_ICON_MEDIA.branchesBg;
                        cur.album = [NEBRAS_PLATFORM_ICON_MEDIA.branchesBg];
                        cur.visitorMode = 'browse';
                        cur.openHandler = 'branches-hub';
                        cur.target = '';
                    }
                    if (def.album && def.album.length && [2, 4, 7, 8, 11, 12, 13, 14, 16, 17].indexOf(def.id) < 0) cur.album = def.album.slice();
                    if (def.openHandler && !cur.openHandler) cur.openHandler = def.openHandler;
                    if (!cur.visitorMode && def.visitorMode) cur.visitorMode = def.visitorMode;
                }
            });
            visitorIcons.forEach(function(cur) {
                if ([8, 9, 10, 11].indexOf(cur.id) >= 0 && getVisitorIconLane(cur) === 'store') {
                    cur.catalogHub = true;
                    cur.visitorMode = 'shop';
                    cur.lane = 'store';
                }
            });
            visitorIcons.sort(function(a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
        }

        function getVisitorIconDisplayTitle(icon) {
            if (!icon) return '';
            const lang = currentLang || 'ar';
            const t = siteText[lang] || siteText.ar;
            if (icon.titleKey && t[icon.titleKey]) return String(t[icon.titleKey]);
            return String(icon.title || '');
        }

        /** أسماء الملفات بدون مسار ولا امتداد — نجرّب jpg/png/webp… تلقائياً */
        const VISITOR_ICON_BG_BASES = {
            8: ['nebras-wpc-raw-icon-bg', 'wpc-background', 'pvc-background'],
            9: ['wpc-background', 'pvc-background'],
            10: ['aluminum-background'],
            11: ['nebras-other-products-icon-bg', 'background-other-products'],
            2: ['background-nebras-branches'],
            3: ['background-Nebras-colour-catalogue-rolls', 'background-Nebras-colour-catalogue-(rolls)'],
            4: ['nebras-bank-accounts-wall', 'nebras-bank-accounts-wall.png'],
            7: ['nebras-certifications-icon-bg', 'background-quality-managment', 'background-quality-management'],
            12: ['nebras-complaints-icon-bg', 'customer-complaints-background'],
            13: ['nebras-door-designer-icon-bg', 'background-quality-managment', 'background-quality-management']
        };

        function stripImageBaseName(path) {
            return String(path || '').trim()
                .replace(/^images\//i, '')
                .replace(/^\/+/, '')
                .replace(/\.(jpg|jpeg|png|webp|avif)$/i, '');
        }

        function buildUrlList(baseNames) {
            const exts = ['webp', 'avif', 'jpg', 'jpeg', 'png'];
            const urls = [];
            (baseNames || []).forEach(function(base) {
                const clean = stripImageBaseName(base);
                if (!clean) return;
                exts.forEach(function(ext) {
                    urls.push('images/' + clean + '.' + ext);
                });
            });
            return urls;
        }

        const nebrasImageUrlCache = {};
        function tryUrls(el, urls, index) {
            if (!el || !urls || index >= urls.length) return;
            const url = urls[index];
            const cached = nebrasImageUrlCache[url];
            if (cached === false) {
                tryUrls(el, urls, index + 1);
                return;
            }
            if (cached) {
                el.style.backgroundImage = 'url("' + cached + '")';
                el.style.backgroundSize = 'cover';
                el.style.backgroundPosition = 'center';
                return;
            }
            const img = new Image();
            img.onload = function() {
                const safe = url.replace(/\\/g, '/');
                nebrasImageUrlCache[url] = safe;
                el.style.backgroundImage = 'url("' + safe + '")';
                el.style.backgroundSize = 'cover';
                el.style.backgroundPosition = 'center';
            };
            img.onerror = function() {
                nebrasImageUrlCache[url] = false;
                tryUrls(el, urls, index + 1);
            };
            img.src = url;
        }

        function branchImageUrls(imagePath) {
            const file = String(imagePath || '').trim();
            if (!file) return [];
            if (/^https?:\/\//i.test(file)) return [file];
            if (NEBRAS_IMAGE_EXT_RE.test(file)) return [normalizeMediaPath(file)];
            return buildUrlList([file]);
        }

        function tryUrlsOtherProducts(el, urls, index) {
            if (!el || !urls || index >= urls.length) return;
            const url = urls[index];
            const img = new Image();
            img.onload = function() {
                el.style.setProperty('--other-products-bg', 'url("' + url.replace(/\\/g, '/') + '")');
            };
            img.onerror = function() {
                tryUrlsOtherProducts(el, urls, index + 1);
            };
            img.src = url;
        }

        function resolveDoorRollTextureUrl(path) {
            const t = String(path || '').trim();
            if (!t) return '';
            if (/^(https?:|data:|blob:)/i.test(t)) return t;
            if (t.startsWith('/images/')) return t.substring(1);
            if (t.indexOf('images/') === 0) return t;
            if (t.indexOf('rolls/') === 0) return 'images/' + t;
            return NEBRAS_ROLL_SWATCH_DIR + t.replace(/^\/+/, '');
        }

        function normalizeMediaPath(path) {
            const t = String(path || '').trim();
            if (!t) return '';
            if (/^(https?:|data:|blob:)/i.test(t)) return t;
            let rel = t.replace(/\\/g, '/').replace(/^\/+/, '');
            if (rel.indexOf('uploads/') === 0 || rel.indexOf('rolls/') === 0) {
                return rel.indexOf('images/') === 0 ? rel : 'images/' + rel;
            }
            if (rel.indexOf('images/') !== 0) rel = 'images/' + rel;
            return rel;
        }

        function resolveDisplayMediaUrl(path) {
            const t = String(path || '').trim();
            if (!t) return '';
            if (/^(https?:|data:|blob:)/i.test(t)) return t;
            return normalizeMediaPath(t);
        }

        function mediaUrlForLightbox(url) {
            const u = resolveDisplayMediaUrl(url);
            if (!u) return '';
            if (/^https?:\/\//i.test(u)) {
                return u.replace(/[?&](width|height|quality|resize)=\d+/gi, '').replace(/\?$/, '');
            }
            return u;
        }

        function isNebrasMediaPdf(url) {
            const u = String(url || '').toLowerCase();
            return /\.pdf(\?|#|$)/.test(u) || u.indexOf('application/pdf') !== -1;
        }

        function isNebrasMediaImage(url) {
            if (!url || isNebrasMediaPdf(url)) return false;
            if (/^data:image\//i.test(url)) return true;
            return NEBRAS_IMAGE_EXT_RE.test(String(url)) || /^https?:\/\//i.test(url);
        }

        function bankAccountImageCandidates(path) {
            const raw = String(path || '').trim();
            if (!raw) return [];
            if (/^(https?:|data:|blob:)/i.test(raw)) return [raw];
            const base = stripImageBaseName(raw);
            if (!base) return [];
            return ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg'].map(function(ext) {
                return 'images/' + base + '.' + ext;
            });
        }

        function attachBankMediaFallback(el, candidates, index) {
            if (!el || !candidates || !candidates.length) return;
            const idx = index || 0;
            if (idx >= candidates.length) return;
            const url = candidates[idx];
            const probe = new Image();
            probe.onload = function() {
                if (el.tagName === 'IMG') el.src = url;
                else {
                    el.style.backgroundImage = 'url("' + url.replace(/"/g, '') + '")';
                    el.style.backgroundSize = 'cover';
                    el.style.backgroundPosition = 'center';
                }
            };
            probe.onerror = function() {
                attachBankMediaFallback(el, candidates, idx + 1);
            };
            probe.src = withBankMediaVersion(url);
        }

        function applyBankVisitorIconCard(node) {
            if (!node) return;
            const wallCandidates = bankAccountImageCandidates(NEBRAS_BANK_MEDIA.wall).map(withBankMediaVersion);
            attachBankMediaFallback(node, wallCandidates, 0);
            const platePaths = [NEBRAS_BANK_MEDIA.snb, NEBRAS_BANK_MEDIA.riyad, NEBRAS_BANK_MEDIA.alrajhi];
            node.querySelectorAll('.visitor-bank-plates img').forEach(function(img, i) {
                if (!platePaths[i]) return;
                attachBankMediaFallback(img, bankAccountImageCandidates(platePaths[i]).map(withBankMediaVersion), 0);
            });
        }

        function imageUrlsFromSource(source) {
            const raw = String(source || '').trim();
            if (!raw) return [];
            if (/^https?:\/\//i.test(raw)) return [sanitizeExternalUrl(raw)].filter(Boolean);
            if (NEBRAS_IMAGE_EXT_RE.test(raw)) return [normalizeMediaPath(raw)];
            const base = raw.replace(/^images\//i, '').replace(/^\/+/, '');
            return buildUrlList([base]);
        }

        function applyBackgroundToNode(node, source, useOtherProductsResolver) {
            if (!node || !source) return;
            const urls = imageUrlsFromSource(source);
            if (!urls.length) return;
            if (useOtherProductsResolver) tryUrlsOtherProducts(node, urls, 0);
            else tryUrls(node, urls, 0);
            node.setAttribute('data-bg-applied', '1');
        }

        function getLocalizedCatalogField(item, fieldPrefix, lang) {
            if (!item) return '';
            const l = lang === 'en' || lang === 'zh' ? lang : 'ar';
            const key = fieldPrefix + (l === 'ar' ? 'Ar' : l === 'en' ? 'En' : 'Zh');
            const val = item[key];
            if (val && String(val).trim()) return String(val).trim();
            return String(item[fieldPrefix + 'Ar'] || '').trim();
        }

        function mergeSupabaseIntoSiteCatalog(lang) {
            const bindings = [
                { key: 'pvc', productId: 'prod-wpc-raw' },
                { key: 'wpc', productId: 'prod-wpc' },
                { key: 'aluminum', productId: 'prod-aluminum' },
                { key: 'complaints', productId: 'prod-complaints' }
            ];
            bindings.forEach(function(b) {
                const section = dynamicSiteSections[b.key];
                const product = siteProducts.find(function(p) { return p.id === b.productId; });
                if (!section || !product) return;
                const t = getLocalizedSectionField(section, 'title', lang);
                const d = getLocalizedSectionField(section, 'description', lang);
                if (t) {
                    product['title' + (lang === 'en' ? 'En' : lang === 'zh' ? 'Zh' : 'Ar')] = t;
                }
                if (d) {
                    product['text' + (lang === 'en' ? 'En' : lang === 'zh' ? 'Zh' : 'Ar')] = d;
                }
                if (section.icon_class) product.iconClass = section.icon_class;
            });
        }

        function cloneVariants(list) {
            return (list || []).map(function(v) { return Object.assign({}, v); });
        }

        function migrateLegacyCatalogProducts() {
            const pvcIdx = siteProducts.findIndex(function(p) { return p.id === 'prod-pvc'; });
            if (pvcIdx >= 0 && !siteProducts.some(function(p) { return p.id === 'prod-wpc-raw'; })) {
                const old = siteProducts[pvcIdx];
                const rawDef = DEFAULT_SITE_PRODUCTS.find(function(p) { return p.id === 'prod-wpc-raw'; });
                siteProducts[pvcIdx] = Object.assign({}, rawDef || {}, {
                    id: 'prod-wpc-raw',
                    backgroundImage: old.backgroundImage || 'wpc-background',
                    album: old.album && old.album.length ? old.album.slice() : ['images/wpc-background.avif'],
                    variants: old.variants && old.variants.length ? old.variants : cloneVariants(DEFAULT_WPC_RAW_VARIANTS),
                    action: 'shop',
                    shopEnabled: true
                });
            }
            siteProducts = siteProducts.filter(function(p) { return p.id !== 'prod-pvc'; });
            const wpc = siteProducts.find(function(p) { return p.id === 'prod-wpc'; });
            if (wpc) {
                if (wpc.titleAr === 'أبواب WPC' || wpc.titleAr === 'حبيبات PVC') {
                    wpc.titleAr = 'أبواب WPC جاهزة للتركيب';
                    wpc.textAr = 'أبواب WPC جاهزة للتركيب — للمنازل والمشاريع.';
                }
                if (!wpc.variants || !wpc.variants.length) wpc.variants = cloneVariants(DEFAULT_WPC_READY_VARIANTS);
                if (!wpc.action || wpc.action === 'overlay') wpc.action = 'shop';
                wpc.shopEnabled = true;
            }
            const raw = siteProducts.find(function(p) { return p.id === 'prod-wpc-raw'; });
            if (raw) {
                if (!raw.variants || !raw.variants.length) raw.variants = cloneVariants(DEFAULT_WPC_RAW_VARIANTS);
                raw.action = 'shop';
                raw.shopEnabled = true;
            }
            const alu = siteProducts.find(function(p) { return p.id === 'prod-aluminum'; });
            if (alu) {
                if (!alu.variants || !alu.variants.length) alu.variants = cloneVariants(DEFAULT_ALUMINUM_VARIANTS);
                if (alu.action === 'overlay' || !alu.action) alu.action = 'shop';
                alu.shopEnabled = true;
            }
            const other = siteProducts.find(function(p) { return p.id === 'prod-other'; });
            if (other) {
                if (!other.variants || !other.variants.length) other.variants = cloneVariants(DEFAULT_OTHER_VARIANTS);
                other.visitorMode = 'shop';
                other.action = 'shop';
                other.shopEnabled = true;
            }
            const iconOther = (visitorIcons || []).find(function(i) { return i.id === 11; });
            if (iconOther) {
                iconOther.visitorMode = 'shop';
                if (!iconOther.linkedProductId) iconOther.linkedProductId = 'prod-other';
            }
            siteProducts.forEach(function(p) {
                if (p.action === 'complaint' || getCatalogExperience(p) === 'complaint') return;
                if (p.visitorMode === 'browse' || p.visitorMode === 'link') return;
                if (Array.isArray(p.variants) && p.variants.length > 0 && !p.visitorMode) {
                    p.visitorMode = 'shop';
                    p.action = 'shop';
                    p.shopEnabled = true;
                }
            });
        }

        function clearDemoCatalogVariants() {
            if (systemSettings && systemSettings.demoCatalogCleared) return;
            SHOP_CATALOG_PRODUCT_IDS.forEach(function(pid) {
                const p = siteProducts.find(function(x) { return x && x.id === pid; });
                if (p) {
                    p.variants = [];
                    p.shopEnabled = true;
                    p.action = 'shop';
                    if (!p.visitorMode || p.visitorMode === 'browse') p.visitorMode = 'shop';
                }
            });
            if (!systemSettings || typeof systemSettings !== 'object') systemSettings = Object.assign({}, DEFAULT_SYSTEM_SETTINGS);
            systemSettings.demoCatalogCleared = true;
        }

        function ensureBuiltinSiteCatalog() {
            if (!Array.isArray(siteProducts) || !siteProducts.length) {
                siteProducts = DEFAULT_SITE_PRODUCTS.map(function(p) {
                    const copy = Object.assign({}, p);
                    if (p.variants) copy.variants = cloneVariants(p.variants);
                    return copy;
                });
            }
            DEFAULT_SITE_PRODUCTS.forEach(function(def) {
                if (!siteProducts.some(function(p) { return p.id === def.id; })) {
                    const copy = Object.assign({}, def);
                    if (def.variants) copy.variants = cloneVariants(def.variants);
                    siteProducts.push(copy);
                }
            });
            migrateLegacyCatalogProducts();
            clearDemoCatalogVariants();
            siteProducts.sort(function(a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });

            if (!Array.isArray(dashboardTiles) || !dashboardTiles.length) {
                dashboardTiles = DEFAULT_DASHBOARD_TILES.map(function(t) { return Object.assign({}, t); });
            }
            DEFAULT_DASHBOARD_TILES.forEach(function(def) {
                if (!dashboardTiles.some(function(t) { return t.id === def.id; })) {
                    dashboardTiles.push(Object.assign({}, def));
                }
            });
            dashboardTiles.sort(function(a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
            dashboardTiles.forEach(function(t) {
                if (!t.inner) t.inner = { enabled: false, album: [], documents: [] };
                const def = DEFAULT_DASHBOARD_TILES.find(function(d) { return d.id === t.id; });
                if (def) {
                    if (!t.backgroundImage && def.backgroundImage) t.backgroundImage = def.backgroundImage;
                    if (!t.cssClass && def.cssClass) t.cssClass = def.cssClass;
                }
            });

            if (!Array.isArray(siteCustomSections)) siteCustomSections = [];
            if (!systemSettings.iconDetailOverrides || typeof systemSettings.iconDetailOverrides !== 'object') {
                systemSettings.iconDetailOverrides = {};
            }
        }

        function resolveProductIdFromHandler(handlerKey) {
            const key = String(handlerKey || '').trim();
            if (key.indexOf('product:') === 0) return key.slice(8).trim();
            if (key.indexOf('iconDetail:') === 0) {
                return ICON_KEY_TO_PRODUCT_ID[key.split(':')[1]] || '';
            }
            return '';
        }

        function runDashboardHandler(handlerKey) {
            if (!handlerKey) return;
            const key = String(handlerKey).trim();
            const productId = resolveProductIdFromHandler(key);
            if (productId && siteProducts.some(function(p) { return p.id === productId; })) {
                openProductCatalog(productId);
                return;
            }
            if (key.indexOf('iconDetail:') === 0) {
                openIconDetails(key.split(':')[1]);
                return;
            }
            const fn = DASHBOARD_HANDLER_MAP[key];
            if (typeof fn === 'function') fn();
        }

        function tileHasInnerContent(tile) {
            const inner = tile && tile.inner;
            if (!inner || inner.enabled === false) return false;
            return !!(
                (inner.textAr && String(inner.textAr).trim()) ||
                (inner.textEn && String(inner.textEn).trim()) ||
                (inner.album && inner.album.length) ||
                (inner.documents && inner.documents.length)
            );
        }

        function getLocalizedInnerField(inner, field, lang) {
            if (!inner) return '';
            const l = lang === 'en' || lang === 'zh' ? lang : 'ar';
            const key = field + (l === 'ar' ? 'Ar' : l === 'en' ? 'En' : 'Zh');
            const val = inner[key];
            if (val && String(val).trim()) return String(val).trim();
            return String(inner[field + 'Ar'] || inner[field + 'En'] || '').trim();
        }

        function getIconDetailPack(iconKey) {
            const base = iconDetails[iconKey];
            const overrides = (systemSettings.iconDetailOverrides || {})[iconKey];
            if (!base && !overrides) return null;
            const pack = { ar: {}, en: {}, zh: {}, documents: [] };
            ['ar', 'en', 'zh'].forEach(function(lang) {
                const b = base && base[lang] ? base[lang] : (base && base.ar ? base.ar : {});
                const o = overrides && overrides[lang] ? overrides[lang] : (overrides && overrides.ar ? overrides.ar : {});
                pack[lang] = {
                    title: ((o && o.title) || (b && b.title) || '').trim(),
                    text: ((o && o.text) || (b && b.text) || '').trim(),
                    album: (o && o.album && o.album.length) ? o.album.slice() : ((b && b.album) ? b.album.slice() : [])
                };
            });
            pack.documents = (overrides && overrides.documents) ? overrides.documents.slice() : [];
            return pack;
        }

        function resolveInnerPrimary(inner, tile) {
            const type = (inner && inner.primaryType) || 'handler';
            const value = (inner && inner.primaryValue) || '';
            if (type === 'scroll' && value) return { type: 'scroll', value: value };
            if (type === 'external' && value) return { type: 'external', value: value };
            if (type === 'tel_sales') return { type: 'tel_sales', value: '' };
            if (type === 'tel_customer') return { type: 'tel_customer', value: '' };
            if (type === 'none') return { type: 'none', value: '' };
            if (tile && tile.handler) return { type: 'handler', value: tile.handler };
            return { type: 'none', value: '' };
        }

        function openDashboardTileInner(tile) {
            const lang = currentLang || 'ar';
            const inner = tile.inner || {};
            const ui = siteText[lang] || siteText.ar;
            const title = getLocalizedInnerField(inner, 'title', lang) || getLocalizedCatalogField(tile, 'title', lang);
            let body = getLocalizedInnerField(inner, 'text', lang) || getLocalizedCatalogField(tile, 'text', lang);
            const album = (inner.album || []).map(normalizeMediaPath).filter(Boolean);
            const docs = (inner.documents || []).filter(function(d) { return d && d.url; });
            pendingTileHandler = tile.handler || null;
            const primary = resolveInnerPrimary(inner, tile);
            showRichIconOverlay(title, body, album, primary, docs);
        }

        function onDashboardTileClick(tileId) {
            const tile = dashboardTiles.find(function(t) { return t.id === tileId; });
            if (!tile) return;
            if (tile.permission && !canManage(tile.permission)) {
                alert('ليس لديك صلاحية فتح هذا القسم.');
                return;
            }
            if (tile.linkedProductId && siteProducts.some(function(p) { return p.id === tile.linkedProductId; })) {
                openProductCatalog(tile.linkedProductId);
                return;
            }
            const handlerProductId = resolveProductIdFromHandler(tile.handler);
            if (handlerProductId && siteProducts.some(function(p) { return p.id === handlerProductId; })) {
                openProductCatalog(handlerProductId);
                return;
            }
            if (tileHasInnerContent(tile)) {
                openDashboardTileInner(tile);
                return;
            }
            runDashboardHandler(tile.handler);
        }

        /** browse = معرض | shop = شراء | link = انتقال فقط | complaint */
        function getCatalogExperience(item) {
            if (!item) return 'browse';
            const raw = String(item.visitorMode || item.experience || item.action || '').toLowerCase();
            if (raw === 'complaint') return 'complaint';
            if (raw === 'shop' || raw === 'buy' || raw === 'store') return 'shop';
            if (raw === 'link' || raw === 'jump' || raw === 'navigate') return 'link';
            if (raw === 'browse' || raw === 'overlay' || raw === 'catalog' || raw === 'info') return 'browse';
            if (item.shopEnabled !== false && Array.isArray(item.variants) && item.variants.length) return 'shop';
            return 'browse';
        }

        function productHasShop(product) {
            if (!product || getCatalogExperience(product) === 'complaint') return false;
            if (product.shopEnabled === false) return false;
            return getCatalogExperience(product) === 'shop' ||
                (Array.isArray(product.variants) && product.variants.length > 0 && product.action === 'shop');
        }

        /** سلة الشراء في مساحة العمل — فقط عند فتح متجر (أيقونة/مسار shop) وليس معرض تصفح. */
        function shouldShowShopActions(route) {
            if (!route) return false;
            if (route.view === 'icon' && route.iconId) {
                const icon = visitorIcons.find(function(i) { return i.id === route.iconId; });
                return !!(icon && getCatalogExperience(icon) === 'shop');
            }
            if (route.iconId) {
                const icon = visitorIcons.find(function(i) { return i.id === route.iconId; });
                if (icon && getCatalogExperience(icon) !== 'shop') return false;
            }
            if (route.view === 'product' && route.productId) {
                const product = siteProducts.find(function(p) { return p.id === route.productId; });
                return productHasShop(product);
            }
            return false;
        }

        function buildWorkspaceModeHintHtml(mode, lang) {
            const ui = siteText[lang] || siteText.ar;
            if (mode === 'browse') {
                return '<p class="workspace-mode-hint workspace-mode-hint--browse"><i class="fas fa-images"></i> ' +
                    escapeHtmlAttr(ui.workspaceBrowseOnlyHint || 'معرض — للتصفح والمعاينة فقط. للشراء استخدم أيقونة المتجر أو «أضف للسلة».') + '</p>';
            }
            if (mode === 'shop') {
                return '<p class="workspace-mode-hint workspace-mode-hint--shop"><i class="fas fa-cart-shopping"></i> ' +
                    escapeHtmlAttr(ui.workspaceShopHint || 'متجر — اختر الصنف والمقاس ثم «أضف للسلة».') + '</p>';
            }
            return '';
        }

        function getExperienceBadgeHtml(item, lang) {
            const ui = siteText[lang] || siteText.ar;
            const exp = getCatalogExperience(item);
            if (exp === 'shop') {
                return '<span class="card-exp-badge card-exp-badge--shop"><i class="fas fa-cart-shopping"></i> ' + escapeHtmlAttr(ui.badgeShopShort || 'شراء') + '</span>';
            }
            if (exp === 'link') {
                return '<span class="card-exp-badge card-exp-badge--link"><i class="fas fa-arrow-right"></i> ' + escapeHtmlAttr(ui.badgeLinkShort || 'انتقال') + '</span>';
            }
            return '<span class="card-exp-badge card-exp-badge--browse"><i class="fas fa-images"></i> ' + escapeHtmlAttr(ui.badgeBrowseShort || 'تصفح') + '</span>';
        }

        function promptCatalogExperience(defaultExp) {
            const choice = prompt(
                'تجربة الزائر:\n' +
                'browse = معرض (صور + PDF — للتصفح فقط)\n' +
                'shop = متجر (مقاس/لون/سعر + سلة)\n' +
                'link = انتقال سريع (بدون معرض)\n' +
                'complaint = شكاوى',
                defaultExp || 'browse'
            );
            if (choice === null) return null;
            const c = String(choice).trim().toLowerCase();
            if (c === 'shop' || c === 'buy') return 'shop';
            if (c === 'link' || c === 'jump') return 'link';
            if (c === 'complaint') return 'complaint';
            if (c === 'browse' || c === 'overlay' || c === 'catalog' || c === 'info') return 'browse';
            return defaultExp || 'browse';
        }

        function applyExperienceToCatalogItem(item, exp) {
            if (!item || !exp) return;
            item.visitorMode = exp;
            if (exp === 'shop') {
                item.action = 'shop';
                item.shopEnabled = true;
            } else if (exp === 'complaint') {
                item.action = 'complaint';
                item.shopEnabled = false;
            } else if (exp === 'browse') {
                item.action = 'browse';
                item.shopEnabled = false;
            } else if (exp === 'link') {
                item.action = 'link';
                item.shopEnabled = false;
            }
        }

        function getCatalogProductModeLabel(product) {
            const exp = getCatalogExperience(product);
            if (exp === 'complaint') return 'استفسار شكاوى';
            if (exp === 'shop') return 'متجر (سلة + عرض سعر)';
            if (exp === 'link') return 'انتقال سريع';
            return 'معرض (تصفح فقط)';
        }

        function getVisitorIconModeLabel(icon) {
            const exp = getCatalogExperience(icon);
            if (exp === 'shop') return 'متجر';
            if (exp === 'link') return 'انتقال سريع';
            return 'معرض تصفح';
        }

        let iconOverlayShopProductId = null;

        function getProductMediaGallery(product) {
            const urls = [];
            const seen = {};
            function add(u) {
                const n = normalizeMediaPath(u);
                if (n && !seen[n]) {
                    seen[n] = true;
                    urls.push(n);
                }
            }
            if (!product) return urls;
            (product.album || []).forEach(add);
            (product.variants || []).forEach(function(v) {
                if (v && v.image) add(v.image);
            });
            const bg = String(product.backgroundImage || '').trim();
            if (bg) {
                if (/^(https?:|data:|blob:|images\/)/i.test(bg)) add(bg);
                else buildUrlList([bg.replace(/^images\//, '').replace(/\.[a-z0-9]+$/i, '')]).forEach(add);
            }
            return urls;
        }

        function buildVariantShowcaseHtml(product, lang, showShopActions) {
            const variants = (product && product.variants) ? product.variants : [];
            if (!variants.length) return '';
            const isEn = lang === 'en';
            const shopable = showShopActions !== false && productHasShop(product);
            const ui = siteText[lang] || siteText.ar;
            const pid = String(product.id).replace(/'/g, "\\'");
            const vatNote = '<p class="nebras-store-vat-note"><i class="fas fa-info-circle"></i> ' +
                escapeHtmlAttr(ui.pricesExVatNotice || 'الأسعار المعروضة قبل ضريبة القيمة المضافة — تُحسب الضريبة عند إضافة السلة وعرض السعر.') + '</p>';
            return vatNote +
                '<h4 class="nebras-store-skus-title">' + escapeHtmlAttr(ui.catalogVariantsTitle || 'الأنواع · المقاسات · الألوان') + '</h4>' +
                '<div class="nebras-store-sku-grid">' +
                variants.map(function(v, idx) {
                    const img = resolveDisplayMediaUrl(v.image || '');
                    const fullSrc = mediaUrlForLightbox(v.image || '');
                    const color = isEn ? (v.colorEn || v.colorAr) : (v.colorAr || v.colorEn);
                    const size = isEn ? (v.sizeEn || v.sizeAr) : (v.sizeAr || v.sizeEn);
                    const type = isEn ? (v.typeEn || v.typeAr) : (v.typeAr || v.typeEn);
                    const label = [type, size, color].filter(Boolean).join(' · ') || (ui.variantDefaultLabel || 'صنف #' + (idx + 1));
                    const specs = [];
                    if (type) specs.push('<li><span>' + escapeHtmlAttr(ui.variantTypeLabel || 'النوع') + '</span><strong>' + escapeHtmlAttr(type) + '</strong></li>');
                    if (size) specs.push('<li><span>' + escapeHtmlAttr(ui.variantSizeLabel || 'المقاس') + '</span><strong>' + escapeHtmlAttr(size) + '</strong></li>');
                    if (color) specs.push('<li><span>' + escapeHtmlAttr(ui.variantColorLabel || 'اللون') + '</span><strong>' + escapeHtmlAttr(color) + '</strong></li>');
                    const addBtn = shopable
                        ? '<button type="button" class="nebras-store-sku-add-btn" onclick="event.stopPropagation();addVariantIndexToCart(\'' + pid + '\',' + idx + ',1)"><i class="fas fa-cart-plus"></i> ' + escapeHtmlAttr(ui.addVariantToCart || 'أضف للسلة') + '</button>'
                        : (productHasShop(product) ? '<span class="nebras-store-sku-preview-only">' + escapeHtmlAttr(ui.variantPreviewOnly || 'للمعاينة') + '</span>' : '');
                    const media = img
                        ? '<div class="nebras-store-sku-media"><img class="nebras-clickable-media" src="' + escapeHtmlAttr(img) + '" data-full-src="' + escapeHtmlAttr(fullSrc || img) + '" alt="' + escapeHtmlAttr(label) + '" loading="lazy" decoding="async" title="' + escapeHtmlAttr(ui.lightboxOpenHint || 'اضغط للتكبير') + '"></div>'
                        : '<div class="nebras-store-sku-media nebras-store-sku-media--empty"><i class="fas fa-box-open"></i></div>';
                    return '<article class="nebras-store-sku-card">' + media +
                        '<div class="nebras-store-sku-body">' +
                        '<strong class="nebras-store-sku-name">' + escapeHtmlAttr(label) + '</strong>' +
                        (specs.length ? '<ul class="nebras-store-sku-specs">' + specs.join('') + '</ul>' : '') +
                        '<div class="nebras-store-sku-price">' + formatVariantPriceBlock(v.price, lang) + '</div>' +
                        addBtn +
                        '</div></article>';
                }).join('') +
                '</div>';
        }

        function getProductPriceLine(product, lang, ui) {
            if (!productHasShop(product) || !(product.variants || []).length) {
                return ui.catalogHubBrowse || 'تصفح';
            }
            const prices = (product.variants || []).map(function(v) { return Number(v.price) || 0; }).filter(function(n) { return n > 0; });
            if (prices.length) return formatSar(Math.min.apply(null, prices)) + '+';
            return ui.catalogHubPriceOnRequest || 'عند الطلب';
        }

        function getProductsForVisitorIcon(icon) {
            if (!icon) return [];
            if (icon.linkedProductId) {
                const linked = siteProducts.find(function(p) { return p.id === icon.linkedProductId; });
                if (!linked || linked.visible === false) return [];
                if (linked.id === 'prod-complaints') return [];
                return getCatalogExperience(linked) !== 'complaint' ? [linked] : [];
            }
            const pool = siteProducts.filter(function(p) {
                return p.visible !== false && getCatalogExperience(p) !== 'complaint';
            });
            if (icon.catalogHub) {
                const tgHub = String(icon.target || '').trim();
                let hubPool = pool;
                if (tgHub.startsWith('#')) {
                    hubPool = pool.filter(function(p) {
                        const pt = String(p.target || '').trim();
                        const pa = String(p.anchorId || '').trim();
                        return pt === tgHub || pa === tgHub.slice(1) || ('#' + pa) === tgHub;
                    });
                }
                if (Array.isArray(icon.productIds) && icon.productIds.length) {
                    hubPool = icon.productIds.map(function(id) {
                        return pool.find(function(p) { return p.id === id; });
                    }).filter(Boolean);
                }
                return hubPool.slice().sort(function(a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
            }
            const tg = String(icon.target || '').trim();
            if (tg.startsWith('#')) {
                const anchor = tg.slice(1);
                return pool.filter(function(p) {
                    const pt = String(p.target || '').trim();
                    const pa = String(p.anchorId || '').trim();
                    return pt === tg || pa === anchor;
                }).sort(function(a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
            }
            if (Array.isArray(icon.productIds) && icon.productIds.length) {
                return icon.productIds.map(function(id) {
                    return pool.find(function(p) { return p.id === id; });
                }).filter(Boolean);
            }
            return [];
        }

        function buildIconInnerHubHtml(products, lang) {
            const ui = siteText[lang] || siteText.ar;
            let cardsHtml = '';
            products.forEach(function(p) {
                const title = getLocalizedCatalogField(p, 'title', lang);
                const text = getLocalizedCatalogField(p, 'text', lang);
                const img = resolveDisplayMediaUrl(getProductMediaGallery(p)[0] || '');
                const pid = String(p.id).replace(/'/g, "\\'");
                const priceLine = getProductPriceLine(p, lang, ui);
                const openLabel = ui.iconInnerOpenProduct || 'عرض المنتج';
                const desc = text ? String(text).slice(0, 72) + (text.length > 72 ? '…' : '') : '';
                cardsHtml += '<article class="nebras-store-catalog-card nebras-store-catalog-card--hub" role="button" tabindex="0" onclick="closeIconOverlay();openProductCatalog(\'' + pid + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){closeIconOverlay();openProductCatalog(\'' + pid + '\')}">';
                cardsHtml += '<span class="nebras-store-catalog-media">';
                if (img) {
                    cardsHtml += '<img src="' + escapeHtmlAttr(img) + '" alt="' + escapeHtmlAttr(title) + '" loading="lazy" decoding="async">';
                } else {
                    cardsHtml += '<span class="nebras-store-catalog-placeholder"><i class="fas fa-box"></i></span>';
                }
                cardsHtml += '</span>';
                cardsHtml += '<span class="nebras-store-catalog-body">';
                cardsHtml += '<strong class="nebras-store-catalog-title">' + escapeHtmlAttr(title) + '</strong>';
                if (desc) cardsHtml += '<span class="nebras-store-catalog-desc">' + escapeHtmlAttr(desc) + '</span>';
                cardsHtml += '<span class="nebras-store-catalog-price">' + escapeHtmlAttr(priceLine) + '</span>';
                cardsHtml += '<span class="nebras-store-catalog-cta"><i class="fas fa-search-plus"></i> ' + escapeHtmlAttr(openLabel) + '</span>';
                cardsHtml += '</span></article>';
            });
            return '<div class="icon-inner-hub-wrap">' +
                '<h4 class="nebras-store-skus-title">' + escapeHtmlAttr(ui.catalogHubPick || 'اختر المنتج — صورة · شرح · سعر') + '</h4>' +
                '<div class="nebras-store-catalog-grid nebras-store-catalog-grid--hub">' + cardsHtml + '</div>' +
                '</div>';
        }

        function buildProductDetailInnerHtml(product, lang, options) {
            const opts = options || {};
            const ui = siteText[lang] || siteText.ar;
            const title = getLocalizedCatalogField(product, 'title', lang);
            const text = getLocalizedCatalogField(product, 'text', lang);
            const gallery = getProductMediaGallery(product).map(resolveDisplayMediaUrl).filter(Boolean);
            const hero = gallery[0] || '';
            const fullHero = mediaUrlForLightbox(hero);
            const pid = String(product.id).replace(/'/g, "\\'");
            const pidAttr = escapeHtmlAttr(product.id);
            const heroId = 'nebras-store-hero-' + product.id;

            let html = '<section class="nebras-store-product" data-product-id="' + pidAttr + '">';
            if (hero) {
                html += '<div class="nebras-store-product-hero">' +
                    '<img id="' + escapeHtmlAttr(heroId) + '" class="nebras-clickable-media nebras-store-hero-img" src="' + escapeHtmlAttr(hero) + '" data-full-src="' + escapeHtmlAttr(fullHero || hero) + '" alt="' + escapeHtmlAttr(title) + '" loading="eager" decoding="async" title="' + escapeHtmlAttr(ui.lightboxOpenHint || 'اضغط للتكبير') + '">' +
                    '<span class="nebras-store-zoom-hint"><i class="fas fa-search-plus"></i> ' + escapeHtmlAttr(ui.lightboxOpenHint || 'اضغط للتكبير') + '</span></div>';
            }
            html += '<div class="nebras-store-product-info">' +
                '<h3 class="nebras-store-product-title">' + escapeHtmlAttr(title) + '</h3>' +
                (text ? '<p class="nebras-store-product-desc">' + escapeHtmlAttr(text) + '</p>' : '') +
                '</div>';
            if (gallery.length > 1) {
                html += '<div class="nebras-store-product-gallery" role="list">';
                gallery.forEach(function(src, idx) {
                    const full = mediaUrlForLightbox(src);
                    const srcEsc = String(src).replace(/'/g, "\\'");
                    const fullEsc = String(full || src).replace(/'/g, "\\'");
                    html += '<button type="button" class="nebras-store-gallery-thumb' + (idx === 0 ? ' is-active' : '') + '" data-product-id="' + pidAttr + '" data-src="' + escapeHtmlAttr(src) + '" onclick="nebrasSetStoreProductHero(\'' + pid + '\',\'' + srcEsc + '\',\'' + fullEsc + '\')" role="listitem">' +
                        '<img src="' + escapeHtmlAttr(src) + '" alt="" loading="lazy" decoding="async" onerror="this.closest(\'button\').hidden=true">' +
                        '</button>';
                });
                html += '</div>';
            }
            const variantsBlock = buildVariantShowcaseHtml(product, lang, !!opts.showShopActions);
            if (variantsBlock) html += variantsBlock;
            html += '</section>';
            return html;
        }

        function nebrasSetStoreProductHero(productId, src, fullSrc) {
            const img = document.getElementById('nebras-store-hero-' + productId);
            const resolved = resolveDisplayMediaUrl(src);
            if (img && resolved) {
                img.src = resolved;
                img.setAttribute('data-full-src', mediaUrlForLightbox(fullSrc || src));
            }
            document.querySelectorAll('.nebras-store-gallery-thumb[data-product-id="' + productId + '"]').forEach(function(btn) {
                btn.classList.toggle('is-active', btn.getAttribute('data-src') === src || resolveDisplayMediaUrl(btn.getAttribute('data-src')) === resolved);
            });
        }
        window.nebrasSetStoreProductHero = nebrasSetStoreProductHero;

        function openProductFromWorkspaceHub(productId) {
            const cur = nebrasWorkspaceState.route;
            const iconId = cur && cur.iconId ? cur.iconId : null;
            openNebrasWorkspace({ pillar: 'store', view: 'product', productId: productId, iconId: iconId });
        }

        function openProductCatalog(productId) {
            const product = siteProducts.find(function(p) { return p.id === productId; });
            if (!product) {
                alert('المنتج غير موجود في الكتالوج. راجع «إدارة محتوى الموقع» → المنتجات.');
                return;
            }
            const lang = currentLang || 'ar';
            const ui = siteText[lang] || siteText.ar;
            const exp = getCatalogExperience(product);

            if (exp === 'complaint') {
                openCustomerComplaints();
                return;
            }
            if (exp === 'link') {
                const tg = String(product.target || '').trim();
                if (tg.startsWith('#')) {
                    if (nebrasWorkspaceState.active) {
                        openNebrasWorkspace({ pillar: 'showroom', view: 'section', section: tg });
                    } else {
                        scrollToSection(tg);
                    }
                } else if (/^https?:\/\//i.test(tg)) window.open(tg, '_blank', 'noopener,noreferrer');
                else alert(ui.overlayNoTarget || 'لم يُحدد قسم أو رابط لهذا العنصر.');
                return;
            }

            const cur = nebrasWorkspaceState.active ? nebrasWorkspaceState.route : null;
            const iconId = cur && cur.iconId ? cur.iconId : null;
            openNebrasWorkspace({ pillar: 'store', view: 'product', productId: productId, iconId: iconId });
        }

        function openVisitorCatalogHub(icon, productsOverride) {
            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            const products = (productsOverride && productsOverride.length)
                ? productsOverride
                : getProductsForVisitorIcon(icon);
            if (!products.length) {
                alert(ui.catalogHubEmpty || 'لا توجد منتجات — أضيفيها من إدارة المحتوى.');
                return;
            }
            openNebrasWorkspace({
                pillar: 'store',
                view: 'catalog-hub',
                iconId: icon ? icon.id : null
            });
        }
        function openSiteProduct(productId) {
            openProductCatalog(productId);
        }

        const NEBRAS_TIMEZONE = 'Asia/Riyadh';

        function getNebrasLocale(lang) {
            const l = lang || currentLang || 'ar';
            if (l === 'en') return 'en-SA';
            if (l === 'zh') return 'zh-CN';
            return 'ar-SA';
        }

        function formatNebrasDateTime(value, lang, options) {
            const d = value instanceof Date ? value : new Date(value);
            if (isNaN(d.getTime())) return '—';
            const opts = Object.assign({ timeZone: NEBRAS_TIMEZONE, hour12: true }, options || {});
            return d.toLocaleString(getNebrasLocale(lang), opts);
        }

        function updateNebrasSiteClock() {
            const el = document.getElementById('nebras-site-clock');
            if (!el) return;
            const lang = currentLang || 'ar';
            const ui = siteText[lang] || siteText.ar;
            const now = formatNebrasDateTime(new Date(), lang, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            el.textContent = (ui.siteClockLabel || 'توقيت المملكة العربية السعودية: ') + now;
        }

        function formatSar(amount) {
            const n = Number(amount) || 0;
            const lang = currentLang || 'ar';
            const formatted = n.toLocaleString(getNebrasLocale(lang), { minimumFractionDigits: 0, maximumFractionDigits: 2 });
            return formatted + (lang === 'en' ? ' SAR' : ' ر.س');
        }

        /** نسبة ضريبة القيمة المضافة (افتراضي 15% — تُدار من إعدادات النظام) */
        function getNebrasVatRate() {
            const raw = Number(systemSettings && systemSettings.vatRate);
            if (!isNaN(raw) && raw > 0) {
                return raw > 1 ? raw / 100 : raw;
            }
            return 0.15;
        }

        function getNebrasVatPercentLabel() {
            return Math.round(getNebrasVatRate() * 100);
        }

        function priceIncVat(exVat) {
            return (Number(exVat) || 0) * (1 + getNebrasVatRate());
        }

        function calcCartTotals(lines) {
            const items = lines || nebrasCart || [];
            let subtotalEx = 0;
            let totalInc = 0;
            items.forEach(function(l) {
                const unit = Number(l.unitPrice) || 0;
                const qty = Number(l.qty) || 1;
                subtotalEx += unit * qty;
                totalInc += priceIncVat(unit) * qty;
            });
            const vatRate = getNebrasVatRate();
            const vatAmount = totalInc - subtotalEx;
            return {
                subtotalEx: subtotalEx,
                vatRate: vatRate,
                vatAmount: vatAmount,
                totalInc: totalInc
            };
        }

        function formatVariantPriceBlock(exPrice, lang) {
            const ui = siteText[lang] || siteText.ar;
            const ex = Number(exPrice) || 0;
            if (ex <= 0) {
                return '<span class="variant-price variant-price--request">' + escapeHtmlAttr(ui.catalogHubPriceOnRequest || 'عند الطلب') + '</span>';
            }
            const pct = getNebrasVatPercentLabel();
            return '<span class="variant-price-stack">' +
                '<span class="variant-price-ex">' + escapeHtmlAttr(formatSar(ex)) + '</span>' +
                '<span class="variant-price-note">' + escapeHtmlAttr(ui.priceExVatShort || 'قبل الضريبة') + '</span>' +
                '<span class="variant-price-inc">' + escapeHtmlAttr(formatSar(priceIncVat(ex))) + '</span>' +
                '<span class="variant-price-note variant-price-note--inc">' + escapeHtmlAttr((ui.priceIncVatShort || 'شامل الضريبة {pct}%').replace('{pct}', String(pct))) + '</span>' +
                '</span>';
        }

        function formatCartLinePriceHtml(line, lang) {
            const ui = siteText[lang] || siteText.ar;
            const unit = Number(line.unitPrice) || 0;
            const qty = Number(line.qty) || 1;
            if (unit <= 0) {
                return '<span class="cart-line-price">' + escapeHtmlAttr(lang === 'en' ? 'On request' : (lang === 'zh' ? '询价' : 'عند الطلب')) + '</span>';
            }
            const unitInc = priceIncVat(unit);
            const lineEx = unit * qty;
            const lineInc = unitInc * qty;
            const pct = String(getNebrasVatPercentLabel());
            const incNote = (ui.priceIncVatShort || 'شامل الضريبة {pct}%').replace('{pct}', pct);
            return '<div class="cart-line-price cart-line-price--vat">' +
                '<span class="cart-line-unit-ex">' + escapeHtmlAttr(formatSar(unit)) + ' <small>' + escapeHtmlAttr(ui.cartUnitEx || 'وحدة قبل الضريبة') + '</small></span>' +
                '<span class="cart-line-unit-inc">' + escapeHtmlAttr(formatSar(unitInc)) + ' <small>' + escapeHtmlAttr(ui.cartUnitInc || 'وحدة شامل الضريبة') + '</small></span>' +
                '<span class="cart-line-ex">' + escapeHtmlAttr(formatSar(lineEx)) + ' <small>' + escapeHtmlAttr((ui.cartLineEx || 'السطر ×{qty} قبل الضريبة').replace('{qty}', String(qty))) + '</small></span>' +
                '<span class="cart-line-inc">' + escapeHtmlAttr(formatSar(lineInc)) + ' <small>' + escapeHtmlAttr((ui.cartLineInc || 'السطر شامل الضريبة').replace('{pct}', pct)) + '</small></span>' +
                '</div>';
        }

        /** جلسة زائر فريدة — السلة والبيانات لا تُشارك بين زوار أو أجهزة */
        function getVisitorSessionId() {
            try {
                let sid = sessionStorage.getItem('nebrasVisitorSid');
                if (!sid) {
                    sid = 'vs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 12);
                    sessionStorage.setItem('nebrasVisitorSid', sid);
                }
                return sid;
            } catch (e) {
                return 'vs_fallback_' + Date.now();
            }
        }

        function getCartStorageKey() {
            return 'nebrasCart_' + getVisitorSessionId();
        }

        function getCheckoutStorageKey() {
            return 'nebrasCheckout_' + getVisitorSessionId();
        }

        function getQuoteSessionStorageKey() {
            return 'nebrasQuoteSession_' + getVisitorSessionId();
        }

        function saveQuoteSessionState() {
            try {
                sessionStorage.setItem(getQuoteSessionStorageKey(), JSON.stringify({
                    quoteIssue: currentQuoteIssue,
                    updatedAt: Date.now()
                }));
            } catch (e) { /* ignore */ }
        }

        function loadQuoteSessionState() {
            try {
                const raw = sessionStorage.getItem(getQuoteSessionStorageKey());
                if (!raw) return;
                const data = JSON.parse(raw);
                if (data && data.quoteIssue && data.quoteIssue.quoteNo) {
                    currentQuoteIssue = data.quoteIssue;
                }
            } catch (e) { /* ignore */ }
        }

        function clearQuoteSessionState() {
            currentQuoteIssue = null;
            try {
                sessionStorage.removeItem(getQuoteSessionStorageKey());
            } catch (e) { /* ignore */ }
        }

        function buildVisitorPrivacyStripHtml(lang) {
            const ui = siteText[lang] || siteText.ar;
            const shortId = getVisitorSessionId().slice(-8).toUpperCase();
            return '<div class="nebras-visitor-privacy-strip" role="status" aria-live="polite">' +
                '<i class="fas fa-user-shield" aria-hidden="true"></i>' +
                '<span>' + escapeHtmlAttr(ui.visitorPrivacyStrip || 'خصوصيتك محمية — سلتك وعروض أسعارك خاصة بجلستك فقط ولا يراها زوار آخرون.') + '</span>' +
                '<code class="nebras-session-ref" dir="ltr" title="' + escapeHtmlAttr(ui.sessionRefTitle || 'مرجع جلستك الخاصة') + '">' + escapeHtmlAttr(shortId) + '</code></div>';
        }

        /** إزالة تخزين السلة القديم المشترك — خصوصية كل زائر */
        function purgeLegacySharedCartStorage() {
            try {
                localStorage.removeItem('nebrasCart');
                localStorage.removeItem('nebrasCheckout');
            } catch (e) { /* ignore */ }
        }

        function loadNebrasCart() {
            purgeLegacySharedCartStorage();
            try {
                const key = getCartStorageKey();
                const raw = sessionStorage.getItem(key);
                nebrasCart = raw ? JSON.parse(raw) : [];
                if (!Array.isArray(nebrasCart)) nebrasCart = [];
            } catch (e) {
                nebrasCart = [];
            }
            loadQuoteSessionState();
        }

        function saveNebrasCart() {
            try {
                sessionStorage.setItem(getCartStorageKey(), JSON.stringify(nebrasCart));
            } catch (e) {
                console.warn('Cart save failed', e);
            }
            updateCartBadge();
            updateSalesQuoteFab();
        }

        function getCheckoutProfile() {
            try {
                const raw = sessionStorage.getItem(getCheckoutStorageKey());
                const p = raw ? JSON.parse(raw) : {};
                return p && typeof p === 'object' ? p : {};
            } catch (e) {
                return {};
            }
        }

        function saveCheckoutProfile(profile) {
            try {
                sessionStorage.setItem(getCheckoutStorageKey(), JSON.stringify(profile || {}));
            } catch (e) { /* ignore */ }
        }

        function readCheckoutFormToProfile() {
            const existing = getCheckoutProfile();
            const nameEl = document.getElementById('checkout-customer-name');
            const phoneEl = document.getElementById('checkout-customer-phone');
            const emailEl = document.getElementById('checkout-customer-email');
            const cityEl = document.getElementById('checkout-customer-city');
            const addressEl = document.getElementById('checkout-customer-address');
            const noteEl = document.getElementById('checkout-customer-note');
            const profile = Object.assign({}, existing, {
                customerName: nameEl ? nameEl.value.trim() : '',
                phone: phoneEl ? phoneEl.value.trim() : '',
                email: emailEl ? emailEl.value.trim() : '',
                city: cityEl ? cityEl.value.trim() : '',
                address: addressEl ? addressEl.value.trim() : '',
                note: noteEl ? noteEl.value.trim() : '',
                sessionId: getVisitorSessionId(),
                updatedAt: Date.now()
            });
            saveCheckoutProfile(profile);
            return profile;
        }

        function fillCheckoutFormFromProfile() {
            const p = getCheckoutProfile();
            const map = {
                'checkout-customer-name': p.customerName,
                'checkout-customer-phone': p.phone,
                'checkout-customer-email': p.email,
                'checkout-customer-city': p.city,
                'checkout-customer-address': p.address,
                'checkout-customer-note': p.note
            };
            Object.keys(map).forEach(function(id) {
                const el = document.getElementById(id);
                if (el && map[id]) el.value = map[id];
            });
            if (p.paymentBankId) {
                const bankRadio = document.querySelector('input[name="cart-payment-bank"][value="' + p.paymentBankId + '"]');
                if (bankRadio) bankRadio.checked = true;
            }
            const paidEl = document.getElementById('cart-payment-declared');
            if (paidEl) paidEl.checked = !!p.transferDeclared;
            refreshCheckoutReceiptUi();
        }

        function buildCartBankPaymentHtml(lang) {
            ensureDefaultBankAccounts();
            const ui = siteText[lang] || siteText.ar;
            const accounts = (systemSettings.bankAccounts || []).filter(function(b) { return b && b.iban; });
            const p = getCheckoutProfile();
            const selected = p.paymentBankId || (accounts[0] && accounts[0].id) || '';
            const banksHtml = accounts.map(function(b, idx) {
                const name = lang === 'en' ? (b.bankNameEn || b.bankNameAr) : (b.bankNameAr || b.bankNameEn);
                const checked = (b.id === selected) || (!selected && idx === 0) ? ' checked' : '';
                const imgCandidates = b.imageUrl ? bankAccountImageCandidates(b.imageUrl).map(withBankMediaVersion) : [];
                const logoHtml = imgCandidates.length
                    ? '<img class="cart-bank-option-logo" src="' + escapeHtmlAttr(imgCandidates[0]) + '" alt="" loading="lazy" decoding="async">'
                    : '<i class="fas fa-university cart-bank-option-logo" aria-hidden="true" style="display:flex;align-items:center;justify-content:center;font-size:1.2rem;color:#0d2840;"></i>';
                return '<label class="cart-bank-option">' +
                    '<input type="radio" name="cart-payment-bank" value="' + escapeHtmlAttr(b.id) + '"' + checked + '>' +
                    logoHtml +
                    '<span class="cart-bank-option-body"><strong>' + escapeHtmlAttr(name) + '</strong>' +
                    '<code dir="ltr" class="cart-bank-iban">' + escapeHtmlAttr(b.iban) + '</code>' +
                    '<button type="button" class="cart-bank-copy-btn" onclick="event.preventDefault();copyBankAccountIban(\'' + escapeHtmlAttr(b.iban) + '\', event)">' +
                    '<i class="fas fa-copy"></i> ' + escapeHtmlAttr(ui.bankIbanCopyBtn || 'نسخ الآيبان') + '</button></span></label>';
            }).join('');
            const trustRow = '<div class="cart-trust-row">' +
                '<span><i class="fas fa-lock"></i> ' + escapeHtmlAttr(ui.cartTrustSecure || 'دفع آمن عبر حوالة بنكية رسمية') + '</span>' +
                '<span><i class="fas fa-building-columns"></i> ' + escapeHtmlAttr(ui.cartTrustOfficial || 'حسابات مصنع نبراس المعتمدة') + '</span></div>';
            return trustRow +
                '<section class="cart-payment-block" id="cart-payment-block" aria-labelledby="cart-payment-title">' +
                '<h3 id="cart-payment-title">' + escapeHtmlAttr(ui.cartPaymentTitle || 'الدفع والحوالة البنكية') + '</h3>' +
                '<p class="cart-payment-intro">' + escapeHtmlAttr(ui.cartPaymentIntro || 'اختر حساب الحوالة — ثم أكّد التحويل وارفع الإيصال من «ملاحظات المبيعات» أعلاه.') + '</p>' +
                '<div class="cart-bank-options">' + banksHtml + '</div>' +
                '</section>';
        }

        function renderCheckoutBankQuickList() {
            const el = document.getElementById('cart-bank-quick-list');
            if (!el) return;
            ensureDefaultBankAccounts();
            const lang = currentLang || 'ar';
            const ui = siteText[lang] || siteText.ar;
            const accounts = (systemSettings.bankAccounts || []).filter(function(b) { return b && b.iban; });
            if (!accounts.length) {
                el.innerHTML = '<p class="cart-bank-quick-empty">' + escapeHtmlAttr(ui.cartBankQuickEmpty || 'حسابات الحوالة تُعرض من إعدادات المنصة.') + '</p>';
                return;
            }
            el.innerHTML = '<p class="cart-bank-quick-title">' + escapeHtmlAttr(ui.cartBankQuickTitle || 'حسابات مصنع نبراس للحوالة:') + '</p>' +
                accounts.map(function(b) {
                    const name = lang === 'en' ? (b.bankNameEn || b.bankNameAr) : (b.bankNameAr || b.bankNameEn);
                    return '<div class="cart-bank-quick-item">' +
                        '<strong>' + escapeHtmlAttr(name) + '</strong> ' +
                        '<code dir="ltr" class="cart-bank-iban">' + escapeHtmlAttr(b.iban) + '</code> ' +
                        '<button type="button" class="cart-bank-copy-btn cart-bank-copy-btn--inline" onclick="copyBankAccountIban(\'' + escapeHtmlAttr(b.iban) + '\', event)">' +
                        '<i class="fas fa-copy"></i></button></div>';
                }).join('');
        }

        function onTransferDeclaredChanged(ev) {
            const profile = readCheckoutFormToProfile();
            profile.transferDeclared = !!(ev.target && ev.target.checked);
            saveCheckoutProfile(profile);
            const statusEl = document.getElementById('cart-receipt-status');
            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            if (statusEl && profile.transferDeclared) {
                statusEl.hidden = false;
                statusEl.textContent = ui.cartTransferDeclaredOk || 'تم تسجيل تأكيد التحويل — أرفقي صورة الإيصال إن وُجد.';
            }
            renderCartCheckoutSteps();
        }

        function refreshCheckoutReceiptUi() {
            const p = getCheckoutProfile();
            const preview = document.getElementById('cart-receipt-preview');
            const statusEl = document.getElementById('cart-receipt-status');
            const paidEl = document.getElementById('cart-payment-declared');
            if (paidEl) paidEl.checked = !!p.transferDeclared;
            if (preview) {
                if (p.receiptDataUrl) {
                    preview.innerHTML = '<img src="' + escapeHtmlAttr(p.receiptDataUrl) + '" alt="">' +
                        '<button type="button" class="cart-receipt-remove-btn" onclick="clearCartTransferReceipt()">' +
                        '<i class="fas fa-times"></i></button>';
                    preview.hidden = false;
                } else {
                    preview.innerHTML = '';
                    preview.hidden = true;
                }
            }
            if (statusEl) {
                if (p.receiptDataUrl) {
                    statusEl.hidden = false;
                    statusEl.textContent = (siteText[currentLang || 'ar'] || siteText.ar).cartReceiptAttachedOk || '✓ تم رفع صورة الحوالة — ستُرسل مع الطلب للمبيعات.';
                } else {
                    statusEl.hidden = !p.transferDeclared;
                }
            }
        }

        function clearCartTransferReceipt() {
            const profile = getCheckoutProfile();
            profile.receiptDataUrl = '';
            profile.receiptFileName = '';
            saveCheckoutProfile(profile);
            const input = document.getElementById('cart-transfer-receipt');
            if (input) input.value = '';
            refreshCheckoutReceiptUi();
            updateTransferReceiptFab();
        }
        window.clearCartTransferReceipt = clearCartTransferReceipt;

        function onCartReceiptSelected(ev) {
            const file = ev.target && ev.target.files && ev.target.files[0];
            const preview = document.getElementById('cart-receipt-preview');
            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            if (!file) return;
            if (file.size > 2400000) {
                alert(ui.cartReceiptTooLarge || 'حجم الصورة كبير — استخدمي صورة أقل من 2 ميجابايت.');
                ev.target.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = function() {
                const dataUrl = reader.result;
                const profile = getCheckoutProfile();
                profile.receiptDataUrl = dataUrl;
                profile.receiptFileName = file.name;
                saveCheckoutProfile(profile);
                refreshCheckoutReceiptUi();
                updateTransferReceiptFab();
                renderCartCheckoutSteps();
                const statusEl = document.getElementById('cart-receipt-status');
                if (statusEl) {
                    statusEl.hidden = false;
                    statusEl.textContent = ui.cartReceiptAttachedOk || '✓ تم رفع صورة الحوالة — ستُرسل مع الطلب للمبيعات.';
                }
                setCartCheckoutStatus(ui.cartReceiptAttachedOk || 'تم رفع إيصال الحوالة بنجاح.', false);
            };
            reader.readAsDataURL(file);
        }

        function readCartPaymentFromForm() {
            const bankEl = document.querySelector('input[name="cart-payment-bank"]:checked');
            const paidEl = document.getElementById('cart-payment-declared');
            const profile = getCheckoutProfile();
            const payment = {
                bankId: bankEl ? bankEl.value : (profile.paymentBankId || ''),
                bankIban: '',
                bankNameAr: '',
                bankNameEn: '',
                transferDeclared: !!(paidEl && paidEl.checked),
                receiptDataUrl: profile.receiptDataUrl || '',
                receiptFileName: profile.receiptFileName || ''
            };
            ensureDefaultBankAccounts();
            const b = (systemSettings.bankAccounts || []).find(function(x) { return x && x.id === payment.bankId; });
            if (b) {
                payment.bankIban = b.iban || '';
                payment.bankNameAr = b.bankNameAr || '';
                payment.bankNameEn = b.bankNameEn || '';
            }
            profile.paymentBankId = payment.bankId;
            profile.transferDeclared = payment.transferDeclared;
            saveCheckoutProfile(profile);
            return payment;
        }

        function updateTransferReceiptFab() {
            const fab = document.getElementById('fab-send-transfer-receipt');
            if (!fab) return;
            const p = getCheckoutProfile();
            const show = nebrasCart.length > 0 && !!p.receiptDataUrl;
            fab.classList.toggle('show', show);
        }

        function validateCheckoutProfile(profile, ui) {
            const p = profile || readCheckoutFormToProfile();
            const errors = [];
            if (!String(p.customerName || '').trim()) {
                errors.push(ui.checkoutNameRequired || 'الاسم أو اسم الشركة مطلوب.');
            }
            const phone = String(p.phone || '').replace(/\s+/g, '');
            if (!phone || phone.length < 9) {
                errors.push(ui.checkoutPhoneRequired || 'رقم الجوال مطلوب (9 أرقام على الأقل).');
            }
            if (!String(p.address || '').trim()) {
                errors.push(ui.checkoutAddressRequired || 'العنوان / موقع التسليم مطلوب.');
            }
            return { ok: errors.length === 0, errors: errors, profile: p };
        }

        function validateCheckoutProfileForPreview(profile, ui) {
            const p = profile || readCheckoutFormToProfile();
            const errors = [];
            if (!String(p.customerName || '').trim()) {
                errors.push(ui.checkoutNameRequired || 'الاسم أو اسم الشركة مطلوب.');
            }
            const phone = String(p.phone || '').replace(/\s+/g, '');
            if (!phone || phone.length < 9) {
                errors.push(ui.checkoutPhoneRequired || 'رقم الجوال مطلوب (9 أرقام على الأقل).');
            }
            return { ok: errors.length === 0, errors: errors, profile: p };
        }

        function clearCheckoutFieldErrors() {
            ['checkout-customer-name', 'checkout-customer-phone', 'checkout-customer-address'].forEach(function(id) {
                const el = document.getElementById(id);
                if (el) el.classList.remove('checkout-field-error');
            });
        }

        function highlightCheckoutFieldErrors(profile, requireAddress) {
            clearCheckoutFieldErrors();
            const p = profile || readCheckoutFormToProfile();
            if (!String(p.customerName || '').trim()) {
                const el = document.getElementById('checkout-customer-name');
                if (el) el.classList.add('checkout-field-error');
            }
            const phone = String(p.phone || '').replace(/\s+/g, '');
            if (!phone || phone.length < 9) {
                const el = document.getElementById('checkout-customer-phone');
                if (el) el.classList.add('checkout-field-error');
            }
            if (requireAddress && !String(p.address || '').trim()) {
                const el = document.getElementById('checkout-customer-address');
                if (el) el.classList.add('checkout-field-error');
            }
        }

        function showCheckoutValidationErrors(errors, ui, requireAddress) {
            const profile = readCheckoutFormToProfile();
            openCartDrawer();
            highlightCheckoutFieldErrors(profile, !!requireAddress);
            const msg = (errors || []).join('\n');
            setCartCheckoutStatus(msg, true);
            const form = document.getElementById('cart-checkout-form');
            if (form) {
                setTimeout(function() {
                    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 120);
            }
            if (msg) alert(msg);
        }

        let quotePdfSubmitInFlight = false;

        function setQuoteActionLoading(isLoading, sendMode) {
            const ids = [
                'cart-send-sales-btn', 'cart-send-cs-btn', 'cart-request-quote-btn', 'cart-preview-quote-btn',
                'quote-send-sales-btn', 'quote-send-cs-btn', 'quote-send-pdf-both-btn',
                'fab-send-sales', 'fab-send-cs', 'top-quote-btn', 'header-quote-btn', 'workspace-quote-btn', 'mob-bar-quote'
            ];
            ids.forEach(function(id) {
                const el = document.getElementById(id);
                if (!el) return;
                el.classList.toggle('quote-action-loading', !!isLoading);
                if (isLoading && (id.indexOf('send') >= 0 || id === 'cart-request-quote-btn')) {
                    el.setAttribute('aria-busy', 'true');
                } else {
                    el.removeAttribute('aria-busy');
                }
            });
            const statusEl = document.getElementById('quote-send-status');
            if (statusEl) {
                const ui = siteText[currentLang || 'ar'] || siteText.ar;
                if (isLoading) {
                    statusEl.hidden = false;
                    statusEl.textContent = ui.sendQuoteA4Preparing || 'جاري تجهيز PDF A4…';
                } else {
                    statusEl.hidden = true;
                    statusEl.textContent = '';
                }
            }
        }

        function bindQuoteCommerceButton(el, handler) {
            if (!el || el.getAttribute('data-nebras-quote-bound') === '1') return;
            el.setAttribute('data-nebras-quote-bound', '1');
            el.removeAttribute('onclick');
            el.addEventListener('click', function(event) {
                event.preventDefault();
                handler(event);
            });
        }

        function initQuoteCommerceHandlers() {
            bindQuoteCommerceButton(document.getElementById('cart-send-sales-btn'), function() {
                submitQuoteA4Pdf('sales');
            });
            bindQuoteCommerceButton(document.getElementById('cart-send-cs-btn'), function() {
                submitQuoteA4Pdf('customer-service');
            });
            bindQuoteCommerceButton(document.getElementById('cart-request-quote-btn'), function() {
                submitQuoteA4Pdf('both');
            });
            bindQuoteCommerceButton(document.getElementById('cart-preview-quote-btn'), function() {
                confirmAndOpenQuote();
            });
            bindQuoteCommerceButton(document.getElementById('quote-send-sales-btn'), function() {
                submitQuoteA4Pdf('sales');
            });
            bindQuoteCommerceButton(document.getElementById('quote-send-cs-btn'), function() {
                submitQuoteA4Pdf('customer-service');
            });
            bindQuoteCommerceButton(document.getElementById('quote-send-pdf-both-btn'), function() {
                submitQuoteA4Pdf('both');
            });
            bindQuoteCommerceButton(document.getElementById('fab-send-sales'), function() {
                submitQuoteA4Pdf('sales');
            });
            bindQuoteCommerceButton(document.getElementById('fab-send-cs'), function() {
                submitQuoteA4Pdf('customer-service');
            });
            ['top-quote-btn', 'header-quote-btn', 'workspace-quote-btn', 'mob-bar-quote'].forEach(function(id) {
                bindQuoteCommerceButton(document.getElementById(id), function() {
                    confirmAndOpenQuote();
                });
            });
        }

        function setCartCheckoutStatus(message, isError) {
            const el = document.getElementById('cart-checkout-status');
            if (!el) return;
            el.textContent = message || '';
            el.style.color = isError ? '#b45309' : '#059669';
        }

        function updateCartSessionHint() {
            const hint = document.getElementById('cart-session-hint');
            if (!hint) return;
            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            const sid = getVisitorSessionId();
            const shortId = sid.slice(-8).toUpperCase();
            hint.hidden = false;
            hint.innerHTML = '<i class="fas fa-lock"></i> ' + escapeHtmlAttr(ui.cartSessionHint || 'سلتك وبياناتك خاصة بهذه الجلسة فقط — لا يراها زوار آخرون.') +
                ' <code dir="ltr">' + escapeHtmlAttr(shortId) + '</code>';
        }

        function getCartCheckoutActiveStep() {
            if (!nebrasCart.length) return 0;
            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            const profile = readCheckoutFormToProfile();
            const payment = getCheckoutProfile();
            if (payment.receiptDataUrl || payment.transferDeclared) return 4;
            if (currentQuoteIssue && currentQuoteIssue.quoteNo) return 4;
            const validation = validateCheckoutProfile(profile, ui);
            if (validation.ok) return 3;
            if (profile.customerName || profile.phone) return 2;
            return 1;
        }

        function renderCartCheckoutSteps() {
            const el = document.getElementById('cart-checkout-steps');
            if (!el) return;
            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            const steps = [
                ui.checkoutStepCart || 'مراجعة السلة',
                ui.checkoutStepProfile || 'بيانات العميل',
                ui.checkoutStepQuote || 'عرض السعر',
                ui.checkoutStepPay || 'حوالة وإرسال للمبيعات'
            ];
            const active = getCartCheckoutActiveStep();
            el.innerHTML = steps.map(function(label, i) {
                const stepNum = i + 1;
                let cls = '';
                if (active === stepNum) cls = ' is-active';
                else if (active > stepNum) cls = ' is-done';
                return '<li class="' + cls.trim() + '"><span class="cart-step-num">' + stepNum + '</span><span class="cart-step-label">' + escapeHtmlAttr(label) + '</span></li>';
            }).join('');
        }

        function updateCartBadge() {
            const count = nebrasCart.reduce(function(sum, line) { return sum + (Number(line.qty) || 1); }, 0);
            ['cart-badge-count', 'top-cart-count'].forEach(function(id) {
                const el = document.getElementById(id);
                if (!el) return;
                if (count > 0) {
                    el.hidden = false;
                    el.textContent = String(count);
                } else {
                    el.hidden = true;
                    el.textContent = '0';
                }
            });
            const mobCount = document.getElementById('mob-cart-count');
            if (mobCount) {
                if (count > 0) {
                    mobCount.hidden = false;
                    mobCount.classList.add('show');
                    mobCount.textContent = String(count);
                } else {
                    mobCount.hidden = true;
                    mobCount.classList.remove('show');
                    mobCount.textContent = '0';
                }
            }
            const quoteBtn = document.getElementById('top-quote-btn');
            if (quoteBtn) quoteBtn.disabled = count === 0;
            const mobQuote = document.getElementById('mob-bar-quote');
            if (mobQuote) mobQuote.disabled = count === 0;
        }

        function getCompanyLegalHtml(lang) {
            const isEn = lang === 'en';
            const cr = String(systemSettings.commercialRegister || '').trim();
            const tax = String(systemSettings.taxNumber || '').trim();
            const addr = isEn
                ? (systemSettings.companyAddressEn || systemSettings.companyAddressAr || '')
                : (systemSettings.companyAddressAr || systemSettings.companyAddressEn || '');
            const salesPhone = String(systemSettings.mainSalesPhone || '').trim();
            const publicEmail = String(systemSettings.recoveryEmail || PRIMARY_RECOVERY_EMAIL || '').trim();
            const parts = [];
            if (cr) parts.push('<span><strong>' + (isEn ? 'CR: ' : 'سجل تجاري: ') + '</strong>' + escapeHtmlAttr(cr) + '</span>');
            if (tax) parts.push('<span><strong>' + (isEn ? 'VAT: ' : 'الرقم الضريبي: ') + '</strong>' + escapeHtmlAttr(tax) + '</span>');
            if (addr) parts.push('<span><strong>' + (isEn ? 'Address: ' : 'العنوان: ') + '</strong>' + escapeHtmlAttr(addr) + '</span>');
            if (salesPhone) parts.push('<span><strong>' + (isEn ? 'Sales: ' : 'المبيعات: ') + '</strong><span dir="ltr">' + escapeHtmlAttr(salesPhone) + '</span></span>');
            if (publicEmail) parts.push('<span><strong>' + (isEn ? 'Email: ' : 'البريد: ') + '</strong><a href="mailto:' + escapeHtmlAttr(publicEmail) + '" dir="ltr">' + escapeHtmlAttr(publicEmail) + '</a></span>');
            return parts.join('');
        }

        function updateOfficialOrganizationSchema() {
            const el = document.getElementById('nebras-org-schema');
            if (!el) return;
            const siteUrl = sanitizeExternalUrl(systemSettings.publicSiteUrl || NEBRAS_PUBLIC_SITE_URL) || NEBRAS_PUBLIC_SITE_URL;
            const schema = {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'شركة مصنع نبراس للبلاستيك',
                alternateName: 'Nebras Plastic Factory',
                url: siteUrl,
                logo: siteUrl.replace(/\/$/, '') + '/images/logo.png',
                telephone: String(systemSettings.mainSalesPhone || '').trim() || undefined,
                email: String(systemSettings.recoveryEmail || PRIMARY_RECOVERY_EMAIL || '').trim() || undefined,
                taxID: String(systemSettings.taxNumber || '').trim() || undefined,
                address: {
                    '@type': 'PostalAddress',
                    streetAddress: String(systemSettings.companyAddressAr || '').trim() || undefined,
                    addressLocality: 'عنيزة',
                    addressRegion: 'القصيم',
                    addressCountry: 'SA'
                }
            };
            if (!schema.telephone) delete schema.telephone;
            if (!schema.email) delete schema.email;
            if (!schema.taxID) delete schema.taxID;
            if (!schema.address.streetAddress) delete schema.address;
            try { el.textContent = JSON.stringify(schema); } catch (schemaErr) { /* ignore */ }
        }

        function renderCompanyLegalBars() {
            const lang = currentLang || 'ar';
            const html = getCompanyLegalHtml(lang);
            ['public-legal-bar', 'footer-legal-bar'].forEach(function(id) {
                const el = document.getElementById(id);
                if (el) {
                    el.innerHTML = html;
                    el.style.display = html ? '' : 'none';
                }
            });
            const grid = document.getElementById('dashboard-legal-grid');
            if (grid) {
                const isEn = lang === 'en';
                const rows = [
                    { label: isEn ? 'Commercial register' : 'السجل التجاري', value: systemSettings.commercialRegister },
                    { label: isEn ? 'Tax number' : 'الرقم الضريبي', value: systemSettings.taxNumber },
                    { label: isEn ? 'Address' : 'العنوان', value: isEn ? systemSettings.companyAddressEn : systemSettings.companyAddressAr },
                    { label: isEn ? 'Sales' : 'المبيعات', value: systemSettings.mainSalesPhone },
                    { label: isEn ? 'Customer service' : 'خدمة العملاء', value: systemSettings.customerServicePhone },
                    { label: isEn ? 'Official email' : 'البريد الرسمي', value: systemSettings.recoveryEmail || PRIMARY_RECOVERY_EMAIL }
                ];
                grid.innerHTML = rows.map(function(r) {
                    return '<div><strong>' + escapeHtmlAttr(r.label) + '</strong><br>' + escapeHtmlAttr(r.value || '—') + '</div>';
                }).join('');
            }
        }

        function ensureDefaultBankAccounts() {
            if (!Array.isArray(systemSettings.bankAccounts)) systemSettings.bankAccounts = [];
            const list = systemSettings.bankAccounts;
            if (!list.length) {
                systemSettings.bankAccounts = DEFAULT_BANK_ACCOUNTS.map(function(b) { return Object.assign({}, b); });
                return;
            }
            list.forEach(function(b) {
                if (!b) return;
                const trimmed = String(b.iban || '').trim().toUpperCase();
                if (LEGACY_FACTORY_IBAN_FIXES[trimmed]) b.iban = LEGACY_FACTORY_IBAN_FIXES[trimmed];
            });
            const byId = {};
            list.forEach(function(b) {
                if (b && b.id) byId[b.id] = b;
            });
            DEFAULT_BANK_ACCOUNTS.forEach(function(def) {
                const cur = byId[def.id];
                if (!cur) {
                    list.push(Object.assign({}, def));
                    return;
                }
                if (def.imageUrl) cur.imageUrl = def.imageUrl;
                if (FACTORY_BANK_IBANS[def.id]) cur.iban = FACTORY_BANK_IBANS[def.id];
                else if (!String(cur.iban || '').trim()) cur.iban = def.iban;
                if (!String(cur.bankNameAr || '').trim()) cur.bankNameAr = def.bankNameAr;
                if (!String(cur.bankNameEn || '').trim()) cur.bankNameEn = def.bankNameEn;
                if (def.sortOrder != null) cur.sortOrder = def.sortOrder;
            });
            list.sort(function(a, b) { return (a.sortOrder || 99) - (b.sortOrder || 99); });
        }

        function copyBankAccountIban(iban, ev) {
            if (ev) {
                ev.preventDefault();
                ev.stopPropagation();
            }
            const text = String(iban || '').trim();
            if (!text) return;
            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            const done = function() {
                alert(ui.bankIbanCopied || 'تم نسخ رقم الآيبان');
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(done).catch(function() {
                    window.prompt(ui.bankIbanCopyPrompt || 'انسخ رقم الآيبان:', text);
                });
            } else {
                window.prompt(ui.bankIbanCopyPrompt || 'انسخ رقم الآيبان:', text);
            }
        }

        function renderBankAccountCardMarkup(b, idx, lang) {
            const name = lang === 'en' ? (b.bankNameEn || b.bankNameAr) : (b.bankNameAr || b.bankNameEn);
            const imgCandidates = b.imageUrl ? bankAccountImageCandidates(b.imageUrl).map(withBankMediaVersion) : [];
            const imgPath = imgCandidates.length ? imgCandidates[0] : '';
            const img = imgPath
                ? '<img class="bank-plaque-img" data-bank-media="1" data-bank-candidates="' + escapeHtmlAttr(imgCandidates.join('|')) + '" src="' + escapeHtmlAttr(imgPath) + '" alt="' + escapeHtmlAttr(name || '') + '" loading="lazy" decoding="async">'
                : '<i class="fas fa-university bank-plaque-fallback" aria-hidden="true"></i>';
            const ibanLine = b.iban
                ? '<p class="bank-card-iban"><span>IBAN:</span> <code dir="ltr">' + escapeHtmlAttr(b.iban) + '</code></p>'
                : '';
            const copyBtn = b.iban
                ? '<button type="button" class="bank-card-copy-btn" onclick="copyBankAccountIban(\'' + escapeHtmlAttr(b.iban) + '\', event)"><i class="fas fa-copy"></i> ' + escapeHtmlAttr((siteText[lang] || siteText.ar).bankIbanCopyBtn || 'نسخ الآيبان') + '</button>'
                : '';
            const click = imgPath
                ? ' bank-card--clickable" role="button" tabindex="0" onclick="openBankAccountCard(' + idx + ')" onkeydown="if(event.key===\'Enter\')openBankAccountCard(' + idx + ')"'
                : '"';
            return '<article class="bank-card bank-card--visual' + click + '>' + img + ibanLine + copyBtn + '</article>';
        }

        /** الحسابات البنكية — داخل أيقونة الزائر فقط (ليست في واجهة الموقع العامة) */
        function renderBankAccountsPublic() {
            ensureDefaultBankAccounts();
        }

        function hydrateBankAccountMedia(root) {
            const scope = root && root.querySelectorAll ? root : document;
            scope.querySelectorAll('[data-bank-media="1"]').forEach(function(node) {
                const raw = node.getAttribute('data-bank-candidates') || '';
                const candidates = raw.split('|').filter(Boolean);
                if (!candidates.length) return;
                const target = node.tagName === 'IMG' ? node : node.querySelector('img.bank-accounts-wall-img') || node;
                attachBankMediaFallback(target, candidates, 0);
            });
            scope.querySelectorAll('img.bank-plaque-img[data-bank-candidates]').forEach(function(img) {
                const candidates = String(img.getAttribute('data-bank-candidates') || '').split('|').filter(Boolean);
                if (candidates.length) attachBankMediaFallback(img, candidates, 0);
            });
        }

        function openBankAccountCard(index) {
            const accounts = (systemSettings.bankAccounts || []).filter(function(b) { return b && b.visible !== false; });
            if (!accounts[index]) return;
            openVisitorIcon(4);
        }

        function scrollToDashboardSection(elementId) {
            const el = document.getElementById(elementId);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function openProductShop(productId) {
            const product = siteProducts.find(function(p) { return p.id === productId; });
            const modal = document.getElementById('product-shop-modal');
            const overlay = document.getElementById('product-shop-overlay');
            if (!product || !modal || !overlay) return;
            const lang = currentLang || 'ar';
            const isEn = lang === 'en';
            const title = getLocalizedCatalogField(product, 'title', lang);
            const desc = getLocalizedCatalogField(product, 'text', lang);
            const variants = (product.variants && product.variants.length) ? product.variants : [{ id: 'default', image: (product.album || [])[0] || '', colorAr: '—', colorEn: '—', sizeAr: '—', sizeEn: '—', typeAr: '—', typeEn: '—', price: 0 }];
            const options = variants.map(function(v, idx) {
                const color = isEn ? (v.colorEn || v.colorAr) : (v.colorAr || v.colorEn);
                const size = isEn ? (v.sizeEn || v.sizeAr) : (v.sizeAr || v.sizeEn);
                const type = isEn ? (v.typeEn || v.typeAr) : (v.typeAr || v.typeEn);
                const priceLabel = Number(v.price) > 0 ? formatSar(v.price) : (isEn ? 'Price on request' : 'السعر عند الطلب');
                return '<option value="' + idx + '">' + escapeHtmlAttr([color, size, type, priceLabel].filter(Boolean).join(' · ')) + '</option>';
            }).join('');
            const heroImg = normalizeMediaPath((variants[0] && variants[0].image) || (product.album || [])[0] || '');
            modal.innerHTML =
                (heroImg ? '<img class="shop-hero" id="shop-hero-img" src="' + escapeHtmlAttr(heroImg) + '" alt="">' : '') +
                '<h3>' + escapeHtmlAttr(title) + '</h3><p style="opacity:0.9;margin-bottom:12px;">' + escapeHtmlAttr(desc) + '</p>' +
                '<label>' + (isEn ? 'Choose variant' : 'اختر المقاس / اللون / النوع') + '</label>' +
                '<select id="shop-variant-select" onchange="syncShopHeroImage()">' + options + '</select>' +
                '<label>' + (isEn ? 'Quantity' : 'الكمية') + '</label><input type="number" id="shop-qty-input" min="1" value="1">' +
                '<p id="shop-line-price" style="font-weight:700;margin:12px 0;"></p>' +
                '<button type="button" class="primary" onclick="addSelectedVariantToCart(\'' + String(product.id).replace(/'/g, "\\'") + '\')">' + (isEn ? 'Add to cart' : 'أضف إلى السلة') + '</button>' +
                '<button type="button" class="secondary" onclick="closeProductShop()" style="margin-top:8px;">' + (isEn ? 'Close' : 'إغلاق') + '</button>';
            modal.setAttribute('data-shop-product-id', productId);
            overlay.classList.add('show');
            syncShopHeroImage();
            updateShopLinePrice(productId);
            const sel = document.getElementById('shop-variant-select');
            const qtyInput = document.getElementById('shop-qty-input');
            if (sel) {
                sel.onchange = function() { syncShopHeroImage(); updateShopLinePrice(productId); };
            }
            if (qtyInput) {
                qtyInput.oninput = function() { updateShopLinePrice(productId); };
            }
        }

        function syncShopHeroImage() {
            const sel = document.getElementById('shop-variant-select');
            const hero = document.getElementById('shop-hero-img');
            const modal = document.getElementById('product-shop-modal');
            if (!sel || !hero || !modal) return;
            const productId = modal.getAttribute('data-shop-product-id');
            const product = siteProducts.find(function(p) { return p.id === productId; });
            if (!product) return;
            const v = (product.variants || [])[parseInt(sel.value, 10)];
            if (v && v.image) hero.src = normalizeMediaPath(v.image);
        }

        function updateShopLinePrice(productId) {
            const product = siteProducts.find(function(p) { return p.id === productId; });
            const sel = document.getElementById('shop-variant-select');
            const priceEl = document.getElementById('shop-line-price');
            if (!product || !sel || !priceEl) return;
            const v = (product.variants || [])[parseInt(sel.value, 10)];
            const price = v ? Number(v.price) : 0;
            const qty = parseInt(document.getElementById('shop-qty-input') && document.getElementById('shop-qty-input').value, 10) || 1;
            const lang = currentLang || 'ar';
            const ui = siteText[lang] || siteText.ar;
            const pct = getNebrasVatPercentLabel();
            if (price > 0) {
                const exLine = price * qty;
                const incLine = priceIncVat(exLine);
                priceEl.innerHTML = (lang === 'en' ? 'Line (ex VAT): ' : 'السطر قبل الضريبة: ') + formatSar(exLine) +
                    '<br><span style="font-weight:700">' + (lang === 'en' ? 'Line (inc ' + pct + '% VAT): ' : 'السطر شامل الضريبة ' + pct + '%: ') +
                    formatSar(incLine) + '</span>';
            } else {
                priceEl.textContent = lang === 'en' ? 'Price on request — added to quote' : 'السعر عند الطلب — يُضاف لعرض السعر';
            }
        }

        function notifyCartAdded(lineSummary) {
            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            let toast = document.getElementById('cart-added-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'cart-added-toast';
                toast.className = 'cart-added-toast';
                toast.setAttribute('role', 'status');
                toast.setAttribute('aria-live', 'polite');
                document.body.appendChild(toast);
            }
            const msg = (ui.cartAddedOk || 'تمت إضافة المنتج إلى سلتك الخاصة.');
            toast.textContent = lineSummary ? msg + ' — ' + lineSummary : msg;
            toast.classList.add('show');
            if (notifyCartAdded._timer) clearTimeout(notifyCartAdded._timer);
            notifyCartAdded._timer = setTimeout(function() {
                toast.classList.remove('show');
            }, 3200);
        }

        function addVariantIndexToCart(productId, variantIndex, qty) {
            const product = siteProducts.find(function(p) { return p.id === productId; });
            if (!product) return;
            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            if (!productHasShop(product)) {
                alert(ui.cartProductNotShop || 'هذا المنتج للعرض والتصفح فقط — اختر منتجاً يحمل أيقونة السلة (+).');
                return;
            }
            const variant = (product.variants || [])[variantIndex];
            if (!variant) {
                openProductShop(productId);
                return;
            }
            const quantity = Math.max(1, parseInt(qty, 10) || 1);
            const lang = currentLang || 'ar';
            const lineId = productId + '-' + (variant.id || variantIndex);
            const existing = nebrasCart.find(function(l) { return l.lineId === lineId; });
            const unitPriceEx = Number(variant.price) || 0;
            const payload = {
                lineId: lineId,
                productId: productId,
                variantId: variant.id || String(variantIndex),
                productTitle: getLocalizedCatalogField(product, 'title', lang),
                color: lang === 'en' ? (variant.colorEn || variant.colorAr) : (variant.colorAr || variant.colorEn),
                size: lang === 'en' ? (variant.sizeEn || variant.sizeAr) : (variant.sizeAr || variant.sizeEn),
                type: lang === 'en' ? (variant.typeEn || variant.typeAr) : (variant.typeAr || variant.typeEn),
                image: normalizeMediaPath(variant.image || (product.album || [])[0] || ''),
                sku: variant.sku || '',
                unitPrice: unitPriceEx,
                unitPriceExVat: unitPriceEx,
                vatRate: getNebrasVatRate(),
                qty: quantity
            };
            if (existing) {
                existing.qty += quantity;
            } else {
                nebrasCart.push(payload);
            }
            saveNebrasCart();
            const lineLabel = [payload.type, payload.size, payload.color].filter(Boolean).join(' · ');
            notifyCartAdded(lineLabel || payload.productTitle);
            closeProductShop();
            closeIconOverlay();
            openCartDrawer();
        }

        function addSelectedVariantToCart(productId) {
            const sel = document.getElementById('shop-variant-select');
            const qtyInput = document.getElementById('shop-qty-input');
            if (!sel) return;
            const idx = parseInt(sel.value, 10);
            const qty = Math.max(1, parseInt(qtyInput && qtyInput.value, 10) || 1);
            addVariantIndexToCart(productId, idx, qty);
        }

        function changeCartLineQty(index, delta) {
            const line = nebrasCart[index];
            if (!line) return;
            line.qty = Math.max(1, (Number(line.qty) || 1) + delta);
            saveNebrasCart();
            openCartDrawer();
        }

        function openCartDrawer() {
            const overlay = document.getElementById('cart-drawer-overlay');
            const linesEl = document.getElementById('cart-drawer-lines');
            const totalEl = document.getElementById('cart-total-row');
            if (!overlay || !linesEl) return;
            const lang = currentLang || 'ar';
            const ui = siteText[lang] || siteText.ar;
            if (!nebrasCart.length) {
                linesEl.innerHTML = '<p>' + escapeHtmlAttr(ui.cartEmpty || '') + '</p>';
            } else {
                linesEl.innerHTML = nebrasCart.map(function(line, i) {
                    const img = line.image ? '<img src="' + escapeHtmlAttr(line.image) + '" alt="">' : '';
                    return '<div class="cart-line">' + img +
                        '<div class="cart-line-details"><strong>' + escapeHtmlAttr(line.productTitle) + '</strong><br>' +
                        escapeHtmlAttr([line.color, line.size, line.type].filter(Boolean).join(' · ')) +
                        '<div class="cart-line-qty"><button type="button" onclick="changeCartLineQty(' + i + ',-1)" aria-label="-">−</button><span>' +
                        escapeHtmlAttr(ui.cartQty || '') + line.qty + '</span><button type="button" onclick="changeCartLineQty(' + i + ',1)" aria-label="+">+</button></div>' +
                        '<button type="button" style="margin-top:6px;font-size:0.8rem;" onclick="removeCartLine(' + i + ')">' + escapeHtmlAttr(ui.cartRemove || '') + '</button></div>' +
                        formatCartLinePriceHtml(line, lang) + '</div>';
                }).join('');
            }
            const totals = calcCartTotals();
            const subEl = document.getElementById('cart-subtotal-ex-row');
            const vatEl = document.getElementById('cart-vat-row');
            const incEl = document.getElementById('cart-total-inc-row');
            const onRequest = lang === 'en' ? 'On request' : (lang === 'zh' ? '询价' : 'عند الطلب');
            const pct = getNebrasVatPercentLabel();
            if (subEl) {
                subEl.hidden = totals.subtotalEx <= 0;
                subEl.textContent = (ui.cartProductsSubtotalEx || 'مجموع المنتجات قبل الضريبة: ') + (totals.subtotalEx > 0 ? formatSar(totals.subtotalEx) : onRequest);
            }
            if (vatEl) {
                vatEl.hidden = totals.subtotalEx <= 0;
                vatEl.textContent = (ui.cartVatRow || 'مجموع ضريبة المنتجات ({pct}%): ').replace('{pct}', String(pct)) +
                    (totals.vatAmount > 0 ? formatSar(totals.vatAmount) : onRequest);
            }
            if (incEl) {
                incEl.hidden = totals.subtotalEx <= 0;
                incEl.textContent = (ui.cartProductsTotalInc || 'إجمالي المنتجات شامل الضريبة: ') + (totals.totalInc > 0 ? formatSar(totals.totalInc) : onRequest);
            }
            if (totalEl) {
                totalEl.hidden = totals.subtotalEx > 0;
                totalEl.textContent = (ui.cartTotal || 'المجموع: ') + (totals.subtotalEx > 0 ? formatSar(totals.subtotalEx) : onRequest);
            }
            fillCheckoutFormFromProfile();
            renderCheckoutBankQuickList();
            refreshCheckoutReceiptUi();
            updateCartSessionHint();
            renderCartCheckoutSteps();
            setCartCheckoutStatus('', false);
            const payMount = document.getElementById('cart-payment-mount');
            if (payMount) payMount.innerHTML = nebrasCart.length ? buildCartBankPaymentHtml(lang) : '';
            applyStaticUiTranslations(ui);
            renderCartOrderPreview();
            overlay.classList.add('show');
            updateCartBadge();
            updateSalesQuoteFab();
            updateTransferReceiptFab();
        }

        function closeCartDrawer() {
            const overlay = document.getElementById('cart-drawer-overlay');
            if (overlay) overlay.classList.remove('show');
        }

        function closeProductShop() {
            const overlay = document.getElementById('product-shop-overlay');
            if (overlay) overlay.classList.remove('show');
        }

        function removeCartLine(index) {
            nebrasCart.splice(index, 1);
            saveNebrasCart();
            openCartDrawer();
            updateSalesQuoteFab();
        }

        function loadSalesQuotesInbox() {
            try {
                const raw = localStorage.getItem(SALES_QUOTES_INBOX_KEY);
                const list = raw ? JSON.parse(raw) : [];
                return Array.isArray(list) ? list : [];
            } catch (e) {
                return [];
            }
        }

        function saveSalesQuotesInbox(list) {
            try {
                localStorage.setItem(SALES_QUOTES_INBOX_KEY, JSON.stringify(list || []));
            } catch (storageErr) {
                console.warn('Sales inbox save failed (quota?):', storageErr);
                try {
                    const slim = (list || []).map(function(e) {
                        if (!e || !e.transferReceiptDataUrl || !String(e.transferReceiptDataUrl).startsWith('data:')) return e;
                        const copy = Object.assign({}, e);
                        copy.transferReceiptDataUrl = '';
                        copy.transferReceiptLocalOnly = true;
                        return copy;
                    });
                    localStorage.setItem(SALES_QUOTES_INBOX_KEY, JSON.stringify(slim));
                } catch (e2) {
                    alert('تعذّر حفظ الطلب محلياً — حجم البيانات كبير. حاولي بدون صورة كبيرة أو تواصلي مع الإدارة.');
                    throw e2;
                }
            }
            schedulePushToNebrasCloud();
            updateSalesInboxBadge();
        }

        function saveSalesQuotesInboxLocalOnly(list) {
            try {
                localStorage.setItem(SALES_QUOTES_INBOX_KEY, JSON.stringify(list || []));
            } catch (e) { /* ignore */ }
            updateSalesInboxBadge();
        }

        function isMainGovernanceAdmin(user) {
            const u = user || currentAdmin;
            if (!u) return false;
            if (u.isPrimary === true) return true;
            if (PRIMARY_GOVERNANCE_ADMIN_IDS.indexOf(u.id) >= 0) return true;
            return PRIMARY_GOVERNANCE_USERNAMES.indexOf(String(u.username || '').toUpperCase()) >= 0;
        }

        function requireMainGovernanceAdmin(message) {
            if (!isMainGovernanceAdmin()) {
                alert(message || 'هذا الإجراء متاح للإدارة الرئيسية فقط — Super Admin الأساسي.');
                return false;
            }
            return true;
        }

        function ensureAnalyticsGovernance() {
            if (!analyticsGovernance || typeof analyticsGovernance !== 'object') {
                analyticsGovernance = { deleted: { quotes: [], visitors: [], complaints: [], sales: [] } };
            }
            if (!analyticsGovernance.deleted || typeof analyticsGovernance.deleted !== 'object') {
                analyticsGovernance.deleted = { quotes: [], visitors: [], complaints: [], sales: [], customers: [] };
            }
            ['quotes', 'visitors', 'complaints', 'sales', 'customers'].forEach(function(k) {
                if (!Array.isArray(analyticsGovernance.deleted[k])) analyticsGovernance.deleted[k] = [];
            });
        }

        function wrapAnalyticsTableHtml(tableHtml) {
            if (!tableHtml || tableHtml.indexOf('<table') === -1) return tableHtml;
            return '<div class="analytics-table-scroll" tabindex="0">' + tableHtml + '</div>';
        }

        function buildAnalyticsPanelActionsHtml(category, clearFn, clearLabel) {
            if (!isMainGovernanceAdmin()) return '';
            return '<div class="analytics-panel-actions admin-only-ui">' +
                '<button type="button" class="analytics-clear-btn" onclick="' + clearFn + '()">' +
                '<i class="fas fa-eraser"></i> ' + escapeHtmlAttr(clearLabel) + '</button></div>';
        }

        function buildAnalyticsGovernanceToolbarHtml() {
            if (!isMainGovernanceAdmin()) return '';
            return '<div class="analytics-governance-toolbar admin-only-ui" id="analytics-governance-toolbar">' +
                '<p class="analytics-governance-title"><i class="fas fa-shield-halved"></i> حوكمة التقارير — Super Admin الرئيسي فقط</p>' +
                '<div class="analytics-governance-btns">' +
                '<button type="button" class="analytics-clear-btn" onclick="clearAllAnalyticsQuotes()"><i class="fas fa-file-invoice"></i> إفراغ عروض الأسعار</button>' +
                '<button type="button" class="analytics-clear-btn" onclick="clearAllAnalyticsTransfers()"><i class="fas fa-receipt"></i> إفراغ الحوالات</button>' +
                '<button type="button" class="analytics-clear-btn" onclick="clearAllAnalyticsCustomers()"><i class="fas fa-users"></i> إفراغ تقرير العملاء</button>' +
                '<button type="button" class="analytics-clear-btn" onclick="clearAllAnalyticsVisitors()"><i class="fas fa-eye"></i> إفراغ الزوار</button>' +
                '<button type="button" class="analytics-clear-btn" onclick="clearAllAnalyticsComplaints()"><i class="fas fa-exclamation-circle"></i> إفراغ الشكاوى</button>' +
                '<button type="button" class="analytics-restore-btn analytics-restore-btn--all" onclick="restoreAllAnalyticsRecords()"><i class="fas fa-trash-restore"></i> Restore الكل</button>' +
                '<button type="button" class="analytics-delete-btn analytics-delete-btn--bin" onclick="emptyAnalyticsRestoreBin()"><i class="fas fa-trash"></i> إفراغ سلة الاستعادة</button>' +
                '</div></div>';
        }

        function clearAllAnalyticsQuotes() {
            if (!requireMainGovernanceAdmin()) return;
            const inbox = loadSalesQuotesInbox();
            if (!inbox.length) { alert('لا عروض أسعار لإفراغها.'); return; }
            if (!confirm('إفراغ كل عروض الأسعار من التقارير؟ (تُحفظ في سلة الاستعادة)')) return;
            inbox.forEach(function(entry) {
                archiveAnalyticsRecord('quotes', entry.id || entry.quoteNo, entry, entry.quoteNo || entry.customerName);
            });
            saveSalesQuotesInbox([]);
            displaySalesQuotesInbox();
            renderAdminAnalyticsPanel();
        }

        function clearAllAnalyticsTransfers() {
            if (!requireMainGovernanceAdmin()) return;
            const inbox = loadSalesQuotesInbox();
            const transferEntries = inbox.filter(function(e) {
                return e && (e.transferReceiptDataUrl || e.transferDeclared);
            });
            if (!transferEntries.length) { alert('لا حوالات لإفراغها.'); return; }
            if (!confirm('إفراغ تقرير الحوالات (' + transferEntries.length + ')؟ تُحذف الطلبات المرتبطة من التقارير.')) return;
            transferEntries.forEach(function(entry) {
                archiveAnalyticsRecord('quotes', entry.id || entry.quoteNo, entry, 'حوالة: ' + (entry.quoteNo || entry.customerName));
            });
            const remaining = inbox.filter(function(e) {
                return !e || (!e.transferReceiptDataUrl && !e.transferDeclared);
            });
            saveSalesQuotesInbox(remaining);
            displaySalesQuotesInbox();
            renderAdminAnalyticsPanel();
        }

        function clearAllAnalyticsCustomers() {
            if (!requireMainGovernanceAdmin()) return;
            const inbox = loadSalesQuotesInbox();
            if (!inbox.length && !(salesData || []).length) { alert('لا بيانات عملاء لإفراغها.'); return; }
            if (!confirm('إفراغ تقرير العملاء؟ تُحذف كل عروض الأسعار والمبيعات المرتبطة (مع الاستعادة لاحقاً).')) return;
            inbox.forEach(function(entry) {
                archiveAnalyticsRecord('quotes', entry.id || entry.quoteNo, entry, entry.customerName || entry.quoteNo);
            });
            (salesData || []).slice().forEach(function(s) {
                archiveAnalyticsRecord('sales', s.id || s.quoteNo, s, s.customerName || s.product);
            });
            saveSalesQuotesInbox([]);
            salesData = [];
            saveSystemData();
            displaySales();
            renderAdminAnalyticsPanel();
        }

        function clearAllAnalyticsVisitors() {
            if (!requireMainGovernanceAdmin()) return;
            ensureVisitorAnalytics();
            const sessions = visitorAnalytics.sessions || [];
            if (!sessions.length) { alert('لا زوار لإفراغهم.'); return; }
            if (!confirm('إفراغ تقرير زوار الموقع؟')) return;
            sessions.forEach(function(s) {
                archiveAnalyticsRecord('visitors', s.id, s, s.id.slice(-8));
            });
            visitorAnalytics.sessions = [];
            saveVisitorAnalyticsLocal();
            renderAdminAnalyticsPanel();
        }

        function clearAllAnalyticsComplaints() {
            if (!requireMainGovernanceAdmin()) return;
            const keys = Object.keys(complaints || {});
            if (!keys.length) { alert('لا شكاوى لإفراغها.'); return; }
            if (!confirm('إفراغ كل الشكاوى من التقرير؟')) return;
            keys.forEach(function(id) {
                const c = complaints[id];
                archiveAnalyticsRecord('complaints', id, c, c && c.customerName ? c.customerName : id);
                delete complaints[id];
            });
            saveSystemData();
            renderAdminAnalyticsPanel();
        }

        function emptyAnalyticsRestoreBin() {
            if (!requireMainGovernanceAdmin()) return;
            ensureAnalyticsGovernance();
            const total = ['quotes', 'visitors', 'complaints', 'sales', 'customers'].reduce(function(n, k) {
                return n + (analyticsGovernance.deleted[k] || []).length;
            }, 0);
            if (!total) { alert('سلة الاستعادة فارغة.'); return; }
            if (!confirm('حذف نهائي لـ ' + total + ' عنصر من سلة الاستعادة؟ لا يمكن التراجع.')) return;
            analyticsGovernance.deleted = { quotes: [], visitors: [], complaints: [], sales: [], customers: [] };
            saveSystemData();
            addAuditLog('إفراغ سلة الاستعادة', String(total) + ' عنصر');
            renderAdminAnalyticsPanel();
        }

        function restoreAllAnalyticsRecords() {
            if (!requireMainGovernanceAdmin()) return;
            ensureAnalyticsGovernance();
            const cats = ['quotes', 'visitors', 'complaints', 'sales', 'customers'];
            let restored = 0;
            cats.forEach(function(cat) {
                const keys = (analyticsGovernance.deleted[cat] || []).map(function(r) { return r.key; });
                keys.forEach(function(k) {
                    if (restoreAnalyticsRecord(cat, k, { silent: true })) restored += 1;
                });
            });
            saveSystemData();
            displaySales();
            displaySalesQuotesInbox();
            alert(restored ? ('تم Restore ' + restored + ' عنصر.') : 'لا عناصر للاستعادة.');
            renderAdminAnalyticsPanel();
        }

        function deleteAnalyticsCustomer(crmKey) {
            if (!requireMainGovernanceAdmin()) return;
            const key = String(crmKey || '').trim();
            if (!key) return;
            if (!confirm('حذف بيانات العميل من التقارير؟ (عروضه + ظهوره في CRM)')) return;
            const inbox = loadSalesQuotesInbox();
            const related = inbox.filter(function(e) {
                return String(e.phone || e.customerName || '').trim() === key;
            });
            related.forEach(function(entry) {
                archiveAnalyticsRecord('quotes', entry.id || entry.quoteNo, entry, entry.customerName || entry.quoteNo);
            });
            const nextInbox = inbox.filter(function(e) {
                return String(e.phone || e.customerName || '').trim() !== key;
            });
            saveSalesQuotesInbox(nextInbox);
            (salesData || []).filter(function(s) {
                return String(s.phone || s.customerName || '').trim() === key;
            }).forEach(function(s) {
                archiveAnalyticsRecord('sales', s.id || s.quoteNo, s, s.customerName || s.product);
            });
            salesData = (salesData || []).filter(function(s) {
                return String(s.phone || s.customerName || '').trim() !== key;
            });
            archiveAnalyticsRecord('customers', key, { phone: key }, key);
            saveSystemData();
            displaySales();
            displaySalesQuotesInbox();
            renderAdminAnalyticsPanel();
        }

        function isAnalyticsItemDeleted(category, key) {
            ensureAnalyticsGovernance();
            return analyticsGovernance.deleted[category].some(function(row) {
                return row && String(row.key) === String(key);
            });
        }

        function archiveAnalyticsRecord(category, key, item, label) {
            if (!requireMainGovernanceAdmin()) return false;
            ensureAnalyticsGovernance();
            const k = String(key || '').trim();
            if (!k) return false;
            analyticsGovernance.deleted[category] = analyticsGovernance.deleted[category].filter(function(r) {
                return String(r.key) !== k;
            });
            analyticsGovernance.deleted[category].unshift({
                key: k,
                label: label || k,
                item: item,
                deletedAt: Date.now(),
                deletedBy: currentAdmin ? currentAdmin.username : 'admin'
            });
            saveSystemData();
            addAuditLog('أرشفة تقرير', category + ': ' + (label || k));
            return true;
        }

        function restoreAnalyticsRecord(category, key, options) {
            if (!requireMainGovernanceAdmin()) return false;
            options = options || {};
            ensureAnalyticsGovernance();
            const k = String(key || '').trim();
            const row = analyticsGovernance.deleted[category].find(function(r) { return String(r.key) === k; });
            if (!row) return false;
            if (category === 'quotes' && row.item) {
                const inbox = loadSalesQuotesInbox();
                if (!inbox.some(function(e) { return e.id === row.item.id || e.quoteNo === row.item.quoteNo; })) {
                    inbox.unshift(row.item);
                    saveSalesQuotesInbox(inbox);
                }
            } else if (category === 'visitors' && row.item) {
                ensureVisitorAnalytics();
                if (!visitorAnalytics.sessions.some(function(s) { return s.id === row.item.id; })) {
                    visitorAnalytics.sessions.unshift(row.item);
                    saveVisitorAnalyticsLocal();
                }
            } else if (category === 'complaints' && row.item) {
                const cid = row.item.id || k;
                complaints[cid] = row.item;
            } else if (category === 'sales' && row.item) {
                if (!salesData.some(function(s) { return s.id === row.item.id; })) {
                    salesData.unshift(row.item);
                }
            } else if (category === 'customers') {
                /* marker only — related quotes restored from quotes bin separately */
            }
            analyticsGovernance.deleted[category] = analyticsGovernance.deleted[category].filter(function(r) {
                return String(r.key) !== k;
            });
            saveSystemData();
            addAuditLog('استعادة تقرير', category + ': ' + (row.label || k));
            if (!options.silent) renderAdminAnalyticsPanel();
            return true;
        }

        function deleteAnalyticsQuote(entryId) {
            if (!requireMainGovernanceAdmin()) return;
            const inbox = loadSalesQuotesInbox();
            const entry = inbox.find(function(e) { return e.id === entryId; });
            if (!entry) { alert('الطلب غير موجود.'); return; }
            if (!confirm('حذف عرض السعر ' + (entry.quoteNo || entryId) + ' من التقارير؟ (يمكن استعادته لاحقاً)')) return;
            const next = inbox.filter(function(e) { return e.id !== entryId; });
            saveSalesQuotesInbox(next);
            archiveAnalyticsRecord('quotes', entry.id || entry.quoteNo, entry, entry.quoteNo || entry.customerName);
            displaySalesQuotesInbox();
            renderAdminAnalyticsPanel();
        }

        function deleteAnalyticsVisitor(sessionId) {
            if (!requireMainGovernanceAdmin()) return;
            ensureVisitorAnalytics();
            const session = visitorAnalytics.sessions.find(function(s) { return s.id === sessionId; });
            if (!session) return;
            if (!confirm('حذف جلسة الزائر من التقرير؟')) return;
            visitorAnalytics.sessions = visitorAnalytics.sessions.filter(function(s) { return s.id !== sessionId; });
            saveVisitorAnalyticsLocal();
            archiveAnalyticsRecord('visitors', sessionId, session, sessionId.slice(-8));
            renderAdminAnalyticsPanel();
        }

        function deleteAnalyticsComplaint(complaintId) {
            if (!requireMainGovernanceAdmin()) return;
            const c = complaints[complaintId];
            if (!c) return;
            if (!confirm('حذف الشكوى من التقرير؟')) return;
            delete complaints[complaintId];
            saveSystemData();
            archiveAnalyticsRecord('complaints', complaintId, c, c.customerName || complaintId);
            renderAdminAnalyticsPanel();
        }

        function buildAnalyticsRestorePanelHtml() {
            ensureAnalyticsGovernance();
            if (!isMainGovernanceAdmin()) return '';
            const rows = ['quotes', 'visitors', 'complaints', 'sales', 'customers'].reduce(function(acc, cat) {
                return acc.concat((analyticsGovernance.deleted[cat] || []).map(function(r) {
                    return Object.assign({}, r, { category: cat });
                }));
            }, []).sort(function(a, b) { return (b.deletedAt || 0) - (a.deletedAt || 0); });
            if (!rows.length) {
                return '<article class="admin-analytics-table-card admin-analytics-restore-card" id="analytics-restore-panel">' +
                    '<h4><i class="fas fa-trash-restore"></i> سلة الاستعادة — الإدارة الرئيسية</h4>' +
                    '<p class="analytics-empty">لا عناصر محذوفة — عند الحذف من التقارير تظهر هنا للاستعادة (Restore).</p></article>';
            }
            return '<article class="admin-analytics-table-card admin-analytics-restore-card" id="analytics-restore-panel">' +
                '<h4><i class="fas fa-trash-restore"></i> سلة الاستعادة — الإدارة الرئيسية فقط</h4>' +
                '<p class="scm-hint admin-only-ui">Restore: استعادة تقرير أو تحليل محذوف — لا يراه الإداريون الفرعيون.</p>' +
                '<table class="admin-analytics-table"><thead><tr><th>النوع</th><th>الوصف</th><th>حُذف</th><th>Restore</th></tr></thead><tbody>' +
                rows.map(function(r) {
                    const when = formatNebrasDateTime(r.deletedAt, currentLang || 'ar');
                    const catLabel = { quotes: 'عرض سعر', visitors: 'زائر', complaints: 'شكوى', sales: 'بيع', customers: 'عميل CRM' }[r.category] || r.category;
                    const safeKey = String(r.key).replace(/'/g, "\\'");
                    return '<tr><td>' + escapeHtmlAttr(catLabel) + '</td><td>' + escapeHtmlAttr(r.label || r.key) + '</td>' +
                        '<td><small>' + escapeHtmlAttr(when) + '</small></td>' +
                        '<td><button type="button" class="analytics-restore-btn" onclick="restoreAnalyticsRecord(\'' + r.category + '\',\'' + safeKey + '\')">Restore</button></td></tr>';
                }).join('') + '</tbody></table></article>';
        }

        function dataUrlToUploadFile(dataUrl, fileName) {
            if (!dataUrl || String(dataUrl).indexOf('data:') !== 0) return null;
            try {
                const parts = dataUrl.split(',');
                const mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
                const bstr = atob(parts[1]);
                const n = bstr.length;
                const u8 = new Uint8Array(n);
                for (let i = 0; i < n; i++) u8[i] = bstr.charCodeAt(i);
                return new File([u8], fileName || 'receipt.jpg', { type: mime });
            } catch (e) {
                return null;
            }
        }

        async function prepareQuoteEntryForCloud(entry) {
            const cloudEntry = Object.assign({}, entry);
            if (cloudEntry.transferReceiptDataUrl && String(cloudEntry.transferReceiptDataUrl).startsWith('data:')) {
                const file = dataUrlToUploadFile(cloudEntry.transferReceiptDataUrl, cloudEntry.transferReceiptFileName || 'transfer-receipt.jpg');
                if (file && supabaseClient) {
                    const url = await uploadNebrasMediaFile(file);
                    if (url) {
                        cloudEntry.transferReceiptDataUrl = url;
                        cloudEntry.transferReceiptCloudUrl = url;
                        entry.transferReceiptCloudUrl = url;
                    } else {
                        cloudEntry.transferReceiptDataUrl = '';
                        cloudEntry.transferReceiptOmittedFromCloud = true;
                    }
                } else {
                    cloudEntry.transferReceiptDataUrl = '';
                    cloudEntry.transferReceiptOmittedFromCloud = true;
                }
            }
            if (cloudEntry.doorDesignerImage && String(cloudEntry.doorDesignerImage).startsWith('data:') && cloudEntry.doorDesignerImage.length > 120000) {
                cloudEntry.doorDesignerImage = '';
            }
            if (cloudEntry.quoteDocumentDataUrl && String(cloudEntry.quoteDocumentDataUrl).startsWith('data:')) {
                const qFile = dataUrlToUploadFile(cloudEntry.quoteDocumentDataUrl, (cloudEntry.quoteNo || 'quote') + '-a4.png');
                if (qFile && supabaseClient) {
                    const qUrl = await uploadNebrasMediaFile(qFile);
                    if (qUrl) {
                        cloudEntry.quoteDocumentDataUrl = qUrl;
                        cloudEntry.quoteDocumentCloudUrl = qUrl;
                        entry.quoteDocumentCloudUrl = qUrl;
                    } else {
                        cloudEntry.quoteDocumentDataUrl = '';
                        cloudEntry.quoteDocumentOmittedFromCloud = true;
                    }
                } else {
                    cloudEntry.quoteDocumentDataUrl = '';
                    cloudEntry.quoteDocumentOmittedFromCloud = true;
                }
            }
            if (cloudEntry.quoteDocumentPdfDataUrl && String(cloudEntry.quoteDocumentPdfDataUrl).startsWith('data:')) {
                cloudEntry.quoteDocumentPdfDataUrl = '';
            }
            return cloudEntry;
        }

        function updateSalesInboxBadge() {
            const badge = document.getElementById('nav-sales-badge');
            if (!badge || !currentAdmin || !canManage('sales')) return;
            const count = loadSalesQuotesInbox().filter(function(e) { return e && e.status === 'new'; }).length;
            badge.textContent = count > 0 ? String(count) : '';
            badge.hidden = count <= 0;
        }

        function ensureVisitorAnalytics() {
            if (!visitorAnalytics || typeof visitorAnalytics !== 'object') {
                visitorAnalytics = { sessions: [], totalVisits: 0, totalPageViews: 0, lastUpdated: 0 };
            }
            if (!Array.isArray(visitorAnalytics.sessions)) visitorAnalytics.sessions = [];
        }

        function loadVisitorAnalyticsFromStorage() {
            try {
                const raw = localStorage.getItem(VISITOR_ANALYTICS_KEY);
                if (raw) visitorAnalytics = JSON.parse(raw);
            } catch (e) { /* ignore */ }
            ensureVisitorAnalytics();
        }

        function saveVisitorAnalyticsLocal() {
            ensureVisitorAnalytics();
            visitorAnalytics.lastUpdated = Date.now();
            try {
                localStorage.setItem(VISITOR_ANALYTICS_KEY, JSON.stringify(visitorAnalytics));
            } catch (e) { /* ignore */ }
        }

        function trackVisitorSession() {
            if (document.body.classList.contains('admin-session')) return;
            loadVisitorAnalyticsFromStorage();
            ensureVisitorAnalytics();
            const sid = getVisitorSessionId();
            const now = Date.now();
            const ua = navigator.userAgent ? String(navigator.userAgent).slice(0, 140) : '';
            const lang = currentLang || 'ar';
            let session = visitorAnalytics.sessions.find(function(s) { return s.id === sid; });
            if (!session) {
                session = { id: sid, firstSeen: now, lastSeen: now, pageViews: 1, lang: lang, userAgent: ua };
                visitorAnalytics.sessions.unshift(session);
                visitorAnalytics.totalVisits = (visitorAnalytics.totalVisits || 0) + 1;
                if (visitorAnalytics.sessions.length > 500) {
                    visitorAnalytics.sessions = visitorAnalytics.sessions.slice(0, 500);
                }
            } else {
                session.lastSeen = now;
                session.pageViews = (Number(session.pageViews) || 0) + 1;
                session.lang = lang;
            }
            visitorAnalytics.totalPageViews = (visitorAnalytics.totalPageViews || 0) + 1;
            saveVisitorAnalyticsLocal();
        }

        async function getMergedSalesQuotesForAnalytics() {
            const local = loadSalesQuotesInbox();
            const cloud = await fetchSalesQuotesFromCloud();
            const merged = [];
            const seen = {};
            cloud.concat(local).forEach(function(e) {
                const key = e.quoteNo || e.id;
                if (!key || seen[key]) return;
                seen[key] = true;
                merged.push(e);
            });
            merged.sort(function(a, b) { return (a.at || 0) - (b.at || 0); });
            return merged.filter(function(e) {
                if (!e) return false;
                const key = e.id || e.quoteNo;
                return !isAnalyticsItemDeleted('quotes', key);
            });
        }

        function extractColorFromQuoteLine(line) {
            if (!line) return '';
            const color = String(line.color || '').trim();
            if (color && color.indexOf('\n') === -1 && color.length < 72 && color.indexOf('نوع الباب') === -1) {
                return color;
            }
            const spec = (line.meta && line.meta.designSpec) || '';
            const rollAr = spec.match(/رول[^\n:]*:\s*([^\n]+)/i);
            if (rollAr) return rollAr[1].trim();
            const rollEn = spec.match(/Roll[^\n:]*:\s*([^\n]+)/i);
            if (rollEn) return rollEn[1].trim();
            return '';
        }

        function aggregateTopProductsFromQuotes(quotes, limit) {
            const counts = {};
            (quotes || []).forEach(function(q) {
                (q.lines || []).forEach(function(l) {
                    const key = String(l.productTitle || l.productId || 'غير محدد').trim();
                    counts[key] = (counts[key] || 0) + (Number(l.qty) || 1);
                });
            });
            return Object.keys(counts).map(function(k) { return { label: k, value: counts[k] }; })
                .sort(function(a, b) { return b.value - a.value; })
                .slice(0, limit || 8);
        }

        function aggregateTopColorsFromQuotes(quotes, limit) {
            const counts = {};
            (quotes || []).forEach(function(q) {
                (q.lines || []).forEach(function(l) {
                    const c = extractColorFromQuoteLine(l);
                    if (c) counts[c] = (counts[c] || 0) + (Number(l.qty) || 1);
                });
                if (q.doorDesignerSpec) {
                    const rollMatch = q.doorDesignerSpec.match(/رول[^\n:]*:\s*([^\n]+)/i) ||
                        q.doorDesignerSpec.match(/Roll[^\n:]*:\s*([^\n]+)/i);
                    if (rollMatch) {
                        const c = rollMatch[1].trim();
                        counts[c] = (counts[c] || 0) + 1;
                    }
                }
            });
            return Object.keys(counts).map(function(k) { return { label: k, value: counts[k] }; })
                .sort(function(a, b) { return b.value - a.value; })
                .slice(0, limit || 8);
        }

        function aggregateComplaintsByStatus() {
            const byStatus = { pending: 0, inProgress: 0, resolved: 0 };
            Object.values(complaints || {}).forEach(function(c) {
                const s = (c && c.status) || 'pending';
                byStatus[s] = (byStatus[s] || 0) + 1;
            });
            return [
                { label: 'قيد الانتظار', value: byStatus.pending || 0 },
                { label: 'قيد المعالجة', value: byStatus.inProgress || 0 },
                { label: 'محلولة', value: byStatus.resolved || 0 }
            ];
        }

        function getComplaintStatusLabel(status, lang) {
            const ui = siteText[lang || currentLang || 'ar'] || siteText.ar;
            if (status === 'inProgress') return ui.complaintStatusInProgress || 'قيد المعالجة';
            if (status === 'resolved') return ui.complaintStatusResolved || 'محلولة';
            return ui.complaintStatusPending || 'قيد الانتظار';
        }

        function isQuoteSoldStatus(status) {
            return status === 'sold' || status === 'sale' || status === 'converted';
        }

        function getQuoteActivityType(q) {
            if (!q) return 'quote';
            if (isQuoteSoldStatus(q.status) || q.quoteType === 'sale') return 'sale';
            return 'quote';
        }

        function buildComplaintsReportTableHtml() {
            const lang = currentLang || 'ar';
            const rows = Object.entries(complaints || {}).map(function(entry) {
                return { id: entry[0], comp: entry[1] || {} };
            }).filter(function(r) {
                return !isAnalyticsItemDeleted('complaints', r.id);
            }).sort(function(a, b) {
                const da = Date.parse(a.comp.createdAt || '') || 0;
                const db = Date.parse(b.comp.createdAt || '') || 0;
                return db - da;
            });
            if (!rows.length) {
                return '<p class="analytics-empty">لا شكاوى مسجّلة — تظهر هنا فور إرسال العميل من نموذج الشكاوى.</p>';
            }
            return wrapAnalyticsTableHtml('<table class="admin-analytics-table admin-analytics-table--complaints"><thead><tr>' +
                '<th>رقم</th><th>التاريخ</th><th>العميل</th><th>الجوال</th><th>الفرع</th><th>الحالة</th><th>تفاصيل الشكوى</th><th>التحويل</th>' +
                (isMainGovernanceAdmin() ? '<th>حذف</th>' : '') + '</tr></thead><tbody>' +
                rows.map(function(r) {
                    const c = r.comp;
                    const when = c.createdAt ? formatNebrasDateTime(Date.parse(c.createdAt), lang) : '—';
                    const phone = String(c.phone || '').trim();
                    const phoneCell = phone
                        ? '<a class="analytics-tel-link" href="tel:' + escapeHtmlAttr(phone) + '">' + escapeHtmlAttr(phone) + '</a>'
                        : '—';
                    const statusCls = 'complaint-status complaint-status--' + escapeHtmlAttr(c.status || 'pending');
                    const delCell = isMainGovernanceAdmin()
                        ? ('<td><button type="button" class="analytics-delete-btn" onclick="deleteAnalyticsComplaint(\'' + escapeHtmlAttr(String(r.id).replace(/'/g, "\\'")) + '\')">حذف</button></td>')
                        : '';
                    return '<tr><td><strong>#' + escapeHtmlAttr(r.id) + '</strong></td>' +
                        '<td>' + escapeHtmlAttr(when) + '</td>' +
                        '<td>' + escapeHtmlAttr(c.customerName || '—') + '</td>' +
                        '<td>' + phoneCell + '</td>' +
                        '<td>' + escapeHtmlAttr(c.branch || '—') + '</td>' +
                        '<td><span class="' + statusCls + '">' + escapeHtmlAttr(getComplaintStatusLabel(c.status, lang)) + '</span></td>' +
                        '<td class="analytics-cell-desc">' + escapeHtmlAttr(c.description || '—') + '</td>' +
                        '<td><small>' + escapeHtmlAttr(c.routedSalesBranch || 'المبيعات') + '<br>' +
                        (c.routedSalesPhone ? '<a class="analytics-tel-link" href="tel:' + escapeHtmlAttr(c.routedSalesPhone) + '">' + escapeHtmlAttr(c.routedSalesPhone) + '</a>' : '—') +
                        '</small></td>' + delCell + '</tr>';
                }).join('') + '</tbody></table>');
        }

        function buildComplaintsTimelineHtml() {
            const rows = Object.entries(complaints || {}).map(function(entry) {
                return { id: entry[0], comp: entry[1] || {} };
            }).sort(function(a, b) {
                const da = Date.parse(a.comp.createdAt || '') || 0;
                const db = Date.parse(b.comp.createdAt || '') || 0;
                return db - da;
            }).slice(0, 6);
            if (!rows.length) return '';
            const lang = currentLang || 'ar';
            return '<ul class="complaints-timeline-list">' + rows.map(function(r) {
                const when = r.comp.createdAt ? formatNebrasDateTime(Date.parse(r.comp.createdAt), lang) : '—';
                const who = [r.comp.customerName, r.comp.phone].filter(Boolean).join(' · ');
                return '<li><strong>#' + escapeHtmlAttr(r.id) + '</strong> · ' + escapeHtmlAttr(getComplaintStatusLabel(r.comp.status, lang)) +
                    ' · ' + escapeHtmlAttr(when) +
                    (who ? '<br><small>' + escapeHtmlAttr(who) + '</small>' : '') +
                    '<br><small>' + escapeHtmlAttr(r.comp.description || '') + '</small></li>';
            }).join('') + '</ul>';
        }

        function renderAnalyticsBarList(items, emptyMsg) {
            if (!items || !items.length || !items.some(function(i) { return i.value > 0; })) {
                return '<p class="analytics-empty">' + escapeHtmlAttr(emptyMsg || 'لا بيانات بعد') + '</p>';
            }
            const max = Math.max.apply(null, items.map(function(i) { return i.value; }).concat([1]));
            return items.map(function(item) {
                const pct = Math.max(4, Math.round((item.value / max) * 100));
                return '<div class="analytics-bar-row">' +
                    '<span class="analytics-bar-label" title="' + escapeHtmlAttr(item.label) + '">' + escapeHtmlAttr(item.label) + '</span>' +
                    '<div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:' + pct + '%"></div></div>' +
                    '<span class="analytics-bar-value">' + item.value + '</span></div>';
            }).join('');
        }

        function buildQuoteRankingTableHtml(quotes) {
            const lang = currentLang || 'ar';
            const sorted = (quotes || []).slice().sort(function(a, b) { return (a.at || 0) - (b.at || 0); });
            if (!sorted.length) {
                return '<p class="analytics-empty">لا طلبات عروض أسعار بعد — يظهر الترتيب عند إرسال العملاء من السلة (ديناميكي من كتalog المنتجات).</p>';
            }
            return wrapAnalyticsTableHtml('<table class="admin-analytics-table"><thead><tr>' +
                '<th>#</th><th>النوع</th><th>العميل</th><th>عرض السعر</th><th>التاريخ</th><th>المنتجات</th><th>الإجمالي</th><th>الحوالة</th><th>الحالة</th>' +
                (isMainGovernanceAdmin() ? '<th>حذف</th>' : '') + '</tr></thead><tbody>' +
                sorted.map(function(q, idx) {
                    const when = formatNebrasDateTime(q.at, lang);
                    const linesCount = (q.lines || []).length;
                    const productsPreview = (q.lines || []).slice(0, 4).map(function(l) {
                        return escapeHtmlAttr(l.productTitle || l.productId || '—') + ' ×' + (Number(l.qty) || 1);
                    }).join('<br>') + (linesCount > 4 ? '<br><small>+' + (linesCount - 4) + ' …</small>' : '');
                    const totalInc = Number(q.totalIncVat) || 0;
                    const totalTxt = totalInc > 0 ? formatSar(totalInc) : (lang === 'en' ? 'On request' : 'عند الطلب');
                    const actType = getQuoteActivityType(q);
                    const typeBadge = actType === 'sale'
                        ? '<span class="analytics-type-badge analytics-type-badge--sale">بيع فعلي</span>'
                        : '<span class="analytics-type-badge analytics-type-badge--quote">عرض سعر</span>';
                    const statusMap = { new: 'جديد', reviewed: 'تمت المراجعة', closed: 'مغلق', sold: 'بيع مؤكد' };
                    const statusTxt = statusMap[q.status] || q.status || 'new';
                    let transferCell = '—';
                    if (q.transferReceiptDataUrl) {
                        transferCell = '<span class="analytics-type-badge analytics-type-badge--transfer">✓ إيصال</span>';
                        if (q.transferDeclared) transferCell += ' <small>مؤكد</small>';
                    } else if (q.transferDeclared) {
                        transferCell = '<span class="analytics-type-badge analytics-type-badge--pending-transfer">تحويل مُعلَن</span>';
                    }
                    return '<tr><td><span class="rank-badge">' + (idx + 1) + '</span></td>' +
                        '<td>' + typeBadge + '</td>' +
                        '<td>' + escapeHtmlAttr(q.customerName || '—') + '<br><small><a class="analytics-tel-link" href="tel:' + escapeHtmlAttr(q.phone || '') + '">' + escapeHtmlAttr(q.phone || '') + '</a></small></td>' +
                        '<td>' + escapeHtmlAttr(q.quoteNo || '—') + '</td>' +
                        '<td>' + escapeHtmlAttr(when) + '</td>' +
                        '<td class="analytics-cell-products">' + (productsPreview || '—') + '</td>' +
                        '<td>' + escapeHtmlAttr(totalTxt) + '</td>' +
                        '<td>' + transferCell + '</td>' +
                        '<td>' + escapeHtmlAttr(statusTxt) + '</td>' +
                        (isMainGovernanceAdmin() ? ('<td><button type="button" class="analytics-delete-btn" onclick="deleteAnalyticsQuote(\'' + escapeHtmlAttr(String(q.id).replace(/'/g, "\\'")) + '\')">حذف</button></td>') : '') +
                        '</tr>';
                }).join('') + '</tbody></table>');
        }

        function buildBankTransfersReportHtml(quotes) {
            const lang = currentLang || 'ar';
            const rows = (quotes || []).filter(function(q) {
                return q && (q.transferReceiptDataUrl || q.transferDeclared);
            }).sort(function(a, b) { return (b.at || 0) - (a.at || 0); });
            if (!rows.length) {
                return '<p class="analytics-empty">لا حوالات مرفقة بعد — يظهر هنا عند رفع العميل لإيصال الحوالة مع عرض السعر.</p>';
            }
            return wrapAnalyticsTableHtml('<table class="admin-analytics-table admin-analytics-table--transfers"><thead><tr>' +
                '<th>التاريخ</th><th>العميل</th><th>الجوال</th><th>عرض السعر</th><th>البنك / IBAN</th><th>تأكيد التحويل</th><th>صورة الإيصال</th><th>ملاحظات</th>' +
                (isMainGovernanceAdmin() ? '<th>حذف</th>' : '') + '</tr></thead><tbody>' +
                rows.map(function(q) {
                    const when = formatNebrasDateTime(q.at, lang);
                    const phone = q.phone || '';
                    const bankLabel = q.paymentBankNameAr || q.paymentBankNameEn || '—';
                    const iban = q.paymentBankIban || '—';
                    const declared = q.transferDeclared
                        ? '<span class="analytics-type-badge analytics-type-badge--transfer">✓ أكّد العميل</span>'
                        : '<span class="analytics-type-badge analytics-type-badge--pending-transfer">—</span>';
                    const receiptCell = q.transferReceiptDataUrl
                        ? '<button type="button" class="analytics-receipt-thumb-btn" onclick="viewSalesQuoteReceipt(\'' + escapeHtmlAttr(String(q.id).replace(/'/g, "\\'")) + '\')">' +
                            '<img src="' + escapeHtmlAttr(q.transferReceiptDataUrl) + '" alt="" loading="lazy"> عرض</button>'
                        : '—';
                    const entryKey = String(q.id).replace(/'/g, "\\'");
                    return '<tr><td>' + escapeHtmlAttr(when) + '</td>' +
                        '<td>' + escapeHtmlAttr(q.customerName || '—') + '</td>' +
                        '<td>' + (phone ? '<a class="analytics-tel-link" href="tel:' + escapeHtmlAttr(phone) + '">' + escapeHtmlAttr(phone) + '</a>' : '—') + '</td>' +
                        '<td><strong>' + escapeHtmlAttr(q.quoteNo || '—') + '</strong></td>' +
                        '<td><small>' + escapeHtmlAttr(bankLabel) + '<br><code dir="ltr">' + escapeHtmlAttr(iban) + '</code></small></td>' +
                        '<td>' + declared + '</td>' +
                        '<td>' + receiptCell + '</td>' +
                        '<td class="analytics-cell-desc">' + escapeHtmlAttr(q.note || '—') + '</td>' +
                        (isMainGovernanceAdmin() ? ('<td><button type="button" class="analytics-delete-btn" onclick="deleteAnalyticsQuote(\'' + entryKey + '\')">حذف</button></td>') : '') +
                        '</tr>';
                }).join('') + '</tbody></table>');
        }

        function buildSalesCrmReportHtml(quotes) {
            const lang = currentLang || 'ar';
            const customers = {};
            (quotes || []).forEach(function(q) {
                const key = String(q.phone || q.customerName || q.id || '').trim();
                if (!key) return;
                if (!customers[key]) {
                    customers[key] = {
                        name: q.customerName || '—',
                        phone: q.phone || '—',
                        quotes: 0,
                        sales: 0,
                        lastAt: 0,
                        lastQuoteNo: '',
                        products: {}
                    };
                }
                const c = customers[key];
                const act = getQuoteActivityType(q);
                if (act === 'sale') c.sales += 1;
                else c.quotes += 1;
                if ((q.at || 0) >= c.lastAt) {
                    c.lastAt = q.at || 0;
                    c.lastQuoteNo = q.quoteNo || '';
                }
                (q.lines || []).forEach(function(l) {
                    const pk = l.productTitle || l.productId || '—';
                    c.products[pk] = (c.products[pk] || 0) + (Number(l.qty) || 1);
                });
            });
            (salesData || []).forEach(function(s) {
                const key = String(s.phone || s.customerName || s.id || '').trim();
                if (!key) return;
                if (!customers[key]) {
                    customers[key] = { name: s.customerName || s.product || '—', phone: s.phone || '—', quotes: 0, sales: 0, lastAt: 0, lastQuoteNo: '', products: {} };
                }
                customers[key].sales += 1;
            });
            const rows = Object.keys(customers).map(function(k) {
                return Object.assign({ crmKey: k }, customers[k]);
            }).filter(function(c) {
                return !isAnalyticsItemDeleted('customers', c.crmKey);
            }).sort(function(a, b) { return (b.lastAt || 0) - (a.lastAt || 0); });
            if (!rows.length) {
                return '<p class="analytics-empty">لا نشاط عملاء بعد — يُميّز تلقائياً بين «عرض سعر فقط» و«بيع فعلي».</p>';
            }
            return wrapAnalyticsTableHtml('<table class="admin-analytics-table"><thead><tr>' +
                '<th>العميل</th><th>الجوال</th><th>عروض سعر</th><th>مبيعات فعلية</th><th>آخر نشاط</th><th>المنتجات المطلوبة</th>' +
                (isMainGovernanceAdmin() ? '<th>حذف</th>' : '') + '</tr></thead><tbody>' +
                rows.map(function(c) {
                    const prodList = Object.keys(c.products).slice(0, 3).map(function(p) {
                        return escapeHtmlAttr(p) + ' (' + c.products[p] + ')';
                    }).join('<br>');
                    const lastWhen = c.lastAt ? formatNebrasDateTime(c.lastAt, lang) : '—';
                    const activityBadge = c.sales > 0 && c.quotes === 0
                        ? '<span class="analytics-type-badge analytics-type-badge--sale">عميل بيع</span>'
                        : (c.sales > 0 ? '<span class="analytics-type-badge analytics-type-badge--mixed">عرض + بيع</span>'
                            : '<span class="analytics-type-badge analytics-type-badge--quote">عرض سعر فقط</span>');
                    const safeKey = String(c.crmKey).replace(/'/g, "\\'");
                    return '<tr><td>' + escapeHtmlAttr(c.name) + '<br>' + activityBadge + '</td>' +
                        '<td>' + (c.phone && c.phone !== '—' ? '<a class="analytics-tel-link" href="tel:' + escapeHtmlAttr(c.phone) + '">' + escapeHtmlAttr(c.phone) + '</a>' : '—') + '</td>' +
                        '<td>' + c.quotes + '</td><td>' + c.sales + '</td>' +
                        '<td>' + escapeHtmlAttr(lastWhen) + (c.lastQuoteNo ? '<br><small>' + escapeHtmlAttr(c.lastQuoteNo) + '</small>' : '') + '</td>' +
                        '<td class="analytics-cell-products">' + (prodList || '—') + '</td>' +
                        (isMainGovernanceAdmin() ? ('<td><button type="button" class="analytics-delete-btn" onclick="deleteAnalyticsCustomer(\'' + safeKey + '\')">حذف</button></td>') : '') +
                        '</tr>';
                }).join('') + '</tbody></table>');
        }

        function buildDynamicQuoteCatalogPanelHtml() {
            const shopProducts = (siteProducts || []).filter(function(p) {
                return p && p.visible !== false && productHasShop(p);
            });
            const variantCount = shopProducts.reduce(function(sum, p) {
                return sum + ((p.variants || []).length);
            }, 0);
            const rows = shopProducts.slice().sort(function(a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); }).map(function(p) {
                const vCount = (p.variants || []).length;
                const prices = (p.variants || []).map(function(v) { return Number(v.price) || 0; }).filter(function(n) { return n > 0; });
                const priceHint = prices.length ? ('من ' + formatSar(Math.min.apply(null, prices))) : 'عند الطلب';
                return '<tr><td>' + escapeHtmlAttr(getLocalizedCatalogField(p, 'title', currentLang || 'ar')) + '</td>' +
                    '<td><code dir="ltr">' + escapeHtmlAttr(p.id) + '</code></td>' +
                    '<td>' + vCount + '</td>' +
                    '<td>' + escapeHtmlAttr(priceHint) + '</td></tr>';
            }).join('');
            return '<p class="scm-hint admin-only-ui">كتalog المتجر ديناميكي — أي منتج/صنف تضيفه الإدارة يدخل عروض الأسعار والسلة تلقائياً بدون كود.</p>' +
                '<div class="admin-analytics-kpis" style="margin-bottom:12px">' +
                '<div class="admin-analytics-kpi"><strong>' + shopProducts.length + '</strong><span>منتجات متجر</span></div>' +
                '<div class="admin-analytics-kpi"><strong>' + variantCount + '</strong><span>أصناف (SKU)</span></div></div>' +
                (rows ? ('<table class="admin-analytics-table"><thead><tr><th>المنتج</th><th>المعرّف</th><th>أصناف</th><th>السعر</th></tr></thead><tbody>' + rows + '</tbody></table>')
                    : '<p class="analytics-empty">لا منتجات متجر بعد — أضيفي من إدارة المحتوى.</p>');
        }

        function buildVisitorReportTableHtml() {
            loadVisitorAnalyticsFromStorage();
            ensureVisitorAnalytics();
            const sessions = (visitorAnalytics.sessions || []).slice().filter(function(s) {
                return s && !isAnalyticsItemDeleted('visitors', s.id);
            }).sort(function(a, b) {
                return (b.lastSeen || 0) - (a.lastSeen || 0);
            }).slice(0, 25);
            if (!sessions.length) {
                return '<p class="analytics-empty">لا زيارات مسجّلة بعد — يُحدَّث تلقائياً عند فتح الموقع.</p>';
            }
            return wrapAnalyticsTableHtml('<table class="admin-analytics-table"><thead><tr>' +
                '<th>الجلسة</th><th>أول زيارة</th><th>آخر نشاط</th><th>صفحات</th><th>اللغة</th>' +
                (isMainGovernanceAdmin() ? '<th>حذف</th>' : '') + '</tr></thead><tbody>' +
                sessions.map(function(s) {
                    const safeId = String(s.id || '').replace(/'/g, "\\'");
                    return '<tr><td><code dir="ltr">' + escapeHtmlAttr(String(s.id || '').slice(-10)) + '</code></td>' +
                        '<td>' + escapeHtmlAttr(formatNebrasDateTime(s.firstSeen, currentLang)) + '</td>' +
                        '<td>' + escapeHtmlAttr(formatNebrasDateTime(s.lastSeen, currentLang)) + '</td>' +
                        '<td>' + (Number(s.pageViews) || 1) + '</td>' +
                        '<td>' + escapeHtmlAttr(s.lang || 'ar') + '</td>' +
                        (isMainGovernanceAdmin() ? ('<td><button type="button" class="analytics-delete-btn" onclick="deleteAnalyticsVisitor(\'' + safeId + '\')">حذف</button></td>') : '') +
                        '</tr>';
                }).join('') + '</tbody></table>');
        }

        async function renderAdminAnalyticsPanel() {
            const hub = document.getElementById('admin-analytics-hub');
            if (!hub || !currentAdmin) return;
            if (!canManage('audit')) {
                hub.hidden = true;
                return;
            }
            hub.hidden = false;
            const govToolbar = document.getElementById('analytics-governance-toolbar');
            if (govToolbar) govToolbar.innerHTML = buildAnalyticsGovernanceToolbarHtml();
            const kpisEl = document.getElementById('admin-analytics-kpis');
            const productsEl = document.getElementById('chart-top-products');
            const colorsEl = document.getElementById('chart-top-colors');
            const complaintsEl = document.getElementById('chart-complaints');
            const quotesEl = document.getElementById('quote-ranking-panel');
            const visitorsEl = document.getElementById('visitor-report-panel');
            const complaintsReportEl = document.getElementById('complaints-report-panel');
            const salesCrmEl = document.getElementById('sales-crm-panel');
            const quoteCatalogEl = document.getElementById('quote-catalog-panel');
            const bankTransfersEl = document.getElementById('bank-transfers-panel');
            if (kpisEl) kpisEl.innerHTML = '<p class="analytics-empty">جاري تحميل التقارير…</p>';
            const quotes = await getMergedSalesQuotesForAnalytics();
            loadVisitorAnalyticsFromStorage();
            ensureVisitorAnalytics();
            const uniqueVisitors = (visitorAnalytics.sessions || []).length;
            const openComplaints = Object.values(complaints || {}).filter(function(c) {
                return c && c.status !== 'resolved';
            }).length;
            const quotesOnlyCount = quotes.filter(function(q) { return getQuoteActivityType(q) === 'quote'; }).length;
            const salesFromQuotes = quotes.filter(function(q) { return getQuoteActivityType(q) === 'sale'; }).length;
            const manualSalesCount = (salesData || []).length;
            const transfersWithReceipt = quotes.filter(function(q) { return q && q.transferReceiptDataUrl; }).length;
            const shopProductCount = (siteProducts || []).filter(function(p) {
                return p && p.visible !== false && productHasShop(p);
            }).length;
            if (kpisEl) {
                kpisEl.innerHTML = [
                    { v: uniqueVisitors, l: 'زوار (جلسات)' },
                    { v: quotes.length, l: 'طلبات (عروض + مبيعات)' },
                    { v: quotesOnlyCount, l: 'عروض سعر فقط' },
                    { v: salesFromQuotes + manualSalesCount, l: 'مبيعات فعلية' },
                    { v: transfersWithReceipt, l: 'حوالات بإيصال' },
                    { v: openComplaints, l: 'شكاوى مفتوحة' },
                    { v: shopProductCount, l: 'منتجات متجر (ديناميكي)' }
                ].map(function(k) {
                    return '<div class="admin-analytics-kpi"><strong>' + k.v + '</strong><span>' + escapeHtmlAttr(k.l) + '</span></div>';
                }).join('');
            }
            if (productsEl) {
                productsEl.innerHTML = '<h4 id="chart-top-products-title">المنتجات الأكثر طلباً</h4>' +
                    renderAnalyticsBarList(aggregateTopProductsFromQuotes(quotes), 'لا طلبات منتجات بعد — من السلة وعروض الأسعار.');
            }
            if (colorsEl) {
                colorsEl.innerHTML = '<h4 id="chart-top-colors-title">الألوان / الرولات الأكثر طلباً</h4>' +
                    renderAnalyticsBarList(aggregateTopColorsFromQuotes(quotes), 'لا ألوان مسجّلة بعد — تُجمع من السلة وصمّم بابك.');
            }
            if (complaintsEl) {
                complaintsEl.innerHTML = '<h4 id="chart-complaints-title">الشكاوى — حسب الحالة</h4>' +
                    renderAnalyticsBarList(aggregateComplaintsByStatus(), 'لا شكاوى مسجّلة.') +
                    buildComplaintsTimelineHtml();
            }
            if (complaintsReportEl) {
                complaintsReportEl.innerHTML = '<h4 id="complaints-report-title"><i class="fas fa-exclamation-circle"></i> تقرير الشكاوى التفصيلي — للتواصل مع العميل</h4>' +
                    buildAnalyticsPanelActionsHtml('complaints', 'clearAllAnalyticsComplaints', 'إفراغ الشكاوى') +
                    '<p class="scm-hint admin-only-ui">كل شكوى: التاريخ · الاسم · الجوال · الفرع · التفاصيل · رقم التحويل للمبيعات.</p>' +
                    buildComplaintsReportTableHtml();
            }
            if (salesCrmEl) {
                salesCrmEl.innerHTML = '<h4 id="sales-crm-title"><i class="fas fa-user-tag"></i> تقرير العملاء — عرض سعر vs بيع فعلي</h4>' +
                    buildAnalyticsPanelActionsHtml('crm', 'clearAllAnalyticsCustomers', 'إفراغ تقرير العملاء') +
                    '<p class="scm-hint admin-only-ui">تمييز تلقائي: من طلب عرض سعر فقط ومن أكّد شراءاً (زر «تسجيل كبيع» في المبيعات).</p>' +
                    buildSalesCrmReportHtml(quotes);
            }
            if (quotesEl) {
                quotesEl.innerHTML = '<h4 id="quote-ranking-title">ترتيب عروض الأسعار (من الأقدم للأحدث)</h4>' +
                    buildAnalyticsPanelActionsHtml('quotes', 'clearAllAnalyticsQuotes', 'إفراغ كل عروض الأسعار') +
                    '<p class="scm-hint admin-only-ui">العميل الأول = رقم 1 · المنتجات تُسحب ديناميكياً من كتalog الإدارة.</p>' +
                    buildQuoteRankingTableHtml(quotes);
            }
            if (quoteCatalogEl) {
                quoteCatalogEl.innerHTML = '<h4 id="quote-catalog-title"><i class="fas fa-boxes"></i> كتalog عروض الأسعار الديناميكي</h4>' +
                    buildDynamicQuoteCatalogPanelHtml();
            }
            if (bankTransfersEl) {
                bankTransfersEl.innerHTML = '<h4 id="bank-transfers-title"><i class="fas fa-receipt"></i> تقرير الحوالات البنكية — إيصالات العملاء</h4>' +
                    buildAnalyticsPanelActionsHtml('transfers', 'clearAllAnalyticsTransfers', 'إفراغ تقرير الحوالات') +
                    '<p class="scm-hint admin-only-ui">كل عميل يرفع إيصالاً من «ملاحظات المبيعات» يظهر هنا مع بياناته وصورة الحوالة — مرتبط بعرض السعر.</p>' +
                    buildBankTransfersReportHtml(quotes);
            }
            if (visitorsEl) {
                visitorsEl.innerHTML = '<h4 id="visitor-report-title">تقرير زوار الموقع</h4>' +
                    buildAnalyticsPanelActionsHtml('visitors', 'clearAllAnalyticsVisitors', 'إفراغ تقرير الزوار') +
                    '<p class="scm-hint admin-only-ui">بيانات داخلية — لا تظهر للعملاء.</p>' +
                    buildVisitorReportTableHtml();
            }
            const restoreMount = document.getElementById('analytics-restore-mount');
            if (restoreMount) restoreMount.innerHTML = buildAnalyticsRestorePanelHtml();
        }

        function openAdminAnalytics() {
            if (!currentAdmin) {
                alert('سجّل دخول الإدارة أولاً.');
                return;
            }
            if (!requirePermission('audit', 'التحليلات متاحة لمن لديه صلاحية التدقيق / التقارير.')) return;
            document.getElementById('admin-dashboard').classList.add('show');
            renderAdminAnalyticsPanel().then(function() {
                scrollToDashboardSection('admin-analytics-hub');
            });
        }

        function refreshPublicSiteFromGovernance() {
            renderAllPublicCatalog();
            applyHeroBanner();
            applySiteLogoImages();
            applyOccasionTheme();
            renderOccasionPromoBar();
            refreshNebrasMiniShowcases();
            applyDynamicSectionContent(currentLang || 'ar');
            updateOfficialOrganizationSchema();
            if (typeof initStorefrontScrollReveal === 'function') initStorefrontScrollReveal();
        }

        function saveContentData(options) {
            saveSystemData(options || {});
            refreshPublicSiteFromGovernance();
            const scm = document.getElementById('site-content-management');
            if (scm && scm.classList.contains('show')) renderGovernanceStatusPanel();
        }

        window.saveContentData = saveContentData;
        window.refreshPublicSiteFromGovernance = refreshPublicSiteFromGovernance;

        /** خريطة حوكمة الـ15+ أيقونة — كل أيقونة مربوطة بوظيفة حقيقية على الموقع */
        const ADMIN_GOVERNANCE_TILE_REGISTRY = [
            { id: 'dash-content', publicEffect: 'منتجات المتجر · أيقونات الزوار · أقسام إضافية', handler: 'openSiteContentManager' },
            { id: 'dash-about-pages', publicEffect: 'بطاقات من نحن / رؤيتنا + محتوى داخلي', handler: 'openAboutContentAdmin' },
            { id: 'dash-certs', publicEffect: 'اعتمادات وشهادات في المعرض', handler: 'openCertificationsHub' },
            { id: 'dash-showroom', publicEffect: 'معرض منتجات ومشاريع نبراس', handler: 'openShowroomHub' },
            { id: 'dash-users', publicEffect: 'صلاحيات الدخول للإدارة', handler: 'openUserManagement' },
            { id: 'dash-audit', publicEffect: 'سجل العمليات الإدارية', handler: 'openAuditLog' },
            { id: 'dash-sales', publicEffect: 'عروض الأسعار الواردة من السلة', handler: 'openSalesManagement' },
            { id: 'dash-cs', publicEffect: 'خدمة العملاء CRM', handler: 'openCustomerServiceManagement' },
            { id: 'dash-complaints', publicEffect: 'شكاوى العملاء ومتابعتها', handler: 'openComplaintsManagement' },
            { id: 'dash-branches', publicEffect: 'فروع المملكة في الموقع', handler: 'openBranchesManagement' },
            { id: 'dash-erp', publicEffect: 'لوحة ERP الداخلية', handler: 'scrollErpHub' },
            { id: 'dash-inventory', publicEffect: 'مخزون SKU ومستودعات', handler: 'openErpInventory' },
            { id: 'dash-sales-report', publicEffect: 'تقارير المبيعات', handler: 'openSalesManagement' },
            { id: 'dash-customers', publicEffect: 'إدارة العملاء', handler: 'openCustomerServiceManagement' },
            { id: 'dash-analytics', publicEffect: 'تحليلات داخلية (زوار · منتجات · ألوان)', handler: 'openAdminAnalytics' },
            { id: 'dash-settings', publicEffect: 'بانر · بنوك · ضريبة · احتفال · سوشيال', handler: 'openSystemSettings' }
        ];

        function ensureDashboardGovernanceHandlers() {
            ADMIN_GOVERNANCE_TILE_REGISTRY.forEach(function(reg) {
                const tile = dashboardTiles.find(function(t) { return t.id === reg.id; });
                if (!tile) return;
                if (!tile.handler || tile.handler.indexOf('iconDetail:') === 0) {
                    tile.handler = reg.handler;
                }
                tile.visible = tile.visible !== false;
            });
        }

        function renderGovernanceStatusPanel() {
            const el = document.getElementById('scm-governance-status');
            if (!el || !currentAdmin) return;
            ensureDashboardGovernanceHandlers();
            const gatewayCount = (visitorIcons || []).filter(isGatewayVisitorIcon).length;
            const storeIconCount = (visitorIcons || []).filter(isStoreCatalogHubIcon).length;
            const productCount = (siteProducts || []).filter(function(p) { return p.visible !== false; }).length;
            const rows = [
                { ok: productCount > 0, label: 'منتجات المتجر (4 أقسام)', detail: productCount + ' منتج نشط' },
                { ok: storeIconCount >= 4, label: 'أيقونات المتجر الأربع (8–11)', detail: storeIconCount + ' أيقونة — حذف/إخفاء المنتج يُزيله تلقائياً' },
                { ok: gatewayCount > 0, label: 'أيقونات البوابة (خارجي)', detail: gatewayCount + ' أيقونة' },
                { ok: (sitePartners || []).length > 0, label: 'شركاء (مارquee)', detail: (sitePartners || []).length + ' شريك' },
                { ok: (siteCertifications || []).length >= 0, label: 'شهادات واعتمادات', detail: (siteCertifications || []).length + ' عنصر' },
                { ok: !!showroomGallery, label: 'معرض نبراس', detail: (function() {
                    if (!showroomGallery) return '—';
                    const p = (showroomGallery.products && showroomGallery.products.items) ? showroomGallery.products.items.length : 0;
                    const j = (showroomGallery.projects && showroomGallery.projects.items) ? showroomGallery.projects.items.length : 0;
                    return p + ' منتج · ' + j + ' مشروع';
                })() },
                { ok: (branchesData || []).length > 0, label: 'فروع المملكة', detail: (branchesData || []).length + ' فرع' },
                { ok: ADMIN_GOVERNANCE_TILE_REGISTRY.every(function(r) {
                    const t = dashboardTiles.find(function(x) { return x.id === r.id; });
                    return t && t.handler === r.handler;
                }), label: 'أيقونات الداشبورد (15+)', detail: 'كلها مربوطة بوظائف' }
            ];
            el.innerHTML = '<div class="scm-governance-status-inner">' +
                '<h4><i class="fas fa-shield-alt"></i> حالة الحوكمة — التعديل من الإدارة يظهر على الموقع فوراً</h4>' +
                '<ul class="scm-governance-checklist">' + rows.map(function(r) {
                    return '<li class="' + (r.ok ? 'is-ok' : 'is-pending') + '">' +
                        '<i class="fas fa-' + (r.ok ? 'check-circle' : 'clock') + '"></i> ' +
                        '<strong>' + escapeHtmlAttr(r.label) + '</strong> — ' + escapeHtmlAttr(r.detail) + '</li>';
                }).join('') + '</ul>' +
                '<p class="scm-hint">أي تعديل من «إدارة محتوى الموقع» أو الأيقونات الداخلية يُحفظ في السحابة/المتصفح ويُحدّث الواجهة العامة تلقائياً — بدون برمجة.</p></div>';
        }

        function mapCloudQuoteRow(row) {
            const p = row.payload && typeof row.payload === 'object' ? row.payload : {};
            let status = row.status || p.status || 'new';
            if (status === 'archived') status = 'closed';
            return Object.assign({
                id: p.id || String(row.id),
                cloudId: row.id,
                quoteNo: row.quote_number || p.quoteNo || '',
                status: status,
                at: p.at || (row.created_at ? new Date(row.created_at).getTime() : Date.now())
            }, p);
        }

        async function fetchSalesQuotesFromCloud() {
            if (!supabaseClient) return [];
            try {
                const { data, error } = await supabaseClient
                    .from('nebras_sales_quotes')
                    .select('id, quote_number, payload, status, created_at')
                    .order('created_at', { ascending: false })
                    .limit(80);
                if (error || !data) return [];
                return data.map(mapCloudQuoteRow);
            } catch (e) {
                return [];
            }
        }

        async function pushQuoteToNebrasCloud(entry) {
            if (!supabaseClient || !entry) return false;
            try {
                const payload = await prepareQuoteEntryForCloud(entry);
                const { error } = await supabaseClient.from('nebras_sales_quotes').insert({
                    quote_number: payload.quoteNo,
                    payload: payload,
                    status: 'new'
                });
                if (error) {
                    console.warn('Quote cloud insert failed:', error.message || error);
                    return false;
                }
                return true;
            } catch (err) {
                console.warn('Quote cloud insert error:', err);
                return false;
            }
        }

        async function updateQuoteStatusOnCloud(cloudId, status) {
            if (!supabaseClient || !cloudId) return false;
            const cloudStatus = status === 'closed' ? 'archived' : (status === 'reviewed' ? 'reviewed' : 'new');
            try {
                const { error } = await supabaseClient
                    .from('nebras_sales_quotes')
                    .update({ status: cloudStatus })
                    .eq('id', cloudId);
                return !error;
            } catch (e) {
                return false;
            }
        }

        function buildCartSnapshot() {
            const lang = currentLang || 'ar';
            return nebrasCart.map(function(l) {
                const copy = Object.assign({}, l);
                const product = siteProducts.find(function(p) { return p.id === copy.productId; });
                if (product) {
                    copy.productTitle = getLocalizedCatalogField(product, 'title', lang);
                    copy.catalogSyncedAt = Date.now();
                }
                return copy;
            });
        }

        function formatQuoteLinesForMessage(lines, lang) {
            const ui = siteText[lang] || siteText.ar;
            const pct = getNebrasVatPercentLabel();
            return (lines || []).map(function(l) {
                const specs = [l.color, l.size, l.type].filter(Boolean).join(' ');
                const unit = Number(l.unitPrice) || 0;
                const qty = Number(l.qty) || 1;
                const lineEx = unit * qty;
                const lineInc = unit > 0 ? priceIncVat(unit) * qty : 0;
                let pricePart = '';
                if (lineEx > 0) {
                    pricePart = ' — ' + formatSar(unit) + ' ' + (ui.cartUnitEx || 'وحدة قبل الضريبة') +
                        ' / ' + formatSar(priceIncVat(unit)) + ' ' + (ui.cartUnitInc || 'وحدة شامل الضريبة') +
                        ' | ' + formatSar(lineEx) + ' ' + (ui.priceExVatShort || 'قبل الضريبة') +
                        ' / ' + formatSar(lineInc) + ' ' + (ui.priceIncVatShort || 'شامل {pct}%').replace('{pct}', String(pct));
                }
                return '• ' + l.productTitle + (specs ? ' (' + specs + ')' : '') + ' ×' + qty + pricePart;
            }).join('\n');
        }

        function detectQuoteChannelFromLines(lines) {
            if (!Array.isArray(lines) || !lines.length) return 'store-cart';
            const hasDoorDesigner = lines.some(function(l) {
                return l && (l.productId === 'door-designer' || (l.meta && l.meta.source === 'door-designer'));
            });
            return hasDoorDesigner ? 'door-designer' : 'store-cart';
        }

        function extractDoorDesignerPayload(lines) {
            if (!Array.isArray(lines)) return null;
            const line = lines.find(function(l) {
                return l && (l.productId === 'door-designer' || (l.meta && l.meta.source === 'door-designer'));
            });
            if (!line) return null;
            return {
                spec: (line.meta && line.meta.designSpec) || line.color || '',
                image: (line.meta && line.meta.previewImage) || line.image || ''
            };
        }

        function normalizeSaPhoneE164(phone) {
            const raw = String(phone || '').replace(/\D/g, '');
            if (raw.length < 9) return '';
            if (raw.startsWith('0')) return '966' + raw.slice(1);
            if (!raw.startsWith('966')) return '966' + raw;
            return raw;
        }

        function phoneWhatsAppHref(phone, message) {
            const n = normalizeSaPhoneE164(phone);
            if (!n) return '';
            return 'https://wa.me/' + n + '?text=' + encodeURIComponent(message || '');
        }

        function salesPhoneWhatsAppHref(message) {
            return phoneWhatsAppHref(systemSettings.mainSalesPhone, message);
        }

        function customerServiceWhatsAppHref(message) {
            return phoneWhatsAppHref(systemSettings.customerServicePhone, message);
        }

        function openExternalMessagingUrl(url) {
            if (!url) return false;
            try {
                const w = window.open(url, '_blank', 'noopener,noreferrer');
                if (!w || w.closed) {
                    window.location.href = url;
                }
                return true;
            } catch (e) {
                window.location.href = url;
                return true;
            }
        }

        function isQuotePreviewOpen() {
            const overlay = document.getElementById('quote-print-overlay');
            return !!(overlay && overlay.classList.contains('show'));
        }

        function syncQuoteA4MobilePreviewScale() {
            const stage = document.getElementById('quote-a4-preview-stage');
            const doc = document.getElementById('quote-a4-document');
            if (!stage || !doc) return;
            if (!isQuotePreviewOpen()) {
                doc.style.transform = '';
                doc.style.transformOrigin = '';
                stage.style.height = '';
                stage.classList.remove('quote-a4-preview-stage--scaled');
                return;
            }
            const pad = 24;
            const avail = Math.min(window.innerWidth || 360, stage.clientWidth || window.innerWidth) - pad;
            const docW = doc.offsetWidth || doc.scrollWidth;
            if (!docW) return;
            const scale = Math.min(1, avail / docW);
            if (scale < 0.995) {
                doc.style.transform = 'scale(' + scale + ')';
                doc.style.transformOrigin = 'top center';
                stage.style.height = Math.ceil((doc.offsetHeight || doc.scrollHeight) * scale + 12) + 'px';
                stage.classList.add('quote-a4-preview-stage--scaled');
            } else {
                doc.style.transform = '';
                doc.style.transformOrigin = '';
                stage.style.height = '';
                stage.classList.remove('quote-a4-preview-stage--scaled');
            }
        }

        function getQuoteCaptureScale() {
            const w = window.innerWidth || 1024;
            const dpr = window.devicePixelRatio || 1;
            if (w <= 480) return Math.min(1.35, dpr);
            if (w <= 768) return Math.min(1.65, dpr);
            return Math.min(2.25, Math.max(1.75, dpr));
        }

        function buildQuoteA4WhatsAppMessage(entry, ui, lang) {
            if (!entry) return '';
            const isEn = lang === 'en';
            const isZh = lang === 'zh';
            const now = new Date(entry.at || Date.now());
            const dateStr = formatNebrasDateTime(now, lang, { dateStyle: 'long', timeStyle: 'short' });
            const pct = getNebrasVatPercentLabel();
            const companyName = isEn ? 'Nebras Plastic Factory Company' : (isZh ? 'Nebras 塑料工厂公司' : 'شركة مصنع نبراس للبلاستيك');
            const divider = '━━━━━━━━━━━━━━━━━━━━━━━━';
            const thin = '────────────────────────';
            let msg = divider + '\n';
            msg += '🏭 ' + companyName + '\n';
            msg += (isEn ? '📋 PRICE QUOTATION — A4 DOCUMENT' : (isZh ? '📋 报价单 — A4 文档' : '📋 عرض سعر — مستند A4')) + '\n';
            msg += (isEn ? 'Quote No: ' : (isZh ? '报价编号: ' : 'رقم العرض: ')) + entry.quoteNo + '\n';
            msg += divider + '\n\n';
            msg += '📅 ' + (isEn ? 'Date: ' : (isZh ? '日期: ' : 'التاريخ: ')) + dateStr + '\n';
            msg += '\n👤 ' + (ui.quoteCustomerTitle || (isEn ? 'Customer details' : (isZh ? '客户信息' : 'بيانات العميل'))) + '\n';
            msg += (isEn ? 'Name: ' : (isZh ? '姓名: ' : 'الاسم: ')) + (entry.customerName || '—') + '\n';
            msg += (isEn ? 'Phone: ' : (isZh ? '电话: ' : 'الجوال: ')) + (entry.phone || '—') + '\n';
            if (entry.email) msg += (isEn ? 'Email: ' : (isZh ? '邮箱: ' : 'البريد: ')) + entry.email + '\n';
            if (entry.city) msg += (isEn ? 'City: ' : (isZh ? '城市: ' : 'المدينة: ')) + entry.city + '\n';
            if (entry.address) msg += (isEn ? 'Delivery: ' : (isZh ? '地址: ' : 'العنوان / التسليم: ')) + entry.address + '\n';
            if (entry.note) msg += (isEn ? 'Notes: ' : (isZh ? '备注: ' : 'ملاحظات: ')) + entry.note + '\n';
            const designer = extractDoorDesignerPayload(entry.lines);
            if (designer && designer.spec) {
                msg += '\n🚪 ' + (isEn ? 'Custom door design — Nebras Studio' : (isZh ? '定制门 — Nebras 工作室' : 'تصميم الباب — استوديو نبراس')) + '\n';
                msg += designer.spec + '\n';
            }
            msg += '\n' + thin + '\n';
            msg += (isEn ? 'PRODUCTS TABLE' : (isZh ? '产品明细表' : 'جدول المنتجات')) + '\n';
            msg += thin + '\n';
            (entry.lines || []).forEach(function(line, n) {
                const specs = [line.color, line.size, line.type].filter(Boolean).join(' / ');
                const unit = Number(line.unitPrice) || 0;
                const qty = Number(line.qty) || 1;
                const lineEx = unit * qty;
                const lineInc = unit > 0 ? priceIncVat(unit) * qty : 0;
                msg += (n + 1) + ') ' + line.productTitle + '\n';
                if (specs) msg += '   ' + (isEn ? 'Specs: ' : (isZh ? '规格: ' : 'المواصفات: ')) + specs + '\n';
                msg += '   ' + (isEn ? 'Qty: ' : (isZh ? '数量: ' : 'الكمية: ')) + qty;
                if (lineEx > 0) {
                    msg += ' | ' + (isEn ? 'Ex VAT: ' : (isZh ? '不含税: ' : 'قبل الضريبة: ')) + formatSar(lineEx);
                    msg += ' | ' + (isEn ? 'Inc VAT: ' : (isZh ? '含税: ' : 'شامل الضريبة: ')) + formatSar(lineInc);
                }
                msg += '\n';
            });
            msg += '\n' + thin + '\n';
            msg += '💰 ' + (isEn ? 'TOTALS' : (isZh ? '合计' : 'الإجماليات')) + '\n';
            if (entry.subtotalExVat > 0) {
                msg += (isEn ? 'Subtotal (ex VAT): ' : (isZh ? '小计(不含税): ' : 'المجموع قبل الضريبة: ')) + formatSar(entry.subtotalExVat) + '\n';
                msg += (isEn ? 'VAT (' + pct + '%): ' : (isZh ? '增值税(' + pct + '%): ' : 'ضريبة (' + pct + '%): ')) + formatSar(entry.vatAmount) + '\n';
                msg += '★ ' + (isEn ? 'Total (inc VAT): ' : (isZh ? '总计(含税): ' : 'إجمالي شامل الضريبة: ')) + formatSar(entry.totalIncVat) + '\n';
            } else {
                msg += (isEn ? 'Pricing: On request' : (isZh ? '价格：询价' : 'الأسعار: عند الطلب')) + '\n';
            }
            if (entry.paymentBankIban) {
                msg += '\n🏦 ' + (isEn ? 'Payment IBAN: ' : (isZh ? '转账 IBAN: ' : 'حساب التحويل: ')) + entry.paymentBankIban + '\n';
            }
            if (entry.transferDeclared) {
                msg += '✓ ' + (isEn ? 'Transfer declared' : (isZh ? '已声明转账' : 'تم تأكيد التحويل')) + '\n';
            }
            msg += '\n' + divider + '\n';
            msg += (isEn ? 'Indicative A4 quotation — final confirmation by Nebras sales team.' :
                (isZh ? 'A4 参考报价 — 最终以销售团队确认为准。' : 'عرض سعر A4 استرشادي — التأكيد النهائي عبر فريق المبيعات.'));
            msg += '\n© ' + companyName;
            return msg;
        }

        function buildCartOrderWhatsAppMessage(entry, ui, lang) {
            if (!entry) return '';
            const isEn = lang === 'en';
            const isZh = lang === 'zh';
            const now = new Date(entry.at || Date.now());
            const dateStr = formatNebrasDateTime(now, lang, { dateStyle: 'medium', timeStyle: 'short' });
            const companyName = isEn ? 'Nebras Plastic Factory' : (isZh ? 'Nebras 工厂' : 'مصنع نبراس للبلاستيك');
            let msg = '╔══════════════════════════════╗\n';
            msg += isEn ? '║   🛒 PURCHASE ORDER — IN PROGRESS   ║\n' :
                isZh ? '║      🛒 采购订单 — 处理中      ║\n' :
                '║    🛒 طلب شراء — تحت التنفيذ     ║\n';
            msg += '╚══════════════════════════════╝\n\n';
            msg += '🏭 ' + companyName + '\n';
            msg += '🆔 ' + (isEn ? 'Order ref: ' : (isZh ? '订单号: ' : 'مرجع الطلب: ')) + entry.quoteNo + '\n';
            msg += '⏱️ ' + dateStr + '\n';
            msg += '📌 ' + (isEn ? 'Status: Pending sales confirmation' :
                (isZh ? '状态：待销售确认' : 'الحالة: بانتظار تأكيد المبيعات')) + '\n\n';
            msg += '━━━━ ' + (isEn ? 'CUSTOMER' : (isZh ? '客户' : 'العميل')) + ' ━━━━\n';
            msg += '👤 ' + (entry.customerName || '—') + '\n';
            msg += '📱 ' + (entry.phone || '—') + '\n';
            if (entry.city) msg += '📍 ' + entry.city + '\n';
            if (entry.address) msg += '🚚 ' + entry.address + '\n';
            msg += '\n━━━━ ' + (isEn ? 'ORDER ITEMS' : (isZh ? '订单明细' : 'أصناف الطلب')) + ' ━━━━\n';
            (entry.lines || []).forEach(function(line, n) {
                const specs = [line.color, line.size, line.type].filter(Boolean).join(' · ');
                const qty = Number(line.qty) || 1;
                const sku = line.sku || line.productId || '';
                msg += '\n[' + String(n + 1).padStart(2, '0') + '] ' + line.productTitle + '\n';
                if (sku) msg += '    SKU: ' + sku + '\n';
                if (specs) msg += '    ↳ ' + specs + '\n';
                msg += '    ↳ ' + (isEn ? 'Qty: ' : (isZh ? '数量: ' : 'الكمية: ')) + qty;
                const unit = Number(line.unitPrice) || 0;
                if (unit > 0) {
                    msg += ' · ' + formatSar(priceIncVat(unit) * qty) + (isEn ? ' inc VAT' : (isZh ? ' 含税' : ' شامل الضريبة'));
                }
                msg += '\n';
            });
            if (entry.totalIncVat > 0) {
                msg += '\n━━━━ ' + (isEn ? 'TOTAL' : (isZh ? '合计' : 'الإجمالي')) + ' ━━━━\n';
                msg += '💵 ' + formatSar(entry.totalIncVat) + (isEn ? ' (inc VAT)' : (isZh ? ' (含税)' : ' (شامل الضريبة)')) + '\n';
            }
            if (entry.note) msg += '\n📝 ' + entry.note + '\n';
            if (entry.paymentBankIban) msg += '\n🏦 IBAN: ' + entry.paymentBankIban + '\n';
            if (entry.transferDeclared) msg += '✓ ' + (isEn ? 'Transfer declared' : (isZh ? '已声明转账' : 'تم تأكيد التحويل')) + '\n';
            msg += '\n⚡ ' + (isEn ? 'Sent for processing & fulfillment' :
                (isZh ? '已发送以供跟进与执行' : 'يُرسل للمتابعة والتنفيذ')) + '\n';
            msg += '— Nebras';
            return msg;
        }

        function buildQuoteWhatsAppMessage(entry, ui, lang, format) {
            if (format === 'a4-quote' || isQuotePreviewOpen()) {
                return buildQuoteA4WhatsAppMessage(entry, ui, lang);
            }
            return buildCartOrderWhatsAppMessage(entry, ui, lang);
        }

        /** فتح واتساب — قناة واحدة أو أكثر — مع PDF/صورة A4 */
        async function deliverQuoteViaWhatsApp(message, channel, options) {
            options = options || {};
            const channels = Array.isArray(channel) ? channel : (channel ? [channel] : []);
            if (!channels.length) return [];
            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            let fullMessage = message || '';
            const pdfCloudUrl = options.pdfCloudUrl || options.imageCloudUrl || '';
            const pdfBlob = options.pdfBlob || null;
            const fileName = options.fileName || 'nebras-quote-a4.pdf';
            const mimeType = options.mimeType || (pdfBlob && pdfBlob.type) || 'application/pdf';
            if (pdfCloudUrl) {
                fullMessage += '\n\n📄 ' + (options.pdfLinkLabel || ui.quotePdfLinkLabel || ui.quoteImageLinkLabel || 'عرض السعر PDF (A4):') + '\n' + pdfCloudUrl;
            }
            if (pdfBlob && typeof navigator.share === 'function') {
                const shared = await tryShareQuoteDocument(fullMessage, pdfBlob, fileName, mimeType);
                if (shared) return channels.slice();
            }
            const sameNumber = normalizeSaPhoneE164(systemSettings.mainSalesPhone) === normalizeSaPhoneE164(systemSettings.customerServicePhone);
            const toOpen = channels.filter(function(ch, idx, arr) {
                if (ch === 'customer-service' && sameNumber && arr.indexOf('sales') >= 0 && arr.indexOf('sales') < idx) return false;
                return true;
            });
            toOpen.forEach(function(ch, idx) {
                setTimeout(function() {
                    const url = ch === 'customer-service'
                        ? customerServiceWhatsAppHref(fullMessage)
                        : salesPhoneWhatsAppHref(fullMessage);
                    if (url) openExternalMessagingUrl(url);
                }, idx * 900);
            });
            if (pdfBlob) {
                triggerQuoteFileDownload(pdfBlob, fileName);
            } else if (options.imageDataUrl) {
                triggerQuoteFileDownload(options.imageDataUrl, (fileName || 'nebras-quote-a4').replace(/\.pdf$/i, '') + '.png');
            }
            return channels.slice();
        }

        function loadJsPdfLib() {
            return new Promise(function(resolve, reject) {
                if (window.jspdf && window.jspdf.jsPDF) {
                    resolve(window.jspdf.jsPDF);
                    return;
                }
                const existing = document.querySelector('script[data-nebras-jspdf]');
                if (existing) {
                    existing.addEventListener('load', function() { resolve(window.jspdf && window.jspdf.jsPDF); });
                    existing.addEventListener('error', reject);
                    return;
                }
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
                s.defer = true;
                s.setAttribute('data-nebras-jspdf', '1');
                s.onload = function() { resolve(window.jspdf && window.jspdf.jsPDF); };
                s.onerror = reject;
                document.head.appendChild(s);
            });
        }

        function getDataUrlImageSize(dataUrl) {
            return new Promise(function(resolve) {
                const img = new Image();
                img.onload = function() {
                    resolve({ w: img.naturalWidth || 794, h: img.naturalHeight || 1123 });
                };
                img.onerror = function() {
                    resolve({ w: 794, h: 1123 });
                };
                img.src = dataUrl;
            });
        }

        async function captureQuoteA4AsPdfBlob() {
            const pngDataUrl = await captureQuoteA4AsPngDataUrl();
            if (!pngDataUrl) return null;
            try {
                const jsPDF = await loadJsPdfLib();
                if (!jsPDF) return null;
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
                const pageW = pdf.internal.pageSize.getWidth();
                const pageH = pdf.internal.pageSize.getHeight();
                const imgDims = await getDataUrlImageSize(pngDataUrl);
                const margin = 6;
                const maxW = pageW - margin * 2;
                const maxH = pageH - margin * 2;
                const pxToMm = 0.264583;
                let imgW = imgDims.w * pxToMm;
                let imgH = imgDims.h * pxToMm;
                const ratio = Math.min(maxW / imgW, maxH / imgH, 1);
                imgW *= ratio;
                imgH *= ratio;
                pdf.addImage(pngDataUrl, 'PNG', (pageW - imgW) / 2, margin, imgW, imgH);
                return pdf.output('blob');
            } catch (pdfErr) {
                console.warn('Quote A4 PDF failed:', pdfErr);
                return null;
            }
        }

        function ensureQuoteA4Rendered() {
            return new Promise(function(resolve) {
                if (!nebrasCart.length) {
                    resolve(false);
                    return;
                }
                const doc = document.getElementById('quote-a4-document');
                const overlay = document.getElementById('quote-print-overlay');
                if (!doc || !overlay) {
                    resolve(false);
                    return;
                }
                readCheckoutFormToProfile();
                if (!currentQuoteIssue || !currentQuoteIssue.quoteNo) {
                    currentQuoteIssue = issueNextQuoteNumber();
                }
                resolveSiteLogoUrl(function(logoUrl) {
                    renderQuotePreviewDocument(doc, overlay, logoUrl);
                    overlay.classList.add('show');
                    waitForQuoteDocumentImages(doc).then(function() {
                        setTimeout(function() { resolve(true); }, 350);
                    });
                });
            });
        }

        function refreshQuotePreviewLive() {
            if (!isQuotePreviewOpen() || !nebrasCart.length) return;
            const doc = document.getElementById('quote-a4-document');
            const overlay = document.getElementById('quote-print-overlay');
            if (!doc || !overlay) return;
            readCheckoutFormToProfile();
            resolveSiteLogoUrl(function(logoUrl) {
                renderQuotePreviewDocument(doc, overlay, logoUrl);
            });
        }

        async function uploadQuotePdfBlob(pdfBlob, quoteNo) {
            if (!pdfBlob || !supabaseClient) return '';
            const fileName = (quoteNo || 'quote') + '-a4.pdf';
            const file = pdfBlob instanceof File ? pdfBlob : new File([pdfBlob], fileName, { type: 'application/pdf' });
            return (await uploadNebrasMediaFile(file)) || '';
        }

        function loadHtml2CanvasLib() {
            return new Promise(function(resolve, reject) {
                if (typeof window.html2canvas === 'function') {
                    resolve(window.html2canvas);
                    return;
                }
                const existing = document.querySelector('script[data-nebras-html2canvas]');
                if (existing) {
                    existing.addEventListener('load', function() { resolve(window.html2canvas); });
                    existing.addEventListener('error', reject);
                    return;
                }
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
                s.defer = true;
                s.setAttribute('data-nebras-html2canvas', '1');
                s.onload = function() { resolve(window.html2canvas); };
                s.onerror = reject;
                document.head.appendChild(s);
            });
        }

        function waitForQuoteDocumentImages(doc, timeoutMs) {
            timeoutMs = timeoutMs || 4000;
            const imgs = doc ? Array.prototype.slice.call(doc.querySelectorAll('img')) : [];
            if (!imgs.length) return Promise.resolve();
            return Promise.race([
                Promise.all(imgs.map(function(img) {
                    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
                    return new Promise(function(res) {
                        img.onload = res;
                        img.onerror = res;
                    });
                })),
                new Promise(function(res) { setTimeout(res, timeoutMs); })
            ]);
        }

        async function captureQuoteA4AsPngDataUrl() {
            const doc = document.getElementById('quote-a4-document');
            if (!doc || !doc.innerHTML.trim()) return '';
            await waitForQuoteDocumentImages(doc);
            const prevTransform = doc.style.transform;
            const prevOrigin = doc.style.transformOrigin;
            doc.style.transform = 'none';
            doc.style.transformOrigin = '';
            try {
                const html2canvas = await loadHtml2CanvasLib();
                const canvas = await html2canvas(doc, {
                    scale: getQuoteCaptureScale(),
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                    width: doc.scrollWidth,
                    height: doc.scrollHeight,
                    windowWidth: doc.scrollWidth,
                    windowHeight: doc.scrollHeight
                });
                return canvas.toDataURL('image/png', 0.92);
            } catch (capErr) {
                console.warn('Quote A4 capture failed:', capErr);
                return '';
            } finally {
                doc.style.transform = prevTransform;
                doc.style.transformOrigin = prevOrigin;
                syncQuoteA4MobilePreviewScale();
            }
        }

        async function tryShareQuoteDocument(text, fileOrDataUrl, fileName, mimeType) {
            if (!fileOrDataUrl || typeof navigator.share !== 'function') return false;
            try {
                let file = null;
                if (fileOrDataUrl instanceof Blob) {
                    file = fileOrDataUrl instanceof File ? fileOrDataUrl : new File([fileOrDataUrl], fileName || 'nebras-quote-a4.pdf', { type: mimeType || fileOrDataUrl.type || 'application/pdf' });
                } else if (String(fileOrDataUrl).indexOf('data:') === 0) {
                    const blob = await fetch(fileOrDataUrl).then(function(r) { return r.blob(); });
                    file = new File([blob], fileName || 'nebras-quote-a4.png', { type: mimeType || blob.type || 'image/png' });
                }
                if (!file) return false;
                const payload = { text: text || '', title: fileName || 'Nebras Quote A4' };
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    payload.files = [file];
                } else if (!navigator.canShare) {
                    payload.files = [file];
                } else {
                    return false;
                }
                await navigator.share(payload);
                return true;
            } catch (shareErr) {
                return false;
            }
        }

        function triggerQuoteFileDownload(fileOrDataUrl, fileName) {
            try {
                const a = document.createElement('a');
                if (fileOrDataUrl instanceof Blob) {
                    a.href = URL.createObjectURL(fileOrDataUrl);
                    a.download = (fileName || 'nebras-quote-a4.pdf').replace(/[^\w\-.\u0600-\u06FF]+/g, '_');
                    if (a.download.indexOf('.') === -1) a.download += '.pdf';
                } else if (String(fileOrDataUrl).indexOf('data:') === 0) {
                    a.href = fileOrDataUrl;
                    a.download = (fileName || 'nebras-quote-a4').replace(/[^\w\-.\u0600-\u06FF]+/g, '_') + '.png';
                } else {
                    return;
                }
                a.rel = 'noopener';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                if (fileOrDataUrl instanceof Blob) {
                    setTimeout(function() { URL.revokeObjectURL(a.href); }, 4000);
                }
            } catch (dlErr) { /* ignore */ }
        }

        function triggerQuoteImageDownload(dataUrl, fileName) {
            triggerQuoteFileDownload(dataUrl, fileName);
        }

        function renderCartOrderPreview() {
            const el = document.getElementById('cart-order-preview');
            if (!el) return;
            const lang = currentLang || 'ar';
            const ui = siteText[lang] || siteText.ar;
            if (!nebrasCart.length) {
                el.hidden = true;
                el.innerHTML = '';
                return;
            }
            const profile = readCheckoutFormToProfile();
            const totals = calcCartTotals();
            const isEn = lang === 'en';
            const isZh = lang === 'zh';
            const statusText = isEn ? 'In progress — pending confirmation' : (isZh ? '处理中 — 待确认' : 'تحت التنفيذ — بانتظار التأكيد');
            const itemsHtml = nebrasCart.map(function(line, n) {
                return '<li class="cart-order-preview-item">' +
                    '<span class="cart-order-preview-num">' + String(n + 1).padStart(2, '0') + '</span>' +
                    '<span class="cart-order-preview-name">' + escapeHtmlAttr(line.productTitle) + '</span>' +
                    '<span class="cart-order-preview-qty">×' + (line.qty || 1) + '</span></li>';
            }).join('');
            el.innerHTML =
                '<div class="cart-order-preview-head">' +
                '<span class="cart-order-preview-badge"><i class="fas fa-clipboard-list"></i> ' +
                escapeHtmlAttr(ui.cartOrderPreviewTitle || 'طلب شراء — تحت التنفيذ') + '</span>' +
                '<span class="cart-order-preview-status">' + escapeHtmlAttr(statusText) + '</span></div>' +
                (profile.customerName ? '<p class="cart-order-preview-customer"><i class="fas fa-user"></i> ' +
                    escapeHtmlAttr(profile.customerName) + '</p>' : '') +
                '<ul class="cart-order-preview-list">' + itemsHtml + '</ul>' +
                (totals.totalInc > 0 ? '<p class="cart-order-preview-total">' +
                    escapeHtmlAttr(ui.cartProductsTotalInc || 'إجمالي المنتجات شامل الضريبة: ') + formatSar(totals.totalInc) + '</p>' : '');
            el.hidden = false;
        }

        async function submitQuoteA4Pdf(sendMode) {
            sendMode = sendMode || 'both';
            if (quotePdfSubmitInFlight) return;
            const channels = sendMode === 'both' ? ['sales', 'customer-service'] : [sendMode];
            if (channels.indexOf('sales') < 0 && channels.indexOf('customer-service') < 0) return;
            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            if (!nebrasCart.length) {
                alert(ui.cartEmpty || 'أضف منتجات إلى السلة أولاً.');
                return;
            }
            readCheckoutFormToProfile();
            const validation = validateCheckoutProfile(readCheckoutFormToProfile(), ui);
            if (!validation.ok) {
                showCheckoutValidationErrors(validation.errors, ui, true);
                return;
            }
            const profile = validation.profile;
            const payment = readCartPaymentFromForm();
            if (!currentQuoteIssue || !currentQuoteIssue.quoteNo) {
                let confirmMsg = sendMode === 'both'
                    ? (ui.sendQuoteA4BothConfirm || 'إرسال عرض السعر A4 (PDF) للمبيعات وخدمة العملاء؟')
                    : (sendMode === 'sales' ? ui.sendQuoteA4SalesConfirm : ui.sendQuoteA4CsConfirm);
                confirmMsg += '\n\n' + (ui.sendQuoteA4PdfHint || 'سيتم توليد PDF A4 وإرساله عبر واتساب') + '\n\n';
                confirmMsg += formatQuoteLinesForMessage(nebrasCart, currentLang);
                if (payment.bankIban) {
                    confirmMsg += '\n\n' + (ui.cartPaymentConfirmBank || 'الحساب: ') + payment.bankIban;
                }
                if (payment.receiptDataUrl) {
                    confirmMsg += '\n' + (ui.cartPaymentReceiptAttached || '✓ مرفق: صورة الحوالة');
                }
                if (!confirm(confirmMsg)) return;
                currentQuoteIssue = issueNextQuoteNumber();
            }
            quotePdfSubmitInFlight = true;
            setQuoteActionLoading(true, sendMode);
            try {
            closeCartDrawer();
            const rendered = await ensureQuoteA4Rendered();
            if (!rendered) {
                alert(ui.sendQuoteA4RenderFail || 'تعذّر تجهيز مستند A4 — أعدي المحاولة.');
                return;
            }
            const pdfBlob = await captureQuoteA4AsPdfBlob();
            if (!pdfBlob) {
                alert(ui.sendQuoteA4PdfFail || 'تعذّر إنشاء PDF — تحققي من الاتصال وأعدي المحاولة.');
                return;
            }
            const pdfFileName = (currentQuoteIssue.quoteNo || 'quote') + '-a4.pdf';
            const pdfCloudUrl = await uploadQuotePdfBlob(pdfBlob, currentQuoteIssue.quoteNo);
            const cartTotals = calcCartTotals();
            const quoteChannel = detectQuoteChannelFromLines(nebrasCart);
            const designerPayload = extractDoorDesignerPayload(nebrasCart);
            const entry = {
                id: 'sq-' + Date.now(),
                quoteNo: currentQuoteIssue.quoteNo,
                status: 'new',
                at: Date.now(),
                lang: currentLang || 'ar',
                sessionId: getVisitorSessionId(),
                customerName: profile.customerName,
                phone: profile.phone,
                email: profile.email || '',
                city: profile.city || '',
                address: profile.address || '',
                note: profile.note || '',
                lines: buildCartSnapshot(),
                total: cartTotals.subtotalEx,
                subtotalExVat: cartTotals.subtotalEx,
                vatAmount: cartTotals.vatAmount,
                totalIncVat: cartTotals.totalInc,
                vatRate: cartTotals.vatRate,
                quoteChannel: quoteChannel,
                quoteKind: quoteChannel === 'door-designer' ? 'custom-door-design' : 'store-cart',
                quoteType: 'quote',
                messageFormat: 'a4-quote-pdf',
                sentToChannel: sendMode,
                quoteDocumentPdfUrl: pdfCloudUrl || '',
                quoteDocumentCloudUrl: pdfCloudUrl || '',
                adminDailyIssued: currentQuoteIssue ? currentQuoteIssue.todayIssued : null,
                adminDailyFinalized: currentQuoteIssue ? currentQuoteIssue.todayFinalized : null,
                catalogProductCount: (siteProducts || []).filter(function(p) { return p && p.visible !== false && productHasShop(p); }).length,
                catalogVariantCount: (siteProducts || []).reduce(function(n, p) {
                    return n + (productHasShop(p) ? (p.variants || []).length : 0);
                }, 0),
                doorDesignerSpec: designerPayload ? designerPayload.spec : '',
                doorDesignerImage: designerPayload ? designerPayload.image : '',
                paymentBankId: payment.bankId || '',
                paymentBankIban: payment.bankIban || '',
                paymentBankNameAr: payment.bankNameAr || '',
                paymentBankNameEn: payment.bankNameEn || '',
                transferDeclared: !!payment.transferDeclared,
                transferReceiptDataUrl: payment.receiptDataUrl || '',
                transferReceiptFileName: payment.receiptFileName || ''
            };
            const inbox = loadSalesQuotesInbox();
            inbox.unshift(entry);
            try {
                saveSalesQuotesInbox(inbox);
            } catch (saveErr) {
                alert('تعذّر حفظ الطلب — جرّبي صورة أصغر للحوالة أو أعدي المحاولة.');
                return;
            }
            const msg = buildQuoteA4WhatsAppMessage(entry, ui, currentLang);
            const waChannels = await deliverQuoteViaWhatsApp(msg, channels, {
                pdfBlob: pdfBlob,
                pdfCloudUrl: pdfCloudUrl,
                fileName: pdfFileName,
                pdfLinkLabel: ui.quotePdfLinkLabel,
                mimeType: 'application/pdf'
            });
            entry.notifyChannels = waChannels;
            entry.notifiedSalesPhone = channels.indexOf('sales') >= 0 ? (systemSettings.mainSalesPhone || '') : '';
            entry.notifiedCustomerServicePhone = channels.indexOf('customer-service') >= 0 ? (systemSettings.customerServicePhone || '') : '';
            const cloudOk = await pushQuoteToNebrasCloud(entry);
            if (entry.transferReceiptCloudUrl || entry.quoteDocumentPdfUrl) {
                const refreshed = loadSalesQuotesInbox();
                const saved = refreshed.find(function(e) { return e.id === entry.id; });
                if (saved) {
                    if (entry.transferReceiptCloudUrl) saved.transferReceiptCloudUrl = entry.transferReceiptCloudUrl;
                    if (entry.quoteDocumentPdfUrl) {
                        saved.quoteDocumentPdfUrl = entry.quoteDocumentPdfUrl;
                        saved.quoteDocumentCloudUrl = entry.quoteDocumentPdfUrl;
                    }
                    saveSalesQuotesInbox(refreshed);
                }
            }
            updateSalesInboxBadge();
            if (currentAdmin && canManage('sales')) displaySalesQuotesInbox();
            if (currentAdmin && canManage('audit')) renderAdminAnalyticsPanel();
            if (currentAdmin) addAuditLog('عرض سعر PDF A4', entry.quoteNo + ' → ' + sendMode);
            let doneMsg = (ui.sendQuoteA4Done || 'تم إرسال عرض السعر A4 (PDF). الرقم:') + ' ' + entry.quoteNo;
            if (channels.indexOf('sales') >= 0) {
                doneMsg += '\n📞 ' + (ui.salesHotlineLabel || 'المبيعات:') + ' ' + (systemSettings.mainSalesPhone || '');
            }
            if (channels.indexOf('customer-service') >= 0) {
                doneMsg += '\n📞 ' + (ui.customerHotlineLabel || 'خدمة العملاء:') + ' ' + (systemSettings.customerServicePhone || '');
            }
            if (pdfCloudUrl) doneMsg += '\n📄 PDF: ' + pdfCloudUrl;
            doneMsg += '\n\n' + (ui.sendQuoteWaHint || 'اضغط «إرسال» في واتساب — وأرفقي PDF إن لزم.');
            if (!cloudOk) {
                doneMsg += '\n\n' + (ui.sendQuoteCloudWarn || '(تم الحفظ محلياً — تحققي من اتصال Supabase.)');
            } else {
                doneMsg += '\n\n✓ ' + (ui.sendQuoteCloudOk || 'الطلب محفوظ في الإدارة.');
            }
            alert(doneMsg);
            } catch (submitErr) {
                console.error('submitQuoteA4Pdf failed:', submitErr);
                alert((ui.sendQuoteA4PdfFail || 'تعذّر إرسال عرض السعر.') + '\n' + (submitErr && submitErr.message ? submitErr.message : ''));
            } finally {
                quotePdfSubmitInFlight = false;
                setQuoteActionLoading(false, sendMode);
            }
        }

        async function submitCartOrQuote(channel) {
            if (channel !== 'sales' && channel !== 'customer-service') return;
            if (isQuotePreviewOpen()) {
                return submitQuoteA4Pdf(channel);
            }
            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            const isA4 = isQuotePreviewOpen();
            const messageFormat = isA4 ? 'a4-quote' : 'cart-order';
            const channelLabel = channel === 'customer-service'
                ? (ui.cartSendCsBtn || 'خدمة العملاء')
                : (ui.cartSendSalesBtn || 'المبيعات');
            if (!nebrasCart.length) {
                alert(ui.cartEmpty || 'أضف منتجات إلى السلة أولاً.');
                return;
            }
            const validation = validateCheckoutProfile(readCheckoutFormToProfile(), ui);
            if (!validation.ok) {
                openCartDrawer();
                setCartCheckoutStatus(validation.errors.join(' '), true);
                return;
            }
            const profile = validation.profile;
            const payment = readCartPaymentFromForm();
            if (!currentQuoteIssue || !currentQuoteIssue.quoteNo) {
                let confirmMsg = isA4
                    ? (channel === 'sales' ? ui.sendQuoteA4SalesConfirm : ui.sendQuoteA4CsConfirm)
                    : (channel === 'sales' ? ui.sendOrderSalesConfirm : ui.sendOrderCsConfirm);
                confirmMsg = (confirmMsg || ('إرسال إلى ' + channelLabel + '؟')) + '\n\n';
                if (isA4) {
                    confirmMsg += (ui.sendQuoteA4Hint || 'سيتم إرسال عرض السعر بصيغة A4') + '\n';
                    confirmMsg += (ui.sendQuoteA4ImageHint || 'مع صورة المستند A4 (نفس المعاينة)') + '\n\n';
                } else {
                    confirmMsg += (ui.sendOrderHint || 'سيتم إرسال أوردر تحت التنفيذ') + '\n\n';
                }
                confirmMsg += formatQuoteLinesForMessage(nebrasCart, currentLang);
                if (payment.bankIban) {
                    confirmMsg += '\n\n' + (ui.cartPaymentConfirmBank || 'الحساب: ') + payment.bankIban;
                }
                if (payment.receiptDataUrl) {
                    confirmMsg += '\n' + (ui.cartPaymentReceiptAttached || '✓ مرفق: صورة الحوالة');
                }
                if (!confirm(confirmMsg)) return;
                currentQuoteIssue = issueNextQuoteNumber();
            }
            const cartTotals = calcCartTotals();
            const quoteChannel = detectQuoteChannelFromLines(nebrasCart);
            const designerPayload = extractDoorDesignerPayload(nebrasCart);
            const entry = {
                id: 'sq-' + Date.now(),
                quoteNo: currentQuoteIssue.quoteNo,
                status: 'new',
                at: Date.now(),
                lang: currentLang || 'ar',
                sessionId: getVisitorSessionId(),
                customerName: profile.customerName,
                phone: profile.phone,
                email: profile.email || '',
                city: profile.city || '',
                address: profile.address || '',
                note: profile.note || '',
                lines: buildCartSnapshot(),
                total: cartTotals.subtotalEx,
                subtotalExVat: cartTotals.subtotalEx,
                vatAmount: cartTotals.vatAmount,
                totalIncVat: cartTotals.totalInc,
                vatRate: cartTotals.vatRate,
                quoteChannel: quoteChannel,
                quoteKind: quoteChannel === 'door-designer' ? 'custom-door-design' : 'store-cart',
                quoteType: isA4 ? 'quote' : 'order',
                messageFormat: messageFormat,
                sentToChannel: channel,
                adminDailyIssued: currentQuoteIssue ? currentQuoteIssue.todayIssued : null,
                adminDailyFinalized: currentQuoteIssue ? currentQuoteIssue.todayFinalized : null,
                catalogProductCount: (siteProducts || []).filter(function(p) { return p && p.visible !== false && productHasShop(p); }).length,
                catalogVariantCount: (siteProducts || []).reduce(function(n, p) {
                    return n + (productHasShop(p) ? (p.variants || []).length : 0);
                }, 0),
                doorDesignerSpec: designerPayload ? designerPayload.spec : '',
                doorDesignerImage: designerPayload ? designerPayload.image : '',
                paymentBankId: payment.bankId || '',
                paymentBankIban: payment.bankIban || '',
                paymentBankNameAr: payment.bankNameAr || '',
                paymentBankNameEn: payment.bankNameEn || '',
                transferDeclared: !!payment.transferDeclared,
                transferReceiptDataUrl: payment.receiptDataUrl || '',
                transferReceiptFileName: payment.receiptFileName || ''
            };
            const inbox = loadSalesQuotesInbox();
            inbox.unshift(entry);
            try {
                saveSalesQuotesInbox(inbox);
            } catch (saveErr) {
                alert('تعذّر حفظ الطلب — جرّبي صورة أصغر للحوالة أو أعدي المحاولة.');
                return;
            }
            const msg = buildQuoteWhatsAppMessage(entry, ui, currentLang, messageFormat);
            const waChannels = await deliverQuoteViaWhatsApp(msg, channel, {});
            entry.notifyChannels = waChannels;
            entry.notifiedSalesPhone = channel === 'sales' ? (systemSettings.mainSalesPhone || '') : '';
            entry.notifiedCustomerServicePhone = channel === 'customer-service' ? (systemSettings.customerServicePhone || '') : '';
            const cloudOk = await pushQuoteToNebrasCloud(entry);
            if (entry.transferReceiptCloudUrl) {
                const refreshed = loadSalesQuotesInbox();
                const saved = refreshed.find(function(e) { return e.id === entry.id; });
                if (saved) {
                    saved.transferReceiptCloudUrl = entry.transferReceiptCloudUrl;
                    saveSalesQuotesInbox(refreshed);
                }
            }
            updateSalesInboxBadge();
            if (currentAdmin && canManage('sales')) {
                displaySalesQuotesInbox();
            }
            if (currentAdmin && canManage('audit')) {
                renderAdminAnalyticsPanel();
            }
            if (currentAdmin) {
                addAuditLog(isA4 ? 'عرض سعر A4 وارد' : 'طلب سلة وارد', entry.quoteNo + ' → ' + channelLabel);
            }
            const doneBase = channel === 'customer-service'
                ? (ui.sendQuoteDoneCs || 'تم حفظ الطلب وإرساله لخدمة العملاء. الرقم:')
                : (ui.sendQuoteDoneSales || 'تم حفظ الطلب وإرساله للمبيعات. الرقم:');
            let doneMsg = doneBase + ' ' + entry.quoteNo;
            if (isA4) {
                doneMsg += '\n📄 ' + (ui.sendQuoteA4Sent || 'صيغة A4');
            } else {
                doneMsg += '\n🛒 ' + (ui.sendOrderSent || 'أوردر تحت التنفيذ');
            }
            const phoneShown = channel === 'customer-service'
                ? systemSettings.customerServicePhone
                : systemSettings.mainSalesPhone;
            doneMsg += '\n📞 ' + channelLabel + ': ' + (phoneShown || '');
            doneMsg += '\n\n' + (ui.sendQuoteWaHint || 'اضغط «إرسال» في واتساب لإتمام الطلب.');
            if (entry.transferReceiptDataUrl) {
                doneMsg += '\n\n' + (ui.sendQuoteReceiptSent || '✓ تم إرسال صورة إيصال الحوالة مع الطلب — ستظهر في تقرير الإدارة.');
            } else if (entry.transferDeclared) {
                doneMsg += '\n\n' + (ui.sendQuoteTransferDeclared || '✓ تم تسجيل تأكيد التحويل — أرفقي الإيصال لاحقاً من السلة إن لزم.');
            }
            if (!cloudOk) {
                doneMsg += '\n\n' + (ui.sendQuoteCloudWarn || '(تم الحفظ محلياً — تحققي من اتصال Supabase لظهور الطلب عند كل الإدارة.)');
            } else {
                doneMsg += '\n\n✓ ' + (ui.sendQuoteCloudOk || 'الطلب محفوظ ويظهر في: المبيعات → طلبات عروض الأسعار + التحليلات.');
            }
            alert(doneMsg);
        }

        function updateSalesQuoteFab() {
            const group = document.getElementById('fab-send-channel-group');
            const legacyFab = document.getElementById('fab-send-quote-sales');
            const show = nebrasCart.length > 0;
            if (group) group.classList.toggle('show', show);
            if (legacyFab) legacyFab.classList.toggle('show', show);
        }

        async function displaySalesQuotesInbox() {
            const list = document.getElementById('sales-quotes-inbox-list');
            if (!list) return;
            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            list.innerHTML = '<li style="opacity:0.7;">' + escapeHtmlAttr(ui.salesInboxLoading || 'جاري تحميل الطلبات…') + '</li>';
            const cloudInbox = await fetchSalesQuotesFromCloud();
            const localInbox = loadSalesQuotesInbox();
            const merged = [];
            const seen = {};
            cloudInbox.concat(localInbox).forEach(function(e) {
                const key = e.quoteNo || e.id;
                if (seen[key]) return;
                seen[key] = true;
                merged.push(e);
            });
            merged.sort(function(a, b) { return (b.at || 0) - (a.at || 0); });
            if (!merged.length) {
                list.innerHTML = '<li>' + escapeHtmlAttr(ui.salesInboxEmpty || 'لا طلبات عروض أسعار بعد.') + '</li>';
                return;
            }
            list.innerHTML = merged.map(function(e) {
                const when = formatNebrasDateTime(e.at, currentLang);
                const linesSummary = (e.lines || []).length + ' ' + (ui.salesInboxLines || 'صنف');
                const isDesigner = (e.quoteChannel || '') === 'door-designer';
                const entryKey = String(e.id).replace(/'/g, "\\'");
                const channelBadge = isDesigner ? ' <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#0f766e;color:#fff;font-size:0.72rem;">صمّم بابك</span>' : '';
                const formatBadge = (e.messageFormat === 'a4-quote' || e.messageFormat === 'a4-quote-pdf')
                    ? ' <span class="sales-inbox-format-badge sales-inbox-format-badge--a4">A4</span>'
                    : (e.messageFormat === 'cart-order' ? ' <span class="sales-inbox-format-badge">ORDER</span>' : '');
                const adminStats = (e.adminDailyIssued != null)
                    ? ('<br><small class="sales-quote-admin-stats">📊 ' + escapeHtmlAttr(ui.salesInboxAdminStats || 'إداري اليوم:') + ' ' +
                        escapeHtmlAttr(String(e.adminDailyIssued)) + ' ' + escapeHtmlAttr(ui.salesInboxAdminIssued || 'صادر') + ' · ' +
                        escapeHtmlAttr(String(e.adminDailyFinalized != null ? e.adminDailyFinalized : 0)) + ' ' +
                        escapeHtmlAttr(ui.salesInboxAdminFinalized || 'منفّذ') + '</small>')
                    : '';
                const quoteDocUrl = e.quoteDocumentPdfUrl || e.quoteDocumentCloudUrl || e.quoteDocumentDataUrl || '';
                const isPdfDoc = quoteDocUrl && /\.pdf(\?|$)/i.test(quoteDocUrl);
                const quoteDocThumb = quoteDocUrl && (e.messageFormat === 'a4-quote' || e.messageFormat === 'a4-quote-pdf' || e.quoteType === 'quote')
                    ? ('<br><div class="sales-quote-doc-inline">' +
                        (isPdfDoc
                            ? '<span class="sales-quote-doc-pdf-icon"><i class="fas fa-file-pdf"></i></span>'
                            : '<img src="' + escapeHtmlAttr(quoteDocUrl) + '" alt="" loading="lazy" onclick="event.preventDefault();viewSalesQuoteDocument(\'' + entryKey + '\')">') +
                        '<a href="#" onclick="event.preventDefault();viewSalesQuoteDocument(\'' + entryKey + '\')">' + escapeHtmlAttr(ui.salesInboxQuoteDoc || 'عرض مستند A4') + '</a></div>')
                    : '';
                const transferBadge = e.transferReceiptDataUrl
                    ? ' <span class="sales-inbox-transfer-badge sales-inbox-transfer-badge--receipt"><i class="fas fa-receipt"></i> ' + escapeHtmlAttr(ui.salesInboxTransferReceipt || 'حوالة + إيصال') + '</span>'
                    : (e.transferDeclared ? ' <span class="sales-inbox-transfer-badge"><i class="fas fa-check"></i> ' + escapeHtmlAttr(ui.salesInboxTransferDeclared || 'تحويل مُعلَن') + '</span>' : '');
                const doorThumb = (isDesigner && e.doorDesignerImage)
                    ? ('<div class="sales-quote-door-thumb"><img src="' + escapeHtmlAttr(e.doorDesignerImage) + '" alt="" loading="lazy"></div>')
                    : '';
                const cloudAttr = e.cloudId ? ' data-cloud-id="' + escapeHtmlAttr(e.cloudId) + '"' : '';
                return '<li class="sales-quote-inbox-item" data-status="' + escapeHtmlAttr(e.status || 'new') + '"' + cloudAttr + ' data-entry-id="' + escapeHtmlAttr(e.id) + '">' +
                    doorThumb +
                    '<strong>' + escapeHtmlAttr(e.quoteNo) + '</strong>' + formatBadge + channelBadge + transferBadge + ' · ' + escapeHtmlAttr(when) + ' · ' + escapeHtmlAttr(linesSummary) + '<br>' +
                    escapeHtmlAttr(e.customerName || '—') + ' · ' + escapeHtmlAttr(e.phone || '—') +
                    adminStats +
                    (e.address ? '<br><small>' + escapeHtmlAttr(e.address) + '</small>' : '') +
                    (e.city ? ' · ' + escapeHtmlAttr(e.city) : '') +
                    (e.note ? '<br><small>' + escapeHtmlAttr(e.note) + '</small>' : '') +
                    (e.paymentBankIban ? '<br><small><strong>IBAN:</strong> <code dir="ltr">' + escapeHtmlAttr(e.paymentBankIban) + '</code></small>' : '') +
                    (e.transferReceiptDataUrl ? '<br><div class="sales-quote-receipt-inline"><img src="' + escapeHtmlAttr(e.transferReceiptDataUrl) + '" alt="" loading="lazy" onclick="event.preventDefault();viewSalesQuoteReceipt(\'' + entryKey + '\')"><a href="#" onclick="event.preventDefault();viewSalesQuoteReceipt(\'' + entryKey + '\')">' + escapeHtmlAttr(ui.salesInboxReceipt || 'عرض إيصال الحوالة') + '</a></div>' : '') +
                    quoteDocThumb +
                    (isDesigner && e.doorDesignerImage ? '<br><a href="#" onclick="event.preventDefault();viewSalesQuoteDoorDesign(\'' + entryKey + '\')">' + escapeHtmlAttr(ui.salesInboxDoorDesign || 'عرض تصميم الباب') + '</a>' : '') +
                    '<div class="scm-row-actions" style="margin-top:8px;">' +
                    '<button type="button" onclick="markSalesQuoteStatus(\'' + entryKey + '\',\'reviewed\')">' + escapeHtmlAttr(ui.salesInboxReviewed || 'تمت المراجعة') + '</button>' +
                    '<button type="button" onclick="markSalesQuoteStatus(\'' + entryKey + '\',\'sold\')">' + escapeHtmlAttr(ui.salesInboxSold || 'تسجيل كبيع فعلي') + '</button>' +
                    '<button type="button" onclick="markSalesQuoteStatus(\'' + entryKey + '\',\'closed\')">' + escapeHtmlAttr(ui.salesInboxClosed || 'إغلاق') + '</button>' +
                    '<button type="button" onclick="viewSalesQuoteEntry(\'' + entryKey + '\')">' + escapeHtmlAttr(ui.salesInboxDetails || 'تفاصيل') + '</button>' +
                    '</div></li>';
            }).join('');
        }

        function registerQuoteAsSale(entry) {
            if (!entry) return;
            const exists = (salesData || []).some(function(s) { return s.quoteId === entry.id || s.quoteNo === entry.quoteNo; });
            if (exists) return;
            const productSummary = (entry.lines || []).map(function(l) {
                return (l.productTitle || l.productId || '') + ' ×' + (Number(l.qty) || 1);
            }).join(' | ');
            salesData.push({
                id: 'sale-' + Date.now(),
                quoteId: entry.id,
                quoteNo: entry.quoteNo || '',
                customerName: entry.customerName || '',
                phone: entry.phone || '',
                product: productSummary || 'طلب متجر',
                amount: Number(entry.totalIncVat) || Number(entry.total) || 0,
                date: formatNebrasDateTime(entry.at || Date.now(), 'ar', { year: 'numeric', month: '2-digit', day: '2-digit' }),
                source: 'quote-converted'
            });
            saveSystemData();
            displaySales();
            renderErpHubPanel();
        }

        async function markSalesQuoteStatus(entryId, status) {
            if (!requirePermission('sales')) return;
            const inbox = loadSalesQuotesInbox();
            const entry = inbox.find(function(e) { return e.id === entryId; });
            if (entry) {
                entry.status = status;
                if (status === 'sold') {
                    entry.quoteType = 'sale';
                    entry.soldAt = Date.now();
                    registerQuoteAsSale(entry);
                }
                saveSalesQuotesInbox(inbox);
            }
            const cloudInbox = await fetchSalesQuotesFromCloud();
            const cloudEntry = cloudInbox.find(function(e) { return e.id === entryId || e.cloudId === entryId; });
            if (cloudEntry && cloudEntry.cloudId) {
                await updateQuoteStatusOnCloud(cloudEntry.cloudId, status === 'sold' ? 'closed' : status);
            }
            displaySalesQuotesInbox();
            if (currentAdmin && canManage('audit')) renderAdminAnalyticsPanel();
        }

        async function viewSalesQuoteEntry(entryId) {
            if (!requirePermission('sales', 'عرض تفاصيل الطلب يتطلب صلاحية المبيعات.')) return;
            let entry = loadSalesQuotesInbox().find(function(e) { return e.id === entryId; });
            if (!entry) {
                const cloudInbox = await fetchSalesQuotesFromCloud();
                entry = cloudInbox.find(function(e) { return e.id === entryId; });
            }
            if (!entry) return;
            if (entry.quoteChannel === 'door-designer' && entry.doorDesignerImage) {
                viewSalesQuoteDoorDesign(entryId);
                return;
            }
            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            let overlay = document.getElementById('sales-quote-detail-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'sales-quote-detail-overlay';
                overlay.className = 'sales-quote-detail-overlay';
                overlay.innerHTML = '<div class="sales-quote-detail-modal" role="dialog" aria-modal="true">' +
                    '<button type="button" class="sales-quote-detail-close" onclick="closeSalesQuoteDetail()">&times;</button>' +
                    '<div id="sales-quote-detail-body"></div></div>';
                document.body.appendChild(overlay);
                overlay.addEventListener('click', function(ev) {
                    if (ev.target === overlay) closeSalesQuoteDetail();
                });
            }
            const bodyEl = document.getElementById('sales-quote-detail-body');
            if (!bodyEl) return;
            const linesHtml = (entry.lines || []).map(function(l) {
                return '<li>' + escapeHtmlAttr(l.productTitle || l.productId || '—') +
                    ' ×' + (Number(l.qty) || 1) +
                    (l.variantLabel ? ' · ' + escapeHtmlAttr(l.variantLabel) : '') + '</li>';
            }).join('');
            const transferHtml = entry.transferReceiptDataUrl
                ? ('<figure class="sales-quote-detail-receipt"><img src="' + escapeHtmlAttr(entry.transferReceiptDataUrl) + '" alt="">' +
                    '<figcaption><button type="button" class="analytics-receipt-thumb-btn" onclick="viewSalesQuoteReceipt(\'' + escapeHtmlAttr(String(entry.id).replace(/'/g, "\\'")) + '\')">' +
                    escapeHtmlAttr(ui.salesInboxReceipt || 'عرض إيصال الحوالة') + '</button></figcaption></figure>')
                : (entry.transferDeclared
                    ? '<p class="sales-quote-detail-transfer-declared"><i class="fas fa-check-circle"></i> ' +
                        escapeHtmlAttr(ui.salesInboxTransferDeclared || 'تحويل مُعلَن — بانتظار الإيصال') + '</p>'
                    : '');
            bodyEl.innerHTML = '<h3>' + escapeHtmlAttr(entry.quoteNo || '—') + '</h3>' +
                (entry.adminDailyIssued != null
                    ? ('<p class="sales-quote-admin-stats"><small>📊 ' + escapeHtmlAttr(ui.salesInboxAdminStats || 'إداري اليوم:') + ' ' +
                        escapeHtmlAttr(String(entry.adminDailyIssued)) + ' ' + escapeHtmlAttr(ui.salesInboxAdminIssued || 'صادر') + ' · ' +
                        escapeHtmlAttr(String(entry.adminDailyFinalized != null ? entry.adminDailyFinalized : 0)) + ' ' +
                        escapeHtmlAttr(ui.salesInboxAdminFinalized || 'منفّذ') + '</small></p>')
                    : '') +
                '<p class="sales-quote-detail-customer"><strong>' + escapeHtmlAttr(entry.customerName || '—') + '</strong> · ' +
                escapeHtmlAttr(entry.phone || '—') +
                (entry.email ? '<br>' + escapeHtmlAttr(entry.email) : '') +
                (entry.address ? '<br>' + escapeHtmlAttr(entry.address) : '') +
                (entry.city ? ' · ' + escapeHtmlAttr(entry.city) : '') + '</p>' +
                (entry.note ? '<p class="sales-quote-detail-note">' + escapeHtmlAttr(entry.note) + '</p>' : '') +
                (entry.paymentBankIban ? '<p class="sales-quote-detail-bank"><strong>IBAN:</strong> <code dir="ltr">' + escapeHtmlAttr(entry.paymentBankIban) + '</code></p>' : '') +
                transferHtml +
                ((entry.quoteDocumentPdfUrl || entry.quoteDocumentCloudUrl || entry.quoteDocumentDataUrl)
                    ? ('<figure class="sales-quote-detail-doc"><a href="' + escapeHtmlAttr(entry.quoteDocumentPdfUrl || entry.quoteDocumentCloudUrl || entry.quoteDocumentDataUrl) + '" target="_blank" rel="noopener"><img src="' + escapeHtmlAttr(entry.quoteDocumentCloudUrl || entry.quoteDocumentDataUrl || '/images/logo.png') + '" alt="A4"></a>' +
                        '<figcaption><a href="' + escapeHtmlAttr(entry.quoteDocumentPdfUrl || entry.quoteDocumentCloudUrl || entry.quoteDocumentDataUrl) + '" target="_blank" rel="noopener">' +
                        escapeHtmlAttr(ui.salesInboxQuoteDoc || 'تحميل مستند A4 (PDF)') + '</a></figcaption></figure>')
                    : '') +
                (linesHtml ? ('<ul class="sales-quote-detail-lines">' + linesHtml + '</ul>') : '') +
                (entry.totalIncVat > 0 ? '<p class="sales-quote-detail-total"><strong>' + escapeHtmlAttr(ui.cartProductsTotalInc || 'إجمالي المنتجات شامل الضريبة: ') + '</strong> ' + formatSar(entry.totalIncVat) + '</p>' : '');
            overlay.classList.add('show');
        }

        function closeSalesQuoteDetail() {
            const overlay = document.getElementById('sales-quote-detail-overlay');
            if (overlay) overlay.classList.remove('show');
        }

        async function viewSalesQuoteDocument(entryId) {
            let entry = loadSalesQuotesInbox().find(function(e) { return e.id === entryId; });
            if (!entry) {
                const cloudInbox = await fetchSalesQuotesFromCloud();
                entry = cloudInbox.find(function(e) { return e.id === entryId; });
            }
            if (!entry) return;
            const img = entry.quoteDocumentPdfUrl || entry.quoteDocumentCloudUrl || entry.quoteDocumentDataUrl || '';
            if (!img) {
                alert('لا يوجد مستند A4 (PDF) لهذا الطلب.');
                return;
            }
            if (/\.pdf(\?|$)/i.test(img)) {
                window.open(img, '_blank', 'noopener,noreferrer');
                return;
            }
            openNebrasMediaLightbox([img], 0);
        }

        async function viewSalesQuoteDoorDesign(entryId) {
            let entry = loadSalesQuotesInbox().find(function(e) { return e.id === entryId; });
            if (!entry) {
                const cloudInbox = await fetchSalesQuotesFromCloud();
                entry = cloudInbox.find(function(e) { return e.id === entryId; });
            }
            if (!entry) return;
            const spec = entry.doorDesignerSpec || '';
            const img = entry.doorDesignerImage || '';
            let overlay = document.getElementById('sales-quote-door-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'sales-quote-door-overlay';
                overlay.className = 'sales-quote-door-overlay';
                overlay.innerHTML = '<div class="sales-quote-door-modal" role="dialog" aria-modal="true">' +
                    '<button type="button" class="sales-quote-door-close" onclick="closeSalesQuoteDoorDesign()">&times;</button>' +
                    '<div id="sales-quote-door-modal-body"></div></div>';
                document.body.appendChild(overlay);
            }
            const bodyEl = document.getElementById('sales-quote-door-modal-body');
            if (bodyEl) {
                bodyEl.innerHTML = '<h3>' + escapeHtmlAttr(entry.quoteNo) + ' — صمّم بابك</h3>' +
                    (img ? ('<figure class="sales-quote-door-figure"><img src="' + escapeHtmlAttr(img) + '" alt="تصميم الباب"></figure>') : '') +
                    '<div class="sales-quote-door-spec">' + formatDoorDesignerSpecHtml(spec) + '</div>' +
                    '<p class="sales-quote-door-customer"><strong>' + escapeHtmlAttr(entry.customerName || '') + '</strong> · ' + escapeHtmlAttr(entry.phone || '') + '</p>';
            }
            overlay.classList.add('show');
        }

        function closeSalesQuoteDoorDesign() {
            const overlay = document.getElementById('sales-quote-door-overlay');
            if (overlay) overlay.classList.remove('show');
        }

        async function viewSalesQuoteReceipt(entryId) {
            let entry = loadSalesQuotesInbox().find(function(e) { return e.id === entryId; });
            if (!entry || !entry.transferReceiptDataUrl) {
                const cloud = await fetchSalesQuotesFromCloud();
                entry = cloud.find(function(e) { return e.id === entryId; });
            }
            if (!entry || !entry.transferReceiptDataUrl) {
                alert('لا يوجد إيصال مرفق.');
                return;
            }
            openNebrasMediaLightbox([entry.transferReceiptDataUrl], 0);
        }

        function getQuoteDateKey(d) {
            const dt = d || new Date();
            return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
        }

        function loadQuoteRegistry() {
            try {
                const raw = localStorage.getItem(QUOTE_REGISTRY_KEY);
                const parsed = raw ? JSON.parse(raw) : {};
                if (!parsed.byDate || typeof parsed.byDate !== 'object') parsed.byDate = {};
                return parsed;
            } catch (e) {
                return { byDate: {} };
            }
        }

        function saveQuoteRegistry(reg) {
            localStorage.setItem(QUOTE_REGISTRY_KEY, JSON.stringify(reg));
        }

        function issueNextQuoteNumber() {
            const reg = loadQuoteRegistry();
            const dateKey = getQuoteDateKey();
            if (!reg.byDate[dateKey]) reg.byDate[dateKey] = { counter: 0, issued: [], finalized: [] };
            const day = reg.byDate[dateKey];
            day.counter += 1;
            const quoteNo = 'NEB-' + day.counter;
            const record = {
                no: quoteNo,
                at: Date.now(),
                itemCount: nebrasCart.length,
                status: 'issued'
            };
            day.issued.push(record);
            saveQuoteRegistry(reg);
            const issue = {
                quoteNo: quoteNo,
                dateKey: dateKey,
                todayIssued: day.issued.length,
                todayFinalized: (day.finalized || []).length
            };
            currentQuoteIssue = issue;
            saveQuoteSessionState();
            return issue;
        }

        function markCurrentQuoteFinalized() {
            if (!currentQuoteIssue || !currentQuoteIssue.quoteNo) return;
            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            const reg = loadQuoteRegistry();
            const day = reg.byDate[currentQuoteIssue.dateKey];
            if (!day) return;
            if (!day.finalized) day.finalized = [];
            const already = day.finalized.some(function(q) { return q.no === currentQuoteIssue.quoteNo; });
            if (!already) {
                day.finalized.push({ no: currentQuoteIssue.quoteNo, at: Date.now() });
                const issued = day.issued.find(function(q) { return q.no === currentQuoteIssue.quoteNo; });
                if (issued) issued.status = 'finalized';
            }
            saveQuoteRegistry(reg);
            currentQuoteIssue.todayFinalized = day.finalized.length;
            alert((ui.quoteFinalizedOk || 'تم تسجيل') + ' ' + currentQuoteIssue.quoteNo);
        }

        let cachedSiteLogoUrl = null;

        function getSiteLogoCandidateUrls() {
            return buildUrlList(['logo', 'nebras-logo']);
        }

        function getSiteLogoUrlListAttr() {
            return getSiteLogoCandidateUrls().join('|');
        }

        function getSiteLogoUrl() {
            const urls = getSiteLogoCandidateUrls();
            return cachedSiteLogoUrl || urls[0] || 'images/logo.png';
        }

        function resolveSiteLogoUrl(done) {
            if (cachedSiteLogoUrl) {
                if (typeof done === 'function') done(cachedSiteLogoUrl);
                return cachedSiteLogoUrl;
            }
            const headerLogo = document.querySelector('.site-logo-img');
            if (headerLogo && headerLogo.complete && headerLogo.naturalWidth > 0 && headerLogo.src) {
                cachedSiteLogoUrl = headerLogo.src;
                if (typeof done === 'function') done(cachedSiteLogoUrl);
                return cachedSiteLogoUrl;
            }
            const urls = getSiteLogoCandidateUrls();
            function tryNext(index) {
                if (index >= urls.length) {
                    const fallback = urls[0] || 'images/logo.png';
                    if (typeof done === 'function') done(fallback);
                    return;
                }
                const probe = new Image();
                probe.onload = function() {
                    cachedSiteLogoUrl = urls[index];
                    if (typeof done === 'function') done(cachedSiteLogoUrl);
                };
                probe.onerror = function() {
                    tryNext(index + 1);
                };
                probe.src = urls[index];
            }
            tryNext(0);
            return null;
        }

        function getQuoteTermsHtml(lang) {
            const year = new Date().getFullYear();
            if (lang === 'en') {
                return '<section class="quote-terms-block">' +
                    '<h3 class="quote-terms-title">Quotation &amp; Contract Terms</h3>' +
                    '<ol class="quote-terms-list">' +
                    '<li>This quotation is indicative until confirmed in writing by Nebras sales.</li>' +
                    '<li>Prices include VAT at the stated rate unless otherwise noted.</li>' +
                    '<li>Production and delivery timelines are confirmed after design approval and deposit.</li>' +
                    '<li>Custom door designs follow the specifications listed in this document.</li>' +
                    '<li>Payment is via approved bank transfer to Nebras factory accounts.</li>' +
                    '<li>Warranty and after-sales service follow Nebras factory policy.</li>' +
                    '</ol></section>' +
                    '<p class="quote-copyright-line">© All rights reserved — Nebras Plastic Factory Company ' + year + '</p>';
            }
            if (lang === 'zh') {
                return '<section class="quote-terms-block">' +
                    '<h3 class="quote-terms-title">报价与合同条款</h3>' +
                    '<ol class="quote-terms-list">' +
                    '<li>本报价为参考价，最终以 Nebras 销售书面确认为准。</li>' +
                    '<li>除非另有说明，价格含所列增值税率。</li>' +
                    '<li>生产与交付时间在设计确认及定金后确定。</li>' +
                    '<li>定制门规格以本文所列为准。</li>' +
                    '<li>付款方式为 Nebras 工厂认可银行账户转账。</li>' +
                    '<li>质保与售后服务按 Nebras 工厂政策执行。</li>' +
                    '</ol></section>' +
                    '<p class="quote-copyright-line">© 版权所有 — Nebras 塑料工厂 ' + year + '</p>';
            }
            return '<section class="quote-terms-block">' +
                '<h3 class="quote-terms-title">شروط وأحكام عرض السعر والعقد</h3>' +
                '<ol class="quote-terms-list">' +
                '<li>عرض السعر استرشادي حتى تأكيده كتابياً من فريق مبيعات مصنع نبراس.</li>' +
                '<li>الأسعار تشمل ضريبة القيمة المضافة بالنسبة المذكورة ما لم يُذكر خلاف ذلك.</li>' +
                '<li>مدة التصنيع والتسليم تُحدَّد بعد اعتماد التصميم والدفعة المقدمة.</li>' +
                '<li>تصاميم الأبواب المخصصة تُنفَّذ وفق المواصفات المذكورة في هذا المستند.</li>' +
                '<li>السداد عبر التحويل البنكي للحسابات المعتمدة لمصنع نبراس.</li>' +
                '<li>الضمان وخدمة ما بعد البيع وفق سياسة مصنع نبراس المعتمدة.</li>' +
                '</ol></section>' +
                '<p class="quote-copyright-line">© كل الحقوق محفوظة لشركة مصنع نبراس للبلاستيك ' + year + '</p>';
        }

        function buildQuoteLogoImgHtml(className, logoUrl, altText) {
            const listAttr = escapeHtmlAttr(getSiteLogoUrlListAttr());
            return '<img class="' + className + '" src="' + escapeHtmlAttr(logoUrl) + '" data-src-list="' + listAttr + '" data-src-idx="0" decoding="sync" onerror="siteLogoImgFallback(this)" alt="' + escapeHtmlAttr(altText || '') + '">';
        }

        function buildQuoteHeaderLogoStripHtml(logoUrl, logoAlt, lang) {
            const isEn = lang === 'en';
            const isZh = lang === 'zh';
            const tagline = isEn ? 'Nebras Plastic Factory Company' : (isZh ? 'Nebras 塑料工厂' : 'شركة مصنع نبراس للبلاستيك');
            const heroLogo = buildQuoteLogoImgHtml('quote-hero-logo', logoUrl, logoAlt);
            return '<div class="quote-header-logo-strip" role="banner">' +
                heroLogo +
                '<p class="quote-header-tagline">' + escapeHtmlAttr(tagline) + '</p></div>';
        }

        function getDoorDesignerSpecText() {
            const root = document.getElementById('nebras-door-designer');
            if (!root) return '';
            const lang = currentLang || 'ar';
            const ui = siteText[lang] || siteText.ar;
            function lbl(group) {
                const active = root.querySelector('.is-active[data-door-group="' + group + '"]');
                if (!active) return '';
                const nameEl = active.querySelector('.door-designer-type-card-label, .door-designer-model-card-label, .door-color-swatch-name, .door-color-swatch-label');
                return (nameEl ? nameEl.textContent : active.textContent).trim();
            }
            const codeBtn = root.querySelector('.is-active[data-door-group="color"]');
            const code = codeBtn ? (codeBtn.getAttribute('data-door-code') || '') : '';
            const rollCode = code ? getPublicColorDisplayCode(code) : '';
            const colorName = lbl('color');
            const colorValue = rollCode ? (rollCode + (colorName ? ' — ' + colorName : '')) : colorName;
            const rows = [
                [ui.doorDesignerTypeLabel || 'نوع الباب', lbl('type')],
                [ui.doorDesignerSubModelLabel || 'نموذج الباب', lbl('model')],
                [ui.doorDesignerShapeLabel || 'الديكور الخارجي', lbl('outerShape')],
                [ui.doorDesignerDecorLabel || 'التكسية العلوية', lbl('decor')],
                [ui.doorDesignerLeafSizeLabel || 'مقاس الضلفة', lbl('size')],
                [ui.doorDesignerRollLabel || 'رولّة اللون', colorValue],
                [ui.doorDesignerOpeningLabel || 'اتجاه الفتح', lbl('opening')],
                [ui.doorDesignerHardwareLabel || 'المقبض', lbl('hardware')],
                [ui.doorDesignerLockLabel || 'القفل', lbl('lock')]
            ];
            return rows.filter(function(r) { return r[1]; }).map(function(r) { return r[0] + ': ' + r[1]; }).join('\n');
        }

        function formatDoorDesignerSpecHtml(specText) {
            return String(specText || '').split('\n').map(function(line) {
                return '<p class="quote-door-spec-line">' + escapeHtmlAttr(line) + '</p>';
            }).join('');
        }

        function extractDoorDesignerLineFromCart(cart) {
            return (cart || nebrasCart || []).find(function(l) {
                return l && (l.productId === 'door-designer' || (l.meta && l.meta.source === 'door-designer'));
            }) || null;
        }

        function buildQuoteDoorDesignBlockHtml(cart, lang) {
            const line = extractDoorDesignerLineFromCart(cart);
            if (!line) return '';
            const isEn = lang === 'en';
            const isZh = lang === 'zh';
            const spec = (line.meta && line.meta.designSpec) || line.color || '';
            const imgSrc = (line.meta && line.meta.previewImage) || line.image || '';
            const title = isEn ? 'Custom door design — Nebras Studio' : (isZh ? '定制门设计 — Nebras 工作室' : 'تصميم الباب — استوديو صمّم بابك');
            return '<section class="quote-door-design-block">' +
                '<h3 class="quote-door-design-title">' + escapeHtmlAttr(title) + '</h3>' +
                (imgSrc ? ('<figure class="quote-door-design-figure"><img src="' + escapeHtmlAttr(imgSrc) + '" alt="' + escapeHtmlAttr(title) + '" class="quote-door-design-img"></figure>') : '') +
                '<div class="quote-door-design-spec">' + formatDoorDesignerSpecHtml(spec) + '</div></section>';
        }

        async function captureDoorDesignerPreviewImage() {
            const root = document.getElementById('nebras-door-designer');
            const colorBtn = root ? root.querySelector('.is-active[data-door-group="color"]') : null;
            const rollColor = resolveDoorRollColorState(colorBtn);
            const state = root ? resolveDoorDesignerState(root) : null;
            const preset = state ? resolveDoorDesignerPhotoPreset(state) : null;
            if (preset && preset.url && rollColor.isRoll !== false) {
                const baseSrc = doorPhotoPresetUrl(preset.url);
                const tex = resolveDoorRollTextureUrl(rollColor.swatchUrl);
                const composed = await composeDoorPhotoWithRoll(baseSrc, tex, rollColor.hex, rollColor.catalogIndex);
                if (composed) return composed;
            }
            const presetImg = document.getElementById('wpc-door-photo-preset-img');
            if (presetImg && presetImg.src) {
                if (presetImg.src.indexOf('data:') === 0) return presetImg.src;
                try {
                    const drawn = await loadDoorDesignerImage(presetImg.src.split('?')[0]).then(function(img) {
                        const c = document.createElement('canvas');
                        c.width = img.naturalWidth || 440;
                        c.height = img.naturalHeight || 920;
                        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                        return c.toDataURL('image/png', 0.92);
                    });
                    if (drawn) return drawn;
                } catch (capErr) { /* fallback below */ }
            }
            if (isDoorDesignerCompositorMode() && isDoorDesignerCompositorReady()) {
                const base = document.querySelector('#nebras-door-compositor-viewport [data-ndc="base"]');
                if (base && base.src) {
                    return new Promise(function(resolve) {
                        const img = new Image();
                        img.onload = function() {
                            try {
                                const c = document.createElement('canvas');
                                c.width = img.naturalWidth || 440;
                                c.height = img.naturalHeight || 920;
                                const ctx = c.getContext('2d');
                                ctx.drawImage(img, 0, 0);
                                resolve(c.toDataURL('image/png', 0.92));
                            } catch (err) { resolve(''); }
                        };
                        img.onerror = function() { resolve(''); };
                        img.src = base.src;
                    });
                }
            }
            if (isDoorDesigner3dMode() && isDoorDesigner3dEngineReady()) {
                const viewport = document.getElementById('nebras-door-3d-viewport');
                const canvas3d = viewport ? viewport.querySelector('canvas') : null;
                if (canvas3d) {
                    try {
                        return Promise.resolve(canvas3d.toDataURL('image/png', 0.92));
                    } catch (e3d) { /* fallback to SVG */ }
                }
            }
            const svg = document.getElementById('wpc-door-svg-root');
            if (!svg) return Promise.resolve('');
            try {
                const viewBox = (svg.getAttribute('viewBox') || '0 0 440 920').split(/\s+/).map(Number);
                const width = Math.max(220, Math.round(viewBox[2] || 440));
                const height = Math.max(440, Math.round(viewBox[3] || 920));
                const svgText = new XMLSerializer().serializeToString(svg);
                const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);
                return new Promise(function(resolve) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                            URL.revokeObjectURL(url);
                            resolve('');
                            return;
                        }
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, width, height);
                        ctx.drawImage(img, 0, 0, width, height);
                        URL.revokeObjectURL(url);
                        resolve(canvas.toDataURL('image/png', 0.92));
                    };
                    img.onerror = function() {
                        URL.revokeObjectURL(url);
                        resolve('');
                    };
                    img.src = url;
                });
            } catch (e) {
                return Promise.resolve('');
            }
        }

        async function addDoorDesignToCartAndQuote() {
            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            const spec = getDoorDesignerSpecText();
            if (!spec) {
                alert(ui.doorDesignerDisabled || 'المصمم غير متاح.');
                return;
            }
            const lang = currentLang || 'ar';
            const lineId = 'door-design-' + Date.now();
            const previewPngDataUrl = await captureDoorDesignerPreviewImage();
            nebrasCart.push({
                lineId: lineId,
                productId: 'door-designer',
                variantId: 'custom',
                productTitle: lang === 'en' ? 'Custom WPC door (Nebras studio)' : (lang === 'zh' ? '定制 WPC 门（نبراس 工作室）' : 'باب WPC مخصص — استوديو نبراس'),
                color: spec,
                size: '',
                type: '',
                image: previewPngDataUrl || '',
                sku: 'WPC-DESIGN',
                unitPrice: 0,
                qty: 1,
                meta: {
                    source: 'door-designer',
                    designSpec: spec,
                    previewImage: previewPngDataUrl || ''
                }
            });
            saveNebrasCart();
            notifyCartAdded(spec);
            openCartDrawer();
            setTimeout(function() { confirmAndOpenQuote(); }, 400);
        }

        function confirmAndOpenQuote() {
            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            if (!nebrasCart.length) {
                alert(ui.cartEmpty || 'أضف منتجات إلى السلة أولاً.');
                return;
            }
            readCheckoutFormToProfile();
            const validation = validateCheckoutProfileForPreview(readCheckoutFormToProfile(), ui);
            if (!validation.ok) {
                showCheckoutValidationErrors(validation.errors, ui, false);
                return;
            }
            openQuotePreview();
        }

        function openQuotePreview() {
            if (!nebrasCart.length) {
                const ui = siteText[currentLang || 'ar'] || siteText.ar;
                alert(ui.cartEmpty || 'أضف منتجات إلى السلة أولاً.');
                return;
            }
            const doc = document.getElementById('quote-a4-document');
            const overlay = document.getElementById('quote-print-overlay');
            if (!doc || !overlay) {
                alert('تعذّر فتح المعاينة — أعدي تحميل الصفحة.');
                return;
            }
            readCheckoutFormToProfile();
            if (!currentQuoteIssue || !currentQuoteIssue.quoteNo) {
                currentQuoteIssue = issueNextQuoteNumber();
            }
            resolveSiteLogoUrl(function(logoUrl) {
                renderQuotePreviewDocument(doc, overlay, logoUrl);
                overlay.scrollTop = 0;
            });
        }

        function buildQuoteInfoRow(label, value) {
            return '<div class="quote-info-row"><span class="quote-info-label">' + label + '</span><span class="quote-info-value">' + escapeHtmlAttr(value || '—') + '</span></div>';
        }

        function buildQuoteCustomerCardHtml(cust, ui, lang) {
            const isEn = lang === 'en';
            const isZh = lang === 'zh';
            const title = ui.quoteCustomerTitle || (isEn ? 'Customer details' : (isZh ? '客户信息' : 'بيانات العميل'));
            return '<article class="quote-info-card quote-info-card--customer">' +
                '<h3 class="quote-info-card-title"><i class="fas fa-user-circle" aria-hidden="true"></i> ' + escapeHtmlAttr(title) + '</h3>' +
                buildQuoteInfoRow(isEn ? 'Name' : (isZh ? '姓名' : 'الاسم'), cust.customerName) +
                buildQuoteInfoRow(isEn ? 'Phone' : (isZh ? '电话' : 'الجوال'), cust.phone) +
                buildQuoteInfoRow(isEn ? 'Email' : (isZh ? '邮箱' : 'البريد'), cust.email) +
                buildQuoteInfoRow(isEn ? 'City' : (isZh ? '城市' : 'المدينة'), cust.city) +
                buildQuoteInfoRow(isEn ? 'Delivery' : (isZh ? '地址' : 'العنوان / التسليم'), cust.address) +
                (cust.note ? buildQuoteInfoRow(isEn ? 'Notes' : (isZh ? '备注' : 'ملاحظات'), cust.note) : '') +
                '</article>';
        }

        function buildQuoteFactoryCardHtml(logoUrl, logoAlt, lang) {
            const isEn = lang === 'en';
            const isZh = lang === 'zh';
            const companyName = isEn ? 'Nebras Plastic Factory Company' : (isZh ? 'Nebras 塑料工厂公司' : 'شركة مصنع نبراس للبلاستيك');
            const addr = isEn
                ? (systemSettings.companyAddressEn || systemSettings.companyAddressAr || '')
                : (systemSettings.companyAddressAr || systemSettings.companyAddressEn || '');
            const factoryTitle = isEn ? 'Factory & company' : (isZh ? '工厂信息' : 'بيانات المصنع والشركة');
            const factoryLogo = buildQuoteLogoImgHtml('quote-factory-logo', logoUrl, logoAlt);
            return '<article class="quote-info-card quote-info-card--factory">' +
                '<div class="quote-factory-brand" aria-hidden="false">' + factoryLogo + '</div>' +
                '<h3 class="quote-info-card-title"><i class="fas fa-industry" aria-hidden="true"></i> ' + escapeHtmlAttr(factoryTitle) + '</h3>' +
                '<p class="quote-factory-name">' + escapeHtmlAttr(companyName) + '</p>' +
                buildQuoteInfoRow(isEn ? 'Commercial register' : (isZh ? '商业登记' : 'السجل التجاري'), systemSettings.commercialRegister) +
                buildQuoteInfoRow(isEn ? 'VAT No.' : (isZh ? '税号' : 'الرقم الضريبي'), systemSettings.taxNumber) +
                buildQuoteInfoRow(isEn ? 'Address' : (isZh ? '地址' : 'العنوان'), addr) +
                buildQuoteInfoRow(isEn ? 'Sales' : (isZh ? '销售' : 'المبيعات'), systemSettings.mainSalesPhone) +
                buildQuoteInfoRow(isEn ? 'Customer service' : (isZh ? '客服' : 'خدمة العملاء'), systemSettings.customerServicePhone) +
                '</article>';
        }

        function buildQuoteTotalsCardHtml(cartTotals, lang, pct) {
            const isEn = lang === 'en';
            const isZh = lang === 'zh';
            const onRequest = isEn ? 'On request' : (isZh ? '询价' : 'عند الطلب');
            return '<section class="quote-totals-vat quote-totals-vat--card">' +
                '<h3 class="quote-totals-title">' + (isEn ? 'Totals' : (isZh ? '合计' : 'الإجماليات')) + '</h3>' +
                '<div class="quote-totals-grid">' +
                buildQuoteInfoRow(isEn ? 'Subtotal (ex VAT)' : (isZh ? '小计(不含税)' : 'المجموع قبل الضريبة'),
                    cartTotals.subtotalEx > 0 ? formatSar(cartTotals.subtotalEx) : '—') +
                buildQuoteInfoRow(isEn ? 'VAT (' + pct + '%)' : (isZh ? '增值税(' + pct + '%)' : 'ضريبة (' + pct + '%)'),
                    cartTotals.vatAmount > 0 ? formatSar(cartTotals.vatAmount) : '—') +
                '</div>' +
                '<p class="quote-totals-grand">' +
                '<span>' + (isEn ? 'Total (inc VAT)' : (isZh ? '总计(含税)' : 'إجمالي شامل الضريبة')) + '</span>' +
                '<strong>' + (cartTotals.totalInc > 0 ? formatSar(cartTotals.totalInc) : onRequest) + '</strong></p>' +
                '<p class="quote-totals-note">' +
                (isEn ? 'Line prices are for the stated quantity; total is the sum including VAT.' :
                    (isZh ? '价格为所示数量合计；总计为含税金额之和。' :
                        'السعر لكل صف حسب العدد — والإجمالي مجموع الأسعار شاملة الضريبة.')) +
                '</p></section>';
        }

        function renderQuotePreviewDocument(doc, overlay, logoUrl) {
            const lang = currentLang || 'ar';
            const isEn = lang === 'en';
            const isZh = lang === 'zh';
            const now = new Date();
            const dateStr = formatNebrasDateTime(now, lang, { dateStyle: 'long', timeStyle: 'short' });
            const quoteNo = currentQuoteIssue.quoteNo;
            const pct = getNebrasVatPercentLabel();
            const priceExHdr = isEn ? 'Price (ex VAT)' : (isZh ? '价格(不含税)' : 'السعر قبل الضريبة');
            const priceIncHdr = isEn ? 'Price (inc VAT)' : (isZh ? '价格(含税)' : 'السعر بعد الضريبة');
            const rows = nebrasCart.map(function(line, n) {
                const unit = Number(line.unitPrice) || 0;
                const qty = Number(line.qty) || 1;
                const lineEx = unit * qty;
                const lineInc = unit > 0 ? priceIncVat(unit) * qty : 0;
                return '<tr><td>' + (n + 1) + '</td><td>' + escapeHtmlAttr(line.productTitle) + '</td><td>' + escapeHtmlAttr([line.color, line.size, line.type].filter(Boolean).join(' / ')) + '</td><td>' + qty + '</td>' +
                    '<td>' + (lineEx > 0 ? formatSar(lineEx) : '—') + '</td><td>' + (lineInc > 0 ? formatSar(lineInc) : '—') + '</td></tr>';
            }).join('');
            const cartTotals = calcCartTotals();
            const ui = siteText[lang] || siteText.ar;
            const cust = readCheckoutFormToProfile();
            const logoAlt = ui.quoteLogoAlt || 'شعار شركة مصنع نبراس للبلاستيك';
            const addr = isEn
                ? (systemSettings.companyAddressEn || systemSettings.companyAddressAr || '')
                : (systemSettings.companyAddressAr || systemSettings.companyAddressEn || '');
            const doorDesignBlock = buildQuoteDoorDesignBlockHtml(nebrasCart, lang);
            const watermarkImg = buildQuoteLogoImgHtml('quote-watermark-logo', logoUrl, '');
            const termsBlock = getQuoteTermsHtml(lang);
            const companyName = isEn ? 'Nebras Plastic Factory Company' : (isZh ? 'Nebras 塑料工厂公司' : 'شركة مصنع نبراس للبلاستيك');
            const headerLogoStrip = buildQuoteHeaderLogoStripHtml(logoUrl, logoAlt, lang);
            doc.innerHTML =
                '<div class="quote-watermark-layer" aria-hidden="true">' + watermarkImg + '</div>' +
                '<div class="quote-a4-inner">' +
                '<div class="quote-doc-ribbon" aria-hidden="true"></div>' +
                headerLogoStrip +
                '<header class="quote-doc-header quote-doc-header--premium">' +
                '<div class="quote-doc-dual-cards">' +
                buildQuoteFactoryCardHtml(logoUrl, logoAlt, lang) +
                buildQuoteCustomerCardHtml(cust, ui, lang) +
                '</div>' +
                '<div class="quote-title-center quote-title-center--premium">' +
                '<p class="quote-doc-kicker">' + escapeHtmlAttr(companyName) + '</p>' +
                '<h1>' + (isEn ? 'Price Quotation' : (isZh ? '报价单' : 'عرض سعر')) + '</h1>' +
                '<div class="quote-number-big">' + escapeHtmlAttr(quoteNo) + '</div>' +
                '<div class="quote-date-line">' + (isEn ? 'Date: ' : (isZh ? '日期: ' : 'التاريخ: ')) + escapeHtmlAttr(dateStr) + '</div>' +
                '</div></header>' +
                doorDesignBlock +
                '<div class="quote-table-wrap">' +
                '<table class="quote-table quote-table--premium"><thead><tr>' +
                '<th>#</th><th>' + (isEn ? 'Product' : (isZh ? '产品' : 'المنتج')) + '</th><th>' + (isEn ? 'Specs' : (isZh ? '规格' : 'المواصفات')) + '</th><th>' + (isEn ? 'Qty' : (isZh ? '数量' : 'العدد')) + '</th>' +
                '<th>' + priceExHdr + '</th><th>' + priceIncHdr + '</th>' +
                '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
                buildQuoteTotalsCardHtml(cartTotals, lang, pct) +
                termsBlock +
                '<footer class="quote-doc-footer quote-doc-footer--premium"><div class="quote-legal-grid">' +
                '<div><strong>' + (isEn ? 'Commercial Register: ' : (isZh ? '商业登记: ' : 'السجل التجاري: ')) + '</strong>' + escapeHtmlAttr(systemSettings.commercialRegister || '—') + '</div>' +
                '<div><strong>' + (isEn ? 'VAT: ' : (isZh ? '税号: ' : 'الرقم الضريبي: ')) + '</strong>' + escapeHtmlAttr(systemSettings.taxNumber || '—') + '</div>' +
                '<div><strong>' + (isEn ? 'Address: ' : (isZh ? '地址: ' : 'العنوان: ')) + '</strong>' + escapeHtmlAttr(addr || '—') + '</div>' +
                '<p class="quote-footer-disclaimer">' + (isEn ? 'Indicative quotation — final confirmation by Nebras sales team.' : (isZh ? '参考报价 — 最终以销售团队确认为准。' : 'عرض سعر استرشادي — التأكيد النهائي عبر فريق المبيعات.')) + '</p>' +
                '</div></footer></div>';
            overlay.classList.add('show');
            closeCartDrawer();
            updateSalesQuoteFab();
            requestAnimationFrame(function() {
                syncQuoteA4MobilePreviewScale();
                waitForQuoteDocumentImages(doc, 2500).then(syncQuoteA4MobilePreviewScale);
            });
        }

        function closeQuotePreview() {
            const overlay = document.getElementById('quote-print-overlay');
            if (overlay) overlay.classList.remove('show');
            syncQuoteA4MobilePreviewScale();
            clearQuoteSessionState();
        }

        function buildSiteProductCardHtml(product, lang) {
            const title = getLocalizedCatalogField(product, 'title', lang);
            const text = getLocalizedCatalogField(product, 'text', lang);
            const titleIcon = product.titleIcon ? '<i class="' + escapeHtmlAttr(product.titleIcon) + '"></i> ' : '';
            const anchor = product.anchorId ? ' id="' + escapeHtmlAttr(product.anchorId) + '"' : '';
            const css = escapeHtmlAttr(product.cssClass || 'card-wpc-raw');
            const iconClass = escapeHtmlAttr(product.iconClass || 'fas fa-box');
            const exp = getCatalogExperience(product);
            const shopable = productHasShop(product);
            const badge = getExperienceBadgeHtml(product, lang);
            const shopBtn = (exp === 'shop' && shopable)
                ? '<button type="button" class="card-shop-btn" onclick="event.stopPropagation();openProductShop(\'' + String(product.id).replace(/'/g, "\\'") + '\')" title="' + escapeHtmlAttr(lang === 'en' ? 'Add to cart' : 'أضف للسلة') + '"><i class="fas fa-cart-plus"></i></button>'
                : '';
            const shopClass = shopable ? ' product-card--shopable' : '';
            const expClass = exp === 'shop' ? ' product-card--shop' : (exp === 'link' ? ' product-card--link' : ' product-card--browse');
            return '<div' + anchor + ' class="product-card ' + css + shopClass + expClass + ' clickable-card" data-product-id="' + escapeHtmlAttr(product.id) + '" onclick="openSiteProduct(\'' + String(product.id).replace(/'/g, "\\'") + '\')">' +
                badge + shopBtn +
                '<div class="card-icon"><i class="' + iconClass + '"></i></div>' +
                '<div class="card-content"><h3>' + titleIcon + escapeHtmlAttr(title) + '</h3><p>' + escapeHtmlAttr(text) + '</p></div></div>';
        }

        function applyProductCardBackgrounds(root, products) {
            if (!root) return;
            (products || []).forEach(function(product) {
                const node = root.querySelector('[data-product-id="' + product.id + '"]');
                if (node && product.backgroundImage) {
                    applyBackgroundToNode(node, product.backgroundImage, product.cssClass === 'card-other-products');
                }
            });
        }

        /** بطاقات المنتجات — تُعرض عبر أيقونات بوابة الزائر فقط (بدون تكرار في الصفحة الرئيسية) */
        function renderSiteProducts() {
            mergeSupabaseIntoSiteCatalog(currentLang || 'ar');
        }

        /* === NEBRAS DASHBOARD V1 (partners + certifications) === */

        function getPartnerDisplayName(partner, lang) {
            if (!partner) return '';
            if (lang === 'en') return String(partner.nameEn || partner.nameAr || '').trim();
            if (lang === 'zh') return String(partner.nameZh || partner.nameAr || partner.nameEn || '').trim();
            return String(partner.nameAr || partner.nameEn || '').trim();
        }

        function getCertDisplayField(cert, field, lang) {
            if (!cert) return '';
            const suffix = lang === 'en' ? 'En' : lang === 'zh' ? 'Zh' : 'Ar';
            return String(cert[field + suffix] || cert[field + 'Ar'] || cert[field + 'En'] || '').trim();
        }

        function getVisibleSitePartners() {
            return (sitePartners || []).filter(function(p) { return p && p.visible !== false && p.logoUrl; })
                .sort(function(a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
        }

        function splitPartnersForMarqueeRows(partners) {
            const items = partners || [];
            if (!items.length) return { rowA: [], rowB: [] };
            const mid = Math.ceil(items.length / 2);
            return { rowA: items.slice(0, mid), rowB: items.slice(mid) };
        }

        function buildPartnersTrackHtml(partners, lang, duplicateCount) {
            const items = partners || [];
            if (!items.length) return '';
            duplicateCount = duplicateCount || 2;
            function one(p) {
                const name = getPartnerDisplayName(p, lang);
                const logo = resolveDisplayMediaUrl(p.logoUrl);
                const link = String(p.linkUrl || '').trim();
                const logoOnly = p.logoOnly !== false;
                const cardClass = 'nebras-partner-logo' + (logoOnly ? ' nebras-partner-logo--logo-only' : '');
                const inner = '<img src="' + escapeHtmlAttr(logo) + '" alt="' + escapeHtmlAttr(name || 'شريك') + '" loading="lazy" decoding="async" onerror="this.style.opacity=\'0.35\'">' +
                    (!logoOnly && name ? '<span>' + escapeHtmlAttr(name) + '</span>' : '');
                if (link && /^https?:\/\//i.test(link)) {
                    return '<a class="' + cardClass + '" href="' + escapeHtmlAttr(link) + '" target="_blank" rel="noopener noreferrer">' + inner + '</a>';
                }
                return '<div class="' + cardClass + '">' + inner + '</div>';
            }
            const row = items.map(one).join('');
            let out = '';
            for (let i = 0; i < duplicateCount; i++) out += row;
            return out;
        }

        function applyPartnersTrack(el, html, staticFallback, forceStatic) {
            if (!el) return;
            if (html) {
                el.innerHTML = html;
                if (forceStatic) {
                    el.classList.add('nebras-partners-track--static');
                } else {
                    el.classList.remove('nebras-partners-track--static');
                }
            } else {
                el.innerHTML = staticFallback || '';
                el.classList.add('nebras-partners-track--static');
            }
        }

        function markPartnersMarqueesAnimated(root) {
            if (!root) return;
            root.querySelectorAll('.nebras-partners-marquee').forEach(function(m) {
                m.classList.remove('nebras-partners-marquee--static');
            });
            root.querySelectorAll('.nebras-partners-marquee--row2').forEach(function(row) {
                const track = row.querySelector('.nebras-partners-track');
                row.hidden = !(track && track.children.length);
            });
        }

        function markPartnersMarqueesStatic(root) {
            if (!root) return;
            root.querySelectorAll('.nebras-partners-marquee').forEach(function(m) {
                m.classList.add('nebras-partners-marquee--static');
            });
            root.querySelectorAll('.nebras-partners-marquee--row2').forEach(function(row) {
                const track = row.querySelector('.nebras-partners-track');
                row.hidden = !(track && track.children.length);
            });
        }

        function ensureBuiltinSitePartners() {
            if (!Array.isArray(sitePartners)) sitePartners = [];
            let seedVer = 0;
            try {
                seedVer = Number(localStorage.getItem('nebrasPartnersSeedVersion') || 0) || 0;
            } catch (e) { seedVer = 0; }
            const byId = {};
            sitePartners.forEach(function(p) {
                if (p && p.id) byId[p.id] = p;
            });
            const shouldMergeDefaults = !sitePartners.length || seedVer < SITE_PARTNERS_SEED_VERSION || !getVisibleSitePartners().length;
            if (!shouldMergeDefaults) return;
            DEFAULT_SITE_PARTNERS.forEach(function(def) {
                if (!byId[def.id]) {
                    sitePartners.push(Object.assign({}, def));
                    byId[def.id] = sitePartners[sitePartners.length - 1];
                } else {
                    const cur = byId[def.id];
                    if (def.logoUrl) cur.logoUrl = def.logoUrl;
                    if (def.nameAr) cur.nameAr = def.nameAr;
                    if (def.nameEn) cur.nameEn = def.nameEn;
                    if (def.sortOrder != null) cur.sortOrder = def.sortOrder;
                    if (def.logoOnly != null) cur.logoOnly = def.logoOnly;
                    if (cur.visible == null) cur.visible = true;
                }
            });
            sitePartners.sort(function(a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
            try {
                localStorage.setItem('nebrasPartnersSeedVersion', String(SITE_PARTNERS_SEED_VERSION));
            } catch (e) { /* ignore */ }
            saveSystemData({ skipCloud: true });
        }

        const NEBRAS_DOOR_SHOWCASE_URLS = [
            'images/doors/header-showcase/door-01.png',
            'images/doors/header-showcase/door-02.png',
            'images/doors/header-showcase/door-03.png',
            'images/doors/header-showcase/door-04.png',
            'images/doors/header-showcase/door-05.png',
            'images/doors/header-showcase/door-06.png'
        ];

        function buildMiniShowcaseInnerHtml(imageUrls, variant) {
            const urls = (imageUrls || []).filter(Boolean);
            if (!urls.length) return '';
            const count = urls.length;
            const cycleSec = count * 3;
            const slideCls = 'nebras-mini-showcase-slide' + (variant === 'partners' ? ' nebras-mini-showcase-slide--logo' : '');
            const badgeIcon = variant === 'partners' ? 'fa-handshake' : 'fa-door-open';
            const imgW = variant === 'partners' ? 84 : 92;
            const imgH = variant === 'partners' ? 132 : 142;
            const slides = urls.map(function(src, i) {
                const delay = -(cycleSec - 3) + (i * 3);
                const loading = i === 0 ? 'eager' : 'lazy';
                const fetchPri = i === 0 && variant === 'doors' ? ' fetchpriority="high"' : '';
                return '<img class="' + slideCls + '" src="' + escapeHtmlAttr(normalizeMediaPath(src)) + '" alt="" width="' + imgW + '" height="' + imgH + '" loading="' + loading + '" decoding="async"' + fetchPri + ' style="animation-delay:' + delay + 's">';
            }).join('');
            return '<div class="nebras-mini-showcase-frame" role="img">' +
                '<span class="nebras-mini-showcase-glow" aria-hidden="true"></span>' +
                '<div class="nebras-mini-showcase-viewport">' + slides + '</div>' +
                '<span class="nebras-mini-showcase-badge" aria-hidden="true"><i class="fas ' + badgeIcon + '"></i></span>' +
                '</div>';
        }

        function fillDoorMiniShowcase(rootId) {
            const root = document.getElementById(rootId);
            if (!root) return;
            root.style.setProperty('--cycle-duration', (NEBRAS_DOOR_SHOWCASE_URLS.length * 3) + 's');
            root.innerHTML = buildMiniShowcaseInnerHtml(NEBRAS_DOOR_SHOWCASE_URLS, 'doors');
        }

        function refreshDashboardDoorShowcase() {
            fillDoorMiniShowcase('dashboard-door-showcase');
        }

        function refreshHeaderHeroDoorShowcase() {
            fillDoorMiniShowcase('header-hero-door-showcase');
            wireHeaderHeroDoorShowcase();
        }

        function wireHeaderHeroDoorShowcase() {
            const trigger = document.getElementById('header-campaign-door-aside');
            if (!trigger || trigger.dataset.nebrasDoorWired === '1') return;
            trigger.dataset.nebrasDoorWired = '1';
            function openDoorDesigner() {
                if (typeof openNebrasWorkspace === 'function') {
                    openNebrasWorkspace({ pillar: 'store', view: 'door-designer' });
                }
            }
            trigger.addEventListener('click', function(e) {
                if (e.target.closest('button, a')) return;
                openDoorDesigner();
            });
            trigger.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openDoorDesigner();
                }
            });
        }

        function refreshHeaderDoorShowcase() {
            fillDoorMiniShowcase('header-door-showcase');
        }

        function refreshTopPartnersMiniShowcase() {
            const root = document.getElementById('top-partners-showcase');
            const aside = document.getElementById('header-aside-partners');
            if (!root) return;
            const urls = getVisibleSitePartners().map(function(p) { return p.logoUrl; }).filter(Boolean);
            const doorMode = document.body.classList.contains('nebras-door-interface-active');
            if (!urls.length) {
                root.innerHTML = '';
                root.hidden = true;
                if (aside) aside.hidden = true;
                return;
            }
            root.hidden = false;
            root.style.setProperty('--cycle-duration', (urls.length * 3) + 's');
            root.innerHTML = buildMiniShowcaseInnerHtml(urls, 'partners');
            if (aside) {
                aside.hidden = doorMode;
                aside.setAttribute('aria-hidden', doorMode ? 'true' : 'false');
            }
        }

        function refreshNebrasMiniShowcases() {
            refreshDashboardDoorShowcase();
            refreshTopPartnersMiniShowcase();
            refreshHeaderHeroDoorShowcase();
            refreshHeaderDoorShowcase();
        }

        function renderPartnersMarquees() {
            ensureBuiltinSitePartners();
            const lang = currentLang || 'ar';
            const ui = siteText[lang] || siteText.ar;
            const visible = getVisibleSitePartners();
            const split = splitPartnersForMarqueeRows(visible);
            const htmlA = buildPartnersTrackHtml(split.rowA, lang, 2);
            const htmlB = buildPartnersTrackHtml(split.rowB, lang, 2);
            const hasPartners = !!(htmlA || htmlB);
            const isAdmin = document.body.classList.contains('admin-session');
            const adminEmptyHint = '<div class="nebras-partners-empty nebras-partners-empty--admin"><i class="fas fa-handshake"></i><p>' +
                escapeHtmlAttr(ui.partnersEmptyHintAdmin || ui.partnersEmptyHint || '') + '</p></div>';
            const publicSection = document.getElementById('nebras-partners-section');
            const publicStage = document.getElementById('nebras-partners-stage-public');
            applyPartnersTrack(document.getElementById('nebras-partners-track-public-a'), htmlA, '', false);
            applyPartnersTrack(document.getElementById('nebras-partners-track-public-b'), htmlB, '', false);
            markPartnersMarqueesAnimated(publicStage);
            if (publicSection) {
                publicSection.hidden = !hasPartners;
                publicSection.style.display = hasPartners ? '' : 'none';
                publicSection.removeAttribute('aria-hidden');
            }
            if (publicStage) publicStage.hidden = !hasPartners;
            const dashTrackA = document.getElementById('nebras-partners-track-dashboard-a');
            const dashTrackB = document.getElementById('nebras-partners-track-dashboard-b');
            const dashStage = document.getElementById('nebras-partners-stage-dashboard');
            if (hasPartners) {
                applyPartnersTrack(dashTrackA, htmlA, '', false);
                applyPartnersTrack(dashTrackB, htmlB, '', false);
                markPartnersMarqueesAnimated(dashStage);
            } else if (isAdmin) {
                applyPartnersTrack(dashTrackA, '', adminEmptyHint);
                applyPartnersTrack(dashTrackB, '');
            } else {
                applyPartnersTrack(dashTrackA, '');
                applyPartnersTrack(dashTrackB, '');
            }
            if (dashStage) dashStage.classList.toggle('nebras-partners-stage--empty', !hasPartners && isAdmin);
            const dashHint = document.getElementById('dashboard-partners-hint');
            if (dashHint) dashHint.style.display = hasPartners ? 'none' : '';
            const dashSubtitle = document.getElementById('dashboard-partners-subtitle');
            if (dashSubtitle) dashSubtitle.textContent = ui.partnersSuccessSubtitle || 'شركاؤنا في النجاح';
            refreshTopPartnersMiniShowcase();
        }

        function buildCertificationsGridHtml(lang) {
            const items = (siteCertifications || []).filter(function(c) { return c && c.visible !== false && c.mediaUrl; })
                .sort(function(a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
            if (!items.length) {
                const ui = siteText[lang] || siteText.ar;
                const msg = document.body.classList.contains('admin-session')
                    ? (ui.certsEmptyHintAdmin || ui.certsEmptyHint || '')
                    : (ui.certsEmptyHintPublic || ui.certsEmptyPublic || 'قريباً — اعتمادات وشهادات مصنع نبراس.');
                return '<p class="nebras-certs-empty" style="grid-column:1/-1;opacity:0.88">' + escapeHtmlAttr(msg) + '</p>';
            }
            return items.map(function(cert) {
                const title = getCertDisplayField(cert, 'title', lang);
                const caption = getCertDisplayField(cert, 'caption', lang);
                const url = resolveDisplayMediaUrl(cert.mediaUrl);
                const fullUrl = mediaUrlForLightbox(cert.mediaUrl);
                const isPdf = cert.mediaType === 'pdf' || /\.pdf(\?|$)/i.test(url);
                if (isPdf) {
                    return '<article class="nebras-cert-card nebras-cert-card--pdf">' +
                        '<div class="nebras-cert-pdf-icon"><i class="fas fa-file-pdf"></i></div>' +
                        '<h4>' + escapeHtmlAttr(title || 'PDF') + '</h4>' +
                        (caption ? '<p>' + escapeHtmlAttr(caption) + '</p>' : '') +
                        '<a class="nebras-cert-open" href="' + escapeHtmlAttr(url) + '" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> فتح الوثيقة</a></article>';
                }
                return '<article class="nebras-cert-card nebras-cert-card--clickable">' +
                    '<img src="' + escapeHtmlAttr(url) + '" data-full-src="' + escapeHtmlAttr(fullUrl || url) + '" alt="' + escapeHtmlAttr(title) + '" loading="lazy" title="' + escapeHtmlAttr((siteText[lang] || siteText.ar).lightboxOpenHint || 'اضغط للتكبير') + '">' +
                    '<h4>' + escapeHtmlAttr(title) + '</h4>' +
                    (caption ? '<p>' + escapeHtmlAttr(caption) + '</p>' : '') + '</article>';
            }).join('');
        }

        function openCertificationsHub() {
            openNebrasWorkspace({ pillar: 'showroom', view: 'certifications' });
        }

        function openShowroomHub() {
            openNebrasWorkspace({ pillar: 'showroom', view: 'showroom-hub' });
        }

        function normalizeShowroomGallery(raw) {
            const base = JSON.parse(JSON.stringify(DEFAULT_SHOWROOM_GALLERY));
            if (!raw || typeof raw !== 'object') return base;
            ['products', 'projects'].forEach(function(key) {
                const sec = raw[key];
                if (!sec || typeof sec !== 'object') return;
                if (sec.titleAr) base[key].titleAr = String(sec.titleAr);
                if (sec.titleEn) base[key].titleEn = String(sec.titleEn);
                if (sec.introAr) base[key].introAr = String(sec.introAr);
                if (sec.introEn) base[key].introEn = String(sec.introEn);
                if (Array.isArray(sec.items)) {
                    base[key].items = sec.items.filter(function(it) { return it && typeof it === 'object'; }).map(function(it, idx) {
                        return {
                            id: it.id || ('showroom-' + key + '-' + idx),
                            imageUrl: String(it.imageUrl || '').trim(),
                            titleAr: String(it.titleAr || '').trim(),
                            titleEn: String(it.titleEn || '').trim(),
                            captionAr: String(it.captionAr || '').trim(),
                            captionEn: String(it.captionEn || '').trim(),
                            linkUrl: String(it.linkUrl || '').trim(),
                            shopProductId: String(it.shopProductId || '').trim(),
                            shopVariantIndex: it.shopVariantIndex != null && it.shopVariantIndex !== '' ? parseInt(it.shopVariantIndex, 10) : null,
                            sortOrder: Number(it.sortOrder) || idx + 1,
                            visible: it.visible !== false
                        };
                    });
                }
            });
            return base;
        }

        function ensureShowroomGallery() {
            showroomGallery = normalizeShowroomGallery(showroomGallery);
            return showroomGallery;
        }

        function getShowroomSection(sectionKey) {
            ensureShowroomGallery();
            return showroomGallery[sectionKey] || { items: [] };
        }

        function getShowroomSectionField(sec, field, lang) {
            if (!sec) return '';
            const suffix = lang === 'en' ? 'En' : lang === 'zh' ? 'Zh' : 'Ar';
            return String(sec[field + suffix] || sec[field + 'Ar'] || sec[field + 'En'] || '').trim();
        }

        function getShowroomItemField(item, field, lang) {
            if (!item) return '';
            const suffix = lang === 'en' ? 'En' : lang === 'zh' ? 'Zh' : 'Ar';
            return String(item[field + suffix] || item[field + 'Ar'] || item[field + 'En'] || '').trim();
        }

        function getShowroomMediaType(item) {
            if (!item) return 'image';
            if (item.mediaType === 'video') return 'video';
            const url = String(item.imageUrl || item.videoUrl || '').trim();
            if (NEBRAS_VIDEO_EXT_RE.test(url)) return 'video';
            return 'image';
        }

        function getShowroomItemMediaUrl(item) {
            return String(item.imageUrl || item.videoUrl || '').trim();
        }

        function getVisibleShowroomItems(sectionKey) {
            return (getShowroomSection(sectionKey).items || [])
                .filter(function(it) { return it && it.visible !== false && getShowroomItemMediaUrl(it); })
                .sort(function(a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
        }

        function buildShowroomGalleryCardHtml(item, lang, ui) {
            const title = getShowroomItemField(item, 'title', lang) || getShowroomItemField(item, 'caption', lang);
            const caption = getShowroomItemField(item, 'caption', lang);
            const mediaUrl = getShowroomItemMediaUrl(item);
            const mediaType = getShowroomMediaType(item);
            const resolved = resolveDisplayMediaUrl(mediaUrl);
            const fullMedia = mediaUrlForLightbox(mediaUrl);
            const link = String(item.linkUrl || '').trim();
            const pid = String(item.shopProductId || '').trim();
            let shopHtml = '';
            if (pid) {
                const product = siteProducts.find(function(p) { return p.id === pid; });
                if (product && productHasShop(product)) {
                    const vIdx = item.shopVariantIndex != null && !isNaN(item.shopVariantIndex) ? item.shopVariantIndex : 0;
                    const safePid = pid.replace(/'/g, "\\'");
                    shopHtml = '<button type="button" class="showroom-gallery-shop-btn" onclick="event.stopPropagation();addVariantIndexToCart(\'' + safePid + '\',' + vIdx + ',1)">' +
                        '<i class="fas fa-cart-plus"></i> ' + escapeHtmlAttr(ui.addVariantToCart || 'أضف للسلة') + '</button>';
                }
            }
            let mediaInner = '';
            if (mediaType === 'video') {
                mediaInner = '<video class="showroom-gallery-video" src="' + escapeHtmlAttr(resolved) + '" controls playsinline preload="metadata" poster=""></video>' +
                    '<span class="showroom-media-badge showroom-media-badge--video"><i class="fas fa-film"></i></span>';
            } else {
                mediaInner = '<img src="' + escapeHtmlAttr(resolved) + '" data-full-src="' + escapeHtmlAttr(fullMedia || resolved) + '" alt="' + escapeHtmlAttr(title || '') + '" loading="lazy" decoding="async">';
            }
            const body = '<div class="showroom-gallery-card-body">' +
                (title ? '<h4>' + escapeHtmlAttr(title) + '</h4>' : '') +
                (caption && caption !== title ? '<p>' + escapeHtmlAttr(caption) + '</p>' : '') +
                shopHtml + '</div>';
            if (link && /^https?:\/\//i.test(link)) {
                return '<a class="showroom-gallery-card" href="' + escapeHtmlAttr(link) + '" target="_blank" rel="noopener noreferrer">' +
                    '<div class="showroom-gallery-card-media">' + mediaInner + '</div>' + body + '</a>';
            }
            return '<article class="showroom-gallery-card">' +
                '<div class="showroom-gallery-card-media">' + mediaInner + '</div>' + body + '</article>';
        }

        function buildShowroomSectionHtml(sectionKey, lang) {
            const ui = siteText[lang] || siteText.ar;
            const sec = getShowroomSection(sectionKey);
            const items = getVisibleShowroomItems(sectionKey);
            const title = getShowroomSectionField(sec, 'title', lang);
            const intro = getShowroomSectionField(sec, 'intro', lang);
            const emptyMsg = sectionKey === 'projects'
                ? (ui.showroomProjectsEmpty || 'قريباً — مشاريع نبراس المنفّذة.')
                : (ui.showroomProductsEmpty || 'قريباً — صور منتجات نبراس.');
            const grid = items.length
                ? '<div class="showroom-gallery-grid">' + items.map(function(it) { return buildShowroomGalleryCardHtml(it, lang, ui); }).join('') + '</div>'
                : '<p class="showroom-gallery-empty">' + escapeHtmlAttr(emptyMsg) + '</p>';
            return '<section class="showroom-hub-section showroom-hub-section--' + sectionKey + '" id="showroom-section-' + sectionKey + '">' +
                '<div class="showroom-hub-section-head">' +
                '<h3><i class="fas fa-' + (sectionKey === 'projects' ? 'building' : 'cubes') + '"></i> ' + escapeHtmlAttr(title) + '</h3>' +
                (intro ? '<p class="showroom-hub-section-intro">' + escapeHtmlAttr(intro) + '</p>' : '') +
                '</div>' + grid + '</section>';
        }

        function buildShowroomHubHtml(lang) {
            const ui = siteText[lang] || siteText.ar;
            ensureShowroomGallery();
            return '<div class="showroom-hub">' +
                '<p class="workspace-intro showroom-hub-intro">' + escapeHtmlAttr(ui.showroomHubIntro || 'معرض نبراس — منتجاتنا ومشاريعنا المنفّذة.') + '</p>' +
                '<div class="showroom-hub-quick">' +
                '<button type="button" class="workspace-action-btn" onclick="openNebrasWorkspace({pillar:\'showroom\',view:\'certifications\'})"><i class="fas fa-award"></i> ' + escapeHtmlAttr(ui.visitorQuickCertifications || 'اعتمادات وشهادات') + '</button>' +
                '<button type="button" class="workspace-action-btn" onclick="openNebrasWorkspace({pillar:\'showroom\',view:\'color-rolls\'})"><i class="fas fa-swatchbook"></i> ' + escapeHtmlAttr(ui.visitorQuickColorRolls || 'كتالوج الألوان') + '</button>' +
                '<button type="button" class="workspace-action-btn" onclick="openNebrasWorkspace({pillar:\'showroom\',view:\'door-designer\'})"><i class="fas fa-pencil-ruler"></i> ' + escapeHtmlAttr(ui.visitorQuickDoorDesigner || 'صمّم بابك') + '</button>' +
                '</div>' +
                buildShowroomSectionHtml('products', lang) +
                buildShowroomSectionHtml('projects', lang) +
                '</div>';
        }

        function displayShowroomAdmin() {
            const listProducts = document.getElementById('scm-showroom-products-list');
            const listProjects = document.getElementById('scm-showroom-projects-list');
            if (!listProducts && !listProjects) return;
            ensureShowroomGallery();
            function renderList(sectionKey, el) {
                if (!el) return;
                const items = (getShowroomSection(sectionKey).items || []).slice().sort(function(a, b) {
                    return (a.sortOrder || 0) - (b.sortOrder || 0);
                });
                el.innerHTML = items.map(function(it) {
                    const shop = it.shopProductId ? (' · سلة: ' + it.shopProductId) : '';
                    const mediaBadge = getShowroomMediaType(it) === 'video' ? ' <span class="showroom-media-badge showroom-media-badge--video">فيديو</span>' : '';
                    return '<li><strong>' + escapeHtmlAttr(it.titleAr || it.id) + '</strong>' + mediaBadge +
                        '<small>' + escapeHtmlAttr(it.imageUrl || '') + shop + '</small>' +
                        '<div class="scm-row-actions">' +
                        '<button type="button" onclick="editShowroomItem(\'' + sectionKey + '\',\'' + it.id + '\')">تعديل</button>' +
                        '<button type="button" onclick="deleteShowroomItem(\'' + sectionKey + '\',\'' + it.id + '\')">حذف</button></div></li>';
                }).join('') || '<li>لا توجد صور — اضغطي + إضافة صورة</li>';
            }
            renderList('products', listProducts);
            renderList('projects', listProjects);
        }

        async function editShowroomSectionMeta(sectionKey) {
            if (!requirePermission('content')) return;
            ensureShowroomGallery();
            const sec = showroomGallery[sectionKey];
            if (!sec) return;
            const titleAr = prompt('عنوان القسم (عربي):', sec.titleAr || '');
            if (titleAr === null) return;
            const titleEn = prompt('عنوان القسم (إنجليزي):', sec.titleEn || titleAr) || titleAr;
            const introAr = prompt('مقدمة القسم (عربي):', sec.introAr || '') || '';
            const introEn = prompt('مقدمة القسم (إنجليزي):', sec.introEn || introAr) || introAr;
            sec.titleAr = titleAr.trim();
            sec.titleEn = titleEn.trim();
            sec.introAr = introAr.trim();
            sec.introEn = introEn.trim();
            saveContentData();
            displayShowroomAdmin();
            addAuditLog('تعديل معرض', sectionKey);
        }

        async function addShowroomItem(sectionKey) {
            if (!requirePermission('content')) return;
            ensureShowroomGallery();
            const titleAr = prompt('عنوان المحتوى (عربي):');
            if (titleAr === null) return;
            const captionAr = prompt('وصف تحت المحتوى (عربي):', '') || '';
            const mediaMode = prompt('نوع المحتوى:\n1 = صورة أو PDF\n2 = فيديو (MP4/WebM)\n\nاكتب 1 أو 2:', '1');
            if (mediaMode === null) return;
            const isVideo = String(mediaMode).trim() === '2';
            const imageUrl = await pickMediaPath({
                label: isVideo ? 'فيديو المعرض (استوديو/سينما)' : 'صورة أو PDF للمعرض',
                accept: isVideo ? NEBRAS_VIDEO_ACCEPT : NEBRAS_SHOWROOM_MEDIA_ACCEPT
            });
            if (!imageUrl) { alert('يلزم رفع ملف.'); return; }
            const shopProductId = prompt('ربط بمنتج للسلة (معرّف prod-… أو اتركه فارغاً):', '') || '';
            let shopVariantIndex = null;
            if (shopProductId.trim()) {
                const vRaw = prompt('رقم الصنف (0 للأول، 1 للثاني… أو اتركه فارغاً = 0):', '0');
                if (vRaw !== null && String(vRaw).trim() !== '') shopVariantIndex = parseInt(vRaw, 10);
            }
            const linkUrl = prompt('رابط خارجي (اختياري):', '') || '';
            const sec = showroomGallery[sectionKey];
            sec.items.push({
                id: 'showroom-' + sectionKey + '-' + Date.now(),
                imageUrl: imageUrl,
                mediaType: isVideo ? 'video' : ( /\.pdf(\?|$)/i.test(imageUrl) ? 'pdf' : 'image'),
                titleAr: titleAr.trim(),
                titleEn: titleAr.trim(),
                captionAr: captionAr.trim(),
                captionEn: captionAr.trim(),
                linkUrl: linkUrl.trim(),
                shopProductId: shopProductId.trim(),
                shopVariantIndex: shopVariantIndex,
                sortOrder: sec.items.length + 1,
                visible: true
            });
            saveContentData();
            displayShowroomAdmin();
            addAuditLog('إضافة صورة معرض', sectionKey + ': ' + titleAr);
        }

        async function editShowroomItem(sectionKey, itemId) {
            if (!requirePermission('content')) return;
            ensureShowroomGallery();
            const sec = showroomGallery[sectionKey];
            const it = (sec.items || []).find(function(x) { return x.id === itemId; });
            if (!it) return;
            const titleAr = prompt('العنوان (عربي):', it.titleAr || '');
            if (titleAr === null) return;
            const captionAr = prompt('الوصف:', it.captionAr || '') || '';
            const imageUrl = await pickMediaPath({ label: 'صورة المعرض', defaultValue: it.imageUrl || '' });
            if (imageUrl) it.imageUrl = imageUrl;
            it.titleAr = titleAr.trim();
            it.titleEn = (prompt('العنوان (إنجليزي):', it.titleEn || titleAr) || titleAr).trim();
            it.captionAr = captionAr.trim();
            it.captionEn = (prompt('الوصف (إنجليزي):', it.captionEn || captionAr) || captionAr).trim();
            it.shopProductId = (prompt('معرّف منتج للسلة (فارغ = بدون):', it.shopProductId || '') || '').trim();
            if (it.shopProductId) {
                const vRaw = prompt('رقم الصنف:', it.shopVariantIndex != null ? String(it.shopVariantIndex) : '0');
                it.shopVariantIndex = vRaw != null && String(vRaw).trim() !== '' ? parseInt(vRaw, 10) : 0;
            } else {
                it.shopVariantIndex = null;
            }
            it.linkUrl = (prompt('رابط خارجي:', it.linkUrl || '') || '').trim();
            it.visible = confirm('إظهار الصورة للزوار؟ (إلغاء = إخفاء)');
            saveContentData();
            displayShowroomAdmin();
        }

        function deleteShowroomItem(sectionKey, itemId) {
            if (!requirePermission('content')) return;
            if (!confirm('حذف هذه الصورة من المعرض؟')) return;
            ensureShowroomGallery();
            showroomGallery[sectionKey].items = (showroomGallery[sectionKey].items || []).filter(function(x) { return x.id !== itemId; });
            saveContentData();
            displayShowroomAdmin();
            addAuditLog('حذف صورة معرض', itemId);
        }

        async function addSitePartner() {
            if (!requirePermission('content')) return;
            const nameAr = prompt('اسم الشريك (عربي):');
            if (nameAr === null) return;
            const nameEn = prompt('اسم الشريك (إنجليزي — اختياري):', '') || '';
            const logoUrl = await pickMediaPath({ label: 'شعار الشريك', defaultValue: 'images/logo.png' });
            if (!logoUrl) { alert('يلزم شعار الشريك.'); return; }
            const linkUrl = prompt('رابط الموقع (اختياري):', '') || '';
            sitePartners.push({
                id: 'partner-' + Date.now(),
                nameAr: nameAr.trim(),
                nameEn: nameEn.trim(),
                logoUrl: logoUrl,
                linkUrl: linkUrl.trim(),
                sortOrder: sitePartners.length + 1,
                visible: true,
                logoOnly: true
            });
            saveContentData();
            displayPartnersAdmin();
            addAuditLog('إضافة شريك', nameAr);
        }

        async function editSitePartner(partnerId) {
            if (!requirePermission('content')) return;
            const p = sitePartners.find(function(x) { return x.id === partnerId; });
            if (!p) return;
            const nameAr = prompt('اسم الشريك (عربي):', p.nameAr || '');
            if (nameAr === null) return;
            const nameEn = prompt('اسم الشريك (إنجليزي):', p.nameEn || '') || '';
            const logoUrl = await pickMediaPath({ label: 'شعار الشريك', defaultValue: p.logoUrl || '' });
            if (logoUrl) p.logoUrl = logoUrl;
            p.nameAr = nameAr.trim();
            p.nameEn = nameEn.trim();
            p.linkUrl = (prompt('رابط الموقع:', p.linkUrl || '') || '').trim();
            saveContentData();
            displayPartnersAdmin();
        }

        function deleteSitePartner(partnerId) {
            if (!requirePermission('content')) return;
            if (!confirm('حذف هذا الشريك؟')) return;
            sitePartners = sitePartners.filter(function(p) { return p.id !== partnerId; });
            saveContentData();
            displayPartnersAdmin();
        }

        function displayPartnersAdmin() {
            const list = document.getElementById('scm-partners-list');
            if (!list) return;
            list.innerHTML = (sitePartners || []).map(function(p) {
                return '<li><strong>' + escapeHtmlAttr(p.nameAr || p.id) + '</strong>' +
                    '<small>شعار: ' + escapeHtmlAttr(p.logoUrl || '') + '</small>' +
                    '<div class="scm-row-actions">' +
                    '<button type="button" onclick="editSitePartner(\'' + p.id + '\')">تعديل</button>' +
                    '<button type="button" onclick="deleteSitePartner(\'' + p.id + '\')">حذف</button></div></li>';
            }).join('') || '<li>لا يوجد شركاء — اضغطي + شريك جديد</li>';
        }

        async function addSiteCertification() {
            if (!requirePermission('content')) return;
            const titleAr = prompt('عنوان الشهادة / الاعتماد (عربي):');
            if (titleAr === null || !titleAr.trim()) return;
            const titleEn = prompt('العنوان (إنجليزي — اختياري):', '') || '';
            const captionAr = prompt('الشرح تحت الصورة/الوثيقة (عربي):', '') || '';
            const captionEn = prompt('الشرح (إنجليزي — اختياري):', '') || '';
            const mediaUrl = await pickMediaPath({ label: 'صورة الشهادة أو PDF', defaultValue: '', accept: NEBRAS_MEDIA_ACCEPT_ALL });
            if (!mediaUrl) return;
            const mediaType = /\.pdf(\?|$)/i.test(mediaUrl) ? 'pdf' : 'image';
            siteCertifications.push({
                id: 'cert-' + Date.now(),
                titleAr: titleAr.trim(),
                titleEn: titleEn.trim(),
                captionAr: captionAr.trim(),
                captionEn: captionEn.trim(),
                mediaUrl: mediaUrl,
                mediaType: mediaType,
                sortOrder: siteCertifications.length + 1,
                visible: true
            });
            saveContentData();
            displayCertificationsAdmin();
            addAuditLog('إضافة اعتماد/شهادة', titleAr);
        }

        async function editSiteCertification(certId) {
            if (!requirePermission('content')) return;
            const c = siteCertifications.find(function(x) { return x.id === certId; });
            if (!c) return;
            const titleAr = prompt('العنوان (عربي):', c.titleAr || '');
            if (titleAr === null) return;
            c.titleAr = titleAr.trim();
            c.titleEn = (prompt('العنوان (إنجليزي):', c.titleEn || '') || '').trim();
            c.captionAr = (prompt('الشرح (عربي):', c.captionAr || '') || '').trim();
            c.captionEn = (prompt('الشرح (إنجليزي):', c.captionEn || '') || '').trim();
            const mediaUrl = await pickMediaPath({ label: 'صورة أو PDF', defaultValue: c.mediaUrl || '' });
            if (mediaUrl) {
                c.mediaUrl = mediaUrl;
                c.mediaType = /\.pdf(\?|$)/i.test(mediaUrl) ? 'pdf' : 'image';
            }
            saveContentData();
            displayCertificationsAdmin();
        }

        function deleteSiteCertification(certId) {
            if (!requirePermission('content')) return;
            if (!confirm('حذف هذا الاعتماد؟')) return;
            siteCertifications = siteCertifications.filter(function(c) { return c.id !== certId; });
            saveContentData();
            displayCertificationsAdmin();
        }

        function displayCertificationsAdmin() {
            const list = document.getElementById('scm-certifications-list');
            if (!list) return;
            list.innerHTML = (siteCertifications || []).map(function(c) {
                return '<li><strong>' + escapeHtmlAttr(c.titleAr || c.id) + '</strong> [' + escapeHtmlAttr(c.mediaType || 'image') + ']' +
                    '<small>' + escapeHtmlAttr(c.captionAr || '') + '</small>' +
                    '<div class="scm-row-actions">' +
                    '<button type="button" onclick="editSiteCertification(\'' + c.id + '\')">تعديل</button>' +
                    '<button type="button" onclick="deleteSiteCertification(\'' + c.id + '\')">حذف</button></div></li>';
            }).join('') || '<li>لا توجد شهادات — اضغطي + اعتماد / شهادة</li>';
        }

        function renderDashboardTiles() {
            const quick = document.getElementById('dashboard-actions-grid');
            const secondary = document.getElementById('dashboard-secondary-grid');
            const lang = currentLang || 'ar';
            const visible = dashboardTiles.filter(function(t) {
                if (t.visible === false) return false;
                if (t.superadminOnly && !isMainGovernanceAdmin()) return false;
                if (t.permission && currentAdmin && !canManage(t.permission)) return false;
                return true;
            });

            function tileTitle(tile) {
                const t = getLocalizedCatalogField(tile, 'title', lang);
                const icon = tile.titleIcon ? '<i class="' + escapeHtmlAttr(tile.titleIcon) + '"></i> ' : '';
                return icon + escapeHtmlAttr(t);
            }

            function buildDashboardTileCard(tile, zone, index) {
                const title = getLocalizedCatalogField(tile, 'title', lang);
                const text = getLocalizedCatalogField(tile, 'text', lang);
                const extraClass = tile.cssClass ? ' ' + escapeHtmlAttr(tile.cssClass) : '';
                const zoneClass = zone === 'grid' ? ' dashboard-tile-card--grid' : ' dashboard-tile-card--quick';
                return '<div class="dashboard-tile-card' + zoneClass + extraClass + '" data-tile-id="' + escapeHtmlAttr(tile.id) + '" style="--tile-i:' + index + '" onclick="onDashboardTileClick(\'' + String(tile.id).replace(/'/g, "\\'") + '\')" role="button" tabindex="0">' +
                    '<div class="dashboard-tile-glow" aria-hidden="true"></div>' +
                    '<div class="dashboard-tile-icon"><i class="' + escapeHtmlAttr(tile.iconClass || 'fas fa-star') + '"></i></div>' +
                    '<h3>' + escapeHtmlAttr(title) + '</h3>' +
                    '<p>' + escapeHtmlAttr(text) + '</p>' +
                    '<span class="dashboard-tile-arrow"><i class="fas fa-arrow-left"></i> فتح</span></div>';
            }

            if (quick) {
                quick.classList.add('dashboard-tiles-bento');
                const quickTiles = visible.filter(function(t) { return t.zone === 'quick'; });
                quick.innerHTML = quickTiles.map(function(tile, i) { return buildDashboardTileCard(tile, 'quick', i); }).join('');
                quickTiles.forEach(function(tile) {
                    const node = quick.querySelector('[data-tile-id="' + tile.id + '"]');
                    if (node && tile.backgroundImage) applyBackgroundToNode(node, tile.backgroundImage, false);
                });
            }

            if (secondary) {
                secondary.classList.add('dashboard-tiles-bento');
                const gridTiles = visible.filter(function(t) { return t.zone === 'grid'; });
                secondary.innerHTML = gridTiles.map(function(tile, i) { return buildDashboardTileCard(tile, 'grid', i); }).join('');
                gridTiles.forEach(function(tile) {
                    const node = secondary.querySelector('[data-tile-id="' + tile.id + '"]');
                    if (node && tile.backgroundImage) applyBackgroundToNode(node, tile.backgroundImage, false);
                });
            }
            renderPartnersMarquees();
        }


        function openCustomSectionItem(sectionId, itemId) {
            const section = siteCustomSections.find(function(s) { return s.id === sectionId; });
            const item = section && (section.items || []).find(function(i) { return i.id === itemId; });
            if (!item) return;
            const lang = currentLang || 'ar';
            const ui = siteText[lang] || siteText.ar;
            const album = (item.album || []).map(normalizeMediaPath).filter(Boolean);
            const title = getLocalizedCatalogField(item, 'title', lang);
            let body = getLocalizedCatalogField(item, 'text', lang) || getVisitorTargetCaption(item);
            body += '\n\n' + (ui.visitorOverlayIntro || '');
            let primary = { type: 'none', value: '' };
            const tg = String(item.target || '').trim();
            if (tg.startsWith('#')) primary = { type: 'scroll', value: tg };
            else if (/^https?:\/\//i.test(tg)) primary = { type: 'external', value: tg };
            showRichIconOverlay(title, body, album, primary);
        }

        function renderCustomSiteSections() {
            const root = document.getElementById('site-custom-sections-root');
            if (!root) return;
            const lang = currentLang || 'ar';
            const sections = siteCustomSections.filter(function(s) { return s.visible !== false; })
                .sort(function(a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });

            root.innerHTML = sections.map(function(section) {
                const title = getLocalizedCatalogField(section, 'title', lang);
                const subtitle = getLocalizedCatalogField(section, 'subtitle', lang);
                const items = (section.items || []).filter(function(i) { return i.visible !== false; });
                const cards = items.map(function(item) {
                    const ititle = getLocalizedCatalogField(item, 'title', lang);
                    const caption = getLocalizedCatalogField(item, 'text', lang) || getVisitorTargetCaption(item);
                    return '<div class="spotlight-card visitor-icon-card" data-section-id="' + escapeHtmlAttr(section.id) + '" data-item-id="' + escapeHtmlAttr(item.id) + '" onclick="openCustomSectionItem(\'' + String(section.id).replace(/'/g, "\\'") + '\',\'' + String(item.id).replace(/'/g, "\\'") + '\')">' +
                        '<div class="card-icon" aria-hidden="true"><i class="' + escapeHtmlAttr(item.iconClass || 'fas fa-star') + '"></i></div>' +
                        '<div class="card-content"><h3>' + escapeHtmlAttr(ititle) + '</h3><p class="visitor-target-caption">' + escapeHtmlAttr(caption) + '</p></div></div>';
                }).join('');
                return '<section class="site-structure site-custom-section" id="custom-sec-' + escapeHtmlAttr(section.id) + '">' +
                    '<div class="section-title"><h2>' + escapeHtmlAttr(title) + '</h2><span>' + escapeHtmlAttr(subtitle) + '</span></div>' +
                    '<div class="visitor-icons-grid">' + cards + '</div></section>';
            }).join('');

            sections.forEach(function(section) {
                (section.items || []).forEach(function(item) {
                    const node = root.querySelector('[data-section-id="' + section.id + '"][data-item-id="' + item.id + '"]');
                    if (node && item.backgroundImage) applyBackgroundToNode(node, item.backgroundImage, false);
                });
            });
        }

        function getAboutPageLocalized(page, field, lang) {
            if (!page) return '';
            const suffix = lang === 'en' ? 'En' : lang === 'zh' ? 'Zh' : 'Ar';
            return String(page[field + suffix] || page[field + 'Ar'] || '').trim();
        }

        function ensureBuiltinAboutPages() {
            if (!aboutPages || typeof aboutPages !== 'object') aboutPages = {};
            Object.keys(DEFAULT_ABOUT_PAGES).forEach(function(key) {
                if (!aboutPages[key]) {
                    const def = DEFAULT_ABOUT_PAGES[key];
                    aboutPages[key] = Object.assign({}, def, {
                        album: (def.album || []).slice(),
                        gallery: (def.gallery || []).map(function(g) { return Object.assign({}, g); })
                    });
                } else {
                    const cur = aboutPages[key];
                    if (!cur.gallery) cur.gallery = [];
                    if (!cur.album) cur.album = (DEFAULT_ABOUT_PAGES[key].album || []).slice();
                }
            });
        }

        function renderAboutCards(lang) {
            ensureBuiltinAboutPages();
            const L = lang || currentLang || 'ar';
            const ui = siteText[L] || siteText.ar;
            [['who', 'about-title-1', 'about-text-1', 'about-hint-who', 'about-icon-who'], ['vision', 'about-title-2', 'about-text-2', 'about-hint-vision', 'about-icon-vision']].forEach(function(row) {
                const page = aboutPages[row[0]];
                if (!page) return;
                const titleEl = document.getElementById(row[1]);
                const textEl = document.getElementById(row[2]);
                const hintEl = document.getElementById(row[3]);
                const iconEl = document.getElementById(row[4]);
                let summary = getAboutPageLocalized(page, 'summary', L) || getAboutPageLocalized(page, 'body', L);
                let title = getAboutPageLocalized(page, 'title', L);
                const blockKey = row[0] === 'who' ? 'about_intro' : 'about_vision';
                const block = dynamicContentBlocks[blockKey];
                if (block) {
                    const bt = getLocalizedBlockField(block, 'title', L);
                    const bb = getLocalizedBlockField(block, 'body', L);
                    if (bt) title = bt;
                    if (bb) summary = bb;
                }
                if (titleEl) titleEl.textContent = title;
                if (textEl) textEl.textContent = summary;
                if (hintEl) hintEl.textContent = ui.aboutCardHint || 'اضغط للتفاصيل';
                if (iconEl && page.iconClass) iconEl.className = page.iconClass;
                const card = document.querySelector('.spotlight-card--about-' + (row[0] === 'who' ? 'who' : 'vision'));
                if (card && page.backgroundImage) applyBackgroundToNode(card, page.backgroundImage, false);
            });
        }

        function openAboutPage(pageId) {
            ensureBuiltinAboutPages();
            if (!aboutPages[pageId]) return;
            openNebrasWorkspace({ pillar: 'showroom', view: 'about-page', pageId: pageId });
        }

        function getAboutPageMediaList(page) {
            const images = [];
            if (!page) return images;
            (page.album || []).forEach(function(src) {
                const n = normalizeMediaPath(src);
                if (n && images.indexOf(n) === -1) images.push(n);
            });
            (page.gallery || []).forEach(function(item) {
                const n = normalizeMediaPath(item.image);
                if (n && images.indexOf(n) === -1) images.push(n);
            });
            return images;
        }

        function buildAboutPageWorkspaceHtml(pageId) {
            ensureBuiltinAboutPages();
            const page = aboutPages[pageId];
            const lang = currentLang || 'ar';
            const ui = siteText[lang] || siteText.ar;
            if (!page) {
                return '<p>' + escapeHtmlAttr(ui.workspaceSectionMissing || 'المحتوى قيد التحديث.') + '</p>';
            }
            const title = getAboutPageLocalized(page, 'title', lang);
            const body = getAboutPageLocalized(page, 'body', lang) || getAboutPageLocalized(page, 'summary', lang);
            const gallery = page.gallery || [];
            let html = '<div class="workspace-about-page">';
            html += '<h2 class="workspace-about-title">' + escapeHtmlAttr(title) + '</h2>';
            if (body) html += '<p class="workspace-intro">' + escapeHtmlAttr(body) + '</p>';
            html += buildWorkspaceGalleryHtml(getAboutPageMediaList(page));
            if (gallery.length) {
                html += '<h3 class="workspace-about-docs-title">' + escapeHtmlAttr(ui.aboutGalleryTitle || 'الشهادات والوثائق') + '</h3>';
                html += '<div class="workspace-docs workspace-about-gallery-list">';
                gallery.forEach(function(item) {
                    const label = lang === 'en' ? (item.labelEn || item.labelAr) : (lang === 'zh' ? (item.labelZh || item.labelAr) : (item.labelAr || item.labelEn));
                    const cap = lang === 'en' ? (item.captionEn || item.captionAr) : (item.captionAr || item.captionEn);
                    const imgUrl = normalizeMediaPath(item.image);
                    if (imgUrl) {
                        html += '<button type="button" class="workspace-about-doc-card" onclick="openNebrasMediaLightboxFromEl(this)" data-src="' + escapeHtmlAttr(imgUrl) + '">' +
                            '<img src="' + escapeHtmlAttr(imgUrl) + '" alt="' + escapeHtmlAttr(label || '') + '" loading="lazy">' +
                            '<span>' + escapeHtmlAttr(label || '') + (cap ? ' — ' + escapeHtmlAttr(cap) : '') + '</span></button>';
                    } else if (item.pdf || item.url) {
                        const docUrl = normalizeMediaPath(item.pdf || item.url);
                        html += '<a href="' + escapeHtmlAttr(docUrl) + '" target="_blank" rel="noopener noreferrer" class="workspace-about-doc-card workspace-about-doc-card--pdf"><i class="fas fa-file-pdf"></i> ' + escapeHtmlAttr(label || 'PDF') + '</a>';
                    }
                });
                html += '</div>';
            }
            html += '</div>';
            return html;
        }

        function renderAllPublicCatalog() {
            renderSiteProducts();
            renderVisitorIcons();
            renderSiteServiceCards();
            renderCustomSiteSections();
            renderAboutCards(currentLang || 'ar');
            renderPartnersMarquees();
            displayBranches();
            if (currentAdmin) renderDashboardTiles();
            renderCompanyLegalBars();
            renderBankAccountsPublic();
            updateOfficialOrganizationSchema();
            updateCartBadge();
            refreshClickableMediaSite(document);
        }

        function switchScmTab(tab) {
            if (!requirePermission('content', 'إدارة المحتوى متاحة لمن لديه صلاحية المحتوى.')) return;
            document.querySelectorAll('.scm-tabs button').forEach(function(btn) {
                btn.classList.toggle('active', btn.getAttribute('data-scm-tab') === tab);
            });
            document.querySelectorAll('.scm-panel').forEach(function(panel) {
                panel.classList.toggle('active', panel.id === 'scm-panel-' + tab);
            });
        }

        function openSiteContentManager() {
            if (!requirePermission('content', 'إدارة محتوى الموقع متاحة لمن لديه صلاحية المحتوى (مدير / Super Admin).')) return;
            switchScmTab('products');
            displaySiteProductsAdmin();
            displayVisitorIconsAdmin();
            displayDashboardTilesAdmin();
            displayCustomSectionsAdmin();
            displayAboutPagesAdmin();
            displayPartnersAdmin();
            displayCertificationsAdmin();
            displayShowroomAdmin();
            renderGovernanceStatusPanel();
            document.getElementById('site-content-management').classList.add('show');
        }

        function displayAboutPagesAdmin() {
            const list = document.getElementById('scm-about-list');
            if (!list) return;
            ensureBuiltinAboutPages();
            list.innerHTML = Object.keys(aboutPages).map(function(key) {
                const p = aboutPages[key];
                const gal = (p.gallery || []).length;
                const alb = (p.album || []).length;
                return '<li><strong>' + escapeHtmlAttr(p.titleAr || key) + '</strong> — ' + escapeHtmlAttr(key) +
                    '<small>ألبوم: ' + alb + ' | شهادات/وثائق: ' + gal + '</small>' +
                    '<div class="scm-row-actions">' +
                    '<button type="button" onclick="editAboutPage(\'' + key + '\')">تعديل النصوص</button>' +
                    '<button type="button" onclick="manageAboutGallery(\'' + key + '\')">الشهادات والصور</button>' +
                    '</div></li>';
            }).join('');
        }

        async function editAboutPage(pageId) {
            if (!requirePermission('content')) return;
            const page = aboutPages[pageId];
            if (!page) return;
            const titleAr = prompt('العنوان (عربي):', page.titleAr || '');
            if (titleAr === null) return;
            const titleEn = prompt('العنوان (إنجليزي):', page.titleEn || titleAr);
            const summaryAr = prompt('ملخص على البطاقة (عربي):', page.summaryAr || '');
            const bodyAr = prompt('التفاصيل الكاملة داخل الأيقونة (عربي) — يمكن عدة أسطر:', page.bodyAr || '');
            const bodyEn = prompt('Full details (English):', page.bodyEn || bodyAr);
            const iconClass = prompt('أيقونة FontAwesome:', page.iconClass || 'fas fa-industry');
            const bg = await pickMediaPath({ label: 'خلفية البطاقة', defaultValue: page.backgroundImage || '' });
            const albumMode = prompt('ألبوم الصور:\n1 = رفع من الجهاز\n2 = مسارات يدوية\nEnter = بدون تغيير', page.album && page.album.length ? '2' : '1');
            page.titleAr = titleAr.trim();
            page.titleEn = (titleEn || titleAr).trim();
            page.titleZh = page.titleZh || titleAr;
            page.summaryAr = (summaryAr || '').trim();
            page.summaryEn = page.summaryEn || page.summaryAr;
            page.bodyAr = (bodyAr || '').trim();
            page.bodyEn = (bodyEn || page.bodyAr).trim();
            if (iconClass) page.iconClass = iconClass.trim();
            if (bg) page.backgroundImage = bg.trim();
            if (albumMode === '1') {
                page.album = await pickMediaAlbumInteractive(page.album || []);
            } else if (albumMode === '2') {
                const albumRaw = prompt('صور الألبوم (مسارات أو روابط مفصولة بفاصلة):', (page.album || []).join(', '));
                if (albumRaw !== null) {
                    page.album = albumRaw.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
                }
            }
            saveContentData();
            displayAboutPagesAdmin();
            addAuditLog('تعديل من نحن/رؤية', page.titleAr);
        }

        async function manageAboutGallery(pageId) {
            if (!requirePermission('content')) return;
            const page = aboutPages[pageId];
            if (!page) return;
            if (!page.gallery) page.gallery = [];
            const cmd = prompt('شهادات ووثائق «' + (page.titleAr || pageId) + '»\nadd = إضافة | رقم = تعديل | del+رقم = حذف\nالعدد الحالي: ' + page.gallery.length, 'add');
            if (!cmd) return;
            const c = String(cmd).trim().toLowerCase();
            if (c === 'add') {
                const labelAr = prompt('اسم الشهادة/الوثيقة (عربي):', 'شهادة معتمدة');
                const captionAr = prompt('وصف مختصر:', '');
                const image = await pickMediaPath({ label: 'صورة الشهادة/الوثيقة', defaultValue: (page.album || [])[0] || '' });
                if (!image) return;
                page.gallery.push({
                    id: 'doc-' + Date.now(),
                    labelAr: (labelAr || '').trim(),
                    labelEn: (labelAr || '').trim(),
                    captionAr: (captionAr || '').trim(),
                    captionEn: (captionAr || '').trim(),
                    image: image.trim()
                });
            } else if (c.indexOf('del') === 0) {
                const idx = parseInt(c.replace(/\D/g, ''), 10);
                if (!isNaN(idx)) page.gallery.splice(idx, 1);
            } else {
                const idx = parseInt(c, 10);
                const item = page.gallery[idx];
                if (!item) { alert('رقم غير صحيح'); return; }
                const labelAr = prompt('الاسم:', item.labelAr || '');
                const captionAr = prompt('الوصف:', item.captionAr || '');
                const image = await pickMediaPath({ label: 'صورة الشهادة', defaultValue: item.image || '' });
                if (labelAr !== null) { item.labelAr = labelAr.trim(); item.labelEn = item.labelAr; }
                if (captionAr !== null) { item.captionAr = captionAr.trim(); item.captionEn = item.captionAr; }
                if (image) item.image = image.trim();
            }
            saveContentData();
            displayAboutPagesAdmin();
            addAuditLog('شهادات من نحن/رؤية', page.titleAr);
        }

        async function promptCatalogFields(existing, type) {
            const e = existing || {};
            const titleAr = prompt('العنوان (عربي):', e.titleAr || '');
            if (titleAr === null) return null;
            const titleEn = prompt('العنوان (إنجليزي):', e.titleEn || titleAr);
            const textAr = prompt('الوصف (عربي):', e.textAr || '');
            const iconClass = prompt('أيقونة FontAwesome (مثال fas fa-star):', e.iconClass || 'fas fa-star');
            const bgPicked = await pickMediaPath({ label: 'خلفية البطاقة / صورة المنتج', defaultValue: e.backgroundImage || '' });
            const backgroundImage = bgPicked === null ? (e.backgroundImage || '') : bgPicked;
            const albumMode = prompt('ألبوم صور داخل الأيقونة:\n1 = رفع من الجهاز\n2 = مسارات يدوية\nEnter = الإبقاء على الحالي', (e.album || []).length ? '2' : '1');
            let album = (e.album || []).slice();
            if (albumMode === '1') {
                album = await pickMediaAlbumInteractive(album);
            } else if (albumMode === '2') {
                const albumRaw = prompt('ألبوم (مسارات أو روابط مفصولة بفاصلة):', album.join(', '));
                if (albumRaw !== null) {
                    album = albumRaw.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
                }
            }
            const target = prompt('الوجهة (#قسم أو رابط):', e.target || '#products');
            if (!titleAr || !iconClass) return null;
            return {
                titleAr: titleAr.trim(),
                titleEn: (titleEn || titleAr).trim(),
                titleZh: (e.titleZh || titleAr).trim(),
                textAr: (textAr || '').trim(),
                textEn: (e.textEn || textAr || '').trim(),
                textZh: (e.textZh || textAr || '').trim(),
                iconClass: iconClass.trim(),
                titleIcon: (e.titleIcon || '').trim(),
                backgroundImage: (backgroundImage || '').trim(),
                album: album,
                target: (target || '').trim()
            };
        }

        function canManageFullSiteContent() {
            return canManage('content');
        }

        function requireFullSiteContent(message) {
            if (!canManageFullSiteContent()) {
                alert(message || 'إدارة المحتوى متاحة للإدارة الرئيسية (NEBRASFACTORY / NEBRASBASIC) أو من لديه صلاحية المحتوى.');
                return false;
            }
            return true;
        }

        function getStoreCatalogHubIconIds() {
            return [8, 9, 10, 11];
        }

        function isStoreCatalogHubIcon(icon) {
            if (!icon) return false;
            if (getStoreCatalogHubIconIds().indexOf(Number(icon.id)) >= 0) return true;
            return !!(icon.catalogHub && icon.lane === 'store');
        }

        function removeProductReferences(productId) {
            if (!productId) return;
            (visitorIcons || []).forEach(function(icon) {
                if (!icon) return;
                if (icon.linkedProductId === productId) delete icon.linkedProductId;
                if (Array.isArray(icon.productIds)) {
                    icon.productIds = icon.productIds.filter(function(id) { return id !== productId; });
                    if (!icon.productIds.length) delete icon.productIds;
                }
            });
            (dashboardTiles || []).forEach(function(tile) {
                if (tile && tile.linkedProductId === productId) delete tile.linkedProductId;
            });
            ensureShowroomGallery();
            ['products', 'projects'].forEach(function(secKey) {
                const items = showroomGallery[secKey] && showroomGallery[secKey].items;
                if (!items) return;
                items.forEach(function(it) {
                    if (it && it.shopProductId === productId) {
                        delete it.shopProductId;
                        delete it.shopVariantIndex;
                    }
                });
            });
            if (Array.isArray(nebrasCart)) {
                nebrasCart = nebrasCart.filter(function(l) { return l && l.productId !== productId; });
                try { saveNebrasCart(); } catch (e) { /* ignore */ }
            }
        }

        function purgeStaleCatalogReferences() {
            const liveIds = {};
            (siteProducts || []).forEach(function(p) {
                if (p && p.id && p.visible !== false) liveIds[p.id] = true;
            });
            (visitorIcons || []).forEach(function(icon) {
                if (!icon) return;
                if (icon.linkedProductId && !liveIds[icon.linkedProductId]) delete icon.linkedProductId;
                if (Array.isArray(icon.productIds)) {
                    icon.productIds = icon.productIds.filter(function(id) { return liveIds[id]; });
                    if (!icon.productIds.length) delete icon.productIds;
                }
            });
            (dashboardTiles || []).forEach(function(tile) {
                if (tile && tile.linkedProductId && !liveIds[tile.linkedProductId]) delete tile.linkedProductId;
            });
            ensureShowroomGallery();
            ['products', 'projects'].forEach(function(secKey) {
                const items = showroomGallery[secKey] && showroomGallery[secKey].items;
                if (!items) return;
                items.forEach(function(it) {
                    if (it && it.shopProductId && !liveIds[it.shopProductId]) {
                        delete it.shopProductId;
                        delete it.shopVariantIndex;
                    }
                });
            });
        }

        function manageStoreIconProducts(iconId) {
            if (!requireFullSiteContent('صلاحية المحتوى مطلوبة لإدارة منتجات أيقونة المتجر.')) return;
            const icon = (visitorIcons || []).find(function(i) { return Number(i.id) === Number(iconId); });
            if (!icon || !isStoreCatalogHubIcon(icon)) {
                alert('هذه الأيقونة ليست من أيقونات المتجر الأربع.');
                return;
            }
            const pool = (siteProducts || []).filter(function(p) {
                return p && p.visible !== false && getCatalogExperience(p) !== 'complaint';
            });
            if (!pool.length) {
                alert('لا منتجات نشطة — أضيفي منتجات من تبويب المنتجات أولاً.');
                return;
            }
            const assigned = Array.isArray(icon.productIds) && icon.productIds.length
                ? icon.productIds.slice()
                : getProductsForVisitorIcon(icon).map(function(p) { return p.id; });
            const lines = pool.map(function(p, idx) {
                const mark = assigned.indexOf(p.id) >= 0 ? '✓' : ' ';
                return idx + ': [' + mark + '] ' + (p.titleAr || p.id);
            }).join('\n');
            const cmd = prompt(
                'منتجات داخل «' + getVisitorIconDisplayTitle(icon) + '»\n' +
                'اكتب أرقام المنتجات (مثال: 0,1,2) أو معرفات prod-...\n' +
                'فارغ = تلقائي حسب القسم (#)\n\n' + lines,
                assigned.join(', ')
            );
            if (cmd === null) return;
            const trimmed = String(cmd).trim();
            if (!trimmed) {
                delete icon.productIds;
            } else {
                const picked = trimmed.split(/[,،\s]+/).map(function(token) {
                    const t = token.trim();
                    if (!t) return null;
                    const idx = parseInt(t, 10);
                    if (!isNaN(idx) && pool[idx]) return pool[idx].id;
                    const found = pool.find(function(p) { return p.id === t; });
                    return found ? found.id : null;
                }).filter(Boolean);
                const unique = [];
                picked.forEach(function(id) { if (unique.indexOf(id) < 0) unique.push(id); });
                if (unique.length) icon.productIds = unique;
                else delete icon.productIds;
            }
            saveContentData();
            displayVisitorIconsAdmin();
            addAuditLog('منتجات أيقونة متجر', getVisitorIconDisplayTitle(icon));
            alert('تم تحديث منتجات الأيقونة — التغيير ظاهر للزوار فوراً.');
        }

        function toggleSiteProductVisibility(productId) {
            if (!requireFullSiteContent()) return;
            const product = siteProducts.find(function(p) { return p.id === productId; });
            if (!product) return;
            const willHide = product.visible !== false;
            const msg = willHide
                ? ('إخفاء المنتج «' + (product.titleAr || productId) + '» من المتجر وأيقوناته؟\n(يمكن إظهاره لاحقاً)')
                : ('إظهار المنتج «' + (product.titleAr || productId) + '» في المتجر؟');
            if (!confirm(msg)) return;
            product.visible = willHide ? false : true;
            if (willHide) removeProductReferences(productId);
            purgeStaleCatalogReferences();
            saveContentData();
            displaySiteProductsAdmin();
            addAuditLog(willHide ? 'إخفاء منتج' : 'إظهار منتج', product.titleAr || productId);
        }

        async function addSiteProduct() {
            if (!requireFullSiteContent()) return;
            const fields = await promptCatalogFields(null, 'product');
            if (!fields) return;
            const exp = promptCatalogExperience('shop');
            if (exp === null) return;
            const newProd = Object.assign({
                id: 'prod-' + Date.now(),
                sortOrder: siteProducts.length + 1,
                cssClass: 'card-wpc-raw',
                anchorId: '',
                legacyKey: '',
                visible: true,
                variants: exp === 'shop' ? [] : undefined
            }, fields);
            applyExperienceToCatalogItem(newProd, exp);
            siteProducts.push(newProd);
            saveContentData();
            displaySiteProductsAdmin();
            addAuditLog('إضافة منتج', 'منتج جديد: ' + fields.titleAr);
            if (exp === 'shop' && confirm('هل تريد إضافة أصناف (مقاس / لون / سعر) الآن؟')) {
                manageProductVariants(newProd.id);
            }
        }

        async function editSiteProduct(productId) {
            if (!requireFullSiteContent()) return;
            const product = siteProducts.find(function(p) { return p.id === productId; });
            if (!product) return;
            const fields = await promptCatalogFields(product, 'product');
            if (!fields) return;
            Object.assign(product, fields);
            delete product.titleKey;
            const exp = promptCatalogExperience(getCatalogExperience(product));
            if (exp !== null) applyExperienceToCatalogItem(product, exp);
            saveContentData();
            displaySiteProductsAdmin();
            addAuditLog('تعديل منتج', product.titleAr);
            if (getCatalogExperience(product) === 'shop' && confirm('هل تريد إدارة أصناف المنتج (شكل · مقاس · لون · سعر) الآن؟')) {
                manageProductVariants(productId);
            }
        }

        function deleteSiteProduct(productId) {
            if (!requireFullSiteContent()) return;
            const product = siteProducts.find(function(p) { return p.id === productId; });
            if (!product) return;
            let warn = 'حذف المنتج نهائياً: ' + (product.titleAr || product.id) + '؟';
            const iconRefs = (visitorIcons || []).filter(function(ic) {
                return ic && (ic.linkedProductId === productId || (Array.isArray(ic.productIds) && ic.productIds.indexOf(productId) >= 0));
            });
            if (iconRefs.length) {
                warn += '\n\nسيُزال من ' + iconRefs.length + ' أيقونة/متجر مرتبطة.';
            }
            if (!confirm(warn)) return;
            siteProducts = siteProducts.filter(function(p) { return p.id !== productId; });
            removeProductReferences(productId);
            purgeStaleCatalogReferences();
            saveContentData();
            displaySiteProductsAdmin();
            displayVisitorIconsAdmin();
            addAuditLog('حذف منتج', product.titleAr || product.id);
        }

        function displaySiteProductsAdmin() {
            const list = document.getElementById('scm-products-list');
            if (!list) return;
            const iconByProduct = {};
            (visitorIcons || []).forEach(function(ic) {
                if (!ic) return;
                const label = ic.titleAr || ic.title || ('أيقونة ' + ic.id);
                if (ic.linkedProductId) iconByProduct[ic.linkedProductId] = label;
                if (Array.isArray(ic.productIds)) {
                    ic.productIds.forEach(function(pid) { iconByProduct[pid] = label; });
                }
            });
            list.innerHTML = siteProducts.map(function(p) {
                const variantCount = (p.variants || []).length;
                const variantPreview = (p.variants || []).slice(0, 4).map(function(v, i) {
                    const ex = Number(v.price) || 0;
                    const pr = ex > 0 ? (ex + ' ر.س قبل ض') : 'عند الطلب';
                    return '#' + i + ' ' + [v.typeAr, v.sizeAr, v.colorAr].filter(Boolean).join(' · ') + ' — ' + pr;
                }).join(' | ');
                const modeLabel = escapeHtmlAttr(getCatalogProductModeLabel(p));
                const variantsBtn = p.action === 'complaint'
                    ? ''
                    : '<button type="button" onclick="manageProductVariants(\'' + p.id + '\')">أصناف (صورة · سعر قبل الضريبة)</button>';
                const iconNote = iconByProduct[p.id] ? (' · أيقونة المتجر: ' + iconByProduct[p.id]) : '';
                const hiddenBadge = p.visible === false ? ' <span class="scm-product-hidden-badge">مخفي</span>' : '';
                const visBtn = p.visible === false
                    ? '<button type="button" onclick="toggleSiteProductVisibility(\'' + p.id + '\')">إظهار</button>'
                    : '<button type="button" onclick="toggleSiteProductVisibility(\'' + p.id + '\')">إخفاء</button>';
                return '<li' + (p.visible === false ? ' class="scm-product-row--hidden"' : '') + '><strong>' + escapeHtmlAttr(p.titleAr || p.id) + '</strong>' + hiddenBadge + escapeHtmlAttr(iconNote) + ' — ' + escapeHtmlAttr(p.iconClass || '') +
                    ' <span style="opacity:0.85">[' + modeLabel + ']</span>' +
                    '<small>خلفية: ' + escapeHtmlAttr(p.backgroundImage || 'افتراضي') + ' | ألبوم: ' + ((p.album || []).length) + ' | أصناف: ' + variantCount + (variantPreview ? ' — ' + escapeHtmlAttr(variantPreview) : '') + '</small>' +
                    '<div class="scm-row-actions"><button type="button" onclick="editSiteProduct(\'' + p.id + '\')">تعديل</button>' +
                    variantsBtn + visBtn +
                    '<button type="button" onclick="deleteSiteProduct(\'' + p.id + '\')">حذف</button></div></li>';
            }).join('');
        }

        async function addDashboardTile() {
            if (!requirePermission('content')) return;
            const fields = await promptCatalogFields(null, 'dashboard');
            if (!fields) return;
            const zone = prompt('المنطقة: quick (أعلى) أو grid (أسفل)', 'quick') || 'quick';
            const handler = prompt('الإجراء:\nopenSalesManagement\nproduct:prod-wpc (معرض منتج ديناميكي)\niconDetail:wpc', 'openSalesManagement');
            const linkedProductId = (handler || '').indexOf('product:') === 0 ? handler.slice(8).trim() : '';
            const permission = prompt('الصلاحية المطلوبة (users/sales/...):', 'sales');
            const withInner = confirm('إضافة محتوى داخل الأيقونة (نصوص · صور · وثائق)؟ اضغط موافق ثم «محتوى داخل الأيقونة» بعد الإنشاء.');
            dashboardTiles.push(Object.assign({
                id: 'dash-' + Date.now(),
                zone: zone.trim() === 'grid' ? 'grid' : 'quick',
                sortOrder: dashboardTiles.length + 1,
                handler: (handler || '').trim(),
                linkedProductId: linkedProductId || undefined,
                permission: (permission || '').trim(),
                cssClass: '',
                visible: true,
                inner: withInner ? { enabled: true, album: (fields.album || []).slice(), documents: [], primaryType: 'handler', primaryValue: '' } : { enabled: false, album: [], documents: [] }
            }, fields));
            saveContentData();
            renderDashboardTiles();
            displayDashboardTilesAdmin();
            addAuditLog('إضافة أيقونة داشبورد', fields.titleAr);
        }

        async function editDashboardTile(tileId) {
            if (!requirePermission('content')) return;
            const tile = dashboardTiles.find(function(t) { return t.id === tileId; });
            if (!tile) return;
            const fields = await promptCatalogFields(tile, 'dashboard');
            if (!fields) return;
            Object.assign(tile, fields);
            saveContentData();
            renderDashboardTiles();
            displayDashboardTilesAdmin();
            addAuditLog('تعديل داشبورد', tile.titleAr);
        }

        function deleteDashboardTile(tileId) {
            if (!requirePermission('content')) return;
            const tile = dashboardTiles.find(function(t) { return t.id === tileId; });
            if (!tile || !confirm('حذف أيقونة الداشبورد؟')) return;
            dashboardTiles = dashboardTiles.filter(function(t) { return t.id !== tileId; });
            saveContentData();
            renderDashboardTiles();
            displayDashboardTilesAdmin();
        }

        function displayDashboardTilesAdmin() {
            const list = document.getElementById('scm-dashboard-list');
            if (!list) return;
            list.innerHTML = dashboardTiles.map(function(t) {
                const innerCount = (t.inner && t.inner.album ? t.inner.album.length : 0) + (t.inner && t.inner.documents ? t.inner.documents.length : 0);
                const iconKey = String(t.handler || '').indexOf('iconDetail:') === 0 ? t.handler.split(':')[1] : '';
                const iconBtn = iconKey
                    ? '<button type="button" onclick="manageIconDetailPack(\'' + escapeHtmlAttr(iconKey) + '\')">تفاصيل iconDetail</button>'
                    : '';
                return '<li><strong>' + escapeHtmlAttr(t.titleAr || t.id) + '</strong> [' + escapeHtmlAttr(t.zone) + '] — ' + escapeHtmlAttr(t.handler || '') +
                    '<small>خلفية: ' + escapeHtmlAttr(t.backgroundImage || '—') + ' | داخل الأيقونة: ' + innerCount + ' عنصر</small>' +
                    '<div class="scm-row-actions"><button type="button" onclick="editDashboardTile(\'' + t.id + '\')">تعديل البطاقة</button>' +
                    '<button type="button" onclick="manageDashboardTileInner(\'' + t.id + '\')">محتوى داخل الأيقونة</button>' +
                    iconBtn +
                    '<button type="button" onclick="deleteDashboardTile(\'' + t.id + '\')">حذف</button></div></li>';
            }).join('');
        }

        async function manageDashboardTileInner(tileId) {
            if (!requirePermission('content')) return;
            const tile = dashboardTiles.find(function(t) { return t.id === tileId; });
            if (!tile) return;
            if (!tile.inner) tile.inner = { enabled: true, album: [], documents: [] };
            const inner = tile.inner;
            const action = prompt(
                'محتوى داخل أيقونة «' + (tile.titleAr || tileId) + '»\n\n' +
                '1 = عنوان ووصف تفصيلي\n2 = ألبوم صور\n3 = وثائق (PDF/صور)\n4 = زر الانتقال (قسم/رابط/اتصال)\n5 = تفعيل/إيقاف المحتوى الداخلي\n6 = حذف وثيقة',
                '1'
            );
            if (!action) return;
            if (action === '5') {
                inner.enabled = inner.enabled === false;
                alert(inner.enabled === false ? 'تم إيقاف المحتوى الداخلي — سيفتح الإجراء مباشرة.' : 'تم تفعيل المحتوى الداخلي.');
            } else if (action === '1') {
                const titleAr = prompt('عنوان داخل الأيقونة (عربي):', inner.titleAr || tile.titleAr || '');
                if (titleAr === null) return;
                const titleEn = prompt('عنوان (إنجليزي):', inner.titleEn || titleAr);
                const textAr = prompt('شرح تفصيلي (عربي):', inner.textAr || tile.textAr || '');
                const textEn = prompt('شرح (إنجليزي):', inner.textEn || textAr);
                inner.titleAr = (titleAr || '').trim();
                inner.titleEn = (titleEn || titleAr || '').trim();
                inner.textAr = (textAr || '').trim();
                inner.textEn = (textEn || textAr || '').trim();
                inner.enabled = true;
            } else if (action === '2') {
                const albumMode = prompt('ألبوم:\n1 = رفع صور\n2 = مسارات يدوية', '1');
                if (albumMode === '1') {
                    inner.album = await pickMediaAlbumInteractive(inner.album || []);
                } else if (albumMode === '2') {
                    const albumRaw = prompt('ألبوم الصور (مسارات مفصولة بفاصلة):', (inner.album || []).join(', '));
                    if (albumRaw === null) return;
                    inner.album = (albumRaw || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean);
                }
                inner.enabled = true;
            } else if (action === '3') {
                const labelAr = prompt('اسم الوثيقة (عربي):', 'كتالوج');
                const url = await pickMediaPath({ label: 'ملف الوثيقة (صورة أو PDF)', defaultValue: 'images/', accept: NEBRAS_MEDIA_ACCEPT_ALL });
                if (!labelAr || !url) return;
                if (!inner.documents) inner.documents = [];
                inner.documents.push({ labelAr: labelAr.trim(), labelEn: labelAr.trim(), url: url.trim() });
                inner.enabled = true;
            } else if (action === '6') {
                const idx = parseInt(prompt('رقم الوثيقة للحذف (0 أولاً):', '0'), 10);
                if (!isNaN(idx) && inner.documents) inner.documents.splice(idx, 1);
            } else if (action === '4') {
                const pt = prompt('نوع الزر: scroll | external | tel_sales | tel_customer | handler | none', inner.primaryType || 'handler');
                if (pt === null) return;
                inner.primaryType = pt.trim();
                inner.primaryValue = prompt('القيمة (#قسم أو رابط — اتركه فارغاً للاتصال/الإجراء):', inner.primaryValue || tile.target || '') || '';
            }
            saveContentData();
            renderDashboardTiles();
            displayDashboardTilesAdmin();
            addAuditLog('محتوى داشبورد', tile.titleAr || tileId);
        }

        function manageIconDetailPack(iconKey) {
            if (!requirePermission('content')) return;
            if (!systemSettings.iconDetailOverrides) systemSettings.iconDetailOverrides = {};
            const pack = getIconDetailPack(iconKey) || { ar: { title: '', text: '' }, en: {}, zh: {}, documents: [], album: [] };
            const ar = pack.ar || {};
            const titleAr = prompt('عنوان «' + iconKey + '» (عربي):', ar.title || '');
            if (titleAr === null) return;
            const textAr = prompt('النص التفصيلي (عربي):', ar.text || '');
            if (textAr === null) return;
            const albumRaw = prompt('ألبوم صور (فاصلة):', (ar.album || pack.album || []).join(', '));
            const docsRaw = prompt('وثائق: اسم|مسار لكل سطر', (pack.documents || []).map(function(d) { return (d.labelAr || '') + '|' + (d.url || ''); }).join('\n'));
            if (!systemSettings.iconDetailOverrides[iconKey]) systemSettings.iconDetailOverrides[iconKey] = { ar: {}, en: {}, zh: {} };
            const o = systemSettings.iconDetailOverrides[iconKey];
            o.ar = { title: titleAr.trim(), text: (textAr || '').trim(), album: (albumRaw || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean) };
            o.en = { title: titleAr.trim(), text: (textAr || '').trim() };
            o.documents = (docsRaw || '').split('\n').map(function(line) {
                const p = line.split('|');
                return { labelAr: (p[0] || '').trim(), labelEn: (p[0] || '').trim(), url: (p[1] || '').trim() };
            }).filter(function(d) { return d.url; });
            saveContentData();
            addAuditLog('تفاصيل أيقونة', iconKey);
            alert('تم حفظ تفاصيل «' + iconKey + '» — تظهر عند فتح الأيقونة فوراً.');
        }

        function addCustomSiteSection() {
            if (!requirePermission('content')) return;
            const titleAr = prompt('عنوان القسم (عربي):');
            if (!titleAr) return;
            const subtitleAr = prompt('وصف القسم (عربي):', '');
            siteCustomSections.push({
                id: 'sec-' + Date.now(),
                sortOrder: siteCustomSections.length + 1,
                titleAr: titleAr.trim(),
                titleEn: titleAr.trim(),
                subtitleAr: (subtitleAr || '').trim(),
                subtitleEn: (subtitleAr || '').trim(),
                visible: true,
                items: []
            });
            saveContentData();
            renderCustomSiteSections();
            displayCustomSectionsAdmin();
            addAuditLog('قسم جديد', titleAr);
        }

        async function addCustomSectionItem(sectionId) {
            if (!requirePermission('content')) return;
            const section = siteCustomSections.find(function(s) { return s.id === sectionId; });
            if (!section) return;
            const fields = await promptCatalogFields(null, 'section-item');
            if (!fields) return;
            if (!section.items) section.items = [];
            section.items.push(Object.assign({ id: Date.now(), visible: true }, fields));
            saveContentData();
            renderCustomSiteSections();
            displayCustomSectionsAdmin();
        }

        function displayCustomSectionsAdmin() {
            const list = document.getElementById('scm-sections-list');
            if (!list) return;
            list.innerHTML = siteCustomSections.map(function(sec) {
                const count = (sec.items || []).length;
                return '<li><strong>' + escapeHtmlAttr(sec.titleAr || sec.id) + '</strong> — ' + count + ' أيقونة' +
                    '<div class="scm-row-actions">' +
                    '<button type="button" onclick="addCustomSectionItem(\'' + sec.id + '\')">+ أيقونة</button>' +
                    '<button type="button" onclick="deleteCustomSiteSection(\'' + sec.id + '\')">حذف القسم</button></div></li>';
            }).join('');
        }

        function deleteCustomSiteSection(sectionId) {
            if (!requirePermission('content')) return;
            if (!confirm('حذف القسم بالكامل؟')) return;
            siteCustomSections = siteCustomSections.filter(function(s) { return s.id !== sectionId; });
            saveContentData();
            renderCustomSiteSections();
            displayCustomSectionsAdmin();
        }

        function resolveDashboardBackgrounds() {
            const spotlightList = [
                ['.spotlight-card--about-who', ['background-about-us']],
                ['.spotlight-card--about-vision', ['background-our-vision']]
            ];
            spotlightList.forEach(function(row) {
                const node = document.querySelector(row[0]);
                if (node) tryUrls(node, buildUrlList(row[1]), 0);
            });

            document.querySelectorAll('.visitor-icon-card[data-icon-id]').forEach(function(node) {
                const id = parseInt(node.getAttribute('data-icon-id'), 10);
                if (id === 4) {
                    applyBankVisitorIconCard(node);
                    return;
                }
                const icon = visitorIcons.find(function(i) { return i.id === id; });
                if (icon && icon.backgroundImage) {
                    applyBackgroundToNode(node, icon.backgroundImage, false);
                    return;
                }
                const bases = VISITOR_ICON_BG_BASES[id];
                if (bases && bases.length) tryUrls(node, buildUrlList(bases), 0);
            });

            document.querySelectorAll('#site-products-grid [data-product-id]').forEach(function(node) {
                const pid = node.getAttribute('data-product-id');
                const product = siteProducts.find(function(p) { return p.id === pid; });
                if (product && product.backgroundImage) {
                    applyBackgroundToNode(node, product.backgroundImage, product.cssClass === 'card-other-products');
                }
            });
        }
        function toggleLangMenu(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            const menu = document.getElementById('lang-menu');
            if (!menu) return;
            menu.classList.toggle('show');
            const btn = document.getElementById('lang-toggle-btn');
            if (btn) {
                btn.setAttribute('aria-expanded', menu.classList.contains('show') ? 'true' : 'false');
            }
        }

        function closeMobileNav() {
            const menu = document.getElementById('nav-menu');
            const toggle = document.querySelector('.menu-toggle');
            const icon = toggle && toggle.querySelector('i');
            if (menu) menu.classList.remove('active');
            if (toggle) toggle.setAttribute('aria-expanded', 'false');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        }

        function toggleMenu() {
            const menu = document.getElementById('nav-menu');
            const toggle = document.querySelector('.menu-toggle');
            const icon = toggle && toggle.querySelector('i');
            if (!menu) return;
            menu.classList.toggle('active');
            const open = menu.classList.contains('active');
            if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (icon) {
                icon.classList.toggle('fa-bars', !open);
                icon.classList.toggle('fa-times', open);
            }
        }

        function siteLogoImgFallback(img) {
            if (!img) return;
            const list = String(img.getAttribute('data-src-list') || '').split('|').filter(Boolean);
            let idx = parseInt(img.getAttribute('data-src-idx') || '0', 10) + 1;
            if (idx < list.length) {
                img.setAttribute('data-src-idx', String(idx));
                img.src = list[idx];
                return;
            }
            if (img.classList.contains('quote-watermark-logo') || img.classList.contains('quote-hero-logo')) {
                const parent = img.closest('.quote-watermark-layer, .quote-header-logo-strip');
                if (parent && !parent.querySelector('.quote-logo-fallback-text')) {
                    const fb = document.createElement('p');
                    fb.className = 'quote-logo-fallback-text';
                    fb.textContent = 'نبراس';
                    if (img.classList.contains('quote-watermark-logo')) {
                        fb.setAttribute('aria-hidden', 'true');
                    }
                    parent.appendChild(fb);
                }
                img.style.display = 'none';
                return;
            }
            img.style.display = 'none';
        }

        function applySiteLogoImages() {
            const urls = getSiteLogoCandidateUrls();
            const listAttr = urls.join('|');
            resolveSiteLogoUrl(function(resolved) {
                document.querySelectorAll('.site-logo-img').forEach(function(img) {
                    if (!urls.length) return;
                    img.setAttribute('data-src-list', listAttr);
                    img.setAttribute('data-src-idx', '0');
                    img.src = resolved;
                    img.style.display = '';
                });
            });
        }

        // شكاوى العملاء — تُملأ ديناميكياً من نموذج الزائر
        let complaints = {};

        // مبيعات مسجّلة (يدوياً أو من تحويل عرض سعر → بيع)
        let salesData = [];

        // Sample customer service data
        let customerServiceData = [
            { id: 1, inquiry: 'استفسار عن المنتجات', response: 'تم الرد' },
            { id: 2, inquiry: 'شكوى من الجودة', response: 'قيد المراجعة' }
        ];

        function normalizeBranchRecord(branch) {
            if (!branch || typeof branch !== 'object') return branch;
            const ar = String(branch.city || '').trim();
            const known = BRANCH_CITY_I18N[ar];
            if (known) {
                if (!branch.city_en || !String(branch.city_en).trim()) branch.city_en = known.en;
                if (!branch.city_zh || !String(branch.city_zh).trim()) branch.city_zh = known.zh;
            }
            return branch;
        }

        function promptBranchCityNames(existing) {
            const ar = prompt('اسم الفرع (عربي):', (existing && existing.city) || '');
            if (ar === null || !String(ar).trim()) return null;
            const en = prompt('Branch name (English):', (existing && existing.city_en) || '');
            if (en === null) return null;
            const zh = prompt('分支名称 (中文 — اختياري):', (existing && existing.city_zh) || '');
            if (zh === null) return null;
            return {
                city: String(ar).trim(),
                city_en: String(en).trim(),
                city_zh: String(zh).trim()
            };
        }

        function getBranchSearchKey(branch) {
            return [branch.city, branch.city_en, branch.city_zh].filter(Boolean).map(normalizeText).join(' ');
        }

        const DEFAULT_BRANCHES = [
            { id: 1, city: 'القصيم - الفرع الرئيسي', city_en: 'Qassim — Main Branch', city_zh: '盖西姆（总部）', salesPhone: '0555092383', image: 'branch-qassim-main.jpg' },
            { id: 2, city: 'الرياض', city_en: 'Riyadh', city_zh: '利雅得', salesPhone: '0536694464', image: 'branch-riyadh.jpg' },
            { id: 3, city: 'المدينة', city_en: 'Madinah', city_zh: '麦地那', salesPhone: '0558358306', image: 'branch-madinah.webp' },
            { id: 4, city: 'الأحساء', city_en: 'Al-Ahsa', city_zh: '艾赫萨', salesPhone: '0558818530', image: 'branch-ahsa.jpg' },
            { id: 5, city: 'خميس مشيط', city_en: 'Khamis Mushait', city_zh: '海米斯穆谢特', salesPhone: '0554501661', image: 'branch-khamis-mushait.jpg' },
            { id: 6, city: 'تبوك', city_en: 'Tabuk', city_zh: '塔布ك', salesPhone: '0555278214', image: 'branch-tabuk.jpg' },
            { id: 7, city: 'جدة', city_en: 'Jeddah', city_zh: '吉达', salesPhone: '96655710226', image: 'branch-jeddah.jpg' }
        ];

        let branchesData = DEFAULT_BRANCHES.map(function(b) { return Object.assign({}, b); });

        function ensureBuiltinBranches() {
            if (!Array.isArray(branchesData) || !branchesData.length) {
                branchesData = DEFAULT_BRANCHES.map(function(b) { return Object.assign({}, b); });
                return;
            }
            DEFAULT_BRANCHES.forEach(function(def) {
                if (!branchesData.some(function(b) { return Number(b.id) === Number(def.id); })) {
                    branchesData.push(Object.assign({}, def));
                }
            });
            branchesData = branchesData.map(normalizeBranchRecord);
        }

        function getBranchDisplayName(branch, lang) {
            if (!branch) return '';
            const l = lang === 'en' || lang === 'zh' ? lang : 'ar';
            if (l === 'en' && branch.city_en && String(branch.city_en).trim()) return String(branch.city_en).trim();
            if (l === 'zh' && branch.city_zh && String(branch.city_zh).trim()) return String(branch.city_zh).trim();
            return String(branch.city || '').trim();
        }

        function branchSmartDial(branchId) {
            const branch = branchesData.find(function(b) { return b.id === branchId; });
            if (!branch) return;
            dialNumber(getNearestSalesNumber(branch.city).phone);
        }

        function normalizeBranchImagePath(imagePath) {
            if (!imagePath) return '';
            const trimmed = imagePath.trim();
            if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
            if (trimmed.startsWith('/')) return trimmed;
            if (trimmed.indexOf('images/') === 0) return '/' + trimmed;
            return '/images/' + trimmed.replace(/^\/+/, '');
        }

        function escapeHtmlAttr(value) {
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;');
        }

        /** رابط واتساب للمهندس من رقم التذييل فقط (ديناميكي من الإعدادات) */
        function designerFooterWhatsAppHref() {
            const raw = String(systemSettings.designerPhone || '').replace(/\D/g, '');
            if (raw.length < 9) return '';
            let n = raw;
            if (n.startsWith('0')) n = '966' + n.slice(1);
            else if (!n.startsWith('966')) n = '966' + n;
            return 'https://wa.me/' + n;
        }

        function designerFooterTelHref() {
            const p = String(systemSettings.designerPhone || '').trim();
            if (!p) return '#';
            return 'tel:' + p.replace(/\s+/g, '');
        }

        function applyFooterContent(text) {
            const intro = text.footerDesignerIntro || '';
            const phone = String(systemSettings.designerPhone || '').trim();
            const contactLab = text.footerContactLabel || '';
            let line = intro;
            if (phone) line = intro + ' — ' + contactLab + ':';
            else line = intro;

            const designerEl = document.getElementById('footer-designer-line');
            if (designerEl) designerEl.textContent = line;

            const waHref = designerFooterWhatsAppHref();
            const waEl = document.getElementById('footer-designer-wa');
            const telEl = document.getElementById('footer-designer-tel');
            const phoneDisp = document.getElementById('footer-designer-phone-display');

            if (waEl) {
                waEl.href = waHref || '#';
                waEl.setAttribute('aria-label', text.footerDesignerWhatsAppAria || 'WhatsApp');
                waEl.style.opacity = waHref ? '1' : '0.42';
                waEl.style.pointerEvents = waHref ? '' : 'none';
                waEl.setAttribute('tabindex', waHref ? '0' : '-1');
            }
            if (telEl) {
                const telHref = phone ? designerFooterTelHref() : '#';
                telEl.href = telHref;
                telEl.setAttribute('aria-label', (text.footerDesignerCallAria || '') + (phone ? ' ' + phone : ''));
                telEl.style.opacity = phone ? '1' : '0.42';
                telEl.style.pointerEvents = phone ? '' : 'none';
                telEl.setAttribute('tabindex', phone ? '0' : '-1');
            }
            if (phoneDisp) phoneDisp.textContent = phone || '';
            const copyEl = document.getElementById('site-footer-copyright');
            if (copyEl) copyEl.textContent = text.siteFooterCopyright || text.dashboardCopyright || 'كل الحقوق محفوظة مع مصنع نبراس 2026';
        }

        function sanitizeExternalUrl(url) {
            const u = String(url || '').trim();
            if (!u) return '';
            const lower = u.toLowerCase();
            if (lower.indexOf('javascript:') === 0 || lower.indexOf('data:') === 0) return '';
            if (/^https?:\/\//i.test(u)) return u;
            return 'https://' + u.replace(/^\/+/, '');
        }

        /** واتساب الشركة في المنصة: الحقل من الإدارة أولًا، ثم الرقم العام للمهندس إن وُجد */
        function resolveCompanyWhatsAppHref() {
            const explicit = String(systemSettings.socialWhatsApp || '').trim();
            if (explicit) return sanitizeExternalUrl(explicit);
            return designerFooterWhatsAppHref();
        }

        function renderCompanySocialSection(text) {
            const ui = text || siteText[currentLang || 'ar'];
            const container = document.getElementById('company-social-links');
            const section = document.getElementById('company-social');
            const titleEl = document.getElementById('company-social-title');
            const subEl = document.getElementById('company-social-subtitle');
            if (titleEl) titleEl.textContent = ui.companySocialTitle || '';
            if (subEl) subEl.textContent = ui.companySocialSubtitlePublic || '';
            if (!container || !section) return;

            const wa = resolveCompanyWhatsAppHref();
            const fb = sanitizeExternalUrl(systemSettings.socialFacebook);
            const ig = sanitizeExternalUrl(systemSettings.socialInstagram);
            const tt = sanitizeExternalUrl(systemSettings.socialTiktok);
            const sn = sanitizeExternalUrl(systemSettings.socialSnapchat);

            const items = [];
            if (wa) items.push({ href: wa, icon: 'fab fa-whatsapp', label: 'WhatsApp', cls: 'soc-wa' });
            if (fb) items.push({ href: fb, icon: 'fab fa-facebook-f', label: 'Facebook', cls: 'soc-fb' });
            if (ig) items.push({ href: ig, icon: 'fab fa-instagram', label: 'Instagram', cls: 'soc-ig' });
            if (tt) items.push({ href: tt, icon: 'fab fa-tiktok', label: 'TikTok', cls: 'soc-tt' });
            if (sn) items.push({ href: sn, icon: 'fab fa-snapchat', label: 'Snapchat', cls: 'soc-sn' });
            const lt = sanitizeExternalUrl(systemSettings.linktreeUrl || NEBRAS_LINKTREE_URL);
            if (lt) items.push({ href: lt, icon: 'fas fa-link', label: 'Linktree', cls: 'soc-lt' });

            if (!items.length) {
                section.style.display = 'none';
                container.innerHTML = '';
                return;
            }
            section.style.display = '';
            container.innerHTML = items.map(function(it) {
                return '<a class="company-social-btn ' + escapeHtmlAttr(it.cls) + '" href="' + escapeHtmlAttr(it.href) + '" target="_blank" rel="noopener noreferrer" aria-label="' + escapeHtmlAttr(it.label) + '"><i class="' + escapeHtmlAttr(it.icon) + '" aria-hidden="true"></i></a>';
            }).join('');
        }

        function syncAdminSessionClass() {
            const isAdmin = !!currentAdmin;
            document.body.classList.toggle('admin-session', isAdmin);
            document.body.classList.toggle('platform-storefront', !isAdmin);
            document.body.classList.toggle('platform-command-center', isAdmin);
            document.body.setAttribute('data-platform-layer', isAdmin ? 'command-center' : 'storefront');
            syncMobileCommerceBar();
            applyAdminPermissionsUI();
        }

        /** إخفاء أزرار ولوحات الإدارة حسب صلاحية الدور — من أصغر زر إلى أكبر قسم */
        function applyAdminPermissionsUI() {
            const logged = !!currentAdmin;
            const isSuper = logged && currentAdmin.role === 'superadmin';
            const perm = function(key) {
                return logged && canManage(key);
            };

            [
                { id: 'open-system-settings-btn', show: isSuper },
                { id: 'dash-nav-settings', show: isSuper },
                { id: 'dashboard-channels-edit-btn', show: isSuper },
                { id: 'dashboard-occasion-edit-btn', show: isSuper }
            ].forEach(function(item) {
                const el = document.getElementById(item.id);
                if (el) el.style.display = item.show ? '' : 'none';
            });

            const scmRoot = document.getElementById('site-content-management');
            if (scmRoot) scmRoot.style.display = perm('content') ? '' : 'none';

            [
                { id: 'user-management', key: 'users' },
                { id: 'sales-management', key: 'sales' },
                { id: 'customer-service-management', key: 'customerService' },
                { id: 'complaints-management', key: 'complaints' },
                { id: 'branches-management', key: 'branches' },
                { id: 'audit-log', key: 'audit' },
                { id: 'system-settings', key: null, superOnly: true },
                { id: 'account-security', key: null, anyAdmin: true }
            ].forEach(function(block) {
                const el = document.getElementById(block.id);
                if (!el) return;
                if (!logged) {
                    el.classList.remove('show');
                    return;
                }
                if (block.superOnly && !isSuper) el.classList.remove('show');
                if (block.key && !perm(block.key)) el.classList.remove('show');
            });

            document.querySelectorAll('.admin-only-ui[data-perm]').forEach(function(node) {
                const need = node.getAttribute('data-perm');
                node.style.display = perm(need) ? '' : 'none';
            });
        }

        function canOpenPlatformModule(mod) {
            if (!mod || !currentAdmin) return false;
            if (mod.superadminOnly && currentAdmin.role !== 'superadmin') return false;
            if (mod.permission && !canManage(mod.permission)) return false;
            if (mod.status === 'planned') return false;
            return true;
        }

        function openPlatformModule(moduleId) {
            const mod = NEBRAS_PLATFORM.modules.find(function(m) { return m.id === moduleId; });
            if (!mod) return;
            if (!canOpenPlatformModule(mod)) {
                const ui = siteText[currentLang || 'ar'] || siteText.ar;
                alert(ui.platformModuleLocked || 'هذه الوحدة غير متاحة لصلاحياتك أو لم تُفعّل بعد.');
                return;
            }
            if (mod.handler.indexOf('iconDetail:') === 0) {
                openIconDetails(mod.handler.split(':')[1]);
                return;
            }
            const fn = DASHBOARD_HANDLER_MAP[mod.handler];
            if (typeof fn === 'function') {
                fn();
                return;
            }
            if (mod.handler === 'openSystemSettings') openSystemSettings();
            else if (mod.handler === 'openSystemSettingsForOccasion') openSystemSettingsForOccasion();
            else if (mod.handler === 'scrollErpHub') scrollErpHub();
            else if (mod.handler === 'openErpInventory') openErpInventory();
            else if (mod.handler === 'openErpOrders') openErpOrders();
            else if (mod.handler === 'openErpProcurement') openErpProcurement();
            else if (mod.handler === 'erpFinanceStub') DASHBOARD_HANDLER_MAP.erpFinanceStub();
        }

        function canOpenErpModule(mod) {
            if (!mod || !currentAdmin) return false;
            if (mod.status === 'planned') return false;
            if (mod.permission && !canManage(mod.permission)) return false;
            return true;
        }

        function scrollErpHub() {
            const el = document.getElementById('erp-hub-panel');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            document.body.classList.add('platform-erp-active');
        }

        function ensureBuiltinErpData() {
            if (!Array.isArray(erpInventory) || !erpInventory.length) {
                erpInventory = DEFAULT_ERP_INVENTORY.map(function(i) { return Object.assign({}, i); });
            }
            if (!Array.isArray(erpOrders)) erpOrders = [];
            if (!Array.isArray(erpProcurement)) erpProcurement = [];
        }

        function getErpKpis() {
            const lowStock = erpInventory.filter(function(i) {
                return Number(i.qty) <= Number(i.minQty || 0);
            }).length;
            return {
                skuCount: erpInventory.length,
                lowStock: lowStock,
                salesCount: (salesData || []).length,
                ordersCount: erpOrders.length,
                complaintsCount: Object.keys(complaints || {}).length,
                branchesCount: (branchesData || []).length
            };
        }

        function openErpModule(moduleId) {
            const mod = NEBRAS_ERP.modules.find(function(m) { return m.id === moduleId; });
            if (!mod) return;
            if (!canOpenErpModule(mod)) {
                const ui = siteText[currentLang || 'ar'] || siteText.ar;
                alert(ui.platformModuleLocked || 'غير متاح لصلاحياتك.');
                return;
            }
            if (mod.handler.indexOf('iconDetail:') === 0) {
                openIconDetails(mod.handler.split(':')[1]);
                return;
            }
            const fn = DASHBOARD_HANDLER_MAP[mod.handler];
            if (typeof fn === 'function') fn();
        }

        function renderErpHubPanel() {
            const panel = document.getElementById('erp-hub-panel');
            if (!panel || !currentAdmin) return;

            const lang = currentLang || 'ar';
            const ui = siteText[lang] || siteText.ar;
            ensureBuiltinErpData();

            setElementText('erp-hub-title', ui.erpHubTitle);
            setElementText('erp-hub-subtitle', ui.erpHubSubtitle);
            setElementText('erp-benchmark-summary', ui.erpBenchmarkSummary);
            setElementText('erp-bench-col-area', ui.erpBenchColArea);
            setElementText('erp-bench-col-global', ui.erpBenchColGlobal);
            setElementText('erp-bench-col-nebras', ui.erpBenchColNebras);

            const ver = document.getElementById('erp-version-badge');
            if (ver) {
                ver.innerHTML = '<i class="fas fa-cubes" aria-hidden="true"></i> ' +
                    escapeHtmlAttr(NEBRAS_ERP.codename) + ' v' + escapeHtmlAttr(NEBRAS_ERP.version);
            }

            const kpis = getErpKpis();
            const kpiRow = document.getElementById('erp-kpi-row');
            if (kpiRow) {
                kpiRow.innerHTML = [
                    { v: kpis.skuCount, l: ui.erpKpiSku },
                    { v: kpis.lowStock, l: ui.erpKpiLow },
                    { v: kpis.salesCount, l: ui.erpKpiSales },
                    { v: kpis.ordersCount, l: ui.erpKpiOrders },
                    { v: kpis.complaintsCount, l: ui.erpKpiComplaints },
                    { v: kpis.branchesCount, l: ui.erpKpiBranches }
                ].map(function(k) {
                    return '<div class="erp-kpi"><strong>' + escapeHtmlAttr(String(k.v)) + '</strong><span>' + escapeHtmlAttr(k.l) + '</span></div>';
                }).join('');
            }

            const pillarsRow = document.getElementById('erp-pillars-row');
            if (pillarsRow) {
                pillarsRow.innerHTML = NEBRAS_ERP.pillars.map(function(p) {
                    const name = lang === 'en' ? p.nameEn : p.nameAr;
                    return '<span class="erp-pillar-chip">' + escapeHtmlAttr(name) + '</span>';
                }).join('');
            }

            const grid = document.getElementById('erp-modules-grid');
            if (grid) {
                const statusLabel = { live: ui.platformStatusLive, beta: ui.platformStatusBeta, planned: ui.platformStatusPlanned };
                grid.innerHTML = NEBRAS_ERP.modules.map(function(mod) {
                    const name = lang === 'en' ? mod.nameEn : mod.nameAr;
                    const desc = lang === 'en' ? (mod.descEn || mod.descAr) : mod.descAr;
                    const ok = canOpenErpModule(mod);
                    const st = mod.status || 'planned';
                    return '<button type="button" class="erp-module-card' + (ok ? '' : ' disabled') + '" onclick="openErpModule(\'' + mod.id + '\')">' +
                        '<i class="' + escapeHtmlAttr(mod.icon) + '" aria-hidden="true"></i> ' +
                        '<h4>' + escapeHtmlAttr(name) + '</h4><small>' + escapeHtmlAttr(desc) + '</small>' +
                        '<span class="platform-status ' + escapeHtmlAttr(st) + '">' + escapeHtmlAttr(statusLabel[st] || st) + '</span></button>';
                }).join('');
            }

            const benchBody = document.getElementById('erp-benchmark-body');
            if (benchBody) {
                benchBody.innerHTML = GLOBAL_PLATFORM_BENCHMARK.map(function(row) {
                    const area = lang === 'en' ? row.areaEn : row.areaAr;
                    const global = lang === 'en' ? row.globalAr : row.globalAr;
                    const nebras = lang === 'en' ? (row.nebrasEn || row.nebrasAr) : row.nebrasAr;
                    const pc = row.parity === 'high' ? 'parity-high' : row.parity === 'mid' ? 'parity-mid' : 'parity-soon';
                    return '<tr><td>' + escapeHtmlAttr(area) + '</td><td>' + escapeHtmlAttr(global) + '</td><td class="' + pc + '">' + escapeHtmlAttr(nebras) + '</td></tr>';
                }).join('');
            }
        }

        function openErpInventory() {
            if (!requirePermission('inventory', 'صلاحية المخزون ERP مطلوبة.')) return;
            ensureBuiltinErpData();
            displayErpInventory();
            document.getElementById('erp-inventory').classList.add('show');
        }

        function displayErpInventory() {
            const list = document.getElementById('erp-inventory-list');
            if (!list) return;
            const lang = currentLang || 'ar';
            list.innerHTML = erpInventory.map(function(item) {
                const name = lang === 'en' && item.nameEn ? item.nameEn : item.nameAr;
                const wh = lang === 'en' && item.warehouseEn ? item.warehouseEn : item.warehouseAr;
                const low = Number(item.qty) <= Number(item.minQty || 0);
                return '<li><strong>' + escapeHtmlAttr(item.sku) + '</strong> — ' + escapeHtmlAttr(name) +
                    '<small> ' + escapeHtmlAttr(wh) + ' | ' + escapeHtmlAttr(String(item.qty)) + ' ' + escapeHtmlAttr(item.unitAr || '') +
                    (low ? ' <span class="erp-stock-alert">⚠ تحت الحد الأدنى</span>' : '') + '</small>' +
                    '<div class="scm-row-actions">' +
                    '<button type="button" onclick="editErpInventoryItem(\'' + item.id + '\')">تعديل</button>' +
                    '<button type="button" onclick="deleteErpInventoryItem(\'' + item.id + '\')">حذف</button></div></li>';
            }).join('');
        }

        function addErpInventoryItem() {
            if (!requirePermission('inventory')) return;
            const sku = prompt('كود SKU:');
            const nameAr = prompt('اسم الصنف (عربي):');
            if (!sku || !nameAr) return;
            const nameEn = prompt('Name (English):', nameAr);
            const warehouseAr = prompt('المستودع / الفرع:', 'القصيم — الرئيسي');
            const qty = parseFloat(prompt('الكمية الحالية:', '0')) || 0;
            const minQty = parseFloat(prompt('الحد الأدنى للتنبيه:', '0')) || 0;
            const unitAr = prompt('الوحدة (كيس / قطعة …):', 'كيس');
            const productLink = prompt('ربط بمنتج الموقع (معرّف prod-… اختياري):', '');
            erpInventory.push({
                id: 'inv-' + Date.now(),
                sku: sku.trim(),
                nameAr: nameAr.trim(),
                nameEn: (nameEn || nameAr).trim(),
                warehouseAr: (warehouseAr || '').trim(),
                warehouseEn: (warehouseAr || '').trim(),
                qty: qty,
                minQty: minQty,
                unitAr: (unitAr || '').trim(),
                productLink: (productLink || '').trim()
            });
            saveSystemData();
            displayErpInventory();
            renderErpHubPanel();
            addAuditLog('ERP مخزون', 'إضافة SKU ' + sku);
        }

        function editErpInventoryItem(id) {
            if (!requirePermission('inventory')) return;
            const item = erpInventory.find(function(i) { return i.id === id; });
            if (!item) return;
            const qty = prompt('الكمية الحالية:', item.qty);
            const minQty = prompt('الحد الأدنى:', item.minQty);
            if (qty === null) return;
            item.qty = parseFloat(qty) || 0;
            item.minQty = parseFloat(minQty) || 0;
            saveSystemData();
            displayErpInventory();
            renderErpHubPanel();
            addAuditLog('ERP مخزون', 'تعديل ' + item.sku);
        }

        function deleteErpInventoryItem(id) {
            if (!requirePermission('inventory')) return;
            const item = erpInventory.find(function(i) { return i.id === id; });
            if (!item || !confirm('حذف ' + item.sku + '؟')) return;
            erpInventory = erpInventory.filter(function(i) { return i.id !== id; });
            saveSystemData();
            displayErpInventory();
            renderErpHubPanel();
        }

        function openErpOrders() {
            if (!requirePermission('orders', 'صلاحية الطلبات مطلوبة.')) return;
            displayErpOrders();
            document.getElementById('erp-orders').classList.add('show');
        }

        function displayErpOrders() {
            const list = document.getElementById('erp-orders-list');
            if (!list) return;
            if (!erpOrders.length) {
                list.innerHTML = '<li>لا توجد طلبات مسجلة — جاهز للتوسعة مثل OMS عالمي.</li>';
                return;
            }
            list.innerHTML = erpOrders.map(function(o) {
                return '<li><strong>' + escapeHtmlAttr(o.id) + '</strong> — ' + escapeHtmlAttr(o.customer) +
                    ' | ' + escapeHtmlAttr(o.status) + ' | ' + escapeHtmlAttr(o.branch || '') + '</li>';
            }).join('');
        }

        function addErpOrderStub() {
            if (!requirePermission('orders')) return;
            const customer = prompt('اسم العميل:');
            const product = prompt('المنتج / الطلب:');
            if (!customer || !product) return;
            erpOrders.push({
                id: 'ORD-' + Date.now(),
                customer: customer.trim(),
                product: product.trim(),
                status: 'pending',
                branch: prompt('الفرع:', '') || '',
                createdAt: new Date().toISOString()
            });
            saveSystemData();
            displayErpOrders();
            renderErpHubPanel();
            addAuditLog('ERP طلب', customer);
        }

        function openErpProcurement() {
            if (!requirePermission('erp')) return;
            const list = document.getElementById('erp-procurement-list');
            if (list) {
                list.innerHTML = erpProcurement.length
                    ? erpProcurement.map(function(p) { return '<li>' + escapeHtmlAttr(p.title || p.id) + '</li>'; }).join('')
                    : '<li>وحدة المشتريات — هيكل جاهز (موردون · أوامر شراء) كمنصات B2B العالمية.</li>';
            }
            document.getElementById('erp-procurement').classList.add('show');
        }

        function renderPlatformHubPanel() {
            const panel = document.getElementById('platform-hub-panel');
            if (!panel || !currentAdmin) return;

            const lang = currentLang || 'ar';
            const ui = siteText[lang] || siteText.ar;
            const tagline = lang === 'en'
                ? (systemSettings.platformTaglineEn || systemSettings.platformTaglineAr)
                : (systemSettings.platformTaglineAr || systemSettings.platformTaglineEn);

            setElementText('platform-hub-title', ui.platformHubTitle);
            setElementText('platform-hub-subtitle', ui.platformHubSubtitle);
            const taglineEl = document.getElementById('platform-hub-tagline');
            if (taglineEl) taglineEl.textContent = tagline || '';

            const verBadge = document.getElementById('platform-version-badge');
            if (verBadge) {
                verBadge.innerHTML = '<i class="fas fa-code-branch" aria-hidden="true"></i> ' +
                    escapeHtmlAttr(NEBRAS_PLATFORM.codename) + ' v' + escapeHtmlAttr(NEBRAS_PLATFORM.version);
            }

            const layersRow = document.getElementById('platform-layers-row');
            if (layersRow) {
                layersRow.innerHTML = NEBRAS_PLATFORM.layers.map(function(layer) {
                    const name = lang === 'en' ? layer.nameEn : layer.nameAr;
                    return '<span class="platform-layer-chip"><i class="' + escapeHtmlAttr(layer.icon) + '" aria-hidden="true"></i> ' + escapeHtmlAttr(name) + '</span>';
                }).join('');
            }

            const grid = document.getElementById('platform-modules-grid');
            if (!grid) return;

            const statusLabel = {
                live: ui.platformStatusLive || 'يعمل',
                beta: ui.platformStatusBeta || 'تجريبي',
                planned: ui.platformStatusPlanned || 'قادم'
            };

            grid.innerHTML = NEBRAS_PLATFORM.modules.map(function(mod) {
                const name = lang === 'en' ? mod.nameEn : mod.nameAr;
                const desc = lang === 'en' ? (mod.descEn || mod.descAr) : mod.descAr;
                const ok = canOpenPlatformModule(mod);
                const st = mod.status || 'planned';
                return '<button type="button" class="platform-module-card' + (ok ? '' : ' disabled') + '" role="listitem" onclick="openPlatformModule(\'' + mod.id + '\')">' +
                    '<div class="pm-icon"><i class="' + escapeHtmlAttr(mod.icon) + '" aria-hidden="true"></i></div>' +
                    '<h4>' + escapeHtmlAttr(name) + '</h4>' +
                    '<small>' + escapeHtmlAttr(desc) + '</small>' +
                    '<span class="platform-status ' + escapeHtmlAttr(st) + '">' + escapeHtmlAttr(statusLabel[st] || st) + '</span></button>';
            }).join('');
        }

        function openSystemSettingsForChannels() {
            if (!currentAdmin) return;
            const t = siteText[currentLang || 'ar'] || siteText.ar;
            if (!isMainGovernanceAdmin(currentAdmin) && currentAdmin.role !== 'superadmin') {
                alert(t.channelsSettingsSuperAdminOnly || '');
                return;
            }
            openSystemSettings();
        }

        function renderDashboardOfficialHub() {
            const t = siteText[currentLang || 'ar'] || siteText.ar;
            const linktree = sanitizeExternalUrl(systemSettings.linktreeUrl || NEBRAS_LINKTREE_URL) || NEBRAS_LINKTREE_URL;
            const siteUrl = sanitizeExternalUrl(systemSettings.publicSiteUrl || NEBRAS_PUBLIC_SITE_URL) || NEBRAS_PUBLIC_SITE_URL;
            const titleEl = document.getElementById('dashboard-official-title');
            const hintEl = document.getElementById('dashboard-official-hint');
            const copyEl = document.getElementById('dashboard-copyright-text');
            const siteLink = document.getElementById('dashboard-site-url-link');
            const ltLink = document.getElementById('dashboard-linktree-link');
            const ltTitle = document.getElementById('dashboard-linktree-title');
            const ltUrl = document.getElementById('dashboard-linktree-url');
            const qrCaption = document.getElementById('dashboard-qr-caption');
            const qrDownload = document.getElementById('dashboard-qr-download');
            const qrDownloadLabel = document.getElementById('dashboard-qr-download-label');
            const qrImg = document.getElementById('dashboard-qr-img');
            if (titleEl) titleEl.innerHTML = '<i class="fas fa-link" aria-hidden="true"></i> ' + escapeHtmlAttr(t.dashboardOfficialTitle || 'الروابط الرسمية و QR الموقع');
            if (hintEl) hintEl.textContent = t.dashboardOfficialHint || '';
            if (copyEl) copyEl.textContent = t.dashboardCopyright || 'كل الحقوق محفوظة مع مصنع نبراس 2026';
            if (siteLink) {
                siteLink.href = siteUrl;
                siteLink.textContent = siteUrl.replace(/^https?:\/\//i, '');
            }
            if (ltLink) ltLink.href = linktree;
            if (ltTitle) ltTitle.textContent = t.dashboardLinktreeTitle || 'Nebras.Factory — Linktree الرسمي';
            if (ltUrl) ltUrl.textContent = linktree.replace(/^https?:\/\//i, '');
            if (qrCaption) qrCaption.textContent = t.dashboardQrCaption || '';
            if (qrDownload) {
                qrDownload.href = NEBRAS_SITE_QR_IMAGE;
                qrDownload.setAttribute('download', 'nebras-factory-site-qr.png');
            }
            if (qrDownloadLabel) qrDownloadLabel.textContent = t.dashboardQrDownload || 'تحميل QR';
            if (qrImg) {
                qrImg.src = NEBRAS_SITE_QR_IMAGE + '?v=2026';
                qrImg.alt = t.dashboardQrAlt || 'رمز QR لموقع مصنع نبراس';
            }
        }

        function renderDashboardChannelsStatus() {
            if (!currentAdmin) return;
            const t = siteText[currentLang || 'ar'];
            const titleEl = document.getElementById('dashboard-channels-title');
            const hintEl = document.getElementById('dashboard-channels-hint');
            const listEl = document.getElementById('dashboard-channels-list');
            const btn = document.getElementById('dashboard-channels-edit-btn');
            const note = document.getElementById('dashboard-channels-superadmin-note');
            if (titleEl) titleEl.textContent = t.dashboardChannelsTitle || '';
            if (hintEl) hintEl.textContent = t.dashboardChannelsHint || '';
            if (!listEl) return;

            const explicitWa = String(systemSettings.socialWhatsApp || '').trim();
            const waHref = resolveCompanyWhatsAppHref();
            const fb = sanitizeExternalUrl(systemSettings.socialFacebook);
            const ig = sanitizeExternalUrl(systemSettings.socialInstagram);
            const tt = sanitizeExternalUrl(systemSettings.socialTiktok);
            const sn = sanitizeExternalUrl(systemSettings.socialSnapchat);

            function row(ok, label, detail) {
                return '<li><span class="ch-mark ' + (ok ? 'ok' : 'no') + '">' + (ok ? '✓' : '—') + '</span><span>' + label + ' <small>' + detail + '</small></span></li>';
            }

            const parts = [];
            parts.push(row(!!waHref, t.channelWhatsApp, explicitWa ? t.channelDetailExplicitWa : (waHref ? t.channelDetailWaFallback : t.channelDetailMissing)));
            parts.push(row(!!fb, t.channelFacebook, fb ? t.channelDetailOn : t.channelDetailMissing));
            parts.push(row(!!ig, t.channelInstagram, ig ? t.channelDetailOn : t.channelDetailMissing));
            parts.push(row(!!tt, t.channelTikTok, tt ? t.channelDetailOn : t.channelDetailMissing));
            parts.push(row(!!sn, t.channelSnapchat, sn ? t.channelDetailOn : t.channelDetailMissing));
            const lt = sanitizeExternalUrl(systemSettings.linktreeUrl || NEBRAS_LINKTREE_URL);
            parts.push(row(!!lt, t.channelLinktree || 'Linktree', lt ? t.channelDetailOn : t.channelDetailMissing));

            listEl.innerHTML = parts.join('');

            if (btn) {
                btn.textContent = t.dashboardChannelsEditBtn || '';
                btn.style.display = currentAdmin.role === 'superadmin' ? 'inline-block' : 'none';
            }
            if (note) {
                if (currentAdmin.role !== 'superadmin') {
                    note.style.display = 'block';
                    note.textContent = t.channelsSettingsSuperAdminOnly || '';
                } else {
                    note.style.display = 'none';
                }
            }
        }

        const iconDetails = {
            pvc: {
                ar: { title: 'أبواب WPC عضم (للورش والمصانع)', text: 'أبواب WPC عضم غير جاهزة — للورش والمصانع.' },
                en: { title: 'PVC Granules', text: 'Manufacturing and supply details for PVC granules.' },
                zh: { title: 'PVC 颗粒', text: 'PVC 颗粒制造与供应详情。' }
            },
            wpc: {
                ar: { title: 'أبواب WPC', text: 'تصاميم متعددة لأبواب WPC مع جودة عالية ومقاومة ممتازة.' },
                en: { title: 'WPC Doors', text: 'High-quality WPC doors with multiple design options.' },
                zh: { title: 'WPC 门', text: '高质量 WPC 门，支持多种设计。' }
            },
            aluminum: {
                ar: { title: 'الألومنيوم', text: 'حلول ألومنيوم للمشاريع السكنية والتجارية والتشطيبات.' },
                en: { title: 'Aluminum', text: 'Aluminum solutions for residential and commercial projects.' },
                zh: { title: '铝制品', text: '住宅与商业项目的铝制品解决方案。' }
            },
            inventory: {
                ar: { title: 'إدارة المخزون', text: 'متابعة المخزون، الكميات، والتحديثات الداخلية بشكل فوري.' },
                en: { title: 'Inventory Management', text: 'Track stock levels, quantities, and internal updates instantly.' },
                zh: { title: '库存管理', text: '实时跟踪库存水平、数量和内部更新。' }
            },
            analytics: {
                ar: { title: 'الإحصائيات والتحليلات', text: 'مؤشرات أداء وتقارير تساعد الإدارة في اتخاذ القرار.' },
                en: { title: 'Analytics', text: 'Performance metrics and reports that support decision-making.' },
                zh: { title: '数据分析', text: '用于支持决策的绩效指标与报告。' }
            },
            sales: {
                ar: { title: 'خدمة المبيعات', text: 'يمكنك التواصل مع فريق المبيعات للحصول على أفضل العروض.' },
                en: { title: 'Sales Support', text: 'Contact our sales team for quotes and offers.' },
                zh: { title: '销售支持', text: '联系销售团队获取报价和优惠。' }
            },
            customer: {
                ar: { title: 'خدمة العملاء', text: 'دعم واستقبال استفسارات العملاء ومتابعة طلباتهم.' },
                en: { title: 'Customer Service', text: 'Support and follow-up for customer inquiries and requests.' },
                zh: { title: '客户服务', text: '客户咨询与请求的支持和跟进。' }
            },
            otherProducts: {
                ar: { title: 'منتجات نبراس الأخرى', text: 'مجموعة منتجات وحلول إضافية يمكن عرضها وتوسيعها من لوحة الإدارة. هذا القسم للزوار؛ التحرير الكامل للمحتوى يتم من الداخل بعد الصلاحيات.' },
                en: { title: 'Other Nebras Products', text: 'Additional products and solutions expandable from the admin dashboard. Visitors see this showcase; full editing remains internal.' },
                zh: { title: '其他 Nebras 产品', text: '可从管理后台扩展的附加产品与解决方案。访客在此浏览；完整编辑在内部权限下进行。' }
            }
        };

        let iconOverlayPrimary = { type: 'none', value: '' };

        function showRichIconOverlay(title, bodyText, imageUrls, primary, documents, options) {
            const opts = options || {};
            const ui = siteText[currentLang || 'ar'];
            const lang = currentLang || 'ar';
            const titleEl = document.getElementById('icon-overlay-title');
            const textEl = document.getElementById('icon-overlay-text');
            const hintEl = document.getElementById('icon-overlay-mode-hint');
            const docsEl = document.getElementById('icon-overlay-documents');
            const gallery = document.getElementById('icon-overlay-gallery');
            const variantsEl = document.getElementById('icon-overlay-variants');
            const goBtn = document.getElementById('icon-overlay-go-btn');
            const shopBtn = document.getElementById('icon-overlay-shop-btn');
            if (titleEl) titleEl.textContent = title || '';
            if (textEl) textEl.textContent = bodyText || '';
            const docs = (documents || []).filter(function(d) { return d && d.url; });
            if (docsEl) {
                if (docs.length) {
                    docsEl.innerHTML = docs.map(function(d) {
                        const label = lang === 'en' ? (d.labelEn || d.labelAr) : (d.labelAr || d.labelEn || ui.overlayDocument || 'وثيقة');
                        const href = normalizeMediaPath(d.url);
                        return '<a href="' + escapeHtmlAttr(href) + '" target="_blank" rel="noopener noreferrer"><i class="fas fa-file-alt"></i> ' + escapeHtmlAttr(label) + '</a>';
                    }).join('');
                    docsEl.style.display = 'flex';
                } else {
                    docsEl.innerHTML = '';
                    docsEl.style.display = 'none';
                }
            }
            const imgs = (imageUrls || []).filter(Boolean);
            if (gallery && opts.innerLayout === 'certifications' && opts.certificationsHtml) {
                gallery.classList.remove('grid-empty');
                gallery.classList.add('nebras-cert-grid');
                gallery.innerHTML = opts.certificationsHtml;
                gallery.style.display = 'grid';
            } else if (gallery) {
                gallery.classList.remove('nebras-cert-grid');
                if (imgs.length) {
                    gallery.classList.remove('grid-empty');
                    const hint = ui.lightboxOpenHint || 'اضغط للتكبير';
                    gallery.innerHTML = imgs.map(function(src) {
                        return '<img src="' + escapeHtmlAttr(src) + '" alt="" loading="lazy" decoding="async" title="' + escapeHtmlAttr(hint) + '" onerror="this.style.opacity=\'0.35\'">';
                    }).join('');
                    gallery.style.display = 'grid';
                    wireClickableMediaIn(gallery);
                } else {
                    gallery.innerHTML = '';
                    gallery.classList.add('grid-empty');
                    gallery.style.display = 'none';
                }
            }
            if (variantsEl) {
                const vHtml = opts.variantsHtml || '';
                if (vHtml) {
                    variantsEl.innerHTML = vHtml;
                    variantsEl.hidden = false;
                } else {
                    variantsEl.innerHTML = '';
                    variantsEl.hidden = true;
                }
            }
            iconOverlayPrimary = primary && primary.type && primary.type !== 'none'
                ? { type: primary.type, value: primary.value || '' }
                : { type: 'none', value: '' };
            if (goBtn) {
                const active = iconOverlayPrimary.type !== 'none';
                goBtn.style.display = active ? 'block' : 'none';
                if (active) {
                    if (iconOverlayPrimary.type === 'scroll') goBtn.textContent = ui.overlayGoSection;
                    else if (iconOverlayPrimary.type === 'external') goBtn.textContent = ui.overlayOpenLink;
                    else if (iconOverlayPrimary.type === 'tel_sales') goBtn.textContent = ui.overlayDialSales;
                    else if (iconOverlayPrimary.type === 'tel_customer') goBtn.textContent = ui.overlayDialCustomer;
                    else if (iconOverlayPrimary.type === 'handler') goBtn.textContent = ui.overlayOpenModule || 'فتح النظام';
                }
            }
            iconOverlayShopProductId = opts.shopProductId || null;
            if (shopBtn) {
                if (iconOverlayShopProductId) {
                    shopBtn.hidden = false;
                    shopBtn.textContent = ui.overlayShopBtn || 'تسوق — اختر المقاس والسعر';
                } else {
                    shopBtn.hidden = true;
                }
            }
            if (hintEl) {
                const customHint = String(opts.modeHint || '').trim();
                if (customHint) {
                    hintEl.hidden = false;
                    hintEl.textContent = customHint;
                } else {
                    const mode = opts.mode || 'browse';
                    if (mode === 'shop' && iconOverlayShopProductId) {
                        hintEl.hidden = false;
                        hintEl.textContent = ui.overlayShopHint || 'متجر — اختر صنفاً من المعرض أو زر «تسوق» للسلة الكاملة.';
                    } else if (mode === 'browse') {
                        hintEl.hidden = false;
                        hintEl.textContent = ui.overlayBrowseHint || 'وضع التصفح — استعرض المعرض. الشراء من زر «تسوق» فقط.';
                    } else {
                        hintEl.hidden = true;
                        hintEl.textContent = '';
                    }
                }
            }
            const overlay = document.getElementById('icon-overlay');
            const modal = overlay ? overlay.querySelector('.icon-detail-modal') : null;
            if (modal) {
                modal.classList.remove('icon-inner-hub', 'icon-inner-product-detail', 'icon-inner-section');
                const layout = opts.innerLayout || '';
                if (layout === 'hub') modal.classList.add('icon-inner-hub');
                else if (layout === 'product-detail') modal.classList.add('icon-inner-product-detail');
                else if (layout === 'section') modal.classList.add('icon-inner-section');
                else if (layout === 'certifications') modal.classList.add('icon-inner-certifications');
            }
            if (overlay) {
                overlay.classList.add('show');
                wireClickableMediaIn(overlay);
            }
        }

        function iconOverlayShopClick() {
            if (!iconOverlayShopProductId) return;
            closeIconOverlay();
            openProductShop(iconOverlayShopProductId);
        }

        function iconOverlayPrimaryClick() {
            const p = iconOverlayPrimary;
            if (p.type === 'scroll' && p.value) {
                closeIconOverlay();
                scrollToSection(p.value);
            } else if (p.type === 'external' && p.value) {
                window.open(p.value, '_blank', 'noopener,noreferrer');
            } else if (p.type === 'tel_sales') {
                dialNumber(systemSettings.mainSalesPhone);
            } else if (p.type === 'tel_customer') {
                dialNumber(systemSettings.customerServicePhone);
            } else if (p.type === 'handler') {
                const h = p.value || pendingTileHandler;
                closeIconOverlay();
                pendingTileHandler = null;
                if (h) runDashboardHandler(h);
            }
        }

        function getVisitorTargetCaption(icon) {
            if (!icon || !icon.target) return '';
            const ui = siteText[currentLang || 'ar'];
            const t = String(icon.target).trim();
            if (t.startsWith('#')) {
                const map = {
                    '#products': ui.visitorJumpProducts,
                    '#branches': ui.visitorJumpBranches,
                    '#services': ui.visitorJumpServices,
                    '#about': ui.visitorJumpAbout,
                    '#doors': ui.visitorJumpDoors,
                    '#aluminum': ui.visitorJumpAluminum,
                    '#nebras-partners-section': ui.visitorJumpPartners || ui.partnersPublicTitle,
                    '#bank-accounts-section': ui.visitorJumpBankAccounts
                };
                return map[t] || ui.visitorJumpInside;
            }
            return ui.visitorJumpExternal;
        }

        function openAdminPanel(event) {
            event.preventDefault();
            if (currentAdmin) {
                showAdminDashboard(currentAdmin);
                return;
            }
            document.getElementById('admin-overlay').classList.add('show');
            document.getElementById('admin-status-message').textContent = '';
            document.getElementById('admin-username').value = '';
            document.getElementById('admin-password').value = '';
        }

        function canManage(permissionKey) {
            if (!currentAdmin) return false;
            if (isMainGovernanceAdmin(currentAdmin)) return true;
            if (Array.isArray(currentAdmin.permissions) && currentAdmin.permissions.length) {
                return currentAdmin.permissions.indexOf(permissionKey) >= 0;
            }
            const allowed = rolePermissions[currentAdmin.role] || [];
            return allowed.indexOf(permissionKey) >= 0;
        }

        function requirePermission(permissionKey, message) {
            if (!canManage(permissionKey)) {
                alert(message || 'لا تملك الصلاحية لهذا الإجراء.');
                return false;
            }
            return true;
        }

        function addAuditLog(action, details) {
            const actor = currentAdmin ? `${currentAdmin.username} (${currentAdmin.role})` : 'system';
            auditLogs.unshift({
                id: Date.now(),
                action,
                details,
                actor,
                at: formatNebrasDateTime(new Date(), 'ar')
            });
            if (auditLogs.length > 200) {
                auditLogs = auditLogs.slice(0, 200);
            }
            saveSystemData();
            displayAuditLog();
        }

        function closeAdminOverlay() {
            document.getElementById('admin-overlay').classList.remove('show');
        }

        function loginAdmin() {
            const username = document.getElementById('admin-username').value.trim();
            const password = document.getElementById('admin-password').value.trim();
            const status = document.getElementById('admin-status-message');
            const user = adminUsers.find(function(u) {
                return String(u.username || '').toUpperCase() === username.toUpperCase() && u.password === password;
            });

            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            if (!username || !password) {
                status.textContent = ui.adminLoginEmpty || 'يرجى إدخال اسم المستخدم وكلمة المرور.';
                return;
            }

            if (user) {
                if (isMainGovernanceAdmin(user)) {
                    user.isPrimary = true;
                    user.role = 'superadmin';
                    user.permissions = null;
                }
                currentAdmin = user;
                status.textContent = ui.adminLoginOk || 'تم تسجيل الدخول بنجاح.';
                closeAdminOverlay();
                showAdminDashboard(user);
                setLanguage(currentLang || 'ar');
                addAuditLog('تسجيل دخول', `دخول ناجح بواسطة ${user.username}`);
            } else {
                status.textContent = ui.adminLoginFail || 'بيانات الدخول غير صحيحة. حاول مرة أخرى.';
            }
        }

        function showAdminDashboard(user) {
            document.getElementById('admin-dashboard').classList.add('show');
            ensureDashboardGovernanceHandlers();
            updateAdminRoleLabel(user);
            applyOccasionTheme();
            syncAdminSessionClass();
            renderPlatformHubPanel();
            renderErpHubPanel();
            renderDashboardTiles();
            renderCompanyLegalBars();
            applyStaticUiTranslations(siteText[currentLang || 'ar'] || siteText.ar);
            displayUsers();
            displaySales();
            displaySalesQuotesInbox();
            displayCustomerService();
            displayComplaints();
            updateSalesQuoteFab();
            renderAdminAnalyticsPanel();
            updateSalesInboxBadge();
            renderDashboardOfficialHub();
            renderDashboardChannelsStatus();
        }

        function logoutAdmin() {
            if (currentAdmin) {
                addAuditLog('تسجيل خروج', `خروج المستخدم ${currentAdmin.username}`);
            }
            currentAdmin = null;
            document.getElementById('admin-dashboard').classList.remove('show');
            syncAdminSessionClass();
            setLanguage(currentLang || 'ar');
            updateSalesQuoteFab();
            return false;
        }

        function openCustomerComplaints() {
            document.getElementById('complaint-overlay').classList.add('show');
        }

        function closeComplaintOverlay() {
            document.getElementById('complaint-overlay').classList.remove('show');
            document.getElementById('complaint-number').value = '';
            document.getElementById('complaint-customer-name').value = '';
            document.getElementById('complaint-customer-phone').value = '';
            document.getElementById('complaint-customer-branch').value = '';
            document.getElementById('complaint-description').value = '';
            document.getElementById('complaint-status-message').textContent = '';
        }

        function dialNumber(phoneNumber) {
            if (!phoneNumber) return;
            window.location.href = `tel:${phoneNumber}`;
        }

        function normalizeText(value) {
            return String(value || '').trim().toLowerCase().replace(/\s+/g, '');
        }

        function getNearestSalesNumber(branchName) {
            const normalizedBranch = normalizeText(branchName);
            if (!normalizedBranch) {
                return { phone: systemSettings.mainSalesPhone, city: 'المبيعات العامة' };
            }
            const matchedBranch = branchesData.find(function(branch) {
                const key = getBranchSearchKey(branch);
                return key.includes(normalizedBranch) || normalizedBranch.includes(normalizeText(branch.city || ''));
            });
            if (matchedBranch && matchedBranch.salesPhone) {
                return { phone: matchedBranch.salesPhone, city: matchedBranch.city };
            }
            return { phone: systemSettings.mainSalesPhone, city: 'المبيعات العامة' };
        }

        function smartRouteToSales() {
            const requestedBranch = prompt('اكتب اسم الفرع أو المدينة للتحويل لأقرب مندوب:');
            const routedContact = getNearestSalesNumber(requestedBranch);
            alert(`سيتم التحويل إلى: ${routedContact.city} - ${routedContact.phone}`);
            dialNumber(routedContact.phone);
        }

        function submitComplaint() {
            const name = document.getElementById('complaint-customer-name').value.trim();
            const phone = document.getElementById('complaint-customer-phone').value.trim();
            const branch = document.getElementById('complaint-customer-branch').value.trim();
            const description = document.getElementById('complaint-description').value.trim();
            const statusEl = document.getElementById('complaint-status-message');

            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            if (!name || !phone || !description) {
                statusEl.textContent = ui.complaintFillRequired || 'يرجى إدخال الاسم ورقم الهاتف وتفاصيل الشكوى.';
                return;
            }

            const complaintId = String(Date.now()).slice(-6);
            const routedContact = getNearestSalesNumber(branch);
            complaints[complaintId] = {
                status: 'pending',
                description,
                customerName: name,
                phone,
                branch: branch || 'غير محدد',
                routedSalesPhone: routedContact.phone,
                routedSalesBranch: routedContact.city,
                createdAt: new Date().toISOString(),
                sessionId: getVisitorSessionId()
            };

            statusEl.textContent = (ui.complaintSubmitted || 'تم تسجيل الشكوى بنجاح. رقم الشكوى: ') + complaintId +
                ' — ' + (ui.complaintRouted || 'التحويل: ') + routedContact.city + ' (' + routedContact.phone + ')';
            document.getElementById('complaint-number').value = complaintId;
            document.getElementById('complaint-description').value = '';
            saveSystemData();
            displayComplaints();
            if (currentAdmin && canManage('audit')) renderAdminAnalyticsPanel();
            addAuditLog('شكوى جديدة', `تم تسجيل شكوى رقم ${complaintId} من ${name} (${phone})`);
        }

        function checkComplaintStatus() {
            const number = document.getElementById('complaint-number').value.trim();
            const statusEl = document.getElementById('complaint-status-message');
            const text = siteText[currentLang || 'ar'];

            if (!number) {
                statusEl.textContent = text.complaintEnterNumber;
                return;
            }

            const complaint = complaints[number];
            if (complaint) {
                let statusText = '';
                switch (complaint.status) {
                    case 'pending':
                        statusText = text.complaintStatusPending;
                        break;
                    case 'inProgress':
                        statusText = text.complaintStatusInProgress;
                        break;
                    case 'resolved':
                        statusText = text.complaintStatusResolved;
                        break;
                    default:
                        statusText = text.complaintUnknownStatus;
                }
                statusEl.textContent = `${text.complaintStatusLabel} ${statusText}`;
            } else {
                statusEl.textContent = text.complaintNotFound;
            }
        }

        function openOtherProducts() {
            const p = siteProducts.find(function(x) { return x.legacyKey === 'otherProducts' || x.id === 'prod-other'; });
            if (p) openSiteProduct(p.id);
            else openIconDetails('otherProducts');
        }

        function openIconDetails(iconKey) {
            if (iconKey === 'analytics') {
                openAdminAnalytics();
                return;
            }
            const lang = currentLang || 'ar';
            const ui = siteText[lang] || siteText.ar;
            const linkedProductId = ICON_KEY_TO_PRODUCT_ID[iconKey];
            if (linkedProductId) {
                const linked = siteProducts.find(function(p) { return p.id === linkedProductId; });
                if (linked) {
                    openProductCatalog(linkedProductId);
                    return;
                }
            }
            const pack = getIconDetailPack(iconKey);
            const details = pack ? (pack[lang] || pack.ar) : null;
            if (!details || (!details.title && !details.text)) {
                alert(ui.iconDetailMissing || 'لا يوجد محتوى لهذه الأيقونة — أضفه من إدارة المحتوى أو اربط منتجاً.');
                return;
            }

            const defaultAlbums = {
                pvc: ['images/wpc-background.avif', 'images/pvc-background.avif'],
                wpc: ['images/wpc-background.avif'],
                aluminum: ['images/aluminum-background.webp'],
                otherProducts: ['images/background-other-products.jpeg'],
                inventory: [],
                analytics: [],
                sales: [],
                customer: []
            };
            const album = (details.album && details.album.length)
                ? details.album.map(normalizeMediaPath)
                : (defaultAlbums[iconKey] || []).map(normalizeMediaPath);

            let primary = { type: 'none', value: '' };
            let body = details.text || '';

            if (iconKey === 'pvc') primary = { type: 'scroll', value: '#products' };
            else if (iconKey === 'wpc') primary = { type: 'scroll', value: '#doors' };
            else if (iconKey === 'aluminum') primary = { type: 'scroll', value: '#aluminum' };
            else if (iconKey === 'otherProducts') primary = { type: 'scroll', value: '#products' };
            else if ((iconKey === 'inventory' || iconKey === 'analytics') && currentAdmin) {
                body += ui.adminPreviewHint || '';
            } else if (iconKey === 'sales') {
                primary = { type: 'tel_sales', value: '' };
                body += '\n\n' + ui.salesHotlineLabel + ' ' + (systemSettings.mainSalesPhone || '');
            } else if (iconKey === 'customer') {
                primary = { type: 'tel_customer', value: '' };
                body += '\n\n' + ui.customerHotlineLabel + ' ' + (systemSettings.customerServicePhone || '');
            }

            const docs = (pack && pack.documents) ? pack.documents : [];
            showRichIconOverlay(details.title, body, album, primary, docs, { mode: 'browse' });
        }

        function closeIconOverlay() {
            const overlay = document.getElementById('icon-overlay');
            const gallery = document.getElementById('icon-overlay-gallery');
            const modal = overlay ? overlay.querySelector('.icon-detail-modal') : null;
            if (gallery) {
                gallery.classList.remove('nebras-cert-grid', 'grid-empty');
                gallery.innerHTML = '';
                gallery.style.display = '';
            }
            if (modal) {
                modal.classList.remove('icon-inner-hub', 'icon-inner-product-detail', 'icon-inner-section', 'icon-inner-certifications');
            }
            if (overlay) overlay.classList.remove('show');
            iconOverlayPrimary = { type: 'none', value: '' };
            iconOverlayShopProductId = null;
        }

        // Admin functions
        function openUserManagement() {
            if (!requirePermission('users')) return;
            const settingsBtn = document.getElementById('open-system-settings-btn');
            if (settingsBtn) {
                settingsBtn.style.display = currentAdmin && currentAdmin.role === 'superadmin' ? 'inline-block' : 'none';
            }
            document.getElementById('user-management').classList.add('show');
        }

        function openSalesManagement() {
            if (!requirePermission('sales')) return;
            document.getElementById('sales-management').classList.add('show');
            displaySales();
            displaySalesQuotesInbox();
            updateSalesInboxBadge();
        }

        function openCustomerServiceManagement() {
            if (!requirePermission('customerService')) return;
            document.getElementById('customer-service-management').classList.add('show');
        }

        function openComplaintsManagement() {
            if (!requirePermission('complaints')) return;
            document.getElementById('complaints-management').classList.add('show');
        }

        function openBranchesManagement() {
            if (!requirePermission('branches')) return;
            document.getElementById('branches-management').classList.add('show');
            displayBranchesAdmin();
        }

        function openAuditLog() {
            if (!requirePermission('audit')) return;
            document.getElementById('audit-log').classList.add('show');
            displayAuditLog();
        }

        function openSystemSettings() {
            if (!requireMainGovernanceAdmin('إعدادات المنصة الكاملة متاحة للإدارة الرئيسية فقط.')) return;
            renderSystemSettings();
            document.getElementById('system-settings').classList.add('show');
        }

        function populateOccasionThemeSelect() {
            const select = document.getElementById('setting-occasion-theme');
            if (!select) return;
            const lang = currentLang || 'ar';
            const wasValue = select.value || systemSettings.occasionThemeId || 'default';
            select.innerHTML = '';
            Object.keys(OCCASION_THEME_PRESETS).forEach(function(key) {
                const preset = OCCASION_THEME_PRESETS[key];
                const opt = document.createElement('option');
                opt.value = preset.id;
                const label = lang === 'en'
                    ? (preset.statusEn || preset.id)
                    : (preset.statusAr || preset.id);
                opt.textContent = label.replace(/^ثيم\s|^Theme:\s*/i, '').trim() || preset.id;
                if (preset.id === 'default') {
                    opt.textContent = lang === 'en' ? 'Normal (no celebration)' : 'عادي — بدون احتفال';
                } else if (preset.id === 'custom') {
                    opt.textContent = lang === 'en' ? 'Custom celebration display' : 'عرض احتفالي مخصص';
                } else if (lang === 'en') {
                    opt.textContent = (preset.badgeEn || preset.ribbonEn || preset.id);
                } else {
                    opt.textContent = (preset.badgeAr || preset.ribbonAr || preset.id);
                }
                select.appendChild(opt);
            });
            select.value = OCCASION_THEME_PRESETS[wasValue] ? wasValue : 'default';
        }

        function parseLocalDateOnly(str) {
            const s = String(str || '').trim();
            if (!s) return null;
            const parts = s.split('-');
            if (parts.length !== 3) return null;
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
            return new Date(y, m, d);
        }

        function isWithinOccasionDateRange() {
            const start = parseLocalDateOnly(systemSettings.occasionStartDate);
            const end = parseLocalDateOnly(systemSettings.occasionEndDate);
            if (!start && !end) return true;
            const today = new Date();
            today.setHours(12, 0, 0, 0);
            if (start) {
                start.setHours(0, 0, 0, 0);
                if (today < start) return false;
            }
            if (end) {
                end.setHours(23, 59, 59, 999);
                if (today > end) return false;
            }
            return true;
        }

        function getResolvedOccasionThemeId() {
            const id = String(systemSettings.occasionThemeId || 'default').trim();
            if (!OCCASION_THEME_PRESETS[id]) return 'default';
            if (id === 'default') return 'default';
            if (!systemSettings.occasionThemeEnabled) return 'default';
            if (!isWithinOccasionDateRange()) return 'default';
            return id;
        }

        function getOccasionRibbonMessage(preset, lang) {
            if (!preset || preset.id === 'default') return '';
            const customAr = String(systemSettings.occasionMessageAr || '').trim();
            const customEn = String(systemSettings.occasionMessageEn || '').trim();
            if (lang === 'en' && customEn) return customEn;
            if (lang !== 'en' && customAr) return customAr;
            if (preset.id === 'custom') {
                const labelAr = String(systemSettings.occasionCustomLabelAr || '').trim();
                const labelEn = String(systemSettings.occasionCustomLabelEn || '').trim();
                if (lang === 'en' && labelEn) return labelEn;
                if (labelAr) return labelAr;
            }
            if (lang === 'en') return preset.ribbonEn || preset.ribbonAr || '';
            return preset.ribbonAr || preset.ribbonEn || '';
        }

        function getOccasionCelebrationBadge(preset, lang) {
            if (!preset || preset.id === 'default') return '';
            const ui = siteText[lang] || siteText.ar;
            if (preset.id === 'custom') {
                const labelAr = String(systemSettings.occasionCustomLabelAr || '').trim();
                const labelEn = String(systemSettings.occasionCustomLabelEn || '').trim();
                if (lang === 'en' && labelEn) return labelEn;
                if (labelAr) return labelAr;
            }
            const badge = lang === 'en' ? (preset.badgeEn || preset.badgeAr) : (preset.badgeAr || preset.badgeEn);
            return badge || (ui.celebrationBadgeDefault || 'وضع احتفالي');
        }

        function getOccasionPromoMessage(lang) {
            const themeId = getResolvedOccasionThemeId();
            if (themeId === 'default') return '';
            const customAr = String(systemSettings.occasionPromoDiscountAr || '').trim();
            const customEn = String(systemSettings.occasionPromoDiscountEn || '').trim();
            const customZh = String(systemSettings.occasionPromoDiscountZh || '').trim();
            if (lang === 'en' && customEn) return customEn;
            if (lang === 'zh' && customZh) return customZh;
            if (lang === 'zh' && customEn) return customEn;
            if (customAr) return customAr;
            if (lang === 'en' && customAr) return customAr;
            const preset = OCCASION_THEME_PRESETS[themeId] || OCCASION_THEME_PRESETS.default;
            return getOccasionRibbonMessage(preset, lang);
        }

        function getOccasionDisplayTitle(lang) {
            const themeId = getResolvedOccasionThemeId();
            if (themeId === 'default') return '';
            const preset = OCCASION_THEME_PRESETS[themeId] || OCCASION_THEME_PRESETS.default;
            if (themeId === 'custom') {
                const labelAr = String(systemSettings.occasionCustomLabelAr || '').trim();
                const labelEn = String(systemSettings.occasionCustomLabelEn || '').trim();
                if (lang === 'en' && labelEn) return labelEn;
                if (labelAr) return labelAr;
            }
            if (lang === 'en') return preset.badgeEn || preset.ribbonEn || preset.badgeAr || '';
            if (lang === 'zh') return preset.badgeEn || preset.badgeAr || preset.ribbonAr || '';
            return preset.badgeAr || preset.ribbonAr || preset.badgeEn || '';
        }

        function getOccasionDetailBody(lang) {
            const msgAr = String(systemSettings.occasionMessageAr || '').trim();
            const msgEn = String(systemSettings.occasionMessageEn || '').trim();
            const promo = getOccasionPromoMessage(lang);
            let detail = '';
            if (lang === 'en') detail = msgEn || msgAr;
            else if (lang === 'zh') detail = msgEn || msgAr;
            else detail = msgAr || msgEn;
            if (!detail) {
                const themeId = getResolvedOccasionThemeId();
                const preset = OCCASION_THEME_PRESETS[themeId];
                if (preset) {
                    detail = lang === 'en' ? (preset.ribbonEn || preset.ribbonAr) : (preset.ribbonAr || preset.ribbonEn);
                }
            }
            if (promo && detail && detail.indexOf(promo) === -1) detail = detail + '\n\n' + promo;
            else if (promo && !detail) detail = promo;
            return detail.trim();
        }

        function getOccasionVisitorImageUrl() {
            const hero = String(systemSettings.occasionHeroImageUrl || '').trim();
            if (hero) return normalizeMediaPath(hero);
            const themeId = getResolvedOccasionThemeId();
            const preset = OCCASION_THEME_PRESETS[themeId];
            if (preset && preset.id === 'ramadan') return '/images/hero-nebras-banner.png';
            return '';
        }

        function openOccasionVisitorDetail() {
            openNebrasWorkspace({ pillar: 'showroom', view: 'occasion' });
        }

        function renderOccasionPromoBar() {
            const bar = document.getElementById('nebras-occasion-promo');
            if (!bar) return;
            const lang = currentLang || 'ar';
            const themeId = getResolvedOccasionThemeId();
            const isCelebration = themeId !== 'default';
            const titleText = getOccasionDisplayTitle(lang);
            const promoBody = getOccasionPromoMessage(lang);
            if (!isCelebration || (!titleText && !promoBody)) {
                bar.hidden = true;
                return;
            }
            bar.hidden = false;
            bar.setAttribute('data-occasion-theme', themeId);
            const ariaLabel = titleText || promoBody;
            bar.setAttribute('aria-label', ariaLabel);
            const titleEl = document.getElementById('nebras-occasion-promo-title');
            const bodyEl = document.getElementById('nebras-occasion-promo-body');
            const thumbEl = document.getElementById('nebras-occasion-promo-thumb');
            if (titleEl) titleEl.textContent = titleText || promoBody;
            if (bodyEl) {
                bodyEl.textContent = (titleText && promoBody && promoBody !== titleText) ? promoBody : '';
                bodyEl.style.display = bodyEl.textContent ? '' : 'none';
            }
            const imgUrl = getOccasionVisitorImageUrl();
            if (thumbEl) {
                if (imgUrl) {
                    thumbEl.hidden = false;
                    thumbEl.style.backgroundImage = 'url("' + escapeHtmlAttr(imgUrl) + '")';
                } else {
                    thumbEl.hidden = true;
                    thumbEl.style.backgroundImage = '';
                }
            }
            if (!bar.dataset.nebrasWired) {
                bar.dataset.nebrasWired = '1';
                bar.addEventListener('click', openOccasionVisitorDetail);
                bar.addEventListener('keydown', function(ev) {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        openOccasionVisitorDetail();
                    }
                });
            }
        }

        function getOccasionDecorationMix(preset) {
            if (!preset || !preset.id) return [{ icon: 'fas fa-star' }];
            const mix = OCCASION_DECO_MIX[preset.id];
            if (mix && mix.length) return mix;
            return (preset.decoIcons || ['fas fa-star']).map(function(ic) { return { icon: ic }; });
        }

        function appendCelebrationFloat(parent, item, index) {
            const el = document.createElement('span');
            el.className = 'celebration-float' + (item.className ? ' ' + item.className : '');
            el.style.setProperty('--delay', (index * 0.55) + 's');
            el.style.setProperty('--x', ((index * 7.3) % 100) + '%');
            if (item.symbol) {
                el.textContent = item.symbol;
                el.setAttribute('aria-hidden', 'true');
            } else {
                el.innerHTML = '<i class="' + escapeHtmlAttr(item.icon || 'fas fa-star') + '" aria-hidden="true"></i>';
            }
            parent.appendChild(el);
        }

        function buildCelebrationDecorations(preset) {
            const layer = document.getElementById('celebration-deco-layer');
            if (!layer) return;
            layer.innerHTML = '';
            const mix = getOccasionDecorationMix(preset);
            const count = Math.max(14, mix.length * 2);
            for (let i = 0; i < count; i++) {
                appendCelebrationFloat(layer, mix[i % mix.length], i);
            }
        }

        function clearCelebrationDecorations() {
            const layer = document.getElementById('celebration-deco-layer');
            if (layer) layer.innerHTML = '';
            const siteLayer = document.getElementById('site-celebration-overlay');
            if (siteLayer) siteLayer.innerHTML = '';
        }

        function buildPublicCelebrationOverlay(preset) {
            const siteLayer = document.getElementById('site-celebration-overlay');
            if (!siteLayer) return;
            siteLayer.innerHTML = '';
            const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (reduceMotion) return;
            const mix = getOccasionDecorationMix(preset);
            const mobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
            const count = mobile ? 10 : 24;
            for (let i = 0; i < count; i++) {
                const item = mix[i % mix.length];
                const el = document.createElement('span');
                el.className = 'celebration-float' + (item.className ? ' ' + item.className : '');
                el.style.setProperty('--delay', (i * 0.45) + 's');
                el.style.setProperty('--x', ((i * 5.7) % 100) + '%');
                el.style.top = ((i * 11) % 95) + '%';
                if (item.symbol) {
                    el.textContent = item.symbol;
                    el.setAttribute('aria-hidden', 'true');
                } else {
                    el.innerHTML = '<i class="' + escapeHtmlAttr(item.icon || 'fas fa-star') + '" aria-hidden="true"></i>';
                }
                siteLayer.appendChild(el);
            }
            siteLayer.setAttribute('aria-hidden', 'true');
        }

        function openDashboardNavSettings() {
            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            if (!currentAdmin) {
                openAdminPanel({ preventDefault: function() {} });
                return;
            }
            if (!isMainGovernanceAdmin(currentAdmin) && currentAdmin.role !== 'superadmin') {
                alert(ui.settingsSuperAdminOnly || 'إعدادات النظام الكاملة متاحة لـ Super Admin فقط.');
                return;
            }
            openSystemSettings();
        }

        function cssUrlValue(url) {
            const safe = sanitizeExternalUrl(url);
            if (!safe) return '';
            return 'url("' + safe.replace(/"/g, '') + '")';
        }

        /** مسارات الصور المحلية — لا تمر عبر sanitizeExternalUrl (كان يحوّلها لـ https://images/... فتختفي الخلفية) */
        function cssLocalImageValue(path) {
            const p = String(path || '').trim();
            if (!p) return '';
            if (/^https?:\/\//i.test(p)) return cssUrlValue(p);
            const rel = p.replace(/\\/g, '/').replace(/"/g, '');
            return 'url("' + rel + '")';
        }

        const HERO_BANNER_FALLBACKS = [
            'images/hero-nebras-banner.png',
            'images/background.png',
            'images/wpc-background.avif'
        ];

        function normalizeHeroBannerPath(path) {
            const p = String(path || '').trim();
            if (!p) return HERO_BANNER_FALLBACKS[0];
            if (/^https?:\/\//i.test(p)) return p;
            if (p.indexOf('images/') === 0 || p.indexOf('/') === 0) return p;
            return 'images/' + p;
        }

        function applyHeroBanner() {
            const root = document.documentElement;
            const body = document.body;
            const bannerPath = normalizeHeroBannerPath(systemSettings.heroBannerImageUrl);
            const bannerCss = cssLocalImageValue(bannerPath) || cssLocalImageValue(HERO_BANNER_FALLBACKS[0]);
            if (bannerCss) root.style.setProperty('--hero-banner-image', bannerCss);

            const occPath = String(systemSettings.occasionHeroImageUrl || '').trim();
            const occCss = occPath ? cssLocalImageValue(occPath) : '';
            if (occCss) {
                root.style.setProperty('--occasion-hero-image', occCss);
                body.classList.add('celebration-hero-custom');
            } else {
                root.style.removeProperty('--occasion-hero-image');
                body.classList.remove('celebration-hero-custom');
            }

            const layer = document.getElementById('hero-bg-layer');
            const isCelebration = getResolvedOccasionThemeId() !== 'default';
            if (layer) {
                if (isCelebration && occCss) {
                    layer.style.backgroundImage = occCss;
                } else {
                    layer.style.backgroundImage = bannerCss || cssLocalImageValue('images/background.png');
                }
            }

            const addrEl = document.getElementById('hero-address-text');
            if (addrEl) {
                const lang = currentLang || 'ar';
                if (lang === 'en') {
                    addrEl.textContent = systemSettings.companyAddressEn || systemSettings.companyAddressAr || '';
                } else if (lang === 'zh') {
                    addrEl.textContent = systemSettings.companyAddressEn || systemSettings.companyAddressAr || '';
                } else {
                    addrEl.textContent = systemSettings.companyAddressAr || systemSettings.companyAddressEn || '';
                }
            }
        }

        function applyHeroMarketingCopy(text) {
            if (!text) return;
            function setTxt(id, val) {
                const el = document.getElementById(id);
                if (el && val != null) el.textContent = val;
            }
            setTxt('header-campaign-headline', text.heroHeadline);
            setTxt('header-campaign-tagline', text.heroTaglineShort || text.heroText);
            setTxt('header-explore-btn', text.heroExploreBtn);
            setTxt('header-quote-btn', text.heroQuoteBtn);
            const statsEl = document.getElementById('header-campaign-stats');
            if (statsEl) {
                statsEl.innerHTML =
                    '<div class="header-stat"><strong>' + escapeHtmlAttr(text.heroStatWarrantyVal || '10') + '</strong><span>' + escapeHtmlAttr(text.heroStatWarranty || '') + '</span></div>' +
                    '<div class="header-stat"><strong>' + escapeHtmlAttr(text.heroStatInstallVal || '+1M') + '</strong><span>' + escapeHtmlAttr(text.heroStatInstall || '') + '</span></div>' +
                    '<div class="header-stat"><strong>' + escapeHtmlAttr(text.heroStatYearsVal || '5') + '</strong><span>' + escapeHtmlAttr(text.heroStatYears || '') + '</span></div>';
            }
            const heroSection = document.getElementById('site-hero');
            if (heroSection) heroSection.setAttribute('aria-label', text.heroHeadline || 'الترحيب');
        }

        function applyBrandIntroContent(text) {
            if (!text) return;
            const eyebrow = document.getElementById('intro-eyebrow');
            const titleEl = document.getElementById('intro-brand-title');
            const tagline = document.getElementById('intro-tagline');
            const skip = document.getElementById('intro-skip-btn');
            if (eyebrow) eyebrow.textContent = text.introEyebrow || '';
            if (tagline) tagline.textContent = text.introTagline || text.heroTaglineShort || '';
            if (skip) skip.textContent = text.introSkip || text.introEnter || 'Enter';
            if (titleEl) {
                const name = String(text.introBrandName || 'شركة مصنع نبراس للبلاستيك').replace(/<[^>]+>/g, '').trim();
                titleEl.textContent = name;
                titleEl.setAttribute('lang', text.lang || currentLang || 'ar');
            }
        }

        let storefrontRevealObserver = null;

        function initStorefrontScrollReveal() {
            const lanes = document.querySelectorAll('.visitor-lane:not(.reveal-visible)');
            if (!lanes.length) return;
            if (!('IntersectionObserver' in window)) {
                lanes.forEach(function(el) { el.classList.add('reveal-visible'); });
                return;
            }
            if (!storefrontRevealObserver) {
                storefrontRevealObserver = new IntersectionObserver(function(entries) {
                    entries.forEach(function(entry) {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('reveal-visible');
                            storefrontRevealObserver.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.1, rootMargin: '0px 0px -32px 0px' });
            }
            lanes.forEach(function(el) { storefrontRevealObserver.observe(el); });
        }

        function syncMobileCommerceBar() {
            const mobile = window.matchMedia('(max-width: 768px)').matches;
            const show = mobile && !nebrasWorkspaceState.active && !currentAdmin;
            document.body.classList.toggle('nebras-mobile-bar-active', show);
        }

        function applyStorefrontPremiumUi(text) {
            if (!text) return;
            function setTxt(id, val) {
                const el = document.getElementById(id);
                if (el && val != null) el.textContent = val;
            }
            setTxt('trust-item-1-title', text.trustItem1Title);
            setTxt('trust-item-1-sub', text.trustItem1Sub);
            setTxt('trust-item-2-title', text.trustItem2Title);
            setTxt('trust-item-2-sub', text.trustItem2Sub);
            setTxt('trust-item-3-title', text.trustItem3Title);
            setTxt('trust-item-3-sub', text.trustItem3Sub);
            setTxt('trust-item-4-title', text.trustItem4Title);
            setTxt('trust-item-4-sub', text.trustItem4Sub);
            const exploreBtn = document.getElementById('gateway-explore-store-btn');
            if (exploreBtn && text.gatewayExploreStore) {
                exploreBtn.innerHTML = '<i class="fas fa-store" aria-hidden="true"></i> ' + escapeHtmlAttr(text.gatewayExploreStore);
            }
            const designerBtn = document.getElementById('gateway-door-designer-btn');
            if (designerBtn && text.gatewayDoorDesigner) {
                designerBtn.innerHTML = '<i class="fas fa-pencil-ruler" aria-hidden="true"></i> ' + escapeHtmlAttr(text.gatewayDoorDesigner);
            }
            setTxt('mob-bar-store-label', text.mobBarStore);
            setTxt('mob-bar-cart-label', text.mobBarCart);
            setTxt('mob-bar-quote-label', text.mobBarQuote);
            const trustStrip = document.getElementById('nebras-trust-strip');
            if (trustStrip) trustStrip.setAttribute('aria-label', text.trustStripAria || 'مزايا مصنع نبراس');
        }

        function openDoorDesignerFromGateway() {
            openNebrasWorkspace({ pillar: 'showroom', view: 'door-designer' });
        }

        function initStorefrontExperience() {
            syncMobileCommerceBar();
            initStorefrontScrollReveal();
            if (!window._nebrasMobileBarResizeBound) {
                window._nebrasMobileBarResizeBound = true;
                window.addEventListener('resize', syncMobileCommerceBar, { passive: true });
                window.addEventListener('resize', syncQuoteA4MobilePreviewScale, { passive: true });
                window.addEventListener('orientationchange', function() {
                    setTimeout(syncQuoteA4MobilePreviewScale, 120);
                }, { passive: true });
            }
        }

        let nebrasLightboxState = { urls: [], index: 0 };

        const CLICKABLE_MEDIA_IMG_SELECTOR = [
            '.workspace-gallery img',
            '.icon-overlay-gallery img',
            '.icon-overlay-variants-grid img',
            '.icon-overlay-variant-card img',
            '.showroom-gallery-card-media img',
            '.nebras-partners-section .nebras-partner-logo img',
            '.icon-inner-detail-hero img',
            '.icon-inner-detail-thumbs img',
            '.workspace-about-gallery-list img',
            '.nebras-cert-card img',
            '.cart-line img',
            '.product-shop-modal .shop-hero',
            '.workspace-product-tile img',
            '.icon-inner-product-media img',
            '.icon-inner-products-grid img'
        ].join(',');

        function showNebrasLightboxMedia(url) {
            const box = document.getElementById('nebras-media-lightbox');
            const img = document.getElementById('nebras-lightbox-img');
            const pdfFrame = document.getElementById('nebras-lightbox-pdf');
            const resolved = mediaUrlForLightbox(url);
            if (!box || !resolved) return;
            if (isNebrasMediaPdf(resolved)) {
                if (img) {
                    img.hidden = true;
                    img.removeAttribute('src');
                }
                if (pdfFrame) {
                    pdfFrame.hidden = false;
                    pdfFrame.src = resolved;
                }
            } else {
                if (pdfFrame) {
                    pdfFrame.hidden = true;
                    pdfFrame.removeAttribute('src');
                }
                if (img) {
                    img.hidden = false;
                    img.decoding = 'sync';
                    img.loading = 'eager';
                    img.src = resolved;
                }
            }
        }

        function openNebrasMediaLightbox(urls, startIndex) {
            const list = (urls || []).map(function(u) { return mediaUrlForLightbox(u); }).filter(Boolean);
            if (!list.length) return;
            nebrasLightboxState.urls = list;
            nebrasLightboxState.index = Math.max(0, Math.min(startIndex || 0, list.length - 1));
            const box = document.getElementById('nebras-media-lightbox');
            if (!box) {
                window.open(list[nebrasLightboxState.index], '_blank', 'noopener,noreferrer');
                return;
            }
            showNebrasLightboxMedia(list[nebrasLightboxState.index]);
            box.hidden = false;
            box.setAttribute('aria-hidden', 'false');
            document.body.classList.add('nebras-lightbox-open');
            const prev = box.querySelector('.nebras-lightbox-prev');
            const next = box.querySelector('.nebras-lightbox-next');
            const multi = list.length > 1 && !isNebrasMediaPdf(list[0]);
            if (prev) prev.style.visibility = multi ? 'visible' : 'hidden';
            if (next) next.style.visibility = multi ? 'visible' : 'hidden';
        }

        function closeNebrasMediaLightbox() {
            const box = document.getElementById('nebras-media-lightbox');
            const img = document.getElementById('nebras-lightbox-img');
            const pdfFrame = document.getElementById('nebras-lightbox-pdf');
            if (img) {
                img.removeAttribute('src');
                img.hidden = true;
            }
            if (pdfFrame) {
                pdfFrame.removeAttribute('src');
                pdfFrame.hidden = true;
            }
            if (box) {
                box.hidden = true;
                box.setAttribute('aria-hidden', 'true');
            }
            document.body.classList.remove('nebras-lightbox-open');
        }

        function nebrasLightboxStep(delta) {
            const list = nebrasLightboxState.urls;
            if (!list.length) return;
            nebrasLightboxState.index = (nebrasLightboxState.index + delta + list.length) % list.length;
            showNebrasLightboxMedia(list[nebrasLightboxState.index]);
        }

        function getImgLightboxSrc(img) {
            if (!img) return '';
            return img.getAttribute('data-full-src') || img.getAttribute('data-src') || img.currentSrc || img.src || '';
        }

        function openNebrasMediaLightboxFromEl(el) {
            if (!el) return;
            const src = el.getAttribute && el.getAttribute('data-src')
                ? (el.getAttribute('data-full-src') || el.getAttribute('data-src'))
                : getImgLightboxSrc(el);
            if (!src) return;
            if (isNebrasMediaPdf(src)) {
                window.open(resolveDisplayMediaUrl(src), '_blank', 'noopener,noreferrer');
                return;
            }
            const gallery = el.closest(
                '.workspace-gallery, .icon-overlay-gallery, .nebras-cert-grid, .icon-inner-product-detail, ' +
                '.workspace-about-gallery-list, .icon-overlay-variants-grid, .showroom-gallery-grid, ' +
                '.nebras-partners-stage, .cart-drawer, .product-shop-modal, .icon-inner-products-grid'
            );
            let urls = [src];
            if (gallery && el.tagName === 'IMG') {
                urls = Array.from(gallery.querySelectorAll('img'))
                    .map(getImgLightboxSrc)
                    .filter(function(u) { return u && !isNebrasMediaPdf(u); });
            }
            const resolvedSrc = mediaUrlForLightbox(src);
            const idx = urls.findIndex(function(u) { return mediaUrlForLightbox(u) === resolvedSrc; });
            openNebrasMediaLightbox(urls, idx >= 0 ? idx : 0);
        }

        function refreshClickableMediaSite(root) {
            const scope = root && root.querySelectorAll ? root : document;
            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            const hint = ui.lightboxOpenHint || 'اضغط للتكبير';
            const alt = ui.lightboxImageAlt || 'صورة';
            scope.querySelectorAll(CLICKABLE_MEDIA_IMG_SELECTOR).forEach(function(img) {
                if (img.closest('.nav-bar, .menu-toggle, .lang-toggle, .card-icon, .visitor-lane-head i')) return;
                img.classList.add('nebras-clickable-media');
                img.setAttribute('role', 'button');
                if (!img.hasAttribute('tabindex')) img.tabIndex = 0;
                img.title = hint;
                if (!img.getAttribute('alt')) img.setAttribute('alt', alt);
            });
        }

        function initNebrasSiteMediaSystem() {
            if (document.body.dataset.nebrasMediaSysInit === '1') return;
            document.body.dataset.nebrasMediaSysInit = '1';
            document.body.addEventListener('click', function(e) {
                const img = e.target;
                if (!img || img.tagName !== 'IMG' || !img.classList.contains('nebras-clickable-media')) return;
                if (img.closest('button, .variant-add-btn')) return;
                e.preventDefault();
                e.stopPropagation();
                openNebrasMediaLightboxFromEl(img);
            }, true);
            document.body.addEventListener('keydown', function(e) {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                const img = e.target;
                if (!img || img.tagName !== 'IMG' || !img.classList.contains('nebras-clickable-media')) return;
                e.preventDefault();
                openNebrasMediaLightboxFromEl(img);
            });
        }

        function wireClickableMediaIn(root) {
            refreshClickableMediaSite(root);
        }

        function ensureDoorDesignerConfig() {
            if (!systemSettings.doorDesigner || typeof systemSettings.doorDesigner !== 'object') {
                systemSettings.doorDesigner = JSON.parse(JSON.stringify(DEFAULT_DOOR_DESIGNER));
            }
            if (systemSettings.doorDesigner.dataSeed !== DEFAULT_DOOR_DESIGNER.dataSeed) {
                systemSettings.doorDesigner = JSON.parse(JSON.stringify(DEFAULT_DOOR_DESIGNER));
            }
            const cfg = systemSettings.doorDesigner;
            ['mechanisms', 'leafCounts', 'surfaces', 'glassLayouts', 'presets', 'types', 'models', 'styles', 'outerShapes', 'frameStyles', 'decors', 'glassPatterns', 'openings', 'sizes', 'locks', 'hardware'].forEach(function(key) {
                if (!Array.isArray(cfg[key]) || !cfg[key].length) {
                    cfg[key] = JSON.parse(JSON.stringify(DEFAULT_DOOR_DESIGNER[key] || []));
                }
            });
            if (!cfg.heroImageUrl) cfg.heroImageUrl = cfg.sceneBackgroundUrl || DEFAULT_DOOR_DESIGNER.heroImageUrl;
            const catalog = getNebrasDoorCatalogColors();
            if (!Array.isArray(cfg.colors) || cfg.colors.length < 15 || !cfg.colors[0] || !String(cfg.colors[0].code || '').match(/N-\d/i)) {
                cfg.colors = catalog.map(function(c) { return Object.assign({}, c); });
            } else {
                cfg.colors.forEach(function(c, i) {
                    if (!c) return;
                    if (c.catalogIndex == null) c.catalogIndex = i;
                    if (c.isRoll !== false) {
                        const idx = c.catalogIndex != null ? c.catalogIndex : i;
                        const neb = c.nebCode != null ? c.nebCode : getNebrasRollCodeByIndex(idx);
                        c.textureUrl = getRollSwatchImageUrl(idx);
                        if (!String(c.code || '').match(/N-\d/i)) c.code = getRollCatalogCode(neb);
                    }
                });
            }
            if (cfg.usePhotorealPreview !== false && !cfg.doorBaseImageUrl) {
                cfg.doorBaseImageUrl = NEBRAS_DOOR_PHOTO_DEFAULT;
            }
            if (!cfg.sceneBackgroundUrl) {
                cfg.sceneBackgroundUrl = cfg.previewImageUrl || DEFAULT_DOOR_DESIGNER.sceneBackgroundUrl;
            }
            if (!cfg.previewImageUrl) {
                cfg.previewImageUrl = cfg.sceneBackgroundUrl || DEFAULT_DOOR_DESIGNER.previewImageUrl;
            }
            const knownTypeIds = ['edge-band', 'u-channel', 'sliding'];
            if (!cfg.types.some(function(t) { return t && knownTypeIds.indexOf(t.id) !== -1; })) {
                cfg.types = JSON.parse(JSON.stringify(DEFAULT_DOOR_DESIGNER.types));
            }
            if (!cfg.models || !cfg.models.some(function(m) { return m && m.typeId === 'edge-band'; })) {
                cfg.models = JSON.parse(JSON.stringify(DEFAULT_DOOR_DESIGNER.models));
            }
            if (!cfg.frameStyles || !cfg.frameStyles.length) {
                cfg.frameStyles = JSON.parse(JSON.stringify(DEFAULT_DOOR_DESIGNER.frameStyles));
            }
            if (!cfg.styles.some(function(s) { return s && (s.id === 'normal' || s.id === 'slats'); })) {
                cfg.styles = JSON.parse(JSON.stringify(DEFAULT_DOOR_DESIGNER.styles));
            }
            if (!cfg.hardware.some(function(h) { return h && String(h.id || '').indexOf('lever') !== -1; })) {
                cfg.hardware = JSON.parse(JSON.stringify(DEFAULT_DOOR_DESIGNER.hardware));
            }
            if (!cfg.surfaces.some(function(s) { return s && (s.id === 'flat' || s.id === 'u-plain'); })) {
                cfg.surfaces = JSON.parse(JSON.stringify(DEFAULT_DOOR_DESIGNER.surfaces));
            }
            if (!cfg.presets || !cfg.presets.length) {
                cfg.presets = JSON.parse(JSON.stringify(DEFAULT_DOOR_DESIGNER.presets));
            }
            if (!cfg.designCanvasMode) cfg.designCanvasMode = DEFAULT_DOOR_DESIGNER.designCanvasMode || 'photoreal';
            if (cfg.designCanvasMode === 'keybab') cfg.designCanvasMode = 'photoreal';
            if (!cfg.layerManifest || typeof cfg.layerManifest !== 'object') {
                cfg.layerManifest = JSON.parse(JSON.stringify(DEFAULT_DOOR_LAYER_MANIFEST));
            } else {
                cfg.layerManifest = getDoorDesignerLayerManifest(cfg);
            }
            if (DEFAULT_DOOR_DESIGNER.designCanvasMode === 'studio' || isDoorDesignerStudioLiveMode(DEFAULT_DOOR_DESIGNER)) {
                cfg.designCanvasMode = 'studio';
                cfg.useCompositorPreview = false;
                cfg.use3dPreview = false;
                cfg.usePhotorealPreview = false;
            } else if (DEFAULT_DOOR_DESIGNER.designCanvasMode === 'compositor' || DEFAULT_DOOR_DESIGNER.useCompositorPreview) {
                cfg.useCompositorPreview = true;
                cfg.designCanvasMode = 'compositor';
                cfg.use3dPreview = false;
                cfg.usePhotorealPreview = true;
            } else if (DEFAULT_DOOR_DESIGNER.use3dPreview && DEFAULT_DOOR_DESIGNER.designCanvasMode === '3d') {
                cfg.use3dPreview = true;
                cfg.designCanvasMode = '3d';
                cfg.usePhotorealPreview = false;
            } else if (cfg.designCanvasMode !== '3d' && cfg.use3dPreview !== true) {
                cfg.usePhotorealPreview = cfg.usePhotorealPreview !== false;
            }
            if (cfg.enabled !== false) {
                cfg.previewModelEnabled = true;
                cfg.designCanvasMode = 'studio';
                cfg.useCompositorPreview = false;
                cfg.use3dPreview = false;
                cfg.usePhotorealPreview = false;
            } else if (cfg.previewModelEnabled == null) {
                cfg.previewModelEnabled = DEFAULT_DOOR_DESIGNER.previewModelEnabled !== false;
            }
            return cfg;
        }

        function resolveDoorDesignerState(root) {
            function pick(group) { return getDoorDesignerPick(root, group); }
            const cfg = ensureDoorDesignerConfig();
            const typeId = pick('type') || 'edge-band';
            let modelId = pick('model');
            let model = modelId ? getDoorDesignerModelById(modelId) : null;
            if (!model || model.typeId !== typeId) {
                const models = getDoorDesignerModelsForType(typeId);
                model = models[0] || null;
                modelId = model ? model.id : '';
            }
            const modelCfg = (model && model.config) ? model.config : {};
            const mechanism = pick('mechanism') || modelCfg.mechanism || (typeId === 'sliding' ? 'sliding' : 'hinged');
            const leafCount = pick('leafCount') || modelCfg.leafCount || '1';
            let surface = pick('surface') || modelCfg.surface || 'flat';
            const glassLayout = pick('glassLayout') || modelCfg.glassLayout || 'strip-tall';
            const legacyType = pick('type');
            const legacyStyle = pick('style');
            const legacyModel = pick('model');
            if (!pick('surface') && legacyType && !modelCfg.surface) {
                if (legacyType === 'glass') surface = 'full-glass';
                else if (legacyType === 'classic') surface = 'u-classic';
                else if (legacyType === 'modern') surface = 'flat';
                else if (legacyStyle === 'slats') surface = 'u-slats';
                else if (legacyModel === 'plain') surface = 'flat';
                else if (legacyModel === 'frame') surface = 'u-classic';
            }
            const isSliding = mechanism === 'sliding' || typeId === 'sliding';
            const isDouble = leafCount === '2' || modelId === 'edge-2' || modelId === 'slide-2';
            return {
                type: typeId,
                model: modelId,
                mechanism: mechanism,
                leafCount: leafCount,
                surface: surface,
                glassLayout: glassLayout,
                outerShape: pick('outerShape') || 'outer-flat',
                frame: pick('frame') || 'flat',
                decor: pick('decor') || 'plain',
                glassPattern: pick('glassPattern') || 'clear',
                opening: pick('opening') || 'right',
                size: pick('size') || '',
                lock: pick('lock') || 'cylinder',
                hardware: pick('hardware') || 'lever-black',
                isSliding: isSliding,
                isDouble: isDouble,
                legacyType: legacyType || (isSliding ? 'sliding' : (isDouble ? 'double' : 'single'))
            };
        }

        function applyDoorDesignerPreset(root, presetId) {
            if (!root) return;
            const cfg = ensureDoorDesignerConfig();
            const preset = (cfg.presets || []).find(function(p) { return p && p.id === presetId; });
            if (!preset || !preset.config) return;
            const c = preset.config;
            Object.keys(c).forEach(function(group) {
                const val = c[group];
                const btn = root.querySelector('[data-door-group="' + group + '"][data-door-value="' + val + '"]');
                if (!btn) return;
                root.querySelectorAll('[data-door-group="' + group + '"]').forEach(function(b) {
                    b.classList.toggle('is-active', b === btn);
                });
            });
            root.querySelectorAll('.door-preset-btn').forEach(function(b) {
                b.classList.toggle('is-active', b.getAttribute('data-door-preset') === presetId);
            });
            updateDoorPresetReferencePreview(root, preset);
            normalizeDoorDesignerConflicts(root, 'preset');
            syncDoorDesignerOptionStates(root);
            updateDoorDesignerPreview(root);
        }

        function updateDoorPresetReferencePreview(root, preset) {
            if (!root) return;
            const wrap = root.querySelector('#door-preset-reference');
            const img = root.querySelector('#door-preset-reference-img');
            if (!wrap || !img) return;
            const url = preset && preset.modelImageUrl ? resolveDoorRollTextureUrl(preset.modelImageUrl) : '';
            if (!url) {
                wrap.classList.add('is-hidden');
                img.removeAttribute('src');
                return;
            }
            wrap.classList.remove('is-hidden');
            img.src = url;
            img.alt = getDoorDesignerLocalized(preset, 'label', currentLang || 'ar');
        }

        function buildDoorDesignerPresetGrid(presets, lang) {
            return '<div class="door-designer-presets" role="list">' + (presets || []).map(function(p) {
                const label = getDoorDesignerLocalized(p, 'label', lang);
                return '<button type="button" class="door-preset-btn" data-door-preset="' + escapeHtmlAttr(p.id) + '" title="' + escapeHtmlAttr(label) + '">' +
                    escapeHtmlAttr(label) + '</button>';
            }).join('') + '</div>';
        }

        function getDoorDesignerLocalized(item, field, lang) {
            if (!item) return '';
            const suffix = lang === 'en' ? 'En' : lang === 'zh' ? 'Zh' : 'Ar';
            return String(item[field + suffix] || item[field + 'Ar'] || item.id || '').trim();
        }

        function shadeDoorHex(hex, percent) {
            const h = String(hex || '#b8bcc4').replace('#', '');
            if (h.length !== 6) return hex || '#b8bcc4';
            const num = parseInt(h, 16);
            let r = (num >> 16) & 255;
            let g = (num >> 8) & 255;
            let b = num & 255;
            const amt = Math.round(2.55 * percent);
            r = Math.min(255, Math.max(0, r + amt));
            g = Math.min(255, Math.max(0, g + amt));
            b = Math.min(255, Math.max(0, b + amt));
            return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        }

        function getDoorDesignerTypeIconSvg(iconId) {
            const id = iconId || 'single';
            const icons = {
                single: '<svg viewBox="0 0 48 64" aria-hidden="true"><rect x="10" y="6" width="28" height="52" rx="2" fill="currentColor" opacity="0.9"/></svg>',
                double: '<svg viewBox="0 0 48 64" aria-hidden="true"><rect x="6" y="6" width="16" height="52" rx="2" fill="currentColor"/><rect x="26" y="6" width="16" height="52" rx="2" fill="currentColor" opacity="0.75"/></svg>',
                sliding: '<svg viewBox="0 0 48 64" aria-hidden="true"><rect x="8" y="8" width="32" height="48" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><rect x="14" y="12" width="20" height="44" rx="1" fill="currentColor"/></svg>',
                glass: '<svg viewBox="0 0 48 64" aria-hidden="true"><rect x="10" y="6" width="28" height="52" rx="2" fill="currentColor" opacity="0.35"/><rect x="16" y="14" width="16" height="22" rx="1" fill="currentColor"/></svg>',
                classic: '<svg viewBox="0 0 48 64" aria-hidden="true"><rect x="10" y="6" width="28" height="52" rx="2" fill="currentColor"/><path d="M14 18h8v12h-8zm12 0h8v12h-8zm-12 16h8v12h-8zm12 0h8v12h-8z" fill="#fff" opacity="0.5"/></svg>',
                modern: '<svg viewBox="0 0 48 64" aria-hidden="true"><rect x="10" y="6" width="28" height="52" rx="2" fill="currentColor"/><line x1="14" y1="28" x2="34" y2="28" stroke="#fff" stroke-width="2" opacity="0.6"/></svg>'
            };
            return icons[id] || icons.single;
        }

        function buildWpcDoorRealisticSvgHtml() {
            return '<div class="wpc-door-studio-floor" aria-hidden="true"></div>' +
                '<div class="wpc-door-svg-host" id="wpc-door-svg-host" aria-label="معاينة باب WPC واقعية">' +
                '<svg xmlns="http://www.w3.org/2000/svg" id="wpc-door-svg-root" viewBox="0 0 440 920" class="wpc-door-svg" preserveAspectRatio="xMidYMid meet">' +
                '<defs><linearGradient id="wpcFrameGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="var(--door-frame-light,#8a929a)"/><stop offset="40%" stop-color="var(--door-frame-face,#5a6269)"/><stop offset="100%" stop-color="var(--door-frame-dark,#353b42)"/></linearGradient>' +
                '<linearGradient id="wpcLeafGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="var(--door-light,#e8ecf0)"/><stop offset="38%" stop-color="var(--door-face,#b8bcc4)"/><stop offset="100%" stop-color="var(--door-dark,#6a727a)"/></linearGradient>' +
                '<linearGradient id="wpcGlassGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="rgba(220,235,248,0.92)"/><stop offset="45%" stop-color="rgba(150,185,210,0.5)"/><stop offset="100%" stop-color="rgba(235,245,252,0.8)"/></linearGradient>' +
                '<linearGradient id="wpcGlassFrost" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="rgba(245,248,250,0.95)"/><stop offset="100%" stop-color="rgba(210,218,225,0.75)"/></linearGradient>' +
                '<linearGradient id="wpcThresholdGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="var(--door-threshold-light,#5a6066)"/><stop offset="100%" stop-color="var(--door-threshold-dark,#1a1e22)"/></linearGradient>' +
                '<filter id="wpcDoorShadow" x="-20%" y="-10%" width="140%" height="120%"><feDropShadow dx="12" dy="20" stdDeviation="18" flood-color="#000" flood-opacity="0.45"/></filter>' +
                '<filter id="wpcDoorSpecular"><feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="b"/><feOffset dx="-2" dy="-3" result="o"/><feComponentTransfer in="o"><feFuncA type="linear" slope="0.25"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
                '<pattern id="wpcDoorTexture" patternUnits="objectBoundingBox" width="1" height="1"><image id="wpcDoorTextureImg" href="" width="1" height="1" preserveAspectRatio="xMidYMid slice"/></pattern></defs>' +
                '<g id="wpcSvgDoorUnit" filter="url(#wpcDoorShadow)"><rect id="wpcSvgOuterFrame" x="18" y="8" width="404" height="892" rx="4" fill="url(#wpcFrameGrad)" stroke="#2e3338" stroke-width="2"/>' +
                '<rect id="wpcSvgFrameLiner" x="38" y="38" width="364" height="832" fill="var(--door-frame-liner,#3a4046)"/><rect id="wpcSvgFrameBevel" x="50" y="50" width="340" height="808" fill="none" stroke="var(--door-frame-bevel,rgba(255,255,255,0.22))" stroke-width="2"/><rect x="18" y="878" width="404" height="22" rx="2" fill="url(#wpcThresholdGrad)"/>' +
                '<g id="wpcSvgTransom" opacity="0"><rect x="96" y="48" width="248" height="72" rx="3" fill="url(#wpcLeafGrad)" stroke="rgba(0,0,0,0.12)"/><rect x="108" y="58" width="224" height="52" rx="2" fill="url(#wpcGlassGrad)" opacity="0.85"/></g>' +
                '<g id="wpcSvgSidelite" opacity="0"><rect x="318" y="48" width="72" height="780" fill="url(#wpcFrameGrad)" stroke="#2e3338"/><rect x="328" y="58" width="52" height="760" fill="url(#wpcGlassGrad)" stroke="rgba(255,255,255,0.35)" stroke-width="2"/></g>' +
                '<g id="wpcSvgLeafA"><rect id="wpcSvgFaceA" x="96" y="48" width="248" height="772" rx="3" fill="url(#wpcLeafGrad)" stroke="rgba(0,0,0,0.15)"/>' +
                '<g class="wpc-svg-detail wpc-svg-shaker" opacity="0"><rect x="112" y="68" width="102" height="360" fill="rgba(0,0,0,0.05)" stroke="rgba(255,255,255,0.22)" stroke-width="2" rx="2"/><rect x="226" y="68" width="102" height="360" fill="rgba(0,0,0,0.05)" stroke="rgba(255,255,255,0.22)" stroke-width="2" rx="2"/><rect x="112" y="448" width="102" height="352" fill="rgba(0,0,0,0.05)" stroke="rgba(255,255,255,0.22)" stroke-width="2" rx="2"/><rect x="226" y="448" width="102" height="352" fill="rgba(0,0,0,0.05)" stroke="rgba(255,255,255,0.22)" stroke-width="2" rx="2"/></g>' +
                '<g class="wpc-svg-detail wpc-svg-grooves" opacity="0"><rect x="102" y="268" width="236" height="7" rx="2" fill="rgba(0,0,0,0.2)"/><rect x="102" y="418" width="236" height="7" rx="2" fill="rgba(0,0,0,0.18)"/><rect x="102" y="568" width="236" height="7" rx="2" fill="rgba(0,0,0,0.16)"/></g>' +
                '<g class="wpc-svg-detail wpc-svg-uchannel-v" opacity="0"><rect x="138" y="72" width="5" height="728" rx="1" fill="rgba(0,0,0,0.14)"/><rect x="297" y="72" width="5" height="728" rx="1" fill="rgba(0,0,0,0.14)"/></g>' +
                '<g class="wpc-svg-detail wpc-svg-glass-strips" opacity="0"><rect x="108" y="118" width="224" height="44" rx="3" fill="url(#wpcGlassGrad)" stroke="#6a727a" stroke-width="2"/><rect x="108" y="198" width="224" height="44" rx="3" fill="url(#wpcGlassGrad)" stroke="#6a727a" stroke-width="2"/><rect x="108" y="278" width="224" height="44" rx="3" fill="url(#wpcGlassGrad)" stroke="#6a727a" stroke-width="2"/><rect x="108" y="358" width="224" height="44" rx="3" fill="url(#wpcGlassGrad)" stroke="#6a727a" stroke-width="2"/><rect x="108" y="438" width="224" height="44" rx="3" fill="url(#wpcGlassGrad)" stroke="#6a727a" stroke-width="2"/></g>' +
                '<g class="wpc-svg-detail wpc-svg-glass-grid" opacity="0"><rect x="118" y="128" width="88" height="118" rx="4" fill="url(#wpcGlassGrad)" stroke="#5a6269" stroke-width="2.5"/><rect x="218" y="128" width="88" height="118" rx="4" fill="url(#wpcGlassGrad)" stroke="#5a6269" stroke-width="2.5"/><rect x="118" y="268" width="88" height="118" rx="4" fill="url(#wpcGlassGrad)" stroke="#5a6269" stroke-width="2.5"/><rect x="218" y="268" width="88" height="118" rx="4" fill="url(#wpcGlassGrad)" stroke="#5a6269" stroke-width="2.5"/></g>' +
                '<g class="wpc-svg-detail wpc-svg-glass-tall" opacity="0"><rect x="128" y="100" width="184" height="520" rx="5" fill="url(#wpcGlassGrad)" stroke="#5a6269" stroke-width="3"/></g>' +
                '<g class="wpc-svg-detail wpc-svg-vision" opacity="0"><rect x="132" y="110" width="176" height="210" rx="6" fill="url(#wpcGlassGrad)" stroke="#5a6269" stroke-width="3"/></g>' +
                '<g id="wpcSvgSlidingLeafB" opacity="0"><rect x="228" y="48" width="116" height="772" rx="3" fill="url(#wpcLeafGrad)" stroke="rgba(0,0,0,0.12)"/><g class="wpc-hw-pull-inox" transform="translate(308,408)"><rect x="20" y="0" width="8" height="58" rx="4" fill="#b8c0c8"/></g></g>' +
                '<g class="wpc-svg-detail wpc-svg-louver" opacity="0"><rect x="106" y="100" width="228" height="660" fill="rgba(0,0,0,0.08)"/><path d="M106 130h228M106 170h228M106 210h228M106 250h228M106 290h228M106 330h228M106 370h228M106 410h228M106 450h228M106 490h228M106 530h228M106 570h228M106 610h228M106 650h228M106 690h228M106 730h228" stroke="rgba(0,0,0,0.22)" stroke-width="3"/></g>' +
                '<rect x="312" y="398" width="20" height="76" rx="3" fill="#3d4349"/><circle cx="322" cy="436" r="7" fill="#111" stroke="#999" stroke-width="1.5"/>' +
                '<g id="wpcSvgHandleA" transform="translate(292,408)"><g class="wpc-hw-lever-black"><rect x="18" y="0" width="12" height="52" rx="3" fill="#2a2a2a"/><rect x="0" y="22" width="36" height="9" rx="3" fill="#333"/></g><g class="wpc-hw-lever-chrome" opacity="0"><rect x="18" y="0" width="12" height="52" rx="3" fill="#c0c8d0"/><rect x="0" y="22" width="36" height="9" rx="3" fill="#eef2f6"/></g><g class="wpc-hw-pull-inox" opacity="0"><rect x="20" y="0" width="8" height="58" rx="4" fill="#b8c0c8"/></g><g class="wpc-hw-knob-gold" opacity="0"><circle cx="24" cy="28" r="14" fill="#d4af37" stroke="#8b6914" stroke-width="2"/></g></g>' +
                '<g id="wpcSvgHingesA"><rect x="88" y="120" width="10" height="36" rx="2" fill="#8a929a"/><rect x="88" y="400" width="10" height="36" rx="2" fill="#8a929a"/><rect x="88" y="680" width="10" height="36" rx="2" fill="#8a929a"/></g></g>' +
                '<g id="wpcSvgLeafB" opacity="0"><rect id="wpcSvgFaceB" x="52" y="48" width="168" height="772" rx="3" fill="url(#wpcLeafGrad)"/>' +
                '<g class="wpc-svg-detail wpc-svg-shaker" opacity="0"><rect x="62" y="68" width="68" height="360" fill="rgba(0,0,0,0.05)" stroke="rgba(255,255,255,0.2)" stroke-width="2" rx="2"/><rect x="142" y="68" width="68" height="360" fill="rgba(0,0,0,0.05)" stroke="rgba(255,255,255,0.2)" stroke-width="2" rx="2"/></g>' +
                '<rect x="188" y="398" width="18" height="76" rx="3" fill="#3d4349"/><g id="wpcSvgHandleB" transform="translate(168,408)"><g class="wpc-hw-lever-black"><rect x="18" y="0" width="12" height="52" rx="3" fill="#2a2a2a"/><rect x="0" y="22" width="36" height="9" rx="3" fill="#333"/></g></g></g>' +
                '<g id="wpcSvgLeafB2" opacity="0"><rect id="wpcSvgFaceB2" x="228" y="48" width="168" height="772" rx="3" fill="url(#wpcLeafGrad)"/>' +
                '<rect x="364" y="398" width="18" height="76" rx="3" fill="#3d4349"/><g id="wpcSvgHandleB2" transform="translate(344,408)"><g class="wpc-hw-lever-black"><rect x="18" y="0" width="12" height="52" rx="3" fill="#2a2a2a"/><rect x="0" y="22" width="36" height="9" rx="3" fill="#333"/></g></g></g>' +
                '</g></svg></div>';
        }

        function buildDoorColorCatalogHtml(colors, lang) {
            return (colors || []).map(function(item, idx) {
                const code = String(item.code || getRollCatalogCode(item.nebCode || getNebrasRollCodeByIndex(idx))).trim();
                const displayCode = 'WPC-' + code.replace('N-', 'N');
                const rollName = getDoorDesignerLocalized(item, 'label', lang);
                const hex = String(item.hex || '#cccccc').trim();
                const catIdx = item.catalogIndex != null ? item.catalogIndex : idx;
                const tex = resolveDoorRollTextureUrl(item.textureUrl || getRollSwatchImageUrl(catIdx));
                const chipInner = tex
                    ? ('<img class="door-color-swatch-img" src="' + escapeHtmlAttr(tex) + '" alt="" loading="lazy" decoding="async">')
                    : ('<span class="door-color-swatch-fallback" style="background-color:' + escapeHtmlAttr(hex) + '"></span>');
                return '<button type="button" class="door-color-swatch door-color-swatch--roll door-color-swatch--catalog door-color-swatch--nebras-roll' + (idx === 0 ? ' is-active' : '') + '" data-door-group="color" data-door-value="' + escapeHtmlAttr(item.id) + '"' +
                    ' data-door-code="' + escapeHtmlAttr(code) + '" data-door-hex="' + escapeHtmlAttr(hex) + '"' +
                    ' data-door-is-roll="1" data-door-catalog-index="' + catIdx + '"' +
                    ' data-door-texture="' + escapeHtmlAttr(tex) + '"' +
                    ' title="' + escapeHtmlAttr(displayCode + ' — ' + rollName) + '" aria-label="' + escapeHtmlAttr(displayCode + ' ' + rollName) + '">' +
                    '<span class="door-color-swatch-chip door-color-roll-tile" role="img" aria-hidden="true">' + chipInner + '</span>' +
                    '<span class="door-color-swatch-meta">' +
                    '<span class="door-color-swatch-code">' + escapeHtmlAttr(displayCode) + '</span>' +
                    '<span class="door-color-swatch-name">' + escapeHtmlAttr(rollName) + '</span></span></button>';
            }).join('');
        }

        function getPublicColorDisplayCode(code) {
            const c = String(code || '').trim();
            return 'WPC-' + c.replace(/^N-/i, 'N');
        }

        function getNebrasColorOverlayDescription(item, index) {
            const idx = Number(index) || 0;
            const code = String((item && item.code) || getRollCatalogCode((item && item.nebCode) || getNebrasRollCodeByIndex(idx))).trim();
            const display = code.replace(/^N-/i, 'N-');
            return 'عينة من تشكيلة ألوان نبراس 2026 — ' + display + ' · جودة WPC عالية المتانة والجمال، مثالية للأبواب والتشطيبات الداخلية.';
        }

        function renderPublicColorCollection(lang) {
            const body = document.getElementById('color-catalog-body');
            if (!body) return;
            const colors = getNebrasDoorCatalogColors();
            const tiles = colors.map(function(item, idx) {
                const code = String(item.code || getRollCatalogCode(item.nebCode || getNebrasRollCodeByIndex(idx))).trim();
                const tex = resolveDoorRollTextureUrl(item.textureUrl || getRollSwatchImageUrl(idx));
                return '' +
                    '<button type="button" class="nebras-color-tile" onclick="openNebrasColorCollection(' + idx + ')" aria-label="' + escapeHtmlAttr(getPublicColorDisplayCode(code) + ' ' + item.labelEn) + '">' +
                    '<span class="nebras-color-tile-swatch"><img src="' + escapeHtmlAttr(tex) + '" alt="" loading="lazy" decoding="async"></span>' +
                    '<span class="nebras-color-tile-code">' + escapeHtmlAttr(getPublicColorDisplayCode(code)) + '</span>' +
                    '<span class="nebras-color-tile-name-ar">' + escapeHtmlAttr(item.labelAr || '') + '</span>' +
                    '<span class="nebras-color-tile-name-en">' + escapeHtmlAttr(item.labelEn || '') + '</span>' +
                    '</button>';
            }).join('');

            body.innerHTML = '' +
                '<div class="nebras-color-collection-head">' +
                '<span class="nebras-color-collection-pill">COLORS 20</span>' +
                '<span class="nebras-color-collection-pill">MATERIAL WPC</span>' +
                '<span class="nebras-color-collection-pill">ORIGIN KSA</span>' +
                '</div>' +
                '<div class="nebras-color-collection-grid">' + tiles + '</div>';
            ensureNebrasColorCollectionOverlay();
        }

        function buildNebrasBankAccountsWorkspaceHtml() {
            ensureDefaultBankAccounts();
            const lang = currentLang || 'ar';
            const accounts = (systemSettings.bankAccounts || []).filter(function(b) { return b && b.visible !== false; });
            const wallCandidates = bankAccountImageCandidates(NEBRAS_BANK_MEDIA.wall).map(withBankMediaVersion);
            const wallUrl = withBankMediaVersion(wallCandidates.length ? wallCandidates[0] : NEBRAS_BANK_MEDIA.wall);
            const cards = accounts.map(function(b, idx) {
                return renderBankAccountCardMarkup(b, idx, lang);
            }).join('');
            const factoryLabel = lang === 'en'
                ? 'Nebras Plastic Factory Company — bank accounts'
                : lang === 'zh'
                    ? 'Nebras 塑料工厂公司银行账户'
                    : 'حسابات مصنع نبراس للبلاستيك';
            const taxLine = systemSettings.taxNumber
                ? '<p class="nebras-bank-workspace-meta">' + escapeHtmlAttr(lang === 'en' ? 'Tax ID' : 'الرقم الضريبي') + ': <span dir="ltr">' + escapeHtmlAttr(systemSettings.taxNumber) + '</span></p>'
                : '';
            const crLine = systemSettings.commercialRegister
                ? '<p class="nebras-bank-workspace-meta">' + escapeHtmlAttr(lang === 'en' ? 'CR' : 'سجل تجاري') + ': <span dir="ltr">' + escapeHtmlAttr(systemSettings.commercialRegister) + '</span></p>'
                : '';
            return '' +
                '<div class="nebras-bank-workspace" id="nebras-bank-workspace">' +
                '<div class="nebras-bank-workspace-hero" data-bank-media="1" data-bank-candidates="' + escapeHtmlAttr(wallCandidates.join('|')) + '">' +
                '<img class="nebras-bank-workspace-hero-img" src="' + escapeHtmlAttr(wallUrl) + '" alt="" loading="lazy" decoding="async">' +
                '</div>' +
                '<div class="nebras-bank-workspace-head">' +
                '<h3 class="nebras-bank-workspace-title">' + escapeHtmlAttr(factoryLabel) + '</h3>' +
                taxLine + crLine +
                '</div>' +
                '<div class="nebras-bank-workspace-plaques">' + cards + '</div>' +
                '</div>';
        }

        function buildNebrasColorCollectionWorkspaceHtml() {
            const colors = getNebrasDoorCatalogColors();
            const tiles = colors.map(function(item, idx) {
                const code = String(item.code || getRollCatalogCode(item.nebCode || getNebrasRollCodeByIndex(idx))).trim();
                const tex = resolveDoorRollTextureUrl(item.textureUrl || getRollSwatchImageUrl(idx));
                return '' +
                    '<button type="button" class="nebras-color-tile" onclick="openNebrasColorCollection(' + idx + ')" aria-label="' + escapeHtmlAttr(getPublicColorDisplayCode(code) + ' ' + item.labelEn) + '">' +
                    '<span class="nebras-color-tile-swatch"><img src="' + escapeHtmlAttr(tex) + '" alt="" loading="lazy" decoding="async"></span>' +
                    '<span class="nebras-color-tile-code">' + escapeHtmlAttr(getPublicColorDisplayCode(code)) + '</span>' +
                    '<span class="nebras-color-tile-name-ar">' + escapeHtmlAttr(item.labelAr || '') + '</span>' +
                    '<span class="nebras-color-tile-name-en">' + escapeHtmlAttr(item.labelEn || '') + '</span>' +
                    '</button>';
            }).join('');
            ensureNebrasColorCollectionOverlay();
            return '' +
                '<div class="nebras-color-workspace" id="nebras-color-workspace">' +
                '<section class="nebras-color-cover" id="nebras-color-cover">' +
                '<div class="nebras-color-cover-logo"><i class="fas fa-palette"></i></div>' +
                '<p class="nebras-color-cover-brand">NIBRAS PLASTIC FACTORY COMPANY</p>' +
                '<h3 class="nebras-color-cover-title"><em>Collection</em> Color</h3>' +
                '<p class="nebras-color-cover-sub">WPC Doors & Panels · 2026</p>' +
                '<div class="nebras-color-collection-head">' +
                '<span class="nebras-color-collection-pill">COLORS 20</span>' +
                '<span class="nebras-color-collection-pill">MATERIAL WPC</span>' +
                '<span class="nebras-color-collection-pill">ORIGIN KSA</span>' +
                '</div>' +
                '<p class="nebras-color-cover-sales">ادارة مبيعات مصنع نبراس 0555092383</p>' +
                '<button type="button" class="nebras-color-open-btn" onclick="openNebrasColorCollectionDeck()">فتح كتالوج الألوان</button>' +
                '</section>' +
                '<section class="nebras-color-deck is-hidden" id="nebras-color-deck">' +
                '<div class="nebras-color-deck-head">' +
                '<button type="button" class="nebras-color-back-btn" onclick="closeNebrasColorCollectionDeck()">رجوع</button>' +
                '<div class="nebras-color-deck-count">20 COLOR ROLLS</div>' +
                '</div>' +
                '<div class="nebras-color-collection-grid">' + tiles + '</div>' +
                '<p class="nebras-color-deck-foot">Crafting Beauty From Within — Unmatched WPC Quality</p>' +
                '</section>' +
                '</div>';
        }

        function ensureNebrasColorCollectionOverlay() {
            if (document.getElementById('nebras-color-collection-overlay')) return;
            const wrap = document.createElement('div');
            wrap.id = 'nebras-color-collection-overlay';
            wrap.className = 'nebras-color-overlay is-hidden';
            wrap.innerHTML = '' +
                '<div class="nebras-color-overlay-backdrop" onclick="closeNebrasColorCollection()"></div>' +
                '<div class="nebras-color-overlay-dialog" role="dialog" aria-modal="true" aria-label="Nebras Color Collection">' +
                '<button type="button" class="nebras-color-overlay-close" onclick="closeNebrasColorCollection()" aria-label="Close">×</button>' +
                '<div class="nebras-color-overlay-swatch"><img id="nebras-color-overlay-img" alt="" loading="eager"></div>' +
                '<div class="nebras-color-overlay-code" id="nebras-color-overlay-code"></div>' +
                '<div class="nebras-color-overlay-name-ar" id="nebras-color-overlay-name-ar"></div>' +
                '<div class="nebras-color-overlay-name-en" id="nebras-color-overlay-name-en"></div>' +
                '<p class="nebras-color-overlay-desc" id="nebras-color-overlay-desc"></p>' +
                '<div class="nebras-color-overlay-footer">' +
                '<button type="button" class="nebras-color-nav-btn" onclick="shiftNebrasColorCollection(-1)">← السابق</button>' +
                '<span class="nebras-color-overlay-count" id="nebras-color-overlay-count">1 / 20</span>' +
                '<button type="button" class="nebras-color-nav-btn" onclick="shiftNebrasColorCollection(1)">التالي →</button>' +
                '</div><div class="nebras-color-overlay-share-wrap"><button type="button" class="nebras-color-nav-btn" onclick="shareCurrentNebrasColor()">شارك اللون</button></div>' +
                '</div>';
            document.body.appendChild(wrap);
            if (!window.__nebrasColorOverlayKeysBound) {
                document.addEventListener('keydown', function(ev) {
                    const overlay = document.getElementById('nebras-color-collection-overlay');
                    if (!overlay || overlay.classList.contains('is-hidden')) return;
                    if (ev.key === 'Escape') {
                        ev.preventDefault();
                        closeNebrasColorCollection();
                    } else if (ev.key === 'ArrowLeft') {
                        ev.preventDefault();
                        shiftNebrasColorCollection(-1);
                    } else if (ev.key === 'ArrowRight') {
                        ev.preventDefault();
                        shiftNebrasColorCollection(1);
                    }
                });
                window.__nebrasColorOverlayKeysBound = true;
            }
        }

        function renderNebrasColorOverlayAt(index) {
            const colors = getNebrasDoorCatalogColors();
            if (!colors.length) return;
            const max = colors.length - 1;
            const idx = Math.max(0, Math.min(Number(index) || 0, max));
            window.__nebrasColorOverlayIndex = idx;
            const item = colors[idx];
            const code = String(item.code || getRollCatalogCode(item.nebCode || getNebrasRollCodeByIndex(idx))).trim();
            const tex = resolveDoorRollTextureUrl(item.textureUrl || getRollSwatchImageUrl(idx));
            const img = document.getElementById('nebras-color-overlay-img');
            const codeEl = document.getElementById('nebras-color-overlay-code');
            const arEl = document.getElementById('nebras-color-overlay-name-ar');
            const enEl = document.getElementById('nebras-color-overlay-name-en');
            const descEl = document.getElementById('nebras-color-overlay-desc');
            const countEl = document.getElementById('nebras-color-overlay-count');
            if (img) img.src = tex;
            if (codeEl) codeEl.textContent = getPublicColorDisplayCode(code);
            if (arEl) arEl.textContent = item.labelAr || '';
            if (enEl) enEl.textContent = item.labelEn || '';
            if (descEl) descEl.textContent = getNebrasColorOverlayDescription(item, idx);
            if (countEl) countEl.textContent = (idx + 1) + ' / ' + colors.length;
        }

        window.openNebrasColorCollection = function(index) {
            ensureNebrasColorCollectionOverlay();
            const overlay = document.getElementById('nebras-color-collection-overlay');
            if (!overlay) return;
            overlay.classList.remove('is-hidden');
            document.body.classList.add('modal-open');
            renderNebrasColorOverlayAt(index);
        };

        window.closeNebrasColorCollection = function() {
            const overlay = document.getElementById('nebras-color-collection-overlay');
            if (!overlay) return;
            overlay.classList.add('is-hidden');
            document.body.classList.remove('modal-open');
        };

        window.shiftNebrasColorCollection = function(delta) {
            const colors = getNebrasDoorCatalogColors();
            if (!colors.length) return;
            const cur = Number(window.__nebrasColorOverlayIndex) || 0;
            let next = cur + (Number(delta) || 0);
            if (next < 0) next = colors.length - 1;
            if (next >= colors.length) next = 0;
            renderNebrasColorOverlayAt(next);
        };

        window.shareCurrentNebrasColor = async function() {
            const colors = getNebrasDoorCatalogColors();
            if (!colors.length) return;
            const idx = Math.max(0, Math.min(Number(window.__nebrasColorOverlayIndex) || 0, colors.length - 1));
            const item = colors[idx];
            const code = String(item.code || getRollCatalogCode(item.nebCode || getNebrasRollCodeByIndex(idx))).trim();
            const title = getPublicColorDisplayCode(code) + ' — ' + (item.labelAr || '');
            const text = title + '\n' + (item.labelEn || '') + '\n' + getNebrasColorOverlayDescription(item, idx);
            try {
                if (navigator.share) {
                    await navigator.share({ title: title, text: text });
                    return;
                }
            } catch (e) {}
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(text);
                    alert('تم نسخ بيانات اللون للمشاركة.');
                    return;
                }
            } catch (e) {}
            alert(text);
        };

        window.openNebrasColorCollectionDeck = function() {
            const cover = document.getElementById('nebras-color-cover');
            const deck = document.getElementById('nebras-color-deck');
            if (cover) cover.classList.add('is-exit');
            setTimeout(function() {
                if (cover) cover.classList.add('is-hidden');
                if (deck) {
                    deck.classList.remove('is-hidden');
                    deck.classList.add('is-enter');
                    setTimeout(function() { deck.classList.remove('is-enter'); }, 260);
                }
            }, 160);
        };

        window.closeNebrasColorCollectionDeck = function() {
            const cover = document.getElementById('nebras-color-cover');
            const deck = document.getElementById('nebras-color-deck');
            if (deck) deck.classList.add('is-exit');
            setTimeout(function() {
                if (deck) {
                    deck.classList.add('is-hidden');
                    deck.classList.remove('is-exit');
                }
                if (cover) {
                    cover.classList.remove('is-hidden', 'is-exit');
                    cover.classList.add('is-enter');
                    setTimeout(function() { cover.classList.remove('is-enter'); }, 260);
                }
            }, 140);
        };

        function buildDoorDesignerOptionButtons(items, group, lang) {
            return (items || []).map(function(item, idx) {
                const label = getDoorDesignerLocalized(item, 'label', lang);
                return '<button type="button" class="door-designer-opt' + (idx === 0 ? ' is-active' : '') + '" data-door-group="' + escapeHtmlAttr(group) + '" data-door-value="' + escapeHtmlAttr(item.id) + '">' +
                    escapeHtmlAttr(label) + '</button>';
            }).join('');
        }

        function buildDoorDesignerTypeGrid(types, lang) {
            return '<div class="door-designer-type-grid">' + (types || []).map(function(item, idx) {
                const label = getDoorDesignerLocalized(item, 'label', lang);
                return '<button type="button" class="door-designer-type-card door-designer-type-card--text door-designer-opt' + (idx === 0 ? ' is-active' : '') + '" data-door-group="type" data-door-value="' + escapeHtmlAttr(item.id) + '">' +
                    '<span class="door-designer-type-card-label">' + escapeHtmlAttr(label) + '</span></button>';
            }).join('') + '</div>';
        }

        function buildDoorDesignerModelGrid(models, lang) {
            return '<div class="door-designer-model-grid">' + (models || []).map(function(item) {
                const label = getDoorDesignerLocalized(item, 'label', lang);
                return '<button type="button" class="door-designer-model-card door-designer-opt" data-door-group="model" data-door-value="' + escapeHtmlAttr(item.id) + '" data-door-type-id="' + escapeHtmlAttr(item.typeId || '') + '">' +
                    '<span class="door-designer-model-card-label">' + escapeHtmlAttr(label) + '</span></button>';
            }).join('') + '</div>';
        }

        function buildDoorDesignerTypeSection(types, lang, uiLabel) {
            return '<section class="door-designer-section door-designer-section--types" data-door-section="type">' +
                '<h3 class="door-designer-section-title">' + escapeHtmlAttr(uiLabel) + '</h3>' +
                buildDoorDesignerTypeGrid(types, lang) + '</section>';
        }

        function buildDoorDesignerModelSection(models, lang, uiLabel) {
            return '<section class="door-designer-section door-designer-section--models" data-door-section="model">' +
                '<h3 class="door-designer-section-title">' + escapeHtmlAttr(uiLabel) + '</h3>' +
                buildDoorDesignerModelGrid(models, lang) + '</section>';
        }

        function buildDoorDesignerOptionSection(uiLabel, group, items, lang, extraClass) {
            return '<section class="door-designer-section' + (extraClass ? ' ' + extraClass : '') + '" data-door-section="' + escapeHtmlAttr(group) + '">' +
                '<h3 class="door-designer-section-title">' + escapeHtmlAttr(uiLabel) + '</h3>' +
                '<div class="door-designer-opts">' + buildDoorDesignerOptionButtons(items, group, lang) + '</div></section>';
        }

        function buildDoorStudioLiveHtml(leafMask, hintText) {
            const hint = hintText || 'اسحب للدوران 360° — يدور تلقائياً — +/− للتكبير';
            return '<div class="wpc-door-turntable" id="wpc-door-turntable">' +
                buildDoorDesignerLegacyCanvasHtml('', false, leafMask) +
                '</div>' +
                '<span class="nebras-door-3d-badge nebras-door-studio-badge">Studio · 360°</span>' +
                '<p class="nebras-door-3d-hint"><i class="fas fa-arrows-rotate" aria-hidden="true"></i> ' + hint + '</p>';
        }

        function buildDoorDesignerLegacyCanvasHtml(doorPhoto, photoreal, leafMask) {
            return '<div class="wpc-door-canvas" id="wpc-door-preview-unit">' +
                '<div class="wpc-door-photo-preset-wrap" id="wpc-door-photo-preset-wrap" aria-hidden="true">' +
                '<img class="wpc-door-photo-preset-transom-cap" id="wpc-door-photo-preset-transom-cap" alt="" hidden loading="eager" decoding="async">' +
                '<div class="wpc-door-photo-preset-stack" id="wpc-door-photo-preset-stack">' +
                '<img class="wpc-door-photo-preset-img" id="wpc-door-photo-preset-img" alt="" loading="eager" decoding="async">' +
                '<img class="wpc-door-photo-preset-roll" id="wpc-door-photo-preset-roll" alt="" hidden decoding="async">' +
                '</div></div>' +
                '<div class="wpc-door-keybab-textures" id="wpc-door-keybab-textures" aria-hidden="true">' +
                '<div class="wpc-door-leaf-texture wpc-door-leaf-texture--a is-visible" id="wpc-door-leaf-texture-a"></div>' +
                '<div class="wpc-door-leaf-texture wpc-door-leaf-texture--b" id="wpc-door-leaf-texture-b"></div>' +
                '<div class="wpc-door-center-mullion" id="wpc-door-center-mullion" aria-hidden="true"></div>' +
                '<div class="wpc-door-leaf-texture wpc-door-keybab-transom" id="wpc-door-keybab-transom"></div>' +
                '<div class="wpc-door-struct-texture wpc-door-struct-texture--left is-visible" id="wpc-door-struct-left"></div>' +
                '<div class="wpc-door-struct-texture wpc-door-struct-texture--right is-visible" id="wpc-door-struct-right"></div>' +
                '<div class="wpc-door-struct-texture wpc-door-struct-texture--top is-visible" id="wpc-door-struct-top"></div>' +
                '<div class="wpc-door-struct-texture wpc-door-struct-texture--top-clad" id="wpc-door-struct-top-clad"></div>' +
                '</div>' +
                '<div class="wpc-door-photo-stack' + (photoreal ? ' wpc-door-photo-stack--photoreal' : ' wpc-door-photo-stack--keybab-base') + '" id="wpc-door-photo-stack">' +
                (photoreal ? ('<img class="wpc-door-base-photo" id="wpc-door-base-photo" src="' + escapeHtmlAttr(doorPhoto) + '" alt="" loading="eager">') : '') +
                '<div class="wpc-door-roll-texture" id="wpc-door-roll-texture"></div>' +
                '<div class="wpc-door-panel-overlay" id="wpc-door-panel-overlay" aria-hidden="true"></div>' +
                '<div class="wpc-door-slats-overlay" id="wpc-door-slats-overlay" aria-hidden="true"></div>' +
                '<div class="wpc-door-uchannel-overlay" id="wpc-door-uchannel-overlay" aria-hidden="true"></div>' +
                '<div class="wpc-door-glass-strips-overlay" id="wpc-door-glass-strips-overlay" aria-hidden="true"></div>' +
                '<div class="wpc-door-glass-grid-overlay" id="wpc-door-glass-grid-overlay" aria-hidden="true"></div>' +
                '<div class="wpc-door-glass-tall-overlay" id="wpc-door-glass-tall-overlay" aria-hidden="true"></div>' +
                '<div class="wpc-door-transom-roll" id="wpc-door-transom-roll" aria-hidden="true"></div>' +
                '<div class="wpc-door-sliding-gap" id="wpc-door-sliding-gap" aria-hidden="true"></div>' +
                '<div class="wpc-door-color-layer" id="wpc-door-color-layer" aria-hidden="true"></div>' +
                '</div>' +
                '<div class="wpc-door-svg-overlay" id="wpc-door-svg-overlay">' + buildWpcDoorRealisticSvgHtml() + '</div>' +
                '</div>';
        }

        function injectDoorDesignerLegacyCanvas() {
            const stage = document.getElementById('door-3d-preview');
            if (!stage || document.getElementById('wpc-door-preview-unit')) return;
            const cfg = ensureDoorDesignerConfig();
            const doorPhoto = normalizeMediaPath(cfg.doorBaseImageUrl || NEBRAS_DOOR_PHOTO_DEFAULT);
            const photoreal = cfg.usePhotorealPreview !== false;
            const wrap = document.createElement('div');
            wrap.innerHTML = buildDoorDesignerLegacyCanvasHtml(doorPhoto, photoreal, '');
            const node = wrap.firstElementChild;
            if (node) stage.appendChild(node);
        }

        function buildDoorDesignerWorkspaceHtml() {
            const lang = currentLang || 'ar';
            const ui = siteText[lang] || siteText.ar;
            const cfg = ensureDoorDesignerConfig();
            if (cfg.enabled === false) {
                return '<p class="workspace-intro">' + escapeHtmlAttr(ui.doorDesignerDisabled || 'المصمم غير متاح حالياً.') + '</p>';
            }
            if (!cfg.surfaces.length || !cfg.colors.length || !cfg.mechanisms.length) {
                return '<p class="workspace-intro">' + escapeHtmlAttr(ui.doorDesignerPendingData || 'تم حذف بيانات مصمم الأبواب. أرسل البيانات الجديدة بالترتيب لإعادة البناء.') + '</p>';
            }
            const useStudio = isDoorDesignerStudioLiveMode(cfg);
            const useCompositor = !useStudio && isDoorDesignerCompositorMode(cfg);
            const use3d = !useStudio && !useCompositor && isDoorDesigner3dMode(cfg);
            const photoreal = !useStudio && !useCompositor && !use3d && cfg.usePhotorealPreview !== false && !isDoorDesignerKeybabCanvas(cfg);
            const keybab = useStudio || (!useCompositor && !use3d && isDoorDesignerKeybabCanvas(cfg));
            const showPreview = isDoorDesignerPreviewEnabled(cfg);
            const doorPhoto = normalizeMediaPath(cfg.doorBaseImageUrl || NEBRAS_DOOR_PHOTO_DEFAULT);
            const leafMask = normalizeMediaPath(NEBRAS_DOOR_LEAF_MASK);
            const studioTitle = ui.doorDesignerStudioTitle || 'صمّم بابك';
            const advLabel = ui.doorDesignerAdvancedLabel || 'خيارات إضافية';
            const resetLbl = ui.doorDesignerReset || 'إعادة الضبط';
            const dataOnlyHint = ui.doorDesignerDataOnlyHint || 'مرحلة إدخال البيانات — المعاينة البصرية للنموذج ستُفعّل بعد إرسال صور النماذج.';
            const hint3d = ui.doorDesignerCompositorHint || ui.doorDesigner3dHint || 'اسحبي للدوران 360° حول الباب — عجلة الفأرة للتقريب والتبعيد';
            const stageClasses = 'wpc-door-stage wpc-door-stage--studio' +
                (useStudio ? ' wpc-door-stage--studio-live wpc-door-stage--keybab' : (useCompositor ? ' wpc-door-stage--engine-compositor' : (use3d ? ' wpc-door-stage--engine-3d' : (keybab ? ' wpc-door-stage--keybab' : ' wpc-door-stage--photoreal'))));
            const panelOptionsHtml =
                (cfg.presets && cfg.presets.length ? (
                    '<section class="door-designer-section door-designer-section--presets">' +
                    '<h3 class="door-designer-section-title">' + escapeHtmlAttr(ui.doorDesignerPresetsLabel || 'نماذج جاهزة') + '</h3>' +
                    buildDoorDesignerPresetGrid(cfg.presets, lang) +
                    '<figure class="door-preset-reference is-hidden" id="door-preset-reference">' +
                    '<img id="door-preset-reference-img" loading="lazy" alt="">' +
                    '</figure></section>'
                ) : '') +
                buildDoorDesignerTypeSection(cfg.types, lang, ui.doorDesignerTypeLabel || 'نوع الباب') +
                buildDoorDesignerModelSection(cfg.models, lang, ui.doorDesignerSubModelLabel || 'نموذج الباب') +
                buildDoorDesignerOptionSection(ui.doorDesignerShapeLabel || 'الديكور الخارجي', 'outerShape', cfg.outerShapes, lang) +
                buildDoorDesignerOptionSection(ui.doorDesignerDecorLabel || 'التكسية العلوية', 'decor', cfg.decors, lang) +
                buildDoorDesignerOptionSection(ui.doorDesignerLeafSizeLabel || 'مقاس الضلفة', 'size', cfg.sizes, lang) +
                '<section class="door-designer-section door-designer-section--colors">' +
                '<h3 class="door-designer-section-title">' + escapeHtmlAttr(ui.doorDesignerColorLabel || 'رولات ألوان مصنع نبراس') + '</h3>' +
                '<div class="door-color-catalog door-color-catalog--keybab door-color-catalog--catalog door-color-catalog--nebras-rolls" role="listbox" aria-label="' + escapeHtmlAttr(ui.doorDesignerColorLabel || 'رولات ألوان مصنع نبراس') + '">' + buildDoorColorCatalogHtml(cfg.colors, lang) + '</div></section>' +
                '<div class="door-designer-hidden-sync is-hidden" aria-hidden="true">' +
                buildDoorDesignerOptionSection('', 'mechanism', cfg.mechanisms, lang) +
                buildDoorDesignerOptionSection('', 'leafCount', cfg.leafCounts, lang) +
                buildDoorDesignerOptionSection('', 'surface', cfg.surfaces, lang) +
                buildDoorDesignerOptionSection('', 'frame', cfg.frameStyles, lang) +
                buildDoorDesignerOptionSection('', 'glassLayout', cfg.glassLayouts, lang, 'door-designer-section--glass-layout') +
                '</div>' +
                '<details class="door-studio-advanced"><summary>' + escapeHtmlAttr(advLabel) + '</summary>' +
                '<div class="door-studio-advanced-inner">' +
                buildDoorDesignerOptionSection(ui.doorDesignerGlassLabel || 'نوع الزجاج (متقدم)', 'glassPattern', cfg.glassPatterns, lang, 'door-designer-section--glass') +
                buildDoorDesignerOptionSection(ui.doorDesignerOpeningLabel || 'اتجاه الفتح', 'opening', cfg.openings, lang) +
                buildDoorDesignerOptionSection(ui.doorDesignerHardwareLabel || 'المقبض', 'hardware', cfg.hardware, lang) +
                buildDoorDesignerOptionSection(ui.doorDesignerLockLabel || 'القفل', 'lock', cfg.locks, lang) +
                '</div></details>';
            const previewHtml = showPreview ? (
                '<main class="door-studio-preview">' +
                '<div class="door-studio-preview-toolbar">' +
                '<button type="button" class="door-studio-reset door-studio-reset--primary" id="door-designer-reset-btn" title="' + escapeHtmlAttr(resetLbl) + '">' +
                '<i class="fas fa-rotate-left" aria-hidden="true"></i> ' + escapeHtmlAttr(resetLbl) + '</button>' +
                '<div class="door-studio-preview-zoom">' +
                '<button type="button" class="door-preview-tool" id="door-preview-zoom-out" aria-label="-">−</button>' +
                '<span class="door-preview-zoom-label" id="door-preview-zoom-label">100%</span>' +
                '<button type="button" class="door-preview-tool" id="door-preview-zoom-in" aria-label="+">+</button>' +
                '</div></div>' +
                '<div class="door-studio-canvas-wrap">' +
                '<div class="' + stageClasses + '" id="door-3d-preview" data-zoom="100" style="--door-mask-url:url(\'' + leafMask.replace(/'/g, '') + '\')">' +
                (useStudio ? buildDoorStudioLiveHtml(leafMask, hint3d) : (useCompositor ? (
                    '<div class="nebras-door-compositor-viewport" id="nebras-door-compositor-viewport" role="application" aria-label="' + escapeHtmlAttr(ui.doorDesignerCompositorAria || 'معاينة باب ديناميكية بطبقات') + '">' +
                    '<p class="nebras-door-3d-loading" id="nebras-door-compositor-loading">' + escapeHtmlAttr(ui.doorDesignerCompositorLoading || 'جاري تجميع طبقات التصميم…') + '</p></div>' +
                    '<span class="nebras-door-3d-badge" id="nebras-door-compositor-badge" hidden>Studio · 360°</span>' +
                    '<p class="nebras-door-3d-hint"><i class="fas fa-arrows-rotate" aria-hidden="true"></i> ' + escapeHtmlAttr(hint3d) + '</p>'
                ) : (use3d ? (
                    '<div class="nebras-door-3d-viewport" id="nebras-door-3d-viewport" role="application" aria-label="' + escapeHtmlAttr(ui.doorDesigner3dAria || 'معاينة باب ثلاثي الأبعاد') + '">' +
                    '<p class="nebras-door-3d-loading" id="nebras-door-3d-loading">' + escapeHtmlAttr(ui.doorDesigner3dLoading || 'جاري تحميل النموذج ثلاثي الأبعاد…') + '</p></div>' +
                    '<span class="nebras-door-3d-badge" id="nebras-door-3d-badge" hidden>3D · 360°</span>' +
                    '<p class="nebras-door-3d-hint"><i class="fas fa-arrows-rotate" aria-hidden="true"></i> ' + escapeHtmlAttr(hint3d) + '</p>'
                ) : buildDoorDesignerLegacyCanvasHtml(doorPhoto, photoreal, leafMask)))) +
                '</div>' +
                '<p class="door-active-color-label" id="door-active-color-label"></p>' +
                '</main>'
            ) : '';
            if (!showPreview) {
                return '<div class="door-designer door-designer--data-only" id="nebras-door-designer">' +
                    '<div class="door-designer-flow">' +
                    '<header class="door-studio-head door-studio-head--compact">' +
                    '<h2 class="door-studio-title">' + escapeHtmlAttr(studioTitle) + '</h2>' +
                    '<button type="button" class="door-studio-reset door-studio-reset--primary door-studio-reset--panel" id="door-designer-reset-btn" title="' + escapeHtmlAttr(resetLbl) + '">' +
                    '<i class="fas fa-rotate-left" aria-hidden="true"></i> ' + escapeHtmlAttr(resetLbl) + '</button>' +
                    '</header>' +
                    panelOptionsHtml +
                    '<div class="door-studio-data-summary" id="door-designer-summary"></div>' +
                    '<button type="button" class="door-studio-quote workspace-action-btn workspace-action-btn--primary" onclick="addDoorDesignToCartAndQuote()">' +
                    '<i class="fas fa-file-invoice"></i> ' + escapeHtmlAttr(ui.doorDesignerQuoteBtn || 'طلب عرض سعر') + '</button>' +
                    '</div></div>';
            }
            return '<div class="door-designer door-designer--studio door-designer--keybab" id="nebras-door-designer">' +
                '<div class="door-studio-layout">' +
                '<aside class="door-studio-panel">' +
                '<header class="door-studio-head door-studio-head--compact">' +
                '<h2 class="door-studio-title">' + escapeHtmlAttr(studioTitle) + '</h2>' +
                '<button type="button" class="door-studio-reset door-studio-reset--panel" id="door-designer-reset-btn-panel" title="' + escapeHtmlAttr(resetLbl) + '">' +
                '<i class="fas fa-rotate-left" aria-hidden="true"></i> ' + escapeHtmlAttr(resetLbl) + '</button>' +
                '</header>' +
                '<p class="door-studio-hint">' + escapeHtmlAttr(ui.doorDesignerCanvasHint || '') + '</p>' +
                '<div class="door-studio-panel-scroll">' +
                '<div class="door-studio-panel-summary" id="door-designer-summary" aria-live="polite"></div>' +
                panelOptionsHtml +
                '</div>' +
                '<button type="button" class="door-studio-quote workspace-action-btn workspace-action-btn--primary" onclick="addDoorDesignToCartAndQuote()">' +
                '<i class="fas fa-file-invoice"></i> ' + escapeHtmlAttr(ui.doorDesignerQuoteBtn || 'طلب عرض سعر') + '</button>' +
                '</aside>' +
                previewHtml +
                '</div></div>';
        }

        function resetDoorDesignerWorkspace() {
            const root = document.getElementById('nebras-door-designer');
            if (!root) return;
            if (isDoorDesigner3dMode()) disposeDoorDesigner3dEngine();
            applyDoorDesignerStateValues(root, DOOR_DESIGNER_ZERO_STATE);
            const stage = document.getElementById('door-3d-preview');
            if (stage) {
                stage.setAttribute('data-zoom', '100');
                stage.style.setProperty('--door-zoom', '1');
                stage.classList.add('wpc-door-stage--reset-flash');
                setTimeout(function() { if (stage) stage.classList.remove('wpc-door-stage--reset-flash'); }, 420);
            }
            const zoomLbl = document.getElementById('door-preview-zoom-label');
            if (zoomLbl) zoomLbl.textContent = '100%';
            hideAllWpcPhotoDecorLayers();
            syncDoorDesignerOptionStates(root);
            updateDoorDesignerPreview(root);
        }

        function getDoorDesignerPick(root, group) {
            const active = root.querySelector('.is-active[data-door-group="' + group + '"]');
            return active ? active.getAttribute('data-door-value') : '';
        }

        function syncDoorDesignerOptionStates(root) {
            if (!root) return;
            const cfg = ensureDoorDesignerConfig();
            const state = resolveDoorDesignerState(root);
            const currentType = getDoorDesignerPick(root, 'type') || 'edge-band';
            let hasVisibleModel = false;
            root.querySelectorAll('[data-door-group="model"]').forEach(function(btn) {
                const typeId = btn.getAttribute('data-door-type-id') || '';
                const show = typeId === currentType;
                btn.classList.toggle('is-hidden', !show);
                if (show) hasVisibleModel = true;
                if (show && btn.classList.contains('is-active')) hasVisibleModel = true;
            });
            const activeModel = root.querySelector('[data-door-group="model"].is-active:not(.is-hidden)');
            if (!activeModel) {
                const first = root.querySelector('[data-door-group="model"][data-door-type-id="' + currentType + '"]');
                if (first) {
                    root.querySelectorAll('[data-door-group="model"]').forEach(function(b) {
                        b.classList.toggle('is-active', b === first);
                    });
                    applyDoorDesignerModelConfig(root, getDoorDesignerModelById(first.getAttribute('data-door-value')));
                }
            }
            const glassLayoutSec = root.querySelector('.door-designer-section--glass-layout');
            const glassPatSec = root.querySelector('.door-designer-section--glass');
            const showGlassLayout = state.surface === 'u-glass' || state.surface === 'full-glass';
            if (glassLayoutSec) glassLayoutSec.classList.toggle('is-hidden', !showGlassLayout);
            if (glassPatSec) glassPatSec.classList.toggle('is-hidden', state.surface !== 'full-glass');
            root.querySelectorAll('[data-door-group="decor"] .door-designer-opt').forEach(function(btn) {
                const val = btn.getAttribute('data-door-value');
                const disabled = false;
                btn.disabled = disabled;
                btn.classList.toggle('is-disabled', disabled);
            });
            const openingSec = root.querySelector('[data-door-section="opening"]');
            if (openingSec) openingSec.classList.toggle('is-hidden', state.isSliding);
            const presetsSec = root.querySelector('.door-designer-section--presets');
            if (presetsSec) presetsSec.classList.toggle('is-hidden', !(cfg.presets && cfg.presets.length));
        }

        function bindDoorDesignerWorkspace() {
            const root = document.getElementById('nebras-door-designer');
            if (!root) return;
            const resetBtn = document.getElementById('door-designer-reset-btn');
            const resetBtnPanel = document.getElementById('door-designer-reset-btn-panel');
            if (resetBtn) resetBtn.onclick = resetDoorDesignerWorkspace;
            if (resetBtnPanel) resetBtnPanel.onclick = resetDoorDesignerWorkspace;
            let zoom = 100;
            const stage = document.getElementById('door-3d-preview');
            const zoomLbl = document.getElementById('door-preview-zoom-label');
            function applyZoom() {
                if (!stage) return;
                stage.setAttribute('data-zoom', String(zoom));
                stage.style.setProperty('--door-zoom', (zoom / 100));
                if (zoomLbl) zoomLbl.textContent = zoom + '%';
                if (isDoorDesignerCompositorMode() && isDoorDesignerCompositorReady()) {
                    NebrasDoorCompositor.setZoomPercent(zoom);
                } else if (isDoorDesigner3dMode() && isDoorDesigner3dEngineReady()) {
                    NebrasDoor3D.setZoomPercent(zoom);
                }
            }
            const zoomIn = document.getElementById('door-preview-zoom-in');
            const zoomOut = document.getElementById('door-preview-zoom-out');
            if (zoomIn) zoomIn.onclick = function() { zoom = Math.min(140, zoom + 10); applyZoom(); };
            if (zoomOut) zoomOut.onclick = function() { zoom = Math.max(70, zoom - 10); applyZoom(); };
            if (stage) applyZoom();
            root.querySelectorAll('.door-preset-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    applyDoorDesignerPreset(root, btn.getAttribute('data-door-preset'));
                    if (stage) {
                        stage.classList.add('wpc-door-stage--updating');
                        setTimeout(function() { stage.classList.remove('wpc-door-stage--updating'); }, 320);
                    }
                });
            });
            root.querySelectorAll('.door-designer-opt, .door-designer-type-card, .door-designer-model-card, .door-color-swatch').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    if (btn.disabled || btn.classList.contains('is-disabled')) return;
                    const group = btn.getAttribute('data-door-group');
                    root.querySelectorAll('[data-door-group="' + group + '"]').forEach(function(b) {
                        b.classList.toggle('is-active', b === btn);
                    });
                    updateDoorPresetReferencePreview(root, null);
                    normalizeDoorDesignerConflicts(root, group);
                    if (group === 'model') {
                        const model = getDoorDesignerModelById(btn.getAttribute('data-door-value'));
                        if (model) applyDoorDesignerModelConfig(root, model);
                    }
                    if (stage) {
                        stage.classList.add('wpc-door-stage--updating');
                        setTimeout(function() { stage.classList.remove('wpc-door-stage--updating'); }, 320);
                    }
                    syncDoorDesignerOptionStates(root);
                    scheduleDoorDesignerPreviewUpdate(root);
                });
            });
            const isMobileBind = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
            if (!isMobileBind) {
                function preloadDoorRollSwatches() {
                    NEBRAS_ROLL_CODES.forEach(function(n, i) {
                        const colors = getNebrasDoorCatalogColors();
                        const hex = colors[i] ? colors[i].hex : '#b8bcc4';
                        const pre = new Image();
                        pre.src = doorDesignerMediaUrl(getRollSwatchImageUrl(i)) + '?ri=' + i + '&h=' + encodeURIComponent(hex) + '&v=' + DOOR_PHOTO_PRESET_CACHE;
                    });
                }
                if (typeof requestIdleCallback === 'function') {
                    requestIdleCallback(preloadDoorRollSwatches, { timeout: 4000 });
                } else {
                    setTimeout(preloadDoorRollSwatches, 800);
                }
            }
            applyDoorDesignerStateValues(root, DOOR_DESIGNER_ZERO_STATE);
            normalizeDoorDesignerConflicts(root, 'type');
            updateDoorPresetReferencePreview(root, null);
            syncDoorDesignerOptionStates(root);
            updateDoorDesignerPreview(root);
            if (isDoorDesignerStudioLiveMode()) {
                bindDoorDesignerTurntable();
            } else if (isDoorDesignerCompositorMode()) {
                tryMountDoorDesignerCompositor(root);
            } else if (isDoorDesigner3dMode()) {
                tryMountDoorDesigner3d(root, 0);
            }
            const panelScroll = root.querySelector('.door-designer-flow') || root.querySelector('.door-studio-panel-scroll');
            if (panelScroll) panelScroll.scrollTop = 0;
        }

        function applyDoorLeafMask(stage, decor) {
            if (!stage) return;
            const transom = decor === 'transom';
            stage.classList.toggle('wpc-door-stage--decor-transom', transom);
        }

        function applyWpcStudioVisualLayers(stage, state, swatchUrl) {
            if (!stage || !state) return;
            const surface = state.surface;
            stage.className = stage.className.replace(/\bwpc-door-stage--surface-\S+/g, '').trim();
            stage.classList.add('wpc-door-stage--surface-' + surface.replace(/[^a-z0-9-]/gi, '-'));
            stage.classList.toggle('wpc-door-stage--model-frame', surface === 'u-classic');
            stage.classList.toggle('wpc-door-stage--model-plain', surface === 'flat');
            stage.classList.toggle('wpc-door-stage--style-slats', surface === 'u-plain' || surface === 'u-slats' || surface === 'u-glass');
            stage.classList.toggle('wpc-door-stage--style-normal', surface === 'flat' || surface === 'u-classic');
            if (stage.classList.contains('wpc-door-stage--keybab')) {
                hideAllWpcPhotoDecorLayers();
                return;
            }
            const panel = document.getElementById('wpc-door-panel-overlay');
            const slats = document.getElementById('wpc-door-slats-overlay');
            const uchannel = document.getElementById('wpc-door-uchannel-overlay');
            const glassStrips = document.getElementById('wpc-door-glass-strips-overlay');
            const glassGrid = document.getElementById('wpc-door-glass-grid-overlay');
            const glassTall = document.getElementById('wpc-door-glass-tall-overlay');
            const transomRoll = document.getElementById('wpc-door-transom-roll');
            const slidingGap = document.getElementById('wpc-door-sliding-gap');
            hideAllWpcPhotoDecorLayers();
            if (panel) panel.classList.toggle('is-visible', surface === 'u-classic');
            if (slats) slats.classList.toggle('is-visible', surface === 'u-plain');
            if (uchannel) uchannel.classList.toggle('is-visible', surface === 'u-plain');
            if (glassStrips) glassStrips.classList.toggle('is-visible', surface === 'u-glass' && state.glassLayout === 'strips-5');
            if (glassGrid) glassGrid.classList.toggle('is-visible', state.surface === 'full-glass' && state.glassLayout === 'grid-2x2');
            if (glassTall) {
                const tall = state.surface === 'u-glass' && (state.glassLayout === 'strip-tall' || state.glassLayout === 'full');
                glassTall.classList.toggle('is-visible', tall);
            }
            if (slidingGap) slidingGap.classList.toggle('is-visible', state.isSliding && state.isDouble);
            if (transomRoll) {
                const show = state.decor === 'transom' && swatchUrl;
                transomRoll.classList.toggle('is-visible', show);
                if (show) transomRoll.style.backgroundImage = 'url("' + swatchUrl.replace(/"/g, '') + '")';
            }
        }

        function applyWpcKeybabStructRollFinish(stage, state, swatchUrl, hex, isRoll) {
            if (!stage || !stage.classList.contains('wpc-door-stage--keybab') || !state) return;
            const safe = hex || '#b8bcc4';
            const rollFinish = isRoll !== false;
            const url = rollFinish ? resolveDoorRollTextureUrl(swatchUrl) : '';
            const absUrl = url ? doorDesignerMediaUrl(url.split('?')[0]) : '';
            const bgImage = absUrl ? ('url("' + absUrl.replace(/"/g, '') + '")') : 'none';
            const mobileFx = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
            const structFilter = mobileFx ? 'none' : 'contrast(1.04) saturate(1.05) brightness(0.94)';
            const structLeft = document.getElementById('wpc-door-struct-left');
            const structRight = document.getElementById('wpc-door-struct-right');
            const structTop = document.getElementById('wpc-door-struct-top');
            const structTopClad = document.getElementById('wpc-door-struct-top-clad');
            const leafA = document.getElementById('wpc-door-leaf-texture-a');
            const leafB = document.getElementById('wpc-door-leaf-texture-b');
            const transom = document.getElementById('wpc-door-keybab-transom');
            const mullion = document.getElementById('wpc-door-center-mullion');
            function paintStruct(el, visible, shade) {
                if (!el) return;
                const base = shadeDoorHex(safe, shade);
                el.style.backgroundColor = base;
                el.classList.toggle('has-door-roll-tint', rollFinish);
                el.style.setProperty('--door-roll-tint', safe);
                if (rollFinish && absUrl) {
                    el.style.backgroundImage = bgImage;
                    el.style.backgroundSize = 'cover';
                    el.style.backgroundPosition = 'center';
                    el.style.filter = structFilter;
                } else {
                    el.style.backgroundImage = 'none';
                    el.style.filter = 'none';
                }
                el.classList.toggle('is-visible', !!visible);
            }
            if (stage.classList.contains('wpc-door-stage--photo-preset')) {
                [leafA, leafB, transom, mullion].forEach(function(el) {
                    if (el) el.classList.remove('is-visible');
                });
            }
            paintStruct(structLeft, true, -20);
            paintStruct(structRight, true, -20);
            paintStruct(structTop, true, -24);
            paintStruct(structTopClad, state.decor === 'transom' && !state.isSliding, -8);
            stage.classList.toggle('wpc-door-stage--struct-transom', state.decor === 'transom' && !state.isSliding);
            stage.style.setProperty('--door-frame-tint', shadeDoorHex(safe, -28));
        }

        function applyWpcKeybabLeafTextures(stage, state, swatchUrl, hex, isRoll) {
            if (!stage || !stage.classList.contains('wpc-door-stage--keybab')) return;
            const safe = hex || '#b8bcc4';
            const rollFinish = isRoll !== false;
            const url = rollFinish ? resolveDoorRollTextureUrl(swatchUrl) : '';
            const absUrl = url ? doorDesignerMediaUrl(url.split('?')[0]) : '';
            const bgImage = absUrl ? ('url("' + absUrl.replace(/"/g, '') + '")') : 'none';
            const mobileFx = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
            const faceFilter = mobileFx ? 'none' : 'contrast(1.08) saturate(1.1) brightness(0.98)';
            const structFilter = mobileFx ? 'none' : 'contrast(1.04) saturate(1.05) brightness(0.94)';
            applyDoorRollTintToElements(stage, { hex: safe, isRoll: rollFinish, swatchUrl: swatchUrl, profile: getRollBlendProfile(safe) });
            stage.classList.toggle('wpc-door-stage--roll-finish', rollFinish);
            stage.classList.toggle('wpc-door-stage--flat-finish', !rollFinish);
            stage.classList.toggle('wpc-door-stage--leaf-single', !state.isDouble);
            stage.classList.toggle('wpc-door-stage--leaf-double', !!state.isDouble);
            function paintLeaf(el, visible, isDoorFace) {
                if (!el) return;
                el.classList.toggle('wpc-door-leaf-texture--roll', rollFinish);
                el.classList.toggle('wpc-door-leaf-texture--flat', !rollFinish);
                el.classList.toggle('has-door-roll-tint', rollFinish);
                if (rollFinish) {
                    el.style.backgroundColor = shadeDoorHex(safe, -6);
                    el.style.backgroundImage = bgImage;
                    el.style.backgroundSize = 'cover';
                    el.style.backgroundPosition = 'center center';
                    el.style.backgroundRepeat = 'no-repeat';
                    el.style.backgroundAttachment = 'scroll';
                    el.style.setProperty('--door-roll-tint', safe);
                    el.style.setProperty('--door-roll-texture-url', bgImage);
                    el.style.filter = isDoorFace ? faceFilter : structFilter;
                } else {
                    el.style.backgroundColor = safe;
                    el.style.backgroundImage = 'none';
                    el.style.filter = 'none';
                    el.classList.remove('has-door-roll-tint');
                }
                el.classList.toggle('is-visible', !!visible);
            }
            const leafA = document.getElementById('wpc-door-leaf-texture-a');
            const leafB = document.getElementById('wpc-door-leaf-texture-b');
            const transom = document.getElementById('wpc-door-keybab-transom');
            const mullion = document.getElementById('wpc-door-center-mullion');
            const showB = !!state.isDouble;
            paintLeaf(leafA, true, true);
            paintLeaf(leafB, showB, true);
            if (leafB && !showB) {
                leafB.classList.remove('is-visible');
            }
            paintLeaf(transom, state.decor === 'transom' && !state.isSliding, false);
            if (mullion) {
                const showMullion = showB && !state.isSliding;
                mullion.classList.toggle('is-visible', showMullion);
                mullion.style.backgroundColor = shadeDoorHex(safe, -32);
                if (rollFinish && url) {
                    mullion.style.backgroundImage = bgImage;
                    mullion.style.backgroundSize = 'cover';
                } else {
                    mullion.style.backgroundImage = 'none';
                }
            }
            applyWpcKeybabStructRollFinish(stage, state, swatchUrl, hex, isRoll);
            stage.style.setProperty('--door-roll-url', url ? ('url("' + url.replace(/"/g, '') + '")') : 'none');
        }

        function applyWpcSvgDoorColor(stage, hex, tex, style, rollOpts) {
            if (!stage) return;
            rollOpts = rollOpts || {};
            const safe = hex || '#b8bcc4';
            stage.style.setProperty('--door-face', safe);
            stage.style.setProperty('--door-light', shadeDoorHex(safe, 22));
            stage.style.setProperty('--door-dark', shadeDoorHex(safe, -18));
            stage.style.setProperty('--door-frame-light', shadeDoorHex(safe, 6));
            stage.style.setProperty('--door-frame-face', shadeDoorHex(safe, -16));
            stage.style.setProperty('--door-frame-dark', shadeDoorHex(safe, -34));
            stage.style.setProperty('--door-frame-liner', shadeDoorHex(safe, -28));
            stage.style.setProperty('--door-frame-bevel', shadeDoorHex(safe, 28));
            stage.style.setProperty('--door-threshold-light', shadeDoorHex(safe, -18));
            stage.style.setProperty('--door-threshold-dark', shadeDoorHex(safe, -42));
            const rollLayer = document.getElementById('wpc-door-roll-texture');
            const colorLayer = document.getElementById('wpc-door-color-layer');
            const photoStack = document.getElementById('wpc-door-photo-stack');
            const basePhoto = document.getElementById('wpc-door-base-photo');
            const isPhotoreal = stage.classList.contains('wpc-door-stage--photoreal');
            const isKeybab = stage.classList.contains('wpc-door-stage--keybab');
            const isPhotoPreset = stage.classList.contains('wpc-door-stage--photo-preset');
            const isDynamicRender = stage.classList.contains('wpc-door-stage--dynamic-render');
            const catIdx = rollOpts.catalogIndex != null ? rollOpts.catalogIndex : 0;
            const swatchUrl = resolveDoorRollTextureUrl(tex || (rollOpts.isRoll ? getRollSwatchImageUrl(catIdx) : ''));
            const targetLayer = isPhotoreal && rollLayer ? rollLayer : colorLayer;
            const designerRoot = document.getElementById('nebras-door-designer');
            const doorState = designerRoot ? resolveDoorDesignerState(designerRoot) : null;
            if (basePhoto) {
                basePhoto.style.opacity = isDynamicRender ? '0' : '1';
                basePhoto.style.visibility = isDynamicRender ? 'hidden' : 'visible';
            }

            if (isKeybab && !isPhotoPreset) {
                if (rollLayer) { rollLayer.style.opacity = '0'; rollLayer.style.backgroundImage = 'none'; }
                if (colorLayer) { colorLayer.style.opacity = '0'; colorLayer.style.backgroundImage = 'none'; }
                if (doorState) applyWpcKeybabLeafTextures(stage, doorState, swatchUrl, safe, rollOpts.isRoll);
            } else if (!isPhotoPreset && rollOpts.isRoll && swatchUrl && targetLayer) {
                targetLayer.style.backgroundImage = 'url("' + swatchUrl.replace(/"/g, '') + '")';
                targetLayer.style.backgroundSize = 'cover';
                targetLayer.style.backgroundPosition = 'center';
                targetLayer.style.backgroundRepeat = 'no-repeat';
                targetLayer.style.backgroundColor = 'transparent';
                targetLayer.style.opacity = isPhotoreal ? '0.92' : '1';
                targetLayer.style.mixBlendMode = isPhotoreal ? 'multiply' : 'normal';
                targetLayer.style.filter = isPhotoreal ? 'contrast(1.08) saturate(1.12) brightness(0.98)' : 'none';
                if (isPhotoreal) {
                    targetLayer.style.webkitMaskImage = 'var(--door-mask-url)';
                    targetLayer.style.maskImage = 'var(--door-mask-url)';
                    targetLayer.style.webkitMaskSize = 'contain';
                    targetLayer.style.maskSize = 'contain';
                    targetLayer.style.webkitMaskPosition = 'center';
                    targetLayer.style.maskPosition = 'center';
                    targetLayer.style.webkitMaskRepeat = 'no-repeat';
                    targetLayer.style.maskRepeat = 'no-repeat';
                }
            } else if (targetLayer) {
                targetLayer.style.backgroundImage = tex ? 'url("' + tex.replace(/"/g, '') + '")' : 'none';
                targetLayer.style.backgroundSize = 'cover';
                targetLayer.style.backgroundPosition = 'center';
                targetLayer.style.backgroundColor = safe;
                targetLayer.style.opacity = basePhoto && basePhoto.src ? '0.88' : '0';
                targetLayer.style.mixBlendMode = 'multiply';
                targetLayer.style.filter = 'none';
            }
            if (colorLayer && targetLayer !== colorLayer) {
                colorLayer.style.opacity = '0';
                colorLayer.style.backgroundImage = 'none';
            }
            if (photoStack) {
                photoStack.classList.toggle('wpc-door-photo-stack--has-photo', !!(basePhoto && basePhoto.src && !isDynamicRender));
                photoStack.classList.toggle('wpc-door-photo-stack--roll-active', !!(rollOpts.isRoll && swatchUrl));
            }
            const svg = document.getElementById('wpc-door-svg-root');
            if (!svg) return;
            const slidingB = document.getElementById('wpcSvgSlidingLeafB');
            const usePhotoRoll = !!(isPhotoreal && rollOpts.isRoll && swatchUrl && !isDynamicRender);
            const texImg = document.getElementById('wpcDoorTextureImg');
            const rollTexUrl = rollOpts.isRoll && swatchUrl
                ? doorDesignerMediaUrl(resolveDoorRollTextureUrl(swatchUrl).split('?')[0]) + '?ri=' + (rollOpts.catalogIndex || 0) + '&v=' + DOOR_PHOTO_PRESET_CACHE
                : '';
            let useTexturePattern = !!(rollOpts.isRoll && rollTexUrl && !usePhotoRoll && !isPhotoPreset);
            if (useTexturePattern && texImg) {
                texImg.setAttribute('href', rollTexUrl);
                texImg.setAttributeNS('http://www.w3.org/1999/xlink', 'href', rollTexUrl);
            } else if (texImg && !isPhotoPreset) {
                texImg.setAttribute('href', '');
                texImg.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '');
                useTexturePattern = false;
            }
            let fillVal = 'url(#wpcLeafGrad)';
            if (useTexturePattern) fillVal = 'url(#wpcDoorTexture)';
            else if (isKeybab && !isPhotoPreset && !rollOpts.isRoll) fillVal = 'transparent';
            else if (usePhotoRoll) fillVal = 'transparent';
            function setLeafFill(el) {
                if (el) el.setAttribute('fill', fillVal);
            }
            ['wpcSvgFaceA', 'wpcSvgFaceB', 'wpcSvgFaceB2'].forEach(function(id) {
                setLeafFill(document.getElementById(id));
            });
            if (slidingB) setLeafFill(slidingB.querySelector('rect'));
            const transomLeaf = document.querySelector('#wpcSvgTransom rect:first-child');
            if (transomLeaf) setLeafFill(transomLeaf);
            svg.classList.toggle('wpc-door-svg--slats', style === 'slats');
            const svgOverlay = document.getElementById('wpc-door-svg-overlay');
            if (svgOverlay) svgOverlay.classList.toggle('is-active', !isPhotoPreset && (isPhotoreal || isKeybab));
            svg.classList.toggle('wpc-door-svg--photoreal-overlay', isPhotoreal && !isKeybab);
            svg.classList.toggle('wpc-door-svg--keybab-canvas', isKeybab);
        }

        function applyWpcSvgDoorSurface(svg, state) {
            if (!svg || !state) return;
            svg.querySelectorAll('.wpc-svg-detail').forEach(function(g) { g.setAttribute('opacity', '0'); });
            const surface = state.surface;
            const layout = state.glassLayout;
            if (surface === 'flat') {
                /* سطح فلات — texture فقط بدون خطوط */
            } else if (surface === 'u-plain' || surface === 'u-normal') {
                svg.querySelectorAll('.wpc-svg-uchannel-v').forEach(function(g) { g.setAttribute('opacity', '1'); });
            } else if (surface === 'u-slats') {
                svg.querySelectorAll('.wpc-svg-uchannel-v').forEach(function(g) { g.setAttribute('opacity', '1'); });
                svg.querySelectorAll('.wpc-svg-louver').forEach(function(g) { g.setAttribute('opacity', '1'); });
            } else if (surface === 'u-classic') {
                svg.querySelectorAll('.wpc-svg-shaker').forEach(function(g) { g.setAttribute('opacity', '1'); });
            } else if (surface === 'u-glass') {
                svg.querySelectorAll('.wpc-svg-uchannel-v').forEach(function(g) { g.setAttribute('opacity', '0.5'); });
                if (layout === 'strips-5') {
                    svg.querySelectorAll('.wpc-svg-glass-strips').forEach(function(g) { g.setAttribute('opacity', '1'); });
                } else {
                    svg.querySelectorAll('.wpc-svg-glass-tall').forEach(function(g) { g.setAttribute('opacity', '1'); });
                }
            } else if (surface === 'full-glass') {
                if (layout === 'grid-2x2') {
                    svg.querySelectorAll('.wpc-svg-glass-grid').forEach(function(g) { g.setAttribute('opacity', '1'); });
                } else if (layout === 'strips-5') {
                    svg.querySelectorAll('.wpc-svg-glass-strips').forEach(function(g) { g.setAttribute('opacity', '1'); });
                } else {
                    svg.querySelectorAll('.wpc-svg-glass-tall, .wpc-svg-vision').forEach(function(g) { g.setAttribute('opacity', '1'); });
                }
            }
        }

        function applyWpcSvgDoorDesign(svg, type, style) {
            applyWpcSvgDoorSurface(svg, {
                surface: type === 'glass' ? 'full-glass' : (type === 'classic' ? 'u-classic' : (style === 'slats' ? 'u-normal' : 'flat')),
                glassLayout: 'strip-tall'
            });
        }

        function applyWpcSvgOuterShape(stage, svg, outerShape) {
            const isCurve = outerShape === 'outer-curve';
            if (stage) {
                stage.classList.toggle('wpc-door-stage--outer-curve', isCurve);
                stage.classList.toggle('wpc-door-stage--outer-flat', !isCurve);
            }
            if (!svg) return;
            const outerFrame = document.getElementById('wpcSvgOuterFrame');
            if (outerFrame) outerFrame.setAttribute('rx', isCurve ? '22' : '4');
            const frameLiner = document.getElementById('wpcSvgFrameLiner');
            if (frameLiner) frameLiner.setAttribute('rx', isCurve ? '16' : '0');
            const frameBevel = document.getElementById('wpcSvgFrameBevel');
            if (frameBevel) frameBevel.setAttribute('rx', isCurve ? '13' : '0');
        }

        function applyWpcSvgFrameStyle(stage, svg, frame) {
            if (stage) {
                stage.classList.toggle('wpc-door-stage--frame-curve', frame === 'curve');
                stage.classList.toggle('wpc-door-stage--frame-flat', frame === 'flat' || !frame);
            }
        }

        function applyWpcSvgModel(stage, modelId) {
            if (!stage) return;
            stage.classList.remove('wpc-door-stage--model-plain', 'wpc-door-stage--model-frame');
            if (modelId === 'plain') stage.classList.add('wpc-door-stage--model-plain');
            else stage.classList.add('wpc-door-stage--model-frame');
        }

        function applyWpcSvgModelProfile(stage, state) {
            if (!stage || !state) return;
            const model = String(state.model || '');
            const flags = {
                'edge-1': 'wpc-door-stage--profile-edge-1',
                'edge-2': 'wpc-door-stage--profile-edge-2',
                'u-plain': 'wpc-door-stage--profile-u-plain',
                'u-slats': 'wpc-door-stage--profile-u-slats',
                'u-classic': 'wpc-door-stage--profile-u-classic',
                'u-glass': 'wpc-door-stage--profile-u-glass',
                'slide-1': 'wpc-door-stage--profile-slide-1',
                'slide-2': 'wpc-door-stage--profile-slide-2'
            };
            Object.keys(flags).forEach(function(id) {
                stage.classList.toggle(flags[id], model === id);
            });
        }

        function applyWpcSvgDecor(svg, decor, isSliding) {
            const transom = document.getElementById('wpcSvgTransom');
            const leafA = document.getElementById('wpcSvgLeafA');
            const faceA = document.getElementById('wpcSvgFaceA');
            const show = decor === 'transom';
            if (transom) transom.setAttribute('opacity', show ? '1' : '0');
            if (faceA && show) {
                faceA.setAttribute('y', '132');
                faceA.setAttribute('height', '688');
            } else if (faceA) {
                faceA.setAttribute('y', '48');
                faceA.setAttribute('height', '772');
            }
        }

        function applyWpcSvgGlassPattern(svg, pattern, isGlassSurface) {
            if (!svg) return;
            const isGlass = isGlassSurface;
            svg.querySelectorAll('.wpc-svg-vision rect').forEach(function(r) {
                if (!isGlass) return;
                if (pattern === 'frosted') r.setAttribute('fill', 'url(#wpcGlassFrost)');
                else if (pattern === 'reeded') r.setAttribute('fill', 'url(#wpcGlassGrad)');
                else r.setAttribute('fill', 'url(#wpcGlassGrad)');
            });
            const faceA = document.getElementById('wpcSvgFaceA');
            if (faceA && isGlass && pattern === 'arch') {
                faceA.setAttribute('rx', '48');
            } else if (faceA) {
                faceA.setAttribute('rx', '3');
            }
        }

        function applyWpcSvgOpening(stage, svg, opening) {
            const isLeft = opening === 'left';
            if (stage) stage.classList.toggle('wpc-door-stage--opening-left', isLeft);
            const unit = document.getElementById('wpcSvgDoorUnit');
            if (unit) unit.setAttribute('transform', isLeft ? 'scale(-1,1) translate(-440,0)' : '');
        }

        function applyWpcSvgSize(stage, sizeId, cfg) {
            if (!stage || !cfg || !cfg.sizes) return;
            const size = cfg.sizes.find(function(s) { return s && s.id === sizeId; }) || cfg.sizes[0];
            const w = (size && size.widthCm) ? size.widthCm : 100;
            const t = (size && size.thicknessCm) ? size.thicknessCm : 4;
            const h = (size && size.heightCm) ? size.heightCm : 210;
            const scaleX = Math.min(1.12, Math.max(0.84, (w / 95)));
            const scaleY = Math.min(1.08, Math.max(0.9, (h / 230)));
            const scale = (scaleX + scaleY) / 2;
            stage.style.setProperty('--door-size-scale', String(scale));
            stage.style.setProperty('--door-size-scale-x', String(scaleX));
            stage.style.setProperty('--door-size-scale-y', String(scaleY));
            stage.style.setProperty('--door-thickness-cm', String(t));
            stage.setAttribute('data-size', sizeId || '');
            const specH = stage.querySelector('.door-size-dim');
            if (specH) specH.textContent = w + '×' + t + '×' + h;
        }

        function applyWpcSvgLock(svg, lockId) {
            if (!svg) return;
            const lockY = lockId === 'multipoint' ? 420 : 436;
            svg.querySelectorAll('#wpcSvgLeafA circle').forEach(function(c) {
                c.setAttribute('cy', String(lockY));
                c.setAttribute('r', lockId === 'smart' ? '5' : '7');
            });
        }

        function applyWpcSvgHardware(svg, hardwareId) {
            if (!svg) return;
            const hw = hardwareId || 'lever-black';
            ['wpcSvgHandleA', 'wpcSvgHandleB', 'wpcSvgHandleB2'].forEach(function(id) {
                const host = document.getElementById(id);
                if (!host) return;
                host.querySelectorAll('[class*="wpc-hw-"]').forEach(function(g) {
                    g.setAttribute('opacity', g.classList.contains('wpc-hw-' + hw) ? '1' : '0');
                });
            });
        }

        function applyWpcSvgMechanism(stage, svg, state) {
            if (!svg || !state) return;
            const sidelite = document.getElementById('wpcSvgSidelite');
            const leafA = document.getElementById('wpcSvgLeafA');
            const leafB = document.getElementById('wpcSvgLeafB');
            const leafB2 = document.getElementById('wpcSvgLeafB2');
            const slidingB = document.getElementById('wpcSvgSlidingLeafB');
            const faceA = document.getElementById('wpcSvgFaceA');
            const hingesA = document.getElementById('wpcSvgHingesA');
            const isDouble = state.isDouble;
            const isSliding = state.isSliding;
            const isGlass = state.surface === 'full-glass' || state.surface === 'u-glass';
            if (sidelite) sidelite.setAttribute('opacity', state.surface === 'full-glass' && state.glassLayout === 'full' ? '0.6' : '0');
            if (leafB) leafB.setAttribute('opacity', '0');
            if (leafB2) leafB2.setAttribute('opacity', '0');
            if (slidingB) slidingB.setAttribute('opacity', '0');
            if (hingesA) hingesA.setAttribute('opacity', isSliding ? '0' : '1');
            if (faceA) {
                if (isSliding && isDouble) {
                    faceA.setAttribute('x', '96');
                    faceA.setAttribute('width', '118');
                    if (slidingB) slidingB.setAttribute('opacity', '1');
                } else if (isSliding) {
                    faceA.setAttribute('x', '72');
                    faceA.setAttribute('width', '220');
                } else if (isDouble) {
                    faceA.setAttribute('x', '48');
                    faceA.setAttribute('width', '168');
                    if (leafB2) leafB2.setAttribute('opacity', '1');
                } else {
                    faceA.setAttribute('x', '96');
                    faceA.setAttribute('width', '248');
                }
            }
            if (leafA) {
                if (isSliding && isDouble) leafA.setAttribute('transform', 'translate(-6,0)');
                else if (isSliding) leafA.setAttribute('transform', 'translate(-10,0)');
                else leafA.setAttribute('transform', '');
            }
            if (stage) {
                stage.classList.toggle('wpc-door-stage--double', isDouble && !isSliding);
                stage.classList.toggle('wpc-door-stage--leaf-single', !isDouble);
                stage.classList.toggle('wpc-door-stage--leaf-double', isDouble);
                stage.classList.toggle('wpc-door-stage--sliding', isSliding);
                stage.classList.toggle('wpc-door-stage--sliding-2', isSliding && isDouble);
                stage.classList.toggle('wpc-door-stage--glass', isGlass);
            }
            const mullion = document.getElementById('wpc-door-center-mullion');
            if (mullion) mullion.classList.toggle('is-visible', isDouble && !isSliding);
            const handleA = document.getElementById('wpcSvgHandleA');
            if (handleA && isSliding) {
                handleA.setAttribute('transform', isDouble ? 'translate(200,408)' : 'translate(272,408)');
            } else if (handleA) {
                handleA.setAttribute('transform', 'translate(292,408)');
            }
            if (document.getElementById('wpcSvgHandleB2')) {
                document.getElementById('wpcSvgHandleB2').setAttribute('opacity', (isDouble && !isSliding) ? '1' : '0');
            }
            if (document.getElementById('wpcSvgHandleB')) {
                document.getElementById('wpcSvgHandleB').setAttribute('opacity', '0');
            }
        }

        function applyWpcSvgDoorType(stage, svg, type) {
            applyWpcSvgMechanism(stage, svg, {
                isSliding: type === 'sliding',
                isDouble: type === 'double',
                surface: type === 'glass' ? 'full-glass' : 'flat',
                glassLayout: 'strip-tall'
            });
        }

        function updateDoorDesignerPreview(root) {
            const cfg = ensureDoorDesignerConfig();
            const lang = currentLang || 'ar';
            const ui = siteText[lang] || siteText.ar;
            function pick(group) { return getDoorDesignerPick(root, group); }
            function pickLabel(group) {
                if (!root) return '';
                const active = root.querySelector('.is-active[data-door-group="' + group + '"]');
                if (!active) return '';
                const nameEl = active.querySelector('.door-designer-type-card-label, .door-designer-model-card-label, .door-color-swatch-label, .door-color-swatch-name');
                return (nameEl ? nameEl.textContent : active.textContent).trim();
            }
            const state = root ? resolveDoorDesignerState(root) : null;
            const colorBtn = root ? root.querySelector('.is-active[data-door-group="color"]') : null;
            const code = colorBtn ? (colorBtn.getAttribute('data-door-code') || '') : '';
            const colorName = colorBtn ? (colorBtn.querySelector('.door-color-swatch-name') || {}).textContent || '' : '';
            const summaryEl = document.getElementById('door-designer-summary');
            if (summaryEl && state) {
                summaryEl.innerHTML = '<dl class="door-summary-dl">' +
                    '<div><dt>' + escapeHtmlAttr(ui.doorDesignerTypeLabel || 'نوع الباب') + '</dt><dd>' + escapeHtmlAttr(pickLabel('type')) + '</dd></div>' +
                    '<div><dt>' + escapeHtmlAttr(ui.doorDesignerSubModelLabel || 'نموذج الباب') + '</dt><dd>' + escapeHtmlAttr(pickLabel('model')) + '</dd></div>' +
                    '<div><dt>' + escapeHtmlAttr(ui.doorDesignerShapeLabel || 'الديكور الخارجي') + '</dt><dd>' + escapeHtmlAttr(pickLabel('outerShape')) + '</dd></div>' +
                    '<div><dt>' + escapeHtmlAttr(ui.doorDesignerDecorLabel || 'التكسية العلوية') + '</dt><dd>' + escapeHtmlAttr(pickLabel('decor')) + '</dd></div>' +
                    '<div><dt>' + escapeHtmlAttr(ui.doorDesignerLeafSizeLabel || 'مقاس الضلفة') + '</dt><dd>' + escapeHtmlAttr(pickLabel('size')) + '</dd></div>' +
                    '<div><dt>' + escapeHtmlAttr(ui.doorDesignerRollLabel || 'رولّة اللون') + '</dt><dd>' + escapeHtmlAttr(code + (colorName ? ' — ' + colorName : '')) + '</dd></div>' +
                    '</dl>';
            }
            if (!isDoorDesignerPreviewEnabled(cfg)) {
                if (root) syncDoorDesignerOptionStates(root);
                return;
            }
            const stage = document.getElementById('door-3d-preview');
            if (!stage || !root) return;

            const colorBtnEarly = root.querySelector('.is-active[data-door-group="color"]');
            const hexEarly = colorBtnEarly ? (colorBtnEarly.getAttribute('data-door-hex') || '#f0ebe3') : '#f0ebe3';
            const texEarly = colorBtnEarly ? colorBtnEarly.getAttribute('data-door-texture') : '';
            const catIdxEarly = colorBtnEarly ? parseInt(colorBtnEarly.getAttribute('data-door-catalog-index'), 10) : 0;
            const swatchUrlEarly = resolveDoorRollTextureUrl(texEarly || (colorBtnEarly && colorBtnEarly.getAttribute('data-door-is-roll') === '1' ? getRollSwatchImageUrl(isNaN(catIdxEarly) ? 0 : catIdxEarly) : ''));

            if (isDoorDesignerStudioLiveMode(cfg)) {
                paintDoorDesignerLivePreview(root, stage, cfg, state, ui);
                const tt = document.getElementById('wpc-door-turntable');
                if (!tt || tt.dataset.turntableBound !== '1') bindDoorDesignerTurntable();
                return;
            }

            if (isDoorDesignerCompositorMode(cfg) && isDoorDesignerCompositorReady()) {
                const viewport = document.getElementById('nebras-door-compositor-viewport');
                if (viewport) {
                    if (!NebrasDoorCompositor.isMounted(viewport)) {
                        if (NebrasDoorCompositor.mount(viewport)) {
                            const loading = document.getElementById('nebras-door-compositor-loading');
                            if (loading) loading.remove();
                            const badge = document.getElementById('nebras-door-compositor-badge');
                            if (badge) badge.hidden = false;
                        }
                    }
                    NebrasDoorCompositor.update({
                        state: state,
                        manifest: getDoorDesignerLayerManifest(cfg),
                        color: { hex: hexEarly, textureUrl: swatchUrlEarly, catalogIndex: isNaN(catIdxEarly) ? 0 : catIdxEarly }
                    });
                }
                stage.classList.add('wpc-door-stage--engine-compositor');
                syncDoorDesignerOptionStates(root);
                const rollSuffixC = colorBtnEarly && colorBtnEarly.getAttribute('data-door-is-roll') === '1' ? (' (' + (ui.doorDesignerRollTag || 'رولّة') + ')') : '';
                const codeC = colorBtnEarly ? (colorBtnEarly.getAttribute('data-door-code') || '') : '';
                const colorNameC = colorBtnEarly ? (colorBtnEarly.querySelector('.door-color-swatch-name') || {}).textContent || '' : '';
                const labelElC = document.getElementById('door-active-color-label');
                if (labelElC) labelElC.textContent = codeC ? (codeC + ' — ' + colorNameC + rollSuffixC) : colorNameC;
                const specElC = document.getElementById('door-spec-label');
                if (specElC) {
                    const sizeObjC = (cfg.sizes || []).find(function(s) { return s && s.id === (state.size || pick('size')); }) || null;
                    const sizeDimC = sizeObjC ? [sizeObjC.widthCm, sizeObjC.thicknessCm, sizeObjC.heightCm].filter(Boolean).join('×') + ' سم' : pickLabel('size');
                    const partsC = [pickLabel('type'), pickLabel('model'), pickLabel('outerShape'), state.decor === 'transom' ? pickLabel('decor') : '', sizeDimC].filter(Boolean);
                    specElC.textContent = partsC.join(' · ');
                }
                return;
            }
            if (isDoorDesignerCompositorMode(cfg) && !isDoorDesignerCompositorReady()) {
                stage.classList.add('wpc-door-stage--engine-compositor');
                syncDoorDesignerOptionStates(root);
                tryMountDoorDesignerCompositor(root);
                return;
            }

            if (isDoorDesigner3dMode(cfg) && isDoorDesigner3dEngineReady()) {
                const viewport = document.getElementById('nebras-door-3d-viewport');
                if (viewport) {
                    if (!NebrasDoor3D.isMounted(viewport)) {
                        if (NebrasDoor3D.mount(viewport)) {
                            const loading = document.getElementById('nebras-door-3d-loading');
                            if (loading) loading.remove();
                            showDoorDesigner3dReadyBadge();
                        }
                    }
                    const sizePick = state.size || pick('size');
                    const sizeObj = (cfg.sizes || []).find(function(s) { return s && s.id === sizePick; }) || null;
                    NebrasDoor3D.update({
                        state: state,
                        color: { hex: hexEarly, textureUrl: swatchUrlEarly, catalogIndex: isNaN(catIdxEarly) ? 0 : catIdxEarly },
                        size: sizeObj
                    });
                }
                stage.classList.add('wpc-door-stage--engine-3d');
                syncDoorDesignerOptionStates(root);
                const rollSuffix3d = colorBtnEarly && colorBtnEarly.getAttribute('data-door-is-roll') === '1' ? (' (' + (ui.doorDesignerRollTag || 'رولّة') + ')') : '';
                const code3d = colorBtnEarly ? (colorBtnEarly.getAttribute('data-door-code') || '') : '';
                const colorName3d = colorBtnEarly ? (colorBtnEarly.querySelector('.door-color-swatch-name') || {}).textContent || '' : '';
                const labelEl3d = document.getElementById('door-active-color-label');
                if (labelEl3d) labelEl3d.textContent = code3d ? (code3d + ' — ' + colorName3d + rollSuffix3d) : colorName3d;
                const specEl3d = document.getElementById('door-spec-label');
                if (specEl3d) {
                    const sizeObj3d = (cfg.sizes || []).find(function(s) { return s && s.id === (state.size || pick('size')); }) || null;
                    const sizeDim3d = sizeObj3d ? [sizeObj3d.widthCm, sizeObj3d.thicknessCm, sizeObj3d.heightCm].filter(Boolean).join('×') + ' سم' : pickLabel('size');
                    const parts3d = [pickLabel('type'), pickLabel('model'), pickLabel('outerShape'), state.decor === 'transom' ? pickLabel('decor') : '', sizeDim3d].filter(Boolean);
                    specEl3d.textContent = parts3d.join(' · ');
                }
                return;
            }
            if (isDoorDesigner3dMode(cfg) && !isDoorDesigner3dEngineReady()) {
                stage.classList.add('wpc-door-stage--engine-3d');
                syncDoorDesignerOptionStates(root);
                tryMountDoorDesigner3d(root, 0);
                return;
            }

            stage.classList.add('wpc-door-stage--dynamic-render');
            const frame = state.frame;
            const outerShape = state.outerShape;
            const decor = state.decor;
            const glassPattern = state.glassPattern;
            const opening = state.opening;
            const size = state.size || pick('size');
            const lock = state.lock;
            let hardware = state.hardware;
            if (state.isSliding && hardware.indexOf('pull') === -1 && hardware.indexOf('lever') !== -1) {
                hardware = 'pull-inox';
            }
            const hex = colorBtn ? (colorBtn.getAttribute('data-door-hex') || '#f0ebe3') : '#f0ebe3';
            const tex = colorBtn ? colorBtn.getAttribute('data-door-texture') : '';
            const isRoll = colorBtn ? colorBtn.getAttribute('data-door-is-roll') === '1' : true;
            const catalogIndex = colorBtn ? parseInt(colorBtn.getAttribute('data-door-catalog-index'), 10) : 0;
            const swatchUrl = resolveDoorRollTextureUrl(tex || (isRoll ? getRollSwatchImageUrl(isNaN(catalogIndex) ? 0 : catalogIndex) : ''));
            const svg = document.getElementById('wpc-door-svg-root');
            const styleKey = (state.surface === 'u-plain' || state.surface === 'u-slats' || state.surface === 'u-glass') ? 'slats' : 'normal';
            applyWpcSvgDoorColor(stage, hex, tex, styleKey, { isRoll: isRoll, catalogIndex: isNaN(catalogIndex) ? 0 : catalogIndex });
            applyWpcSvgDoorSurface(svg, state);
            applyWpcSvgHardware(svg, hardware);
            applyWpcSvgMechanism(stage, svg, state);
            applyWpcSvgModelProfile(stage, state);
            applyWpcSvgOuterShape(stage, svg, outerShape);
            applyWpcSvgFrameStyle(stage, svg, frame);
            applyWpcSvgModel(stage, state.surface === 'flat' ? 'plain' : 'frame');
            applyWpcSvgDecor(svg, decor, state.isSliding);
            applyWpcSvgGlassPattern(svg, glassPattern, state.surface === 'full-glass' || state.surface === 'u-glass');
            if (!state.isSliding) applyWpcSvgOpening(stage, svg, opening);
            applyWpcSvgSize(stage, size, cfg);
            applyWpcSvgLock(svg, lock);
            applyDoorLeafMask(stage, decor);
            applyWpcStudioVisualLayers(stage, state, swatchUrl);
            syncDoorDesignerOptionStates(root);
            const rollSuffix = isRoll ? (' (' + (ui.doorDesignerRollTag || 'رولّة') + ')') : '';
            const labelEl = document.getElementById('door-active-color-label');
            if (labelEl) labelEl.textContent = code ? (code + ' — ' + colorName + rollSuffix) : colorName;
            const specEl = document.getElementById('door-spec-label');
            if (specEl) {
                const sizeObj = (cfg.sizes || []).find(function(s) { return s && s.id === size; }) || null;
                const sizeDim = sizeObj ? [sizeObj.widthCm, sizeObj.thicknessCm, sizeObj.heightCm].filter(Boolean).join('×') + ' سم' : pickLabel('size');
                const parts = [
                    pickLabel('type'),
                    pickLabel('model'),
                    pickLabel('outerShape'),
                    decor === 'transom' ? pickLabel('decor') : '',
                    sizeDim
                ].filter(Boolean);
                specEl.textContent = parts.join(' · ');
            }
        }

        async function openDoorDesignerAdmin() {
            if (!requirePermission('content', 'صلاحية المحتوى مطلوبة لإعداد مصمم الأبواب.')) return;
            ensureDoorDesignerConfig();
            const cfg = systemSettings.doorDesigner;
            const cmd = prompt(
                'إعداد «صمّم بابك مع نبراس»\n' +
                '1 = تفعيل/تعطيل\n2 = نص المقدمة (عربي)\n3 = خلفية الاستوديو (رفع)\n4 = صورة باب اختيارية (رفع)\n5 = إضافة لون (كود NEBR-x)\n6 = حذف لون بالترتيب\n7 = استعادة كتالوج 20 لون\n8 = إضافة نوع باب\n9 = إضافة مقبض/قطاع\nEnter = إغلاق',
                '1'
            );
            if (cmd === null || cmd === '') return;
            if (cmd === '1') {
                cfg.enabled = !cfg.enabled;
                alert(cfg.enabled ? 'تم تفعيل المصمم للزوار.' : 'تم تعطيل المصمم.');
            } else if (cmd === '2') {
                const t = prompt('مقدمة المصمم (عربي):', cfg.introAr || '');
                if (t !== null) {
                    cfg.introAr = t.trim();
                    cfg.introEn = t.trim();
                }
            } else if (cmd === '3') {
                pickMediaPath({ label: 'خلفية استوديو التصميم', defaultValue: cfg.sceneBackgroundUrl || cfg.previewImageUrl || '' }).then(function(url) {
                    if (url) {
                        cfg.sceneBackgroundUrl = url;
                        cfg.previewImageUrl = url;
                    }
                    saveContentData();
                    alert('تم حفظ خلفية الاستوديو.');
                });
                return;
            } else if (cmd === '4') {
                pickMediaPath({ label: 'صورة باب واقعية (اختياري)', defaultValue: cfg.doorBaseImageUrl || '' }).then(function(url) {
                    cfg.doorBaseImageUrl = url || '';
                    saveContentData();
                    alert('تم حفظ صورة الباب.');
                });
                return;
            } else if (cmd === '5') {
                const code = prompt('كود اللون (مثل NEBR-22):', 'NEBR-' + (cfg.colors.length + 1));
                const labelAr = prompt('اسم اللون (عربي):');
                const hex = prompt('كود HEX (#ffffff):', '#ffffff');
                if (code && labelAr && hex) {
                    cfg.colors.push({
                        id: 'color-' + Date.now(),
                        code: code.trim(),
                        labelAr: labelAr.trim(),
                        labelEn: labelAr.trim(),
                        hex: hex.trim(),
                        textureUrl: ''
                    });
                    const upTex = confirm('رفع ملمس/صورة للون؟');
                    if (upTex) {
                        pickMediaPath({ label: 'ملمس اللون ' + code, defaultValue: '' }).then(function(texUrl) {
                            if (texUrl) cfg.colors[cfg.colors.length - 1].textureUrl = texUrl;
                            saveContentData();
                        });
                        return;
                    }
                }
            } else if (cmd === '6') {
                const idx = parseInt(prompt('رقم اللون للحذف (1 = أول لون):', '1'), 10);
                if (idx >= 1 && idx <= cfg.colors.length) cfg.colors.splice(idx - 1, 1);
            } else if (cmd === '7') {
                if (confirm('استعادة كتالوج نبراس (NEBR-1..21 بدون NEBR-12 — 20 رولّة)؟')) {
                    cfg.colors = getNebrasDoorCatalogColors().map(function(c) { return Object.assign({}, c); });
                }
            } else if (cmd === '8') {
                const labelAr = prompt('نوع الباب (عربي):');
                if (labelAr) cfg.types.push({ id: 'type-' + Date.now(), labelAr: labelAr.trim(), labelEn: labelAr.trim() });
            } else if (cmd === '9') {
                const labelAr = prompt('اسم المقبض أو القطاع (عربي):');
                if (labelAr) {
                    if (!cfg.hardware) cfg.hardware = [];
                    cfg.hardware.push({ id: 'hw-' + Date.now(), labelAr: labelAr.trim(), labelEn: labelAr.trim() });
                }
            }
            saveContentData();
            addAuditLog('مصمم أبواب WPC', 'تحديث إعدادات المصمم');
            alert('تم حفظ إعدادات مصمم الأبواب.');
        }

        let brandIntroTimer = null;
        let brandIntroFailsafeTimer = null;
        let brandIntroAudioRetryTimers = [];
        let brandIntroWelcomePrepared = false;
        let brandIntroAudioRetryCount = 0;
        let brandIntroGestureBound = false;
        let brandIntroFinishLocked = false;
        let brandIntroPlaybackStarted = false;
        let brandIntroWelcomeBlobFetching = false;
        let brandIntroAudioWatchdog = null;
        let nebrasWebAudioCtx = null;
        let nebrasAudioEngineUnlocked = false;
        const BRAND_INTRO_WELCOME_AUDIO_SEC = 22;
        const BRAND_INTRO_WELCOME_MS = BRAND_INTRO_WELCOME_AUDIO_SEC * 1000;
        const BRAND_INTRO_SHORT_MS = 2800;
        const BRAND_INTRO_SHORT_FAILSAFE_MS = 5500;
        const BRAND_INTRO_WELCOME_SRC = 'audio/nebras-welcome.mp3';
        const NEBRAS_SILENT_AUDIO_SRC = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

        function prefersReducedMotionIntro() {
            try {
                return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            } catch (e) {
                return false;
            }
        }

        function getBrandIntroWelcomeAudio() {
            return document.getElementById('nebras-brand-intro-audio');
        }

        function isBrandIntroVisible() {
            const intro = document.getElementById('nebras-brand-intro');
            return !!(intro && !intro.hidden && document.body.classList.contains('nebras-intro-active'));
        }

        function isDoorDesignerWorkspaceActive() {
            return !!(nebrasWorkspaceState.active && nebrasWorkspaceState.route && nebrasWorkspaceState.route.view === 'door-designer');
        }

        function isNebrasWelcomeAudioActive() {
            return isDoorDesignerWorkspaceActive();
        }

        function clearBrandIntroAudioRetries() {
            brandIntroAudioRetryTimers.forEach(function(t) { clearTimeout(t); });
            brandIntroAudioRetryTimers = [];
            brandIntroAudioRetryCount = 0;
        }

        function clearBrandIntroDismissTimers() {
            if (brandIntroTimer) {
                clearTimeout(brandIntroTimer);
                brandIntroTimer = null;
            }
            if (brandIntroFailsafeTimer) {
                clearTimeout(brandIntroFailsafeTimer);
                brandIntroFailsafeTimer = null;
            }
        }

        function syncBrandIntroProgressToPlayback() {
            const bar = document.querySelector('.nebras-brand-intro--with-welcome .nebras-brand-intro-progress span');
            if (!bar) return;
            bar.style.animation = 'none';
            void bar.offsetWidth;
            bar.style.animation = 'nebrasWelcomeProgress ' + BRAND_INTRO_WELCOME_AUDIO_SEC + 's linear forwards';
        }

        function scheduleBrandIntroDismissAfterWelcome() {
            clearBrandIntroDismissTimers();
            const audio = getBrandIntroWelcomeAudio();
            let remainingMs = BRAND_INTRO_WELCOME_MS;
            if (audio && !isNaN(audio.currentTime)) {
                remainingMs = Math.max(0, (BRAND_INTRO_WELCOME_AUDIO_SEC - audio.currentTime) * 1000);
            }
            brandIntroTimer = setTimeout(finishBrandIntroWelcomeSequence, Math.ceil(remainingMs) + 120);
            brandIntroFailsafeTimer = setTimeout(finishBrandIntroWelcomeSequence, BRAND_INTRO_WELCOME_MS + 3500);
        }

        function wireBrandIntroWelcomeAudioEvents(audio) {
            if (!audio) return;
            audio.ontimeupdate = function() {
                if (audio.currentTime >= BRAND_INTRO_WELCOME_AUDIO_SEC - 0.08) {
                    stopBrandIntroWelcomeAudio();
                }
            };
            audio.onended = function() {
                stopBrandIntroWelcomeAudio();
            };
        }

        function onBrandIntroWelcomePlaybackStarted() {
            if (brandIntroPlaybackStarted) return;
            brandIntroPlaybackStarted = true;
        }

        function primeBrandIntroWelcomeAudioBlob() {
            if (brandIntroWelcomeBlobFetching || typeof fetch !== 'function') return;
            brandIntroWelcomeBlobFetching = true;
            fetch(BRAND_INTRO_WELCOME_SRC, { cache: 'force-cache' }).catch(function() { /* warm cache only */ }).finally(function() {
                brandIntroWelcomeBlobFetching = false;
            });
        }

        function whenWelcomeAudioReady(callback) {
            const audio = getBrandIntroWelcomeAudio();
            if (!audio || typeof callback !== 'function') return;
            if (audio.readyState >= 2) {
                callback();
                return;
            }
            let done = false;
            function finish() {
                if (done) return;
                done = true;
                audio.removeEventListener('canplay', finish);
                audio.removeEventListener('loadeddata', finish);
                callback();
            }
            audio.addEventListener('canplay', finish, { passive: true });
            audio.addEventListener('loadeddata', finish, { passive: true });
            setTimeout(finish, 2800);
            try {
                if (typeof audio.load === 'function' && audio.readyState === 0) audio.load();
            } catch (loadErr) { /* ignore */ }
        }

        function resumeNebrasWebAudioContext() {
            try {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return Promise.resolve();
                if (!nebrasWebAudioCtx) nebrasWebAudioCtx = new AC();
                if (nebrasWebAudioCtx.state === 'suspended') return nebrasWebAudioCtx.resume();
            } catch (ctxErr) { /* ignore */ }
            return Promise.resolve();
        }

        function runWelcomeAudioPlay(fromUserGesture) {
            const audio = getBrandIntroWelcomeAudio();
            if (!audio || !isNebrasWelcomeAudioActive() || prefersReducedMotionIntro()) return;

            function onPlaySuccess() {
                clearBrandIntroAudioRetries();
                stopBrandIntroAudioWatchdog();
                nebrasAudioEngineUnlocked = true;
                try { sessionStorage.setItem('nebrasAudioUnlocked', '1'); } catch (e) { /* ignore */ }
                onBrandIntroWelcomePlaybackStarted();
            }

            function playAudible() {
                try {
                    audio.muted = false;
                    audio.volume = 1;
                    if (audio.currentTime >= BRAND_INTRO_WELCOME_AUDIO_SEC) audio.currentTime = 0;
                    const playPromise = audio.play();
                    if (playPromise && typeof playPromise.then === 'function') {
                        return playPromise.then(onPlaySuccess);
                    }
                    onPlaySuccess();
                    return Promise.resolve();
                } catch (playErr) {
                    return Promise.reject(playErr);
                }
            }

            function playViaMutedPrime() {
                try {
                    audio.muted = true;
                    audio.volume = 0.001;
                    if (audio.currentTime >= BRAND_INTRO_WELCOME_AUDIO_SEC) audio.currentTime = 0;
                    return audio.play().then(function() {
                        audio.muted = false;
                        audio.volume = 1;
                        if (audio.paused) return playAudible();
                        onPlaySuccess();
                        return Promise.resolve();
                    });
                } catch (mutedErr) {
                    return Promise.reject(mutedErr);
                }
            }

            function attemptChain() {
                if (fromUserGesture) {
                    return playAudible();
                }
                return playViaMutedPrime()
                    .catch(function() {
                        return unlockNebrasAudioEngine().then(playAudible);
                    });
            }

            resumeNebrasWebAudioContext()
                .then(function() { return attemptChain(); })
                .catch(queueBrandIntroWelcomeRetry);
        }

        function stopBrandIntroAudioWatchdog() {
            if (brandIntroAudioWatchdog) {
                clearInterval(brandIntroAudioWatchdog);
                brandIntroAudioWatchdog = null;
            }
        }

        function startBrandIntroAudioWatchdog() {
            stopBrandIntroAudioWatchdog();
            brandIntroAudioWatchdog = setInterval(function() {
                if (!isNebrasWelcomeAudioActive()) {
                    stopBrandIntroAudioWatchdog();
                    return;
                }
                const audio = getBrandIntroWelcomeAudio();
                if (!audio) return;
                if (!audio.paused && !audio.muted && audio.currentTime > 0.05 && audio.currentTime < BRAND_INTRO_WELCOME_AUDIO_SEC) {
                    onBrandIntroWelcomePlaybackStarted();
                    stopBrandIntroAudioWatchdog();
                    return;
                }
                if (!brandIntroPlaybackStarted || audio.paused || audio.muted) {
                    tryPlayBrandIntroWelcome(false);
                }
            }, 650);
        }

        function unlockNebrasAudioEngine() {
            if (nebrasAudioEngineUnlocked) return Promise.resolve(true);
            return new Promise(function(resolve) {
                try {
                    if (sessionStorage.getItem('nebrasAudioUnlocked') === '1') {
                        nebrasAudioEngineUnlocked = true;
                        resolve(true);
                        return;
                    }
                } catch (sessErr) { /* ignore */ }
                const silent = new Audio(NEBRAS_SILENT_AUDIO_SRC);
                silent.volume = 0.001;
                silent.muted = true;
                silent.setAttribute('playsinline', '');
                silent.setAttribute('webkit-playsinline', 'true');
                const playPromise = silent.play();
                if (!playPromise || typeof playPromise.then !== 'function') {
                    resolve(false);
                    return;
                }
                playPromise.then(function() {
                    nebrasAudioEngineUnlocked = true;
                    try { sessionStorage.setItem('nebrasAudioUnlocked', '1'); } catch (e) { /* ignore */ }
                    try { silent.pause(); } catch (pErr) { /* ignore */ }
                    resolve(true);
                }).catch(function() {
                    resolve(false);
                });
            });
        }

        function prepareBrandIntroWelcomeAudio() {
            if (brandIntroWelcomePrepared || prefersReducedMotionIntro()) return;
            const audio = getBrandIntroWelcomeAudio();
            if (!audio) return;
            brandIntroWelcomePrepared = true;
            wireBrandIntroWelcomeAudioEvents(audio);
            try {
                if (!audio.getAttribute('src')) audio.setAttribute('src', BRAND_INTRO_WELCOME_SRC);
                if (!audio.src || audio.src.indexOf('nebras-welcome') < 0) {
                    audio.src = BRAND_INTRO_WELCOME_SRC;
                }
                audio.setAttribute('playsinline', '');
                audio.setAttribute('webkit-playsinline', 'true');
                audio.preload = 'auto';
                if (!brandIntroPlaybackStarted && audio.paused && audio.currentTime < 0.05) {
                    audio.pause();
                    audio.currentTime = 0;
                }
                if (audio.paused) {
                    audio.muted = false;
                    audio.volume = 1;
                }
            } catch (prepErr) { /* ignore */ }
            if (!audio._nebrasCanPlayBound) {
                audio._nebrasCanPlayBound = true;
                audio.addEventListener('canplaythrough', function() {
                    if (isNebrasWelcomeAudioActive()) tryPlayBrandIntroWelcome(false);
                }, { passive: true });
                audio.addEventListener('loadeddata', function() {
                    if (isNebrasWelcomeAudioActive()) tryPlayBrandIntroWelcome(false);
                }, { passive: true });
            }
        }

        function stopBrandIntroWelcomeAudio() {
            clearBrandIntroAudioRetries();
            stopBrandIntroAudioWatchdog();
            brandIntroWelcomePrepared = false;
            brandIntroPlaybackStarted = false;
            brandIntroFinishLocked = false;
            const audio = getBrandIntroWelcomeAudio();
            if (!audio) return;
            audio.ontimeupdate = null;
            audio.onended = null;
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch (e) { /* ignore */ }
        }

        function tryPlayBrandIntroWelcome(fromUserGesture) {
            if (!isNebrasWelcomeAudioActive() || prefersReducedMotionIntro()) return;
            const audio = getBrandIntroWelcomeAudio();
            if (!brandIntroWelcomePrepared) prepareBrandIntroWelcomeAudio();
            if (audio && !audio.paused && audio.currentTime > 0.05 && audio.currentTime < BRAND_INTRO_WELCOME_AUDIO_SEC) {
                onBrandIntroWelcomePlaybackStarted();
                return;
            }
            if (brandIntroPlaybackStarted && !fromUserGesture) return;
            if (fromUserGesture) {
                runWelcomeAudioPlay(true);
                return;
            }
            whenWelcomeAudioReady(function() {
                runWelcomeAudioPlay(false);
            });
        }

        function queueBrandIntroWelcomeRetry() {
            if (brandIntroAudioRetryCount >= 16 || !isNebrasWelcomeAudioActive()) return;
            brandIntroAudioRetryCount += 1;
            const retryMs = 40 + brandIntroAudioRetryCount * 70;
            brandIntroAudioRetryTimers.push(setTimeout(function() {
                tryPlayBrandIntroWelcome(false);
            }, retryMs));
        }

        function playBrandIntroWelcomeSync() {
            tryPlayBrandIntroWelcome(true);
        }

        function bindBrandIntroWelcomeGestures() {
            if (brandIntroGestureBound) return;
            brandIntroGestureBound = true;
            function onUserGesture() {
                if (!isNebrasWelcomeAudioActive()) return;
                resumeNebrasWebAudioContext().then(function() {
                    tryPlayBrandIntroWelcome(true);
                });
            }
            const opts = { capture: true, passive: true };
            ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(function(ev) {
                document.addEventListener(ev, onUserGesture, opts);
            });
            const intro = document.getElementById('nebras-brand-intro');
            if (intro) {
                intro.addEventListener('pointerdown', onUserGesture, opts);
                intro.addEventListener('touchstart', onUserGesture, opts);
                intro.addEventListener('click', onUserGesture, opts);
            }
            document.addEventListener('visibilitychange', function() {
                if (!isNebrasWelcomeAudioActive() || document.visibilityState !== 'visible') return;
                tryPlayBrandIntroWelcome(false);
            }, { passive: true });
        }

        function kickNebrasWelcomeAudioInline() {
            const audio = getBrandIntroWelcomeAudio();
            if (!audio) return;
            try {
                audio.setAttribute('playsinline', '');
                audio.setAttribute('webkit-playsinline', 'true');
                audio.preload = 'auto';
                audio.volume = 1;
                if (audio.currentTime >= BRAND_INTRO_WELCOME_AUDIO_SEC) audio.currentTime = 0;
                audio.muted = true;
                const p = audio.play();
                if (p && typeof p.then === 'function') {
                    p.then(function() {
                        audio.muted = false;
                        audio.volume = 1;
                        if (audio.paused) return audio.play();
                    }).catch(function() { audio.muted = false; });
                } else {
                    audio.muted = false;
                }
            } catch (e) { audio.muted = false; }
        }

        function startDoorDesignerWelcomeAudio() {
            if (prefersReducedMotionIntro() || !isDoorDesignerWorkspaceActive()) return;
            brandIntroAudioRetryCount = 0;
            brandIntroWelcomePrepared = false;
            stopBrandIntroWelcomeAudio();
            bindBrandIntroWelcomeGestures();
            prepareBrandIntroWelcomeAudio();
            kickNebrasWelcomeAudioInline();
            tryPlayBrandIntroWelcome(false);
            startBrandIntroAudioWatchdog();
            [80, 250, 600, 1200].forEach(function(delay) {
                brandIntroAudioRetryTimers.push(setTimeout(function() {
                    tryPlayBrandIntroWelcome(false);
                }, delay));
            });
            resumeNebrasWebAudioContext().then(function() {
                tryPlayBrandIntroWelcome(false);
            });
        }

        let nebrasWelcomeAudioPrimed = false;

        function initNebrasWelcomeAudioEarly() {
            if (nebrasWelcomeAudioPrimed) return;
            const audio = getBrandIntroWelcomeAudio();
            if (!audio) return;
            nebrasWelcomeAudioPrimed = true;
            try {
                if (!audio.getAttribute('src')) audio.setAttribute('src', BRAND_INTRO_WELCOME_SRC);
                audio.preload = 'auto';
                audio.setAttribute('playsinline', '');
                audio.setAttribute('webkit-playsinline', 'true');
            } catch (earlyErr) { /* ignore */ }
            primeBrandIntroWelcomeAudioBlob();
            unlockNebrasAudioEngine();
            window.__nebrasKickWelcomeAudio = kickNebrasWelcomeAudioInline;
        }

        function startBrandIntroWelcomeAudio() {
            startDoorDesignerWelcomeAudio();
        }

        function dismissBrandIntro() {
            const intro = document.getElementById('nebras-brand-intro');
            if (!intro) return;
            clearBrandIntroDismissTimers();
            stopBrandIntroWelcomeAudio();
            intro.classList.remove('nebras-brand-intro--with-welcome', 'nebras-brand-intro--audio-playing');
            if (intro.hidden && !document.body.classList.contains('nebras-intro-active')) return;
            intro.classList.add('is-leaving');
            document.body.classList.remove('nebras-intro-active');
            try { sessionStorage.setItem('nebrasIntroSeen', '1'); } catch (e) { /* ignore */ }
            setTimeout(function() {
                intro.hidden = true;
                intro.setAttribute('aria-hidden', 'true');
                intro.classList.remove('is-leaving');
                dispatchNebrasIntroFinished();
                completeIntroAndOpenSite();
            }, 520);
        }

        function maybeShowBrandIntro() {
            const intro = document.getElementById('nebras-brand-intro');
            if (intro) {
                intro.hidden = true;
                intro.setAttribute('aria-hidden', 'true');
            }
            document.body.classList.remove('nebras-intro-active');
            try { document.documentElement.classList.remove('nebras-first-visit'); } catch (e) { /* ignore */ }
        }

        function applyDocumentMeta(text) {
            if (!text) return;
            if (text.pageTitle) document.title = text.pageTitle;
            const meta = document.querySelector('meta[name="description"]');
            if (meta && text.pageDescription) meta.setAttribute('content', text.pageDescription);
        }

        function applyAdminOverlayTranslations(text) {
            if (!text) return;
            function setTxt(id, val) {
                const el = document.getElementById(id);
                if (el && val != null) el.textContent = val;
            }
            setTxt('admin-login-title', text.adminLoginTitle);
            setTxt('admin-login-btn', text.adminLoginBtn);
            setTxt('admin-login-cancel', text.adminLoginCancel);
            const userIn = document.getElementById('admin-username');
            const passIn = document.getElementById('admin-password');
            if (userIn) userIn.placeholder = text.adminLoginUserPh || '';
            if (passIn) passIn.placeholder = text.adminLoginPassPh || '';
            const secLink = document.getElementById('admin-account-security-link');
            if (secLink) {
                const icon = secLink.querySelector('i');
                secLink.textContent = '';
                if (icon) secLink.appendChild(icon);
                secLink.appendChild(document.createTextNode(' ' + (text.adminAccountSecurity || '')));
            }
        }

        function applyDashboardNavTranslations(text) {
            if (!text) return;
            function setTxt(id, val) {
                const el = document.getElementById(id);
                if (el && val != null) el.textContent = val;
            }
            setTxt('dash-nav-partners', text.dashNavPartners);
            setTxt('dash-nav-ops', text.dashNavOps);
            setTxt('dash-nav-modules', text.dashNavModules);
            setTxt('dash-nav-erp', text.dashNavErp);
            setTxt('dash-nav-platform', text.dashNavPlatform);
            setTxt('dash-nav-content', text.dashNavContent);
            setTxt('dash-nav-settings', text.dashNavSettings);
            setTxt('dashboard-partners-hint', text.dashboardPartnersHint || text.partnersEmptyHintAdmin);
        }

        function applyScmTabTranslations(text) {
            if (!text) return;
            function setTxt(id, val) {
                const el = document.getElementById(id);
                if (el && val != null) el.textContent = val;
            }
            setTxt('scm-tab-products', text.scmTabProducts);
            setTxt('scm-tab-visitor', text.scmTabVisitor);
            setTxt('scm-tab-dashboard', text.scmTabDashboard);
            setTxt('scm-tab-sections', text.scmTabSections);
            setTxt('scm-tab-about', text.scmTabAbout);
            setTxt('scm-tab-partners', text.scmTabPartners);
            setTxt('scm-tab-certifications', text.scmTabCertifications);
        }

        function applyAccessibilityLabels(text) {
            if (!text) return;
            const menuBtn = document.querySelector('.menu-toggle');
            if (menuBtn) menuBtn.setAttribute('aria-label', text.menuToggleAria || 'Menu');
            const cartFab = document.getElementById('cart-fab');
            if (cartFab) cartFab.setAttribute('aria-label', text.cartFabAria || '');
            const topCart = document.getElementById('top-open-cart-btn');
            if (topCart) topCart.setAttribute('title', text.topCartAria || '');
            const langBtn = document.getElementById('lang-toggle-btn');
            if (langBtn) langBtn.setAttribute('title', text.langToggleAria || '');
            const wsCart = document.querySelector('#nebras-workspace .workspace-action-btn[onclick="openCartDrawer()"]');
            if (wsCart) wsCart.setAttribute('title', text.workspaceCartTitle || '');
            const iconClose = document.querySelector('#icon-overlay .icon-overlay-actions .secondary');
            if (iconClose && text.iconOverlayClose) iconClose.textContent = text.iconOverlayClose;
            const iconGo = document.getElementById('icon-overlay-go-btn');
            if (iconGo && text.overlayGoSection) iconGo.textContent = text.overlayGoSection;
            const iconShop = document.getElementById('icon-overlay-shop-btn');
            if (iconShop && text.overlayShopBtn) iconShop.textContent = text.overlayShopBtn;
            const lb = document.getElementById('nebras-media-lightbox');
            if (lb) {
                const closeBtn = lb.querySelector('.nebras-lightbox-close');
                const prevBtn = lb.querySelector('.nebras-lightbox-prev');
                const nextBtn = lb.querySelector('.nebras-lightbox-next');
                if (closeBtn) closeBtn.setAttribute('aria-label', text.lightboxCloseAria || 'إغلاق');
                if (prevBtn) prevBtn.setAttribute('aria-label', text.lightboxPrevAria || 'السابق');
                if (nextBtn) nextBtn.setAttribute('aria-label', text.lightboxNextAria || 'التالي');
            }
        }

        function updateAdminRoleLabel(user) {
            if (!user) return;
            const el = document.getElementById('admin-role-name');
            if (!el) return;
            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            const tpl = ui.adminRoleTemplate || 'User: {user} — Role: {role}';
            el.textContent = tpl.replace('{user}', user.username).replace('{role}', user.role);
        }

        function applyOccasionTheme() {
            applyHeroBanner();
            const themeId = getResolvedOccasionThemeId();
            const preset = OCCASION_THEME_PRESETS[themeId] || OCCASION_THEME_PRESETS.default;
            const lang = currentLang || 'ar';
            const root = document.documentElement;
            const body = document.body;
            const dash = document.getElementById('admin-dashboard');
            const isCelebration = themeId !== 'default';

            body.classList.toggle('celebration-active', isCelebration);
            if (dash) dash.classList.toggle('celebration-mode', isCelebration);
            const siteWide = isCelebration && systemSettings.occasionSiteWide !== false;
            root.classList.toggle('celebration-site-wide', siteWide);
            body.classList.toggle('celebration-site-wide-active', siteWide && isCelebration);

            if (!isCelebration) {
                root.classList.remove('celebration-site-wide');
                body.classList.remove('celebration-site-wide-active');
                body.removeAttribute('data-occasion-theme');
                root.style.removeProperty('--occasion-dash-image');
                root.style.removeProperty('--occasion-accent');
                clearCelebrationDecorations();
                applyHeroBanner();
            } else {
                body.setAttribute('data-occasion-theme', themeId);
                const accent = OCCASION_ACCENT_MAP[themeId] || '#d4af37';
                root.style.setProperty('--occasion-accent', accent);
                const dashUrl = cssLocalImageValue(systemSettings.occasionDashboardImageUrl);
                applyHeroBanner();
                if (dashUrl) root.style.setProperty('--occasion-dash-image', dashUrl);
                else root.style.removeProperty('--occasion-dash-image');
                buildCelebrationDecorations(preset);
                if (siteWide) buildPublicCelebrationOverlay(preset);
            }

            const msg = getOccasionRibbonMessage(preset, lang);
            const badge = getOccasionCelebrationBadge(preset, lang);

            const ribbon = document.getElementById('header-occasion-chip');
            const ribbonMsg = document.getElementById('header-occasion-message');
            const ribbonIcon = document.getElementById('header-occasion-icon');
            if (ribbon && ribbonMsg && ribbonIcon) {
                if (isCelebration && msg) {
                    ribbon.hidden = false;
                    ribbonMsg.textContent = msg;
                    ribbonIcon.className = (preset.icon || 'fas fa-star') + ' header-occasion-icon';
                } else {
                    ribbon.hidden = true;
                    ribbonMsg.textContent = '';
                }
            }

            const dashBanner = document.getElementById('dashboard-celebration-banner');
            const dashBannerMsg = document.getElementById('dashboard-celebration-message');
            const dashBannerIcon = document.getElementById('dashboard-celebration-icon');
            const dashBadge = document.getElementById('dashboard-celebration-badge');
            if (dashBanner && dashBannerMsg && dashBannerIcon) {
                if (isCelebration && msg) {
                    dashBanner.hidden = false;
                    dashBannerMsg.textContent = msg;
                    dashBannerIcon.className = (preset.icon || 'fas fa-star');
                    if (dashBadge) dashBadge.textContent = badge;
                } else {
                    dashBanner.hidden = true;
                    dashBannerMsg.textContent = '';
                }
            }

            updateOccasionPreviewStrip('setting-occasion-preview', themeId);
            updateOccasionPreviewStrip('dashboard-occasion-preview', themeId);
            renderDashboardOccasionStatus();
            renderOccasionPromoBar();
            applyHeroBanner();
        }

        function updateOccasionPreviewStrip(elementId, themeId) {
            const el = document.getElementById(elementId);
            if (!el) return;
            if (!themeId || themeId === 'default') {
                el.style.backgroundImage = 'linear-gradient(90deg, #0d2840, #00a8ff)';
                return;
            }
            const heroCustom = cssLocalImageValue(systemSettings.occasionHeroImageUrl);
            if (heroCustom) {
                el.style.backgroundImage = heroCustom;
                return;
            }
            const bodyStyle = getComputedStyle(document.body);
            const sample = document.querySelector('.hero');
            if (sample) {
                el.style.backgroundImage = getComputedStyle(sample).backgroundImage || 'linear-gradient(90deg, #0d2840, #00a8ff)';
            } else {
                el.style.backgroundImage = 'linear-gradient(90deg, #0d2840, #00a8ff)';
            }
        }

        function renderDashboardOccasionStatus() {
            const statusEl = document.getElementById('dashboard-occasion-status');
            const editBtn = document.getElementById('dashboard-occasion-edit-btn');
            const noteEl = document.getElementById('dashboard-occasion-superadmin-note');
            if (!statusEl) return;
            const lang = currentLang || 'ar';
            const ui = siteText[lang] || siteText.ar;
            const activeId = getResolvedOccasionThemeId();
            const configuredId = String(systemSettings.occasionThemeId || 'default');
            const preset = OCCASION_THEME_PRESETS[configuredId] || OCCASION_THEME_PRESETS.default;
            const activePreset = OCCASION_THEME_PRESETS[activeId] || preset;

            if (activeId !== 'default') {
                statusEl.textContent = (lang === 'en' ? activePreset.statusEn : activePreset.statusAr) + (ui.celebrationActiveNow || ui.occasionActiveNow || '');
            } else if (systemSettings.occasionThemeEnabled && configuredId !== 'default' && !isWithinOccasionDateRange()) {
                statusEl.textContent = ui.occasionScheduledOff || '';
            } else if (systemSettings.occasionThemeEnabled && configuredId !== 'default') {
                statusEl.textContent = ui.occasionDisabledOff || '';
            } else {
                statusEl.textContent = lang === 'en' ? preset.statusEn : preset.statusAr;
            }

            if (editBtn) {
                const canEdit = currentAdmin && currentAdmin.role === 'superadmin';
                editBtn.style.display = canEdit ? '' : 'none';
            }
            if (noteEl) {
                const showNote = currentAdmin && currentAdmin.role !== 'superadmin';
                noteEl.style.display = showNote ? 'block' : 'none';
                if (showNote) noteEl.textContent = ui.occasionSettingsSuperAdminOnly || '';
            }
        }

        function openSystemSettingsForOccasion() {
            if (!currentAdmin) return;
            if (!isMainGovernanceAdmin(currentAdmin) && currentAdmin.role !== 'superadmin') {
                const ui = siteText[currentLang || 'ar'] || siteText.ar;
                alert(ui.occasionSettingsSuperAdminOnly || 'تخصيص الثيم متاح لمسؤول النظام فقط.');
                return;
            }
            openSystemSettings();
            const block = document.querySelector('.occasion-settings-block');
            if (block) block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        async function pickHeroBannerFromSettings() {
            if (!requirePermission('content')) return;
            const url = await pickMediaPath({
                label: 'صورة بانر الرئيسية (الهيدر)',
                defaultValue: systemSettings.heroBannerImageUrl || 'images/hero-nebras-banner.png'
            });
            if (!url) return;
            systemSettings.heroBannerImageUrl = url;
            const input = document.getElementById('setting-hero-banner-url');
            if (input) input.value = url;
            saveContentData();
            addAuditLog('تعديل بانر الرئيسية', url);
        }

        async function pickOccasionHeroFromSettings() {
            if (!requirePermission('content', 'رفع صورة المناسبة يتطلب صلاحية المحتوى.')) return;
            const url = await pickMediaPath({
                label: 'صورة المناسبة للزائر',
                defaultValue: systemSettings.occasionHeroImageUrl || 'images/hero-nebras-banner.png'
            });
            if (!url) return;
            systemSettings.occasionHeroImageUrl = url;
            const input = document.getElementById('setting-occasion-hero-url');
            if (input) input.value = url;
            saveContentData();
        }

        function renderSystemSettings() {
            const salesInput = document.getElementById('setting-sales-phone');
            const customerInput = document.getElementById('setting-customer-phone');
            const recoveryInput = document.getElementById('setting-recovery-email');
            if (!salesInput || !customerInput || !recoveryInput) return;
            salesInput.value = systemSettings.mainSalesPhone || '';
            customerInput.value = systemSettings.customerServicePhone || '';
            ensurePrimaryRecoveryEmail();
            recoveryInput.value = systemSettings.recoveryEmail || PRIMARY_RECOVERY_EMAIL;
            recoveryInput.readOnly = true;
            recoveryInput.title = 'إيميل الإدارة الرئيسية المعتمد — لا يُغيَّر إلا من الإدارة المحورية';
            const designerInput = document.getElementById('setting-designer-phone');
            const waInput = document.getElementById('setting-social-whatsapp');
            const ttInput = document.getElementById('setting-social-tiktok');
            const fbInput = document.getElementById('setting-social-facebook');
            const igInput = document.getElementById('setting-social-instagram');
            const snInput = document.getElementById('setting-social-snapchat');
            if (designerInput) designerInput.value = systemSettings.designerPhone || '';
            if (waInput) waInput.value = systemSettings.socialWhatsApp || '';
            if (ttInput) ttInput.value = systemSettings.socialTiktok || '';
            if (fbInput) fbInput.value = systemSettings.socialFacebook || '';
            if (igInput) igInput.value = systemSettings.socialInstagram || '';
            if (snInput) snInput.value = systemSettings.socialSnapchat || '';
            const crInput = document.getElementById('setting-commercial-register');
            const taxInput = document.getElementById('setting-tax-number');
            const addrArInput = document.getElementById('setting-company-address-ar');
            const addrEnInput = document.getElementById('setting-company-address-en');
            if (crInput) crInput.value = systemSettings.commercialRegister || '';
            if (taxInput) taxInput.value = systemSettings.taxNumber || '';
            const vatRateInput = document.getElementById('setting-vat-rate');
            if (vatRateInput) vatRateInput.value = systemSettings.vatRate != null ? String(systemSettings.vatRate) : '15';
            if (addrArInput) addrArInput.value = systemSettings.companyAddressAr || '';
            if (addrEnInput) addrEnInput.value = systemSettings.companyAddressEn || '';
            const heroBannerInput = document.getElementById('setting-hero-banner-url');
            if (heroBannerInput) heroBannerInput.value = systemSettings.heroBannerImageUrl || '';
            if (!Array.isArray(systemSettings.bankAccounts)) systemSettings.bankAccounts = [];
            renderBankAccountsSettingsList();

            populateOccasionThemeSelect();
            const occEnabled = document.getElementById('setting-occasion-enabled');
            const occTheme = document.getElementById('setting-occasion-theme');
            const occStart = document.getElementById('setting-occasion-start');
            const occEnd = document.getElementById('setting-occasion-end');
            const occHero = document.getElementById('setting-occasion-hero-url');
            const occDash = document.getElementById('setting-occasion-dash-url');
            const occMsgAr = document.getElementById('setting-occasion-msg-ar');
            const occMsgEn = document.getElementById('setting-occasion-msg-en');
            const occCustomAr = document.getElementById('setting-occasion-custom-label-ar');
            const occCustomEn = document.getElementById('setting-occasion-custom-label-en');
            if (occEnabled) occEnabled.checked = !!systemSettings.occasionThemeEnabled;
            const occSiteWide = document.getElementById('setting-occasion-site-wide');
            if (occSiteWide) occSiteWide.checked = systemSettings.occasionSiteWide !== false;
            if (occTheme) occTheme.value = OCCASION_THEME_PRESETS[systemSettings.occasionThemeId] ? systemSettings.occasionThemeId : 'default';
            if (occStart) occStart.value = systemSettings.occasionStartDate || '';
            if (occEnd) occEnd.value = systemSettings.occasionEndDate || '';
            if (occHero) occHero.value = systemSettings.occasionHeroImageUrl || '';
            if (occDash) occDash.value = systemSettings.occasionDashboardImageUrl || '';
            if (occMsgAr) occMsgAr.value = systemSettings.occasionMessageAr || '';
            if (occMsgEn) occMsgEn.value = systemSettings.occasionMessageEn || '';
            if (occCustomAr) occCustomAr.value = systemSettings.occasionCustomLabelAr || '';
            if (occCustomEn) occCustomEn.value = systemSettings.occasionCustomLabelEn || '';
            const occPromo = document.getElementById('setting-occasion-promo-discount');
            if (occPromo) occPromo.value = systemSettings.occasionPromoDiscountAr || systemSettings.occasionPromoDiscountEn || '';
            applyOccasionTheme();
        }

        function saveSystemSettings() {
            if (!currentAdmin || currentAdmin.role !== 'superadmin') {
                alert('هذه الإعدادات متاحة فقط للمسؤول الأعلى Super Admin.');
                return;
            }
            const salesPhone = document.getElementById('setting-sales-phone').value.trim();
            const customerPhone = document.getElementById('setting-customer-phone').value.trim();
            if (!salesPhone || !customerPhone) {
                alert('يرجى إدخال جميع الأرقام.');
                return;
            }
            systemSettings.mainSalesPhone = salesPhone;
            systemSettings.customerServicePhone = customerPhone;
            ensurePrimaryRecoveryEmail();
            const designerPhoneEl = document.getElementById('setting-designer-phone');
            const waEl = document.getElementById('setting-social-whatsapp');
            const ttEl = document.getElementById('setting-social-tiktok');
            const fbEl = document.getElementById('setting-social-facebook');
            const igEl = document.getElementById('setting-social-instagram');
            const snEl = document.getElementById('setting-social-snapchat');
            if (designerPhoneEl) systemSettings.designerPhone = designerPhoneEl.value.trim();
            if (waEl) systemSettings.socialWhatsApp = waEl.value.trim();
            if (ttEl) systemSettings.socialTiktok = ttEl.value.trim();
            if (fbEl) systemSettings.socialFacebook = fbEl.value.trim();
            if (igEl) systemSettings.socialInstagram = igEl.value.trim();
            if (snEl) systemSettings.socialSnapchat = snEl.value.trim();
            const crEl = document.getElementById('setting-commercial-register');
            const taxEl = document.getElementById('setting-tax-number');
            const addrArEl = document.getElementById('setting-company-address-ar');
            const addrEnEl = document.getElementById('setting-company-address-en');
            if (crEl) systemSettings.commercialRegister = crEl.value.trim();
            if (taxEl) systemSettings.taxNumber = taxEl.value.trim();
            const vatRateEl = document.getElementById('setting-vat-rate');
            if (vatRateEl) {
                const vr = parseFloat(vatRateEl.value);
                systemSettings.vatRate = !isNaN(vr) && vr >= 0 ? vr : 15;
            }
            if (addrArEl) systemSettings.companyAddressAr = addrArEl.value.trim();
            if (addrEnEl) systemSettings.companyAddressEn = addrEnEl.value.trim();
            const heroBannerEl = document.getElementById('setting-hero-banner-url');
            if (heroBannerEl) systemSettings.heroBannerImageUrl = heroBannerEl.value.trim() || 'images/hero-nebras-banner.png';
            if (!Array.isArray(systemSettings.bankAccounts)) systemSettings.bankAccounts = [];

            const occEnabledEl = document.getElementById('setting-occasion-enabled');
            const occThemeEl = document.getElementById('setting-occasion-theme');
            const occStartEl = document.getElementById('setting-occasion-start');
            const occEndEl = document.getElementById('setting-occasion-end');
            const occHeroEl = document.getElementById('setting-occasion-hero-url');
            const occDashEl = document.getElementById('setting-occasion-dash-url');
            const occMsgArEl = document.getElementById('setting-occasion-msg-ar');
            const occMsgEnEl = document.getElementById('setting-occasion-msg-en');
            const occCustomArEl = document.getElementById('setting-occasion-custom-label-ar');
            const occCustomEnEl = document.getElementById('setting-occasion-custom-label-en');
            if (occEnabledEl) systemSettings.occasionThemeEnabled = !!occEnabledEl.checked;
            const occSiteWideEl = document.getElementById('setting-occasion-site-wide');
            if (occSiteWideEl) systemSettings.occasionSiteWide = !!occSiteWideEl.checked;
            if (occThemeEl) {
                const picked = occThemeEl.value || 'default';
                systemSettings.occasionThemeId = OCCASION_THEME_PRESETS[picked] ? picked : 'default';
            }
            if (occStartEl) systemSettings.occasionStartDate = occStartEl.value || '';
            if (occEndEl) systemSettings.occasionEndDate = occEndEl.value || '';
            if (occHeroEl) systemSettings.occasionHeroImageUrl = occHeroEl.value.trim();
            if (occDashEl) systemSettings.occasionDashboardImageUrl = occDashEl.value.trim();
            if (occMsgArEl) systemSettings.occasionMessageAr = occMsgArEl.value.trim();
            if (occMsgEnEl) systemSettings.occasionMessageEn = occMsgEnEl.value.trim();
            if (occCustomArEl) systemSettings.occasionCustomLabelAr = occCustomArEl.value.trim();
            if (occCustomEnEl) systemSettings.occasionCustomLabelEn = occCustomEnEl.value.trim();
            const occPromoEl = document.getElementById('setting-occasion-promo-discount');
            if (occPromoEl) {
                const promoText = occPromoEl.value.trim();
                systemSettings.occasionPromoDiscountAr = promoText;
                systemSettings.occasionPromoDiscountEn = promoText;
                systemSettings.occasionPromoDiscountZh = promoText;
            }
            if (systemSettings.occasionStartDate && systemSettings.occasionEndDate) {
                const s = parseLocalDateOnly(systemSettings.occasionStartDate);
                const e = parseLocalDateOnly(systemSettings.occasionEndDate);
                if (s && e && s > e) {
                    alert('تاريخ نهاية المناسبة يجب أن يكون بعد تاريخ البداية.');
                    return;
                }
            }

            saveContentData();
            setLanguage(currentLang || 'ar');
            addAuditLog('تحديث إعدادات النظام', `تعديل إعدادات النظام والثيم (${systemSettings.occasionThemeId}) بواسطة ${currentAdmin.username}`);
            alert('تم حفظ إعدادات النظام بنجاح.');
        }

        function isPrimarySuperAdmin(user) {
            const u = user || currentAdmin;
            if (!u) return false;
            return String(u.role || '').toLowerCase() === 'superadmin';
        }

        function ensurePrimaryRecoveryEmail() {
            if (!systemSettings || typeof systemSettings !== 'object') return;
            const cur = String(systemSettings.recoveryEmail || '').trim().toLowerCase();
            const primary = PRIMARY_RECOVERY_EMAIL.toLowerCase();
            if (!cur || cur === 'admin@nebrasfactory.com' || cur !== primary) {
                systemSettings.recoveryEmail = PRIMARY_RECOVERY_EMAIL;
            }
        }

        function isLocalRecoveryApiFallback() {
            try {
                const host = String(window.location.hostname || '').toLowerCase();
                return host === 'localhost' || host === '127.0.0.1';
            } catch (e) {
                return false;
            }
        }

        function recoveryApiErrorMessage(errCode) {
            const map = {
                email_mismatch: 'الإيميل غير مطابق للإيميل المعتمد للإدارة الرئيسية.',
                gmail_not_configured: 'إرسال Gmail غير مُعدّ على الخادم. أضيفي GMAIL_APP_PASSWORD في Vercel.',
                gmail_send_failed: 'تعذّر إرسال الرسالة عبر Gmail. تحققي من كلمة مرور التطبيق.',
                gmail_auth_failed: 'فشل تسجيل الدخول لـ Gmail. في Vercel عدّلي GMAIL_APP_PASSWORD (16 حرف بدون مسافات) من Google → كلمات مرور التطبيقات → Nebras Factory.',
                otp_store_unavailable: 'تخزين الرمز غير متاح. تحققي من SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في Vercel ثم Redeploy.',
                supabase_auth_failed: 'مفتاح Supabase غير صحيح. انسخي Secret key من Supabase → API Keys → default.',
                server_error: 'خطأ في خادم Vercel. انتظري دقيقة بعد Redeploy أو راجعي GMAIL_APP_PASSWORD (بدون مسافات).',
                send_failed: 'تعذّر الإرسال. أعيدي Redeploy من Vercel بعد حفظ المتغيرات.',
                no_active_code: 'لا يوجد رمز نشط. اطلبي رمزاً جديداً.',
                code_expired: 'انتهت صلاحية الرمز. اطلبي رمزاً جديداً.',
                invalid_code: 'رمز التحقق غير صحيح.',
                username_mismatch: 'الحساب لا يطابق الرمز المُرسل.'
            };
            return map[errCode] || 'تعذّر إكمال العملية. حاولي لاحقاً أو راجعي إعدادات Vercel.';
        }

        function renderAccountSecurityPanel() {
            const status = document.getElementById('account-security-status');
            const directBtn = document.getElementById('account-security-direct-btn');
            const emailBtn = document.getElementById('account-security-email-btn');
            const isSuper = isPrimarySuperAdmin(currentAdmin);
            if (directBtn) directBtn.hidden = isSuper;
            if (emailBtn) emailBtn.textContent = isSuper ? 'تغيير كلمة المرور عبر الإيميل المعتمد' : 'استرجاع/تغيير عبر الإيميل';
            if (status) {
                status.textContent = isSuper
                    ? 'مدير النظام الرئيسي: تغيير كلمة المرور فقط عبر Gmail المعتمد (' + PRIMARY_RECOVERY_EMAIL + ') ورمز يُرسل إلى بريدك.'
                    : 'موظف إداري: يمكنك تغيير البيانات بكلمة المرور الحالية، أو عبر Gmail المعتمد للإدارة.';
            }
        }

        function openAccountSecurity() {
            if (!currentAdmin) {
                alert('سجّل الدخول أولاً.');
                return;
            }
            renderAccountSecurityPanel();
            document.getElementById('account-security').classList.add('show');
        }

        function changeAdminCredentialsByOldPassword() {
            if (!currentAdmin) return;
            if (isPrimarySuperAdmin(currentAdmin)) {
                alert('حساب الإدارة الرئيسي: غيّر كلمة المرور فقط عبر «تغيير كلمة المرور عبر الإيميل المعتمد».');
                return;
            }
            const oldPassword = prompt('أدخل كلمة المرور الحالية:');
            if (!oldPassword || oldPassword !== currentAdmin.password) {
                alert('كلمة المرور الحالية غير صحيحة.');
                return;
            }
            const newUsername = prompt('اسم المستخدم الجديد:', currentAdmin.username);
            const newPassword = prompt('كلمة المرور الجديدة:');
            if (!newUsername || !newPassword) return;
            currentAdmin.username = newUsername.trim();
            currentAdmin.password = newPassword.trim();
            saveSystemData();
            displayUsers();
            addAuditLog('تغيير بيانات الدخول', `تم تغيير بيانات حساب ${currentAdmin.username} بالطريقة المباشرة`);
            alert('تم تحديث اسم المستخدم وكلمة المرور بنجاح.');
        }

        async function sendRecoveryCodeToEmail() {
            if (!currentAdmin) return;
            ensurePrimaryRecoveryEmail();
            const approvedEmail = PRIMARY_RECOVERY_EMAIL;
            const enteredEmail = prompt(
                'أدخل إيميل الإدارة الرئيسية المعتمد (Gmail):\n\nالمعتمد: ' + approvedEmail
            );
            if (!enteredEmail || enteredEmail.trim().toLowerCase() !== approvedEmail.toLowerCase()) {
                alert('الإيميل غير مطابق. الإيميل المعتمد للإدارة الرئيسية: ' + approvedEmail);
                return;
            }
            const emailBtn = document.getElementById('account-security-email-btn');
            const prevLabel = emailBtn ? emailBtn.textContent : '';
            if (emailBtn) {
                emailBtn.disabled = true;
                emailBtn.textContent = 'جاري إرسال الرمز إلى Gmail...';
            }
            passwordRecoveryVerified = false;
            let localDevCode = null;
            try {
                const res = await fetch('/api/admin-recovery?action=send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'send',
                        email: approvedEmail,
                        username: currentAdmin.username
                    })
                });
                const data = await res.json().catch(function() { return {}; });
                if (!res.ok || !data.ok) {
                    if (isLocalRecoveryApiFallback() && (data.error === 'gmail_not_configured' || data.error === 'otp_store_unavailable')) {
                        localDevCode = String(Math.floor(100000 + Math.random() * 900000));
                        passwordRecoveryVerified = false;
                        window.__nebrasLocalRecoveryCode = localDevCode;
                        alert('وضع محلي: رمز التحقق (محاكاة): ' + localDevCode);
                    } else {
                        throw new Error(data.error || 'send_failed');
                    }
                } else {
                    alert('تم إرسال رمز التحقق إلى ' + approvedEmail + '. راجعي بريد Gmail.');
                }
            } catch (sendErr) {
                alert(recoveryApiErrorMessage(sendErr && sendErr.message));
                if (emailBtn) {
                    emailBtn.disabled = false;
                    emailBtn.textContent = prevLabel;
                }
                renderAccountSecurityPanel();
                return;
            } finally {
                if (emailBtn) {
                    emailBtn.disabled = false;
                    emailBtn.textContent = prevLabel;
                }
                renderAccountSecurityPanel();
            }
            const enteredCode = prompt('أدخل رمز التحقق المرسل إلى Gmail:');
            if (!enteredCode) return;
            if (localDevCode) {
                if (enteredCode.trim() !== localDevCode) {
                    alert('رمز التحقق غير صحيح.');
                    return;
                }
                passwordRecoveryVerified = true;
            } else {
                try {
                    const vRes = await fetch('/api/admin-recovery?action=verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'verify',
                            email: approvedEmail,
                            username: currentAdmin.username,
                            code: enteredCode.trim()
                        })
                    });
                    const vData = await vRes.json().catch(function() { return {}; });
                    if (!vRes.ok || !vData.ok) {
                        alert(recoveryApiErrorMessage(vData.error || 'invalid_code'));
                        return;
                    }
                    passwordRecoveryVerified = true;
                } catch (verifyErr) {
                    alert(recoveryApiErrorMessage(verifyErr && verifyErr.message));
                    return;
                }
            }
            const newPassword = prompt('أدخل كلمة المرور الجديدة:');
            if (!newPassword || !passwordRecoveryVerified) return;
            currentAdmin.password = newPassword.trim();
            passwordRecoveryVerified = false;
            window.__nebrasLocalRecoveryCode = null;
            saveSystemData();
            addAuditLog('استرجاع كلمة المرور', 'تم تغيير كلمة المرور عبر Gmail لحساب ' + currentAdmin.username);
            alert('تم تغيير كلمة المرور عبر Gmail بنجاح.');
        }

        function openIconManagement() {
            if (!requirePermission('content', 'هذه العملية تتطلب صلاحية إدارة المحتوى.')) return;
            document.getElementById('icon-management').classList.add('show');
            displayVisitorIconsAdmin();
        }

        function addVisitorIcon() {
            if (!requirePermission('content', 'هذه العملية تتطلب صلاحية إدارة المحتوى (مدير / Super Admin).')) return;
            if (typeof window.openVisitorIconEditor === 'function') {
                window.openVisitorIconEditor(null);
                return;
            }
            alert('جاري تحميل محرر الأيقونات — أعد المحاولة بعد ثانية.');
        }

        function editVisitorIcon(iconId) {
            if (!requirePermission('content', 'هذه العملية تتطلب صلاحية إدارة المحتوى (مدير / Super Admin).')) return;
            if (typeof window.openVisitorIconEditor === 'function') {
                window.openVisitorIconEditor(iconId);
                return;
            }
            alert('جاري تحميل محرر الأيقونات — أعد المحاولة بعد ثانية.');
        }

        function deleteVisitorIcon(iconId) {
            if (!requirePermission('content', 'هذه العملية تتطلب صلاحية إدارة المحتوى.')) return;
            if ([14, 15, 16, 17].indexOf(Number(iconId)) >= 0) {
                alert('بطاقات الخدمات الأساسية لا تُحذف — عدّلي المحتوى والصور من «وسائط ومحتوى».');
                return;
            }
            const icon = visitorIcons.find(item => item.id === iconId);
            if (!icon) return;
            if (!confirm(`هل تريد حذف الأيقونة ${icon.title}؟`)) return;
            visitorIcons = visitorIcons.filter(item => item.id !== iconId);
            saveContentData();
            displayVisitorIconsAdmin();
            addAuditLog('حذف أيقونة زائر', `تم حذف أيقونة ${icon.title}`);
        }

        function buildStoreIconAdminRowHtml(icon) {
            const products = getProductsForVisitorIcon(icon);
            const assigned = Array.isArray(icon.productIds) && icon.productIds.length
                ? icon.productIds.length + ' محدد'
                : products.length + ' تلقائي';
            const preview = products.slice(0, 3).map(function(p) { return p.titleAr || p.id; }).join(' · ') || '—';
            return '<li class="scm-store-icon-row"><strong>' + escapeHtmlAttr(getVisitorIconDisplayTitle(icon) || icon.title) + '</strong>' +
                ' <span class="scm-store-icon-badge">' + assigned + ' منتج</span>' +
                '<small>خلفية: ' + escapeHtmlAttr(icon.backgroundImage || 'افتراضي') +
                ' | ألبوم: ' + ((icon.album || []).length) + ' | PDF: ' + ((icon.documents || []).length) +
                ' | معاينة: ' + escapeHtmlAttr(preview) + '</small>' +
                '<div class="scm-row-actions">' +
                '<button type="button" onclick="openVisitorIcon(' + icon.id + ')">معاينة</button>' +
                '<button type="button" onclick="manageStoreIconProducts(' + icon.id + ')">منتجات داخل الأيقونة</button>' +
                '<button type="button" onclick="editVisitorIcon(' + icon.id + ')">وسائط (صور · فيديو · PDF)</button>' +
                '</div></li>';
        }

        function buildVisitorIconAdminRowHtml(icon) {
            const place = isServicePlacementIcon(icon) ? 'بطاقة خدمة' : 'بوابة زائر';
            const storeBtn = isStoreCatalogHubIcon(icon)
                ? '<button type="button" onclick="manageStoreIconProducts(' + icon.id + ')">منتجات المتجر</button>'
                : '';
            return '<li><strong>' + escapeHtmlAttr(getVisitorIconDisplayTitle(icon) || icon.title) + '</strong> — ' + escapeHtmlAttr(icon.iconClass) +
                ' <span style="opacity:0.85">[' + escapeHtmlAttr(getVisitorIconModeLabel(icon)) + ' · ' + escapeHtmlAttr(place) + ']</span>' +
                '<small>خلفية: ' + escapeHtmlAttr(icon.backgroundImage || 'افتراضي') + ' | ألبوم: ' + ((icon.album || []).length) + ' صورة</small>' +
                '<div class="scm-row-actions"><button type="button" onclick="openVisitorIcon(' + icon.id + ')">معاينة</button>' +
                storeBtn +
                '<button type="button" onclick="editVisitorIcon(' + icon.id + ')">وسائط ومحتوى</button>' +
                (isServicePlacementIcon(icon) ? '' : '<button type="button" onclick="deleteVisitorIcon(' + icon.id + ')">حذف</button>') +
                '</div></li>';
        }

        function displayVisitorIconsAdmin() {
            const storeHtml = visitorIcons.filter(isStoreCatalogHubIcon).map(buildStoreIconAdminRowHtml).join('');
            const gatewayHtml = visitorIcons.filter(function(ic) {
                return isGatewayVisitorIcon(ic) && !isStoreCatalogHubIcon(ic);
            }).map(buildVisitorIconAdminRowHtml).join('');
            const serviceHtml = visitorIcons.filter(isServicePlacementIcon).map(buildVisitorIconAdminRowHtml).join('');
            const storeList = document.getElementById('scm-store-icons-list');
            if (storeList) {
                storeList.innerHTML = storeHtml || '<li style="opacity:0.75">لا أيقونات متجر — سيتم إنشاؤها تلقائياً.</li>';
            }
            ['icons-admin-list', 'icons-admin-list-legacy'].forEach(function(id) {
                const list = document.getElementById(id);
                if (list) list.innerHTML = gatewayHtml;
            });
            const serviceList = document.getElementById('scm-service-icons-list');
            if (serviceList) {
                serviceList.innerHTML = serviceHtml || '<li style="opacity:0.75">لا توجد بطاقات خدمات — سيتم إنشاؤها تلقائياً.</li>';
            }
        }

        function getVisitorIconAlbumUrls(icon) {
            if (!icon) return [];
            const fromAlbum = (icon.album || []).map(function(p) {
                const t = String(p || '').trim();
                if (/^(https?:|data:|blob:)/i.test(t) || t.startsWith('images/')) return t;
                return 'images/' + t.replace(/^\/+/, '');
            }).filter(Boolean);
            if (fromAlbum.length) return fromAlbum;
            const bases = VISITOR_ICON_BG_BASES[icon.id];
            return bases && bases.length ? buildUrlList(bases) : [];
        }

        function getIconWorkspaceGalleryUrls(icon) {
            const urls = [];
            const seen = {};
            function add(u) {
                const n = normalizeMediaPath(u);
                if (n && !seen[n]) {
                    seen[n] = true;
                    urls.push(n);
                }
            }
            if (!icon) return urls;
            getVisitorIconAlbumUrls(icon).forEach(add);
            if (icon.linkedProductId) {
                const product = siteProducts.find(function(p) { return p.id === icon.linkedProductId; });
                if (product) getProductMediaGallery(product).forEach(add);
            }
            return urls;
        }

        const SERVICE_ICON_CSS = {
            14: 'spotlight-card--service-mfg',
            15: 'spotlight-card--service-support',
            16: 'spotlight-card--service-quality',
            17: 'spotlight-card--service-install'
        };

        const SERVICE_ICON_BG_BASES = {
            14: ['nebras-service-manufacturing-bg', 'background-Manufacturing-services', 'background-manufacturing-services'],
            15: ['customer-complaints-background'],
            16: ['nebras-service-quality-bg', 'background-quality-management', 'backround-Quality-Management', 'background-quality-managment'],
            17: ['nebras-service-install-warranty-bg']
        };

        function getServiceIconDescription(icon, lang) {
            if (!icon) return '';
            if (lang === 'en') return String(icon.textEn || icon.textAr || '').trim();
            if (lang === 'zh') return String(icon.textZh || icon.textAr || '').trim();
            const body = String(icon.textAr || icon.textEn || '').trim();
            if (body) return body;
            const ui = siteText[lang] || siteText.ar;
            if (icon.titleKey === 'serviceTitle1') return ui.serviceText1 || '';
            if (icon.titleKey === 'serviceTitle2') return ui.serviceText2 || '';
            if (icon.titleKey === 'serviceTitle3') return ui.serviceText3 || '';
            if (icon.titleKey === 'serviceTitleInstall') return ui.serviceTextInstall || '';
            return '';
        }

        function applyServiceCardBackground(node, icon) {
            if (!node || !icon) return;
            const urls = [];
            const seen = {};
            function addUrls(list) {
                (list || []).forEach(function(u) {
                    const n = normalizeMediaPath(u);
                    if (n && !seen[n]) {
                        seen[n] = true;
                        urls.push(n);
                    }
                });
            }
            addUrls(imageUrlsFromSource(icon.backgroundImage));
            (icon.album || []).forEach(function(a) { addUrls(imageUrlsFromSource(a)); });
            const bases = SERVICE_ICON_BG_BASES[icon.id];
            if (bases && bases.length) addUrls(buildUrlList(bases));
            const bust = (icon.id === 14 || icon.id === 16 || icon.id === 17) ? withServiceIconMediaVersion : function(u) { return u; };
            const finalUrls = urls.map(bust);
            if (finalUrls.length) tryUrls(node, finalUrls, 0);
        }

        function renderSiteServiceCardMarkup(icon) {
            const lang = currentLang || 'ar';
            const cssMod = SERVICE_ICON_CSS[icon.id] || 'spotlight-card--service-mfg';
            const title = getVisitorIconDisplayTitle(icon);
            const desc = getServiceIconDescription(icon, lang);
            return '<div class="spotlight-card ' + cssMod + ' clickable-card site-service-card" data-icon-id="' + icon.id + '" role="button" tabindex="0"' +
                ' onclick="openVisitorIcon(' + icon.id + ')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();openVisitorIcon(' + icon.id + ')}">' +
                '<div class="card-icon" aria-hidden="true"><i class="' + escapeHtmlAttr(icon.iconClass || 'fas fa-star') + '"></i></div>' +
                '<div class="card-content"><h3>' + escapeHtmlAttr(title) + '</h3>' +
                '<p>' + escapeHtmlAttr(desc) + '</p></div></div>';
        }

        function renderSiteServiceCards() {
            const container = document.getElementById('site-services-grid');
            if (!container) return;
            ensureBuiltinVisitorIcons();
            const icons = visitorIcons.filter(isServicePlacementIcon)
                .sort(function(a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
            container.innerHTML = icons.map(renderSiteServiceCardMarkup).join('');
            icons.forEach(function(icon) {
                const node = container.querySelector('.site-service-card[data-icon-id="' + icon.id + '"]');
                if (node) applyServiceCardBackground(node, icon);
            });
        }

        function migrateVisitorIconMediaPaths() {
            if (!Array.isArray(visitorIcons)) return;
            visitorIcons.forEach(function(icon) {
                if (!icon || icon.id == null) return;
                if (icon.id === 12) {
                    icon.backgroundImage = NEBRAS_STORE_ICON_MEDIA.complaintsBg;
                    icon.album = [NEBRAS_STORE_ICON_MEDIA.complaintsBg];
                    icon.visitorMode = 'browse';
                    icon.openHandler = 'complaints-inquiry';
                    delete icon.linkedProductId;
                }
                if (icon.id === 14) {
                    icon.placement = 'services';
                    icon.target = '';
                    icon.backgroundImage = NEBRAS_SERVICE_ICON_MEDIA.mfg;
                    icon.album = [NEBRAS_SERVICE_ICON_MEDIA.mfg];
                }
                if (icon.id === 15) {
                    icon.placement = 'services';
                    icon.target = '';
                    icon.backgroundImage = NEBRAS_SERVICE_ICON_MEDIA.support;
                    if (!icon.album || !icon.album.length) icon.album = ['images/customer-complaints-background.jpeg'];
                }
                if (icon.id === 16) {
                    icon.placement = 'services';
                    icon.target = '';
                    icon.backgroundImage = NEBRAS_SERVICE_ICON_MEDIA.quality;
                    icon.album = [NEBRAS_SERVICE_ICON_MEDIA.quality];
                }
                if (icon.id === 17) {
                    icon.placement = 'services';
                    icon.target = '';
                    icon.backgroundImage = NEBRAS_SERVICE_ICON_MEDIA.install;
                    icon.album = [NEBRAS_SERVICE_ICON_MEDIA.install];
                    if (!icon.titleKey) icon.titleKey = 'serviceTitleInstall';
                }
                if (icon.id === 2) {
                    icon.backgroundImage = NEBRAS_PLATFORM_ICON_MEDIA.branchesBg;
                    icon.album = [NEBRAS_PLATFORM_ICON_MEDIA.branchesBg];
                    icon.visitorMode = 'browse';
                    icon.openHandler = 'branches-hub';
                    icon.target = '';
                }
                if (icon.id === 3) {
                    icon.openHandler = 'color-rolls';
                    icon.target = '';
                    icon.visitorMode = 'browse';
                }
                if (isServicePlacementIcon(icon)) {
                    icon.target = '';
                    delete icon.linkedProductId;
                    delete icon.catalogHub;
                    const bg = String(icon.backgroundImage || '');
                    if (/\.png$/i.test(bg) && !bg.includes('nebras-')) {
                        icon.backgroundImage = bg.replace(/^images\//i, '').replace(/\.png$/i, '');
                    }
                }
            });
        }
        window.renderSiteServiceCards = renderSiteServiceCards;

        function getVisitorIconHeroBgStyle(icon) {
            if (!icon || !VISITOR_ICON_HERO_BG[icon.id]) return '';
            const path = VISITOR_ICON_HERO_BG[icon.id]();
            const url = withVisitorIconMediaVersion(path, icon.id);
            return ' style="background-image:url(\'' + escapeHtmlAttr(url) + '\');background-size:cover;background-position:center;"';
        }

        function visitorIconUsesHeroBg(icon) {
            return !!(icon && VISITOR_ICON_HERO_BG[icon.id]);
        }

        function renderVisitorIconCardMarkup(icon) {
            const lang = currentLang || 'ar';
            const badge = getExperienceBadgeHtml(icon, lang);
            const isBank = icon && icon.id === 4;
            const isCerts = icon && icon.id === 7;
            const isDoorDesigner = icon && icon.id === 13;
            const isHeroBg = visitorIconUsesHeroBg(icon);
            const bankPlates = isBank
                ? '<div class="visitor-bank-plates" aria-hidden="true">' +
                    '<img src="' + escapeHtmlAttr(withBankMediaVersion(NEBRAS_BANK_MEDIA.snb)) + '" alt="" loading="eager" decoding="async">' +
                    '<img src="' + escapeHtmlAttr(withBankMediaVersion(NEBRAS_BANK_MEDIA.riyad)) + '" alt="" loading="eager" decoding="async">' +
                    '<img src="' + escapeHtmlAttr(withBankMediaVersion(NEBRAS_BANK_MEDIA.alrajhi)) + '" alt="" loading="eager" decoding="async">' +
                    '</div>'
                : '';
            let cardClass = 'spotlight-card visitor-icon-card';
            if (isBank) cardClass += ' visitor-icon-card--bank-accounts';
            else if (isCerts) cardClass += ' visitor-icon-card--certifications';
            else if (isDoorDesigner) cardClass += ' visitor-icon-card--door-designer';
            else if (isHeroBg) cardClass += ' visitor-icon-card--hero-bg';
            const heroBgStyle = getVisitorIconHeroBgStyle(icon);
            const hideCornerIcon = isBank || isHeroBg;
            return '<div class="' + cardClass + '" data-icon-id="' + icon.id + '"' + heroBgStyle + ' onclick="openVisitorIcon(' + icon.id + ')">' +
                badge + bankPlates +
                (hideCornerIcon ? '' : '<div class="card-icon" aria-hidden="true"><i class="' + escapeHtmlAttr(icon.iconClass || 'fas fa-star') + '"></i></div>') +
                '<div class="card-content"><h3>' + escapeHtmlAttr(getVisitorIconDisplayTitle(icon)) + '</h3>' +
                '<p class="visitor-target-caption">' + escapeHtmlAttr(getVisitorTargetCaption(icon)) + '</p></div></div>';
        }

        /** مساحة العمل الداخلية — منصة + معرض + متجر (ليست overlay عرض فقط) */
        let nebrasWorkspaceState = { active: false, route: null };

        function getWorkspaceUi() {
            return siteText[currentLang || 'ar'] || siteText.ar;
        }

        function pillarLabel(pillar) {
            const ui = getWorkspaceUi();
            if (pillar === 'showroom') return ui.workspacePillarShowroom || 'معرض';
            if (pillar === 'store') return ui.workspacePillarStore || 'متجر';
            return ui.workspacePillarPlatform || 'منصة';
        }

        function resolveIconWorkspaceRoute(icon) {
            if (!icon) return { pillar: 'platform', view: 'home' };
            if (isServicePlacementIcon(icon)) {
                return { pillar: 'showroom', view: 'icon', iconId: icon.id };
            }
            if (icon.openHandler === 'certifications') {
                return { pillar: 'showroom', view: 'certifications', iconId: icon.id };
            }
            if (icon.openHandler === 'door-designer') {
                return { pillar: 'showroom', view: 'door-designer', iconId: icon.id };
            }
            if (icon.openHandler === 'complaints-inquiry') {
                return { pillar: 'platform', view: 'icon', iconId: icon.id };
            }
            if (icon.openHandler === 'branches-hub') {
                return { pillar: 'platform', view: 'icon', iconId: icon.id };
            }
            if (icon.openHandler === 'color-rolls') {
                return { pillar: 'showroom', view: 'color-rolls', iconId: icon.id };
            }
            const exp = getCatalogExperience(icon);
            const tg = String(icon.target || '').trim();
            const linked = getProductsForVisitorIcon(icon);
            if (tg.startsWith('#') && exp !== 'shop') {
                const selBrowse = tg.toLowerCase();
                if (selBrowse === '#branches') return { pillar: 'platform', view: 'branches', iconId: icon.id };
                if (selBrowse === '#bank-accounts-section') {
                    return { pillar: 'platform', view: 'section', section: '#bank-accounts-section', iconId: icon.id };
                }
                if (selBrowse === '#products' || selBrowse === '#doors' || selBrowse === '#aluminum') {
                    return { pillar: 'store', view: 'catalog-all', iconId: icon.id, section: selBrowse };
                }
                return { pillar: 'showroom', view: 'section', section: tg, iconId: icon.id };
            }
            if (icon.catalogHub || linked.length > 1) {
                return { pillar: 'store', view: 'catalog-hub', iconId: icon.id };
            }
            if (linked.length === 1) {
                if (exp === 'shop') {
                    return { pillar: 'store', view: 'icon', iconId: icon.id };
                }
                return { pillar: 'store', view: 'product', productId: linked[0].id, iconId: icon.id };
            }
            if (exp === 'shop') {
                return { pillar: 'store', view: 'icon', iconId: icon.id };
            }
            if (exp === 'link' && tg.startsWith('#')) {
                const sel = tg.toLowerCase();
                if (sel === '#branches') return { pillar: 'platform', view: 'branches', iconId: icon.id };
                if (sel === '#bank-accounts-section') {
                    return { pillar: 'platform', view: 'section', section: '#bank-accounts-section', iconId: icon.id };
                }
                if (sel === '#products' || sel === '#doors' || sel === '#aluminum') {
                    return { pillar: 'store', view: 'catalog-all', iconId: icon.id, section: sel };
                }
                return { pillar: 'showroom', view: 'section', section: tg, iconId: icon.id };
            }
            if (exp === 'link' && /^https?:\/\//i.test(tg)) {
                return { pillar: 'platform', view: 'external', url: tg, iconId: icon.id };
            }
            return { pillar: 'showroom', view: 'icon', iconId: icon.id };
        }

        function syncHeaderDoorShowcase(active) {
            const on = !!active;
            document.body.classList.toggle('nebras-door-interface-active', on);
            const partnersAside = document.getElementById('header-aside-partners');
            const doorsAside = document.getElementById('header-aside-doors');
            const heroDoorStrip = document.getElementById('header-campaign-door-aside');
            if (partnersAside) {
                partnersAside.hidden = on;
                partnersAside.setAttribute('aria-hidden', on ? 'true' : 'false');
            }
            if (doorsAside) {
                doorsAside.hidden = !on;
                doorsAside.setAttribute('aria-hidden', on ? 'false' : 'true');
            }
            if (heroDoorStrip && on) heroDoorStrip.hidden = true;
            else if (heroDoorStrip && !on) heroDoorStrip.hidden = false;
            if (on) refreshHeaderDoorShowcase();
        }

        function openNebrasWorkspace(route) {
            if (!route) return;
            if (route.view === 'external' && route.url) {
                window.open(route.url, '_blank', 'noopener,noreferrer');
                return;
            }
            nebrasWorkspaceState.active = true;
            nebrasWorkspaceState.route = route;
            document.body.classList.add('nebras-workspace-active');
            syncHeaderDoorShowcase(route.view === 'door-designer');
            syncMobileCommerceBar();
            const ws = document.getElementById('nebras-workspace');
            if (ws) {
                ws.hidden = false;
                ws.setAttribute('aria-hidden', 'false');
            }
            const sf = document.getElementById('nebras-storefront');
            if (sf) sf.setAttribute('aria-hidden', 'true');
            renderNebrasWorkspace();
            if (route.view === 'door-designer') {
                requestAnimationFrame(function() {
                    startDoorDesignerWelcomeAudio();
                });
            }
            const main = document.getElementById('workspace-main');
            if (main) main.focus();
            try {
                const hash = '#/ws/' + encodeURIComponent(route.pillar || 'platform') + '/' + encodeURIComponent(route.view || 'home');
                if (window.location.hash !== hash) history.pushState({ nebrasWs: route }, '', hash);
            } catch (e) { /* ignore */ }
            window.scrollTo(0, 0);
        }

        function closeNebrasWorkspace() {
            stopBrandIntroWelcomeAudio();
            disposeDoorDesigner3dEngine();
            nebrasWorkspaceState.active = false;
            nebrasWorkspaceState.route = null;
            document.body.classList.remove('nebras-workspace-active');
            syncHeaderDoorShowcase(false);
            syncMobileCommerceBar();
            const ws = document.getElementById('nebras-workspace');
            if (ws) {
                ws.hidden = true;
                ws.setAttribute('aria-hidden', 'true');
            }
            const sf = document.getElementById('nebras-storefront');
            if (sf) sf.removeAttribute('aria-hidden');
            try {
                if (window.location.hash.indexOf('#/ws/') === 0) history.pushState({}, '', window.location.pathname + window.location.search);
            } catch (e) { /* ignore */ }
        }

        function switchWorkspacePillar(pillar) {
            const route = nebrasWorkspaceState.route;
            if (!route) return;
            if (pillar === 'platform') {
                if (route.view === 'branches') openNebrasWorkspace({ pillar: 'platform', view: 'branches' });
                else openNebrasWorkspace({ pillar: 'platform', view: 'sections-hub' });
            } else if (pillar === 'showroom') {
                if (route.iconId) openNebrasWorkspace({ pillar: 'showroom', view: 'icon', iconId: route.iconId });
                else openNebrasWorkspace({ pillar: 'showroom', view: 'showroom-hub' });
            } else if (pillar === 'store') {
                if (route.productId) openNebrasWorkspace({ pillar: 'store', view: 'product', productId: route.productId, iconId: route.iconId });
                else openNebrasWorkspace({ pillar: 'store', view: 'catalog-all' });
            }
        }

        function buildWorkspaceGalleryHtml(urls) {
            const imgs = (urls || []).filter(Boolean);
            if (!imgs.length) return '';
            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            const hint = ui.lightboxOpenHint || 'اضغط للتكبير';
            return '<div class="workspace-gallery">' + imgs.map(function(src) {
                const u = normalizeMediaPath(src);
                return '<img src="' + escapeHtmlAttr(u) + '" alt="" loading="lazy" decoding="async" title="' + escapeHtmlAttr(hint) + '">';
            }).join('') + '</div>';
        }

        function buildWorkspaceDocsHtml(documents) {
            const lang = currentLang || 'ar';
            const ui = getWorkspaceUi();
            const docs = (documents || []).filter(function(d) { return d && d.url; });
            if (!docs.length) return '';
            return '<div class="workspace-docs">' + docs.map(function(d) {
                const label = lang === 'en' ? (d.labelEn || d.labelAr) : (d.labelAr || d.labelEn || ui.overlayDocument || 'وثيقة');
                return '<a href="' + escapeHtmlAttr(normalizeMediaPath(d.url)) + '" target="_blank" rel="noopener noreferrer"><i class="fas fa-file-alt"></i> ' + escapeHtmlAttr(label) + '</a>';
            }).join('') + '</div>';
        }

        function buildWorkspaceBranchesHtml() {
            ensureBuiltinBranches();
            const lang = currentLang || 'ar';
            const t = getWorkspaceUi();
            const branches = (branchesData || []).filter(function(b) { return b && b.city; });
            const listHtml = branches.map(function(branch, idx) {
                const name = getBranchDisplayName(branch, lang);
                return '<button type="button" class="workspace-branch-card' + (idx === 0 ? ' is-active' : '') + '" data-branch-idx="' + idx + '" onclick="workspaceSelectBranch(' + idx + ')">' +
                    '<h3><i class="fas fa-map-marker-alt"></i> ' + escapeHtmlAttr(name) + '</h3>' +
                    '<p><strong>' + escapeHtmlAttr(t.branchCardSalesLabel || 'مبيعات') + '</strong> ' + escapeHtmlAttr(branch.salesPhone) + '</p>' +
                    '<p><a href="tel:' + escapeHtmlAttr(branch.salesPhone) + '" onclick="event.stopPropagation()">' + escapeHtmlAttr(t.branchCallDirect || 'اتصال') + '</a></p>' +
                    '</button>';
            }).join('');
            const mapHint = branches.length
                ? '<p id="workspace-map-caption">' + escapeHtmlAttr(t.workspaceMapHint || 'اختر فرعاً لعرض موقعه') + '</p>'
                : '<p>' + escapeHtmlAttr(t.branchesEmptyPublic || 'قريباً — فروع مصنع نبراس.') + '</p>';
            return '<div class="workspace-branches-layout">' +
                '<div class="workspace-branches-list" id="workspace-branches-list">' + listHtml + '</div>' +
                '<div class="workspace-branch-map" id="workspace-branch-map">' + mapHint + '</div></div>';
        }

        function workspaceSelectBranch(idx) {
            ensureBuiltinBranches();
            const branches = (branchesData || []).filter(function(b) { return b && b.city; });
            const branch = branches[idx];
            if (!branch) return;
            document.querySelectorAll('.workspace-branch-card').forEach(function(el, i) {
                el.classList.toggle('is-active', i === idx);
            });
            const mapEl = document.getElementById('workspace-branch-map');
            const lang = currentLang || 'ar';
            const name = getBranchDisplayName(branch, lang);
            const t = getWorkspaceUi();
            if (!mapEl) return;
            const phone = branch.salesPhone || '';
            mapEl.innerHTML = '<div style="padding:16px;text-align:center">' +
                '<h3 style="margin:0 0 12px;color:#0d2840">' + escapeHtmlAttr(name) + '</h3>' +
                '<p style="margin:0 0 16px">' + escapeHtmlAttr(t.branchCardSalesLabel || 'مبيعات') + ': <a href="tel:' + escapeHtmlAttr(phone) + '">' + escapeHtmlAttr(phone) + '</a></p>' +
                '<a class="workspace-action-btn workspace-action-btn--primary" href="tel:' + escapeHtmlAttr(phone) + '"><i class="fas fa-phone-alt"></i> ' + escapeHtmlAttr(t.branchCallDirect || 'اتصال مباشر') + '</a>' +
                '<p style="margin:16px 0 0;opacity:0.85;font-size:0.88rem">' + escapeHtmlAttr(t.workspaceMapDialHint || 'للموقع على الخريطة تواصل مع المبيعات أو زر «اتصال بالمندوب الأقرب» من الصفحة الرئيسية.') + '</p></div>';
        }

        function buildWorkspaceProductGridHtml(products) {
            const lang = currentLang || 'ar';
            const ui = siteText[lang] || siteText.ar;
            return '<div class="nebras-store-catalog-grid">' + products.map(function(p) {
                const title = getLocalizedCatalogField(p, 'title', lang);
                const text = getLocalizedCatalogField(p, 'text', lang);
                const img = resolveDisplayMediaUrl(getProductMediaGallery(p)[0] || '');
                const priceLine = getProductPriceLine(p, lang, ui);
                const desc = text ? String(text).slice(0, 90) + (text.length > 90 ? '…' : '') : '';
                return '<button type="button" class="nebras-store-catalog-card" onclick="openProductFromWorkspaceHub(\'' + escapeHtmlAttr(p.id) + '\')">' +
                    '<span class="nebras-store-catalog-media">' +
                    (img ? '<img src="' + escapeHtmlAttr(img) + '" alt="' + escapeHtmlAttr(title) + '" loading="lazy" decoding="async">' : '<span class="nebras-store-catalog-placeholder"><i class="fas fa-box"></i></span>') +
                    '</span>' +
                    '<span class="nebras-store-catalog-body">' +
                    '<strong class="nebras-store-catalog-title">' + escapeHtmlAttr(title) + '</strong>' +
                    (desc ? '<span class="nebras-store-catalog-desc">' + escapeHtmlAttr(desc) + '</span>' : '') +
                    '<span class="nebras-store-catalog-price">' + escapeHtmlAttr(priceLine) + '</span>' +
                    '<span class="nebras-store-catalog-cta"><i class="fas fa-arrow-left"></i> ' + escapeHtmlAttr(ui.iconInnerOpenProduct || 'عرض المنتج') + '</span>' +
                    '</span></button>';
            }).join('') + '</div>';
        }

        function mountStorefrontSectionInWorkspace(selector) {
            const el = document.querySelector(selector);
            if (!el) return '<p class="workspace-intro">' + escapeHtmlAttr(getWorkspaceUi().workspaceSectionMissing || 'المحتوى قيد التحديث.') + '</p>';
            const clone = el.cloneNode(true);
            clone.removeAttribute('id');
            clone.querySelectorAll('[id]').forEach(function(node) { node.removeAttribute('id'); });
            return '<div class="workspace-section-mount">' + clone.outerHTML + '</div>';
        }

        function renderNebrasWorkspace() {
            const route = nebrasWorkspaceState.route;
            if (!route || route.view !== 'door-designer') disposeDoorDesigner3dEngine();
            const main = document.getElementById('workspace-main');
            const titleEl = document.getElementById('workspace-page-title');
            const badgeEl = document.getElementById('workspace-layer-badge');
            if (!route || !main) return;
            const lang = currentLang || 'ar';
            const ui = getWorkspaceUi();
            const pillar = route.pillar || 'platform';
            if (badgeEl) badgeEl.textContent = pillarLabel(pillar);
            document.querySelectorAll('.workspace-pillar-btn').forEach(function(btn) {
                btn.classList.toggle('is-active', btn.getAttribute('data-pillar') === pillar);
            });
            let title = '';
            let html = '';
            const icon = route.iconId ? visitorIcons.find(function(i) { return i.id === route.iconId; }) : null;

            if (route.view === 'branches') {
                title = ui.branchesTitle || 'فروع نبراس';
                html = '<p class="workspace-intro">' + escapeHtmlAttr(ui.workspaceBranchesIntro || 'فروع المملكة — اختر فرعاً للتواصل مع المبيعات.') + '</p>' + buildWorkspaceBranchesHtml();
                setTimeout(function() { workspaceSelectBranch(0); }, 0);
            } else if (route.view === 'showroom-hub') {
                title = ui.showroomHubTitle || 'معرض نبراس';
                html = buildShowroomHubHtml(lang);
            } else if (route.view === 'certifications') {
                title = ui.certsOverlayTitle || 'اعتمادات وشهادات نبراس';
                html = '<p class="workspace-intro">' + escapeHtmlAttr(ui.certsOverlayIntro || '') + '</p>' +
                    '<div class="nebras-cert-grid icon-overlay-gallery" style="display:grid">' + buildCertificationsGridHtml(lang) + '</div>';
            } else if (route.view === 'about-page' && route.pageId) {
                title = getAboutPageLocalized(aboutPages[route.pageId], 'title', lang) || ui.aboutTitle1;
                html = buildAboutPageWorkspaceHtml(route.pageId);
            } else if (route.view === 'door-designer') {
                title = ui.visitorQuickDoorDesigner || 'صمّم بابك مع نبراس';
                html = buildDoorDesignerWorkspaceHtml();
            } else if (route.view === 'color-rolls') {
                title = icon ? getVisitorIconDisplayTitle(icon) : (ui.visitorQuickColorRolls || 'كتالوج ألوان نبراس');
                const detail = icon
                    ? (lang === 'en' ? (icon.textEn || icon.textAr) : (icon.textAr || icon.textEn || ''))
                    : '';
                html = (detail ? '<p class="workspace-intro">' + escapeHtmlAttr(detail) + '</p>' : '') +
                    buildNebrasColorCollectionWorkspaceHtml();
            } else if (route.view === 'catalog-all' || route.view === 'catalog-hub') {
                title = route.view === 'catalog-hub' && icon
                    ? getVisitorIconDisplayTitle(icon)
                    : (ui.catalogHubTitle || 'كتالوج منتجات نبراس');
                const products = route.view === 'catalog-hub' && icon
                    ? getProductsForVisitorIcon(icon)
                    : siteProducts.filter(function(p) { return p && p.visible !== false; });
                const intro = icon
                    ? (lang === 'en' ? (icon.textEn || icon.textAr) : (icon.textAr || icon.textEn || ''))
                    : (ui.catalogHubIntro || '');
                const hubMode = route.view === 'catalog-hub' && icon
                    ? getCatalogExperience(icon)
                    : 'shop';
                html = buildWorkspaceModeHintHtml(hubMode === 'shop' ? 'shop' : 'browse', lang) +
                    '<p class="workspace-intro">' + escapeHtmlAttr(intro || ui.workspaceStoreIntro || 'متجر نبراس — اختر منتجاً للمعرض والأسعار وعرض السعر.') + '</p>' +
                    buildWorkspaceProductGridHtml(products);
            } else if (route.view === 'product' && route.productId) {
                const product = siteProducts.find(function(p) { return p.id === route.productId; });
                if (!product) {
                    html = '<p>' + escapeHtmlAttr(ui.workspaceProductMissing || 'المنتج غير متوفر.') + '</p>';
                } else {
                    title = getLocalizedCatalogField(product, 'title', lang);
                    const showShop = shouldShowShopActions(route);
                    html = buildWorkspaceModeHintHtml(showShop ? 'shop' : 'browse', lang) +
                        buildProductDetailInnerHtml(product, lang, { showShopActions: showShop });
                }
            } else if (route.view === 'section' && route.section) {
                title = icon ? getVisitorIconDisplayTitle(icon) : (ui.workspaceSectionTitle || 'قسم نبراس');
                const detail = icon
                    ? (lang === 'en' ? (icon.textEn || icon.textAr) : (icon.textAr || icon.textEn || ''))
                    : '';
                if (route.section === '#bank-accounts-section') {
                    html = (detail ? '<p class="workspace-intro">' + escapeHtmlAttr(detail) + '</p>' : '') +
                        buildNebrasBankAccountsWorkspaceHtml();
                } else {
                    html = (detail ? '<p class="workspace-intro">' + escapeHtmlAttr(detail) + '</p>' : '') +
                        buildWorkspaceGalleryHtml(icon ? getVisitorIconAlbumUrls(icon) : []) +
                        buildWorkspaceDocsHtml(icon ? icon.documents : []) +
                        mountStorefrontSectionInWorkspace(route.section);
                }
            } else if (route.view === 'icon' && icon) {
                title = getVisitorIconDisplayTitle(icon);
                const detail = isServicePlacementIcon(icon)
                    ? getServiceIconDescription(icon, lang)
                    : (lang === 'en' ? (icon.textEn || icon.textAr) : lang === 'zh' ? (icon.textZh || icon.textAr) : (icon.textAr || icon.textEn || ''));
                const exp = getCatalogExperience(icon);
                const showShop = shouldShowShopActions(route);
                html = buildWorkspaceModeHintHtml(showShop ? 'shop' : 'browse', lang) +
                    '<p class="workspace-intro">' + escapeHtmlAttr(detail || getVisitorTargetCaption(icon)) + '</p>' +
                    buildWorkspaceGalleryHtml(getIconWorkspaceGalleryUrls(icon)) +
                    buildWorkspaceDocsHtml(icon.documents || []);
                if (icon.linkedProductId) {
                    const linkedProduct = siteProducts.find(function(p) { return p.id === icon.linkedProductId; });
                    if (linkedProduct) {
                        html += buildProductDetailInnerHtml(linkedProduct, lang, { showShopActions: showShop });
                    }
                } else if (exp === 'shop') {
                    html += '<div class="workspace-actions-row"><button type="button" class="workspace-action-btn workspace-action-btn--primary" onclick="openNebrasWorkspace({pillar:\'store\',view:\'catalog-hub\',iconId:' + icon.id + '})"><i class="fas fa-store"></i> ' + escapeHtmlAttr(ui.workspaceOpenStore || 'فتح المتجر') + '</button></div>';
                }
                if (icon.openHandler === 'complaints-inquiry') {
                    html += '<div class="workspace-actions-row"><button type="button" class="workspace-action-btn workspace-action-btn--primary" onclick="openCustomerComplaints()"><i class="fas fa-comment-dots"></i> ' + escapeHtmlAttr(ui.workspaceComplaintInquiryBtn || 'استفسار عن شكوى') + '</button></div>';
                }
                if (icon.openHandler === 'branches-hub') {
                    html += '<div class="workspace-actions-row"><button type="button" class="workspace-action-btn workspace-action-btn--primary" onclick="openNebrasWorkspace({pillar:\'platform\',view:\'branches\'})"><i class="fas fa-map-marked-alt"></i> ' + escapeHtmlAttr(ui.workspaceBranchesListBtn || 'قائمة الفروع والاتصال') + '</button></div>';
                }
            } else if (route.view === 'occasion') {
                const lang = currentLang || 'ar';
                title = getOccasionDisplayTitle(lang) || ui.occasionFallbackTitle || 'مناسبة نبراس';
                html = '<p class="workspace-intro">' + escapeHtmlAttr(getOccasionDetailBody(lang) || getOccasionPromoMessage(lang)) + '</p>' +
                    buildWorkspaceGalleryHtml(getOccasionVisitorImageUrl() ? [getOccasionVisitorImageUrl()] : []) +
                    '<div class="workspace-actions-row"><button type="button" class="workspace-action-btn workspace-action-btn--primary" onclick="openNebrasWorkspace({pillar:\'store\',view:\'catalog-all\'})"><i class="fas fa-door-open"></i> ' + escapeHtmlAttr(ui.workspaceBrowseProducts || 'استكشف المنتجات') + '</button></div>';
            } else if (route.view === 'sections-hub') {
                title = ui.workspacePlatformHub || 'منصة نبراس';
                html = '<p class="workspace-intro">' + escapeHtmlAttr(ui.workspacePlatformIntro || 'معلومات المصنع، الفروع، والحسابات.') + '</p>' +
                    '<div class="workspace-actions-row">' +
                    '<button type="button" class="workspace-action-btn" onclick="openNebrasWorkspace({pillar:\'platform\',view:\'branches\'})"><i class="fas fa-map-marked-alt"></i> ' + escapeHtmlAttr(ui.visitorQuickBranches || 'الفروع') + '</button>' +
                    '<button type="button" class="workspace-action-btn" onclick="openVisitorIcon(4)"><i class="fas fa-building-columns"></i> ' + escapeHtmlAttr(ui.visitorQuickBankAccounts || 'الحسابات') + '</button>' +
                    '</div>';
            } else {
                title = ui.workspaceDefaultTitle || 'نبراس';
                html = '<p class="workspace-intro">' + escapeHtmlAttr(ui.workspaceDefaultIntro || 'اختر قسماً من الواجهة الرئيسية.') + '</p>';
            }

            if (titleEl) titleEl.textContent = title;
            if (pillar === 'store') {
                html = buildVisitorPrivacyStripHtml(lang) + html;
            }
            main.innerHTML = html;
            const shell = document.querySelector('.workspace-shell');
            if (shell) {
                shell.classList.toggle('workspace-shell--door-designer', route.view === 'door-designer');
                const cfgDoor = route.view === 'door-designer' ? ensureDoorDesignerConfig() : null;
                shell.classList.toggle('workspace-shell--door-data-only', route.view === 'door-designer' && cfgDoor && !isDoorDesignerPreviewEnabled(cfgDoor));
            }
            if (main) {
                main.classList.toggle('workspace-main--door-designer', route.view === 'door-designer');
                const cfgDoor = route.view === 'door-designer' ? ensureDoorDesignerConfig() : null;
                main.classList.toggle('workspace-main--door-data-only', route.view === 'door-designer' && cfgDoor && !isDoorDesignerPreviewEnabled(cfgDoor));
                if (route.view === 'door-designer') main.scrollTop = 0;
            }
            applyWorkspaceTranslations();
            wireClickableMediaIn(main);
            if (main.querySelector('.nebras-bank-workspace, .bank-accounts-showcase')) {
                hydrateBankAccountMedia(main);
            }
            if (route.view === 'door-designer') bindDoorDesignerWorkspace();
            syncHeaderDoorShowcase(route.view === 'door-designer');
        }

        function applyWorkspaceTranslations() {
            const ui = getWorkspaceUi();
            setElementTextGlobal('workspace-back-label', ui.workspaceBackHome || 'الواجهة الرئيسية');
            setElementTextGlobal('workspace-pillar-platform-label', ui.workspacePillarPlatform || 'منصة');
            setElementTextGlobal('workspace-pillar-showroom-label', ui.workspacePillarShowroom || 'معرض');
            setElementTextGlobal('workspace-pillar-store-label', ui.workspacePillarStore || 'متجر');
            setElementTextGlobal('workspace-quote-btn', ui.workspaceQuoteBtn || 'عرض سعر');
        }

        function setElementTextGlobal(id, value) {
            const el = document.getElementById(id);
            if (el && value != null) el.textContent = value;
        }

        function openProductShopFromWorkspace(productId) {
            const product = siteProducts.find(function(p) { return p.id === productId; });
            if (!product || !productHasShop(product)) return;
            openProductShop(productId);
        }

        function openVisitorIcon(iconId) {
            const icon = visitorIcons.find(item => item.id === iconId);
            if (!icon) return;
            if (icon.linkedProductId === 'prod-complaints' && icon.openHandler !== 'complaints-inquiry') {
                openCustomerComplaints();
                return;
            }
            const route = resolveIconWorkspaceRoute(icon);
            if (route.view === 'external' && route.url) {
                window.open(route.url, '_blank', 'noopener,noreferrer');
                return;
            }
            openNebrasWorkspace(route);
        }
        function renderVisitorIcons() {
            const container = document.getElementById('visitor-icons-lanes') || document.getElementById('visitor-icons-grid');
            if (!container) {
                resolveDashboardBackgrounds();
                return;
            }
            const lang = currentLang || 'ar';
            const ui = siteText[lang] || siteText.ar;
            const lanes = [
                { id: 'store', title: ui.gatewayLaneStore || 'المتجر الإلكتروني', hint: ui.gatewayLaneStoreHint || 'منتجات WPC والألومنيوم — شراء وعرض سعر', icon: 'fas fa-store' },
                { id: 'showroom', title: ui.gatewayLaneShowroom || 'معرض نبراس', hint: ui.gatewayLaneShowroomHint || 'ألوان، شهادات، ومعارض بصرية', icon: 'fas fa-images' },
                { id: 'platform', title: ui.gatewayLanePlatform || 'منصة المصنع', hint: ui.gatewayLanePlatformHint || 'فروع، حسابات، وخدمات المصنع', icon: 'fas fa-globe' }
            ];
            const visible = visitorIcons.filter(isGatewayVisitorIcon);
            container.innerHTML = lanes.map(function(lane) {
                const icons = visible.filter(function(i) { return getVisitorIconLane(i) === lane.id; });
                if (!icons.length) return '';
                return '<div class="visitor-lane visitor-lane--' + lane.id + '">' +
                    '<div class="visitor-lane-head"><i class="' + lane.icon + '" aria-hidden="true"></i>' +
                    '<div><h3 class="visitor-lane-title">' + escapeHtmlAttr(lane.title) + '</h3>' +
                    '<p class="visitor-lane-hint">' + escapeHtmlAttr(lane.hint) + '</p></div></div>' +
                    '<div class="visitor-icons-grid">' + icons.map(function(icon) { return renderVisitorIconCardMarkup(icon); }).join('') + '</div></div>';
            }).join('');
            resolveDashboardBackgrounds();
            renderSiteServiceCards();
            initStorefrontScrollReveal();
        }

        function openNebrasGatewayLane(laneId) {
            if (laneId === 'store') openNebrasWorkspace({ pillar: 'store', view: 'catalog-all' });
            else if (laneId === 'showroom') openShowroomHub();
            else openNebrasWorkspace({ pillar: 'platform', view: 'sections-hub' });
        }

        function closeAdminSection(sectionId) {
            document.getElementById(sectionId).classList.remove('show');
        }

        function parseAdminPermissionsInput(raw, fallbackRole) {
            const keys = Object.keys(NEBRAS_PERMISSION_LABELS);
            if (!raw || !String(raw).trim()) {
                return (rolePermissions[fallbackRole || 'manager'] || []).slice();
            }
            return String(raw).split(/[,،\s]+/).map(function(x) { return x.trim(); }).filter(function(x) {
                return keys.indexOf(x) >= 0;
            });
        }

        function formatAdminPermissions(user) {
            if (user.isPrimary) return 'إدارة رئيسية — كامل الصلاحيات';
            if (Array.isArray(user.permissions) && user.permissions.length) {
                return user.permissions.map(function(k) { return NEBRAS_PERMISSION_LABELS[k] || k; }).join(' · ');
            }
            return (rolePermissions[user.role] || []).map(function(k) { return NEBRAS_PERMISSION_LABELS[k] || k; }).join(' · ');
        }

        function addNewUser() {
            if (!requirePermission('users', 'هذه العملية متاحة فقط لمسؤولي المستخدمين.')) return;
            if (!isMainGovernanceAdmin()) {
                alert('إنشاء مستخدمين فرعيين متاح فقط للإدارة الرئيسية (NEBRASFACTORY / NEBRASBASIC).');
                return;
            }
            const employeeId = prompt('معرف الموظف (ID) — مثال EMP-102:', 'EMP-' + Date.now());
            if (employeeId === null) return;
            const username = prompt('اسم المستخدم (للدخول):');
            const password = prompt('كلمة المرور:');
            const role = prompt('الدور (manager = إدارة فرعية / hr = موارد بشرية):', 'manager');
            if (username && password && role) {
                const normalizedRole = role.trim().toLowerCase();
                if (normalizedRole === 'superadmin') {
                    alert('لا يمكن إنشاء Super Admin فرعي — الإدارة الرئيسية فقط.');
                    return;
                }
                if (!allowedRoles.includes(normalizedRole)) {
                    alert('الدور غير صحيح. الأدوار: manager / hr');
                    return;
                }
                const permHelp = Object.keys(NEBRAS_PERMISSION_LABELS).join(', ');
                const permsRaw = prompt('صلاحيات مخصصة (مفصولة بفاصلة):\n' + permHelp + '\n\nمثال: content,sales,audit', 'content,sales');
                const permissions = parseAdminPermissionsInput(permsRaw, normalizedRole);
                const id = (employeeId || '').trim() || ('user-' + Date.now());
                if (adminUsers.some(function(u) { return u.id === id; })) {
                    alert('معرف الموظف مستخدم مسبقاً.');
                    return;
                }
                adminUsers.push({ id: id, username: username.trim(), password: password.trim(), role: normalizedRole, permissions: permissions, isPrimary: false });
                saveSystemData();
                alert('تم إضافة المستخدم الفرعي بنجاح — الصلاحيات: ' + permissions.join(', '));
                displayUsers();
                addAuditLog('إضافة مستخدم', 'تمت إضافة ' + username + ' بدور ' + role);
            }
        }

        function displayUsers() {
            const list = document.getElementById('users-list');
            if (!list) return;
            list.innerHTML = adminUsers.map(function(user, index) {
                const primaryBadge = user.isPrimary ? ' <span class="admin-user-primary-badge">رئيسي</span>' : '';
                const actions = user.isPrimary
                    ? '<button onclick="editUser(' + index + ')">تعديل</button>'
                    : '<button onclick="editUser(' + index + ')">تعديل</button> <button onclick="deleteUser(' + index + ')">حذف</button>';
                return '<li><strong>' + escapeHtmlAttr(user.id || '') + '</strong> — ' + escapeHtmlAttr(user.username) +
                    ' — ' + escapeHtmlAttr(user.role) + primaryBadge +
                    '<br><small>' + escapeHtmlAttr(formatAdminPermissions(user)) + '</small> ' + actions + '</li>';
            }).join('');
        }

        function editUser(index) {
            if (!requirePermission('users', 'هذه العملية متاحة فقط لمسؤولي المستخدمين.')) return;
            const user = adminUsers[index];
            if (!user) return;
            if (user.isPrimary && !isMainGovernanceAdmin()) {
                alert('تعديل حساب الإدارة الرئيسية — للإدارة الرئيسية فقط.');
                return;
            }
            const newId = user.isPrimary ? user.id : prompt('معرف الموظف (ID):', user.id || '');
            if (newId === null) return;
            const username = prompt('تعديل اسم المستخدم:', user.username);
            let password = user.password;
            if (user.isPrimary) {
                password = user.password;
                alert('كلمة مرور الإدارة الرئيسية لا تُعدَّل من هنا.');
            } else {
                const pwdPrompt = prompt('تعديل كلمة المرور:', user.password);
                if (pwdPrompt === null) return;
                password = pwdPrompt.trim();
            }
            let normalizedRole = user.role;
            let permissions = user.permissions;
            if (!user.isPrimary) {
                const role = prompt('تعديل الدور (manager/hr):', user.role);
                if (role === null) return;
                normalizedRole = role.trim().toLowerCase();
                if (normalizedRole === 'superadmin') {
                    alert('لا Super Admin فرعي — استخدم manager مع صلاحيات مخصصة.');
                    return;
                }
                if (!allowedRoles.includes(normalizedRole)) {
                    alert('الدور غير صحيح. manager / hr');
                    return;
                }
                const permHelp = Object.keys(NEBRAS_PERMISSION_LABELS).join(', ');
                const permsRaw = prompt('صلاحيات مخصصة:\n' + permHelp, (user.permissions || rolePermissions[normalizedRole] || []).join(','));
                if (permsRaw === null) return;
                permissions = parseAdminPermissionsInput(permsRaw, normalizedRole);
            }
            if (username && password) {
                const idVal = user.isPrimary ? user.id : String(newId).trim();
                adminUsers[index] = Object.assign({}, user, {
                    id: idVal,
                    username: username.trim(),
                    password: password,
                    role: user.isPrimary ? 'superadmin' : normalizedRole,
                    permissions: user.isPrimary ? null : permissions,
                    isPrimary: !!user.isPrimary
                });
                saveSystemData();
                displayUsers();
                addAuditLog('تعديل مستخدم', 'تم تعديل المستخدم ' + username);
            }
        }

        function deleteUser(index) {
            if (!requirePermission('users', 'هذه العملية متاحة فقط لمسؤولي المستخدمين.')) return;
            if (!isMainGovernanceAdmin()) {
                alert('حذف المستخدمين — للإدارة الرئيسية فقط.');
                return;
            }
            const user = adminUsers[index];
            if (!user) return;
            if (user.isPrimary || user.id === 'base-admin' || PRIMARY_GOVERNANCE_ADMIN_IDS.indexOf(user.id) >= 0) {
                alert('لا يمكن حذف حساب الإدارة الرئيسية.');
                return;
            }
            if (confirm('هل تريد حذف المستخدم ' + user.username + '؟')) {
                adminUsers.splice(index, 1);
                saveSystemData();
                displayUsers();
                addAuditLog('حذف مستخدم', 'تم حذف المستخدم ' + user.username);
            }
        }

        function displaySales() {
            const list = document.getElementById('sales-list');
            list.innerHTML = salesData.map(sale => `<li>${sale.product} - ${sale.amount} SAR - ${sale.date}</li>`).join('');
        }

        function addNewSale() {
            if (!requirePermission('sales')) return;
            const product = prompt('أدخل اسم المنتج:');
            const amount = prompt('أدخل المبلغ:');
            const date = prompt('أدخل التاريخ:');
            if (product && amount && date) {
                salesData.push({ id: salesData.length + 1, product, amount: parseFloat(amount), date });
                alert('تم إضافة البيع بنجاح');
                displaySales();
                renderErpHubPanel();
                addAuditLog('إضافة بيع', `${product} بقيمة ${amount}`);
            }
        }

        function displayComplaints() {
            const list = document.getElementById('complaints-list');
            if (!list) return;
            const lang = currentLang || 'ar';
            const entries = Object.entries(complaints || {}).sort(function(a, b) {
                return Date.parse(b[1].createdAt || '') - Date.parse(a[1].createdAt || '');
            });
            if (!entries.length) {
                list.innerHTML = '<li style="opacity:0.75;">لا شكاوى مسجّلة بعد.</li>';
                return;
            }
            list.innerHTML = entries.map(function(entry) {
                const id = entry[0];
                const comp = entry[1];
                const when = comp.createdAt ? formatNebrasDateTime(Date.parse(comp.createdAt), lang) : '—';
                const phone = comp.phone || '';
                return '<li class="complaint-admin-row">' +
                    '<strong>#' + escapeHtmlAttr(id) + '</strong> · ' + escapeHtmlAttr(when) + '<br>' +
                    '<strong>العميل:</strong> ' + escapeHtmlAttr(comp.customerName || '—') +
                    (phone ? ' · <a class="analytics-tel-link" href="tel:' + escapeHtmlAttr(phone) + '">' + escapeHtmlAttr(phone) + '</a>' : '') +
                    ' · <strong>الفرع:</strong> ' + escapeHtmlAttr(comp.branch || '—') + '<br>' +
                    '<strong>الشكوى:</strong> ' + escapeHtmlAttr(comp.description || '') + '<br>' +
                    '<strong>التحويل:</strong> ' + escapeHtmlAttr(comp.routedSalesBranch || '') + ' — ' + escapeHtmlAttr(comp.routedSalesPhone || '') + '<br>' +
                    '<strong>الحالة:</strong> ' + escapeHtmlAttr(getComplaintStatusLabel(comp.status, lang)) +
                    ' <button type="button" onclick="updateComplaintStatus(\'' + escapeHtmlAttr(id) + '\')">تحديث الحالة</button>' +
                    (phone ? ' <a class="analytics-tel-link" href="tel:' + escapeHtmlAttr(phone) + '"><i class="fas fa-phone"></i> اتصل</a>' : '') +
                    '</li>';
            }).join('');
        }

        function updateComplaintStatus(complaintId) {
            if (!requirePermission('complaints')) return;
            const complaint = complaints[complaintId];
            if (!complaint) return;
            const newStatus = prompt('أدخل الحالة الجديدة (pending/inProgress/resolved):', complaint.status);
            if (!newStatus) return;
            if (!['pending', 'inProgress', 'resolved'].includes(newStatus)) {
                alert('الحالة غير صحيحة');
                return;
            }
            complaint.status = newStatus;
            saveSystemData();
            displayComplaints();
            if (currentAdmin && canManage('audit')) renderAdminAnalyticsPanel();
            addAuditLog('تحديث شكوى', `تم تحديث الشكوى ${complaintId} إلى ${newStatus}`);
        }

        function displayCustomerService() {
            const list = document.getElementById('customer-service-list');
            list.innerHTML = customerServiceData.map(item => `<li>${item.inquiry} - ${item.response}</li>`).join('');
        }

        function displayBranches() {
            const grid = document.getElementById('branches-grid');
            if (!grid) return;
            ensureBuiltinBranches();
            const lang = currentLang || 'ar';
            const t = siteText[lang] || siteText.ar;
            const branches = (branchesData || []).filter(function(b) { return b && b.city; });
            grid.innerHTML = branches.map(function(branch) {
                const name = getBranchDisplayName(branch, lang);
                const bid = escapeHtmlAttr(branch.id);
                return '<div class="branch-card" data-branch-id="' + bid + '">' +
                    '<h3><i class="fas fa-map-marker-alt"></i> ' + escapeHtmlAttr(name) + '</h3>' +
                    '<p><strong>' + escapeHtmlAttr(t.branchCardSalesLabel) + '</strong> ' + escapeHtmlAttr(branch.salesPhone) + '</p>' +
                    '<div class="branch-actions">' +
                    '<a href="tel:' + escapeHtmlAttr(branch.salesPhone) + '"><i class="fas fa-phone-alt"></i> ' + escapeHtmlAttr(t.branchCallDirect) + '</a>' +
                    '<a href="#" onclick="event.preventDefault(); branchSmartDial(' + Number(branch.id) + ');"><i class="fas fa-route"></i> ' + escapeHtmlAttr(t.branchSmartRoute) + '</a>' +
                    '</div></div>';
            }).join('');
            branches.forEach(function(branch) {
                const card = grid.querySelector('[data-branch-id="' + branch.id + '"]');
                if (!card) return;
                const urls = branchImageUrls(branch.image);
                if (urls.length) tryUrls(card, urls, 0);
            });
        }

        function displayBranchesAdmin() {
            const list = document.getElementById('branches-admin-list');
            list.innerHTML = branchesData.map((branch, index) => `
                <li>
                    ${branch.city} | EN: ${branch.city_en || '—'} | ZH: ${branch.city_zh || '—'} — ${branch.salesPhone}
                    <button onclick="editBranch(${index})">تعديل</button>
                    <button onclick="deleteBranch(${index})">حذف</button>
                </li>
            `).join('');
        }

        function addBranch() {
            if (!requirePermission('branches')) return;
            const names = promptBranchCityNames(null);
            if (!names) return;
            const salesPhone = prompt('رقم مبيعات الفرع:');
            const image = prompt('اسم أو مسار الصورة (مثال: images/branch-riyadh.jpg):');
            if (salesPhone && image) {
                branchesData.push(Object.assign({ id: Date.now(), salesPhone: salesPhone.trim(), image: image.trim() }, names));
                branchesData = branchesData.map(normalizeBranchRecord);
                displayBranchesAdmin();
                saveContentData();
                addAuditLog('إضافة فرع', names.city + ' - ' + salesPhone);
            }
        }

        function editBranch(index) {
            if (!requirePermission('branches')) return;
            const branch = branchesData[index];
            if (!branch) return;
            const names = promptBranchCityNames(branch);
            if (!names) return;
            const salesPhone = prompt('تعديل رقم المبيعات:', branch.salesPhone);
            const image = prompt('تعديل مسار الصورة:', branch.image);
            if (salesPhone && image) {
                branchesData[index] = Object.assign({}, branch, names, { salesPhone: salesPhone.trim(), image: image.trim() });
                branchesData[index] = normalizeBranchRecord(branchesData[index]);
                displayBranchesAdmin();
                saveContentData();
                addAuditLog('تعديل فرع', names.city + ' - ' + salesPhone);
            }
        }

        function deleteBranch(index) {
            if (!requirePermission('branches')) return;
            const branch = branchesData[index];
            if (!branch) return;
            if (confirm(`هل تريد حذف فرع ${branch.city}؟`)) {
                branchesData.splice(index, 1);
                displayBranchesAdmin();
                saveContentData();
                addAuditLog('حذف فرع', branch.city);
            }
        }

        function displayAuditLog() {
            const list = document.getElementById('audit-log-list');
            if (!list) return;
            if (!auditLogs.length) {
                list.innerHTML = '<li>لا توجد عمليات مسجلة حتى الآن.</li>';
                return;
            }
            list.innerHTML = auditLogs.map(log => `
                <li>
                    <strong>${log.action}</strong> - ${log.details}
                    <small>بواسطة: ${log.actor} | الوقت: ${log.at}</small>
                </li>
            `).join('');
        }

        function scrollToSection(selector) {
            if (nebrasWorkspaceState.active) {
                openNebrasWorkspace({ pillar: 'showroom', view: 'section', section: selector });
                return;
            }
            const target = document.querySelector(selector);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        let nebrasCloudSaveTimer = null;
        let nebrasCloudSynced = false;

        const NEBRAS_CLOUD_STORE_SPECS = [
            { key: 'site_products', get: function() { return siteProducts; }, set: function(v) { siteProducts = Array.isArray(v) ? v : []; } },
            { key: 'visitor_icons', get: function() { return visitorIcons; }, set: function(v) { visitorIcons = Array.isArray(v) ? v : []; } },
            { key: 'dashboard_tiles', get: function() { return dashboardTiles; }, set: function(v) { dashboardTiles = Array.isArray(v) ? v : []; } },
            { key: 'site_custom_sections', get: function() { return siteCustomSections; }, set: function(v) { siteCustomSections = Array.isArray(v) ? v : []; } },
            { key: 'about_pages', get: function() { return aboutPages; }, set: function(v) { aboutPages = v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } },
            { key: 'system_settings', get: function() { return systemSettings; }, set: function(v) {
                const incoming = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
                systemSettings = Object.assign({}, DEFAULT_SYSTEM_SETTINGS, incoming);
                if (incoming.doorDesigner && typeof incoming.doorDesigner === 'object' && !Array.isArray(incoming.doorDesigner)) {
                    systemSettings.doorDesigner = Object.assign(
                        JSON.parse(JSON.stringify(DEFAULT_DOOR_DESIGNER)),
                        incoming.doorDesigner
                    );
                }
            } },
            { key: 'admin_users', get: function() { return adminUsers; }, set: function(v) { adminUsers = Array.isArray(v) ? v : []; } },
            { key: 'branches', get: function() { return branchesData; }, set: function(v) { branchesData = Array.isArray(v) ? v : []; } },
            { key: 'complaints', get: function() { return complaints; }, set: function(v) {
                if (Array.isArray(v)) {
                    const obj = {};
                    v.forEach(function(c, i) {
                        if (c && typeof c === 'object') obj[c.id || String(i)] = c;
                    });
                    complaints = obj;
                } else if (v && typeof v === 'object') {
                    complaints = v;
                }
            }},
            { key: 'audit_logs', get: function() { return auditLogs; }, set: function(v) { auditLogs = Array.isArray(v) ? v : []; } },
            { key: 'erp_inventory', get: function() { return erpInventory; }, set: function(v) { erpInventory = Array.isArray(v) ? v : []; } },
            { key: 'erp_orders', get: function() { return erpOrders; }, set: function(v) { erpOrders = Array.isArray(v) ? v : []; } },
            { key: 'erp_procurement', get: function() { return erpProcurement; }, set: function(v) { erpProcurement = Array.isArray(v) ? v : []; } },
            { key: 'site_partners', get: function() { return sitePartners; }, set: function(v) { sitePartners = Array.isArray(v) ? v : []; } },
            { key: 'site_certifications', get: function() { return siteCertifications; }, set: function(v) { siteCertifications = Array.isArray(v) ? v : []; } },
            { key: 'showroom_gallery', get: function() { return ensureShowroomGallery(); }, set: function(v) { showroomGallery = normalizeShowroomGallery(v); } },
            { key: 'visitor_analytics', get: function() { ensureVisitorAnalytics(); return visitorAnalytics; }, set: function(v) {
                visitorAnalytics = v && typeof v === 'object' && !Array.isArray(v) ? v : { sessions: [], totalVisits: 0, totalPageViews: 0, lastUpdated: 0 };
                ensureVisitorAnalytics();
            }},
            { key: 'sales_data', get: function() { return salesData; }, set: function(v) { salesData = Array.isArray(v) ? v : []; } },
            { key: 'sales_quotes_inbox', get: function() { return loadSalesQuotesInbox(); }, set: function(v) {
                saveSalesQuotesInboxLocalOnly(Array.isArray(v) ? v : []);
            }},
            { key: 'analytics_governance', get: function() { ensureAnalyticsGovernance(); return analyticsGovernance; }, set: function(v) {
                analyticsGovernance = v && typeof v === 'object' ? v : { deleted: { quotes: [], visitors: [], complaints: [], sales: [], customers: [] } };
                ensureAnalyticsGovernance();
            }}
        ];

        function applyNebrasCloudRow(storeKey, payload) {
            const spec = NEBRAS_CLOUD_STORE_SPECS.find(function(s) { return s.key === storeKey; });
            if (!spec || payload === undefined || payload === null) return;
            if (Array.isArray(payload) && !payload.length) {
                if (storeKey === 'branches' || storeKey === 'site_partners' || storeKey === 'site_certifications' ||
                    storeKey === 'admin_users' || storeKey === 'visitor_icons' || storeKey === 'dashboard_tiles' ||
                    storeKey === 'site_products') {
                    return;
                }
            }
            spec.set(payload);
        }

        let nebrasThreeLoadPromise = null;
        function loadNebrasThreeJs() {
            if (typeof globalThis.THREE !== 'undefined' || typeof window.THREE !== 'undefined') {
                return Promise.resolve();
            }
            if (nebrasThreeLoadPromise) return nebrasThreeLoadPromise;
            nebrasThreeLoadPromise = new Promise(function(resolve, reject) {
                const s = document.createElement('script');
                s.src = 'js/vendor/three.min.js';
                s.async = true;
                s.onload = function() { resolve(); };
                s.onerror = function() { reject(new Error('three.min.js load failed')); };
                document.head.appendChild(s);
            });
            return nebrasThreeLoadPromise;
        }

        function finalizePlatformDataAfterLoad() {
            branchesData = (branchesData || []).map(normalizeBranchRecord);
            ensureDefaultBankAccounts();
            ensureBuiltinAboutPages();
            ensureBuiltinErpData();
            ensureBuiltinSiteCatalog();
            ensureBuiltinVisitorIcons();
            migrateVisitorIconMediaPaths();
            ensureBuiltinBranches();
            if (!Array.isArray(sitePartners)) sitePartners = [];
            ensureBuiltinSitePartners();
            ensurePrimaryRecoveryEmail();
            if (!Array.isArray(siteCertifications)) siteCertifications = [];
            ensureShowroomGallery();
            refreshNebrasMiniShowcases();
            ensureDoorDesignerConfig();
            ensureDashboardGovernanceHandlers();
            ensureAnalyticsGovernance();
            adminUsers = (Array.isArray(adminUsers) ? adminUsers : []).map(function(user, index) {
                const role = user && allowedRoles.includes(String(user.role || '').toLowerCase()) ? String(user.role).toLowerCase() : 'manager';
                const isPrimary = user && (user.isPrimary === true || PRIMARY_GOVERNANCE_ADMIN_IDS.indexOf(user.id) >= 0 ||
                    PRIMARY_GOVERNANCE_USERNAMES.indexOf(String(user.username || '').toUpperCase()) >= 0);
                return {
                    id: user && user.id ? user.id : 'user-' + Date.now() + '-' + index,
                    username: user && user.username ? user.username : 'user' + (index + 1),
                    password: user && user.password ? user.password : 'ChangeMe123',
                    role: role,
                    permissions: Array.isArray(user && user.permissions) ? user.permissions.filter(Boolean) : null,
                    isPrimary: !!isPrimary
                };
            });
            if (!Array.isArray(visitorIcons)) visitorIcons = [];
            purgeStaleCatalogReferences();
            if (!adminUsers.some(function(user) { return user.id === 'base-admin'; })) {
                adminUsers.unshift({ id: 'base-admin', username: 'NEBRASBASIC', password: 'NEBRASBASIC123', role: 'superadmin', isPrimary: true });
            }
            if (!adminUsers.some(function(user) { return String(user.username || '').toUpperCase() === 'NEBRASFACTORY'; })) {
                adminUsers.unshift({ id: 'nebras-factory-admin', username: 'NEBRASFACTORY', password: 'NEBRASFACTORYCOMPANYBASIC', role: 'superadmin', isPrimary: true });
            }
            adminUsers.forEach(function(u) {
                if (u.isPrimary) {
                    u.role = 'superadmin';
                    u.permissions = null;
                }
            });
        }

        async function loadFromNebrasCloud() {
            if (!supabaseClient) return false;
            try {
                const { data, error } = await supabaseClient
                    .from('nebras_data_store')
                    .select('store_key, payload, updated_at');
                if (error) {
                    console.warn('Nebras cloud load failed:', error.message || error);
                    return false;
                }
                if (!data || !data.length) return false;
                data.forEach(function(row) {
                    if (row && row.store_key) applyNebrasCloudRow(row.store_key, row.payload);
                });
                nebrasCloudSynced = true;
                return true;
            } catch (err) {
                console.warn('Nebras cloud load error:', err);
                return false;
            }
        }

        async function pushToNebrasCloud() {
            if (!supabaseClient) return;
            const rows = NEBRAS_CLOUD_STORE_SPECS.map(function(spec) {
                return {
                    store_key: spec.key,
                    payload: spec.get(),
                    updated_at: new Date().toISOString()
                };
            });
            try {
                const { error } = await supabaseClient
                    .from('nebras_data_store')
                    .upsert(rows, { onConflict: 'store_key' });
                if (error) {
                    console.warn('Nebras cloud save failed:', error.message || error);
                    return;
                }
                nebrasCloudSynced = true;
            } catch (err) {
                console.warn('Nebras cloud save error:', err);
            }
        }

        function schedulePushToNebrasCloud() {
            if (nebrasCloudSaveTimer) clearTimeout(nebrasCloudSaveTimer);
            nebrasCloudSaveTimer = setTimeout(function() {
                pushToNebrasCloud();
            }, 500);
        }

        function saveSystemData(options) {
            options = options || {};
            purgeDeprecatedVisitorIcons();
            try {
            localStorage.setItem('nebrasComplaints', JSON.stringify(complaints));
            localStorage.setItem('nebrasBranches', JSON.stringify(branchesData));
            localStorage.setItem('nebrasAuditLogs', JSON.stringify(auditLogs));
            localStorage.setItem('nebrasSystemSettings', JSON.stringify(systemSettings));
            localStorage.setItem('nebrasAdminUsers', JSON.stringify(adminUsers));
            localStorage.setItem('nebrasVisitorIcons', JSON.stringify(visitorIcons));
            localStorage.setItem('nebrasSiteProducts', JSON.stringify(siteProducts));
            localStorage.setItem('nebrasDashboardTiles', JSON.stringify(dashboardTiles));
            localStorage.setItem('nebrasCustomSections', JSON.stringify(siteCustomSections));
            localStorage.setItem('nebrasErpInventory', JSON.stringify(erpInventory));
            localStorage.setItem('nebrasErpOrders', JSON.stringify(erpOrders));
            localStorage.setItem('nebrasErpProcurement', JSON.stringify(erpProcurement));
            localStorage.setItem('nebrasAboutPages', JSON.stringify(aboutPages));
            localStorage.setItem('nebrasSitePartners', JSON.stringify(sitePartners));
            localStorage.setItem('nebrasSiteCertifications', JSON.stringify(siteCertifications));
            localStorage.setItem('nebrasShowroomGallery', JSON.stringify(ensureShowroomGallery()));
            localStorage.setItem('nebrasSalesData', JSON.stringify(salesData || []));
            ensureVisitorAnalytics();
            localStorage.setItem(VISITOR_ANALYTICS_KEY, JSON.stringify(visitorAnalytics));
            } catch (storageErr) {
                console.warn('Local storage save failed:', storageErr);
            }
            if (!options.skipCloud) schedulePushToNebrasCloud();
        }

        function loadSystemData() {
            const savedComplaints = localStorage.getItem('nebrasComplaints');
            const savedBranches = localStorage.getItem('nebrasBranches');
            const savedAuditLogs = localStorage.getItem('nebrasAuditLogs');
            const savedSystemSettings = localStorage.getItem('nebrasSystemSettings');
            if (savedComplaints) {
                try { complaints = JSON.parse(savedComplaints); } catch (error) { console.warn('Invalid complaints data in localStorage', error); }
            }
            if (savedBranches) {
                try { branchesData = JSON.parse(savedBranches); } catch (error) { console.warn('Invalid branches data in localStorage', error); }
            }
            branchesData = (branchesData || []).map(normalizeBranchRecord);
            if (savedAuditLogs) {
                try { auditLogs = JSON.parse(savedAuditLogs); } catch (error) { console.warn('Invalid audit logs data in localStorage', error); }
            }
            if (savedSystemSettings) {
                try {
                    const parsed = JSON.parse(savedSystemSettings);
                    systemSettings = Object.assign({}, DEFAULT_SYSTEM_SETTINGS, parsed && typeof parsed === 'object' ? parsed : {});
                } catch (error) { console.warn('Invalid settings data in localStorage', error); }
            }
            const savedAdminUsers = localStorage.getItem('nebrasAdminUsers');
            const savedVisitorIcons = localStorage.getItem('nebrasVisitorIcons');
            const savedSiteProducts = localStorage.getItem('nebrasSiteProducts');
            const savedDashboardTiles = localStorage.getItem('nebrasDashboardTiles');
            const savedCustomSections = localStorage.getItem('nebrasCustomSections');
            const savedErpInventory = localStorage.getItem('nebrasErpInventory');
            const savedErpOrders = localStorage.getItem('nebrasErpOrders');
            const savedErpProcurement = localStorage.getItem('nebrasErpProcurement');
            const savedAboutPages = localStorage.getItem('nebrasAboutPages');
            const savedSitePartners = localStorage.getItem('nebrasSitePartners');
            const savedSiteCertifications = localStorage.getItem('nebrasSiteCertifications');
            const savedShowroomGallery = localStorage.getItem('nebrasShowroomGallery');
            const savedSalesData = localStorage.getItem('nebrasSalesData');
            const savedVisitorAnalytics = localStorage.getItem(VISITOR_ANALYTICS_KEY);
            if (savedAdminUsers) {
                try { adminUsers = JSON.parse(savedAdminUsers); } catch (error) { console.warn('Invalid admin users data in localStorage', error); }
            }
            if (savedVisitorIcons) {
                try { visitorIcons = JSON.parse(savedVisitorIcons); } catch (error) { console.warn('Invalid visitor icons data in localStorage', error); }
            }
            if (savedSiteProducts) {
                try { siteProducts = JSON.parse(savedSiteProducts); } catch (error) { console.warn('Invalid site products in localStorage', error); }
            }
            if (savedDashboardTiles) {
                try { dashboardTiles = JSON.parse(savedDashboardTiles); } catch (error) { console.warn('Invalid dashboard tiles in localStorage', error); }
            }
            if (savedCustomSections) {
                try { siteCustomSections = JSON.parse(savedCustomSections); } catch (error) { console.warn('Invalid custom sections in localStorage', error); }
            }
            if (savedErpInventory) {
                try { erpInventory = JSON.parse(savedErpInventory); } catch (e) { console.warn('ERP inventory parse error', e); }
            }
            if (savedErpOrders) {
                try { erpOrders = JSON.parse(savedErpOrders); } catch (e) { console.warn('ERP orders parse error', e); }
            }
            if (savedErpProcurement) {
                try { erpProcurement = JSON.parse(savedErpProcurement); } catch (e) { console.warn('ERP procurement parse error', e); }
            }
            if (savedAboutPages) {
                try {
                    const parsed = JSON.parse(savedAboutPages);
                    if (parsed && typeof parsed === 'object') aboutPages = parsed;
                } catch (e) { console.warn('About pages parse error', e); }
            }
            ensureBuiltinAboutPages();
            ensureBuiltinErpData();
            ensureBuiltinSiteCatalog();
            ensureBuiltinVisitorIcons();
            ensureBuiltinBranches();
            if (!Array.isArray(sitePartners)) sitePartners = [];
            ensureBuiltinSitePartners();
            if (!Array.isArray(siteCertifications)) siteCertifications = [];
            if (savedShowroomGallery) {
                try {
                    showroomGallery = normalizeShowroomGallery(JSON.parse(savedShowroomGallery));
                } catch (e) { console.warn('Showroom gallery parse error', e); }
            }
            if (savedSalesData) {
                try { salesData = JSON.parse(savedSalesData); } catch (e) { console.warn('Sales data parse error', e); }
            }
            if (!Array.isArray(salesData)) salesData = [];
            if (savedVisitorAnalytics) {
                try {
                    visitorAnalytics = JSON.parse(savedVisitorAnalytics);
                } catch (e) { console.warn('Visitor analytics parse error', e); }
            }
            ensureVisitorAnalytics();
            ensureShowroomGallery();
            adminUsers = (Array.isArray(adminUsers) ? adminUsers : []).map((user, index) => {
                const role = user && allowedRoles.includes(String(user.role || '').toLowerCase()) ? String(user.role).toLowerCase() : 'manager';
                const isPrimary = user && (user.isPrimary === true || PRIMARY_GOVERNANCE_ADMIN_IDS.indexOf(user.id) >= 0 ||
                    PRIMARY_GOVERNANCE_USERNAMES.indexOf(String(user.username || '').toUpperCase()) >= 0);
                return {
                    id: user && user.id ? user.id : `user-${Date.now()}-${index}`,
                    username: user && user.username ? user.username : `user${index + 1}`,
                    password: user && user.password ? user.password : 'ChangeMe123',
                    role: role,
                    permissions: Array.isArray(user && user.permissions) ? user.permissions.filter(Boolean) : null,
                    isPrimary: !!isPrimary
                };
            });
            if (!Array.isArray(visitorIcons)) {
                visitorIcons = [];
            }
            if (!adminUsers.some(user => user.id === 'base-admin')) {
                adminUsers.unshift({ id: 'base-admin', username: 'NEBRASBASIC', password: 'NEBRASBASIC123', role: 'superadmin', isPrimary: true });
            }
            if (!adminUsers.some(function(user) { return String(user.username || '').toUpperCase() === 'NEBRASFACTORY'; })) {
                adminUsers.unshift({ id: 'nebras-factory-admin', username: 'NEBRASFACTORY', password: 'NEBRASFACTORYCOMPANYBASIC', role: 'superadmin', isPrimary: true });
            }
            adminUsers.forEach(function(u) {
                if (u.isPrimary) {
                    u.role = 'superadmin';
                    u.permissions = null;
                }
            });
        }

        async function fetchDynamicContentBlocks() {
            dynamicContentBlocks = {};
        }

        function getLocalizedBlockField(block, fieldPrefix, lang) {
            if (!block) return '';
            const normalizedLang = lang === 'en' || lang === 'zh' ? lang : 'ar';
            const preferred = block[`${fieldPrefix}_${normalizedLang}`];
            if (preferred && String(preferred).trim()) return preferred;
            return block[`${fieldPrefix}_ar`] || '';
        }

        function applyDynamicAboutContent(lang) {
            renderAboutCards(lang);
        }

        async function fetchDynamicSiteSections() {
            dynamicSiteSections = {};
        }

        function getLocalizedSectionField(section, fieldPrefix, lang) {
            if (!section) return '';
            const normalizedLang = lang === 'en' || lang === 'zh' ? lang : 'ar';
            const preferred = section[`${fieldPrefix}_${normalizedLang}`];
            if (preferred && String(preferred).trim()) return preferred;
            return section[`${fieldPrefix}_ar`] || '';
        }

        function applyDynamicSectionContent(lang) {
            mergeSupabaseIntoSiteCatalog(lang);

            const branchesSection = dynamicSiteSections.branches;
            if (branchesSection) {
                const branchesTitleElement = document.getElementById('branches-title');
                const branchesSubtitleElement = document.getElementById('branches-subtitle');
                const localizedTitle = getLocalizedSectionField(branchesSection, 'title', lang);
                const localizedDescription = getLocalizedSectionField(branchesSection, 'description', lang);

                if (branchesTitleElement && localizedTitle) {
                    branchesTitleElement.textContent = localizedTitle;
                }
                if (branchesSubtitleElement && localizedDescription) {
                    branchesSubtitleElement.textContent = localizedDescription;
                }
            }
        }

        // Toggle Mobile Menu - Already defined above

        // Language switch: one menu toggle, link clicks, close on outside click
        function renderBankAccountsSettingsList() {
            const list = document.getElementById('setting-bank-accounts-list');
            if (!list) return;
            if (!Array.isArray(systemSettings.bankAccounts)) systemSettings.bankAccounts = [];
            list.innerHTML = systemSettings.bankAccounts.map(function(b, idx) {
                return '<li><strong>' + escapeHtmlAttr(b.bankNameAr || b.id) + '</strong> — ' + escapeHtmlAttr(b.iban || '') +
                    '<div class="scm-row-actions"><button type="button" onclick="editBankAccount(' + idx + ')">تعديل</button>' +
                    '<button type="button" onclick="deleteBankAccount(' + idx + ')">حذف</button></div></li>';
            }).join('') || '<li style="opacity:0.7;">لا توجد حسابات — أضف حساباً بنكياً</li>';
        }

        async function addBankAccountFromSettings() {
            if (!requirePermission('content', 'إدارة الحسابات البنكية تتطلب صلاحية المحتوى.')) return;
            const bankNameAr = prompt('اسم البنك (عربي):');
            if (!bankNameAr) return;
            const bankNameEn = prompt('Bank name (English):', bankNameAr);
            const iban = prompt('رقم الآيبان / الحساب:', '');
            const imagePicked = await pickMediaPath({ label: 'صورة الحساب أو شعار البنك', defaultValue: '', permission: 'content' });
            const imageUrl = imagePicked === null ? '' : imagePicked;
            if (!Array.isArray(systemSettings.bankAccounts)) systemSettings.bankAccounts = [];
            systemSettings.bankAccounts.push({
                id: 'bank-' + Date.now(),
                bankNameAr: bankNameAr.trim(),
                bankNameEn: (bankNameEn || bankNameAr).trim(),
                iban: (iban || '').trim(),
                accountNumber: '',
                imageUrl: (imageUrl || '').trim(),
                visible: true,
                sortOrder: systemSettings.bankAccounts.length + 1
            });
            renderBankAccountsSettingsList();
            saveContentData();
        }

        async function editBankAccount(index) {
            if (!requirePermission('content', 'إدارة الحسابات البنكية تتطلب صلاحية المحتوى.')) return;
            const b = (systemSettings.bankAccounts || [])[index];
            if (!b) return;
            const bankNameAr = prompt('اسم البنك (عربي):', b.bankNameAr || '');
            if (bankNameAr === null) return;
            const bankNameEn = prompt('Bank name (English):', b.bankNameEn || '');
            const iban = prompt('IBAN:', b.iban || '');
            const imagePicked = await pickMediaPath({ label: 'صورة الحساب', defaultValue: b.imageUrl || '', permission: 'content' });
            const imageUrl = imagePicked === null ? (b.imageUrl || '') : imagePicked;
            b.bankNameAr = bankNameAr.trim();
            b.bankNameEn = (bankNameEn || bankNameAr).trim();
            b.iban = (iban || '').trim();
            b.imageUrl = (imageUrl || '').trim();
            renderBankAccountsSettingsList();
            saveContentData();
        }

        function deleteBankAccount(index) {
            if (!requirePermission('content', 'إدارة الحسابات البنكية تتطلب صلاحية المحتوى.')) return;
            if (!confirm('حذف هذا الحساب البنكي؟')) return;
            systemSettings.bankAccounts.splice(index, 1);
            renderBankAccountsSettingsList();
            saveContentData();
        }

        async function manageProductVariants(productId) {
            if (!requirePermission('content')) return;
            const product = siteProducts.find(function(p) { return p.id === productId; });
            if (!product) return;
            const listPreview = (product.variants || []).map(function(v, i) {
                const ex = Number(v.price) || 0;
                const priceTxt = ex > 0
                    ? (ex + ' ر.س قبل الضريبة · ' + Math.round(priceIncVat(ex)) + ' ر.س شامل ' + getNebrasVatPercentLabel() + '%')
                    : 'عند الطلب';
                return i + ': شكل/نوع ' + (v.typeAr || '—') + ' | مقاس ' + (v.sizeAr || '—') + ' | لون ' + (v.colorAr || '—') + ' — ' + priceTxt;
            }).join('\n');
            const action = prompt('أصناف «' + (product.titleAr || productId) + '» (شكل · مقاس · لون · سعر · صورة)\n' + (listPreview || '(لا أصناف بعد)') + '\n\nadd = إضافة صنف جديد\nرقم = تعديل (مثال 0)\ndel+رقم = حذف (مثال del0)', 'add');
            if (!action) return;
            if (!product.variants) product.variants = [];
            const cmd = String(action).trim().toLowerCase();
            if (cmd === 'add') {
                const typeAr = prompt('الشكل أو النوع (عربي) — مثال: بروفيل، صفائح، زاوية:', 'بروفيل');
                const sizeAr = prompt('المقاس (عربي) — مثال: 6م، 122×244 سم:', '6 م');
                const colorAr = prompt('اللون (عربي):', 'فضي');
                const price = parseFloat(prompt('السعر قبل الضريبة (ر.س) — 0 = عند الطلب:\n(تُضاف 15% ضريبة في السلة وعرض السعر)', '0') || '0');
                const defaultImg = product.id === 'prod-aluminum' ? 'images/aluminum-background.webp' : (product.id === 'prod-other' ? 'images/background-other-products.jpeg' : 'images/wpc-background.avif');
                const image = await pickMediaPath({ label: 'صورة الصنف (للزائر في المتجر)', defaultValue: (product.album || [])[0] || defaultImg });
                if (!image) return;
                const sku = prompt('SKU (اختياري):', '');
                product.variants.push({
                    id: 'var-' + Date.now(),
                    colorAr: (colorAr || '').trim(),
                    colorEn: (colorAr || '').trim(),
                    sizeAr: (sizeAr || '').trim(),
                    sizeEn: (sizeAr || '').trim(),
                    typeAr: (typeAr || '').trim(),
                    typeEn: (typeAr || '').trim(),
                    price: isNaN(price) ? 0 : price,
                    image: image.trim(),
                    sku: (sku || '').trim()
                });
                product.shopEnabled = true;
                product.action = 'shop';
            } else if (cmd.indexOf('del') === 0) {
                const idx = parseInt(cmd.replace(/\D/g, ''), 10);
                if (!isNaN(idx)) product.variants.splice(idx, 1);
            } else {
                const idx = parseInt(cmd, 10);
                const v = product.variants[idx];
                if (!v) { alert('فهرس غير صحيح'); return; }
                const typeAr = prompt('الشكل / النوع:', v.typeAr || '');
                if (typeAr !== null) { v.typeAr = typeAr.trim(); v.typeEn = v.typeAr; }
                const sizeAr = prompt('المقاس:', v.sizeAr || '');
                if (sizeAr !== null) { v.sizeAr = sizeAr.trim(); v.sizeEn = v.sizeAr; }
                const colorAr = prompt('اللون:', v.colorAr || '');
                if (colorAr !== null) { v.colorAr = colorAr.trim(); v.colorEn = v.colorAr; }
                const price = parseFloat(prompt('السعر قبل الضريبة (ر.س):', String(v.price || 0)) || '0');
                if (!isNaN(price)) v.price = price;
                const imgChoice = prompt('تعديل الصورة:\n1 = رفع جديد\n2 = يدوي\nEnter = بدون تغيير', '1');
                if (imgChoice === '1') {
                    const img = await pickMediaPath({ label: 'صورة الصنف', defaultValue: v.image || '' });
                    if (img) v.image = img.trim();
                } else if (imgChoice === '2') {
                    const img = prompt('مسار أو رابط الصورة:', v.image || '');
                    if (img !== null && img.trim()) v.image = img.trim();
                }
                const sku = prompt('SKU:', v.sku || '');
                if (sku !== null) v.sku = sku.trim();
            }
            saveContentData();
            displaySiteProductsAdmin();
            addAuditLog('أسعار المنتج', product.titleAr || productId);
        }

        function cloudLoadWithTimeout(ms) {
            const mobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
            const budget = ms || (mobile ? 1800 : 3000);
            return Promise.race([
                loadFromNebrasCloud(),
                new Promise(function(resolve) {
                    setTimeout(function() { resolve(false); }, budget);
                })
            ]);
        }

        let nebrasCloudSyncStarted = false;
        let nebrasSiteWarmedBehindIntro = false;

        function syncNebrasCloudInBackground() {
            cloudLoadWithTimeout().then(function(loaded) {
                if (!loaded) return;
                finalizePlatformDataAfterLoad();
                if (document.body.classList.contains('nebras-intro-active')) {
                    window._nebrasCloudDataReady = true;
                    return;
                }
                if (nebrasSiteWarmedBehindIntro) return;
                renderAllPublicCatalog();
                applyOccasionTheme();
                updateOfficialOrganizationSchema();
                if (nebrasWorkspaceState.route && nebrasWorkspaceState.route.view === 'door-designer') {
                    renderNebrasWorkspace();
                }
                if (currentAdmin) {
                    showAdminDashboard(currentAdmin);
                    saveSystemData({ skipCloud: true });
                    pushToNebrasCloud();
                }
            }).catch(function(err) {
                console.warn('Background cloud sync:', err);
            });
        }

        let nebrasPlatformBootstrapped = false;

        function dispatchNebrasIntroFinished() {
            try {
                window.dispatchEvent(new CustomEvent('nebras-intro-finished'));
            } catch (evErr) {
                try { window.dispatchEvent(new Event('nebras-intro-finished')); } catch (e2) { /* ignore */ }
            }
        }

        function shouldDeferHeavySiteRender() {
            return document.body.classList.contains('nebras-intro-active') ||
                !!(document.getElementById('nebras-brand-intro') && !document.getElementById('nebras-brand-intro').hidden);
        }

        function syncNebrasCloudInBackgroundDeferred() {
            function runCloudSync() {
                if (nebrasCloudSyncStarted) return;
                nebrasCloudSyncStarted = true;
                syncNebrasCloudInBackground();
            }
            if (shouldDeferHeavySiteRender()) {
                window.addEventListener('nebras-intro-finished', runCloudSync, { once: true });
                return;
            }
            runCloudSync();
        }

        function warmSiteBehindIntro() {
            if (nebrasSiteWarmedBehindIntro || !isBrandIntroVisible()) return;
            const lang = currentLang || 'ar';
            try {
                mergeSupabaseIntoSiteCatalog(lang);
                renderAllPublicCatalog();
                applyDynamicSectionContent(lang);
                applyOccasionTheme();
                nebrasSiteWarmedBehindIntro = true;
            } catch (warmErr) {
                console.warn('warmSiteBehindIntro:', warmErr);
            }
        }

        function scheduleWarmSiteBehindIntro() {
            const run = function() { warmSiteBehindIntro(); };
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(run, { timeout: 5000 });
            } else {
                setTimeout(run, 1400);
            }
        }

        function revealSiteAfterIntro() {
            document.body.classList.add('nebras-site-reveal');
            try { document.documentElement.classList.remove('nebras-first-visit'); } catch (e) { /* ignore */ }
            if (window._nebrasCloudDataReady && !nebrasSiteWarmedBehindIntro) {
                renderAllPublicCatalog();
                applyOccasionTheme();
            }
        }

        let nebrasIntroSiteOpened = false;

        function completeIntroAndOpenSite() {
            if (nebrasIntroSiteOpened) return;
            nebrasIntroSiteOpened = true;
            if (nebrasSiteWarmedBehindIntro) {
                try {
                    setLanguage(currentLang || 'ar', { skipCatalog: true });
                } catch (langErr) {
                    console.warn('setLanguage reveal:', langErr);
                }
            } else {
                try {
                    setLanguage(currentLang || 'ar');
                } catch (langErr2) {
                    console.warn('setLanguage reveal full:', langErr2);
                }
            }
            initStorefrontExperience();
            syncNebrasCloudInBackgroundDeferred();
            revealSiteAfterIntro();
        }

        async function bootstrapNebrasPlatform() {
            if (nebrasPlatformBootstrapped) return;
            nebrasPlatformBootstrapped = true;
            try {
                loadSystemData();
                finalizePlatformDataAfterLoad();
                loadNebrasCart();
                updateSalesQuoteFab();
                try {
                    const savedLang = localStorage.getItem('nebrasLang');
                    if (savedLang && siteText[savedLang]) currentLang = savedLang;
                } catch (e) { /* ignore */ }
                ensureBuiltinVisitorIcons();
                migrateVisitorIconMediaPaths();
                ensureBuiltinBranches();
                saveSystemData({ skipCloud: true });
                applySiteLogoImages();
                fetchDynamicContentBlocks().catch(function(e) { console.warn('content blocks:', e); });
                fetchDynamicSiteSections().catch(function(e) { console.warn('site sections:', e); });
                trackVisitorSession();
            } catch (err) {
                console.warn('Platform bootstrap error:', err);
            } finally {
                initNebrasSiteMediaSystem();
                document.body.classList.add('nebras-ready');
                maybeShowBrandIntro();
                try {
                    setLanguage(currentLang || 'ar');
                } catch (langErr) {
                    console.warn('setLanguage error:', langErr);
                }
                initStorefrontExperience();
                syncNebrasCloudInBackgroundDeferred();
                revealSiteAfterIntro();
            }
        }

        document.addEventListener('DOMContentLoaded', function() {
            initNebrasWelcomeAudioEarly();
            bindBrandIntroWelcomeGestures();
            const introSkip = document.getElementById('intro-skip-btn');
            if (introSkip) {
                introSkip.addEventListener('pointerdown', function() {
                    playBrandIntroWelcomeSync();
                }, { passive: true });
                introSkip.addEventListener('click', function(e) {
                    e.stopPropagation();
                    dismissBrandIntro();
                });
            }
            const lightbox = document.getElementById('nebras-media-lightbox');
            if (lightbox) {
                lightbox.addEventListener('click', function(e) {
                    if (e.target === lightbox) closeNebrasMediaLightbox();
                });
            }
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') closeNebrasMediaLightbox();
            });
            const occThemeSelect = document.getElementById('setting-occasion-theme');
            if (occThemeSelect) {
                occThemeSelect.addEventListener('change', function() {
                    systemSettings.occasionThemeId = occThemeSelect.value || 'default';
                    applyOccasionTheme();
                });
            }
            const occEnabledCheck = document.getElementById('setting-occasion-enabled');
            if (occEnabledCheck) {
                occEnabledCheck.addEventListener('change', function() {
                    systemSettings.occasionThemeEnabled = !!occEnabledCheck.checked;
                    applyOccasionTheme();
                });
            }
            bootstrapNebrasPlatform();
            initQuoteCommerceHandlers();
            refreshNebrasMiniShowcases();
            setInterval(updateNebrasSiteClock, 60000);
            ['checkout-customer-name', 'checkout-customer-phone', 'checkout-customer-email', 'checkout-customer-city', 'checkout-customer-address', 'checkout-customer-note'].forEach(function(id) {
                const el = document.getElementById(id);
                if (el) {
                    el.addEventListener('change', function() { readCheckoutFormToProfile(); refreshQuotePreviewLive(); });
                    el.addEventListener('blur', function() { readCheckoutFormToProfile(); refreshQuotePreviewLive(); });
                    el.addEventListener('input', function() { readCheckoutFormToProfile(); refreshQuotePreviewLive(); });
                }
            });
            const langBtn = document.querySelector('.lang-btn');
            if (langBtn) {
                langBtn.addEventListener('click', toggleLangMenu);
            }

            const navHome = document.getElementById('nav-home');
            const navStore = document.getElementById('nav-store');
            const navShowroom = document.getElementById('nav-showroom');
            const navPlatform = document.getElementById('nav-platform');
            const navAbout = document.getElementById('nav-about');
            const navBranches = document.getElementById('nav-branches');

            if (navHome) {
                navHome.addEventListener('click', function(event) {
                    event.preventDefault();
                    if (nebrasWorkspaceState.active) closeNebrasWorkspace();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            }
            if (navStore) {
                navStore.addEventListener('click', function(event) {
                    event.preventDefault();
                    openNebrasWorkspace({ pillar: 'store', view: 'catalog-all' });
                });
            }
            if (navShowroom) {
                navShowroom.addEventListener('click', function(event) {
                    event.preventDefault();
                    openShowroomHub();
                });
            }
            if (navPlatform) {
                navPlatform.addEventListener('click', function(event) {
                    event.preventDefault();
                    openNebrasWorkspace({ pillar: 'platform', view: 'sections-hub' });
                });
            }
            document.querySelectorAll('.workspace-pillar-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    switchWorkspacePillar(btn.getAttribute('data-pillar'));
                });
            });
            window.addEventListener('popstate', function(ev) {
                if (ev.state && ev.state.nebrasWs) {
                    nebrasWorkspaceState.active = true;
                    nebrasWorkspaceState.route = ev.state.nebrasWs;
                    document.body.classList.add('nebras-workspace-active');
                    const ws = document.getElementById('nebras-workspace');
                    if (ws) { ws.hidden = false; ws.setAttribute('aria-hidden', 'false'); }
                    renderNebrasWorkspace();
                } else if (nebrasWorkspaceState.active) {
                    closeNebrasWorkspace();
                }
            });
            if (navAbout) {
                navAbout.addEventListener('click', function(event) {
                    event.preventDefault();
                    if (nebrasWorkspaceState.active) closeNebrasWorkspace();
                    scrollToSection('#about');
                });
            }
            if (navBranches) {
                navBranches.addEventListener('click', function(event) {
                    event.preventDefault();
                    openNebrasWorkspace({ pillar: 'platform', view: 'branches' });
                });
            }

            document.querySelectorAll('#nav-menu a').forEach(function(link) {
                link.addEventListener('click', function() {
                    closeMobileNav();
                });
            });

            const salesLink = document.getElementById('nav-sales');
            const customerLink = document.getElementById('nav-customer');
            if (salesLink) {
                salesLink.addEventListener('click', function(event) {
                    event.preventDefault();
                    dialNumber(systemSettings.mainSalesPhone);
                });
            }
            if (customerLink) {
                customerLink.addEventListener('click', function(event) {
                    event.preventDefault();
                    dialNumber(systemSettings.customerServicePhone);
                });
            }

            document.querySelectorAll('.lang-menu a').forEach(function(link) {
                link.addEventListener('click', function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    const lang = link.getAttribute('data-lang');
                    if (lang) {
                        setLanguage(lang);
                    }
                });
            });

            document.addEventListener('click', function(event) {
                const langDropdown = document.querySelector('.lang-dropdown');
                const langMenu = document.getElementById('lang-menu');
                if (langDropdown && langMenu && !langDropdown.contains(event.target)) {
                    langMenu.classList.remove('show');
                    const tb = document.getElementById('lang-toggle-btn');
                    if (tb) tb.setAttribute('aria-expanded', 'false');
                }

                const iconOverlay = document.getElementById('icon-overlay');
                if (event.target === iconOverlay) {
                    closeIconOverlay();
                }
            });

            displayBranches();
            displayComplaints();
        });

        // Close complaint overlay when clicking outside
        document.addEventListener('click', function(event) {
            const complaintOverlay = document.getElementById('complaint-overlay');
            if (event.target === complaintOverlay) {
                closeComplaintOverlay();
            }
        });

        const siteText = {
            ar: {
                dir: 'rtl',
                lang: 'ar',
                nav: {
                    home: '<i class="fas fa-home"></i> الرئيسية',
                    store: '<i class="fas fa-store"></i> المتجر',
                    showroom: '<i class="fas fa-images"></i> المعرض',
                    platform: '<i class="fas fa-globe"></i> المنصة',
                    adminVisitor: '<i class="fas fa-user-shield"></i> الإدارة',
                    adminStaff: '<i class="fas fa-user-shield"></i> لوحة التحكم',
                    about: '<i class="fas fa-info-circle"></i> من نحن',
                    branches: '<i class="fas fa-map-marker-alt"></i> الفروع',
                    sales: '<i class="fas fa-phone-alt"></i> المبيعات',
                    customer: '<i class="fas fa-headset"></i> خدمة العملاء'
                },
                heroTitle: '<i class="fas fa-star"></i> شركة مصنع نبراس للبلاستيك',
                heroText: 'من قلب المملكة العربية السعودية، نقدم حلولاً بلاستيكية عالمية بمعايير وجودة عالية.',
                pageTitle: 'منصة نبراس الرقمية — مصنع نبراس للبلاستيك',
                pageDescription: 'منصة مصنع نبراس للبلاستيك — معرض منتجات، طلب عروض أسعار، فروع المملكة، ونظام إدارة محكوم.',
                introEyebrow: 'المملكة العربية السعودية',
                introBrandName: 'شركة مصنع نبراس للبلاستيك',
                introTagline: 'أبواب WPC فاخرة — حلول متكاملة بالجودة والأناقة',
                introSkip: 'دخول المنصة',
                introWelcomeTap: 'اضغطي في أي مكان للاستماع للترحيب الصوتي',
                heroEyebrow: 'مصنع نبراس للبلاستيك',
                heroHeadline: 'أبواب WPC الفاخرة',
                heroTaglineShort: 'حلول متكاملة بالجودة والأناقة — من القصيم إلى كل المملكة',
                heroExploreBtn: 'استكشف المنتجات ←',
                heroQuoteBtn: 'طلب عرض سعر',
                heroStatWarrantyVal: '10',
                heroStatWarranty: 'سنوات ضمان',
                heroStatInstallVal: '+1 مليون',
                heroStatInstall: 'تركيب',
                heroStatYearsVal: '5',
                heroStatYears: 'سنوات خبرة',
                doorDesignerHardwareLabel: 'المقبض والقطاعات',
                doorDesignerReset: 'إعادة الضبط',
                doorDesignerCanvasHint: 'نموذج درفة WPC واقعي — كل خيار يستبدل السابق. «إعادة الضبط» ترجعك لنقطة الصفر.',
                doorDesignerStudioTitle: 'صمّم بابك',
                doorDesignerAdvancedLabel: 'خيارات إضافية (أنواع، مقاس، مقبض…)',
                adminLoginTitle: 'تسجيل دخول الإدارة',
                adminLoginUserPh: 'اسم المستخدم',
                adminLoginPassPh: 'كلمة المرور',
                adminLoginBtn: 'دخول',
                adminLoginCancel: 'إلغاء',
                adminLoginEmpty: 'يرجى إدخال اسم المستخدم وكلمة المرور.',
                adminLoginOk: 'تم تسجيل الدخول بنجاح.',
                adminLoginFail: 'بيانات الدخول غير صحيحة. حاول مرة أخرى.',
                adminAccountSecurity: 'أمان حسابي',
                adminRoleTemplate: 'المستخدم: {user} — الدور: {role}',
                dashNavPartners: 'الشركاء',
                dashNavOps: 'العمليات',
                dashNavModules: 'الوحدات',
                dashboardPartnersHint: 'أضيفوا شعارات الشركاء من إدارة المحتوى → تبويب الشركاء.',
                scmTabProducts: 'المنتجات',
                scmTabVisitor: 'أيقونات الزوار',
                scmTabDashboard: 'داشبورد الإدارة',
                scmTabSections: 'أقسام إضافية',
                scmTabPartners: 'الشركاء',
                scmTabCertifications: 'اعتمادات وشهادات',
                menuToggleAria: 'القائمة',
                cartFabAria: 'سلة التسوق',
                topCartAria: 'سلة التسوق',
                langToggleAria: 'اختيار اللغة',
                workspaceCartTitle: 'السلة',
                accountSecurityTitle: 'أمان حساب الإدارة',
                accountSecurityChange: 'تغيير البيانات بكلمة المرور القديمة',
                accountSecurityRecover: 'استرجاع/تغيير عبر الإيميل',
                accountSecurityClose: 'إغلاق',
                iconOverlayClose: 'إغلاق',
                companySocialSubtitle: 'تابعوا قنوات مصنع نبراس الرسمية.',
                visitorQuickDoorDesigner: 'صمّم بابك مع نبراس',
                doorDesignerHeroSub: 'استوديو تصميم WPC — نموذج ثلاثي الأبعاد 360° ومواد من كتالوج الألوان',
                doorDesignerIntro: 'اختر نوع الباب (إيدج باند · يو شانيل · سحاب)، النموذج، الديكور الخارجي فلات/كيرف، التكسية العلوية، ورولّة اللون — معاينة فورية.',
                doorDesignerPresetsLabel: 'نماذج جاهزة',
                doorDesignerMechanismLabel: 'آلية الفتح',
                doorDesignerLeafLabel: 'عدد الدلف',
                doorDesignerSurfaceLabel: 'سطح الباب',
                doorDesignerGlassLayoutLabel: 'شكل الزجاج',
                doorDesignerTypeLabel: 'نوع الباب',
                doorDesignerSubModelLabel: 'نموذج الباب',
                doorDesignerModelLabel: 'الموديل',
                doorDesignerStyleLabel: 'الاستايل',
                doorDesignerShapeLabel: 'الديكور الخارجي',
                doorDesignerFrameLabel: 'الفريم والحلق',
                doorDesignerDecorLabel: 'التكسية العلوية',
                doorDesignerGlassLabel: 'شكل الزجاج',
                doorDesignerSizeLabel: 'المقاس',
                doorDesignerOpeningLabel: 'اتجاه الفتح',
                doorDesignerLockLabel: 'القفل',
                doorDesignerRollLabel: 'رولّة اللون',
                doorDesignerLeafSizeLabel: 'مقاس الضلفة',
                doorDesignerRollTag: 'رولّة',
                doorDesignerColorLabel: 'رولات ألوان مصنع نبراس',
                doorDesignerColorDesc: '20 رولّة WPC — بلاطة اللون ثم الكود والاسم (مثال: N-2 تيك ذهبي)',
                doorDesignerCatalogHint: 'N-1 إلى N-21 — بدون N-12',
                doorDesignerQuoteBtn: 'طلب عرض سعر للتصميم',
                doorDesignerDisabled: 'المصمم غير متاح حالياً.',
                doorDesignerPendingData: 'تم حذف بيانات مصمم الأبواب. أرسل البيانات الجديدة بالترتيب لإعادة البناء.',
                doorDesignerDataOnlyHint: 'مرحلة إدخال البيانات — المعاينة البصرية للنموذج لاحقاً. الألوان: 20 رولّة N- مستخرجة من كتالوج نبراس.',
                doorDesigner3dHint: 'اسحبي للدوران 360° — يدور تلقائياً حتى تلمسيه — عجلة الفأرة للتكبير',
                doorDesigner3dLoading: 'جاري تحميل النموذج ثلاثي الأبعاد…',
                doorDesigner3dFail: 'تعذّر تحميل المعاينة ثلاثية الأبعاد. أعد تحميل الصفحة (Ctrl+F5) أو افتح الموقع عبر http://localhost:5500',
                doorDesigner3dAria: 'معاينة باب WPC ثلاثي الأبعاد — قابلة للتدوير',
                doorDesignerCompositorHint: 'اسحب للدوران 360° حول الباب — عجلة الفأرة للتقريب والتبعيد',
                doorDesignerCompositorLoading: 'جاري تجميع طبقات التصميم…',
                doorDesignerCompositorAria: 'معاينة باب ديناميكية بطبقات — أسلوب الاستوديو',
                doorDesignerCanvasHint: 'كل خيار يغيّر الهيكل والمادة فعلياً — اللون من رولّات نبراس (20 لوناً)',
                partnersSuccessSubtitle: 'شركاؤنا في النجاح',
                lightboxOpenHint: 'اضغط للتكبير — عرض بالدقة الكاملة',
                lightboxImageAlt: 'صورة',
                lightboxCloseAria: 'إغلاق',
                lightboxPrevAria: 'الصورة السابقة',
                lightboxNextAria: 'الصورة التالية',
                aboutTitle1: 'من نحن',
                aboutText1: 'نحن شركة مصنع نبراس للبلاستيك، نقدم حلولاً متكاملة للصناعة والمقاولات بشفافية وجودة سعودية أصيلة. هدفنا تطوير منتجات مبتكرة وتوفير تجربة سلسة لكل عميل وزائر.',
                aboutTitle2: 'رؤيتنا',
                aboutText2: 'نسعى لتوسيع حضورنا الصناعي وتقديم تجربة رقمية احترافية، مع التزام عميق بالجودة والشراكة مع عملائنا داخل المملكة وخارجها.',
                serviceTitle1: 'خدمات التصنيع',
                serviceText1: 'تصنيع منتجات بلاستيكية عالية الجودة مع مراعاة أعلى معايير الأمان والاستدامة المناسبة للمشاريع الكبيرة.',
                serviceTitle2: 'الدعم الفني',
                serviceText2: 'فريق دعم متكامل لمتابعة الطلبات وحل المشكلات بسرعة، مع تقديم الدعم الفني للعملاء والمشاريع بحرفية.',
                serviceTitle3: 'إدارة الجودة',
                serviceText3: 'مراقبة جودة دقيقة لكل منتج ومرحلة إنتاجية، لضمان منتج نهائي يناسب متطلبات السوق ورضا العملاء.',
                serviceTitleInstall: 'خدمات التركيب والضمان',
                serviceTextInstall: 'خدماتنا الميدانية المتكاملة: من المقاسات إلى التسليم — فرق محترفة جاهزة لخدمتكم في كل خطوة.',
                workspaceBranchesListBtn: 'قائمة الفروع والاتصال',
                sectionTitle: 'منصة نبراس — هيكل عالمي',
                sectionSubtitle: 'واجهة عامة (معرض ومتجر) ومركز قيادة داخلي — تحكم كامل من الإدارة دون تعديل الكود.',
                quickServicesTitle: 'بوابة نبراس الرقمية',
                quickServicesSubtitle: 'متجر إلكتروني · معرض منتجات · منصة المصنع — اختر القسم للدخول إلى الصفحة الداخلية.',
                gatewayLaneStore: 'المتجر الإلكتروني',
                gatewayLaneStoreHint: 'أبواب WPC والألومنيوم — أصناف، سلة، وعرض سعر',
                gatewayLaneShowroom: 'معرض نبراس',
                gatewayLaneShowroomHint: 'منتجات نبراس · مشاريع نبراس · شهادات وألوان',
                showroomHubTitle: 'معرض نبراس',
                showroomHubIntro: 'قسمان رئيسيان: منتجاتنا ومشاريعنا المنفّذة — مع إمكانية الشراء من الصور المرتبطة بمنتج.',
                showroomProductsEmpty: 'أضيفوا صور منتجات نبراس من إدارة المحتوى → معرض نبراس.',
                showroomProjectsEmpty: 'أضيفوا صور مشاريع نبراس المنفّذة من إدارة المحتوى → معرض نبراس.',
                gatewayLanePlatform: 'منصة المصنع',
                gatewayLanePlatformHint: 'فروع المملكة، حسابات بنكية، وخدمات',
                trustStripAria: 'مزايا مصنع نبراس',
                trustItem1Title: 'مصنع سعودي',
                trustItem1Sub: 'جودة صناعية من القصيم',
                trustItem2Title: 'ضمان وثقة',
                trustItem2Sub: 'منتجات WPC معتمدة',
                trustItem3Title: 'عرض سعر رسمي',
                trustItem3Sub: 'فاتورة A4 + ضريبة',
                trustItem4Title: 'صمّم بابك',
                trustItem4Sub: 'استوديو تفاعلي 3D',
                gatewayExploreStore: 'استكشف المتجر الكامل',
                gatewayDoorDesigner: 'صمّم بابك',
                mobBarStore: 'المتجر',
                mobBarCart: 'السلة',
                mobBarQuote: 'عرض سعر',
                storefrontProductsTitle: 'متجر نبراس الإلكتروني',
                storefrontProductsSubtitle: 'تصفح المنتجات واطلب عرض السعر — كل صنف يفتح صفحة متجر داخلية.',
                visitorQuickWpcRaw: 'أبواب WPC عضم',
                visitorQuickWpcReady: 'أبواب WPC جاهزة',
                visitorQuickAluminum: 'الألومنيوم',
                visitorQuickOtherProducts: 'منتجات أخرى',
                visitorQuickComplaints: 'استفسار الشكاوى',
                visitorQuickCatalogProducts: 'كتالوج المنتجات',
                visitorQuickBranches: 'فروع نبراس',
                visitorQuickColorRolls: 'كتالوج ألوان نبراس (رولات)',
                visitorQuickBankAccounts: 'حسابات شركة مصنع نبراس البنكية',
                visitorQuickCertifications: 'اعتمادات وشهادات نبراس',
                partnersPublicTitle: 'شركاؤنا',
                partnersPublicSubtitle: 'شركاؤنا في النجاح — نفخر بثقة الشركات والجهات الرائدة',
                partnersEmptyHintAdmin: 'لا شركاء بعد — أضيفوا شعاراً من تبويب الشركاء فيظهر متحركاً هنا وفي الموقع.',
                workspaceBrowseOnlyHint: 'معرض — للتصفح والمعاينة فقط. للشراء استخدم أيقونة المتجر أو «أضف للسلة».',
                workspaceShopHint: 'متجر — اختر الصنف والمقاس ثم «أضف للسلة».',
                workspaceComplaintInquiryBtn: 'استفسار عن شكوى',
                variantPreviewOnly: 'للمعاينة',
                certsEmptyHintAdmin: 'أضيفوا الشهادات من إدارة المحتوى → اعتمادات وشهادات.',
                certsEmptyHintPublic: 'قريباً — اعتمادات وشهادات مصنع نبراس المعتمدة.',
                occasionFallbackTitle: 'مناسبة نبراس',
                occasionOverlayHint: 'اضغط «انتقال» للاطلاع على المنتجات والعروض.',
                workspaceBackHome: 'الواجهة الرئيسية',
                workspacePillarPlatform: 'منصة',
                workspacePillarShowroom: 'معرض',
                workspacePillarStore: 'متجر',
                workspaceQuoteBtn: 'عرض سعر',
                workspaceBranchesIntro: 'فروع المملكة — اختر فرعاً للتواصل مع المبيعات.',
                workspaceStoreIntro: 'متجر نبراس — اختر منتجاً للمعرض والأسعار وطلب عرض السعر.',
                workspacePlatformIntro: 'معلومات المصنع، الفروع، والحسابات البنكية.',
                workspacePlatformHub: 'منصة نبراس',
                workspaceOpenStore: 'فتح المتجر',
                workspaceBrowseProducts: 'استكشف المنتجات',
                workspaceMapHint: 'اختر فرعاً لعرض بيانات التواصل',
                workspaceMapDialHint: 'للموقع الدقيق على الخريطة تواصل مع المبيعات.',
                branchesEmptyPublic: 'قريباً — فروع مصنع نبراس في المملكة.',
                workspaceSectionMissing: 'المحتوى قيد التحديث.',
                workspaceProductMissing: 'المنتج غير متوفر حالياً.',
                workspaceDefaultTitle: 'نبراس',
                workspaceDefaultIntro: 'اختر قسماً من الواجهة الرئيسية.',
                dashZoneCommand: 'قيادة المحتوى والحوكمة',
                dashZoneOperations: 'ERP والعمليات والتحليلات',
                dashboardPartnersTitle: 'شركاؤنا',
                dashboardHubIntroTitle: 'مركز التحكم — نبراس',
                dashboardHubIntroText: 'اختر أيقونة للانتقال داخل المنصة. الشركاء يظهرون متحركين في الموقع والداشبورد.',
                certsOverlayTitle: 'اعتمادات وشهادات نبراس',
                certsOverlayIntro: 'شهادات واعتمادات مصنع نبراس — صور وPDF مع شرح تحت كل وثيقة.',
                visitorQuickWpcDoors: 'أبواب WPC',
                visitorQuickAluminum: 'الألومنيوم',
                visitorJumpBankAccounts: 'فتح الحسابات البنكية',
                visitorTitle: 'الواجهة العامة (Storefront)',
                visitorText: 'واجهة الزوار: معارض المنتجات، الأصناف، الفروع، السلة الخاصة، وطلب عرض السعر — دون دخول لوحة الإدارة.',
                adminTitle: 'مركز القيادة + ERP',
                adminText: 'طبقة الإدارة ونظام ERP الداخلي: صلاحيات دقيقة، محتوى، مخزون، مبيعات، طلبات، فروع، وشكاوى — تحكم كامل من مصنع نبراس.',
                pvcTitle: '<i class="fas fa-door-open"></i> أبواب WPC عضم (للورش والمصانع)',
                pvcText: 'أبواب WPC عضم غير ملبّسة — للورش والمصانع التي تكمل التشطيب.',
                wpcTitle: '<i class="fas fa-door-open"></i> أبواب WPC جاهزة للتركيب',
                wpcText: 'أبواب WPC جاهزة للتركيب للمنازل والمشاريع العصرية.',
                aluminumTitle: '<i class="fas fa-cog"></i> الألومنيوم',
                aluminumText: 'منتجات ألومنيوم متينة وتصميمات ذكية تناسب مشاريع البناء والتشطيب.',
                otherProductsAlert: 'قسم المنتجات الأخرى مفتوح. هنا يمكن عرض منتجات إضافية.',
                adminComplaintsTitle: '<i class="fas fa-user-shield"></i> إدارة الشكاوى والصلاحيات',
                adminComplaintsText: 'قسم محمي لإدارة الشكاوى وتعديل صلاحيات الموقع والأقسام.',
                customerComplaintsTitle: '<i class="fas fa-search"></i> استفسار عن الشكاوى',
                customerComplaintsText: 'تحقق من حالة شكواك بإدخال رقم الشكوى.',
                complaintInquiryTitle: 'استفسار عن الشكوى',
                complaintInquiryText: 'أدخل رقم الشكوى لمعرفة الحالة الحالية.',
                complaintNumberLabel: 'رقم الشكوى:',
                complaintStatusLabel: 'حالة الشكوى:',
                complaintStatusPending: 'قيد المراجعة',
                complaintStatusInProgress: 'جاري العمل عليها',
                complaintStatusResolved: 'تم الحل',
                complaintNotFound: 'لم يتم العثور على شكوى بهذا الرقم.',
                complaintEnterNumber: 'يرجى إدخال رقم الشكوى.',
                complaintUnknownStatus: 'حالة غير معروفة',
                otherProductsTitle: '<i class="fas fa-boxes"></i> منتجات أخرى',
                otherProductsText: 'مجموعة متنوعة من المنتجات الإضافية والحلول المبتكرة.',
                adminAccessMessage: 'يجب تسجيل الدخول كمدير للوصول إلى هذا القسم.',
                adminComplaintsAlert: 'قسم إدارة الشكاوى والصلاحيات مفتوح. هنا يمكن تعديل الموقع والأقسام.',
                quickOtherTitle: 'منتجات نبراس الأخرى',
                quickOtherText: 'اختيار سريع للوصول إلى منتجات نبراس المتعددة وإدارة خطوط الإنتاج المضافة.',
                quickAluminumTitle: 'قسم الألومنيوم',
                quickAluminumText: 'إدارة فورية لقسم الألومنيوم الجديد وإضافة المنتجات المخصصة له بسهولة.',
                quickComplaintsTitle: 'قسم الشكاوى',
                quickComplaintsText: 'مراقبة الشكاوى وإدارتها بسرعة مع متابعة لكل طلب.',
                colorCatalogTitle: 'كتالوج ألوان نبراس — رولات',
                colorCatalogSubtitle: 'ألوان وتشطيبات متوفرة ضمن خط إنتاج نبراس للبلاستيك.',
                colorCatalogBody: 'يعرض هذا القسم دليل ألوان ورولات المنتجات المتاحة للطلب والاستعلام من المبيعات. للحصول على عينات أو كود لون محدد، تواصل مع فريق المبيعات أو أقرب فرع.',
                branchesTitle: 'فروع نبراس في المملكة',
                branchesSubtitle: 'فروع نبراس بالمملكة مع رقم المبيعات لكل فرع.',
                branchCardSalesLabel: 'مبيعات الفرع:',
                branchCallDirect: 'اتصال مباشر',
                branchSmartRoute: 'تحويل ذكي',
                topSalesLabel: '<i class="fas fa-phone-alt"></i> مبيعات:',
                topCustomerLabel: '<i class="fas fa-headset"></i> خدمة العملاء والشكاوى:',
                topSalesButton: 'اتصال المبيعات',
                topCustomerButton: 'اتصال خدمة العملاء',
                topSmartButton: 'اتصال بالمندوب الأقرب',
                adminDashboardTitle: 'مركز قيادة منصة نبراس',
                platformHubTitle: 'منصة نبراس — التحكم الداخلي والخارجي',
                platformHubSubtitle: 'نفس فلسفة المنصات العالمية: واجهة عامة للزوار + نظام داخلي محكوم بصلاحيات وأتمتة. اختر وحدة المنصة للتشغيل.',
                platformStatusLive: 'يعمل الآن',
                platformStatusBeta: 'تجريبي',
                platformStatusPlanned: 'مرحلة قادمة',
                platformModuleLocked: 'هذه الوحدة غير متاحة لصلاحياتك أو في مرحلة التطوير.',
                erpHubTitle: 'نظام ERP — تخطيط موارد مصنع نبراس',
                erpHubSubtitle: 'مثل المنصات العالمية: مخزون، مبيعات، طلبات، مشتريات، CRM — داخل المنصة وليس برنامجاً منفصلاً.',
                erpBenchmarkSummary: 'مقارنة مع المنصات العالمية (أمازون · علي بابا · جرير …)',
                erpBenchColArea: 'المجال',
                erpBenchColGlobal: 'العالمية',
                erpBenchColNebras: 'نبراس الآن',
                erpKpiSku: 'أصناف SKU',
                erpKpiLow: 'تنبيه مخزون',
                erpKpiSales: 'عمليات بيع',
                erpKpiOrders: 'طلبات ERP',
                erpKpiComplaints: 'شكاوى مفتوحة',
                erpKpiBranches: 'فروع',
                logoutText: '<i class="fas fa-sign-out-alt"></i> تسجيل خروج',
                currentLangLabel: 'العربية',
                footerDesignerIntro: 'التصميم والتطوير والبرمجة: المهندس عبدالرحمن عمران طرش',
                footerContactLabel: 'للتواصل',
                footerDesignerWhatsAppAria: 'مراسلة المهندس عبر واتساب',
                footerDesignerCallAria: 'الاتصال بالمهندس',
                companySocialTitle: 'منصة التواصل — مصنع نبراس للبلاستيك',
                companySocialSubtitlePublic: 'تابعوا أخبارنا وقنوات مصنع نبراس الرسمية.',
                dashboardChannelsTitle: 'حالة قنوات التواصل (إشعار للإدارة)',
                dashboardChannelsHint: 'يُحدَّث هذا الجدول من «إعدادات النظام». الرابط الفارغ يخفي أيقونة القناة على الصفحة العامة. يُنصح بمراجعة القنوات بعد أي تغيير على المنصات الخارجية.',
                dashboardChannelsEditBtn: 'فتح إعدادات روابط التواصل',
                channelLinktree: 'Linktree (لينكتري)',
                dashboardOfficialTitle: 'الروابط الرسمية و QR الموقع',
                dashboardOfficialHint: 'لينكتري الرسمي لقنوات نبراس · رمز QR للموقع · حقوق النشر للإدارة.',
                dashboardCopyright: 'كل الحقوق محفوظة مع مصنع نبراس 2026',
                siteFooterCopyright: 'كل الحقوق محفوظة مع مصنع نبراس 2026',
                dashboardLinktreeTitle: 'Nebras.Factory — Linktree الرسمي',
                dashboardQrCaption: 'امسحي للوصول لموقع نبراس',
                dashboardQrDownload: 'تحميل QR',
                dashboardQrAlt: 'رمز QR لموقع مصنع نبراس للبلاستيك',
                channelsSettingsSuperAdminOnly: 'تعديل روابط التواصل متاح لمسؤول النظام (Super Admin) فقط.',
                dashboardOccasionTitle: 'الوضع الاحتفالي — شكل المناسبة في الداشبورد',
                dashboardOccasionEditBtn: 'تهيئة شكل الاحتفال',
                settingOccasionSectionTitle: 'تهيئة الوضع الاحتفالي (النظام الداخلي)',
                settingOccasionHint: 'أي مناسبة رسمية أو عرض مخصص يحوّل الداشبورد والموقع لمظهر احتفالي كامل. اختياري: تواريخ البداية والنهاية.',
                settingOccasionEnabledLabel: 'تفعيل الوضع الاحتفالي (الموقع + الداشبورد)',
                occasionSettingsSuperAdminOnly: 'تهيئة الاحتفال متاحة لمسؤول النظام (Super Admin) فقط.',
                celebrationBadgeDefault: 'وضع احتفالي',
                celebrationActiveNow: ' — الوضع الاحتفالي مفعّل الآن على لوحة الإدارة والموقع.',
                occasionActiveNow: ' — مفعّل الآن للزوار والإدارة.',
                occasionScheduledOff: 'الثيم مضبوط لكن خارج فترة التاريخ المحددة (المظهر الافتراضي حاليًا).',
                occasionDisabledOff: 'الثيم محدد لكن التفعيل غير مُشغّل من الإعدادات.',
                scmMainTitle: 'إدارة محتوى الموقع — بدون تعديل الكود',
                scmMainHint: 'كل المحتوى من هنا: منتجات بأصناف وأسعار، من نحن ورؤيتنا، أيقونات، أقسام، بنوك — بدون تعديل كود.',
                scmProductsHint: 'كل منتج (WPC، ألومنيوم، غيره): زر «أصناف المنتج» — شكل/نوع + مقاس + لون + سعر + صورة. مع الأصناف يظهر متجر (سلة + عرض سعر) للزائر.',
                channelWhatsApp: 'واتساب',
                channelFacebook: 'فيسبوك',
                channelInstagram: 'إنستغرام',
                channelTikTok: 'تيك توك',
                channelSnapchat: 'سناب شات',
                channelDetailExplicitWa: 'رابط واتساب محفوظ في الإعدادات',
                channelDetailWaFallback: 'لا يوجد رابط مخصص؛ يُستخدم رقم التواصل للعرض العام',
                channelDetailMissing: 'غير مضبوط — الأيقونة مخفية للزائر',
                channelDetailOn: 'رابط مفعّل',
                overlayGoSection: 'انتقل إلى القسم',
                overlayOpenLink: 'فتح الرابط',
                overlayDialSales: 'اتصال المبيعات',
                overlayDialCustomer: 'اتصال خدمة العملاء',
                salesHotlineLabel: 'خط المبيعات:',
                customerHotlineLabel: 'خدمة العملاء:',
                adminPreviewHint: '\n\nتنويه للزائر: أقسام المخزون والإحصائيات هنا للعرض التعريفي؛ التشغيل الكامل والموافقات من لوحة الإدارة فقط.',
                visitorOverlayIntro: 'معرض صور من الألبوم — ثم انتقل للقسم أو افتح الرابط الخارجي إن وُجد.',
                overlayBrowseIntro: 'معرض للتصفح — الصور والوثائق للاطلاع. الشراء من زر «تسوق» أو أيقونة السلة على البطاقة فقط.',
                overlayBrowseHint: 'وضع التصفح — استعرض المعرض بحرية. الشراء اختياري من زر «تسوق».',
                overlayShopHint: 'متجر — اختر صنفاً من البطاقات أدناه أو زر «تسوق» للسلة.',
                overlayShopBtn: 'تسوق — اختر المقاس والسعر',
                catalogVariantsTitle: 'الأنواع · المقاسات · الألوان',
                catalogVariantsCount: 'عدد الأصناف المعروضة: ',
                addVariantToCart: 'أضف للسلة',
                pricesExVatNotice: 'جميع الأسعار قبل ضريبة القيمة المضافة — تُعرض الضريبة تلقائياً عند الإضافة للسلة وفي عرض السعر الرسمي.',
                priceExVatShort: 'قبل الضريبة',
                priceIncVatShort: 'شامل الضريبة {pct}%',
                cartSubtotalEx: 'المجموع قبل الضريبة: ',
                cartProductsSubtotalEx: 'مجموع المنتجات قبل الضريبة: ',
                cartVatRow: 'مجموع ضريبة المنتجات ({pct}%): ',
                cartTotalInc: 'الإجمالي شامل الضريبة: ',
                cartProductsTotalInc: 'إجمالي المنتجات شامل الضريبة: ',
                cartUnitEx: 'وحدة قبل الضريبة',
                cartUnitInc: 'وحدة شامل الضريبة',
                cartLineEx: 'السطر ×{qty} قبل الضريبة',
                cartLineInc: 'السطر شامل الضريبة',
                checkoutStepCart: 'مراجعة السلة',
                checkoutStepProfile: 'بيانات العميل',
                checkoutStepQuote: 'عرض السعر',
                checkoutStepPay: 'حوالة وإرسال للمبيعات',
                variantDefaultLabel: 'صنف',
                iconDetailMissing: 'لا يوجد محتوى — أضف منتجاً من إدارة المحتوى.',
                overlayNoTarget: 'لم يُحدد قسم أو رابط.',
                badgeBrowseShort: 'تصفح',
                badgeShopShort: 'شراء',
                badgeLinkShort: 'انتقال',
                visitorJumpProducts: 'ينتقل إلى منتجات وأقسام المصنع',
                visitorJumpBranches: 'ينتقل إلى دليل فروع المملكة',
                visitorJumpServices: 'ينتقل إلى خدمات المنشأة',
                visitorJumpAbout: 'ينتقل إلى التعريف بالشركة',
                visitorJumpDoors: 'ينتقل إلى قسم أبواب WPC',
                visitorJumpAluminum: 'ينتقل إلى قسم الألومنيوم',
                visitorJumpColorCatalog: 'ينتقل إلى كتالوج ألوان نبراس (رولات)',
                visitorJumpPartners: 'ينتقل إلى قسم شركاؤنا',
                visitorJumpInside: 'انتقال داخل الموقع',
                visitorJumpExternal: 'رابط خارجي (يفتح في نافذة جديدة)',
                cartTitle: 'سلة التسوق',
                cartCommerceHint: 'أضف المنتجات القابلة للطلب (أيقونة السلة +) إلى سلتك الخاصة، ثم اطلب عرض سعر رسمي من مصنع نبراس للبلاستيك.',
                cartSessionHint: 'سلتك وبياناتك خاصة بهذه الجلسة فقط — لا يراها زوار آخرون. مرجع: ',
                cartCheckoutTitle: 'بيانات العميل',
                cartCheckoutSub: 'أكمل بيانات التواصل لإصدار عرض السعر — السلة مرتبطة بجلستك الحالية فقط.',
                cartPaymentTitle: 'الدفع والحوالة البنكية',
                cartPaymentIntro: 'بعد مراجعة عرض السعر: حوّل على أحد حسابات نبراس الثلاثة، ثم أرفق صورة الإيصال — يصل طلبك للمبيعات مع السلة.',
                cartPaymentDeclared: 'أؤكد أنني حوّلت المبلغ أو سأحوّله خلال 24 ساعة',
                cartReceiptLabel: 'صورة إيصال الحوالة (اختياري مع الطلب)',
                cartTransferBlockTitle: 'تأكيد الحوالة البنكية',
                cartTransferHint: 'بعد التحويل: ارفع صورة إيصال الحوالة هنا — تُرسل تلقائياً للمبيعات مع عرض السعر وتظهر في تقرير الإدارة.',
                cartBankQuickTitle: 'حسابات مصنع نبراس للحوالة:',
                cartBankQuickEmpty: 'حسابات الحوالة تُعرض من إعدادات المنصة.',
                cartTransferDeclaredOk: 'تم تسجيل تأكيد التحويل — أرفق صورة الإيصال إن وُجد.',
                cartReceiptAttachedOk: '✓ تم رفع صورة الحوالة — ستُرسل مع الطلب للمبيعات.',
                sendQuoteReceiptSent: '✓ تم إرسال صورة إيصال الحوالة مع الطلب — ستظهر في تقرير الإدارة.',
                sendQuoteTransferDeclared: '✓ تم تسجيل تأكيد التحويل — أرفق الإيصال لاحقاً من السلة إن لزم.',
                salesInboxTransferReceipt: 'حوالة + إيصال',
                salesInboxTransferDeclared: 'تحويل مُعلَن',
                cartReceiptTooLarge: 'حجم الصورة كبير — استخدم صورة أقل من 2 ميجابايت.',
                cartPaymentConfirmBank: 'الحساب المحوّل إليه: ',
                cartPaymentReceiptAttached: '✓ مرفق: صورة الحوالة',
                cartTrustSecure: 'دفع آمن عبر حوالة بنكية رسمية',
                cartTrustOfficial: 'حسابات مصنع نبراس المعتمدة',
                adminAnalyticsTitle: 'التحليلات والتقارير الداخلية',
                salesInboxReceipt: 'عرض إيصال الحوالة',
                salesInboxDoorDesign: 'عرض تصميم الباب',
                cartAddedOk: 'تمت الإضافة إلى سلتك',
                cartProductNotShop: 'هذا المنتج للمعرض والتصفح — اختر منتجاً بأيقونة السلة (+) للطلب.',
                siteClockLabel: 'توقيت المملكة العربية السعودية: ',
                checkoutNameLabel: 'الاسم / الشركة',
                checkoutPhoneLabel: 'رقم الجوال',
                checkoutEmailLabel: 'البريد الإلكتروني',
                checkoutCityLabel: 'المدينة / الفرع',
                checkoutAddressLabel: 'العنوان / موقع التسليم',
                checkoutAddressRequired: 'العنوان / موقع التسليم مطلوب لعرض السعر.',
                catalogHubTitle: 'كتالوج منتجات نبراس',
                catalogHubPick: 'اختر المنتج — صورة · شرح · سعر',
                iconInnerOpenProduct: 'عرض التفاصيل والأصناف',
                iconInnerProductIntro: 'صورة المنتج وشرحه — ثم الأنواع والمقاسات والألوان والأسعار أدناه.',
                iconInnerSectionIntro: 'استعرض معرض هذا القسم — المحتوى من لوحة الإدارة.',
                catalogHubIntro: 'مدخل عالم نبراس — اختر المنتج لرؤية الأنواع والمقاسات والألوان والأسعار.',
                catalogHubEmpty: 'لا توجد منتجات معروضة — أضيفيها من إدارة المحتوى.',
                catalogHubBrowse: 'تصفح',
                catalogHubPriceOnRequest: 'عند الطلب',
                catalogHubCount: 'منتج',
                occasionPromoTitle: 'عرض المناسبة',
                occasionPromoCta: 'اكتشف العروض',
                checkoutNoteLabel: 'ملاحظات للمبيعات',
                checkoutNameRequired: 'الاسم أو اسم الشركة مطلوب.',
                checkoutPhoneRequired: 'رقم الجوال مطلوب (9 أرقام على الأقل).',
                checkoutSummaryLabel: 'العميل: ',
                quoteCustomerTitle: 'بيانات العميل',
                sendQuoteCloudWarn: '(تم الحفظ محلياً — تحققي من Supabase لظهور الطلب عند الإدارة.)',
                salesInboxLoading: 'جاري تحميل الطلبات من السحابة…',
                cartEmpty: 'السلة فارغة. أضف منتجات قابلة للشراء (أيقونة السلة على البطاقة).',
                quoteFinalizedOk: 'تم تسجيل عرض السعر',
                quoteMarkFinalizedBtn: 'تسجيل عرض السعر كمنفّذ',
                cartClose: 'إغلاق',
                cartRequestQuote: 'اطلب عرض سعر',
                cartTotal: 'المجموع: ',
                cartRemove: 'حذف',
                cartQty: 'الكمية: ',
                quoteConfirmTitle: 'تأكيد طلب عرض السعر — مشترياتك:',
                quoteConfirmProceed: 'متابعة لعرض السعر الرسمي (A4)؟',
                quotePrint: 'طباعة / PDF',
                quoteClose: 'إغلاق',
                quoteLogoAlt: 'شعار نبراس',
                bankAccountsTitle: 'حسابات شركة مصنع نبراس البنكية',
                bankAccountsSubtitle: 'للتحويلات والدفع — حسابات مصنع نبراس الرسمية',
                bankAccountsSubtitleAdmin: 'للتحويلات والدفع — تُدار من الإدارة الداخلية',
                bankIbanCopyBtn: 'نسخ الآيبان',
                bankIbanCopied: 'تم نسخ رقم الآيبان',
                bankIbanCopyPrompt: 'انسخ رقم الآيبان:',
                scmDashboardHint: 'كل أيقونة: «محتوى داخل الأيقونة» (نصوص · صور · وثائق) + الإجراء. التعديل فوري بدون كود.',
                sendQuoteConfirm: 'إرسال الطلب؟',
                sendQuoteConfirmChannels: 'اختر المبيعات أو خدمة العملاء',
                sendOrderSalesConfirm: 'إرسال أوردر السلة (تحت التنفيذ) للمبيعات؟',
                sendOrderCsConfirm: 'إرسال أوردر السلة (تحت التنفيذ) لخدمة العملاء؟',
                sendQuoteA4SalesConfirm: 'إرسال عرض السعر A4 للمبيعات؟',
                sendQuoteA4CsConfirm: 'إرسال عرض السعر A4 لخدمة العملاء؟',
                sendOrderHint: 'سيتم إرسال أوردر تحت التنفيذ',
                sendQuoteA4BothConfirm: 'إرسال عرض السعر A4 (PDF) للمبيعات وخدمة العملاء؟',
                sendQuoteA4PdfHint: 'سيتم توليد PDF A4 وإرساله عبر واتساب للمبيعات وخدمة العملاء',
                sendQuoteA4Done: 'تم إرسال عرض السعر A4 (PDF). الرقم:',
                sendQuoteA4RenderFail: 'تعذّر تجهيز مستند A4 — أعدي المحاولة.',
                sendQuoteA4PdfFail: 'تعذّر إنشاء PDF — تحققي من الاتصال وأعدي المحاولة.',
                sendQuoteA4Preparing: 'جاري تجهيز PDF A4…',
                quotePdfLinkLabel: 'عرض السعر PDF (A4):',
                cartRequestQuoteSend: 'إرسال عرض السعر A4 (PDF) للمبيعات وخدمة العملاء',
                cartPreviewQuoteA4: 'معاينة A4 قبل الإرسال',
                quoteSendPdfBoth: 'إرسال PDF A4 للمبيعات وخدمة العملاء',
                quoteSendOptionalOne: 'أو اختاري قسماً واحداً:',
                sendQuoteA4ImageHint: 'مع صورة المستند A4 (نفس المعاينة على الشاشة)',
                quoteImageLinkLabel: 'صورة عرض السعر A4:',
                quoteImageSentHint: 'تم إرفاق/تحميل صورة المستند — أرفقيها في واتساب إن لم تظهر تلقائياً.',
                salesInboxAdminStats: 'إداري اليوم:',
                salesInboxAdminIssued: 'صادر',
                salesInboxAdminFinalized: 'منفّذ',
                salesInboxQuoteDoc: 'عرض مستند A4',
                sendQuoteDoneSales: 'تم حفظ الطلب وإرساله للمبيعات. الرقم:',
                sendQuoteDoneCs: 'تم حفظ الطلب وإرساله لخدمة العملاء. الرقم:',
                sendQuoteA4Sent: 'صيغة A4',
                sendOrderSent: 'أوردر تحت التنفيذ',
                cartSendOptionalLabel: 'إرسال عرض السعر A4 — اختر القسم',
                cartSendSalesBtn: 'PDF — المبيعات',
                cartSendCsBtn: 'PDF — خدمة العملاء',
                cartSendSalesTitle: 'إرسال أوردر للمبيعات',
                cartSendCsTitle: 'إرسال أوردر لخدمة العملاء',
                quoteSendOptionalLabel: 'إرسال عرض السعر A4 — اختياري',
                quoteSendSalesTitle: 'إرسال A4 للمبيعات',
                quoteSendCsTitle: 'إرسال A4 لخدمة العملاء',
                cartOrderPreviewTitle: 'طلب شراء — تحت التنفيذ',
                cartRequestQuoteA4: 'اطلب عرض سعر A4',
                sendQuoteNamePrompt: 'اسم الشركة / العميل (اختياري):',
                sendQuotePhonePrompt: 'رقم التواصل:',
                sendQuoteNotePrompt: 'ملاحظات للمبيعات:',
                sendQuoteDone: 'تم حفظ الطلب. الرقم:',
                sendQuoteOpenWa: 'فتح واتساب المبيعات؟',
                sendQuoteWaHint: 'اضغط «إرسال» في واتساب لإتمام الطلب.',
                sendQuoteCloudOk: 'الطلب محفوظ ويظهر في: المبيعات → طلبات عروض الأسعار + التحليلات.',
                sendQuoteWaIntro: 'طلب عرض سعر — مصنع نبراس',
                cartSendSales: 'المبيعات',
                fabSendSales: 'إرسال للمبيعات',
                fabSendCs: 'إرسال لخدمة العملاء',
                salesInboxTitle: 'طلبات عروض الأسعار الواردة (من السلة)',
                salesInboxHint: 'كل عرض سعر يرسله العميل من الموقع يصل هنا للمراجعة.',
                salesInboxEmpty: 'لا طلبات عروض أسعار بعد.',
                salesInboxLines: 'صنف',
                salesInboxReviewed: 'تمت المراجعة',
                salesInboxClosed: 'إغلاق',
                salesInboxDetails: 'تفاصيل',
                overlayDocument: 'وثيقة',
                overlayOpenModule: 'فتح النظام / المتابعة',
                dashboardLegalTitle: 'بيانات مصنع نبراس الرسمية (داخلية + خارجية)',
                dashNavErp: 'ERP',
                dashNavPlatform: 'المنصة',
                dashNavOps: 'العمليات',
                dashNavContent: 'المحتوى',
                dashNavSettings: 'الإعدادات',
                settingsSuperAdminOnly: 'إعدادات النظام الكاملة متاحة لـ Super Admin فقط.',
                complaintNamePh: 'اسم العميل',
                complaintPhonePh: 'رقم الهاتف',
                complaintBranchPh: 'الفرع',
                complaintDescPh: 'تفاصيل الشكوى',
                complaintNumberPh: 'رقم الشكوى',
                complaintSubmit: 'إرسال شكوى جديدة',
                complaintCheck: 'استعلام',
                complaintCancel: 'إغلاق',
                complaintFillRequired: 'يرجى إدخال الاسم ورقم الهاتف وتفاصيل الشكوى.',
                complaintSubmitted: 'تم تسجيل الشكوى بنجاح. رقم الشكوى: ',
                complaintRouted: 'التحويل: ',
                occasionSiteWideLabel: 'زينة شاملة لكل الموقع والداشبورد (ألوان، حدود، بطاقات)',
                shopChooseVariant: 'اختر المقاس / اللون / النوع',
                shopQty: 'الكمية',
                shopAddCart: 'أضف إلى السلة',
                shopClose: 'إغلاق',
                platformModuleLocked: 'هذه الوحدة غير متاحة لصلاحياتك أو لم تُفعّل بعد.',
                aboutCardHint: 'اضغط للتفاصيل والشهادات',
                aboutGalleryTitle: 'الشهادات والوثائق المعتمدة:',
                scmTabAbout: 'من نحن ورؤيتنا',
                scmAboutHint: 'نصوص تفصيلية وشهادات وصور — تظهر عند ضغط الزائر على أيقونة من نحن أو رؤيتنا.',
                scmVisitorHint: 'كل أيقونة: خلفية البطاقة + ألبوم معرض داخلي + PDF. اختر «معرض» (تصفح فقط) أو «معرض + متجر» (صور + أصناف + سلة). رفع الصور والوثائق من «رفع / اختيار صورة» و«إضافة صورة للألبوم».',
                scmShowroomHint: 'معرض نبراس — قسمان يظهران عند الضغط على «المعرض» في الهيدر: «منتجات نبراس» و«مشاريع نبراس». ارفعي الصور واربطي معرّف منتج (مثل prod-aluminum) لتفعيل زر السلة تحت الصورة.'
            },
            en: {
                dir: 'ltr',
                lang: 'en',
                nav: {
                    home: '<i class="fas fa-home"></i> Home',
                    store: '<i class="fas fa-store"></i> Store',
                    showroom: '<i class="fas fa-images"></i> Showroom',
                    platform: '<i class="fas fa-globe"></i> Platform',
                    adminVisitor: '<i class="fas fa-user-shield"></i> Admin',
                    adminStaff: '<i class="fas fa-user-shield"></i> Dashboard',
                    about: '<i class="fas fa-info-circle"></i> About',
                    branches: '<i class="fas fa-map-marker-alt"></i> Branches',
                    sales: '<i class="fas fa-phone-alt"></i> Sales',
                    customer: '<i class="fas fa-headset"></i> Support'
                },
                heroTitle: '<i class="fas fa-star"></i> Nebras Plastic Factory Company',
                heroText: 'From the heart of the Kingdom, we offer global plastic solutions with authentic Saudi standards.',
                pageTitle: 'Nebras Digital Platform — Nebras Plastic Factory',
                pageDescription: 'Nebras Plastic Factory — product showroom, quotations, KSA branches, and governed admin.',
                introEyebrow: 'Kingdom of Saudi Arabia',
                introBrandName: 'Nebras Plastic Factory Company',
                introTagline: 'Luxury WPC doors — integrated quality and elegance',
                introSkip: 'Enter platform',
                introWelcomeTap: 'Tap anywhere to hear the welcome message',
                heroEyebrow: 'Nebras Plastic Factory',
                heroHeadline: 'Luxury WPC Doors',
                heroTaglineShort: 'Integrated solutions with quality and elegance — across the Kingdom',
                heroExploreBtn: 'Explore products ←',
                heroQuoteBtn: 'Request a quote',
                heroStatWarrantyVal: '10',
                heroStatWarranty: 'years warranty',
                heroStatInstallVal: '+1M',
                heroStatInstall: 'installations',
                heroStatYearsVal: '5',
                heroStatYears: 'years experience',
                doorDesignerHardwareLabel: 'Handle & hardware',
                doorDesignerReset: 'Reset',
                doorDesignerCanvasHint: 'Real WPC leaf model — each choice replaces the last. Reset returns to zero.',
                doorDesignerStudioTitle: 'Design your door',
                doorDesignerAdvancedLabel: 'More options (types, size, hardware…)',
                adminLoginTitle: 'Admin sign-in',
                adminLoginUserPh: 'Username',
                adminLoginPassPh: 'Password',
                adminLoginBtn: 'Sign in',
                adminLoginCancel: 'Cancel',
                adminLoginEmpty: 'Please enter username and password.',
                adminLoginOk: 'Signed in successfully.',
                adminLoginFail: 'Invalid credentials. Try again.',
                adminAccountSecurity: 'Account security',
                adminRoleTemplate: 'User: {user} — Role: {role}',
                dashNavPartners: 'Partners',
                dashNavOps: 'Operations',
                dashNavModules: 'Modules',
                dashboardPartnersHint: 'Add partner logos in Content Manager → Partners tab.',
                scmTabProducts: 'Products',
                scmTabVisitor: 'Visitor icons',
                scmTabDashboard: 'Admin dashboard',
                scmTabSections: 'Extra sections',
                scmTabPartners: 'Partners',
                scmTabCertifications: 'Certifications',
                menuToggleAria: 'Menu',
                cartFabAria: 'Shopping cart',
                topCartAria: 'Shopping cart',
                langToggleAria: 'Choose language',
                workspaceCartTitle: 'Cart',
                accountSecurityTitle: 'Account security',
                accountSecurityChange: 'Change credentials with current password',
                accountSecurityRecover: 'Recover / change via email',
                accountSecurityClose: 'Close',
                iconOverlayClose: 'Close',
                companySocialSubtitle: 'Follow Nebras Plastic Factory official channels.',
                visitorQuickDoorDesigner: 'Design your door with Nebras',
                doorDesignerHeroSub: 'WPC design studio — 3D 360° preview with real roll materials',
                doorDesignerIntro: 'Choose door family (edge-band · U-channel · sliding), model, flat/curve exterior decor, top cladding, and roll colour — live preview.',
                doorDesignerPresetsLabel: 'Quick presets',
                doorDesignerMechanismLabel: 'Opening',
                doorDesignerLeafLabel: 'Leaves',
                doorDesignerSurfaceLabel: 'Door surface',
                doorDesignerGlassLayoutLabel: 'Glass layout',
                doorDesignerTypeLabel: 'Door family',
                doorDesignerSubModelLabel: 'Door model',
                doorDesignerModelLabel: 'Model',
                doorDesignerStyleLabel: 'Style',
                doorDesignerShapeLabel: 'Exterior decor',
                doorDesignerFrameLabel: 'Frame & jamb',
                doorDesignerDecorLabel: 'Top cladding',
                doorDesignerGlassLabel: 'Glass style',
                doorDesignerSizeLabel: 'Size',
                doorDesignerOpeningLabel: 'Opening',
                doorDesignerLockLabel: 'Lock',
                doorDesignerRollLabel: 'Colour roll',
                doorDesignerLeafSizeLabel: 'Leaf size',
                doorDesignerRollTag: 'Roll',
                doorDesignerColorLabel: 'Nebras colour rolls',
                doorDesignerColorDesc: '20 WPC rolls — colour tile, then code and name (e.g. N-2 Golden Teak)',
                doorDesignerCatalogHint: 'N-1 to N-21 (no N-12)',
                doorDesignerQuoteBtn: 'Request quote for this design',
                doorDesignerDisabled: 'Designer is not available right now.',
                doorDesignerPendingData: 'Door designer data has been removed. Send the new dataset to rebuild it.',
                doorDesignerDataOnlyHint: 'Data entry phase — visual door preview will be enabled after you send model images.',
                doorDesigner3dHint: 'Drag to rotate 360° — scroll to zoom',
                doorDesigner3dFail: 'Could not load 3D preview. Hard-refresh (Ctrl+F5) or use http://localhost:5500',
                doorDesigner3dAria: '3D WPC door preview',
                doorDesignerCompositorHint: 'Drag to rotate 360° — scroll to zoom',
                doorDesignerCompositorLoading: 'Building design layers…',
                doorDesignerCompositorAria: 'Layered dynamic door preview',
                doorDesignerCanvasHint: 'Each option updates structure and materials — colours from 20 Nebras rolls',
                partnersSuccessSubtitle: 'Partners in success',
                lightboxOpenHint: 'Click to enlarge',
                workspaceBackHome: 'Home',
                workspacePillarPlatform: 'Platform',
                workspacePillarShowroom: 'Showroom',
                workspacePillarStore: 'Store',
                workspaceQuoteBtn: 'Quote',
                workspaceBranchesIntro: 'KSA branches — pick a branch to contact sales.',
                workspaceStoreIntro: 'Nebras store — pick a product for gallery, prices and quotation.',
                workspacePlatformIntro: 'Factory info, branches and bank accounts.',
                workspacePlatformHub: 'Nebras platform',
                workspaceOpenStore: 'Open store',
                workspaceBrowseProducts: 'Browse products',
                workspaceMapHint: 'Select a branch for contact details',
                workspaceMapDialHint: 'For exact map location contact sales or use smart routing from home.',
                branchesEmptyPublic: 'Coming soon — Nebras factory branches across KSA.',
                workspaceSectionMissing: 'Content is being updated.',
                workspaceProductMissing: 'Product is not available right now.',
                workspaceDefaultTitle: 'Nebras',
                workspaceDefaultIntro: 'Choose a section from the home gateway.',
                dashZoneCommand: 'Content & governance command',
                dashZoneOperations: 'ERP & operations analytics',
                partnersPublicTitle: 'Our partners',
                partnersPublicSubtitle: 'Trusted by leading organisations across Saudi Arabia',
                workspaceBrowseOnlyHint: 'Gallery — browse and preview only. To buy, use a store icon or Add to cart.',
                workspaceShopHint: 'Store — pick variant and size, then Add to cart.',
                variantPreviewOnly: 'Preview only',
                dashboardPartnersTitle: 'Our partners',
                dashboardHubIntroTitle: 'Control center — Nebras',
                dashboardHubIntroText: 'Pick a tile to operate inside the platform. Partners appear on site and dashboard.',
                certsOverlayTitle: 'Nebras certifications',
                certsOverlayIntro: 'Factory certificates and accreditations — images and PDF with captions.',
                visitorQuickWpcRaw: 'WPC raw doors',
                visitorQuickWpcReady: 'WPC ready doors',
                visitorQuickOtherProducts: 'Other products',
                visitorQuickCertifications: 'Nebras certifications',
                visitorQuickCatalogProducts: 'Product catalog',
                storefrontProductsTitle: 'Nebras E-Store',
                storefrontProductsSubtitle: 'Browse products — each opens a full internal store page.',
                certsEmptyHintAdmin: 'Add certificates in Content Manager → Certifications.',
                certsEmptyHintPublic: 'Coming soon — accredited Nebras factory certifications.',
                occasionFallbackTitle: 'Nebras occasion',
                occasionOverlayHint: 'Tap to view products and offers.',
                aboutTitle1: 'About Us',
                aboutText1: 'Nebras Plastic Factory Company delivers integrated industrial and contracting solutions with transparency and premium Saudi quality. Our mission is to innovate products and create a smooth experience for every client and visitor.',
                aboutTitle2: 'Our Vision',
                aboutText2: 'We aim to grow our industrial presence and deliver a professional digital experience, with strong commitment to quality and partnership across Saudi Arabia and beyond.',
                serviceTitle1: 'Manufacturing Services',
                serviceText1: 'Manufacturing high-quality plastic products while observing the highest safety and sustainability standards for large projects.',
                serviceTitle2: 'Technical Support',
                serviceText2: 'A full support team to track orders and resolve issues quickly, providing technical support to customers and projects professionally.',
                serviceTitle3: 'Quality Management',
                serviceText3: 'Precise quality control for every product and production stage to ensure a final product that meets market demands and customer satisfaction.',
                serviceTitleInstall: 'Installation & warranty services',
                serviceTextInstall: 'Integrated field services from measurement to delivery — professional teams at every step.',
                workspaceBranchesListBtn: 'Branches & contact',
                sectionTitle: 'Nebras Platform — global structure',
                sectionSubtitle: 'Public storefront plus internal command center — full admin control without code changes.',
                quickServicesTitle: 'Nebras Digital Gateway',
                quickServicesSubtitle: 'E-store · product showroom · factory platform — enter internal pages.',
                gatewayLaneStore: 'E-Store',
                gatewayLaneStoreHint: 'WPC & aluminum — variants, cart, quotes',
                gatewayLaneShowroom: 'Nebras Showroom',
                gatewayLaneShowroomHint: 'Nebras products · projects · certificates',
                showroomHubTitle: 'Nebras Showroom',
                showroomHubIntro: 'Two main galleries: our products and delivered projects.',
                showroomProductsEmpty: 'Add product images from Content → Nebras Showroom.',
                showroomProjectsEmpty: 'Add project images from Content → Nebras Showroom.',
                gatewayLanePlatform: 'Factory Platform',
                gatewayLanePlatformHint: 'Branches, bank accounts, services',
                trustStripAria: 'Nebras factory advantages',
                trustItem1Title: 'Saudi factory',
                trustItem1Sub: 'Industrial quality from Qassim',
                trustItem2Title: 'Trust & warranty',
                trustItem2Sub: 'Certified WPC products',
                trustItem3Title: 'Official quotation',
                trustItem3Sub: 'A4 invoice + VAT',
                trustItem4Title: 'Design your door',
                trustItem4Sub: 'Interactive 3D studio',
                gatewayExploreStore: 'Explore full store',
                gatewayDoorDesigner: 'Design your door',
                mobBarStore: 'Store',
                mobBarCart: 'Cart',
                mobBarQuote: 'Quote',
                storefrontProductsTitle: 'Nebras E-Store',
                storefrontProductsSubtitle: 'Browse products — each opens a full internal store page.',
                visitorQuickWpcRaw: 'WPC raw doors',
                visitorQuickWpcReady: 'WPC ready doors',
                visitorQuickAluminum: 'Aluminum',
                visitorQuickOtherProducts: 'Other products',
                visitorQuickComplaints: 'Complaint inquiry',
                visitorQuickBranches: 'Nebras branches',
                visitorQuickColorRolls: 'Nebras colour catalogue (rolls)',
                visitorQuickBankAccounts: 'Nebras Plastic Factory — bank accounts',
                visitorJumpBankAccounts: 'Open bank accounts',
                visitorTitle: 'Public storefront',
                visitorText: 'Visitor layer: product galleries, private cart, branches, and official quotation requests — no admin access.',
                adminTitle: 'Command center',
                adminText: 'Internal governance: roles, content, celebrations, branches, complaints, and sales — one governed control plane.',
                pvcTitle: '<i class="fas fa-door-open"></i> WPC Raw Doors (Workshops)',
                pvcText: 'Unfinished WPC door leaves for workshops and factories.',
                wpcTitle: '<i class="fas fa-door-open"></i> WPC Ready Doors',
                wpcText: 'Ready-to-install WPC doors for homes and modern projects.',
                aluminumTitle: '<i class="fas fa-cog"></i> Aluminum',
                aluminumText: 'Durable aluminum products and smart designs for construction and finishing projects.',
                otherProductsAlert: 'Other Products section is open. Here you can display additional products.',
                adminComplaintsTitle: '<i class="fas fa-user-shield"></i> Complaints & Permissions Management',
                adminComplaintsText: 'Protected section for managing complaints and editing site permissions and sections.',
                customerComplaintsTitle: '<i class="fas fa-search"></i> Complaint Inquiry',
                customerComplaintsText: 'Check your complaint status by entering the complaint number.',
                complaintInquiryTitle: 'Complaint Inquiry',
                complaintInquiryText: 'Enter the complaint number to know the current status.',
                complaintNumberLabel: 'Complaint Number:',
                complaintStatusLabel: 'Complaint Status:',
                complaintStatusPending: 'Under Review',
                complaintStatusInProgress: 'In Progress',
                complaintStatusResolved: 'Resolved',
                complaintNotFound: 'No complaint found with this number.',
                complaintEnterNumber: 'Please enter a complaint number.',
                complaintUnknownStatus: 'Unknown status',
                otherProductsTitle: '<i class="fas fa-boxes"></i> Other Products',
                otherProductsText: 'A diverse range of additional products and innovative solutions.',
                adminAccessMessage: 'You must log in as an admin to access this section.',
                adminComplaintsAlert: 'Complaints and Permissions Management section is open. Here you can edit the site and sections.',
                quickOtherTitle: 'Other Nebras Products',
                quickOtherText: 'Quick access to multiple Nebras products and management of added production lines.',
                quickAluminumTitle: 'Aluminum Section',
                quickAluminumText: 'Instant management for the new aluminum section and easy product additions.',
                quickComplaintsTitle: 'Complaints Section',
                quickComplaintsText: 'Monitor complaints and manage requests quickly with clear tracking.',
                colorCatalogTitle: 'Nebras colour catalogue — rolls',
                colorCatalogSubtitle: 'Finishes and colour lines available across Nebras Plastic production.',
                colorCatalogBody: 'This section outlines colour rolls and finishes available to order. Contact sales or your nearest branch for samples or a specific colour code.',
                branchesTitle: 'Nebras Branches in KSA',
                branchesSubtitle: 'Nebras branches in KSA with a dedicated sales phone for each branch.',
                branchCardSalesLabel: 'Branch sales:',
                branchCallDirect: 'Direct call',
                branchSmartRoute: 'Smart routing',
                topSalesLabel: '<i class="fas fa-phone-alt"></i> Sales:',
                topCustomerLabel: '<i class="fas fa-headset"></i> Customer Service & Complaints:',
                topSalesButton: 'Call Sales',
                topCustomerButton: 'Call Customer Service',
                topSmartButton: 'Nearest Sales Rep',
                adminDashboardTitle: 'Nebras Platform Command Center',
                platformHubTitle: 'Nebras Platform — internal & external control',
                platformHubSubtitle: 'Global-platform model: public storefront plus governed command center. Open a module to operate.',
                platformStatusLive: 'Live',
                platformStatusBeta: 'Beta',
                platformStatusPlanned: 'Planned',
                platformModuleLocked: 'This module is locked for your role or not active yet.',
                erpHubTitle: 'Nebras ERP — enterprise resource planning',
                erpHubSubtitle: 'Like global platforms: inventory, sales, orders, procurement, CRM — built into the platform.',
                erpBenchmarkSummary: 'Comparison with global platforms (Amazon · Alibaba · Jarir …)',
                erpBenchColArea: 'Area',
                erpBenchColGlobal: 'Global leaders',
                erpBenchColNebras: 'Nebras now',
                erpKpiSku: 'SKU items',
                erpKpiLow: 'Stock alerts',
                erpKpiSales: 'Sales ops',
                erpKpiOrders: 'ERP orders',
                erpKpiComplaints: 'Complaints',
                erpKpiBranches: 'Branches',
                logoutText: '<i class="fas fa-sign-out-alt"></i> Logout',
                currentLangLabel: 'English',
                footerDesignerIntro: 'Design & development: Eng. Abdelrahman Omran Tarash',
                footerContactLabel: 'Contact',
                footerDesignerWhatsAppAria: 'WhatsApp the engineer',
                footerDesignerCallAria: 'Call the engineer',
                companySocialTitle: 'Social hub — Nebras Plastic Factory',
                companySocialSubtitlePublic: 'Follow Nebras Plastic Factory official channels for updates.',
                dashboardChannelsTitle: 'Social channels status (admin)',
                dashboardChannelsHint: 'Synced from System Settings. Empty URL hides the icon on the public page. Review after changes on social platforms.',
                dashboardChannelsEditBtn: 'Open social links settings',
                channelLinktree: 'Linktree',
                dashboardOfficialTitle: 'Official links & site QR',
                dashboardOfficialHint: 'Official Linktree · site QR code · copyright.',
                dashboardCopyright: 'All rights reserved — Nebras Plastic Factory 2026',
                siteFooterCopyright: 'All rights reserved — Nebras Plastic Factory 2026',
                dashboardLinktreeTitle: 'Nebras.Factory — Official Linktree',
                dashboardQrCaption: 'Scan to open Nebras website',
                dashboardQrDownload: 'Download QR',
                dashboardQrAlt: 'Nebras factory website QR code',
                channelsSettingsSuperAdminOnly: 'Editing social links is limited to the Super Admin account.',
                dashboardOccasionTitle: 'Celebration mode — festive dashboard look',
                dashboardOccasionEditBtn: 'Configure celebration',
                settingOccasionSectionTitle: 'Celebration mode (internal system)',
                settingOccasionHint: 'Official occasions or a custom display transform the dashboard and site into a full festive look. Optional start/end dates.',
                settingOccasionEnabledLabel: 'Enable celebration mode (site + dashboard)',
                occasionSettingsSuperAdminOnly: 'Celebration setup is limited to Super Admin.',
                celebrationBadgeDefault: 'Celebration',
                celebrationActiveNow: ' — celebration mode is live on the admin dashboard and site.',
                occasionActiveNow: ' — active now for visitors and staff.',
                occasionScheduledOff: 'Theme is configured but outside the scheduled date range (default look for now).',
                occasionDisabledOff: 'Theme is selected but not enabled in settings.',
                scmMainTitle: 'Site content — no code changes',
                scmMainHint: 'Add products, visitor icons, extra sections, and dashboard backgrounds. Changes go live immediately.',
                scmProductsHint: 'Each product (WPC, aluminum, etc.): use “Product variants” for shape/type, size, color, price, image. With variants, visitors get cart + quotation.',
                channelWhatsApp: 'WhatsApp',
                channelFacebook: 'Facebook',
                channelInstagram: 'Instagram',
                channelTikTok: 'TikTok',
                channelSnapchat: 'Snapchat',
                channelDetailExplicitWa: 'Custom WhatsApp URL saved in settings',
                channelDetailWaFallback: 'No custom URL; public fallback uses the configured contact number',
                channelDetailMissing: 'Not set — hidden from visitors',
                channelDetailOn: 'Link active',
                overlayGoSection: 'Go to section',
                overlayOpenLink: 'Open link',
                overlayDialSales: 'Call sales',
                overlayDialCustomer: 'Call customer service',
                salesHotlineLabel: 'Sales line:',
                customerHotlineLabel: 'Customer service:',
                adminPreviewHint: '\n\nVisitor note: inventory and analytics here are introductory; full operations require the admin dashboard.',
                visitorOverlayIntro: 'Album preview — then jump to the section or open the external link.',
                overlayBrowseIntro: 'Browse mode — view photos and documents. Purchase only via Shop or the cart icon on the card.',
                overlayBrowseHint: 'Browse mode — explore freely. Purchase is optional via Shop.',
                overlayShopHint: 'Shop — pick a variant below or use Shop for full cart.',
                overlayShopBtn: 'Shop — choose size & price',
                catalogVariantsTitle: 'Types · Sizes · Colors',
                catalogVariantsCount: 'Variants shown: ',
                addVariantToCart: 'Add to cart',
                pricesExVatNotice: 'All prices exclude VAT — tax is calculated in the cart and official quotation.',
                priceExVatShort: 'ex VAT',
                priceIncVatShort: 'inc VAT {pct}%',
                cartSubtotalEx: 'Subtotal (ex VAT): ',
                cartProductsSubtotalEx: 'Products subtotal (ex VAT): ',
                cartVatRow: 'Products VAT ({pct}%): ',
                cartTotalInc: 'Total (inc VAT): ',
                cartProductsTotalInc: 'Products total (inc VAT): ',
                cartUnitEx: 'Unit ex VAT',
                cartUnitInc: 'Unit inc VAT',
                cartLineEx: 'Line ×{qty} ex VAT',
                cartLineInc: 'Line inc VAT',
                checkoutStepCart: 'Review cart',
                checkoutStepProfile: 'Your details',
                checkoutStepQuote: 'Price quote',
                checkoutStepPay: 'Transfer & send to sales',
                variantDefaultLabel: 'Variant',
                iconDetailMissing: 'No content — add a product in Site Content.',
                overlayNoTarget: 'No section or link configured.',
                badgeBrowseShort: 'Browse',
                badgeShopShort: 'Buy',
                badgeLinkShort: 'Go',
                visitorJumpProducts: 'Opens products & factory sections',
                visitorJumpBranches: 'Opens the KSA branches directory',
                visitorJumpServices: 'Opens company services',
                visitorJumpAbout: 'Opens about the company',
                visitorJumpDoors: 'Opens the WPC doors section',
                visitorJumpAluminum: 'Opens the aluminum section',
                visitorJumpColorCatalog: 'Opens the Nebras colour rolls catalogue',
                visitorJumpPartners: 'Scrolls to our partners section',
                visitorJumpInside: 'In-site navigation',
                visitorJumpExternal: 'External link (new tab)',
                cartTitle: 'Shopping cart',
                cartCommerceHint: 'Add shop-enabled products (cart + icon) to your private cart, then request an official Nebras quotation.',
                cartSessionHint: 'Your cart and details are private to this session only. Ref: ',
                cartCheckoutTitle: 'Your details',
                cartCheckoutSub: 'Complete your contact details for an official quotation — cart tied to this session only.',
                cartAddedOk: 'Added to your cart',
                cartProductNotShop: 'This item is browse-only — choose a product with the cart (+) icon to order.',
                siteClockLabel: 'Kingdom of Saudi Arabia time: ',
                checkoutNameLabel: 'Name / Company',
                checkoutPhoneLabel: 'Mobile',
                checkoutEmailLabel: 'Email',
                checkoutCityLabel: 'City / Branch',
                checkoutAddressLabel: 'Delivery address',
                checkoutAddressRequired: 'Delivery address is required for the quote.',
                catalogHubTitle: 'Nebras product catalog',
                catalogHubPick: 'Choose a product — image · details · price',
                iconInnerOpenProduct: 'View details & variants',
                iconInnerProductIntro: 'Product image and description — then types, sizes, colors and prices below.',
                iconInnerSectionIntro: 'Browse this section gallery — content from admin.',
                catalogHubIntro: 'Enter the Nebras world — pick a product to see types, sizes, colors and prices.',
                catalogHubEmpty: 'No products listed yet — add them from Content Manager.',
                catalogHubBrowse: 'Browse',
                catalogHubPriceOnRequest: 'On request',
                catalogHubCount: 'products',
                occasionPromoTitle: 'Special offer',
                occasionPromoCta: 'Explore offers',
                checkoutNoteLabel: 'Notes for sales',
                checkoutNameRequired: 'Name or company is required.',
                checkoutPhoneRequired: 'Valid mobile number is required.',
                checkoutSummaryLabel: 'Customer: ',
                quoteCustomerTitle: 'Customer details',
                sendQuoteCloudWarn: '(Saved locally — check Supabase so all admins see this request.)',
                salesInboxLoading: 'Loading requests from cloud…',
                salesInboxReceipt: 'View transfer receipt',
                salesInboxDoorDesign: 'View door design',
                cartPaymentTitle: 'Payment & bank transfer',
                cartPaymentIntro: 'After reviewing your quote: transfer to a Nebras account, then attach the receipt — your request goes to sales with the cart.',
                cartPaymentDeclared: 'I confirm I have transferred (or will within 24 hours)',
                cartReceiptLabel: 'Bank transfer receipt image',
                cartTransferBlockTitle: 'Bank transfer confirmation',
                cartTransferHint: 'After transfer: upload your receipt here — it is sent to sales with the quote and appears in admin reports.',
                cartBankQuickTitle: 'Nebras factory transfer accounts:',
                cartBankQuickEmpty: 'Transfer accounts are managed in platform settings.',
                cartTransferDeclaredOk: 'Transfer confirmed — attach receipt if available.',
                cartReceiptAttachedOk: '✓ Receipt uploaded — it will be sent with your request to sales.',
                sendQuoteReceiptSent: '✓ Transfer receipt sent with the request — visible in admin reports.',
                sendQuoteTransferDeclared: '✓ Transfer confirmed — attach receipt later from cart if needed.',
                salesInboxTransferReceipt: 'Transfer + receipt',
                salesInboxTransferDeclared: 'Transfer declared',
                cartReceiptTooLarge: 'Image too large — use a file under 2 MB.',
                cartPaymentConfirmBank: 'Transfer account: ',
                cartPaymentReceiptAttached: '✓ Attached: transfer receipt',
                cartTrustSecure: 'Secure payment via official bank transfer',
                cartTrustOfficial: 'Verified Nebras factory accounts',
                cartEmpty: 'Cart is empty. Add shop-enabled products (cart icon on card).',
                quoteFinalizedOk: 'Quote marked as finalized',
                quoteMarkFinalizedBtn: 'Mark quote as finalized',
                cartClose: 'Close',
                cartRequestQuote: 'Request quotation',
                cartTotal: 'Total: ',
                cartRemove: 'Remove',
                cartQty: 'Qty: ',
                quoteConfirmTitle: 'Confirm quotation request:',
                quoteConfirmProceed: 'Continue to official A4 quotation?',
                quotePrint: 'Print / PDF',
                quoteClose: 'Close',
                quoteLogoAlt: 'Nebras logo',
                bankAccountsTitle: 'Nebras Plastic Factory Company — bank accounts',
                bankAccountsSubtitle: 'Official Nebras factory bank accounts for transfers',
                bankAccountsSubtitleAdmin: 'For transfers — managed by internal admin',
                bankIbanCopyBtn: 'Copy IBAN',
                bankIbanCopied: 'IBAN copied to clipboard',
                bankIbanCopyPrompt: 'Copy IBAN:',
                scmDashboardHint: 'Each tile: inner content (text, images, documents) + action. No code edits.',
                sendQuoteConfirm: 'Send this request?',
                sendQuoteConfirmChannels: 'Choose sales or customer service',
                sendOrderSalesConfirm: 'Send cart order (in progress) to sales?',
                sendOrderCsConfirm: 'Send cart order (in progress) to customer service?',
                sendQuoteA4SalesConfirm: 'Send A4 quotation to sales?',
                sendQuoteA4CsConfirm: 'Send A4 quotation to customer service?',
                sendOrderHint: 'An in-progress order will be sent',
                sendQuoteA4BothConfirm: 'Send A4 quotation PDF to sales and customer service?',
                sendQuoteA4PdfHint: 'An A4 PDF will be generated and sent via WhatsApp to sales and customer service',
                sendQuoteA4Done: 'A4 quotation PDF sent. Ref:',
                sendQuoteA4RenderFail: 'Could not prepare A4 document — try again.',
                sendQuoteA4PdfFail: 'Could not create PDF — check connection and try again.',
                sendQuoteA4Preparing: 'Preparing A4 PDF…',
                quotePdfLinkLabel: 'A4 quotation PDF:',
                cartRequestQuoteSend: 'Send A4 quote PDF to sales & customer service',
                cartPreviewQuoteA4: 'Preview A4 before sending',
                quoteSendPdfBoth: 'Send A4 PDF to sales & customer service',
                quoteSendOptionalOne: 'Or choose one department:',
                sendQuoteA4ImageHint: 'With A4 document image (same as on-screen preview)',
                quoteImageLinkLabel: 'A4 quotation image:',
                quoteImageSentHint: 'Document image attached/downloaded — add it in WhatsApp if it did not appear automatically.',
                salesInboxAdminStats: 'Admin today:',
                salesInboxAdminIssued: 'issued',
                salesInboxAdminFinalized: 'finalized',
                salesInboxQuoteDoc: 'View A4 document',
                sendQuoteDoneSales: 'Saved and sent to sales. Ref:',
                sendQuoteDoneCs: 'Saved and sent to customer service. Ref:',
                sendQuoteA4Sent: 'A4 format',
                sendOrderSent: 'Order in progress',
                cartSendOptionalLabel: 'Send A4 quotation PDF — choose department',
                cartSendSalesBtn: 'PDF — Sales',
                cartSendCsBtn: 'PDF — Customer service',
                cartSendSalesTitle: 'Send order to sales',
                cartSendCsTitle: 'Send order to customer service',
                quoteSendOptionalLabel: 'Send A4 quote — optional',
                quoteSendSalesTitle: 'Send A4 to sales',
                quoteSendCsTitle: 'Send A4 to customer service',
                cartOrderPreviewTitle: 'Purchase order — in progress',
                cartRequestQuoteA4: 'Request A4 quote',
                sendQuoteNamePrompt: 'Company / customer name (optional):',
                sendQuotePhonePrompt: 'Contact phone:',
                sendQuoteNotePrompt: 'Notes for sales:',
                sendQuoteDone: 'Request saved. Ref:',
                sendQuoteOpenWa: 'Open sales WhatsApp?',
                sendQuoteWaHint: 'Tap Send in WhatsApp to complete the request.',
                sendQuoteCloudOk: 'Saved — visible under Sales → Quote requests + Analytics.',
                sendQuoteWaIntro: 'Nebras price quote request',
                cartSendSales: 'Sales',
                fabSendSales: 'Send to sales',
                fabSendCs: 'Send to customer service',
                salesInboxTitle: 'Incoming quote requests (from cart)',
                salesInboxHint: 'Customer quote submissions from the storefront appear here.',
                salesInboxEmpty: 'No quote requests yet.',
                salesInboxLines: 'items',
                salesInboxReviewed: 'Reviewed',
                salesInboxClosed: 'Close',
                salesInboxDetails: 'Details',
                overlayDocument: 'Document',
                overlayOpenModule: 'Open module / continue',
                dashboardLegalTitle: 'Official Nebras data (internal + public)',
                dashNavErp: 'ERP',
                dashNavPlatform: 'Platform',
                dashNavOps: 'Operations',
                dashNavContent: 'Content',
                dashNavSettings: 'Settings',
                settingsSuperAdminOnly: 'Full system settings are Super Admin only.',
                complaintNamePh: 'Customer name',
                complaintPhonePh: 'Phone',
                complaintBranchPh: 'Branch',
                complaintDescPh: 'Complaint details',
                complaintNumberPh: 'Complaint number',
                complaintSubmit: 'Submit complaint',
                complaintCheck: 'Check status',
                complaintCancel: 'Close',
                complaintFillRequired: 'Please enter name, phone and details.',
                complaintSubmitted: 'Complaint registered. Number: ',
                complaintRouted: 'Routed to: ',
                occasionSiteWideLabel: 'Full-site celebration styling (public + dashboard)',
                shopChooseVariant: 'Choose variant',
                shopQty: 'Quantity',
                shopAddCart: 'Add to cart',
                shopClose: 'Close',
                platformModuleLocked: 'This module is locked for your role or not active yet.',
                aboutCardHint: 'Tap for details & certificates',
                aboutGalleryTitle: 'Certificates & documents:',
                scmTabAbout: 'About & Vision',
                scmAboutHint: 'Full text, certificates and images — shown when visitors open About or Vision.',
                scmVisitorHint: 'Each icon: card background, internal gallery album, and PDF. Choose gallery-only or gallery + store. Upload via Pick image / Add album image.',
                scmShowroomHint: 'Nebras showroom — two sections under Showroom: Products and Projects. Upload images and link a product id (e.g. prod-aluminum) to show Add to cart under the image.',
                lightboxImageAlt: 'Image',
                lightboxCloseAria: 'Close',
                lightboxPrevAria: 'Previous image',
                lightboxNextAria: 'Next image'
            },
            zh: {
                dir: 'ltr',
                lang: 'zh',
                nav: {
                    home: '<i class="fas fa-home"></i> 首页',
                    store: '<i class="fas fa-store"></i> 商店',
                    showroom: '<i class="fas fa-images"></i> 展厅',
                    platform: '<i class="fas fa-globe"></i> 平台',
                    adminVisitor: '<i class="fas fa-user-shield"></i> 管理',
                    adminStaff: '<i class="fas fa-user-shield"></i> 控制台',
                    about: '<i class="fas fa-info-circle"></i> 关于我们',
                    branches: '<i class="fas fa-map-marker-alt"></i> 分支',
                    sales: '<i class="fas fa-phone-alt"></i> 销售',
                    customer: '<i class="fas fa-headset"></i> 客服'
                },
                heroTitle: '<i class="fas fa-star"></i> Nebras 塑料工厂公司',
                heroText: '我们来自沙特王国，为您提供符合沙特标准的全球塑料解决方案。',
                aboutTitle1: '关于我们',
                aboutText1: 'Nebras 塑料工厂公司提供一体化工业和承包解决方案，透明、高品质，旨在为每位客户和访客打造顺畅体验。',
                aboutTitle2: '我们的愿景',
                aboutText2: '我们致力于扩大工业影响力，提供专业数字体验，并以质量与合作贯穿沙特及更广泛的市场。',
                serviceTitle1: '制造服务',
                serviceText1: '制造高品质塑料产品，遵循最高安全和可持续标准。',
                serviceTitle2: '技术支持',
                serviceText2: '全面支持团队快速跟进订单并解决问题，为客户和项目提供专业技术支持。',
                serviceTitle3: '质量管理',
                serviceText3: '对每个产品和生产阶段进行精确质量控制，确保最终产品满足市场需求。',
                sectionTitle: 'Nebras 平台 — 全球架构',
                sectionSubtitle: '公众店面 + 内部指挥中心 — 管理端全权控制，无需改代码。',
                quickServicesTitle: 'Nebras 数字门户',
                quickServicesSubtitle: '电商 · 产品展厅 · 工厂平台 — 进入完整内部页面。',
                gatewayLaneStore: '电商商店',
                gatewayLaneStoreHint: 'WPC 与铝材 — 规格、购物车、报价',
                gatewayLaneShowroom: 'Nebras 展厅',
                gatewayLaneShowroomHint: '产品 · 项目 · 证书',
                showroomHubTitle: 'Nebras 展厅',
                showroomHubIntro: '两大版块：产品与已交付项目。',
                showroomProductsEmpty: '请在内容管理 → 展厅 中添加产品图片。',
                showroomProjectsEmpty: '请在内容管理 → 展厅 中添加项目图片。',
                gatewayLanePlatform: '工厂平台',
                gatewayLanePlatformHint: '沙特分支、银行账户与服务',
                trustStripAria: 'Nebras 工厂优势',
                trustItem1Title: '沙特工厂',
                trustItem1Sub: '卡西姆工业品质',
                trustItem2Title: '保障与信任',
                trustItem2Sub: '认证 WPC 产品',
                trustItem3Title: '正式报价',
                trustItem3Sub: 'A4 发票 + 增值税',
                trustItem4Title: '定制您的门',
                trustItem4Sub: '交互式 3D 工作室',
                gatewayExploreStore: '浏览完整商店',
                gatewayDoorDesigner: '设计您的门',
                mobBarStore: '商店',
                mobBarCart: '购物车',
                mobBarQuote: '报价',
                storefrontProductsTitle: 'Nebras 电商',
                storefrontProductsSubtitle: '浏览产品 — 每项打开完整内部商店页。',
                visitorQuickWpcRaw: 'WPC 毛坯门',
                visitorQuickWpcReady: 'WPC 成品门',
                visitorQuickAluminum: '铝制品',
                visitorQuickOtherProducts: '其他产品',
                visitorQuickComplaints: '投诉查询',
                visitorQuickCatalogProducts: '产品目录',
                visitorQuickCertifications: 'Nebras 认证证书',
                workspaceBackHome: '返回首页',
                workspacePillarPlatform: '平台',
                workspacePillarShowroom: '展厅',
                workspacePillarStore: '商店',
                workspaceQuoteBtn: '申请报价',
                workspaceBranchesIntro: '沙特分支 — 选择分支联系销售。',
                workspaceStoreIntro: 'Nebras 商店 — 选择产品查看图库、价格并报价。',
                workspacePlatformIntro: '工厂信息、分支与银行账户。',
                workspacePlatformHub: 'Nebras 平台',
                workspaceOpenStore: '打开商店',
                workspaceBrowseProducts: '浏览产品',
                workspaceMapHint: '选择分支查看联系方式',
                workspaceMapDialHint: '精确地图位置请联系销售或使用首页智能转接。',
                branchesEmptyPublic: '即将推出 — Nebras 工厂沙特分支。',
                workspaceSectionMissing: '内容更新中。',
                workspaceProductMissing: '产品暂不可用。',
                workspaceDefaultTitle: 'Nebras',
                workspaceDefaultIntro: '请从首页门户选择版块。',
                dashZoneCommand: '内容与治理指挥',
                dashZoneOperations: 'ERP 与运营分析',
                partnersPublicTitle: '合作伙伴',
                partnersPublicSubtitle: 'Nebras 工厂在沙特的成功伙伴',
                dashboardPartnersTitle: '合作伙伴',
                dashboardHubIntroTitle: '控制中心 — Nebras',
                dashboardHubIntroText: '选择磁贴进入平台模块。合作伙伴在网站与后台同步展示。',
                certsOverlayTitle: 'Nebras 认证',
                certsOverlayIntro: '工厂证书与认证 — 图片与 PDF 及说明。',
                pageTitle: 'Nebras 数字平台 — Nebras 塑料工厂',
                pageDescription: 'Nebras 塑料工厂 — 产品展厅、报价、沙特分支与管控后台。',
                introEyebrow: '沙特阿拉伯王国',
                introBrandName: 'Nebras 塑料工厂公司',
                introTagline: '高端 WPC 门 — 品质与优雅的集成方案',
                introSkip: '进入平台',
                introWelcomeTap: '点击任意处播放欢迎语音',
                heroEyebrow: 'Nebras 塑料工厂',
                heroHeadline: '高端 WPC 门',
                heroTaglineShort: '品质与优雅 — 从卡西姆到全沙特',
                heroExploreBtn: '探索产品 ←',
                heroQuoteBtn: '申请报价',
                heroStatWarrantyVal: '10',
                heroStatWarranty: '年质保',
                heroStatInstallVal: '+100万',
                heroStatInstall: '安装',
                heroStatYearsVal: '5',
                heroStatYears: '年经验',
                doorDesignerHardwareLabel: '把手与五金',
                doorDesignerReset: '重置',
                doorDesignerCanvasHint: '逼真 WPC 门扇模型 — 每项选择替换上一项。重置回到起点。',
                doorDesignerStudioTitle: '设计您的门',
                doorDesignerAdvancedLabel: '更多选项（门型、尺寸、五金…）',
                adminLoginTitle: '管理登录',
                adminLoginUserPh: '用户名',
                adminLoginPassPh: '密码',
                adminLoginBtn: '登录',
                adminLoginCancel: '取消',
                adminLoginEmpty: '请输入用户名和密码。',
                adminLoginOk: '登录成功。',
                adminLoginFail: '凭据无效，请重试。',
                adminAccountSecurity: '账户安全',
                adminRoleTemplate: '用户：{user} — 角色：{role}',
                dashNavPartners: '合作伙伴',
                dashNavOps: '运营',
                dashNavModules: '模块',
                dashboardPartnersHint: '在内容管理 → 合作伙伴 中添加 Logo。',
                scmTabProducts: '产品',
                scmTabVisitor: '访客图标',
                scmTabDashboard: '管理面板',
                scmTabSections: '附加版块',
                scmTabPartners: '合作伙伴',
                scmTabCertifications: '认证证书',
                menuToggleAria: '菜单',
                cartFabAria: '购物车',
                topCartAria: '购物车',
                langToggleAria: '选择语言',
                workspaceCartTitle: '购物车',
                accountSecurityTitle: '账户安全',
                accountSecurityChange: '用旧密码更改凭据',
                accountSecurityRecover: '通过邮箱恢复/更改',
                accountSecurityClose: '关闭',
                iconOverlayClose: '关闭',
                companySocialSubtitle: '关注 Nebras 塑料工厂官方渠道。',
                visitorQuickDoorDesigner: '用 Nebras 设计您的门',
                doorDesignerHeroSub: 'WPC 设计工作室 — 逼真实时预览',
                doorDesignerIntro: '选择门型（封边平板·U槽·推拉）、型号、外饰平/弧、顶部包覆及卷材色 — 实时预览。',
                doorDesignerPresetsLabel: '快捷预设',
                doorDesignerMechanismLabel: '开启方式',
                doorDesignerLeafLabel: '扇数',
                doorDesignerSurfaceLabel: '门面',
                doorDesignerGlassLayoutLabel: '玻璃布局',
                doorDesignerTypeLabel: '门型',
                doorDesignerSubModelLabel: '型号',
                doorDesignerModelLabel: '型号',
                doorDesignerStyleLabel: '款式',
                doorDesignerShapeLabel: '外饰',
                doorDesignerFrameLabel: '框与套线',
                doorDesignerDecorLabel: '顶部包覆',
                doorDesignerGlassLabel: '玻璃样式',
                doorDesignerSizeLabel: '尺寸',
                doorDesignerOpeningLabel: '开启方向',
                doorDesignerLockLabel: '锁具',
                doorDesignerRollLabel: '卷材颜色',
                doorDesignerLeafSizeLabel: '门扇尺寸',
                doorDesignerRollTag: '卷材',
                doorDesignerColorLabel: 'نبراس卷材色',
                doorDesignerColorDesc: '20 种卷材 — 色块在上，代码与名称在下（例 N-2 黄金柚木）',
                doorDesignerCatalogHint: 'N-1 至 N-21（无 N-12）',
                doorDesignerQuoteBtn: '申请此设计报价',
                doorDesignerDisabled: '设计器暂不可用。',
                doorDesignerPendingData: '门设计器数据已删除。请发送新数据以重新构建。',
                doorDesignerDataOnlyHint: '数据录入阶段 — 收到门型图片后将启用视觉预览。',
                doorDesigner3dHint: '拖动旋转 360° — 滚轮缩放',
                doorDesigner3dAria: 'WPC 门三维预览',
                doorDesignerCanvasHint: '每项选择会更新结构与材质 — 颜色来自 20 种卷材',
                partnersSuccessSubtitle: '成功合作伙伴',
                lightboxOpenHint: '点击放大',
                certsEmptyHintAdmin: '在内容管理 → 认证 中添加证书。',
                certsEmptyHintPublic: '即将推出 — Nebras 工厂认证。',
                occasionFallbackTitle: 'Nebras 活动',
                occasionOverlayHint: '点击查看产品与优惠。',
                visitorQuickBranches: 'Nebras 分支机构',
                visitorQuickColorRolls: 'Nebras 卷材色卡目录',
                visitorQuickBankAccounts: 'Nebras 塑料工厂公司银行账户',
                visitorJumpBankAccounts: '打开银行账户',
                visitorTitle: '公众店面',
                visitorText: '访客层：产品展厅、专属购物车、报价、分支与联系 — 无管理权限。',
                adminTitle: '指挥中心',
                adminText: '内部治理：角色、内容、庆典、分支、投诉与销售 — 统一管控与自动化。',
                pvcTitle: '<i class="fas fa-door-open"></i> WPC 毛坯门（车间）',
                pvcText: '供车间加工的 WPC 毛坯门。',
                wpcTitle: '<i class="fas fa-door-open"></i> WPC 成品门',
                wpcText: '即装型 WPC 门，适用于住宅与工程项目。',
                aluminumTitle: '<i class="fas fa-cog"></i> 铝制品',
                aluminumText: '耐用铝制产品和智能设计，适合建筑和装饰项目。',
                adminComplaintsTitle: '<i class="fas fa-user-shield"></i> 投诉与权限管理',
                adminComplaintsText: '受保护的部分，用于管理投诉和编辑网站权限和部分。',
                customerComplaintsTitle: '<i class="fas fa-search"></i> 投诉查询',
                customerComplaintsText: '输入投诉编号检查投诉状态。',
                complaintInquiryTitle: '投诉查询',
                complaintInquiryText: '输入投诉编号了解当前状态。',
                complaintNumberLabel: '投诉编号：',
                complaintStatusLabel: '投诉状态：',
                complaintStatusPending: '审核中',
                complaintStatusInProgress: '处理中',
                complaintStatusResolved: '已解决',
                complaintNotFound: '未找到此编号的投诉。',
                otherProductsTitle: '<i class="fas fa-boxes"></i> 其他产品',
                otherProductsText: '各种附加产品和创新解决方案的多样化范围。',
                adminAccessMessage: '您必须以管理员身份登录才能访问此部分。',
                adminComplaintsAlert: '投诉与权限管理部分已打开。在这里，您可以编辑网站和部分。',
                otherProductsAlert: '其他产品部分已打开。在这里，您可以显示附加产品。',
                quickOtherTitle: '其他 Nebras 产品',
                quickOtherText: '快速访问多个 Nebras 产品并管理新增生产线。',
                quickAluminumTitle: '铝制品部分',
                quickAluminumText: '即时管理新的铝制品部分，轻松添加产品。',
                quickComplaintsTitle: '投诉部分',
                quickComplaintsText: '快速监控投诉并高效处理客户请求。',
                colorCatalogTitle: 'Nebras 卷材色卡目录',
                colorCatalogSubtitle: 'Nebras 塑料产线可选的颜色与饰面。',
                colorCatalogBody: '本版块介绍可订购的卷材颜色与饰面。如需样品或色号，请联系销售或就近分支机构。',
                branchesTitle: 'Nebras 在沙特的分支',
                branchesSubtitle: '沙特各分支均提供独立销售电话。',
                branchCardSalesLabel: '分部销售：',
                branchCallDirect: '直拨',
                branchSmartRoute: '智能转接',
                topSalesLabel: '<i class="fas fa-phone-alt"></i> 销售:',
                topCustomerLabel: '<i class="fas fa-headset"></i> 客服与投诉:',
                topSalesButton: '联系销售',
                topCustomerButton: '联系客服',
                topSmartButton: '最近销售代表',
                adminDashboardTitle: 'Nebras 平台指挥中心',
                platformHubTitle: 'Nebras 平台 — 内外部统一管控',
                platformHubSubtitle: '全球平台模式：公众店面 + 权限化内部指挥中心。选择模块即可操作。',
                platformStatusLive: '已上线',
                platformStatusBeta: '测试',
                platformStatusPlanned: '规划中',
                platformModuleLocked: '您无权限或该模块尚未启用。',
                erpHubTitle: 'Nebras ERP — 企业资源规划',
                erpHubSubtitle: '对标全球平台：库存、销售、订单、采购、CRM — 内置于平台。',
                erpBenchmarkSummary: '与全球平台对比（亚马逊 · 阿里 · Jarir …）',
                erpBenchColArea: '领域',
                erpBenchColGlobal: '全球标杆',
                erpBenchColNebras: 'Nebras 现状',
                erpKpiSku: 'SKU 品种',
                erpKpiLow: '库存预警',
                erpKpiSales: '销售笔数',
                erpKpiOrders: 'ERP 订单',
                erpKpiComplaints: '投诉',
                erpKpiBranches: '分支',
                logoutText: '<i class="fas fa-sign-out-alt"></i> 登出',
                currentLangLabel: '中文',
                footerDesignerIntro: '网站设计与开发：Abdelrahman Omran Tarash 工程师',
                footerContactLabel: '联系方式',
                footerDesignerWhatsAppAria: '通过 WhatsApp 联系工程师',
                footerDesignerCallAria: '致电工程师',
                companySocialTitle: '社交平台 — Nebras 塑料工厂',
                companySocialSubtitlePublic: '关注 Nebras 塑料工厂的官方渠道与动态。',
                dashboardChannelsTitle: '社交渠道状态（管理端提示）',
                dashboardChannelsHint: '数据来自「系统设置」。留空链接则公开页不显示对应图标。平台变更后请及时核对。',
                dashboardChannelsEditBtn: '打开社交链接设置',
                channelLinktree: 'Linktree',
                dashboardOfficialTitle: '官方链接与网站二维码',
                dashboardOfficialHint: '官方 Linktree · 网站二维码 · 版权信息。',
                dashboardCopyright: '版权所有 — 尼布拉斯塑料工厂 2026',
                siteFooterCopyright: '版权所有 — 尼布拉斯塑料工厂 2026',
                dashboardLinktreeTitle: 'Nebras.Factory — 官方 Linktree',
                dashboardQrCaption: '扫描访问尼布拉斯网站',
                dashboardQrDownload: '下载二维码',
                dashboardQrAlt: '尼布拉斯工厂网站二维码',
                channelsSettingsSuperAdminOnly: '仅超级管理员（Super Admin）可修改社交链接。',
                dashboardOccasionTitle: '庆典模式 — 管理面板节日外观',
                dashboardOccasionEditBtn: '配置庆典外观',
                settingOccasionSectionTitle: '庆典模式（内部系统）',
                settingOccasionHint: '正式节日或自定义展示会将控制台和网站切换为完整庆典视觉。可选起止日期。',
                settingOccasionEnabledLabel: '启用庆典模式（网站 + 控制台）',
                occasionSettingsSuperAdminOnly: '仅超级管理员可配置庆典。',
                celebrationBadgeDefault: '庆典',
                celebrationActiveNow: ' — 庆典模式已在控制台和网站生效。',
                occasionActiveNow: ' — 当前已对访客和管理员生效。',
                occasionScheduledOff: '已配置主题，但不在设定的日期范围内（当前为默认外观）。',
                occasionDisabledOff: '已选择主题，但未在设置中启用。',
                scmMainTitle: '网站内容管理 — 无需改代码',
                scmMainHint: '可添加产品、访客图标、新板块及管理面板背景，变更即时生效。',
                scmProductsHint: '每个产品：用「产品规格」管理形状/类型、尺寸、颜色、价格、图片。有规格则开放购物车与报价。',
                channelWhatsApp: 'WhatsApp',
                channelFacebook: 'Facebook',
                channelInstagram: 'Instagram',
                channelTikTok: 'TikTok',
                channelSnapchat: 'Snapchat',
                channelDetailExplicitWa: '已在设置中保存 WhatsApp 链接',
                channelDetailWaFallback: '未填专属链接；公开页使用配置的联系电话生成入口',
                channelDetailMissing: '未配置 — 访客不可见',
                channelDetailOn: '链接已启用',
                overlayGoSection: '前往板块',
                overlayOpenLink: '打开链接',
                overlayDialSales: '拨打销售热线',
                overlayDialCustomer: '拨打客服热线',
                salesHotlineLabel: '销售热线:',
                customerHotlineLabel: '客服热线:',
                adminPreviewHint: '\n\n访客提示：此处库存与分析仅供展示；完整操作需在管理后台进行。',
                visitorOverlayIntro: '相册预览 — 然后前往页面板块或打开外部链接。',
                overlayBrowseIntro: '浏览模式 — 查看图片与文档。仅通过「购买」或卡片购物车图标下单。',
                overlayBrowseHint: '浏览模式 — 自由浏览，购买请点「购买」。',
                overlayShopBtn: '购买 — 选择规格与价格',
                badgeBrowseShort: '浏览',
                badgeShopShort: '购买',
                badgeLinkShort: '跳转',
                visitorJumpProducts: '前往产品与工厂相关板块',
                visitorJumpBranches: '前往沙特分支机构指南',
                visitorJumpServices: '前往企业服务介绍',
                visitorJumpAbout: '前往公司简介',
                visitorJumpDoors: '前往 WPC 门类产品板块',
                visitorJumpAluminum: '前往铝制品板块',
                visitorJumpColorCatalog: '前往 Nebras 卷材色卡版块',
                visitorJumpPartners: '前往合作伙伴版块',
                visitorJumpInside: '站内跳转',
                visitorJumpExternal: '外部链接（新窗口）',
                cartTitle: '购物车',
                cartCommerceHint: '将可订购产品（购物车 + 图标）加入您的专属购物车，然后向 Nebras 申请正式报价。',
                cartSessionHint: '购物车与信息仅属于当前会话。编号：',
                cartCheckoutTitle: '客户信息',
                cartCheckoutSub: '填写联系信息以生成正式报价 — 购物车仅绑定当前会话。',
                cartAddedOk: '已加入您的购物车',
                pricesExVatNotice: '所有价格为不含税价 — 加入购物车与报价单时自动计算增值税。',
                priceExVatShort: '不含税',
                priceIncVatShort: '含税 {pct}%',
                cartSubtotalEx: '不含税合计：',
                cartProductsSubtotalEx: '产品不含税合计：',
                cartVatRow: '产品增值税 ({pct}%)：',
                cartTotalInc: '含税总计：',
                cartProductsTotalInc: '产品含税总计：',
                cartUnitEx: '单价(不含税)',
                cartUnitInc: '单价(含税)',
                cartLineEx: '行 ×{qty} 不含税',
                cartLineInc: '行含税合计',
                checkoutStepCart: '查看购物车',
                checkoutStepProfile: '客户信息',
                checkoutStepQuote: '报价单',
                checkoutStepPay: '转账并发送销售',
                cartProductNotShop: '此产品仅供浏览 — 请选择带购物车 (+) 图标的产品下单。',
                siteClockLabel: '沙特阿拉伯时间：',
                checkoutNameLabel: '姓名 / 公司',
                checkoutPhoneLabel: '手机',
                checkoutEmailLabel: '邮箱',
                checkoutCityLabel: '城市 / 分支',
                checkoutAddressLabel: '配送地址',
                checkoutAddressRequired: '请填写配送地址以生成报价。',
                catalogHubTitle: 'Nebras 产品目录',
                catalogHubPick: '选择产品 — 图片 · 说明 · 价格',
                iconInnerOpenProduct: '查看详情与规格',
                iconInnerProductIntro: '产品图片与说明 — 下方为类型、尺寸、颜色与价格。',
                iconInnerSectionIntro: '浏览本板块图库 — 内容由管理后台维护。',
                catalogHubIntro: '进入 Nebras 世界 — 选择产品查看类型、尺寸、颜色与价格。',
                catalogHubEmpty: '暂无产品 — 请从内容管理添加。',
                catalogHubBrowse: '浏览',
                catalogHubPriceOnRequest: '询价',
                catalogHubCount: '产品',
                occasionPromoTitle: '特别优惠',
                occasionPromoCta: '查看优惠',
                checkoutNoteLabel: '给销售的备注',
                checkoutNameRequired: '请填写姓名或公司。',
                checkoutPhoneRequired: '请填写有效手机号。',
                checkoutSummaryLabel: '客户：',
                quoteCustomerTitle: '客户信息',
                sendQuoteCloudWarn: '（已本地保存 — 请检查 Supabase 以便管理端查看。）',
                salesInboxLoading: '正在从云端加载…',
                salesInboxReceipt: '查看转账凭证',
                salesInboxDoorDesign: '查看门设计',
                cartEmpty: '购物车为空。请添加可购买产品（卡片上的购物车图标）。',
                quoteFinalizedOk: '报价已登记为已执行',
                quoteMarkFinalizedBtn: '登记为已执行',
                cartClose: '关闭',
                cartRequestQuote: '申请报价',
                cartTotal: '合计：',
                cartRemove: '删除',
                cartQty: '数量：',
                quoteConfirmTitle: '确认报价申请：',
                quoteConfirmProceed: '继续生成 A4 正式报价单？',
                quotePrint: '打印 / PDF',
                quoteClose: '关闭',
                quoteLogoAlt: 'Nebras 标志',
                bankAccountsTitle: 'Nebras 塑料工厂公司银行账户',
                bankAccountsSubtitle: '工厂官方银行账户（转账）',
                bankAccountsSubtitleAdmin: '转账用 — 由内部管理维护',
                bankIbanCopyBtn: '复制 IBAN',
                bankIbanCopied: '已复制 IBAN',
                bankIbanCopyPrompt: '复制 IBAN：',
                scmDashboardHint: '每个图标：内部内容（文字、图片、文档）+ 操作，无需改代码。',
                sendQuoteConfirm: '发送此请求？',
                sendQuoteConfirmChannels: '选择销售或客服',
                sendOrderSalesConfirm: '将购物车订单（处理中）发送给销售？',
                sendOrderCsConfirm: '将购物车订单（处理中）发送给客服？',
                sendQuoteA4SalesConfirm: '将 A4 报价单发送给销售？',
                sendQuoteA4CsConfirm: '将 A4 报价单发送给客服？',
                sendOrderHint: '将发送处理中订单',
                sendQuoteA4BothConfirm: '将 A4 报价 PDF 发送给销售和客服？',
                sendQuoteA4PdfHint: '将生成 A4 PDF 并通过 WhatsApp 发送给销售与客服',
                sendQuoteA4Done: 'A4 报价 PDF 已发送。编号：',
                sendQuoteA4RenderFail: '无法准备 A4 文档 — 请重试。',
                sendQuoteA4PdfFail: '无法创建 PDF — 请检查网络后重试。',
                sendQuoteA4Preparing: '正在准备 A4 PDF…',
                quotePdfLinkLabel: 'A4 报价 PDF：',
                cartRequestQuoteSend: '发送 A4 报价 PDF 至销售与客服',
                cartPreviewQuoteA4: '发送前预览 A4',
                quoteSendPdfBoth: '发送 A4 PDF 至销售与客服',
                quoteSendOptionalOne: '或选择一个部门：',
                sendQuoteA4ImageHint: '附带 A4 文档图片（与屏幕预览相同）',
                quoteImageLinkLabel: 'A4 报价图片：',
                quoteImageSentHint: '文档图片已附加/下载 — 若未自动显示请在 WhatsApp 中手动添加。',
                salesInboxAdminStats: '管理统计（今日）：',
                salesInboxAdminIssued: '已出具',
                salesInboxAdminFinalized: '已执行',
                salesInboxQuoteDoc: '查看 A4 文档',
                sendQuoteDoneSales: '已保存并发送至销售。编号：',
                sendQuoteDoneCs: '已保存并发送至客服。编号：',
                sendQuoteA4Sent: 'A4 格式',
                sendOrderSent: '处理中订单',
                cartSendOptionalLabel: '发送 A4 报价 PDF — 选择部门',
                cartSendSalesBtn: 'PDF — 销售',
                cartSendCsBtn: 'PDF — 客服',
                cartSendSalesTitle: '发送订单给销售',
                cartSendCsTitle: '发送订单给客服',
                quoteSendOptionalLabel: '发送 A4 报价 — 可选',
                quoteSendSalesTitle: '发送 A4 给销售',
                quoteSendCsTitle: '发送 A4 给客服',
                cartOrderPreviewTitle: '采购订单 — 处理中',
                cartRequestQuoteA4: '申请 A4 报价',
                sendQuoteNamePrompt: '公司/客户名称（可选）：',
                sendQuotePhonePrompt: '联系电话：',
                sendQuoteNotePrompt: '给销售的备注：',
                sendQuoteDone: '已保存。编号：',
                sendQuoteOpenWa: '打开销售 WhatsApp？',
                sendQuoteWaHint: '请在 WhatsApp 中点击「发送」以完成请求。',
                sendQuoteCloudOk: '已保存 — 可在销售 → 报价请求 + 分析中查看。',
                sendQuoteWaIntro: 'Nebras 报价请求',
                cartSendSales: '销售',
                fabSendSales: '发送至销售',
                fabSendCs: '发送至客服',
                salesInboxTitle: '收到的报价请求（来自购物车）',
                salesInboxHint: '客户从网站提交的报价会显示在这里。',
                salesInboxEmpty: '暂无报价请求。',
                salesInboxLines: '项',
                salesInboxReviewed: '已审核',
                salesInboxClosed: '关闭',
                salesInboxDetails: '详情',
                overlayDocument: '文档',
                overlayOpenModule: '打开模块 / 继续',
                dashboardLegalTitle: 'Nebras 官方信息（内外）',
                dashNavErp: 'ERP',
                dashNavPlatform: '平台',
                dashNavOps: '运营',
                dashNavContent: '内容',
                dashNavSettings: '设置',
                settingsSuperAdminOnly: '完整系统设置仅限 Super Admin。',
                complaintNamePh: '客户姓名',
                complaintPhonePh: '电话',
                complaintBranchPh: '分支',
                complaintDescPh: '投诉详情',
                complaintNumberPh: '投诉编号',
                complaintSubmit: '提交投诉',
                complaintCheck: '查询状态',
                complaintCancel: '关闭',
                complaintFillRequired: '请填写姓名、电话和详情。',
                complaintSubmitted: '投诉已登记。编号：',
                complaintRouted: '转接：',
                occasionSiteWideLabel: '全站庆典样式（公众端 + 后台）',
                shopChooseVariant: '选择规格',
                shopQty: '数量',
                shopAddCart: '加入购物车',
                shopClose: '关闭',
                platformModuleLocked: '您无权使用此模块或尚未启用。',
                aboutCardHint: '点击查看详情与证书',
                aboutGalleryTitle: '认证与文件：',
                scmTabAbout: '关于我们与愿景',
                scmAboutHint: '详细文字、证书与图片 — 访客点击图标时显示。',
                scmVisitorHint: '每个图标：卡片背景、内部相册与 PDF。可选仅展厅或展厅+商店。通过上传/选择图片与添加相册图片管理。',
                scmShowroomHint: '展厅 — 导航「展厅」下两个板块：产品与项目。上传图片并关联产品 ID（如 prod-aluminum）可在图下显示加入购物车。',
                lightboxImageAlt: '图片',
                lightboxCloseAria: '关闭',
                lightboxPrevAria: '上一张',
                lightboxNextAria: '下一张'
            }
        };

        function applyStaticUiTranslations(text) {
            if (!text) return;
            function setTxt(id, val, html) {
                const el = document.getElementById(id);
                if (!el || val == null) return;
                if (html) el.innerHTML = val; else el.textContent = val;
            }
            setTxt('cart-drawer-title', text.cartTitle);
            setTxt('cart-commerce-hint', text.cartCommerceHint);
            setTxt('cart-checkout-title', text.cartCheckoutTitle);
            setTxt('cart-checkout-sub', text.cartCheckoutSub);
            setTxt('lbl-checkout-name', text.checkoutNameLabel + ' *');
            setTxt('lbl-checkout-phone', text.checkoutPhoneLabel + ' *');
            setTxt('lbl-checkout-email', text.checkoutEmailLabel);
            setTxt('lbl-checkout-city', text.checkoutCityLabel);
            setTxt('lbl-checkout-address', (text.checkoutAddressLabel || 'العنوان') + ' *');
            setTxt('lbl-checkout-note', text.checkoutNoteLabel);
            const transferTitle = document.getElementById('cart-transfer-block-title');
            if (transferTitle && text.cartTransferBlockTitle) {
                transferTitle.innerHTML = '<i class="fas fa-building-columns"></i> ' + escapeHtmlAttr(text.cartTransferBlockTitle);
            }
            setTxt('cart-transfer-hint', text.cartTransferHint);
            setTxt('lbl-cart-payment-declared', text.cartPaymentDeclared);
            setTxt('lbl-cart-transfer-receipt', text.cartReceiptLabel);
            const finalizeBtn = document.getElementById('quote-mark-finalized-btn');
            if (finalizeBtn) finalizeBtn.textContent = text.quoteMarkFinalizedBtn || 'تسجيل عرض السعر كمنفّذ';
            setTxt('cart-request-quote-btn', text.cartRequestQuote);
            setTxt('cart-close-btn', text.cartClose);
            setTxt('top-quote-btn', text.cartRequestQuote);
            setTxt('dashboard-legal-title', text.dashboardLegalTitle);
            setTxt('setting-occasion-site-wide-label', text.occasionSiteWideLabel);
            setTxt('complaint-inquiry-title', text.complaintInquiryTitle);
            setTxt('complaint-inquiry-text', text.complaintInquiryText);
            const quotePrintBtn = document.querySelector('.quote-print-actions .primary');
            const quoteCloseBtn = document.querySelector('.quote-print-actions .secondary');
            if (quotePrintBtn) quotePrintBtn.textContent = text.quotePrint;
            if (quoteCloseBtn) quoteCloseBtn.textContent = text.quoteClose;
            const cartCloseBtn = document.getElementById('cart-close-btn');
            if (cartCloseBtn) cartCloseBtn.textContent = text.cartClose;
            const cName = document.getElementById('complaint-customer-name');
            const cPhone = document.getElementById('complaint-customer-phone');
            const cBranch = document.getElementById('complaint-customer-branch');
            const cDesc = document.getElementById('complaint-description');
            const cNum = document.getElementById('complaint-number');
            if (cName) cName.placeholder = text.complaintNamePh;
            if (cPhone) cPhone.placeholder = text.complaintPhonePh;
            if (cBranch) cBranch.placeholder = text.complaintBranchPh;
            if (cDesc) cDesc.placeholder = text.complaintDescPh;
            if (cNum) cNum.placeholder = text.complaintNumberPh;
            const btnSubmit = document.querySelector('#complaint-overlay button.primary[onclick="submitComplaint()"]');
            const btnCheck = document.querySelector('#complaint-overlay button.primary[onclick="checkComplaintStatus()"]');
            const btnCancel = document.querySelector('#complaint-overlay button.secondary[onclick="closeComplaintOverlay()"]');
            if (btnSubmit) btnSubmit.textContent = text.complaintSubmit;
            if (btnCheck) btnCheck.textContent = text.complaintCheck;
            if (btnCancel) btnCancel.textContent = text.complaintCancel;
            applyDashboardNavTranslations(text);
            applyAdminOverlayTranslations(text);
            applyScmTabTranslations(text);
            applyAccessibilityLabels(text);
            setTxt('company-social-title', text.companySocialTitle);
            setTxt('company-social-subtitle', text.companySocialSubtitle || text.companySocialSubtitlePublic);
            setTxt('scm-main-title', text.scmMainTitle);
            setTxt('scm-main-hint', text.scmMainHint);
            setTxt('scm-products-hint', text.scmProductsHint);
            setTxt('scm-dashboard-hint', text.scmDashboardHint);
            setTxt('scm-about-hint', text.scmAboutHint);
            setTxt('scm-showroom-hint', text.scmShowroomHint);
            setTxt('scm-visitor-hint', text.scmVisitorHint);
            setTxt('sales-quotes-inbox-title', text.salesInboxTitle);
            setTxt('sales-quotes-inbox-hint', text.salesInboxHint);
            setTxt('cart-send-channel-label', text.cartSendOptionalLabel);
            setTxt('quote-send-channel-label', text.quoteSendOptionalOne || text.quoteSendOptionalLabel);
            setTxt('cart-send-sales-label', text.cartSendSalesBtn);
            setTxt('cart-send-cs-label', text.cartSendCsBtn);
            setTxt('quote-send-sales-label', text.cartSendSalesBtn);
            setTxt('quote-send-cs-label', text.cartSendCsBtn);
            setTxt('cart-request-quote-btn', text.cartRequestQuoteSend || text.cartRequestQuoteA4);
            setTxt('cart-preview-quote-btn', text.cartPreviewQuoteA4);
            setTxt('quote-send-pdf-both-btn', text.quoteSendPdfBoth);
            const fabSales = document.getElementById('fab-send-sales');
            const fabCs = document.getElementById('fab-send-cs');
            if (fabSales && text.fabSendSales) {
                fabSales.title = text.fabSendSales;
                fabSales.setAttribute('aria-label', text.fabSendSales);
            }
            if (fabCs && text.fabSendCs) {
                fabCs.title = text.fabSendCs;
                fabCs.setAttribute('aria-label', text.fabSendCs);
            }
            const cartSalesBtn = document.getElementById('cart-send-sales-btn');
            const cartCsBtn = document.getElementById('cart-send-cs-btn');
            const quoteSalesBtn = document.getElementById('quote-send-sales-btn');
            const quoteCsBtn = document.getElementById('quote-send-cs-btn');
            if (cartSalesBtn && text.cartSendSalesTitle) cartSalesBtn.title = text.cartSendSalesTitle;
            if (cartCsBtn && text.cartSendCsTitle) cartCsBtn.title = text.cartSendCsTitle;
            if (quoteSalesBtn && text.quoteSendSalesTitle) quoteSalesBtn.title = text.quoteSendSalesTitle;
            if (quoteCsBtn && text.quoteSendCsTitle) quoteCsBtn.title = text.quoteSendCsTitle;
            const scmAboutTab = document.querySelector('.scm-tabs button[data-scm-tab="about"]');
            if (scmAboutTab) scmAboutTab.textContent = text.scmTabAbout;
            renderAboutCards(currentLang || 'ar');
            applyStorefrontPremiumUi(text);
        }

        function setLanguage(lang, opts) {
            opts = opts || {};
            const light = !!opts.light;
            const skipCatalog = !!opts.skipCatalog;
            currentLang = lang;
            try { localStorage.setItem('nebrasLang', lang); } catch (e) { /* ignore */ }
            const text = siteText[lang] || siteText.ar;
            document.documentElement.lang = text.lang;
            document.documentElement.dir = text.dir;

            function setElementText(id, value, useHtml = false) {
                const element = document.getElementById(id);
                if (!element) return;
                if (useHtml) {
                    element.innerHTML = value;
                } else {
                    element.textContent = value;
                }
            }

            function setNav(id, html) {
                const el = document.getElementById(id);
                if (el) el.innerHTML = html;
            }
            setNav('nav-home', text.nav.home);
            setNav('nav-store', text.nav.store);
            setNav('nav-showroom', text.nav.showroom);
            setNav('nav-platform', text.nav.platform);
            setNav('nav-admin', currentAdmin ? text.nav.adminStaff : text.nav.adminVisitor);
            setNav('nav-about', text.nav.about);
            setNav('nav-branches', text.nav.branches);
            setNav('nav-sales', text.nav.sales);
            setNav('nav-customer', text.nav.customer);
            applyStaticUiTranslations(text);
            applyDocumentMeta(text);
            applyHeroMarketingCopy(text);
            applyWorkspaceTranslations();
            refreshClickableMediaSite(document);
            if (document.getElementById('nebras-brand-intro') && !document.getElementById('nebras-brand-intro').hidden) {
                applyBrandIntroContent(text);
            }

            const heroTitle = document.getElementById('hero-title');
            if (heroTitle) heroTitle.innerHTML = text.heroTitle;
            const dashKicker = document.getElementById('dashboard-identity-kicker');
            if (dashKicker) dashKicker.innerHTML = text.heroTitle;
            applyHeroBanner();
            if (currentAdmin) updateAdminRoleLabel(currentAdmin);
            setElementText('admin-dashboard-title', text.adminDashboardTitle);
            setElementText('admin-logout-label', text.logoutText, true);
            setElementText('complaint-inquiry-title', text.complaintInquiryTitle);
            setElementText('complaint-inquiry-text', text.complaintInquiryText);

            renderAboutCards(lang);

            setElementText('service-title-1', text.serviceTitle1);
            setElementText('service-text-1', text.serviceText1);
            setElementText('service-title-2', text.serviceTitle2);
            setElementText('service-text-2', text.serviceText2);
            setElementText('service-title-3', text.serviceTitle3);
            setElementText('service-text-3', text.serviceText3);

            setElementText('quick-services-title', text.quickServicesTitle);
            setElementText('quick-services-subtitle', text.quickServicesSubtitle);
            setElementText('storefront-products-title', text.storefrontProductsTitle);
            setElementText('storefront-products-subtitle', text.storefrontProductsSubtitle);
            setElementText('dash-zone-command', text.dashZoneCommand || 'قيادة المحتوى والحوكمة');
            setElementText('dash-zone-operations', text.dashZoneOperations || 'ERP والعمليات');
            setElementText('partners-public-title', text.partnersPublicTitle || 'شركاؤنا');
            setElementText('partners-public-subtitle', text.partnersPublicSubtitle || '');
            setElementText('dashboard-partners-title', text.dashboardPartnersTitle || 'شركاؤنا');
            setElementText('dashboard-partners-subtitle', text.partnersSuccessSubtitle || 'شركاؤنا في النجاح');
            setElementText('door-designer-reset-btn', text.doorDesignerReset || 'إعادة الضبط');
            setElementText('dashboard-hub-intro-title', text.dashboardHubIntroTitle || '');
            setElementText('dashboard-hub-intro-text', text.dashboardHubIntroText || '');
            setElementText('structure-title', text.sectionTitle);
            setElementText('structure-subtitle', text.sectionSubtitle);
            setElementText('visitor-role-title', text.visitorTitle);
            setElementText('visitor-role-text', text.visitorText);
            setElementText('admin-role-title', text.adminTitle);
            setElementText('admin-role-text', text.adminText);

            setElementText('quick-other-title', text.quickOtherTitle);
            setElementText('quick-other-text', text.quickOtherText);
            setElementText('quick-aluminum-title', text.quickAluminumTitle);
            setElementText('quick-aluminum-text', text.quickAluminumText);
            setElementText('quick-complaints-title', text.quickComplaintsTitle);
            setElementText('quick-complaints-text', text.quickComplaintsText);
            setElementText('branches-title', text.branchesTitle);
            setElementText('branches-subtitle', text.branchesSubtitle);
            if (!light && !skipCatalog) {
                mergeSupabaseIntoSiteCatalog(lang);
                renderAllPublicCatalog();
                applyDynamicSectionContent(lang);
            }
            setElementText('top-sales-number', `${text.topSalesLabel} ${systemSettings.mainSalesPhone}`, true);
            setElementText('top-customer-number', `${text.topCustomerLabel} ${systemSettings.customerServicePhone}`, true);
            setElementText('top-call-sales-btn', text.topSalesButton);
            setElementText('top-call-customer-btn', text.topCustomerButton);
            setElementText('top-smart-routing-btn', text.topSmartButton);

            setElementText('lang-current-label', text.currentLangLabel);
            applyFooterContent(text);
            renderCompanySocialSection(text);
            renderCompanyLegalBars();
            renderBankAccountsPublic();
            updateCartBadge();

            const langMenu = document.getElementById('lang-menu');
            if (langMenu) langMenu.classList.remove('show');
            const langToggleBtn = document.getElementById('lang-toggle-btn');
            if (langToggleBtn) langToggleBtn.setAttribute('aria-expanded', 'false');
            if (!light && !skipCatalog) {
                renderVisitorIcons();
                displayBranches();
                if (nebrasWorkspaceState.active) renderNebrasWorkspace();
                syncAdminSessionClass();
                if (currentAdmin) {
                    renderPlatformHubPanel();
                    renderErpHubPanel();
                    renderDashboardTiles();
                    renderDashboardChannelsStatus();
                    renderDashboardOfficialHub();
                }
                renderDashboardOccasionStatus();
                setElementText('dashboard-occasion-title', text.dashboardOccasionTitle);
                setElementText('dashboard-occasion-edit-btn', text.dashboardOccasionEditBtn);
                setElementText('setting-occasion-section-title', text.settingOccasionSectionTitle);
                setElementText('setting-occasion-hint', text.settingOccasionHint);
                setElementText('setting-occasion-enabled-label', text.settingOccasionEnabledLabel);
                applyOccasionTheme();
            } else if (skipCatalog) {
                updateCartBadge();
                updateNebrasSiteClock();
            }
            updateNebrasSiteClock();
        }

        window.onCartReceiptSelected = onCartReceiptSelected;
        window.onTransferDeclaredChanged = onTransferDeclaredChanged;
        window.closeSalesQuoteDetail = closeSalesQuoteDetail;
        window.viewSalesQuoteReceipt = viewSalesQuoteReceipt;
        window.viewSalesQuoteDoorDesign = viewSalesQuoteDoorDesign;
        window.closeSalesQuoteDoorDesign = closeSalesQuoteDoorDesign;
        window.openAdminAnalytics = openAdminAnalytics;
        window.renderAdminAnalyticsPanel = renderAdminAnalyticsPanel;
        window.viewSalesQuoteDocument = viewSalesQuoteDocument;
        window.submitQuoteA4Pdf = submitQuoteA4Pdf;
        window.submitCartOrQuote = submitCartOrQuote;
        window.confirmAndOpenQuote = confirmAndOpenQuote;
        window.openQuotePreview = openQuotePreview;
        window.closeQuotePreview = closeQuotePreview;
        window.openCartDrawer = openCartDrawer;
        window.closeCartDrawer = closeCartDrawer;
        window.markCurrentQuoteFinalized = markCurrentQuoteFinalized;
        window.submitQuoteToSales = function() { submitQuoteA4Pdf('both'); };
        window.deleteAnalyticsQuote = deleteAnalyticsQuote;
        window.deleteAnalyticsVisitor = deleteAnalyticsVisitor;
        window.deleteAnalyticsComplaint = deleteAnalyticsComplaint;
        window.deleteAnalyticsCustomer = deleteAnalyticsCustomer;
        window.restoreAnalyticsRecord = restoreAnalyticsRecord;
        window.clearAllAnalyticsQuotes = clearAllAnalyticsQuotes;
        window.clearAllAnalyticsTransfers = clearAllAnalyticsTransfers;
        window.clearAllAnalyticsCustomers = clearAllAnalyticsCustomers;
        window.clearAllAnalyticsVisitors = clearAllAnalyticsVisitors;
        window.clearAllAnalyticsComplaints = clearAllAnalyticsComplaints;
        window.emptyAnalyticsRestoreBin = emptyAnalyticsRestoreBin;
        window.restoreAllAnalyticsRecords = restoreAllAnalyticsRecords;
        window.openDoorDesignerFromGateway = openDoorDesignerFromGateway;
        window.manageStoreIconProducts = manageStoreIconProducts;
        window.toggleSiteProductVisibility = toggleSiteProductVisibility;
        window.purgeStaleCatalogReferences = purgeStaleCatalogReferences;
        window.loginAdmin = loginAdmin;
        window.logoutAdmin = logoutAdmin;
        window.openAdminPanel = openAdminPanel;
        window.closeAdminOverlay = closeAdminOverlay;
        window.onDashboardTileClick = onDashboardTileClick;
        window.scrollToDashboardSection = scrollToDashboardSection;
        window.openSiteContentManager = openSiteContentManager;
        window.openIconManagement = openIconManagement;
        window.openSystemSettings = openSystemSettings;
        window.openSystemSettingsForChannels = openSystemSettingsForChannels;
        window.openSystemSettingsForOccasion = openSystemSettingsForOccasion;
        window.openDashboardNavSettings = openDashboardNavSettings;
        window.openVisitorIcon = openVisitorIcon;
        window.openPlatformModule = openPlatformModule;
        window.openErpModule = openErpModule;
        window.addNewUser = addNewUser;
        window.editUser = editUser;
        window.deleteUser = deleteUser;
        window.setLanguage = setLanguage;
        window.applyOccasionTheme = applyOccasionTheme;
        window.renderPartnersMarquees = renderPartnersMarquees;
        window.saveContentData = saveContentData;
        window.refreshPublicSiteFromGovernance = refreshPublicSiteFromGovernance;
        window.viewSalesQuoteEntry = viewSalesQuoteEntry;
        window.addSitePartner = addSitePartner;
        window.editSitePartner = editSitePartner;
        window.deleteSitePartner = deleteSitePartner;
        window.openUserManagement = openUserManagement;
        window.openSalesManagement = openSalesManagement;
        window.openErpInventory = openErpInventory;
        window.openErpOrders = openErpOrders;
        window.openComplaintsManagement = openComplaintsManagement;
        window.openBranchesManagement = openBranchesManagement;
        window.openAuditLog = openAuditLog;
        window.markSalesQuoteStatus = markSalesQuoteStatus;
        window.dialNumber = dialNumber;
        window.smartRouteToSales = smartRouteToSales;
        window.openNebrasWorkspace = openNebrasWorkspace;
        window.closeNebrasWorkspace = closeNebrasWorkspace;
        window.toggleMenu = toggleMenu;
        window.siteLogoImgFallback = siteLogoImgFallback;

