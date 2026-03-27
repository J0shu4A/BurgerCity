export default function InsightsPanel({ items = [], title = "Insights" }) {
  function fmtEUR(x) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(Number(x) || 0);
  }

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
              <div
                key={idx}
                className={`insight insight--${it.type || "info"}`}
              >
                {/* 🔹 TOP META */}
                <div className="insightTop">
                  <div className="insightMeta">
                    <span className="insightCategory">
                      {it.category || "Insight"}
                    </span>

                    {it.priority && (
                      <span className="insightPriority">
                        {it.priority}
                      </span>
                    )}
                  </div>
                </div>

                {/* 🔹 OPTIONAL CONTEXT (NEU) */}
                {(it.store || it.district) && (
                  <div className="insightContext">
                    {it.store && (
                      <span className="insightTag">
                        📍 {it.store}
                      </span>
                    )}
                    {it.district && (
                      <span className="insightTag">
                        {it.district}
                      </span>
                    )}
                  </div>
                )}

                {/* 🔹 TITLE */}
                <div className="insightTitle">{it.title}</div>

                {/* 🔹 TEXT */}
                <div className="insightText">{it.text}</div>

                {/* 🔹 IMPACT (NEU – z. B. für Preis-Simulation / Geo) */}
                {it.impact != null && (
                  <div className="insightImpact">
                    <strong>Impact:</strong>{" "}
                    {typeof it.impact === "number"
                      ? fmtEUR(it.impact)
                      : it.impact}
                  </div>
                )}

                {/* 🔹 EXTRA DATA (optional flexibel) */}
                {it.extra && (
                  <div className="insightExtra">
                    {Object.entries(it.extra).map(([key, val]) => (
                      <div key={key}>
                        <strong>{key}:</strong>{" "}
                        {typeof val === "number" ? fmtEUR(val) : val}
                      </div>
                    ))}
                  </div>
                )}

                {/* 🔹 RECOMMENDATION */}
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