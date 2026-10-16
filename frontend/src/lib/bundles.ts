import type { IconKey } from "./data";
import type { Product, Stock } from "./products";
import { findProduct } from "./shop/registry";

/** set per bundle in the admin; the usual ones are BUNDLE_TYPES */
export type BundleType = string;

export type Bundle = {
  slug: string;
  name: string;
  tagline: string;
  type: BundleType;
  items: Product[];
  /** how many of each item (same order as items; 1 when missing) */
  quantities?: number[];
  /** sum of the items bought separately */
  total: number;
  /** bundle price after discount */
  price: number;
  save: number;
  pct: number;
  stock: Stock;
  /** made by the customer on /bundles/create */
  custom?: boolean;
  /** free gifts the customer chose (custom bundles) */
  gifts?: Gift[];
};

const stockOf = (items: Product[]): Stock =>
  items.some((p) => p.stock === "Out of stock") ? "Out of stock" : items.some((p) => p.stock === "Pre-order") ? "Pre-order" : "In stock";

/* ===== the shop's bundles: from AgainERP (admin: Website → Bundles), via lib/shop/api getBundles() ===== */

const STORE_KEY = "moharaz-bundles";
let stored: Map<string, Bundle> | null = null;

function loadStored() {
  if (stored) return stored;
  stored = new Map();
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORE_KEY) : null;
    if (raw) for (const b of JSON.parse(raw) as Bundle[]) stored.set(b.slug, b);
  } catch {}
  return stored;
}

/** remember bundles the page shows, so the cart still knows them after a reload (like lib/shop/registry) */
export function rememberBundles(...bundles: Bundle[]) {
  const m = loadStored();
  for (const b of bundles) if (!b.custom) m.set(b.slug, b);
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify([...m.values()].slice(-40)));
  } catch {}
}

export const BUNDLE_TYPES: BundleType[] = ["Gaming", "Office", "Peripherals", "Upgrade"];

/* ===== customer-made bundles ===== */
export type Gift = { id: string; name: string; value: number; icon: IconKey; premium?: boolean };

/** free gifts customers choose from; premium ones only come with the biggest bundle */
export const GIFTS: Gift[] = [
  { id: "jersey", name: "Gaming Jersey", value: 1200, icon: "shirt" },
  { id: "mousepad", name: "XL Gaming Mouse Pad", value: 900, icon: "pad" },
  { id: "usbhub", name: "4-Port USB 3.0 Hub", value: 800, icon: "tool" },
  { id: "backpack", name: "Gaming Backpack", value: 2500, icon: "bag" },
  { id: "headset", name: "Wired Gaming Headset", value: 2200, icon: "head" },
  { id: "mouse", name: "RGB Gaming Mouse", value: 1800, icon: "mouse", premium: true },
  { id: "controller", name: "Wireless Gamepad", value: 3000, icon: "game", premium: true },
  { id: "keyboard", name: "Mechanical Keyboard", value: 3500, icon: "kb", premium: true },
];
export const giftById = new Map(GIFTS.map((g) => [g.id, g]));

/** one plan per bundle size: discount, how many gifts to choose and whether premium gifts are allowed */
export const CUSTOM_PLANS = [
  { size: 2, pct: 3, picks: 1, premium: false },
  { size: 3, pct: 5, picks: 2, premium: false },
  { size: 4, pct: 8, picks: 2, premium: true },
] as const;
export type CustomPlan = (typeof CUSTOM_PLANS)[number];
export const CUSTOM_MIN = CUSTOM_PLANS[0].size;
export const CUSTOM_MAX = CUSTOM_PLANS[CUSTOM_PLANS.length - 1].size;
export const planFor = (size: number) => CUSTOM_PLANS.find((p) => p.size === size);
export const giftsFor = (plan: CustomPlan) => GIFTS.filter((g) => plan.premium || !g.premium);

/** keep the chosen gifts that the plan allows, then top up with the first available ones */
export function fitGifts(chosen: string[], plan: CustomPlan): string[] {
  const pool = giftsFor(plan).map((g) => g.id);
  const kept = [...new Set(chosen)].filter((id) => pool.includes(id)).slice(0, plan.picks);
  return [...kept, ...pool.filter((id) => !kept.includes(id))].slice(0, plan.picks);
}

const CUSTOM_PREFIX = "c-";
/* catalogue ids are "oc-prod-123"; links and cart keys carry just the number */
const PROD = "oc-prod-";
const shortId = (id: string) => (id.startsWith(PROD) ? id.slice(PROD.length) : id);
const fullId = (s: string) => (/^\d+$/.test(s) ? `${PROD}${s}` : s);
/* cart key: c-<id.id.id>~<gift.gift> */
export const customCode = (ids: string[], gifts: string[]) => `${CUSTOM_PREFIX}${ids.map(shortId).join(".")}~${gifts.join(".")}`;
/** "oc-prod-10494,…" → "10494,…" for links */
export const linkIds = (ids: string[]) => ids.map(shortId).join(",");
export const customHref = (ids: string[], gifts: string[]) => `/bundles/create?size=${ids.length}&items=${ids.map(shortId).join(",")}&gifts=${gifts.join(",")}`;

/** "10494,7456" → unique catalogue product ids (max 4); the page checks they exist and are in stock */
export function parseCustomIds(raw: string | null | undefined): string[] {
  const ids = (raw ?? "").split(/[.,]/).map((s) => s.trim()).filter((s) => /^[\w-]+$/.test(s)).map(fullId);
  return [...new Set(ids)].slice(0, CUSTOM_MAX);
}
export const parseGiftIds = (raw: string | null | undefined) => (raw ?? "").split(/[.,]/).filter((id) => giftById.has(id));

/** a customer's bundle from its products (the browser must know them: lib/shop/registry), null if one is unknown */
export function customBundle(ids: string[], giftIds: string[]): Bundle | null {
  const plan = planFor(ids.length);
  if (!plan) return null;
  const gifts = fitGifts(giftIds, plan);
  const items = ids.map((id) => findProduct(id));
  if (items.some((p) => !p)) return null;
  const total = (items as Product[]).reduce((s, p) => s + p.price, 0);
  const price = Math.round((total * (1 - plan.pct / 100)) / 100) * 100;
  return {
    slug: customCode(ids, gifts), name: `My Custom Bundle · ${items.length} items`, tagline: "Built by you", type: "Upgrade",
    items: items as Product[], total, price, save: total - price, pct: plan.pct, stock: stockOf(items as Product[]), custom: true, gifts: gifts.map((id) => giftById.get(id)!),
  };
}

/** a shop bundle the browser has seen (by slug), or a custom one from its "c-<ids>~<gifts>" code */
export function findBundle(slug: string): Bundle | undefined {
  if (!slug.startsWith(CUSTOM_PREFIX)) return loadStored().get(slug);
  const [items, gifts] = slug.slice(CUSTOM_PREFIX.length).split("~");
  return customBundle(parseCustomIds(items), parseGiftIds(gifts)) ?? undefined;
}
