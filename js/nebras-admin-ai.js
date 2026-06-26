/**
 * نبراس — مساعد Claude الشخصي للإدارة الرئيسية (Copilot-style)
 * محادثة متصلة · تنفيذ إجراءات · إرفاق صور للمحادثة
 */
(function(global) {
    'use strict';

    const CHAT_KEY = 'nebrasAdminAiChat';
    const AI_MAX_IMAGES = 4;
    const AI_MAX_IMAGES_SEND = 2;
    const AI_MAX_IMAGE_BYTES = 280000;
    const AI_MAX_TOTAL_BYTES = 2800000;
    const AI_FETCH_TIMEOUT_MS = 55000;
    const AI_MAX_RETRIES = 2;
    let aiMode = 'governance';
    let aiChatHistory = [];
    let aiSending = false;
    let aiPendingAttachments = [];

    function isMainAdmin() {
        const admin = typeof global.getNebrasCurrentAdmin === 'function' ? global.getNebrasCurrentAdmin() : null;
        return typeof global.isMainGovernanceAdmin === 'function' && global.isMainGovernanceAdmin(admin);
    }

    function apiBase() {
        if (typeof global.NEBRAS_API_BASE === 'string' && global.NEBRAS_API_BASE) return global.NEBRAS_API_BASE;
        return '';
    }

    function loadAiChat() {
        try {
            const raw = sessionStorage.getItem(CHAT_KEY);
            aiChatHistory = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(aiChatHistory)) aiChatHistory = [];
        } catch (e) { aiChatHistory = []; }
    }

    function saveAiChat() {
        try {
            const trimmed = aiChatHistory.slice(-40).map(function(m) {
                const copy = { role: m.role, content: m.content, at: m.at };
                if (m.images && m.images.length) {
                    copy.images = m.images.slice(0, 4).map(function(img) {
                        return { url: img.url, name: img.name || '' };
                    });
                }
                return copy;
            });
            sessionStorage.setItem(CHAT_KEY, JSON.stringify(trimmed));
        } catch (e) { /* ignore */ }
    }

    function escHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function buildAiContext() {
        const parts = [];
        try {
            const products = (global.siteProducts || []).filter(function(p) { return p && p.visible !== false; });
            const variants = products.reduce(function(n, p) { return n + ((p.variants || []).length); }, 0);
            parts.push('منتجات نشطة: ' + products.length + ' · أصناف: ' + variants);
            parts.push('مستخدمون إداريون: ' + (global.adminUsers || []).length);
            parts.push('فروع: ' + (global.branchesData || []).length);
            parts.push('حسابات بنكية: ' + ((global.systemSettings && global.systemSettings.bankAccounts) || []).length);
            if (typeof global.getNebrasPaymentMethods === 'function') {
                const pays = global.getNebrasPaymentMethods();
                const on = pays.filter(function(p) { return p && p.enabled; }).length;
                parts.push('طرق دفع: ' + on + ' نشطة من ' + pays.length);
            }
            parts.push('عروض/طلبات: ' + (typeof global.loadSalesQuotesInbox === 'function' ? global.loadSalesQuotesInbox().length : 0));
            if (typeof global.getNebrasCloudStoreCount === 'function') {
                parts.push('مخازن سحابة: ' + global.getNebrasCloudStoreCount());
            }
            if (typeof global.hasPendingLocalCloudMutations === 'function' && global.hasPendingLocalCloudMutations()) {
                parts.push('مزامنة: جاري الرفع التلقائي…');
            } else {
                parts.push('مزامنة: متزامنة تلقائياً مع السحابة');
            }
            const icons = (global.visitorIcons || []).length;
            parts.push('أيقونات زوار: ' + icons);
            const deploy = document.body && document.body.getAttribute('data-nebras-deploy');
            if (deploy) parts.push('إصدار المنصة: ' + deploy);
        } catch (e) { /* ignore */ }
        return parts.join('\n');
    }

    function sessionStatusLabel() {
        const has = typeof global.hasNebrasSecureSession === 'function' && global.hasNebrasSecureSession();
        return has
            ? '<span class="admin-ai-session admin-ai-session--ok"><i class="fas fa-lock"></i> جلسة API آمنة</span>'
            : '<span class="admin-ai-session admin-ai-session--warn"><i class="fas fa-lock-open"></i> جلسة API غير مفعّلة</span>';
    }

    async function ensureSecureApiSession() {
        if (typeof global.hasNebrasSecureSession === 'function' && global.hasNebrasSecureSession()) {
            return { ok: true };
        }
        const admin = typeof global.getNebrasCurrentAdmin === 'function' ? global.getNebrasCurrentAdmin() : null;
        if (!admin || !admin.username) return { ok: false, error: 'login_required' };
        const pw = window.prompt(
            'لتفعيل مساعد Claude — أدخلي كلمة مرور الإدارة الرئيسية (' + admin.username + '):'
        );
        if (!pw) return { ok: false, error: 'session_cancelled' };
        const r = typeof global.secureApiLogin === 'function'
            ? await global.secureApiLogin(admin.username, pw)
            : null;
        if (r && r.ok && r.token) return { ok: true };
        return {
            ok: false,
            error: (r && r.error) || 'api_login_failed',
            hint: (r && r.hint) || ''
        };
    }

    async function compressImageBlobForAi(blob) {
        if (!blob || !blob.type || blob.type.indexOf('image/') !== 0) return null;
        try {
            const url = URL.createObjectURL(blob);
            const img = await new Promise(function(resolve, reject) {
                const el = new Image();
                el.onload = function() { resolve(el); };
                el.onerror = reject;
                el.src = url;
            });
            const maxW = 1024;
            const maxH = 1024;
            let w = img.naturalWidth || img.width || maxW;
            let h = img.naturalHeight || img.height || maxH;
            const scale = Math.min(1, maxW / w, maxH / h);
            w = Math.max(1, Math.round(w * scale));
            h = Math.max(1, Math.round(h * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            URL.revokeObjectURL(url);
            let quality = 0.82;
            let dataUrl = canvas.toDataURL('image/jpeg', quality);
            while (dataUrl.length > AI_MAX_IMAGE_BYTES * 1.37 && quality > 0.35) {
                quality -= 0.1;
                dataUrl = canvas.toDataURL('image/jpeg', quality);
            }
            return dataUrl;
        } catch (e) {
            return null;
        }
    }

    async function fileToAiDataUrl(file) {
        if (!file) return null;
        const compressed = await compressImageBlobForAi(file);
        if (compressed) return compressed;
        return await new Promise(function(resolve) {
            const reader = new FileReader();
            reader.onload = function() { resolve(reader.result || null); };
            reader.onerror = function() { resolve(null); };
            reader.readAsDataURL(file);
        });
    }

    async function parseAiApiResponse(res) {
        const text = await res.text();
        if (!text || !text.trim()) {
            return { ok: false, error: res.status === 413 ? 'payload_too_large' : 'empty_response', status: res.status };
        }
        try {
            const data = JSON.parse(text);
            if (!res.ok && data && !data.error) data.error = 'http_' + res.status;
            return data;
        } catch (e) {
            const lower = text.toLowerCase();
            if (res.status === 413 || lower.indexOf('payload_too_large') >= 0 || lower.indexOf('entity too large') >= 0) {
                return { ok: false, error: 'payload_too_large', detail: text.slice(0, 160), status: res.status };
            }
            if (lower.indexOf('an error occurred') >= 0 || lower.indexOf('function_invocation') >= 0 || lower.indexOf('internal server error') >= 0) {
                return { ok: false, error: 'server_crash', detail: text.slice(0, 160), status: res.status };
            }
            if (res.status === 502 || res.status === 503 || res.status === 504 || lower.indexOf('timeout') >= 0) {
                return { ok: false, error: 'ai_timeout', detail: text.slice(0, 160), status: res.status };
            }
            return { ok: false, error: 'invalid_json_response', detail: text.slice(0, 160), status: res.status };
        }
    }

    async function urlToBase64ForAi(url) {
        if (!url) return null;
        if (String(url).indexOf('data:') === 0) {
            const m = String(url).match(/^data:([^;]+);base64,(.+)$/);
            if (!m) return null;
            if (m[2].length <= AI_MAX_IMAGE_BYTES) {
                return { media_type: m[1].indexOf('png') >= 0 ? 'image/jpeg' : m[1], data: m[2] };
            }
            try {
                const res = await fetch(url);
                const blob = await res.blob();
                const compressed = await compressImageBlobForAi(blob);
                if (!compressed) return { media_type: m[1], data: m[2].slice(0, AI_MAX_IMAGE_BYTES) };
                const cm = compressed.match(/^data:([^;]+);base64,(.+)$/);
                return cm ? { media_type: 'image/jpeg', data: cm[2] } : null;
            } catch (e) {
                return { media_type: 'image/jpeg', data: m[2].slice(0, AI_MAX_IMAGE_BYTES) };
            }
        }
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const compressed = await compressImageBlobForAi(blob);
            if (compressed) {
                const m = compressed.match(/^data:([^;]+);base64,(.+)$/);
                return m ? { media_type: 'image/jpeg', data: m[2] } : null;
            }
            return await new Promise(function(resolve) {
                const reader = new FileReader();
                reader.onload = function() {
                    const d = reader.result;
                    const m = String(d).match(/^data:([^;]+);base64,(.+)$/);
                    resolve(m ? { media_type: m[1], data: m[2] } : null);
                };
                reader.onerror = function() { resolve(null); };
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            return null;
        }
    }

    function sleepMs(ms) {
        return new Promise(function(resolve) { setTimeout(resolve, ms); });
    }

    function isAiRetryableError(data) {
        if (!data || data.ok) return false;
        const retryable = ['server_crash', 'invalid_json_response', 'empty_response', 'server_error', 'ai_upstream_failed', 'ai_timeout'];
        if (retryable.indexOf(data.error) >= 0) return true;
        return data.status && data.status >= 502;
    }

    async function postNebrasAiRequest(token, bodyStr) {
        const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        let timer = null;
        if (ctrl) timer = setTimeout(function() { ctrl.abort(); }, AI_FETCH_TIMEOUT_MS);
        try {
            const res = await fetch(apiBase() + '/api/nebras-ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + token
                },
                body: bodyStr,
                signal: ctrl ? ctrl.signal : undefined
            });
            return parseAiApiResponse(res);
        } catch (e) {
            const msg = String(e && e.message || e || '').toLowerCase();
            if (msg.indexOf('abort') >= 0) return { ok: false, error: 'ai_timeout' };
            return { ok: false, error: 'network_error', detail: String(e && e.message || e) };
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    async function askNebrasAdminAi(prompt, mode, history, images, onRetry) {
        const session = await ensureSecureApiSession();
        if (!session.ok) {
            return {
                ok: false,
                error: session.error || 'login_required',
                hint: session.hint || ''
            };
        }
        const token = typeof global.getNebrasSecureToken === 'function' ? global.getNebrasSecureToken() : '';
        if (!token) return { ok: false, error: 'login_required' };
        const imagesSend = (images || []).slice(0, AI_MAX_IMAGES_SEND);
        const historySend = imagesSend.length ? (history || []).slice(-4) : (history || []).slice(-12);
        const payload = {
            prompt: prompt,
            context: buildAiContext(),
            mode: mode || aiMode,
            history: historySend,
            images: imagesSend
        };
        const bodyStr = JSON.stringify(payload);
        if (bodyStr.length > AI_MAX_TOTAL_BYTES) {
            return { ok: false, error: 'payload_too_large' };
        }
        let last = null;
        for (let attempt = 0; attempt <= AI_MAX_RETRIES; attempt++) {
            if (attempt > 0) {
                if (typeof onRetry === 'function') onRetry(attempt);
                await sleepMs(1800 * attempt);
            }
            last = await postNebrasAiRequest(token, bodyStr);
            if (!isAiRetryableError(last)) return last;
        }
        return last;
    }

    function tryApplyProductSuggestion(text) {
        if (!text || !global.siteProducts) return false;
        const match = text.match(/\{[\s\S]*"variants"[\s\S]*\}/);
        if (!match) return false;
        try {
            const data = JSON.parse(match[0]);
            if (!data.product_id || !Array.isArray(data.variants)) return false;
            const product = global.siteProducts.find(function(p) { return p && p.id === data.product_id; });
            if (!product) { alert('لم يُعثر على المنتج: ' + data.product_id); return false; }
            if (!confirm('تطبيق ' + data.variants.length + ' صنف على «' + (product.titleAr || product.id) + '»؟')) return false;
            if (!product.variants) product.variants = [];
            data.variants.forEach(function(v) {
                product.variants.push({
                    id: 'var-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                    typeAr: v.type_ar || v.typeAr || '',
                    typeEn: v.type_en || v.typeEn || v.type_ar || '',
                    sizeAr: v.size_ar || v.sizeAr || '',
                    sizeEn: v.size_en || v.sizeEn || v.size_ar || '',
                    colorAr: v.color_ar || v.colorAr || '',
                    colorEn: v.color_en || v.colorEn || v.color_ar || '',
                    price: Number(v.price_ex_vat || v.price) || 0,
                    sku: v.sku || '',
                    image: v.image || (product.album && product.album[0]) || ''
                });
            });
            product.shopEnabled = true;
            product.action = 'shop';
            if (typeof global.saveContentData === 'function') global.saveContentData({ urgentCloud: true });
            if (typeof global.addAuditLog === 'function') global.addAuditLog('مساعد Claude', 'تطبيق أصناف — ' + product.titleAr);
            alert('تم تطبيق الأصناف — ' + data.variants.length + ' صنف.');
            return true;
        } catch (e) {
            return false;
        }
    }

    function tryApplyPaymentMethodsSuggestion(text) {
        if (!text) return false;
        const match = text.match(/\{[\s\S]*"payment_methods"[\s\S]*\}/);
        if (!match) return false;
        try {
            const data = JSON.parse(match[0]);
            if (!Array.isArray(data.payment_methods) || !data.payment_methods.length) return false;
            if (!confirm('تطبيق إعدادات طرق الدفع (' + data.payment_methods.length + ') على السلة؟')) return false;
            if (typeof global.applyPaymentMethodsFromGovernance === 'function') {
                global.applyPaymentMethodsFromGovernance(data.payment_methods);
            }
            if (typeof global.persistNebrasLiveNow === 'function') {
                global.persistNebrasLiveNow('طرق الدفع', { storeKeys: ['system_settings'], showToast: true });
            } else if (typeof global.saveContentData === 'function') {
                global.saveContentData({ urgentCloud: true });
            }
            if (typeof global.addAuditLog === 'function') global.addAuditLog('مساعد Claude', 'تطبيق طرق دفع');
            alert('تم تطبيق طرق الدفع — ستظهر في سلة الزوار بعد الحفظ السحابي.');
            return true;
        } catch (e) {
            return false;
        }
    }

    function runAiAction(actionId) {
        const map = {
            open_content: function() { if (typeof global.openSiteContentManager === 'function') global.openSiteContentManager(); },
            open_store: function() { if (typeof global.openStoreCatalogManager === 'function') global.openStoreCatalogManager(); },
            open_showroom: function() { if (typeof global.openShowroomHub === 'function') global.openShowroomHub(); },
            open_users: function() { if (typeof global.openNebrasUserManagement === 'function') global.openNebrasUserManagement(); },
            open_cloud: function() { if (typeof global.openCloudGovernance === 'function') global.openCloudGovernance(); },
            open_hr: function() { if (typeof global.openHrPlatform === 'function') global.openHrPlatform(); },
            open_warehouse: function() { if (typeof global.openNebrasDataWarehouse === 'function') global.openNebrasDataWarehouse(); },
            push_cloud: function() { if (typeof global.syncPushToNebrasCloudNow === 'function') global.syncPushToNebrasCloudNow(); },
            open_media: function() { if (typeof global.openNebrasMediaHubQuick === 'function') global.openNebrasMediaHubQuick(); },
            open_settings: function() { if (typeof global.openSystemSettings === 'function') global.openSystemSettings(); },
            open_payments: function() { if (typeof global.openSystemSettingsForPayments === 'function') global.openSystemSettingsForPayments(); },
            export_store: function() { if (typeof global.exportStoreCatalogCsv === 'function') global.exportStoreCatalogCsv(); }
        };
        if (map[actionId]) map[actionId]();
    }

    function parseAiActions(text) {
        const actions = [];
        const re = /\[ACTION:([a-z_]+)\]/gi;
        let m;
        while ((m = re.exec(text)) !== null) {
            if (actions.indexOf(m[1]) < 0) actions.push(m[1]);
        }
        return actions;
    }

    function stripActionTags(text) {
        return String(text || '').replace(/\[ACTION:[a-z_]+\]/gi, '').trim();
    }

    function renderMessageImages(images) {
        if (!images || !images.length) return '';
        return '<div class="admin-ai-msg-images">' + images.map(function(img) {
            const url = img && img.url ? img.url : '';
            if (!url) return '';
            return '<a href="' + escHtml(url) + '" target="_blank" rel="noopener" class="admin-ai-msg-image">' +
                '<img src="' + escHtml(url) + '" alt="' + escHtml(img.name || 'مرفق') + '">' +
                '</a>';
        }).join('') + '</div>';
    }

    function renderAiChatMessages() {
        const el = document.getElementById('admin-ai-chat');
        if (!el) return;
        if (!aiChatHistory.length) {
            el.innerHTML = '<div class="admin-ai-welcome">' +
                '<i class="fas fa-sparkles"></i>' +
                '<strong>مرحباً — أنا مساعدك الشخصي في الإدارة الرئيسية</strong>' +
                '<p>مثل Copilot في Office: أرفع · أضيف · أعدّل · أفعل طرق الدفع · أزامن السحابة.</p>' +
                '<p>اسألني عن: منتجات · محتوى · معرض · سلة · طرق دفع · مستخدمون · سحابة · HR.</p>' +
                '<p><i class="fas fa-paperclip"></i> ارفقي صوراً مباشرة في المحادثة — زر المشبك بجانب الإرسال.</p>' +
                '</div>';
            return;
        }
        el.innerHTML = aiChatHistory.map(function(msg) {
            const cls = msg.role === 'user' ? 'admin-ai-bubble--user' : 'admin-ai-bubble--assistant';
            const body = msg.role === 'assistant' ? escHtml(stripActionTags(msg.content)) : escHtml(msg.content);
            const actions = msg.role === 'assistant' ? parseAiActions(msg.content) : [];
            const actionBtns = actions.map(function(a) {
                const labels = {
                    open_content: 'فتح إدارة المحتوى',
                    open_store: 'فتح المتجر',
                    open_showroom: 'المعرض',
                    open_users: 'المستخدمون',
                    open_cloud: 'السحابة',
                    open_hr: 'HR',
                    open_media: 'رفع وسائط',
                    push_cloud: 'رفع للسحابة',
                    open_settings: 'الإعدادات',
                    open_payments: 'طرق الدفع',
                    export_store: 'تصدير المتجر'
                };
                return '<button type="button" class="admin-ai-action-btn" onclick="runNebrasAiAction(\'' + a + '\')"><i class="fas fa-bolt"></i> ' + escHtml(labels[a] || a) + '</button>';
            }).join('');
            return '<div class="admin-ai-bubble ' + cls + '">' +
                renderMessageImages(msg.images) +
                '<div class="admin-ai-bubble-text">' + body.replace(/\n/g, '<br>') + '</div>' +
                (actionBtns ? '<div class="admin-ai-action-row">' + actionBtns + '</div>' : '') +
                '</div>';
        }).join('');
        el.scrollTop = el.scrollHeight;
    }

    function renderAiComposeAttachments() {
        const strip = document.getElementById('admin-ai-attachments');
        if (!strip) return;
        if (!aiPendingAttachments.length) {
            strip.hidden = true;
            strip.innerHTML = '';
            return;
        }
        strip.hidden = false;
        strip.innerHTML = aiPendingAttachments.map(function(att, i) {
            return '<div class="admin-ai-attach-chip">' +
                '<img src="' + escHtml(att.url) + '" alt="">' +
                '<span>' + escHtml(att.name || 'صورة') + '</span>' +
                '<button type="button" onclick="removeAdminAiAttachment(' + i + ')" aria-label="حذف"><i class="fas fa-xmark"></i></button>' +
                '</div>';
        }).join('');
    }

    function removeAdminAiAttachment(index) {
        aiPendingAttachments.splice(index, 1);
        renderAiComposeAttachments();
    }

    async function handleAdminAiFilePick(files) {
        if (!files || !files.length) return;
        const status = document.getElementById('admin-ai-status');
        if (status) status.textContent = 'جاري رفع الصور…';
        const uploadFn = typeof global.uploadNebrasMediaFile === 'function' ? global.uploadNebrasMediaFile : null;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file || !file.type || file.type.indexOf('image/') !== 0) continue;
            if (aiPendingAttachments.length >= AI_MAX_IMAGES) {
                alert('الحد الأقصى ' + AI_MAX_IMAGES + ' صور في الرسالة الواحدة.');
                break;
            }
            let url = null;
            if (uploadFn) {
                url = await uploadFn(file);
                if (url) {
                    const b64 = await urlToBase64ForAi(url);
                    if (b64 && b64.data) {
                        url = 'data:image/jpeg;base64,' + b64.data;
                    }
                }
            }
            if (!url) {
                url = await fileToAiDataUrl(file);
            }
            if (url) {
                aiPendingAttachments.push({ url: url, name: file.name || 'صورة' });
            }
        }
        renderAiComposeAttachments();
        if (status) status.textContent = aiPendingAttachments.length ? 'صور جاهزة للإرسال' : 'جاهز';
    }

    function triggerAdminAiFilePick() {
        const input = document.getElementById('admin-ai-file-input');
        if (input) input.click();
    }

    async function sendAdminAiMessage() {
        if (aiSending) return;
        const promptEl = document.getElementById('admin-ai-prompt');
        const status = document.getElementById('admin-ai-status');
        const btn = document.getElementById('admin-ai-send-btn');
        const p = promptEl ? promptEl.value.trim() : '';
        const attachments = aiPendingAttachments.slice();
        if (!p && !attachments.length) return;
        loadAiChat();
        const imagesForApi = [];
        for (let i = 0; i < attachments.length && imagesForApi.length < AI_MAX_IMAGES_SEND; i++) {
            const b64 = await urlToBase64ForAi(attachments[i].url);
            if (b64) imagesForApi.push(b64);
        }
        aiChatHistory.push({
            role: 'user',
            content: p || 'حلّلي الصورة المرفقة واقترحي الخطوة التالية في المنصة.',
            images: attachments.map(function(a) { return { url: a.url, name: a.name }; }),
            at: Date.now()
        });
        if (promptEl) promptEl.value = '';
        aiPendingAttachments = [];
        renderAiComposeAttachments();
        renderAiChatMessages();
        saveAiChat();
        aiSending = true;
        if (btn) btn.disabled = true;
        if (status) status.textContent = 'Claude يفكّر…';
        const historyForApi = aiChatHistory.slice(0, -1).slice(-12).map(function(m) {
            return { role: m.role, content: m.content };
        });
        try {
            const data = await askNebrasAdminAi(p || 'حلّلي الصورة المرفقة.', aiMode, historyForApi, imagesForApi, function(attempt) {
                if (status) status.textContent = 'إعادة المحاولة ' + attempt + '…';
            });
            let reply = '';
            if (data.ok && data.reply) {
                reply = data.reply;
                if (status) status.textContent = 'متصل — ' + (aiMode === 'products' ? 'وضع المتجر' : aiMode);
            } else if (data.error === 'login_required' || data.error === 'main_admin_only') {
                reply = 'سجّلي دخول الإدارة الرئيسية أولاً لتفعيل الجلسة الآمنة.';
                if (status) status.textContent = 'يلزم دخول HQ';
            } else if (data.error === 'session_cancelled') {
                reply = 'أُلغي تفعيل الجلسة — أعيدي الإرسال وأدخلي كلمة المرور.';
                if (status) status.textContent = 'يلزم تفعيل الجلسة';
            } else if (data.error === 'server_misconfigured') {
                reply = 'إعداد Vercel ناقص: أضيفي ' + (data.hint || 'NEBRAS_API_SECRET') + ' ثم أعيدي النشر.';
                if (status) status.textContent = 'إعداد ناقص';
            } else if (data.error === 'api_login_failed' || data.error === 'invalid_credentials') {
                reply = 'فشل تفعيل الجلسة الآمنة — تأكدي من كلمة المرور أو سجّلي خروجاً ثم دخولاً من جديد.';
                if (status) status.textContent = 'فشل الجلسة';
            } else if (data.error === 'ai_not_configured') {
                reply = 'أضيفي ANTHROPIC_API_KEY في Vercel ثم أعيدي النشر.';
                if (status) status.textContent = 'غير مُعد';
            } else if (data.error === 'ai_invalid_key') {
                reply = 'مفتاح Anthropic غير صالح — راجعي ANTHROPIC_API_KEY في Vercel (يبدأ بـ sk-ant-).';
                if (status) status.textContent = 'مفتاح خاطئ';
            } else if (data.error === 'ai_billing_required') {
                reply = 'حساب Anthropic يحتاج رصيداً أو تفعيل الفوترة — راجعي console.anthropic.com.';
                if (status) status.textContent = 'رصيد مطلوب';
            } else if (data.error === 'ai_model_not_found') {
                reply = 'الموديل غير متاح — حدّثي ANTHROPIC_MODEL إلى claude-sonnet-4-6 في Vercel.';
                if (status) status.textContent = 'موديل قديم';
            } else if (data.error === 'ai_rate_limited') {
                reply = 'تم تجاوز حد الطلبات — انتظري دقيقة ثم أعيدي المحاولة.';
                if (status) status.textContent = 'انتظري قليلاً';
            } else if (data.error === 'ai_upstream_failed') {
                reply = 'تعذّر الاتصال بـ Claude — تأكدي من المفتاح والموديل في Vercel ثم أعيدي النشر.';
                if (data.detail && String(data.detail).toLowerCase().indexOf('image') >= 0) {
                    reply = 'الصورة كبيرة أو غير مدعومة — استخدمي صورة أصغر (أقل من 1 ميجا) ثم أعيدي الإرسال.';
                }
                if (status) status.textContent = 'فشل Claude';
            } else if (data.error === 'payload_too_large') {
                reply = 'حجم الرسالة كبير جداً (صور كثيرة أو ضخمة). احذفي بعض الصور أو استخدمي صوراً أصغر ثم أعيدي الإرسال.';
                if (status) status.textContent = 'حجم كبير';
            } else if (data.error === 'ai_timeout' || data.error === 'network_error') {
                reply = 'استغرق الطلب وقتاً طويلاً — غالباً بسبب صورة كبيرة. انتظري 10 ثوانٍ ثم أعيدي الإرسال بصورة واحدة أصغر أو برسالة نصية فقط.';
                if (status) status.textContent = 'انتهى الوقت';
            } else if (data.error === 'server_crash' || data.error === 'invalid_json_response') {
                reply = 'الخادم مشغول مؤقتاً — جرّبتُ إعادة الإرسال تلقائياً. انتظري 15 ثانية ثم أعيدي المحاولة بصورة واحدة أو نص فقط.';
                if (status) status.textContent = 'مشغول مؤقتاً';
            } else {
                reply = 'تعذّر الاتصال: ' + (data.error || 'خطأ');
                if (status) status.textContent = 'فشل';
            }
            aiChatHistory.push({ role: 'assistant', content: reply, at: Date.now() });
            saveAiChat();
            renderAiChatMessages();
            if (tryApplyProductSuggestion(reply)) renderAiChatMessages();
            if (tryApplyPaymentMethodsSuggestion(reply)) renderAiChatMessages();
        } catch (e) {
            const msg = String(e && e.message || e || '');
            let reply = 'تعذّر الإرسال — تحققي من الاتصال وأعيدي المحاولة.';
            if (msg.indexOf('JSON') >= 0 || msg.indexOf('token') >= 0) {
                reply = 'استجابة الخادم غير صالحة — غالباً بسبب صورة كبيرة. صغّري الصورة أو أرسلي نصاً فقط ثم أعيدي المحاولة.';
            }
            aiChatHistory.push({ role: 'assistant', content: reply, at: Date.now() });
            saveAiChat();
            renderAiChatMessages();
            if (status) status.textContent = 'فشل';
        }
        aiSending = false;
        if (btn) btn.disabled = false;
    }

    function clearAdminAiChat() {
        if (!confirm('مسح محادثة المساعد؟')) return;
        aiChatHistory = [];
        aiPendingAttachments = [];
        saveAiChat();
        renderAiComposeAttachments();
        renderAiChatMessages();
    }

    function renderAdminAiPanel() {
        const body = document.getElementById('admin-ai-body');
        const status = document.getElementById('admin-ai-status');
        if (!body) return;
        loadAiChat();
        if (!isMainAdmin()) {
            body.innerHTML = '<p class="erp-empty">مساعد Claude — الإدارة الرئيسية فقط (NEBRASFACTORY).</p>';
            return;
        }
        const imageAccept = global.NEBRAS_IMAGE_ACCEPT || 'image/jpeg,image/png,image/webp,image/gif';
        body.innerHTML =
            '<div class="admin-ai-copilot-head">' +
                '<span class="admin-ai-copilot-badge"><i class="fas fa-sparkles"></i> Claude AI</span>' +
                sessionStatusLabel() +
                '<span class="admin-ai-copilot-sub">مساعد شخصي — رفع · إضافة · تعديل · طرق دفع · سحابة</span>' +
            '</div>' +
            '<div class="admin-ai-modes">' +
            '<button type="button" class="admin-ai-mode' + (aiMode === 'governance' ? ' active' : '') + '" data-mode="governance"><i class="fas fa-crown"></i> حوكمة</button>' +
            '<button type="button" class="admin-ai-mode' + (aiMode === 'products' ? ' active' : '') + '" data-mode="products"><i class="fas fa-store"></i> المتجر</button>' +
            '<button type="button" class="admin-ai-mode' + (aiMode === 'content' ? ' active' : '') + '" data-mode="content"><i class="fas fa-pen-to-square"></i> المحتوى</button>' +
            '<button type="button" class="admin-ai-mode' + (aiMode === 'cart' ? ' active' : '') + '" data-mode="cart"><i class="fas fa-shopping-cart"></i> السلة</button>' +
            '<button type="button" class="admin-ai-mode' + (aiMode === 'users' ? ' active' : '') + '" data-mode="users"><i class="fas fa-users-cog"></i> المستخدمون</button>' +
            '<button type="button" class="admin-ai-mode' + (aiMode === 'cloud' ? ' active' : '') + '" data-mode="cloud"><i class="fas fa-cloud"></i> السحابة</button>' +
            '</div>' +
            '<div class="admin-ai-quick">' +
            '<button type="button" class="admin-ai-chip" data-q="ساعدني أضيف منتج WPC جديد بأصناف ومقاسات — اقترح JSON للتطبيق">منتج WPC</button>' +
            '<button type="button" class="admin-ai-chip" data-q="فعّلي mada وVisa في السلة — أخرج JSON payment_methods">تفعيل الدفع</button>' +
            '<button type="button" class="admin-ai-chip" data-q="ارفعي صورة منتج للمعرض واربطيها بأيقونة المتجر">رفع ومعرض</button>' +
            '<button type="button" class="admin-ai-chip" data-q="ما خطوات ضمان عدم فقدان البيانات في السحابة؟">حماية البيانات</button>' +
            '</div>' +
            '<div id="admin-ai-chat" class="admin-ai-chat" aria-live="polite"></div>' +
            '<div id="admin-ai-attachments" class="admin-ai-attachments" hidden></div>' +
            '<input type="file" id="admin-ai-file-input" accept="' + escHtml(imageAccept) + '" multiple hidden>' +
            '<div class="admin-ai-compose">' +
                '<button type="button" class="workspace-action-btn admin-ai-attach-btn" id="admin-ai-attach-btn" title="إرفاق صورة"><i class="fas fa-paperclip"></i></button>' +
                '<textarea id="admin-ai-prompt" class="admin-ai-prompt" rows="2" placeholder="اكتبي سؤالك أو ارفقي صورة للمنتج / الشاشة / العقد…"></textarea>' +
                '<div class="admin-ai-compose-actions">' +
                    '<button type="button" class="workspace-action-btn workspace-action-btn--primary" id="admin-ai-send-btn"><i class="fas fa-paper-plane"></i> إرسال</button>' +
                    '<button type="button" class="workspace-action-btn" id="admin-ai-apply-btn" title="تطبيق JSON أصناف"><i class="fas fa-magic"></i></button>' +
                    '<button type="button" class="workspace-action-btn" onclick="clearAdminAiChat()" title="مسح المحادثة"><i class="fas fa-eraser"></i></button>' +
                '</div>' +
            '</div>' +
            '<div class="admin-ai-shortcuts">' +
            '<button type="button" class="admin-ai-chip" onclick="runNebrasAiAction(\'open_content\')"><i class="fas fa-pen-to-square"></i> المحتوى</button>' +
            '<button type="button" class="admin-ai-chip" onclick="runNebrasAiAction(\'open_media\')"><i class="fas fa-cloud-upload-alt"></i> رفع وسائط</button>' +
            '<button type="button" class="admin-ai-chip" onclick="runNebrasAiAction(\'push_cloud\')"><i class="fas fa-cloud-upload-alt"></i> رفع سحابة</button>' +
            '<button type="button" class="admin-ai-chip" onclick="runNebrasAiAction(\'open_payments\')"><i class="fas fa-wallet"></i> طرق الدفع</button>' +
            '<button type="button" class="admin-ai-chip" onclick="runNebrasAiAction(\'open_showroom\')"><i class="fas fa-images"></i> المعرض</button>' +
            '</div>';
        body.querySelectorAll('.admin-ai-mode').forEach(function(btn) {
            btn.onclick = function() {
                aiMode = btn.getAttribute('data-mode') || 'governance';
                renderAdminAiPanel();
            };
        });
        body.querySelectorAll('.admin-ai-chip[data-q]').forEach(function(chip) {
            chip.onclick = function() {
                const el = document.getElementById('admin-ai-prompt');
                if (el) el.value = chip.getAttribute('data-q') || '';
            };
        });
        const btn = document.getElementById('admin-ai-send-btn');
        const applyBtn = document.getElementById('admin-ai-apply-btn');
        const promptEl = document.getElementById('admin-ai-prompt');
        const attachBtn = document.getElementById('admin-ai-attach-btn');
        const fileInput = document.getElementById('admin-ai-file-input');
        if (btn) btn.onclick = sendAdminAiMessage;
        if (attachBtn) attachBtn.onclick = triggerAdminAiFilePick;
        if (fileInput) {
            fileInput.onchange = function() {
                handleAdminAiFilePick(fileInput.files);
                fileInput.value = '';
            };
        }
        if (promptEl) {
            promptEl.onkeydown = function(ev) {
                if (ev.key === 'Enter' && !ev.shiftKey) {
                    ev.preventDefault();
                    sendAdminAiMessage();
                }
            };
            promptEl.onpaste = function(ev) {
                const items = ev.clipboardData && ev.clipboardData.items;
                if (!items) return;
                const imageFiles = [];
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type && items[i].type.indexOf('image/') === 0) {
                        const f = items[i].getAsFile();
                        if (f) imageFiles.push(f);
                    }
                }
                if (imageFiles.length) {
                    ev.preventDefault();
                    handleAdminAiFilePick(imageFiles);
                }
            };
        }
        if (applyBtn) {
            applyBtn.onclick = function() {
                const last = aiChatHistory.filter(function(m) { return m.role === 'assistant'; }).pop();
                if (!last || !tryApplyProductSuggestion(last.content)) {
                    alert('لم يُعثر على JSON أصناف — اطلبي من Claude إخراج: {"product_id":"...","variants":[...]}');
                }
            };
        }
        renderAiComposeAttachments();
        renderAiChatMessages();
        if (status && !status.textContent) status.textContent = 'جاهز — محادثة متصلة';
    }

    function openNebrasAdminAi() {
        if (!isMainAdmin()) {
            alert('مساعد Claude — الإدارة الرئيسية فقط.');
            return;
        }
        renderAdminAiPanel();
        const el = document.getElementById('admin-ai-assistant');
        if (el) {
            el.classList.add('show');
            el.setAttribute('aria-hidden', 'false');
        }
        if (typeof global.revealPlatformLayer === 'function') global.revealPlatformLayer('admin-ai-assistant');
    }

    function closeNebrasAdminAi() {
        const el = document.getElementById('admin-ai-assistant');
        if (el) {
            el.classList.remove('show');
            el.setAttribute('aria-hidden', 'true');
        }
        if (typeof global.syncPlatformInteractionLayers === 'function') global.syncPlatformInteractionLayers();
    }

    global.openNebrasAdminAi = openNebrasAdminAi;
    global.closeNebrasAdminAi = closeNebrasAdminAi;
    global.renderAdminAiPanel = renderAdminAiPanel;
    global.askNebrasAdminAi = askNebrasAdminAi;
    global.runNebrasAiAction = runAiAction;
    global.clearAdminAiChat = clearAdminAiChat;
    global.removeAdminAiAttachment = removeAdminAiAttachment;
    global.triggerAdminAiFilePick = triggerAdminAiFilePick;

})(typeof window !== 'undefined' ? window : globalThis);
