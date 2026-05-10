// Frontend-Wrapper für die Auth-Endpoints des Express-Servers.
// credentials: include sorgt dafür, dass der Session-Cookie automatisch
// mitgesendet wird.

import { API_BASE } from "../lib/config";

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    credentials: "include", // ✅ wichtig: Cookie mitsenden
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP_${res.status}`);
  return data;
}

export function login(username, password) {
  return api("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
}

export function logout() {
  return api("/api/auth/logout", { method: "POST" });
}

export function me() {
  return api("/api/auth/me");
}
