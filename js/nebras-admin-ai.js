/**
 * نبراس — مساعد Claude الشخصي للإدارة الرئيسية (Copilot-style)
 * محادثة متصلة · تنفيذ إجراءات · إدارة كاملة عبر الحوار
 */
(function(global) {
    'use strict';

    const CHAT_KEY = 'nebrasAdminAiChat';
    let aiMode = 'governance';
    let aiChatHistory = [];
    let aiSending = false;

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
            const trimmed = aiChatHistory.slice(-40);
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

    async function askNebrasAdminAi(prompt, mode, history) {
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
        const res = await fetch(apiBase() + '/api/nebras-ai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token
            },
            body: JSON.stringify({
                prompt: prompt,
                context: buildAiContext(),
                mode: mode || aiMode,
                history: history || []
            })
        });
        return res.json();
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

    function runAiAction(actionId) {
        const map = {
            open_content: function() { if (typeof global.openSiteContentManager === 'function') global.openSiteContentManager(); },
            open_store: function() { if (typeof global.openStoreCatalogManager === 'function') global.openStoreCatalogManager(); },
            open_users: function() { if (typeof global.openNebrasUserManagement === 'function') global.openNebrasUserManagement(); },
            open_cloud: function() { if (typeof global.openCloudGovernance === 'function') global.openCloudGovernance(); },
            open_hr: function() { if (typeof global.openHrPlatform === 'function') global.openHrPlatform(); },
            open_warehouse: function() { if (typeof global.openNebrasDataWarehouse === 'function') global.openNebrasDataWarehouse(); },
            push_cloud: function() { if (typeof global.syncPushToNebrasCloudNow === 'function') global.syncPushToNebrasCloudNow(); },
            open_media: function() { if (typeof global.openNebrasMediaHubQuick === 'function') global.openNebrasMediaHubQuick(); },
            open_settings: function() { if (typeof global.openSystemSettings === 'function') global.openSystemSettings(); },
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

    function renderAiChatMessages() {
        const el = document.getElementById('admin-ai-chat');
        if (!el) return;
        if (!aiChatHistory.length) {
            el.innerHTML = '<div class="admin-ai-welcome">' +
                '<i class="fas fa-sparkles"></i>' +
                '<strong>مرحباً — أنا مساعدك الشخصي في الإدارة الرئيسية</strong>' +
                '<p>اسألني عن أي شيء: منتجات · مستخدمون · سحابة · سلة · بنوك · HR · محتوى الموقع. يمكنني اقتراح خطوات وتنفيذ إجراءات.</p>' +
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
                    open_users: 'المستخدمون',
                    open_cloud: 'السحابة',
                    open_hr: 'HR',
                    open_media: 'رفع وسائط',
                    push_cloud: 'رفع للسحابة',
                    open_settings: 'الإعدادات',
                    export_store: 'تصدير المتجر'
                };
                return '<button type="button" class="admin-ai-action-btn" onclick="runNebrasAiAction(\'' + a + '\')"><i class="fas fa-bolt"></i> ' + escHtml(labels[a] || a) + '</button>';
            }).join('');
            return '<div class="admin-ai-bubble ' + cls + '">' +
                '<div class="admin-ai-bubble-text">' + body.replace(/\n/g, '<br>') + '</div>' +
                (actionBtns ? '<div class="admin-ai-action-row">' + actionBtns + '</div>' : '') +
                '</div>';
        }).join('');
        el.scrollTop = el.scrollHeight;
    }

    async function sendAdminAiMessage() {
        if (aiSending) return;
        const promptEl = document.getElementById('admin-ai-prompt');
        const status = document.getElementById('admin-ai-status');
        const btn = document.getElementById('admin-ai-send-btn');
        const p = promptEl ? promptEl.value.trim() : '';
        if (!p) return;
        loadAiChat();
        aiChatHistory.push({ role: 'user', content: p, at: Date.now() });
        if (promptEl) promptEl.value = '';
        renderAiChatMessages();
        saveAiChat();
        aiSending = true;
        if (btn) btn.disabled = true;
        if (status) status.textContent = 'Claude يفكّر…';
        const historyForApi = aiChatHistory.slice(0, -1).slice(-12).map(function(m) {
            return { role: m.role, content: m.content };
        });
        try {
            const data = await askNebrasAdminAi(p, aiMode, historyForApi);
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
                if (status) status.textContent = 'فشل Claude';
            } else {
                reply = 'تعذّر الاتصال: ' + (data.error || 'خطأ');
                if (status) status.textContent = 'فشل';
            }
            aiChatHistory.push({ role: 'assistant', content: reply, at: Date.now() });
            saveAiChat();
            renderAiChatMessages();
            if (tryApplyProductSuggestion(reply)) renderAiChatMessages();
        } catch (e) {
            aiChatHistory.push({ role: 'assistant', content: 'خطأ شبكة: ' + e.message, at: Date.now() });
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
        saveAiChat();
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
        body.innerHTML =
            '<div class="admin-ai-copilot-head">' +
                '<span class="admin-ai-copilot-badge"><i class="fas fa-sparkles"></i> Claude AI</span>' +
                sessionStatusLabel() +
                '<span class="admin-ai-copilot-sub">مساعد شخصي — مثل Copilot في Excel · يفهم المنصة وينفّذ معك</span>' +
            '</div>' +
            '<div class="admin-ai-modes">' +
            '<button type="button" class="admin-ai-mode' + (aiMode === 'governance' ? ' active' : '') + '" data-mode="governance"><i class="fas fa-crown"></i> حوكمة</button>' +
            '<button type="button" class="admin-ai-mode' + (aiMode === 'products' ? ' active' : '') + '" data-mode="products"><i class="fas fa-store"></i> المتجر</button>' +
            '<button type="button" class="admin-ai-mode' + (aiMode === 'content' ? ' active' : '') + '" data-mode="content"><i class="fas fa-pen-to-square"></i> المحتوى</button>' +
            '<button type="button" class="admin-ai-mode' + (aiMode === 'users' ? ' active' : '') + '" data-mode="users"><i class="fas fa-users-cog"></i> المستخدمون</button>' +
            '<button type="button" class="admin-ai-mode' + (aiMode === 'cloud' ? ' active' : '') + '" data-mode="cloud"><i class="fas fa-cloud"></i> السحابة</button>' +
            '</div>' +
            '<div class="admin-ai-quick">' +
            '<button type="button" class="admin-ai-chip" data-q="ساعدني أضيف منتج WPC جديد بأصناف ومقاسات — اقترح JSON للتطبيق">منتج WPC</button>' +
            '<button type="button" class="admin-ai-chip" data-q="كيف أضيف بنكاً جديداً لطرق الدفع في السلة؟">بنوك السلة</button>' +
            '<button type="button" class="admin-ai-chip" data-q="راجع صلاحيات الأدوار واقترح توزيعاً للفروع">الصلاحيات</button>' +
            '<button type="button" class="admin-ai-chip" data-q="ما خطوات ضمان عدم فقدان البيانات في السحابة؟">حماية البيانات</button>' +
            '</div>' +
            '<div id="admin-ai-chat" class="admin-ai-chat" aria-live="polite"></div>' +
            '<div class="admin-ai-compose">' +
                '<textarea id="admin-ai-prompt" class="admin-ai-prompt" rows="2" placeholder="اكتبي سؤالك أو طلبك — مثل: أضف أصناف ألومنيوم · أنشئ مستخدم متجر · حسّن السلة…"></textarea>' +
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
            '<button type="button" class="admin-ai-chip" onclick="runNebrasAiAction(\'open_warehouse\')"><i class="fas fa-database"></i> مستودع البيانات</button>' +
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
        if (btn) btn.onclick = sendAdminAiMessage;
        if (promptEl) {
            promptEl.onkeydown = function(ev) {
                if (ev.key === 'Enter' && !ev.shiftKey) {
                    ev.preventDefault();
                    sendAdminAiMessage();
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
        renderAiChatMessages();
        if (status && !status.textContent) status.textContent = 'جاهز — محادثة متصلة';
    }

    function openNebrasAdminAi() {
        if (!isMainAdmin()) {
            alert('مساعد Claude — الإدارة الرئيسية فقط.');
            return;
        }
        if (typeof global.closeNebrasWorkspace === 'function') global.closeNebrasWorkspace();
        if (typeof global.closeAllAdminSections === 'function') global.closeAllAdminSections();
        const el = document.getElementById('admin-ai-assistant');
        if (el) {
            el.classList.add('show');
            el.setAttribute('aria-hidden', 'false');
        }
        if (typeof global.revealPlatformLayer === 'function') global.revealPlatformLayer('admin-ai-assistant');
        renderAdminAiPanel();
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

})(typeof window !== 'undefined' ? window : globalThis);
