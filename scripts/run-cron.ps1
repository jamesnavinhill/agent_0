param(
    [string]$ProjectRoot = "C:\Users\james\projects\komorebi",
    [string]$CronEndpoint = "http://localhost:3000/api/cron"
)

$envFile = Join-Path $ProjectRoot ".env.local"
if (!(Test-Path $envFile)) {
    throw "Missing .env.local at $envFile"
}

$lines = Get-Content $envFile
$envMap = @{}
foreach ($line in $lines) {
    if ($line -match '^\s*#') { continue }
    if ($line -match '^\s*$') { continue }
    $parts = $line -split '=', 2
    if ($parts.Count -eq 2) {
        $envMap[$parts[0].Trim()] = $parts[1].Trim()
    }
}

$cronSecret = $envMap["CRON_SECRET"]
if (-not $cronSecret) {
    throw "CRON_SECRET not found in .env.local"
}

Invoke-WebRequest -UseBasicParsing -Headers @{ Authorization = "Bearer $cronSecret" } $CronEndpoint | Out-Null

