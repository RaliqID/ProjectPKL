# find-port.ps1 — print the first free TCP port from the DOCFLOW dedicated range.
#
# We use a dedicated range (8650-8699) that is not commonly taken by other apps,
# and we pick the first port that is genuinely free. Callers record the chosen
# port in .devport so the frontend proxy and e2e tests reuse it.
#
# Usage: powershell -NoProfile -File find-port.ps1

$rangeStart = 8650
$rangeEnd = 8699

function Test-Port {
    param([int]$Port)
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if ($async.AsyncWaitHandle.WaitOne(200)) {
            $client.EndConnect($async)
            return $true
        }
        return $false
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

for ($p = $rangeStart; $p -le $rangeEnd; $p++) {
    if (-not (Test-Port -Port $p)) {
        Write-Output $p
        exit 0
    }
}

Write-Output "NONE"
exit 1
