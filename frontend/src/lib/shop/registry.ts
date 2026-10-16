/* Browser-side lookup for products the cart, wishlist and compare hold by id.

   Demo products resolve from the static catalogue (productById). Real ones (string ids from the
   AgainERP API) are remembered here when a card or product page shows them, and kept in
   localStorage so a saved cart still knows its products after a reload. Only what the cart and
   lists need is stored — no description, specs or reviews. */

import { productById, type Product, type ProductId } from "../products";

const KEY = "moharaz-products";
const MAX = 300;

let cache: Map<string, Product> | null = null;

function load() {
  if (cache) return cache;
  cache = new Map();
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    if (raw) for (const p of JSON.parse(raw) as Product[]) cache.set(String(p.id), p);
  } catch {}
  return cache;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify([...load().values()].slice(-MAX)));
  } catch {}
}

const slim = ({ id, slug, name, cat, catName, brand, spec, price, old, condition, stock, group, variant, image, highlights, sku, real }: Product): Product =>
  ({ id, slug, name, cat, catName, brand, spec, price, old, condition, stock, group, variant, image, highlights, sku, real });

/** remember real products so they can be found by id later */
export function remember(...products: Product[]) {
  const m = load();
  let changed = false;
  for (const p of products) {
    if (!p.real) continue;
    const s = slim(p);
    const prev = m.get(String(p.id));
    if (prev && prev.price === s.price && prev.stock === s.stock && prev.image === s.image) continue;
    m.delete(String(p.id));
    m.set(String(p.id), s);
    changed = true;
  }
  if (changed) save();
}

/** a product by id — demo catalogue first, then the remembered real ones */
export function findProduct(id: ProductId): Product | undefined {
  if (typeof id === "number") return productById.get(id);
  return load().get(id);
}
