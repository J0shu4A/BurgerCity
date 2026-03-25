import { useEffect } from "react";

export default function ChartModal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return;

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="chartModalOverlay" onClick={onClose}>
      <div
        className="chartModalCard"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chartModalHead">
          <div className="chartModalTitle">{title}</div>

          <button className="btn" type="button" onClick={onClose}>
            Schließen
          </button>
        </div>

        <div className="chartModalBody">{children}</div>
      </div>
    </div>
  );
}