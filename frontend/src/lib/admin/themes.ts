import type { BundleType } from "../bundles";

/** A starting point for a bundle offer: which kinds of parts go in it, a sensible discount and its colours. */
export type BundleTheme = {
  id: string;
  name: string;
  type: BundleType;
  blurb: string;
  /** category slug per item slot, in order */
  slots: string[];
  pct: number;
  /** offer card gradient + accent */
  from: string;
  to: string;
  accent: string;
};

export const BUNDLE_THEMES: BundleTheme[] = [
  { id: "gaming-core", name: "Gaming Core", type: "Gaming", blurb: "Processor, motherboard and memory for a new gaming platform.", slots: ["processor", "motherboard", "ram"], pct: 10, from: "#12020a", to: "#E3121B", accent: "#FFB020" },
  { id: "gpu-power", name: "GPU Power Upgrade", type: "Upgrade", blurb: "A graphics card with a power supply sized to match.", slots: ["graphics-card", "power-supply"], pct: 7, from: "#052e16", to: "#16a34a", accent: "#A3E635" },
  { id: "office-pro", name: "Office Essentials", type: "Office", blurb: "A reliable core for office and study PCs, with fast storage.", slots: ["processor", "motherboard", "ssd"], pct: 8, from: "#020617", to: "#1D4ED8", accent: "#38BDF8" },
  { id: "peripheral-setup", name: "Peripheral Setup", type: "Peripherals", blurb: "Monitor, keyboard & mouse and a headset — the full desk.", slots: ["monitor", "keyboard-mouse", "headset"], pct: 12, from: "#042f2e", to: "#0f766e", accent: "#2DD4BF" },
  { id: "streamer", name: "Streamer Studio", type: "Peripherals", blurb: "Microphone, headset and a fast keyboard for going live.", slots: ["microphone", "headset", "keyboard-mouse"], pct: 11, from: "#1a0b2e", to: "#7c3aed", accent: "#EC4899" },
  { id: "storage-boost", name: "Storage Boost", type: "Upgrade", blurb: "A fast NVMe boot drive plus bulk storage.", slots: ["ssd", "hdd"], pct: 9, from: "#1c0a02", to: "#c2410c", accent: "#FFB020" },
  { id: "power-backup", name: "Load-shedding Ready", type: "Office", blurb: "A monitor with a UPS to ride through power cuts.", slots: ["monitor", "ups"], pct: 8, from: "#1c1917", to: "#a16207", accent: "#FDE047" },
  { id: "blank", name: "Start from scratch", type: "Gaming", blurb: "Pick any products and colours yourself.", slots: [], pct: 5, from: "#18181b", to: "#52525b", accent: "#E3121B" },
];
export const themeById = new Map(BUNDLE_THEMES.map((t) => [t.id, t]));
export const themeOf = (id: string) => themeById.get(id) ?? BUNDLE_THEMES[BUNDLE_THEMES.length - 1];

/** Best-fitting theme for existing items: most slot categories in common, same type breaks ties. */
export function themeFor(cats: string[], type: BundleType) {
  let best = BUNDLE_THEMES[BUNDLE_THEMES.length - 1], score = 0;
  for (const t of BUNDLE_THEMES) {
    const s = t.slots.filter((c) => cats.includes(c)).length * 2 + (t.type === type ? 1 : 0);
    if (s > score) { best = t; score = s; }
  }
  return best;
}
