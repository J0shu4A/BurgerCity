export default function ChartTabs({ active, onChange }) {
  const tabs = [
    { id: "day", label: "Trend (Tag)" },
    { id: "hour", label: "Trend (Stunde)" },
    { id: "year", label: "Jahresumsätze" }, // ✅ NEU
    { id: "products", label: "Produkte" },
    { id: "stores", label: "Filialen" },
    { id: "bundles", label: "Bundles" },
    { id: "forecast", label: "Forecast" },
    { id: "forecastplus", label: "Forecast+" },
    { id: "basket", label: "Warenkorb" },
    { id: "performance", label: "Performance" },
    { id: "insights", label: "Insights" },
  ];

  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`tabBtn ${active === t.id ? "active" : ""}`}
          onClick={() => onChange(t.id)}
          type="button"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
