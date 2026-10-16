/* AgainERP storefront API (againerp-moharaz) — the real catalogue behind the shop pages.

   The browser calls this site's own /api/v1/* and /uploads/*, which app/api/v1 and app/uploads forward
   to the API (lib/shop/proxy.ts) — no CORS, photos served from the shop's domain. Server components call
   the API directly: API_PROXY_TARGET (frontend/.env.local; local http://127.0.0.1:8060), cached a minute.

   Endpoints used (all under /api/v1/storefront):
     GET /products?category_slug&brands&search&attrs=code:value&price_min&price_max&in_stock&sort&page&per_page
     GET /products/facets?<same filters>      brands, price bounds, spec filters with counts
     GET /products/newest?limit
     GET /products/by-slug/{slug}             detail: specifications, gallery, variants, reviews, qa
     GET /resolve/{slug}                      is a flat /{slug} a product, a category or a brand?
     GET /categories?channel=catalog          category tree
     GET /brands?channel=catalog
     GET /configurator/ready-builds · /{slug}   published ready builds (admin: Website → PC Builder → Ready Builds)
     GET /bundles · /bundles/{slug}           published bundles with their products (admin: Website → Bundles)
     GET /configurator/profiles/pc-builder   the PC builder's slots (admin: Website → PC Builder)
     GET /configurator/profiles/pc-builder/categories/{slot}/listing   a slot's products, as the admin set it up */

import { cleanHtml } from "../cleanHtml";
import type { Post } from "../blog";
import { DEFAULT_SETTINGS, type BuilderSettings, type ErpSlot } from "../builder";
import type { Bundle } from "../bundles";
import type { Product, ProductVariant, SpecGroup, Stock } from "../products";

/** where server code reaches the API; the browser always goes through this site's /api/v1 proxy */
const SERVER_API = (process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_AGAINERP_API_URL || "http://127.0.0.1:8060").replace(/\/$/, "");
const base = () => `${typeof window === "undefined" ? SERVER_API : ""}/api/v1/storefront`;
/** server-side cache window for catalogue reads (seconds) */
const REVALIDATE = 60;

/* ---------- API shapes ---------- */

export type ApiListProduct = {
  id: string;
  slug: string;
  name: string;
  price: string;
  compare_at_price: string | null;
  stock_status: string | null;
  in_stock: boolean;
  brand: string;
  category: string;
  thumbnail: string | null;
  short_description: string | null;
  sku: string | null;
  rating: number | null;
  review_count: number | null;
  /** when the product last changed (ISO) — sitemap lastmod */
  updated_at?: string | null;
  /** filterable spec values by attribute code (socket, memory_type, …) */
  filter_attributes?: Record<string, string>;
};

type ApiVariant = {
  id: string;
  sku: string;
  name: string;
  price: string;
  stock: number;
  image_url: string | null;
  is_default: boolean;
  options: { name: string; value: string }[];
};

export type ApiProductDetail = ApiListProduct & {
  full_description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  brand_id: string | null;
  category_id: string | null;
  specifications: { name: string; specs: { label: string; value: string }[] }[];
  gallery: string[];
  variants: ApiVariant[];
  reviews: { customer_name: string; rating: number; title: string; body: string; created_at: string; is_verified_purchase: boolean }[];
  qa: { question: string; answer: string | null }[];
};

export type ApiCategory = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  icon_url: string | null;
  banner_url: string | null;
  show_in_top_menu: boolean;
  children: ApiCategory[];
};

export type ApiBrand = { id: string; slug: string; name: string; logo_url: string | null };

export type Facets = {
  brands: { id: string; slug: string; name: string; count: number }[];
  price_min: string;
  price_max: string;
  attributes: { id: string; code: string; name: string; display_type: string; options: { value: string; label: string; count: number }[] }[];
};

export type Resolved =
  | { type: "product"; slug: string }
  | { type: "category"; slug: string; category: { id: string; slug: string; name: string; description: string | null; meta_title: string | null; meta_description: string | null; parent_id: string | null } }
  | { type: "brand"; slug: string; brand: { id: string; slug: string; name: string; logo_url: string | null } };

