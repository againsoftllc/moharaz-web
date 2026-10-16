import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import { bundleLd } from "@/lib/schema";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import AddBundle from "@/components/bundles/AddBundle";
import BundleCard from "@/components/bundles/BundleCard";
import CompareButton from "@/components/compare/CompareButton";
import ProductArt from "@/components/shop/ProductArt";
import { getBundle, getBundles } from "@/lib/shop/api";
import { tk } from "@/lib/data";
import { catBySlug, productHref, stockClass } from "@/lib/products";

export async function generateMetadata({ params }: PageProps<"/bundles/[slug]">): Promise<Metadata> {
  const b = await getBundle((await params).slug);
  if (!b) return {};
  return seo({ title: `${b.name} — Save ${tk(b.save)}`, alternates: { canonical: `/bundles/${b.slug}` }, description: `${b.tagline} Includes ${b.items.map((p) => p.name).join(", ")}.` });
}

export default async function BundlePage({ params }: PageProps<"/bundles/[slug]">) {
  const b = await getBundle((await params).slug);
  if (!b) notFound();
  const more = (await getBundles()).filter((x) => x.slug !== b.slug).sort((x, y) => +(y.type === b.type) - +(x.type === b.type)).slice(0, 3);

  return (
    <div className="wrap shop-page">
      <JsonLd data={bundleLd(b)} />
      <nav className="crumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span>/</span><Link href="/bundles">Bundles</Link><span>/</span><b>{b.name}</b>
      </nav>

      <div className="bd">
        <div className="bd-gallery">
          <span className="bd-off">-{b.pct}%</span>
          <div className={`bd-stack n${b.items.length}`}>
            {b.items.map((p, i) => (
              <Fragment key={p.id}>
                {i > 0 && <span className="plus">+</span>}
                <Link href={productHref(p)} className="bd-img" title={p.name}><ProductArt p={p} /><span>{p.catName ?? catBySlug(p.cat)?.name}</span></Link>
              </Fragment>
            ))}
          </div>
        </div>

        <div className="bd-info">
          <span className="eyebrow">{b.type} bundle · {b.items.length} items</span>
          <h1>{b.name}</h1>
          <p className="bd-tag">{b.tagline}</p>

          <div className="bd-price">
            <div>
              <b>{tk(b.price)}</b>
              <span><s>{tk(b.total)}</s><em>Save {tk(b.save)}</em></span>
            </div>
            <p>0% EMI from <b>{tk(Math.round(b.price / 12))}/mo</b> · All prices include VAT</p>
          </div>

          <span className={`stk ${stockClass(b.stock)}`}>{b.stock === "In stock" ? "All items in stock" : b.stock}</span>
          <AddBundle bundle={b} disabled={b.stock === "Out of stock"} />

          <ul className="bd-perks">
            <li><svg viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5z" /><path d="m9 12 2 2 4-4" /></svg>Compatibility checked</li>
            <li><svg viewBox="0 0 24 24"><rect x="1" y="6" width="14" height="11" /><path d="M15 10h4l3 3v4h-7" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></svg>24h Dhaka delivery</li>
            <li><svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" /></svg>Official warranty</li>
          </ul>
        </div>
      </div>

      <div className="bd-grid">
        <section>
          <h2 className="bd-h">What&apos;s in this bundle</h2>
          <ul className="bd-items">
            {b.items.map((p, i) => (
              <li key={p.id}>
                <span className="bd-n">{i + 1}</span>
                <Link href={productHref(p)} className="thumb"><ProductArt p={p} /></Link>
                <div>
                  <span className="cat-tag">{p.catName ?? catBySlug(p.cat)?.name} · {p.brand}</span>
                  <b>{p.name}</b>
                  <span className="each">{p.spec}</span>
                  <span className="bd-meta"><span className={`stk ${stockClass(p.stock)}`}>{p.stock}</span><CompareButton id={p.id} p={p} variant="text" /></span>
                </div>
                <strong>{(b.quantities?.[i] ?? 1) > 1 && <small>{b.quantities![i]} × </small>}{tk(p.price * (b.quantities?.[i] ?? 1))}</strong>
              </li>
            ))}
          </ul>
        </section>

        <aside className="side-card sum">
          <h6 className="side-h">Price breakdown</h6>
          {b.items.map((p, i) => <div key={p.id}><span>{p.name.split(" ").slice(0, 4).join(" ")}…</span><span>{tk(p.price * (b.quantities?.[i] ?? 1))}</span></div>)}
          <div className="sub"><span>Bought separately</span><span>{tk(b.total)}</span></div>
          <div className="disc"><span>Bundle discount ({b.pct}%)</span><span>−{tk(b.save)}</span></div>
          <div className="tot"><span>You pay</span><b>{tk(b.price)}</b></div>
        </aside>
      </div>

      <section className="sec" style={{ paddingTop: "var(--s8)" }}>
        <div className="head"><div><span className="eyebrow">Keep saving</span><h2>More bundles</h2></div><Link href="/bundles" className="more-link">All bundles →</Link></div>
        <div className="combos">{more.map((x) => <BundleCard key={x.slug} b={x} />)}</div>
      </section>
    </div>
  );
}
