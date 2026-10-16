"use client";

import { useCart } from "./CartProvider";

export default function Qty({ id, qty }: { id: string; qty: number }) {
  const { setQty } = useCart();
  return (
    <div className="qty">
      {/* never drops below 1 — removing a line is its own button */}
      <button onClick={() => setQty(id, Math.max(qty - 1, 1))} disabled={qty <= 1} aria-label="Decrease quantity">−</button>
      <input
        value={qty}
        inputMode="numeric"
        aria-label="Quantity"
        onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, "")); if (n > 0) setQty(id, Math.min(n, 99)); }}
      />
      <button onClick={() => setQty(id, Math.min(qty + 1, 99))} aria-label="Increase quantity">+</button>
    </div>
  );
}
