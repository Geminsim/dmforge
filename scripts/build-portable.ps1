param(
  [string]$OutputDirectory = 'release',
  [switch]$SkipZip
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$separator = [System.IO.Path]::DirectorySeparatorChar
$resolvedProjectRoot = [System.IO.Path]::GetFullPath($projectRoot).TrimEnd($separator)
$outputRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $OutputDirectory))
if (-not $outputRoot.StartsWith($resolvedProjectRoot + $separator, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'OutputDirectory must stay inside the project directory.'
}
$packageRoot = Join-Path $outputRoot 'DMForge-portable'
$zipPath = Join-Path $outputRoot 'DMForge-portable-windows-x64.zip'
$nodeSource = (Get-Command node -ErrorAction Stop).Source
$nodeTarget = (& $nodeSource -p "process.platform + ':' + process.arch").Trim()
if ($nodeTarget -ne 'win32:x64') {
  throw "Portable Windows x64 build requires win32:x64 Node.js; found $nodeTarget."
}

Push-Location $projectRoot
try {
  Write-Host 'Running quality checks and production build...' -ForegroundColor Cyan
  & npm.cmd run verify
  if ($LASTEXITCODE -ne 0) { throw 'npm run verify failed; portable package was not created.' }
} finally {
  Pop-Location
}

if (Test-Path -LiteralPath $packageRoot) {
  Remove-Item -LiteralPath $packageRoot -Recurse -Force
}
New-Item -ItemType Directory -Path (Join-Path $packageRoot 'runtime') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageRoot 'scripts') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageRoot 'src') -Force | Out-Null

Copy-Item -LiteralPath $nodeSource -Destination (Join-Path $packageRoot 'runtime\node.exe')
Copy-Item -LiteralPath (Join-Path $projectRoot 'dist') -Destination $packageRoot -Recurse
Copy-Item -LiteralPath (Join-Path $projectRoot 'server') -Destination $packageRoot -Recurse
Copy-Item -LiteralPath (Join-Path $projectRoot 'src\utils') -Destination (Join-Path $packageRoot 'src\utils') -Recurse
Copy-Item -LiteralPath (Join-Path $projectRoot 'server.mjs') -Destination $packageRoot
Copy-Item -LiteralPath (Join-Path $projectRoot 'scripts\start-local.ps1') -Destination (Join-Path $packageRoot 'scripts')
Copy-Item -LiteralPath (Join-Path $projectRoot 'scripts\launch-app.ps1') -Destination (Join-Path $packageRoot 'scripts')
Copy-Item -LiteralPath (Join-Path $projectRoot 'scripts\install-start-menu.ps1') -Destination (Join-Path $packageRoot 'scripts')
Copy-Item -LiteralPath (Join-Path $projectRoot 'scripts\uninstall-start-menu.ps1') -Destination (Join-Path $packageRoot 'scripts')
Copy-Item -LiteralPath (Join-Path $projectRoot 'run.bat') -Destination $packageRoot
Copy-Item -LiteralPath (Join-Path $projectRoot 'install-start-menu.bat') -Destination $packageRoot
Copy-Item -LiteralPath (Join-Path $projectRoot 'uninstall-start-menu.bat') -Destination $packageRoot
Copy-Item -LiteralPath (Join-Path $projectRoot 'README.md') -Destination $packageRoot

$compilerCandidates = @(
  (Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'),
  (Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe')
)
$compiler = $compilerCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $compiler) { throw 'Windows C# compiler was not found; DMForge.exe could not be built.' }
$projectLauncher = Join-Path $projectRoot 'DMForge.exe'
$launcherIcon = Join-Path $projectRoot 'launcher\assets\DMForge.ico'
if (-not (Test-Path -LiteralPath $launcherIcon)) { throw 'DMForge launcher icon is missing.' }
& $compiler /nologo /target:winexe /optimize+ /reference:System.Windows.Forms.dll "/win32icon:$launcherIcon" "/out:$projectLauncher" (Join-Path $projectRoot 'launcher\DMForgeLauncher.cs')
if ($LASTEXITCODE -ne 0) { throw 'DMForge.exe compilation failed.' }
Copy-Item -LiteralPath $projectLauncher -Destination (Join-Path $packageRoot 'DMForge.exe') -Force

if (-not $SkipZip) {
  if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
  Compress-Archive -Path (Join-Path $packageRoot '*') -DestinationPath $zipPath -CompressionLevel Optimal
  Write-Host "Portable ZIP created: $zipPath" -ForegroundColor Green
} else {
  Write-Host "Portable directory created: $packageRoot" -ForegroundColor Green
}
