# NebrasFactory — رفع كامل المشروع إلى GitHub
# شغّلي من PowerShell:
#   cd "C:\Users\abdel\OneDrive\Desktop\NebrasFactory"
#   .\scripts\upload-to-github.ps1

$ErrorActionPreference = "Stop"
$gitCmd = "C:\Program Files\Git\cmd\git.exe"
if (-not (Test-Path $gitCmd)) {
    Write-Host "Git غير موجود. ثبّتي Git من: https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}
$env:Path = "C:\Program Files\Git\cmd;" + $env:Path

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root
Write-Host "المجلد: $root" -ForegroundColor Cyan

& $gitCmd --version

if (-not (Test-Path ".git")) {
    Write-Host "`nتهيئة Git في المشروع..." -ForegroundColor Yellow
    & $gitCmd init
    & $gitCmd branch -M main
}

$remoteUrl = "https://github.com/abdelrhmanomranmd-prog/NebrasFactory.git"
$remotes = & $gitCmd remote 2>$null
if ($remotes -notcontains "origin") {
    Write-Host "ربط المستودع: $remoteUrl" -ForegroundColor Yellow
    & $gitCmd remote add origin $remoteUrl
} else {
    & $gitCmd remote set-url origin $remoteUrl
}

Write-Host "`nإضافة كل الملفات (حسب .gitignore)..." -ForegroundColor Yellow
& $gitCmd add -A
& $gitCmd status -sb

Write-Host @"

────────────────────────────────────────────────────────
الخطوة التالية (يدوياً — مرة واحدة):
────────────────────────────────────────────────────────
1) سجّلي commit:
   git commit -m "Nebras platform: media, showroom, i18n, admin CMS"

2) ارفعي:
   git push -u origin main

إذا طلب GitHub اسم مستخدم وكلمة مرور:
   استخدمي Personal Access Token بدل كلمة المرور
   GitHub → Settings → Developer settings → Personal access tokens

إذا ظهر خطأ أن الفرع موجود على GitHub:
   git pull origin main --rebase
   ثم git push -u origin main
────────────────────────────────────────────────────────
"@ -ForegroundColor Green
