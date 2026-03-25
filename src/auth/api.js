const BASE = "http://localhost:5174";

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
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
