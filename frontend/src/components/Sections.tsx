import Link from "next/link";
import { tk, type IconKey } from "@/lib/data";
import { brandHref, brandTile } from "@/lib/brands";
import { CATEGORIES } from "@/lib/products";
import { blogPosts, getBrandDirectory, getBundles, getReadyBuilds, listProducts, media, newestProducts } from "@/lib/shop/api";
import ReadyBuildCart from "./builds/ReadyBuildCart";
import { PostCard } from "./blog/BlogList";
import BundleCard from "./bundles/BundleCard";
import { Arrow, Icon } from "./Icon";
import RailNav from "./RailNav";
import ProductCard from "./shop/ProductCard";

/* home tile → the store's category where the slugs differ */
const STORE_SLUG: Record<string, string> = { "keyboard-mouse": "keyboard" };

/** the 12 main category tiles, with live product counts from the catalogue API */
export async function Categories() {
  const tiles = await Promise.all(CATEGORIES.slice(0, 12).map(async (c) => {
    const slug = STORE_SLUG[c.slug] ?? c.slug;
    const total = await listProducts({ category: slug, perPage: 1 }).then((r) => r.total, () => null);
    return { ...c, slug, total };
  }));
  return (
    <section className="wrap sec">
      <div className="head"><div><span className="eyebrow">Browse</span><h2>Shop by Category</h2></div><Link href="/all" className="more-link">All categories <Arrow /></Link></div>
      <div className="cats" id="cats">
        {tiles.map((c) => (
          <Link key={c.slug} href={`/${c.slug}`} className="cat"><div className="ic"><Icon k={c.icon} /></div><b>{c.name}</b>{c.total != null && <span>{c.total.toLocaleString("en-US")} products</span>}</Link>
        ))}
      </div>
    </section>
  );
}

/** the newest products from the catalogue API */
export async function FeaturedProducts() {
  const items = await newestProducts(12).catch(() => []);
  if (!items.length) return null;
  return (
    <section className="wrap sec">
      <div className="head"><div><span className="eyebrow">Just in</span><h2>New Arrivals</h2></div><Link href="/all" className="more-link">View all products <Arrow /></Link></div>
      <div className="grid">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
    </section>
  );
}

export async function Combos() {
  const bundles = (await getBundles()).slice(0, 3);
  if (!bundles.length) return null;
  return (
    <section className="wrap sec">
      <div className="head"><div><span className="eyebrow">Bundle &amp; save</span><h2>Combo Deals</h2><p>একসাথে কিনুন, বেশি সেভ করুন</p></div><Link href="/bundles" className="more-link">All bundles <Arrow /></Link></div>
      <div className="combos" id="combos">
        {bundles.map((b) => <BundleCard key={b.slug} b={b} />)}
      </div>
    </section>
  );
}

