import type { Post } from "./blog";
import type { Brand } from "./brands";
import type { Bundle } from "./bundles";
import { SHIPPING } from "./checkout";
import { catBySlug, productHref, type Product } from "./products";
import { sku, summary } from "./productInfo";
import { FACEBOOK_URL, YOUTUBE_URL } from "./socials";
import { BRANCHES, PHONES, WA_URL } from "./stores";
import { SITE_URL } from "./site";

/* schema.org structured data (JSON-LD) shared by the pages. Nodes link to each other by @id. */

/** the shop's public address (lib/site.ts — the one place it is set) */
export const SITE = SITE_URL;
export const abs = (path: string) => (path.startsWith("http") ? path : path === "/" ? SITE : SITE + path);

export const ORG_ID = `${SITE}/#organization`;
export const SITE_ID = `${SITE}/#website`;
export const STORE_ID = `${SITE}/#store`;
const LOGO = abs("/moharaz-logo.png");

type Node = Record<string, unknown>;
type Crumb = [name: string, path: string];

/** `dangerouslySetInnerHTML` payload — `<` escaped so a string can't close the script tag */
export const ldHtml = (data: Node | Node[]) => ({ __html: JSON.stringify(data).replace(/</g, "\\u003c") });

const tel = (n: string) => `+880${n.replace(/\D/g, "").replace(/^0/, "")}`;
const address = (street: string) => ({ "@type": "PostalAddress", streetAddress: street, addressLocality: "Dhaka", postalCode: "1207", addressCountry: "BD" });
const HOURS = [{ "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: "10:00", closes: "20:00" }];

export function siteLd(): Node[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": ORG_ID,
      name: "Moharaz",
      alternateName: "Moharaz BD",
      url: SITE,
      logo: { "@type": "ImageObject", url: LOGO, width: 250, height: 83 },
      sameAs: [FACEBOOK_URL, YOUTUBE_URL],
      contactPoint: PHONES.map(([label, n]) => ({ "@type": "ContactPoint", contactType: label, telephone: tel(n), areaServed: "BD", availableLanguage: ["en", "bn"] })),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": SITE_ID,
      name: "Moharaz",
      url: SITE,
      inLanguage: "en-BD",
      publisher: { "@id": ORG_ID },
      potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${SITE}/all?q={search_term_string}` }, "query-input": "required name=search_term_string" },
    },
  ];
}

export function storeLd(): Node {
  const shop = BRANCHES[0];
  return {
    "@context": "https://schema.org",
    "@type": "ElectronicsStore",
    "@id": STORE_ID,
    name: "Moharaz",
    url: SITE,
    image: LOGO,
    logo: LOGO,
    telephone: tel(shop.phone),
    priceRange: "৳৳",
    currenciesAccepted: "BDT",
    paymentAccepted: "Cash, bKash, Nagad, Visa, Mastercard, AMEX, EMI",
    address: address(shop.address.replace(/, Dhaka 1207, Bangladesh$/, "")),
    openingHoursSpecification: HOURS,
    hasMap: `https://www.google.com/maps?q=${encodeURIComponent(shop.mapQuery)}`,
    parentOrganization: { "@id": ORG_ID },
    sameAs: [FACEBOOK_URL, YOUTUBE_URL, WA_URL],
  };
}

export function breadcrumbLd(items: Crumb[]): Node {
  const all: Crumb[] = [["Home", "/"], ...items];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(path) })),
  };
}

/** a plain page (policies, help, …): WebPage + its breadcrumb */
export function pageLd(path: string, name: string, description?: string, type = "WebPage"): Node[] {
  return [
    { "@context": "https://schema.org", "@type": type, "@id": `${abs(path)}#webpage`, url: abs(path), name, ...(description ? { description } : {}), isPartOf: { "@id": SITE_ID }, publisher: { "@id": ORG_ID }, inLanguage: "en-BD" },
    breadcrumbLd([[name, path]]),
  ];
}

