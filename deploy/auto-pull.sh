#!/bin/bash
# Cron-getriggerter Auto-Deploy fuer BurgerCity.
# Prueft GitHub auf neue Commits, baut und restartet bei Aenderungen.
# Sicher, oft auszufuehren: exit early wenn nichts neu ist, Single-Instance-Lock.

set -u

REPO_DIR=/root/Joshua/BurgerCity
LOG_FILE=/var/log/burgercity-cron.log
LOCK_FILE=/var/run/burgercity-cron.lock

# Cron startet mit leerem PATH - nvm-Node explizit hinzufuegen
export PATH=/root/.nvm/versions/node/v24.14.1/bin:/usr/local/bin:/usr/bin:/bin

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

# Single-instance lock - falls letzter Build noch laeuft, Skript einfach wieder beenden
exec 9>"$LOCK_FILE" 2>/dev/null || { log "ERROR: kann lock-file nicht oeffnen"; exit 1; }
flock -n 9 || exit 0

cd "$REPO_DIR" || { log "ERROR: cd $REPO_DIR fehlgeschlagen"; exit 1; }

# Neue Refs holen, ohne working tree anzufassen
git fetch --quiet origin main 2>>"$LOG_FILE" || { log "ERROR: git fetch fehlgeschlagen"; exit 1; }

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

# Nichts neu - normaler Fall, leise beenden
if [ "$LOCAL" = "$REMOTE" ]; then
  exit 0
fi

log "neue Commits gefunden: ${LOCAL:0:7} -> ${REMOTE:0:7}"

# Hart auf origin/main zuruecksetzen.
# Server-seitig sollte es NIE lokale Aenderungen geben - die wuerden hier verworfen.
git reset --hard origin/main >> "$LOG_FILE" 2>&1 || { log "ERROR: git reset failed"; exit 1; }

# Build + restart via redeploy.sh.
# Wenn das fehlschlaegt, bleibt der Service auf der alten dist/ und alten Code-Version
# (npm install/build laufen vor systemctl restart).
if bash "$REPO_DIR/deploy/redeploy.sh" >> "$LOG_FILE" 2>&1; then
  log "deploy OK"
else
  log "deploy FAILED - siehe Output oben; Service laeuft auf altem Build weiter"
  exit 1
fi

# Healthcheck: kurz warten, dann pruefen
sleep 2
if curl -fsS http://127.0.0.1:5174/health >/dev/null; then
  log "health OK"
else
  log "WARN: healthcheck fehlgeschlagen - service ggf. noch am Starten"
fi
