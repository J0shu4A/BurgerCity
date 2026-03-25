import { toPng } from "html-to-image";
import jsPDF from "jspdf";

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportButtons({ facts, captureSelector = "#capture", disabled = false }) {
  const isDisabled = disabled || !facts?.length;

  async function capturePng() {
    const node = document.querySelector(captureSelector);
    if (!node) return alert(`Capture-Element nicht gefunden: ${captureSelector}`);

    const dataUrl = await toPng(node, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#0b0f14",
    });

    const res = await fetch(dataUrl);
    const blob = await res.blob();
    downloadBlob("eroglu-control.png", blob);
  }

  async function capturePdf() {
    const node = document.querySelector(captureSelector);
    if (!node) return alert(`Capture-Element nicht gefunden: ${captureSelector}`);

    const dataUrl = await toPng(node, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#0b0f14",
    });

    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const img = new Image();
    img.src = dataUrl;
    await new Promise((r) => (img.onload = r));

    const imgW = img.width;
    const imgH = img.height;
    const scale = Math.min(pageW / imgW, pageH / imgH);

    const w = imgW * scale;
    const h = imgH * scale;
    const x = (pageW - w) / 2;
    const y = (pageH - h) / 2;

    pdf.addImage(dataUrl, "PNG", x, y, w, h);
    pdf.save("eroglu-control.pdf");
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
      <button className="btn" onClick={capturePng} disabled={isDisabled} title="Dashboard als PNG Screenshot">
        PNG
      </button>
      <button className="btn" onClick={capturePdf} disabled={isDisabled} title="Dashboard als PDF exportieren">
        PDF
      </button>
    </div>
  );
}
