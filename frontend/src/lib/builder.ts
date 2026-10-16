import type { IconKey } from "./data";
import type { Product, ProductId } from "./products";
import { findProduct } from "./shop/registry";

/* PC builder — the slots (which ones, their names, tabs and the category each lists) come from AgainERP's PC
   Builder profile (admin: Website → PC Builder → Tabs & Slots, the same as Workspace → Plugins → Smart PC Builder),
   read by app/pc-builder/page.tsx and handed to applySlots(); SLOTS below is the fallback when it can't be reached.
   Each slot's products come from its category (lib/shop/api productsInCategory). The admin's compatibility rules
   are checked by AgainERP (evaluateBuild) on top of the checks here. Compatibility reads each product's spec filters (socket, memory type …) and, where those are missing, its name
   (model numbers, chipsets). A check only fails when both sides are known — an unknown spec never blocks a part. */

export type Tab = "overview" | "components" | "extras" | "peripherals";
/** the slots the compatibility checks know; a slot the admin adds keeps its own (AgainERP) slug */
export type KnownSlot =
  | "chassis" | "cpu" | "cooler" | "motherboard" | "memory" | "gpu" | "psu" | "ssd" | "hdd" | "os"
  | "fans" | "wifi" | "accessories"
  | "monitor" | "mouse" | "keyboard" | "mousepad" | "controller" | "headset" | "mic";
export type SlotKey = KnownSlot | (string & {});

export type Slot = {
  key: SlotKey;
  label: string;
  icon: IconKey;
  tab: Exclude<Tab, "overview">;
  /** the store category (slug) the slot lists */
  cat: string;
  /** narrows a shared category */
  only?: (p: Product) => boolean;
  /** several different products allowed (Add / Added) vs one (Choose) */
  multi: boolean;
  /** shown on Overview even when empty */
  core?: boolean;
  /** the slot's slug in AgainERP (sent with the build for the admin's compatibility rules) */
  erp: string;
  /** the slot's own sort from Tabs & Slots (popular | low | high) */
  sort?: string;
};

/** AgainERP's Website → PC Builder → General tab, as the storefront uses it */
export type BuilderSettings = {
  show_incompatible: boolean;
  show_coming_soon: boolean;
  hide_out_of_stock: boolean;
  show_autofilter_notice: boolean;
  share_link: boolean;
  default_sort: string;
};
export const DEFAULT_SETTINGS: BuilderSettings = {
  show_incompatible: false, show_coming_soon: true, hide_out_of_stock: false, show_autofilter_notice: true, share_link: true, default_sort: "popular",
};
/** the admin's sort names → the Picker's */
export const SORT_FROM_ERP: Record<string, "popular" | "price-asc" | "price-desc"> = { popular: "popular", low: "price-asc", high: "price-desc" };

