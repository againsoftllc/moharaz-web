"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { COUPONS, SHIPPING, discountFor, type ShipKey } from "@/lib/checkout";
import { tk } from "@/lib/data";
import CompareButton from "../compare/CompareButton";
import ConfirmDialog from "../ConfirmDialog";
import LineArt from "./LineArt";
import { stockClass } from "@/lib/products";
import { useCart } from "./CartProvider";
import Qty from "./Qty";

export default function CartView() {
  const { lines, count, subtotal, remove, clear, ready } = useCart();
  const router = useRouter();
  const [zone, setZone] = useState<ShipKey | "">("");
  const [delivery, setDelivery] = useState<ShipKey | null>(null);
  const [code, setCode] = useState("");
  const [promo, setPromo] = useState<{ code: string; pct: number } | null>(null);
  const [promoMsg, setPromoMsg] = useState("");
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const cancelEmpty = useCallback(() => setConfirmEmpty(false), []);

  const discount = discountFor(subtotal, promo?.code);
  const ship = delivery ? SHIPPING[delivery].fee : 0;
  const total = subtotal - discount + ship;

  const applyCode = () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    if (COUPONS[c]) { setPromo({ code: c, pct: COUPONS[c] }); setPromoMsg(`${c} applied — ${COUPONS[c]}% off`); }
    else { setPromo(null); setPromoMsg("That code isn't valid. Try MOHARAZ10."); }
  };

  if (!ready) return <div className="wrap cart-page" />;

  return (
    <div className="wrap cart-page">
      <nav className="crumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><b>Cart</b></nav>
      <div className="shop-head">
        <div><span className="eyebrow">Your order so far</span><h1>Shopping Cart</h1></div>
        <Link href="/all" className="cont">Continue shopping</Link>
      </div>

      {!lines.length ? (
        <div className="empty big">
          <svg viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6" /></svg>
          <b>Your cart is empty</b>
          <p>Browse our categories and tap the cart icon on any product to add it here.</p>
          <Link href="/all" className="btn btn-red">Browse products</Link>
        </div>
      ) : (
        <div className="cart-grid">
          <div>
            <ul className="cart-list">
              {lines.map((p) => (
                <li key={p.key}>
                  <Link href={p.href} className="thumb"><LineArt line={p} /></Link>
                  <div className="ci">
                    <span className="cat-tag">{p.label}</span>
                    <span className="nm">{p.name}</span>
                    <span className="each">{tk(p.price)} each{p.bundle && <> · <s>{tk(p.bundle.total)}</s> <em className="save-tag">Save {tk(p.bundle.save)}</em></>}</span>
                    {p.bundle && <span className="b-items">{p.bundle.items.map((i) => i.name).join(" + ")}</span>}
                    {p.bundle?.gifts && <span className="b-gift">Free gift{p.bundle.gifts.length > 1 ? "s" : ""}: {p.bundle.gifts.map((g) => `${g.name} (${tk(g.value)})`).join(" + ")}</span>}
                    <span className="bd-meta"><span className={`stk ${stockClass(p.stock)}`}>{p.stock}</span>{p.product && <CompareButton id={p.product.id} p={p.product} variant="text" />}</span>
                    <Qty id={p.key} qty={p.qty} />
                  </div>
                  <div className="cr">
                    <b>{tk(p.price * p.qty)}</b>
                    <button type="button" className="rm-link" onClick={() => remove(p.key)}><svg viewBox="0 0 24 24" aria-hidden><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" /></svg>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
            <button className="btn btn-line empty-cart" onClick={() => setConfirmEmpty(true)}>
              <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>Empty cart
            </button>
          </div>

          <aside className="cart-side">
            <div className="side-card sum">
              <h6 className="side-h">Summary · {count} item{count > 1 ? "s" : ""}</h6>
              <div><span>Subtotal</span><span>{tk(subtotal)}</span></div>
              {promo && <div className="disc"><span>Promo {promo.code}</span><span>−{tk(discount)}</span></div>}
              <div><span>Delivery</span><span>{delivery ? (ship ? tk(ship) : "Free") : "Not calculated"}</span></div>
              <div className="tot"><span>Total</span><b>{tk(total)}</b></div>
              <button className="btn btn-red go" onClick={() => {
                const sp = new URLSearchParams();
                if (promo) sp.set("coupon", promo.code);
                if (delivery) sp.set("ship", delivery);
                const s = sp.toString();
                router.push(s ? `/checkout?${s}` : "/checkout");
              }}>Proceed to checkout<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>
              <p className="emi-note">or from <b>{tk(Math.round(total / 12))}/mo</b> with 0% EMI</p>
            </div>

            <div className="side-card">
              <h6 className="side-h">Calculate delivery</h6>
              <div className="inline">
                <select value={zone} onChange={(e) => setZone(e.target.value as ShipKey | "")} aria-label="Delivery area">
                  <option value="">Select area</option>
                  {(Object.keys(SHIPPING) as ShipKey[]).map((k) => <option key={k} value={k}>{SHIPPING[k].label}</option>)}
                </select>
                <button className="btn btn-line" onClick={() => setDelivery(zone || null)} disabled={!zone}>Estimate</button>
              </div>
              {delivery && <p className="note">{SHIPPING[delivery].label}: {ship ? tk(ship) : "Free"} · {SHIPPING[delivery].eta}</p>}
            </div>

            <div className="side-card">
              <h6 className="side-h">Gift certificate or promo code</h6>
              <div className="inline">
                <input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyCode()} placeholder="Enter code" aria-label="Promo code" />
                <button className="btn btn-line" onClick={applyCode}>Apply</button>
              </div>
              {promoMsg && <p className={`note ${promo ? "good" : "bad"}`}>{promoMsg}</p>}
            </div>
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={confirmEmpty}
        tone="danger"
        title="Empty your cart?"
        message={<>All <b>{count} item{count > 1 ? "s" : ""}</b> will be removed from your cart. This can&apos;t be undone.</>}
        confirmLabel="Yes, empty cart"
        cancelLabel="Keep my items"
        onConfirm={() => { clear(); setConfirmEmpty(false); }}
        onCancel={cancelEmpty}
      >
        <div className="cf-sum">
          <div className="cf-thumbs">
            {lines.slice(0, 6).map((p) => <span key={p.key} title={p.name}><LineArt line={p} /></span>)}
            {lines.length > 6 && <span className="more">+{lines.length - 6}</span>}
          </div>
          <div className="cf-total"><small>Cart total</small><b>{tk(subtotal)}</b></div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
