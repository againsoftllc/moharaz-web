import type { AdminCategory } from "./types";

export const slugify =(s: string) => s.toLowerCase().replace(/["']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/* categories and products both live at /{slug}, so a slug can't take the name of a top-level page in src/app */
export const RESERVED_SLUGS = new Set(["all", "about", "about-us", "admin", "blog", "brand", "brands", "bundles", "cart", "category", "checkout", "compare", "contact", "emi", "help", "login", "pc-builder", "privacy", "product", "refund", "register", "shipping", "terms", "warranty"]);

/** 1,284 → "1.3K", 4_200_000 → "4.2M" */
export const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

/** "3 min ago", "2 days ago" */
export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const [n, unit] = s < 3600 ? [s / 60, "min"] : s < 86400 ? [s / 3600, "hour"] : [s / 86400, "day"];
  const v = Math.floor(n);
  return `${v} ${unit}${v > 1 && unit !== "min" ? "s" : ""} ago`;
}

export type Schedule = "live" | "scheduled" | "ended" | "off";
/** Where an offer is in its start / end window ("" = open-ended). */
export function scheduleOf(on: boolean, startsAt: string, endsAt: string, now = Date.now()): Schedule {
  if (!on) return "off";
  if (startsAt && new Date(startsAt).getTime() > now) return "scheduled";
  if (endsAt && new Date(endsAt).getTime() < now) return "ended";
  return "live";
}

/** A category's banners, reading the single `banner` that older saves still carry. */
export const bannersOf = (c: AdminCategory) => c.banners ?? (c.banner ? [c.banner] : []);

export const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Move item at i by d (-1 up, +1 down) and renumber `order` from 1. */
export function move<T extends { order: number }>(list: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next.map((x, k) => ({ ...x, order: k + 1 }));
}
