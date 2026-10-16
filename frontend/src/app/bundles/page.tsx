import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import { abs, breadcrumbLd, SITE_ID } from "@/lib/schema";
import BundlesView from "@/components/bundles/BundlesView";
import { getBundles } from "@/lib/shop/api";

export const metadata: Metadata = seo({
  alternates: { canonical: "/bundles" },
  title: "Combo Deals & PC Bundles",
  description: "Save more with compatibility-checked CPU, motherboard, RAM and peripheral bundles. Official warranty and 0% EMI.",
});

const bundlesLd = (BUNDLES: Awaited<ReturnType<typeof getBundles>>) => [
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    url: abs("/bundles"),
    name: "Combo Deals & PC Bundles",
    isPartOf: { "@id": SITE_ID },
    mainEntity: { "@type": "ItemList", numberOfItems: BUNDLES.length, itemListElement: BUNDLES.map((b, i) => ({ "@type": "ListItem", position: i + 1, name: b.name, url: abs(`/bundles/${b.slug}`) })) },
  },
  breadcrumbLd([["Bundles", "/bundles"]]),
];

export default async function BundlesPage() {
  const bundles = await getBundles();
  return (
    <>
      <JsonLd data={bundlesLd(bundles)} />
      <BundlesView bundles={bundles} />
    </>
  );
}
