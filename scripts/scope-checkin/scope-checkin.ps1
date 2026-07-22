<#
.SYNOPSIS
  Heartbeat this instrument's current IP to the checkout web app (Windows scopes).
.DESCRIPTION
  Detects the primary IPv4 address and POSTs it to /api/instruments/checkin.
  Only sends when the IP changes, with a periodic keep-alive. Intended to run
  from Task Scheduler every minute. Configure via the parameters below or by
  editing the defaults.
#>
[CmdletBinding()]
param(
  [string]$CheckinUrl = $env:CHECKIN_URL,
  [string]$ScopeName  = $env:SCOPE_NAME,
  [string]$ScopeToken = $env:SCOPE_TOKEN,
  [string]$ScopeIface = $env:SCOPE_IFACE,   # optional InterfaceAlias, e.g. "Ethernet"
  [string]$ScopeOs    = "Windows",
  [int]$ForceEvery    = 10,
  [string]$StateFile  = (Join-Path $env:TEMP "scope-checkin.last")
)

if (-not $CheckinUrl) { $CheckinUrl = "http://lanthanum.global.tektronix.net:3030/api/instruments/checkin" }
if (-not $ScopeName)  { $ScopeName  = $env:COMPUTERNAME }

function Get-PrimaryIPv4 {
  $addrs = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.PrefixOrigin -ne "WellKnown" }
  if ($ScopeIface) { $addrs = $addrs | Where-Object { $_.InterfaceAlias -eq $ScopeIface } }
  # Prefer a "Preferred" address on a connected interface.
  $best = $addrs | Sort-Object { $_.SkipAsSource }, { $_.PrefixOrigin -ne "Dhcp" } |
    Select-Object -First 1
  if ($best) { return $best.IPAddress }
  return $null
}

$ip = Get-PrimaryIPv4
if (-not $ip) { Write-Error "[scope-checkin] could not determine IP address"; exit 1 }

$countFile = "$StateFile.count"
$lastIp = if (Test-Path $StateFile) { (Get-Content $StateFile -Raw).Trim() } else { "" }
$count  = if (Test-Path $countFile) { [int]((Get-Content $countFile -Raw).Trim()) } else { 0 }

$shouldSend = $false
if ($ip -ne $lastIp)        { $shouldSend = $true }
elseif ($ForceEvery -le 0)  { $shouldSend = $true }
elseif ($count -ge $ForceEvery) { $shouldSend = $true }

if (-not $shouldSend) {
  Set-Content -Path $countFile -Value ($count + 1)
  exit 0
}

$payload = @{ name = $ScopeName; ip = $ip; os = $ScopeOs } | ConvertTo-Json -Compress
$headers = @{ "Content-Type" = "application/json" }
if ($ScopeToken) { $headers["X-Scope-Token"] = $ScopeToken }

try {
  Invoke-RestMethod -Uri $CheckinUrl -Method Post -Headers $headers -Body $payload -TimeoutSec 15 | Out-Null
  Set-Content -Path $StateFile -Value $ip
  Set-Content -Path $countFile -Value 0
  Write-Host "[scope-checkin] checked in $ScopeName -> $ip"
} catch {
  Write-Error "[scope-checkin] check-in POST failed: $($_.Exception.Message)"
  exit 1
}
