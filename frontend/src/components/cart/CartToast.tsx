"use client";

import { useEffect } from "react";
import { tk } from "@/lib/data";
import { useCart } from "./CartProvider";
import LineArt from "./LineArt";

/** Small "added to cart" toast, bottom-right (above the bottom bar on phones). */
export default function CartToast() {
  const { notice, dismissNotice, drawer, setDrawer } = useCart();

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(dismissNotice, 3000);
    return () => clearTimeout(id);
  }, [notice, dismissNotice]);

  // the open drawer already shows what was added
  if (!notice || drawer) return null;
  const { line, n } = notice;
  return (
    <div className="cart-toast" role="status" key={notice.id}>
      <span className="ct-img"><LineArt line={line} /></span>
      <span className="ct-txt">
        <small><svg viewBox="0 0 24 24"><path d="m5 12 5 5L20 7" /></svg>{n > 1 ? `${n} items added to cart` : "Added to cart"}</small>
        <b title={line.name}>{line.name}</b>
        <em>{tk(line.price)}</em>
      </span>
      <button className="ct-view" onClick={() => { dismissNotice(); setDrawer(true); }}>View cart</button>
      <button className="ct-x" aria-label="Dismiss" onClick={dismissNotice}><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
      <i className="ct-bar" />
    </div>
  );
}