const Tower = ({ a, b, i }: { a: string; b: string; i: number }) => (
  <svg viewBox="0 0 120 170">
    <defs><linearGradient id={`t${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} stopOpacity=".8" /><stop offset="1" stopColor={b} stopOpacity=".8" /></linearGradient></defs>
    <rect x="10" y="5" width="100" height="160" rx="8" fill="#0e0e11" stroke="#3f3f46" strokeWidth="2" />
    <rect x="36" y="18" width="64" height="134" rx="4" fill={`url(#t${i})`} />
    <g fill="#52525b">{[...Array(10)].map((_, k) => <rect key={k} x="18" y={20 + k * 13} width="10" height="5" rx="1" />)}</g>
    {[50, 85, 120].map((y) => <circle key={y} cx="68" cy={y} r="14" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="2" />)}
  </svg>
);

const SPEC_ICONS: IconKey[] = ["cpu", "gpu", "ram", "ssd"];
/** a ready build's part (AgainERP slot) → its icon */
const SLOT_ICON: Record<string, IconKey> = {
  cpu: "cpu", "graphics-card": "gpu", memory: "ram", ssd: "ssd", hdd: "hdd", storage: "ssd", motherboard: "mb",
  "power-supply": "psu", "cpu-cooler": "cooler", casing: "case",
};

/* tower art for a build without its own photo */
const TOWER_COLORS: [string, string][] = [["#E3121B", "#7C3AED"], ["#1D4ED8", "#38BDF8"], ["#E3121B", "#FFB020"], ["#22C55E", "#38BDF8"], ["#A855F7", "#E3121B"], ["#FFB020", "#E3121B"]];

/** the published Ready Builds from AgainERP (admin: Website → PC Builder → Ready Builds); hidden when there are none */
export async function Builds() {
  const builds = await getReadyBuilds();
  if (!builds.length) return null;
  return (
    <section className="wrap sec" id="custom-pc">
      <div className="head"><div><span className="eyebrow">Ready to customize</span><h2>Explore The Best Prebuilt &amp; Custom Gaming PC</h2></div><RailNav id="builds" /></div>
      <div className="rail builds" id="builds">
        {builds.map((b, i) => {
          const price = Math.round(b.totals.final);
          const old = Math.round(b.totals.regular);
          const badge = b.tags[0] ?? b.category ?? "";
          const [c1, c2] = TOWER_COLORS[i % TOWER_COLORS.length];
          return (
            <article key={b.id} className="pc">
              <div className="img">
                {badge && <span className="badge">{badge}</span>}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {b.images[0] ? <img src={b.images[0]} alt={b.name} loading="lazy" /> : <Tower a={c1} b={c2} i={i} />}
              </div>
              <h3>{b.name}</h3>
              <ul className="spec">
                {(b.parts ?? b.highlights.map((name) => ({ slot: "", name }))).slice(0, 4).map((x, j) => (
                  <li key={`${j}-${x.name}`}><Icon k={SLOT_ICON[x.slot] ?? SPEC_ICONS[j]} />{x.name}</li>
                ))}
              </ul>
              <div className="row">
                <div className="price"><b>{tk(price)}</b>{old > price && <s>{tk(old)}</s>}</div>
                {old > price && <span className="save">Save {tk(old - price)}</span>}
              </div>
              <div className="emi">0% EMI from <b>{tk(Math.round(price / 12))}/mo</b></div>
              <div className="btns"><Link href={`/pc-builder?ready=${encodeURIComponent(b.slug)}`} className="btn btn-red">Customize</Link><ReadyBuildCart slug={b.slug} name={b.name} /></div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** brands with a logo and products in the shop, most products first, with their real counts */
export async function Brands() {
  const dir = await getBrandDirectory();
  const all = (dir?.data ?? []).filter((b) => b.product_count > 0);
  const withLogo = all.map((b) => brandTile(b.name, b.slug, media(b.logo_url), b.product_count)).filter((b) => b.logo);
  const LOGO_BRANDS = withLogo.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 40);
  if (!LOGO_BRANDS.length) return null;
  return (
    <section className="wrap sec">
      <div className="head"><div><span className="eyebrow">Authorized</span><h2>Brands We Supply</h2></div><Link href="/brand" className="more-link">All {all.length} brands A–Z <Arrow /></Link></div>
      {/* two rows drifting in opposite directions; each list is doubled so the loop has no seam */}
      <div className="bm" aria-label="Brands">
        {[LOGO_BRANDS.filter((_, i) => i % 2 === 0), LOGO_BRANDS.filter((_, i) => i % 2 === 1)].map((row, r) => (
          <div key={r} className={`bm-row ${r ? "rev" : ""}`}>
            {[0, 1].map((dup) => (
              <ul key={dup} className="bm-track" aria-hidden={dup === 1}>
                {row.map((b) => (
                  <li key={b.slug}>
                    <Link href={brandHref(b)} className="bm-item" tabIndex={dup ? -1 : undefined}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <span className="bm-logo"><img src={b.logo} alt={`${b.name} logo`} loading="lazy" /></span>
                      <span className="bm-meta"><b>{b.name}</b><em>{b.count} products</em></span>
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export async function LatestPosts() {
  const posts = (await blogPosts().catch(() => [])).slice(0, 3);
  if (!posts.length) return null;
  return (
    <section className="wrap sec">
      <div className="head"><div><span className="eyebrow">From our blog</span><h2>Guides &amp; Buying Advice</h2></div><Link href="/blog" className="more-link">All articles <Arrow /></Link></div>
      <div className="post-grid home-posts">{posts.map((p) => <PostCard key={p.slug} post={p} />)}</div>
    </section>
  );
}
