$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Python = Join-Path $Root ".venv\Scripts\python.exe"
$Frontend = Join-Path $Root "frontend\dist\index.html"

if (-not (Test-Path $Python)) {
    Write-Host "DocuForge environment is missing." -ForegroundColor Red
    Write-Host "Run scripts\setup-docuforge.ps1 first."
    exit 1
}
if (-not (Test-Path $Frontend)) {
    Write-Host "DocuForge frontend is not built." -ForegroundColor Red
    Write-Host "Run scripts\setup-docuforge.ps1 first."
    exit 1
}

$env:PYTHONPATH = Join-Path $Root "backend"
Set-Location $Root
& $Python -m docuforge.supervisor
exit $LASTEXITCODE
