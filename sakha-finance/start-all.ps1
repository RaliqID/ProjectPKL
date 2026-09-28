# SAKHA Finance Operations start-all.ps1 — one-shot launcher for the whole dev stack.
#
# Brings up every service the app needs and leaves them running detached:
#   1. PostgreSQL   (5432/5433, the cluster this project already owns)
#   2. Laravel API  (php artisan serve on a free port in 8650-8699)
#   3. Queue worker (php artisan queue:work, database driver)
#   4. Vite SPA     (vite dev server on 5173, proxies /api -> Laravel)
#
# Every long-running child is started via run-lib.ps1's Start-Detached, which
# redirects output to storage\logs and returns immediately, so this script
# never blocks and the services survive the parent window closing.
#
# Usage (double-click run.cmd, or):
#   .\start-all.ps1          -> start everything, open the browser
#   .\start-all.ps1 -NoOpen  -> start everything, do not open a browser
#   .\start-all.ps1 -Build   -> also run the production vite build first
#
# Idempotent: a service that is already healthy is left untouched.

param(
    [switch]$NoOpen,
    [switch]$Build
)

$ErrorActionPreference = 'Stop'

$Root     = $PSScriptRoot
. (Join-Path $Root 'run-lib.ps1')

$PgBin    = 'C:\Users\raso8\pgsql17\pgsql\bin'
$PgData   = 'C:\Users\raso8\pgsql17\data'
$PgCandidates = @(5432, 5433)
$LogDir   = Join-Path $Root 'storage\logs'
$PortFile = Join-Path $Root '.devport'
$SpaDir   = Join-Path $Root 'spa'
$SpaPort  = 5173

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# ---------------------------------------------------------------------------
# Small banner helper so the console reads like a real launcher.
# ---------------------------------------------------------------------------
function Write-Step([string]$Label, [string]$Message, [string]$Level = 'info') {
    $color = switch ($Level) {
        'ok'    { 'Green' }
        'warn'  { 'Yellow' }
        'fail'  { 'Red' }
        default { 'Cyan' }
    }
    $tag = switch ($Level) {
        'ok'    { '[ OK ]' }
        'warn'  { '[WARN]' }
        'fail'  { '[FAIL]' }
        default { '[ .. ]' }
    }
    Write-Host ("{0} {1,-13}: {2}" -f $tag, $Label, $Message) -ForegroundColor $color
}

# ---------------------------------------------------------------------------
# 0. Sanity: required tooling must be on PATH before anything is started.
# ---------------------------------------------------------------------------
function Assert-Tooling {
    $missing = @()
    if (-not (Get-Command php -ErrorAction SilentlyContinue)) { $missing += 'php' }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { $missing += 'node' }
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { $missing += 'npm' }
    if ($missing.Count -gt 0) {
        throw "Missing required tool(s) on PATH: $($missing -join ', '). Install them, reopen the terminal, and retry."
    }
    if (-not (Test-Path (Join-Path $Root 'artisan'))) {
        throw "artisan not found in $Root - is this the sakha-finance project root?"
    }
}

