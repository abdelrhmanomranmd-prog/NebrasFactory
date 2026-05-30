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

        function buildPartnersTrackHtml(partners, lang) {
            const items = (partners || []).filter(function(p) { return p && p.visible !== false && p.logoUrl; })
                .sort(function(a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
            if (!items.length) return '';
            function one(p) {
                const name = getPartnerDisplayName(p, lang);
                const logo = normalizeMediaPath(p.logoUrl);
                const link = String(p.linkUrl || '').trim();
                const inner = '<img src="' + escapeHtmlAttr(logo) + '" alt="' + escapeHtmlAttr(name) + '" loading="lazy" onerror="this.style.opacity=\'0.3\'">' +
                    (name ? '<span>' + escapeHtmlAttr(name) + '</span>' : '');
                if (link && /^https?:\/\//i.test(link)) {
                    return '<a class="nebras-partner-logo" href="' + escapeHtmlAttr(link) + '" target="_blank" rel="noopener noreferrer">' + inner + '</a>';
                }
                return '<div class="nebras-partner-logo">' + inner + '</div>';
            }
            const row = items.map(one).join('');
            return row + row;
        }

        function renderPartnersMarquees() {
            const lang = currentLang || 'ar';
            const html = buildPartnersTrackHtml(sitePartners, lang);
            const publicSection = document.getElementById('nebras-partners-section');
            const publicTrack = document.getElementById('nebras-partners-track-public');
            const dashTrack = document.getElementById('nebras-partners-track-dashboard');
            if (publicTrack) publicTrack.innerHTML = html;
            if (dashTrack) dashTrack.innerHTML = html;
            if (publicSection) publicSection.style.display = html ? '' : 'none';
        }

        function buildCertificationsGridHtml(lang) {
            const items = (siteCertifications || []).filter(function(c) { return c && c.visible !== false && c.mediaUrl; })
                .sort(function(a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
            if (!items.length) {
                return '<p style="grid-column:1/-1;opacity:0.85">' + escapeHtmlAttr((siteText[lang] || siteText.ar).certsEmptyHint || 'أضيفوا الشهادات من إدارة المحتوى → اعتمادات وشهادات.') + '</p>';
            }
            return items.map(function(cert) {
                const title = getCertDisplayField(cert, 'title', lang);
                const caption = getCertDisplayField(cert, 'caption', lang);
                const url = normalizeMediaPath(cert.mediaUrl);
                const isPdf = cert.mediaType === 'pdf' || /\.pdf(\?|$)/i.test(url);
                if (isPdf) {
                    return '<article class="nebras-cert-card nebras-cert-card--pdf">' +
                        '<div class="nebras-cert-pdf-icon"><i class="fas fa-file-pdf"></i></div>' +
                        '<h4>' + escapeHtmlAttr(title || 'PDF') + '</h4>' +
                        (caption ? '<p>' + escapeHtmlAttr(caption) + '</p>' : '') +
                        '<a class="nebras-cert-open" href="' + escapeHtmlAttr(url) + '" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> فتح الوثيقة</a></article>';
                }
                return '<article class="nebras-cert-card">' +
                    '<img src="' + escapeHtmlAttr(url) + '" alt="' + escapeHtmlAttr(title) + '" loading="lazy">' +
                    '<h4>' + escapeHtmlAttr(title) + '</h4>' +
                    (caption ? '<p>' + escapeHtmlAttr(caption) + '</p>' : '') + '</article>';
            }).join('');
        }

        function openCertificationsHub() {
            const lang = currentLang || 'ar';
            const ui = siteText[lang] || siteText.ar;
            const title = ui.certsOverlayTitle || 'اعتمادات وشهادات نبراس';
            const body = (ui.certsOverlayIntro || 'شهادات واعتمادات مصنع نبراس.') + '\n\n' + (ui.visitorOverlayIntro || '');
            showRichIconOverlay(title, body, [], { type: 'none', value: '' }, [], {
                innerLayout: 'certifications',
                certificationsHtml: buildCertificationsGridHtml(lang)
            });
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
                visible: true
            });
            saveSystemData();
            renderPartnersMarquees();
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
            saveSystemData();
            renderPartnersMarquees();
            displayPartnersAdmin();
        }

        function deleteSitePartner(partnerId) {
            if (!requirePermission('content')) return;
            if (!confirm('حذف هذا الشريك؟')) return;
            sitePartners = sitePartners.filter(function(p) { return p.id !== partnerId; });
            saveSystemData();
            renderPartnersMarquees();
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
            const mediaUrl = await pickMediaPath({ label: 'صورة الشهادة أو PDF', defaultValue: '', accept: 'image/jpeg,image/png,image/webp,application/pdf' });
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
            saveSystemData();
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
            saveSystemData();
            displayCertificationsAdmin();
        }

        function deleteSiteCertification(certId) {
            if (!requirePermission('content')) return;
            if (!confirm('حذف هذا الاعتماد؟')) return;
            siteCertifications = siteCertifications.filter(function(c) { return c.id !== certId; });
            saveSystemData();
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
