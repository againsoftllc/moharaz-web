"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { sections } from "@/lib/compare";
import { tk } from "@/lib/data";
import { productHref, stockClass, type Product } from "@/lib/products";
import { getProduct, productById } from "@/lib/shop/api";
import { findProduct, remember } from "@/lib/shop/registry";
import { useCart } from "../cart/CartProvider";
import ProductArt from "../shop/ProductArt";
import { CompareIcon } from "./CompareButton";
import { MAX_COMPARE, useCompare } from "./CompareProvider";
import ProductSearch from "./ProductSearch";

/** `heading`: h1 on the compare page, h2 inside the compare sheet (the page around it has its own h1) */
function EmptyState({ heading: Heading }: { heading: "h1" | "h2" }) {
  const { set, ids } = useCompare();
  const [picks, setPicks] = useState<(Product | null)[]>([null, null]);
  const chosen = picks.filter(Boolean) as Product[];

  return (
    <div className="cmp-empty">
      <Heading>Product Comparison</Heading>
      <p>{ids.length === 1 ? "Pick one more product to start comparing." : "You have not chosen any products to compare."}</p>
      <div className="cmp-start">
        <b>Compare products side by side</b>
        <span>Find and select two products to see their differences and similarities.</span>
        {picks.map((p, i) => (
          <div key={i} className="cmp-slot">
            {p ? (
              <div className="cmp-chosen">
                <span className="thumb"><ProductArt p={p} /></span>
                <span><b>{p.name}</b><em>{tk(p.price)}</em></span>
                <button onClick={() => setPicks(picks.map((x, j) => (j === i ? null : x)))} aria-label={`Remove ${p.name}`}>✕</button>
              </div>
            ) : (
              <ProductSearch exclude={[...ids, ...chosen.map((x) => x.id)]} onPick={(x) => setPicks(picks.map((y, j) => (j === i ? x : y)))} />
            )}
          </div>
        ))}
        <button className="btn btn-line cmp-go" disabled={chosen.length + ids.length < 2} onClick={() => set([...ids, ...chosen.map((x) => x.id)])}>
          <CompareIcon />View comparison
        </button>
        {ids.length === 1 && <small>Already in your list: 1 product</small>}
      </div>
    </div>
  );
}

