// src/App.jsx
import { useMemo, useState } from "react";
import "./App.css";

import LoginGate from "./components/LoginGate";

import FileUpload from "./components/FileUpload";
import KpiCards from "./components/KpiCards";
import RevenueChart from "./components/RevenueChart";
import ChartTabs from "./components/ChartTabs";
import HourRevenueChart from "./components/HourRevenueChart";
import TopProductsChart from "./components/TopProductsChart";
import StoreRanking from "./components/StoreRanking";
import BundlesChart from "./components/BundlesChart";
import InsightsPanel from "./components/InsightsPanel";
import ExportButtons from "./components/ExportButtons";

import BasketAnalysisChart from "./components/BasketAnalysisChart";
import PerformanceChart from "./components/PerformanceChart";

import ForecastChart from "./components/ForecastChart";
import ForecastPlus from "./components/ForecastPlus";

import AlertsSidebar from "./components/AlertsSidebar";
import { buildAlerts } from "./lib/alerts";

import YearRevenueChart from "./components/YearRevenueChart";
import { computeYearKpis } from "./lib/yearanalytics";
import { calculateTotalProfit } from "./lib/profit";
import NewLocationPlanner from "./components/NewLocationPlanner";

import {
  computeKpis,
  revenueByDay,
  revenueByHour,
  topProductsByRevenue,
  uniqueStores,
  uniqueDates,
  filterFacts,
  storeRanking,
  topBundles,
  basketByHour,
  basketKpis,
  performanceByStore,
  insights,
} from "./lib/metrics";

