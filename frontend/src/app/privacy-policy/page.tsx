import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = seo({
  alternates: { canonical: "/privacy-policy" },
  title: "Privacy Policy",
  description: "How Moharaz collects, uses and protects your personal information.",
});

export default function Page() {
  return <InfoPage slug="privacy-policy" eyebrow="Legal" description="How Moharaz collects, uses and protects your personal information." />;
}