const availability = (p: Product) => `https://schema.org/${p.stock === "In stock" ? "InStock" : p.stock === "Pre-order" ? "PreOrder" : "OutOfStock"}`;
const condition = (p: Product) => `https://schema.org/${p.condition === "New" ? "NewCondition" : p.condition === "Refurbished" ? "RefurbishedCondition" : "UsedCondition"}`;

/* Merchant listing fields Google asks for on every offer: delivery (the checkout's rates, lib/checkout) and the
   return policy on /refund — report within 3 days, at the showroom or by courier, return delivery paid by the buyer. */
const days = (min: number, max: number) => ({ "@type": "QuantitativeValue", minValue: min, maxValue: max, unitCode: "DAY" });
const SHIPPING_LD = [
  { region: "Dhaka", rate: SHIPPING.dhaka.fee, handling: days(0, 1), transit: days(0, 1) },
  { region: undefined, rate: SHIPPING.outside.fee, handling: days(0, 1), transit: days(2, 3) },
].map((s) => ({
  "@type": "OfferShippingDetails",
  shippingRate: { "@type": "MonetaryAmount", value: s.rate, currency: "BDT" },
  shippingDestination: { "@type": "DefinedRegion", addressCountry: "BD", ...(s.region ? { addressRegion: s.region } : {}) },
  deliveryTime: { "@type": "ShippingDeliveryTime", handlingTime: s.handling, transitTime: s.transit },
}));
const RETURN_POLICY_LD = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "BD",
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: 3,
  returnMethod: ["https://schema.org/ReturnInStore", "https://schema.org/ReturnByMail"],
  returnFees: "https://schema.org/ReturnShippingFees",
  merchantReturnLink: abs("/refund"),
};

export function productLd(p: Product): Node[] {
  const cat = catBySlug(p.cat);
  const url = abs(productHref(p));
  const rated = !!(p.real && p.rating && p.rating.count > 0);
  const crumbs = breadcrumbLd([...(cat ? [[cat.name, `/${cat.slug}`] as Crumb] : []), [p.name, productHref(p)]]);
  // Google needs offers, review or aggregateRating on a Product: a "call for price" product without
  // reviews has none of them, so it only gets its breadcrumb (no ৳0 offer as the old shop showed)
  if (p.price <= 0 && !rated) return [crumbs];
  return [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `${url}#product`,
      name: p.name,
      url,
      sku: sku(p),
      // the gallery (catalogue products), else the single demo image
      ...(p.images?.length ? { image: p.images.slice(0, 5).map(abs) } : p.image ? { image: abs(p.image) } : {}),
      description: summary(p),
      brand: { "@type": "Brand", name: p.brand },
      ...(cat ? { category: cat.name } : {}),
      // "call for price" (price 0) has no price to state — a ৳0 offer would be flagged as invalid
      ...(p.price > 0 ? {
        offers: {
          "@type": "Offer",
          url,
          priceCurrency: "BDT",
          price: p.price,
          ...(p.offer?.endsAt ? { priceValidUntil: p.offer.endsAt.slice(0, 10) } : {}),
          availability: availability(p),
          itemCondition: condition(p),
          seller: { "@id": ORG_ID },
          shippingDetails: SHIPPING_LD,
          hasMerchantReturnPolicy: RETURN_POLICY_LD,
        },
      } : {}),
      // approved customer reviews (as the old shop marked them up): the star rating in search results
      ...(rated && p.rating ? {
        aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating.avg, reviewCount: p.rating.count, bestRating: 5, worstRating: 1 },
        ...(p.reviewList?.length ? {
          review: p.reviewList.slice(0, 5).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.name },
            datePublished: r.date,
            reviewBody: r.text,
            reviewRating: { "@type": "Rating", ratingValue: r.stars, bestRating: 5, worstRating: 1 },
          })),
        } : {}),
      } : {}),
    },
    crumbs,
  ];
}

