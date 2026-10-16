import type { Metadata } from "next";
import { NOINDEX, seo } from "@/lib/seo";
import CartView from "@/components/cart/CartView";

export const metadata: Metadata = seo({ robots: NOINDEX, alternates: { canonical: "/cart" }, title: "Shopping Cart" });

export default function CartPage() {
  return <CartView />;
}
