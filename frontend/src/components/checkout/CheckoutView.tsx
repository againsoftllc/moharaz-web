"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { COUPONS, DISTRICTS, GIFTS, PAYMENTS, SHIPPING, discountFor, shipFor, type Order, type PayKey, type ShipKey } from "@/lib/checkout";
import { placeOrder, sslcommerzAvailable, startSslcommerz, type OrderLine } from "@/lib/account";
import { tk } from "@/lib/data";
import { useAuth } from "../auth/AuthProvider";
import { lineItems, useCart } from "../cart/CartProvider";
import { setTrackingUser, track } from "@/lib/tracking";
import LineArt from "../cart/LineArt";
import Qty from "../cart/Qty";
import Together from "./Together";
import PaymentLogos from "../PaymentLogos";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const BD_PHONE = /^(?:\+?88)?01[3-9]\d{8}$/;

function Field({ label, error, req = true, children }: { label: string; error?: string; req?: boolean; children: ReactNode }) {
  return (
    <label className={`co-f ${error ? "err" : ""}`}>
      <span>{label}{req && <i>*</i>}</span>
      {children}
      {error && <small role="alert">{error}</small>}
    </label>
  );
}

const districtOptions = Object.entries(DISTRICTS).map(([division, list]) => (
  <optgroup key={division} label={`${division} Division`}>{list.map((d) => <option key={d}>{d}</option>)}</optgroup>
));

function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return <section className={`co-card ${className}`}><h2>{title}</h2>{children}</section>;
}

