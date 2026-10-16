import type { Metadata } from "next";
import { NOINDEX, seo } from "@/lib/seo";
import CheckoutView from "@/components/checkout/CheckoutView";
import { COUPONS, SHIPPING, type ShipKey } from "@/lib/checkout";

export const metadata: Metadata = seo({ robots: NOINDEX, alternates: { canonical: "/checkout" }, title: "Checkout" });

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const sp = await searchParams;
  const coupon = typeof sp.coupon === "string" && COUPONS[sp.coupon.toUpperCase()] ? sp.coupon.toUpperCase() : undefined;
  const ship = typeof sp.ship === "string" && sp.ship in SHIPPING ? (sp.ship as ShipKey) : undefined;
  return <CheckoutView initialCoupon={coupon} initialShip={ship} />;
}
