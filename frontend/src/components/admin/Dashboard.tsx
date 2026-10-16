"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { API_BASE, SOURCE, apiEnabled, readActivity, type Resource } from "@/lib/admin/api";
import { useCatalog } from "@/lib/admin/catalog";
import { bannersOf, scheduleOf, timeAgo } from "@/lib/admin/format";
import { useCollection, useSingleton } from "@/lib/admin/hooks";
import { db, priceBundle } from "@/lib/admin/resources";
import type { Activity } from "@/lib/admin/types";
import { tk } from "@/lib/data";
import { AdIcon, type AdIconName } from "./icons";
import { LOW_STOCK } from "./products/ProductsAdmin";
import { Card, PageHead } from "./ui";

/** ৳ in lakh / crore, the way prices are read in Bangladesh */
const bdt = (n: number) => (n >= 1e7 ? `৳${(n / 1e7).toFixed(1)} Cr` : n >= 1e5 ? `৳${(n / 1e5).toFixed(1)} L` : tk(n));

function Kpi({ href, icon, label, value, sub }: { href: string; icon: AdIconName; label: string; value: ReactNode; sub: ReactNode }) {
  return (
    <Link href={href} className="ad-kpi">
      <span>{label}<AdIcon n={icon} /></span>
      <b>{value}</b>
      <small>{sub}</small>
    </Link>
  );
}

const STOCK = [["In stock", "var(--green)"], ["Pre-order", "var(--amber)"], ["Out of stock", "var(--red)"]] as const;
const ENDPOINTS: [Resource, string, string][] = [
  ["products", "Products", "/products"], ["categories", "Categories", "/categories"], ["bundles", "Bundle offers", "/bundles"],
  ["bundleRules", "Bundle rules", "/settings/bundle-rules"], ["builds", "Custom PCs", "/custom-pcs"], ["posts", "Blog posts", "/posts"],
  ["faqs", "FAQ", "/faqs"], ["banners", "Homepage banners", "/banners"], ["socials", "Social links", "/settings/socials"], ["menu", "Header menu", "/settings/menu"],["uploads", "Image uploads", "/uploads"],
  ["auth", "Admin sign-in", "/auth/login"],
];

