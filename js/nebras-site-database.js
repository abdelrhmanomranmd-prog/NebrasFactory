/**
 * نبراس — قاعدة بيانات الموقع (استيراد/تصدير)
 * Excel · PDF · Word — للإدارة الرئيسية فقط (ليس JSON للمستخدم)
 */
(function(global) {
    'use strict';

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function csvCell(v) {
        const s = String(v == null ? '' : v);
        if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    }

    function requireMain() {
        if (typeof global.isMainGovernanceAdmin === 'function' && global.isMainGovernanceAdmin()) return true;
        alert('قاعدة بيانات الموقع — الإدارة الرئيسية فقط.');
        return false;
    }

    function downloadBlob(blob, filename) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function buildExcelSheet(name, headers, rows) {
        let table = '<table border="1"><thead><tr>';
        headers.forEach(function(h) { table += '<th>' + esc(h) + '</th>'; });
        table += '</tr></thead><tbody>';
        rows.forEach(function(row) {
            table += '<tr>';
            row.forEach(function(c) { table += '<td>' + esc(c) + '</td>'; });
            table += '</tr>';
        });
        table += '</tbody></table>';
        return '<x:ExcelWorksheet><x:Name>' + esc(name).slice(0, 31) + '</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>' + table + '</x:ExcelWorksheet>';
    }

    function collectSiteDatabaseSheets() {
        const sheets = [];
        const products = global.siteProducts || [];
        const prodRows = [];
        products.forEach(function(p) {
            if (!p) return;
            const variants = p.variants && p.variants.length ? p.variants : [{ typeAr: '', sizeAr: '', colorAr: '', sku: '', price: 0 }];
            variants.forEach(function(v) {
                prodRows.push([
                    p.id, p.titleAr || '', p.titleEn || '', v.typeAr || '', v.sizeAr || '', v.colorAr || '',
                    v.sku || '', v.price || 0, p.visible !== false ? 'نعم' : 'لا', p.inStock === false ? 'لا' : 'نعم'
                ]);
            });
        });
        sheets.push({
            name: 'منتجات_المتجر',
            headers: ['product_id', 'product_ar', 'product_en', 'type_ar', 'size_ar', 'color_ar', 'sku', 'price_ex_vat', 'visible', 'in_stock'],
            rows: prodRows
        });

        const colors = typeof global.getNebrasColorCatalog === 'function' ? global.getNebrasColorCatalog() : [];
        sheets.push({
            name: 'كتالوج_20_لون',
            headers: ['code', 'name_ar', 'name_en', 'neb_code', 'catalog_index'],
            rows: colors.map(function(c, i) {
                return [c.code || '', c.labelAr || '', c.labelEn || '', c.nebCode || '', c.catalogIndex != null ? c.catalogIndex : i];
            })
        });

        const users = global.adminUsers || [];
        sheets.push({
            name: 'المستخدمون',
            headers: ['id', 'username', 'role', 'branch', 'active', 'phone'],
            rows: users.map(function(u) {
                return [u.id, u.username, u.role, u.assignedBranchCity || '', u.isActive !== false ? 'نعم' : 'لا', u.phone || ''];
            })
        });

        const quotes = typeof global.loadSalesQuotesInbox === 'function' ? global.loadSalesQuotesInbox() : [];
        sheets.push({
            name: 'عروض_المبيعات',
            headers: ['quote_no', 'date', 'customer', 'phone', 'city', 'status', 'total_inc', 'lines'],
            rows: quotes.map(function(e) {
                return [
                    e.quoteNo, new Date(e.at || 0).toISOString().slice(0, 10),
                    e.customerName, e.phone, e.city, e.status, e.totalIncVat || e.total,
                    (e.lines || []).length
                ];
            })
        });

        const inv = global.erpInventory || [];
        sheets.push({
            name: 'مخزون_ERP',
            headers: ['sku', 'name_ar', 'warehouse', 'qty', 'min_qty', 'unit'],
            rows: inv.map(function(e) {
                return [e.sku, e.nameAr, e.warehouseAr || e.warehouseEn, e.qty, e.minQty, e.unitAr];
            })
        });

        const crm = typeof global.getCrmCustomers === 'function' ? global.getCrmCustomers() : [];
        sheets.push({
            name: 'عملاء_CRM',
            headers: ['id', 'name', 'phone', 'email', 'city', 'source'],
            rows: crm.map(function(c) {
                return [c.id, c.name || c.nameAr, c.phone, c.email, c.city, c.source];
            })
        });

        const prod = global.erpProduction || [];
        sheets.push({
            name: 'الإنتاج_اليومي',
            headers: ['date', 'product', 'qty', 'warehouse', 'note'],
            rows: prod.map(function(e) {
                return [e.date, e.productAr || e.product, e.qty, e.warehouseAr || '', e.note || ''];
            })
        });

        const portal = typeof global.getCustomerPortalUsers === 'function' ? global.getCustomerPortalUsers() : [];
        sheets.push({
            name: 'عملاء_البوابة',
            headers: ['username', 'display_name', 'phone', 'email', 'rep', 'branch'],
            rows: portal.map(function(u) {
                return [u.username, u.displayName, u.phone, u.email, u.assignedRepUsername || '', u.branchCity || ''];
            })
        });

        return sheets;
    }

    function exportNebrasSiteDatabaseExcel() {
        if (!requireMain()) return;
        const sheets = collectSiteDatabaseSheets();
        let worksheets = '';
        sheets.forEach(function(s) {
            worksheets += buildExcelSheet(s.name, s.headers, s.rows);
        });
        const html = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>' +
            '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">' +
            '<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>' +
            worksheets + '</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>' +
            sheets.map(function(s) {
                return '<h2>' + esc(s.name) + '</h2><table border="1"><thead><tr>' +
                    s.headers.map(function(h) { return '<th>' + esc(h) + '</th>'; }).join('') +
                    '</tr></thead><tbody>' +
                    s.rows.map(function(row) {
                        return '<tr>' + row.map(function(c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>';
                    }).join('') + '</tbody></table><br/>';
            }).join('') + '</body></html>';
        const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
        downloadBlob(blob, 'nebras-database-' + new Date().toISOString().slice(0, 10) + '.xls');
        if (typeof global.addAuditLog === 'function') global.addAuditLog('تصدير قاعدة بيانات', 'Excel — ' + sheets.length + ' جداول');
    }

    function exportNebrasSiteDatabasePdf() {
        if (!requireMain()) return;
        const sheets = collectSiteDatabaseSheets();
        const win = window.open('', '_blank');
        if (!win) { alert('اسمحي بفتح نافذة للتقرير.'); return; }
        let body = '<h1>قاعدة بيانات نبراس — تقرير PDF</h1><p>تاريخ: ' + new Date().toLocaleString('ar-SA') + '</p>';
        sheets.forEach(function(s) {
            body += '<h2>' + esc(s.name) + ' (' + s.rows.length + ' سجل)</h2>';
            body += '<table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:11px">';
            body += '<thead><tr>' + s.headers.map(function(h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>';
            s.rows.slice(0, 200).forEach(function(row) {
                body += '<tr>' + row.map(function(c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>';
            });
            if (s.rows.length > 200) body += '<tr><td colspan="' + s.headers.length + '">… +' + (s.rows.length - 200) + ' سجل إضافي (راجعي Excel)</td></tr>';
            body += '</tbody></table><br/>';
        });
        win.document.write('<html dir="rtl"><head><meta charset="utf-8"><title>قاعدة بيانات نبراس</title>' +
            '<style>body{font-family:Cairo,Tahoma,sans-serif;padding:24px;color:#0d2840}h1{border-bottom:3px solid #00a8ff}' +
            'table{margin-bottom:20px}th{background:#155e94;color:#fff}</style></head><body>' + body + '</body></html>');
        win.document.close();
        win.focus();
        win.print();
        if (typeof global.addAuditLog === 'function') global.addAuditLog('تصدير قاعدة بيانات', 'PDF');
    }

    function exportNebrasSiteDatabaseWord() {
        if (!requireMain()) return;
        const sheets = collectSiteDatabaseSheets();
        let body = '<h1>قاعدة بيانات مصنع نبراس للبلاستيك</h1><p>تاريخ التصدير: ' + new Date().toLocaleString('ar-SA') + '</p>';
        sheets.forEach(function(s) {
            body += '<h2>' + esc(s.name) + '</h2><table border="1"><tr>';
            body += s.headers.map(function(h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr>';
            s.rows.forEach(function(row) {
                body += '<tr>' + row.map(function(c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>';
            });
            body += '</table><br/>';
        });
        const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" dir="rtl">' +
            '<head><meta charset="utf-8"><title>قاعدة بيانات نبراس</title></head><body>' + body + '</body></html>';
        const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
        downloadBlob(blob, 'nebras-database-' + new Date().toISOString().slice(0, 10) + '.doc');
        if (typeof global.addAuditLog === 'function') global.addAuditLog('تصدير قاعدة بيانات', 'Word');
    }

    function exportNebrasSiteImportTemplate() {
        if (!requireMain()) return;
        const template = [
            ['=== قالب استيراد نبراس — احفظي كـ Excel ثم عدّلي ==='],
            [],
            ['[منتجات_المتجر]'],
            ['product_id', 'product_ar', 'product_en', 'type_ar', 'size_ar', 'color_ar', 'sku', 'price_ex_vat', 'visible', 'in_stock'],
            ['prod-aluminum', 'ألومنيوم نبراس', 'Nebras Aluminum', 'بروفيل', '6م', 'فضي', 'ALU-001', '150', 'نعم', 'نعم'],
            [],
            ['[كتالوج_20_لون]'],
            ['code', 'name_ar', 'name_en', 'neb_code', 'catalog_index'],
            ['N-1', 'تيك ذهبي', 'Golden Teak', 'NEB-1', '0'],
            [],
            ['[عملاء_CRM]'],
            ['name', 'phone', 'email', 'city', 'source'],
            ['عميل تجريبي', '0555000000', 'client@email.com', 'الرياض', 'import']
        ];
        const csv = template.map(function(row) { return row.map(csvCell).join(','); }).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        downloadBlob(blob, 'nebras-import-template.csv');
        alert('قالب الاستيراد — افتحيه في Excel · عدّلي البيانات · احفظي CSV · ثم «استيراد من Excel»');
    }

    function parseImportSections(text) {
        const lines = String(text || '').split(/\r?\n/);
        const sections = {};
        let current = null;
        lines.forEach(function(line) {
            const t = line.trim();
            if (!t) return;
            const sec = t.match(/^\[(.+)\]$/);
            if (sec) {
                current = sec[1];
                sections[current] = [];
                return;
            }
            if (t.indexOf('===') === 0) return;
            if (!current) return;
            sections[current].push(line);
        });
        return sections;
    }

    function parseCsvLines(lines) {
        if (!lines || !lines.length) return { headers: [], rows: [] };
        const headers = lines[0].split(',').map(function(h) { return h.replace(/^"|"$/g, '').trim(); });
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(function(c) { return c.replace(/^"|"$/g, '').trim(); });
            if (!cols.join('').trim()) continue;
            rows.push(cols);
        }
        return { headers: headers, rows: rows };
    }

    function importProductsFromRows(rows, headers) {
        const idx = function(name) { return headers.indexOf(name); };
        const byProduct = {};
        rows.forEach(function(row) {
            const pid = row[idx('product_id')] || row[0];
            if (!pid) return;
            if (!byProduct[pid]) {
                const existing = (global.siteProducts || []).find(function(p) { return p && p.id === pid; });
                byProduct[pid] = existing ? Object.assign({}, existing, { variants: (existing.variants || []).slice() }) : {
                    id: pid, titleAr: row[idx('product_ar')] || pid, titleEn: row[idx('product_en')] || '',
                    visible: row[idx('visible')] !== 'لا', inStock: row[idx('in_stock')] !== 'لا', variants: []
                };
            }
            const p = byProduct[pid];
            if (row[idx('product_ar')]) p.titleAr = row[idx('product_ar')];
            if (row[idx('product_en')]) p.titleEn = row[idx('product_en')];
            p.variants.push({
                typeAr: row[idx('type_ar')] || '', sizeAr: row[idx('size_ar')] || '', colorAr: row[idx('color_ar')] || '',
                sku: row[idx('sku')] || '', price: Number(row[idx('price_ex_vat')]) || 0
            });
        });
        const imported = Object.keys(byProduct).length;
        if (!imported) return 0;
        const others = (global.siteProducts || []).filter(function(p) { return p && !byProduct[p.id]; });
        global.siteProducts = others.concat(Object.keys(byProduct).map(function(k) { return byProduct[k]; }));
        if (typeof global.saveContentData === 'function') global.saveContentData();
        else if (typeof global.saveSystemData === 'function') global.saveSystemData();
        if (typeof global.refreshPublicSiteFromGovernance === 'function') global.refreshPublicSiteFromGovernance();
        return imported;
    }

    function importColorsFromRows(rows, headers) {
        const idx = function(name) { return headers.indexOf(name); };
        const colors = rows.map(function(row, i) {
            return {
                code: row[idx('code')] || ('N-' + (i + 1)),
                labelAr: row[idx('name_ar')] || row[idx('code')] || '',
                labelEn: row[idx('name_en')] || '',
                nebCode: row[idx('neb_code')] || '',
                catalogIndex: Number(row[idx('catalog_index')]) || i,
                isRoll: true
            };
        }).filter(function(c) { return c.labelAr || c.code; });
        if (!colors.length) return 0;
        if (!global.systemSettings) global.systemSettings = {};
        if (!global.systemSettings.doorDesigner) global.systemSettings.doorDesigner = {};
        global.systemSettings.doorDesigner.colors = colors;
        if (typeof global.saveSystemData === 'function') global.saveSystemData();
        if (typeof global.refreshNebrasColorCatalogSite === 'function') global.refreshNebrasColorCatalogSite();
        return colors.length;
    }

    function importNebrasSiteDatabaseFromFile(file) {
        if (!requireMain()) return;
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function() {
            try {
                let text = String(reader.result || '');
                let sections = parseImportSections(text);
                if (!Object.keys(sections).length && text.indexOf('<table') >= 0) {
                    const doc = new DOMParser().parseFromString(text, 'text/html');
                    doc.querySelectorAll('h2, h3').forEach(function(h) {
                        const name = h.textContent.trim();
                        const table = h.nextElementSibling;
                        if (table && table.tagName === 'TABLE') {
                            const rows = [];
                            table.querySelectorAll('tr').forEach(function(tr) {
                                rows.push(Array.from(tr.querySelectorAll('th,td')).map(function(td) { return td.textContent.trim(); }).join(','));
                            });
                            sections[name] = rows;
                        }
                    });
                }
                if (!Object.keys(sections).length) {
                    sections['data'] = text.split(/\r?\n/);
                }
                let total = 0;
                Object.keys(sections).forEach(function(key) {
                    const parsed = parseCsvLines(sections[key]);
                    if (key.indexOf('منتج') >= 0 || key.indexOf('product') >= 0) {
                        total += importProductsFromRows(parsed.rows, parsed.headers);
                    } else if (key.indexOf('لون') >= 0 || key.indexOf('color') >= 0) {
                        total += importColorsFromRows(parsed.rows, parsed.headers);
                    }
                });
                if (!total) {
                    alert('لم يُعثر على بيانات قابلة للاستيراد — استخدمي قالب الاستيراد.');
                    return;
                }
                if (typeof global.addAuditLog === 'function') global.addAuditLog('استيراد قاعدة بيانات', 'Excel/CSV — ' + total + ' سجل');
                alert('تم الاستيراد بنجاح — ' + total + ' سجل. البيانات محفوظة ومتصلة بالموقع.');
            } catch (e) {
                alert('تعذّر قراءة الملف — تأكدي من صيغة Excel أو CSV.');
            }
        };
        reader.readAsText(file, 'UTF-8');
    }

    function openNebrasSiteDatabaseImportPicker() {
        if (!requireMain()) return;
        let input = document.getElementById('nebras-site-db-import-input');
        if (!input) {
            input = document.createElement('input');
            input.type = 'file';
            input.id = 'nebras-site-db-import-input';
            input.accept = '.csv,.xls,.xlsx,.txt,text/csv,application/vnd.ms-excel';
            input.hidden = true;
            input.addEventListener('change', function(ev) {
                const f = ev.target.files && ev.target.files[0];
                if (f) importNebrasSiteDatabaseFromFile(f);
                input.value = '';
            });
            document.body.appendChild(input);
        }
        input.click();
    }

    function exportStorageAuditExcel() {
        if (!requireMain()) return;
        const specs = typeof global.NEBRAS_CLOUD_STORE_SPECS !== 'undefined' ? global.NEBRAS_CLOUD_STORE_SPECS : [];
        const rows = specs.map(function(s) {
            let count = 0;
            try {
                const p = s.get();
                count = Array.isArray(p) ? p.length : (p && typeof p === 'object' ? Object.keys(p).length : 1);
            } catch (e) { count = 0; }
            return [s.key, count];
        });
        const html = '<html dir="rtl"><head><meta charset="utf-8"></head><body><h2>تدقيق مخازن نبراس</h2><table border="1">' +
            '<tr><th>المخزن</th><th>عدد السجلات</th></tr>' +
            rows.map(function(r) { return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>'; }).join('') +
            '</table></body></html>';
        const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
        downloadBlob(blob, 'nebras-storage-audit-' + Date.now() + '.xls');
    }

    global.exportNebrasSiteDatabaseExcel = exportNebrasSiteDatabaseExcel;
    global.exportNebrasSiteDatabasePdf = exportNebrasSiteDatabasePdf;
    global.exportNebrasSiteDatabaseWord = exportNebrasSiteDatabaseWord;
    global.exportNebrasSiteImportTemplate = exportNebrasSiteImportTemplate;
    global.importNebrasSiteDatabaseFromFile = importNebrasSiteDatabaseFromFile;
    global.openNebrasSiteDatabaseImportPicker = openNebrasSiteDatabaseImportPicker;
    global.exportStorageAuditExcel = exportStorageAuditExcel;

})(typeof window !== 'undefined' ? window : globalThis);
