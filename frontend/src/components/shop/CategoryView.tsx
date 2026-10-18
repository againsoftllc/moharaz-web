"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ic, tk } from "@/lib/data";
import type { Brand } from "@/lib/brands";
import { getFacets, listProducts, type Facets, type ListQuery } from "@/lib/shop/api";
import { API_SORT, PER_PAGE, SORTS, filterParams, listQuery, num, valueSlug, type Listing, type Query, type ShopCategory, type Sort } from "@/lib/shop/listing";
import { remember } from "@/lib/shop/registry";
import BrandLogo from "../brands/BrandLogo";
import CategoryBanner from "./CategoryBanner";
import Pagination from "./Pagination";
import PriceRange from "./PriceRange";
import ProductCard from "./ProductCard";
import AiSearchBanner from "./AiSearchBanner";

/** price slider bounds, rounded out to a step that suits the spread */
function priceBounds(f: Facets | null) {
  const lo0 = Number(f?.price_min ?? 0), hi0 = Number(f?.price_max ?? 0);
  if (!(hi0 > 0)) return null;
  const step = [50, 100, 500, 1000, 5000].find((s) => s >= (hi0 - lo0) / 400) ?? 10000;
  const lo = Math.floor(lo0 / step) * step;
  return { lo, hi: Math.max(lo + step, Math.ceil(hi0 / step) * step), step };
}

function Check({ label, count, on, toggle, radio }: { label: string; count?: number; on: boolean; toggle: () => void; radio?: boolean }) {
  return (
    <label className={`chk ${radio ? "rad" : ""} ${count === 0 ? "zero" : ""}`}>
      {/* a radio never un-checks itself: clicking the selected one clears it (onClick), picking another switches */}
      <input type={radio ? "radio" : "checkbox"} checked={on} onChange={radio ? () => {} : toggle} onClick={radio ? toggle : undefined} />
      <span className="box" /><span className="lbl">{label}</span>{count != null && <span className="n">{count.toLocaleString("en-US")}</span>}
    </label>
  );
}

/** Category, search (slug "all" + q) or brand page — products, filters and counts come from the AgainERP API.
    `initial` is the server-rendered first result for the same query; `children` go under the products. */
