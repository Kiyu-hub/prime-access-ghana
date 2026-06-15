# ============================================================
# Prime Access Ghana — one-shot deploy helper (Windows PowerShell)
# Usage:  pwsh scripts/deploy.ps1 "commit message"
# Or:     scripts\deploy.ps1
# ============================================================

param(
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"

# Move to repo root (this script lives in /scripts)
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# 1. Git status — show what's about to ship
Write-Host "`n=== Repo status ===" -ForegroundColor Cyan
git status --short

# 2. Build commit message
if (-not $Message) {
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    $Message = "Deploy: portal updates ($stamp)"
}

# 3. Stage + commit (skip empty commits)
$pending = git status --porcelain
if (-not $pending) {
    Write-Host "`nNo changes to commit." -ForegroundColor Yellow
} else {
    Write-Host "`n=== Committing ===" -ForegroundColor Cyan
    git add -A
    git commit -m "$Message"
}

# 4. Push
Write-Host "`n=== Pushing to origin/main ===" -ForegroundColor Cyan
git push origin main

# 5. Netlify auto-deploys from the connected repo. Tail the deploy if the
#    Netlify CLI is installed; otherwise just print the URL.
if (Get-Command netlify -ErrorAction SilentlyContinue) {
    Write-Host "`n=== Netlify deploy ===" -ForegroundColor Cyan
    netlify deploy --prod
} else {
    Write-Host "`nNetlify CLI not installed. Netlify will auto-deploy from GitHub." -ForegroundColor Yellow
    Write-Host "To install:  npm i -g netlify-cli  (optional)" -ForegroundColor DarkGray
}

Write-Host "`nDone." -ForegroundColor Green
