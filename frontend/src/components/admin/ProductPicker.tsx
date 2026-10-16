"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AdminCategory, AdminProduct } from "@/lib/admin/types";
import { tk } from "@/lib/data";
import { AdIcon } from "./icons";
import { Thumb } from "./ui";

type Props = {
  products: AdminProduct[];
  catMap: Map<string, AdminCategory>;
  /** only offer products this accepts */
  filter?: (p: AdminProduct) => boolean;
  value?: number;
  onChange: (id: number | undefined) => void;
  /** already used elsewhere — shown but disabled */
  exclude?: number[];
  placeholder?: string;
};

/** Searchable product dropdown. */
export default function ProductPicker({ products, catMap, filter, value, onChange, exclude = [], placeholder = "Choose a product" }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const sel = products.find((p) => p.id === value);

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return products
      .filter((p) => (!filter || filter(p)) && words.every((w) => `${p.name} ${p.sku} ${p.brand}`.toLowerCase().includes(w)))
      .slice(0, 60);
  }, [products, filter, q]);

  useEffect(() => {
    if (!open) return;
    const f = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, [open]);

  const pick = (p?: AdminProduct) => {
    if (p && exclude.includes(p.id) && p.id !== value) return;
    onChange(p?.id);
    setOpen(false);
    setQ("");
  };
  const look = (p: AdminProduct) => catMap.get(p.cat);

  return (
    <div className="ad-pick" ref={box}>
      <button type="button" className={`ad-pick-btn ${sel ? "" : "none"}`} onClick={() => { setOpen((o) => !o); setAt(0); }} aria-haspopup="listbox" aria-expanded={open}>
        {sel ? (
          <>
            <Thumb src={sel.image} icon={look(sel)?.icon} color={look(sel)?.color} />
            <span><b>{sel.name}</b><small>{tk(sel.price)} · {sel.stock}</small></span>
          </>
        ) : (
          <><span className="ad-th"><AdIcon n="plus" /></span><span>{placeholder}</span></>
        )}
        <AdIcon n="down" />
      </button>
      {open && (
        <div className="ad-pop">
          <div>
            <input
              className="ad-in" autoFocus value={q} placeholder="Search name, brand or SKU…" aria-label="Search products"
              onChange={(e) => { setQ(e.target.value); setAt(0); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setAt((i) => Math.min(i + 1, list.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setAt((i) => Math.max(i - 1, 0)); }
                if (e.key === "Enter") { e.preventDefault(); pick(list[at]); }
                if (e.key === "Escape") setOpen(false);
              }}
            />
          </div>
          {list.length ? (
            <ul role="listbox">
              {list.map((p, i) => {
                const used = exclude.includes(p.id) && p.id !== value;
                return (
                  <li key={p.id}>
                    <button type="button" role="option" aria-selected={p.id === value} className={i === at ? "on" : ""} disabled={used} onClick={() => pick(p)} onMouseEnter={() => setAt(i)}>
                      <Thumb src={p.image} icon={look(p)?.icon} color={look(p)?.color} />
                      <span><b>{p.name}</b><small>{used ? "Already in this list" : `${p.sku} · ${p.stock}${p.status === "draft" ? " · Draft" : ""}`}</small></span>
                      <em>{tk(p.price)}</em>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : <p className="ad-pop-none">No products match “{q}”.</p>}
          {sel && <div style={{ padding: 6, borderTop: "1px solid var(--line)" }}><button type="button" className="btn btn-line ad-sm ad-del" style={{ width: "100%" }} onClick={() => pick(undefined)}>Clear selection</button></div>}
        </div>
      )}
    </div>
  );
}
