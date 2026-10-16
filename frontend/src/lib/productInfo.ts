import { specRows } from "./compare";
import { CATEGORIES, PRODUCTS, catBySlug, numId, type Product } from "./products";

/* what people usually buy alongside each category */
export const GOES_WITH: Record<string, string[]> = {
  processor: ["cpu-cooler", "motherboard", "ram", "pc-accessory"],
  motherboard: ["processor", "ram", "ssd", "wifi-adapter"],
  ram: ["motherboard", "ssd", "processor"],
  "graphics-card": ["power-supply", "monitor", "casing", "processor"],
  "power-supply": ["graphics-card", "casing", "ups"],
  casing: ["case-fan", "power-supply", "cpu-cooler"],
  ssd: ["hdd", "pc-accessory", "ram"],
  hdd: ["ssd", "ups"],
  monitor: ["keyboard-mouse", "headset", "mouse-pad"],
  laptop: ["headset", "keyboard-mouse", "mouse-pad", "ssd"],
  desktop: ["monitor", "ups", "keyboard-mouse", "software"],
  "keyboard-mouse": ["mouse-pad", "headset", "monitor"],
  headset: ["microphone", "keyboard-mouse", "controller"],
  "cpu-cooler": ["processor", "pc-accessory", "case-fan"],
  "case-fan": ["casing", "cpu-cooler"],
  ups: ["desktop", "monitor"],
};

const rnd = (n: number) => { const x = Math.sin(n * 7919 + 104729) * 10000; return x - Math.floor(x); };

export function rating(p: Product) {
  // real products: only real reviews count
  if (p.real) return { count: p.rating?.count ?? 0, avg: p.rating?.count ? Math.round((p.rating.avg ?? 0) * 10) / 10 : 0 };
  const count = Math.floor(rnd(numId(p)) * 42);
  return { count, avg: count ? Math.round((3.8 + rnd(numId(p) + 1) * 1.2) * 10) / 10 : 0 };
}

const NAMES = ["Rakib H.", "Nusrat J.", "Tanvir A.", "Sajid K.", "Mim R.", "Fahim R.", "Anika T.", "Arif M.", "Sabbir H.", "Tasnim F."];
const GOOD = ["Genuine product with official warranty. Delivery inside Dhaka was next day.", "Works exactly as described. Packaging was excellent and the invoice was included.", "Great value at this price. The showroom staff helped me pick the right one.", "Installed it the same day — no issues at all. Would buy from Ultra again."];
const OK = ["Good product, but delivery took a day longer than expected.", "Does the job. Price was a bit higher than I hoped but it's genuine.", "Solid build quality. Setup instructions could be clearer."];

/** pending: sent from this page, waiting for the store's approval */
export type Review = { name: string; stars: number; text: string; date: string; verified: boolean; pending?: boolean };
export function reviews(p: Product): Review[] {
  if (p.real) return p.reviewList ?? [];
  const { count, avg } = rating(p);
  const id = numId(p);
  return Array.from({ length: Math.min(count, 4) }, (_, i) => {
    const r = rnd(id * 13 + i);
    const stars = Math.max(3, Math.min(5, Math.round(avg + (r - 0.5) * 1.4)));
    const pool = stars >= 4 ? GOOD : OK;
    const d = new Date(Date.UTC(2026, 8 - Math.floor(r * 8), 1 + Math.floor(rnd(id + i) * 27)));
    return { name: NAMES[Math.floor(rnd(id + i * 3) * NAMES.length)], stars, text: pool[Math.floor(r * pool.length)], date: d.toISOString().slice(0, 10), verified: r > 0.25 };
  });
}

/** Short model code, e.g. "UT-00088" (demo SKU). */
export const sku = (p: Product) => p.sku ?? `UT-${String(p.id).padStart(5, "0")}`;

/** a real product's "Warranty" spec row */
const specWarranty = (p: Product) =>
  p.specGroups?.flatMap((g) => g.rows).find(([k]) => /warrant/i.test(k))?.[1];

