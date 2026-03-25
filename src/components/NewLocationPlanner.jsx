import { useMemo, useState } from "react";

function fmtEUR(x) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    Number.isFinite(x) ? x : 0
  );
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export default function NewLocationPlanner({ open, onClose, facts = [] }) {
  const stores = useMemo(() => {
    const s = Array.from(new Set((facts || []).map((f) => f.store).filter(Boolean)));
    return s.sort((a, b) => a.localeCompare(b));
  }, [facts]);

  const [name, setName] = useState("Neuer Standort");
  const [benchmark, setBenchmark] = useState(stores[0] || "ALL");

  // Annahmen
  const [footfallFactor, setFootfallFactor] = useState(1.0); // 0.6..1.6
  const [aovFactor, setAovFactor] = useState(1.0); // 0.8..1.2
  const [openDaysPerWeek, setOpenDaysPerWeek] = useState(7); // 5..7

  const [rent, setRent] = useState(7500); // €/Monat
  const [staff, setStaff] = useState(22000); // €/Monat
  const [otherFixed, setOtherFixed] = useState(3000); // €/Monat

  const [cmRate, setCmRate] = useState(0.62); // Deckungsbeitrag (nach Wareneinsatz) z.B. 0.55-0.70

  const benchStats = useMemo(() => {
    if (!facts?.length) return null;

    const rows = benchmark === "ALL" ? facts : facts.filter((f) => f.store === benchmark);

    // Umsatz = qty * unit_price
    let revenue = 0;
    const orders = new Set();
    const days = new Set();

    for (const r of rows) {
      const qty = Number(r.qty ?? 0);
      const unit = Number(r.unit_price ?? 0);
      revenue += qty * unit;

      if (r.order_id) orders.add(r.order_id);

      if (r.datetime) {
        const d = String(r.datetime).slice(0, 10);
        if (d.length === 10) days.add(d);
      }
    }

    const orderCount = orders.size || 0;
    const dayCount = days.size || 0;

    const aov = orderCount ? revenue / orderCount : 0;
    const revPerDay = dayCount ? revenue / dayCount : 0;
    const ordersPerDay = dayCount ? orderCount / dayCount : 0;

    return {
      benchmark,
      revenue,
      orderCount,
      dayCount,
      aov,
      revPerDay,
      ordersPerDay,
    };
  }, [facts, benchmark]);

  const projection = useMemo(() => {
    if (!benchStats) return null;

    const ff = clamp(Number(footfallFactor) || 1, 0.6, 1.6);
    const af = clamp(Number(aovFactor) || 1, 0.8, 1.2);

    const daysPerMonth = (Number(openDaysPerWeek) || 7) * 4.345; // Ø Wochen/Monat
    const projOrdersPerDay = benchStats.ordersPerDay * ff;
    const projAov = benchStats.aov * af;

    const projRevPerDay = projOrdersPerDay * projAov;
    const projRevPerMonth = projRevPerDay * daysPerMonth;

    const fixed = (Number(rent) || 0) + (Number(staff) || 0) + (Number(otherFixed) || 0);
    const cm = clamp(Number(cmRate) || 0.62, 0.35, 0.85);

    const contribution = projRevPerMonth * cm;
    const profit = contribution - fixed;

    const breakEvenRevenue = cm > 0 ? fixed / cm : Infinity;

    // Ampel
    const margin = projRevPerMonth > 0 ? profit / projRevPerMonth : -1;
    let verdict = "NO-GO";
    if (profit > 2500) verdict = "GO";
    else if (profit > -1500) verdict = "CHECK";

    return {
      projOrdersPerDay,
      projAov,
      projRevPerDay,
      projRevPerMonth,
      fixed,
      cm,
      contribution,
      profit,
      breakEvenRevenue,
      margin,
      verdict,
    };
  }, [benchStats, footfallFactor, aovFactor, openDaysPerWeek, rent, staff, otherFixed, cmRate]);

  if (!open) return null;

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true">
      <div className="modalCard card">
        <div className="modalHead">
          <div>
            <div className="modalTitle">Neuen Standort datenbasiert planen</div>
            <div className="modalSub">
              Benchmark wählen → Annahmen setzen → Prognose + Break-even
            </div>
          </div>

          <button className="btn" onClick={onClose} type="button">
            Schließen
          </button>
        </div>

        <div className="modalGrid">
          {/* LEFT: Inputs */}
          <div className="modalCol">
            <div className="label">Standort-Name</div>
            <input
              className="textInput"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Berlin Alexanderplatz"
            />

            <div style={{ height: 10 }} />

            <div className="label">Benchmark (beste Vergleichsfiliale)</div>
            <select
              className="selectInput"
              value={benchmark}
              onChange={(e) => setBenchmark(e.target.value)}
              disabled={!stores.length}
            >
              <option value="ALL">Alle (Gesamt)</option>
              {stores.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <div style={{ height: 12 }} />

            <div className="label">Footfall-Faktor (Orders/Tag)</div>
            <input
              className="rangeInput"
              type="range"
              min="0.6"
              max="1.6"
              step="0.05"
              value={footfallFactor}
              onChange={(e) => setFootfallFactor(Number(e.target.value))}
            />
            <div className="tinyHint">Aktuell: {footfallFactor.toFixed(2)}×</div>

            <div style={{ height: 10 }} />

            <div className="label">AOV-Faktor (Warenkorb)</div>
            <input
              className="rangeInput"
              type="range"
              min="0.8"
              max="1.2"
              step="0.02"
              value={aovFactor}
              onChange={(e) => setAovFactor(Number(e.target.value))}
            />
            <div className="tinyHint">Aktuell: {aovFactor.toFixed(2)}×</div>

            <div style={{ height: 10 }} />

            <div className="label">Öffnungstage/Woche</div>
            <select
              className="selectInput"
              value={openDaysPerWeek}
              onChange={(e) => setOpenDaysPerWeek(Number(e.target.value))}
            >
              <option value={5}>5</option>
              <option value={6}>6</option>
              <option value={7}>7</option>
            </select>

            <div style={{ height: 14 }} />

            <div className="label">Fixkosten / Monat</div>
            <div className="twoCol">
              <div>
                <div className="label">Miete</div>
                <input
                  className="textInput"
                  type="number"
                  value={rent}
                  onChange={(e) => setRent(Number(e.target.value))}
                />
              </div>
              <div>
                <div className="label">Personal</div>
                <input
                  className="textInput"
                  type="number"
                  value={staff}
                  onChange={(e) => setStaff(Number(e.target.value))}
                />
              </div>
              <div>
                <div className="label">Sonstiges</div>
                <input
                  className="textInput"
                  type="number"
                  value={otherFixed}
                  onChange={(e) => setOtherFixed(Number(e.target.value))}
                />
              </div>
              <div>
                <div className="label">DB-Quote</div>
                <input
                  className="textInput"
                  type="number"
                  step="0.01"
                  value={cmRate}
                  onChange={(e) => setCmRate(Number(e.target.value))}
                />
                <div className="tinyHint">z.B. 0.60 = 60%</div>
              </div>
            </div>
          </div>

          {/* RIGHT: Output */}
          <div className="modalCol">
            <div className="card" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="label">Benchmark-Stats</div>
              {!benchStats ? (
                <div className="muted">Noch keine Daten geladen.</div>
              ) : (
                <div className="table">
                  <div className="row head">
                    <div>Key</div>
                    <div className="right">Value</div>
                  </div>
                  <div className="row">
                    <div>Benchmark</div>
                    <div className="right">{benchStats.benchmark}</div>
                  </div>
                  <div className="row">
                    <div>Orders/Tag</div>
                    <div className="right">{benchStats.ordersPerDay.toFixed(1)}</div>
                  </div>
                  <div className="row">
                    <div>AOV</div>
                    <div className="right">{fmtEUR(benchStats.aov)}</div>
                  </div>
                  <div className="row">
                    <div>Umsatz/Tag</div>
                    <div className="right">{fmtEUR(benchStats.revPerDay)}</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ height: 10 }} />

            <div className="card" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="label">Prognose – {name}</div>
              {!projection ? (
                <div className="muted">Noch keine Daten geladen.</div>
              ) : (
                <>
                  <div className="verdictRow">
                    <span className={`verdictBadge ${projection.verdict.toLowerCase()}`}>
                      {projection.verdict}
                    </span>
                    <span className="muted">
                      (vereinfachtes Modell, basierend auf Benchmark)
                    </span>
                  </div>

                  <div className="table">
                    <div className="row head">
                      <div>Key</div>
                      <div className="right">Value</div>
                    </div>
                    <div className="row">
                      <div>Orders/Tag (proj.)</div>
                      <div className="right">{projection.projOrdersPerDay.toFixed(1)}</div>
                    </div>
                    <div className="row">
                      <div>AOV (proj.)</div>
                      <div className="right">{fmtEUR(projection.projAov)}</div>
                    </div>
                    <div className="row">
                      <div>Umsatz/Tag (proj.)</div>
                      <div className="right">{fmtEUR(projection.projRevPerDay)}</div>
                    </div>
                    <div className="row">
                      <div>Umsatz/Monat (proj.)</div>
                      <div className="right">{fmtEUR(projection.projRevPerMonth)}</div>
                    </div>
                    <div className="row">
                      <div>Fixkosten/Monat</div>
                      <div className="right">{fmtEUR(projection.fixed)}</div>
                    </div>
                    <div className="row">
                      <div>Deckungsbeitrag (DB)</div>
                      <div className="right">{fmtEUR(projection.contribution)}</div>
                    </div>
                    <div className="row">
                      <div>Überschuss/Monat</div>
                      <div className="right">{fmtEUR(projection.profit)}</div>
                    </div>
                    <div className="row">
                      <div>Break-even Umsatz/Monat</div>
                      <div className="right">{fmtEUR(projection.breakEvenRevenue)}</div>
                    </div>
                  </div>

                  <div className="tinyHint" style={{ marginTop: 8 }}>
                    Tipp: Wenn du Footfall-Faktor erhöhst, steigt Orders/Tag. AOV-Faktor
                    wirkt auf Upsell/Bundles/Preispunkt.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="tinyHint" style={{ marginTop: 10 }}>
          Modell: Benchmark-KPIs aus echten Daten → multipliziert mit Faktoren → DB-Quote
          → Fixkosten → Break-even.
        </div>
      </div>
    </div>
  );
}
