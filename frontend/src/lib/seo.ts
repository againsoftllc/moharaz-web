import type { Metadata } from "next";

export const SITE_NAME = "Moharaz";

/** shared Open Graph fields; the root layout uses them and seo() repeats them on every page */
export const OG_DEFAULTS: NonNullable<Metadata["openGraph"]> = {
  siteName: SITE_NAME,
  type: "website",
  locale: "en_BD",
  images: [{ url: "/moharaz-logo-og.png", alt: SITE_NAME }],
};

/** Cart, checkout, account and the like: kept out of search results, links still followed. */
export const NOINDEX: Metadata["robots"] = { index: false, follow: true };

/** A page's metadata with a complete Open Graph block. In Next.js a page's own `openGraph` replaces the root
    layout's, and a page without one inherits the root's (which has no url), so og:url, og:type, site name and
    locale went missing. Fills them in: url = the page's canonical, then the root defaults, then the page's own. */
export function seo(m: Metadata): Metadata {
  const canonical = m.alternates?.canonical;
  const url = typeof canonical === "string" ? canonical : canonical instanceof URL ? canonical.toString() : undefined;
  return { ...m, openGraph: { ...OG_DEFAULTS, ...(url ? { url } : {}), ...m.openGraph } as Metadata["openGraph"] };
}
