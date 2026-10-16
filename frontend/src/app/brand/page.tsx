import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import { abs, breadcrumbLd, SITE_ID } from "@/lib/schema";
import BrandsView from "@/components/brands/BrandsView";
import { brandHref, brandTile, type Brand } from "@/lib/brands";
import { getBrandDirectory, media } from "@/lib/shop/api";
import { headerMenu, TOP_MENU } from "@/lib/shop/menu";

export const revalidate = 300;

export const metadata: Metadata = seo({
  alternates: { canonical: "/brand" },
  title: "All Brands A–Z",
  description: "Shop genuine products from AMD, Intel, ASUS, MSI, GIGABYTE, Corsair, Logitech and 300+ more authorized brands in Bangladesh.",
});

/* Every brand with products in the shop (AgainERP), its real product count and the top-level categories it
   sells in. The category filters are the header menu's top items, in its order and with its labels — so
   promo trees ("Ramadan Festival Deal", "Uncategorized") never show up as filters. */
export default async function BrandsPage() {
  const [dir, menu] = await Promise.all([getBrandDirectory(), headerMenu().catch(() => null)]);
  const tops: [string, string][] = menu?.length
    ? menu.map((m) => [m.href.replace(/^\/+|\/+$/g, ""), m.label])
    : TOP_MENU.map((s) => [s, ""]);
  const order = new Map(tops.map(([s], i) => [s, i]));
  const label = new Map(tops.filter(([, l]) => l));

  const brands: Brand[] = (dir?.data ?? []).map((b) => {
    const cats = b.categories.filter((c) => order.has(c.slug));
    return { ...brandTile(b.name, b.slug, media(b.logo_url), b.product_count), cats: (cats.length ? cats : b.categories).map((c) => c.slug) };
  });
  const names = new Map((dir?.categories ?? []).map((c) => [c.slug, label.get(c.slug) ?? c.name] as [string, string]));
  const cats = (dir?.categories ?? [])
    .filter((c) => order.has(c.slug))
    .sort((a, b) => order.get(a.slug)! - order.get(b.slug)!)
    .map((c) => ({ slug: c.slug, name: names.get(c.slug)! }));

  const brandsLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      url: abs("/brand"),
      name: "All Brands A–Z",
      isPartOf: { "@id": SITE_ID },
      mainEntity: { "@type": "ItemList", numberOfItems: brands.length, itemListElement: brands.map((b, i) => ({ "@type": "ListItem", position: i + 1, name: b.name, url: abs(brandHref(b)) })) },
    },
    breadcrumbLd([["Brands", "/brand"]]),
  ];

  return (
    <>
      <JsonLd data={brandsLd} />
      <BrandsView brands={brands} cats={cats} catNames={Object.fromEntries(names)} />
    </>
  );
}
