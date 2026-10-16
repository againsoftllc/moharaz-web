import type { IconKey } from "./data";

export type Block = { h: string } | { p: string } | { ul: string[] } | { tip: string };
export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  /** the post's category (AgainERP blog category name) */
  tag: string;
  categorySlug?: string;
  date: string;
  updated?: string;
  /** reading time; unknown on list items (they come without the text) */
  mins?: number;
  author: string;
  icon: IconKey;
  color: string;
  /** featured photo in /public; the generated cover is used when empty */
  cover?: string;
  /** shop categories to suggest under the article */
  shop: string[];
  body: Block[];
  /** the article as HTML (posts from AgainERP; `body` is empty then) */
  html?: string;
  /** catalogue products the post features */
  productIds?: string[];
  seoTitle?: string;
  seoDescription?: string;
};

/* Sample articles — replace with real posts. */
export const POSTS: Post[] = []; // posts come from the AgainERP blog API

export const postBySlug = new Map(POSTS.map((p) => [p.slug, p]));
export const BLOG_TAGS = ["Guides", "Buying Advice", "News"] as const;
export const fmtDate = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const headingId = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
