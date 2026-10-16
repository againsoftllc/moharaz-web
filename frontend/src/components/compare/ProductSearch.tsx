"use client";

import { useEffect, useId, useRef, useState } from "react";
import { tk } from "@/lib/data";
import { catOf, type Product, type ProductId } from "@/lib/products";
import { listProducts } from "@/lib/shop/api";
import { remember } from "@/lib/shop/registry";
import ProductArt from "../shop/ProductArt";

/** "Search and Select Product" combobox over the real catalogue (AgainERP product search). */
export default function ProductSearch({ onPick, exclude = [], placeholder = "Search and select product", autoFocus }: {
  onPick: (p: Product) => void; exclude?: ProductId[]; placeholder?: string; autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);

  const [found, setFound] = useState<{ q: string; items: Product[] }>({ q: "", items: [] });
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    const term = q.trim();
    if (!term) return;
    const ctl = new AbortController();
    // wait for a pause in typing before asking the shop
    const t = setTimeout(() => {
      setSearching(true);
      listProducts({ search: term, perPage: 12 }, { signal: ctl.signal })
        .then((r) => setFound({ q: term, items: r.items }))
        .catch(() => { if (!ctl.signal.aborted) setFound({ q: term, items: [] }); })
        .finally(() => { if (!ctl.signal.aborted) setSearching(false); });
    }, 250);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);
  const results = q.trim() && found.q === q.trim() ? found.items.filter((p) => !exclude.includes(p.id)).slice(0, 8) : [];

  const pick = (p: Product) => { remember(p); onPick(p); setQ(""); setOpen(false); };

  return (
    <div className="psearch" ref={box} onBlur={(e) => { if (!box.current?.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <input
        value={q}
        placeholder={placeholder}
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter" && results[hi]) { e.preventDefault(); pick(results[hi]); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      {open && q.trim() && (
        <ul id={listId} role="listbox" className="psearch-list">
          {results.length ? results.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === hi}>
              <button type="button" className={i === hi ? "hi" : ""} onMouseEnter={() => setHi(i)} onClick={() => pick(p)}>
                <span className="thumb"><ProductArt p={p} /></span>
                <span className="ps-t"><b>{p.name}</b><em>{catOf(p).name} · {tk(p.price)}</em></span>
              </button>
            </li>
          )) : <li className="ps-none">{searching || found.q !== q.trim() ? "Searching…" : <>No products match “{q}”</>}</li>}
        </ul>
      )}
    </div>
  );
}
