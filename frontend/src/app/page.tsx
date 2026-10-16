import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import Hero from "@/components/Hero";
import JsonLd from "@/components/JsonLd";
import { Brands, Categories, FeaturedProducts, LatestPosts } from "@/components/Sections";
import { storeLd } from "@/lib/schema";
import { getHomeSlides } from "@/lib/shop/api";

// the live moharaz.com home title and description
export const metadata: Metadata = seo({
  title: { absolute: "MOHARAZ - Computer, Mobile and Gadget Shop in BD" },
  description: "Shop at Moharaz for top-quality computers, mobiles, and gadgets in Bangladesh. Best prices on laptops, smartphones, and accessories with fast delivery!",
  alternates: { canonical: "/" },
});
/* category counts and new arrivals come from the catalogue API — refresh every minute */
export const revalidate = 60;

export default async function Home() {
  // the slider's slides from AgainERP (images in R2); null = the built-in ones
  const slides = await getHomeSlides();
  return (
    <>
      <JsonLd data={storeLd()} />
      <Hero slides={slides} />
      <Categories />
      <FeaturedProducts />
      <Brands />
      <LatestPosts />
    </>
  );
}