const DEFAULT_SLOTS: Omit<Slot, "erp">[] = [
  { key: "chassis", label: "Chassis", icon: "case", tab: "components", cat: "casing", multi: false, core: true },
  { key: "cpu", label: "CPU", icon: "cpu", tab: "components", cat: "processor", multi: false, core: true },
  { key: "cooler", label: "CPU Cooler", icon: "cooler", tab: "components", cat: "cpu-cooler", multi: false, core: true },
  { key: "motherboard", label: "Motherboard", icon: "mb", tab: "components", cat: "motherboard", multi: false, core: true },
  { key: "memory", label: "Memory", icon: "ram", tab: "components", cat: "ram", only: (p) => !/laptop|so-?dimm|notebook/i.test(p.name), multi: true, core: true },
  { key: "gpu", label: "Graphics Card", icon: "gpu", tab: "components", cat: "graphics-card", multi: false, core: true },
  { key: "psu", label: "PSU", icon: "psu", tab: "components", cat: "power-supply", multi: false, core: true },
  { key: "ssd", label: "SSD", icon: "ssd", tab: "components", cat: "ssd", multi: true, core: true },
  { key: "hdd", label: "HDD", icon: "hdd", tab: "components", cat: "hdd", multi: true },
  { key: "os", label: "Internet Security", icon: "os", tab: "components", cat: "internet-security", multi: true },
  { key: "fans", label: "Case Fans", icon: "fan", tab: "extras", cat: "casing-fan", multi: true },
  { key: "wifi", label: "Network Adapter", icon: "wifi", tab: "extras", cat: "adapter-bd", multi: false },
  { key: "accessories", label: "Thermal Paste", icon: "tool", tab: "extras", cat: "thermal-paste", multi: true },
  { key: "monitor", label: "Monitors", icon: "mon", tab: "peripherals", cat: "monitor", multi: true },
  { key: "mouse", label: "Mouse", icon: "mouse", tab: "peripherals", cat: "mouse", multi: false },
  { key: "keyboard", label: "Keyboard", icon: "kb", tab: "peripherals", cat: "keyboard", multi: false },
  { key: "mousepad", label: "Mouse Pad", icon: "pad", tab: "peripherals", cat: "mouse-pad", multi: false },
  { key: "controller", label: "Gamepad", icon: "game", tab: "peripherals", cat: "gamepad", multi: true },
  { key: "headset", label: "Headphone", icon: "head", tab: "peripherals", cat: "headphone", multi: false },
  { key: "mic", label: "Microphone", icon: "mic", tab: "peripherals", cat: "microphone", multi: false },
];

/** AgainERP slot slug → the key used here (keeps saved builds and share links working) */
const ERP_TO_KEY: Record<string, KnownSlot> = {
  casing: "chassis", "cpu-cooler": "cooler", ram: "memory", "graphics-card": "gpu", "power-supply": "psu",
  "internet-security": "os", "casing-fan": "fans", "wifi-adapter": "wifi", "thermal-paste": "accessories",
  "mouse-pad": "mousepad", gamepad: "controller", headphone: "headset", microphone: "mic",
};
const KEY_TO_ERP: Record<string, string> = Object.fromEntries(Object.entries(ERP_TO_KEY).filter(([e]) => e !== "ram").map(([e, k]) => [k, e]));
const ONLY: Partial<Record<SlotKey, (p: Product) => boolean>> = Object.fromEntries(DEFAULT_SLOTS.filter((s) => s.only).map((s) => [s.key, s.only!]));
const DEFAULT_ICON = new Map<SlotKey, IconKey>(DEFAULT_SLOTS.map((s) => [s.key, s.icon]));

/** the slots in use: the built-in list until applySlots() swaps in the admin's */
export const SLOTS: Slot[] = DEFAULT_SLOTS.map((s) => ({ ...s, erp: KEY_TO_ERP[s.key] ?? s.key }));
export const slotByKey = new Map<SlotKey, Slot>(SLOTS.map((s) => [s.key, s]));

/** a slot as the page hands it over (plain data, no functions) */
export type SlotDef = Omit<Slot, "only">;

/** a slot of AgainERP's PC Builder profile (GET /storefront/configurator/profiles/pc-builder) */
export type ErpSlot = {
  slug: string; name: string; catalog_category_slug: string; sort_order: number; is_required: boolean;
  multi: boolean; max_select: number; tab_slug?: string; tab_sort: number; kind: string; default_sort?: string;
};

const TAB_OF: Record<string, Exclude<Tab, "overview">> = { "core-components": "components", components: "components", peripherals: "peripherals" };

/** the admin's slots, by tab and order; ones not bound to a category are left out (nothing to list) */
export function slotDefsFromErp(rows: ErpSlot[]): SlotDef[] {
  return [...rows]
    .filter((r) => r.kind === "product" && r.catalog_category_slug)
    .sort((a, b) => a.tab_sort - b.tab_sort || a.sort_order - b.sort_order)
    .map((r) => {
      const key = ERP_TO_KEY[r.slug] ?? r.slug;
      return {
        key, erp: r.slug, label: r.name, cat: r.catalog_category_slug, core: r.is_required,
        icon: DEFAULT_ICON.get(key) ?? "tool",
        tab: TAB_OF[r.tab_slug ?? ""] ?? "extras",
        multi: r.multi || r.max_select > 1,
        sort: r.default_sort,
      };
    });
}