/** the compare page; `inSheet` renders it inside the slide-up sheet (no breadcrumb, no page frame) */
export default function CompareView({ inSheet }: { inSheet?: boolean }) {
  const { products, ids, remove, replace, add, set, clear, ready } = useCompare();
  const { add: addToCart, setDrawer } = useCart();
  const [onlyDiff, setOnlyDiff] = useState(false);
  const [closed, setClosed] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // a shared link (?ids=1,2,3) replaces the saved list once
  useEffect(() => {
    if (!ready || inSheet) return;
    const shared = new URLSearchParams(window.location.search).get("ids");
    if (shared) {
      // the shop's product ids ("oc-prod-123"); load the ones this browser hasn't seen, then compare them
      const ids = shared.split(",").map((s) => s.trim()).filter(Boolean).slice(0, MAX_COMPARE);
      void Promise.all(ids.map((id) => findProduct(id) ?? productById(id))).then((found) => {
        const ok = found.filter((p): p is Product => !!p);
        remember(...ok);
        set(ok.map((p) => p.id));
      });
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [ready, set, inSheet]);

  // each product's specification table and category (the full product, AgainERP), loaded once per product
  const [details, setDetails] = useState<Record<string, Product>>({});
  useEffect(() => {
    let live = true;
    for (const p of products) {
      const key = String(p.id);
      if (details[key] || !p.real || !p.slug) continue;
      void getProduct(p.slug).then((d) => { if (live && d) setDetails((cur) => ({ ...cur, [key]: d })); });
    }
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only newly added products need loading
  }, [products]);
  const groups = useMemo(() => sections(products, products.map((p) => details[String(p.id)])), [products, details]);
  const share = async () => {
    const url = `${window.location.origin}/compare?ids=${ids.map(encodeURIComponent).join(",")}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt("Copy this link:", url); }
  };

  const frame = inSheet ? "cmp-page in-sheet" : "wrap cmp-page";
  if (!ready) return <div className={frame} />;

  const cols = [...products, ...Array(Math.max(0, MAX_COMPARE - products.length)).fill(null)] as (Product | null)[];
  const same = (vals: (string | null)[]) => vals.slice(0, products.length).every((v) => v === vals[0]);
  const Title = inSheet ? "h2" : "h1";

  return (
    <div className={frame}>
      {!inSheet && <nav className="crumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><b>Product Comparison</b></nav>}

      {products.length < 2 ? <EmptyState heading={Title} /> : (
        <div className="cmp-card">
          <div className="cmp-head">
            <div><Title>Product Comparison</Title><p>Find and select products to see the differences and similarities between them.</p></div>
            <div className="cmp-actions">
              <label className="switch"><input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} /><span className="track" /><span>Only differences</span></label>
              <button className="btn btn-line" onClick={() => window.print()}><svg viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>Print</button>
              <button className="btn btn-red" onClick={share}><svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg>{copied ? "Link copied" : "Share"}</button>
              <button className="clear" onClick={clear}>Clear all</button>
            </div>
          </div>

          <div className="cmp-scroll">
            <table className="cmp-table">
              <thead>
                <tr>
                  <th className="lbl">You can add max {MAX_COMPARE} products</th>
                  {cols.map((p, i) => (
                    <th key={p?.id ?? `e${i}`} className="col">
                      <ProductSearch exclude={ids} placeholder={p ? "Swap product…" : "Add product…"} onPick={(x) => (p ? replace(p.id, x.id) : add(x.id))} />
                      {p ? (
                        <div className="cmp-prod">
                          <button className="cmp-x" onClick={() => remove(p.id)} aria-label={`Remove ${p.name}`}>✕</button>
                          <Link href={productHref(p)} className="cmp-img"><ProductArt p={p} /></Link>
                          <b>{p.name}</b>
                          <span className="cmp-price">{tk(p.price)}{p.old && <s>{tk(p.old)}</s>}</span>
                        </div>
                      ) : <div className="cmp-blank"><CompareIcon /><span>Add a product to compare</span></div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr><td className="lbl">Availability</td>{cols.map((p, i) => <td key={i}>{p && <span className={`stk ${stockClass(p.stock)}`}>{p.stock}</span>}</td>)}</tr>
                <tr><td className="lbl">You save</td>{cols.map((p, i) => <td key={i}>{p && (p.old ? <span className="tt-save">{tk(p.old - p.price)} <em>-{Math.round((1 - p.price / p.old) * 100)}%</em></span> : "—")}</td>)}</tr>
                <tr><td className="lbl">Summary</td>{cols.map((p, i) => <td key={i} className="sum-cell">{p && p.spec}</td>)}</tr>
                {groups.map((g) => {
                  const rows = g.rows.filter((r) => !onlyDiff || !same(r.values));
                  const isClosed = closed.includes(g.title);
                  return (
                    <Fragment key={g.title}>
                      <tr className="grp-row">
                        <td colSpan={MAX_COMPARE + 1}>
                          <button onClick={() => setClosed(isClosed ? closed.filter((x) => x !== g.title) : [...closed, g.title])} aria-expanded={!isClosed}>
                            {g.title}<span>{rows.length}</span><svg viewBox="0 0 24 24" className={isClosed ? "" : "up"}><path d="m6 9 6 6 6-6" /></svg>
                          </button>
                        </td>
                      </tr>
                      {!isClosed && rows.map((r) => (
                        <tr key={r.label} className={!same(r.values) ? "diff" : ""}>
                          <td className="lbl">{r.label}</td>
                          {cols.map((_, i) => <td key={i}>{r.values[i] ?? (i < products.length ? <span className="na">—</span> : null)}</td>)}
                        </tr>
                      ))}
                      {!isClosed && !rows.length && <tr><td className="lbl" /><td colSpan={MAX_COMPARE} className="na">No differences in this section</td></tr>}
                    </Fragment>
                  );
                })}
                <tr className="act-row">
                  <td className="lbl">Actions</td>
                  {cols.map((p, i) => (
                    <td key={i}>{p && (
                      <button className="btn btn-red" disabled={p.stock === "Out of stock"} onClick={() => { addToCart(p.id); setDrawer(true); }}>
                        {p.stock === "Out of stock" ? "Out of stock" : "Add to Cart"}
                      </button>
                    )}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
