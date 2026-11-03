# Dongil service control for Windows: start | update | stop
# ASCII only: Windows PowerShell 5.1 misreads UTF-8 files without a BOM.
param([Parameter(Mandatory = $true)][ValidateSet('start', 'update', 'stop')][string]$Action)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$WebDir = Join-Path $Root 'apps\web'
$WebPort = 4173
$ApiHealthUrl = 'http://127.0.0.1:3000/api/docs'
$WebLog = Join-Path $env:TEMP 'dongil-web.log'
Set-Location $Root

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  $env:Path += ';C:\Program Files\Docker\Docker\resources\bin'
}

function Say([string]$Message) { Write-Host "[dongil] $Message" }

# Native tools write progress to stderr, so only the exit code decides failure.
function Run([string]$Exe, [string[]]$Argv) {
  $ErrorActionPreference = 'Continue'
  & $Exe @Argv
  if ($LASTEXITCODE -ne 0) { throw "Failed (exit $LASTEXITCODE): $Exe $($Argv -join ' ')" }
}

function Assert-File([string]$Path, [string]$Hint) {
  if (-not (Test-Path $Path)) { throw "Missing $Path. $Hint" }
}

function Assert-Config {
  Assert-File (Join-Path $Root '.env') 'Put JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in it.'
  Assert-File (Join-Path $WebDir '.env.local') 'Put VITE_API_URL=https://<host>.<tailnet>.ts.net:8443/api/v1 in it.'
}

function Get-WebProcessId {
  Get-NetTCPConnection -State Listen -LocalPort $WebPort -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty OwningProcess
}

function Stop-Web {
  $id = Get-WebProcessId
  if (-not $id) { Say 'Web is not running.'; return }
  $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$id").CommandLine
  # Never kill something else that happens to hold the port.
  if ($cmd -notlike "*$Root*") { throw "Port $WebPort is used by another program: $cmd" }
  Stop-Process -Id $id -Force
  while (Get-WebProcessId) { Start-Sleep -Milliseconds 300 }
  Say 'Web stopped.'
}

function Build-Web {
  Say 'Building web...'
  Push-Location $WebDir
  try { Run 'pnpm.cmd' @('build') } finally { Pop-Location }
}

function Start-Web {
  if (Get-WebProcessId) { Say 'Web is already running.'; return }
  if (-not (Test-Path (Join-Path $WebDir 'dist\index.html'))) {
    if (-not (Test-Path (Join-Path $Root 'node_modules'))) { Run 'pnpm.cmd' @('install', '--frozen-lockfile') }
    Build-Web
  }
  # Loopback only: Tailscale Serve proxies to it, so the LAN does not need it.
  $line = "pnpm exec vite preview --host 127.0.0.1 --port $WebPort --strictPort > `"$WebLog`" 2>&1"
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', $line -WorkingDirectory $WebDir -WindowStyle Hidden
  Say 'Web starting...'
}

function Test-Docker {
  cmd /c 'docker info >nul 2>&1'
  return $LASTEXITCODE -eq 0
}

function Start-Docker {
  if (Test-Docker) { return }
  $exe = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
  Assert-File $exe 'Install Docker Desktop.'
  Say 'Starting Docker Desktop...'
  if (-not (Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue)) { Start-Process $exe }
  for ($i = 0; $i -lt 90; $i++) {
    if (Test-Docker) { return }
    Start-Sleep 2
  }
  throw 'Docker Desktop did not become ready within 3 minutes.'
}

function Start-Containers([string[]]$Extra = @()) {
  try {
    Run 'docker' (@('compose', '--profile', 'prod', 'up', '-d') + $Extra)
  } catch {
    Say 'If a port could not be bound, check: netsh int ipv4 show excludedportrange protocol=tcp'
    throw
  }
}

function Wait-Http([string]$Name, [string]$Url) {
  for ($i = 0; $i -lt 60; $i++) {
    try {
      $null = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
      Say "$Name is up: $Url"
      return
    } catch { Start-Sleep 2 }
  }
  throw "$Name did not respond within 2 minutes: $Url"
}

function Wait-Services {
  Wait-Http 'API' $ApiHealthUrl
  try { Wait-Http 'Web' "http://127.0.0.1:$WebPort/" }
  catch { Say "See the web log: $WebLog"; throw }
}

function Assert-Repo {
  $branch = (& git rev-parse --abbrev-ref HEAD)
  if ($branch -ne 'main') { throw "Update runs on main only (current: $branch)." }
  $dirty = (& git status --porcelain --untracked-files=no)
  if ($dirty) { throw "Local changes would be mixed in. Commit or discard them first:`n$($dirty -join "`n")" }
}

try {
  switch ($Action) {
    'start' {
      Assert-Config
      Start-Web
      Start-Docker
      Start-Containers
      Wait-Services
    }
    'update' {
      Assert-Config
      Assert-Repo
      Start-Docker
      Say 'Pulling...'
      Run 'git' @('pull', '--ff-only', 'origin', 'main')
      Run 'pnpm.cmd' @('install', '--frozen-lockfile')
      # Build first: if it fails, the running services are left untouched.
      Build-Web
      Say 'Rebuilding API (migrations run when the container starts)...'
      Start-Containers @('--build')
      Stop-Web
      Start-Web
      Wait-Services
      Say "Now at: $(& git log --oneline -1)"
    }
    'stop' {
      Stop-Web
      if (Test-Docker) {
        Run 'docker' @('compose', '--profile', 'prod', 'stop')
      } else {
        Say 'Docker is not running, so there are no containers to stop.'
      }
    }
  }
  Say "$Action finished."
} catch {
  Write-Host "[dongil] ERROR: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