export const warranty = (p: Product) =>
  p.real ? specWarranty(p) ?? "Official brand warranty" :
  p.condition !== "New" ? "6 months store warranty" :
  ["processor", "motherboard", "graphics-card", "ssd", "hdd", "ram"].includes(p.cat) ? "3 years official brand warranty" :
  ["software"].includes(p.cat) ? "Lifetime license (non-refundable once activated)" : "1 year official brand warranty";

const FEATURES: Record<string, string[]> = {
  processor: ["Unlocked multi-core performance for gaming and creation", "Supports the latest DDR memory and PCIe standards", "Advanced power management for cooler, quieter operation"],
  "graphics-card": ["Real-time ray tracing and AI upscaling", "Multi-fan cooling with 0dB idle mode", "DisplayPort and HDMI 2.1 outputs for high-refresh displays"],
  motherboard: ["Robust VRM for stable boost clocks", "M.2 slots with heatsinks for fast NVMe storage", "BIOS flashback and easy overclocking"],
  ram: ["XMP / EXPO one-click overclock profiles", "Aluminium heat spreader", "Tested for compatibility with major motherboards"],
  ssd: ["NVMe speeds for fast boot and game loads", "Low power draw, runs cool", "Includes migration software"],
  monitor: ["Adaptive sync for tear-free gaming", "Flicker-free, low blue light modes", "Slim bezels for multi-monitor setups"],
  laptop: ["Thin and light chassis with backlit keyboard", "Fast charging battery", "Wi-Fi 6 and USB-C connectivity"],
  "power-supply": ["80 PLUS certified efficiency", "Japanese capacitors for longevity", "Silent fan mode at low loads"],
};
export function features(p: Product) {
  return [...(FEATURES[p.cat] ?? ["Built for everyday reliability", "Backed by official warranty in Bangladesh", "Supported by our in-house RMA & service center"]), ...p.spec.split(" · ").map((s) => `${s}`)];
}

export function overview(p: Product) {
  if (p.real) return summary(p);
  const cat = catBySlug(p.cat)?.name.toLowerCase() ?? "product";
  return `The ${p.name} is a ${p.condition === "New" ? "brand-new" : p.condition.toLowerCase()} ${cat} from ${p.brand}. ${specRows(p).map(([k, v]) => `${k}: ${v}`).join(", ")}. Every unit sold by Moharaz is 100% genuine, comes with ${warranty(p).toLowerCase()}, and is supported by our after-sales team.`;
}

/** Other variants in the same group (capacity / configuration / colour). */
export const variantsOf = (p: Product) => (p.real ? [p] : PRODUCTS.filter((x) => x.group === p.group));

/** a variant's options — products without structured ones fall back to their variant label */
export const optionsOf = (p: Product): Record<string, string> => p.options ?? (p.variant ? { Variant: p.variant } : {});

export function alsoBought(p: Product, n = 10) {
  if (p.real) return (p.related ?? []).slice(0, n);
  const cats = GOES_WITH[p.cat] ?? ["keyboard-mouse", "headset", "ssd"];
  return cats.flatMap((c) => PRODUCTS.filter((x) => x.cat === c && x.stock !== "Out of stock").sort((a, b) => rating(b).count - rating(a).count).slice(0, 3)).slice(0, n);
}

/* ---------- card & product-page extras (real values from the catalogue win; demo values otherwise) ---------- */

/** units on hand — for the admin only; the storefront just shows "In stock" */
export const stockQty = (p: Product) => p.qty ?? (p.stock === "In stock" ? 3 + ((numId(p) * 7) % 23) : 0);

const CPU = /(Core (?:Ultra \d|i\d)[- ]\w+|Ryzen (?:AI )?\d \w+|N\d{3})/;
const GPU = /(RTX \d{4}(?: Ti)?|RX \d{4}(?: XT)?)/;
const OS: Record<string, string> = { Win11: "Windows 11", "Win11 Pro": "Windows 11 Pro", DOS: "Free DOS" };

