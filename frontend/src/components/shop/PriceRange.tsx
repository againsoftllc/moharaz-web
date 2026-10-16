"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { tk } from "@/lib/data";

type Range = [number, number];
const KEYS: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 };

/** Two-thumb price slider with synced min/max inputs. Drag, click the track, use the keyboard or type a value. */
export default function PriceRange({ lo, hi, step, value, onChange }: { lo: number; hi: number; step: number; value: Range; onChange: (v: Range) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const thumbs = useRef<(HTMLSpanElement | null)[]>([]);
  // i = -1: both thumbs sit on the same spot, the first move decides which one is dragged
  const drag = useRef<{ i: number; off: number } | null>(null);
  const [edit, setEdit] = useState<{ i: number; v: string } | null>(null);
  const [a, b] = value;

  const pct = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const clamp = (v: number) => Math.min(hi, Math.max(lo, v));
  const snap = (v: number) => clamp(Math.round(v / step) * step);
  const set = (i: number, n: number) => {
    const next: Range = i ? [a, Math.max(n, a)] : [Math.min(n, b), b];
    if (next[0] !== a || next[1] !== b) onChange(next);
  };
  const at = (x: number) => {
    const r = box.current!.getBoundingClientRect();
    return lo + Math.min(1, Math.max(0, (x - r.left) / r.width)) * (hi - lo);
  };
  const focus = (i: number) => thumbs.current[i]?.focus({ preventScroll: true });

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const v = at(e.clientX);
    const hit = (e.target as HTMLElement).dataset.i;
    const i = hit == null ? (v <= a ? 0 : v >= b ? 1 : v - a < b - v ? 0 : 1) : a === b ? -1 : +hit;
    // grabbing a thumb keeps it under the pointer; clicking the track jumps the nearest thumb there
    drag.current = { i, off: hit == null ? 0 : v - (i === 1 ? b : a) };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (hit == null) set(i, snap(v));
    if (i >= 0) focus(i);
  };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const n = snap(at(e.clientX) - d.off);
    if (d.i < 0) {
      if (n === a) return;
      d.i = n < a ? 0 : 1;
      focus(d.i);
    }
    set(d.i, n);
  };

  const key = (i: number) => (e: KeyboardEvent) => {
    const n = e.key === "Home" ? lo : e.key === "End" ? hi : e.key in KEYS ? snap(value[i] + KEYS[e.key] * step) : null;
    if (n == null) return;
    e.preventDefault();
    set(i, n);
  };

  const commit = () => {
    if (!edit) return;
    set(edit.i, edit.v ? clamp(+edit.v) : edit.i ? hi : lo);
    setEdit(null);
  };

  const field = (i: number) => (
    <input
      inputMode="numeric"
      aria-label={`${i ? "Maximum" : "Minimum"} price in taka`}
      className={value[i] === (i ? hi : lo) ? "def" : ""}
      value={edit?.i === i ? edit.v : tk(value[i])}
      onFocus={(e) => { const el = e.currentTarget; setEdit({ i, v: String(value[i]) }); requestAnimationFrame(() => el.select()); }}
      onChange={(e) => setEdit({ i, v: e.target.value.replace(/\D/g, "") })}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );

  return (
    <>
      <div className="pr" ref={box} onPointerDown={down} onPointerMove={move} onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)}>
        <span className="pr-fill" style={{ left: `${pct(a)}%`, right: `${100 - pct(b)}%` }} />
        {value.map((v, i) => (
          <span
            key={i}
            ref={(el) => { thumbs.current[i] = el; }}
            data-i={i}
            className="pr-th"
            role="slider"
            tabIndex={0}
            aria-label={i ? "Maximum price" : "Minimum price"}
            aria-valuemin={i ? a : lo}
            aria-valuemax={i ? hi : b}
            aria-valuenow={v}
            aria-valuetext={tk(v)}
            style={{ left: `${pct(v)}%` }}
            onKeyDown={key(i)}
          />
        ))}
      </div>
      <div className="range">{field(0)}<span>–</span>{field(1)}</div>
    </>
  );
}
