function fmtEUR(x) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(x || 0);
}

export default function KpiCards({ kpis }) {
  return (
    <div className="kpiGrid">
      <div className="card">
        <div className="label">Umsatz</div>
        <div className="value">{fmtEUR(kpis.totalRevenue)}</div>
      </div>
      <div className="card">
        <div className="label">Bestellungen</div>
        <div className="value">{kpis.orderCount}</div>
      </div>
      <div className="card">
        <div className="label">Ø Bestellwert (AOV)</div>
        <div className="value">{fmtEUR(kpis.aov)}</div>
      </div>
    </div>
  );
}
