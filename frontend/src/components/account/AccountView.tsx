"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { tk } from "@/lib/data";
import {
  clearPin,
  fetchOrders,
  fetchPayments,
  fetchProfile,
  fetchSummary,
  saveProfile,
  setPin as savePin,
  uploadPhoto,
  type AccountOrder,
  type AccountPayment,
  type Profile,
  type Summary,
} from "@/lib/account";
import { useAuth } from "../auth/AuthProvider";
import UserAvatar from "../auth/UserAvatar";
import ProductCard from "../shop/ProductCard";
import { useWishlist } from "../wishlist/WishlistProvider";

export type Tab = "dashboard" | "orders" | "wishlist" | "payments" | "profile";

const TABS: [Exclude<Tab, "profile">, string, string][] = [
  ["dashboard", "Dashboard", '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>'],
  ["orders", "Orders", '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>'],
  ["wishlist", "Wishlist", '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>'],
  ["payments", "Payments", '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>'],
];

/** an order status as one of the four colours the page uses */
const tone = (s: string) => {
  const v = s.toLowerCase();
  if (/cancel|refund|fail|return/.test(v)) return "cancelled";
  if (/complete|deliver/.test(v)) return "completed";
  if (/process|confirm|ship|pack|hold|partial/.test(v)) return "processing";
  return "pending";
};
const label = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const day = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};
const money = (v: number | string) => tk(Number(v) || 0);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const Ic = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: d }} />;
const Pill = ({ s }: { s: string }) => <span className={`ac-pill ${tone(s)}`}>{label(s)}</span>;

function Ring({ title, count, pct, kind }: { title: string; count: number; pct: number; kind: string }) {
  const C = 2 * Math.PI * 26;
  return (
    <div className={`ac-ring ${kind}`}>
      <svg viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r="26" className="trk" />
        <circle cx="32" cy="32" r="26" className="val" strokeDasharray={`${(C * pct) / 100} ${C}`} />
      </svg>
      <span className="num"><b>{count}</b><small>{pct}%</small></span>
      <p>{title}</p>
    </div>
  );
}

