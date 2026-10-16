"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { SLOTS, SORT_FROM_ERP, clash, pickedIn, slotByKey, slotCompat, type BuilderSettings, type Slot, type SlotCompat, type SlotKey, type Tab } from "@/lib/builder";
import { ic, tk } from "@/lib/data";
import { numId, productHref, stockClass, type Product } from "@/lib/products";
import { lockScroll } from "@/lib/scrollLock";
import { getFacets, productsInCategory, slotProducts, type Facets } from "@/lib/shop/api";
import CompareButton from "../compare/CompareButton";
import ProductArt from "../shop/ProductArt";
import { PartRowsSkeleton } from "./Skeleton";
import SlotArt from "./SlotArt";
import type { BuilderApi } from "./PcBuilder";

const SORTS = [["popular", "Most popular"], ["price-asc", "Price: Low to High"], ["price-desc", "Price: High to Low"], ["discount", "Biggest discount"]] as const;
type Sort = (typeof SORTS)[number][0];

export type View = "list" | "grid";

/* a slot's products as the admin set the slot up in AgainERP (Website → PC Builder: category or attribute profile,
   identifying filter, Include / Exclude); its whole store category if that can't be reached. Loaded once per visit. */
const slotCache = new Map<string, Promise<Product[]>>();
function loadSlot(s: Slot) {
  let req = slotCache.get(s.erp);
  if (!req) {
    // (the fallback keeps to in-stock parts too, as AgainERP does with General → hide out-of-stock on)
    req = slotProducts(s.erp).catch(() => productsInCategory(s.cat).then((items) => items.filter((p) => p.stock === "In stock")));
    req.catch(() => slotCache.delete(s.erp));
    slotCache.set(s.erp, req);
  }
  return req.then((items) => (s.only ? items.filter(s.only) : items));
}

/* a slot's spec filters (the category page's filters: socket, form factor, side panel…), loaded once per visit */
type SpecFilter = Facets["attributes"][number];
const facetCache = new Map<string, Promise<SpecFilter[]>>();
function loadSpecFilters(cat: string) {
  let req = facetCache.get(cat);
  if (!req) {
    req = getFacets({ category: cat }).then((f) => f.attributes.filter((a) => a.display_type !== "range" && a.options.length > 1));
    req.catch(() => facetCache.delete(cat));
    facetCache.set(cat, req);
  }
  return req;
}