/** filters for a product list / facets call */
export type ListQuery = {
  category?: string;
  brand?: string;
  brands?: string[];
  search?: string;
  /** spec filters: attribute code → values */
  attrs?: Record<string, string[]>;
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  /** only products with an offer (compare-at price above the selling price) */
  onSale?: boolean;
  /** also unlisted products that still have their own page (e.g. discontinued) — sitemaps */
  includeHidden?: boolean;
  sort?: "availability" | "newest" | "price_asc" | "price_desc";
  page?: number;
  perPage?: number;
};

/* ---------- fetch ---------- */

async function get<T>(path: string, params?: URLSearchParams, init?: { signal?: AbortSignal }): Promise<T> {
  const url = `${base()}${path}${params && [...params].length ? `?${params}` : ""}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE }, signal: init?.signal });
  if (!res.ok) throw new Error(`AgainERP API ${res.status} for ${path}`);
  const body = await res.json();
  return body as T;
}

function listParams(q: ListQuery) {
  const p = new URLSearchParams();
  if (q.category) p.set("category_slug", q.category);
  if (q.brand) p.set("brand_slug", q.brand);
  q.brands?.forEach((b) => p.append("brands", b));
  if (q.search) p.set("search", q.search);
  Object.entries(q.attrs ?? {}).forEach(([code, values]) => values.forEach((v) => p.append("attrs", `${code}:${v}`)));
  if (q.priceMin) p.set("price_min", String(q.priceMin));
  if (q.priceMax) p.set("price_max", String(q.priceMax));
  if (q.inStock) p.set("in_stock", "true");
  if (q.onSale) p.set("on_sale", "true");
  if (q.includeHidden) p.set("include_hidden", "true");
  if (q.sort && q.sort !== "newest") p.set("sort", q.sort);
  if (q.page && q.page > 1) p.set("page", String(q.page));
  if (q.perPage) p.set("per_page", String(q.perPage));
  return p;
}

export async function listProducts(q: ListQuery, init?: { signal?: AbortSignal }) {
  const res = await get<{ data: ApiListProduct[]; meta: { count: number } }>("/products", listParams(q), init);
  return { items: res.data.map(toProduct), total: res.meta.count };
}

export async function getFacets(q: ListQuery, init?: { signal?: AbortSignal }) {
  // counts cover every page and order of the same filters; /facets has no brand_slug, so a brand
  // page's brand goes in as a `brands` filter (otherwise its counts would cover the whole catalogue)
  const filters: ListQuery = { ...q, page: undefined, perPage: undefined, sort: undefined, brand: undefined, brands: q.brand ? [q.brand] : q.brands };
  const res = await get<{ data: Facets } | Facets>("/products/facets", listParams(filters), init);
  return "data" in res ? res.data : res;
}

/** every product of a category (newest first, up to `max`) — pages after the first load in parallel */
export async function productsInCategory(slug: string, max = 1200) {
  const per = 200;
  const first = await listProducts({ category: slug, perPage: per });
  const pages = Math.min(Math.ceil(first.total / per), Math.ceil(max / per));
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => listProducts({ category: slug, perPage: per, page: i + 2 })));
  const seen = new Set<string | number>();
  return [first, ...rest].flatMap((r) => r.items).filter((p) => !seen.has(p.id) && !!seen.add(p.id));
}

/** a PC builder slot's products as the admin set the slot up (Website → PC Builder → Tabs & Slots: category or
    attribute profile, identifying filter, Include / Exclude) — one request, same shape as a product list */
export async function slotProducts(erpSlot: string, profile = "pc-builder") {
  const res = await get<{ data: ApiListProduct[] }>(
    `/configurator/profiles/${encodeURIComponent(profile)}/categories/${encodeURIComponent(erpSlot)}/listing`,
  );
  return res.data.map(toProduct);
}

/** one product by its API id ("oc-prod-123"), or null */
export async function productById(id: string) {
  try {
    const res = await get<{ data: ApiListProduct } | ApiListProduct>(`/products/${encodeURIComponent(id)}`);
    return toProduct("data" in res ? res.data : res);
  } catch {
    return null;
  }
}

export async function newestProducts(limit = 12) {
  const res = await get<{ data: ApiListProduct[] }>("/products/newest", new URLSearchParams({ limit: String(limit) }));
  return res.data.map(toProduct);
}

/** the product page's "Customers also bought" and "Category bestsellers" rails (real sales), or null */
export async function getRecommendations(productId: string) {
  try {
    const res = await get<{ data: { also_bought: ApiListProduct[]; category_bestsellers: ApiListProduct[]; category_name?: string | null; category_slug?: string | null } }>(
      `/products/recommendations/${encodeURIComponent(productId)}`,
    );
    const d = res.data;
    return { alsoBought: d.also_bought.map(toProduct), bestsellers: d.category_bestsellers.map(toProduct), categoryName: d.category_name ?? "", categorySlug: d.category_slug ?? "" };
  } catch {
    return null;
  }
}

export async function resolveSlug(slug: string): Promise<Resolved | null> {
  try {
    return await get<Resolved>(`/resolve/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }
}

