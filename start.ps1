<#
.SYNOPSIS
    Starts the CardioTwin platform (CardioTwin core, Pulse 911, MedClear) behind one local URL.

.DESCRIPTION
    One launcher for the whole repository. It starts the API gateway, the interop receiver,
    and the dashboard frontend, then prints a single dashboard link.

.PARAMETER Database
    sqlite   (default) Synthetic, deterministic data in a local file. No Docker needed.
    postgres Uses PostgreSQL in Docker Desktop.

.PARAMETER Port
    Dashboard port on localhost. Default 5173.

.PARAMETER AI
    Enables live AI calls. Needs provider keys in .env.

.PARAMETER NoBrowser
    Do not open the dashboard in a browser.

.EXAMPLE
    .\start.ps1

.EXAMPLE
    .\start.ps1 -Database postgres -Port 5180 -NoBrowser
#>
param(
    [ValidateSet('sqlite', 'postgres')]
    [string]$Database = 'sqlite',

    [ValidateRange(1024, 65535)]
    [int]$Port = 5173,

    [switch]$AI,

    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'

$core = Join-Path $PSScriptRoot 'cardio-engineering\core'
$demo = Join-Path $core 'backend\scripts\track7_demo.py'
$python = Join-Path $core 'backend\.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $python)) {
    $python = (Get-Command python -ErrorAction Stop).Source
}

$demoArgs = @($demo, '--keep-running', '--frontend-port', "$Port")
if ($Database -eq 'sqlite') { $demoArgs += '--sqlite' }
if ($AI) { $demoArgs += '--ai' }
if (-not $NoBrowser) { $demoArgs += '--open' }

Write-Host '=================================================================' -ForegroundColor Cyan
Write-Host ' CardioTwin platform' -ForegroundColor White
Write-Host " Database: $Database" -ForegroundColor Green
Write-Host '=================================================================' -ForegroundColor Cyan

& $python @demoArgs
exit $LASTEXITCODE