export default function CheckoutView({ initialCoupon, initialShip }: { initialCoupon?: string; initialShip?: ShipKey }) {
  const { lines, subtotal, remove, clear, ready } = useCart();
  const { user } = useAuth();

  const [f, setF] = useState({ name: "", email: "", phone: "", address: "", region: "Dhaka", same: true, dAddress: "", dRegion: "Dhaka" });
  const [ship, setShip] = useState<ShipKey>(initialShip ?? "dhaka");
  const [pay, setPay] = useState<PayKey>("cod");
  const [codesOpen, setCodesOpen] = useState(false);
  const [couponIn, setCouponIn] = useState(initialCoupon ?? "");
  const [coupon, setCoupon] = useState(initialCoupon ?? "");
  const [giftIn, setGiftIn] = useState("");
  const [gift, setGift] = useState("");
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(initialCoupon ? { ok: true, text: `${initialCoupon} applied from your cart` } : null);
  const [comment, setComment] = useState("");
  const [agree, setAgree] = useState(true);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<Order | null>(null);
  // online payment goes through SSLCOMMERZ when its plugin is on; otherwise the team sends a payment link
  const [sslOk, setSslOk] = useState(false);
  const [payNote, setPayNote] = useState("");
  useEffect(() => {
    sslcommerzAvailable().then(setSslOk).catch(() => setSslOk(false));
  }, []);

  // Meta InitiateCheckout / GA4 begin_checkout once the saved cart is known
  const checkoutTracked = useRef(false);
  useEffect(() => {
    if (!ready || checkoutTracked.current || !lines.length) return;
    checkoutTracked.current = true;
    track("InitiateCheckout", { items: lineItems(lines) });
  }, [ready, lines]);

  // prefill from the signed-in account once it's known
  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setF((o) => ({ ...o, name: o.name || user.name, email: o.email || user.email, phone: o.phone || user.phone }));
  }, [user]);

  const set = (k: keyof typeof f) => (v: string | boolean) => { setF((o) => ({ ...o, [k]: v })); setErrs((e) => ({ ...e, [k]: "" })); };
  // picking the delivery district picks the matching shipping method (Dhaka → inside Dhaka, else → courier)
  const setDistrict = (k: "region" | "dRegion") => (v: string) => {
    set(k)(v);
    if ((k === "region") === f.same) setShip(shipFor(v));
  };
  const setSame = (same: boolean) => {
    set("same")(same);
    setShip(shipFor(same ? f.region : f.dRegion));
  };

  // delivery rules: in-city delivery and cash on delivery only inside Dhaka
  const region = f.same ? f.region : f.dRegion;
  const inDhaka = region === "Dhaka";
  const shipEff: ShipKey = ship === "dhaka" && !inDhaka ? "outside" : ship;
  const codOk = shipEff !== "outside";
  const payEff: PayKey = pay === "cod" && !codOk ? "online" : pay;

  const discount = discountFor(subtotal, coupon);
  const giftAmt = gift ? Math.min(GIFTS[gift] ?? 0, subtotal - discount) : 0;
  const shipFee = SHIPPING[shipEff].fee;
  const total = Math.max(0, subtotal - discount - giftAmt) + shipFee;
  const saved = lines.reduce((s, l) => s + ((l.product?.old ?? l.bundle?.total ?? l.price) - l.price) * l.qty, 0) + discount + giftAmt;

  const applyCoupon = () => {
    const c = couponIn.trim().toUpperCase();
    if (!c) return;
    if (COUPONS[c]) { setCoupon(c); setCodeMsg({ ok: true, text: `${c} applied — ${COUPONS[c]}% off` }); }
    else { setCoupon(""); setCodeMsg({ ok: false, text: "That coupon isn't valid. Try MOHARAZ10." }); }
  };
  const applyGift = () => {
    const c = giftIn.trim().toUpperCase();
    if (!c) return;
    if (GIFTS[c]) { setGift(c); setCodeMsg({ ok: true, text: `Gift certificate ${c} applied — ${tk(GIFTS[c])} off` }); }
    else { setGift(""); setCodeMsg({ ok: false, text: "That gift certificate isn't valid. Try GIFT500." }); }
  };

  const confirm = () => {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = "Enter your full name";
    if (f.email.trim() && !EMAIL.test(f.email.trim())) e.email = "Enter a valid email, or leave it empty";
    if (!BD_PHONE.test(f.phone.replace(/[\s-]/g, ""))) e.phone = "Enter a valid mobile number, e.g. 01712345678";
    if (f.address.trim().length < 6) e.address = "Enter your full address";
    if (!f.same && f.dAddress.trim().length < 6) e.dAddress = "Enter the delivery address";
    if (!agree) e.agree = "Please accept the Privacy Policy and Terms & Conditions";
    setErrs(e);
    if (Object.keys(e).length) {
      document.querySelector(".co-f.err, .co-agree.err")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(true);
    setErrs({});
    // the order goes to AgainERP: a webshop order + sales order the team sees in the admin, and in the
    // customer's account (signed in, or matched by phone / email)
    const orderLines: OrderLine[] = lines.flatMap((l): OrderLine[] => {
      if (l.product) {
        const [, variantId] = l.key.slice(2).split("~");
        return [{ itemId: String(l.product.id), variantId, qty: l.qty }];
      }
      if (l.bundle) return l.bundle.items.map((p, i) => ({ itemId: String(p.id), qty: l.qty * (l.bundle!.quantities?.[i] ?? 1) }));
      return [];
    });
    const extras = [
      ...lines.filter((l) => l.service).map((l) => `Service: ${l.name} × ${l.qty}`),
      ...lines.filter((l) => l.bundle).map((l) => `Bundle: ${l.name} × ${l.qty}`),
      gift ? `Gift certificate: ${gift}` : "",
      payEff === "online" && !sslOk ? "Wants to pay online (card / bKash / Nagad) — send a payment link" : "",
      comment.trim(),
    ].filter(Boolean);
    void placeOrder({
      lines: orderLines,
      name: f.name.trim(),
      phone: f.phone,
      email: (user?.email || f.email.trim()) || undefined,
      address: f.address.trim(),
      district: f.region,
      shipping: f.same ? undefined : { address: f.dAddress.trim(), district: f.dRegion },
      shippingMethod: "standard",
      paymentMethod: payEff === "cod" ? "cod" : sslOk ? "sslcommerz" : "bank",
      couponCode: coupon || undefined,
      notes: extras.join(" · ") || undefined,
    })
      .then((res) => {
        const order: Order = {
          id: res.order_number,
          date: new Date().toISOString(),
          name: f.name.trim(),
          email: (user?.email || f.email.trim()) || undefined,
          status: "pending",
          paid: false,
          phone: f.phone,
          total: Number(res.grand_total) || total,
          items: lines.map((l) => ({ name: l.name, qty: l.qty, price: l.price })),
          ship: shipEff,
          pay: payEff,
        };
        // the buyer's contact makes the Conversions API match better (sent hashed)
        setTrackingUser({ email: order.email, phone: order.phone, name: order.name });
        track("Purchase", { orderId: order.id, items: lineItems(lines), value: order.total });
        clear();
        if (payEff === "online" && sslOk) {
          return startSslcommerz(res.id)
            .then((url) => { window.location.href = url; })
            .catch((err) => {
              setPayNote(`${err instanceof Error ? err.message : "Couldn't open the payment page"} — we'll send you a secure payment link instead.`);
              setPlaced(order);
              window.scrollTo({ top: 0, behavior: "smooth" });
            });
        }
        setPlaced(order);
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch((err) => {
        setErrs({ submit: err instanceof Error ? err.message : "Couldn't place the order — please try again or call us." });
      })
      .finally(() => setBusy(false));
  };

  const exclude = useMemo(() => lines.flatMap((l) => (l.product ? [l.product.id] : l.bundle ? l.bundle.items.map((p) => p.id) : [])), [lines]);
  const cats = useMemo(() => [...new Set(lines.flatMap((l) => (l.product ? [l.product.cat] : l.bundle ? l.bundle.items.map((p) => p.cat) : ["processor"])))], [lines]);

  if (!ready) return <div className="wrap co-page" />;

  if (placed) {
    return (
      <div className="wrap co-page">
        <div className="co-done">
          <span className="co-tick"><svg viewBox="0 0 24 24"><path d="m5 12 5 5L20 7" /></svg></span>
          <span className="eyebrow">Order received</span>
          <h1>Thank you, {placed.name.split(" ")[0]}!</h1>
          <p>Your order <b>{placed.id}</b> has been placed. Our team will call <b>{placed.phone}</b> within 12 working hours to confirm.</p>
          <ul>
            {placed.items.map((i, n) => <li key={`${n}-${i.name}`}><span>{i.qty} × {i.name}</span><b>{tk(i.price * i.qty)}</b></li>)}
            <li className="tot"><span>Total · {PAYMENTS[placed.pay].label} · {SHIPPING[placed.ship].label}</span><b>{tk(placed.total)}</b></li>
          </ul>
          <p className="co-demo">
            {placed.pay === "cod" ? "Pay in cash when your order arrives." : payNote || "We'll send you a secure payment link when we confirm your order."}
            {user ? <> Track it any time in <Link href="/account?tab=orders">My orders</Link>.</> : null}
          </p>
          <div className="co-done-btns"><Link href="/" className="btn btn-line">Back to home</Link><Link href="/all" className="btn btn-red">Continue shopping</Link></div>
        </div>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="wrap co-page">
        <nav className="crumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/cart">Shopping Cart</Link><span>/</span><b>Checkout</b></nav>
        <div className="empty big">
          <svg viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6" /></svg>
          <h1 className="empty-h">Your cart is empty</h1>
          <p>Add some products before checking out.</p>
          <Link href="/all" className="btn btn-red">Browse products</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="wrap co-page">
        <nav className="crumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/cart">Shopping Cart</Link><span>/</span><b>Checkout</b></nav>

        <div className="co-notice" role="note">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
          <p>ঢাকার বাইরে কুরিয়ারে ডেলিভারি পেতে নির্দিষ্ট পরিমাণ অগ্রিম পরিশোধ করতে হবে। কুরিয়ার খরচ ক্রেতা বহন করবে। প্রোডাক্ট ডেলিভারি পাওয়ার পর চেক এবং আনবক্সিং ভিডিও করার অনুরোধ করা হলো। কোন সমস্যা হলে ১২ ঘন্টার মধ্যে হটলাইনে ফোন করুন। <b>(ঢাকার বাইরে &apos;ক্যাশ অন ডেলিভারি&apos; প্রযোজ্য নয়।)</b></p>
        </div>

        <div className="shop-head co-head">
          <div><span className="eyebrow">Almost there</span><h1>Quick Checkout</h1></div>
          <ol className="co-steps"><li className="done">Cart</li><li className="on">Details &amp; payment</li><li>Confirmation</li></ol>
        </div>

        <div className="co-grid">
          <div className="co-left">
            <Card title="Your personal details">
              <Field label="Full name" error={errs.name}><input value={f.name} onChange={(e) => set("name")(e.target.value)} placeholder="Your full name" autoComplete="name" /></Field>
              <Field label="E-mail (optional)" error={errs.email} req={false}><input value={f.email} onChange={(e) => set("email")(e.target.value)} placeholder="you@example.com" inputMode="email" autoComplete="email" /></Field>
              <Field label="Telephone" error={errs.phone}><input value={f.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" autoComplete="tel" /></Field>
              {!user && <p className="co-hint">Have an account? <Link href="/login">Log in</Link> to fill this in faster.</p>}
            </Card>

            <Card title="Billing address">
              <Field label="Address" error={errs.address} req><input value={f.address} onChange={(e) => set("address")(e.target.value)} placeholder="House, road, area" autoComplete="street-address" /></Field>
              <Field label="District"><select value={f.region} onChange={(e) => setDistrict("region")(e.target.value)}>{districtOptions}</select></Field>
              <label className="agree"><input type="checkbox" checked={f.same} onChange={(e) => setSame(e.target.checked)} /><span className="box" /><span>My delivery and billing addresses are the same.</span></label>
              {!f.same && (
                <div className="co-delivery">
                  <h3>Delivery address</h3>
                  <Field label="Address" error={errs.dAddress}><input value={f.dAddress} onChange={(e) => set("dAddress")(e.target.value)} placeholder="House, road, area" /></Field>
                  <Field label="District"><select value={f.dRegion} onChange={(e) => setDistrict("dRegion")(e.target.value)}>{districtOptions}</select></Field>
                </div>
              )}
            </Card>

            <div className="co-trust">
              <span><svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>SSL secured checkout</span>
              <span><svg viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5z" /><path d="m9 12 2 2 4-4" /></svg>100% genuine, official warranty</span>
              <span><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>12-hour issue reporting</span>
            </div>
          </div>

          <div className="co-right">
            <div className="co-pair">
              <Card title="Shipping method">
                {(Object.keys(SHIPPING) as ShipKey[]).map((k) => {
                  const off = k === "dhaka" && !inDhaka;
                  return (
                    <label key={k} className={`co-opt ${shipEff === k ? "on" : ""} ${off ? "off" : ""}`}>
                      <input type="radio" name="ship" checked={shipEff === k} disabled={off} onChange={() => setShip(k)} />
                      <i />
                      <span><b>{SHIPPING[k].label}{SHIPPING[k].fee ? ` — ${tk(SHIPPING[k].fee)}` : " — Free"}</b>
                        <small>{off ? "Only for addresses in Dhaka" : `${SHIPPING[k].eta} · ${SHIPPING[k].note}`}</small></span>
                    </label>
                  );
                })}
              </Card>
              <Card title="Payment method">
                {(Object.keys(PAYMENTS) as PayKey[]).map((k) => {
                  const off = k === "cod" && !codOk;
                  return (
                    <label key={k} className={`co-opt ${payEff === k ? "on" : ""} ${off ? "off" : ""}`}>
                      <input type="radio" name="pay" checked={payEff === k} disabled={off} onChange={() => setPay(k)} />
                      <i />
                      <span><b>{PAYMENTS[k].label}</b>
                        <small>{off ? "Not available outside Dhaka" : PAYMENTS[k].hint}</small></span>
                    </label>
                  );
                })}
              </Card>
            </div>

            <section className={`co-card co-codes-card ${codesOpen ? "open" : ""}`}>
              <button type="button" className="co-toggle" aria-expanded={codesOpen} aria-controls="co-codes" onClick={() => setCodesOpen((o) => !o)}>
                <span>Coupon / voucher / reward</span>
                {(coupon || gift) && <em>{[coupon, gift].filter(Boolean).join(" + ")} applied</em>}
                <svg viewBox="0 0 24 24" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
              </button>
              {codesOpen && (
                <div id="co-codes" className="co-codes-body">
                  <div className="co-codes">
                    <label><span>Coupon code</span>
                      <div className="inline"><input value={couponIn} onChange={(e) => setCouponIn(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyCoupon()} placeholder="Enter your coupon here" /><button className="btn btn-red" onClick={applyCoupon}>Apply</button></div>
                    </label>
                    <label><span>Gift certificate</span>
                      <div className="inline"><input value={giftIn} onChange={(e) => setGiftIn(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyGift()} placeholder="Enter your gift certificate code" /><button className="btn btn-red" onClick={applyGift}>Apply</button></div>
                    </label>
                  </div>
                  {codeMsg && <p className={`note ${codeMsg.ok ? "good" : "bad"}`}>{codeMsg.text}</p>}
                </div>
              )}
            </section>

            <Card title="Shopping cart" className="co-cart">
              <div className="co-table" role="table" aria-label="Items in your order">
                <div className="co-tr co-th" role="row"><span>Image</span><span>Product name</span><span>Type</span><span>Quantity</span><span>Unit price</span><span>Total</span></div>
                {lines.map((l) => (
                  <div key={l.key} className="co-tr" role="row">
                    <Link href={l.href} className="thumb"><LineArt line={l} /></Link>
                    <span className="co-name"><Link href={l.href}>{l.name}</Link>
                      {l.product?.old && <em>Offer: save {tk((l.product.old - l.price) * l.qty)}</em>}
                      {l.bundle && <em>Offer: bundle saves {tk(l.bundle.save * l.qty)}</em>}
                      {l.bundle?.gifts && <em>Free gift{l.bundle.gifts.length > 1 ? "s" : ""}: {l.bundle.gifts.map((g) => `${l.qty > 1 ? `${l.qty} × ` : ""}${g.name}`).join(" + ")}</em>}</span>
                    <span className="co-type">{l.label}</span>
                    <span className="co-qty"><Qty id={l.key} qty={l.qty} /><button className="rm" onClick={() => remove(l.key)} aria-label={`Remove ${l.name}`}><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg></button></span>
                    <span className="co-unit">{tk(l.price)}</span>
                    <b className="co-line">{tk(l.price * l.qty)}</b>
                  </div>
                ))}
              </div>
              <div className="co-sum">
                <div><span>Sub-total</span><span>{tk(subtotal)}</span></div>
                {discount > 0 && <div className="disc"><span>Coupon ({coupon})</span><span>−{tk(discount)}</span></div>}
                {giftAmt > 0 && <div className="disc"><span>Gift certificate ({gift})</span><span>−{tk(giftAmt)}</span></div>}
                <div><span>{SHIPPING[shipEff].label}</span><span>{shipFee ? tk(shipFee) : "Free"}</span></div>
                <div className="tot"><span>Total</span><b>{tk(total)}</b></div>
                {saved > 0 && <p className="co-saved">You&apos;re saving {tk(saved)} on this order</p>}
              </div>
            </Card>

            <Card title="Payment details">
              {payEff === "online" && (
                <div className="co-paydetail">
                  <p>After confirming, you&apos;ll be redirected to <b>SSLCOMMERZ</b> to pay {tk(total)} securely.</p>
                  <PaymentLogos />
                </div>
              )}
              {payEff === "cod" && <p className="co-paydetail">Pay <b>{tk(total)}</b> in cash when your order arrives. Please check the product and record an unboxing video before paying.</p>}
              {shipEff === "outside" && <p className="co-hint warn">Outside Dhaka: a delivery-charge advance of {tk(shipFee)} is required before dispatch.</p>}
            </Card>

            <Card title="Confirm your order">
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add comments about your order (optional)" rows={4} />
              <div className={`co-agree ${errs.agree ? "err" : ""}`}>
                <label className="agree"><input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setErrs((x) => ({ ...x, agree: "" })); }} /><span className="box" /><span>I have read and agree to the <Link href="/privacy-policy" target="_blank">Privacy Policy</Link> and <Link href="/terms-conditions" target="_blank">Terms &amp; Conditions</Link></span></label>
                {errs.agree && <small role="alert">{errs.agree}</small>}
              </div>
              <button className="btn btn-red co-confirm" onClick={confirm} disabled={busy}>
                {busy ? <span className="spin" /> : <>Confirm order · {tk(total)}</>}
              </button>
              {errs.submit && <p className="co-submit-err" role="alert">{errs.submit}</p>}
            </Card>
          </div>
        </div>
      </div>
      <Together cats={cats} exclude={exclude} />
    </>
  );
}