const plain = (s: Slot): SlotDef => ({ key: s.key, label: s.label, icon: s.icon, tab: s.tab, cat: s.cat, multi: s.multi, core: s.core, erp: s.erp, sort: s.sort });

/** use these slots from now on (the same list again changes nothing) */
export function applySlots(defs: SlotDef[]) {
  if (!defs.length || JSON.stringify(defs.map((d) => plain(d as Slot))) === JSON.stringify(SLOTS.map(plain))) return;
  SLOTS.splice(0, SLOTS.length, ...defs.map((d) => ({ ...d, only: ONLY[d.key] })));
  slotByKey.clear();
  SLOTS.forEach((s) => slotByKey.set(s.key, s));
}

/** the first slot on a tab */
export const firstSlot = (tab: Tab) => SLOTS.find((s) => s.tab === tab)?.key;

export type Pick = { id: ProductId; qty: number };
export type Build = Partial<Record<SlotKey, Pick[]>>;
export type Picked = { slot: Slot; product: Product; qty: number };

export const pickedIn = (b: Build, k: SlotKey): Picked[] => {
  const slot = slotByKey.get(k);
  if (!slot) return [];
  return (b[k] ?? []).flatMap((x) => {
    const product = findProduct(x.id);
    return product ? [{ slot, product, qty: x.qty }] : [];
  });
};
export const allPicked = (b: Build) => SLOTS.flatMap((s) => pickedIn(b, s.key));
const one = (b: Build, k: SlotKey) => pickedIn(b, k)[0]?.product;

/* ---------- specs: spec filters first, then the name / spec line ---------- */
const text = (p: Product) => `${p.name} ${p.spec} ${Object.values(p.attrs ?? {}).join(" ")}`;

/* chipset → socket (motherboards), e.g. "B650M" → AM5 */
const CHIPSET: [RegExp, string][] = [
  [/\b(A320|B350|X370|B450|X470|A520|B550|X570)/i, "AM4"],
  [/\b(A620|B650|X670|B840|B850|X870)/i, "AM5"],
  [/\b(H610|B660|H670|Z690|B760|H770|Z790)/i, "LGA1700"],
  [/\b(H810|B860|Z890)/i, "LGA1851"],
  [/\b(H410|B460|H470|Z490|H510|B560|H570|Z590)/i, "LGA1200"],
  [/\b(H110|B150|H170|Z170|B250|H270|Z270|H310|B360|B365|H370|Z370|Z390)/i, "LGA1151"],
  [/\b(H81|B85|H87|Z87|H97|Z97)\b/i, "LGA1150"],
  [/\b(H61|B75|H77|Z77|Z75)\b/i, "LGA1155"],
];

/* Intel generation → socket (2nd–14th) */
const intelGen = (g: number) => (g >= 12 ? "LGA1700" : g >= 10 ? "LGA1200" : g >= 6 ? "LGA1151" : g >= 4 ? "LGA1150" : g >= 2 ? "LGA1155" : undefined);

