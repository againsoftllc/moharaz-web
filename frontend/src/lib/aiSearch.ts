/* AI search: the search box sends a question ("১ লাখের মধ্যে RTX 4060 ল্যাপটপ", "asus monitor under 30k") to the
   AgainERP API, where GPT turns it into catalogue filters (category, brands, price range, a model/spec term, sort)
   that are checked against the real catalogue. The answer becomes the ordinary listing URL, so the results are the
   normal, filterable listing; ?ai= carries the question for the banner above it. Without an OpenAI key in the ERP the
   status says off and the box keeps its plain search. */

export type AiFilters = {
  category_slug: string | null;
  category_name: string | null;
  brand_slugs: string[];
  brand_names: string[];
  price_min: number | null;
  price_max: number | null;
  keyword: string | null;
  in_stock: boolean;
  sort: "relevance" | "price-asc" | "price-desc" | "newest";
};

export type AiResult = { query: string; summary: string; filters: AiFilters; relaxed: string[]; total: number };

let status: Promise<boolean> | null = null;

/** whether the ERP has AI search on (asked once per page load) */
export const aiEnabled = () =>
  (status ??= fetch("/api/v1/storefront/ai-search/status")
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { data?: { enabled?: boolean } } | null) => !!j?.data?.enabled)
    .catch(() => false));

export async function aiSearch(query: string): Promise<AiResult | null> {
  try {
    const r = await fetch("/api/v1/storefront/ai-search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: query.trim().slice(0, 200) }),
    });
    if (!r.ok) return null;
    return ((await r.json()) as { data: AiResult | null }).data;
  } catch {
    return null;
  }
}

/** a sentence rather than a product name: Bangla, three or more words, or price / budget words */
export const looksLikeQuestion = (q: string) => {
  const t = q.trim();
  return /[ঀ-৿]/.test(t) || t.split(/\s+/).length >= 3 ||
    /\b(under|below|within|less than|above|over|more than|around|budget|cheap|cheapest|best|lakh|lac|hazar|taka|tk|bdt|\d+\s?k)\b/i.test(t);
};

/** the listing URL the answer stands for (the same query keys CategoryView reads) */
export function aiHref(r: AiResult) {
  const f = r.filters;
  const sp = new URLSearchParams();
  if (f.keyword) sp.set("q", f.keyword);
  if (f.brand_slugs.length) sp.set("brand", f.brand_slugs.join(","));
  if (f.price_min) sp.set("min", String(f.price_min));
  if (f.price_max) sp.set("max", String(f.price_max));
  if (f.in_stock) sp.set("stock", "in");
  if (f.sort !== "relevance") sp.set("sort", f.sort);
  sp.set("ai", r.query);
  if (r.summary) sp.set("ai_note", r.summary);
  if (r.relaxed.length) sp.set("ai_relaxed", r.relaxed.join(","));
  return `${f.category_slug ? `/${f.category_slug}` : "/all"}?${sp}`;
}