export async function getProduct(slug: string): Promise<Product | null> {
  let d: ApiProductDetail;
  try {
    const res = await get<{ data: ApiProductDetail } | ApiProductDetail>(`/products/by-slug/${encodeURIComponent(slug)}`);
    d = "data" in res ? res.data : res;
  } catch {
    return null;
  }
  const cats = await categoryIndex();
  return toProductDetail(d, cats);
}

export async function getCategories() {
  const res = await get<{ data: ApiCategory[] }>("/categories", new URLSearchParams({ channel: "catalog" }));
  return res.data;
}

export type ApiBrandDirectory = {
  data: { id: string; slug: string; name: string; logo_url: string | null; product_count: number; categories: { slug: string; name: string; count: number }[] }[];
  categories: { slug: string; name: string; count: number }[];
};

/** the A–Z brands page: every brand with products in the shop, its product count and top-level categories */
export async function getBrandDirectory(): Promise<ApiBrandDirectory | null> {
  try {
    return await get<ApiBrandDirectory>("/brands/directory");
  } catch {
    return null;
  }
}

export async function getBrands() {
  const res = await get<{ data: ApiBrand[] }>("/brands", new URLSearchParams({ channel: "catalog" }));
  return res.data;
}

/* ---------- the previous shop's URLs ---------- */

/** where an old URL lives now (admin: SEO → Redirects; old index.php links included), or null */
export async function findRedirect(path: string): Promise<string | null> {
  try {
    const res = await get<{ to_path: string }>("/redirects/lookup", new URLSearchParams({ path }));
    return res.to_path || null;
  } catch {
    return null;
  }
}

/** the imported copy of an old /image/… file (resized cache copies included), or null */
export async function findLegacyImage(path: string): Promise<string | null> {
  try {
    const res = await get<{ url: string }>("/redirects/image", new URLSearchParams({ path }));
    return res.url || null;
  } catch {
    return null;
  }
}

export type ApiMenuItem = { id: string; label: string; href: string; children: ApiMenuItem[] };

/** a menu the admin manages under Website → Menus, by slot ("header.primary", "footer.links" …); null when unset */
/* ---------- home slider (AgainERP homepage hero; images in the media library, i.e. Cloudflare R2) ---------- */

export type HomeSlide = { src: string; alt: string; href: string; w: number; h: number };

/** the homepage slider's visible slides, or null (the built-in ones show) */
export async function getHomeSlides(): Promise<HomeSlide[] | null> {
  try {
    type Raw = { image_url?: string; alt?: string; href?: string; image_width?: number; image_height?: number; hidden?: boolean };
    const res = await get<{ data: { hero?: { hidden?: boolean; slides?: Raw[] } } }>("/homepage");
    const hero = res.data.hero;
    if (!hero || hero.hidden) return null;
    const slides = (hero.slides ?? [])
      // only media-library images (Cloudflare R2 or /uploads) — the hero's sample slides point elsewhere
      .filter((s) => !s.hidden && s.image_url && /^(https?:\/\/|\/uploads\/)/.test(s.image_url))
      .map((s) => ({ src: s.image_url!, alt: s.alt ?? "", href: s.href || "/", w: s.image_width || 2828, h: s.image_height || 1052 }));
    return slides.length ? slides : null;
  } catch {
    return null;
  }
}

