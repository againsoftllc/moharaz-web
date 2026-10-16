import type { Metadata } from "next";
import { NOINDEX, seo } from "@/lib/seo";
import CompareView from "@/components/compare/CompareView";

export const metadata: Metadata = seo({
  robots: NOINDEX,
  alternates: { canonical: "/compare" },
  title: "Product Comparison",
  description: "Compare up to 4 products side by side — price, availability and specifications.",
});

export default function ComparePage() {
  return <CompareView />;
}
