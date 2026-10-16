"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { tk } from "@/lib/data";
import { highlights, offerOf } from "@/lib/productInfo";
import { callForPrice, productHref, stockClass, type Product } from "@/lib/products";
import { remember } from "@/lib/shop/registry";
import { useCart } from "../cart/CartProvider";
import CompareButton from "../compare/CompareButton";
import { useWishlist } from "../wishlist/WishlistProvider";
import { OfferSeal, OfferTimer } from "./Offer";
import ProductArt from "./ProductArt";

export default function ProductCard({ p, eager }: { p: Product; eager?: boolean }) {
  const { add } = useCart();
  const wish = useWishlist();
  const fav = wish.has(p.id);
  const [added, setAdded] = useState(false);
  const ask = callForPrice(p);
  const out = p.stock === "Out of stock" || ask;
  const offer = offerOf(p);

  // real products: let the cart / wishlist / compare find this one by id later
  useEffect(() => { remember(p); }, [p]);

  useEffect(() => {
    if (!added) return;
    const id = setTimeout(() => setAdded(false), 1400);
    return () => clearTimeout(id);
  }, [added]);

  return (
    <article className="prod">
      <button className={`fav ${fav ? "on" : ""}`} aria-label={fav ? "Remove from wishlist" : "Add to wishlist"} aria-pressed={fav} onClick={() => wish.toggle(p.id)}>
        <svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" /></svg>
      </button>
      <CompareButton id={p.id} p={p} />
      {p.old && !ask && <span className="off">-{Math.round((1 - p.price / p.old) * 100)}%</span>}
      {p.condition !== "New" && <span className="cond">{p.condition}</span>}
      {/* the offer strip sits on the photo, so cards with and without an offer keep the same layout */}
      <div className="pmedia">
        <Link href={productHref(p)} className="pimg" tabIndex={-1} aria-hidden>
          <ProductArt p={p} eager={eager} />
          {offer && <OfferSeal label={offer} />}
        </Link>
        {offer && <p className="poffer"><span><svg viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9z" /></svg>{offer}</span><span>Ends in <OfferTimer p={p} /></span></p>}
      </div>
      <h3 title={p.name}><Link href={productHref(p)}>{p.name}</Link></h3>
      <ul className="pbul">{highlights(p).map((h, i) => <li key={`${i}-${h}`} title={h}>{h}</li>)}</ul>
      <div className="pfoot">
        <div>
          <span className={`stk ${stockClass(p.stock)}`}>{p.stock}</span>
          <div className="pprice">{ask ? <b>Call for price</b> : <><b>{tk(p.price)}</b>{p.old && <s>{tk(p.old)}</s>}</>}</div>
        </div>
        <button
          className={`addc ${added ? "done" : ""}`}
          aria-label={ask ? "Call for price" : out ? "Out of stock" : "Add to cart"}
          title={ask ? "Call for price" : out ? "Out of stock" : "Add to cart"}
          disabled={out}
          onClick={() => { add(p.id); setAdded(true); }}
        >
          {added
            ? <svg viewBox="0 0 24 24"><path d="m5 12 5 5L20 7" /></svg>
            : <svg viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6" /></svg>}
        </button>
      </div>
    </article>
  );
}
