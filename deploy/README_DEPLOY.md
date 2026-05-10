# Deployment

BurgerCity läuft als systemd-Service auf einem Linux-Server. Cloudflare
Tunnel veröffentlicht den lokalen Port unter einer Subdomain. Updates
werden über einen Cron-getriggerten Git-Pull automatisch ausgerollt.

## Architektur

```
GitHub  ──(git pull alle 2 min)──►  Linux-Server
                                    ├── Express :5174 (Auth + dist/)
                                    └── systemd: burgercity.service
                                          │
                                cloudflared (Tunnel, ausgehend)
                                          │
                                  https://burgercity.seiz.ing
```

## Voraussetzungen

- Linux-Server mit `git`, `curl`, `bash`
- Node.js (im Projekt: über `nvm`, Pfad in der systemd-Unit pinnen)
- `cloudflared` als systemd-Service mit konfiguriertem Tunnel
- Eingehender Port wird **nicht** benötigt (Tunnel arbeitet ausgehend)

## Erst-Setup

### 1. Repository klonen

```bash
mkdir -p /root/Joshua
cd /root/Joshua
git clone https://github.com/J0shu4A/BurgerCity.git
cd BurgerCity
```

### 2. Build

```bash
bash deploy/redeploy.sh
```

`redeploy.sh` installiert Frontend- und Server-Dependencies, baut das Frontend
mit Vite und startet den systemd-Service neu.

### 3. systemd-Service installieren

JWT-Secret in `deploy/burgercity.service` durch einen langen Zufallsstring
ersetzen, dann:

```bash
cp deploy/burgercity.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now burgercity
systemctl status burgercity
```

Healthcheck:

```bash
curl http://127.0.0.1:5174/health
# → {"ok":true}
```

### 4. Cloudflare-Tunnel-Route

Im Zero-Trust-Dashboard eine zusätzliche Public-Hostname-Route am
bestehenden Tunnel anlegen:

| Feld     | Wert                  |
|----------|-----------------------|
| Subdomain| `burgercity`          |
| Domain   | `seiz.ing`            |
| Service  | `http://localhost:5174` |

Alternativ in `~/.cloudflared/config.yml`:

```yaml
ingress:
  - hostname: burgercity.seiz.ing
    service: http://localhost:5174
  - service: http_status:404
```

## Automatischer Deploy (Cron-Pull)

Logfile vorbereiten:

```bash
touch /var/log/burgercity-cron.log
chmod 644 /var/log/burgercity-cron.log
```

Cron-Job hinzufügen:

```bash
(crontab -l 2>/dev/null; echo "*/2 * * * * bash /root/Joshua/BurgerCity/deploy/auto-pull.sh") | crontab -
```

`auto-pull.sh` arbeitet wie folgt:

1. Single-Instance-Lock setzen (`flock`)
2. `git fetch origin main`
3. Lokalen HEAD mit `origin/main` vergleichen — bei Gleichheit beenden
4. `git reset --hard origin/main`
5. `bash deploy/redeploy.sh` (install + build + restart)
6. Healthcheck via `curl /health`
7. Alles in `/var/log/burgercity-cron.log` protokollieren

Bei einem fehlgeschlagenen Build bleibt der laufende Service auf der alten
`dist/` und damit auf der vorherigen Version.

## Service-Management

```bash
systemctl status burgercity
systemctl restart burgercity
journalctl -u burgercity -n 50

tail -f /var/log/burgercity.log         # App-Logs
tail -f /var/log/burgercity.err.log     # App-Fehler
tail -f /var/log/burgercity-cron.log    # Deploy-Logs
```

Manueller Deploy ohne auf den Cron zu warten:

```bash
bash /root/Joshua/BurgerCity/deploy/auto-pull.sh
```

Auto-Deploy temporär deaktivieren: `crontab -e` und die Zeile
auskommentieren oder entfernen.

## Update-Workflow

```bash
# Lokal
git push origin main
# Server holt die Änderung beim nächsten Cron-Lauf (≤ 2 min) automatisch ab.
```

## Lokale Entwicklung

Setup auf der Entwickler-Maschine ist unabhängig vom Server. Siehe
[Root-README](../README.md) → Abschnitt „Entwicklung".
