"use client";

import { useEffect, useLayoutEffect, useRef, type AnimationEvent, type KeyboardEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { lockScroll } from "@/lib/scrollLock";
import { CompareIcon } from "./CompareButton";
import { MAX_COMPARE, useCompare } from "./CompareProvider";
import CompareView from "./CompareView";

/** where the sheet starts: just under the first navbar (logo + search row) */
const firstNavBottom = () => Math.max(0, Math.round(document.querySelector(".site-hdr .hdr")?.getBoundingClientRect().bottom ?? 0));
/** the sheet can be dragged from the very top down to here; pulling past CLOSE_AT closes it */
const lowest = () => Math.round(window.innerHeight * 0.6);
const CLOSE_AT = 0.72;

/**
 * The compare page in a sheet that slides up under the first navbar. Its top edge is flexible:
 * drag the bar (or use the arrow keys on the handle) to resize, double-click it for full height.
 * `closing` plays the slide-down; `onClosed` fires once it has finished so the parent can unmount it.
 */
export default function CompareSheet({ closing, onClose, onClosed }: { closing: boolean; onClose: () => void; onClosed: () => void }) {
  const { products } = useCompare();
  const root = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const top = useRef(0);
  const home = useRef(0);
  const drag = useRef<{ y: number; top: number } | null>(null);

  // the top lives in a CSS variable, so resizing never re-renders the comparison table
  const setTop = (t: number) => {
    top.current = Math.max(0, Math.min(lowest(), Math.round(t)));
    root.current?.style.setProperty("--top", `${top.current}px`);
  };

  useLayoutEffect(() => { home.current = firstNavBottom(); setTop(home.current); }, []);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const unlock = lockScroll();
    document.body.classList.add("cmp-open");
    closeBtn.current?.focus({ preventScroll: true });

    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onResize = () => { home.current = firstNavBottom(); setTop(top.current); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      unlock();
      document.body.classList.remove("cmp-open");
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest(".cmp-sheet-x")) return;
    // keep the browser from turning this into a text-selection / native drag, which cancels the pointer
    e.preventDefault();
    drag.current = { y: e.clientY, top: top.current };
    e.currentTarget.setPointerCapture(e.pointerId);
    root.current?.classList.add("dragging");
  };
  const move = (e: PointerEvent<HTMLDivElement>) => { if (drag.current) setTop(drag.current.top + e.clientY - drag.current.y); };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    root.current?.classList.remove("dragging");
    if (d.top + e.clientY - d.y > window.innerHeight * CLOSE_AT) onClose();
  };
  // keyboard and double-click jumps glide; dragging follows the pointer directly
  const glideTo = (t: number) => {
    const el = root.current;
    el?.classList.add("glide");
    setTop(t);
    setTimeout(() => el?.classList.remove("glide"), 400);
  };
  const toggleFull = () => glideTo(top.current > 0 ? 0 : home.current);
  const keys = (e: KeyboardEvent) => {
    const step = ({ ArrowUp: -48, ArrowDown: 48 } as Record<string, number>)[e.key];
    if (step) { e.preventDefault(); glideTo(top.current + step); }
    else if (e.key === "Home") { e.preventDefault(); glideTo(0); }
    else if (e.key === "End") { e.preventDefault(); glideTo(home.current); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFull(); }
  };

  const done = (e: AnimationEvent) => { if (closing && e.animationName === "cmp-sheet-out") onClosed(); };

  return createPortal(
    <div ref={root} className={`cmp-sheet-root ${closing ? "out" : ""}`}>
      <div className="cmp-sheet-bg" onClick={onClose} />
      <section className="cmp-sheet" role="dialog" aria-modal="true" aria-label="Product comparison" onAnimationEnd={done}>
        <div className="cmp-sheet-bar" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onDoubleClick={toggleFull}>
          <span className="cmp-sheet-t"><CompareIcon />Compare <b>{products.length}/{MAX_COMPARE}</b></span>
          <button className="grip" onKeyDown={keys} aria-label="Resize comparison: drag, use the arrow keys, or press Enter for full height" title="Drag to resize · double-click for full height" />
          <button ref={closeBtn} className="cmp-sheet-x" onClick={onClose} aria-label="Close comparison">
            <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="cmp-sheet-body"><CompareView inSheet /></div>
      </section>
    </div>,
    document.body,
  );
}
