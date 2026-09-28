# SAKHA Finance Operations public HTTPS tunnel — Windows PowerShell 5.1
# Usage:
#   .\tunnel.ps1 up      -> start a Cloudflare quick tunnel and point the app at it
#   .\tunnel.ps1 down    -> stop the tunnel and restore local settings
#   .\tunnel.ps1 status  -> show the current public URL (if any)
#
# Why this exists:
#   The dev stack only listens on 127.0.0.1, so it is unreachable from another
#   machine. This script exposes it over a temporary public HTTPS URL so a
#   supervisor on a different network can open the demo. The URL is ephemeral
#   and disappears when the tunnel stops, which is the point: no data is
#   published anywhere permanently, and everything served is fictional demo data.
#
# What it configures:
#   - APP_URL                     -> the public https:// URL (asset + redirect base)
#   - SANCTUM_STATEFUL_DOMAINS    -> lets the tunnel host use the session cookie
#   - SESSION_SECURE_COOKIE=true  -> cookies are only sent over HTTPS
#   Everything is written to .env and restored when the tunnel is stopped.

$ErrorActionPreference = 'Stop'

$Root        = $PSScriptRoot
$EnvFile     = Join-Path $Root '.env'
$TunnelFile  = Join-Path $Root '.tunnelurl'
$LogDir      = Join-Path $Root 'storage\logs'
$Cloudflared = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
$PortFile    = Join-Path $Root '.devport'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Get-ApiPort {
    if (-not (Test-Path $PortFile)) { throw 'No .devport file. Run .\dev.ps1 up first.' }
    $p = (Get-Content $PortFile -TotalCount 1).Trim()
    if ($p -notmatch '^\d+$') { throw '.devport does not contain a valid port.' }
    return [int]$p
}

function Test-Port([int]$Port) {
    try {
        $c = New-Object System.Net.Sockets.TcpClient
        $c.Connect('127.0.0.1', $Port)
        $c.Close()
        return $true
    } catch { return $false }
}

function Set-EnvValue([string]$Key, [string]$Value) {
    $text = Get-Content $EnvFile -Raw
    if ($text -match "(?m)^$([regex]::Escape($Key))=") {
        $text = [regex]::Replace($text, "(?m)^$([regex]::Escape($Key))=.*$", "$Key=$Value")
    } else {
        if (-not $text.EndsWith("`n")) { $text += "`n" }
        $text += "$Key=$Value`n"
    }
    Set-Content -Path $EnvFile -Value $text -NoNewline -Encoding UTF8
}

function Restart-Api {
    # Config cache must be rebuilt so the new APP_URL/stateful domains apply.
    & php artisan config:clear 2>&1 | Out-Null
    $port = Get-ApiPort
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root 'dev.ps1') down 2>&1 | Out-Null
    Start-Sleep -Milliseconds 600
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root 'dev.ps1') up 2>&1 | Out-Null
    if (-not (Test-Port $port)) {
        # dev.ps1 may pick a new port inside the 8650-8699 range; re-read it.
        $port = Get-ApiPort
    }
    return $port
}

$action = 'status'
if ($args.Count -gt 0) { $action = $args[0] }

switch ($action) {
    'up' {
        if (-not (Test-Path $Cloudflared)) { throw "cloudflared not found at $Cloudflared" }

        $port = Get-ApiPort
        if (-not (Test-Port $port)) {
            Write-Host 'API is not running; starting the stack first...'
            & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root 'dev.ps1') up 2>&1 | Out-Null
            $port = Get-ApiPort
        }

        # Stop a previous tunnel belonging to this project, if any.
        & powershell -NoProfile -ExecutionPolicy Bypass -File $PSCommandPath down 2>&1 | Out-Null

        Write-Host 'Tunnel      : starting Cloudflare quick tunnel...'
        $outLog = Join-Path $LogDir 'cloudflared.out.log'
        $errLog = Join-Path $LogDir 'cloudflared.err.log'
        Remove-Item $outLog, $errLog -ErrorAction SilentlyContinue

        # Quick tunnel: no account, ephemeral https://*.trycloudflare.com URL.
        $proc = Start-Process -FilePath $Cloudflared `
            -ArgumentList @('tunnel', '--url', "http://127.0.0.1:$port", '--no-autoupdate') `
            -RedirectStandardOutput $outLog -RedirectStandardError $errLog `
            -WindowStyle Hidden -PassThru

        Write-Host ('Tunnel      : waiting for the public URL (pid ' + $proc.Id + ')...')
        $url = $null
        for ($i = 0; $i -lt 40 -and -not $url; $i++) {
            Start-Sleep -Milliseconds 500
            foreach ($f in @($outLog, $errLog)) {
                if (Test-Path $f) {
                    $content = Get-Content $f -Raw -ErrorAction SilentlyContinue
                    if ([string]::IsNullOrEmpty($content)) { continue }
                    $m = [regex]::Match($content, 'https://[a-z0-9-]+\.trycloudflare\.com')
                    if ($m.Success) { $url = $m.Value; break }
                }
            }
        }

        if (-not $url) {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            throw "Tunnel did not publish a URL. See $errLog"
        }

        Set-Content -Path $TunnelFile -Value $url -Encoding ASCII
        Write-Host "Tunnel      : $url"

        Set-EnvValue 'APP_URL' $url
        Set-EnvValue 'SESSION_SECURE_COOKIE' 'true'
        $host_ = ([Uri]$url).Host
        Set-EnvValue 'SANCTUM_STATEFUL_DOMAINS' "localhost,127.0.0.1,127.0.0.1:$port,::1,$host_"

        Write-Host 'Config      : applying public URL and restarting the API...'
        $port = Restart-Api
        Write-Host ''
        Write-Host "Public URL  : $url"
        Write-Host "Local URL   : http://127.0.0.1:$port"
        Write-Host ''
        Write-Host 'Share the Public URL with your supervisor. It works while this tunnel runs.'
        Write-Host 'Run .\tunnel.ps1 down when you are finished.'
    }

    'down' {
        $killed = 0
        Get-Process cloudflared -ErrorAction SilentlyContinue | ForEach-Object {
            $killed++
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        }
        if (Test-Path $TunnelFile) { Remove-Item $TunnelFile -Force }

        # Restore local defaults so development keeps working unchanged.
        if (Test-Path $EnvFile) {
            $port = Get-ApiPort
            Set-EnvValue 'APP_URL' "http://127.0.0.1:$port"
            Set-EnvValue 'SESSION_SECURE_COOKIE' 'false'
            Set-EnvValue 'SANCTUM_STATEFUL_DOMAINS' "localhost,127.0.0.1,127.0.0.1:$port,::1"
            & php artisan config:clear 2>&1 | Out-Null
        }
        Write-Host "Tunnel stopped ($killed process(es)). Local settings restored."
    }

    'status' {
        if (Test-Path $TunnelFile) {
            $url = (Get-Content $TunnelFile -TotalCount 1).Trim()
            $alive = (Get-Process cloudflared -ErrorAction SilentlyContinue) -ne $null
            Write-Host "Public URL  : $url"
            Write-Host "Tunnel      : $(if ($alive) { 'running' } else { 'not running (stale URL file)' })"
        } else {
            Write-Host 'Tunnel      : not configured'
        }
    }

    default { Write-Host 'Usage: .\tunnel.ps1 [up|down|status]' }
}
