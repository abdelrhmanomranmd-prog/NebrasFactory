/**
 * نبراس — مساعد Claude السحابي للإدارة الرئيسية
 * إدارة الموقع · المتجر · المستخدمون · الحوكمة · مزامنة السحابة
 */
(function(global) {
    'use strict';

    let aiMode = 'governance';

    function isMainAdmin() {
        return typeof global.isMainGovernanceAdmin === 'function' && global.isMainGovernanceAdmin(global.getNebrasCurrentAdmin && global.getNebrasCurrentAdmin());
    }

    function apiBase() {
        if (typeof global.NEBRAS_API_BASE === 'string' && global.NEBRAS_API_BASE) return global.NEBRAS_API_BASE;
        return '';
    }

    function buildAiContext() {
        const parts = [];
        try {
            const products = (global.siteProducts || []).filter(function(p) { return p && p.visible !== false; });
            const variants = products.reduce(function(n, p) { return n + ((p.variants || []).length); }, 0);
            parts.push('منتجات نشطة: ' + products.length + ' · أصناف: ' + variants);
            parts.push('مستخدمون إداريون: ' + (global.adminUsers || []).length);
            parts.push('فروع: ' + (global.branchesData || []).length);
            parts.push('عروض/طلبات: ' + (typeof global.loadSalesQuotesInbox === 'function' ? global.loadSalesQuotesInbox().length : 0));
            if (typeof global.getNebrasCloudStoreCount === 'function') {
                parts.push('مخازن سحابة: ' + global.getNebrasCloudStoreCount());
            }
            if (typeof global.hasPendingLocalCloudMutations === 'function' && global.hasPendingLocalCloudMutations()) {
                parts.push('حالة المزامنة: معلّقة — يُنصح بالرفع للسحابة');
            } else {
                parts.push('حالة المزامنة: متزامن');
            }
            const portal = typeof global.getCustomerPortalUsers === 'function' ? global.getCustomerPortalUsers().length : 0;
            parts.push('عملاء البوابة: ' + portal);
        } catch (e) { /* ignore */ }
        return parts.join('\n');
    }

    async function askNebrasAdminAi(prompt, mode) {
        const token = typeof global.getNebrasSecureToken === 'function' ? global.getNebrasSecureToken() : '';
        if (!token) return { ok: false, error: 'login_required' };
        const res = await fetch(apiBase() + '/api/nebras-ai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token
            },
            body: JSON.stringify({ prompt: prompt, context: buildAiContext(), mode: mode || aiMode })
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
            alert('تم تطبيق الأصناف — ' + data.variants.length + ' صنف. تم الحفظ والمزامنة.');
            return true;
        } catch (e) {
            return false;
        }
    }

    function renderAdminAiPanel() {
        const body = document.getElementById('admin-ai-body');
        const status = document.getElementById('admin-ai-status');
        if (!body) return;
        if (!isMainAdmin()) {
            body.innerHTML = '<p class="erp-empty">مساعد Claude السحابي — الإدارة الرئيسية فقط (NEBRASFACTORY).</p>';
            return;
        }
        body.innerHTML =
            '<p class="scm-hint"><i class="fas fa-robot"></i> مساعد Claude السحابي — إدارة كاملة للموقع تحت الإدارة الرئيسية</p>' +
            '<div class="admin-ai-modes">' +
            '<button type="button" class="admin-ai-mode' + (aiMode === 'governance' ? ' active' : '') + '" data-mode="governance"><i class="fas fa-crown"></i> حوكمة</button>' +
            '<button type="button" class="admin-ai-mode' + (aiMode === 'products' ? ' active' : '') + '" data-mode="products"><i class="fas fa-store"></i> المتجر</button>' +
            '<button type="button" class="admin-ai-mode' + (aiMode === 'users' ? ' active' : '') + '" data-mode="users"><i class="fas fa-users-cog"></i> المستخدمون</button>' +
            '<button type="button" class="admin-ai-mode' + (aiMode === 'cloud' ? ' active' : '') + '" data-mode="cloud"><i class="fas fa-cloud"></i> السحابة</button>' +
            '</div>' +
            '<div class="admin-ai-quick">' +
            '<button type="button" class="admin-ai-chip" data-q="اقترح هيكل أصناف ألومنيوم (بروفيل · صفائح · زاوية) مع مقاسات وSKU — بصيغة JSON للتطبيق">أصناف ALU</button>' +
            '<button type="button" class="admin-ai-chip" data-q="راجع صلاحيات الأدوار في المنصة واقترح توزيعاً للفروع والأقسام تحت الإدارة الرئيسية">الصلاحيات</button>' +
            '<button type="button" class="admin-ai-chip" data-q="ما خطوات مزامنة السحابة وضمان عدم فقدان البيانات؟">المزامنة</button>' +
            '<button type="button" class="admin-ai-chip" data-q="كيف أنشئ مستخدم متجر فقط (store_manager) لرفع المنتجات؟">مستخدم متجر</button>' +
            '</div>' +
            '<textarea id="admin-ai-prompt" class="admin-ai-prompt" rows="4" placeholder="اسألي عن أي شيء — منتجات · مستخدمون · فروع · أقسام · سحابة · حوكمة..."></textarea>' +
            '<div class="workspace-actions-row">' +
            '<button type="button" class="workspace-action-btn workspace-action-btn--primary" id="admin-ai-send-btn"><i class="fas fa-paper-plane"></i> اسألي Claude</button>' +
            '<button type="button" class="workspace-action-btn" id="admin-ai-apply-btn"><i class="fas fa-magic"></i> تطبيق JSON أصناف</button>' +
            '<button type="button" class="workspace-action-btn" onclick="typeof syncPushToNebrasCloudNow===\'function\'&&syncPushToNebrasCloudNow()"><i class="fas fa-cloud-upload-alt"></i> رفع للسحابة</button>' +
            '<button type="button" class="workspace-action-btn" onclick="typeof openNebrasDataWarehouse===\'function\'&&openNebrasDataWarehouse()"><i class="fas fa-database"></i> مستودع البيانات</button>' +
            '<button type="button" class="workspace-action-btn" onclick="typeof exportStoreCatalogCsv===\'function\'&&exportStoreCatalogCsv()"><i class="fas fa-file-csv"></i> تصدير المتجر</button>' +
            '</div>' +
            '<pre id="admin-ai-reply" class="admin-ai-reply" aria-live="polite"></pre>';
        body.querySelectorAll('.admin-ai-mode').forEach(function(btn) {
            btn.onclick = function() {
                aiMode = btn.getAttribute('data-mode') || 'governance';
                renderAdminAiPanel();
            };
        });
        body.querySelectorAll('.admin-ai-chip').forEach(function(chip) {
            chip.onclick = function() {
                const el = document.getElementById('admin-ai-prompt');
                if (el) el.value = chip.getAttribute('data-q') || '';
            };
        });
        const btn = document.getElementById('admin-ai-send-btn');
        const applyBtn = document.getElementById('admin-ai-apply-btn');
        const promptEl = document.getElementById('admin-ai-prompt');
        const replyEl = document.getElementById('admin-ai-reply');
        if (btn && promptEl && replyEl) {
            btn.onclick = async function() {
                const p = promptEl.value.trim();
                if (!p) return;
                if (status) status.textContent = 'جاري التفكير...';
                replyEl.textContent = '';
                btn.disabled = true;
                try {
                    const data = await askNebrasAdminAi(p, aiMode);
                    if (data.ok && data.reply) {
                        replyEl.textContent = data.reply;
                        if (status) status.textContent = 'تم — ' + (aiMode === 'products' ? 'وضع المتجر' : aiMode);
                    } else if (data.error === 'ai_not_configured') {
                        replyEl.textContent = 'أضيفي ANTHROPIC_API_KEY في Vercel ثم أعيدي النشر.';
                        if (status) status.textContent = 'غير مُعد';
                    } else if (data.error === 'login_required' || data.error === 'main_admin_only') {
                        replyEl.textContent = 'سجّلي دخول الإدارة الرئيسية أولاً لتفعيل الجلسة الآمنة.';
                        if (status) status.textContent = 'يلزم دخول HQ';
                    } else {
                        replyEl.textContent = 'تعذّر الاتصال بـ Claude: ' + (data.error || 'خطأ');
                        if (status) status.textContent = 'فشل';
                    }
                } catch (e) {
                    replyEl.textContent = 'خطأ شبكة: ' + e.message;
                    if (status) status.textContent = 'فشل';
                }
                btn.disabled = false;
            };
        }
        if (applyBtn && replyEl) {
            applyBtn.onclick = function() {
                if (!tryApplyProductSuggestion(replyEl.textContent)) {
                    alert('لم يُعثر على JSON أصناف قابل للتطبيق — اطلبي من Claude إخراج JSON بصيغة: {"product_id":"prod-aluminum","variants":[...]}');
                }
            };
        }
    }

    function openNebrasAdminAi() {
        if (!isMainAdmin()) {
            alert('مساعد Claude السحابي — الإدارة الرئيسية فقط.');
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

})(typeof window !== 'undefined' ? window : globalThis);
