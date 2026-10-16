import { sitemapIndex } from "@/lib/sitemap";

/* real catalogue + the requested origin (lib/sitemap.ts) — rendered per request */
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return sitemapIndex(req);
}
