$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Python 3.11 or newer is required." -ForegroundColor Red
    exit 1
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node 22.12 or newer is required." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path ".venv\Scripts\python.exe")) {
    python -m venv .venv
}
& ".venv\Scripts\python.exe" -m pip install -r "backend\requirements.lock"
$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"
npm ci
npm run build

Write-Host "DocuForge M1 setup complete." -ForegroundColor Green
Write-Host "Start with scripts\start-docuforge.cmd"