function Set-ProjectDatabasePort([int]$Port) {
    # Keep .env and phpunit.xml in agreement on the DB port.
    $envFile = Join-Path $Root '.env'
    if (Test-Path $envFile) {
        $text = Get-Content $envFile -Raw
        $text = [regex]::Replace($text, 'DB_PORT=\d+', "DB_PORT=$Port")
        Set-Content -Path $envFile -Value $text -NoNewline -Encoding UTF8
    }
    $phpunitFile = Join-Path $Root 'phpunit.xml'
    if (Test-Path $phpunitFile) {
        $text = Get-Content $phpunitFile -Raw
        $text = [regex]::Replace($text, 'name="DB_PORT" value="\d+"', "name=`"DB_PORT`" value=`"$Port`"")
        Set-Content -Path $phpunitFile -Value $text -NoNewline -Encoding UTF8
    }
}

# ---------------------------------------------------------------------------
# 1. PostgreSQL
# ---------------------------------------------------------------------------
function Start-Postgres {
    foreach ($candidate in $PgCandidates) {
        if (Test-Port -Port $candidate) {
            Set-ProjectDatabasePort $candidate
            Write-Step 'PostgreSQL' "already running on $candidate" 'ok'
            return
        }
    }

    $pidFile = Join-Path $PgData 'postmaster.pid'
    if (Test-Path $pidFile) {
        $pgpid = Get-Content $pidFile -TotalCount 1
        if (-not (Get-Process -Id $pgpid -ErrorAction SilentlyContinue)) {
            Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
        }
    }

    $port = $PgCandidates[0]
    Write-Step 'PostgreSQL' "starting on $port ..."
    Start-Detached -Name 'postgres' -LogDir $LogDir `
        -Command ('"' + $PgBin + '\postgres.exe" -D "' + $PgData + '" -p ' + $port) | Out-Null

    if (Wait-Port -Port $port -TimeoutSec 15) {
        Set-ProjectDatabasePort $port
        Write-Step 'PostgreSQL' "ready on $port" 'ok'
    } else {
        throw "PostgreSQL did not become ready. See $LogDir\postgres.err.log"
    }
}

function Get-FreePort {
    $free = (& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root 'find-port.ps1')).Trim()
    if ($free -eq 'NONE') { throw 'No free port in the SAKHA range (8650-8699).' }
    return [int]$free
}

# ---------------------------------------------------------------------------
# 2. Laravel API
# ---------------------------------------------------------------------------
function Start-Api {
    # Reuse a healthy server on the recorded port if one is already up.
    if (Test-Path $PortFile) {
        $p = (Get-Content $PortFile -TotalCount 1).Trim()
        if ($p -match '^\d+$' -and (Test-Port -Port ([int]$p))) {
            Write-Step 'Laravel API' "already running on $p" 'ok'
            return [int]$p
        }
    }

    for ($attempt = 0; $attempt -lt 3; $attempt++) {
        $port = Get-FreePort
        Write-Step 'Laravel API' "starting on $port ..."
        Start-Detached -Name 'api' -LogDir $LogDir `
            -Command ('php artisan serve --host=127.0.0.1 --port=' + $port) -WorkDir $Root | Out-Null

        if (Wait-Port -Port $port -TimeoutSec 25) {
            Set-Content -Path $PortFile -Value $port -Encoding ASCII
            Write-Step 'Laravel API' "ready http://127.0.0.1:$port" 'ok'
            return $port
        }
        Write-Step 'Laravel API' "port $port failed to bind, trying next" 'warn'
        Stop-ProjectProcesses -ProjectPath $Root | Out-Null
    }
    throw "Laravel API could not start on any free port. See $LogDir\api.err.log"
}

# ---------------------------------------------------------------------------
# 3. Queue worker (database driver -> needs a running worker)
# ---------------------------------------------------------------------------
# `php artisan queue:work` does not put the project path in its own command
# line (only the wrapping cmd.exe gets it), so path-based cleanup leaves
# orphaned workers behind. We therefore track the worker PIDs in a pidfile and
# reap that set on every start, which is authoritative regardless of parentage.
function Get-QueuePidFile { Join-Path $LogDir 'queue.pids' }

function Stop-QueueWorkers {
    $pidFile = Get-QueuePidFile
    $killed = 0
    if (Test-Path $pidFile) {
        foreach ($line in (Get-Content $pidFile -ErrorAction SilentlyContinue)) {
            $wp = 0
            if ([int]::TryParse($line.Trim(), [ref]$wp)) {
                if (Get-Process -Id $wp -ErrorAction SilentlyContinue) {
                    Stop-Process -Id $wp -Force -ErrorAction SilentlyContinue
                    $killed++
                }
            }
        }
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    }
    return $killed
}

function Get-LiveQueueWorkerPid {
    $pidFile = Get-QueuePidFile
    if (-not (Test-Path $pidFile)) { return $null }
    foreach ($line in (Get-Content $pidFile -ErrorAction SilentlyContinue)) {
        $wp = 0
        if ([int]::TryParse($line.Trim(), [ref]$wp)) {
            if (Get-Process -Id $wp -ErrorAction SilentlyContinue) { return $wp }
        }
    }
    return $null
}

