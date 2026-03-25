import { useAuth } from "../auth/AuthProvider";
import LoginPage from "./LoginPage";

export default function LoginGate({ children }) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card">Lade Session…</div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <>
      <div style={{ position: "fixed", top: 12, right: 12, zIndex: 9999 }}>
        <button className="btn" onClick={logout}>Logout ({user.username})</button>
      </div>
      {children}
    </>
  );
}
