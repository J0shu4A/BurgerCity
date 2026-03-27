function fmtEUR(x) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(Number(x) || 0);
}

function fmtNum(x) {
  return new Intl.NumberFormat("de-DE").format(Number(x) || 0);
}

export default function StoreRanking({ data = [] }) {
  const topStore = data.length ? data[0] : null;
  const totalStores = data.length;

  return (
    <div className="chartWrap">
      <div className="card chartCard">
        <div className="label">Filialranking</div>

        {!data.length ? (
          <div className="tinyHint">
            Keine Filialdaten für den gewählten Zeitraum verfügbar.
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              <div className="tinyHint">
                Angezeigte Filialen: <strong>{fmtNum(totalStores)}</strong>
              </div>

              {topStore && (
                <div className="tinyHint">
                  Beste Filiale nach Umsatz: <strong>{topStore.store}</strong> (
                  {fmtEUR(topStore.revenue)})
                </div>
              )}
            </div>

            <div
              className="tableArea"
              style={{
                maxHeight: 520,
                overflowY: "auto",
                overflowX: "auto",
              }}
            >
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Filiale</th>
                    <th>Umsatz</th>
                    <th>Gewinn</th>
                    <th>Bestellungen</th>
                    <th>AOV</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r, idx) => (
                    <tr key={`${r.store}-${idx}`}>
                      <td>{r.store || "Unbekannt"}</td>
                      <td>{fmtEUR(r.revenue)}</td>
                      <td>{fmtEUR(r.profit)}</td>
                      <td>{fmtNum(r.orderCount)}</td>
                      <td>{fmtEUR(r.aov)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="tinyHint" style={{ marginTop: 12 }}>
              Tipp: Vergleiche Umsatz, Gewinn und AOV zwischen Filialen, um
              margenstarke Standorte als Benchmark für schwächere Filialen zu
              nutzen.
            </div>
          </>
        )}
      </div>
    </div>
  );
}