"use client";

import { useMemo } from "react";
import { useCollection } from "./hooks";
import { db } from "./resources";

/** Products + categories with lookups — what most admin screens need. */
export function useCatalog() {
  const products = useCollection(db.products);
  const categories = useCollection(db.categories);
  const byId = useMemo(() => new Map((products.items ?? []).map((p) => [p.id, p])), [products.items]);
  const cats = useMemo(() => [...(categories.items ?? [])].sort((a, b) => a.order - b.order), [categories.items]);
  const catMap = useMemo(() => new Map(cats.map((c) => [c.slug, c])), [cats]);
  return { products, categories, byId, cats, catMap, loading: products.loading || categories.loading };
}
