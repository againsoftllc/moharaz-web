import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import BundleCreator from "@/components/bundles/BundleCreator";
import { CUSTOM_MIN, parseCustomIds, parseGiftIds, planFor } from "@/lib/bundles";
import { productById } from "@/lib/shop/api";
import { headerMenu } from "@/lib/shop/menu";

export const metadata: Metadata = seo({
  alternates: { canonical: "/bundles/create" },
  title: "Create Your Own Bundle",
  description: "Build a 2, 3 or 4 product bundle, save up to 8% and choose free gifts. Add it to cart or share it with anyone.",
});

export default async function CreateBundlePage({ searchParams }: PageProps<"/bundles/create">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const asked = Number(one(sp.size));
  // a shared link's products, from the catalogue (ones gone or out of stock are left out)
  const found = await Promise.all(parseCustomIds(one(sp.items)).map(productById));
  const products = found.filter((p) => p !== null && p.stock !== "Out of stock") as NonNullable<(typeof found)[number]>[];
  const ids = products.map((p) => String(p.id));
  // the category tabs: the same top categories as the site's menu
  const categories = ((await headerMenu().catch(() => null)) ?? [])
    .map((m) => ({ slug: m.href.replace(/^\//, ""), name: m.label }))
    .filter((c) => /^[\w-]+$/.test(c.slug));
  // a shared bundle opens on its own size; otherwise the requested tab, or the smallest
  const size = planFor(asked) ? Math.max(asked, ids.length) : Math.max(ids.length, CUSTOM_MIN);
  return <BundleCreator key={`${size}:${ids.join(",")}`} initialProducts={products} categories={categories} initialSize={size} initialGifts={parseGiftIds(one(sp.gifts))} initialName={(one(sp.name) ?? "").slice(0, 40)} shared={!!one(sp.items)} />;
}
