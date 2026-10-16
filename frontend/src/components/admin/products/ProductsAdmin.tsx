"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { ChevL, ChevR } from "@/components/Icon";
import { errorText, logActivity } from "@/lib/admin/api";
import { useCatalog } from "@/lib/admin/catalog";
import type { AdminProduct } from "@/lib/admin/types";
import { tk } from "@/lib/data";
import { productBySlug, stockClass, type Stock } from "@/lib/products";
import { AdIcon } from "../icons";
import { useToast } from "../Toast";
import { Empty, ErrorBox, PageHead, Skeleton, Thumb } from "../ui";

export type ProductFilters = { q: string; cat: string; stock: string; show: string };

const PER = 20;
const SORTS = { new: "Newest first", name: "Name A–Z", "price-asc": "Price: low to high", "price-desc": "Price: high to low", qty: "Lowest stock" } as const;
type Sort = keyof typeof SORTS;
const SHOW: Record<string, [string, (p: AdminProduct) => boolean]> = {
  "": ["All products", () => true],
  active: ["Active", (p) => p.status === "active"],
  draft: ["Drafts", (p) => p.status === "draft"],
  featured: ["Featured", (p) => p.featured],
  "no-image": ["Missing photo", (p) => !p.image],
  "low-stock": ["Low stock (≤3)", (p) => p.stock === "In stock" && p.qty <= 3],
};
export const LOW_STOCK = 3;

