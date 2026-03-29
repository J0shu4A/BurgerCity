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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    // payload[0].payload enthält die komplette Original-Zeile deiner Daten!
    const rowData = payload[0].payload; 
    
    return (
      <div
        style={{
          backgroundColor: "#161b22",
          border: "1px solid #30363d",
          borderRadius: "6px",
          padding: "12px",
          color: "#c9d1d9",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          minWidth: "180px"
        }}
      >
        <strong style={{ display: "block", fontSize: "1rem", marginBottom: "4px" }}>
          {label} {/* Zeigt den Store-Namen (die Straße) */}
        </strong>
        
        {/* Falls PLZ oder Bezirk im Frontend-Datensatz vorhanden sind, werden sie hier angezeigt */}
        {(rowData.postal_code || rowData.district) && (
          <span style={{ display: "block", color: "#8b949e", fontSize: "0.85rem", marginBottom: "12px" }}>
            {rowData.postal_code || ""} Berlin {rowData.district ? `- ${rowData.district}` : ""}
          </span>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#8b949e", fontSize: "0.9rem" }}>Score:</span>
          <strong style={{ color: getColor(rowData.score), fontSize: "1.1rem" }}>
            {rowData.score}
          </strong>
        </div>
      </div>
    );
  }
  return null;
};


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
              // Wir geben dem Chart unten 70px Luft für die schrägen Texte
              margin={{ top: 8, right: 12, left: 0, bottom: 70 }} 
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="store"
                interval={0}
                tickFormatter={(v) => shorten(v, 16)}
                // Das height-Attribut ist jetzt weg!
                angle={-45}           
                textAnchor="end"      
                dx={-5} // Schiebt den Text minimal nach links, genau unter den Strich
                dy={5}  // Schiebt den Text minimal nach unten weg von der Achse
                tick={{ fontSize: 11, fill: "#8b949e" }} 
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#8b949e" }} />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ fill: "#30363d", opacity: 0.3 }} 
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
