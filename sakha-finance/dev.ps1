# SAKHA Finance Operations dev stack control — Windows PowerShell 5.1
# Usage:
#   .\dev.ps1 up      -> start Postgres (if down) + Laravel API on a free dedicated port
#   .\dev.ps1 down    -> stop this project's Laravel API (Postgres stays up)
#   .\dev.ps1 pgdown  -> stop Postgres too
#   .\dev.ps1 status  -> report what is running + chosen port
#
# Port policy: This project owns the 8650-8699 range. We never use a port that is
# occupied, and we only ever stop processes that belong to THIS project.
# All long-running processes are detached via run-lib.ps1, so this never blocks.

$ErrorActionPreference = 'Stop'

$Root     = $PSScriptRoot
. (Join-Path $Root 'run-lib.ps1')

$PgBin    = 'C:\Users\raso8\pgsql17\pgsql\bin'
$PgData   = 'C:\Users\raso8\pgsql17\data'
# Ports to look for an existing cluster on. The machine has one on 5432; the
# project historically assumed its own on 5433. Either is fine, so both are
# probed before anything is started.
$PgCandidates = @(5432, 5433)
$PgPort       = $PgCandidates[0]
$LogDir   = Join-Path $Root 'storage\logs'
$PortFile = Join-Path $Root '.devport'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Find-RunningPostgres {
    # Returns the first candidate port that accepts a connection, or $null.
    foreach ($candidate in $PgCandidates) {
        if (Test-Port -Port $candidate) { return $candidate }
    }
    return $null
}

function Set-ProjectDatabasePort([int]$Port) {
    # The application and the test suite must agree on the port, or one of them
    # silently connects to nothing. Both files are rewritten together.
    $envFile = Join-Path $Root '.env'
    if (Test-Path $envFile) {
        $text = Get-Content $envFile -Raw
        $text = [regex]::Replace($text, 'DB_PORT=\d+', "DB_PORT=$Port")
        Set-Content -Path $envFile -Value $text -NoNewline -Encoding UTF8
    }

    $phpunitFile = Join-Path $Root 'phpunit.xml'
    if (Test-Path $phpunitFile) {
        $text = Get-Content $phpunitFile -Raw
        $text = [regex]::Replace(
            $text,
            'name="DB_PORT" value="\d+"',
            "name=`"DB_PORT`" value=`"$Port`""
        )
        Set-Content -Path $phpunitFile -Value $text -NoNewline -Encoding UTF8
    }
}

function Start-Postgres {
    # An already-running cluster is used as-is. Starting a second postmaster
    # against the same data directory fails on the lock file, and the failure
    # message points at the data directory rather than at the real cause.
    $running = Find-RunningPostgres
    if ($running) {
        $script:PgPort = $running
        Write-Host "Postgres    : already running on $running"
        Set-ProjectDatabasePort $running
        return
    }

    $pidFile = Join-Path $PgData 'postmaster.pid'
    if (Test-Path $pidFile) {
        $pgpid = Get-Content $pidFile -TotalCount 1
        if (-not (Get-Process -Id $pgpid -ErrorAction SilentlyContinue)) {
            Remove-Item $pidFile -Force
        }
        else {
            Write-Host "Postgres    : a postmaster (PID $pgpid) holds the data directory but no port in $($PgCandidates -join ', ') answers."
            Write-Host "              Check the cluster's actual port, or stop it first."
            throw 'Postgres is running on an unexpected port.'
        }
    }

    Write-Host "Postgres    : starting on $PgPort ..."
    Start-Detached -Name 'postgres' -LogDir $LogDir -Command ('"' + $PgBin + '\postgres.exe" -D "' + $PgData + '" -p ' + $PgPort)

    if (Wait-Port -Port $PgPort -TimeoutSec 15) {
        Write-Host "Postgres    : ready on $PgPort"
        Set-ProjectDatabasePort $PgPort
    }
    else {
        throw "Postgres did not become ready. See $LogDir\postgres.err.log"
    }
}

function Get-FreePort {
    $free = (& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root 'find-port.ps1')).Trim()
    if ($free -eq 'NONE') { throw 'No free port in the SAKHA range (8650-8699).' }
    return [int]$free
}

function Start-Api([int]$Port) {
    Write-Host "Laravel API : starting on $Port ..."
    Start-Detached -Name 'api' -LogDir $LogDir -Command ('php artisan serve --host=127.0.0.1 --port=' + $Port) -WorkDir $Root

    if (Wait-Port -Port $Port -TimeoutSec 25) {
        Set-Content -Path $PortFile -Value $Port -Encoding ASCII
        Write-Host "Laravel API : ready http://127.0.0.1:$Port"
        return $true
    }
    return $false
}

$action = 'status'
if ($args.Count -gt 0) { $action = $args[0] }

switch ($action) {
    'up' {
        Start-Postgres

        # Stop any stale SAKHA Finance Operations server first (scoped to this project path only).
        $stopped = Stop-ProjectProcesses -ProjectPath $Root
        if ($stopped -gt 0) {
            Write-Host "Cleanup     : stopped $stopped stale process(es)"
            Start-Sleep -Milliseconds 500
        }

        # Try up to 3 free ports; if the server fails to bind, advance to the next.
        $started = $false
        for ($attempt = 0; $attempt -lt 3 -and -not $started; $attempt++) {
            $port = Get-FreePort
            if (Start-Api -Port $port) { $started = $true }
            else {
                Write-Host "Laravel API : port $port failed to bind, trying next…"
                Stop-ProjectProcesses -ProjectPath $Root | Out-Null
            }
        }

        if (-not $started) { throw "Laravel API could not start on any free port. See $LogDir\api.err.log" }
        Write-Host ""
        Write-Host "Stack up. Port recorded in .devport."
    }
    'down' {
        $n = Stop-ProjectProcesses -ProjectPath $Root
        Write-Host "Stopped $n SAKHA process(es). Postgres left running."
    }
    'pgdown' {
        if (Test-Port -Port $PgPort) {
            & "$PgBin\pg_ctl.exe" -D $PgData stop -m fast | Out-Null
            Write-Host "Postgres stopped."
        } else { Write-Host "Postgres not running." }
    }
    'status' {
        $pg = 'down'; if (Test-Port -Port $PgPort) { $pg = "UP ($PgPort)" }
        Write-Host "Postgres    : $pg"

        $api = 'down'; $port = $null
        if (Test-Path $PortFile) {
            $p = (Get-Content $PortFile -TotalCount 1).Trim()
            if ($p -match '^\d+$') {
                $port = [int]$p
                if (Test-Port -Port $port) { $api = "UP ($port)" }
            }
        }
        Write-Host "Laravel API : $api"
        if ($port) { Write-Host "Base URL    : http://127.0.0.1:$port" }
    }
    default { Write-Host "Usage: .\dev.ps1 [up|down|pgdown|status]" }
}