function OrderList({ orders, empty }: { orders: AccountOrder[]; empty: string }) {
  if (!orders.length) return <p className="ac-muted">{empty}</p>;
  return (
    <ul className="ac-orders">
      {orders.map((o) => (
        <li key={o.id}>
          <div className="ac-o-top">
            <p><b>#{o.order_number}</b><span>{day(o.date)}</span></p>
            <Pill s={o.status} />
            <b className="ac-o-tot">{money(o.total)}</b>
          </div>
          <p className="ac-o-items">{o.product_label}</p>
          <div className="ac-o-meta">
            <span>Payment: {label(o.payment_status || "unpaid")}</span>
            {o.shipment_status && <span>Delivery: {label(o.shipment_status)}</span>}
            {Number(o.due) > 0 && <span className="ac-due">Due {money(o.due)}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AccountView({ initialTab = "dashboard" }: { initialTab?: Tab }) {
  const { user, ready, signOut, updateUser } = useAuth();
  const wish = useWishlist();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [orders, setOrders] = useState<AccountOrder[] | null>(null);
  const [payments, setPayments] = useState<AccountPayment[] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ name: "", email: "", emergency_number: "", city: "", region: "", address: "" });
  const [formMsg, setFormMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState({ a: "", b: "", err: "", busy: false });
  const [photoErr, setPhotoErr] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // signed out → send to login, which comes back to this exact tab (e.g. Track Order → ?tab=orders) once signed in
  useEffect(() => {
    if (ready && !user) router.replace(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
  }, [ready, user, router]);

  // the account, from the shop: summary + profile on arrival, orders / payments when their tab opens
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let live = true;
    fetchSummary().then((s) => live && setSummary(s)).catch(() => undefined);
    fetchProfile()
      .then((p) => {
        if (!live) return;
        setProfile(p);
        setForm({ name: p.name, email: p.email, emergency_number: p.emergency_number, city: p.city, region: p.region, address: p.address });
      })
      .catch(() => undefined);
    return () => { live = false; };
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    let live = true;
    if ((tab === "orders" || tab === "dashboard") && orders === null) fetchOrders().then((r) => live && setOrders(r.data)).catch(() => live && setOrders([]));
    if (tab === "payments" && payments === null) fetchPayments().then((r) => live && setPayments(r)).catch(() => live && setPayments([]));
    return () => { live = false; };
  }, [userId, tab, orders, payments]);

  const go = (t: Tab) => {
    setTab(t);
    window.history.replaceState(null, "", t === "dashboard" ? "/account" : `/account?tab=${t}`);
  };

  if (!ready || !user) return <div className="wrap ac-page" />;

  const totalOrders = summary?.status_stats.reduce((s, x) => s + x.count, 0) ?? 0;
  const spent = (orders ?? []).filter((o) => tone(o.status) !== "cancelled").reduce((s, o) => s + (Number(o.total) || 0), 0);
  const due = (orders ?? []).filter((o) => Number(o.due) > 0 && tone(o.status) !== "cancelled");

  const submitProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setFormMsg({ ok: false, text: "Enter your full name" });
    if (form.email.trim() && !EMAIL.test(form.email.trim())) return setFormMsg({ ok: false, text: "Enter a valid email address" });
    setSavingProfile(true);
    setFormMsg(null);
    try {
      const p = await saveProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        emergency_number: form.emergency_number.trim(),
        city: form.city.trim(),
        region: form.region.trim(),
        address: form.address.trim(),
      });
      setProfile(p);
      updateUser(p);
      setFormMsg({ ok: true, text: "Saved" });
      setTimeout(() => setFormMsg(null), 2500);
    } catch (err) {
      setFormMsg({ ok: false, text: err instanceof Error ? err.message : "Couldn't save" });
    } finally {
      setSavingProfile(false);
    }
  };

  const submitPin = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin.a)) return setPin((p) => ({ ...p, err: "PIN must be exactly 4 digits" }));
    if (pin.a !== pin.b) return setPin((p) => ({ ...p, err: "PINs don't match" }));
    setPin((p) => ({ ...p, busy: true, err: "" }));
    try {
      updateUser(await savePin(pin.a, pin.b));
      setPinOpen(false);
      setPin({ a: "", b: "", err: "", busy: false });
    } catch (err) {
      setPin((p) => ({ ...p, busy: false, err: err instanceof Error ? err.message : "Couldn't save the PIN" }));
    }
  };
  const removePin = async () => {
    try { updateUser(await clearPin()); } catch {}
  };

  const pickPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be picked again
    if (!file) return;
    if (!file.type.startsWith("image/")) return setPhotoErr("Please choose an image (JPG, PNG or WebP).");
    if (file.size > 5 * 1024 * 1024) return setPhotoErr("Image is too large — maximum 5 MB.");
    setPhotoErr("");
    setPhotoBusy(true);
    try {
      const p = await uploadPhoto(file);
      setProfile(p);
      updateUser(p);
    } catch (err) {
      setPhotoErr(err instanceof Error ? err.message : "Couldn't upload that image.");
    }
    setPhotoBusy(false);
  };
  const removePhoto = async () => {
    try {
      const p = await saveProfile({ profile_image: "" });
      setProfile(p);
      updateUser(p);
    } catch {}
  };
  const choosePhoto = () => fileRef.current?.click();
  const logout = () => { signOut(); router.push("/"); };
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="wrap ac-page">
      <nav className="crumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><b>Account</b></nav>

      <section className="ac-card ac-head">
        <div className="ac-who">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
          <button type="button" className="ac-av-btn" onClick={choosePhoto} aria-label={user.avatar ? "Change profile photo" : "Add profile photo"} title={user.avatar ? "Change photo" : "Add photo"}>
            <UserAvatar user={user} className="ac-av" />
            <span className="ac-cam">{photoBusy ? <span className="spin" /> : <Ic d='<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>' />}</span>
          </button>
          <p><b>{user.name}</b><span>{user.phone}{user.email ? ` · ${user.email}` : ""}</span></p>
          <div className="ac-head-btns">
            <button className={`ac-chip ${tab === "profile" ? "on" : ""}`} onClick={() => go("profile")}><Ic d='<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>' />Profile</button>
            <button className="ac-chip" onClick={logout}><Ic d='<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>' />Logout</button>
          </div>
        </div>
        <nav className="ac-tabs" role="tablist">
          {TABS.map(([k, name, d]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => go(k)}><Ic d={d} />{name}</button>
          ))}
        </nav>
      </section>

      <div className="ac-grid">
        <div className="ac-main">
          {tab === "dashboard" && (
            <>
              <section className="ac-card">
                <div className="ac-h"><h2>Order status</h2><button onClick={() => go("orders")}>View orders</button></div>
                <div className="ac-totals"><span>Total orders <b>{totalOrders}</b></span><span>Total spent <b className="red">{tk(spent)}</b></span></div>
                {summary && summary.status_stats.length > 0 ? (
                  <div className="ac-rings">
                    {summary.status_stats.map((s) => <Ring key={s.key} title={s.label} count={s.count} pct={s.pct} kind={tone(s.key)} />)}
                  </div>
                ) : (
                  <p className="ac-muted">{summary ? "No orders yet." : "Loading…"}</p>
                )}
              </section>

              <section className="ac-card">
                <div className="ac-h"><h2>Recent orders</h2><button onClick={() => go("orders")}>See all</button></div>
                {orders === null ? <p className="ac-muted">Loading…</p> : <OrderList orders={orders.slice(0, 3)} empty="No orders yet. Place your first order from the shop." />}
              </section>

              <div className="ac-tiles">
                <button className="ac-tile" onClick={() => go("payments")}>
                  <Ic d={TABS[3][2]} />
                  <span>Payments</span>{due.length > 0 && <em>{due.length}</em>}
                </button>
                <button className="ac-tile" onClick={() => go("wishlist")}>
                  <Ic d={TABS[2][2]} />
                  <span>Wishlist</span>{wish.ids.length > 0 && <em>{wish.ids.length}</em>}
                </button>
              </div>
            </>
          )}

          {tab === "orders" && (
            <section className="ac-card">
              <div className="ac-h"><h2>My orders</h2>{orders && <span className="ac-muted">{orders.length} total</span>}</div>
              {orders === null ? <p className="ac-muted">Loading your orders…</p> : <OrderList orders={orders} empty="No orders yet. Place your first order from the shop." />}
              {orders && !orders.length && <div className="ac-ctas"><Link href="/all" className="btn btn-red">Start shopping</Link></div>}
            </section>
          )}

          {tab === "wishlist" && (
            <section className="ac-card">
              <div className="ac-h"><h2>Wishlist</h2>{wish.ids.length > 0 && <span className="ac-muted">{wish.ids.length} saved</span>}</div>
              {/* the same cards as the shop: tap ♡ to remove, or add straight to the cart */}
              {!wish.ready ? null : wish.products.length ? (
                <div className="grid ac-wish">{wish.products.map((p) => <ProductCard key={p.id} p={p} />)}</div>
              ) : (
                <div className="ac-empty">
                  <Ic d={TABS[2][2]} />
                  <b>Your wishlist is empty</b>
                  <p>Tap the ♡ on any product to save it here.</p>
                  <Link href="/all" className="btn btn-red">Browse products</Link>
                </div>
              )}
            </section>
          )}

          {tab === "payments" && (
            <section className="ac-card">
              <div className="ac-h"><h2>Payments</h2></div>
              {payments === null ? <p className="ac-muted">Loading…</p> : !payments.length ? <p className="ac-muted">No payments yet.</p> : (
                <ul className="ac-pays">
                  {payments.map((p) => (
                    <li key={p.id}>
                      <p><b>#{p.order_number}</b><span>{day(p.date)} · {label(p.method)}{p.trx_id ? ` · ${p.trx_id}` : ""}</span></p>
                      <b>{money(p.amount)}</b>
                      <Pill s={p.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === "profile" && (
            <section className="ac-card">
              <div className="ac-h"><h2>Account profile</h2>{profile?.customer_since && <span className="ac-muted">Customer since {day(profile.customer_since)}</span>}</div>
              <div className="ac-photo">
                <UserAvatar user={user} className="ac-av-lg" />
                <div>
                  <b>Profile photo</b>
                  <p className="ac-muted">JPG, PNG or WebP, up to 5 MB.</p>
                  <div className="ac-photo-btns">
                    <button type="button" className="btn btn-red" onClick={choosePhoto} disabled={photoBusy}>{user.avatar ? "Change photo" : "Upload photo"}</button>
                    {user.avatar && <button type="button" className="btn btn-line" onClick={removePhoto}>Remove</button>}
                  </div>
                  {photoErr && <small className="ac-err" role="alert">{photoErr}</small>}
                </div>
              </div>
              <form className="ac-form" onSubmit={submitProfile}>
                <label><span>Full name</span><input value={form.name} onChange={set("name")} autoComplete="name" /></label>
                <label><span>Mobile number</span><input value={user.phone} disabled title="Your sign-in number" /></label>
                <label><span>Email</span><input value={form.email} onChange={set("email")} type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" /></label>
                <label><span>Alternate number</span><input value={form.emergency_number} onChange={set("emergency_number")} inputMode="tel" placeholder="Another number we can call" /></label>
                <label><span>City / District</span><input value={form.city} onChange={set("city")} autoComplete="address-level2" placeholder="e.g. Dhaka" /></label>
                <label><span>Area / Thana</span><input value={form.region} onChange={set("region")} placeholder="e.g. Dhanmondi" /></label>
                <label className="ac-wide"><span>Delivery address</span><textarea value={form.address} onChange={set("address")} rows={3} autoComplete="street-address" placeholder="House, road, area" /></label>
                <div className="ac-form-btns">
                  <button className="btn btn-red" disabled={savingProfile}>{savingProfile ? <span className="spin" /> : "Save changes"}</button>
                  {formMsg && <span className={formMsg.ok ? "ac-ok" : "ac-err"} role="status">{formMsg.text}</span>}
                </div>
              </form>
            </section>
          )}
        </div>

        <aside className="ac-side">
          <section className="ac-card">
            <div className="ac-h"><h3>Login PIN</h3><span className={`ac-pill ${user.hasPin ? "completed" : "pending"}`}>{user.hasPin ? "Set" : "Not set"}</span></div>
            <p className="ac-muted">
              {user.hasPin
                ? "Your 4-digit PIN is set — sign in with it instead of waiting for an SMS code."
                : <>Sign in faster: set a 4-digit PIN for {user.phone || "your number"}.</>}
            </p>
            {pinOpen ? (
              <form className="ac-pin" onSubmit={submitPin}>
                <input value={pin.a} onChange={(e) => setPin({ ...pin, a: e.target.value.replace(/\D/g, "").slice(0, 4), err: "" })} inputMode="numeric" type="password" placeholder="New PIN" aria-label="New PIN" autoFocus />
                <input value={pin.b} onChange={(e) => setPin({ ...pin, b: e.target.value.replace(/\D/g, "").slice(0, 4), err: "" })} inputMode="numeric" type="password" placeholder="Confirm PIN" aria-label="Confirm PIN" />
                {pin.err && <small role="alert">{pin.err}</small>}
                <div><button type="button" className="btn btn-line" onClick={() => setPinOpen(false)}>Cancel</button><button className="btn btn-red" disabled={pin.busy}>{pin.busy ? <span className="spin" /> : "Save PIN"}</button></div>
              </form>
            ) : (
              <div className="ac-pin-btns">
                <button className="btn btn-red ac-full" onClick={() => setPinOpen(true)}>
                  <Ic d='<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 12h.01M11 12h.01M15 12h.01"/>' />{user.hasPin ? "Change PIN" : "Set PIN"}
                </button>
                {user.hasPin && <button className="btn btn-line ac-full" onClick={removePin}>Remove PIN</button>}
              </div>
            )}
          </section>

          <section className="ac-card">
            <h3>Need help?</h3>
            <p className="ac-muted">Track deliveries, warranty claims or anything about an order.</p>
            <div className="ac-links">
              <button onClick={() => go("profile")}>Account profile</button>
              <Link href="/help">Help center</Link>
              <Link href="/contact-us">Contact support</Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
