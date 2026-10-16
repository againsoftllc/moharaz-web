import type { NextConfig } from "next";

/* the AgainERP admin shows this shop in an iframe (Website → Live Edit / preview) */
const ADMIN_ORIGINS = [
  "http://localhost:3260",
  "http://127.0.0.1:3260",
  ...(process.env.NEXT_PUBLIC_ADMIN_ORIGIN ?? "").split(",").map((s) => s.trim()).filter(Boolean),
];

const nextConfig: NextConfig = {
  /* Next streams metadata after the page shell to clients it thinks run JavaScript (Googlebot included), so on slow
     pages <title>, description and canonical landed in <body>. Every client gets them in <head>, as Bing and SEO
     tools expect. */
  htmlLimitedBots: /.*/,
  /* images are served as they are, not through Vercel's image optimizer: its quota on this account runs out
     (every /_next/image request then fails with 402) and the shop's images are already web-sized — product
     photos from the media library, banners as WebP */
  images: { unoptimized: true },
  headers() {
    // X-Robots-Tag: when several rules match, the last one wins — so: every page, then private pages, then any vercel.app host
    const robots = (value: string) => [{ key: "X-Robots-Tag", value }];
    return [
      { source: "/:path*", headers: [{ key: "Content-Security-Policy", value: `frame-ancestors 'self' ${[...new Set(ADMIN_ORIGINS)].join(" ")}` }] },
      { source: "/:path*", headers: robots("index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1") },
      ...["/cart", "/checkout", "/compare", "/login", "/register", "/account/:path*"].map((source) => ({ source, headers: robots("noindex, follow") })),
      { source: "/admin/:path*", headers: robots("noindex, nofollow") },
      /* the shop's own static pictures (banners, logos, brand marks): the files are replaced under new names or
         carry ?dpl= per deployment, so browsers may keep them for a month instead of re-checking every visit */
      ...["/:file(banner-[^/]+\.webp)", "/:file(moharaz-logo[^/]*\.(?:png|webp))", "/banners/:path*", "/brands/:path*", "/payments/:path*"].map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }],
      })),
      // the *.vercel.app addresses must not compete in search with the shop's own domain (canonical URLs point there)
      { source: "/:path*", has: [{ type: "host" as const, value: "(?<sub>.*)\\.vercel\\.app" }], headers: robots("noindex, nofollow") },
    ];
  },
  /* categories and products moved from /category/{slug} and /product/{slug} to /{slug}, brands from /brands to /brand;
     keep old links and saved banner/menu hrefs working */
  redirects() {
    return [
      { source: "/category/:slug", destination: "/:slug", permanent: true },
      { source: "/product/:slug", destination: "/:slug", permanent: true },
      { source: "/brands", destination: "/brand", permanent: true },
      // slug characters only: /brands/{slug}.svg logos in public/ must not be redirected
      { source: "/brands/:slug([a-z0-9-]+)", destination: "/:slug", permanent: true },
      // pages renamed (#section anchors carry over)
      { source: "/about", destination: "/about-us", permanent: true },
      { source: "/help", destination: "/contact-us", permanent: true },
      { source: "/emi", destination: "/", permanent: true },
      { source: "/terms", destination: "/terms-conditions", permanent: true },
      { source: "/privacy", destination: "/privacy-policy", permanent: true },
      { source: "/contact", destination: "/contact-us", permanent: true },
    ];
  },
};

export default nextConfig;
