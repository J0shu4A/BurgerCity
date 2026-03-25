export default function FileUpload({ onFactsLoaded, onError }) {
  function validateFacts(facts) {
    const required = ["order_id", "store", "product", "qty", "unit_price"];
    const missing = required.filter((k) => !facts.some((f) => f[k] !== undefined && f[k] !== ""));
    if (missing.length) {
      return `Fehlende Spalten/Inhalte: ${missing.join(", ")}. Erwartet: order_id, datetime(optional), store, product, category(optional), qty, unit_price`;
    }
    return "";
  }

  async function onChange(e) {
    onError("");
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();

    try {
      const { parseCsvFile, parseXlsxFile } = await import("../lib/parse");

      let facts = [];
      if (name.endsWith(".csv")) facts = await parseCsvFile(file);
      else facts = await parseXlsxFile(file);

      if (!facts.length) {
        onError("Konnte keine Daten lesen. Prüfe Dateiformat/Spalten.");
        return;
      }

      const err = validateFacts(facts);
      if (err) {
        onError(err);
        return;
      }

      onFactsLoaded(facts);
    } catch (err) {
  console.error(err);
  onError("Fehler beim Einlesen der Datei.");
}
  }

  return <input type="file" accept=".xlsx,.csv" onChange={onChange} />;
}
