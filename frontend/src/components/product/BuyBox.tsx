"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { brandHref, type Brand } from "@/lib/brands";
import type { Bundle } from "@/lib/bundles";
import { tk } from "@/lib/data";
import { callForPrice, type Product, type ProductVariant } from "@/lib/products";
import { remember } from "@/lib/shop/registry";
import BrandLogo from "../brands/BrandLogo";
import { useCart } from "../cart/CartProvider";
import CompareButton from "../compare/CompareButton";
import { OfferTimer } from "../shop/Offer";
import { useWishlist } from "../wishlist/WishlistProvider";
import BundleDeal from "./BundleDeal";
import KeyFeatures from "./KeyFeatures";
import OptionPicker from "./OptionPicker";
import VariantPicker from "./VariantPicker";

function Acc({ title, icon, open: start = false, children }: { title: string; icon?: ReactNode; open?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(start);
  return (
    <div className={`pd-acc ${open ? "open" : ""}`}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}>{icon}<span>{title}</span><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg></button>
      {open && <div className="pd-acc-body">{children}</div>}
    </div>
  );
}

export default function BuyBox({ p, offer, variants, brand, bundle, brandCount }: {
  p: Product; offer?: string | null; variants: Product[]; brand?: Brand; bundle?: Bundle; brandCount: number;
}) {
  const { add, setDrawer } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const wish = useWishlist();
  const fav = wish.has(p.id);
  const [added, setAdded] = useState(false);
  // real products with options (Color, Switch Color…): the chosen variant sets the price and the cart line
  const [variant, setVariant] = useState<ProductVariant | undefined>(() => p.variants?.find((v) => v.isDefault) ?? p.variants?.[0]);
  const price = variant?.price ?? p.price;
  const ask = callForPrice(p);
  const out = p.stock === "Out of stock" || ask;

  useEffect(() => { remember(p); }, [p]);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1600);
    return () => clearTimeout(t);
  }, [added]);

  return (
    <div className="pd-buy">
      {offer && (
        <div className="pd-offer">
          <span className="pd-offer-l"><svg viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9z" /></svg><span><b>{offer}</b><em>Offer ends in</em></span></span>
          <OfferTimer p={p} big />
        </div>
      )}
      {bundle && <BundleDeal bundle={bundle} current={p.id} />}
      <div className="pd-price">
        {ask ? (
          <p className="pd-note">Price on request — call <a href="tel:+8801805042474"><b>01805042474</b></a> for today’s price.</p>
        ) : null}
        <div>
          {p.old && !ask && <span className="tt-save">Save {tk(p.old - price)} <em>-{Math.round((1 - price / p.old) * 100)}%</em></span>}
          <b>{ask ? "Call for price" : tk(price)}</b>
          {p.old && !ask && <s>Was {tk(p.old)}</s>}
        </div>
      </div>
      {(p.stock === "Pre-order" || p.condition !== "New") && (
        <div className="pd-badges">
          {p.stock === "Pre-order" && <span className="pd-badge warn">Pre-order · ETA 7–10 days</span>}
          {p.condition !== "New" && <span className="pd-badge">{p.condition}</span>}
        </div>
      )}

      <KeyFeatures p={p} />

      {p.variants ? <OptionPicker variants={p.variants} value={variant} onChange={setVariant} /> : <VariantPicker p={p} variants={variants} />}

      <div className="pd-cta">
        <div className="qty">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
          <input value={qty} inputMode="numeric" aria-label="Quantity" onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, "")); if (n > 0) setQty(Math.min(n, 20)); }} />
          <button onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Increase quantity">+</button>
        </div>
        <button className={`btn btn-red grow ${added ? "ok" : ""}`} disabled={out} onClick={() => { add(p.id, qty, variant); setAdded(true); setDrawer(true); }}>
          {ask ? "Call 01805042474 for price" : out ? "Out of stock" : added ? "Added to cart ✓" : "Add to cart →"}
        </button>
        <button className={`icon-btn fav-btn ${fav ? "on" : ""}`} onClick={() => wish.toggle(p.id)} aria-pressed={fav} aria-label={fav ? "Remove from wishlist" : "Add to wishlist"}>
          <svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" /></svg>
        </button>
      </div>
      <div className="pd-cta2">
        <button className="btn btn-line" disabled={out} onClick={() => { add(p.id, qty, variant); router.push("/checkout"); }}>Buy now</button>
        <CompareButton id={p.id} p={p} variant="text" />
      </div>

      <div className="pd-accs">
        <Acc title="Promotional information" open icon={<span className="pd-acc-ic">%</span>}>
          <ul>
            {!ask && <li><b>0% EMI</b> on credit cards of 29 banks — {tk(Math.round(price / 12))}/mo for 12 months.</li>}
            {p.old && !ask && <li>Online price saves you <b>{tk(p.old - price)}</b> (offer valid while stock lasts).</li>}
            {bundle && <li>Part of the <Link href={`/bundles/${bundle.slug}`}>{bundle.name}</Link> — buy together and save {bundle.pct}%.</li>}
            <li>Free assembly & testing when you build a PC with our <Link href="/pc-builder">PC Builder</Link>.</li>
          </ul>
        </Acc>
        <Acc title="Confirm availability">
          <p>{p.stock === "In stock" ? "Available now." : p.stock === "Pre-order" ? "Arriving in 7–10 days — pre-order to reserve one." : "Currently out of stock — call us for the next shipment date."}</p>
          <p>Call <a href="tel:+8801805042474"><b>01805042474</b></a> (10am–8pm) to confirm before visiting.</p>
        </Acc>
      </div>

      {brand && (
        <Link href={brandHref(brand)} className="pd-brand">
          <BrandLogo b={brand} />
          <span><small>From this brand</small><b>{brand.name}</b>{brandCount > 0 && <em>{brandCount.toLocaleString("en-US")} products</em>}</span>
          <span className="go">Browse all →</span>
        </Link>
      )}
    </div>
  );
}