export default function Dashboard() {
  const { products, cats, catMap, byId, loading } = useCatalog();
  const bundles = useCollection(db.bundles);
  const builds = useCollection(db.builds);
  const posts = useCollection(db.posts);
  const banners = useCollection(db.banners);
  const socials = useSingleton(db.socials);
  const apiOn = apiEnabled();
  const [all, setAll] = useState(false);
  const [tip, setTip] = useState<string | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);

  // recent changes live in this browser's storage, so read them after hydration
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActivity(readActivity());
  }, []);

  const list = useMemo(() => products.items ?? [], [products.items]);
  const stats = useMemo(() => {
    const by = new Map<string, { n: number; inStock: number }>();
    list.forEach((p) => {
      const x = by.get(p.cat) ?? { n: 0, inStock: 0 };
      x.n++;
      if (p.stock === "In stock") x.inStock++;
      by.set(p.cat, x);
    });
    return {
      byCat: [...by.entries()].sort((a, b) => b[1].n - a[1].n),
      stock: STOCK.map(([s]) => list.filter((p) => p.stock === s).length),
      value: list.reduce((s, p) => s + (p.stock === "In stock" ? p.price * p.qty : 0), 0),
      units: list.reduce((s, p) => s + (p.stock === "In stock" ? p.qty : 0), 0),
      low: list.filter((p) => p.stock === "In stock" && p.qty <= LOW_STOCK).length,
      noImage: list.filter((p) => !p.image).length,
      drafts: list.filter((p) => p.status === "draft").length,
    };
  }, [list]);

  const bl = bundles.items ?? [];
  const liveBundles = bl.filter((b) => scheduleOf(b.status === "active", b.startsAt, b.endsAt) === "live");
  const brokenBundles = bl.filter((b) => { const m = priceBundle(b, byId); return m.items.length < b.items.length || m.items.some((p) => p.stock === "Out of stock"); });
  const pcs = builds.items ?? [];
  const ps = posts.items ?? [];
  const liveBanners = (banners.items ?? []).filter((b) => scheduleOf(b.active, b.startsAt, b.endsAt) === "live");
  const unsetSocials = (socials.value ?? []).filter((s) => s.enabled && !s.url).length;
  const noBanner = cats.filter((c) => !bannersOf(c).length).length;

  type Todo = { n: number; icon: AdIconName; tone: "no" | "warn"; title: string; sub: string; href: string; count?: false };
  const todo = ([
    { n: liveBanners.length || banners.loading ? 0 : 1, icon: "image", tone: "no", title: "No homepage banner is live", sub: "The hero slider is empty", href: "/admin/banners", count: false },
    { n: stats.stock[2], icon: "box", tone: "no", title: "Out of stock", sub: "Restock or mark as pre-order", href: "/admin/products?stock=Out%20of%20stock" },
    { n: stats.low, icon: "alert", tone: "warn", title: `Low stock (${LOW_STOCK} or fewer)`, sub: "Still selling — reorder soon", href: "/admin/products?show=low-stock" },
    { n: brokenBundles.length, icon: "gift", tone: "warn", title: "Bundles with unavailable items", sub: "An item is out of stock or deleted", href: "/admin/bundles" },
    { n: stats.noImage, icon: "image", tone: "warn", title: "Products without a photo", sub: "They show the category icon instead", href: "/admin/products?show=no-image" },
    { n: noBanner, icon: "tag", tone: "warn", title: "Categories without a banner", sub: "They use the default banner", href: "/admin/categories" },
    { n: unsetSocials, icon: "share", tone: "warn", title: "Social links not set", sub: "Hidden from the footer until added", href: "/admin/socials" },
    { n: stats.drafts, icon: "edit", tone: "warn", title: "Draft products", sub: "Not visible in the store yet", href: "/admin/products?show=draft" },
  ] satisfies Todo[]).filter((t) => t.n > 0 && !loading);

  const total = list.length || 1;
  const max = stats.byCat[0]?.[1].n ?? 1;
  const bars = all ? stats.byCat : stats.byCat.slice(0, 10);

  return (
    <>
      <PageHead
        title="Dashboard"
        desc="Your store at a glance — catalogue health, live offers and what needs attention."
        actions={<a href="/" target="_blank" className="btn btn-line"><AdIcon n="store" />View store</a>}
      />

      <div className="ad-quick">
        <Link href="/admin/products/new"><i><AdIcon n="plus" /></i><span>Add product<small>New item in the catalogue</small></span></Link>
        <Link href="/admin/bundles/new"><i><AdIcon n="gift" /></i><span>New bundle<small>Start from a theme</small></span></Link>
        <Link href="/admin/blog/new"><i><AdIcon n="file" /></i><span>Write a post<small>Guides &amp; news</small></span></Link>
        <Link href="/admin/banners"><i><AdIcon n="image" /></i><span>Homepage banners<small>{liveBanners.length} live</small></span></Link>
      </div>

      <div className="ad-kpis">
        <Kpi href="/admin/products" icon="box" label="Products" value={loading ? "…" : list.length.toLocaleString("en-IN")} sub={stats.drafts ? `${stats.drafts} drafts` : "All active"} />
        <Kpi href="/admin/products?stock=In%20stock" icon="database" label="Stock value" value={loading ? "…" : bdt(stats.value)} sub={`${stats.units.toLocaleString("en-IN")} units in stock`} />
        <Kpi href="/admin/categories" icon="tag" label="Categories" value={loading ? "…" : cats.length} sub={noBanner ? `${noBanner} without a banner` : "All have banners"} />
        <Kpi href="/admin/bundles" icon="gift" label="Live bundles" value={bundles.loading ? "…" : liveBundles.length} sub={`${bl.filter((b) => b.featured).length} on the homepage`} />
        <Kpi href="/admin/custom-pc" icon="pc" label="Custom PCs" value={builds.loading ? "…" : pcs.filter((b) => b.status === "active").length} sub={`${pcs.filter((b) => b.featured).length} on the homepage`} />
        <Kpi href="/admin/blog" icon="file" label="Blog posts" value={posts.loading ? "…" : ps.filter((p) => p.status === "published").length} sub={`${ps.filter((p) => p.status === "draft").length} drafts`} />
      </div>

      <div className="ad-dash">
        <div className="ad-stack">
          <Card title="Stock status" desc={`${list.length} products`}>
            <div className="ad-meter" role="img" aria-label={STOCK.map(([s], i) => `${s}: ${stats.stock[i]}`).join(", ")}>
              {STOCK.map(([s, c], i) => stats.stock[i] > 0 && <span key={s} style={{ flex: stats.stock[i], background: c }} title={`${s}: ${stats.stock[i]}`} />)}
            </div>
            <ul className="ad-legend">
              {STOCK.map(([s, c], i) => (
                <li key={s}><i style={{ background: c }} />{s} <b>{stats.stock[i]}</b> <span>({Math.round((stats.stock[i] / total) * 100)}%)</span></li>
              ))}
            </ul>
          </Card>

          <Card title="Products by category" desc="Click a bar to see that category's products." actions={stats.byCat.length > 10 && <button className="btn btn-line ad-sm" onClick={() => setAll((a) => !a)}>{all ? "Top 10" : `All ${stats.byCat.length}`}</button>}>
            <ul className="ad-bars">
              {bars.map(([slug, x]) => {
                const c = catMap.get(slug);
                return (
                  <li key={slug} onMouseEnter={() => setTip(slug)} onMouseLeave={() => setTip(null)}>
                    <Link href={`/admin/products?cat=${slug}`} onFocus={() => setTip(slug)} onBlur={() => setTip(null)} aria-label={`${c?.name ?? slug}: ${x.n} products, ${x.inStock} in stock`}>{c?.name ?? slug}</Link>
                    <span aria-hidden><i style={{ width: `${(x.n / max) * 100}%` }} /></span>
                    <b>{x.n}</b>
                    {tip === slug && <span className="ad-tip" role="tooltip">{x.n} products · {x.inStock} in stock</span>}
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        <div className="ad-stack">
          <Card title="Needs attention">
            {todo.length ? (
              <ul className="ad-todo">
                {todo.map((t) => (
                  <li key={t.title}><Link href={t.href}><i className={t.tone}><AdIcon n={t.icon} /></i><span><b>{t.title}</b><small>{t.sub}</small></span>{"count" in t ? null : <span className={`ad-b ${t.tone} plain`}>{t.n}</span>}</Link></li>
                ))}
              </ul>
            ) : <ul className="ad-todo"><li><span style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 2px" }}><i className="ok" style={{ width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center" }}><AdIcon n="check" /></i>All clear — nothing needs fixing.</span></li></ul>}
          </Card>

          <Card title="Recent changes" desc="Made from this browser.">
            {activity.length ? (
              <ul className="ad-todo">
                {activity.slice(0, 6).map((a) => (
                  <li key={a.at + a.text}>
                    {a.href
                      ? <Link href={a.href}><span><b style={{ fontWeight: 600 }}>{a.text}</b><small>{timeAgo(a.at)}</small></span></Link>
                      : <span style={{ display: "grid", padding: "12px 2px" }}><b style={{ fontWeight: 600 }}>{a.text}</b><small>{timeAgo(a.at)}</small></span>}
                  </li>
                ))}
              </ul>
            ) : <p style={{ fontSize: 13, color: "var(--dim)" }}>Nothing yet — changes you save show up here.</p>}
          </Card>

          <Card title="Data sources" desc={apiOn ? <>Backend: <code style={{ fontSize: 12 }}>{API_BASE}</code></> : `${API_BASE ? "Backend not in use here" : "No backend configured"} — changes are saved in this browser.`}>
            <div className="ad-tw" style={{ border: 0 }}>
              <table className="ad-t">
                <tbody>
                  {ENDPOINTS.map(([r, label, path]) => {
                    const api = SOURCE[r] === "api";
                    const tone = !api ? "warn" : apiOn ? "ok" : "plain";
                    const text = !api ? "Local demo" : apiOn ? "Live API" : "This browser";
                    return <tr key={r}><td style={{ paddingLeft: 0 }}><b style={{ fontWeight: 600 }}>{label}</b><small style={{ display: "block", fontSize: 11.5, color: "var(--dim)" }}>{path}</small></td><td className="num" style={{ paddingRight: 0 }}><span className={`ad-b ${tone}`}>{text}</span></td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
