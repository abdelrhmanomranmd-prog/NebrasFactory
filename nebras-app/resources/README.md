# أصول أيقونة التطبيق

ضعي هنا قبل توليد الأيقونات:

- `icon.png` — 1024×1024 (مربع، خلفية #062e44 أو شفافة)
- `splash.png` — 2732×2732 (اختياري)

ثم من مجلد `nebras-app`:

```bash
npm install @capacitor/assets --save-dev
npx capacitor-assets generate --android
npx cap sync android
```

يمكن استخدام شعار نبراس من `images/icon-512.png` على الموقع بعد تكبيره إلى 1024.
