// React-Context für den eingeloggten Nutzer. Beim Mount wird /auth/me
// gepingt, um eine bestehende Session zu erkennen. login()/logout() werden
// per useAuth()-Hook in den Komponenten aufgerufen.

import { createContext, useContext, useEffect, useState } from "react";
import * as AuthAPI from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const r = await AuthAPI.me();
      setUser(r.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(username, password) {
    const r = await AuthAPI.login(username, password);
    setUser(r.user);
    return r.user;
  }

  async function logout() {
    await AuthAPI.logout();
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
