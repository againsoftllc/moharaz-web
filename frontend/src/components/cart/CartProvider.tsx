"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ASSEMBLY_FEE } from "@/lib/builder";
import { customHref, findBundle, type Bundle } from "@/lib/bundles";
import { catOf, productHref, type Product, type ProductId, type ProductVariant, type Stock } from "@/lib/products";
import { findProduct } from "@/lib/shop/registry";
import { lockScroll } from "@/lib/scrollLock";
import { sku } from "@/lib/productInfo";
import { track, type TrackItem } from "@/lib/tracking";

/** Stored line. key is "p:<productId>" (real products with a chosen variant: "p:<productId>~<variantId>"),
    "b:<bundleSlug>" or "s:<service>". A variant line keeps the variant's name and price. */
type Line = { key: string; qty: number; variant?: { id: string; name: string; price: number } };

/** cart lines as tracked items (Meta content ids = the product SKU, as in the Product structured data) */
export const lineItems = (lines: CartLine[]): TrackItem[] =>
  lines.map((l) => ({
    id: l.product ? sku(l.product) : l.key,
    name: l.name,
    price: l.price,
    qty: l.qty,
    brand: l.product?.brand || undefined,
    category: l.product?.cat || undefined,
  }));

export type CartLine = {
  key: string;
  qty: number;
  name: string;
  price: number;
  stock: Stock;
  href: string;
  label: string;
  product?: Product;
  bundle?: Bundle;
  service?: boolean;
};

/* services that can sit in the cart next to products */
const SERVICES: Record<string, { name: string; price: number }> = {
  assembly: { name: "PC Assembly, Cable Management & Stress Test", price: ASSEMBLY_FEE },
};

type Cart = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (id: ProductId, qty?: number, variant?: ProductVariant) => void;
  addBundle: (slug: string, qty?: number) => void;
  addService: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  ready: boolean;
  drawer: boolean;
  setDrawer: (open: boolean) => void;
  /** last "added to cart" notice; adds in quick succession merge into one */
  notice: Notice | null;
  dismissNotice: () => void;
};

export type Notice = { id: number; line: CartLine; n: number };

const KEY = "moharaz-cart";
const Ctx = createContext<Cart | null>(null);

function resolve(l: Line): CartLine | null {
  const [kind, id] = [l.key.slice(0, 1), l.key.slice(2)];
  if (kind === "p") {
    const raw = id.split("~")[0];
    const p = findProduct(/^\d+$/.test(raw) ? +raw : raw);
    if (!p) return null;
    const v = l.variant;
    return { key: l.key, qty: l.qty, name: v ? `${p.name} — ${v.name}` : p.name, price: v?.price ?? p.price, stock: p.stock, href: productHref(p), label: catOf(p).name, product: p };
  }
  if (kind === "s") {
    const s = SERVICES[id];
    return s ? { key: l.key, qty: l.qty, name: s.name, price: s.price, stock: "In stock", href: "/pc-builder", label: "Service", service: true } : null;
  }
  const b = findBundle(id);
  return b ? { key: l.key, qty: l.qty, name: b.name, price: b.price, stock: b.stock, href: b.custom ? customHref(b.items.map((p) => String(p.id)), (b.gifts ?? []).map((g) => g.id)) : `/bundles/${b.slug}`, label: `Bundle · ${b.items.length} items`, bundle: b } : null;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Line[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const dismissNotice = useCallback(() => setNotice(null), []);

  // load after mount so server and first client render match (empty cart)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        // older saves stored { id, qty } for products only
        const saved = (JSON.parse(raw) as (Line | { id: number; qty: number })[])
          .map((l) => ("key" in l ? l : { key: `p:${l.id}`, qty: l.qty }))
          .filter((l) => resolve(l));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems(saved);
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  }, [items, loaded]);

  useEffect(() => {
    if (drawer) return lockScroll();
  }, [drawer]);

  const addKey = useCallback((key: string, qty: number, variant?: Line["variant"]) => {
    const line = resolve({ key, qty, variant });
    if (line) track("AddToCart", { items: lineItems([{ ...line, qty }]) });
    if (line) setNotice((cur) => ({ id: Date.now(), line, n: cur && Date.now() - cur.id < 1500 ? cur.n + qty : qty }));
    setItems((cur) => {
      const hit = cur.find((l) => l.key === key);
      return hit ? cur.map((l) => (l.key === key ? { ...l, qty: Math.min(l.qty + qty, 99) } : l)) : [...cur, { key, qty, ...(variant ? { variant } : {}) }];
    });
  }, []);
  const add = useCallback((id: ProductId, qty = 1, v?: ProductVariant) =>
    addKey(v ? `p:${id}~${v.id}` : `p:${id}`, qty, v ? { id: v.id, name: v.name, price: v.price } : undefined), [addKey]);
  const addBundle = useCallback((slug: string, qty = 1) => addKey(`b:${slug}`, qty), [addKey]);
  // a service is never needed twice, so re-adding keeps quantity at 1
  const addService = useCallback((key: string) => setItems((cur) => (cur.some((l) => l.key === `s:${key}`) ? cur : [...cur, { key: `s:${key}`, qty: 1 }])), []);
  const setQty = useCallback((key: string, qty: number) => {
    setItems((cur) => (qty < 1 ? cur.filter((l) => l.key !== key) : cur.map((l) => (l.key === key ? { ...l, qty } : l))));
  }, []);
  const remove = useCallback((key: string) => setItems((cur) => cur.filter((l) => l.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<Cart>(() => {
    const lines = items.map(resolve).filter((l): l is CartLine => !!l);
    return {
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotal: lines.reduce((s, l) => s + l.qty * l.price, 0),
      add, addBundle, addService, setQty, remove, clear,
      ready: loaded,
      drawer, setDrawer,
      notice, dismissNotice,
    };
  }, [items, loaded, drawer, notice, dismissNotice, add, addBundle, addService, setQty, remove, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside <CartProvider>");
  return c;
}
