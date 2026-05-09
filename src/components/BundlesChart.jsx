import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function fmtEUR(x) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(x || 0);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  const isRevenue = p.dataKey === "revenue";
  return (
    <div
      style={{
        background: "rgba(20,24,32,0.95)",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: 10,
        padding: "8px 12px",
        color: "#fff",
        fontSize: 12,
        maxWidth: 320,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4, whiteSpace: "normal" }}>
        {label}
      </div>
      <div>
        {isRevenue ? "Umsatz: " : "Häufigkeit: "}
        {isRevenue ? fmtEUR(p.value) : p.value}
      </div>
    </div>
  );
}

export default function BundlesChart({ data }) {
  return (
    <div className="chartWrap">
      <div className="card chartCard">
        <div className="label">Top Bundles (Cross-Selling) – nach Häufigkeit</div>

        <div className="chartArea">
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ left: 20, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="bundle"
                width={240}
                interval={0}
                tick={{ fontSize: 11, fill: "rgba(255,255,255,0.85)" }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="count" name="Häufigkeit" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="tinyHint">Umsatzhebel: Bundle als „1-Klick-Upgrade" im Checkout anbieten → AOV steigt.</div>
      </div>
    </div>
  );
}
