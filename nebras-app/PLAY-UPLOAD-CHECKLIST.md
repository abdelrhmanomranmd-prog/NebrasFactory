# ✅ قائمة رفع تطبيق Nebras نبراس على Google Play

## قبل الرفع — تأكدي

- [ ] حساب Google Play Console (25$ لمرة واحدة)
- [ ] Node.js مثبت
- [ ] Android Studio مثبت
- [ ] ملف AAB موقّع (انظري أدناه)

---

## 1) بناء ملف التطبيق (AAB)

```powershell
cd nebras-app
.\build-android.ps1
```

في Android Studio:
1. **Build → Generate Signed Bundle / APK**
2. **Android App Bundle**
3. أنشئي keystore جديد (احفظي كلمة المرور!)
4. الناتج: `android\app\release\app-release.aab`

---

## 2) إنشاء التطبيق في Play Console

1. https://play.google.com/console
2. **إنشاء تطبيق**
3. الاسم في المتجر: **Nebras نبراس | أبواب WPC**
4. اللغة: العربية (+ إنجليزي اختياري)

---

## 3) بيانات المتجر (للبحث نبراس / Nebras)

| الحقل | انسخي من |
|--------|----------|
| الاسم | `store-listing-ar.md` |
| الوصف القصير | نفس الملف |
| الوصف الكامل | نفس الملف |
| سياسة الخصوصية | https://www.nebrasplasticcompany.com/privacy-policy.html |
| البريد | nebrasfactory@hotmail.com |

**لقطات شاشة:** 2–8 صور من الجوال (`?app=1`)
**أيقونة 512:** `nebras-app/resources/icon.png`
**بانر 1024×500:** شعار نبراس + نص Nebras نبراس

---

## 4) رفع الإصدار

1. **الإنتاج → إنشاء إصدار جديد**
2. ارفعي `app-release.aab`
3. اسم الإصدار: `1.0.0`
4. ملاحظات: الإصدار الأول — متجر ومعرض وعروض أسعار

---

## 5) الدول

- السعودية (أساسي)
- يمكن إضافة دول الخليج لاحقاً

---

## 6) إرسال للمراجعة

بعد اكتمال كل الأقسام → **إرسال للمراجعة**
المدة المعتادة: 1–7 أيام

---

## بعد النشر

المستخدم يبحث في Google Play عن:
- **نبراس**
- **Nebras**
- **nebras wpc**

ويحمّل التطبيق الرسمي — ويتصل بالمنصة الحية تلقائياً.
