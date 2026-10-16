import type { IconKey } from "./data";

export type Condition = "New" | "Open Box" | "Refurbished";
export type Stock = "In stock" | "Pre-order" | "Out of stock";

export type Category = {
  slug: string; name: string; icon: IconKey; color: string;
  /** short intro under the category title (lib/productInfo writes one when missing) */
  description?: string;
};

/** demo catalogue ids are numbers; products from the AgainERP API keep their string id ("oc-prod-123") */
export type ProductId = number | string;

/** one titled block of the specification table (real catalogue) */
export type SpecGroup = { name: string; rows: [string, string][] };

/** a purchasable variant of a real product — e.g. { Color: "Black", "Switch Color": "Red" } */
export type ProductVariant = {
  id: string;
  name: string;
  sku: string;
  price: number;
  inStock: boolean;
  image?: string;
  isDefault: boolean;
  options: Record<string, string>;
};

export type Product = {
  id: ProductId;
  slug: string;
  name: string;
  cat: string;
  brand: string;
  spec: string;
  price: number;
  old?: number;
  condition: Condition;
  stock: Stock;
  /** products that differ only by variant (capacity / configuration / colour) share a group */
  group: string;
  /** variant label within the group, e.g. "1TB" or "16GB RAM 512GB SSD · Silver" ("" when there's one) */
  variant: string;
  /** what sets this variant apart within its group, one entry per option — e.g. { "RAM / Storage": "16GB / 512GB", Color: "Silver" } */
  options?: Record<string, string>;
  /** product photo (transparent PNG in /public/products, shared per category) */
  image?: string;
  /* Optional catalogue extras; when missing, lib/productInfo derives demo values from the spec. */
  /** key points shown as bullets on product cards, e.g. the parts of a PC build */
  highlights?: string[];
  /** one-sentence description for cards and the product page */
  summary?: string;
  /** running promotion; `endsAt` is an ISO date-time */
  offer?: { label: string; endsAt: string };
  /** units on hand */
  qty?: number;

  /* Real catalogue (AgainERP API). Present → the page shows these instead of the demo values in lib/productInfo. */
  /** true for products that came from the API */
  real?: boolean;
  /** category name when `cat` is not one of CATEGORIES (the API has 1,200+ categories) */
  catName?: string;
  /** when the product last changed in AgainERP (ISO) */
  updatedAt?: string;
  /** breadcrumb trail of the primary category, root first: [name, slug] */
  catPath?: [string, string][];
  sku?: string;
  /** filterable spec values by attribute code, e.g. { socket: "AMD AM5", memory_type: "DDR5" } */
  attrs?: Record<string, string>;
  images?: string[];
  specGroups?: SpecGroup[];
  /** full description (HTML from the store's admin) */
  overviewHtml?: string;
  /** the page's own SEO title / meta description from the admin (the previous shop's, after the import) */
  seoTitle?: string;
  seoDescription?: string;
  variants?: ProductVariant[];
  rating?: { avg: number; count: number };
  reviewList?: { name: string; stars: number; text: string; date: string; verified: boolean }[];
  questionList?: { q: string; a: string }[];
  related?: Product[];
};

/** demo maths (ratings, stock counts, picks) needs a number; real ids hash to a stable one */
export const numId = (p: { id: ProductId }) => {
  if (typeof p.id === "number") return p.id;
  let h = 0;
  for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
};

/** a product price of 0 means "call for price" on the real catalogue */
export const callForPrice = (p: Product) => !!p.real && p.price <= 0;

