/* The shop's public address — the ONE place it is written. Canonical URLs (metadataBase), structured data, the
   sitemap fallback and printed / displayed text all read it from here; links between the shop's own pages are
   always relative ("/x") and never need it. Set NEXT_PUBLIC_SITE_URL to run the shop under another domain. */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.moharaz.com").replace(/\/+$/, "");

/** "www.moharaz.com" — for text such as the printed quotation and the admin's URL hints */
export const SITE_HOST = new URL(SITE_URL).host;
