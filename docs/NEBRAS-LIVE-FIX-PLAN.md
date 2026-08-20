# خطة إصلاح «الموقع الحي 100%» — نبراس

**الحالة:** ✅ **مكتمل ومنشور — hrws223**  
**Commit:** `0e78c4d` + follow-up cache/health bump  
**الموقع:** https://www.nebrasplasticcompany.com  
**Google Play:** متوقف — `nebras-app/PAUSED-GOOGLE-PLAY.md`

---

## ما تم تنفيذه بالكامل

| # | المرحلة | التفاصيل | الحالة |
|---|---------|----------|--------|
| A | حفظ حي إجباري | Supabase قبل toast النجاح · `saveContentData` async | ✅ |
| B | سحابة أولاً | grace 8ث/25ث · bootstrap 8ث · prod-live-5 purge | ✅ |
| C | حماية المحتوى | صور الأيقونات · skip chrome re-seed | ✅ |
| D | تحديث الزائر | polling 20ث · refresh DOM بعد pull | ✅ |
| E | Realtime | زوار + إدارة — `nebras-realtime-sync.js` | ✅ |
| F | النشر | push → Vercel · `data-nebras-deploy=hrws223` | ✅ |
| G | API health | `/api/health` → `upgrade: hrws223` | ✅ |

---

## الملفات الأساسية

- `js/nebras-platform.js`
- `js/nebras-odoo-write.js`
- `js/nebras-platform-integrity.js`
- `js/nebras-realtime-sync.js`
- `index.html`
- `api/health.js`

---

## اختبار سريع (دقيقتين)

1. **نافذة خاصة** → افتح الموقع (زائر)
2. **الإدارة** → عدّل منتج/سعر → احفظ
3. Toast: **«✓ تم الحفظ على السيرفر الحي»**
4. **نافذة الزائر** → التعديل يظهر **فوراً** (Realtime) أو ≤20ث
5. **Ctrl+F5** على الزائر → لا بيانات قديمة

---

## ما يبقى يحتاج كود (ليس من الإدارة)

- أقسام HTML جديدة · لوحات ERP جديدة · CSS هيكلي

**منتجات · أسعار · صور · أيقونات · معرض · فروع · إعدادات** = **حي 100% من الإدارة**
