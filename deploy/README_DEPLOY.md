# BurgerCity Deployment auf Linux (wie deine FastAPI)

Genauso wie `Server.py` läuft BurgerCity als systemd-Dienst auf einem festen
lokalen Port. Cloudflare Tunnel macht das Ganze über `seiz.ing` erreichbar –
du musst **keinen weiteren Router-Port freigeben**.

## 1. Code auf den Server kopieren

```bash
# z.B.
mkdir -p /root/Joshua
rsync -av --exclude node_modules --exclude dist BurgerCity/ root@server:/root/Joshua/BurgerCity/
```

## 2. Dependencies installieren + Frontend bauen

```bash
cd /root/Joshua/BurgerCity
npm run build:prod
# Dieser Befehl macht:
#   - npm install              (Frontend-Deps für vite build)
#   - npm --prefix server install (Express-Deps)
#   - npm run build            (vite build → dist/)
```

## 3. systemd-Service einrichten

```bash
# 1. JWT_SECRET in der Unit-Datei durch einen langen Zufallsstring ersetzen!
nano /root/Joshua/BurgerCity/deploy/burgercity.service

# 2. Unit aktivieren
cp /root/Joshua/BurgerCity/deploy/burgercity.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable burgercity
systemctl start burgercity

# 3. Status / Logs prüfen
systemctl status burgercity
tail -f /var/log/burgercity.log
```

Lokaler Test:

```bash
curl http://127.0.0.1:5174/health
# → {"ok":true}
```

## 4. Cloudflare Tunnel: zweite Route hinzufügen

Du hast schon einen Tunnel laufen, der `seiz.ing` → `localhost:8000` (FastAPI)
weiterleitet. Du brauchst nur eine zweite Route auf den BurgerCity-Port.

### Variante A – Cloudflare-Dashboard (Zero Trust)

1. Zero Trust → Networks → Tunnels → deinen Tunnel auswählen → **Public Hostname**
2. **Add a public hostname**
   - Subdomain: `burgercity` (oder wie du willst)
   - Domain: `seiz.ing`
   - Service: **HTTP**, URL: `localhost:5174`
3. Speichern. Nach ~30 s ist `https://burgercity.seiz.ing` erreichbar.

### Variante B – `~/.cloudflared/config.yml` (falls du den Tunnel in einer YAML hast)

```yaml
tunnel: <DEINE-TUNNEL-ID>
credentials-file: /root/.cloudflared/<DEINE-TUNNEL-ID>.json

ingress:
  - hostname: seiz.ing
    service: http://localhost:8000
  - hostname: burgercity.seiz.ing       # NEU
    service: http://localhost:5174       # NEU
  - service: http_status:404
```

Danach:
```bash
systemctl restart cloudflared
```

## 5. Login testen

`https://burgercity.seiz.ing` → User `admin`, Passwort `eroglu2026`.

## Updates ausrollen

```bash
cd /root/Joshua/BurgerCity
git pull              # oder rsync neu
npm run build:prod    # rebuild
systemctl restart burgercity
```

## Lokaler Dev (Windows) bleibt unverändert

```powershell
# Terminal 1
cd BurgerCity\server
npm run dev

# Terminal 2
cd BurgerCity
npm run dev
```

`.env.development` setzt `VITE_API_BASE=http://localhost:5174`, sodass das
Vite-Frontend auf 5173 weiterhin auf den lokalen Express trifft. Production
auf dem Linux-Server hat keine `.env.production` → leerer API_BASE → same-origin.
