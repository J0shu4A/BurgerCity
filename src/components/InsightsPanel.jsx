export default function InsightsPanel({ items }) {
  return (
    <div className="chartWrap">
      <div className="card chartCard">
        <div className="label">Insights (automatische Empfehlungen zur Umsatzsteigerung)</div>

        <div className="insights">
          {items.map((it, idx) => (
            <div key={idx} className="insight">
              <div className="insightTitle">{it.title}</div>
              <div className="insightText">{it.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
