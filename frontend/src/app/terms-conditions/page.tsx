import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = seo({
  alternates: { canonical: "/terms-conditions" },
  title: "Terms & Conditions",
  description: "The terms that apply when you shop at Moharaz.",
});

export default function Page() {
  return <InfoPage slug="terms-conditions" eyebrow="Legal" description="The terms that apply when you shop at Moharaz." />;
}
