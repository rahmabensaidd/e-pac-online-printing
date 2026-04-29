$ErrorActionPreference = "Stop"

$mountRoot = if ($env:PRICING_MOUNT_ROOT) { $env:PRICING_MOUNT_ROOT } else { "C:\pricing" }
$seedCsv = Join-Path $PSScriptRoot "..\seed-data\epac_historiquee.csv"

$directories = @(
  "sql-dumps",
  "processed",
  "static",
  "consolidated",
  "processed-data",
  "enriched",
  "features",
  "runtime",
  "artifacts"
)

foreach ($directory in $directories) {
  New-Item -ItemType Directory -Force -Path (Join-Path $mountRoot $directory) | Out-Null
}

if (-not (Test-Path -Path $seedCsv)) {
  throw "Seed CSV not found at $seedCsv"
}

Copy-Item -Force -Path $seedCsv -Destination (Join-Path $mountRoot "static\epac_historiquee.csv")

Write-Host "Pricing mount folders prepared under $mountRoot"
Write-Host "Static CSV seeded to $(Join-Path $mountRoot 'static\epac_historiquee.csv')"
