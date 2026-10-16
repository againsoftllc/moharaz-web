import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = seo({
  alternates: { canonical: "/refund" },
  title: "Return & Refund Policy",
  description: "Moharaz return and refund policy.",
});

export default function Page() {
  return <InfoPage slug="refund" eyebrow="Returns" description="Moharaz return and refund policy." />;
}
