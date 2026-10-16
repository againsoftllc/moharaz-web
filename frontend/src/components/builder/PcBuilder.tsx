"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_SETTINGS, SLOTS, allPicked, applySlots, checks, decodeBuild, encodeBuild, evaluateBuild, firstSlot, knownSlotsOnly, mergeRules, power, slotByKey,
  type Build, type BuilderSettings, type RuleResult, type SlotDef, type SlotKey, type Tab,
} from "@/lib/builder";
import { tk } from "@/lib/data";
import type { Product, ProductId } from "@/lib/products";
import { getReadyBuild, productById, readyBuildParts } from "@/lib/shop/api";
import { findProduct, remember } from "@/lib/shop/registry";
import { useCart } from "../cart/CartProvider";
import ConfirmDialog from "../ConfirmDialog";
import ProductArt from "../shop/ProductArt";
import Overview from "./Overview";
import Picker, { type View } from "./Picker";
import BuilderSkeleton from "./Skeleton";

/** how long the loading skeleton shows at least */
const SKELETON_MS = 1000;

const KEY = "moharaz-build";
/** list / grid choice for the parts list, remembered in this browser */
const VIEW_KEY = "moharaz-build-view";
const TABS: [Tab, string][] = [["overview", "Overview"], ["components", "Components"], ["extras", "Extras"], ["peripherals", "Peripherals"]];

export type BuilderApi = {
  build: Build;
  choose: (k: SlotKey, p: Product) => void;
  setQty: (k: SlotKey, id: ProductId, qty: number) => void;
  drop: (k: SlotKey, id: ProductId) => void;
  open: (k: SlotKey) => void;
};

