param(
  [string]$StartMenuDirectory = (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs')
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$launcherPath = Join-Path $projectRoot 'DMForge.exe'
if (-not (Test-Path -LiteralPath $launcherPath)) {
  throw 'DMForge.exe was not found. Run this installer from the extracted portable directory.'
}

$resolvedRoot = [System.IO.Path]::GetFullPath($projectRoot)
$shortcutDirectory = [System.IO.Path]::GetFullPath($StartMenuDirectory)
New-Item -ItemType Directory -Path $shortcutDirectory -Force | Out-Null
$shortcutPath = Join-Path $shortcutDirectory 'DMForge.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $launcherPath
$shortcut.WorkingDirectory = $resolvedRoot
$shortcut.IconLocation = "$launcherPath,0"
$shortcut.Description = 'DMForge TRPG 战役辅助台'
$shortcut.Save()

Write-Host 'DMForge was installed in the Start menu.' -ForegroundColor Green
Write-Host 'Search for DMForge, then right-click it to pin it to Start or the taskbar.'
