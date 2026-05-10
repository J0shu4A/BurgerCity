import { useMemo, useState } from "react";

function fmtEUR(x) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(x || 0);
}

function aggregateProduct(facts, productName) {
  if (!productName) return null;
  const filtered = facts.filter((f) => f.product === productName);
  const revenue = filtered.reduce((s, f) => s + (f.revenue || 0), 0);
  const qty = filtered.reduce((s, f) => s + (f.qty || 0), 0);
  const orders = new Set(filtered.map((f) => f.order_id)).size;
  return { revenue, qty, orders };
}

export default function ProductCompareChart({ facts }) {
  const products = useMemo(
    () =>
      [...new Set((facts || []).map((f) => f.product).filter(Boolean))].sort(),
    [facts]
  );

  const [productA, setProductA] = useState("");
  const [productB, setProductB] = useState("");

  const kpiA = useMemo(
    () => aggregateProduct(facts || [], productA),
    [facts, productA]
  );
  const kpiB = useMemo(
    () => aggregateProduct(facts || [], productB),
    [facts, productB]
  );

  const selectStyle = {
    marginLeft: 8,
    padding: "6px 8px",
    minWidth: 200,
  };
  const kpiCardStyle = {
    padding: 14,
    minWidth: 200,
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    background: "rgba(255,255,255,0.04)",
  };

  return (
    <div className="chartWrap">
      <div className="card chartCard">
        <div className="label">Produkt-Vergleich (A vs B)</div>

        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 16,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <label>
            Produkt A:
            <select
              value={productA}
              onChange={(e) => setProductA(e.target.value)}
              style={selectStyle}
            >
              <option value="">— wählen —</option>
              {products.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label>
            Produkt B:
            <select
              value={productB}
              onChange={(e) => setProductB(e.target.value)}
              style={selectStyle}
            >
              <option value="">— wählen —</option>
              {products
                .filter((p) => p !== productA)
                .map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
            </select>
          </label>
        </div>

        {(kpiA || kpiB) && (
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            {kpiA && (
              <div style={kpiCardStyle}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  {productA}
                </div>
                <div>Umsatz: {fmtEUR(kpiA.revenue)}</div>
                <div>Verkaufte Stück: {kpiA.qty.toLocaleString("de-DE")}</div>
                <div>Bestellungen: {kpiA.orders.toLocaleString("de-DE")}</div>
              </div>
            )}
            {kpiB && (
              <div style={kpiCardStyle}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  {productB}
                </div>
                <div>Umsatz: {fmtEUR(kpiB.revenue)}</div>
                <div>Verkaufte Stück: {kpiB.qty.toLocaleString("de-DE")}</div>
                <div>Bestellungen: {kpiB.orders.toLocaleString("de-DE")}</div>
              </div>
            )}
            {kpiA && kpiB && (
              <div style={{ ...kpiCardStyle, background: "rgba(255,255,255,0.08)" }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  Differenz (A − B)
                </div>
                <div>Umsatz: {fmtEUR(kpiA.revenue - kpiB.revenue)}</div>
                <div>
                  Stück: {(kpiA.qty - kpiB.qty).toLocaleString("de-DE")}
                </div>
                <div>
                  Bestellungen:{" "}
                  {(kpiA.orders - kpiB.orders).toLocaleString("de-DE")}
                </div>
              </div>
            )}
          </div>
        )}

        {!kpiA && !kpiB && (
          <div style={{ padding: 24, color: "rgba(255,255,255,0.65)" }}>
            Wähle oben zwei Produkte aus, um sie direkt zu vergleichen
            (z. B. Cheeseburger vs Chickenburger).
          </div>
        )}
      </div>
    </div>
  );
}
