"use client";

import { useCallback, useEffect, useState } from "react";
import {
  errorText, getItem, getSingleton, listItems, putSingleton, removeItem, saveItem,
  type Collection, type Key, type Mode, type Singleton,
} from "./api";

type ListState<T> = { items: T[] | null; mode: Mode | null; error: string | null };

/** Load a whole collection and keep it in sync with saves / deletes made through this hook. */
export function useCollection<T, K extends Key>(c: Collection<T, K>) {
  const [s, set] = useState<ListState<T>>({ items: null, mode: null, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    listItems(c).then(
      (r) => live && set({ items: r.items, mode: r.mode, error: null }),
      (e) => live && set({ items: [], mode: "api", error: errorText(e) }),
    );
    return () => { live = false; };
  }, [c, tick]);

  const save = useCallback(async (item: T, prevKey?: K) => {
    const saved = await saveItem(c, item, prevKey);
    set((x) => {
      const list = x.items ?? [];
      const at = prevKey === undefined ? -1 : list.findIndex((t) => c.key(t) === prevKey);
      return { ...x, items: at < 0 ? [...list, saved] : list.map((t, i) => (i === at ? saved : t)) };
    });
    return saved;
  }, [c]);

  const remove = useCallback(async (key: K) => {
    await removeItem(c, key);
    set((x) => ({ ...x, items: (x.items ?? []).filter((t) => c.key(t) !== key) }));
  }, [c]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...s, loading: s.items === null, save, remove, reload };
}

/** Load one item for an edit screen. */
export function useItem<T, K extends Key>(c: Collection<T, K>, key: K) {
  const [s, set] = useState<{ item: T | undefined; mode: Mode | null; error: string | null; loading: boolean }>({ item: undefined, mode: null, error: null, loading: true });
  useEffect(() => {
    let live = true;
    getItem(c, key).then(
      (r) => live && set({ item: r.item, mode: r.mode, error: null, loading: false }),
      (e) => live && set({ item: undefined, mode: "api", error: errorText(e), loading: false }),
    );
    return () => { live = false; };
  }, [c, key]);
  return s;
}

/** Settings object (social links, bundle rules). */
export function useSingleton<T>(sg: Singleton<T>) {
  const [s, set] = useState<{ value: T | null; mode: Mode | null; error: string | null }>({ value: null, mode: null, error: null });
  useEffect(() => {
    let live = true;
    getSingleton(sg).then(
      (r) => live && set({ value: r.value, mode: r.mode, error: null }),
      (e) => live && set({ value: null, mode: "api", error: errorText(e) }),
    );
    return () => { live = false; };
  }, [sg]);
  const save = useCallback(async (value: T) => {
    const saved = await putSingleton(sg, value);
    set((x) => ({ ...x, value: saved }));
    return saved;
  }, [sg]);
  return { ...s, loading: s.value === null && !s.error, save };
}
