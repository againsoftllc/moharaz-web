import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = seo({
  alternates: { canonical: "/warranty" },
  title: "Warranty Policy",
  description: "Moharaz warranty policy and how to claim it.",
});

export default function Page() {
  return <InfoPage slug="warranty" eyebrow="Warranty" description="Moharaz warranty policy and how to claim it." />;
}
