"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product, ProductId } from "@/lib/products";
import { findProduct } from "@/lib/shop/registry";

const KEY = "moharaz-wishlist";

type Wishlist = {
  ids: ProductId[];
  /** saved products, newest first */
  products: Product[];
  has: (id: ProductId) => boolean;
  toggle: (id: ProductId) => void;
  remove: (id: ProductId) => void;
  ready: boolean;
};

const Ctx = createContext<Wishlist | null>(null);

const read = (): ProductId[] => {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? "[]") as ProductId[]).filter((id) => findProduct(id));
  } catch {
    return [];
  }
};

/** Products saved with the ♡ on cards and product pages, listed under Account → Wishlist.
    Kept in this browser and followed across its open tabs. */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<ProductId[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setIds(read());
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // saved or removed in another tab → show it here too (only fires when the stored value actually changes)
    const sync = (e: StorageEvent) => { if (e.key === KEY) setIds(read()); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (ready) try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch {}
  }, [ids, ready]);

  const toggle = useCallback((id: ProductId) => setIds((c) => (c.includes(id) ? c.filter((x) => x !== id) : [id, ...c])), []);
  const remove = useCallback((id: ProductId) => setIds((c) => c.filter((x) => x !== id)), []);

  const value = useMemo<Wishlist>(() => ({
    ids, products: ids.map((id) => findProduct(id)).filter((p): p is Product => !!p), has: (id) => ids.includes(id), toggle, remove, ready,
  }), [ids, toggle, remove, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWishlist() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return c;
}