export const CATEGORIES: Category[] = [
  { slug: "laptop", name: "Laptop", icon: "lap", color: "#38BDF8" },
  { slug: "desktop", name: "Desktop PC", icon: "desk", color: "#A855F7" },
  { slug: "processor", name: "Processor", icon: "cpu", color: "#E3121B" },
  { slug: "graphics-card", name: "Graphics Card", icon: "gpu", color: "#22C55E" },
  { slug: "motherboard", name: "Motherboard", icon: "mb", color: "#0EA5E9" },
  { slug: "ram", name: "RAM", icon: "ram", color: "#7C3AED" },
  { slug: "ssd", name: "SSD", icon: "ssd", color: "#F97316" },
  { slug: "monitor", name: "Monitor", icon: "mon", color: "#1D4ED8" },
  { slug: "power-supply", name: "Power Supply", icon: "psu", color: "#FFB020" },
  { slug: "casing", name: "Casing", icon: "case", color: "#94A3B8" },
  { slug: "ups", name: "UPS", icon: "ups", color: "#EAB308" },
  { slug: "keyboard-mouse", name: "Keyboard & Mouse", icon: "kb", color: "#16A34A" },
  { slug: "headset", name: "Headset", icon: "head", color: "#EC4899" },
  { slug: "cpu-cooler", name: "CPU Cooler", icon: "cooler", color: "#2DD4BF" },
  { slug: "hdd", name: "Hard Disk", icon: "hdd", color: "#64748B" },
  { slug: "software", name: "Software", icon: "os", color: "#0EA5E9" },
  { slug: "case-fan", name: "Case Fan", icon: "fan", color: "#A855F7" },
  { slug: "wifi-adapter", name: "WiFi Adapter", icon: "wifi", color: "#22C55E" },
  { slug: "pc-accessory", name: "PC Accessories", icon: "tool", color: "#F97316" },
  { slug: "mouse-pad", name: "Mouse Pad", icon: "pad", color: "#E3121B" },
  { slug: "controller", name: "Controller", icon: "game", color: "#6366F1" },
  { slug: "microphone", name: "Microphone", icon: "mic", color: "#EC4899" },
];

export const catBySlug = (slug: string) => CATEGORIES.find((c) => c.slug === slug);

/* category name → icon for the 1,200+ real categories that aren't in CATEGORIES */
const ICON_WORDS: [RegExp, IconKey, string][] = [
  [/laptop|notebook/i, "lap", "#38BDF8"], [/desktop|pc deal|mini pc|all.in.one/i, "desk", "#A855F7"],
  [/processor|cpu(?! cooler)/i, "cpu", "#E3121B"], [/graphics|gpu|vga/i, "gpu", "#22C55E"], [/motherboard/i, "mb", "#0EA5E9"],
  [/\bram\b|memory/i, "ram", "#7C3AED"], [/ssd|nvme/i, "ssd", "#F97316"], [/hdd|hard dis/i, "hdd", "#64748B"],
  [/monitor|display|tv/i, "mon", "#1D4ED8"], [/power supply|psu/i, "psu", "#FFB020"], [/casing|case(?! fan)/i, "case", "#94A3B8"],
  [/ups|ips|power strip/i, "ups", "#EAB308"], [/keyboard|mouse(?! pad)|combo/i, "kb", "#16A34A"], [/mouse pad/i, "pad", "#E3121B"],
  [/headset|headphone|earphone|earbud|speaker/i, "head", "#EC4899"], [/cooler|thermal/i, "cooler", "#2DD4BF"],
  [/fan/i, "fan", "#A855F7"], [/router|wifi|network|switch/i, "wifi", "#22C55E"], [/gamepad|controller/i, "game", "#6366F1"],
  [/microphone|\bmic\b/i, "mic", "#EC4899"], [/software|windows|antivirus/i, "os", "#0EA5E9"],
];

/** the product's category for display: a known one, else a stand-in built from the real category name */
export function catOf(p: Pick<Product, "cat" | "catName">): Category {
  const known = catBySlug(p.cat);
  if (known) return known;
  const name = p.catName ?? "Products";
  const hit = ICON_WORDS.find(([re]) => re.test(name));
  return { slug: p.cat || "all", name, icon: hit?.[1] ?? "tool", color: hit?.[2] ?? "#E3121B" };
}

/** the storefront has no built-in catalogue: every product comes from AgainERP (lib/shop/api) */
export const PRODUCTS: Product[] = [];
export const productById = new Map(PRODUCTS.map((p) => [p.id, p]));
export const productBySlug = new Map(PRODUCTS.map((p) => [p.slug, p]));
export const productHref = (p: Product) => `/${p.slug}`;
export const countIn = (slug: string) => PRODUCTS.filter((p) => p.cat === slug).length;
export const stockClass = (s: Stock) => (s === "In stock" ? "ok" : s === "Pre-order" ? "pre" : "no");
