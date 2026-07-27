# Publish Road Runner customer app into Kelal for web demo (/road-runner/).
# Writes:
#   1) dist/road-runner     — local/ngrok preview (vite preview / ngrok)
#   2) public/road-runner   — included in Kelal production builds (DigitalOcean / master-build)
#
# Run:
#   & "C:\Users\Michel Tadesse\Road Runner\scripts\publish-preview-to-kelal-dist.ps1"

$ErrorActionPreference = "Stop"

$CustomerRoot = "C:\Users\Michel Tadesse\Road Runner\apps\customer"
$KelalRoot    = "C:\Users\Michel Tadesse\KelalGatewayApp"
$KelalDistRr  = Join-Path $KelalRoot "dist\road-runner"
$KelalPublicRr = Join-Path $KelalRoot "public\road-runner"
$EnvLocal     = Join-Path $CustomerRoot ".env.local"

if (-not (Test-Path -LiteralPath $CustomerRoot)) {
  throw "Road Runner customer app not found: $CustomerRoot"
}

if (-not (Test-Path -LiteralPath $EnvLocal)) {
  Write-Host "WARNING: .env.local missing. Maps/Supabase keys will not be baked into the preview." -ForegroundColor Yellow
} else {
  $mapsSet = Select-String -Path $EnvLocal -Pattern "^VITE_GOOGLE_MAPS_API_KEY=.+" -Quiet
  if (-not $mapsSet) {
    Write-Host "WARNING: VITE_GOOGLE_MAPS_API_KEY is empty in .env.local" -ForegroundColor Yellow
  }
}

Push-Location -LiteralPath $CustomerRoot
try {
  Write-Host "Building Road Runner with base=/road-runner/ ..." -ForegroundColor Yellow
  npm run build -- --base=/road-runner/
  if ($LASTEXITCODE -ne 0) {
    throw "Road Runner build failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

$CustomerDist = Join-Path $CustomerRoot "dist"
function Publish-RoadRunnerFolder([string]$Target) {
  if (Test-Path -LiteralPath $Target) {
    Remove-Item -LiteralPath $Target -Recurse -Force
  }
  New-Item -ItemType Directory -Path $Target -Force | Out-Null
  Copy-Item -Path (Join-Path $CustomerDist "*") -Destination $Target -Recurse -Force
  Write-Host "Published to $Target" -ForegroundColor Green
}

Publish-RoadRunnerFolder $KelalDistRr
Publish-RoadRunnerFolder $KelalPublicRr

Write-Host "Open /road-runner/ on ngrok or after Kelal web deploy" -ForegroundColor Cyan
Write-Host "Add Maps API key HTTP referrer for your live domain, e.g. https://YOUR-DOMAIN/*" -ForegroundColor Cyan