export function socketOf(p: Product): string | undefined {
  const t = text(p);
  const direct = t.match(/\b(AM4|AM5|LGA ?(?:1851|1700|1200|1151|1150|1155))\b/i)?.[1];
  if (direct) return direct.toUpperCase().replace(/\s/g, "");
  // CPUs: Ryzen 7000/8000/9000 → AM5, older → AM4; Intel 12th–14th gen → LGA1700, 10th–11th → LGA1200, Core Ultra 200 → LGA1851
  const ryzen = p.name.match(/Ryzen\s+(?:\d|Threadripper)\s+(?:PRO\s+)?(\d)\d{3}/i)?.[1];
  if (ryzen) return +ryzen >= 7 ? "AM5" : "AM4";
  if (/Core\s+Ultra\s+[579]\s+2\d\d/i.test(p.name)) return "LGA1851";
  if (/Athlon\s+(?:PRO\s+)?(?:3000G|[23]\d0GE?)\b/i.test(p.name)) return "AM4";
  // "Core i5-12400" (5 digits = 10th gen and later), "Core i7-8700" (4 digits = 2nd–9th), or "14th Gen" in the name
  const five = p.name.match(/\bi[3579][- ]?(1\d)\d{3}/i)?.[1];
  if (five) return intelGen(+five);
  const four = p.name.match(/\bi[3579][- ]?([2-9])\d{3}(?!\d)/i)?.[1];
  if (four) return intelGen(+four);
  const pentium = p.name.match(/\b(?:Pentium|Celeron)\b.*?\bG([5-7])(\d)\d{2}/i);
  if (pentium) return pentium[1] === "7" ? "LGA1700" : pentium[1] === "6" || pentium[2] === "9" ? "LGA1200" : "LGA1151";
  const genWord = p.name.match(/\b(\d{1,2})(?:st|nd|rd|th)\s+Gen/i)?.[1];
  if (genWord && /Intel/i.test(p.name)) return intelGen(+genWord);
  return CHIPSET.find(([re]) => re.test(p.name))?.[1];
}

export function ddrOf(p: Product): string | undefined {
  const d = text(p).match(/\b(DDR[345])\b/i)?.[1];
  if (d) return d.toUpperCase();
  // AM5 and LGA1851 boards take DDR5 only
  const s = /motherboard|\b[ABHXZ]\d{3}[MEI]?\b/i.test(p.name) ? socketOf(p) : undefined;
  return s === "AM5" || s === "LGA1851" ? "DDR5" : s === "AM4" ? "DDR4" : undefined;
}

function formOf(p: Product): string | undefined {
  const t = text(p);
  if (/\bE-?ATX\b|full[- ]?tower/i.test(t)) return "E-ATX";
  if (/mini[- ]?itx|\bITX\b|\b[ABHXZ]\d{3}I\b/i.test(t)) return "ITX";
  if (/micro[- ]?atx|\bm-?atx\b|\b[ABHXZ]\d{3}M\b|micro[- ]?tower|mini[- ]?tower/i.test(t)) return "mATX";
  if (/\bATX\b|mid[- ]?tower/i.test(t)) return "ATX";
  return undefined;
}
/** a case's size: specs list every board it takes ("E-ATX, ATX, Micro-ATX, Mini-ITX"), so the biggest one counts */
function caseFormOf(p: Product): string | undefined {
  const t = text(p);
  if (/\bE-?ATX\b|full[- ]?tower/i.test(t)) return "E-ATX";
  if (/(?<![-\w])ATX\b|mid[- ]?tower/i.test(t.replace(/micro[- ]?atx|mini[- ]?atx|\bm-?atx\b/gi, ""))) return "ATX";
  if (/micro[- ]?atx|\bm-?atx\b|micro[- ]?tower|mini[- ]?tower|\b[ABHXZ]\d{3}M\b/i.test(t)) return "mATX";
  if (/mini[- ]?itx|\bITX\b/i.test(t)) return "ITX";
  return undefined;
}
const CASE_FITS: Record<string, string[]> = { "E-ATX": ["E-ATX", "ATX", "mATX", "ITX"], ATX: ["ATX", "mATX", "ITX"], mATX: ["mATX", "ITX"], ITX: ["ITX"] };

export const wattOf = (p: Product) => +(p.name.match(/(\d{3,4})\s?W\b/i)?.[1] ?? 0);
const modulesOf = (p: Product) => +(p.name.match(/\((\d)\s?x\s?\d+\s?GB\)/i)?.[1] ?? p.name.match(/\b(\d)\s?x\s?\d+\s?GB\b/i)?.[1] ?? 1);
/** Intel "F" parts and Ryzen without "G" have no integrated graphics */
const noIGPU = (p: Product) => /\d{4,5}F\b/.test(p.name) || (/Ryzen/i.test(p.name) && /Ryzen\s+\d\s+(?:PRO\s+)?[1-5]\d{3}(?!G)\b/i.test(p.name));
/** Boxed coolers ship only with non-X Ryzen and non-K Intel parts. */
const noStockCooler = (p: Product) => /X3D|\d{4}X\b|\d{3,5}K\b|Ultra/.test(p.name);