export default function CategoryView({ slug, query, category, brand, initial, children }: {
  slug: string; query: Query; category?: ShopCategory; brand?: Brand; initial: Listing; children?: ReactNode;
}) {
  const q = (query.q ?? "").trim();
  const start = useMemo(() => listQuery(slug, query, brand?.slug), [slug, query, brand]);

  const [inStock, setInStock] = useState(!!start.inStock);
  const [brands, setBrands] = useState<string[]>(start.brands ?? []);
  const [attrs, setAttrs] = useState<Record<string, string[]>>(start.attrs ?? {});
  const [min, setMin] = useState(num(query.min));
  const [max, setMax] = useState(num(query.max));
  const [sort, setSort] = useState<Sort>(SORTS.find((s) => API_SORT[s[0]] === start.sort)?.[0] ?? "default");
  const [per, setPer] = useState(start.perPage ?? 12);
  const [page, setPage] = useState(start.page ?? 1);
  const [panel, setPanel] = useState(false);
  const [data, setData] = useState<Listing>(initial);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const side = useRef<HTMLElement>(null);
  const first = useRef(true);

  // Sticky filters without an inner scrollbar: a panel that fits sticks under the header; a taller one
  // scrolls with the page and sticks once its bottom is in view (negative `top`), so every filter stays reachable.
  useEffect(() => {
    const el = side.current;
    if (!el) return;
    const fit = () => el.style.setProperty("--side-top", `${Math.min(140, window.innerHeight - el.offsetHeight - 16)}px`);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener("resize", fit);
    return () => { ro.disconnect(); window.removeEventListener("resize", fit); };
  }, []);

  // the slider updates min/max on every move; ask the API once it settles
  const dMin = useDeferredValue(min), dMax = useDeferredValue(max);
  const filters = useMemo<ListQuery>(() => ({
    category: start.category, brand: start.brand, search: start.search,
    brands, attrs, inStock: inStock || undefined,
    priceMin: +dMin || undefined, priceMax: +dMax || undefined,
    sort: API_SORT[sort], page, perPage: per,
  }), [start, brands, attrs, inStock, dMin, dMax, sort, page, per]);

  useEffect(() => {
    // the server already rendered the first query
    if (first.current) { first.current = false; return; }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const [res, facets] = await Promise.all([listProducts(filters, ctl), getFacets(filters, ctl)]);
        setData({ ...res, facets });
        setFailed(false);
      } catch (e) {
        if (!ctl.signal.aborted) setFailed(true);
        void e;
      } finally {
        if (!ctl.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [filters]);

  useEffect(() => { remember(...data.items); }, [data.items]);

  // keep the URL shareable and readable: /x?brand=asus&socket=am5&chipset=amd-b650&sort=price-asc&page=2
  useEffect(() => {
    const t = setTimeout(() => {
      const sp = new URLSearchParams();
      if (q) sp.set("q", q);
      if (brands.length) sp.set("brand", brands.join(","));
      for (const [param, values] of filterParams(attrs)) sp.set(param, values);
      if (inStock) sp.set("stock", "in");
      if (min) sp.set("min", min);
      if (max) sp.set("max", max);
      if (sort !== "default") sp.set("sort", sort);
      if (per !== 12) sp.set("per", String(per));
      if (page > 1) sp.set("page", String(page));
      // a list of values keeps its plain commas (wi-fi,m-2): valid in a query and easier to read than %2C
      const s = sp.toString().replace(/%2C/gi, ",");
      window.history.replaceState(null, "", s ? `?${s}` : window.location.pathname);
    }, 250);
    return () => clearTimeout(t);
  }, [q, brands, attrs, inStock, min, max, sort, per, page]);

  const facets = data.facets;
  const bounds = useMemo(() => priceBounds(facets), [facets]);
  const pagesTotal = Math.max(1, Math.ceil(data.total / per));
  const cur = Math.min(page, pagesTotal);
  const shown = data.items;

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => { set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]); setPage(1); };
  const toggleAttr = (code: string, v: string, single?: boolean) => {
    setAttrs((a) => {
      const vs = a[code] ?? [];
      // single-select (radio) keeps at most one value; multi-select (checkboxes) keeps several
      const next = vs.includes(v) ? vs.filter((x) => x !== v) : single ? [v] : [...vs, v];
      const rest = { ...a };
      delete rest[code];
      return next.length ? { ...rest, [code]: next } : rest;
    });
    setPage(1);
  };
  const clearAll = () => { setInStock(false); setBrands([]); setAttrs({}); setMin(""); setMax(""); setPage(1); };
  const goPage = (p: number) => { setPage(p); top.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  // a thumb resting on the end of the slider means "no limit" on that side
  const setPrice = ([a, b]: [number, number]) => {
    setMin(bounds && a > bounds.lo ? String(a) : "");
    setMax(bounds && b < bounds.hi ? String(b) : "");
    setPage(1);
  };
  const priceVal = bounds && ([min ? +min : bounds.lo, max ? +max : bounds.hi]
    .map((v) => Math.min(bounds.hi, Math.max(bounds.lo, v))).sort((x, y) => x - y) as [number, number]);

  const brandName = (s: string) => facets?.brands.find((b) => b.slug === s)?.name ?? s;
  const attrName = (code: string) => facets?.attributes.find((a) => a.code === code)?.name ?? code;
  // a selected value is its URL slug; its label comes from the filter's options
  const optionLabel = (code: string, v: string) =>
    facets?.attributes.find((a) => a.code === code)?.options.find((o) => valueSlug(o.value) === v)?.label ?? v;
  const chips: [string, () => void][] = [
    ...brands.map((b) => [brandName(b), () => toggle(brands, setBrands, b)] as [string, () => void]),
    ...Object.entries(attrs).flatMap(([code, vs]) => vs.map((v) => [`${attrName(code)}: ${optionLabel(code, v)}`, () => toggleAttr(code, v)] as [string, () => void])),
    ...(inStock ? [["In stock", () => { setInStock(false); setPage(1); }] as [string, () => void]] : []),
    ...(min || max ? [[min && max ? `${tk(+min)} – ${tk(+max)}` : min ? `From ${tk(+min)}` : `Up to ${tk(+max)}`, () => { setMin(""); setMax(""); setPage(1); }] as [string, () => void]] : []),
  ];

  const name = category?.name;
  const title = brand ? brand.name : q ? (name ? `${name}: “${q}”` : `Results for “${q}”`) : name ?? "All Products";
  const accent = brand ? (brand.bg === "#0b0b0b" || brand.bg === "#111" ? brand.fg : brand.bg) : "#E3121B";
  const from = data.total ? (cur - 1) * per + 1 : 0;

  return (
    <div className="wrap shop-page">
      <nav className="crumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span>/</span>
        {brand ? (
          <><Link href="/brand">Brands</Link><span>/</span><b>{brand.name}</b></>
        ) : (
          <>
            {name || q ? <Link href="/all">All Products</Link> : <b>All Products</b>}
            {(name || q) && <><span>/</span><b>{q ? "Search" : name}</b></>}
          </>
        )}
      </nav>
      <AiSearchBanner category={name} />
      <div className="shop-head">
        <div className={brand ? "brand-title" : ""}>{brand && <BrandLogo b={brand} size="lg" />}<div><span className="eyebrow">{brand ? "Official brand store" : q ? "Search" : "Category"}</span><h1>{title}</h1>{!brand && !q && <p className="shop-lead">{category?.intro || (name
            ? `Buy genuine ${name.toLowerCase()} at the best price in Bangladesh — official warranty, EMI and fast delivery.`
            : `Shop ${data.total.toLocaleString("en-US")} genuine computer products — laptops, PC parts, monitors and gaming gear — with official warranty, EMI and fast delivery across Bangladesh.`)}</p>}</div></div>
        <span className="total">{data.total.toLocaleString("en-US")} <em>products</em></span>
      </div>

      <div className="shop">
        <aside ref={side} className={`side ${panel ? "open" : ""}`}>
          <div className="side-card">
            <div className="side-top"><h6 className="side-h">Filters</h6><button className="clear" onClick={clearAll} disabled={!chips.length}>Clear all</button></div>

            {bounds && priceVal && <fieldset className="grp"><legend>Price range</legend>
              <PriceRange lo={bounds.lo} hi={bounds.hi} step={bounds.step} value={priceVal} onChange={setPrice} />
            </fieldset>}

            <fieldset className="grp"><legend>Availability</legend>
              <Check label="In stock" on={inStock} toggle={() => { setInStock((v) => !v); setPage(1); }} />
            </fieldset>

            {!brand && !!facets?.brands.length && <fieldset className="grp"><legend>Brand</legend>
              <div className="brand-scroll">
                {[...facets.brands].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).map((b) => (
                  <Check key={b.slug} label={b.name} count={b.count} on={brands.includes(b.slug)} toggle={() => toggle(brands, setBrands, b.slug)} />
                ))}
              </div>
            </fieldset>}

            {facets?.attributes.map((a) => (
              <fieldset key={a.code} className="grp"><legend>{a.name}</legend>
                <div className={a.options.length > 8 ? "brand-scroll" : undefined}>
                  {a.options.map((o) => (
                    <Check key={o.value} label={o.label} count={o.count} radio={a.display_type === "single_select"} on={!!attrs[a.code]?.includes(valueSlug(o.value))} toggle={() => toggleAttr(a.code, valueSlug(o.value), a.display_type === "single_select")} />
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <button className="btn btn-red side-done" onClick={() => setPanel(false)}>Show {data.total} products</button>
        </aside>

        <section className="shop-main" ref={top}>
          {brand ? (
            <div className="shop-banner" style={{ background: `linear-gradient(100deg,#0e0e11 40%,color-mix(in srgb,${accent} 33%,transparent))` }}>
              {/* color-mix, not `${accent}55`: a short hex like #fff would become the invalid #fff55 and drop the whole background */}
              <div>
                <span className="eyebrow" style={{ color: accent }}>Authorized {brand.name} seller</span>
                <h2>Genuine {brand.name}, official warranty.</h2>
                <p>Official warranty · 0% EMI on 29 banks · Fast delivery</p>
              </div>
              <BrandLogo b={brand} size="xl" />
            </div>
          ) : (
            <CategoryBanner cat={slug} eager />
          )}

          <div className="toolbar">
            <button className="btn btn-line filt-btn" onClick={() => setPanel(true)}>
              <svg viewBox="0 0 24 24"><path d="M3 5h18M6 12h12M10 19h4" /></svg>Filters{chips.length ? ` (${chips.length})` : ""}
            </button>
            <span className="showing">Showing <b>{from}–{from ? from + shown.length - 1 : 0}</b> of <b>{data.total.toLocaleString("en-US")}</b></span>
            <div className="tb-right">
              <label>Show<select value={per} onChange={(e) => { setPer(+e.target.value); setPage(1); }}>{PER_PAGE.map((n) => <option key={n}>{n}</option>)}</select></label>
              <label>Sort<select value={sort} onChange={(e) => { setSort(e.target.value as Sort); setPage(1); }}>{SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            </div>
          </div>

          {chips.length > 0 && (
            <div className="chips">
              {chips.map(([l, rm]) => <button key={l} onClick={rm}>{l}<span aria-hidden>✕</span></button>)}
              <button className="clear" onClick={clearAll}>Clear all</button>
            </div>
          )}

          {failed ? (
            <div className="empty">
              <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: ic.tool }} />
              <b>Couldn’t load products</b>
              <p>The catalogue didn’t answer. Check your connection and try again.</p>
            </div>
          ) : shown.length ? (
            <div className="grid" style={loading ? { opacity: 0.55, transition: "opacity .2s" } : undefined} aria-busy={loading}>
              {shown.map((p, i) => <ProductCard key={p.id} p={p} eager={i < 4} />)}
            </div>
          ) : (
            <div className="empty">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <b>No products match these filters</b>
              <p>Try removing a filter or widening the price range.</p>
              {chips.length > 0 && <button className="btn btn-red" onClick={clearAll}>Clear all filters</button>}
            </div>
          )}

          <Pagination page={cur} total={pagesTotal} onChange={goPage} />
          {children}
        </section>
      </div>
      {panel && <div className="scrim on" onClick={() => setPanel(false)} />}
    </div>
  );
}
