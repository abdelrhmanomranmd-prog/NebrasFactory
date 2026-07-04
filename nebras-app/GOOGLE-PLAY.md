# نشر تطبيق نبراس على Google Play

التطبيق يحمّل **المنصة الحية** من السيرفر — أي تحديث على الموقع يظهر في التطبيق تلقائياً.

---

## المتطلبات على جهاز البناء (مرة واحدة)

1. **Node.js LTS** — من https://nodejs.org (ثبّتي ثم أعيدي فتح PowerShell)
2. **Android Studio** — من https://developer.android.com/studio
3. **حساب Google Play Console** — رسوم تسجيل لمرة واحدة (~25 دولار)
4. **JDK 17** — يأتي مع Android Studio عادة

تحققي:
```powershell
node -v
npm -v
```

---

## الخطوة 1 — بناء مشروع Android

من مجلد المشروع الرئيسي:

```powershell
cd nebras-app
npm install
npx cap add android
npx cap sync android
npx cap open android
```

أو شغّلي السكربت الجاهز:

```powershell
.\build-android.ps1
```

يفتح Android Studio — انتظري Gradle حتى ينتهي.

---

## الخطوة 2 — أيقونة التطبيق

ضعي صورة مربعة **1024×1024** باسم:

`nebras-app/resources/icon.png`

ثم (بعد تثبيت الحزم):

```powershell
npm install @capacitor/assets --save-dev
npx capacitor-assets generate --android
npx cap sync android
```

بديل: من Android Studio → `app` → `res` → استبدلي أيقونات `mipmap`.

---

## الخطوة 3 — توقيع التطبيق (Release)

في PowerShell داخل `nebras-app`:

```powershell
keytool -genkey -pair -alias nebras-release -keyalg RSA -keysize 2048 -validity 10000 -keystore nebras-release.keystore
```

**احفظي كلمة المرور والـ alias في مكان آمن** — بدونها لا يمكن تحديث التطبيق لاحقاً.

في Android Studio:
1. **Build → Generate Signed Bundle / APK**
2. اختاري **Android App Bundle (AAB)** — مطلوب لـ Google Play
3. اختاري `nebras-release.keystore`
4. أنشئي الملف: `android/app/release/app-release.aab`

---

## الخطوة 4 — Google Play Console

1. ادخلي https://play.google.com/console
2. **إنشاء تطبيق** → اسم: **نبراس — أبواب WPC**
3. **لوحة التحكم → الإصدارات → الإنتاج → إنشاء إصدار جديد**
4. ارفعي ملف **`.aab`**
5. أكملي البيانات التالية:

| الحقل | القيمة |
|--------|--------|
| رابط سياسة الخصوصية | `https://www.nebrasplasticcompany.com/privacy-policy.html` |
| الفئة | تسوق / أعمال |
| البريد للدعم | nebrasfactory@hotmail.com |
| الموقع | https://www.nebrasplasticcompany.com |

6. **لقطات شاشة** — 2 على الأقل من الجوال (افتحي `?app=1` والتقطي الشاشة)
7. **أيقونة المتجر** — 512×512 PNG
8. **Feature graphic** — 1024×500 (بانر المتجر)

نص الوصف جاهز في: `store-listing-ar.md`

---

## الخطوة 5 — المراجعة والنشر

- اختاري **السعودية** كدولة أساسية
- أجيبي على استبيان المحتوى (لا إعلانات للأطفال، إلخ)
- **إرسال للمراجعة** — عادة 1–7 أيام

---

## تحديث التطبيق لاحقاً

| نوع التغيير | ماذا تفعلين |
|-------------|-------------|
| منتجات، أسعار، عروض، عملاء | **لا شيء** — يتحدث من السيرفر |
| تغيير رابط السيرفر أو الأيقونة | إصدار AAB جديد في Play Console |
| إشعارات / صلاحيات جديدة | إصدار AAB جديد |

---

## معلومات التطبيق التقنية

| البند | القيمة |
|--------|--------|
| Package ID | `com.nebrasplasticcompany.app` |
| رابط التحميل داخل التطبيق | `https://www.nebrasplasticcompany.com/?app=1` |
| الحد الأدنى Android | API 22+ (Android 5.1) |

---

## استكشاف الأخطاء

**شاشة بيضاء:** تأكدي أن الموقع يفتح من الجوال وأن `hrws199` أو أحدث منشور.

**Gradle فشل:** File → Invalidate Caches في Android Studio.

**رفض Play Console:** غالباً نقص سياسة خصوصية أو لقطات شاشة — راجعي القائمة أعلاه.
