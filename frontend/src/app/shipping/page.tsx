import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = seo({
  alternates: { canonical: "/shipping" },
  title: "Online Delivery",
  description: "Moharaz online delivery terms across Bangladesh.",
});

export default function Page() {
  return <InfoPage slug="shipping" eyebrow="Delivery" description="Moharaz online delivery terms across Bangladesh." />;
}
