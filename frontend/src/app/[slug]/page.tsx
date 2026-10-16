import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import { listingLd } from "@/lib/schema";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import BrandListing, { BRAND_QUERY_KEYS, brandFor, brandMetadata } from "@/components/shop/BrandListing";
import ProductView, { productMetadata } from "@/components/product/ProductView";
import CategoryView from "@/components/shop/CategoryView";
import { isFiltered, listQuery, readQuery, type Query, type ShopCategory } from "@/lib/shop/listing";
import PriceList from "@/components/shop/PriceList";
import { findRedirect, getFacets, getProduct, listProducts, resolveSlug, type Resolved } from "@/lib/shop/api";
import { callForPrice, type Product } from "@/lib/products";

/* one top-level address space, like the live site: /all, /{category}, /{product}, /{brand}.
   Everything comes from the AgainERP API; pages are rendered on request and cached for a minute. */
export const revalidate = 60;

type Cat = Extract<Resolved, { type: "category" }>["category"];

async function what(slug: string) {
  if (slug === "all") return { type: "all" as const };
  return resolveSlug(slug);
}

export async function generateMetadata({ params, searchParams }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  // filtered and sorted views point at the plain listing; page 2+ keeps its own canonical. A filtered view
  // (?socket=am5…) is also kept out of the index — its links are still followed to the products.
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const listing = page > 1 ? `/${slug}?page=${page}` : `/${slug}`;
  const robots = isFiltered(readQuery(sp, ["q", "brand", "spec", "stock", "min", "max"])) ? { index: false, follow: true } : undefined;
  const r = await what(slug);
  if (r?.type === "product") {
    const p = await getProduct(slug);
    return p ? productMetadata(p) : {};
  }
  if (r?.type === "category") {
    const c = r.category;
    const description = c.meta_description || `Buy genuine ${c.name.toLowerCase()} at the best price in Bangladesh. Official warranty, 0% EMI on 29 banks, fast delivery.`;
    return seo({
      // the category's own meta title (the previous shop's) word for word, without the site suffix
      title: c.meta_title ? { absolute: c.meta_title } : `${c.name} Price in Bangladesh`,
      description,
      alternates: { canonical: listing },
      openGraph: { title: c.meta_title || c.name, description, url: `/${slug}`, images: [{ url: "/moharaz-logo-og.png", alt: c.name }] },
      ...(robots ? { robots } : {}),
    });
  }
  if (r?.type === "brand") {
    const b = await brandFor(r.brand.slug);
    return b ? { ...brandMetadata(b, page), ...(robots ? { robots } : {}) } : {};
  }
  if (r?.type === "all") return seo({ title: "All Products Price in Bangladesh", alternates: { canonical: listing }, ...(robots ? { robots } : {}) });
  return {};
}

type SP = Record<string, string | string[] | undefined>;
const queryString = (sp: SP) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) for (const x of [v].flat()) if (x != null) q.append(k, x);
  const s = q.toString();
  return s ? `?${s}` : "";
};
const decode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

/** The previous shop's URLs keep working (301): its index.php links, keywords whose page has a new slug
    (admin: SEO → Redirects), and stray spaces or upper case in a slug. */
async function legacy(slug: string, sp: SP) {
  const raw = decode(slug);
  if (raw.toLowerCase() === "index.php") {
    const to = await findRedirect(`/index.php${queryString(sp)}`);
    const search = typeof sp.search === "string" ? sp.search.trim() : "";
    permanentRedirect(to === "/all" && search ? `/all?q=${encodeURIComponent(search)}` : to ?? "/");
  }
  const clean = raw.trim().toLowerCase();
  if (clean !== raw) permanentRedirect(`/${encodeURIComponent(clean)}${queryString(sp)}`);
}

/** The menu links a brand inside a category as /{brand}-{category} (/hp-monitor), the previous shop's
    sub-categories. A pair the catalogue has no sub-category for lands on the category filtered by that brand. */
async function brandInCategory(slug: string) {
  const parts = slug.split("-");
  for (let i = 1; i < parts.length; i += 1) {
    const [b, c] = [parts.slice(0, i).join("-"), parts.slice(i).join("-")];
    const [rb, rc] = await Promise.all([resolveSlug(b), resolveSlug(c)]);
    if (rb?.type === "brand" && rc?.type === "category") return `/${c}?brand=${encodeURIComponent(rb.brand.name)}`;
  }
  return null;
}

export default async function SlugPage({ params, searchParams }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  await legacy(slug, sp);
  const r = await what(slug);
  if (!r) {
    const to = await findRedirect(`/${decode(slug)}`);
    if (to) permanentRedirect(`${to}${queryString(sp)}`);
    const filtered = await brandInCategory(decode(slug));
    if (filtered) redirect(filtered);
    notFound();
  }
  if (r.type === "brand") {
    const brand = await brandFor(r.brand.slug);
    if (!brand) notFound();
    return <BrandListing brand={brand} query={readQuery(sp, BRAND_QUERY_KEYS)} />;
  }

  if (r.type === "product") {
    const p = await getProduct(slug);
    if (!p) notFound();
    // related = newest from the same category
    if (p.cat) p.related = (await listProducts({ category: p.cat, perPage: 11 }).catch(() => ({ items: [] }))).items.filter((x) => x.id !== p.id).slice(0, 10);
    return <ProductView p={p} />;
  }

  const query = readQuery(sp, ["q", "brand", "spec", "stock", "min", "max", "sort", "per", "page"]);
  const cat: Cat | undefined = r.type === "category" ? r.category : undefined;
  return <Listing slug={slug} query={query} cat={cat} />;
}

async function Listing({ slug, query, cat }: { slug: string; query: Query; cat?: Cat }) {
  const lq = listQuery(slug, query);
  const [res, facets] = await Promise.all([listProducts(lq), getFacets(lq).catch(() => null)]);
  const unfiltered = !isFiltered(query);
  // the price list: the category's 10 newest products on offer (compare-at price), only on the plain listing;
  // a shop with few offers (Moharaz) lists the category's first products instead
  const priceable = (items: Product[]) => items.filter((p) => !callForPrice(p)).slice(0, 10);
  let priceItems: Product[] = [];
  if (cat && unfiltered) {
    priceItems = priceable((await listProducts({ category: slug, onSale: true, perPage: 20 }).catch(() => ({ items: [] as Product[] }))).items);
    if (!priceItems.length) priceItems = priceable(res.items);
  }

  const name = cat?.name ?? "All Products";
  const category: ShopCategory | undefined = cat && { slug: cat.slug, name: cat.name, intro: cat.meta_description };
  const ld = listingLd(`/${slug}`, name, `Buy genuine ${name.toLowerCase()} at the best price in Bangladesh.`, res.items, [[name, `/${slug}`]]);
  return (
    <>
      <JsonLd data={ld} />
      {/* remount on category/search change so filter state starts fresh */}
      <CategoryView key={`${slug}|${query.q ?? ""}|${query.brand ?? ""}`} slug={slug} query={query} category={category} initial={{ ...res, facets }}>
        {cat && <PriceList name={cat.name} items={priceItems} about={unfiltered ? cat.description : null} />}
      </CategoryView>
    </>
  );
}
