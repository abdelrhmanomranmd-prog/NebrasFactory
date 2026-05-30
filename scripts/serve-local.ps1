# تشغيل موقع نبراس محلياً — مهم لمعاينة 3D
# PowerShell: cd Desktop\NebrasFactory  ثم  .\scripts\serve-local.ps1

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root
Write-Host "NebrasFactory — http://localhost:5500" -ForegroundColor Cyan
Write-Host "صمّم بابك: http://localhost:5500/index.html" -ForegroundColor Green
npx --yes serve -l 5500 .
