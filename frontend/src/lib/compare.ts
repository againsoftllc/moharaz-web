import { catBySlug, type Product } from "./products";

/* Label each " · " part of a spec string so different products line up in rows — only for products whose
   specification table isn't available (the table, from AgainERP, is what the comparison normally uses). */
const RULES: [RegExp, string][] = [
  [/\d+C\/\d+T/, "Cores / Threads"],
  [/GHz\b(?!.*2\.4)/, "Boost clock"],
  [/^(AM4|AM5|LGA\d+)$/, "Socket"],
  [/^GDDR\d/, "Video memory"],
  [/^DDR\d$/, "Memory type"],
  [/^(E-ATX|mATX|ATX)$/, "Form factor"],
  [/DLSS|FSR/, "Upscaling"],
  [/Graphics$/, "Integrated graphics"],
  [/^CL\d+/, "CAS latency"],
  [/^\d+(GB|TB)( kit)?$/, "Capacity"],
  [/PCIe \d|SATA/, "Interface"],
  [/MB\/s/, "Read speed"],
  [/^\d+Hz$|\d+Hz$/, "Refresh rate"],
  [/^(FHD|QHD|UHD|UWQHD)/, "Resolution"],
  [/IPS|VA\b|OLED/, "Panel"],
  [/\d+(\.\d+)?ms$/, "Response time"],
  [/\d+(\.\d+)?"/, "Display"],
  [/^\d+RPM/, "Speed"],
  [/^(Air|AIO)$/, "Cooler type"],
  [/^\d+mm( ARGB)?$|^\d+mm$/, "Size"],
  [/×/, "Dimensions"],
  [/WiFi \d/, "WiFi standard"],
  [/^BT |Bluetooth/, "Bluetooth"],
  [/modular/i, "Cabling"],
  [/^(Offline|Online|Line-interactive)$/, "UPS type"],
  [/^\d+W$/, "Output power"],
  [/^(Win11|DOS)/, "Operating system"],
  [/Lifetime|Subscription/, "License"],
  [/USB|Wired|XLR|3\.5mm|2\.4GHz|Tri-mode/, "Connectivity"],
  [/RGB|Black|White|Walnut/i, "Style"],
];

export function specRows(p: Product): [string, string][] {
  const seen = new Map<string, number>();
  return p.spec.split(" · ").map((part) => {
    const base = RULES.find(([re]) => re.test(part))?.[1] ?? "Feature";
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return [n > 1 ? `${base} ${n}` : base, part];
  });
}

export type Row = { label: string; values: (string | null)[] };
export type Section = { title: string; rows: Row[] };

export const DELIVERY = "Dhaka 1–2 days · Nationwide 2–3 days";

/** spec names that mean the same row however a product spells them ("Refresh rate", "Refresh Rate:") */
const keyOf = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const WARRANTY = /warrant/i;

/** the product's category for comparing: its own category, or the one above it when that is just the brand
    ("Monitor › Aiwa" → Monitor) */
function categoryOf(p: Product): string {
  const path = p.catPath ?? [];
  for (let i = path.length - 1; i >= 0; i--) {
    const name = path[i][0];
    if (name.toLowerCase() !== p.brand.toLowerCase()) return name;
  }
  return catBySlug(p.cat)?.name ?? (p.catName && p.catName.toLowerCase() !== p.brand.toLowerCase() ? p.catName : "") ?? "";
}

/** a product's warranty: its own Warranty spec, else the store's rule */
function warrantyOf(p: Product): string {
  const own = p.specGroups?.flatMap((g) => g.rows).find(([k]) => WARRANTY.test(k))?.[1];
  return own?.trim() || (p.condition === "New" ? "Official brand warranty" : "6 months store warranty");
}

/** `products` as listed; `details` the same products with their specification tables (AgainERP), when loaded */
export function sections(products: Product[], details: (Product | undefined)[] = []): Section[] {
  const full = products.map((p, i) => details[i] ?? p);

  // one section per specification group (Key Specifications, General Information …), rows matched by spec name;
  // a product without a table falls back to its spec line
  const groups = new Map<string, { title: string; rows: Map<string, { label: string; values: (string | null)[] }> }>();
  full.forEach((p, i) => {
    const tables = p.specGroups?.length ? p.specGroups : [{ name: "Specifications", rows: specRows(p) }];
    for (const g of tables) {
      const gk = keyOf(g.name) || "specifications";
      if (!groups.has(gk)) groups.set(gk, { title: g.name, rows: new Map() });
      const rows = groups.get(gk)!.rows;
      for (const [label, value] of g.rows) {
        if (WARRANTY.test(label) || !value?.trim()) continue; // warranty has its own row below
        const k = keyOf(label);
        if (!rows.has(k)) rows.set(k, { label: label.replace(/:\s*$/, ""), values: products.map(() => null) });
        const row = rows.get(k)!;
        if (row.values[i] == null) row.values[i] = value.trim();
      }
    }
  });
  // specs every compared product has come first (they're the ones you can actually compare), in table order
  const ordered = (rows: Row[]) => {
    const common = rows.filter((r) => r.values.every((v) => v != null));
    return [...common, ...rows.filter((r) => !common.includes(r))];
  };
  // the products' own "General Information" group joins this page's section of that name instead of repeating it
  const general = groups.get("general information");
  groups.delete("general information");
  const specSections: Section[] = [...groups.values()]
    .map((g) => ({ title: g.title, rows: ordered([...g.rows.values()]) }))
    .filter((s) => s.rows.length);

  return [
    {
      title: "General information",
      rows: [
        { label: "Brand", values: full.map((p) => p.brand) },
        { label: "Category", values: full.map((p) => categoryOf(p) || null) },
        { label: "Condition", values: full.map((p) => p.condition) },
        ...ordered([...(general?.rows.values() ?? [])]),
      ],
    },
    ...specSections,
    {
      title: "Warranty & delivery",
      rows: [
        { label: "Warranty", values: full.map(warrantyOf) },
        { label: "Delivery", values: full.map((p) => (p.stock === "In stock" ? DELIVERY : p.stock === "Pre-order" ? "ETA 7–10 days" : "—")) },
      ],
    },
  ];
}