// "Value Top" and "Value-Top" are one brand
const brandKey = (b: string) => b.toLowerCase().replace(/[^a-z0-9]/g, "");
// a product's values for a filter (multi-select specs are comma-separated)
const valuesOf = (p: Product, code: string) => (p.attrs?.[code] ?? "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);

// stable pseudo-popularity so "Most popular" isn't just catalogue order
const pop = (p: Product) => (Math.sin(numId(p) * 12.9898) * 43758.5453) % 1;

export default function Picker({ api, settings, tab, slot, setSlot, view, setView }: {
  api: BuilderApi; settings: BuilderSettings; tab: Exclude<Tab, "overview">; slot: SlotKey; setSlot: (k: SlotKey) => void; view: View; setView: (v: View) => void;
}) {
  const { build, choose, setQty, drop } = api;
  const s = slotByKey.get(slot)!;
  const [q, setQ] = useState("");
  // the slot's own sort (Tabs & Slots) when it isn't the plain default, else General → Default sort
  const [sort, setSort] = useState<Sort>(() => SORT_FROM_ERP[s.sort && s.sort !== "popular" ? s.sort : settings.default_sort] ?? "popular");
  const [filters, setFilters] = useState(false);
  const [brand, setBrand] = useState("");
  const [inStock, setInStock] = useState(false);
  // General → Hide mismatching products: off shows them greyed out with the reason
  const [compatOnly, setCompatOnly] = useState(!settings.show_incompatible);
  const [specs, setSpecs] = useState<Record<string, string[]>>({});
  const [specFilters, setSpecFilters] = useState<SpecFilter[]>([]);
  useEffect(() => {
    let live = true;
    loadSpecFilters(s.cat).then((f) => live && setSpecFilters(f), () => live && setSpecFilters([]));
    return () => { live = false; };
  }, [s.cat]);
  const toggleSpec = (code: string, value: string) =>
    setSpecs((cur) => {
      const on = cur[code] ?? [];
      const next = on.includes(value) ? on.filter((v) => v !== value) : [...on, value];
      const rest = { ...cur };
      delete rest[code];
      return next.length ? { ...rest, [code]: next } : rest;
    });

  const [loaded, setLoaded] = useState<{ cat: string; items: Product[] } | null>(null);
  useEffect(() => {
    let live = true;
    loadSlot(s).then((items) => live && setLoaded({ cat: s.cat, items }), () => live && setLoaded({ cat: s.cat, items: [] }));
    return () => { live = false; };
  }, [s]);
  const loading = loaded?.cat !== s.cat;
  const all = useMemo(() => (loading ? [] : loaded!.items), [loading, loaded]);

  // the admin's compatibility rules (Website → PC Builder → Rules) for every part of this slot against the rest of
  // the build — the same engine as the Overview's checks, so a part it rejects is hidden here too
  const others = useMemo(() => JSON.stringify(SLOTS.filter((x) => x.key !== slot).map((x) => build[x.key] ?? [])), [build, slot]);
  const [compat, setCompat] = useState<SlotCompat>({});
  useEffect(() => {
    const ctl = new AbortController();
    void slotCompat(build, s, ctl.signal).then((r) => { if (!ctl.signal.aborted) setCompat(r ?? {}); });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when another slot's parts change
  }, [others, s]);
  // why a part doesn't fit (the admin's Error rule first, then this page's own check); null = fits
  const judged = useMemo(
    () => all.map((p) => ({ p, why: (typeof p.id === "string" ? compat[p.id]?.errors[0] : undefined) ?? clash(build, slot, p) })),
    [all, compat, build, slot],
  );
  // what the filters and counts work on: only the parts that fit, unless the shopper asked to see all
  const pool = useMemo(() => (compatOnly ? judged.filter((r) => !r.why) : judged), [judged, compatOnly]);
  const brands = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const { p } of pool) if (p.brand && !byKey.has(brandKey(p.brand))) byKey.set(brandKey(p.brand), p.brand);
    return [...byKey].sort((a, b) => a[1].localeCompare(b[1]));
  }, [pool]);
  // spec filter options with how many of the parts that fit have them (options none has are left out). A filter the
  // build has narrowed to one value (an AM5 CPU → socket AM5) shows that value as already picked, like Wootware.
  const specOptions = useMemo(() => specFilters.map((f) => {
    const counts = new Map<string, number>();
    for (const { p } of pool) for (const v of new Set(valuesOf(p, f.code))) counts.set(v, (counts.get(v) ?? 0) + 1);
    const options = f.options.map((o) => ({ ...o, count: counts.get(o.value.toLowerCase()) ?? 0 })).filter((o) => o.count > 0);
    const everywhere = new Set(all.flatMap((p) => valuesOf(p, f.code)));
    const byBuild = options.length === 1 && everywhere.size > 1 && pool.length < all.length;
    return { ...f, options, byBuild };
  }).filter((f) => f.options.length > 0), [specFilters, pool, all]);
  const rows = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const r = pool
      .filter(({ p }) => words.every((w) => `${p.name} ${p.spec}`.toLowerCase().includes(w)))
      .filter(({ p }) => (!brand || brandKey(p.brand) === brand) && (!inStock || p.stock === "In stock"))
      // within a filter any picked value matches; across filters all must match
      .filter(({ p }) => Object.entries(specs).every(([code, picked]) => {
        const have = valuesOf(p, code);
        return picked.some((v) => have.includes(v.toLowerCase()));
      }));
    const by: Record<Sort, (a: Product, b: Product) => number> = {
      popular: (a, b) => +(b.stock === "In stock") - +(a.stock === "In stock") || pop(b) - pop(a),
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      discount: (a, b) => (b.old ? 1 - b.price / b.old : 0) - (a.old ? 1 - a.price / a.old : 0),
    };
    return r.sort((a, b) => +!!a.why - +!!b.why || by[sort](a.p, b.p));
  }, [pool, q, brand, inStock, specs, sort]);
  const hidden = judged.filter((r) => r.why).length;
  const shown = rows;
  const chosen = new Set((build[slot] ?? []).map((x) => x.id));
  const active = (brand ? 1 : 0) + (inStock ? 1 : 0) + (compatOnly === !settings.show_incompatible ? 0 : 1) + Object.values(specs).reduce((n, v) => n + v.length, 0);
  const clearFilters = () => { setBrand(""); setInStock(false); setCompatOnly(!settings.show_incompatible); setSpecs({}); };

  // phones: the slot list is a bottom sheet ("Select a Category") opened from the bar above the parts
  const [slotsOpen, setSlotsOpen] = useState(false);
  const pickSlot = (k: SlotKey) => { setSlot(k); setSlotsOpen(false); };
  useEffect(() => {
    if (!slotsOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSlotsOpen(false);
    window.addEventListener("keydown", onKey);
    const unlock = lockScroll();
    return () => { window.removeEventListener("keydown", onKey); unlock(); };
  }, [slotsOpen]);

  // the filter drawer: Escape closes it, the page behind doesn't scroll
  useEffect(() => {
    if (!filters) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFilters(false);
    window.addEventListener("keydown", onKey);
    const unlock = lockScroll();
    return () => { window.removeEventListener("keydown", onKey); unlock(); };
  }, [filters]);

  return (
    <div className="pkr">
      <div className={`scrim pk-scrim ${slotsOpen ? "on" : ""}`} onClick={() => setSlotsOpen(false)} />
      <aside className={`pk-slots ${slotsOpen ? "open" : ""}`} aria-label="Parts">
        <div className="pk-sheet-h">
          <b>Select a Category</b>
          <button className="ib" onClick={() => setSlotsOpen(false)} aria-label="Close"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        </div>
        {SLOTS.filter((x) => x.tab === tab).map((x) => {
          const picks = pickedIn(build, x.key);
          const bg = picks[0]?.product.image;
          return (
            <div key={x.key} className={`pk-card ${x.key === slot ? "on" : ""} ${picks.length ? "has chosen" : ""}`}>
              {bg && <span className="pk-bg" style={{ backgroundImage: `url(${bg})` }} aria-hidden />}
              {picks.length ? (
                // the card becomes the chosen part(s): photo, name, price, (quantity), remove — the first row carries the slot title
                picks.map(({ product: p, qty }, i) => (
                  <div key={p.id} className={`pk-chosen ${i ? "more" : ""}`}>
                    <button className="pk-head" onClick={() => pickSlot(x.key)} aria-label={`${x.label}: ${p.name}, ${tk(p.price)}`}>
                      <span className="pk-thumb"><ProductArt p={p} /></span>
                      <span>
                        {i === 0 && <b>{x.label}{picks.length > 1 && <span className="pk-n" title={`${picks.length} selected`}>{picks.length}</span>}</b>}
                        <span className="pk-cname" title={p.name}>{p.name}</span>
                        <em>{tk(p.price)}{x.multi && <i> each</i>}</em>
                      </span>
                    </button>
                    {x.multi && (
                      <select value={qty} onChange={(e) => setQty(x.key, p.id, +e.target.value)} aria-label={`Quantity of ${p.name}`}>
                        {Array.from({ length: x.key === "memory" ? 4 : 8 }, (_, n) => <option key={n + 1}>{n + 1}</option>)}
                      </select>
                    )}
                    <button className="rm" aria-label={`Remove ${p.name}`} onClick={() => drop(x.key, p.id)}><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg></button>
                  </div>
                ))
              ) : (
                <button className="pk-head" onClick={() => pickSlot(x.key)}>
                  <SlotArt slot={x} size={56} />
                  <span><b>{x.label}</b><small>Please select</small></span>
                </button>
              )}
            </div>
          );
        })}
        <button className="pk-sheet-grip" onClick={() => setSlotsOpen(false)} aria-label="Close" />
      </aside>

      <section className="pk-main">
        {/* phones: the slot (opens the category sheet) and one Filter & sort button instead of the toolbar */}
        <div className="pk-mbar">
          <button className="pk-mslot" onClick={() => setSlotsOpen(true)} aria-haspopup="dialog" aria-expanded={slotsOpen}>
            <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: ic[s.icon] }} />
            <b>{s.label}</b><span className="n">{shown.length}</span>
            <svg className="chev" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          <button className={`pk-mfilter ${active ? "on" : ""}`} onClick={() => setFilters(true)} aria-haspopup="dialog" aria-expanded={filters}>
            <svg viewBox="0 0 24 24"><path d="M3 5h18M6 12h12M10 19h4" /></svg>Filter &amp; sort{active > 0 && <span>{active}</span>}
          </button>
        </div>
        <div className="pk-top">
          <div className="pk-title">
            <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: ic[s.icon] }} />
            <b>{s.label}</b><span className="n" title={hidden && compatOnly ? `${shown.length} of ${all.length} fit your build` : undefined}>{shown.length}</span>
          </div>
          <label className="pk-q">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Quick filter" aria-label={`Filter ${s.label}`} />
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </label>
          <div className="pk-view" role="group" aria-label="Layout">
            <button className={view === "list" ? "on" : ""} aria-pressed={view === "list"} onClick={() => setView("list")} aria-label="List view" title="List view">
              <svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
            </button>
            <button className={view === "grid" ? "on" : ""} aria-pressed={view === "grid"} onClick={() => setView("grid")} aria-label="Grid view" title="Grid view">
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
            </button>
          </div>
          <button className={`btn btn-line pk-fbtn ${active ? "on" : ""}`} onClick={() => setFilters(true)} aria-haspopup="dialog" aria-expanded={filters}>
            <svg viewBox="0 0 24 24"><path d="M3 5h18M6 12h12M10 19h4" /></svg>Filter{active > 0 && <span>{active}</span>}
          </button>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>


        {/* General → Show the auto-filter notice */}
        {hidden > 0 && settings.show_autofilter_notice && (
          <div className="pk-compat">
            <svg viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5z" /><path d="m9 12 2 2 4-4" /></svg>
            {compatOnly ? <>Showing products that fit your selection — {hidden} part{hidden > 1 ? "s" : ""} hidden.</> : <>Showing {hidden} incompatible part{hidden > 1 ? "s" : ""}, greyed out.</>}
            <button onClick={() => setCompatOnly((c) => !c)}>{compatOnly ? "Show all" : "Hide incompatible"}</button>
          </div>
        )}

        <ul className={`pk-list ${view}`}>
          {shown.map(({ p, why }) => {
            const on = chosen.has(p.id);
            const out = p.stock === "Out of stock";
            return (
              <li key={p.id} className={`pk-row ${on ? "on" : ""} ${why ? "bad" : ""}`}>
                <span className="pk-img">{on && <span className="pk-sel"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg>Selected</span>}<ProductArt p={p} /></span>
                <div className="pk-info">
                  <h3><a href={productHref(p)} target="_blank" rel="noreferrer">{p.name}</a></h3>
                  <div className="pk-tags"><span>{p.brand}</span>{p.spec.split(" · ").map((t, i) => <span key={`${i}-${t}`}>{t}</span>)}</div>
                  {why && <p className="pk-why"><svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>{why}</p>}
                  <p className="pk-ship"><span className={`stk ${stockClass(p.stock)}`}>{p.stock}</span>{p.stock === "Pre-order" && <em>ETA 7–10 days</em>}<CompareButton id={p.id} p={p} variant="text" /></p>
                </div>
                <div className="pk-buy">
                  {p.old && <span className="tt-save">Save {tk(p.old - p.price)} <em>-{Math.round((1 - p.price / p.old) * 100)}%</em></span>}
                  <b>{tk(p.price)}</b>
                  {p.old && <s>Was {tk(p.old)}</s>}
                  <button className={`pick ${s.multi ? "multi" : "single"} ${on ? "on" : ""}`} disabled={out && !on} onClick={() => choose(slot, p)} aria-pressed={on}>
                    <i />{s.multi ? (on ? "Added" : "Add") : on ? "Selected" : "Choose"}
                  </button>
                </div>
              </li>
            );
          })}
          {loading && <PartRowsSkeleton label={s.label} />}
          {!loading && !shown.length && <li className="empty"><b>Nothing matches</b><p>{all.length ? "Clear the quick filter or show incompatible parts." : "No products in this category yet."}</p></li>}
        </ul>
      </section>

      {/* portalled: the builder is zoomed on desktop, which would shrink a fixed drawer inside it */}
      {createPortal(
        <>
          <div className={`scrim ${filters ? "on" : ""}`} onClick={() => setFilters(false)} />
          <aside className={`drawer pk-drawer ${filters ? "on" : ""}`} role="dialog" aria-modal="true" aria-labelledby="pk-dr-h" aria-hidden={!filters} inert={!filters}>
            <div className="dr-head">
              <b id="pk-dr-h">Filter {s.label}<span className="pk-dr-m"> &amp; sort</span></b>
              <button className="ib" onClick={() => setFilters(false)} aria-label="Close filters"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
            </div>
            <div className="pk-dr-body">
              {/* phones have no toolbar: its quick filter and sort live here */}
              <fieldset className="pk-dr-m">
                <legend>Search</legend>
                <label className="pk-q">
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Quick filter" aria-label={`Search ${s.label}`} />
                  <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                </label>
              </fieldset>
              <fieldset className="pk-dr-m">
                <legend>Sort by</legend>
                <div className="chips">
                  {SORTS.map(([v, l]) => <button key={v} className={sort === v ? "on" : ""} aria-pressed={sort === v} onClick={() => setSort(v)}>{l}</button>)}
                </div>
              </fieldset>
              <fieldset>
                <legend>Brand</legend>
                <div className="chips">
                  <button className={!brand ? "on" : ""} onClick={() => setBrand("")}>All brands</button>
                  {brands.map(([k, label]) => <button key={k} className={brand === k ? "on" : ""} onClick={() => setBrand(brand === k ? "" : k)}>{label}</button>)}
                </div>
              </fieldset>
              {specOptions.map((f) => (
                <fieldset key={f.code}>
                  <legend>{f.name}</legend>
                  <div className="chips">
                    {f.options.map((o, i) => {
                      const on = f.byBuild || (specs[f.code]?.includes(o.value) ?? false);
                      return (
                        <button key={`${i}-${o.value}`} className={on ? "on" : ""} aria-pressed={on} disabled={f.byBuild}
                          title={f.byBuild ? "Set by your build — untick “Only parts that fit my build” to see others" : undefined}
                          onClick={() => toggleSpec(f.code, o.value)}>
                          {o.label} <small>{o.count}</small>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
              <fieldset>
                <legend>Availability</legend>
                <label className="agree"><input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} /><span className="box" /><span>In stock only</span></label>
              </fieldset>
              <fieldset>
                <legend>Compatibility</legend>
                <label className="agree"><input type="checkbox" checked={compatOnly} onChange={(e) => setCompatOnly(e.target.checked)} /><span className="box" /><span>Only parts that fit my build</span></label>
              </fieldset>
            </div>
            <div className="dr-foot">
              <div className="dr-btns">
                <button className="btn btn-line" onClick={clearFilters} disabled={!active}>Clear all</button>
                <button className="btn btn-red" onClick={() => setFilters(false)}>Show {shown.length} part{shown.length === 1 ? "" : "s"}</button>
              </div>
            </div>
          </aside>
        </>,
        document.body,
      )}
    </div>
  );
}
