# خطة إصلاح «الموقع الحي 100%» — نبراس

**الحالة:** ✅ نُفّذ hrws223 — حفظ حي + سحابة أولاً + polling 20ث  
**Google Play:** متوقف مؤقتاً — `nebras-app/PAUSED-GOOGLE-PLAY.md`

## ما تم تنفيذه (hrws223)

| المرحلة | التغيير | الملف |
|---------|---------|-------|
| A | توست «تم الحفظ على السيرفر الحي» بعد تأكيد Supabase | `nebras-odoo-write.js` |
| A | `saveContentData` ينتظر نجاح السحابة قبل تحديث الواجهة | `nebras-platform.js` |
| A | `NEBRAS_ODOO_QUIET_UI = false` — feedback واضح | `nebras-odoo-write.js` |
| B | `MUTATION_GRACE_MS` 120ث → 25ث (عام) / 8ث (محتوى عام) | `nebras-platform-integrity.js` |
| B | `shouldSeedSiteChrome()` لا يعيد زرع chrome بعد sync السحابة | `nebras-platform.js` |
| B | bootstrap cloud timeout 4.5ث → 8ث | `nebras-platform.js` |
| B | reset token `prod-live-5` — مسح كاش قديم مرة واحدة | integrity + platform |
| C | لا يمس صور أيقونات الإدارة بعد sync | `ensureBuiltinVisitorIcons` |
| C | `skipBuiltinSeeds` يتخطى `ensureSiteChromeDefaults` | `finalizePlatformDataAfterLoad` |
| D | polling الزائر 60ث → **20ث** | `nebras-platform.js` |
| D | `pullPublicSiteGovernanceFromCloud` يحدّث DOM فوراً | `nebras-platform.js` |
| D | بعد حفظ Odoo → `refreshPublicSiteFromGovernance()` | `nebras-odoo-write.js` |

## النشر على Vercel

```bash
git add js/nebras-platform.js js/nebras-odoo-write.js js/nebras-platform-integrity.js index.html docs/NEBRAS-LIVE-FIX-PLAN.md
git commit -m "fix: live site sync — cloud-first content, faster visitor poll (hrws223)"
git push
```

## اختبار بعد النشر

1. افتح الموقع في **نافذة خاصة** (زائر)
2. من الإدارة: عدّل منتج/سعر → احفظ
3. تأكد ظهور toast: **«تم الحفظ على السيرفر الحي»**
4. على نافذة الزائر: انتظر ≤20 ث (أو غيّر التبويب) → يظهر التعديل
5. Refresh على الزائر → لا يرجع للبيانات القديمة

## المرحلة التالية (اختياري)

- Realtime للزوار (Supabase subscription)
- إصلاح `fetchDynamicContentBlocks` أو إزالته
- CMS blocks جديدة بدون كود