/* ---------- ready builds (admin: Website → PC Builder → Ready Builds) ---------- */

export type ReadyBuildCard = {
  id: string; name: string; slug: string; category: string | null; tags: string[]; fps_label: string | null;
  images: string[]; highlights: string[];
  /** the parts the card names (CPU, GPU, RAM, storage first), with their slot */
  parts?: { slot: string; name: string }[];
  /** regular = the parts at their own prices; final = what the customer pays */
  totals: { regular: number; price: number; discount: number; final: number };
};
export type ReadyBuildDetail = ReadyBuildCard & {
  slots: { category_slug: string; category_name: string; mode: string; items: { product_id: string; name: string; price: number; is_default: boolean }[] }[];
};

/** the published ready builds (PC Builder profile); [] when unreachable */
export async function getReadyBuilds(): Promise<ReadyBuildCard[]> {
  try {
    return (await get<{ data: ReadyBuildCard[] }>("/configurator/ready-builds")).data;
  } catch {
    return [];
  }
}

/** one published ready build with its parts (each slot's default first), or null */
export async function getReadyBuild(slug: string): Promise<ReadyBuildDetail | null> {
  try {
    return (await get<{ data: ReadyBuildDetail }>(`/configurator/ready-builds/${encodeURIComponent(slug)}`)).data;
  } catch {
    return null;
  }
}

/** a ready build's parts as picked by default: one product per shown slot */
export const readyBuildParts = (b: ReadyBuildDetail) =>
  b.slots
    .filter((s) => s.mode !== "hidden" && s.items.length)
    .map((s) => ({ slot: s.category_slug, productId: (s.items.find((i) => i.is_default) ?? s.items[0]).product_id }));

/* ---------- bundles (admin: Website → Bundles) ---------- */

type ApiBundle = {
  slug: string; name: string; tagline: string; type: string; thumbnail: string | null;
  items: (ApiListProduct & { quantity: number })[];
  total: number; price: number; save: number; pct: number; stock_status: string;
};

const toBundle = (b: ApiBundle): Bundle => ({
  slug: b.slug, name: b.name, tagline: b.tagline, type: b.type || "General",
  items: b.items.map(toProduct), quantities: b.items.map((i) => i.quantity || 1),
  total: Math.round(b.total), price: Math.round(b.price), save: Math.round(b.save), pct: b.pct,
  stock: stockOf(b.stock_status),
});

/** the published bundles (only those whose products are all on the website); [] when unreachable */
export async function getBundles(): Promise<Bundle[]> {
  try {
    return (await get<{ data: ApiBundle[] }>("/bundles")).data.map(toBundle);
  } catch {
    return [];
  }
}

/** one published bundle, or null */
export async function getBundle(slug: string): Promise<Bundle | null> {
  try {
    return toBundle((await get<{ data: ApiBundle }>(`/bundles/${encodeURIComponent(slug)}`)).data);
  } catch {
    return null;
  }
}

/** the PC Builder's slots as set in the admin (Website → PC Builder → Tabs & Slots); null when unreachable */
export async function getBuilderSlots(): Promise<ErpSlot[] | null> {
  try {
    const res = await get<{ data: { categories: ErpSlot[] } }>("/configurator/profiles/pc-builder");
    return res.data.categories?.length ? res.data.categories : null;
  } catch {
    return null;
  }
}

