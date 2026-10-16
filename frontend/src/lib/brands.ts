import { CATEGORIES, PRODUCTS } from "./products";

export type Brand = {
  slug: string;
  name: string;
  count: number;
  /** category slugs this brand has products in, most products first */
  cats: string[];
  /** logo tile background / text colour */
  bg: string;
  fg: string;
  /** short mark shown in the logo tile */
  mark: string;
  /** real logo (SVG in /public/brands), when we have one */
  logo?: string;
};

/* Real logos in /public/brands/<slug>.svg — marks from Simple Icons (simpleicons.org) and Wikimedia Commons.
   Add a file and its slug here to swap a brand off the coloured wordmark tile. */
const LOGOS = new Set([
  "acer", "adata", "amd", "aoc", "asrock", "asus", "cooler-master", "corsair", "deepcool", "dell", "eset", "gigabyte", "hp", "hyperx",
  "intel", "kaspersky", "kingston", "lenovo", "lg", "lian-li", "microsoft", "msi", "nzxt", "razer", "redragon", "samsung", "seagate",
  "sony", "steelseries", "toshiba", "tp-link", "wd", "zotac",
]);

/* Brand colours for the logo tiles; anything missing gets a neutral tile. */
const COLORS: Record<string, [string, string]> = {
  AMD: ["#0b0b0b", "#fff"], Intel: ["#0068B5", "#fff"], ASUS: ["#0B5ED7", "#fff"], MSI: ["#C1121F", "#fff"],
  GIGABYTE: ["#F58220", "#0b0b0b"], Corsair: ["#FFD100", "#0b0b0b"], Kingston: ["#D71920", "#fff"], Samsung: ["#1428A0", "#fff"],
  Logitech: ["#00B8FC", "#0b0b0b"], Lenovo: ["#E2231A", "#fff"], HP: ["#0096D6", "#fff"], Dell: ["#007DB8", "#fff"],
  Acer: ["#83B81A", "#0b0b0b"], ASRock: ["#1E3A8A", "#fff"], ADATA: ["#E60012", "#fff"], "G.Skill": ["#111", "#E3121B"],
  TeamGroup: ["#E60012", "#fff"], WD: ["#1a1a1a", "#fff"], Crucial: ["#0033A0", "#fff"], LG: ["#A50034", "#fff"],
  AOC: ["#E30613", "#fff"], Antec: ["#111", "#fff"], Thermaltake: ["#0b0b0b", "#E3121B"], Deepcool: ["#0b0b0b", "#38BDF8"],
  "Cooler Master": ["#6D28D9", "#fff"], "Lian Li": ["#111", "#fff"], NZXT: ["#6A1B9A", "#fff"], Montech: ["#0b0b0b", "#FFB020"],
  Gamdias: ["#111", "#22C55E"], Fractal: ["#2D2D2D", "#fff"], APC: ["#009E4D", "#fff"], "Power Guard": ["#B91C1C", "#fff"],
  Maxgreen: ["#15803D", "#fff"], Apollo: ["#1D4ED8", "#fff"], Prolink: ["#0EA5E9", "#fff"], Razer: ["#0b0b0b", "#44D62C"],
  Fantech: ["#E11D48", "#fff"], Redragon: ["#B91C1C", "#fff"], HyperX: ["#E31837", "#fff"], A4Tech: ["#0b0b0b", "#E3121B"],
  Rapoo: ["#0EA5E9", "#fff"], SteelSeries: ["#FF5200", "#0b0b0b"], Havit: ["#111", "#FFB020"], Zotac: ["#FFD200", "#0b0b0b"],
  Sapphire: ["#1E40AF", "#fff"], Thermalright: ["#0b0b0b", "#38BDF8"],
};

export const brandSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/* "AMD" → AMD, "Cooler Master" → CM, "Kingston" → KIN */
const markOf = (name: string) => {
  const words = name.split(/\s+/);
  if (name.length <= 5) return name.toUpperCase();
  return (words.length > 1 ? words.map((w) => w[0]).join("") : name.slice(0, 3)).toUpperCase();
};

function build(): Brand[] {
  const by = new Map<string, typeof PRODUCTS>();
  PRODUCTS.forEach((p) => by.set(p.brand, [...(by.get(p.brand) ?? []), p]));
  return [...by.entries()]
    .map(([name, items]) => {
      const catCount = new Map<string, number>();
      items.forEach((p) => catCount.set(p.cat, (catCount.get(p.cat) ?? 0) + 1));
      const [bg, fg] = COLORS[name] ?? ["#27272A", "#fff"];
      const slug = brandSlug(name);
      return {
        slug,
        name,
        count: items.length,
        cats: [...catCount.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c),
        bg, fg,
        mark: markOf(name),
        logo: LOGOS.has(slug) ? `/brands/${slug}.svg` : undefined,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}

export const BRAND_LIST = build();
export const brandBySlug = new Map(BRAND_LIST.map((b) => [b.slug, b]));
/** a brand's store page — a flat /{brand} URL like categories and products; /brand lists them all */
export const brandHref = (b: Brand) => `/${b.slug}`;
/** brands that have a real logo, biggest first — the homepage carousel */
export const LOGO_BRANDS = BRAND_LIST.filter((b) => b.logo).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
export const catName = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;

/** a brand from the real catalogue (AgainERP API): our own SVG logo when we have one, else the API's logo,
    else the coloured wordmark tile. Colours match by name, case-insensitively ("GIGABYTE" = "Gigabyte"). */
export function brandTile(name: string, slug = brandSlug(name), logo?: string, count = 0): Brand {
  const colors = COLORS[name] ?? Object.entries(COLORS).find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1];
  const [bg, fg] = colors ?? ["#27272A", "#fff"];
  return { slug, name, count, cats: [], bg, fg, mark: markOf(name), logo: LOGOS.has(slug) ? `/brands/${slug}.svg` : logo };
}