/** up to 4 key points for the product card — for PCs and laptops, the parts inside */
export function highlights(p: Product): string[] {
  if (p.highlights?.length) return p.highlights.slice(0, 4);
  if (p.real) return (p.specGroups?.flatMap((g) => g.rows) ?? []).slice(0, 4).map(([k, v]) => `${k}: ${v}`);
  const parts = p.spec.split(" · ");
  if (p.cat === "desktop" || p.cat === "laptop") {
    const cpu = p.name.match(CPU)?.[1];
    const gpu = p.name.match(GPU)?.[1];
    const [ram, storage] = p.variant.split(" · ")[0].split(" RAM ");
    return [
      cpu && `${cpu.startsWith("Ryzen") ? "AMD" : "Intel"} ${cpu} Processor`,
      gpu && `${gpu.startsWith("RX") ? "AMD Radeon" : "NVIDIA GeForce"} ${gpu} Graphics`,
      ram && storage && `${ram} RAM · ${storage}`,
      p.cat === "laptop" ? `${parts[0]} Display` : OS[parts[0]] ?? parts[0],
      p.cat === "desktop" && parts[1] && !/^\d+(GB|TB)/.test(parts[1]) ? parts[1] : "",
    ].filter((x): x is string => !!x).slice(0, 4);
  }
  // generic labels ("Feature 2", "Style") or ones the value already says ("Bluetooth: Bluetooth") add nothing
  const rows = specRows(p).map(([k, v]) => (/^(Feature|Style)/.test(k) || v.toLowerCase().includes(k.toLowerCase()) ? v : `${k}: ${v}`));
  return [...rows, warranty(p)].slice(0, 4);
}

const BLURB: Record<string, string> = {
  laptop: "A portable all-rounder for work, study and play",
  desktop: "A ready-to-use PC for office, study and home",
  processor: "Built for smooth gaming and fast multitasking",
  "graphics-card": "High-refresh gaming and faster creative work",
  motherboard: "A solid, upgrade-ready foundation for your build",
  ram: "Faster loads and smoother multitasking",
  ssd: "Quicker boots and near-instant load times",
  monitor: "Sharp, smooth visuals for work and play",
  "power-supply": "Clean, reliable power for your build",
  casing: "Room to build, with airflow that keeps it cool",
  ups: "Keeps your PC running through load-shedding",
  "keyboard-mouse": "Precise, comfortable control every day",
  headset: "Clear audio for games, calls and music",
  "cpu-cooler": "Keeps your processor cool and quiet",
  hdd: "Affordable bulk storage for files and backups",
  software: "Genuine license with official activation",
  "case-fan": "More airflow and lower temperatures",
  "wifi-adapter": "Fast, stable wireless for your PC",
  "pc-accessory": "The small part that finishes your build",
  "mouse-pad": "A smooth, consistent glide for your mouse",
  controller: "Comfortable control for PC and console games",
  microphone: "Clear voice for streaming, calls and recording",
};

/** one-sentence description */
export const summary = (p: Product) =>
  p.summary ?? (p.real ? `Genuine ${p.brand} ${p.catName ?? "product"} with ${warranty(p).toLowerCase()}, sold by Moharaz.` : undefined) ?? `${BLURB[p.cat] ?? "Everyday reliability"} — genuine ${p.brand} with ${warranty(p).toLowerCase()}.`;

const OFFER_LABELS = ["Flash Sale", "Hot Deal", "Mega Offer", "Weekend Deal"];
const DAY = 86_400_000;

/** label of the promotion running on this product, or null */
export function offerOf(p: Product) {
  if (p.offer) return p.offer.label;
  if (p.real) return null;
  return p.old && rnd(numId(p) + 11) < 0.6 ? OFFER_LABELS[Math.floor(rnd(numId(p) + 12) * OFFER_LABELS.length)] : null;
}

/** when the offer ends (ms) — the real date, or for demo offers a window that rolls over every 1–4 days */
export function offerEnd(p: Product, now: number) {
  if (p.offer) return new Date(p.offer.endsAt).getTime();
  const period = (1 + Math.floor(rnd(numId(p) + 13) * 4)) * DAY;
  const phase = Math.floor(rnd(numId(p) + 14) * period);
  return now + period - ((((now - phase) % period) + period) % period);
}

