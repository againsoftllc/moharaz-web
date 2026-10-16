import { brandBySlug, brandHref, brandSlug } from "./brands";
import { CATEGORIES } from "./products";

/* top-level menu item → category page */
const TOP: Record<string, string> = {
  Laptop: "laptop", "PC Components": "processor", Desktop: "desktop", Monitor: "monitor",
  UPS: "ups", Accessories: "keyboard-mouse", "Gaming Gear": "headset", Software: "software",
};
/* mega-menu link text → category it belongs to (a search may narrow it) */
const ITEM: Record<string, string> = {
  "Desktop RAM": "ram", "NVMe SSD": "ssd", "SATA SSD": "ssd", "External SSD": "ssd", "Internal HDD": "hdd",
  "CPU Air Cooler": "cpu-cooler", "AIO Liquid Cooler": "cpu-cooler", "Casing Fan": "case-fan", "Thermal Paste": "pc-accessory",
  "2-in-1 Laptop": "laptop?q=2-in-1", "All-in-One PC": "desktop?q=all-in-one", "Mini PC": "desktop?q=mini",
  ...Object.fromEntries(CATEGORIES.map((c) => [c.name, c.slug])),
};

export const topHref = (name: string) => `/${TOP[name] ?? "all"}`;

/* the brand filter needs the catalogue's spelling ("Gigabyte" → "GIGABYTE") */
const brandName = (name: string) => brandBySlug.get(brandSlug(name))?.name;

/* a brand inside a category, the previous shop's sub-category: HP under Monitor → /hp-monitor
   (app/[slug] sends a pair the catalogue has no sub-category for to /monitor?brand=HP) */
const brandInCat = (brand: string, cat: string) => `/${brandSlug(brand)}-${cat}`;

export function megaHref(top: string, col: string, item: string) {
  if (ITEM[item]) return `/${ITEM[item]}`;
  if (/\bbrands?\b/i.test(col)) {
    const b = brandBySlug.get(brandSlug(item));
    if (!b) return `${col === "Brand" ? topHref(top) : "/all"}?brand=${encodeURIComponent(item)}`;
    // "Brand" lists the top item's brands (/hp-monitor); "Top Brands" and the like link the brand's own page (/hp)
    return col === "Brand" && TOP[top] ? brandInCat(b.name, TOP[top]) : brandHref(b);
  }
  return topHref(top);
}

/** A flyout entry beside a mega-menu link: a known brand is that category's brand page, anything else searches it. */
export function subHref(parent: string, sub: string) {
  const [path, qs] = parent.split("?");
  const b = brandName(sub);
  if (b && !qs) return brandInCat(b, path.slice(1));
  const p = new URLSearchParams(qs);
  if (b) p.set("brand", b); else p.set("q", sub);
  return `${path}?${p}`;
}

/** Fired by the mobile bottom bar's "Category" button to open the header's mobile menu. */
export const OPEN_MENU_EVENT = "ut:open-menu";
