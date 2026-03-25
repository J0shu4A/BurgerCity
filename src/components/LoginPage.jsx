import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("eroglu2026");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(username, password);
    } catch {
      setErr("Login fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="loginScreen">
      <div className="loginCard">
        <img
          src="/Eroglu_Group_Logo.png"
          alt="Eroglu"
          className="loginLogo"
        />

        <h1>Eroglu Control</h1>
        <p className="loginSub">Performance Steering Dashboard</p>

        {err && <div className="loginError">{err}</div>}

        <form onSubmit={onSubmit} className="loginForm">
          <input
            placeholder="Benutzername"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button disabled={busy}>
            {busy ? "..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
