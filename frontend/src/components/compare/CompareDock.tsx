"use client";

import { usePathname } from "next/navigation";
import { useCallback, useState, type AnimationEvent } from "react";
import ProductArt from "../shop/ProductArt";
import { CompareIcon } from "./CompareButton";
import { MAX_COMPARE, useCompare } from "./CompareProvider";
import CompareSheet from "./CompareSheet";

const MINI_KEY = "ut-compare-mini";
/* "grown" = back from the icon; it skips the tray's first-appearance animation */
type Dock = "open" | "shrinking" | "mini" | "growing" | "grown";

/** Floating tray: what's in the compare list + a button that slides the comparison up. It can be
 *  minimised to an icon at the bottom-left, which grows back into the tray. Also shows compare notices. */
export default function CompareDock() {
  const { products, remove, notice, ready } = useCompare();
  const path = usePathname();
  const [sheet, setSheet] = useState<"closed" | "open" | "closing">("closed");
  const close = useCallback(() => setSheet("closing"), []);
  const closed = useCallback(() => setSheet("closed"), []);
  // the dock only renders on the client (after `ready`), so reading the saved choice here is safe
  const [dock, setDock] = useState<Dock>(() => { try { return localStorage.getItem(MINI_KEY) === "1" ? "mini" : "open"; } catch { return "open"; } });

  // following a link out of the sheet (a product, the header) drops it straight away
  const [lastPath, setLastPath] = useState(path);
  if (path !== lastPath) { setLastPath(path); setSheet("closed"); }

  const remember = (mini: boolean) => { try { localStorage.setItem(MINI_KEY, mini ? "1" : "0"); } catch {} };
  const minimise = () => { setDock("shrinking"); remember(true); };
  const restore = () => { setDock("growing"); remember(false); };
  const settled = (e: AnimationEvent) => {
    if (e.animationName === "cmp-dock-shrink") setDock("mini");
    else if (e.animationName === "cmp-dock-grow") setDock("grown");
  };

  if (!ready) return null;
  const show = products.length > 0 && path !== "/compare";

  return (
    <>
      {notice && <div className="cmp-toast" role="status">{notice}</div>}
      {show && dock === "mini" && (
        <button className="cmp-mini" onClick={restore} aria-label={`Show compare list (${products.length} products)`} title="Compare">
          <CompareIcon /><b>{products.length}</b>
        </button>
      )}
      {show && dock !== "mini" && (
        <div className={`cmp-dock ${dock}`} aria-label="Compare list" onAnimationEnd={settled}>
          <button className="cmp-dock-min" onClick={minimise} aria-label="Minimise compare list" title="Minimise">
            <svg viewBox="0 0 24 24"><path d="M5 12h14" /></svg>
          </button>
          <span className="cmp-dock-t"><CompareIcon />Compare <b>{products.length}/{MAX_COMPARE}</b></span>
          <div className="cmp-dock-items">
            {products.map((p) => (
              <span key={p.id} className="thumb" title={p.name}>
                <ProductArt p={p} />
                <button onClick={() => remove(p.id)} aria-label={`Remove ${p.name} from compare`}>✕</button>
              </span>
            ))}
          </div>
          <button className="btn btn-red" onClick={() => setSheet("open")} aria-haspopup="dialog">
            {products.length < 2 ? "Add one more" : "Compare now"}
          </button>
        </div>
      )}
      {sheet !== "closed" && <CompareSheet closing={sheet === "closing"} onClose={close} onClosed={closed} />}
    </>
  );
}
