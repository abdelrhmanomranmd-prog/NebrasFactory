/**
 * Nebras — مركز الوسائط + محرر أيقونات الزوار (واجهة بصرية بدل prompt)
 */
(function() {
    let _nebrasMediaHubResolve = null;
    let _nebrasMediaHubOptions = {};
    let _nebrasMediaHubResultUrl = '';
    let _nebrasViconEditorState = { album: [], documents: [] };

    function nebrasMediaHubSwitchTab(tab) {
        const uploadPanel = document.getElementById('nebras-media-hub-upload-panel');
        const manualPanel = document.getElementById('nebras-media-hub-manual-panel');
        const tabUpload = document.getElementById('nebras-media-tab-upload');
        const tabManual = document.getElementById('nebras-media-tab-manual');
        const isManual = tab === 'manual';
        if (uploadPanel) uploadPanel.hidden = isManual;
        if (manualPanel) manualPanel.hidden = !isManual;
        if (tabUpload) tabUpload.classList.toggle('active', !isManual);
        if (tabManual) tabManual.classList.toggle('active', isManual);
    }

    function nebrasMediaHubSetPreview(url, fileName) {
        const preview = document.getElementById('nebras-media-hub-preview');
        if (!preview) return;
        const isPdf = /\.pdf(\?|$)/i.test(String(url || '')) || (fileName && /\.pdf$/i.test(fileName));
        if (url && !isPdf) {
            preview.innerHTML = '<img src="' + escapeHtmlAttr(url) + '" alt="">';
        } else if (url) {
            preview.innerHTML = '<i class="fas fa-file-pdf"></i><span>' + escapeHtmlAttr(fileName || 'PDF') + '</span>';
        } else {
            preview.innerHTML = '<i class="fas fa-file-image"></i><span>لم يُرفع ملف بعد</span>';
        }
    }

    function nebrasMediaHubSetStatus(msg, isError) {
        const el = document.getElementById('nebras-media-hub-status');
        if (!el) return;
        el.textContent = msg || '';
        el.style.color = isError ? '#b45309' : '#059669';
    }

    function openNebrasMediaHub(options) {
        options = options || {};
        return new Promise(function(resolve) {
            if (!currentAdmin) {
                alert('يجب تسجيل الدخول للإدارة أولاً (NEBRASFACTORY) لرفع الصور والوثائق.');
                resolve(null);
                return;
            }
            if (!canUploadNebrasMedia(options.permission)) {
                alert(options.permissionMessage || 'صلاحية المحتوى مطلوبة لرفع الصور والوثائق.');
                resolve(null);
                return;
            }
            _nebrasMediaHubResolve = resolve;
            _nebrasMediaHubOptions = options;
            _nebrasMediaHubResultUrl = options.defaultValue || '';
            const overlay = document.getElementById('nebras-media-hub-overlay');
            const titleEl = document.getElementById('nebras-media-hub-title');
            const hintEl = document.getElementById('nebras-media-hub-hint');
            const manualInput = document.getElementById('nebras-media-hub-manual-input');
            if (titleEl) titleEl.textContent = options.label || 'رفع وسائط';
            if (hintEl) hintEl.textContent = options.hint || 'صور أو PDF — تُرفع إلى Supabase أو مسار images/.';
            if (manualInput) manualInput.value = options.defaultValue || '';
            nebrasMediaHubSetPreview(_nebrasMediaHubResultUrl, '');
            nebrasMediaHubSetStatus('', false);
            nebrasMediaHubSwitchTab('upload');
            if (overlay) overlay.classList.add('show');
        });
    }

    function closeNebrasMediaHub(result) {
        const overlay = document.getElementById('nebras-media-hub-overlay');
        if (overlay) overlay.classList.remove('show');
        if (_nebrasMediaHubResolve) {
            _nebrasMediaHubResolve(result === undefined ? null : result);
            _nebrasMediaHubResolve = null;
        }
        _nebrasMediaHubOptions = {};
        _nebrasMediaHubResultUrl = '';
    }

    function nebrasMediaHubPickFile() {
        const accept = (_nebrasMediaHubOptions && _nebrasMediaHubOptions.accept) || 'image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf';
        nebrasMediaHubSetStatus('جاري اختيار الملف…', false);
        openNebrasMediaFilePicker(function(file) {
            if (!file) {
                nebrasMediaHubSetStatus('لم يُختر ملف.', true);
                return;
            }
            nebrasMediaHubSetStatus('جاري الرفع…', false);
            const pickBtn = document.getElementById('nebras-media-hub-pick-btn');
            if (pickBtn) pickBtn.disabled = true;
            uploadNebrasMediaFile(file).then(function(url) {
                if (pickBtn) pickBtn.disabled = false;
                if (url) {
                    _nebrasMediaHubResultUrl = url;
                    nebrasMediaHubSetPreview(url, file.name);
                    nebrasMediaHubSetStatus('تم الرفع — اضغط «تأكيد».', false);
                } else {
                    nebrasMediaHubSetStatus('فشل الرفع. جرّب «مسار / رابط» أو نفّذ سكربت التخزين 002.', true);
                }
            });
        }, accept);
    }

    function nebrasMediaHubConfirm() {
        const manualPanel = document.getElementById('nebras-media-hub-manual-panel');
        const isManual = manualPanel && !manualPanel.hidden;
        let url = '';
        if (isManual) {
            const manualInput = document.getElementById('nebras-media-hub-manual-input');
            url = manualInput ? manualInput.value.trim() : '';
            if (!url) {
                nebrasMediaHubSetStatus('أدخل مساراً أو رابطاً.', true);
                return;
            }
        } else {
            url = _nebrasMediaHubResultUrl;
            if (!url) {
                nebrasMediaHubSetStatus('ارفع ملفاً أو استخدم تبويب «مسار / رابط».', true);
                return;
            }
        }
        closeNebrasMediaHub(url);
    }

    function renderNebrasMediaItemList(listEl, items, type) {
        if (!listEl) return;
        if (!items.length) {
            listEl.innerHTML = '<li class="nebras-media-empty">لا عناصر بعد</li>';
            return;
        }
        listEl.innerHTML = items.map(function(item, idx) {
            const url = type === 'album' ? item : (item.url || '');
            const label = type === 'doc' ? (item.labelAr || 'وثيقة') : ('صورة ' + (idx + 1));
            const isPdf = /\.pdf(\?|$)/i.test(url);
            const thumb = isPdf
                ? '<span class="nebras-media-thumb nebras-media-thumb--pdf"><i class="fas fa-file-pdf"></i></span>'
                : '<span class="nebras-media-thumb"><img src="' + escapeHtmlAttr(url) + '" alt=""></span>';
            return '<li class="nebras-media-item">' + thumb +
                '<span class="nebras-media-item-label">' + escapeHtmlAttr(label) + '</span>' +
                '<button type="button" class="secondary" onclick="nebrasViconEditorRemoveItem(\'' + type + '\',' + idx + ')">حذف</button></li>';
        }).join('');
    }

    function nebrasViconEditorRemoveItem(type, idx) {
        if (type === 'album') _nebrasViconEditorState.album.splice(idx, 1);
        else _nebrasViconEditorState.documents.splice(idx, 1);
        renderNebrasMediaItemList(document.getElementById('nebras-vicon-album-list'), _nebrasViconEditorState.album, 'album');
        renderNebrasMediaItemList(document.getElementById('nebras-vicon-docs-list'), _nebrasViconEditorState.documents, 'doc');
    }

    function nebrasViconEditorSetBgPreview(url) {
        const el = document.getElementById('nebras-vicon-bg-preview');
        if (!el) return;
        el.innerHTML = url ? '<img src="' + escapeHtmlAttr(url) + '" alt="">' : '<i class="fas fa-image"></i>';
    }

    function openVisitorIconEditor(iconId) {
        if (!requirePermission('content', 'صلاحية المحتوى مطلوبة.')) return;
        const isNew = iconId === null || iconId === undefined;
        const icon = isNew ? null : visitorIcons.find(function(i) { return i.id === iconId; });
        if (!isNew && !icon) return;
        _nebrasViconEditorState = {
            album: icon ? (icon.album || []).slice() : [],
            documents: icon ? (icon.documents || []).slice() : []
        };
        document.getElementById('nebras-vicon-editor-id').value = icon ? String(icon.id) : '';
        document.getElementById('nebras-vicon-editor-title').textContent = isNew ? 'أيقونة زائر جديدة' : ('تحرير: ' + (icon.title || icon.titleAr || ''));
        document.getElementById('nebras-vicon-title-ar').value = icon ? (icon.titleAr || icon.title || '') : '';
        document.getElementById('nebras-vicon-title-en').value = icon ? (icon.titleEn || '') : '';
        document.getElementById('nebras-vicon-text-ar').value = icon ? (icon.textAr || '') : '';
        document.getElementById('nebras-vicon-icon-class').value = icon ? (icon.iconClass || 'fas fa-star') : 'fas fa-star';
        document.getElementById('nebras-vicon-target').value = icon ? (icon.target || '#products') : '#products';
        document.getElementById('nebras-vicon-mode').value = icon ? getCatalogExperience(icon) : 'browse';
        const placementEl = document.getElementById('nebras-vicon-placement');
        if (placementEl) placementEl.value = icon && icon.placement === 'services' ? 'services' : 'gateway';
        document.getElementById('nebras-vicon-catalog-hub').checked = !!(icon && icon.catalogHub);
        document.getElementById('nebras-vicon-linked-product').value = icon ? (icon.linkedProductId || '') : '';
        document.getElementById('nebras-vicon-background').value = icon ? (icon.backgroundImage || '') : '';
        nebrasViconEditorSetBgPreview(icon ? icon.backgroundImage : '');
        renderNebrasMediaItemList(document.getElementById('nebras-vicon-album-list'), _nebrasViconEditorState.album, 'album');
        renderNebrasMediaItemList(document.getElementById('nebras-vicon-docs-list'), _nebrasViconEditorState.documents, 'doc');
        document.getElementById('nebras-vicon-editor-overlay').classList.add('show');
    }

    function closeVisitorIconEditor() {
        const el = document.getElementById('nebras-vicon-editor-overlay');
        if (el) el.classList.remove('show');
        _nebrasViconEditorState = { album: [], documents: [] };
    }

    async function nebrasViconEditorPickBg() {
        const url = await openNebrasMediaHub({ label: 'خلفية البطاقة', defaultValue: document.getElementById('nebras-vicon-background').value });
        if (url) {
            document.getElementById('nebras-vicon-background').value = url;
            nebrasViconEditorSetBgPreview(url);
        }
    }

    async function nebrasViconEditorAddAlbum() {
        const url = await openNebrasMediaHub({ label: 'صورة للألبوم', accept: (window.NEBRAS_IMAGE_ACCEPT || 'image/*') });
        if (url) {
            _nebrasViconEditorState.album.push(url);
            renderNebrasMediaItemList(document.getElementById('nebras-vicon-album-list'), _nebrasViconEditorState.album, 'album');
        }
    }

    async function nebrasViconEditorAddDocument() {
        const labelAr = prompt('اسم الوثيقة (عربي):', 'كتالوج PDF');
        if (labelAr === null || !String(labelAr).trim()) return;
        const url = await openNebrasMediaHub({ label: 'وثيقة / PDF', accept: (window.NEBRAS_MEDIA_ACCEPT_ALL || 'image/*,application/pdf') });
        if (url) {
            _nebrasViconEditorState.documents.push({ labelAr: labelAr.trim(), labelEn: labelAr.trim(), url: url });
            renderNebrasMediaItemList(document.getElementById('nebras-vicon-docs-list'), _nebrasViconEditorState.documents, 'doc');
        }
    }

    function saveVisitorIconEditor() {
        if (!requirePermission('content')) return;
        const idRaw = document.getElementById('nebras-vicon-editor-id').value;
        const titleAr = document.getElementById('nebras-vicon-title-ar').value.trim();
        const titleEn = document.getElementById('nebras-vicon-title-en').value.trim();
        const textAr = document.getElementById('nebras-vicon-text-ar').value.trim();
        const iconClass = document.getElementById('nebras-vicon-icon-class').value.trim();
        const target = document.getElementById('nebras-vicon-target').value.trim();
        const mode = document.getElementById('nebras-vicon-mode').value;
        const placementEl = document.getElementById('nebras-vicon-placement');
        const placement = placementEl ? placementEl.value : 'gateway';
        const catalogHub = document.getElementById('nebras-vicon-catalog-hub').checked;
        let linkedProductId = document.getElementById('nebras-vicon-linked-product').value.trim();
        const backgroundImage = document.getElementById('nebras-vicon-background').value.trim();
        let targetFinal = target;
        if (placement === 'services' && !targetFinal) targetFinal = '#services';
        if (!titleAr || !iconClass || !targetFinal) {
            alert('العنوان والأيقونة والوجهة مطلوبة.');
            return;
        }
        let icon;
        if (idRaw) {
            icon = visitorIcons.find(function(i) { return String(i.id) === String(idRaw); });
            if (!icon) return;
        } else {
            icon = { id: Date.now() };
            visitorIcons.push(icon);
        }
        icon.title = titleAr;
        icon.titleAr = titleAr;
        icon.titleEn = titleEn || titleAr;
        delete icon.titleKey;
        icon.textAr = textAr;
        icon.textEn = textAr;
        icon.iconClass = iconClass;
        icon.target = targetFinal;
        icon.visitorMode = mode;
        icon.placement = placement === 'services' ? 'services' : undefined;
        if (placement !== 'services') delete icon.placement;
        if (placement === 'services') {
            icon.lane = undefined;
            delete icon.lane;
            delete icon.catalogHub;
        } else {
            icon.catalogHub = catalogHub;
        }
        icon.backgroundImage = backgroundImage;
        icon.album = _nebrasViconEditorState.album.slice();
        icon.documents = _nebrasViconEditorState.documents.slice();
        if (linkedProductId) icon.linkedProductId = linkedProductId;
        else delete icon.linkedProductId;
        if (typeof window.saveContentData === 'function') {
            window.saveContentData();
        } else {
            saveSystemData();
            if (typeof renderVisitorIcons === 'function') renderVisitorIcons();
            if (typeof renderSiteServiceCards === 'function') renderSiteServiceCards();
        }
        displayVisitorIconsAdmin();
        addAuditLog(idRaw ? 'تعديل أيقونة زائر' : 'إضافة أيقونة زائر', titleAr);
        closeVisitorIconEditor();
        alert('تم حفظ الأيقونة.');
    }

    function previewVisitorIconEditor() {
        const idRaw = document.getElementById('nebras-vicon-editor-id').value;
        if (idRaw) openVisitorIcon(Number(idRaw));
        else alert('احفظ الأيقونة أولاً ثم اضغط معاينة من القائمة.');
    }

    function nebrasMediaHubClearSelection() {
        _nebrasMediaHubResultUrl = '';
        const manualInput = document.getElementById('nebras-media-hub-manual-input');
        if (manualInput) manualInput.value = '';
        nebrasMediaHubSetPreview('', '');
        nebrasMediaHubSetStatus('تم مسح الاختيار — يمكنك رفع ملف جديد.', false);
    }

    function nebrasViconEditorClearBg() {
        if (!requirePermission('content', 'صلاحية المحتوى مطلوبة.')) return;
        if (!confirm('حذف خلفية البطاقة؟')) return;
        document.getElementById('nebras-vicon-background').value = '';
        nebrasViconEditorSetBgPreview('');
    }

    function nebrasViconEditorClearAlbum() {
        if (!requirePermission('content', 'صلاحية المحتوى مطلوبة.')) return;
        if (!_nebrasViconEditorState.album.length) return;
        if (!confirm('حذف كل صور الألبوم؟')) return;
        _nebrasViconEditorState.album = [];
        renderNebrasMediaItemList(document.getElementById('nebras-vicon-album-list'), _nebrasViconEditorState.album, 'album');
    }

    function nebrasViconEditorClearDocs() {
        if (!requirePermission('content', 'صلاحية المحتوى مطلوبة.')) return;
        if (!_nebrasViconEditorState.documents.length) return;
        if (!confirm('حذف كل الوثائق وPDF؟')) return;
        _nebrasViconEditorState.documents = [];
        renderNebrasMediaItemList(document.getElementById('nebras-vicon-docs-list'), _nebrasViconEditorState.documents, 'doc');
    }

    function initNebrasMediaAdminOverrides() {
        window.pickMediaPath = function(options) { return openNebrasMediaHub(options); };
        window.pickMediaAlbumInteractive = async function(existingAlbum) {
            let album = (existingAlbum || []).slice();
            while (true) {
                const url = await openNebrasMediaHub({
                    label: 'صورة للألبوم (' + (album.length + 1) + ')',
                    accept: (window.NEBRAS_IMAGE_ACCEPT || 'image/*')
                });
                if (!url) break;
                album.push(url);
                if (!confirm('إضافة صورة أخرى للألبوم؟')) break;
            }
            return album;
        };
        window.addVisitorIcon = function() { openVisitorIconEditor(null); };
        window.editVisitorIcon = function(iconId) { openVisitorIconEditor(iconId); };
        window.openNebrasMediaHub = openNebrasMediaHub;
        window.closeNebrasMediaHub = closeNebrasMediaHub;
        window.nebrasMediaHubSwitchTab = nebrasMediaHubSwitchTab;
        window.nebrasMediaHubPickFile = nebrasMediaHubPickFile;
        window.nebrasMediaHubConfirm = nebrasMediaHubConfirm;
        window.openVisitorIconEditor = openVisitorIconEditor;
        window.closeVisitorIconEditor = closeVisitorIconEditor;
        window.nebrasViconEditorPickBg = nebrasViconEditorPickBg;
        window.nebrasViconEditorAddAlbum = nebrasViconEditorAddAlbum;
        window.nebrasViconEditorAddDocument = nebrasViconEditorAddDocument;
        window.saveVisitorIconEditor = saveVisitorIconEditor;
        window.previewVisitorIconEditor = previewVisitorIconEditor;
        window.nebrasViconEditorRemoveItem = nebrasViconEditorRemoveItem;
        window.nebrasViconEditorClearBg = nebrasViconEditorClearBg;
        window.nebrasViconEditorClearAlbum = nebrasViconEditorClearAlbum;
        window.nebrasViconEditorClearDocs = nebrasViconEditorClearDocs;
        window.nebrasMediaHubClearSelection = nebrasMediaHubClearSelection;
    }

    window.initNebrasMediaAdminOverrides = initNebrasMediaAdminOverrides;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNebrasMediaAdminOverrides);
    } else {
        initNebrasMediaAdminOverrides();
    }
})();
