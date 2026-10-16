"use client";

import Link from "next/link";
import { useEffect } from "react";
import { tk } from "@/lib/data";
import LineArt from "./LineArt";
import { useCart } from "./CartProvider";
import Qty from "./Qty";

export default function CartDrawer() {
  const { lines, count, subtotal, remove, drawer, setDrawer } = useCart();
  const close = () => setDrawer(false);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer, setDrawer]);

  return (
    <>
      <div className={`scrim ${drawer ? "on" : ""}`} onClick={close} />
      <aside className={`drawer ${drawer ? "on" : ""}`} aria-label="Your cart" aria-hidden={!drawer} inert={!drawer}>
        <div className="dr-head">
          <b>Your Cart{count ? <span> · {count} item{count > 1 ? "s" : ""}</span> : null}</b>
          <Link href="/cart" className="ib" aria-label="View full cart" title="View full cart" onClick={close}>
            <svg viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
          </Link>
          <button className="ib" aria-label="Close cart" onClick={close}><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        </div>

        {lines.length ? (
          <>
            <ul className="dr-list">
              {lines.map((p) => (
                <li key={p.key}>
                  <Link href={p.href} className="thumb" onClick={close}><LineArt line={p} /></Link>
                  <div className="dr-info">
                    <span className="nm">{p.bundle && <em className="btag">Bundle</em>}{p.name}</span>
                    {p.bundle?.gifts && <span className="b-gift">+ Free {p.bundle.gifts.map((g) => g.name).join(" & ")}</span>}
                    <span className="each">{tk(p.price)} each</span>
                    <div className="dr-row"><Qty id={p.key} qty={p.qty} /><b>{tk(p.price * p.qty)}</b></div>
                  </div>
                  <button className="rm" aria-label={`Remove ${p.name}`} onClick={() => remove(p.key)}><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg></button>
                </li>
              ))}
            </ul>
            <div className="dr-foot">
              <div className="dr-sub"><span>Subtotal</span><b>{tk(subtotal)}</b></div>
              <p>VAT included. Delivery calculated at checkout.</p>
              <div className="dr-btns">
                <Link href="/cart" className="btn btn-line" onClick={close}>View full cart</Link>
                <Link href="/checkout" className="btn btn-red" onClick={close}>Checkout</Link>
              </div>
              <button className="dr-cont" onClick={close}>Continue shopping</button>
            </div>
          </>
        ) : (
          <div className="dr-empty">
            <svg viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6" /></svg>
            <p>Your cart is empty.</p>
            <Link href="/all" className="btn btn-red" onClick={close}>Browse products</Link>
          </div>
        )}
      </aside>
    </>
  );
}
