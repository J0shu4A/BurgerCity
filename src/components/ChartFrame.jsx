import { useState } from "react";
import ChartModal from "./ChartModal";

export default function ChartFrame({ title, children, modalChildren }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="chartFrame">
        <div className="chartFrameTop">
          <button
            className="btn chartExpandBtn"
            type="button"
            onClick={() => setOpen(true)}
          >
            Fullscreen
          </button>
        </div>

        <div className="chartFrameBody">{children}</div>
      </div>

      <ChartModal open={open} title={title} onClose={() => setOpen(false)}>
        {modalChildren || children}
      </ChartModal>
    </>
  );
}