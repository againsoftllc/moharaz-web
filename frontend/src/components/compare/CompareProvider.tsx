"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product, ProductId } from "@/lib/products";
import { findProduct } from "@/lib/shop/registry";

export const MAX_COMPARE = 4;
const KEY = "moharaz-compare";

type Compare = {
  ids: ProductId[];
  products: Product[];
  has: (id: ProductId) => boolean;
  /** returns false when the list is already full */
  toggle: (id: ProductId) => boolean;
  add: (id: ProductId) => boolean;
  remove: (id: ProductId) => void;
  replace: (oldId: ProductId, newId: ProductId) => void;
  set: (ids: ProductId[]) => void;
  clear: () => void;
  ready: boolean;
  notice: string;
};

const Ctx = createContext<Compare | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<ProductId[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setIds((JSON.parse(raw) as ProductId[]).filter((id) => !!findProduct(id)).slice(0, MAX_COMPARE));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch {}
  }, [ids, ready]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 2600);
    return () => clearTimeout(t);
  }, [notice]);

  const add = useCallback((id: ProductId) => {
    if (ids.includes(id)) return true;
    if (ids.length >= MAX_COMPARE) { setNotice(`You can compare up to ${MAX_COMPARE} products — remove one first.`); return false; }
    setIds([...ids, id]);
    setNotice(`Added to compare (${ids.length + 1}/${MAX_COMPARE})`);
    return true;
  }, [ids]);
  const remove = useCallback((id: ProductId) => setIds((c) => c.filter((x) => x !== id)), []);
  const toggle = useCallback((id: ProductId) => (ids.includes(id) ? (remove(id), true) : add(id)), [ids, add, remove]);
  const replace = useCallback((oldId: ProductId, newId: ProductId) =>
    setIds((c) => (c.includes(newId) ? c : c.map((x) => (x === oldId ? newId : x)))), []);
  const set = useCallback((next: ProductId[]) => setIds([...new Set(next)].filter((id) => !!findProduct(id)).slice(0, MAX_COMPARE)), []);
  const clear = useCallback(() => setIds([]), []);

  const value = useMemo<Compare>(() => ({
    // a product the registry no longer knows is left out, never passed on as undefined
    ids, products: ids.map((id) => findProduct(id)).filter((x): x is Product => !!x), has: (id) => ids.includes(id),
    toggle, add, remove, replace, set, clear, ready, notice,
  }), [ids, toggle, add, remove, replace, set, clear, ready, notice]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCompare() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCompare must be used inside <CompareProvider>");
  return c;
}
