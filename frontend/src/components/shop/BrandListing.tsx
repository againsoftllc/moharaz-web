import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import CategoryView from "@/components/shop/CategoryView";
import { brandTile, type Brand } from "@/lib/brands";
import { brandNode, listingLd } from "@/lib/schema";
import { getBrands, getFacets, listProducts, media } from "@/lib/shop/api";
import { listQuery, type Query } from "@/lib/shop/listing";

/* A brand's store page at the flat /{brand} URL, like categories and products (routed from src/app/[slug]). */

/** the brand with this slug from the AgainERP API */
export async function brandFor(slug: string): Promise<Brand | undefined> {
  const b = (await getBrands().catch(() => [])).find((x) => x.slug === slug);
  return b ? brandTile(b.name, b.slug, media(b.logo_url)) : undefined;
}

export function brandMetadata(b: Brand, page = 1): Metadata {
  const description = `Buy genuine ${b.name} products with official warranty, 0% EMI and fast delivery in Bangladesh.`;
  return seo({
    title: `${b.name} Price in Bangladesh`,
    description,
    alternates: { canonical: page > 1 ? `/${b.slug}?page=${page}` : `/${b.slug}` },
    openGraph: { title: `${b.name} Price in Bangladesh`, description, url: `/${b.slug}`, images: [{ url: b.logo ?? "/moharaz-logo-og.png", alt: b.name }] },
  });
}

/** brand pages take the listing filters except search and brand */
export const BRAND_QUERY_KEYS = ["spec", "stock", "min", "max", "sort", "per", "page"] as const;

export default async function BrandListing({ brand, query }: { brand: Brand; query: Query }) {
  const lq = listQuery("all", query, brand.slug);
  const [res, facets] = await Promise.all([listProducts(lq), getFacets(lq).catch(() => null)]);
  const b = { ...brand, count: res.total };
  const ld = listingLd(`/${b.slug}`, `${b.name} Products`, `Genuine ${b.name} products with official warranty in Bangladesh.`,
    res.items, [["Brands", "/brand"], [b.name, `/${b.slug}`]], brandNode(b));
  return (
    <>
      <JsonLd data={ld} />
      <CategoryView key={b.slug} slug="all" brand={b} query={query} initial={{ ...res, facets }} />
    </>
  );
}
