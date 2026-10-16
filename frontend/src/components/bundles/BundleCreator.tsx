"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CUSTOM_PLANS, GIFTS, customBundle, customCode, fitGifts, giftById, giftsFor, linkIds, planFor, type Gift } from "@/lib/bundles";
import { ic, tk } from "@/lib/data";
import { productHref, stockClass, type Product } from "@/lib/products";
import { listProducts } from "@/lib/shop/api";
import { findProduct, remember } from "@/lib/shop/registry";
import { useCart } from "../cart/CartProvider";
import ProductArt from "../shop/ProductArt";
import RailNav from "../RailNav";

const PAGE = 12;

function GiftArt({ gift }: { gift: Gift }) {
  return <svg className="gift-art" viewBox="0 0 24 24" aria-hidden dangerouslySetInnerHTML={{ __html: ic[gift.icon] }} />;
}

/** Build-your-own bundle from the shop's real catalogue (AgainERP): search and category tabs over the products, a plan
    (2–4 products) for the discount and the free gifts, and a link that is the bundle (?items=<product numbers>). */
export default function BundleCreator({ initialProducts, categories, initialSize, initialGifts, initialName, shared }: {
  initialProducts: Product[]; categories: { slug: string; name: string }[]; initialSize: number; initialGifts: string[]; initialName: string; shared: boolean;
}) {
  const router = useRouter();
  const { addBundle, setDrawer } = useCart();
  // the browser keeps the products it has seen, so the bundle (and the cart) can find them by id
  const [initialIds] = useState(() => { remember(...initialProducts); return initialProducts.map((p) => String(p.id)); });
  const [size, setSize] = useState(initialSize);
  const [ids, setIds] = useState<string[]>(initialIds);
  const [gifts, setGifts] = useState<string[]>(() => fitGifts(initialGifts, planFor(initialSize)!));
  const [name, setName] = useState(initialName);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [limit, setLimit] = useState(PAGE);
  const [share, setShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  const plan = planFor(size)!;
  const items = ids.map((id) => findProduct(id)).filter((p): p is Product => !!p);
  const bundle = ids.length === size ? customBundle(ids, gifts) : null;
  const chosen = gifts.map((id) => giftById.get(id)!);
  const giftsReady = gifts.length === plan.picks;
  const canBuy = !!bundle && giftsReady;
  const giftValue = chosen.reduce((s, g) => s + g.value, 0);
  const subtotal = items.reduce((s, p) => s + p.price, 0);
  const left = size - ids.length;
  const full = left <= 0;

  // the address bar is the bundle: sharing = copying the URL
  const query = `size=${size}${ids.length ? `&items=${linkIds(ids)}` : ""}&gifts=${gifts.join(",")}${name.trim() ? `&name=${encodeURIComponent(name.trim())}` : ""}`;
  useEffect(() => {
    window.history.replaceState(null, "", `?${query}`);
    setOrigin(window.location.origin); // eslint-disable-line react-hooks/set-state-in-effect
    setCopied(false);
  }, [query]);

  const link = `${origin}/bundles/create?${query}`;
  const shareText = `${name.trim() || "My custom bundle"}: ${size} products for ${bundle ? tk(bundle.price) : ""} + free ${chosen.map((g) => g.name).join(" & ")} at Moharaz`;

  // the catalogue: what's searched in the chosen category, in stock first, a page at a time
  const [results, setResults] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const ctl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      listProducts({ search: q.trim() || undefined, category: cat === "all" ? undefined : cat, sort: "availability", perPage: limit }, { signal: ctl.signal })
        .then((r) => { setResults(r.items); setTotal(r.total); setLoading(false); })
        .catch(() => { if (!ctl.signal.aborted) { setResults([]); setTotal(0); setLoading(false); } });
    }, q ? 250 : 0);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q, cat, limit]);

  // switching to a smaller plan keeps the first products that still fit
  const choosePlan = (n: number) => { setSize(n); setIds((cur) => cur.slice(0, n)); setGifts((g) => fitGifts(g, planFor(n)!)); setShare(false); };
  // picking past the limit swaps out the oldest choice
  const toggleGift = (id: string) => setGifts((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-plan.picks)));
  const toggle = (p: Product) => {
    const id = String(p.id);
    remember(p);
    setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < size ? [...cur, id] : cur));
  };
  const remove = (id: string) => setIds((cur) => cur.filter((x) => x !== id));

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); } catch { window.prompt("Copy this link:", link); }
  };
  const nativeShare = async () => {
    try { await navigator.share({ title: "Moharaz bundle", text: shareText, url: link }); } catch {}
  };

  return (
    <div className="wrap shop-page">
      <nav className="crumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/bundles">Bundles</Link><span>/</span><b>Create your bundle</b></nav>

      <div className="cb-head">
        <div>
          <span className="eyebrow">Build your own combo</span>
          <h1>Create Your Bundle</h1>
          <p>Choose a bundle size, pick your products, and get a bundle discount plus free gifts of your choice.</p>
        </div>
      </div>

      {shared && initialIds.length > 0 && (
        <div className="cb-shared">
          <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg>
          <span><b>Someone shared this bundle with you.</b> Add it to your cart as it is, or swap products to make it yours.</span>
        </div>
      )}

      {/* bundle size tabs */}
      <div className="cb-plans" role="tablist" aria-label="Bundle size">
        {CUSTOM_PLANS.map((p) => (
          <button key={p.size} role="tab" aria-selected={size === p.size} className={`cb-plan ${size === p.size ? "on" : ""}`} onClick={() => choosePlan(p.size)}>
            <span className="cb-plan-n"><b>{p.size}</b>Products</span>
            <span className="cb-plan-t">
              <strong>{p.size}-Product Bundle</strong>
              <em>Save {p.pct}%</em>
            </span>
            <span className="cb-plan-gift">
              <span className="gift-stack">{giftsFor(p).slice(p.premium ? -3 : 0, p.premium ? undefined : 3).map((g) => <span key={g.id} className="gift-ico"><GiftArt gift={g} /></span>)}</span>
              <span><small>Free gift{p.picks > 1 ? "s" : ""}</small>{p.premium ? `Any ${p.picks} gifts, incl. premium` : `Choose ${p.picks} gift${p.picks > 1 ? "s" : ""}`}</span>
            </span>
            {size === p.size && <i className="cb-plan-tick" aria-hidden><svg viewBox="0 0 24 24"><path d="m5 12 5 5L20 7" /></svg></i>}
          </button>
        ))}
      </div>

      {/* free gift chooser */}
      <section className="cb-gifts" aria-label="Choose your free gifts">
        <div className="cb-gifts-head">
          <h2><span aria-hidden>🎁</span> Choose {plan.picks > 1 ? `any ${plan.picks} free gifts` : "your free gift"}</h2>
          <span className="cb-gifts-side">
            <span className={`cb-gifts-count ${giftsReady ? "ok" : ""}`}>{gifts.length}/{plan.picks} chosen</span>
            <RailNav id="cb-gift-rail" />
          </span>
        </div>
        <ul className="cb-gift-grid" id="cb-gift-rail">
          {(plan.premium ? [...GIFTS].sort((a, b) => +!!b.premium - +!!a.premium) : GIFTS).map((g) => {
            const on = gifts.includes(g.id);
            const locked = !!g.premium && !plan.premium;
            return (
              <li key={g.id}>
                <button className={`cb-gift-opt ${on ? "on" : ""} ${locked ? "locked" : ""}`} aria-pressed={on} disabled={locked} onClick={() => toggleGift(g.id)}
                  title={locked ? "Premium gift: choose the 4-Product Bundle to unlock" : undefined}>
                  {g.premium && <span className="prem">Premium</span>}
                  <span className="cb-gift-check" aria-hidden><svg viewBox="0 0 24 24"><path d="m5 12 5 5L20 7" /></svg></span>
                  <span className="gift-ico lg"><GiftArt gift={g} /></span>
                  <b>{g.name}</b>
                  <small>{locked ? "4-Product Bundle only" : <>Worth {tk(g.value)}</>}</small>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="cb">
        <div className="cb-main">
          {/* the bundle being built */}
          <div className={`cb-slots s${size} n${ids.length}`} role="tabpanel" aria-label={`${size}-product bundle`}>
            {Array.from({ length: size }, (_, i) => {
              const p = items[i];
              return (
                <div key={p ? p.id : `e${i}`} className={`cb-slot ${p ? "filled" : ""}`}>
                  {i > 0 && <span className="plus" aria-hidden>+</span>}
                  {p ? (
                    <>
                      <button className="cb-x" onClick={() => remove(String(p.id))} aria-label={`Remove ${p.name}`}><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
                      <Link href={productHref(p)} className="cb-img"><ProductArt p={p} /></Link>
                      <span className="cb-cat">{p.catName}</span>
                      <b title={p.name}>{p.name}</b>
                      <em>{tk(p.price)}</em>
                    </>
                  ) : (
                    <button className="cb-empty" onClick={() => document.getElementById("cb-search")?.focus()} disabled={i > ids.length}>
                      <span><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></span>
                      Add product {i + 1}
                      <small>{i === ids.length ? "Pick from the list below" : "Required"}</small>
                    </button>
                  )}
                </div>
              );
            })}
            <div className={`cb-slot cb-gift ${bundle ? "won" : ""}`}>
              <span className="plus gift-plus" aria-hidden>+</span>
              <span className="cb-ribbon">Free</span>
              <span className={`cb-img gift-img n${chosen.length}`}>
                {chosen.length ? chosen.map((g) => <span key={g.id}><GiftArt gift={g} /></span>) : <span className="none">?</span>}
              </span>
              <span className="cb-cat">Free gift{plan.picks > 1 ? "s" : ""}</span>
              <b>{chosen.length ? chosen.map((g) => g.name).join(" + ") : "Choose above"}</b>
              <em><s>{tk(giftValue)}</s> {tk(0)}</em>
              {!bundle && <small className="cb-lock">Unlocks with {size} products</small>}
            </div>
          </div>

          {/* product picker */}
          <section className="cb-pick" aria-label="Choose products">
            <div className="cb-pick-head">
              <h2>{full ? "Your bundle is complete" : `Choose product ${ids.length + 1} of ${size}`}<span>{ids.length}/{size} selected</span></h2>
              <div className="cb-search">
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <input id="cb-search" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="Search products, brands, models…" aria-label="Search products" />
              </div>
            </div>
            <div className="cb-cats" role="tablist" aria-label="Category">
              {[{ slug: "all", name: "All" }, ...categories].map((c) => (
                <button key={c.slug} role="tab" aria-selected={cat === c.slug} className={cat === c.slug ? "on" : ""} onClick={() => { setCat(c.slug); setLimit(PAGE); }}>{c.name}</button>
              ))}
            </div>

            {loading && !results.length ? (
              <div className="empty"><b>Loading products…</b></div>
            ) : results.length ? (
              <ul className="cb-list">
                {results.map((p) => {
                  const on = ids.includes(String(p.id));
                  const out = p.stock === "Out of stock";
                  return (
                    <li key={p.id} className={on ? "on" : ""}>
                      <span className="thumb"><ProductArt p={p} /></span>
                      <span className="cb-t">
                        <b>{p.name}</b>
                        <small>{p.catName ? `${p.catName} · ` : ""}<i className={`stk ${stockClass(p.stock)}`}>{p.stock}</i></small>
                      </span>
                      <span className="cb-p"><b>{tk(p.price)}</b>{p.old && <s>{tk(p.old)}</s>}</span>
                      <button className={`btn ${on ? "btn-line" : "btn-red"}`} disabled={out || (!on && full)} onClick={() => toggle(p)}
                        title={out ? "Out of stock" : !on && full ? `This bundle holds ${size} products. Remove one or pick a bigger bundle.` : undefined}>
                        {on ? <><svg viewBox="0 0 24 24"><path d="m5 12 5 5L20 7" /></svg>Added</> : "Add"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="empty"><b>No products match</b><p>Try another search or category.</p></div>
            )}
            {total > results.length && <button className="btn btn-line cb-more" disabled={loading} onClick={() => setLimit((l) => l + PAGE)}>{loading ? "Loading…" : `Show more (${total - results.length} left)`}</button>}
          </section>
        </div>

        {/* summary */}
        <aside className="cb-sum">
          <div className="cb-sum-plan"><span>{size}-Product Bundle</span><em>-{plan.pct}% + {plan.picks} free gift{plan.picks > 1 ? "s" : ""}</em></div>
          <label className="cb-name">
            <span>Bundle name <small>(optional)</small></span>
            <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. My Gaming Setup" />
          </label>

          {items.length ? (
            <ul className="cb-lines">
              {items.map((p) => <li key={p.id}><span>{p.name}</span><em>{tk(p.price)}</em></li>)}
              {chosen.map((g) => <li key={g.id} className={`gift ${bundle ? "won" : ""}`}><span>🎁 {g.name}</span><em>{bundle ? "FREE" : "Locked"}</em></li>)}
            </ul>
          ) : <p className="cb-hint">Your bundle is empty. Add {size} products to unlock {plan.pct}% off and {plan.picks > 1 ? `${plan.picks} free gifts` : "a free gift"}.</p>}

          <div className="cb-calc">
            <div><span>Subtotal</span><span>{tk(subtotal)}</span></div>
            <div className="disc"><span>Bundle discount (-{plan.pct}%)</span><span>{bundle ? `-${tk(bundle.save)}` : "—"}</span></div>
            <div className="disc"><span>Free gift{chosen.length > 1 ? "s" : ""} ({chosen.length})</span><span>{bundle && chosen.length ? `+${tk(giftValue)} value` : "—"}</span></div>
            <div className="tot"><span>Bundle price</span><b>{tk(bundle ? bundle.price : subtotal)}</b></div>
          </div>

          <p className={`cb-nudge ${canBuy ? "ok" : ""}`}>
            {bundle
              ? giftsReady ? `Bundle complete! You save ${tk(bundle.save)} + ${chosen.length} free gift${chosen.length > 1 ? "s" : ""} worth ${tk(giftValue)}.` : `Choose ${plan.picks - gifts.length} more free gift${plan.picks - gifts.length > 1 ? "s" : ""} above to continue.`
              : `Add ${left} more product${left > 1 ? "s" : ""} to complete your bundle and unlock your free gift${plan.picks > 1 ? "s" : ""}.`}
          </p>

          <button className="btn btn-red cb-go" disabled={!canBuy} onClick={() => { addBundle(customCode(ids, gifts)); setDrawer(true); }}>
            <svg viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6" /></svg>
            Add bundle to cart
          </button>
          <div className="cb-row">
            <button className="btn btn-line" disabled={!canBuy} onClick={() => { addBundle(customCode(ids, gifts)); router.push("/checkout"); }}>Buy now</button>
            <button className={`btn btn-line ${share ? "on" : ""}`} disabled={!canBuy} onClick={() => setShare((s) => !s)} aria-expanded={share}>
              <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg>Share
            </button>
          </div>

          {share && canBuy && (
            <div className="cb-share">
              <span>Anyone with this link can view and buy your bundle</span>
              <div className="cb-link">
                <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Bundle link" />
                <button onClick={copy} className={copied ? "ok" : ""}>{copied ? "Copied!" : "Copy"}</button>
              </div>
              <div className="cb-apps">
                <a href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${link}`)}`} target="_blank" rel="noopener noreferrer" className="wa">WhatsApp</a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer" className="fb">Facebook</a>
                <a href={`mailto:?subject=${encodeURIComponent("Check out this bundle")}&body=${encodeURIComponent(`${shareText}\n${link}`)}`} className="em">Email</a>
                {"share" in navigator && <button onClick={nativeShare}>More…</button>}
              </div>
            </div>
          )}

          {ids.length > 0 && <button className="cb-clear" onClick={() => { setIds([]); setShare(false); }}>Clear bundle</button>}
        </aside>
      </div>
    </div>
  );
}
