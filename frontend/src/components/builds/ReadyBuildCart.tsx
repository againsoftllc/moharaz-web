"use client";

import { useState } from "react";
import { getReadyBuild, productById, readyBuildParts } from "@/lib/shop/api";
import { remember } from "@/lib/shop/registry";
import { useCart } from "../cart/CartProvider";
import { Cart } from "../Icon";

/** the cart button on a ready-build card: puts the build's default parts in the cart */
export default function ReadyBuildCart({ slug, name }: { slug: string; name: string }) {
  const { add, setDrawer } = useCart();
  const [busy, setBusy] = useState(false);
  const addBuild = async () => {
    setBusy(true);
    try {
      const build = await getReadyBuild(slug);
      if (!build) return;
      const products = (await Promise.all(readyBuildParts(build).map((p) => productById(p.productId)))).filter((p) => p !== null);
      remember(...products);
      products.forEach((p) => add(p.id));
      if (products.length) setDrawer(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" className="icon-btn" aria-label={`Add ${name} to cart`} title="Add to cart" disabled={busy} onClick={() => void addBuild()}>
      <Cart />
    </button>
  );
}
