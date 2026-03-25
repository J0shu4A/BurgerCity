import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

function getColor(score) {
  if (score >= 75) return "#22c55e"; // grün
  if (score >= 50) return "#facc15"; // gelb
  return "#ef4444"; // rot
}

function shorten(s, max = 14) {
  const str = String(s ?? "");
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

// ✅ Score ist nur valide, wenn er eine Zahl ist und optional Umsatz/Orders vorhanden sind
function isValidRow(row) {
  if (!row) return false;
  const scoreOk = Number.isFinite(Number(row.score));
  if (!scoreOk) return false;

  // Wenn du diese Felder im Data-Objekt hast, verhindert das "Score ohne Daten"
  if (row.orders !== undefined && Number(row.orders) <= 0) return false;
  if (row.revenue !== undefined && Number(row.revenue) <= 0) return false;

  // store-name muss existieren
  if (!row.store) return false;

  return true;
}

export default function PerformanceChart({ data }) {
  const safe = Array.isArray(data) ? data : [];
  const cleaned = safe
    .filter(isValidRow)
    .map((r) => ({ ...r, score: Math.round(Number(r.score)) }))
    .sort((a, b) => b.score - a.score);

  // ✅ Empty State
  if (!cleaned.length) {
    return (
      <div className="chartWrap">
        <div className="card chartCard">
          <div className="label">Filial Performance Score (0–100)</div>
          <div className="tinyHint" style={{ marginTop: 8 }}>
            Keine Performance-Daten im aktuellen Filter (evtl. Zeitraum/Filiale).
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chartWrap">
      <div className="card chartCard">
        <div className="label">Filial Performance Score (0–100)</div>

        <div className="chartArea">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={cleaned}
              margin={{ top: 8, right: 12, left: 0, bottom: 28 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="store"
                interval={0}
                tickFormatter={(v) => shorten(v, 16)}
                height={40}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip
                formatter={(v) => [`${v}`, "Score"]}
                labelFormatter={(label) => `Filiale: ${label}`}
              />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {cleaned.map((row, i) => (
                  <Cell key={`cell-${i}`} fill={getColor(row.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="tinyHint">
          Ampel: Grün ≥ 75 • Gelb 50–74 • Rot &lt; 50
        </div>
      </div>
    </div>
  );
}
