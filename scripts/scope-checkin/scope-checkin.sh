#!/bin/sh
# scope-checkin.sh — heartbeat an instrument's current IP to the checkout web app.
# Works on Petalinux/BusyBox and Ubuntu (POSIX sh, curl or wget).
#
# Configure via environment (or edit the defaults below):
#   CHECKIN_URL   Full URL of the endpoint, e.g. http://lanthanum.global.tektronix.net:3030/api/instruments/checkin
#   SCOPE_NAME    Registered instrument name in the web app (MUST match, e.g. MSO46B-Q000024).
#                 Defaults to the machine hostname.
#   SCOPE_IFACE   Network interface to read the IP from (e.g. eth0). Auto-detected if empty.
#   SCOPE_TOKEN   Shared secret; sent as the X-Scope-Token header. Optional.
#   SCOPE_OS      Reported OS (optional; only fills the field if empty server-side).
#   SCOPE_TEAM    Team slug (e.g. rocket-lab). Required to auto-register a brand-new
#                 instrument; optional for an already-registered one (reassigns its team).
#   STATE_FILE    Cache of the last-sent IP so we only POST on change. Default $HOME/.scope-checkin.last
#   FORCE_EVERY   Send a keep-alive even without change after this many runs (0 = always send).

CHECKIN_URL="${CHECKIN_URL:-http://lanthanum.global.tektronix.net:3030/api/instruments/checkin}"
SCOPE_NAME="${SCOPE_NAME:-$(hostname)}"
SCOPE_IFACE="${SCOPE_IFACE:-}"
SCOPE_TOKEN="${SCOPE_TOKEN:-}"
SCOPE_OS="${SCOPE_OS:-Linux}"
SCOPE_TEAM="${SCOPE_TEAM:-}"
STATE_FILE="${STATE_FILE:-$HOME/.scope-checkin.last}"
FORCE_EVERY="${FORCE_EVERY:-10}"

log() { echo "[scope-checkin] $*" >&2; }

# --- Determine the current IPv4 address ---
get_ip() {
  if [ -n "$SCOPE_IFACE" ]; then
    ip -4 addr show "$SCOPE_IFACE" 2>/dev/null | sed -n 's/.*inet \([0-9.]*\).*/\1/p' | head -n1
  else
    # First non-loopback IPv4. `hostname -I` where available, else parse `ip addr`.
    if hostname -I >/dev/null 2>&1; then
      hostname -I 2>/dev/null | awk '{print $1}'
    else
      ip -4 addr show scope global 2>/dev/null | sed -n 's/.*inet \([0-9.]*\).*/\1/p' | head -n1
    fi
  fi
}

IP="$(get_ip)"
if [ -z "$IP" ]; then
  log "could not determine IP address; skipping"
  exit 1
fi

# --- Only send when the IP changed, unless a keep-alive is due ---
COUNT_FILE="${STATE_FILE}.count"
LAST_IP=""
[ -f "$STATE_FILE" ] && LAST_IP="$(cat "$STATE_FILE" 2>/dev/null)"
COUNT=0
[ -f "$COUNT_FILE" ] && COUNT="$(cat "$COUNT_FILE" 2>/dev/null)"

SHOULD_SEND=0
if [ "$IP" != "$LAST_IP" ]; then
  SHOULD_SEND=1
elif [ "$FORCE_EVERY" = "0" ]; then
  SHOULD_SEND=1
elif [ "$COUNT" -ge "$FORCE_EVERY" ]; then
  SHOULD_SEND=1
fi

if [ "$SHOULD_SEND" -eq 0 ]; then
  COUNT=$((COUNT + 1))
  echo "$COUNT" > "$COUNT_FILE"
  exit 0
fi

# --- Build JSON payload (escape the name for safety) ---
# Two separate sed calls instead of a `;`-chained script — some sed builds
# (seen on scope Linux images) mis-parse the semicolon as a flag character.
esc() { printf '%s' "$1" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g'; }
TEAM_FIELD=""
[ -n "$SCOPE_TEAM" ] && TEAM_FIELD=",\"team\":\"$(esc "$SCOPE_TEAM")\""
PAYLOAD="{\"name\":\"$(esc "$SCOPE_NAME")\",\"ip\":\"$(esc "$IP")\",\"os\":\"$(esc "$SCOPE_OS")\"$TEAM_FIELD}"

# --- POST via curl, falling back to wget (both common on embedded images) ---
RC=1
if command -v curl >/dev/null 2>&1; then
  if [ -n "$SCOPE_TOKEN" ]; then
    curl -fsS -m 15 -X POST "$CHECKIN_URL" \
      -H "Content-Type: application/json" \
      -H "X-Scope-Token: $SCOPE_TOKEN" \
      -d "$PAYLOAD" >/dev/null && RC=0
  else
    curl -fsS -m 15 -X POST "$CHECKIN_URL" \
      -H "Content-Type: application/json" \
      -d "$PAYLOAD" >/dev/null && RC=0
  fi
elif command -v wget >/dev/null 2>&1; then
  HDR=""
  [ -n "$SCOPE_TOKEN" ] && HDR="--header=X-Scope-Token: $SCOPE_TOKEN"
  wget -q -T 15 -O /dev/null \
    --header="Content-Type: application/json" $HDR \
    --post-data="$PAYLOAD" "$CHECKIN_URL" && RC=0
else
  log "neither curl nor wget found"
  exit 1
fi

if [ "$RC" -eq 0 ]; then
  echo "$IP" > "$STATE_FILE"
  echo "0" > "$COUNT_FILE"
  log "checked in $SCOPE_NAME -> $IP${SCOPE_TEAM:+ (team: $SCOPE_TEAM)}"
else
  log "check-in POST failed (will retry next run)"
fi
exit "$RC"
