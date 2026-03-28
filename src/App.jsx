// src/App.jsx
import { useMemo, useState, useEffect, useRef } from "react";
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
import LocationCompetitionPanel from "./components/LocationCompetitionPanel";
import CustomerSegmentationPanel from "./components/CustomerSegmentationPanel";

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
  marketingInsights,
} from "./lib/metrics";

import {
  buildStoreLocationBase,
  mergeLocationIntelWithStoreMetrics,
  locationInsights as buildLocationInsights,
} from "./lib/locationInsights";

import {
  aggregateCustomers,
  buildSegmentation,
} from "./lib/customerSegmentation";

export default function App() {
  const [factsRaw, setFactsRaw] = useState([]);
  const [error, setError] = useState("");
  const [campaigns, setCampaigns] = useState([]);

  const [locationIntelRows, setLocationIntelRows] = useState([]);
  const [locationIntelLoading, setLocationIntelLoading] = useState(false);

  const stores = useMemo(() => uniqueStores(factsRaw), [factsRaw]);
  const dates = useMemo(() => uniqueDates(factsRaw), [factsRaw]);
  const lastFetchTimestamp = useRef(null);

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

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const res = await fetch("http://seiz.ing/campaigns");
        if (res.ok) {
          const json = await res.json();
          setCampaigns(json.data || []);
        }
      } catch (err) {
        console.error("Fehler beim Laden der Kampagnen:", err);
      }
    }
    fetchCampaigns();
  }, []);

  function onFactsLoaded(facts) {
    setFactsRaw(facts);

    const ds = uniqueDates(facts);
    setFromDate(ds[0] || "");
    setToDate(ds[ds.length - 1] || "");
    setStore("ALL");

    setActiveChart("day");
    setError("");
  }

  function onFactsAppended(newFacts) {
    setFactsRaw((prevFacts) => {
      const existingIds = new Set(prevFacts.map((f) => f.order_id));
      const trulyNew = newFacts.filter((f) => !existingIds.has(f.order_id));

      if (trulyNew.length === 0) return prevFacts;

      const combined = [...prevFacts, ...trulyNew];
      const ds = uniqueDates(combined);
      setToDate(ds[ds.length - 1] || "");
      return combined;
    });
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

  function getLocalIsoString() {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now - tzOffset).toISOString().slice(0, 19);
  }

  async function loadLatestApiData() {
    try {
      setError("");
      let url = "";

      if (!lastFetchTimestamp.current) {
        console.log("Erster Klick: Lade komplette Historie...");
        url = `http://seiz.ing/orders?start_date=2024-01-01T00:00:00&end_date=2099-12-31T23:59:59`;
      } else {
        console.log(
          `Zweiter Klick: Lade neue Daten ab dem letzten bekannten Timestamp: ${lastFetchTimestamp.current}`
        );
        url = `http://seiz.ing/orders?start_date=${lastFetchTimestamp.current}&end_date=2099-12-31T23:59:59`;
      }

      const res = await fetch(url, { method: "GET" });

      if (!res.ok) {
        const errorJson = await res.json();
        setError(errorJson?.detail || "API-Daten konnten nicht geladen werden.");
        return;
      }

      const data = await res.json();

      if (data && data.length > 0) {
        const normalized = normalizeApiFacts(data);

        if (!lastFetchTimestamp.current) {
          onFactsLoaded(normalized);
        } else {
          onFactsAppended(normalized);
        }

        console.log(`${data.length} Zeilen von der API empfangen.`);

        let maxDateStr = lastFetchTimestamp.current || "2000-01-01T00:00:00";
        for (const row of data) {
          if (row.datetime && row.datetime > maxDateStr) {
            maxDateStr = row.datetime;
          }
        }
        lastFetchTimestamp.current = maxDateStr;
      } else {
        alert(
          "Es gibt noch keine neuen Bestellungen. Versuch es in ein paar Sekunden nochmal!"
        );
      }
    } catch (err) {
      console.error(err);
      setError("Fehler beim Laden der API-Daten.");
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
  const marketingInsightItems = useMemo(() => marketingInsights(facts), [facts]);

  const chartBasket = useMemo(() => basketByHour(facts), [facts]);
  const basketSummary = useMemo(() => basketKpis(facts), [facts]);
  const chartPerformance = useMemo(() => performanceByStore(facts), [facts]);

  // Customer Segmentation
  const customerSegmentation = useMemo(() => {
    const customers = aggregateCustomers(facts || [], facts || []);
    return buildSegmentation(customers);
  }, [facts]);

  // Standortbasis für API
  const storeLocationBase = useMemo(() => buildStoreLocationBase(facts), [facts]);

  const enrichedLocationRows = useMemo(() => {
    const merged = mergeLocationIntelWithStoreMetrics(
      storeLocationBase,
      locationIntelRows
    );

    return merged.map((row) => {
      const intel =
        locationIntelRows.find((x) => x.store === row.store) || {};

      return {
        ...row,
        population: intel.population ?? row.population ?? 0,
        populationIndex: intel.populationIndex ?? row.populationIndex ?? 0,
        priceIncreaseRecommendation:
          intel.priceIncreaseRecommendation ??
          row.priceIncreaseRecommendation ??
          0,
        fastFoodCompetitors:
          intel.fastFoodCompetitors ?? row.fastFoodCompetitors ?? 0,
        restaurantCompetitors:
          intel.restaurantCompetitors ?? row.restaurantCompetitors ?? 0,
        totalCompetitors:
          intel.totalCompetitors ?? row.totalCompetitors ?? 0,
        revenue: row.revenue ?? intel.revenue ?? 0,
        orderCount: row.orderCount ?? intel.orderCount ?? 0,
      };
    });
  }, [storeLocationBase, locationIntelRows]);

  const geoInsightItems = useMemo(() => {
    return buildLocationInsights(enrichedLocationRows);
  }, [enrichedLocationRows]);

  const combinedMarketingInsightItems = useMemo(() => {
    return [...marketingInsightItems, ...geoInsightItems];
  }, [marketingInsightItems, geoInsightItems]);

  // Standortdaten laden
  useEffect(() => {
    async function loadLocationIntel() {
      if (!storeLocationBase.length) {
        setLocationIntelRows([]);
        return;
      }

      try {
        setLocationIntelLoading(true);

        const res = await fetch("http://localhost:5174/api/location-intel", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stores: storeLocationBase.map((s) => ({
              store: s.store,
              district: s.district,
              postal_code: s.postal_code,
            })),
            radius: 800,
          }),
        });

        const json = await res.json();

        if (!res.ok || !json.ok) {
          console.error(json?.message || "Location Intel fehlgeschlagen");
          setLocationIntelRows([]);
          return;
        }

        setLocationIntelRows(json.rows || []);
      } catch (err) {
        console.error(err);
        setLocationIntelRows([]);
      } finally {
        setLocationIntelLoading(false);
      }
    }

    loadLocationIntel();
  }, [storeLocationBase]);

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

  const totalProfit = useMemo(() => calculateTotalProfit(facts || []), [facts]);

  const ytdProfit = useMemo(() => {
    if (!facts || facts.length === 0 || !yearKpis?.ytdRevenue) return 0;

    let totalRev = 0;
    facts.forEach((r) => {
      totalRev += Number(r.revenue || 0);
    });

    const avgMargin = totalRev > 0 ? totalProfit / totalRev : 0.12;

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
            <button className="btn" type="button" onClick={loadLatestApiData}>
              Letzte API-Daten
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

            <div className="basketStat">
              <div className="label">YTD Gewinn</div>
              <div className="value" style={{ color: "#10b981" }}>
                {new Intl.NumberFormat("de-DE", {
                  style: "currency",
                  currency: "EUR",
                }).format(ytdProfit || 0)}
              </div>
            </div>

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
                  <InsightsPanel
                    items={insightItems}
                    title="Insights (automatische Empfehlungen zur Umsatzsteigerung)"
                  />
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
            className={`tabBtn ${salesTab === "campaigns" ? "active" : ""}`}
            onClick={() => setSalesTab("campaigns")}
            type="button"
          >
            Kampagnen
          </button>

          <button
            className={`tabBtn ${salesTab === "customers" ? "active" : ""}`}
            onClick={() => setSalesTab("customers")}
            type="button"
          >
            Kundensegmente
          </button>

          <button
            className={`tabBtn ${salesTab === "location" ? "active" : ""}`}
            onClick={() => setSalesTab("location")}
            type="button"
          >
            Standortanalyse
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

          {salesTab === "campaigns" && (
            <div
              className="chartSlot"
              style={{
                display: "flex",
                gap: "20px",
                flexWrap: "wrap",
                padding: "20px 0",
              }}
            >
              {campaigns.length === 0 ? (
                <div className="tinyHint">
                  Lade Kampagnen oder keine verfügbar...
                </div>
              ) : (
                campaigns.map((c) => (
                  <div
                    key={c.id}
                    className="card"
                    style={{ flex: "1 1 300px", padding: "20px" }}
                  >
                    <h3
                      style={{
                        marginTop: 0,
                        marginBottom: "8px",
                        fontSize: "1.2rem",
                      }}
                    >
                      {c.title}
                    </h3>

                    <p className="tinyHint" style={{ marginBottom: "16px" }}>
                      {c.start_date} bis {c.end_date}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                      }}
                    >
                      <span style={{ color: "#8b949e" }}>Aufrufe:</span>
                      <strong style={{ color: "#c9d1d9" }}>
                        {c.views.toLocaleString("de-DE")}
                      </strong>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                      }}
                    >
                      <span style={{ color: "#8b949e" }}>Klicks:</span>
                      <strong style={{ color: "#c9d1d9" }}>
                        {c.clicks.toLocaleString("de-DE")}
                      </strong>
                    </div>

                    <hr
                      style={{
                        borderColor: "#30363d",
                        margin: "16px 0",
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            color: "#8b949e",
                            fontSize: "0.85rem",
                            display: "block",
                          }}
                        >
                          Click-Through-Rate
                        </span>
                        <strong style={{ color: "#58a6ff" }}>
                          {c.views > 0
                            ? ((c.clicks / c.views) * 100).toFixed(1)
                            : "0.0"}
                          %
                        </strong>
                      </div>
                    </div>
                  </div>
                ))
              )}
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

          {salesTab === "customers" && (
  <div
    className="chartSlot"
    style={{
      height: "auto",
      minHeight: 0,
      overflow: "visible",
      paddingBottom: "56px",
      width: "100%",
    }}
  >
    <CustomerSegmentationPanel segmentation={customerSegmentation} />
  </div>
)}
          {salesTab === "location" && (
            <div className="chartSlot">
              <LocationCompetitionPanel
                rows={enrichedLocationRows}
                loading={locationIntelLoading}
              />
            </div>
          )}

          {salesTab === "insights" && (
            <div className="chartSlot">
              <InsightsPanel
                items={combinedMarketingInsightItems}
                title="Marketing & Sales Insights"
              />
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