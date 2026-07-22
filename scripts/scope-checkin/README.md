# Scope check-in (IP heartbeat)

Each instrument reports its own current IP to the checkout web app on a timer.
The web app never has to discover scopes — the scope pushes its address to a
fixed, known endpoint. No mDNS/LXI discovery, no listening port on the scope.

## Endpoint

`POST /api/instruments/checkin`

```json
{ "name": "MSO46B-Q000024", "ip": "10.233.67.6", "os": "Linux", "team": "rocket-lab" }
```

- `name` (or `hostname`) identifies the instrument. If it already exists in the
  web app, the server refreshes its `ip` and `last_seen`.
- `ip` is required. `os` is optional (only fills the field when empty server-side).
- `team` (or `team_slug`) is optional once an instrument is registered — for a
  brand-new name it's **required**: the instrument is auto-registered under that
  team on first check-in, so plugging in a new scope with the script configured
  is enough, no manual "Add Instrument" step in the UI first. Sending `team` for
  an instrument that already exists reassigns it to that team. An unknown team
  slug (not in the `teams` table) returns `400`.
- If `SCOPE_CHECKIN_TOKEN` is set in the web app's environment, requests must send
  a matching `X-Scope-Token` header; otherwise they are rejected with `401`.
- On success the IP is also released from any *other* instrument in the same team
  that was reporting it, so IPs stay unique per team.

## Coexisting with manual instrument management

Manual add/edit/delete via the web app UI and this check-in endpoint are fully
independent and safe to use together:

- Check-in only ever writes `ip`, `last_seen`, `os` (only if currently empty),
  and `team_slug` (only if `team` is explicitly sent). It never touches
  manually-set fields like `location`, `sources`, or long-term checkout info.
- If an instrument is manually created first, check-in just updates that same
  row (matched by name) — it never creates a duplicate.
- **Deleting an instrument does not stop it from coming back.** If a scope is
  still running the check-in script and sends a `team`, the instrument will be
  auto-registered again on its next heartbeat. To truly retire an instrument,
  also stop/disable its check-in script (or omit `SCOPE_TEAM`, which prevents
  re-registration but still 404s on every check-in until the row exists again).

Run `migrations/004_add_last_seen.sql` against the database once to add the
`last_seen` column.

## Petalinux (BusyBox) and Ubuntu — `scope-checkin.sh` + systemd

Both use the same POSIX script (works with `curl` or `wget`).

```bash
sudo cp scope-checkin.sh /usr/local/bin/scope-checkin.sh
sudo chmod +x /usr/local/bin/scope-checkin.sh
sudo cp scope-checkin.service /etc/systemd/system/
sudo cp scope-checkin.timer   /etc/systemd/system/
# Edit the Environment= lines in the .service (name, URL, token, interface),
# or use an EnvironmentFile (see scope-checkin.env.example).
sudo systemctl daemon-reload
sudo systemctl enable --now scope-checkin.timer
```

Check it: `systemctl status scope-checkin.timer` and `journalctl -u scope-checkin.service`.

On a minimal Petalinux image without systemd, drive it from cron instead:

```
* * * * * CHECKIN_URL=http://lanthanum.global.tektronix.net:3030/api/instruments/checkin SCOPE_NAME=MSO46B-Q000024 SCOPE_IFACE=eth0 SCOPE_TEAM=rocket-lab /usr/local/bin/scope-checkin.sh
```

Make sure `curl` or `wget` is in the rootfs (add to your PetaLinux recipe if not).

## Windows scopes — `scope-checkin.ps1` + Task Scheduler

```powershell
# Register a task that runs every minute as SYSTEM
$action  = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument '-NoProfile -ExecutionPolicy Bypass -File "C:\Program Files\scope-checkin\scope-checkin.ps1" -CheckinUrl "http://lanthanum.global.tektronix.net:3030/api/instruments/checkin" -ScopeName "MSO58B-PQ010001" -ScopeToken ""'
$trigger  = New-ScheduledTaskTrigger -Once -At (Get-Date) `
  -RepetitionInterval (New-TimeSpan -Minutes 1) -RepetitionDuration (New-TimeSpan -Days 3650)
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "ScopeCheckin" -Action $action -Trigger $trigger -Principal $principal
```

Copy `scope-checkin.ps1` to `C:\Program Files\scope-checkin\` first. You can also
set `CHECKIN_URL` / `SCOPE_NAME` / `SCOPE_TOKEN` as machine environment variables
instead of passing them as arguments.

## Behaviour notes

- The scripts cache the last-sent IP and only POST on change, with a keep-alive
  every `FORCE_EVERY` runs (default 10 → ~10 min at a 1-min interval) so the web
  app still sees liveness. Set `FORCE_EVERY=0` to always send.
- `SCOPE_IFACE` targets a specific NIC when a scope has more than one (management
  vs. measurement). Leave it empty to auto-pick the first non-loopback IPv4.
