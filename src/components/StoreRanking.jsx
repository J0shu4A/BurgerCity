function fmtEUR(x) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(x || 0);
}

export default function StoreRanking({ data }) {
  return (
    <div className="chartWrap">
      <div className="card chartCard">
        <div className="label">Filialranking (Umsatz, Bestellungen, AOV)</div>

        <div className="tableArea">
          <table className="tbl">
            <thead>
              <tr>
                <th>Filiale</th>
                <th>Umsatz</th>
                <th>Bestellungen</th>
                <th>AOV</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 8).map((r) => (
                <tr key={r.store}>
                  <td>{r.store}</td>
                  <td>{fmtEUR(r.revenue)}</td>
                  <td>{r.orderCount}</td>
                  <td>{fmtEUR(r.aov)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="tinyHint">Tipp: Vergleiche AOV zwischen Filialen → Upsell/Bundles in Low-AOV Filialen ausrollen.</div>
        </div>
      </div>
    </div>
  );
}
