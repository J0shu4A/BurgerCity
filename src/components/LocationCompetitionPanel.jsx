function fmtEUR(x) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(Number(x) || 0);
}

function fmtPercent(x) {
  return `+${Number(x) || 0}%`;
}

export default function LocationCompetitionPanel({ rows = [], loading = false }) {
  return (
    <div className="chartWrap">
      <div className="card chartCard">
        <div className="label">Standortanalyse & Wettbewerb im Umfeld</div>

        {loading ? (
          <div className="tinyHint">Standortdaten werden geladen ...</div>
        ) : !rows.length ? (
          <div className="tinyHint">Keine Standortdaten verfügbar.</div>
        ) : (
          <>
            <div
              className="tableArea"
              style={{ maxHeight: 520, overflowY: "auto", overflowX: "auto" }}
            >
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Filiale</th>
                    <th>Bezirk</th>
                    <th>Einwohner</th>
                    <th>Preisanhebung Empfehlung</th>
                    <th>Fast Food</th>
                    <th>Restaurants</th>
                    <th>Gesamt</th>
                    <th>Umsatz</th>
                    <th>Bestellungen</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.store}>
                      <td>{r.store}</td>
                      <td>{r.district || "—"}</td>
                      <td>
                        {new Intl.NumberFormat("de-DE").format(
                          Number(r.population) || 0
                        )}
                      </td>
                      <td>{fmtPercent(r.priceIncreaseRecommendation)}</td>
                      <td>{r.fastFoodCompetitors}</td>
                      <td>{r.restaurantCompetitors}</td>
                      <td>{r.totalCompetitors}</td>
                      <td>{fmtEUR(r.revenue)}</td>
                      <td>{r.orderCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="tinyHint" style={{ marginTop: 12 }}>
              Empfehlung basiert auf Einwohnerpotenzial und Wettbewerbsdichte im Umkreis.
            </div>
          </>
        )}
      </div>
    </div>
  );
}