/** both known and different — an unknown side is never a clash */
const differs = (a?: string, b?: string) => !!a && !!b && a !== b;

function cpuWatts(p: Product) {
  if (/i9|Ryzen 9|Ultra 9/.test(p.name)) return 170;
  if (/i7|Ryzen 7|Ultra 7/.test(p.name)) return 125;
  if (/i3|Ryzen 3/.test(p.name)) return 60;
  return 90;
}
const GPU_WATTS: [RegExp, number][] = [
  [/5090/, 575], [/4090/, 450], [/5080/, 360], [/4080/, 320], [/5070 Ti/, 300], [/4070 Ti/, 285], [/5070/, 250], [/4070/, 200],
  [/5060 Ti/, 180], [/4060 Ti/, 165], [/5060/, 145], [/4060/, 115], [/9070 XT/, 304], [/9070/, 220], [/7900/, 315], [/7800/, 263],
  [/7700/, 245], [/9060 XT/, 160], [/7600/, 165], [/3060/, 170], [/3050/, 70], [/1650/, 75], [/GT 7\d0|GT 10\d0/, 30],
];
const gpuWatts = (p: Product) => GPU_WATTS.find(([re]) => re.test(p.name))?.[1] ?? 150;

/** Estimated peak system draw and the PSU size we recommend for it. */
export function power(b: Build) {
  const cpu = one(b, "cpu"), gpu = one(b, "gpu");
  const count = (k: SlotKey) => pickedIn(b, k).reduce((s, x) => s + x.qty * (k === "memory" ? modulesOf(x.product) : 1), 0);
  const draw = 50 + (cpu ? cpuWatts(cpu) : 0) + (gpu ? gpuWatts(gpu) : 0) + count("memory") * 5 + (count("ssd") + count("hdd")) * 7 + count("fans") * 4;
  return { draw, recommended: Math.ceil((draw * 1.4) / 50) * 50 };
}

/** Why `p` would clash with the rest of the build in slot `k` (null = fine or can't tell). */
export function clash(b: Build, k: SlotKey, p: Product): string | null {
  const cpu = one(b, "cpu"), mb = one(b, "motherboard"), chassis = one(b, "chassis");
  const ram = pickedIn(b, "memory").map((x) => x.product);
  if (k === "cpu" && mb && differs(socketOf(p), socketOf(mb))) return `Needs ${socketOf(p)} — your motherboard is ${socketOf(mb)}`;
  if (k === "motherboard") {
    if (cpu && differs(socketOf(p), socketOf(cpu))) return `${socketOf(p)} socket — your CPU needs ${socketOf(cpu)}`;
    const d = ram[0] && ddrOf(ram[0]);
    if (differs(ddrOf(p), d)) return `${ddrOf(p)} board — your memory is ${d}`;
    const f = chassis && caseFormOf(chassis);
    if (f && formOf(p) && !CASE_FITS[f]?.includes(formOf(p)!)) return `${formOf(p)} won't fit your ${f} case`;
  }
  if (k === "memory" && mb && differs(ddrOf(p), ddrOf(mb))) return `${ddrOf(p)} — your motherboard needs ${ddrOf(mb)}`;
  if (k === "chassis" && mb && caseFormOf(p) && formOf(mb) && !CASE_FITS[caseFormOf(p)!]?.includes(formOf(mb)!)) return `${caseFormOf(p)} case can't hold your ${formOf(mb)} board`;
  if (k === "psu") {
    const { recommended } = power(b);
    if (wattOf(p) && wattOf(p) < recommended) return `${wattOf(p)}W is below the ${recommended}W this build needs`;
  }
  return null;
}

