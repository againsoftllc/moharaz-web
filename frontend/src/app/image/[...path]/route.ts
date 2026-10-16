import { findLegacyImage } from "@/lib/shop/api";

/* The previous shop served product photos at /image/catalog/… (and resized copies at /image/cache/…).
   Google Images and other sites still link there: 301 to the imported copy, 404 when there is none. */
export const runtime = "nodejs";

type Ctx = { params: Promise<{ path: string[] }> };

/* Google Images and old pages ask for the same tens of thousands of addresses over and over. Without a cache header
   every one of those requests ran this function (and an API call); with one, Vercel's CDN answers repeats itself —
   a week for a found photo, an hour for a missing one (it may be imported later). */
const FOUND = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000";
const MISSING = "public, max-age=300, s-maxage=3600";

export async function GET(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const url = await findLegacyImage(path.join("/"));
  if (!url) return new Response("Not found", { status: 404, headers: { "Cache-Control": MISSING } });
  return new Response(null, { status: 301, headers: { Location: new URL(url, req.url).toString(), "Cache-Control": FOUND } });
}

export const HEAD = GET;
