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
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(x || 0);
}

export default function HourRevenueChart({ data }) {
  return (
    <div className="chartWrap">
      <div className="card chartCard">
        <div className="label">Umsatz nach Uhrzeit</div>
        <div className="chartArea">
          {/* width und height hinzugefügt */}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data}
              // left: 15 gibt den Zahlen links genug Platz zum Atmen
              margin={{ top: 8, right: 12, left: 15, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 12, fill: "#8b949e" }} 
              />
              
              <YAxis 
                width={65} // <-- Hier ist der wichtigste Fix: von 40 auf 65 erhöht!
                tickFormatter={(v) => `${Math.round(v)}`} 
                tick={{ fontSize: 12, fill: "#8b949e" }}
              />
              
              <Tooltip 
                formatter={(v) => fmtEUR(v)} 
                labelFormatter={(label) => `Uhrzeit: ${label} Uhr`}
                contentStyle={{ backgroundColor: "#161b22", borderColor: "#30363d", color: "#c9d1d9" }}
              />
              
              <Bar 
                dataKey="revenue" 
                fill="#58a6ff" // Schönes Blau passend zum Dark-Mode
                radius={[4, 4, 0, 0]} // Die Balken oben leicht abrunden
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}