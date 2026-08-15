param(
  [string]$StartMenuDirectory = (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs')
)

$ErrorActionPreference = 'Stop'
$shortcutPath = Join-Path ([System.IO.Path]::GetFullPath($StartMenuDirectory)) 'DMForge.lnk'
if (Test-Path -LiteralPath $shortcutPath) {
  Remove-Item -LiteralPath $shortcutPath -Force
  Write-Host 'The DMForge Start menu entry was removed.' -ForegroundColor Green
} else {
  Write-Host 'No DMForge Start menu entry was found.'
}
