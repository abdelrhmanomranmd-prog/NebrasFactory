/* Phase 20 — Enterprise store checkout + payment methods */

    function getCheckoutPaymentMethod() {
        const p = getCheckoutProfile();
        return p.paymentMethod || 'bank_transfer';
    }

    function setCheckoutPaymentMethod(method) {
        const p = getCheckoutProfile();
        p.paymentMethod = method || 'bank_transfer';
        saveCheckoutProfile(p);
        const mount = document.getElementById('cart-payment-mount');
        if (mount && nebrasCart.length) {
            mount.innerHTML = buildCartEnterprisePaymentHtml(currentLang || 'ar');
        }
    }

    function buildCartEnterprisePaymentHtml(lang) {
        lang = lang || currentLang || 'ar';
        const ui = siteText[lang] || siteText.ar;
        const method = getCheckoutPaymentMethod();
        const methods = [
            { id: 'bank_transfer', icon: 'fas fa-building-columns', label: ui.payBankTransfer || 'حوالة بنكية', sub: ui.payBankSub || 'نشط — حسابات نبراس الرسمية', active: true },
            { id: 'mada', icon: 'fas fa-credit-card', label: 'mada مدى', sub: ui.paySoon || 'قريباً — بوابة دفع', active: false },
            { id: 'visa_mc', icon: 'fab fa-cc-visa', label: 'Visa / Mastercard', sub: ui.paySoon || 'قريباً', active: false },
            { id: 'apple_pay', icon: 'fab fa-apple-pay', label: 'Apple Pay', sub: ui.paySoon || 'قريباً', active: false },
            { id: 'tabby', icon: 'fas fa-calendar-check', label: 'Tabby تقسيط', sub: ui.paySoon || 'قريباً', active: false },
            { id: 'tamara', icon: 'fas fa-wallet', label: 'Tamara تمارا', sub: ui.paySoon || 'قريباً', active: false }
        ];
        const grid = methods.map(function(m) {
            const sel = method === m.id ? ' is-selected' : '';
            const dis = m.active ? '' : ' is-disabled';
            const click = m.active ? 'onclick="setCheckoutPaymentMethod(\'' + m.id + '\')"' : '';
            return '<button type="button" class="cart-pay-method' + sel + dis + '" ' + click + '>' +
                '<i class="' + m.icon + '"></i>' +
                '<strong>' + escapeHtmlAttr(m.label) + '</strong>' +
                '<small>' + escapeHtmlAttr(m.sub) + '</small>' +
                (m.active ? '<span class="cart-pay-method-badge">' + escapeHtmlAttr(ui.payActive || 'متاح') + '</span>' : '') +
            '</button>';
        }).join('');
        const trust = '<div class="cart-enterprise-trust">' +
            '<span><i class="fas fa-shield-halved"></i> ' + escapeHtmlAttr(ui.cartTrustSecure || 'دفع آمن') + '</span>' +
            '<span><i class="fas fa-file-invoice"></i> ' + escapeHtmlAttr(ui.cartTrustVat || 'ضريبة 15% — فاتورة رسمية') + '</span>' +
            '<span><i class="fas fa-truck"></i> ' + escapeHtmlAttr(ui.cartTrustDelivery || 'تسليم لكل فروع المملكة') + '</span>' +
            '<span><i class="fas fa-headset"></i> ' + escapeHtmlAttr(ui.cartTrustSupport || 'متابعة مبيعات وخدمة عملاء') + '</span></div>';
        const bankBlock = method === 'bank_transfer' ? buildCartBankPaymentHtmlCore(lang) : '';
        return '<section class="cart-enterprise-pay" aria-labelledby="cart-enterprise-pay-title">' +
            '<h3 id="cart-enterprise-pay-title"><i class="fas fa-wallet"></i> ' + escapeHtmlAttr(ui.cartPaymentMethodsTitle || 'طرق الدفع') + '</h3>' +
            '<p class="cart-payment-intro">' + escapeHtmlAttr(ui.cartPaymentMethodsIntro || 'حوالة بنكية نشطة الآن — بطاقات وتقسيط قريباً عبر بوابة دفع معتمدة.') + '</p>' +
            trust +
            '<div class="cart-pay-methods-grid">' + grid + '</div>' +
            bankBlock +
        '</section>';
    }