export type Check = { level: "ok" | "warn" | "error"; msg: string };

/** Whole-build checks shown on the Overview; "warn" where a spec couldn't be read. */
export function checks(b: Build): Check[] {
  const out: Check[] = [];
  const cpu = one(b, "cpu"), mb = one(b, "motherboard"), gpu = one(b, "gpu"), psu = one(b, "psu"), chassis = one(b, "chassis");
  const ram = pickedIn(b, "memory");

  if (cpu && mb) {
    const [a, m] = [socketOf(cpu), socketOf(mb)];
    out.push(!a || !m ? { level: "warn", msg: "Couldn't confirm the CPU and motherboard sockets — please check the specs" }
      : a === m ? { level: "ok", msg: `CPU and motherboard share the ${a} socket` }
      : { level: "error", msg: `CPU socket ${a} doesn't match motherboard ${m}` });
  }
  if (mb && ram.length) {
    const m = ddrOf(mb);
    const bad = ram.find((x) => differs(ddrOf(x.product), m));
    out.push(bad ? { level: "error", msg: `${ddrOf(bad.product)} memory won't work in a ${m} motherboard` }
      : m && ram.every((x) => ddrOf(x.product)) ? { level: "ok", msg: `${m} memory matches the motherboard` }
      : { level: "warn", msg: "Couldn't confirm the memory type — please check the specs" });
  }
  if (mb && chassis) {
    const [c, m] = [caseFormOf(chassis), formOf(mb)];
    out.push(!c || !m ? { level: "warn", msg: "Couldn't confirm the motherboard fits the case — please check the specs" }
      : CASE_FITS[c]?.includes(m) ? { level: "ok", msg: `${m} motherboard fits the ${c} case` }
      : { level: "error", msg: `${m} motherboard doesn't fit a ${c} case` });
  }
  const modules = ram.reduce((s, x) => s + x.qty * modulesOf(x.product), 0);
  if (modules > 4) out.push({ level: "error", msg: `${modules} memory sticks selected — boards have 4 slots at most` });
  if (cpu && !gpu && noIGPU(cpu)) out.push({ level: "error", msg: `${cpu.name.replace(/ Processor.*/i, "")} has no integrated graphics — add a graphics card` });
  if (cpu && !pickedIn(b, "cooler").length && noStockCooler(cpu)) out.push({ level: "warn", msg: "This CPU doesn't include a cooler — add a CPU cooler" });
  if (psu) {
    const { recommended } = power(b);
    out.push(!wattOf(psu) ? { level: "warn", msg: "Couldn't read the PSU wattage — please check the specs" }
      : wattOf(psu) >= recommended ? { level: "ok", msg: `${wattOf(psu)}W PSU covers the recommended ${recommended}W` }
      : { level: "error", msg: `${wattOf(psu)}W PSU is below the recommended ${recommended}W` });
  }
  const missing = (["cpu", "motherboard", "memory", "psu", "chassis"] as SlotKey[]).filter((k) => slotByKey.has(k) && !pickedIn(b, k).length).map((k) => slotByKey.get(k)!.label);
  if ((slotByKey.has("ssd") || slotByKey.has("hdd")) && !pickedIn(b, "ssd").length && !pickedIn(b, "hdd").length) missing.push("Storage");
  if (missing.length && allPicked(b).length) out.push({ level: "warn", msg: `Still needed for a working PC: ${missing.join(", ")}` });
  return out;
}

/* ---------- share links: ?b=cpu-123.1,memory-456.2 (the number of "oc-prod-123"; demo ids are plain numbers) ---------- */
const PREFIX = "oc-prod-";
const shareId = (id: ProductId) => (typeof id === "string" && id.startsWith(PREFIX) ? id.slice(PREFIX.length) : String(id));

export const encodeBuild = (b: Build) =>
  SLOTS.flatMap((s) => (b[s.key] ?? []).map((x) => `${s.key}-${shareId(x.id)}.${x.qty}`)).join(",");

