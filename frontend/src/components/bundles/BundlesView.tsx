"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { tk } from "@/lib/data";
import { BUNDLE_TYPES, CUSTOM_MAX, CUSTOM_PLANS, type Bundle, type BundleType } from "@/lib/bundles";
import BundleCard from "./BundleCard";

const SORTS = [["save", "Biggest saving"], ["pct", "Highest % off"], ["price-asc", "Price: Low to High"], ["price-desc", "Price: High to Low"]] as const;
type Sort = (typeof SORTS)[number][0];

export default function BundlesView({ bundles: BUNDLES }: { bundles: Bundle[] }) {
  // the usual types first, then any other type the admin used
  const types = [...BUNDLE_TYPES.filter((t) => BUNDLES.some((b) => b.type === t)), ...new Set(BUNDLES.map((b) => b.type).filter((t) => !BUNDLE_TYPES.includes(t)))];
  const [type, setType] = useState<BundleType | "All">("All");
  const [size, setSize] = useState<0 | 2 | 3>(0);
  const [sort, setSort] = useState<Sort>("save");

  const shown = useMemo(() => {
    const r = BUNDLES.filter((b) => (type === "All" || b.type === type) && (!size || b.items.length === size));
    const by: Record<Sort, (a: (typeof r)[0], b: (typeof r)[0]) => number> = {
      save: (a, b) => b.save - a.save,
      pct: (a, b) => b.pct - a.pct,
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
    };
    return r.sort(by[sort]);
  }, [BUNDLES, type, size, sort]);

  const totalSave = BUNDLES.reduce((s, b) => s + b.save, 0);

  return (
    <div className="wrap shop-page">
      <nav className="crumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><b>Bundles</b></nav>
      <div className="shop-head">
        <div><span className="eyebrow">Bundle &amp; save</span><h1>Combo Deals &amp; Bundles</h1></div>
        <Link href="/bundles/create" className="btn btn-red cb-head-btn"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>Create your own</Link>
      </div>

      <div className="b-hero">
        <div>
          <span className="eyebrow">একসাথে কিনুন, বেশি সেভ করুন</span>
          <h2>Hand-picked parts that work together — for less.</h2>
          <p>Every bundle is compatibility-checked by our technicians. Up to <b>{tk(totalSave)}</b> in total savings across all bundles.</p>
        </div>
        <ul>
          <li><b>Compatible</b><span>Tested pairings</span></li>
          <li><b>Free assembly</b><span>For PC bundles</span></li>
          <li><b>0% EMI</b><span>29 banks</span></li>
        </ul>
      </div>

      <Link href="/bundles/create" className="cb-cta">
        <span className="cb-cta-art" aria-hidden>
          <i /><b>+</b><i /><b>+</b><i className="q">?</i>
        </span>
        <span className="cb-cta-t">
          <span className="eyebrow">New · Build your own</span>
          <strong>Don&apos;t see the combo you want? Create your own bundle.</strong>
          <small>Pick any 2–{CUSTOM_MAX} products, save up to {CUSTOM_PLANS[CUSTOM_PLANS.length - 1].pct}% and choose up to {Math.max(...CUSTOM_PLANS.map((p) => p.picks))} free gifts.</small>
        </span>
        <span className="btn btn-red">Start building <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
      </Link>

      <div className="toolbar b-tools">
        <div className="seg" role="tablist" aria-label="Bundle type">
          {["All", ...types].map((t) => (
            <button key={t} role="tab" aria-selected={type === t} className={type === t ? "on" : ""} onClick={() => setType(t)}>
              {t}<span>{t === "All" ? BUNDLES.length : BUNDLES.filter((b) => b.type === t).length}</span>
            </button>
          ))}
        </div>
        <div className="tb-right">
          <label>Items<select value={size} onChange={(e) => setSize(+e.target.value as 0 | 2 | 3)}><option value={0}>Any</option><option value={2}>2 products</option><option value={3}>3 products</option></select></label>
          <label>Sort<select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>{SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        </div>
      </div>

      {shown.length ? (
        <div className="combos">{shown.map((b) => <BundleCard key={b.slug} b={b} />)}</div>
      ) : (
        <div className="empty"><b>No bundles match</b><p>Try another type or item count.</p><button className="btn btn-red" onClick={() => { setType("All"); setSize(0); }}>Show all bundles</button></div>
      )}
    </div>
  );
}