/** the PC builder's General settings (admin: Website → PC Builder → General); the defaults when AgainERP can't be reached */
export async function getBuilderSettings(): Promise<BuilderSettings> {
  try {
    const res = await get<{ data: { settings?: Partial<BuilderSettings> } }>("/configurator/profiles/pc-builder");
    return { ...DEFAULT_SETTINGS, ...(res.data.settings ?? {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function getMenu(slot: string): Promise<ApiMenuItem[] | null> {
  try {
    const res = await get<{ data: { items: ApiMenuItem[] } }>(`/menus/${slot}`);
    return res.data.items?.length ? res.data.items : null;
  } catch {
    return null;
  }
}

/** id → category with its trail from the root (breadcrumbs) */
/** in the browser the category tree is loaded once per visit (the compare page reads several products) */
let browserCategoryIndex: ReturnType<typeof buildCategoryIndex> | undefined;
export function categoryIndex() {
  if (typeof window === "undefined") return buildCategoryIndex();
  browserCategoryIndex ??= buildCategoryIndex();
  return browserCategoryIndex;
}

async function buildCategoryIndex() {
  const index = new Map<string, { slug: string; name: string; path: [string, string][] }>();
  const walk = (nodes: ApiCategory[], trail: [string, string][]) => {
    for (const c of nodes) {
      const path: [string, string][] = [...trail, [c.name, c.slug]];
      index.set(c.id, { slug: c.slug, name: c.name, path });
      walk(c.children ?? [], path);
    }
  };
  try {
    walk(await getCategories(), []);
  } catch {
    /* breadcrumbs fall back to the category name */
  }
  return index;
}

/* ---------- mapping onto the shop's Product ---------- */

/** API media paths ("/uploads/media/…") stay relative — this site serves them through its /uploads proxy */
export const media = (url?: string | null) => url || undefined;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };
const text = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e) => ENTITIES[e]).replace(/\s+/g, " ").trim();

/** the short description's bullets ("<li>Layout: TKL</li>") as plain lines; a line pasted twice is shown once */
export function bullets(html?: string | null) {
  if (!html) return [];
  const once = (lines: string[]) => lines.filter((l, i) => lines.findIndex((x) => x.toLowerCase() === l.toLowerCase()) === i);
  const items = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => text(m[1])).filter(Boolean);
  if (items.length) return once(items);
  // plain text / paragraphs: one feature per line — split before text() collapses the line breaks
  return once(html
    .split(/\r?\n|<br\s*\/?>|<\/p>|<\/div>|•/i)
    .map((line) => text(line).replace(/^[-–*]\s+/, ""))
    .filter(Boolean));
}

export function stockOf(status: string | null): Stock {
  if (status === "in_stock") return "In stock";
  if (status === "pre_order" || status === "coming_soon") return "Pre-order";
  return "Out of stock";
}

const num = (v: string | number | null | undefined) => (v == null ? 0 : Number(v) || 0);

export function toProduct(a: ApiListProduct): Product {
  const price = num(a.price);
  const old = num(a.compare_at_price);
  const points = bullets(a.short_description);
  return {
    id: a.id,
    updatedAt: a.updated_at ?? undefined,
    slug: a.slug,
    name: a.name,
    cat: "",
    catName: a.category,
    brand: a.brand,
    spec: points.slice(0, 3).join(" · "),
    price,
    ...(old > price ? { old } : {}),
    condition: "New",
    stock: stockOf(a.stock_status),
    group: a.id,
    variant: "",
    image: media(a.thumbnail),
    highlights: points.slice(0, 4),
    sku: a.sku ?? undefined,
    ...(a.filter_attributes && Object.keys(a.filter_attributes).length ? { attrs: a.filter_attributes } : {}),
    rating: { avg: a.rating ?? 0, count: a.review_count ?? 0 },
    real: true,
  };
}

function toVariant(v: ApiVariant): ProductVariant {
  return {
    id: v.id,
    name: v.name,
    sku: v.sku,
    price: num(v.price),
    inStock: v.stock > 0,
    image: media(v.image_url),
    isDefault: v.is_default,
    options: Object.fromEntries(v.options.map((o) => [o.name, o.value])),
  };
}

export function toProductDetail(d: ApiProductDetail, cats: Awaited<ReturnType<typeof categoryIndex>>): Product {
  const base = toProduct(d);
  const cat = d.category_id ? cats.get(d.category_id) : undefined;
  const specGroups: SpecGroup[] = (d.specifications ?? [])
    .map((g) => ({ name: g.name, rows: g.specs.map((s) => [s.label, s.value] as [string, string]) }))
    .filter((g) => g.rows.length);
  const images = (d.gallery ?? []).map(media).filter((u): u is string => !!u);
  const variants = (d.variants ?? []).filter((v) => v.options?.length).map(toVariant);
  return {
    ...base,
    cat: cat?.slug ?? "",
    catName: cat?.name ?? d.category,
    catPath: cat?.path,
    summary: d.seo_description ?? base.highlights?.[0],
    seoTitle: d.seo_title ?? undefined,
    seoDescription: d.seo_description ?? undefined,
    images: images.length ? images : base.image ? [base.image] : [],
    image: base.image ?? images[0],
    specGroups,
    // the description as written, minus the styling copied in from other sites (lib/cleanHtml)
    overviewHtml: d.full_description ? cleanHtml(d.full_description) || undefined : undefined,
    variants: variants.length > 1 ? variants : undefined,
    reviewList: (d.reviews ?? []).map((r) => ({
      name: r.customer_name,
      stars: r.rating,
      text: [r.title, r.body].filter(Boolean).join(" — "),
      date: r.created_at.slice(0, 10),
      verified: r.is_verified_purchase,
    })),
    questionList: (d.qa ?? []).filter((x) => x.answer).map((x) => ({ q: x.question, a: x.answer! })),
  };
}

/* ---------- blog (AgainERP: Website → Blog) ---------- */

type ApiBlogPost = {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category_slug: string | null;
  category_name: string | null;
  author_name: string | null;
  published_at: string | null;
  content?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  product_ids?: string[];
  updated_at?: string | null;
};

function toPost(a: ApiBlogPost): Post {
  const words = a.content ? text(a.content).split(" ").length : 0;
  return {
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt ?? "",
    tag: a.category_name ?? "Blog",
    categorySlug: a.category_slug ?? undefined,
    date: (a.published_at ?? "").slice(0, 10),
    updated: a.updated_at?.slice(0, 10),
    ...(words ? { mins: Math.max(1, Math.round(words / 220)) } : {}),
    author: a.author_name ?? "Moharaz",
    icon: "cpu",
    color: "#E3121B",
    cover: media(a.cover_image_url),
    shop: [],
    body: [],
    html: a.content ?? undefined,
    productIds: a.product_ids,
    seoTitle: a.seo_title ?? undefined,
    seoDescription: a.seo_description ?? undefined,
  };
}

/** every published post, newest first */
export async function blogPosts(): Promise<Post[]> {
  const out: Post[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await get<{ data: ApiBlogPost[]; meta: { count: number } }>("/blog/posts", new URLSearchParams({ per_page: "50", page: String(page) }));
    out.push(...res.data.map(toPost));
    if (out.length >= res.meta.count || !res.data.length) break;
  }
  return out;
}

/** one post with its HTML, or null */
export async function blogPost(slug: string): Promise<Post | null> {
  try {
    return toPost((await get<{ data: ApiBlogPost }>(`/blog/posts/${encodeURIComponent(slug)}`)).data);
  } catch {
    return null;
  }
}

/** active blog categories (only those with posts) */
export async function blogCategories(): Promise<{ slug: string; name: string; description: string | null; count: number }[]> {
  const res = await get<{ data: { slug: string; name: string; description?: string | null; post_count?: number }[] }>("/blog/categories");
  return res.data.filter((c) => (c.post_count ?? 0) > 0).map((c) => ({ slug: c.slug, name: c.name, description: c.description ?? null, count: c.post_count ?? 0 }));
}

/** every product page's photos, gallery order ({slug: [url, …]}) — the image sitemap; null when unavailable */
export async function sitemapProductImages(): Promise<Record<string, string[]> | null> {
  try {
    return (await get<{ data: Record<string, string[]> }>("/sitemap/product-images")).data;
  } catch {
    return null;
  }
}
