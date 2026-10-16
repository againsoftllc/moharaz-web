/* The shop's public address — the ONE place it is read. Canonical URLs (metadataBase), structured data, the
   sitemap fallback and printed / displayed text all read it from here; links between the shop's own pages are
   always relative ("/x") and never need it. Nothing is hard-coded: NEXT_PUBLIC_SITE_URL wins, else the deployment's
   own production domain (Vercel sets it — the custom domain once one is attached), else the deployment URL, else
   the local dev server. */

const asUrl = (v?: string) => (v ? (/^https?:\/\//.test(v) ? v : `https://${v}`) : "");

export const SITE_URL = (
  asUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
  asUrl(process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
  asUrl(process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL) ||
  "http://localhost:3100"
).replace(/\/+$/, "");

/** the host of SITE_URL — for text such as the printed quotation and the admin's URL hints */
export const SITE_HOST = new URL(SITE_URL).host;
