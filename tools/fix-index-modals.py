INDEX = r'c:\Users\abdel\OneDrive\Desktop\NebrasFactory\index.html'
with open(INDEX, 'r', encoding='utf-8') as f:
    content = f.read()

start = content.find('    <!-- مركز الوسائط')
if start < 0:
    start = content.find('    <motion class="admin-section" id="nebras-media-hub-overlay">')
if start < 0:
    start = content.find('    <motion class="admin-overlay" id="icon-overlay">')
if start < 0:
    start = content.find('    <motion class="admin-overlay" id="icon-overlay">')
if start < 0:
    start = content.find('    <div class="admin-overlay" id="icon-overlay">')

end = content.find('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2">')
if start < 0 or end < 0:
    raise SystemExit('markers not found: start=%s end=%s' % (start, end))

lines = [
    '    <!-- مركز الوسائط — رفع صور وPDF من الإدارة -->',
    '    <div class="admin-section" id="nebras-media-hub-overlay">',
    '        <div class="admin-modal nebras-media-hub-modal">',
    '            <h2 id="nebras-media-hub-title">رفع وسائط</h2>',
    '            <p class="scm-hint" id="nebras-media-hub-hint">ارفع صورة أو PDF إلى السحابة، أو أدخل مساراً يدوياً.</p>',
    '            <div class="nebras-media-hub-tabs" role="tablist">',
    '                <button type="button" class="active" id="nebras-media-tab-upload" onclick="nebrasMediaHubSwitchTab(\'upload\')"><i class="fas fa-cloud-upload-alt"></i> رفع من الجهاز</button>',
    '                <button type="button" id="nebras-media-tab-manual" onclick="nebrasMediaHubSwitchTab(\'manual\')"><i class="fas fa-link"></i> مسار / رابط</button>',
    '            </div>',
    '            <div id="nebras-media-hub-upload-panel" class="nebras-media-hub-panel">',
    '                <motion class="nebras-media-hub-preview" id="nebras-media-hub-preview"><i class="fas fa-file-image"></i><span>لم يُرفع ملف بعد</span></div>',
]
# fix line with motion - use div
lines[-1] = '                <div class="nebras-media-hub-preview" id="nebras-media-hub-preview"><i class="fas fa-file-image"></i><span>لم يُرفع ملف بعد</span></div>'
lines += [
    '                <button type="button" class="primary" id="nebras-media-hub-pick-btn" onclick="nebrasMediaHubPickFile()"><i class="fas fa-folder-open"></i> اختر ملفاً</button>',
    '                <p class="nebras-media-hub-status" id="nebras-media-hub-status"></p>',
    '            </div>',
    '            <div id="nebras-media-hub-manual-panel" class="nebras-media-hub-panel" hidden>',
    '                <label for="nebras-media-hub-manual-input">مسار images/... أو رابط https://</label>',
    '                <input type="text" id="nebras-media-hub-manual-input" class="nebras-media-hub-input" placeholder="images/wpc-background.jpg">',
    '            </div>',
    '            <div class="nebras-media-hub-actions">',
    '                <button type="button" class="primary" onclick="nebrasMediaHubConfirm()"><i class="fas fa-check"></i> تأكيد</button>',
    '                <button type="button" class="secondary" onclick="closeNebrasMediaHub(null)">إلغاء</button>',
    '            </div>',
    '        </motion></div>',
]
lines[-1] = '        </div>'
lines += [
    '    </div>',
    '',
    '    <!-- محرر أيقونة الزائر -->',
    '    <div class="admin-section" id="nebras-vicon-editor-overlay">',
    '        <div class="admin-modal nebras-vicon-editor-modal site-content-modal">',
    '            <h2 id="nebras-vicon-editor-title">تحرير أيقونة الزائر</h2>',
    '            <input type="hidden" id="nebras-vicon-editor-id">',
    '            <div class="nebras-vicon-editor-grid">',
    '                <div class="nebras-vicon-field"><label for="nebras-vicon-title-ar">العنوان (عربي) *</label><input id="nebras-vicon-title-ar" type="text"></div>',
    '                <div class="nebras-vicon-field"><label for="nebras-vicon-title-en">العنوان (إنجليزي)</label><input id="nebras-vicon-title-en" type="text"></div>',
    '                <div class="nebras-vicon-field nebras-vicon-field--full"><label for="nebras-vicon-text-ar">الشرح داخل الأيقونة (عربي)</label><textarea id="nebras-vicon-text-ar" rows="3"></textarea></motion></div>',
]
lines[-1] = '                <motion class="nebras-vicon-field nebras-vicon-field--full"><label for="nebras-vicon-text-ar">الشرح داخل الأيقونة (عربي)</label><textarea id="nebras-vicon-text-ar" rows="3"></textarea></div>'
lines[-1] = '                <div class="nebras-vicon-field nebras-vicon-field--full"><label for="nebras-vicon-text-ar">الشرح داخل الأيقونة (عربي)</label><textarea id="nebras-vicon-text-ar" rows="3"></textarea></div>'
lines += [
    '                <div class="nebras-vicon-field"><label for="nebras-vicon-icon-class">أيقونة FontAwesome</label><input id="nebras-vicon-icon-class" type="text" placeholder="fas fa-door-open"></div>',
    '                <div class="nebras-vicon-field"><label for="nebras-vicon-target">الوجهة (#products أو رابط)</label><input id="nebras-vicon-target" type="text" placeholder="#products"></div>',
    '                <div class="nebras-vicon-field"><label for="nebras-vicon-mode">وظيفة الأيقونة</label>',
    '                    <select id="nebras-vicon-mode">',
    '                        <option value="browse">معرض — صور ووثائق</option>',
    '                        <option value="shop">متجر — سلة + عرض سعر</option>',
    '                        <option value="link">انتقال سريع فقط</option>',
    '                    </select>',
    '                </div>',
    '                <div class="nebras-vicon-field"><label><input type="checkbox" id="nebras-vicon-catalog-hub"> كتالوج منتجات (مدخل كل الأقسام)</label></div>',
    '                <div class="nebras-vicon-field"><label for="nebras-vicon-linked-product">منتج مرتبط (prod-...) — اختياري</label><input id="nebras-vicon-linked-product" type="text"></div>',
    '                <div class="nebras-vicon-field nebras-vicon-field--full">',
    '                    <label>خلفية البطاقة</label>',
    '                    <div class="nebras-vicon-bg-row">',
    '                        <div class="nebras-media-thumb" id="nebras-vicon-bg-preview"><i class="fas fa-image"></i></div>',
    '                        <input type="hidden" id="nebras-vicon-background">',
    '                        <button type="button" class="secondary" onclick="nebrasViconEditorPickBg()"><i class="fas fa-upload"></i> رفع / اختيار صورة</button>',
    '                    </div>',
    '                </div>',
    '            </div>',
    '            <div class="nebras-vicon-media-section">',
    '                <h3><i class="fas fa-images"></i> ألبوم الصور</h3>',
    '                <ul id="nebras-vicon-album-list" class="nebras-media-item-list"></ul>',
    '                <button type="button" class="secondary" onclick="nebrasViconEditorAddAlbum()"><i class="fas fa-plus"></i> إضافة صورة للألبوم</button>',
    '            </div>',
    '            <div class="nebras-vicon-media-section">',
    '                <h3><i class="fas fa-file-pdf"></i> وثائق وPDF</h3>',
    '                <ul id="nebras-vicon-docs-list" class="nebras-media-item-list"></ul>',
    '                <button type="button" class="secondary" onclick="nebrasViconEditorAddDocument()"><i class="fas fa-plus"></i> إضافة وثيقة / PDF</button>',
    '            </div>',
    '            <div class="nebras-media-hub-actions">',
    '                <button type="button" class="primary" onclick="saveVisitorIconEditor()"><i class="fas fa-save"></i> حفظ الأيقونة</button>',
    '                <button type="button" class="secondary" onclick="previewVisitorIconEditor()"><i class="fas fa-eye"></i> معاينة للزائر</button>',
    '                <button type="button" class="secondary" onclick="closeVisitorIconEditor()">إلغاء</button>',
    '            </div>',
    '        </div>',
    '    </div>',
    '',
    '    <div class="admin-overlay" id="icon-overlay">',
    '        <div class="admin-modal icon-detail-modal">',
    '            <h2 id="icon-overlay-title">تفاصيل القسم</h2>',
    '            <p id="icon-overlay-text">معلومات القسم ستظهر هنا.</p>',
    '            <p id="icon-overlay-mode-hint" class="icon-overlay-mode-hint" hidden></p>',
    '            <div id="icon-overlay-documents" class="icon-overlay-documents"></div>',
    '            <div id="icon-overlay-gallery" class="icon-overlay-gallery"></div>',
    '            <div id="icon-overlay-variants" class="icon-overlay-variants" hidden></div>',
    '            <div class="icon-overlay-actions">',
    '                <button type="button" class="primary" id="icon-overlay-go-btn" onclick="iconOverlayPrimaryClick()">انتقل إلى القسم</button>',
    '                <button type="button" class="primary icon-overlay-shop-btn" id="icon-overlay-shop-btn" onclick="iconOverlayShopClick()" hidden>تسوق — اختر المقاس والسعر</button>',
    '                <button type="button" class="secondary" onclick="closeIconOverlay()">إغلاق</button>',
    '            </div>',
    '        </div>',
    '    </div>',
    '',
]

BLOCK = '\n'.join(lines) + '\n'
content = content[:start] + BLOCK + content[end:]
with open(INDEX, 'w', encoding='utf-8') as f:
    f.write(content)
print('OK', len(lines), 'lines')
