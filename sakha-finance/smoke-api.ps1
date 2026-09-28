# smoke-api.ps1 — real HTTP smoke test against the running SAKHA Finance Operations API.
# Tests: CSRF, login, me, overview, transactions, documents, verification queue.
# Uses a WebRequestSession so cookies (session + XSRF) persist across calls.

param([string]$Base = 'http://127.0.0.1:8000')

$ErrorActionPreference = 'Stop'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Log($msg) { Write-Output $msg }

# 1. Prime CSRF cookie
Log "1. GET /sanctum/csrf-cookie"
$null = Invoke-WebRequest -Uri "$Base/sanctum/csrf-cookie" -WebSession $session -TimeoutSec 15 -UseBasicParsing
$xsrf = ($session.Cookies.GetCookies($Base) | Where-Object { $_.Name -eq 'XSRF-TOKEN' }).Value
if (-not $xsrf) { throw 'No XSRF-TOKEN cookie returned' }
$xsrf = [System.Uri]::UnescapeDataString($xsrf)
Log "   XSRF token acquired"

$headers = @{ 'Accept' = 'application/json'; 'X-XSRF-TOKEN' = $xsrf; 'Content-Type' = 'application/json' }

# 2. Login
Log "2. POST /api/login (operator)"
$loginBody = @{ email = 'operator@SAKHA Finance Operations.test'; password = 'password'; remember = $true } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$Base/api/login" -Method Post -WebSession $session -Headers $headers -Body $loginBody -TimeoutSec 15
Log "   logged in as $($login.user.name) [$($login.user.role)]"

# 3. Me
$me = Invoke-RestMethod -Uri "$Base/api/me" -WebSession $session -Headers @{ 'Accept' = 'application/json' } -TimeoutSec 15
Log "3. /api/me -> $($me.user.email) role=$($me.user.role)"

# 4. Overview
$overview = Invoke-RestMethod -Uri "$Base/api/overview" -WebSession $session -Headers @{ 'Accept' = 'application/json' } -TimeoutSec 20
Log "4. /api/overview -> total_trx=$($overview.data.metrics.total_transactions) needs_review=$($overview.data.metrics.needs_review) attention_items=$($overview.data.attention.Count)"

# 5. Transactions list
$trx = Invoke-RestMethod -Uri "$Base/api/transactions?per_page=5" -WebSession $session -Headers @{ 'Accept' = 'application/json' } -TimeoutSec 20
Log "5. /api/transactions -> returned $($trx.data.Count) of $($trx.meta.total)"

# 6. Transaction detail (scenario A)
$listA = Invoke-RestMethod -Uri "$Base/api/transactions?q=TRX-DEMO-A" -WebSession $session -Headers @{ 'Accept' = 'application/json' } -TimeoutSec 20
$detail = Invoke-RestMethod -Uri "$Base/api/transactions/$($listA.data[0].id)" -WebSession $session -Headers @{ 'Accept' = 'application/json' } -TimeoutSec 20
Log "6. /api/transactions/{id} -> $($detail.data.transaction_code) status=$($detail.data.status) docs=$($detail.data.documents.Count) invoices=$($detail.data.invoices.Count) timeline=$($detail.data.timeline.Count)"

# 7. Documents
$docs = Invoke-RestMethod -Uri "$Base/api/documents?per_page=5" -WebSession $session -Headers @{ 'Accept' = 'application/json' } -TimeoutSec 20
Log "7. /api/documents -> returned $($docs.data.Count) of $($docs.meta.total)"

# 8. Payments
$pays = Invoke-RestMethod -Uri "$Base/api/payments?per_page=5" -WebSession $session -Headers @{ 'Accept' = 'application/json' } -TimeoutSec 20
Log "8. /api/payments -> returned $($pays.data.Count) of $($pays.meta.total)"

# 9. Deliveries
$dels = Invoke-RestMethod -Uri "$Base/api/deliveries?per_page=5" -WebSession $session -Headers @{ 'Accept' = 'application/json' } -TimeoutSec 20
Log "9. /api/deliveries -> returned $($dels.data.Count) of $($dels.meta.total)"

# 10. Verification queue
$vq = Invoke-RestMethod -Uri "$Base/api/verification/queue?per_page=5" -WebSession $session -Headers @{ 'Accept' = 'application/json' } -TimeoutSec 20
Log "10. /api/verification/queue -> $($vq.meta.total) rows"

# 11. Notifications
$notif = Invoke-RestMethod -Uri "$Base/api/notifications" -WebSession $session -Headers @{ 'Accept' = 'application/json' } -TimeoutSec 20
Log "11. /api/notifications -> $($notif.data.Count) items, unread=$($notif.meta.unread_count)"

# 12. Global search
$search = Invoke-RestMethod -Uri "$Base/api/search?q=TRX-DEMO" -WebSession $session -Headers @{ 'Accept' = 'application/json' } -TimeoutSec 20
Log "12. /api/search -> $($search.data.Count) results"

# 13. Run verification on scenario B (should FAIL - missing docs)
$listB = Invoke-RestMethod -Uri "$Base/api/transactions?q=TRX-DEMO-B" -WebSession $session -Headers @{ 'Accept' = 'application/json' } -TimeoutSec 20
$runB = Invoke-RestMethod -Uri "$Base/api/transactions/$($listB.data[0].id)/verification/run" -Method Post -WebSession $session -Headers $headers -Body '{}' -TimeoutSec 25
Log "13. verification run on B -> overall=$($runB.data.overall_status) score=$($runB.data.score) failed=$($runB.data.failed_count) checks=$($runB.data.checks.Count)"

# 14. Completion gate on scenario B (should be blocked)
$gate = Invoke-RestMethod -Uri "$Base/api/transactions/$($listB.data[0].id)/completion-check" -WebSession $session -Headers @{ 'Accept' = 'application/json' } -TimeoutSec 20
Log "14. completion-check B -> allowed=$($gate.data.allowed) reasons=$($gate.data.reasons.Count)"

# 15. RBAC: operator cannot list users
$roleBlocked = $false
try {
    Invoke-RestMethod -Uri "$Base/api/users" -WebSession $session -Headers @{ 'Accept' = 'application/json' } -TimeoutSec 15 | Out-Null
} catch {
    $roleBlocked = $_.Exception.Response.StatusCode.value__ -eq 403
}
Log "15. /api/users as operator -> 403 enforced = $roleBlocked"

Log ""
Log "SMOKE TEST COMPLETE"
