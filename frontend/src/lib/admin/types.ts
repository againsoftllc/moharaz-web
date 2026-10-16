/* Admin schemas — the storefront's types plus the fields the backend will store.
   Shared with the backend team: these are the JSON bodies the admin sends and expects back. */

import type { Build } from "../builder";
import type { BundleType, Gift } from "../bundles";
import type { IconKey } from "../data";
import type { Post } from "../blog";
import type { Condition, Stock } from "../products";
import type { MenuItem } from "../menu";
import type { SocialLink } from "../socials";

export type Publish = "active" | "draft";

/** Storefront `Product` + catalogue extras (id is assigned by the backend; 0 = not saved yet). */
export type AdminProduct = {
  id: number;
  slug: string;
  name: string;
  /** category slug */
  cat: string;
  brand: string;
  /** short highlights shown on cards, " · " separated — e.g. "6C/12T · 5.1GHz · AM5" */
  spec: string;
  price: number;
  /** regular price before discount */
  old?: number;
  condition: Condition;
  stock: Stock;
  /** variants (capacity / configuration / colour) of one model share a group */
  group: string;
  /** label within the group, e.g. "1TB"; "" when there's one */
  variant: string;
  /** what sets this variant apart, one entry per option — e.g. { "RAM / Storage": "8GB / 128GB", Color: "Red" }.
      The product page shows one row of choices per option across the group. */
  options?: Record<string, string>;
  /** main photo url */
  image?: string;
  sku: string;
  /** units on hand */
  qty: number;
  /** extra photos */
  gallery: string[];
  /** Overview tab text */
  overview: string;
  /** Key features list */
  features: string[];
  /** Specification table rows [label, value] */
  specs: [string, string][];
  warranty: string;
  inBox: string;
  tags: string[];
  /** bullet points on product cards (max 4), e.g. the parts of a PC build */
  highlights?: string[];
  /** one-sentence description for cards and the product page */
  summary?: string;
  /** running promotion shown as a stamp + countdown; `endsAt` is an ISO date-time */
  offer?: { label: string; endsAt: string };
  /** offer 0% EMI on this product */
  emi: boolean;
  featured: boolean;
  status: Publish;
  seoTitle: string;
  seoDescription: string;
};

export type CategoryBannerImg = { src: string; alt: string; href?: string };

/** Storefront `Category` + banner, menu and SEO settings. The slug is the id. */
export type AdminCategory = {
  slug: string;
  name: string;
  icon: IconKey;
  color: string;
  /** parent category slug ("" = top level) */
  parent: string;
  description: string;
  /** promo strips on the category & product pages, ~1456×180; two or more rotate as a carousel */
  banners?: CategoryBannerImg[];
  /** @deprecated single banner from older saves — read banners through `bannersOf()` */
  banner?: CategoryBannerImg;
  /** categories suggested as "customers also bought" */
  goesWith: string[];
  showInMenu: boolean;
  /** on the homepage "Shop by Category" grid */
  featured: boolean;
  order: number;
  status: "active" | "hidden";
  seoTitle: string;
  seoDescription: string;
};

/** Curated bundle offer. Prices are derived from the items + pct unless `price` is set. */
export type AdminBundle = {
  slug: string;
  name: string;
  tagline: string;
  type: BundleType;
  /** BUNDLE_THEMES id — layout + colours of the offer */
  theme: string;
  /** product ids, in display order */
  items: number[];
  /** discount % off the items bought separately */
  pct: number;
  /** fixed bundle price; overrides pct when set */
  price?: number;
  /** free gift ids (see bundle rules) */
  gifts: string[];
  badge: string;
  /** ISO dates, "" = no limit */
  startsAt: string;
  endsAt: string;
  /** shown in the homepage "Combo Deals" row */
  featured: boolean;
  status: Publish;
};

/** Rules for customer-made bundles on /bundles/create. Singleton. */
export type BundlePlan = { size: number; pct: number; picks: number; premium: boolean };
export type BundleRules = { plans: BundlePlan[]; gifts: Gift[] };

/** Prebuilt / custom PC shown in "Explore the best prebuilt & custom gaming PC". */
export type AdminBuild = {
  id: string;
  name: string;
  badge: string;
  /** tower glow gradient */
  colors: [string, string];
  /** picked components per PC Builder slot */
  parts: Build;
  /** the 4 lines on the card (CPU, GPU, memory, storage) */
  highlights: string[];
  price: number;
  /** regular price */
  old: number;
  /** include the assembly & testing fee in the parts total */
  assembly: boolean;
  description: string;
  featured: boolean;
  status: Publish;
};

export type AdminPost = Post & {
  status: "published" | "draft";
  seoTitle: string;
  seoDescription: string;
};

export const FAQ_CATS = ["General", "Orders", "Delivery", "Payment", "EMI", "Warranty", "Store"] as const;
export type FaqCat = (typeof FAQ_CATS)[number];
export type AdminFaq = {
  id: string;
  q: string;
  a: string;
  cat: FaqCat;
  /** where it appears */
  home: boolean;
  help: boolean;
  order: number;
  published: boolean;
};

/** Homepage hero slide, 2828×1052. */
export type AdminBanner = {
  id: string;
  src: string;
  alt: string;
  href: string;
  active: boolean;
  order: number;
  /** ISO dates, "" = no limit */
  startsAt: string;
  endsAt: string;
};

export type Socials = SocialLink[];

/** Header category bar + mobile menu, in display order. Singleton. */
export type SiteMenu = MenuItem[];

/** Signed-in admin, as returned by POST /auth/login. */
export type AdminUser = { name: string; email: string; role: string };

/** One line in the dashboard's "Recent changes". */
export type Activity = { at: string; text: string; href?: string };
