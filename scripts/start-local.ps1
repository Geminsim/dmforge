param(
  [switch]$NoBrowser,
  [switch]$SmokeTest,
  [int]$Port = 5173
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$portableNode = Join-Path $projectRoot 'runtime\node.exe'
$nodeCommand = if (Test-Path -LiteralPath $portableNode) { $portableNode } else { (Get-Command node -ErrorAction Stop).Source }
$tokenFile = Join-Path $projectRoot '.dmforge-sync-token'
$distIndex = Join-Path $projectRoot 'dist\index.html'

if (-not (Test-Path -LiteralPath $tokenFile)) {
  $bytes = New-Object byte[] 32
  $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
  $token = ([BitConverter]::ToString($bytes) -replace '-', '').ToLowerInvariant()
  [System.IO.File]::WriteAllText($tokenFile, $token, [System.Text.UTF8Encoding]::new($false))
} else {
  $token = (Get-Content -LiteralPath $tokenFile -Raw).Trim()
}

if ($token.Length -lt 32) {
  throw 'Invalid .dmforge-sync-token: the token must contain at least 32 characters.'
}

$isPortable = Test-Path -LiteralPath $portableNode
$needsBuild = -not (Test-Path -LiteralPath $distIndex)
if (-not $isPortable -and -not $needsBuild) {
  $latestSource = Get-ChildItem -LiteralPath (Join-Path $projectRoot 'src') -Recurse -File | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
  $needsBuild = $latestSource.LastWriteTimeUtc -gt (Get-Item -LiteralPath $distIndex).LastWriteTimeUtc
}

if ($needsBuild) {
  if ($isPortable) { throw 'Portable package is missing dist/index.html. Rebuild the package.' }
  Write-Host 'Building the latest DMForge frontend...' -ForegroundColor Cyan
  Push-Location $projectRoot
  try {
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules'))) {
      & npm.cmd ci
      if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
    }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'npm run build failed.' }
  } finally {
    Pop-Location
  }
}

$env:DMFORGE_PORT = $Port.ToString()
$env:DMFORGE_HOST = '0.0.0.0'
$env:DMFORGE_SYNC_TOKEN = $token
$localUrl = "http://127.0.0.1:$Port"
$launchUrl = "$localUrl/#syncToken=$token"

Write-Host ''
Write-Host 'DMForge is ready to start.' -ForegroundColor Green
Write-Host "Local URL: $localUrl"
Write-Host 'LAN access is enabled by default. If synchronization is unavailable, the app continues with local storage.' -ForegroundColor Yellow
Write-Host "Sync token: $token" -ForegroundColor Yellow
$lanAddresses = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | Where-Object { $_.AddressFamily -eq 'InterNetwork' }
foreach ($address in $lanAddresses) {
  Write-Host "Paired LAN URL: http://$($address.IPAddressToString):$Port/#syncToken=$token"
}
Write-Host 'Close this window or press Ctrl+C to stop the server.'
Write-Host ''

Push-Location $projectRoot
try {
  $serverProcess = Start-Process -FilePath $nodeCommand -ArgumentList 'server.mjs' -NoNewWindow -PassThru
  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    if ($serverProcess.HasExited) { throw "DMForge exited early with code $($serverProcess.ExitCode)." }
    try {
      $health = Invoke-RestMethod -Uri "$localUrl/api/health" -TimeoutSec 1
      if ($health.status -eq 'ok') { break }
    } catch {
      Start-Sleep -Milliseconds 250
    }
  }
  if ($health.status -ne 'ok') { throw 'Timed out while starting DMForge.' }
  if ($SmokeTest) {
    Write-Host 'DMForge launcher smoke test passed.' -ForegroundColor Green
    return
  }
  if (-not $NoBrowser) { Start-Process $launchUrl }
  $serverProcess.WaitForExit()
  exit $serverProcess.ExitCode
} finally {
  if ($serverProcess -and -not $serverProcess.HasExited) { Stop-Process -Id $serverProcess.Id -Force }
  Pop-Location
}
