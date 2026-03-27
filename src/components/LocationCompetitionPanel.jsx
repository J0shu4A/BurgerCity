function fmtEUR(x) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(Number(x) || 0);
}

export default function LocationCompetitionPanel({ rows = [], loading = false }) {
  return (
    <div className="chartWrap">
      <div className="card chartCard">
        <div className="label">Standortanalyse & Wettbewerb im Umfeld</div>

        {loading ? (
          <div className="tinyHint">Standortdaten werden geladen ...</div>
        ) : !rows.length ? (
          <div className="tinyHint">
            Keine Standortdaten verfügbar.
          </div>
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
                    <th>PLZ</th>
                    <th>Fast Food</th>
                    <th>Restaurants</th>
                    <th>Gesamt</th>
                    <th>Umsatz</th>
                    <th>Bestellungen</th>
                    <th>AOV</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.store}>
                      <td>{r.store}</td>
                      <td>{r.district || "—"}</td>
                      <td>{r.postal_code || "—"}</td>
                      <td>{r.fastFoodCompetitors}</td>
                      <td>{r.restaurantCompetitors}</td>
                      <td>{r.totalCompetitors}</td>
                      <td>{fmtEUR(r.revenue)}</td>
                      <td>{r.orderCount}</td>
                      <td>{fmtEUR(r.aov)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="tinyHint" style={{ marginTop: 12 }}>
              Grundlage: OSM-POIs im Radius um die Filiale. Gezählt werden
              `amenity=fast_food` und `amenity=restaurant`.
            </div>
          </>
        )}
      </div>
    </div>
  );
}