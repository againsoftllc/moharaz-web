"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { rememberBundles, type Bundle } from "@/lib/bundles";
import { remember } from "@/lib/shop/registry";
import { useCart } from "../cart/CartProvider";
import Qty from "../cart/Qty";

const CartSvg = () => (
  <svg viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6" /></svg>
);
const Tick = () => <svg viewBox="0 0 24 24"><path d="m5 12 5 5L20 7" /></svg>;

/**
 * icon: compact cart-icon button (cards).
 * default: quantity + "Add bundle to cart" + "Buy now" (detail page).
 */
export default function AddBundle({ bundle, icon, disabled }: { bundle: Bundle; icon?: boolean; disabled?: boolean }) {
  const { addBundle: addToCart, lines, setDrawer } = useCart();
  const slug = bundle.slug;
  // the cart finds the bundle (and its products) by slug, also after a reload
  const addBundle = (s: string, qty?: number) => {
    rememberBundles(bundle);
    remember(...bundle.items);
    addToCart(s, qty);
  };
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);
  const inCart = lines.find((l) => l.key === `b:${slug}`);

  useEffect(() => {
    if (!added) return;
    const id = setTimeout(() => setAdded(false), 1400);
    return () => clearTimeout(id);
  }, [added]);

  if (icon) {
    return (
      <button className={`addc ${added ? "done" : ""}`} disabled={disabled} aria-label="Add bundle to cart" title={disabled ? "Out of stock" : "Add bundle to cart"}
        onClick={() => { addBundle(slug); setAdded(true); }}>
        {added ? <Tick /> : <CartSvg />}
      </button>
    );
  }

  return (
    <div className="buy">
      <div className="buy-row">
        <div className="qty">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
          <input value={qty} inputMode="numeric" aria-label="Quantity" onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, "")); if (n > 0) setQty(Math.min(n, 99)); }} />
          <button onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="Increase quantity">+</button>
        </div>
        <button className={`btn btn-red grow ${added ? "ok" : ""}`} disabled={disabled} onClick={() => { addBundle(slug, qty); setAdded(true); setDrawer(true); }}>
          {added ? <><Tick />Added to cart</> : <><CartSvg />Add bundle to cart</>}
        </button>
      </div>
      <button className="btn btn-line" disabled={disabled} onClick={() => { addBundle(slug, qty); router.push("/checkout"); }}>Buy now</button>
      {inCart && <p className="in-cart">In your cart: {inCart.qty} × this bundle · <span><Qty id={inCart.key} qty={inCart.qty} /></span></p>}
    </div>
  );
}
