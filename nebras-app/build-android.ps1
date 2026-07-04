# بناء مشروع Android لتطبيق نبراس — Google Play
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

function Require-Command($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: $name not found. Install Node.js LTS from https://nodejs.org" -ForegroundColor Red
        exit 1
    }
}

Require-Command node
Require-Command npm

Set-Location $Root
Write-Host "=== Nebras Android Build ===" -ForegroundColor Cyan

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm packages..."
    npm install
}

if (-not (Test-Path "android")) {
    Write-Host "Adding Android platform..."
    npx cap add android
}

Write-Host "Syncing Capacitor..."
npx cap sync android

Write-Host ""
Write-Host "OK — Opening Android Studio..." -ForegroundColor Green
Write-Host "Next: Build -> Generate Signed Bundle / APK -> AAB for Google Play"
Write-Host "See GOOGLE-PLAY.md for full steps."
npx cap open android
