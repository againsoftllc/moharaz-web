/* Every admin resource, seeded from the storefront's current static data so the dashboard
   shows the real catalogue until the backend serves it. */

import { bannersFor } from "../banners";
import { POSTS } from "../blog";
import { SLOTS, type Build } from "../builder";
import { CUSTOM_PLANS, GIFTS } from "../bundles";
import { EMI_MIN } from "../checkout";
import { specRows } from "../compare";
import { BANNERS, BUILDS, FAQ } from "../data";
import { GOES_WITH, features, overview, sku, stockQty, warranty } from "../productInfo";
import { CATEGORIES, PRODUCTS, numId, type Product } from "../products";
import { MENU_SETTINGS } from "../menu";
import { SOCIAL_LINKS } from "../socials";
import type { Collection, Key, Singleton } from "./api";
import { slugify } from "./format";
import type { AdminBanner, AdminBuild, AdminBundle, AdminCategory, AdminFaq, AdminPost, AdminProduct, BundleRules, FaqCat, Socials } from "./types";

export function toAdminProduct(p: Product): AdminProduct {
  const highlights = p.spec.split(" · ").length;
  const f = features(p);
  return {
    ...p,
    id: numId(p), // the admin edits the demo catalogue (numeric ids)
    sku: sku(p),
    qty: stockQty(p),
    gallery: [],
    overview: overview(p),
    features: f.slice(0, f.length - highlights),
    specs: specRows(p),
    warranty: warranty(p),
    inBox: `${p.name}, user manual, warranty card`,
    tags: [],
    emi: p.price >= EMI_MIN,
    featured: false,
    status: "active",
    seoTitle: `${p.name} Price in Bangladesh`,
    seoDescription: "",
  };
}

function seedCategories(): AdminCategory[] {
  const fallback = bannersFor();
  return CATEGORIES.map((c, i) => {
    const list = bannersFor(c.slug);
    // bannersFor() falls back to shared banners; only keep the ones made for this category
    const own = list !== fallback || list.some((b) => b.src.includes(`/${c.slug}.`));
    return {
      ...c,
      parent: "",
      description: "",
      banners: own ? list.map(({ src, alt, href }) => ({ src, alt, href })) : [],
      goesWith: GOES_WITH[c.slug] ?? [],
      showInMenu: true,
      featured: i < 12,
      order: i + 1,
      status: "active",
      seoTitle: `${c.name} Price in Bangladesh`,
      seoDescription: `Buy genuine ${c.name.toLowerCase()} at the best price in Bangladesh. Official warranty, 0% EMI on 29 banks, fast delivery.`,
    };
  });
}

/** Link a build's text lines ("Ryzen 5 9600X") to catalogue products where every word matches. */
function matchParts(lines: string[]): Build {
  const parts: Build = {};
  for (const line of lines) {
    const want = line.toLowerCase().replace(/^(amd|intel) /, "").split(/\s+/);
    const p = PRODUCTS.find((x) => {
      const have = new Set(x.name.toLowerCase().split(/\s+/));
      return want.every((w) => have.has(w));
    });
    const slot = p && SLOTS.find((s) => s.cat === p.cat && (!s.only || s.only(p)));
    if (p && slot && !parts[slot.key]) parts[slot.key] = [{ id: numId(p), qty: 1 }];
  }
  return parts;
}

const FAQ_GUESS: [RegExp, FaqCat][] = [[/cash|pay/i, "Payment"], [/deliver/i, "Delivery"], [/emi/i, "EMI"], [/warranty/i, "Warranty"]];

const collection = <T, K extends Key>(c: Collection<T, K>) => c;
const singleton = <T,>(s: Singleton<T>) => s;

export const db = {
  products: collection<AdminProduct, number>({
    name: "products", path: "/products", noun: "product",
    key: (p) => p.id,
    seed: () => PRODUCTS.map(toAdminProduct),
    assignKey: (p, all) => ({ ...p, id: Math.max(0, ...all.map((x) => x.id)) + 1 }),
  }),

  categories: collection<AdminCategory, string>({
    name: "categories", path: "/categories", noun: "category",
    key: (c) => c.slug,
    seed: seedCategories,
  }),

  bundles: collection<AdminBundle, string>({
    name: "bundles", path: "/bundles", noun: "bundle",
    key: (b) => b.slug,
    // the shop's bundles are made in AgainERP (Website → Bundles); this demo list starts empty
    seed: () => [],
  }),

  builds: collection<AdminBuild, string>({
    name: "builds", path: "/custom-pcs", noun: "custom PC",
    key: (b) => b.id,
    seed: () => BUILDS.map(([name, highlights, price, old, a, b, badge]) => ({
      id: slugify(name), name, badge, colors: [a, b], parts: matchParts(highlights), highlights: [...highlights],
      price, old, assembly: true, description: "", featured: true, status: "active",
    })),
  }),

  posts: collection<AdminPost, string>({
    name: "posts", path: "/posts", noun: "post",
    key: (p) => p.slug,
    seed: () => POSTS.map((p) => ({ ...p, body: p.body.map((b) => ({ ...b })), status: "published", seoTitle: p.title, seoDescription: p.excerpt })),
  }),

  faqs: collection<AdminFaq, string>({
    name: "faqs", path: "/faqs", noun: "question",
    key: (f) => f.id,
    seed: () => FAQ.map(([q, a], i) => ({
      id: `faq-${i + 1}`, q, a, cat: FAQ_GUESS.find(([re]) => re.test(q))?.[1] ?? "General",
      home: true, help: false, order: i + 1, published: true,
    })),
  }),

  banners: collection<AdminBanner, string>({
    name: "banners", path: "/banners", noun: "banner",
    key: (b) => b.id,
    seed: () => BANNERS.map(([src, alt, href], i) => ({ id: `banner-${i + 1}`, src, alt, href, active: true, order: i + 1, startsAt: "", endsAt: "" })),
  }),

  socials: singleton<Socials>({
    name: "socials", path: "/settings/socials",
    seed: () => SOCIAL_LINKS.map((s) => ({ ...s })),
  }),

  /** defined next to the storefront's useMenu(), which reads it too */
  menu: MENU_SETTINGS,

  bundleRules: singleton<BundleRules>({
    name: "bundleRules", path: "/settings/bundle-rules",
    seed: () => ({ plans: CUSTOM_PLANS.map((p) => ({ ...p })), gifts: GIFTS.map((g) => ({ ...g })) }),
  }),
};

/** Bundle money maths, same rounding as the storefront. */
export function priceBundle(b: Pick<AdminBundle, "items" | "pct" | "price">, byId: Map<number, AdminProduct>) {
  const items = b.items.map((id) => byId.get(id)).filter((p): p is AdminProduct => !!p);
  const total = items.reduce((s, p) => s + p.price, 0);
  const price = b.price ?? Math.round((total * (1 - b.pct / 100)) / 100) * 100;
  return { items, total, price, save: total - price, pct: total ? Math.round((1 - price / total) * 100) : 0 };
}
