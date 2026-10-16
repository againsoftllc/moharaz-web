import { notFound, permanentRedirect } from "next/navigation";
import { findRedirect, resolveSlug } from "@/lib/shop/api";

/* The previous shop's category-path URLs — /pc-components/ssd/adata-ssd, /monitor/hp-monitor,
   /pc-components/ram/corsair-ram/some-product — name their page by the LAST segment. They are in imported
   descriptions and menus and in Google / backlinks, so they move (301) to the flat /{last} URL whenever that
   segment is a product, category, brand or a known old keyword (admin: SEO → Redirects); anything else stays a 404.
   Real nested routes (/blog/…, /bundles/…, /brand/…, /pc-builder/print …) are static folders and never land here. */

const decode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

export default async function NestedOldUrl({ params, searchParams }: PageProps<"/[slug]/[...rest]">) {
  const { slug, rest } = await params;
  const segments = [slug, ...rest].map(decode).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const last = segments.at(-1);
  if (!last) notFound();

  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) for (const x of [v].flat()) if (x != null) q.append(k, x);
  const qs = q.toString() ? `?${q}` : "";

  if (await resolveSlug(last)) permanentRedirect(`/${encodeURIComponent(last)}${qs}`);
  const to = (await findRedirect(`/${segments.join("/")}`)) ?? (await findRedirect(`/${last}`));
  if (to) permanentRedirect(`${to}${qs}`);
  // a brand inside a category (/pc-components/ssd/adata-ssd): /{last} shows that category filtered by the brand
  if (await isBrandInCategory(last)) permanentRedirect(`/${encodeURIComponent(last)}${qs}`);
  notFound();
}

async function isBrandInCategory(slug: string) {
  const parts = slug.split("-");
  for (let i = 1; i < parts.length; i += 1) {
    const [b, c] = await Promise.all([resolveSlug(parts.slice(0, i).join("-")), resolveSlug(parts.slice(i).join("-"))]);
    if (b?.type === "brand" && c?.type === "category") return true;
  }
  return false;
}
