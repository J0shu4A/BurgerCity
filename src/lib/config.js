// API_BASE = Express-Server (Auth, Location-Intel, etc.).
//   Production: leer => same-origin, weil der Express-Server auch das
//   Frontend ausliefert (hinter Cloudflare Tunnel auf z.B. burgercity.seiz.ing).
//   Dev (vite auf 5173): in .env.development VITE_API_BASE=http://localhost:5174 setzen.
export const API_BASE = import.meta.env.VITE_API_BASE ?? "";

// FASTAPI_BASE = die Python-FastAPI auf seiz.ing (Port 8000 via Cloudflare).
//   Default ist die Live-Domain. Override per VITE_FASTAPI_BASE wenn nötig.
export const FASTAPI_BASE =
  import.meta.env.VITE_FASTAPI_BASE ?? "https://seiz.ing";
