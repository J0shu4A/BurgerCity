export default function AlertsPanel({ alerts = [] }) {
  if (!alerts.length) {
    return (
      <div className="card">
        <h3>Alerts</h3>
        <div className="muted">Keine Auffälligkeiten erkannt.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="alertsHead">
        <h3>Alerts</h3>
        <span className="badge">{alerts.length}</span>
      </div>

      <div className="alertsList">
        {alerts.map((a, i) => (
          <div key={`${a.code}-${a.scope}-${a.date}-${i}`} className={`alertItem sev-${a.severity}`}>
            <div className="alertTop">
              <div className="alertTitle">{a.title}</div>
              <div className="alertMeta">
                <span>{a.scope}</span>
                <span>•</span>
                <span>{a.date}</span>
              </div>
            </div>
            <div className="alertMsg">{a.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
