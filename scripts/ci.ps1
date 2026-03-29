Write-Host "SCRIPT STARTET JETZT!!!"
Write-Host " Starte lokale CI..."

# ===== FRONTEND (ROOT) =====
Write-Host " Frontend (Root)"
Set-Location ..

npm ci
if ($LASTEXITCODE -ne 0) { exit 1 }

npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }

# ===== BACKEND =====
Write-Host " Backend"
Set-Location ./server

npm ci
if ($LASTEXITCODE -ne 0) { exit 1 }

node --check index.js
if ($LASTEXITCODE -ne 0) { exit 1 }

Set-Location ..

Write-Host " Alles erfolgreich!"