export default function PcBuilder({ slots, settings = DEFAULT_SETTINGS, initialTab, initialSlot }: {
  slots?: SlotDef[]; settings?: BuilderSettings; initialTab: Tab; initialSlot?: SlotKey;
}) {
  // the admin's slots (Website → PC Builder), before anything below looks one up
  useState(() => { if (slots) applySlots(slots); return true; });
  const router = useRouter();
  const { add } = useCart();
  const [build, setBuild] = useState<Build>({});
  const [loaded, setLoaded] = useState(false);
  const [minWait, setMinWait] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [slot, setSlot] = useState<SlotKey>(() => initialSlot ?? firstSlot(initialTab === "overview" ? "components" : initialTab) ?? SLOTS[0].key);
  const [rules, setRules] = useState<RuleResult[] | null>(null);
  const [toast, setToast] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [view, setView] = useState<View>("list");
  const page = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const cancelReset = useCallback(() => setConfirmReset(false), []);

  // restore: a shared ?b= link wins over the build saved in this browser
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const shared = params.get("b");
      const ready = params.get("ready");
      // a Ready Build from the home page: its default parts, each in its slot (the products load below)
      if (ready && !shared) {
        void getReadyBuild(ready).then((rb) => {
          if (!rb) return;
          const b: Build = {};
          for (const part of readyBuildParts(rb)) {
            const slot = SLOTS.find((s) => s.erp === part.slot);
            if (slot) b[slot.key] = [...(b[slot.key] ?? []), { id: part.productId, qty: 1 }];
          }
          setBuild(b);
          setToast(`${rb.name} loaded — change any part`);
        });
      }
      const saved = ready && !shared ? null : localStorage.getItem(KEY);
      const data = shared ? { build: decodeBuild(shared) } : saved ? JSON.parse(saved) : null;
      if (data) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBuild(knownSlotsOnly(data.build ?? {}));
      }
      if (localStorage.getItem(VIEW_KEY) === "grid") setView("grid");
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, JSON.stringify({ build })); } catch {}
  }, [build, loaded]);

  // a shared link or a build saved earlier can hold parts this browser hasn't seen: load them from the catalogue
  useEffect(() => {
    if (!loaded) return;
    const missing = [...new Set(Object.values(build).flat().map((x) => x!.id))].filter((id) => typeof id === "string" && !findProduct(id)) as string[];
    if (!missing.length) return;
    let live = true;
    Promise.all(missing.map(productById)).then((found) => {
      const ok = found.filter((p): p is Product => !!p);
      remember(...ok);
      // drop parts that no longer exist; re-render with the loaded ones
      if (live) setBuild((b) => Object.fromEntries(Object.entries(b).map(([k, picks]) => [k, picks!.filter((x) => typeof x.id !== "string" || findProduct(x.id))])) as Build);
    });
    return () => { live = false; };
  }, [build, loaded]);

  // the admin's compatibility rules, checked by AgainERP whenever the build changes
  useEffect(() => {
    if (!loaded) return;
    const ctl = new AbortController();
    const t = setTimeout(() => void evaluateBuild(build, ctl.signal).then((r) => { if (!ctl.signal.aborted) setRules(r); }), 300);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [build, loaded]);

  const pickView = (v: View) => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch {}
  };

  const ready = loaded && !minWait;
  // the tab bar sticks flush under the site header, whose height changes with the screen width — measure both
  // so the bar never moves and the slot list / filter bar stick just below it (builder.css: --hdr-h, --bar-h)
  useEffect(() => {
    const hdr = document.querySelector<HTMLElement>(".site-hdr");
    if (!ready || !hdr || !bar.current || !page.current) return;
    const el = page.current, b = bar.current;
    const measure = () => {
      el.style.setProperty("--hdr-h", `${hdr.getBoundingClientRect().height}px`);
      el.style.setProperty("--bar-h", `${b.getBoundingClientRect().height}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(hdr);
    ro.observe(b);
    return () => ro.disconnect();
  }, [ready]);

  // Escape folds the cart card back to its slim row
  useEffect(() => {
    if (!cartOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setCartOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cartOpen]);

  // keep the skeleton up for a moment on first load so the page doesn't pop in piece by piece
  useEffect(() => {
    const t = setTimeout(() => setMinWait(false), SKELETON_MS);
    return () => clearTimeout(t);
  }, []);

  // keep tab + slot in the address bar (drops a consumed ?b=)
  useEffect(() => {
    const sp = new URLSearchParams();
    if (tab !== "components") sp.set("tab", tab);
    if (tab !== "overview") sp.set("slot", slot);
    const s = sp.toString();
    window.history.replaceState(null, "", s ? `?${s}` : window.location.pathname);
  }, [tab, slot]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const open = useCallback((k: SlotKey) => {
    setSlot(k);
    setTab(slotByKey.get(k)!.tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const choose = useCallback((k: SlotKey, p: Product) => {
    remember(p);
    const s = slotByKey.get(k)!;
    const cur = build[k] ?? [];
    const has = cur.some((x) => x.id === p.id);
    const next: Build = { ...build, [k]: s.multi ? (has ? cur.filter((x) => x.id !== p.id) : [...cur, { id: p.id, qty: 1 }]) : has ? [] : [{ id: p.id, qty: 1 }] };
    setBuild(next);
  }, [build]);

  const setQty = useCallback((k: SlotKey, id: ProductId, qty: number) =>
    setBuild((b) => ({ ...b, [k]: (b[k] ?? []).map((x) => (x.id === id ? { ...x, qty } : x)) })), []);
  const drop = useCallback((k: SlotKey, id: ProductId) =>
    setBuild((b) => ({ ...b, [k]: (b[k] ?? []).filter((x) => x.id !== id) })), []);

  const picked = useMemo(() => allPicked(build), [build]);
  const issues = useMemo(() => mergeRules(checks(build), rules), [build, rules]);
  const { draw, recommended } = useMemo(() => power(build), [build]);
  const parts = picked.reduce((s, x) => s + x.product.price * x.qty, 0);
  const was = picked.reduce((s, x) => s + (x.product.old ?? x.product.price) * x.qty, 0);
  const save = was - parts;
  const errors = issues.filter((c) => c.level === "error").length;
  const warns = issues.filter((c) => c.level === "warn").length;
  const unavailable = picked.filter((x) => x.product.stock === "Out of stock");
  const status = !picked.length ? "" : errors ? "bad" : warns ? "warn" : "good";
  const statusText = !picked.length ? "Start by choosing a part" : errors ? `${errors} compatibility issue${errors > 1 ? "s" : ""}` : warns ? `${warns} thing${warns > 1 ? "s" : ""} to check` : "All parts compatible";

  const share = async () => {
    const url = `${window.location.origin}/pc-builder?b=${encodeBuild(build)}`;
    try { await navigator.clipboard.writeText(url); setToast("Build link copied — share it with anyone"); }
    catch { window.prompt("Copy this link to share your build:", url); }
  };
  const clearBuild = () => {
    setConfirmReset(false);
    setBuild({}); setTab("overview"); setToast("Build cleared");
  };
  const reset = () => (picked.length ? setConfirmReset(true) : clearBuild());
  const toCart = () => {
    picked.filter((x) => x.product.stock !== "Out of stock").forEach((x) => add(x.product.id, x.qty));
    router.push("/cart");
  };

  const api: BuilderApi = { build, choose, setQty, drop, open };

  if (!ready) return <BuilderSkeleton tab={tab} />;

  const actions = (
    <>
      <span className="watt" title="Estimated peak power draw / recommended PSU">
        <svg viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9z" /></svg>{draw}W <em>· PSU {recommended}W+</em>
      </span>
      {/* a printable quotation to bring to the shop */}
      <button className="ib" onClick={() => window.open(`/pc-builder/print?b=${encodeBuild(build)}`, "_blank")} disabled={!picked.length} aria-label="Print quotation" title="Print quotation">
        <svg viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
        <span className="ib-l">Print</span>
      </button>
      {settings.share_link && <button className="ib" onClick={share} disabled={!picked.length} aria-label="Share build" title="Share build"><svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg><span className="ib-l">Share</span></button>}
      <button className="ib" onClick={reset} aria-label="Reset build" title="Reset build"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg><span className="ib-l">Reset</span></button>
    </>
  );

  return (
    <div className="wrap pcb-page pcb-in" ref={page}>
      <div className="pcb-bar" ref={bar}>
        <nav className="pcb-tabs" role="tablist" aria-label="Builder sections">
          {TABS.filter(([t]) => t === "overview" || firstSlot(t)).map(([t, label]) => {
            const n = t === "overview" ? picked.length : picked.filter((x) => x.slot.tab === t).length;
            return (
              <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => { setTab(t); if (t !== "overview" && slotByKey.get(slot)?.tab !== t) setSlot(firstSlot(t) ?? slot); }}>
                {t === "overview" && <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>}
                {label}{n > 0 && <span>{n}</span>}
              </button>
            );
          })}
        </nav>
        <div className="pcb-actions">{actions}</div>
      </div>
      {/* phones: the power / share / reset row sits under the tabs and scrolls with the page */}
      <div className="pcb-actions pcb-actions-m">{actions}</div>

      {tab === "overview"
        ? <Overview api={api} issues={issues} />
        : (() => {
            const active = slotByKey.get(slot)?.tab === tab ? slot : firstSlot(tab);
            return active && <Picker key={active} api={api} settings={settings} tab={tab} slot={active} setSlot={setSlot} view={view} setView={pickView} />;
          })()}

      {/* compact cart card: one slim row (total + cart); click it to open the details above */}
      <div className={`pcb-total ${cartOpen ? "open" : ""}`}>
        {cartOpen && (
          <div className="tt-more" id="pcb-cart-more">
            <div className="tt-lines">
              <div><span>Parts ({picked.length})</span><b>{tk(parts)}</b></div>
              {save > 0 && <div className="sv"><span>You save <em>-{Math.round((save / was) * 100)}%</em></span><b>{tk(save)}</b></div>}
              {save > 0 && <div><span>Was</span><s>{tk(was)}</s></div>}
              <small>All prices include VAT.</small>
            </div>
            <div className={`tt-status ${status}`}>
              {statusText}
              {unavailable.length > 0 && <small>{unavailable.length} out-of-stock part{unavailable.length > 1 ? "s" : ""} won&apos;t be added</small>}
            </div>
            <button className="btn btn-red tt-go" disabled={!picked.length} onClick={toCart}>
              Go to Cart <svg viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6" /></svg>
            </button>
          </div>
        )}
        <div className="tt-bar">
          <button className="tt-toggle" onClick={() => setCartOpen((o) => !o)} aria-expanded={cartOpen} aria-controls="pcb-cart-more" title={cartOpen ? "Hide details" : "Show details"}>
            <span className="tt-label">Total</span>
            <b>{tk(parts)}</b>
            {save > 0 && <em className="tt-pct">-{Math.round((save / was) * 100)}%</em>}
            <i className={`tt-dot ${status}`} title={statusText} aria-label={statusText} />
            <svg className="tt-chev" viewBox="0 0 24 24" aria-hidden><path d="m18 15-6-6-6 6" /></svg>
          </button>
          <button className="tt-cart" disabled={!picked.length} onClick={toCart} aria-label="Go to cart" title="Go to cart">
            <svg viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6" /></svg>
            {picked.length > 0 && <span>{picked.length}</span>}
          </button>
        </div>
      </div>

      {toast && <div className="pcb-toast" role="status">{toast}</div>}

      <ConfirmDialog
        open={confirmReset}
        tone="danger"
        title="Reset this build?"
        message={<>All <b>{picked.length} part{picked.length > 1 ? "s" : ""}</b> will be removed from your build. This can&apos;t be undone.</>}
        confirmLabel="Yes, reset build"
        cancelLabel="Keep my build"
        onConfirm={clearBuild}
        onCancel={cancelReset}
      >
        <div className="cf-sum">
          <div className="cf-thumbs">
            {picked.slice(0, 6).map((x) => <span key={`${x.slot.key}-${x.product.id}`} title={x.product.name}><ProductArt p={x.product} /></span>)}
            {picked.length > 6 && <span className="more">+{picked.length - 6}</span>}
          </div>
          <div className="cf-total"><small>Build total</small><b>{tk(parts)}</b></div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