function Start-QueueWorker {
    # Reap any worker we previously started so a re-run never stacks workers.
    $reaped = Stop-QueueWorkers
    if ($reaped -gt 0) {
        Write-Step 'Queue worker' "stopped $reaped previous worker(s)"
        Start-Sleep -Milliseconds 400
    }

    Write-Step 'Queue worker' 'starting (database driver) ...'
    Start-Detached -Name 'queue' -LogDir $LogDir `
        -Command 'php artisan queue:work --sleep=1 --tries=3' -WorkDir $Root | Out-Null
    Start-Sleep -Milliseconds 1000

    # Record the real php.exe worker PID (the child), not the cmd.exe wrapper.
    $worker = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -eq 'php.exe' -and $_.CommandLine -and $_.CommandLine -like '*queue:work*' } |
        Sort-Object CreationDate -Descending | Select-Object -First 1)

    if ($worker.Count -gt 0) {
        Set-Content -Path (Get-QueuePidFile) -Value $worker[0].ProcessId -Encoding ASCII
        Write-Step 'Queue worker' "running (PID $($worker[0].ProcessId))" 'ok'
    } else {
        Write-Step 'Queue worker' "did not stay up - see $LogDir\queue.err.log" 'warn'
    }
}

# ---------------------------------------------------------------------------
# 4. Vite SPA
# ---------------------------------------------------------------------------
function Start-Spa {
    if (Test-Port -Port $SpaPort) {
        Write-Step 'Vite SPA' "already running on $SpaPort" 'ok'
        return $true
    }

    if (-not (Test-Path (Join-Path $SpaDir 'node_modules'))) {
        Write-Step 'Vite SPA' 'installing npm dependencies (first run) ...' 'warn'
        Push-Location $SpaDir
        try { & npm install --no-audit --no-fund | Out-Null } finally { Pop-Location }
    }

    Write-Step 'Vite SPA' "starting on $SpaPort ..."
    Start-Detached -Name 'vite' -LogDir $LogDir -Command 'npm run dev' -WorkDir $SpaDir | Out-Null

    if (Wait-Port -Port $SpaPort -TimeoutSec 40) {
        Write-Step 'Vite SPA' "ready http://127.0.0.1:$SpaPort" 'ok'
        return $true
    }
    Write-Step 'Vite SPA' "did not open port $SpaPort - see $LogDir\vite.err.log" 'fail'
    return $false
}

# ---------------------------------------------------------------------------
# Optional: production build (only with -Build)
# ---------------------------------------------------------------------------
function Invoke-Build {
    Write-Step 'Build' 'running production vite build ...'
    Push-Location $SpaDir
    try {
        & npm run build
        if ($LASTEXITCODE -ne 0) { throw "vite build failed (exit $LASTEXITCODE)" }
        Write-Step 'Build' 'production assets written to public/' 'ok'
    } finally { Pop-Location }
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
Write-Host ''
Write-Host '  SAKHA Finance Operations dev stack' -ForegroundColor White
Write-Host '  -----------------' -ForegroundColor DarkGray

Assert-Tooling

# Stop only this project's stale processes so re-runs stay clean. Queue workers
# are not path-identifiable, so they are reaped separately via their pidfile.
$stopped = Stop-ProjectProcesses -ProjectPath $Root
$reaped = Stop-QueueWorkers
if (($stopped + $reaped) -gt 0) {
    Write-Step 'Cleanup' "stopped $($stopped + $reaped) stale process(es)"
    Start-Sleep -Milliseconds 500
}

if ($Build) { Invoke-Build }

Start-Postgres
$apiPort = Start-Api
Start-QueueWorker
$spaOk = Start-Spa

Write-Host ''
if ($spaOk) {
    Write-Host '  All services are up.' -ForegroundColor Green
} else {
    Write-Host '  Started with errors - see [FAIL] lines above.' -ForegroundColor Yellow
}
Write-Host ''
Write-Host ("  App (SPA)   : http://127.0.0.1:{0}" -f $SpaPort) -ForegroundColor White
Write-Host ("  API         : http://127.0.0.1:{0}" -f $apiPort) -ForegroundColor White
Write-Host ("  Logs        : {0}" -f $LogDir) -ForegroundColor DarkGray
Write-Host ''
Write-Host '  Stop everything with: .\dev.ps1 down   (Postgres stays up)' -ForegroundColor DarkGray
Write-Host ''

if (-not $spaOk) {
    # Exit non-zero so run.cmd shows the failure and pauses for the operator.
    exit 1
}

if (-not $NoOpen) {
    Start-Process ("http://127.0.0.1:{0}" -f $SpaPort)
}

# Give a double-clicked window a moment to be read before it closes.
if ($Host.Name -eq 'ConsoleHost' -and -not $NoOpen) {
    Start-Sleep -Seconds 2
}
