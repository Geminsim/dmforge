param(
  [switch]$NoBrowser,
  [int]$Port = 5173
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$tokenFile = Join-Path $projectRoot '.dmforge-sync-token'
$localUrl = "http://127.0.0.1:$Port"

function Test-DMForgeReady {
  try {
    $health = Invoke-RestMethod -Uri "$localUrl/api/health" -TimeoutSec 1
    return $health.status -eq 'ok'
  } catch {
    return $false
  }
}

if (-not (Test-DMForgeReady)) {
  $startScript = Join-Path $PSScriptRoot 'start-local.ps1'
  $arguments = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-WindowStyle', 'Hidden',
    '-File', "`"$startScript`"",
    '-NoBrowser',
    '-Port', $Port.ToString()
  )
  Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -WorkingDirectory $projectRoot -WindowStyle Hidden | Out-Null

  $ready = $false
  for ($attempt = 0; $attempt -lt 80; $attempt++) {
    Start-Sleep -Milliseconds 250
    if (Test-DMForgeReady) { $ready = $true; break }
  }
  if (-not $ready) { throw 'DMForge local service timed out. Run run.bat to view detailed errors.' }
}

if (-not $NoBrowser) {
  $token = if (Test-Path -LiteralPath $tokenFile) { (Get-Content -LiteralPath $tokenFile -Raw).Trim() } else { '' }
  $launchUrl = if ($token) { "$localUrl/#syncToken=$token" } else { $localUrl }
  Start-Process $launchUrl
}
