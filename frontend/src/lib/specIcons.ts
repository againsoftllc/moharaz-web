import { ic, type IconKey } from "./data";

/* Line icons for kinds of spec (speed, capacity, size…). Kept here rather than in `ic`, which also lists the
   icons the admin can give a category. Same 24×24 stroke style as `ic`. */
const SPEC_IC = {
  cores: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h16M12 4v16"/>',
  gauge: '<path d="m12 14 4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>',
  storage: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  sparkles: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4M17 5h4M5 17v4M3 19h4"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 0 0 0 20c1 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7H16a6 6 0 0 0 6-6c0-4.9-4.5-8.4-10-8.4z"/>',
  light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  plug: '<path d="M12 22v-5M9 8V2M15 8V2M18 8v5a6 6 0 0 1-12 0V8z"/>',
  ruler: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0z"/><path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  feather: '<path d="M20.2 12.2a6 6 0 0 0-8.5-8.5L5 10.5V19h8.5z"/><path d="M16 8 2 22M17.5 15H9"/>',
  speaker: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
  bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
} as const;

export type Glyph = IconKey | keyof typeof SPEC_IC;
export const glyphSvg = (g: Glyph): string => (g in SPEC_IC ? SPEC_IC[g as keyof typeof SPEC_IC] : ic[g as IconKey]);

/* [test on the whole highlight, label for a highlight that has none, icon] — first match wins, so specific
   rules come before broad ones (e.g. "53mm drivers" is audio, not a size; "3x ARGB fans" is cooling, not lighting) */
const KINDS: [RegExp, string, Glyph][] = [
  [/warranty/i, "Warranty", "shield"],
  [/licen[cs]e/i, "License", "shield"],
  [/\bRAM\b.*(SSD|HDD)/, "Memory & storage", "ram"],
  [/Processor$/, "Processor", "cpu"],
  [/Graphics$|GeForce|Radeon|Video memory/i, "Graphics", "gpu"],
  [/Cores \/ Threads|\d+C\/\d+T/, "Cores / Threads", "cores"],
  [/cache/i, "Cache", "layers"],
  [/upscaling|DLSS|\bFSR\b/i, "Upscaling", "sparkles"],
  [/sRGB|gamut/i, "Colour gamut", "palette"],
  [/Display$|refresh rate|resolution|panel|response time|curved|^\d+R$|HDR|FreeSync|G-Sync|\bQD\b|\bAIO\b|VESA|LCD/i, "Display", "mon"],
  [/memory type|DDR\d|CAS latency/i, "Memory", "ram"],
  [/capacity|\b\d+\s?(GB|TB)\b/i, "Capacity", "storage"],
  [/clock|GHz|RPM|speed|Gbps|MB\/s/i, "Speed", "gauge"],
  [/\bfans?\b|reverse blade|cooler type/i, "Cooling", "fan"],
  [/drivers?$/i, "Drivers", "speaker"],
  [/surround|virtual|DTS|Atmos/i, "Audio", "speaker"],
  [/polar|cardioid/i, "Pickup pattern", "mic"],
  [/\bDPI\b/i, "Sensor", "target"],
  [/^\d+(\.\d+)?\s?g$/, "Weight", "feather"],
  [/operating system|^windows|\bDOS\b/i, "Operating system", "os"],
  [/wi-?fi|bluetooth|dual band|wireless/i, "Connectivity", "wifi"],
  [/connectivity|interface|\bUSB|PCIe|wired|daisy-chain|extension cable|cabling/i, "Connectivity", "plug"],
  [/\bA?RGB\b/, "Lighting", "light"],
  [/^(black|white|silver|grey|gray|pink|blue|red)$/i, "Colour", "palette"],
  [/keyboard & mouse/i, "In the box", "kb"],
  [/^\d+%$|\bTKL\b|full size/i, "Layout", "kb"],
  [/^(PC|PS\d|Xbox|Switch|Android|Multi-platform)$/i, "Compatibility", "game"],
  [/switch(es)?$|cherry|hot-swap|light strike|HyperX Red|silent/i, "Switches", "kb"],
  [/\d+\s?(PC|user)s?$/i, "Devices", "users"],
  [/antivirus/i, "Protection", "shield"],
  [/\bpack$/i, "Pack", "box"],
  [/size|dimensions|\d+\s?mm\b/i, "Size", "ruler"],
  [/compact|mini pc|tower/i, "Form factor", "ruler"],
  [/glass|mesh|walnut|chamber/i, "Design", "case"],
  [/socket|form factor|\bAM\d|LGA\d/i, "Platform", "mb"],
  [/ATX \d\.\d/, "Standard", "psu"],
  [/UPS type/i, "Type", "ups"],
  [/output power|\d+\s?W$/i, "Power", "bolt"],
];

/** Label and icon for one product highlight; null when no rule knows it (the caller falls back to the category icon). */
export function specKind(h: string): { label: string; glyph: Glyph } | null {
  const k = KINDS.find(([re]) => re.test(h));
  return k ? { label: k[1], glyph: k[2] } : null;
}