/** a shared build; its products may still have to be loaded (PcBuilder fetches the ones the browser doesn't know) */
export function decodeBuild(v: string): Build {
  const b: Build = {};
  v.split(",").forEach((part) => {
    const m = part.match(/^([a-z][a-z0-9-]*)-(\d+)\.(\d+)$/);
    if (!m || !slotByKey.has(m[1])) return;
    const k = m[1];
    b[k] = [...(b[k] ?? []), { id: `${PREFIX}${m[2]}`, qty: Math.min(+m[3] || 1, 8) }];
  });
  return b;
}

/** a saved build without the slots the admin has since removed */
export const knownSlotsOnly = (b: Build): Build => Object.fromEntries(Object.entries(b).filter(([k]) => slotByKey.has(k)));

/* ---------- the admin's compatibility rules (AgainERP: Website → PC Builder → Rules) ---------- */
export type RuleResult = { rule_name: string; status: string; message: string; matched: boolean };

/** runs the build through AgainERP's rule engine; null when it can't be reached (the checks here still apply) */
export async function evaluateBuild(b: Build, signal?: AbortSignal): Promise<RuleResult[] | null> {
  const components = SLOTS.flatMap((s) => (b[s.key] ?? []).filter((x) => typeof x.id === "string")
    .map((x) => ({ category_slug: s.erp, product_id: String(x.id), quantity: Math.min(x.qty, 9) })));
  if (components.length < 2) return [];
  try {
    const res = await fetch("/api/v1/storefront/configurator/profiles/pc-builder/evaluate", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ components }), signal,
    });
    if (!res.ok) return null;
    return ((await res.json()) as { data: { results: RuleResult[] } }).data.results;
  } catch {
    return null;
  }
}

/* what a check is about, so a failed rule from the admin replaces this page's check that says the same thing */
const TOPICS: [string, RegExp][] = [
  ["socket", /socket|chipset|generation/i], ["memory", /\bram\b|memory|ddr|stick/i], ["power", /psu|watt|power/i],
  ["case", /\bcase\b|casing|form factor|fits? /i], ["cooler", /cooler|tdp|radiator/i], ["storage", /m\.2|sata|ssd|storage/i],
];
const topicOf = (t: string) => TOPICS.find(([, re]) => re.test(t))?.[0];

/** this page's checks plus the admin's rules: a failed rule shows as an error (incompatible) or a warning and
    stands in for this page's problem on the same topic */
export function mergeRules(local: Check[], rules: RuleResult[] | null): Check[] {
  const failed = (rules ?? []).filter((r) => r.status === "incompatible" || r.status === "warning");
  if (!failed.length) return local;
  const topics = new Set(failed.map((r) => topicOf(r.rule_name)).filter(Boolean));
  return [
    ...failed.map((r): Check => ({ level: r.status === "incompatible" ? "error" : "warn", msg: r.message || r.rule_name })),
    ...local.filter((c) => !topics.has(topicOf(c.msg))),
  ];
}

export const ASSEMBLY_FEE = 1500;

/** per product of a slot: the admin's Error / Warning rules it would trip next to the parts already picked */
export type SlotCompat = Record<string, { errors: string[]; warnings: string[] }>;

/** AgainERP's verdict on every product of slot `slot` against the rest of the build (POST …/slot-compat); null when
    it can't be reached — the checks here still apply */
export async function slotCompat(b: Build, slot: Slot, signal?: AbortSignal): Promise<SlotCompat | null> {
  const components = SLOTS.filter((s) => s.key !== slot.key).flatMap((s) => (b[s.key] ?? []).filter((x) => typeof x.id === "string")
    .map((x) => ({ category_slug: s.erp, product_id: String(x.id), quantity: Math.min(x.qty, 9) })));
  if (!components.length) return {};
  try {
    const res = await fetch("/api/v1/storefront/configurator/profiles/pc-builder/slot-compat", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slot: slot.erp, components }), signal,
    });
    if (!res.ok) return null;
    return ((await res.json()) as { data: SlotCompat }).data;
  } catch {
    return null;
  }
}
