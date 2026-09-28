# smoke-register.ps1 — verify register endpoint + session persistence end-to-end.
param([string]$Base = 'http://127.0.0.1:8650')

$ErrorActionPreference = 'Stop'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$null = Invoke-WebRequest -Uri "$Base/sanctum/csrf-cookie" -WebSession $session -UseBasicParsing
$xsrf = [System.Uri]::UnescapeDataString((($session.Cookies.GetCookies($Base) | Where-Object { $_.Name -eq 'XSRF-TOKEN' }).Value))
$headers = @{ 'Accept' = 'application/json'; 'X-XSRF-TOKEN' = $xsrf; 'Content-Type' = 'application/json' }

$email = 'smoke' + (Get-Random) + '@test.local'
$body = @{
    name = 'Smoke User'
    email = $email
    password = 'password123'
    password_confirmation = 'password123'
    role = 'REVIEWER'
} | ConvertTo-Json

Write-Output "1. POST /api/register ($email)"
$reg = Invoke-RestMethod -Uri "$Base/api/register" -Method Post -WebSession $session -Headers $headers -Body $body -TimeoutSec 15
Write-Output "   created: $($reg.user.email) role=$($reg.user.role)"

Write-Output "2. GET /api/me (same session)"
$me = Invoke-RestMethod -Uri "$Base/api/me" -WebSession $session -Headers @{ 'Accept' = 'application/json' } -TimeoutSec 15
Write-Output "   me: $($me.user.email) role=$($me.user.role)"

Write-Output "3. GET /app (SPA shell), then /api/me again (session must survive)"
$page = Invoke-WebRequest -Uri "$Base/app" -WebSession $session -UseBasicParsing -TimeoutSec 15
$me2 = Invoke-RestMethod -Uri "$Base/api/me" -WebSession $session -Headers @{ 'Accept' = 'application/json' } -TimeoutSec 15
Write-Output "   page status=$($page.StatusCode) ; me after page load: $($me2.user.email)"

Write-Output "REGISTER SMOKE OK"
