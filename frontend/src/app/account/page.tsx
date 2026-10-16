import type { Metadata } from "next";
import { NOINDEX, seo } from "@/lib/seo";
import AccountView, { type Tab } from "@/components/account/AccountView";

export const metadata: Metadata = seo({ robots: NOINDEX, alternates: { canonical: "/account" }, title: "My Account" });

const TABS: Tab[] = ["dashboard", "orders", "wishlist", "payments", "profile"];

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const { tab } = await searchParams;
  const initial = TABS.find((t) => t === tab) ?? "dashboard";
  return <AccountView key={initial} initialTab={initial} />;
}
