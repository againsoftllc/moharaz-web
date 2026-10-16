import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = seo({
  alternates: { canonical: "/about-us" },
  title: "About Moharaz",
  description: "Moharaz — your trusted destination for tech & gadgets in Bangladesh.",
});

export default function Page() {
  return <InfoPage slug="about-us" eyebrow="About us" description="Moharaz — your trusted destination for tech & gadgets in Bangladesh." />;
}
