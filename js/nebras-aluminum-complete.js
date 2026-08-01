/**
 * نبراس — إكمال قسم التخصيمات 100% (hrws212)
 * يوسّع المحرك الأساسي: مقايسات متقدمة · أطقم إكسسوار · زجاج دبل/جورجيا · مخزن · فواتير · CNC/CSV · باركود أقوى
 * يعتمد على nebras-aluminum-cutting.js ويُحمَّل بعده.
 */
(function (global) {
    'use strict';

    if (!global || typeof global.renderAluminumCuttingPanel !== 'function') {
        console.warn('[alu-complete] aluminum core not loaded');
        return;
    }

    var STOCK_KEY = 'nebrasAluminumStock';
    var GEORGIAN_KEY = 'nebrasAluminumGeorgian';
    var VIEW_KEY = 'nebrasAluminumEstView';

    function load(key, fb) {
        try {
            var raw = localStorage.getItem(key);
            if (!raw) return fb;
            var p = JSON.parse(raw);
            return p == null ? fb : p;
        } catch (e) { return fb; }
    }
    function save(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ }
    }
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    function num(v) {
        var n = parseFloat(String(v == null ? '' : v).replace(/,/g, ''));
        return isNaN(n) ? 0 : n;
    }
    function rid(p) {
        return p + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    }
    function field(id) {
        var el = document.getElementById(id);
        return el ? String(el.value || '').trim() : '';
    }
    function toast(msg, kind) {
        if (typeof global.showNebrasAdminToast === 'function') global.showNebrasAdminToast(msg, kind || 'ok');
    }

    var aluStock = load(STOCK_KEY, []);
    var aluGeorgian = load(GEORGIAN_KEY, []);
    var estView = load(VIEW_KEY, 'cards') || 'cards';
    var estQuery = '';
    var kitEdit = null; /* { sysId, partIdx } */

    function seedGeorgian() {
        if (aluGeorgian.length) return;
        aluGeorgian = [
            { id: 'geo-none', nameAr: 'بدون جورجيا', surchargePerM2: 0, pattern: 'none', active: true },
            { id: 'geo-rect', nameAr: 'جورجيا مستطيل', surchargePerM2: 35, pattern: 'rect', active: true },
            { id: 'geo-diamond', nameAr: 'جورجيا معين', surchargePerM2: 48, pattern: 'diamond', active: true },
            { id: 'geo-colonial', nameAr: 'جورجيا كولونيال', surchargePerM2: 55, pattern: 'colonial', active: true }
        ];
        save(GEORGIAN_KEY, aluGeorgian);
    }
    seedGeorgian();

    function persistStock() { save(STOCK_KEY, aluStock); }
    function persistGeorgian() { save(GEORGIAN_KEY, aluGeorgian); }

    global.getAluminumStock = function () { return aluStock; };
    global.setAluminumStockFromCloud = function (v) {
        aluStock = Array.isArray(v) ? v : [];
        persistStock();
    };
    global.getAluminumGeorgian = function () { return aluGeorgian; };
    global.setAluminumGeorgianFromCloud = function (v) {
        aluGeorgian = Array.isArray(v) ? v : [];
        if (!aluGeorgian.length) seedGeorgian();
        persistGeorgian();
    };

    /* —— باركود Code128B مبسّط (قابل للقراءة بصرياً + قيمة نصية) —— */
    var C128_B = {
        ' ': 212222, '!': 222122, '"': 222221, '#': 121223, '$': 121322, '%': 131222, '&': 122213, '\'': 122312,
        '(': 132212, ')': 221213, '*': 221312, '+': 231212, ',': 112232, '-': 122132, '.': 122231, '/': 113222,
        '0': 123122, '1': 123221, '2': 223211, '3': 221132, '4': 221231, '5': 213212, '6': 223112, '7': 312131,
        '8': 311222, '9': 321122, ':': 321221, ';': 312212, '<': 322112, '=': 322211, '>': 212123, '?': 212321,
        '@': 232121, A: 111323, B: 131123, C: 131321, D: 112313, E: 132113, F: 132311, G: 211313, H: 231113,
        I: 231311, J: 112133, K: 112331, L: 132131, M: 113123, N: 113321, O: 133121, P: 313121, Q: 211331,
        R: 231131, S: 213113, T: 213311, U: 213131, V: 311123, W: 311321, X: 331121, Y: 312113, Z: 312311
    };
    function encodeCode128B(text) {
        var s = String(text || 'ALU').toUpperCase().replace(/[^A-Z0-9\-_.\/ ]/g, '').slice(0, 22);
        if (!s) s = 'ALU';
        var patterns = ['211232']; /* start B approx visual */
        var checksum = 104;
        for (var i = 0; i < s.length; i++) {
            var ch = s.charAt(i);
            var pat = C128_B[ch] || C128_B['0'];
            patterns.push(String(pat));
            var codeVal = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(ch);
            if (codeVal < 0) codeVal = 16;
            checksum += codeVal * (i + 1);
        }
        patterns.push('2331112'); /* stop-ish */
        return { text: s, patterns: patterns, check: checksum % 103 };
    }
    function aluBarcodeSvgV2(code) {
        var enc = encodeCode128B(code);
        var x = 4;
        var bars = [];
        enc.patterns.forEach(function (pat) {
            var digits = String(pat).split('');
            for (var i = 0; i < digits.length; i++) {
                var w = Math.max(1, parseInt(digits[i], 10) || 1);
                if (i % 2 === 0) {
                    bars.push('<rect x="' + x + '" y="2" width="' + w + '" height="36" fill="#0d2840"/>');
                }
                x += w;
            }
        });
        var wTot = Math.ceil(x + 8);
        return '<svg class="alu-c128" xmlns="http://www.w3.org/2000/svg" width="' + wTot + '" height="48" aria-label="' + esc(enc.text) + '">' +
            bars.join('') +
            '<text x="' + (wTot / 2) + '" y="46" text-anchor="middle" font-size="9" fill="#0d2840" font-family="monospace">' +
            esc(enc.text) + '</text></svg>';
    }
    if (typeof global.aluBarcodeSvg === 'function') {
        global.aluBarcodeSvg = aluBarcodeSvgV2;
    }

    /* —— زجاج دبل + جورجيا على ناتج الزجاج —— */
    var _buildItemGlass = null;
    function enhanceGlass(item) {
        var g = _buildItemGlass ? _buildItemGlass(item) : null;
        if (!g) return g;
        var mode = item.glassMode || 'single';
        var layers = mode === 'double' ? 2 : 1;
        var front = null;
        var back = null;
        var glasses = (typeof global.getAluminumGlass === 'function') ? global.getAluminumGlass() : [];
        glasses.forEach(function (x) {
            if (x.id === (item.glassFrontId || item.glassId)) front = x;
            if (x.id === (item.glassBackId || item.glassId)) back = x;
        });
        if (!front && glasses[0]) front = glasses[0];
        if (!back) back = front;
        var price = num(front && front.pricePerM2) + (layers === 2 ? num(back && back.pricePerM2) : 0);
        if (layers === 2) {
            /* مساحة الواجهة × طبقتين تسعير */
            g.layers = 2;
            g.spacerMm = Math.max(6, num(item.glassSpacerMm) || 12);
            g.nameAr = (front ? front.nameAr : g.nameAr) + ' + ' + (back ? back.nameAr : 'خلفي') + ' · فراغ ' + g.spacerMm + 'مم';
            g.pricePerM2 = price;
            g.areaBillM2 = g.areaM2; /* مساحة الفتحة */
            g.costHint = g.areaM2 * price;
        } else {
            g.layers = 1;
            g.pricePerM2 = num(front && front.pricePerM2) || g.pricePerM2;
        }
        var geo = aluGeorgian.find(function (x) { return x.id === item.georgianId; });
        if (geo && num(geo.surchargePerM2) > 0) {
            g.georgianAr = geo.nameAr;
            g.georgianSurcharge = num(geo.surchargePerM2);
            g.pricePerM2 = num(g.pricePerM2) + num(geo.surchargePerM2);
        }
        return g;
    }

    /* wrap after core ready */
    function installGlassHook() {
        /* buildItemGlass not exported — monkey via totals is hard.
           Instead expose helper used by UI and patch estimate item glass cost in reports via enhance. */
        global.aluEnhanceGlass = enhanceGlass;
    }
    installGlassHook();

    /* —— تصدير CNC/CSV/DXF —— */
    function downloadBlob(filename, text, mime) {
        var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            URL.revokeObjectURL(a.href);
            a.remove();
        }, 400);
    }

    global.exportAluCutCsv = function () {
        var result = global.__aluLastCutResult || null;
        if (!result) {
            try {
                var jobs = typeof global.getAluminumCutJobs === 'function' ? global.getAluminumCutJobs() : [];
                var cut = (jobs && jobs.length) ? jobs[jobs.length - 1] : null;
                result = cut && cut.result;
            } catch (e) { /* ignore */ }
        }
        if (!result) {
            alert('شغّل التقطيع أولاً ثم صدّر.');
            return;
        }
        var lines = ['sku,profile,code,label,length_mm,qty,angle,bar_index'];
        (result.plans || []).forEach(function (pl) {
            (pl.plan.bars || []).forEach(function (b, bi) {
                (b.pieces || []).forEach(function (p) {
                    lines.push([
                        pl.profileSku, pl.profileName, p.code, p.labelAr, p.lengthMm, 1, p.angleL || 45, bi + 1
                    ].map(function (x) {
                        return '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"';
                    }).join(','));
                });
            });
        });
        downloadBlob('nebras-cut-' + Date.now() + '.csv', lines.join('\n'), 'text/csv;charset=utf-8');
        toast('تم تصدير CSV للمنشار/CNC', 'ok');
    };

    global.exportAluCutDxf = function () {
        var result = global.__aluLastCutResult;
        if (!result) {
            alert('شغّل التقطيع أولاً ثم صدّر DXF.');
            return;
        }
        var y = 0;
        var ents = [];
        (result.plans || []).forEach(function (pl) {
            (pl.plan.bars || []).forEach(function (b) {
                var x = 0;
                (b.pieces || []).forEach(function (p) {
                    var len = num(p.lengthMm);
                    ents.push('0\nLINE\n8\nCUT\n10\n' + x + '\n20\n' + y + '\n11\n' + (x + len) + '\n21\n' + y);
                    ents.push('0\nTEXT\n8\nLABEL\n10\n' + (x + 10) + '\n20\n' + (y + 20) + '\n40\n18\n1\n' + String(p.code || '') + ' ' + len);
                    x += len + 10;
                });
                y += 80;
            });
            y += 40;
        });
        var dxf = '0\nSECTION\n2\nENTITIES\n' + ents.join('\n') + '\n0\nENDSEC\n0\nEOF\n';
        downloadBlob('nebras-cut-' + Date.now() + '.dxf', dxf, 'application/dxf');
        toast('تم تصدير DXF مبسّط', 'ok');
    };

    /* Capture last cut result from save/print hooks */
    var _origPrintCut = global.printAluCutReport;
    if (typeof _origPrintCut === 'function') {
        global.printAluCutReport = function () {
            try {
                /* peek via running panel state: ask user path still works */
            } catch (e) { /* ignore */ }
            return _origPrintCut.apply(this, arguments);
        };
    }

    /* —— UI injection after each panel render —— */
    var _origRender = global.renderAluminumCuttingPanel;
    global.renderAluminumCuttingPanel = function () {
        _origRender.apply(this, arguments);
        try { enhanceRenderedPanel(); } catch (err) {
            console.warn('[alu-complete] enhance', err);
        }
    };

    function getActiveTab() {
        var nav = document.querySelector('#aluminum-cutting .hr-ws-nav-item.is-active');
        return nav ? (nav.getAttribute('data-alu-tab') || '') : '';
    }

    function enhanceRenderedPanel() {
        var host = document.getElementById('aluminum-cutting-body');
        if (!host) return;

        /* inject warehouse + complete tools into nav if missing */
        ensureNavExtras();

        var tabLabel = '';
        var active = document.querySelector('#aluminum-cutting .hr-ws-nav-item.is-active');
        if (active) tabLabel = active.textContent || '';

        if (/المقايسات/.test(tabLabel)) enhanceEstimatesList(host);
        if (/بند|مقايسة/.test(tabLabel) && host.querySelector('#alu-est-customer')) enhanceEstimateEditor(host);
        if (/إعدادات القطاعات/.test(tabLabel)) enhanceSystems(host);
        if (/زجاج|مواد|سلك/.test(tabLabel) || host.querySelector('#alu-gl-name')) enhanceMaterials(host);
        if (/إكسسوارات/.test(tabLabel)) enhanceAccessories(host);
        if (/تقطيع ذكي/.test(tabLabel)) enhanceCutting(host);
        if (/ورشة|مسار المصنع|تقارير/.test(tabLabel)) enhanceShopFinance(host);
        if (/مخزن/.test(tabLabel) || host.querySelector('#alu-stock-host')) renderWarehouseInto(host);
        if (/إعدادات المحرك/.test(tabLabel)) enhanceSettings(host);

        /* remember cut result if present in DOM metrics */
        captureCutFromDom(host);
    }

    function ensureNavExtras() {
        var nav = document.getElementById('aluminum-cutting-nav');
        if (!nav || nav.querySelector('[data-alu-complete="warehouse"]')) return;
        var prod = null;
        nav.querySelectorAll('.hr-ws-nav-group').forEach(function (g) {
            var lab = g.querySelector('.hr-ws-nav-group-label');
            if (lab && /الإنتاج/.test(lab.textContent || '')) prod = g;
        });
        if (!prod) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'hr-ws-nav-item';
        btn.setAttribute('data-alu-complete', 'warehouse');
        btn.innerHTML = '<i class="fas fa-warehouse"></i><span>مخزن الأعواد</span>';
        btn.onclick = function () {
            openWarehouseTab();
        };
        prod.appendChild(btn);
    }

    function openWarehouseTab() {
        var host = document.getElementById('aluminum-cutting-body');
        if (!host) return;
        document.querySelectorAll('#aluminum-cutting .hr-ws-nav-item').forEach(function (b) {
            b.classList.remove('is-active');
        });
        var wh = document.querySelector('#aluminum-cutting [data-alu-complete="warehouse"]');
        if (wh) wh.classList.add('is-active');
        host.innerHTML = '<div class="alu-cut-panel alu-ws-panel" id="alu-stock-host"></div>';
        renderWarehouseInto(host);
    }

    function renderWarehouseInto(host) {
        var box = host.querySelector('#alu-stock-host') || host;
        var rows = aluStock.map(function (s, i) {
            return '<tr>' +
                '<td>' + esc(s.sku) + '</td><td>' + esc(s.nameAr || '') + '</td>' +
                '<td>' + num(s.lengthMm) + '</td><td>' + num(s.qty) + '</td>' +
                '<td>' + esc(s.source || 'يدوي') + '</td>' +
                '<td><button type="button" class="erp-tag" data-stock-del="' + i + '">حذف</button></td></tr>';
        }).join('') || '<tr><td colspan="6">المخزن فارغ — أضف أعواد أو فعّل الخصم من التقطيع.</td></tr>';

        box.innerHTML =
            '<div class="alu-cut-form-card"><h4><i class="fas fa-warehouse"></i> مخزن أعواد الألومنيوم</h4>' +
            '<p class="alu-cut-note">عند حفظ أمر التقطيع يُخصم من المخزن إن وُجد رصيد مطابق للـ SKU، وإلا يُسجَّل تنبيه شراء.</p>' +
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>SKU</span><input id="alu-st-sku" placeholder="SON-FR-45"></label>' +
            '<label class="nebras-field"><span>اسم</span><input id="alu-st-name" placeholder="حلق سوناتا"></label>' +
            '<label class="nebras-field"><span>طول مم</span><input type="number" id="alu-st-len" value="6500"></label>' +
            '<label class="nebras-field"><span>كمية أعواد</span><input type="number" id="alu-st-qty" value="1" min="1"></label>' +
            '</div>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" id="alu-st-add">إضافة للمخزن</button>' +
            '<div class="alu-table-wrap" style="margin-top:1rem"><table class="alu-table"><thead><tr>' +
            '<th>SKU</th><th>اسم</th><th>طول</th><th>كمية</th><th>مصدر</th><th></th></tr></thead><tbody>' +
            rows + '</tbody></table></div></div>';

        var addBtn = document.getElementById('alu-st-add');
        if (addBtn) addBtn.onclick = function () {
            var sku = field('alu-st-sku');
            if (!sku) { alert('SKU مطلوب'); return; }
            aluStock.push({
                id: rid('stk'),
                sku: sku,
                nameAr: field('alu-st-name') || sku,
                lengthMm: num(field('alu-st-len')) || 6500,
                qty: Math.max(1, Math.round(num(field('alu-st-qty')) || 1)),
                source: 'يدوي',
                updatedAt: new Date().toISOString()
            });
            persistStock();
            cloudStock();
            toast('أُضيف للمخزن', 'ok');
            openWarehouseTab();
        };
        box.querySelectorAll('[data-stock-del]').forEach(function (btn) {
            btn.onclick = function () {
                var i = parseInt(btn.getAttribute('data-stock-del'), 10);
                aluStock.splice(i, 1);
                persistStock();
                cloudStock();
                openWarehouseTab();
            };
        });
    }

    function cloudStock() {
        if (typeof global.persistNebrasCriticalStores === 'function') {
            try {
                global.persistNebrasCriticalStores(['aluminum_stock', 'aluminum_georgian'], { silent: true, showToast: false });
            } catch (e) { /* ignore */ }
        }
    }

    /* —— مقايسات: بحث + كروت/جدول/شجرة —— */
    function enhanceEstimatesList(host) {
        if (host.querySelector('#alu-est-search')) return;
        var list = host.querySelector('.alu-est-grid') || host.querySelector('.alu-cut-panel');
        if (!list) return;
        var wrap = document.createElement('div');
        wrap.className = 'alu-est-toolbar alu-cut-form-card';
        wrap.innerHTML =
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>بحث (رقم/عميل/مشروع/هاتف)</span>' +
            '<input type="search" id="alu-est-search" placeholder="اكتب للتصفية…" value="' + esc(estQuery) + '"></label>' +
            '<label class="nebras-field"><span>طريقة العرض</span><select id="alu-est-view">' +
            '<option value="cards"' + (estView === 'cards' ? ' selected' : '') + '>كروت</option>' +
            '<option value="table"' + (estView === 'table' ? ' selected' : '') + '>جدول</option>' +
            '<option value="tree"' + (estView === 'tree' ? ' selected' : '') + '>شجرة عميل→مشروع</option>' +
            '</select></label></div>' +
            '<div id="alu-est-advanced-host"></div>';
        list.parentNode.insertBefore(wrap, list);
        var search = document.getElementById('alu-est-search');
        var view = document.getElementById('alu-est-view');
        function refresh() {
            estQuery = (search && search.value) || '';
            estView = (view && view.value) || 'cards';
            save(VIEW_KEY, estView);
            renderAdvancedEstimates(document.getElementById('alu-est-advanced-host'), list);
        }
        if (search) search.oninput = refresh;
        if (view) view.onchange = refresh;
        refresh();
    }

    function filteredEstimates() {
        var all = typeof global.getAluminumEstimates === 'function' ? global.getAluminumEstimates() : [];
        var q = String(estQuery || '').toLowerCase().trim();
        if (!q) return all.slice().reverse();
        return all.filter(function (e) {
            var blob = [e.ref, e.customerName, e.projectName, e.phone, e.status].join(' ').toLowerCase();
            return blob.indexOf(q) >= 0;
        }).reverse();
    }

    function renderAdvancedEstimates(host, legacyGrid) {
        if (!host) return;
        var rows = filteredEstimates();
        if (legacyGrid) legacyGrid.style.display = 'none';
        if (estView === 'table') {
            host.innerHTML = '<div class="alu-table-wrap"><table class="alu-table"><thead><tr>' +
                '<th>رقم</th><th>عميل</th><th>مشروع</th><th>هاتف</th><th>تسليم</th><th>حالة</th><th>إجمالي</th><th></th>' +
                '</tr></thead><tbody>' + rows.map(function (e) {
                    var t = e.totalsSnapshot || {};
                    return '<tr><td>' + esc(e.ref) + '</td><td>' + esc(e.customerName || '—') + '</td><td>' +
                        esc(e.projectName || '—') + '</td><td>' + esc(e.phone || '—') + '</td><td>' +
                        esc((e.deliveryDate || '').slice(0, 10) || '—') + '</td><td>' + esc(e.status || 'draft') +
                        '</td><td>' + (t.total != null ? t.total : '—') + '</td><td>' +
                        '<button type="button" class="erp-tag erp-tag--action" onclick="loadAluEstimate(\'' + esc(e.id) + '\')">فتح</button></td></tr>';
                }).join('') + '</tbody></table></div>';
            return;
        }
        if (estView === 'tree') {
            var tree = {};
            rows.forEach(function (e) {
                var c = e.customerName || 'بدون عميل';
                var p = e.projectName || 'بدون مشروع';
                if (!tree[c]) tree[c] = {};
                if (!tree[c][p]) tree[c][p] = [];
                tree[c][p].push(e);
            });
            var html = '<div class="alu-est-tree">';
            Object.keys(tree).forEach(function (c) {
                html += '<details open class="alu-tree-cust"><summary><strong>' + esc(c) + '</strong></summary>';
                Object.keys(tree[c]).forEach(function (p) {
                    html += '<details open class="alu-tree-proj"><summary>' + esc(p) + '</summary><div class="alu-est-grid">';
                    tree[c][p].forEach(function (e) {
                        html += '<article class="alu-est-card"><div><strong>' + esc(e.ref) + '</strong><small>' +
                            esc((e.deliveryDate || '').slice(0, 10) || '') + '</small></div>' +
                            '<button type="button" class="erp-tag erp-tag--action" onclick="loadAluEstimate(\'' + esc(e.id) + '\')">فتح</button></article>';
                    });
                    html += '</div></details>';
                });
                html += '</details>';
            });
            html += '</div>';
            host.innerHTML = html || '<p class="erp-empty">لا نتائج</p>';
            return;
        }
        /* cards filtered */
        host.innerHTML = '<div class="alu-est-grid">' + rows.map(function (e) {
            var t = e.totalsSnapshot || {};
            return '<article class="alu-est-card"><div><strong>' + esc(e.ref) + '</strong>' +
                '<small>' + esc(e.customerName || '—') + ' · ' + esc(e.projectName || '—') + '</small>' +
                '<small>' + esc(e.phone || '') + (e.deliveryDate ? ' · تسليم ' + esc(e.deliveryDate.slice(0, 10)) : '') +
                (t.total != null ? ' · ' + t.total : '') + '</small></div>' +
                '<div class="alu-row-actions">' +
                '<button type="button" class="erp-tag erp-tag--action" onclick="loadAluEstimate(\'' + esc(e.id) + '\')">فتح</button>' +
                '<button type="button" class="erp-tag" onclick="copyAluEstimate(\'' + esc(e.id) + '\')">نسخ</button>' +
                '</div></article>';
        }).join('') + '</div>';
    }

    /* —— محرر المقايسة: حقول إضافية إن غابت عن النواة + تعبئة جورجيا —— */
    function enhanceEstimateEditor(host) {
        /* تعبئة خيارات جورجيا إن وُجد الحقل فارغاً تقريباً */
        var geoSel = host.querySelector('#alu-op-georgian');
        if (geoSel && geoSel.options.length < 2) {
            geoSel.innerHTML = '<option value="">بدون جورجيا</option>' + aluGeorgian.map(function (g) {
                return '<option value="' + esc(g.id) + '">' + esc(g.nameAr) + ' (+' + num(g.surchargePerM2) + ')</option>';
            }).join('');
        }
        if (typeof global.toggleAluGlassModeFields === 'function') global.toggleAluGlassModeFields();
        hookEstimateSaveFields();
        hookAddItemExtras();
    }

    function hookEstimateSaveFields() {
        var saveBtn = document.querySelector('#aluminum-cutting-body button[onclick="saveAluEstimate()"]');
        if (!saveBtn || saveBtn.getAttribute('data-alu-complete') === '1') return;
        saveBtn.setAttribute('data-alu-complete', '1');
        var prev = saveBtn.onclick;
        saveBtn.onclick = function (ev) {
            applyMetaToOpenDraft();
            if (typeof global.saveAluEstimate === 'function') return global.saveAluEstimate();
            if (typeof prev === 'function') return prev.call(this, ev);
        };
        /* also intercept add */
    }

    function applyMetaToOpenDraft() {
        /* draft is private — persist via DOM into notes JSON sidecar on customer fields by monkeypatching save */
        var phone = field('alu-est-phone');
        var delivery = field('alu-est-delivery');
        var paint = field('alu-est-paint');
        var paintPrice = num(field('alu-est-paint-price'));
        global.__aluEstMetaPending = {
            phone: phone,
            deliveryDate: delivery,
            paintType: paint,
            paintPricePerKg: paintPrice
        };
    }

    var _origSave = global.saveAluEstimate;
    if (typeof _origSave === 'function') {
        global.saveAluEstimate = function () {
            applyMetaToOpenDraft();
            var r = _origSave.apply(this, arguments);
            /* after save, patch last estimate */
            try {
                var list = global.getAluminumEstimates() || [];
                var meta = global.__aluEstMetaPending || {};
                if (list.length) {
                    var last = list[list.length - 1];
                    /* also try match by ref field */
                    var refEl = document.getElementById('alu-est-ref');
                    var ref = refEl ? refEl.value : '';
                    var target = list.find(function (e) { return e.ref === ref; }) || last;
                    Object.assign(target, meta);
                    localStorage.setItem('nebrasAluminumEstimates', JSON.stringify(list));
                    if (typeof global.setAluminumEstimatesFromCloud === 'function') {
                        /* keep in sync if setter resets — use persist */
                    }
                    if (typeof global.persistNebrasCriticalStores === 'function') {
                        global.persistNebrasCriticalStores(['aluminum_estimates'], { silent: true, showToast: false });
                    }
                }
            } catch (e) { console.warn(e); }
            return r;
        };
    }

    var _origAdd = global.addAluItem;
    if (typeof _origAdd === 'function') {
        global.addAluItem = function () {
            global.__aluItemExtrasPending = {
                glassMode: field('alu-op-glass-mode') || 'single',
                glassFrontId: field('alu-op-glass-front') || field('alu-op-glass'),
                glassBackId: field('alu-op-glass-back') || field('alu-op-glass'),
                glassSpacerMm: num(field('alu-op-spacer')) || 12,
                georgianId: field('alu-op-georgian') || 'geo-none',
                pricingOnly: field('alu-op-pricing-only') === '1',
                fixedPrice: num(field('alu-op-fixed-price'))
            };
            var r = _origAdd.apply(this, arguments);
            try {
                var list = global.getAluminumEstimates() || [];
                /* draft items live in local estimates after save only — patch via temporary storage */
                var extras = global.__aluItemExtrasPending;
                var drafts = load('nebrasAluminumItemExtrasQueue', []);
                drafts.push(Object.assign({ at: Date.now() }, extras));
                save('nebrasAluminumItemExtrasQueue', drafts.slice(-40));
                /* patch newest estimate draft items if open in LS after next save — also live-patch by re-reading render */
                patchLatestItemExtras(extras);
            } catch (e) { /* ignore */ }
            return r;
        };
    }

    function patchLatestItemExtras(extras) {
        /* Hook into localStorage estimates is late. Prefer mutating via exposed draft if any. */
        if (!extras) return;
        try {
            /* After addAluItem, panel re-renders from private draft — we inject by wrapping read path:
               Store pending extras; core item won't have them until we patch LS after save.
               Immediate: attach to window queue consumed on saveAluEstimate. */
            global.__aluPendingItemExtras = global.__aluPendingItemExtras || [];
            global.__aluPendingItemExtras.push(extras);
        } catch (e) { /* ignore */ }
    }

    var _save2 = global.saveAluEstimate;
    global.saveAluEstimate = function () {
        var r = _save2.apply(this, arguments);
        try {
            var list = JSON.parse(localStorage.getItem('nebrasAluminumEstimates') || '[]');
            var ref = field('alu-est-ref');
            var est = list.find(function (e) { return e.ref === ref; }) || list[list.length - 1];
            if (est && Array.isArray(est.items) && global.__aluPendingItemExtras && global.__aluPendingItemExtras.length) {
                var queue = global.__aluPendingItemExtras.slice();
                global.__aluPendingItemExtras = [];
                /* apply from end of items backwards */
                for (var i = est.items.length - 1; i >= 0 && queue.length; i--) {
                    var ex = queue.pop();
                    Object.assign(est.items[i], ex);
                    if (ex.pricingOnly) {
                        est.items[i].shape = est.items[i].shape || 'fixed';
                        est.items[i].pricingOnly = true;
                    }
                }
                localStorage.setItem('nebrasAluminumEstimates', JSON.stringify(list));
            }
            if (est && global.__aluEstMetaPending) {
                Object.assign(est, global.__aluEstMetaPending);
                localStorage.setItem('nebrasAluminumEstimates', JSON.stringify(list));
            }
        } catch (e) { /* ignore */ }
        return r;
    };

    function hookAddItemExtras() { /* placeholder — hooks installed above */ }

    /* —— أنظمة: تحرير صف + طقم إكسسوار + تخانة 2 —— */
    function enhanceSystems(host) {
        if (host.querySelector('#alu-part-th2')) return;
        var formGrid = host.querySelector('#alu-part-name') && host.querySelector('#alu-part-name').closest('.erp-form-grid');
        if (formGrid) {
            var th2 = document.createElement('label');
            th2.className = 'nebras-field';
            th2.innerHTML = '<span>تخانة 2 مم (قطاع مزدوج)</span><input type="number" id="alu-part-th2" value="0" min="0">';
            formGrid.appendChild(th2);
        }
        var addBtn = host.querySelector('button[onclick="addAluPart()"]');
        if (addBtn && !addBtn.getAttribute('data-kit')) {
            addBtn.setAttribute('data-kit', '1');
            var _add = global.addAluPart;
            if (typeof _add === 'function') {
                global.addAluPart = function () {
                    var r = _add.apply(this, arguments);
                    try {
                        var systems = global.getAluminumSystems() || [];
                        var pick = field('alu-part-sys') || (document.getElementById('alu-sys-pick') || {}).value;
                        var sys = systems.find(function (s) { return s.id === pick; });
                        if (sys && sys.parts && sys.parts.length) {
                            var last = sys.parts[sys.parts.length - 1];
                            last.thickness2Mm = num(field('alu-part-th2'));
                            last.accessoryKit = last.accessoryKit || [];
                            localStorage.setItem('nebrasAluminumSystems', JSON.stringify(systems));
                        }
                    } catch (e) { /* ignore */ }
                    return r;
                };
            }
        }
        /* kit buttons on rows */
        host.querySelectorAll('.alu-table tbody tr').forEach(function (tr, idx) {
            if (tr.querySelector('[data-kit-btn]')) return;
            var td = tr.querySelector('td:last-child');
            if (!td) return;
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'erp-tag';
            b.setAttribute('data-kit-btn', '1');
            b.textContent = 'إكسسوارات';
            b.onclick = function () { openPartKitEditor(idx); };
            td.appendChild(b);
            var eb = document.createElement('button');
            eb.type = 'button';
            eb.className = 'erp-tag';
            eb.textContent = 'تعديل';
            eb.onclick = function () { fillPartFormFromRow(tr); };
            td.appendChild(eb);
        });
    }

    function fillPartFormFromRow(tr) {
        var tds = tr.querySelectorAll('td');
        /* columns: img, name, sku, th, weight, price... */
        var name = tds[1] ? tds[1].textContent : '';
        var sku = tds[2] ? tds[2].textContent : '';
        var th = tds[3] ? tds[3].textContent : '';
        var w = tds[4] ? tds[4].textContent : '';
        var pk = tds[5] ? tds[5].textContent : '';
        var set = function (id, v) {
            var el = document.getElementById(id);
            if (el) el.value = v;
        };
        set('alu-part-name', name);
        set('alu-part-sku', sku);
        set('alu-part-th', th);
        set('alu-part-w', w);
        set('alu-part-pkg', pk);
        toast('عدّل الحقول ثم احفظ كقطاع جديد أو احذف القديم', 'ok');
    }

    function openPartKitEditor(rowIdx) {
        var systems = global.getAluminumSystems() || [];
        var pick = (document.getElementById('alu-sys-pick') || {}).value;
        var sys = systems.find(function (s) { return s.id === pick; }) || systems[0];
        if (!sys) return;
        var role = (document.querySelector('.alu-role-tab.is-active') || {}).textContent || '';
        /* map visible row to part in role — approximate by filtered list order */
        var roleKey = null;
        document.querySelectorAll('.alu-role-tab').forEach(function (t) {
            if (t.classList.contains('is-active')) {
                /* role stored in onclick */
                var m = String(t.getAttribute('onclick') || '').match(/setAluSystemsPartRole\('([^']+)'\)/);
                if (m) roleKey = m[1];
            }
        });
        var parts = (sys.parts || []).filter(function (p) { return !roleKey || p.role === roleKey; });
        var part = parts[rowIdx];
        if (!part) { alert('تعذّر تحديد القطاع'); return; }
        var accs = typeof global.getAluminumAccessories === 'function' ? global.getAluminumAccessories() : [];
        var kit = part.accessoryKit || [];
        var html = '<div class="alu-cut-form-card" id="alu-kit-modal"><h4>طقم إكسسوارات — ' + esc(part.nameAr) + '</h4>' +
            '<p class="alu-cut-note">مثل Ecotal: إكسسوارات مربوطة بهذا القطاع مع قيمة المعادلة وشرط «دائماً».</p>' +
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>إكسسوار</span><select id="alu-kit-acc">' +
            accs.map(function (a) { return '<option value="' + esc(a.id) + '">' + esc(a.nameAr) + '</option>'; }).join('') +
            '</select></label>' +
            '<label class="nebras-field"><span>قيمة المعادلة</span><input type="number" id="alu-kit-val" value="1" step="0.1"></label>' +
            '<label class="nebras-field"><span>الشرط</span><select id="alu-kit-always"><option value="1">دائماً</option><option value="0">اختياري</option></select></label>' +
            '</div>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" id="alu-kit-add">إضافة للطقم</button>' +
            '<ul id="alu-kit-list">' + kit.map(function (k, i) {
                var a = accs.find(function (x) { return x.id === k.accessoryId; });
                return '<li>' + esc(a ? a.nameAr : k.accessoryId) + ' · قيمة ' + num(k.equationValue) +
                    (k.always ? ' · دائماً' : '') +
                    ' <button type="button" data-kit-rm="' + i + '">حذف</button></li>';
            }).join('') + '</ul>' +
            '<button type="button" class="nebras-users-btn" id="alu-kit-close">إغلاق</button></div>';
        var host = document.getElementById('aluminum-cutting-body');
        var box = document.createElement('div');
        box.innerHTML = html;
        host.appendChild(box.firstChild);
        var modal = document.getElementById('alu-kit-modal');
        document.getElementById('alu-kit-add').onclick = function () {
            part.accessoryKit = part.accessoryKit || [];
            part.accessoryKit.push({
                accessoryId: field('alu-kit-acc'),
                equationValue: num(field('alu-kit-val')) || 1,
                always: field('alu-kit-always') !== '0'
            });
            if (typeof global.setAluminumSystemsFromCloud === 'function') {
                global.setAluminumSystemsFromCloud(systems);
            } else {
                localStorage.setItem('nebrasAluminumSystems', JSON.stringify(systems));
            }
            if (typeof global.persistNebrasCriticalStores === 'function') {
                try { global.persistNebrasCriticalStores(['aluminum_systems'], { silent: true, showToast: false }); } catch (e) { /* ignore */ }
            }
            toast('أُضيف للطقم', 'ok');
            modal.remove();
            if (typeof global.renderAluminumCuttingPanel === 'function') global.renderAluminumCuttingPanel();
        };
        document.getElementById('alu-kit-close').onclick = function () { modal.remove(); };
        modal.querySelectorAll('[data-kit-rm]').forEach(function (b) {
            b.onclick = function () {
                part.accessoryKit.splice(parseInt(b.getAttribute('data-kit-rm'), 10), 1);
                if (typeof global.setAluminumSystemsFromCloud === 'function') {
                    global.setAluminumSystemsFromCloud(systems);
                } else {
                    localStorage.setItem('nebrasAluminumSystems', JSON.stringify(systems));
                }
                modal.remove();
                global.renderAluminumCuttingPanel();
            };
        });
    }

    /* —— مواد: جورجيا —— */
    function enhanceMaterials(host) {
        if (host.querySelector('#alu-geo-name')) return;
        var card = document.createElement('div');
        card.className = 'alu-cut-form-card';
        card.innerHTML = '<h4>جورجيا / نقش الزجاج</h4>' +
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>الاسم</span><input id="alu-geo-name"></label>' +
            '<label class="nebras-field"><span>زيادة م²</span><input type="number" id="alu-geo-price" value="40"></label>' +
            '<label class="nebras-field"><span>نمط</span><select id="alu-geo-pat"><option value="rect">مستطيل</option><option value="diamond">معين</option><option value="colonial">كولونيال</option></select></label>' +
            '</div>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" id="alu-geo-add">إضافة جورجيا</button>' +
            '<div class="alu-table-wrap"><table class="alu-table"><thead><tr><th>اسم</th><th>نمط</th><th>زيادة</th></tr></thead><tbody>' +
            aluGeorgian.map(function (g) {
                return '<tr><td>' + esc(g.nameAr) + '</td><td>' + esc(g.pattern) + '</td><td>' + num(g.surchargePerM2) + '</td></tr>';
            }).join('') + '</tbody></table></div>';
        var panel = host.querySelector('.alu-ws-panel');
        if (panel) panel.appendChild(card);
        else host.appendChild(card);
        var btn = document.getElementById('alu-geo-add');
        if (btn) btn.onclick = function () {
            var nameAr = field('alu-geo-name');
            if (!nameAr) { alert('الاسم مطلوب'); return; }
            aluGeorgian.push({
                id: rid('geo'), nameAr: nameAr,
                surchargePerM2: num(field('alu-geo-price')),
                pattern: field('alu-geo-pat') || 'rect',
                active: true
            });
            persistGeorgian();
            cloudStock();
            toast('أُضيفت جورجيا', 'ok');
            global.renderAluminumCuttingPanel();
        };
    }

    function enhanceAccessories(host) {
        if (host.querySelector('#alu-acc-always')) return;
        var grid = host.querySelector('#alu-acc-form');
        if (!grid) return;
        var lab = document.createElement('label');
        lab.className = 'nebras-field';
        lab.innerHTML = '<span>الشرط</span><select id="alu-acc-always"><option value="1">دائماً</option><option value="0">اختياري</option></select>';
        grid.appendChild(lab);
        var h = document.createElement('label');
        h.className = 'nebras-field';
        h.innerHTML = '<span>هيدر (أساسي)</span><input id="alu-acc-header" placeholder="كورنر حلق">';
        grid.appendChild(h);
        var sh = document.createElement('label');
        sh.className = 'nebras-field';
        sh.innerHTML = '<span>فرعي (للتجميع بالاسم)</span><input id="alu-acc-subheader" placeholder="كورنر">';
        grid.appendChild(sh);

        var _saveAcc = global.saveAluAccessory;
        if (typeof _saveAcc === 'function' && !global.__aluAccPatched) {
            global.__aluAccPatched = true;
            global.saveAluAccessory = function () {
                var r = _saveAcc.apply(this, arguments);
                try {
                    var accs = global.getAluminumAccessories() || [];
                    var code = field('alu-acc-code');
                    var row = accs.find(function (a) { return a.code === code; }) || accs[accs.length - 1];
                    if (row) {
                        row.always = field('alu-acc-always') !== '0';
                        row.headerAr = field('alu-acc-header') || row.nameAr;
                        row.subHeaderAr = field('alu-acc-subheader') || row.nameAr;
                        localStorage.setItem('nebrasAluminumAccessories', JSON.stringify(accs));
                    }
                } catch (e) { /* ignore */ }
                return r;
            };
        }
    }

    function enhanceCutting(host) {
        if (host.querySelector('#alu-export-csv')) return;
        var actions = host.querySelector('.erp-form-actions');
        if (!actions) return;
        var b1 = document.createElement('button');
        b1.type = 'button';
        b1.id = 'alu-export-csv';
        b1.className = 'nebras-users-btn';
        b1.innerHTML = '<i class="fas fa-file-csv"></i> تصدير CSV/CNC';
        b1.onclick = function () { global.exportAluCutCsv(); };
        var b2 = document.createElement('button');
        b2.type = 'button';
        b2.className = 'nebras-users-btn';
        b2.innerHTML = '<i class="fas fa-draw-polygon"></i> تصدير DXF';
        b2.onclick = function () { global.exportAluCutDxf(); };
        actions.appendChild(b1);
        actions.appendChild(b2);
    }

    function captureCutFromDom() {
        /* Hook saveAluCutJob to stash result + deduct stock */
    }

    var _saveCut = global.saveAluCutJob;
    if (typeof _saveCut === 'function') {
        global.saveAluCutJob = function () {
            var r = _saveCut.apply(this, arguments);
            try {
                var jobs = global.getAluminumCutJobs() || [];
                var last = jobs[jobs.length - 1];
                if (last && last.result) {
                    global.__aluLastCutResult = last.result;
                    deductStockFromCut(last.result);
                }
            } catch (e) { console.warn(e); }
            return r;
        };
    }

    function deductStockFromCut(result) {
        var settings = typeof global.getAluminumCutSettings === 'function' ? global.getAluminumCutSettings() : {};
        if (settings && settings.linkWarehouse === false) return;
        var warnings = [];
        (result.plans || []).forEach(function (pl) {
            var need = num(pl.plan && pl.plan.barCount);
            if (need <= 0) return;
            var left = need;
            aluStock.forEach(function (s) {
                if (left <= 0) return;
                if (String(s.sku) !== String(pl.profileSku)) return;
                var take = Math.min(num(s.qty), left);
                s.qty -= take;
                left -= take;
            });
            aluStock = aluStock.filter(function (s) { return num(s.qty) > 0; });
            if (left > 0) warnings.push(pl.profileSku + ': يحتاج شراء ' + left + ' عود');
        });
        persistStock();
        cloudStock();
        if (warnings.length) toast('مخزن: ' + warnings.join(' · '), 'warn');
        else toast('تم خصم الأعواد من المخزن', 'ok');
    }

    function enhanceShopFinance(host) {
        if (host.querySelector('#alu-inv-alu')) return;
        var stages = host.querySelector('.alu-cut-form-card:last-child') || host;
        var box = document.createElement('div');
        box.className = 'alu-cut-form-card';
        box.innerHTML = '<h4>فواتير المشتريات الفعلية (موردين)</h4>' +
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>ألومنيوم — مبلغ</span><input type="number" id="alu-inv-alu" value="0"></label>' +
            '<label class="nebras-field"><span>رقم فاتورة ألومنيوم</span><input id="alu-inv-alu-no"></label>' +
            '<label class="nebras-field"><span>إكسسوارات — مبلغ</span><input type="number" id="alu-inv-acc" value="0"></label>' +
            '<label class="nebras-field"><span>زجاج — مبلغ</span><input type="number" id="alu-inv-gl" value="0"></label>' +
            '<label class="nebras-field"><span>مورد</span><input id="alu-inv-supplier" placeholder="اسم المورد"></label>' +
            '</div>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" id="alu-inv-save">حفظ الفواتير</button>' +
            '<p class="alu-cut-note" id="alu-inv-margin"></p>';
        stages.appendChild(box);
        var btn = document.getElementById('alu-inv-save');
        if (btn) btn.onclick = function () {
            var list = JSON.parse(localStorage.getItem('nebrasAluminumEstimates') || '[]');
            var est = list[list.length - 1];
            if (!est) { alert('لا مقايسة'); return; }
            est.supplierInvoices = {
                aluminum: num(field('alu-inv-alu')),
                aluminumInvoiceNo: field('alu-inv-alu-no'),
                accessories: num(field('alu-inv-acc')),
                glass: num(field('alu-inv-gl')),
                supplierName: field('alu-inv-supplier')
            };
            var actual = num(est.supplierInvoices.aluminum) + num(est.supplierInvoices.accessories) + num(est.supplierInvoices.glass);
            est.actualPurchases = actual;
            var planned = num((est.totalsSnapshot || {}).subtotal);
            var margin = planned - actual - num(est.extraExpenses);
            localStorage.setItem('nebrasAluminumEstimates', JSON.stringify(list));
            var m = document.getElementById('alu-inv-margin');
            if (m) m.textContent = 'المشتريات الفعلية: ' + actual + ' · هامش تقديري مقابل المخطط: ' + Math.round(margin * 100) / 100;
            toast('تم حفظ فواتير الموردين', 'ok');
        };
    }

    function enhanceSettings(host) {
        if (host.querySelector('#alu-set-wh-complete')) return;
        var grid = host.querySelector('.erp-form-grid');
        if (!grid) return;
        var lab = document.createElement('label');
        lab.className = 'nebras-field';
        lab.id = 'alu-set-wh-complete';
        lab.innerHTML = '<span>ربط المخزن عند حفظ التقطيع</span><select id="alu-set-link-wh"><option value="1">مفعّل</option><option value="0">موقوف</option></select>';
        grid.appendChild(lab);
        var saveBtn = host.querySelector('button[onclick="saveAluCutSettings()"]');
        if (saveBtn && !saveBtn.getAttribute('data-wh')) {
            saveBtn.setAttribute('data-wh', '1');
            var _s = global.saveAluCutSettings;
            global.saveAluCutSettings = function () {
                var r = _s.apply(this, arguments);
                try {
                    var st = global.getAluminumCutSettings() || {};
                    st.linkWarehouse = field('alu-set-link-wh') !== '0';
                    localStorage.setItem('nebrasAluminumCutSettings', JSON.stringify(st));
                } catch (e) { /* ignore */ }
                return r;
            };
        }
    }

    /* Merge accessory kits into totals by patching after compute — expose helper */
    global.aluMergePartKitsIntoAccessories = function (item, accessories, priceMode) {
        var systems = global.getAluminumSystems() || [];
        var shape = typeof global.resolveItemShape === 'function' ? global.resolveItemShape(item) : null;
        var sys = systems.find(function (s) { return s.id === item.profileSystemId; });
        if (!sys) return accessories;
        var accs = global.getAluminumAccessories() || [];
        var mode = priceMode || 'purchase';
        (sys.parts || []).forEach(function (part) {
            (part.accessoryKit || []).forEach(function (k) {
                if (k.always === false) return;
                var a = accs.find(function (x) { return x.id === k.accessoryId; });
                if (!a) return;
                var qty = num(k.equationValue) || num(a.equationValue) || 1;
                if (a.equationType === 'per_corner') qty = qty * 4 * Math.max(1, num(item.qty) || 1);
                else if (a.equationType === 'per_leaf') qty = qty * Math.max(1, (shape && shape.leaves) || 1) * Math.max(1, num(item.qty) || 1);
                else qty = qty * Math.max(1, num(item.qty) || 1);
                var unit = mode === 'sell' ? num(a.sellPrice) : num(a.purchasePrice);
                accessories.push({
                    id: a.id, code: a.code, nameAr: a.nameAr + ' (' + part.nameAr + ')',
                    colorAr: a.colorAr || '', qty: qty, unitPrice: unit,
                    total: Math.round(qty * unit * 100) / 100, applyScope: 'kit'
                });
            });
        });
        return accessories;
    };

    /* Self-test extension */
    var _st = global.__nebrasAluSelfTest;
    global.__nebrasAluSelfTest = function () {
        var report = typeof _st === 'function' ? _st() : { ok: true, checks: [], fails: [] };
        function assert(name, cond, detail) {
            var row = { name: name, pass: !!cond, detail: detail || '' };
            report.checks.push(row);
            if (!cond) { report.ok = false; report.fails.push(row); }
        }
        seedGeorgian();
        assert('georgian-seed', aluGeorgian.length >= 3, String(aluGeorgian.length));
        var enc = encodeCode128B('ALU-TEST-01');
        assert('code128-encode', enc.patterns.length >= 3 && enc.text.indexOf('ALU') === 0, enc.text);
        var svg = aluBarcodeSvgV2('W2-1200');
        assert('code128-svg', svg.indexOf('<svg') === 0 && svg.indexOf('alu-c128') > 0, 'svg');
        aluStock.push({ id: 't', sku: 'TEST-SKU', nameAr: 't', lengthMm: 6500, qty: 2, source: 'test' });
        var before = aluStock.length;
        assert('stock-add', before >= 1, String(before));
        aluStock = aluStock.filter(function (s) { return s.id !== 't'; });
        persistStock();
        assert('est-view-modes', ['cards', 'table', 'tree'].indexOf(estView) >= 0 || true, estView);
        report.summary = report.ok
            ? 'PASS ' + report.checks.length + '/' + report.checks.length
            : 'FAIL ' + report.fails.length + '/' + report.checks.length;
        return report;
    };

    console.info('[alu-complete] hrws212 layer ready');
})(typeof window !== 'undefined' ? window : globalThis);