/** a product listing (category, brand): CollectionPage whose main entity lists the products */
export function listingLd(path: string, name: string, description: string, products: Product[], crumbs: Crumb[], about?: Node): Node[] {
  const url = abs(path);
  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${url}#webpage`,
      url,
      name,
      description,
      isPartOf: { "@id": SITE_ID },
      ...(about ? { about } : {}),
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: products.length,
        itemListElement: products.slice(0, 50).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: abs(productHref(p)), name: p.name })),
      },
    },
    breadcrumbLd(crumbs),
  ];
}

export const brandNode = (b: Brand): Node => ({ "@type": "Brand", name: b.name });

export function bundleLd(b: Bundle): Node[] {
  const url = abs(`/bundles/${b.slug}`);
  const image = b.items.find((p) => p.image)?.image;
  return [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `${url}#product`,
      name: b.name,
      url,
      sku: `BUNDLE-${b.slug.toUpperCase()}`,
      description: `${b.tagline} Includes ${b.items.map((p) => p.name).join(", ")}.`,
      ...(image ? { image: abs(image) } : {}),
      isRelatedTo: b.items.map((p) => ({ "@type": "Product", name: p.name, url: abs(productHref(p)) })),
      offers: {
        "@type": "Offer",
        url,
        priceCurrency: "BDT",
        price: b.price,
        availability: b.items.every((p) => p.stock === "In stock") ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
        itemCondition: "https://schema.org/NewCondition",
        seller: { "@id": ORG_ID },
      },
    },
    breadcrumbLd([["Bundles", "/bundles"], [b.name, `/bundles/${b.slug}`]]),
  ];
}

export function postLd(post: Post): Node[] {
  const url = abs(`/blog/${post.slug}`);
  return [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      url,
      headline: post.title,
      description: post.excerpt,
      ...(post.cover ? { image: abs(post.cover) } : {}),
      datePublished: post.date,
      dateModified: post.updated ?? post.date,
      articleSection: post.tag,
      ...(post.mins ? { timeRequired: `PT${post.mins}M` } : {}),
      inLanguage: "en-BD",
      author: { "@type": "Organization", name: post.author, url: SITE },
      publisher: { "@id": ORG_ID },
      isPartOf: { "@id": `${SITE}/blog#blog` },
    },
    breadcrumbLd([["Blog", "/blog"], [post.title, `/blog/${post.slug}`]]),
  ];
}

export function blogLd(posts: Post[]): Node[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Blog",
      "@id": `${SITE}/blog#blog`,
      url: abs("/blog"),
      name: "Moharaz Blog",
      description: "Buying guides, tips and news from Moharaz, Bangladesh.",
      publisher: { "@id": ORG_ID },
      inLanguage: "en-BD",
      blogPost: posts.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: abs(`/blog/${p.slug}`), datePublished: p.date, ...(p.cover ? { image: abs(p.cover) } : {}) })),
    },
    breadcrumbLd([["Blog", "/blog"]]),
  ];
}

export function contactLd(): Node[] {
  return [
    ...pageLd("/contact-us", "Contact Us", "Support contacts and head office for Moharaz.", "ContactPage"),
    ...BRANCHES.map((b, i) => ({
      "@context": "https://schema.org",
      "@type": i === 0 ? "ElectronicsStore" : "LocalBusiness",
      ...(i === 0 ? { "@id": STORE_ID } : {}),
      name: i === 0 ? "Moharaz" : `Moharaz ${b.name}`,
      url: abs("/contact-us"),
      image: LOGO,
      telephone: tel(b.phone),
      address: address(b.address.replace(/, Dhaka 1207, Bangladesh$/, "")),
      openingHoursSpecification: HOURS,
      hasMap: `https://www.google.com/maps?q=${encodeURIComponent(b.mapQuery)}`,
      parentOrganization: { "@id": ORG_ID },
    })),
  ];
}
