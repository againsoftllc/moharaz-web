"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { brandHref, type Brand } from "@/lib/brands";
import BrandLogo from "./BrandLogo";

const letterOf = (name: string) => (/[a-z]/i.test(name[0]) ? name[0].toUpperCase() : "#");
const ALPHA = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

/** `brands`: the shop's brands with real counts (AgainERP); `cats`: the category filters; `catNames`: slug → name */
export default function BrandsView({ brands, cats, catNames }: { brands: Brand[]; cats: { slug: string; name: string }[]; catNames: Record<string, string> }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return brands.filter((b) => (!t || b.name.toLowerCase().includes(t)) && (!cat || b.cats.includes(cat)));
  }, [q, cat, brands]);

  const groups = useMemo(() => {
    const m = new Map<string, typeof shown>();
    shown.forEach((b) => m.set(letterOf(b.name), [...(m.get(letterOf(b.name)) ?? []), b]));
    return [...m.entries()].sort((a, b) => ALPHA.indexOf(a[0]) - ALPHA.indexOf(b[0]));
  }, [shown]);
  const has = new Set(groups.map(([l]) => l));

  return (
    <div className="wrap shop-page">
      <nav className="crumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><b>Brands</b></nav>
      <div className="shop-head">
        <div><span className="eyebrow">Authorized</span><h1>All Brands A–Z</h1></div>
        <span className="total">{brands.length} <em>brands</em></span>
      </div>

      <div className="br-tools">
        <label className="br-search">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a brand…" aria-label="Search brands" />
          {q && <button onClick={() => setQ("")} aria-label="Clear search">✕</button>}
        </label>
        <div className="seg" role="tablist" aria-label="Filter by category">
          <button className={!cat ? "on" : ""} onClick={() => setCat("")}>All</button>
          {cats.map((c) => <button key={c.slug} className={cat === c.slug ? "on" : ""} onClick={() => setCat(c.slug)}>{c.name}</button>)}
        </div>
      </div>

      <nav className="az" aria-label="Jump to letter">
        {ALPHA.map((l) => has.has(l) ? <a key={l} href={`#br-${l}`}>{l}</a> : <span key={l}>{l}</span>)}
      </nav>

      {groups.length ? groups.map(([letter, list]) => (
        <section key={letter} id={`br-${letter}`} className="br-group">
          <h2>{letter}</h2>
          <div className="br-grid">
            {list.map((b) => (
              <Link key={b.slug} href={brandHref(b)} className="br-card">
                <BrandLogo b={b} />
                <div>
                  <b>{b.name}</b>
                  <span>{b.cats.slice(0, 2).map((s) => catNames[s] ?? s).join(" · ")}{b.cats.length > 2 ? ` +${b.cats.length - 2}` : ""}</span>
                </div>
                <em>{b.count}</em>
              </Link>
            ))}
          </div>
        </section>
      )) : (
        <div className="empty"><b>No brands found</b><p>Try a different name or category.</p><button className="btn btn-red" onClick={() => { setQ(""); setCat(""); }}>Show all brands</button></div>
      )}
    </div>
  );
}
