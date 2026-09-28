# SAKHA Finance Operations run-lib.ps1 — shared helpers that make process control FAST and NON-BLOCKING.
#
# Root cause this prevents: spawning a never-exiting process (postgres, php artisan
# serve, node vite, pg_ctl ...) from PowerShell makes the shell block until the child's
# stdout/stderr pipes close — which never happens. Result: the tool call "hangs".
#
# Rule: ALWAYS launch long-running processes with Start-Detached (redirects output to
# files + 'start /b'), and ALWAYS use Wait-Port instead of Sleep loops with slow cmdlets.

function Test-Port {
    param([int]$Port, [string]$Hostname = '127.0.0.1', [int]$TimeoutMs = 300)
    # A service may bind IPv4 (127.0.0.1) or IPv6 (::1) only, depending on how
    # it resolves its host. Try the requested address first, then fall back to
    # the loopback counterpart, so a health check never reports a false "down".
    $targets = @($Hostname)
    if ($Hostname -eq '127.0.0.1') { $targets += '::1' }
    elseif ($Hostname -eq '::1') { $targets += '127.0.0.1' }

    foreach ($target in $targets) {
        $client = New-Object System.Net.Sockets.TcpClient
        try {
            $async = $client.BeginConnect($target, $Port, $null, $null)
            if ($async.AsyncWaitHandle.WaitOne($TimeoutMs)) {
                $client.EndConnect($async)
                return $true
            }
        } catch {
            # try the next loopback address
        } finally {
            $client.Close()
        }
    }
    return $false
}

# Start a command FULLY detached. Caller returns immediately. Output -> log files.
# Uses Start-Process with redirects and NO -Wait: the child is not attached to the
# parent's console, so it survives the parent shell exiting, and the call returns at once.
function Start-Detached {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Command,
        [Parameter(Mandatory)][string]$LogDir,
        [string]$WorkDir = ''
    )
    New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
    $out = Join-Path $LogDir "$Name.out.log"
    $err = Join-Path $LogDir "$Name.err.log"

    # Guard: never pass a null/empty command to Start-Process.
    if ([string]::IsNullOrWhiteSpace($Command)) {
        throw "Start-Detached: empty command for '$Name'."
    }

    $prefix = ''
    if (-not [string]::IsNullOrWhiteSpace($WorkDir)) {
        $prefix = 'cd /d "' + $WorkDir + '" && '
    }

    $wd = $PWD.Path
    if (-not [string]::IsNullOrWhiteSpace($WorkDir)) { $wd = $WorkDir }

    $full = $prefix + $Command

    # cmd.exe strips the outermost quotes when the command starts with a quote
    # (e.g. a quoted exe path). Wrapping the whole command in an extra pair
    # (""..."" ) preserves inner quotes. This is what makes quoted paths work.
    $cmdArgs = '/c "' + $full + '"'

    $p = Start-Process -FilePath 'cmd.exe' `
        -ArgumentList $cmdArgs `
        -WorkingDirectory $wd `
        -RedirectStandardOutput $out `
        -RedirectStandardError $err `
        -WindowStyle Hidden `
        -PassThru

    return $p
}

# Poll a port until it opens or timeout. Returns $true/$false. Never blocks a process.
function Wait-Port {
    param([int]$Port, [int]$TimeoutSec = 20, [int]$IntervalMs = 300)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (Test-Port -Port $Port) { return $true }
        Start-Sleep -Milliseconds $IntervalMs
    }
    return $false
}

# Kill processes whose command line contains $Pattern. Returns count killed.
function Stop-ByNameContains {
    param([Parameter(Mandatory)][string]$Pattern)
    $procs = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine -like "*$Pattern*" })
    foreach ($p in $procs) {
        try { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
    }
    return $procs.Count
}

# Kill ONLY this project's dev processes, identified by an absolute path marker.
# Never touches other projects' servers (they would have a different path).
function Stop-ProjectProcesses {
    param([Parameter(Mandatory)][string]$ProjectPath)
    $procs = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine -like "*$ProjectPath*" })
    $killed = 0
    foreach ($p in $procs) {
        # Skip this very PowerShell process.
        if ($p.ProcessId -eq $PID) { continue }
        try {
            Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
            $killed++
        } catch {}
    }
    return $killed
}

# Run an external command with a HARD timeout, capturing output. Use this from tool
# scripts so a misbehaving child can never hang the caller.
function Invoke-WithTimeout {
    param(
        [Parameter(Mandatory)][string]$FilePath,
        [string[]]$Arguments = @(),
        [int]$TimeoutSec = 120,
        [string]$WorkDir = '.'
    )
    $job = Start-Job -ScriptBlock {
        param($fp, $ar, $wd)
        Set-Location $wd
        & $fp @ar 2>&1 | Out-String
    } -ArgumentList $FilePath, $Arguments, (Resolve-Path $WorkDir).Path

    if (Wait-Job $job -Timeout $TimeoutSec) {
        $result = Receive-Job $job
        Remove-Job $job -Force
        return @{ ok = $true; output = $result }
    }

    Stop-Job $job -ErrorAction SilentlyContinue
    Remove-Job $job -Force -ErrorAction SilentlyContinue
    return @{ ok = $false; output = "TIMEOUT after ${TimeoutSec}s" }
}
