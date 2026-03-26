export default function InsightsPanel({ items = [], title = "Insights" }) {
  return (
    <div className="chartWrap">
      <div className="card chartCard">
        <div className="label">{title}</div>

        {!items.length ? (
          <div className="tinyHint">
            Keine Insights für den gewählten Zeitraum verfügbar.
          </div>
        ) : (
          <div className="insights">
            {items.map((it, idx) => (
              <div key={idx} className={`insight insight--${it.type || "info"}`}>
                <div className="insightTop">
                  <div className="insightMeta">
                    <span className="insightCategory">
                      {it.category || "Insight"}
                    </span>
                    {it.priority && (
                      <span className="insightPriority">{it.priority}</span>
                    )}
                  </div>
                </div>

                <div className="insightTitle">{it.title}</div>
                <div className="insightText">{it.text}</div>

                {it.recommendation && (
                  <div className="insightRecommendation">
                    <strong>Empfehlung:</strong> {it.recommendation}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}