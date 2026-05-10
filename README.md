# BurgerCity Dashboard

Business-Intelligence-Dashboard für ein Berliner Burger-Franchise.
Visualisiert Verkaufsdaten, Filialvergleiche, Produkt- und Bundle-Analysen
sowie eine einfache Standortbewertung. Datenquelle ist eine FastAPI im
Schwesterprojekt [`burgercity-api`](https://github.com/HusseinJizi/burgercity-api).

Live: https://burgercity.seiz.ing

## Features

- KPI-Übersicht mit Filtern für Filiale, Produkt und Zeitraum
- Umsatz-Trends nach Tag, Stunde und Jahr
- Produkt- und Bundle-Rankings
- Direkter Vergleich zweier Produkte (A vs B)
- Forecast und automatische Insights / Alerts
- Standort- und Wettbewerbsanalyse pro Filiale
- Datei-Upload (CSV/XLSX) und API-Pull als Datenquellen
- Login mit JWT-Cookie-Session
- Mobile-fähiges Layout

## Tech-Stack

| Schicht       | Technologie                              |
|---------------|------------------------------------------|
| Frontend      | React 19, Vite 7, Recharts               |
| Auth/Static   | Express 4 (Node.js), bcryptjs, JWT       |
| Daten-API     | FastAPI (Python), siehe `burgercity-api` |
| Datenbank     | SQLite (in der API)                      |
| Hosting       | Linux + systemd + Cloudflare Tunnel      |
| CI/CD         | Cron-basiertes Pull-Deployment           |

## Projektstruktur

```
BurgerCity/
├── src/                    React-Frontend
│   ├── components/         UI-Komponenten (Charts, Panels, Auth-UI)
│   ├── lib/                Berechnungen (metrics, parse, alerts, …)
│   ├── auth/               Frontend-API-Wrapper für Auth-Calls
│   └── App.jsx             Top-Level-Komponente, State + Routing
├── server/                 Express-Server (Auth + Static-Serving)
│   ├── index.js            Auth-Routen, Static-Serving, Healthcheck
│   ├── locationIntel.js    Standortanalyse-Endpoint
│   └── auth.js             JWT-Helper
├── deploy/                 Deployment-Artefakte
│   ├── burgercity.service  systemd-Unit
│   ├── redeploy.sh         Build + Restart
│   ├── auto-pull.sh        Cron-Auto-Deploy (alle 2 min)
│   └── README_DEPLOY.md    Deployment-Doku
├── public/                 Statische Assets
└── package.json
```

## Entwicklung

Voraussetzungen: Node.js ≥ 20, npm.

```bash
# Abhängigkeiten (Frontend + Server)
npm install
npm --prefix server install

# Zwei Prozesse parallel starten
npm --prefix server run dev    # Express auf :5174
npm run dev                    # Vite auf :5173
```

Frontend ist anschließend auf `http://localhost:5173` erreichbar. Die Datei
`.env.development` setzt `VITE_API_BASE=http://localhost:5174`, damit das
Frontend in Dev auf den lokalen Express-Server zugreift.

In Production läuft nur **ein** Express-Prozess, der sowohl `/api/*` als auch
das gebaute Frontend ausliefert (Same-Origin).

## Build

```bash
npm run build              # Vite-Build → dist/
npm run build:prod         # Frontend + Server-Deps + Vite-Build (Linux-Variante)
```

## Deployment

Siehe [`deploy/README_DEPLOY.md`](deploy/README_DEPLOY.md). Kurzfassung:
Code wird auf dem Linux-Server als Git-Clone unter `/root/Joshua/BurgerCity`
gehalten. Ein Cron-Job prüft alle zwei Minuten gegen `origin/main` und
deployt bei Änderungen automatisch.

## Verwandte Repositories

- [`burgercity-api`](https://github.com/HusseinJizi/burgercity-api) – FastAPI
  + SQLite-Datenbank für Bestelldaten, Kampagnen, Standortdaten.
