import { blogCategories, blogPosts, getBrands, getBundles, getCategories, listProducts, sitemapProductImages, type ApiCategory } from "./shop/api";
import { SITE_URL } from "./site";

/* XML sitemaps: /sitemap.xml is an index pointing at one file per kind under /sitemaps/.
   Products, categories and brands are the real catalogue (AgainERP API), at their flat /{slug} URLs.
   Every <loc> uses the address the sitemap was requested on — http://localhost:3000 locally, the shop's own
   domain once live — so a sitemap never points at another site. */

/** the live shop (lib/site.ts) — only a fallback when there is no request (e.g. a build-time render) */
export const SITE = SITE_URL;
const STYLE = "/sitemaps/sitemap.xsl";

/** the site's own origin, from the request (proxies: x-forwarded-host / -proto) */
export function siteBase(req?: Request | { headers: Headers }): string {
  const h = req?.headers;
  const host = h?.get("x-forwarded-host") ?? h?.get("host");
  if (!host) return SITE;
  const proto = h?.get("x-forwarded-proto")?.split(",")[0] ?? (/^(localhost|127\.|\[::1\])/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

/** `images`: the page's photos — a product's whole gallery (image sitemap, as the previous shop's had — Google Images) */
type Entry = { path: string; lastmod?: string; freq?: "daily" | "weekly" | "monthly" | "yearly"; priority?: number; images?: string[] };

/* Products carry their own date (updated_at); a page with no real date gets no lastmod — one that is always "now"
   teaches search engines to ignore it. */
const day = (d: string) => new Date(d).toISOString();

/* every product page that answers — listed ones and unlisted ones such as discontinued products, whose
   old URLs stay indexed — read in parallel pages and kept for an hour (13k products = 67 API pages) */
const HOUR = 3_600_000;
type Page = { slug: string; image?: string; lastmod?: string };
let productCache: { at: number; slugs: Promise<Page[]> } | null = null;
function productSlugs() {
  if (!productCache || Date.now() - productCache.at > HOUR) {
    const slugs = (async () => {
      const per = 200;
      const pick = (items: { slug: string; image?: string; updatedAt?: string }[]) =>
        // AgainERP's times are UTC without a zone; read them as UTC, not the server's local time
        items.map((x) => ({ slug: x.slug, image: x.image, lastmod: x.updatedAt ? day(/[zZ]|[+-]\d\d:?\d\d$/.test(x.updatedAt) ? x.updatedAt : `${x.updatedAt}Z`) : undefined }));
      const first = await listProducts({ perPage: per, includeHidden: true });
      const pages = Math.ceil(first.total / per);
      const rest: Page[][] = [];
      for (let p = 2; p <= pages; p += 6) {
        const batch = await Promise.all(
          Array.from({ length: Math.min(6, pages - p + 1) }, (_, i) => listProducts({ perPage: per, page: p + i, includeHidden: true }).then((r) => pick(r.items))),
        );
        rest.push(...batch);
      }
      const seen = new Set<string>();
      return [...pick(first.items), ...rest.flat()].filter((x) => !seen.has(x.slug) && !!seen.add(x.slug));
    })();
    slugs.catch(() => { productCache = null; });
    productCache = { at: Date.now(), slugs };
  }
  return productCache.slugs;
}

/* every product's photos, kept for an hour like the product list */
let imageCache: { at: number; images: Promise<Record<string, string[]> | null> } | null = null;
function productImages() {
  if (!imageCache || Date.now() - imageCache.at > HOUR) imageCache = { at: Date.now(), images: sitemapProductImages() };
  return imageCache.images;
}

const flatten = (nodes: ApiCategory[]): ApiCategory[] => nodes.flatMap((c) => [c, ...flatten(c.children ?? [])]);

export const SITEMAPS: Record<string, () => Promise<Entry[]>> = {
  product: async () => [
    ...await (async () => {
      // each product's whole gallery; its main photo alone when the gallery list can't be had
      const [pages, gallery] = await Promise.all([productSlugs(), productImages()]);
      return pages.map(({ slug, image, lastmod }) => ({
        path: `/${slug}`, lastmod, freq: "daily" as const, priority: 0.8,
        images: gallery?.[slug]?.length ? gallery[slug] : image ? [image] : undefined,
      }));
    })(),
    ...(await getBundles()).map((b) => ({ path: `/bundles/${b.slug}`, freq: "weekly" as const, priority: 0.7 })),
  ],
  category: async () => [
    { path: "/all", freq: "daily", priority: 0.8 },
    ...flatten(await getCategories()).map((c) => ({ path: `/${c.slug}`, freq: "daily" as const, priority: c.parent_id ? 0.8 : 0.9 })),
  ],
  manufacturer: async () => [
    { path: "/brand", freq: "weekly", priority: 0.6 },
    ...(await getBrands()).map((b) => ({ path: `/${b.slug}`, freq: "weekly" as const, priority: 0.6 })),
  ],
  information: async () =>
    [
      ["/", 1, "daily"], ["/about-us", 0.5], ["/contact-us", 0.5],
      ["/pc-builder", 0.7, "weekly"], ["/bundles", 0.7, "weekly"], ["/warranty", 0.3], ["/shipping", 0.3],
      ["/refund", 0.3], ["/privacy-policy", 0.2], ["/terms-conditions", 0.2],
    ].map(([path, priority, freq]) => ({ path: path as string, priority: priority as number, freq: (freq ?? "monthly") as Entry["freq"] })),
  blog: async () => {
    const [POSTS, cats] = await Promise.all([blogPosts().catch(() => []), blogCategories().catch(() => [])]);
    const latest = POSTS.reduce((m, p) => ((p.updated ?? p.date) > m ? (p.updated ?? p.date) : m), "");
    return [
      { path: "/blog", lastmod: latest && day(latest), freq: "weekly", priority: 0.6 },
      ...cats.map((c) => ({ path: `/blog/${c.slug}`, freq: "weekly" as const, priority: 0.5 })),
      ...POSTS.map((p) => ({ path: `/blog/${p.slug}`, lastmod: day(p.updated ?? p.date), freq: "monthly" as const, priority: 0.6 })),
    ];
  },
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const head = `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="${STYLE}"?>\n`;

function xml(body: string) {
  return new Response(head + body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" } });
}

export async function sitemapIndex(req: Request) {
  const base = siteBase(req);
  const items = await Promise.all(Object.entries(SITEMAPS).map(async ([name, list]) => {
    // the newest real date among the sitemap's pages; none → no lastmod
    const dates = (await list().catch(() => [] as Entry[])).map((e) => e.lastmod).filter((d): d is string => !!d);
    const lastmod = dates.reduce((m, d) => (d > m ? d : m), "");
    return `  <sitemap>\n    <loc>${esc(`${base}/sitemaps/${name}-sitemap.xml`)}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ""}  </sitemap>`;
  }));
  return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join("\n")}\n</sitemapindex>\n`);
}

export async function urlSet(req: Request, name: keyof typeof SITEMAPS) {
  const base = siteBase(req);
  let entries: Entry[];
  try {
    entries = await SITEMAPS[name]();
  } catch {
    return new Response("Catalogue unavailable", { status: 503 });
  }
  const abs = (u: string) => (/^https?:\/\//.test(u) ? u : base + u);
  const urls = entries.map((e) =>
    `  <url>\n    <loc>${esc(e.path === "/" ? base : base + e.path)}</loc>\n` +
    (e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>\n` : "") +
    (e.freq ? `    <changefreq>${e.freq}</changefreq>\n` : "") +
    (e.priority != null ? `    <priority>${e.priority.toFixed(1)}</priority>\n` : "") +
    (e.images ?? []).map((img) => `    <image:image>\n      <image:loc>${esc(abs(img))}</image:loc>\n    </image:image>\n`).join("") +
    "  </url>");
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join("\n")}\n</urlset>\n`);
}