export default function ProductsAdmin({ initial }: { initial: ProductFilters }) {
  const { products, cats, catMap } = useCatalog();
  const toast = useToast();
  const [f, setF] = useState(initial);
  const [sort, setSort] = useState<Sort>("new");
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [del, setDel] = useState<AdminProduct[] | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<ProductFilters>) => { setF((x) => ({ ...x, ...patch })); setPage(1); setSel(new Set()); };

  const shown = useMemo(() => {
    const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
    const keep = SHOW[f.show]?.[1] ?? SHOW[""][1];
    const r = (products.items ?? []).filter((p) =>
      (!f.cat || p.cat === f.cat) && (!f.stock || p.stock === f.stock) && keep(p) &&
      words.every((w) => `${p.name} ${p.sku} ${p.brand}`.toLowerCase().includes(w)));
    const by: Record<Sort, (a: AdminProduct, b: AdminProduct) => number> = {
      new: (a, b) => b.id - a.id,
      name: (a, b) => a.name.localeCompare(b.name),
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      qty: (a, b) => a.qty - b.qty,
    };
    return r.sort(by[sort]);
  }, [products.items, f, sort]);

  const pages = Math.max(1, Math.ceil(shown.length / PER));
  const cur = Math.min(page, pages);
  const rows = shown.slice((cur - 1) * PER, cur * PER);
  const allOnPage = rows.length > 0 && rows.every((p) => sel.has(p.id));
  const chosen = (products.items ?? []).filter((p) => sel.has(p.id));

  const toggle = (id: number) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const bulkStatus = async (status: AdminProduct["status"]) => {
    setBusy(true);
    try {
      await Promise.all(chosen.map((p) => products.save({ ...p, status }, p.id)));
      logActivity(`${chosen.length} products set to ${status}`, "/admin/products");
      toast(`${chosen.length} products set to ${status === "active" ? "Active" : "Draft"}`);
      setSel(new Set());
    } catch (e) { toast(errorText(e), "err"); } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (!del) return;
    setBusy(true);
    try {
      for (const p of del) await products.remove(p.id);
      logActivity(del.length === 1 ? `Deleted product “${del[0].name}”` : `Deleted ${del.length} products`, "/admin/products");
      toast(del.length === 1 ? "Product deleted" : `${del.length} products deleted`);
      setSel(new Set());
    } catch (e) { toast(errorText(e), "err"); } finally { setBusy(false); setDel(null); }
  };

  const filtering = f.q || f.cat || f.stock || f.show;

  return (
    <>
      <PageHead
        title="All Products"
        mode={products.mode}
        desc={products.items ? `${products.items.length} products in ${cats.length} categories` : "Loading the catalogue…"}
        actions={<Link href="/admin/products/new" className="btn btn-red"><AdIcon n="plus" />Add product</Link>}
      />
      {products.error && <ErrorBox message={products.error} onRetry={products.reload} />}

      <div className="ad-tools">
        <label className="ad-search">
          <AdIcon n="search" />
          <input className="ad-in" value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search name, brand or SKU" aria-label="Search products" />
        </label>
        <select className="ad-in" value={f.cat} onChange={(e) => set({ cat: e.target.value })} aria-label="Category">
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select className="ad-in" value={f.stock} onChange={(e) => set({ stock: e.target.value })} aria-label="Stock">
          <option value="">Any stock</option>
          {(["In stock", "Pre-order", "Out of stock"] as Stock[]).map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="ad-in" value={f.show} onChange={(e) => set({ show: e.target.value })} aria-label="Show">
          {Object.entries(SHOW).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <span className="grow" />
        <select className="ad-in" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
          {Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      {sel.size > 0 && (
        <div className="ad-bulk">
          <span>{sel.size} selected</span>
          <button className="btn btn-line ad-sm" disabled={busy} onClick={() => bulkStatus("active")}>Set active</button>
          <button className="btn btn-line ad-sm" disabled={busy} onClick={() => bulkStatus("draft")}>Set draft</button>
          <button className="btn btn-line ad-sm ad-del" disabled={busy} onClick={() => setDel(chosen)}><AdIcon n="trash" />Delete</button>
          <button className="ad-ib" onClick={() => setSel(new Set())} aria-label="Clear selection"><AdIcon n="x" /></button>
        </div>
      )}

      {products.loading ? <Skeleton rows={10} /> : !shown.length ? (
        <div className="ad-card">
          {filtering
            ? <Empty icon="search" title="No products match" text="Try another search or clear the filters." action={<button className="btn btn-line" onClick={() => set({ q: "", cat: "", stock: "", show: "" })}>Clear filters</button>} />
            : <Empty title="No products yet" text="Add your first product to start selling." action={<Link href="/admin/products/new" className="btn btn-red">Add product</Link>} />}
        </div>
      ) : (
        <>
          <div className="ad-tw">
            <table className="ad-t">
              <thead>
                <tr>
                  <th className="ad-chk"><input type="checkbox" checked={allOnPage} aria-label="Select all on this page" onChange={() => setSel((s) => { const n = new Set(s); rows.forEach((p) => (allOnPage ? n.delete(p.id) : n.add(p.id))); return n; })} /></th>
                  <th>Product</th>
                  <th>Category</th>
                  <th className="num">Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th className="acts"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const c = catMap.get(p.cat);
                  return (
                    <tr key={p.id}>
                      <td className="ad-chk"><input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Select ${p.name}`} /></td>
                      <td>
                        <div className="ad-row">
                          <Thumb src={p.image} icon={c?.icon} color={c?.color} />
                          <span><b><Link href={`/admin/products/${p.id}`}>{p.name}</Link></b><small>{p.sku} · {p.brand}{p.variant ? ` · ${p.variant}` : ""}</small></span>
                        </div>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{c?.name ?? <span className="ad-b warn">{p.cat}</span>}</td>
                      <td className="num"><div className="ad-price"><b>{tk(p.price)}</b>{p.old && <s>{tk(p.old)}</s>}</div></td>
                      <td>
                        <span className={`ad-b ${stockClass(p.stock) === "no" ? "no" : stockClass(p.stock)}`}>{p.stock}</span>
                        <small style={{ display: "block", fontSize: 12, color: p.stock === "In stock" && p.qty <= LOW_STOCK ? "var(--amber)" : "var(--dim)", marginTop: 3 }}>{p.qty} on hand</small>
                      </td>
                      <td>
                        <span className={`ad-b ${p.status === "active" ? "ok" : "plain"}`}>{p.status === "active" ? "Active" : "Draft"}</span>
                        {p.featured && <span className="ad-b warn plain" style={{ marginLeft: 4 }} title="Featured">★</span>}
                      </td>
                      <td className="acts">
                        {productBySlug.has(p.slug) && <a className="ad-ib" style={{ display: "inline-grid" }} href={`/${p.slug}`} target="_blank" rel="noreferrer" aria-label={`View ${p.name} in store`} title="View in store"><AdIcon n="eye" /></a>}
                        <Link className="ad-ib" style={{ display: "inline-grid" }} href={`/admin/products/${p.id}`} aria-label={`Edit ${p.name}`} title="Edit"><AdIcon n="edit" /></Link>
                        <button className="ad-ib ad-del" style={{ display: "inline-grid" }} onClick={() => setDel([p])} aria-label={`Delete ${p.name}`} title="Delete"><AdIcon n="trash" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="ad-pager">
            <span>Showing {(cur - 1) * PER + 1}–{Math.min(cur * PER, shown.length)} of {shown.length}</span>
            {pages > 1 && (
              <div>
                <button disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label="Previous page"><ChevL /></button>
                {Array.from({ length: pages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === pages || Math.abs(n - cur) <= 1)
                  .map((n, i, arr) => (
                    <span key={n} style={{ display: "contents" }}>
                      {i > 0 && n - arr[i - 1] > 1 && <button disabled>…</button>}
                      <button className={n === cur ? "on" : ""} onClick={() => setPage(n)} aria-current={n === cur ? "page" : undefined}>{n}</button>
                    </span>
                  ))}
                <button disabled={cur === pages} onClick={() => setPage(cur + 1)} aria-label="Next page"><ChevR /></button>
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!del}
        tone="danger"
        title={del?.length === 1 ? "Delete this product?" : `Delete ${del?.length} products?`}
        message={del?.length === 1 ? <><b>{del[0].name}</b> will be removed from the store. This can&apos;t be undone.</> : <>The selected products will be removed from the store. This can&apos;t be undone.</>}
        confirmLabel={busy ? "Deleting…" : "Delete"}
        onCancel={() => setDel(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