export default function App() {
  const [factsRaw, setFactsRaw] = useState([]);
  const [error, setError] = useState("");

  const stores = useMemo(() => uniqueStores(factsRaw), [factsRaw]);
  const dates = useMemo(() => uniqueDates(factsRaw), [factsRaw]);

  const [store, setStore] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [activeChart, setActiveChart] = useState("day");
  const [plannerOpen, setPlannerOpen] = useState(false);

  // Panel-Auswahl
  const [selectedPanel, setSelectedPanel] = useState("chooser");
  const [salesTab, setSalesTab] = useState("products");

  // Raw Panel
  const [showRawPanel, setShowRawPanel] = useState(false);

  function onFactsLoaded(facts) {
    setFactsRaw(facts);

    const ds = uniqueDates(facts);
    setFromDate(ds[0] || "");
    setToDate(ds[ds.length - 1] || "");
    setStore("ALL");

    setActiveChart("day");
    setError("");
  }

  function normalizeApiFacts(rows) {
    return (rows || []).map((r) => {
      const qty = Number(r.qty ?? 1);
      const unit_price = Number(r.unit_price ?? 0);
      const revenue =
        r.revenue != null
          ? Number(r.revenue)
          : r.total_revenue != null
          ? Number(r.total_revenue)
          : qty * unit_price;

      return {
        ...r,
        qty,
        unit_price,
        revenue,
        datetime: r.datetime ? new Date(r.datetime) : null,
      };
    });
  }

  async function loadLatestApiData() {
  try {
    setError("");

    // Zeitraum definieren (z.B. die letzten 7 Tage oder festes Datum)
    const startDate = "2023-01-01";
    const endDate = "2026-03-27";

    // URL mit Query-Parametern für deine Python-API
    const url = `http://seiz.ing/orders?start_date=${startDate}&end_date=${endDate}`;

    const res = await fetch(url, {
      method: "GET",
      // credentials: "include" nur lassen, wenn du wirklich Cookies/Auth nutzt
    });

    if (!res.ok) {
      const errorJson = await res.json();
      setError(errorJson?.detail || "API-Daten konnten nicht geladen werden.");
      return;
    }

    const data = await res.json();
    
    // Da deine API direkt eine Liste [{}, {}] zurückgibt:
    const normalized = normalizeApiFacts(data);
    onFactsLoaded(normalized);

  } catch (err) {
    console.error(err);
    setError("Fehler beim Laden der letzten API-Daten.");
  }
}

  async function generateApiData() {
    try {
      setError("");

      const res = await fetch("http://localhost:5174/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          startDate: "2025-09-01",
          endDate: "2026-02-28",
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        setError(
          json?.message || "Neue API-Daten konnten nicht generiert werden."
        );
        return;
      }

      const normalized = normalizeApiFacts(json.data);
      onFactsLoaded(normalized);
    } catch (err) {
      setError("Fehler beim Generieren der API-Daten.");
    }
  }

  const facts = useMemo(
    () => filterFacts(factsRaw, { store, fromDate, toDate }),
    [factsRaw, store, fromDate, toDate]
  );
 
  

  
 

  const kpis = useMemo(() => computeKpis(facts), [facts]);

  // Charts / KPIs
  const chartDayRaw = useMemo(() => revenueByDay(facts), [facts]);
  const chartHour = useMemo(() => revenueByHour(facts), [facts]);
  const chartProducts = useMemo(() => topProductsByRevenue(facts, 10), [facts]);
  const chartStores = useMemo(() => storeRanking(facts), [facts]);
  const chartBundles = useMemo(() => topBundles(facts, 10), [facts]);
  const insightItems = useMemo(() => insights(facts), [facts]);

  const chartBasket = useMemo(() => basketByHour(facts), [facts]);
  const basketSummary = useMemo(() => basketKpis(facts), [facts]);
  const chartPerformance = useMemo(() => performanceByStore(facts), [facts]);

  // Year KPIs / Alerts
  const chartDayForYear = useMemo(() => {
    return (chartDayRaw || [])
      .map((r) => ({
        date: r.date || r.day || r.Datum || r.datum,
        revenue: Number(r.revenue ?? r.umsatz ?? r.Umsatz ?? 0),
      }))
      .filter((r) => r.date);
  }, [chartDayRaw]);

  const yearKpis = useMemo(
    () => computeYearKpis(chartDayForYear),
    [chartDayForYear]
  );
  // 1. WICHTIG: totalProfit MUSS hier im Code bleiben, auch wenn wir unten ytdProfit anzeigen
  const totalProfit = useMemo(() => calculateTotalProfit(facts || []), [facts]);

  // 2. Der kugelsichere YTD Profit
  const ytdProfit = useMemo(() => {
    // Sicherheits-Check: Wenn keine Daten da sind, sofort abbrechen
    if (!facts || facts.length === 0 || !yearKpis?.ytdRevenue) return 0;

    // Umsatz ganz simpel und sicher aufsummieren
    let totalRev = 0;
    facts.forEach(r => {
      totalRev += Number(r.revenue || 0);
    });

    // Division durch 0 strikt verhindern
    const avgMargin = totalRev > 0 ? (totalProfit / totalRev) : 0.12; 
    
    return yearKpis.ytdRevenue * avgMargin;
  }, [facts, totalProfit, yearKpis?.ytdRevenue]);
  

  const alerts = useMemo(() => {
    return buildAlerts(chartDayForYear, {
      dropThreshold: -0.2,
      minDailyRevenue: 500,
      byLocation: false,
    });
  }, [chartDayForYear]);

  function renderRawDataPanel() {
    const rows = facts.slice(0, 200);

    return (
      <div className="rawPanel card">
        <div className="rawPanelHead">
          <div>
            <div className="rawPanelTitle">Raw Data</div>
            <div className="rawPanelSub">
              Zeigt die ersten 200 geladenen Zeilen. Insgesamt: {facts.length}
            </div>
          </div>

          <button
            className="btn"
            type="button"
            onClick={() => setShowRawPanel(false)}
          >
            Schließen
          </button>
        </div>

        {!rows.length ? (
          <div className="tinyHint">
            Noch keine Daten geladen. Nutze Datei-Upload oder „Neue API-Daten“.
          </div>
        ) : (
          <div className="rawTableWrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>order_id</th>
                  <th>user_id</th>
                  <th>datetime</th>
                  <th>store</th>
                  <th>district</th>
                  <th>postal_code</th>
                  <th>product</th>
                  <th>category</th>
                  <th>qty</th>
                  <th>unit_price</th>
                  <th>revenue</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.order_id}-${i}`}>
                    <td>{r.order_id}</td>
                    <td>{r.user_id}</td>
                    <td>
                      {r.datetime instanceof Date
                        ? r.datetime.toLocaleString("de-DE")
                        : String(r.datetime || "")}
                    </td>
                    <td>{r.store}</td>
                    <td>{r.district}</td>
                    <td>{r.postal_code}</td>
                    <td>{r.product}</td>
                    <td>{r.category}</td>
                    <td>{r.qty}</td>
                    <td>{r.unit_price}</td>
                    <td>{r.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderPanelChooser() {
    return (
      <div className="panelChooser">
        <div className="panelChooserHead">
          <img
            src="/Eroglu_Group_Logo.png"
            alt="Eroglu Group Logo"
            className="logo"
          />
          <div>
            <h1 className="panelChooserTitle">Eroglu Control</h1>
            <p className="panelChooserSub">
              Bitte wähle das gewünschte Panel nach dem Login.
            </p>
          </div>
        </div>

        <div className="panelChooserGrid">
          <button
            type="button"
            className="panelChoice panelChoiceOverview"
            onClick={() => setSelectedPanel("overview")}
          >
            <div className="panelChoiceOverlay">
              <div className="panelChoiceTitle">Übersichtspanel</div>
              <div className="panelChoiceText">
                Komplettes Management-Dashboard mit Umsatz, Forecast,
                Filialvergleich, Bundles, Performance und Insights.
              </div>
            </div>
          </button>

          <button
            type="button"
            className="panelChoice panelChoiceSales"
            onClick={() => setSelectedPanel("salesMarketing")}
          >
            <div className="panelChoiceOverlay">
              <div className="panelChoiceTitle">Sales &amp; Marketing Panel</div>
              <div className="panelChoiceText">
                Fokus auf Produkte, Peak Hours, Bundles, Kampagnenansätze
                und vertriebsrelevante Insights.
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  function renderCommonHeader(title, subtitle, showPlanner = false) {
    return (
      <>
        <header className="header">
          <div className="brand">
            <img
              src="/Eroglu_Group_Logo.png"
              alt="Eroglu Group Logo"
              className="logo"
            />
            <div className="brandText">
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
          </div>

          <div className="headerRight">
            <button
              className="btn"
              type="button"
              onClick={loadLatestApiData}
            >
              Letzte API-Daten
            </button>

            <button
              className="btn"
              type="button"
              onClick={generateApiData}
            >
              Neue API-Daten
            </button>

            <button
              className="btn"
              type="button"
              onClick={() => setShowRawPanel(true)}
            >
              Raw Data
            </button>

            <button
              className="btn"
              type="button"
              onClick={() => setSelectedPanel("chooser")}
            >
              Panel wechseln
            </button>

            <ExportButtons
              facts={facts}
              captureSelector="#capture"
              disabled={!factsRaw.length}
            />

            {showPlanner && (
              <button
                className="btn"
                type="button"
                onClick={() => setPlannerOpen(true)}
                disabled={!factsRaw.length}
                title={
                  !factsRaw.length
                    ? "Bitte erst Daten hochladen"
                    : "Standort planen"
                }
              >
                Neuer Standort
              </button>
            )}
          </div>
        </header>

        <section className="toolbar card">
          <div className="toolbarLeft">
            <div className="label">Datei-Upload (.xlsx oder .csv)</div>
            <FileUpload onFactsLoaded={onFactsLoaded} onError={setError} />
          </div>

          <div className="toolbarFilters">
            <div className="field">
              <div className="label">Filiale</div>
              <select
                value={store}
                onChange={(e) => setStore(e.target.value)}
                disabled={!factsRaw.length}
              >
                <option value="ALL">Alle</option>
                {stores.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <div className="label">Von</div>
              <select
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                disabled={!dates.length}
              >
                {dates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <div className="label">Bis</div>
              <select
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                disabled={!dates.length}
              >
                {dates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="meta">
            <div className="label">Zeilen</div>
            <div className="value">{facts.length}</div>
          </div>
        </section>

        {error && <div className="error">{error}</div>}
      </>
    );
  }

  function renderOverviewPanel() {
    return (
      <>
        {renderCommonHeader(
          "Eroglu Control",
          "Performance Monitoring • Umsatzanalyse • Forecasting",
          true
        )}

        <KpiCards kpis={kpis} />

        {factsRaw.length > 0 && (
          <div className="card basketSummary">
            <div className="basketStat">
              <div className="label">YTD Umsatz</div>
              <div className="value">
                {new Intl.NumberFormat("de-DE", {
                  style: "currency",
                  currency: "EUR",
                }).format(yearKpis?.ytdRevenue || 0)}
              </div>
            </div>
            {/* ---> HIER IST DER NEUE GEWINN-BLOCK <--- */}
            <div className="basketStat">
              <div className="label"> YTD Gewinn</div>
              {/* Ein sattes Grün, um den Profit hervorzuheben */}
              <div className="value" style={{ color: "#10b981" }}>
                {new Intl.NumberFormat("de-DE", {
                  style: "currency",
                  currency: "EUR",
                }).format(ytdProfit || 0)}
              </div>
            </div>
            {/* ---------------------------------------- */}

            <div className="basketStat">
              <div className="label">Umsatz Vorjahr</div>
              <div className="value">
                {new Intl.NumberFormat("de-DE", {
                  style: "currency",
                  currency: "EUR",
                }).format(yearKpis?.lastYearRevenue || 0)}
              </div>
            </div>

            <div className="basketStat">
              <div className="label">YoY Wachstum</div>
              <div className="value">
                {yearKpis?.yoy == null
                  ? "-"
                  : `${(yearKpis.yoy * 100).toFixed(1)}%`}
              </div>
            </div>
          </div>
        )}

        {basketSummary?.orders !== undefined && (
          <div
            className="card"
            style={{
              display: "flex",
              gap: 16,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div className="label">Orders</div>
              <div className="value">{basketSummary.orders}</div>
            </div>
            <div>
              <div className="label">AOV</div>
              <div className="value">
                {new Intl.NumberFormat("de-DE", {
                  style: "currency",
                  currency: "EUR",
                }).format(basketSummary.aov || 0)}
              </div>
            </div>
            <div>
              <div className="label">Bundle-Quote</div>
              <div className="value">
                {Math.round((basketSummary.bundleRate || 0) * 100)}%
              </div>
            </div>
          </div>
        )}

        <div className="mainLayout">
          <AlertsSidebar alerts={alerts} />

          <div className="mainContent">
            <ChartTabs active={activeChart} onChange={setActiveChart} />

            <div className="chartContainer">
              {activeChart === "day" && (
                <div className="chartSlot">
                  <RevenueChart data={chartDayRaw} />
                </div>
              )}

              {activeChart === "hour" && (
                <div className="chartSlot">
                  <HourRevenueChart data={chartHour} />
                </div>
              )}

              {activeChart === "year" && (
                <div className="chartSlot">
                  <YearRevenueChart data={yearKpis?.yearlySeries || []} />
                </div>
              )}

              {activeChart === "products" && (
                <div className="chartSlot">
                  <TopProductsChart data={chartProducts} />
                </div>
              )}

              {activeChart === "stores" && (
                <div className="chartSlot">
                  <StoreRanking data={chartStores} />
                </div>
              )}

              {activeChart === "bundles" && (
                <div className="chartSlot">
                  <BundlesChart data={chartBundles} />
                </div>
              )}

              {activeChart === "forecast" && (
                <div className="chartSlot">
                  <ForecastChart facts={facts} />
                </div>
              )}

              {activeChart === "forecastplus" && (
                <div className="chartSlot">
                  <ForecastPlus facts={facts} />
                </div>
              )}

              {activeChart === "basket" && (
                <div className="chartSlot">
                  <BasketAnalysisChart data={chartBasket} />
                </div>
              )}

              {activeChart === "performance" && (
                <div className="chartSlot">
                  <PerformanceChart data={chartPerformance} />
                </div>
              )}

              {activeChart === "insights" && (
                <div className="chartSlot">
                  <InsightsPanel items={insightItems} />
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="footer">
          <span>Eroglu Control • Data-driven Performance Steering</span>
        </footer>

        <NewLocationPlanner
          open={plannerOpen}
          onClose={() => setPlannerOpen(false)}
          facts={facts}
        />
      </>
    );
  }

  function renderSalesMarketingPanel() {
    return (
      <>
        {renderCommonHeader(
          "Sales & Marketing Panel",
          "Produktfokus • Vertrieb • Kampagnenansätze • Upsell",
          false
        )}

        <div className="card basketSummary">
          <div className="basketStat">
            <div className="label">Top Produkt</div>
            <div className="value">{chartProducts[0]?.product || "—"}</div>
          </div>

          <div className="basketStat">
            <div className="label">Top Bundle</div>
            <div className="value">{chartBundles[0]?.bundle || "—"}</div>
          </div>

          <div className="basketStat">
            <div className="label">AOV</div>
            <div className="value">
              {new Intl.NumberFormat("de-DE", {
                style: "currency",
                currency: "EUR",
              }).format(basketSummary.aov || 0)}
            </div>
          </div>
        </div>

        <div className="tabs">
          <button
            className={`tabBtn ${salesTab === "products" ? "active" : ""}`}
            onClick={() => setSalesTab("products")}
            type="button"
          >
            Produkte
          </button>
          <button
            className={`tabBtn ${salesTab === "bundles" ? "active" : ""}`}
            onClick={() => setSalesTab("bundles")}
            type="button"
          >
            Bundles
          </button>
          <button
            className={`tabBtn ${salesTab === "hour" ? "active" : ""}`}
            onClick={() => setSalesTab("hour")}
            type="button"
          >
            Peak Hours
          </button>
          <button
            className={`tabBtn ${salesTab === "insights" ? "active" : ""}`}
            onClick={() => setSalesTab("insights")}
            type="button"
          >
            Marketing Insights
          </button>
        </div>

        <div className="chartContainer">
          {salesTab === "products" && (
            <div className="chartSlot">
              <TopProductsChart data={chartProducts} />
            </div>
          )}

          {salesTab === "bundles" && (
            <div className="chartSlot">
              <BundlesChart data={chartBundles} />
            </div>
          )}

          {salesTab === "hour" && (
            <div className="chartSlot">
              <HourRevenueChart data={chartHour} />
            </div>
          )}

          {salesTab === "insights" && (
            <div className="chartSlot">
              <InsightsPanel items={insightItems} />
            </div>
          )}
        </div>

        <footer className="footer">
          <span>Sales & Marketing Panel • Campaign & Conversion Focus</span>
        </footer>
      </>
    );
  }

  return (
    <LoginGate>
      <div className="app">
        <div id="capture" className="capture">
          {selectedPanel === "chooser" && renderPanelChooser()}
          {selectedPanel === "overview" && renderOverviewPanel()}
          {selectedPanel === "salesMarketing" && renderSalesMarketingPanel()}
          {showRawPanel && renderRawDataPanel()}
        </div>
      </div>
    </LoginGate>
  );
}