import { useMemo, useState } from "react";

export default function AlertsSidebar({ alerts = [] }) {
  const [open, setOpen] = useState(false);

  const counts = useMemo(() => {
    const c = { high: 0, medium: 0, low: 0 };
    for (const a of alerts) c[a.severity] = (c[a.severity] || 0) + 1;
    return c;
  }, [alerts]);

  return (
    <div className="alertsSide card">
      <button
        type="button"
        className="alertsSideBtn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="alertsSideTop">
          <div className="alertsSideTitle">Alerts</div>
          <div className="alertsSideCount">{alerts.length}</div>
        </div>

        <div className="alertsSideSub">
          <span className="sevDot high" /> {counts.high}
          <span className="sep">•</span>
          <span className="sevDot medium" /> {counts.medium}
          <span className="sep">•</span>
          <span className="sevDot low" /> {counts.low}
        </div>

        <div className="alertsSideHint">
          {open ? "Klicken zum Zuklappen" : "Klicken zum Anzeigen"}
        </div>
      </button>

      {open && (
        <div className="alertsSideList">
          {alerts.length === 0 ? (
            <div className="muted">Keine Auffälligkeiten.</div>
          ) : (
            alerts.map((a, i) => (
              <div
                key={`${a.code || "ALERT"}-${a.date || "X"}-${i}`}
                className={`alertsSideItem sev-${a.severity || "low"}`}
              >
                <div className="alertsSideItemTop">
                  <div className="alertsSideItemTitle">{a.title || "Alert"}</div>
                  <div className="alertsSideItemMeta">
                    {(a.scope || "Gesamt") + (a.date ? ` • ${a.date}` : "")}
                  </div>
                </div>
                {a.message && <div className="alertsSideItemMsg">{a.message}</div>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
