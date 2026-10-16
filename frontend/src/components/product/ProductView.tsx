import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { Stars } from "@/components/product/InfoTabs";
import BuyBox from "@/components/product/BuyBox";
import Gallery from "@/components/product/Gallery";
import InfoTabs from "@/components/product/InfoTabs";
import ProductSeoText from "@/components/product/ProductSeoText";
import CategoryBanner from "@/components/shop/CategoryBanner";
import { brandBySlug, brandSlug, brandTile, type Brand } from "@/lib/brands";
import { specRows } from "@/lib/compare";
import { tk } from "@/lib/data";
import TrackProductView from "./TrackProductView";
import { offerOf, overview, questions, rating, reviews, sku, storeAnswers, variantsOf, warranty } from "@/lib/productInfo";
import { productLd } from "@/lib/schema";
import { getBrands, getBundles, getRecommendations, listProducts, media } from "@/lib/shop/api";
import { callForPrice, catOf, productHref, stockClass, type Product } from "@/lib/products";

/* product page body; routed from src/app/[slug] */
export function productMetadata(p: Product): Metadata {
  const price = callForPrice(p) ? "Call for price" : `at ${tk(p.price)}`;
  // a real product's own SEO title / description (the previous shop's, imported) win, word for word —
  // changing 13k titles at launch would shake the rankings
  const title = p.seoTitle ? { absolute: p.seoTitle } : `${p.name} Price in Bangladesh`;
  const description = p.seoDescription || (p.real && p.summary ? p.summary : `Buy ${p.name} ${price} in Bangladesh. ${p.spec}. ${warranty(p)}, 0% EMI and fast delivery.`);
  const image = p.images?.[0] ?? p.image;
  return seo({
    title,
    description,
    alternates: { canonical: productHref(p) },
    // a page's openGraph replaces the site default, so the logo stands in when there is no photo yet
    openGraph: { title: p.seoTitle || p.name, description, url: productHref(p), images: [{ url: image ?? "/moharaz-logo-og.png", alt: p.name }] },
    twitter: { card: image ? "summary_large_image" : "summary" },
  });
}

/** a real product's brand tile and product count (AgainERP API), or the demo catalogue's brand */
async function brandOf(p: Product): Promise<Brand | undefined> {
  if (!p.real) return brandBySlug.get(brandSlug(p.brand));
  const api = (await getBrands().catch(() => [])).find((b) => b.name.toLowerCase() === p.brand.toLowerCase());
  if (!api) return p.brand ? brandTile(p.brand) : undefined;
  const count = (await listProducts({ brand: api.slug, perPage: 1 }).catch(() => ({ total: 0 }))).total;
  return brandTile(api.name, api.slug, media(api.logo_url), count);
}

export default async function ProductView({ p }: { p: Product }) {
  const cat = catOf(p);
  const { avg, count } = rating(p);
  const brand = await brandOf(p);
  // "Customers also bought" / category bestsellers, from real sales (AgainERP)
  const recs = p.real ? await getRecommendations(String(p.id)) : null;
  const bundle = (await getBundles()).find((b) => b.items.some((x) => x.id === p.id));
  const specs: [string, string][] = p.real
    ? (p.specGroups ?? []).flatMap((g) => g.rows)
    : [["Brand", p.brand], ["Model", p.name.replace(p.brand + " ", "")], ...specRows(p), ...(p.options?.Color ? [["Color", p.options.Color] as [string, string]] : []), ["Condition", p.condition], ["Warranty", warranty(p)]];
  const qa = questions(p);
  const faq = p.real ? storeAnswers(p) : [];
  const offer = offerOf(p);
  // real products: the category trail from the store (root → primary category); demo: Hardware → category
  const crumbs: [string, string][] = p.real ? (p.catPath ?? (p.cat ? [[cat.name, p.cat]] : [])) : [["Hardware", "all"], [cat.name, p.cat]];

  return (
    <>
      <JsonLd data={productLd(p)} />
      <TrackProductView id={sku(p)} name={p.name} price={p.price} brand={p.brand} cat={p.cat} />
      <div className="wrap pd-page">
        <nav className="crumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          {crumbs.map(([name, slug]) => <span key={slug} style={{ display: "contents" }}><span>/</span><Link href={`/${slug}`}>{name}</Link></span>)}
        </nav>
        {/* no lead line under the title: the imported short description ("Buy … with the best price …") stays in the
            meta description only */}
        <h1 className="pd-title">{p.name}</h1>

        <div className="pd-top">
          <div className="pd-left">
            <dl className="pd-strip">
              <div><dt>Product ID</dt><dd>{sku(p)}</dd></div>
              <div><dt>Customer rating</dt><dd><a href="#pd-reviews" className="pd-qlink pd-rlink">{count ? <><Stars n={avg} /> {avg.toFixed(1)} <em>({count})</em></> : <>No reviews yet</>}</a></dd></div>
              <div><dt>Availability</dt><dd><span className={`stk ${stockClass(p.stock)}`}>{p.stock}</span></dd></div>
              <div><dt>Questions</dt><dd><a href="#pd-questions" className="pd-qlink">{qa.length} answered</a></dd></div>
            </dl>
            <Gallery p={p} offer={offer} />
            <CategoryBanner cat={p.cat} href={p.cat ? `/${p.cat}` : undefined} />
          </div>
          <BuyBox p={p} offer={offer} variants={variantsOf(p)} brand={brand} bundle={bundle} brandCount={brand?.count ?? 0} />
        </div>
      </div>

      <InfoTabs
        slug={p.real ? p.slug : undefined}
        name={p.name}
        overview={overview(p)}
        overviewHtml={p.overviewHtml}
        seoText={<ProductSeoText p={p} brand={brand} />}
        specs={specs}
        specGroups={p.specGroups}
        questions={qa}
        faq={faq}
        reviews={reviews(p)}
        avg={avg}
        count={count}
        also={recs?.alsoBought}
        best={recs?.bestsellers}
        bestTitle={recs?.categoryName ? `${recs.categoryName} Bestsellers` : undefined}
      />
    </>
  );
}
