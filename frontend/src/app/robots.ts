import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { siteBase } from "@/lib/sitemap";

/* the sitemap address follows the host robots.txt was requested on (localhost locally, the shop's domain live) */
export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin", "/account", "/cart", "/checkout", "/login", "/register", "/api/",
        // listing views that only re-sort or filter a category (its canonical is the plain listing); ?page= stays crawlable
        "/*?*sort=", "/*?*per=", "/*?*spec=", "/*?*brand=", "/*?*stock=", "/*?*min=", "/*?*max=", "/*?*q=",
        // AI search answers (the question rides along in the URL)
        "/*?*ai=",
      ],
    },
    sitemap: `${siteBase({ headers: await headers() })}/sitemap.xml`,
  };
}