export type Question = { q: string; a: string };

/** customer questions answered for this product: a real product's own Q&A from the store (only those);
    demo products get 2–6 of the store's standard answers */
export function questions(p: Product): Question[] {
  if (p.real) return p.questionList ?? [];
  const pool = storeAnswers(p);
  return pool.slice(0, 2 + Math.floor(rnd(numId(p) + 21) * 5));
}

/** the store's standard answers (warranty, EMI, stock, delivery) — shown as "Common questions", apart from
    what customers asked */
export function storeAnswers(p: Product): Question[] {
  const w = warranty(p).toLowerCase();
  const pool: Question[] = [
    { q: "Does this come with an official warranty?", a: `Yes — ${w}. Contact our support team with your invoice to start a claim.` },
    { q: "Can I buy this on EMI?", a: "Yes, EMI is available with credit cards of our partner banks on orders over ৳5,000. Tap “View more” under Promotional information to see the monthly amounts." },
    {
      q: "Is it available at the showroom right now?",
      a: p.stock === "In stock" ? "Yes — it's in stock. Call 01805042474 to confirm."
        : p.stock === "Pre-order" ? "It's on pre-order — new stock arrives in 7–10 days and you can reserve one now."
        : "Not at the moment. Call 01805042474 and we'll let you know when the next shipment lands.",
    },
    { q: "How long does delivery take?", a: "Inside Dhaka within 24 hours; outside Dhaka 2–3 working days by courier." },
    p.condition === "New"
      ? { q: "Is it brand new and sealed?", a: "Yes — every unit is brand new in its original sealed box, with the invoice." }
      : { q: "Has it been tested?", a: `Yes — it's ${p.condition.toLowerCase()}, fully tested by our technicians and covered by ${w}.` },
    { q: "Do you give a better price on bulk orders?", a: "Yes — for corporate or bulk orders call 01805042474 for a quote." },
  ];
  return pool;
}

/* plural noun per category for the intro line */
const NOUN: Record<string, string> = {
  laptop: "laptops", desktop: "desktop PCs", processor: "processors", "graphics-card": "graphics cards", motherboard: "motherboards",
  ram: "RAM", ssd: "SSDs", monitor: "monitors", "power-supply": "power supplies", casing: "PC casings", ups: "UPS",
  "keyboard-mouse": "keyboards and mice", headset: "gaming headsets", "cpu-cooler": "CPU coolers", hdd: "hard disks",
  software: "software licenses", "case-fan": "case fans", "wifi-adapter": "WiFi adapters", "pc-accessory": "PC accessories",
  "mouse-pad": "mouse pads", controller: "game controllers", microphone: "microphones",
};

/** short intro under a category title, e.g. "Buy genuine processors from AMD and Intel …" */
export function categoryIntro(slug?: string) {
  const c = slug ? catBySlug(slug) : undefined;
  if (!c) return `Shop thousands of genuine computer products — laptops, PC parts, monitors and gaming gear — with official warranty, EMI and fast delivery across Bangladesh.`;
  if (c.description) return c.description;
  const count = new Map<string, number>();
  PRODUCTS.forEach((p) => p.cat === c.slug && count.set(p.brand, (count.get(p.brand) ?? 0) + 1));
  const brands = [...count.keys()].sort((a, b) => count.get(b)! - count.get(a)!).slice(0, 4);
  const list = brands.length > 1 ? `${brands.slice(0, -1).join(", ")} and ${brands.at(-1)}` : brands[0];
  return `Buy genuine ${NOUN[c.slug] ?? c.name.toLowerCase()}${list ? ` from ${list}` : ""} at the best price in Bangladesh. ${BLURB[c.slug] ?? "Everyday reliability"} — with official warranty, EMI and fast delivery.`;
}

/** homepage picks: the best-rated in-stock product of each category, so the grid shows a spread */
export const featuredProducts = (n = 12) =>
  CATEGORIES.flatMap((c) => PRODUCTS.filter((p) => p.cat === c.slug && p.stock === "In stock").sort((a, b) => rating(b).count - rating(a).count).slice(0, 1)).slice(0, n);
