/* A listing page's URL query (category, search, brand pages) ⇄ the API filters it stands for.
   Shared by the server pages (first render) and CategoryView (filter changes in the browser). */

import type { Product } from "../products";
import type { Facets, ListQuery } from "./api";

/** "default": what a shopper can buy first — in stock, then call for price, then pre-order / coming soon,
    then out of stock (newest first inside each); the API's "availability" sort */
export const SORTS = [
  ["default", "Default"],
  ["newest", "Newest"],
  ["price-asc", "Price: Low to High"],
  ["price-desc", "Price: High to Low"],
] as const;
export type Sort = (typeof SORTS)[number][0];
export const API_SORT: Record<Sort, ListQuery["sort"]> = { default: "availability", newest: "newest", "price-asc": "price_asc", "price-desc": "price_desc" };
export const PER_PAGE = [12, 24, 48];

/** URL query of a listing: brand = brand slugs, stock=in = in stock only, and one readable parameter per spec
    filter — /motherboard?socket=am5&chipset=amd-b650&special-feature=wi-fi,m-2 → filters { socket: ["am5"] … }.
    spec = the older "code:value" list (links shared before), still read. */
export type Query = Partial<Record<"q" | "brand" | "spec" | "stock" | "min" | "max" | "sort" | "per" | "page", string>> & {
  filters?: Record<string, string[]>;
};

/** a filter value in a URL: "AMD B650" → "amd-b650", "M.2" → "m-2", "FM2+" → "fm2plus" (the API compares the same way) */
export const valueSlug = (v: string) => v.trim().toLowerCase().replace(/\+/g, "plus").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
/** a filter's URL parameter: special_feature → special-feature */
export const filterParam = (code: string) => code.replace(/_/g, "-");
/** a listing's own parameters; any other one is a spec filter, except tracking tags and the AI search */
const LISTING_KEYS = new Set(["q", "brand", "spec", "stock", "min", "max", "sort", "per", "page"]);
const NOT_A_FILTER = /^(utm_|fbclid$|gclid$|gbraid$|wbraid$|msclkid$|ttclid$|ref$|ai$|_)/i;

/** the category a listing shows (from the API); intro = its meta description */
export type ShopCategory = { slug: string; name: string; intro?: string | null };

export type Listing = { items: Product[]; total: number; facets: Facets | null };

export const list = (v?: string) => (v ? v.split(",").filter(Boolean) : []);
export const num = (v?: string) => (v && !isNaN(+v) ? v : "");

/** the old "socket:AM5,socket:LGA1700" → { socket: ["am5", "lga1700"] } */
function parseSpec(v?: string) {
  const out: Record<string, string[]> = {};
  for (const pair of list(v)) {
    const at = pair.indexOf(":");
    if (at > 0) (out[pair.slice(0, at)] ??= []).push(valueSlug(pair.slice(at + 1)));
  }
  return out;
}

/** a listing's selected spec filters (code → value slugs), from its own parameters and an old spec= list */
function specFilters(query: Query) {
  const out = parseSpec(query.spec);
  for (const [code, vs] of Object.entries(query.filters ?? {})) {
    for (const v of vs) if (!(out[code] ??= []).includes(v)) out[code].push(v);
  }
  return out;
}

/** the URL parameters of selected spec filters: { special_feature: ["wi-fi", "m-2"] } → special-feature=wi-fi,m-2 */
export const filterParams = (attrs: Record<string, string[]>): [string, string][] =>
  Object.entries(attrs).filter(([, vs]) => vs.length).map(([code, vs]) => [filterParam(code), vs.join(",")]);

/** the API filters a listing's URL query stands for */
export function listQuery(slug: string, query: Query, brand?: string): ListQuery {
  const sort = SORTS.some((s) => s[0] === query.sort) ? (query.sort as Sort) : "default";
  return {
    category: slug === "all" ? undefined : slug,
    brand,
    brands: brand ? undefined : list(query.brand),
    search: (query.q ?? "").trim() || undefined,
    attrs: specFilters(query),
    priceMin: +num(query.min) || undefined,
    priceMax: +num(query.max) || undefined,
    inStock: query.stock === "in" || undefined,
    sort: API_SORT[sort],
    page: Math.max(1, +(query.page ?? 1) || 1),
    perPage: PER_PAGE.includes(+(query.per ?? 0)) ? +query.per! : 12,
  };
}

/** read a page's searchParams into a listing Query: its own keys, and every other parameter as a spec filter */
export function readQuery(sp: Record<string, string | string[] | undefined>, keys: readonly Exclude<keyof Query, "filters">[]): Query {
  const query: Query = {};
  for (const k of keys) {
    const v = sp[k];
    if (typeof v === "string") query[k] = v;
  }
  for (const [param, v] of Object.entries(sp)) {
    if (typeof v !== "string" || LISTING_KEYS.has(param) || NOT_A_FILTER.test(param)) continue;
    const values = list(v).map(valueSlug).filter(Boolean);
    if (values.length) (query.filters ??= {})[param.replace(/-/g, "_")] = values;
  }
  return query;
}

/** whether a listing query narrows the list (filters, search, price, stock) rather than only sorting or paging */
export const isFiltered = (query: Query) =>
  !!(query.q || query.brand || query.spec || query.stock || query.min || query.max || Object.keys(query.filters ?? {}).length);
