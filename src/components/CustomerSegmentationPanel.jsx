import { useMemo, useState } from "react";

const TABS = ["Singles", "Families", "Business/Events", "Lost Customers"];

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("de-DE").format(d);
}

function SummaryCard({ title, value }) {
  return (
    <div
      className="card"
      style={{
        padding: 16,
        borderRadius: 16,
        minHeight: 90,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div style={{ fontSize: 14, color: "#8b949e" }}>{title}</div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          marginTop: 8,
          color: "#e6edf3",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function RecommendationBox({ recommendation }) {
  if (!recommendation) return <span style={{ color: "#8b949e" }}>-</span>;

  return (
    <div
      style={{
        background: "#161b22",
        border: "1px solid #30363d",
        borderRadius: 12,
        padding: 10,
        fontSize: 13,
        color: "#c9d1d9",
        lineHeight: 1.45,
      }}
    >
      <div
        style={{
          fontWeight: 700,
          marginBottom: 4,
          color: "#58a6ff",
        }}
      >
        {recommendation.campaign}
      </div>

      <div style={{ marginBottom: 6, color: "#c9d1d9" }}>
        {recommendation.message}
      </div>

      <div style={{ color: "#8b949e" }}>
        <strong style={{ color: "#c9d1d9" }}>Flyer / E-Mail Inhalte:</strong>{" "}
        {recommendation.bundles?.length
          ? recommendation.bundles.join(", ")
          : "-"}
      </div>
    </div>
  );
}

function CustomerTable({ customers }) {
  if (!customers?.length) {
    return (
      <div className="card" style={{ padding: 16, borderRadius: 16 }}>
        <div className="tinyHint">Keine Kunden in diesem Segment gefunden.</div>
      </div>
    );
  }

  const headerStyle = {
    padding: 12,
    color: "#e6edf3",
    position: "sticky",
    top: 0,
    background: "#161b22",
    zIndex: 2,
    whiteSpace: "nowrap",
  };

  return (
    <div
      className="card"
      style={{
        borderRadius: 16,
        padding: 0,
        marginBottom: 12,
        width: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          maxHeight: "360px",
          overflow: "auto",
          scrollbarGutter: "stable",
          paddingBottom: 8,
        }}
      >
        <table
          style={{
            width: "100%",
            minWidth: "1450px",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#161b22",
                textAlign: "left",
                borderBottom: "1px solid #30363d",
              }}
            >
              <th style={{ ...headerStyle, minWidth: 110 }}>User ID</th>
              <th style={{ ...headerStyle, minWidth: 90 }}>Orders</th>
              <th style={{ ...headerStyle, minWidth: 130 }}>Revenue</th>
              <th style={{ ...headerStyle, minWidth: 140 }}>Ø Order Value</th>
              <th style={{ ...headerStyle, minWidth: 90 }}>Ø Items</th>
              <th style={{ ...headerStyle, minWidth: 130 }}>Last Order</th>
              <th style={{ ...headerStyle, minWidth: 220 }}>Top Produkte</th>
              <th style={{ ...headerStyle, minWidth: 240 }}>Top Bundle</th>
              <th style={{ ...headerStyle, minWidth: 420 }}>
                Flyer / E-Mail Empfehlung
              </th>
            </tr>
          </thead>

          <tbody>
            {customers.map((customer) => (
              <tr
                key={`${customer.user_id}-${customer.base_cluster}-${customer.is_lost}`}
                style={{
                  borderTop: "1px solid #30363d",
                  verticalAlign: "top",
                }}
              >
                <td
                  style={{
                    padding: 12,
                    fontWeight: 600,
                    color: "#e6edf3",
                    whiteSpace: "nowrap",
                  }}
                >
                  {customer.user_id}
                </td>

                <td
                  style={{
                    padding: 12,
                    color: "#c9d1d9",
                    whiteSpace: "nowrap",
                  }}
                >
                  {customer.total_orders}
                </td>

                <td
                  style={{
                    padding: 12,
                    color: "#c9d1d9",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatCurrency(customer.total_revenue)}
                </td>

                <td
                  style={{
                    padding: 12,
                    color: "#c9d1d9",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatCurrency(customer.avg_order_value)}
                </td>

                <td
                  style={{
                    padding: 12,
                    color: "#c9d1d9",
                    whiteSpace: "nowrap",
                  }}
                >
                  {Number(customer.avg_items_per_order || 0).toFixed(1)}
                </td>

                <td
                  style={{
                    padding: 12,
                    color: "#c9d1d9",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatDate(customer.last_order_date)}
                </td>

                <td style={{ padding: 12, color: "#c9d1d9", minWidth: 220 }}>
                  {customer.favorite_products?.length
                    ? customer.favorite_products.join(", ")
                    : "-"}
                </td>

                <td style={{ padding: 12, color: "#c9d1d9", minWidth: 240 }}>
                  {customer.favorite_bundle || "-"}
                </td>

                <td style={{ padding: 12, minWidth: 420 }}>
                  <RecommendationBox recommendation={customer.recommendation} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CustomerSegmentationPanel({ segmentation }) {
  const [activeTab, setActiveTab] = useState("Singles");

  const currentCustomers = useMemo(() => {
    return segmentation?.clusters?.[activeTab] || [];
  }, [segmentation, activeTab]);

  if (!segmentation) return null;

  return (
    <section style={{ marginTop: 24, width: "100%" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: "#e6edf3" }}>Customer Segmentation</h2>
        <p style={{ marginTop: 6, color: "#8b949e" }}>
          Top 10 Kunden je Segment mit Empfehlungen für Flyer, E-Mail-Kampagnen
          und Rückgewinnungsansprache basierend auf ihrem Bestellverhalten.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <SummaryCard title="Singles" value={segmentation.summary?.singles || 0} />
        <SummaryCard
          title="Families"
          value={segmentation.summary?.families || 0}
        />
        <SummaryCard
          title="Business/Events"
          value={segmentation.summary?.businessEvents || 0}
        />
        <SummaryCard
          title="Lost Customers"
          value={segmentation.summary?.lostCustomers || 0}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            type="button"
            className={`tabBtn ${activeTab === tab ? "active" : ""}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <CustomerTable customers={currentCustomers} />
    </section>
  );
}